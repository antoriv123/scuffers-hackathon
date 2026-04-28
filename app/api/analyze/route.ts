import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  enrichOrders,
  enrichTickets,
  normalizeBundle,
  type NormalizedData,
  type RawCsvBundle,
} from "@/lib/data-normalizer";
import {
  attachScoreDimensions,
  buildAnalysisResult,
  enrichWithShipping,
  generateCandidates,
  generateShippingDrivenCandidates,
  recalculateScoresWithShipping,
  scoreAll,
  selectTopN,
} from "@/lib/prioritizer";
import { enrichCandidatesWithLLM, enrichDeterministic } from "@/lib/llm-enricher";
import { isShippingEnabled } from "@/lib/shipping-api";
import type { Customer, InventoryItem } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const DATA_DIR = path.join(process.cwd(), "data");
const LLM_TIMEOUT_MS = 90_000;

const CSV_FILES = {
  orders: "orders.csv",
  customers: "customers.csv",
  products: "products.csv",
  inventory: "inventory.csv",
  support_tickets: "support_tickets.csv",
  campaigns: "campaigns.csv",
} as const;

async function loadDefaultBundle(): Promise<RawCsvBundle> {
  const bundle: RawCsvBundle = {};
  for (const [key, file] of Object.entries(CSV_FILES) as [
    keyof RawCsvBundle,
    string,
  ][]) {
    try {
      bundle[key] = await readFile(path.join(DATA_DIR, file), "utf8");
    } catch {
      // file may not exist (e.g., products.csv not provided in real dataset)
    }
  }
  return bundle;
}

function bundleHasData(bundle: RawCsvBundle): boolean {
  return Object.values(bundle).some((v) => typeof v === "string" && v.length > 0);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const skipLlm = url.searchParams.get("llm") === "false";
  const topN = parseInt(url.searchParams.get("top") ?? "10", 10);
  const includeFull = url.searchParams.get("include_full_data") === "true";

  const bundle = await loadDefaultBundle();
  if (!bundleHasData(bundle)) {
    return NextResponse.json(
      {
        error: "No data available",
        hint: "El directorio /data está vacío. Sube CSVs vía POST /api/upload o coloca los archivos en /data antes de analizar.",
      },
      { status: 400 },
    );
  }

  return runAnalysis(bundle, { skipLlm, topN, includeFull });
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const includeFullQuery = url.searchParams.get("include_full_data") === "true";

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const bundle: RawCsvBundle = {
    orders: typeof body.orders === "string" ? body.orders : undefined,
    customers: typeof body.customers === "string" ? body.customers : undefined,
    products: typeof body.products === "string" ? body.products : undefined,
    inventory: typeof body.inventory === "string" ? body.inventory : undefined,
    support_tickets:
      typeof body.support_tickets === "string" ? body.support_tickets : undefined,
    campaigns: typeof body.campaigns === "string" ? body.campaigns : undefined,
  };

  const hasAnyBodyData = bundleHasData(bundle);
  const finalBundle = hasAnyBodyData ? bundle : await loadDefaultBundle();

  if (!bundleHasData(finalBundle)) {
    return NextResponse.json(
      {
        error: "No data available",
        hint: "Body POST vacío y /data sin CSVs. Sube CSVs vía /api/upload o pásalos en el body.",
      },
      { status: 400 },
    );
  }

  return runAnalysis(finalBundle, {
    skipLlm: body.skipLlm === true,
    topN: typeof body.topN === "number" ? body.topN : 10,
    includeFull:
      includeFullQuery ||
      body.include_full_data === true ||
      body.includeFullData === true,
  });
}

async function runAnalysis(
  bundle: RawCsvBundle,
  opts: { skipLlm: boolean; topN: number; includeFull: boolean },
) {
  const start = Date.now();
  try {
    const data = normalizeBundle(bundle);

    if (data.orders.length === 0) {
      return NextResponse.json(
        {
          error: "No data loaded",
          hint: "Los CSVs están presentes pero no se pudieron parsear órdenes. Revisa formato.",
          warnings: data.warnings,
        },
        { status: 400 },
      );
    }

    const scores = scoreAll(data);
    const candidates = generateCandidates(data, scores);

    // Pre-shipping selection: pick a slightly larger pool so shipping rescoring can promote new entries.
    const preselectionN = Math.max(opts.topN + 5, opts.topN);
    const preselected = selectTopN(candidates, preselectionN);

    // Step 1: cruzar shipping API real (si CANDIDATE_ID está).
    // Ampliamos el pool a orders abiertas relevantes para que la API
    // pueda revelar lost/exception/customs_hold que el scoring base no detecta.
    const extraOrderIds = pickOrderIdsForShipping(data, preselected);
    const enriched = await enrichWithShipping(preselected, extraOrderIds);

    // Step 2: si la API revela órdenes lost/exception sin candidate, sintetizar nueva acción.
    const synthetic = generateShippingDrivenCandidates(
      enriched.shipping_map,
      enriched.candidates,
      data,
    );
    const merged = [...enriched.candidates, ...synthetic];

    // Step 3: aplicar boosts + reordenar.
    const rescored = recalculateScoresWithShipping(merged);

    // Re-aplicar selectTopN para respetar la diversidad de tipos tras añadir sintéticos.
    const top = selectTopN(rescored.candidates, opts.topN);
    const topWithDimensions = attachScoreDimensions(top);

    let actions;
    let fallbackUsed = false;
    let fallbackReason: string | undefined;

    if (opts.skipLlm) {
      actions = enrichDeterministic(topWithDimensions);
    } else {
      try {
        actions = await runWithTimeout(
          enrichCandidatesWithLLM(topWithDimensions, { timeoutMs: LLM_TIMEOUT_MS }),
          LLM_TIMEOUT_MS,
        );
      } catch (err) {
        fallbackUsed = true;
        fallbackReason =
          err instanceof Error ? err.message : "LLM enrichment failed";
        console.warn(`LLM enrichment fallback: ${fallbackReason}`);
        actions = enrichDeterministic(topWithDimensions);
      }
    }

    const result = buildAnalysisResult(data, actions, candidates.length);
    const heroMetrics = computeHeroMetrics(data);
    const fullData = opts.includeFull ? buildFullData(data) : undefined;

    return NextResponse.json({
      ...result,
      _meta: {
        total_latency_ms: Date.now() - start,
        llm_used: !opts.skipLlm && !fallbackUsed,
        fallback_used: fallbackUsed,
        fallback_reason: fallbackReason,
        sources_loaded: Object.keys(bundle).filter(
          (k) => !!bundle[k as keyof RawCsvBundle],
        ),
        hero_metrics: heroMetrics,
        enriched_orders_sample: enrichOrders(data).slice(0, 3),
        enriched_tickets_sample: enrichTickets(data).slice(0, 3),
        shipping_api: {
          enabled: isShippingEnabled(),
          calls_made: enriched.stats.calls_made,
          successful: enriched.stats.successful,
          failed: enriched.stats.failed,
          rankings_changed: rescored.rankings_changed,
          cache_hits: enriched.stats.cache_hits,
          synthetic_actions_added: synthetic.length,
        },
        ...(fullData ? { full_data: fullData } : {}),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json(
      { error: message, latency_ms: Date.now() - start },
      { status: 500 },
    );
  }
}

function runWithTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error(`LLM enrichment exceeded ${ms}ms timeout`));
    }, ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

type HeroMetrics = {
  total_spend_at_risk: number;
  critical_skus_count: number;
  vips_at_risk: number;
  urgent_tickets_count: number;
};

function computeHeroMetrics(data: NormalizedData): HeroMetrics {
  // critical_skus_count: SKUs con available <= reserved
  let criticalSkus = 0;
  const criticalSkuSet = new Set<string>();
  for (const inv of data.inventory.values()) {
    if (
      inv.inventory_available_units <= inv.inventory_reserved_units &&
      inv.inventory_reserved_units > 0
    ) {
      criticalSkus++;
      criticalSkuSet.add(inv.sku);
    }
  }

  // total_spend_at_risk: budget_spent de campañas activas con target_sku crítico
  let spendAtRisk = 0;
  for (const c of data.campaigns) {
    if (!c.active) continue;
    if (!c.target_sku) continue;
    if (criticalSkuSet.has(c.target_sku)) {
      spendAtRisk += c.budget_spent ?? 0;
    }
  }

  // vips_at_risk: customers VIP con order en estado abierto (NOT IN delivered/cancelled/returned)
  const closedStatus = new Set(["delivered", "cancelled", "returned"]);
  const vipIds = new Set<string>();
  for (const c of data.customers.values()) {
    if (c.is_vip) vipIds.add(c.customer_id);
  }
  const vipsAtRisk = new Set<string>();
  for (const o of data.orders) {
    if (vipIds.has(o.customer_id) && !closedStatus.has(o.order_status)) {
      vipsAtRisk.add(o.customer_id);
    }
  }

  // urgent_tickets_count
  const urgentSet = new Set(["high", "urgent", "critical"]);
  let urgentTickets = 0;
  for (const t of data.tickets) {
    if (urgentSet.has(t.support_ticket_urgency)) urgentTickets++;
  }

  return {
    total_spend_at_risk: Math.round(spendAtRisk * 100) / 100,
    critical_skus_count: criticalSkus,
    vips_at_risk: vipsAtRisk.size,
    urgent_tickets_count: urgentTickets,
  };
}

/**
 * Selecciona órdenes "abiertas" para consultar la shipping API más allá de los
 * candidatos base. Permite detectar lost/exception/customs_hold que el scoring
 * por CSVs no descubre.
 */
const SHIPPING_OPEN_STATUSES = new Set([
  "paid",
  "processing",
  "packed",
  "in_transit",
  "delivered_partial",
  "pending",
  "payment_review",
  "lost",
]);
const SHIPPING_EXTRA_CAP = 40;

function pickOrderIdsForShipping(
  data: NormalizedData,
  preselected: { target_id: string; target_type: string }[],
): string[] {
  const alreadyTargeted = new Set(
    preselected
      .filter((c) => c.target_type === "order")
      .map((c) => c.target_id),
  );

  const candidates = data.orders
    .filter((o) => SHIPPING_OPEN_STATUSES.has(o.order_status))
    .filter((o) => !alreadyTargeted.has(o.order_id))
    // Priorizamos por valor + recencia para no malgastar quota en orders triviales.
    .sort((a, b) => {
      const va = a.order_value ?? 0;
      const vb = b.order_value ?? 0;
      if (vb !== va) return vb - va;
      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    })
    .slice(0, SHIPPING_EXTRA_CAP)
    .map((o) => o.order_id);

  return candidates;
}

function buildFullData(data: NormalizedData): {
  orders: NormalizedData["orders"];
  customers: Customer[];
  inventory: InventoryItem[];
  tickets: NormalizedData["tickets"];
  campaigns: NormalizedData["campaigns"];
} {
  return {
    orders: data.orders,
    customers: Array.from(data.customers.values()),
    inventory: Array.from(data.inventory.values()),
    tickets: data.tickets,
    campaigns: data.campaigns,
  };
}
