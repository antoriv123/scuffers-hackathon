/**
 * Scorers determinísticos por dimensión.
 * Cada función devuelve [0,1] como score de prioridad.
 * Combinables en cross-feature joins.
 */

import type {
  Campaign,
  Customer,
  EnrichedOrder,
  EnrichedTicket,
  InventoryItem,
} from "./types";
import { hoursAgo } from "./csv-loader";

// =============== Inventory risk ===============

export type StockRiskScore = {
  sku: string;
  score: number;
  components: {
    stock_pressure: number; // available vs reserved
    demand_pressure: number; // page views & sell-through
    eta_risk: number; // no ETA = max risk
  };
  available: number;
  reserved: number;
  page_views: number;
  has_eta: boolean;
};

export function scoreInventoryRisk(inv: InventoryItem & { product_page_views_last_hour?: number; sell_through_rate_last_hour?: number }): StockRiskScore {
  const available = inv.inventory_available_units;
  const reserved = inv.inventory_reserved_units;
  const incoming = inv.inventory_incoming_units;
  const has_eta = !!inv.inventory_incoming_eta;
  const page_views = inv.product_page_views_last_hour ?? 0;
  const sell_through = (inv as { sell_through_rate_last_hour?: number }).sell_through_rate_last_hour ?? 0;

  // Stock pressure: cuánto exceso hay de demanda sobre stock
  const total_demand = reserved + Math.max(0, page_views * 0.01); // 1% de page views se asume demanda potencial
  const total_supply = Math.max(1, available + incoming);
  const stock_pressure = Math.min(1, total_demand / total_supply);

  // Demand pressure: si page_views es muy alto y hay poco stock
  const demand_pressure = Math.min(1, (page_views / 5000) * (1 - available / Math.max(1, available + reserved)));

  // ETA risk: sin ETA = max
  const eta_risk = has_eta ? 0.3 : 1.0;

  const score = Math.min(
    1,
    stock_pressure * 0.5 + demand_pressure * 0.3 + eta_risk * 0.2,
  );

  return {
    sku: inv.sku,
    score,
    components: { stock_pressure, demand_pressure, eta_risk },
    available,
    reserved,
    page_views,
    has_eta,
  };
}

// =============== Customer impact ===============

export type CustomerImpactScore = {
  customer_id: string;
  score: number;
  components: {
    ltv_factor: number;
    vip_bonus: number;
    history_factor: number;
  };
};

export function scoreCustomerImpact(c: Customer): CustomerImpactScore {
  // LTV normalized: 0-2000€ → 0-1
  const ltv_factor = Math.min(1, (c.customer_lifetime_value || 0) / 2000);
  const vip_bonus = c.is_vip ? 0.4 : 0;
  // Returns ratio: si returns/orders es alto, riesgo de cliente difícil
  const return_rate = c.customer_orders_count > 0
    ? c.customer_returns_count / c.customer_orders_count
    : 0;
  const history_factor = Math.max(0, 1 - return_rate); // penaliza alta tasa returns

  const score = Math.min(1, ltv_factor * 0.5 + vip_bonus + history_factor * 0.1);

  return {
    customer_id: c.customer_id,
    score,
    components: { ltv_factor, vip_bonus, history_factor },
  };
}

// =============== Order risk ===============

export type OrderRiskScore = {
  order_id: string;
  score: number;
  components: {
    status_risk: number;
    age_risk: number;
    method_pressure: number;
    stock_risk: number;
    customer_impact: number;
    has_open_ticket: number;
  };
};

const STATUS_RISK_MAP: Record<string, number> = {
  pending: 0.5,
  payment_review: 0.9, // requiere revisión manual
  paid: 0.2,
  processing: 0.3,
  packed: 0.1,
  in_transit: 0.4,
  delivered_partial: 0.95,
  lost: 1.0,
  delivered: 0,
  cancelled: 0,
  returned: 0.1,
};

export function scoreOrderRisk(
  order: EnrichedOrder,
  customerScore?: CustomerImpactScore,
  stockScore?: StockRiskScore,
): OrderRiskScore {
  const status_risk = STATUS_RISK_MAP[order.order_status] ?? 0.3;

  // Age risk: pedidos viejos sin progresar son riesgo
  const ageHours = hoursAgo(order.created_at) ?? 0;
  let age_risk = 0;
  if (order.order_status === "paid" && ageHours > 4) age_risk = 0.5;
  if (order.order_status === "processing" && ageHours > 12) age_risk = 0.7;
  if (order.order_status === "in_transit" && ageHours > 24 * 5) age_risk = 0.9;
  if (ageHours > 24 * 14) age_risk = 1.0;

  // Method pressure: express con retraso es peor
  const method_pressure =
    (order.shipping_method === "express" || order.shipping_method === "priority") &&
    order.order_status !== "delivered"
      ? 0.6
      : 0.1;

  const stock_risk = stockScore?.score ?? 0;
  const customer_impact = customerScore?.score ?? 0.3;
  const has_open_ticket = (order.open_tickets?.length ?? 0) > 0 ? 0.7 : 0;

  const score = Math.min(
    1,
    status_risk * 0.25 +
      age_risk * 0.2 +
      method_pressure * 0.1 +
      stock_risk * 0.15 +
      customer_impact * 0.15 +
      has_open_ticket * 0.15,
  );

  return {
    order_id: order.order_id,
    score,
    components: {
      status_risk,
      age_risk,
      method_pressure,
      stock_risk,
      customer_impact,
      has_open_ticket,
    },
  };
}

// =============== Ticket urgency ===============

export type TicketScore = {
  ticket_id: string;
  score: number;
  components: {
    urgency: number;
    sentiment: number;
    customer_impact: number;
    age_pressure: number;
  };
};

const URGENCY_MAP: Record<string, number> = {
  critical: 1.0,
  high: 0.8,
  medium: 0.5,
  low: 0.2,
  urgent: 0.9, // alias visto en el dataset real
};

const SENTIMENT_MAP: Record<string, number> = {
  very_negative: 1.0,
  negative: 0.7,
  neutral: 0.3,
  positive: 0.1,
};

export function scoreTicket(
  ticket: EnrichedTicket,
  customerScore?: CustomerImpactScore,
): TicketScore {
  const urgency = URGENCY_MAP[ticket.support_ticket_urgency.toLowerCase()] ?? 0.3;
  const sentiment = SENTIMENT_MAP[ticket.support_ticket_sentiment.toLowerCase()] ?? 0.3;
  const customer_impact = customerScore?.score ?? 0.3;

  // Age pressure: tickets viejos sin atender escalan
  const ageHours = ticket.created_at ? hoursAgo(ticket.created_at) ?? 0 : 0;
  const age_pressure = Math.min(1, ageHours / 24);

  const score = Math.min(
    1,
    urgency * 0.35 +
      sentiment * 0.25 +
      customer_impact * 0.25 +
      age_pressure * 0.15,
  );

  return {
    ticket_id: ticket.support_ticket_id,
    score,
    components: { urgency, sentiment, customer_impact, age_pressure },
  };
}

// =============== Campaign overload ===============

export type CampaignOverloadScore = {
  campaign_id: string;
  score: number;
  components: {
    intensity: number;
    target_stock_risk: number;
    spend_at_risk: number;
  };
};

const INTENSITY_MAP: Record<string, number> = {
  very_high: 1.0,
  high: 0.7,
  medium: 0.4,
  low: 0.2,
};

export function scoreCampaignOverload(
  campaign: Campaign,
  targetStockScore?: StockRiskScore,
): CampaignOverloadScore {
  const intensity = campaign.intensity_numeric ?? 0.5;

  const target_stock_risk = targetStockScore?.score ?? 0;
  const spend = campaign.budget_spent ?? 0;
  const spend_at_risk = Math.min(1, spend / 5000) * target_stock_risk;

  // Una campaña sólo es "overload" si está apuntando a producto sin stock
  // Bonus si la campaña sigue activa
  const activeBonus = campaign.active && campaign.status === "active" ? 0.1 : 0;
  const score = target_stock_risk > 0.5
    ? Math.min(1, intensity * 0.45 + target_stock_risk * 0.35 + spend_at_risk * 0.15 + activeBonus)
    : intensity * 0.2;

  return {
    campaign_id: campaign.campaign_id,
    score,
    components: { intensity, target_stock_risk, spend_at_risk },
  };
}
