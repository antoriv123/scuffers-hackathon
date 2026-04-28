/**
 * Normaliza CSVs raw a entidades tipadas + cruza datos para enriquecer.
 */

import {
  parseCsv,
  pick,
  toBool,
  toInt,
  toNumber,
  toDateOrNull,
  toString,
} from "./csv-loader";
import type {
  Campaign,
  Customer,
  CustomerSegment,
  EnrichedOrder,
  EnrichedTicket,
  InventoryItem,
  Order,
  OrderStatus,
  Product,
  ShippingMethod,
  SupportTicket,
  TicketSentiment,
  TicketUrgency,
  TicketStatus,
  CampaignSource,
} from "./types";

export type RawCsvBundle = {
  orders?: string;
  customers?: string;
  products?: string;
  inventory?: string;
  support_tickets?: string;
  campaigns?: string;
};

export type NormalizedData = {
  orders: Order[];
  customers: Map<string, Customer>;
  products: Map<string, Product>;
  inventory: Map<string, InventoryItem>;
  tickets: SupportTicket[];
  campaigns: Campaign[];
  warnings: string[];
};

// =============== Normalizers per entity ===============

function normalizeOrderStatus(raw: string | undefined): OrderStatus {
  const v = (raw ?? "").toLowerCase().replace(/\s+/g, "_");
  const valid: OrderStatus[] = [
    "pending",
    "payment_review",
    "paid",
    "processing",
    "packed",
    "in_transit",
    "delivered",
    "delivered_partial",
    "lost",
    "cancelled",
    "returned",
  ];
  return (valid.find((s) => s === v || v.includes(s)) ??
    "pending") as OrderStatus;
}

function normalizeShippingMethod(
  raw: string | undefined,
): ShippingMethod | undefined {
  const v = (raw ?? "").toLowerCase();
  if (!v) return undefined;
  if (v.includes("express") || v.includes("rapid")) return "express";
  if (v.includes("priority")) return "priority";
  if (v.includes("pickup") || v.includes("recogida")) return "pickup";
  return "standard";
}

function normalizeSegment(raw: string | undefined): CustomerSegment {
  const v = (raw ?? "").toLowerCase();
  if (v.includes("vip")) return "vip";
  if (v.includes("loyal") || v.includes("fiel")) return "loyal";
  if (v.includes("new") || v.includes("nuevo")) return "new";
  if (v.includes("dormant") || v.includes("inactivo")) return "dormant";
  return "regular";
}

function normalizeUrgency(raw: string | undefined): TicketUrgency {
  const v = (raw ?? "").toLowerCase();
  if (v.includes("critical") || v.includes("crítico")) return "critical";
  if (v.includes("high") || v.includes("alta")) return "high";
  if (v.includes("medium") || v.includes("media")) return "medium";
  return "low";
}

function normalizeSentiment(raw: string | undefined): TicketSentiment {
  const v = (raw ?? "").toLowerCase();
  if (v.includes("very_negative") || v.includes("very negative") || v.includes("muy negativo"))
    return "very_negative";
  if (v.includes("negative") || v.includes("negativo")) return "negative";
  if (v.includes("positive") || v.includes("positivo")) return "positive";
  return "neutral";
}

function normalizeTicketStatus(raw: string | undefined): TicketStatus {
  const v = (raw ?? "").toLowerCase();
  if (v.includes("escalat")) return "escalated";
  if (v.includes("resolv")) return "resolved";
  if (v.includes("pending") || v.includes("pendiente")) return "pending";
  return "open";
}

function normalizeCampaignSource(raw: string | undefined): CampaignSource {
  const v = (raw ?? "").toLowerCase();
  if (v.includes("ig") || v.includes("instagram"))
    return v.includes("paid") ? "instagram_paid" : "instagram_organic";
  if (v.includes("tiktok")) return "tiktok_paid";
  if (v.includes("google")) return "google_ads";
  if (v.includes("influencer")) return "influencer";
  if (v.includes("newsletter")) return "newsletter";
  return "email";
}

// =============== Main normalizer ===============

export function normalizeBundle(bundle: RawCsvBundle): NormalizedData {
  const warnings: string[] = [];

  const orders: Order[] = [];
  if (bundle.orders) {
    const parsed = parseCsv(bundle.orders);
    warnings.push(...parsed.warnings.map((w) => `[orders] ${w}`));
    for (const row of parsed.rows) {
      const order_id = pick(row, ["order_id", "id"]);
      if (!order_id) {
        warnings.push(`[orders] skipping row without order_id`);
        continue;
      }
      orders.push({
        order_id: toString(order_id),
        customer_id: toString(pick(row, ["customer_id", "client_id"])),
        created_at:
          toDateOrNull(pick(row, ["created_at", "order_date", "date"])) ??
          new Date().toISOString(),
        order_status: normalizeOrderStatus(pick(row, ["order_status", "status"])),
        sku: toString(pick(row, ["sku", "product_sku"])),
        product_name: toString(pick(row, ["product_name", "name"])),
        category: toString(pick(row, ["category"])),
        size: toString(pick(row, ["size", "talla"])),
        quantity: toInt(pick(row, ["quantity", "qty"]), 1),
        unit_price: toNumber(pick(row, ["unit_price", "price"])),
        order_value: toNumber(pick(row, ["order_value", "total", "amount"])),
        shipping_city: toString(pick(row, ["shipping_city", "city"])),
        shipping_country: toString(pick(row, ["shipping_country", "country"])),
        shipping_method: normalizeShippingMethod(
          pick(row, ["shipping_method", "delivery_method"]),
        ),
      });
    }
  }

  const customers = new Map<string, Customer>();
  if (bundle.customers) {
    const parsed = parseCsv(bundle.customers);
    warnings.push(...parsed.warnings.map((w) => `[customers] ${w}`));
    for (const row of parsed.rows) {
      const customer_id = pick(row, ["customer_id", "id"]);
      if (!customer_id) continue;
      const cust: Customer = {
        customer_id: toString(customer_id),
        customer_segment: normalizeSegment(
          pick(row, ["customer_segment", "segment"]),
        ),
        customer_lifetime_value: toNumber(
          pick(row, ["customer_lifetime_value", "ltv", "lifetime_value"]),
        ),
        customer_orders_count: toInt(
          pick(row, ["customer_orders_count", "orders_count"]),
        ),
        customer_returns_count: toInt(
          pick(row, ["customer_returns_count", "returns_count"]),
        ),
        is_vip: toBool(pick(row, ["is_vip", "vip"])),
        email: toString(pick(row, ["email", "customer_email"])),
        country: toString(pick(row, ["country", "shipping_country"])),
      };
      customers.set(cust.customer_id, cust);
    }
  }

  const products = new Map<string, Product>();
  if (bundle.products) {
    const parsed = parseCsv(bundle.products);
    warnings.push(...parsed.warnings.map((w) => `[products] ${w}`));
    for (const row of parsed.rows) {
      const sku = pick(row, ["sku", "id"]);
      if (!sku) continue;
      products.set(toString(sku), {
        sku: toString(sku),
        product_name: toString(pick(row, ["product_name", "name"])),
        category: toString(pick(row, ["category"])),
        size: toString(pick(row, ["size", "talla"])),
        unit_price: toNumber(pick(row, ["unit_price", "price"])),
      });
    }
  }

  const inventory = new Map<string, InventoryItem>();
  if (bundle.inventory) {
    const parsed = parseCsv(bundle.inventory);
    warnings.push(...parsed.warnings.map((w) => `[inventory] ${w}`));
    for (const row of parsed.rows) {
      const sku = pick(row, ["sku", "product_sku"]);
      if (!sku) continue;
      inventory.set(toString(sku), {
        sku: toString(sku),
        product_name: toString(pick(row, ["product_name", "name"])),
        category: toString(pick(row, ["category"])),
        size: toString(pick(row, ["size", "talla"])),
        unit_price: toNumber(pick(row, ["unit_price", "price"])),
        warehouse_stock: toInt(pick(row, ["warehouse_stock"])),
        inventory_available_units: toInt(
          pick(row, ["inventory_available_units", "available", "stock"]),
        ),
        inventory_reserved_units: toInt(
          pick(row, ["inventory_reserved_units", "reserved"]),
        ),
        inventory_incoming_units: toInt(
          pick(row, ["inventory_incoming_units", "incoming"]),
        ),
        inventory_incoming_eta: toDateOrNull(
          pick(row, ["inventory_incoming_eta", "eta"]),
        ),
        product_page_views_last_hour: toInt(
          pick(row, ["product_page_views_last_hour", "page_views"]),
        ),
        sell_through_rate_last_hour: toNumber(
          pick(row, ["sell_through_rate_last_hour"]),
        ),
        conversion_rate_last_hour: toNumber(
          pick(row, ["conversion_rate_last_hour", "conversion_rate"]),
        ),
      });
    }
  }

  const tickets: SupportTicket[] = [];
  if (bundle.support_tickets) {
    const parsed = parseCsv(bundle.support_tickets);
    warnings.push(...parsed.warnings.map((w) => `[tickets] ${w}`));
    for (const row of parsed.rows) {
      const ticket_id = pick(row, ["support_ticket_id", "ticket_id", "id"]);
      if (!ticket_id) continue;
      tickets.push({
        support_ticket_id: toString(ticket_id),
        customer_id: toString(pick(row, ["customer_id"])),
        order_id: toString(pick(row, ["order_id"])),
        support_ticket_message: toString(
          pick(row, ["support_ticket_message", "message", "body"]),
        ),
        support_ticket_urgency: normalizeUrgency(
          pick(row, ["support_ticket_urgency", "urgency", "priority"]),
        ),
        support_ticket_sentiment: normalizeSentiment(
          pick(row, ["support_ticket_sentiment", "sentiment"]),
        ),
        status: normalizeTicketStatus(pick(row, ["status", "ticket_status"])),
        created_at: toDateOrNull(pick(row, ["created_at", "date"])) ?? undefined,
      });
    }
  }

  const campaigns: Campaign[] = [];
  if (bundle.campaigns) {
    const parsed = parseCsv(bundle.campaigns);
    warnings.push(...parsed.warnings.map((w) => `[campaigns] ${w}`));
    for (const row of parsed.rows) {
      const campaign_id = pick(row, ["campaign_id", "id"]);
      if (!campaign_id) continue;
      const intensityRaw = pick(row, ["campaign_intensity", "intensity"]) ?? "";
      const intensityLevel = (intensityRaw.toString().toLowerCase().replace(/\s+/g, "_") || "medium") as
        | "very_high"
        | "high"
        | "medium"
        | "low";
      const intensityNumber = toNumber(intensityRaw);
      const intensityNumeric = intensityNumber > 0
        ? Math.min(1, intensityNumber / 100)
        : { very_high: 1.0, high: 0.75, medium: 0.5, low: 0.25 }[intensityLevel] ?? 0.5;

      const status = toString(pick(row, ["status", "campaign_status"])) || undefined;
      campaigns.push({
        campaign_id: toString(campaign_id),
        campaign_source: normalizeCampaignSource(
          pick(row, ["campaign_source", "source"]),
        ),
        status,
        campaign_intensity: intensityNumber > 0 ? intensityNumber : intensityLevel,
        intensity_numeric: intensityNumeric,
        target_sku: toString(pick(row, ["target_sku", "sku"])) || undefined,
        target_city: toString(pick(row, ["target_city", "city"])) || undefined,
        target_category: toString(pick(row, ["target_category", "category"])) || undefined,
        budget_spent: toNumber(
          pick(row, ["budget_spent", "spend_last_hour", "ad_spend"]),
        ),
        traffic_growth: toNumber(pick(row, ["traffic_growth"])),
        conversion_rate: toNumber(
          pick(row, ["conversion_rate", "conversion_rate_last_hour"]),
        ),
        started_at: toDateOrNull(pick(row, ["started_at", "start_date"])) ?? undefined,
        active: status ? status === "active" : toBool(pick(row, ["active", "is_active"]), true),
      });
    }
  }

  return {
    orders,
    customers,
    products,
    inventory,
    tickets,
    campaigns,
    warnings,
  };
}

// =============== Enrichment (joins) ===============

export function enrichOrders(data: NormalizedData): EnrichedOrder[] {
  return data.orders.map((order) => ({
    ...order,
    customer: data.customers.get(order.customer_id),
    inventory_item: data.inventory.get(order.sku),
    open_tickets: data.tickets.filter(
      (t) =>
        t.order_id === order.order_id &&
        t.status !== "resolved",
    ),
    product: data.products.get(order.sku),
  }));
}

export function enrichTickets(data: NormalizedData): EnrichedTicket[] {
  return data.tickets.map((ticket) => ({
    ...ticket,
    customer: data.customers.get(ticket.customer_id),
    order: ticket.order_id
      ? data.orders.find((o) => o.order_id === ticket.order_id)
      : undefined,
  }));
}
