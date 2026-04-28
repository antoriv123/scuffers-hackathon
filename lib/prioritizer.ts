/**
 * Prioritizer: combina scores de cada dimensión, hace cross-feature joins,
 * y devuelve top N candidatos. El LLM enricher después decide reason/title final.
 */

import type {
  ActionType,
  ActionOwner,
  AnalysisResult,
  Campaign,
  EnrichedOrder,
  EnrichedTicket,
  InventoryItem,
  PrioritizedAction,
} from "./types";
import {
  scoreCampaignOverload,
  scoreCustomerImpact,
  scoreInventoryRisk,
  scoreOrderRisk,
  scoreShipping,
  scoreTicket,
  type CampaignOverloadScore,
  type CustomerImpactScore,
  type StockRiskScore,
  type OrderRiskScore,
  type TicketScore,
} from "./scorers";
import {
  fetchShippingForOrders,
  isShippingEnabled,
  type ShippingFetchStats,
  type ShippingStatus,
} from "./shipping-api";
import {
  enrichOrders,
  enrichTickets,
  type NormalizedData,
} from "./data-normalizer";

export type ScoredEntities = {
  orders: Map<string, OrderRiskScore>;
  customers: Map<string, CustomerImpactScore>;
  inventory: Map<string, StockRiskScore>;
  tickets: Map<string, TicketScore>;
  campaigns: Map<string, CampaignOverloadScore>;
};

export type ActionCandidate = Omit<
  PrioritizedAction,
  "rank" | "title" | "reason" | "expected_impact" | "confidence"
> & {
  raw_score: number;
  title_hint: string;
  reason_hint: string;
};

// =============== Score everything ===============

export function scoreAll(data: NormalizedData): ScoredEntities {
  const customers = new Map<string, CustomerImpactScore>();
  for (const c of data.customers.values()) {
    customers.set(c.customer_id, scoreCustomerImpact(c));
  }

  const inventory = new Map<string, StockRiskScore>();
  for (const inv of data.inventory.values()) {
    inventory.set(inv.sku, scoreInventoryRisk(inv));
  }

  const enrichedOrders = enrichOrders(data);
  const orders = new Map<string, OrderRiskScore>();
  for (const o of enrichedOrders) {
    orders.set(
      o.order_id,
      scoreOrderRisk(
        o,
        customers.get(o.customer_id),
        inventory.get(o.sku),
      ),
    );
  }

  const enrichedTickets = enrichTickets(data);
  const tickets = new Map<string, TicketScore>();
  for (const t of enrichedTickets) {
    tickets.set(
      t.support_ticket_id,
      scoreTicket(t, customers.get(t.customer_id)),
    );
  }

  const campaigns = new Map<string, CampaignOverloadScore>();
  for (const c of data.campaigns) {
    campaigns.set(
      c.campaign_id,
      scoreCampaignOverload(c, inventory.get(c.target_sku ?? "")),
    );
  }

  return { orders, customers, inventory, tickets, campaigns };
}

// =============== Generate action candidates ===============

export function generateCandidates(
  data: NormalizedData,
  scores: ScoredEntities,
): ActionCandidate[] {
  const candidates: ActionCandidate[] = [];
  const enrichedOrders = enrichOrders(data);
  const enrichedTickets = enrichTickets(data);

  // 1. PAUSE_CAMPAIGN para campañas apuntando a productos sin stock
  for (const campaign of data.campaigns) {
    const cs = scores.campaigns.get(campaign.campaign_id);
    if (!cs) continue;
    const stockRisk = scores.inventory.get(campaign.target_sku ?? "");
    if (cs.score >= 0.55 && stockRisk && stockRisk.available <= stockRisk.reserved) {
      const intensityLabel =
        typeof campaign.campaign_intensity === "string"
          ? campaign.campaign_intensity
          : `${campaign.campaign_intensity} (numeric)`;
      candidates.push({
        action_type: "pause_campaign",
        target_id: campaign.campaign_id,
        target_type: "campaign",
        owner: "commercial",
        automation_possible: true,
        raw_score: cs.score + 0.15, // boost: campañas son urgentes y automatizables
        title_hint: `Pausar ${campaign.campaign_source} ${campaign.campaign_id} → ${campaign.target_sku}`,
        reason_hint: `Campaña ${campaign.campaign_source} con intensidad ${intensityLabel} apuntando a ${campaign.target_sku} (${stockRisk.available} disponibles vs ${stockRisk.reserved} reservadas, ${stockRisk.has_eta ? "con ETA" : "sin ETA"}, ${stockRisk.page_views} visitas/h). Budget gastado: €${campaign.budget_spent}.`,
        _scores: {
          base_score: cs.score,
          components: cs.components as unknown as Record<string, number>,
        },
        _data_snapshot: {
          campaign,
          target_stock: stockRisk,
        },
      });
    }
  }

  // 2. ESCALATE_TICKET para tickets críticos (urgent + negative + VIP)
  for (const ticket of enrichedTickets) {
    const ts = scores.tickets.get(ticket.support_ticket_id);
    if (!ts) continue;
    if (ts.score >= 0.65) {
      const isVip = ticket.customer?.is_vip ?? false;
      candidates.push({
        action_type: "escalate_ticket",
        target_id: ticket.support_ticket_id,
        target_type: "ticket",
        owner: "customer_service",
        automation_possible: false, // requiere humano
        raw_score: ts.score,
        title_hint: `Escalar ticket ${ticket.support_ticket_id}${isVip ? " (cliente VIP)" : ""}`,
        reason_hint: `Ticket [${ticket.support_ticket_urgency}/${ticket.support_ticket_sentiment}]${isVip ? " de cliente VIP" : ""}: "${ticket.support_ticket_message.slice(0, 100)}". Cliente LTV €${ticket.customer?.customer_lifetime_value?.toFixed(0) ?? "?"}, ${ticket.customer?.customer_orders_count ?? 0} pedidos previos.`,
        _scores: {
          base_score: ts.score,
          components: ts.components as unknown as Record<string, number>,
        },
        _data_snapshot: {
          ticket,
          customer: ticket.customer,
          order: ticket.order,
        },
      });
    }
  }

  // 3. CONTACT_CUSTOMER proactivo: VIP con pedido en estado riesgoso
  for (const order of enrichedOrders) {
    const os = scores.orders.get(order.order_id);
    const cs = scores.customers.get(order.customer_id);
    if (!os || !cs) continue;
    if (cs.score >= 0.5 && os.score >= 0.5 && (order.open_tickets?.length ?? 0) === 0) {
      candidates.push({
        action_type: "contact_customer",
        target_id: order.customer_id,
        target_type: "customer",
        owner: "customer_service",
        automation_possible: true,
        raw_score: (os.score + cs.score) / 2,
        title_hint: `Contactar proactivamente a ${order.customer_id} (pedido ${order.order_id})`,
        reason_hint: `Cliente ${order.customer?.customer_segment ?? "?"}${order.customer?.is_vip ? " VIP" : ""} (LTV €${order.customer?.customer_lifetime_value?.toFixed(0) ?? "?"}) con pedido ${order.order_id} en estado ${order.order_status}. Ningún ticket abierto pero el riesgo operativo es alto.`,
        _scores: {
          base_score: (os.score + cs.score) / 2,
          components: { ...os.components, ...cs.components } as unknown as Record<
            string,
            number
          >,
        },
        _data_snapshot: { order, customer: order.customer },
      });
    }
  }

  // 4. PRIORITIZE_ORDER: pedidos con alto score y express + ticket
  for (const order of enrichedOrders) {
    const os = scores.orders.get(order.order_id);
    if (!os) continue;
    const isExpress = order.shipping_method === "express" || order.shipping_method === "priority";
    const hasTicket = (order.open_tickets?.length ?? 0) > 0;
    if (os.score >= 0.6 && (isExpress || hasTicket)) {
      candidates.push({
        action_type: "prioritize_order",
        target_id: order.order_id,
        target_type: "order",
        owner: "operations",
        automation_possible: true,
        raw_score: os.score,
        title_hint: `Priorizar pedido ${order.order_id}`,
        reason_hint: `Pedido ${order.order_status}, ${order.shipping_method ?? "?"}, valor €${order.order_value}, ${order.shipping_city ?? "?"}. ${hasTicket ? `Tiene ${order.open_tickets?.length} ticket(s) abierto(s). ` : ""}${order.customer?.is_vip ? "Cliente VIP. " : ""}${order.inventory_item && order.inventory_item.inventory_available_units < order.inventory_item.inventory_reserved_units ? `SKU ${order.sku} con stock crítico.` : ""}`,
        _scores: {
          base_score: os.score,
          components: os.components as unknown as Record<string, number>,
        },
        _data_snapshot: {
          order,
          customer: order.customer,
          tickets: order.open_tickets,
          inventory: order.inventory_item,
        },
      });
    }
  }

  // 5. REVIEW_MANUALLY: pedidos en payment_review
  for (const order of enrichedOrders) {
    if (order.order_status === "payment_review" || order.order_status === "pending") {
      candidates.push({
        action_type: "review_manually",
        target_id: order.order_id,
        target_type: "order",
        owner: "operations",
        automation_possible: false,
        raw_score: 0.7,
        title_hint: `Revisar manualmente pedido ${order.order_id} (en ${order.order_status})`,
        reason_hint: `Pedido ${order.order_id} de ${order.customer?.customer_segment ?? "cliente nuevo"} en estado ${order.order_status} desde hace tiempo. Valor €${order.order_value}. ${order.customer?.customer_orders_count === 0 ? "Primer pedido del cliente." : ""}`,
        _scores: { base_score: 0.7, components: { manual_review: 1 } },
        _data_snapshot: { order, customer: order.customer },
      });
    }
  }

  // 6. RESTOCK_ALERT: SKUs con stock crítico sin ETA
  for (const inv of data.inventory.values()) {
    const score = scores.inventory.get(inv.sku);
    if (!score) continue;
    if (score.score >= 0.7 && !score.has_eta) {
      candidates.push({
        action_type: "restock_alert",
        target_id: inv.sku,
        target_type: "product",
        owner: "warehouse",
        automation_possible: true,
        raw_score: score.score - 0.05, // -5 por defecto vs campaign pause (más urgente)
        title_hint: `Alerta de reposición urgente para ${inv.sku}`,
        reason_hint: `SKU ${inv.sku} con ${score.available} unidades disponibles, ${score.reserved} reservadas, ${score.page_views} visitas/h. Sin ETA de reposición.`,
        _scores: {
          base_score: score.score,
          components: score.components as unknown as Record<string, number>,
        },
        _data_snapshot: { inventory: inv },
      });
    }
  }

  // 7. LIMIT_PURCHASE_PER_CUSTOMER: SKUs con muchas reservas pocos disponibles
  for (const inv of data.inventory.values()) {
    const score = scores.inventory.get(inv.sku);
    if (!score) continue;
    if (
      score.available <= 5 &&
      score.reserved >= 30 &&
      score.page_views > 3000
    ) {
      // Posible bot/reseller behavior — proteger stock
      const ordersForSku = data.orders.filter((o) => o.sku === inv.sku);
      const customersOrdering = new Set(ordersForSku.map((o) => o.customer_id));
      candidates.push({
        action_type: "limit_purchase_per_customer",
        target_id: inv.sku,
        target_type: "product",
        owner: "operations",
        automation_possible: true,
        raw_score: score.score - 0.1,
        title_hint: `Limitar compra a 1 ud/cliente en ${inv.sku}`,
        reason_hint: `SKU casi agotado (${score.available} disponibles, ${score.reserved} reservadas, ${score.page_views} visitas/h, ${ordersForSku.length} pedidos de ${customersOrdering.size} clientes). Limitar a 1 ud/cliente para evitar concentración.`,
        _scores: {
          base_score: score.score,
          components: score.components as unknown as Record<string, number>,
        },
        _data_snapshot: { inventory: inv, orders_for_sku: ordersForSku.length },
      });
    }
  }

  return candidates;
}

// =============== Top N selection with diversity ===============

/**
 * Selecciona top N candidatos asegurando diversidad de action_type
 * (no queremos 10 actions del mismo tipo).
 */
export function selectTopN(
  candidates: ActionCandidate[],
  n: number,
): ActionCandidate[] {
  // Sort by raw_score desc
  const sorted = [...candidates].sort((a, b) => b.raw_score - a.raw_score);

  // Track count per action_type to enforce diversity
  const typeCount = new Map<ActionType, number>();
  const maxPerType: Partial<Record<ActionType, number>> = {
    pause_campaign: 3,
    escalate_ticket: 3,
    prioritize_order: 3,
    contact_customer: 2,
    review_manually: 2,
    restock_alert: 2,
    limit_purchase_per_customer: 1,
    expedite_shipping: 2,
    offer_compensation: 1,
    merge_orders: 1,
    cancel_order_proactively: 1,
  };

  const selected: ActionCandidate[] = [];
  const seenTargets = new Set<string>();

  for (const cand of sorted) {
    if (selected.length >= n) break;
    const targetKey = `${cand.action_type}:${cand.target_id}`;
    if (seenTargets.has(targetKey)) continue;

    const currentCount = typeCount.get(cand.action_type) ?? 0;
    const max = maxPerType[cand.action_type] ?? 5;
    if (currentCount >= max) continue;

    selected.push(cand);
    seenTargets.add(targetKey);
    typeCount.set(cand.action_type, currentCount + 1);
  }

  return selected;
}

// =============== Shipping enrichment ===============

function extractOrderIdFromCandidate(c: ActionCandidate): string | null {
  if (c.target_type === "order") return c.target_id;
  const snap = c._data_snapshot as Record<string, unknown> | undefined;
  if (!snap) return null;
  const order = snap["order"] as Record<string, unknown> | undefined;
  if (order && typeof order["order_id"] === "string") {
    return order["order_id"] as string;
  }
  const ticket = snap["ticket"] as Record<string, unknown> | undefined;
  if (ticket && typeof ticket["order_id"] === "string") {
    return ticket["order_id"] as string;
  }
  return null;
}

export type EnrichWithShippingResult = {
  candidates: ActionCandidate[];
  shipping_map: Map<string, ShippingStatus>;
  stats: ShippingFetchStats;
};

/**
 * Cruza shipping data en candidatos con order_id resoluble.
 * Si `extraOrderIds` se pasa, también fetchea esos para que
 * `generateShippingDrivenCandidates` pueda detectar órdenes lost/exception
 * que aún no estaban en el ranking base.
 * Si CANDIDATE_ID no está, devuelve los mismos candidatos sin tocar.
 */
export async function enrichWithShipping(
  candidates: ActionCandidate[],
  extraOrderIds: string[] = [],
): Promise<EnrichWithShippingResult> {
  const emptyStats: ShippingFetchStats = {
    calls_made: 0,
    successful: 0,
    failed: 0,
    cache_hits: 0,
  };

  if (!isShippingEnabled()) {
    return { candidates, shipping_map: new Map(), stats: emptyStats };
  }

  const orderIds = new Set<string>();
  for (const c of candidates) {
    const id = extractOrderIdFromCandidate(c);
    if (id) orderIds.add(id);
  }
  for (const id of extraOrderIds) {
    if (id) orderIds.add(id);
  }

  if (orderIds.size === 0) {
    return { candidates, shipping_map: new Map(), stats: emptyStats };
  }

  const { map, stats } = await fetchShippingForOrders(Array.from(orderIds));

  const enriched = candidates.map((c) => {
    const id = extractOrderIdFromCandidate(c);
    const shipping = id ? map.get(id) : undefined;
    if (!shipping) return c;
    return {
      ...c,
      _data_snapshot: {
        ...(c._data_snapshot ?? {}),
        shipping,
      },
    };
  });

  return { candidates: enriched, shipping_map: map, stats };
}

export type RescoreResult = {
  candidates: ActionCandidate[];
  rankings_changed: number;
};

/**
 * Aplica scoreShipping a cada candidato con shipping data.
 * Modifica raw_score (clamp 0-1) y guarda alert en _data_snapshot.shipping_alert.
 * Devuelve cuántas posiciones cambiaron tras reordenar.
 */
export function recalculateScoresWithShipping(
  candidates: ActionCandidate[],
): RescoreResult {
  const beforeOrder = candidates.map((c) => `${c.action_type}:${c.target_id}`);

  const updated = candidates.map((c) => {
    const snap = c._data_snapshot as Record<string, unknown> | undefined;
    const shipping = snap?.["shipping"] as ShippingStatus | undefined;
    const boost = scoreShipping(shipping, c.action_type);
    if (
      boost.boost_urgencia === 0 &&
      boost.boost_impacto === 0 &&
      boost.boost_evidencia === 0 &&
      !boost.alert
    ) {
      return c;
    }
    // Aproximación: convertimos boosts a delta de raw_score (0-1).
    // Cada 10 puntos en cualquier dimensión ≈ +0.05 en raw_score.
    const delta =
      (boost.boost_urgencia + boost.boost_impacto + boost.boost_evidencia) /
      200;
    const newScore = Math.max(0, Math.min(1, c.raw_score + delta));
    return {
      ...c,
      raw_score: newScore,
      _data_snapshot: {
        ...(c._data_snapshot ?? {}),
        shipping_alert: boost.alert,
        shipping_boost: boost,
      },
      _scores: c._scores
        ? {
            ...c._scores,
            components: {
              ...c._scores.components,
              shipping_boost_urgencia: boost.boost_urgencia,
              shipping_boost_impacto: boost.boost_impacto,
              shipping_boost_evidencia: boost.boost_evidencia,
            },
          }
        : {
            base_score: c.raw_score,
            components: {
              shipping_boost_urgencia: boost.boost_urgencia,
              shipping_boost_impacto: boost.boost_impacto,
              shipping_boost_evidencia: boost.boost_evidencia,
            },
          },
    };
  });

  updated.sort((a, b) => b.raw_score - a.raw_score);

  let rankingsChanged = 0;
  updated.forEach((c, i) => {
    const key = `${c.action_type}:${c.target_id}`;
    if (beforeOrder[i] !== key) rankingsChanged++;
  });

  return { candidates: updated, rankings_changed: rankingsChanged };
}

/**
 * Si la API revela órdenes "lost"/"exception" sobre las que NO hay candidate todavía,
 * inyecta una nueva action de expedite_shipping/contact_customer.
 */
export function generateShippingDrivenCandidates(
  shippingMap: Map<string, ShippingStatus>,
  existingCandidates: ActionCandidate[],
  data: NormalizedData,
): ActionCandidate[] {
  const enrichedOrders = enrichOrders(data);
  const orderIndex = new Map(enrichedOrders.map((o) => [o.order_id, o]));
  const existingOrderIds = new Set(
    existingCandidates
      .map((c) => extractOrderIdFromCandidate(c))
      .filter((v): v is string => !!v),
  );

  const newCandidates: ActionCandidate[] = [];
  for (const [orderId, shipping] of shippingMap) {
    if (existingOrderIds.has(orderId)) continue;

    const status = shipping.shipping_status;
    const risk = shipping.delay_risk ?? 0;
    const isLost = status === "lost";
    const isException = status === "exception";
    const isReturned = status === "returned_to_sender";
    const isHighRiskDelay =
      (status === "delayed" && risk >= 0.7) ||
      (risk >= 0.8 && shipping.requires_manual_review === true);
    const isCustoms = shipping.delay_reason === "customs_hold";

    const trigger =
      isLost || isException || isReturned || isHighRiskDelay || isCustoms;
    if (!trigger) continue;

    const order = orderIndex.get(orderId);
    const orderValue = order?.order_value ?? 0;
    const isVip = order?.customer?.is_vip ?? false;

    let actionType: ActionType;
    let owner: ActionOwner;
    let title: string;
    let reason: string;
    let alert: string;
    let rawScore: number;

    if (isLost) {
      actionType = "expedite_shipping";
      owner = "operations";
      title = `Reenvío urgente · pedido perdido ${orderId}`;
      reason = `API en vivo reporta ${orderId} como LOST. Valor €${orderValue.toFixed(0)}${isVip ? " · cliente VIP" : ""}. Lanzar reenvío + compensación antes de que el cliente reclame.`;
      alert = "Pedido perdido por carrier";
      rawScore = 0.92;
    } else if (isException) {
      actionType = "contact_customer";
      owner = "customer_service";
      title = `Contactar cliente · excepción carrier ${orderId}`;
      reason = `API en vivo reporta excepción en ${orderId} (delay_risk ${risk.toFixed(2)}${shipping.delay_reason ? `, ${shipping.delay_reason}` : ""}${shipping.requires_manual_review ? ", requiere revisión manual" : ""}). Contacto proactivo recomendado.`;
      alert = "Excepción carrier";
      rawScore = 0.88;
    } else if (isCustoms) {
      actionType = "review_manually";
      owner = "operations";
      title = `Bloqueo en aduanas · ${orderId}`;
      reason = `API reporta customs_hold (delay_risk ${risk.toFixed(2)}). Riesgo legal/duty UK. Revisar documentación antes de que el cliente reclame.`;
      alert = "Bloqueado en aduana — riesgo legal UK";
      rawScore = 0.86;
    } else if (isReturned) {
      actionType = "contact_customer";
      owner = "customer_service";
      title = `Pedido devuelto al origen · ${orderId}`;
      reason = `API reporta ${orderId} returned_to_sender. Confirmar dirección + reenvío con cliente antes de cancelar.`;
      alert = "Devuelto al origen";
      rawScore = 0.82;
    } else {
      actionType = "expedite_shipping";
      owner = "operations";
      title = `Acelerar envío · alto riesgo de retraso ${orderId}`;
      reason = `API estima delay_risk ${risk.toFixed(2)}${shipping.delay_reason ? ` (${shipping.delay_reason})` : ""}${shipping.requires_manual_review ? " + revisión manual" : ""}. Intervenir antes de que escale a ticket.`;
      alert = "Retraso confirmado por API";
      rawScore = 0.8;
    }

    newCandidates.push({
      action_type: actionType,
      target_id: orderId,
      target_type: "order",
      owner,
      automation_possible: actionType === "contact_customer",
      raw_score: rawScore,
      title_hint: title,
      reason_hint: reason,
      _scores: {
        base_score: rawScore,
        components: {
          shipping_signal: 1,
          delay_risk: risk,
        },
      },
      _data_snapshot: {
        order: order ?? { order_id: orderId },
        customer: order?.customer,
        shipping,
        shipping_alert: alert,
        synthetic_from_shipping: true,
      },
    });
  }
  return newCandidates;
}

// =============== Score 3D dimensions ===============

export type ScoreDimensions = NonNullable<PrioritizedAction["score_dimensions"]>;

type Snap = Record<string, unknown>;

function snapGet<T = unknown>(snap: Snap | undefined, key: string): T | undefined {
  if (!snap) return undefined;
  return snap[key] as T | undefined;
}

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : undefined;
}

function asNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return isFinite(n) ? n : 0;
  }
  return 0;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asBool(v: unknown): boolean {
  return v === true || v === "true";
}

export function calculateScoreDimensions(
  candidate: ActionCandidate,
): ScoreDimensions {
  const snap = candidate._data_snapshot as Snap | undefined;
  const campaign = asRecord(snapGet(snap, "campaign"));
  const ticket = asRecord(snapGet(snap, "ticket"));
  const customer = asRecord(snapGet(snap, "customer"));
  const order = asRecord(snapGet(snap, "order"));
  const inventory = asRecord(snapGet(snap, "inventory"));
  const targetStock = asRecord(snapGet(snap, "target_stock"));
  const tickets = snapGet<unknown[]>(snap, "tickets");

  const isVip = asBool(customer?.is_vip);
  const orderValue = asNumber(order?.order_value);
  const shippingMethod = asString(order?.shipping_method);
  const orderStatus = asString(order?.order_status);
  const ticketUrgency = asString(ticket?.support_ticket_urgency);
  const ticketSentiment = asString(ticket?.support_ticket_sentiment);
  const ticketMessage = asString(ticket?.support_ticket_message).toLowerCase();

  const invAvailable = asNumber(
    inventory?.inventory_available_units ?? targetStock?.available,
  );
  const invReserved = asNumber(
    inventory?.inventory_reserved_units ?? targetStock?.reserved,
  );
  const invPageViews = asNumber(
    inventory?.product_page_views_last_hour ?? targetStock?.page_views,
  );
  const invUnitPrice = asNumber(inventory?.unit_price);
  const budgetSpent = asNumber(campaign?.budget_spent);
  const ltv = asNumber(customer?.customer_lifetime_value);

  // ===== URGENCIA =====
  let urgencia = 50;
  let urgenciaExplain = "Señal estándar, sin disparador inmediato";
  switch (candidate.action_type) {
    case "pause_campaign":
      urgencia = 95;
      urgenciaExplain = `Campaña activa quemando presupuesto (€${budgetSpent.toFixed(0)} ya gastados); cada minuto cuenta`;
      break;
    case "escalate_ticket":
      if (
        (ticketUrgency === "urgent" || ticketUrgency === "critical" || ticketUrgency === "high") &&
        (ticketSentiment === "negative" || ticketSentiment === "very_negative")
      ) {
        urgencia = 90;
        urgenciaExplain = `Ticket ${ticketUrgency}/${ticketSentiment} — riesgo escalada pública en horas`;
      } else {
        urgencia = 70;
        urgenciaExplain = `Ticket ${ticketUrgency || "abierto"} con sentimiento ${ticketSentiment || "neutral"}`;
      }
      break;
    case "restock_alert":
      if (invAvailable <= 2) {
        urgencia = 85;
        urgenciaExplain = `Solo ${invAvailable} unidades disponibles, agotamiento inminente`;
      } else {
        urgencia = 65;
        urgenciaExplain = `${invAvailable} unidades disponibles, riesgo medio`;
      }
      break;
    case "review_manually":
      if (orderValue > 100) {
        urgencia = 75;
        urgenciaExplain = `Pedido de €${orderValue.toFixed(0)} en ${orderStatus || "revisión"} — bloquea cobro`;
      } else {
        urgencia = 55;
        urgenciaExplain = `Pedido de €${orderValue.toFixed(0)} pendiente revisión`;
      }
      break;
    case "prioritize_order":
      if (shippingMethod === "express" || shippingMethod === "priority") {
        urgencia = 70;
        urgenciaExplain = `Envío ${shippingMethod} ya pagado — promesa contractual a cumplir`;
      } else {
        urgencia = 55;
        urgenciaExplain = `Pedido en ${orderStatus || "tránsito"} con señales de fricción`;
      }
      break;
    case "contact_customer":
      if (isVip) {
        urgencia = 65;
        urgenciaExplain = `Cliente VIP (LTV €${ltv.toFixed(0)}) en estado riesgoso, ventana de proactividad`;
      } else {
        urgencia = 50;
        urgenciaExplain = `Cliente con riesgo operativo medio`;
      }
      break;
    case "limit_purchase_per_customer":
      urgencia = 60;
      urgenciaExplain = `${invPageViews} visitas/h sobre stock casi agotado, riesgo de reseller`;
      break;
    default:
      urgencia = 50;
      urgenciaExplain = "Acción preventiva, sin disparador inmediato";
  }

  // ===== IMPACTO =====
  let impacto = 40;
  let impactoExplain = "Magnitud económica acotada";
  if (candidate.action_type === "pause_campaign") {
    if (budgetSpent > 5000) {
      impacto = 100;
      impactoExplain = `€${budgetSpent.toFixed(0)} ya gastados en campaña sobre stock crítico`;
    } else if (budgetSpent > 2000) {
      impacto = 80;
      impactoExplain = `€${budgetSpent.toFixed(0)} ya gastados sin retorno por stock`;
    } else if (budgetSpent > 500) {
      impacto = 60;
      impactoExplain = `€${budgetSpent.toFixed(0)} en presupuesto activo desperdiciado`;
    } else {
      impacto = 40;
      impactoExplain = `€${budgetSpent.toFixed(0)} de exposición moderada`;
    }
  } else if (candidate.action_type === "escalate_ticket" && isVip) {
    if (ltv > 2000) {
      impacto = 100;
      impactoExplain = `Cliente VIP con LTV €${ltv.toFixed(0)} en juego`;
    } else if (ltv > 1000) {
      impacto = 80;
      impactoExplain = `Cliente VIP LTV €${ltv.toFixed(0)} — riesgo de fuga`;
    } else {
      impacto = 60;
      impactoExplain = `Cliente VIP con LTV €${ltv.toFixed(0)}`;
    }
  } else if (candidate.action_type === "escalate_ticket") {
    impacto = 50;
    impactoExplain = `Cliente non-VIP, LTV €${ltv.toFixed(0)} — riesgo de review pública`;
  } else if (candidate.action_type === "restock_alert") {
    const exposure = invPageViews * invUnitPrice;
    if (exposure > 200000) {
      impacto = 100;
      impactoExplain = `Demanda valorada €${exposure.toFixed(0)} (${invPageViews} visitas × €${invUnitPrice.toFixed(0)}) sin stock`;
    } else if (exposure > 50000) {
      impacto = 80;
      impactoExplain = `Demanda valorada €${exposure.toFixed(0)} sin stock disponible`;
    } else {
      impacto = 60;
      impactoExplain = `Demanda activa sobre SKU agotado`;
    }
  } else if (candidate.action_type === "prioritize_order") {
    if (orderValue > 200) {
      impacto = 80;
      impactoExplain = `Pedido de €${orderValue.toFixed(0)} con riesgo operativo`;
    } else if (orderValue > 100) {
      impacto = 60;
      impactoExplain = `Pedido de €${orderValue.toFixed(0)} con fricción`;
    } else if (orderValue > 50) {
      impacto = 40;
      impactoExplain = `Pedido de €${orderValue.toFixed(0)} en riesgo`;
    } else {
      impacto = 30;
      impactoExplain = `Pedido de €${orderValue.toFixed(0)}, magnitud limitada`;
    }
  } else if (candidate.action_type === "review_manually") {
    if (orderValue > 200) {
      impacto = 70;
      impactoExplain = `€${orderValue.toFixed(0)} bloqueados en revisión de pago`;
    } else {
      impacto = 45;
      impactoExplain = `€${orderValue.toFixed(0)} en cobro pendiente de validar`;
    }
  } else if (candidate.action_type === "contact_customer") {
    impacto = ltv > 1000 ? 70 : 50;
    impactoExplain = `LTV €${ltv.toFixed(0)} en juego — coste de churn`;
  } else if (candidate.action_type === "limit_purchase_per_customer") {
    impacto = 60;
    impactoExplain = `Stock crítico (${invAvailable} ud) expuesto a concentración por reseller`;
  }

  // VIP bonus
  if (isVip && candidate.action_type !== "escalate_ticket") {
    impacto = Math.min(100, impacto + 10);
    impactoExplain += "; cliente VIP involucrado (+10)";
  }

  // Legal risk bonus
  const legalRisk =
    ticketMessage.includes("uk duty") ||
    ticketMessage.includes("ocu") ||
    ticketMessage.includes("denuncia") ||
    ticketMessage.includes("consumo") ||
    ticketMessage.includes("legal");
  if (legalRisk) {
    impacto = Math.min(100, impacto + 15);
    impactoExplain += "; riesgo legal/reputacional detectado (+15)";
  }

  impacto = Math.min(100, impacto);

  // ===== EVIDENCIA =====
  let signals = 0;
  const signalLabels: string[] = [];

  if (campaign) {
    signals++;
    signalLabels.push("campaña activa");
  }
  if (ticket || (Array.isArray(tickets) && tickets.length > 0)) {
    signals++;
    signalLabels.push("ticket abierto");
  }
  if (
    inventory ||
    targetStock ||
    (invAvailable > 0 && invReserved > 0 && invAvailable <= invReserved)
  ) {
    if (invAvailable <= invReserved && invReserved > 0) {
      signals++;
      signalLabels.push("stock crítico");
    } else if (inventory || targetStock) {
      signals++;
      signalLabels.push("inventario tracked");
    }
  }
  if (isVip) {
    signals++;
    signalLabels.push("cliente VIP");
  }
  if (order && (orderStatus === "payment_review" || orderStatus === "pending")) {
    signals++;
    signalLabels.push(`order status ${orderStatus}`);
  }
  if (invPageViews > 1000) {
    signals++;
    signalLabels.push(`${invPageViews} visitas/h`);
  }
  if (legalRisk) {
    signals++;
    signalLabels.push("riesgo legal");
  }

  let evidencia: number;
  if (signals <= 1) evidencia = 30;
  else if (signals === 2) evidencia = 60;
  else if (signals === 3) evidencia = 85;
  else evidencia = 100;

  const evidenciaExplain =
    signals === 0
      ? "Señal única sin convergencia"
      : `${signals} señal${signals === 1 ? "" : "es"} convergente${signals === 1 ? "" : "s"}: ${signalLabels.join(" + ")}`;

  // ===== Shipping API boosts (si existen) =====
  const shipping = snapGet<ShippingStatus>(snap, "shipping");
  if (shipping) {
    const boost = scoreShipping(shipping, candidate.action_type);
    if (boost.boost_urgencia !== 0) {
      urgencia = Math.max(0, Math.min(100, urgencia + boost.boost_urgencia));
      urgenciaExplain += boost.alert
        ? `; ${boost.alert.toLowerCase()} (shipping API ${boost.boost_urgencia >= 0 ? "+" : ""}${boost.boost_urgencia})`
        : `; shipping API ajusta urgencia ${boost.boost_urgencia >= 0 ? "+" : ""}${boost.boost_urgencia}`;
    }
    if (boost.boost_impacto !== 0) {
      impacto = Math.max(0, Math.min(100, impacto + boost.boost_impacto));
      impactoExplain += `; shipping API +${boost.boost_impacto} impacto`;
    }
    if (boost.boost_evidencia !== 0) {
      evidencia = Math.max(0, Math.min(100, evidencia + boost.boost_evidencia));
    }
  }

  // ===== TOTAL & TIER =====
  const total = Math.round(urgencia * 0.4 + impacto * 0.35 + evidencia * 0.25);
  const tier: ScoreDimensions["tier"] =
    total >= 85 ? "P0" : total >= 70 ? "P1" : total >= 55 ? "P2" : "P3";

  return {
    urgencia,
    impacto,
    evidencia,
    tier,
    total,
    explanation: {
      urgencia: urgenciaExplain,
      impacto: impactoExplain,
      evidencia: evidenciaExplain,
    },
  };
}

/**
 * Adjunta score_dimensions a cada candidate.
 * Devuelve copias para evitar mutación.
 */
export function attachScoreDimensions(
  candidates: ActionCandidate[],
): ActionCandidate[] {
  return candidates.map((c) => ({
    ...c,
    score_dimensions: calculateScoreDimensions(c),
  }));
}

// =============== Final analysis ===============

export function buildAnalysisResult(
  data: NormalizedData,
  topActions: PrioritizedAction[],
  totalCandidates: number,
): AnalysisResult {
  return {
    generated_at: new Date().toISOString(),
    data_summary: {
      orders: data.orders.length,
      customers: data.customers.size,
      products: data.products.size,
      inventory_items: data.inventory.size,
      tickets: data.tickets.length,
      campaigns: data.campaigns.length,
      issues_detected: totalCandidates,
    },
    actions: topActions,
    data_quality_warnings: data.warnings,
  };
}
