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
  scoreTicket,
  type CampaignOverloadScore,
  type CustomerImpactScore,
  type StockRiskScore,
  type OrderRiskScore,
  type TicketScore,
} from "./scorers";
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
