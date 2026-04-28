/**
 * Cliente para la Shipping Status API de Scuffers.
 * GET https://lkuutmnykcnbfmbpopcu.functions.supabase.co/api/shipping-status/{order_id}
 * Header: X-Candidate-Id (process.env.CANDIDATE_ID)
 *
 * Resiliente: si CANDIDATE_ID no está, no rompe el pipeline.
 * Cache en memoria con TTL para evitar llamar varias veces a la misma orden.
 */

const BASE_URL =
  "https://lkuutmnykcnbfmbpopcu.functions.supabase.co/api/shipping-status";

const TIMEOUT_MS = 5000;
const RETRY_DELAY_MS = 1000;
const CACHE_TTL_MS = 60_000;
const CONCURRENCY_LIMIT = 5;

export type ShippingStatusValue =
  | "label_created"
  | "picked_up"
  | "in_transit"
  | "at_sorting_center"
  | "out_for_delivery"
  | "delivered"
  | "delayed"
  | "exception"
  | "lost"
  | "returned_to_sender"
  | "unknown";

export type ShippingStatus = {
  order_id: string;
  shipping_status: ShippingStatusValue | string;
  estimated_delivery_date?: string;
  delay_risk: number;
  delay_reason?: string;
  delivery_attempts: number;
  requires_manual_review: boolean;
  fetched_at: string;
  api_error?: string;
  from_cache?: boolean;
};

export type ShippingFetchStats = {
  calls_made: number;
  successful: number;
  failed: number;
  cache_hits: number;
};

type CacheEntry = { data: ShippingStatus; ts: number };
const cache = new Map<string, CacheEntry>();

function getCached(orderId: string): ShippingStatus | null {
  const entry = cache.get(orderId);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(orderId);
    return null;
  }
  return { ...entry.data, from_cache: true };
}

function setCached(orderId: string, data: ShippingStatus) {
  cache.set(orderId, { data, ts: Date.now() });
}

async function doFetch(orderId: string, candidateId: string): Promise<Response> {
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${BASE_URL}/${encodeURIComponent(orderId)}`, {
      method: "GET",
      headers: {
        "X-Candidate-Id": candidateId,
        Accept: "application/json",
      },
      signal: ctrl.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchShippingStatus(
  orderId: string,
): Promise<ShippingStatus | null> {
  const candidateId = process.env.CANDIDATE_ID;
  if (!candidateId) {
    console.warn(
      "[shipping-api] CANDIDATE_ID missing — skip shipping enrichment",
    );
    return null;
  }

  const cached = getCached(orderId);
  if (cached) {
    console.log(`[shipping-api] cache hit ${orderId}`);
    return cached;
  }

  const startedAt = Date.now();
  try {
    let res = await doFetch(orderId, candidateId);

    if (res.status === 429) {
      console.warn(`[shipping-api] 429 ${orderId} — retrying in ${RETRY_DELAY_MS}ms`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      res = await doFetch(orderId, candidateId);
    }

    if (res.status === 404) {
      const data: ShippingStatus = {
        order_id: orderId,
        shipping_status: "unknown",
        delay_risk: 0,
        delivery_attempts: 0,
        requires_manual_review: false,
        fetched_at: new Date().toISOString(),
        api_error: "not_found",
      };
      setCached(orderId, data);
      console.log(`[shipping-api] 404 ${orderId}`);
      return data;
    }

    if (!res.ok) {
      console.warn(`[shipping-api] ${res.status} ${orderId}`);
      return null;
    }

    const json = (await res.json()) as Partial<ShippingStatus>;
    const data: ShippingStatus = {
      order_id: json.order_id ?? orderId,
      shipping_status: (json.shipping_status as ShippingStatusValue) ?? "unknown",
      estimated_delivery_date: json.estimated_delivery_date,
      delay_risk:
        typeof json.delay_risk === "number" ? json.delay_risk : 0,
      delay_reason: json.delay_reason,
      delivery_attempts:
        typeof json.delivery_attempts === "number" ? json.delivery_attempts : 0,
      requires_manual_review: json.requires_manual_review === true,
      fetched_at: new Date().toISOString(),
    };
    setCached(orderId, data);
    console.log(
      `[shipping-api] ${orderId} → ${data.shipping_status} risk=${data.delay_risk} (${Date.now() - startedAt}ms)`,
    );
    return data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.warn(`[shipping-api] FAIL ${orderId}: ${msg}`);
    return null;
  }
}

export async function fetchShippingForOrders(
  orderIds: string[],
): Promise<{ map: Map<string, ShippingStatus>; stats: ShippingFetchStats }> {
  const stats: ShippingFetchStats = {
    calls_made: 0,
    successful: 0,
    failed: 0,
    cache_hits: 0,
  };
  const map = new Map<string, ShippingStatus>();
  const unique = Array.from(new Set(orderIds.filter(Boolean)));

  for (let i = 0; i < unique.length; i += CONCURRENCY_LIMIT) {
    const batch = unique.slice(i, i + CONCURRENCY_LIMIT);
    const results = await Promise.all(
      batch.map(async (id) => {
        const cached = getCached(id);
        if (cached) {
          stats.cache_hits++;
          return [id, cached] as const;
        }
        stats.calls_made++;
        const res = await fetchShippingStatus(id);
        if (res) {
          stats.successful++;
          return [id, res] as const;
        }
        stats.failed++;
        return [id, null] as const;
      }),
    );
    for (const [id, data] of results) {
      if (data) map.set(id, data);
    }
  }

  return { map, stats };
}

export function isShippingEnabled(): boolean {
  return !!process.env.CANDIDATE_ID;
}

export function clearShippingCache(): void {
  cache.clear();
}
