/**
 * Tipos compartidos del Control Tower.
 * Reflejan los campos orientativos del briefing del reto.
 */

export type OrderStatus =
  | "pending"
  | "payment_review"
  | "paid"
  | "processing"
  | "packed"
  | "in_transit"
  | "delivered"
  | "delivered_partial"
  | "lost"
  | "cancelled"
  | "returned";

export type ShippingMethod = "standard" | "express" | "priority" | "pickup";

export type CustomerSegment = "vip" | "loyal" | "regular" | "new" | "dormant";

export type TicketUrgency = "low" | "medium" | "high" | "critical";
export type TicketSentiment = "positive" | "neutral" | "negative" | "very_negative";
export type TicketStatus = "open" | "pending" | "resolved" | "escalated";

export type CampaignSource =
  | "instagram_paid"
  | "instagram_organic"
  | "tiktok_paid"
  | "google_ads"
  | "email"
  | "newsletter"
  | "influencer";

// =============== Raw entities (lo que llega del CSV) ===============

export type Order = {
  order_id: string;
  customer_id: string;
  created_at: string; // ISO datetime
  order_status: OrderStatus;
  sku: string;
  product_name?: string;
  category?: string;
  size?: string;
  quantity: number;
  unit_price: number;
  order_value: number;
  shipping_city?: string;
  shipping_country?: string;
  shipping_method?: ShippingMethod;
};

export type Customer = {
  customer_id: string;
  customer_segment: CustomerSegment;
  customer_lifetime_value: number;
  customer_orders_count: number;
  customer_returns_count: number;
  is_vip: boolean;
  email?: string;
  country?: string;
};

export type Product = {
  sku: string;
  product_name: string;
  category: string;
  size?: string;
  unit_price: number;
};

export type InventoryItem = {
  sku: string;
  product_name?: string;
  category?: string;
  size?: string;
  unit_price?: number;
  warehouse_stock?: number;
  inventory_available_units: number;
  inventory_reserved_units: number;
  inventory_incoming_units: number;
  inventory_incoming_eta: string | null; // ISO date or null
  product_page_views_last_hour?: number;
  sell_through_rate_last_hour?: number;
  conversion_rate_last_hour?: number;
};

export type SupportTicket = {
  support_ticket_id: string;
  customer_id: string;
  order_id?: string;
  support_ticket_message: string;
  support_ticket_urgency: TicketUrgency;
  support_ticket_sentiment: TicketSentiment;
  status?: TicketStatus;
  created_at?: string;
};

export type CampaignIntensityLevel = "very_high" | "high" | "medium" | "low";

export type Campaign = {
  campaign_id: string;
  campaign_source: CampaignSource;
  status?: string;
  campaign_intensity: CampaignIntensityLevel | number; // string in real data, number for synthetic
  intensity_numeric: number; // 0-1, normalized
  target_sku?: string;
  target_city?: string;
  target_category?: string;
  budget_spent: number;
  traffic_growth?: number;
  conversion_rate?: number;
  started_at?: string;
  active: boolean;
};

// =============== Enriched entities (después del join) ===============

export type EnrichedOrder = Order & {
  customer?: Customer;
  inventory_item?: InventoryItem;
  open_tickets?: SupportTicket[];
  product?: Product;
};

export type EnrichedTicket = SupportTicket & {
  customer?: Customer;
  order?: Order;
};

// =============== Output ===============

export type ActionType =
  | "prioritize_order"
  | "contact_customer"
  | "expedite_shipping"
  | "review_manually"
  | "escalate_ticket"
  | "pause_campaign"
  | "limit_purchase_per_customer"
  | "restock_alert"
  | "offer_compensation"
  | "merge_orders"
  | "cancel_order_proactively";

export type ActionOwner = "operations" | "customer_service" | "commercial" | "warehouse";

export type PrioritizedAction = {
  rank: number;
  action_type: ActionType;
  target_id: string;
  target_type: "order" | "customer" | "ticket" | "product" | "campaign";
  title: string;
  reason: string;
  expected_impact: string;
  confidence: number; // 0-1
  owner: ActionOwner;
  automation_possible: boolean;
  score_dimensions?: {
    urgencia: number; // 0-100, qué pronto va a estallar
    impacto: number; // 0-100, magnitud del daño €/clientes/reputación
    evidencia: number; // 0-100, # de señales convergentes
    tier: "P0" | "P1" | "P2" | "P3"; // P0=inmediata, P1=esta hora, P2=este turno, P3=monitoreo
    total: number; // 0-100, score agregado
    explanation: {
      urgencia: string; // 1 frase explicando
      impacto: string;
      evidencia: string;
    };
  };
  // Internal — para debug/explainability
  _scores?: {
    base_score: number;
    components: Record<string, number>;
  };
  _data_snapshot?: Record<string, unknown>;
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
  actions: PrioritizedAction[];
  data_quality_warnings: string[];
};
