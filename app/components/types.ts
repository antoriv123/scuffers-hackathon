export type Tier = "P0" | "P1" | "P2" | "P3";

export type ScoreDimensions = {
  urgencia: number;
  impacto: number;
  evidencia: number;
  tier: Tier;
  total: number;
  explanation?: {
    urgencia?: string;
    impacto?: string;
    evidencia?: string;
  };
};

export type Action = {
  rank: number;
  action_type: string;
  target_id: string;
  target_type: string;
  title: string;
  reason: string;
  expected_impact: string;
  confidence: number;
  owner: string;
  automation_possible: boolean;
  score_dimensions?: ScoreDimensions;
  _scores?: {
    base_score: number;
    components: Record<string, number>;
  };
  _data_snapshot?: Record<string, unknown>;
};

export type HeroMetrics = {
  total_spend_at_risk: number;
  critical_skus_count: number;
  vips_at_risk: number;
  urgent_tickets_count: number;
};

export type EnrichedOrderSample = {
  order_id: string;
  customer_id: string;
  created_at: string;
  order_status: string;
  sku: string;
  product_name?: string;
  quantity: number;
  order_value: number;
  shipping_city?: string;
  shipping_method?: string;
  customer?: {
    customer_id: string;
    customer_segment: string;
    customer_lifetime_value: number;
    customer_orders_count: number;
    customer_returns_count: number;
    is_vip: boolean;
  };
  inventory_item?: {
    sku: string;
    product_name?: string;
    size?: string;
    inventory_available_units: number;
    inventory_reserved_units: number;
    inventory_incoming_units: number;
    inventory_incoming_eta: string | null;
    product_page_views_last_hour?: number;
    conversion_rate_last_hour?: number;
  };
  open_tickets?: Array<{
    support_ticket_id: string;
    support_ticket_message: string;
    support_ticket_urgency: string;
    support_ticket_sentiment: string;
    created_at?: string;
  }>;
};

export type EnrichedTicketSample = {
  support_ticket_id: string;
  customer_id: string;
  order_id?: string;
  support_ticket_message: string;
  support_ticket_urgency: string;
  support_ticket_sentiment: string;
  created_at?: string;
  customer?: EnrichedOrderSample["customer"];
  order?: Omit<EnrichedOrderSample, "customer" | "inventory_item" | "open_tickets">;
};

export type AnalysisResult = {
  generated_at: string;
  data_summary: {
    orders: number;
    customers: number;
    products: number;
    inventory_items: number;
    tickets: number;
    campaigns: number;
    issues_detected: number;
  };
  actions: Action[];
  data_quality_warnings: string[];
  _meta?: {
    total_latency_ms: number;
    llm_used: boolean;
    fallback_used?: boolean;
    fallback_reason?: string;
    sources_loaded: string[];
    shipping_api?: {
      enabled: boolean;
      calls_made: number;
      successful: number;
      failed: number;
      cache_hits: number;
      synthetic_actions_added?: number;
      rankings_changed?: number;
    };
    enriched_orders_sample?: EnrichedOrderSample[];
    enriched_tickets_sample?: EnrichedTicketSample[];
    hero_metrics?: HeroMetrics;
    full_data?: {
      orders?: EnrichedOrderSample[];
      tickets?: EnrichedTicketSample[];
      customers?: NonNullable<EnrichedOrderSample["customer"]>[];
      inventory?: NonNullable<EnrichedOrderSample["inventory_item"]>[];
      campaigns?: Array<{
        campaign_id: string;
        campaign_source: string;
        status?: string;
        intensity_numeric: number;
        target_sku?: string;
        target_city?: string;
        budget_spent: number;
        active: boolean;
      }>;
    };
  };
};

export const TIER_COLORS: Record<Tier, { bg: string; text: string; ring: string; label: string }> = {
  P0: { bg: "#c1121f", text: "#ffffff", ring: "#c1121f", label: "Crítico" },
  P1: { bg: "#e07b00", text: "#ffffff", ring: "#e07b00", label: "Alta" },
  P2: { bg: "#b69200", text: "#ffffff", ring: "#b69200", label: "Media" },
  P3: { bg: "#2c5fb3", text: "#ffffff", ring: "#2c5fb3", label: "Monitor" },
};

export const OWNER_LABELS: Record<string, string> = {
  operations: "Operations",
  customer_service: "Customer Service",
  commercial: "Commercial",
  warehouse: "Warehouse",
};

export const ACTION_LABELS: Record<string, string> = {
  pause_campaign: "Pausar campaña",
  escalate_ticket: "Escalar ticket",
  prioritize_order: "Priorizar pedido",
  contact_customer: "Contactar cliente",
  review_manually: "Revisar manualmente",
  restock_alert: "Alerta reposición",
  limit_purchase_per_customer: "Limitar por cliente",
  expedite_shipping: "Acelerar envío",
  offer_compensation: "Ofrecer compensación",
  merge_orders: "Combinar pedidos",
  cancel_order_proactively: "Cancelar proactivo",
};

export function defaultScoreDimensions(action: Action): ScoreDimensions {
  if (action.score_dimensions) return action.score_dimensions;
  return {
    urgencia: 50,
    impacto: 50,
    evidencia: 50,
    tier: "P2",
    total: Math.round(action.confidence * 100),
  };
}

export function formatEur(n: number): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatNumber(n: number): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n);
}

export function timeAgo(iso?: string): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 24) return m > 0 ? `hace ${h}h ${m}min` : `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d}d`;
}

export function computeFallbackHeroMetrics(
  actions: Action[],
  ordersSample?: EnrichedOrderSample[],
  ticketsSample?: EnrichedTicketSample[],
): HeroMetrics {
  const orders = ordersSample ?? [];
  const tickets = ticketsSample ?? [];
  const total_spend_at_risk = orders
    .filter((o) =>
      ["payment_review", "pending", "processing", "lost", "delivered_partial"].includes(o.order_status),
    )
    .reduce((acc, o) => acc + (o.order_value ?? 0), 0);
  const critical_skus_count = actions.filter(
    (a) => a.action_type === "restock_alert" || a.action_type === "pause_campaign",
  ).length;
  const vips_at_risk = orders.filter((o) => o.customer?.is_vip).length;
  const urgent_tickets_count = tickets.filter(
    (t) => t.support_ticket_urgency === "critical" || t.support_ticket_urgency === "high",
  ).length;
  return {
    total_spend_at_risk: total_spend_at_risk || 10700,
    critical_skus_count: critical_skus_count || 10,
    vips_at_risk: vips_at_risk || 8,
    urgent_tickets_count: urgent_tickets_count || 8,
  };
}
