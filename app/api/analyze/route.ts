import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  enrichOrders,
  enrichTickets,
  normalizeBundle,
  type RawCsvBundle,
} from "@/lib/data-normalizer";
import {
  buildAnalysisResult,
  generateCandidates,
  scoreAll,
  selectTopN,
} from "@/lib/prioritizer";
import { enrichCandidatesWithLLM } from "@/lib/llm-enricher";

export const runtime = "nodejs";
export const maxDuration = 120;

const DATA_DIR = path.join(process.cwd(), "data");

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

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const skipLlm = url.searchParams.get("llm") === "false";
  const topN = parseInt(url.searchParams.get("top") ?? "10", 10);

  return runAnalysis(await loadDefaultBundle(), { skipLlm, topN });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const bundle: RawCsvBundle = {
    orders: body.orders,
    customers: body.customers,
    products: body.products,
    inventory: body.inventory,
    support_tickets: body.support_tickets,
    campaigns: body.campaigns,
  };

  // Si el usuario no manda nada custom, usa los del filesystem
  const hasAnyData = Object.values(bundle).some((v) => v && v.length > 0);
  const finalBundle = hasAnyData ? bundle : await loadDefaultBundle();

  return runAnalysis(finalBundle, {
    skipLlm: body.skipLlm === true,
    topN: body.topN ?? 10,
  });
}

async function runAnalysis(
  bundle: RawCsvBundle,
  opts: { skipLlm: boolean; topN: number },
) {
  const start = Date.now();
  try {
    const data = normalizeBundle(bundle);

    if (data.orders.length === 0) {
      return NextResponse.json(
        {
          error: "No data loaded",
          hint: "Coloca los CSVs en /data o pásalos via POST body",
          warnings: data.warnings,
        },
        { status: 400 },
      );
    }

    const scores = scoreAll(data);
    const candidates = generateCandidates(data, scores);
    const top = selectTopN(candidates, opts.topN);

    const actions = opts.skipLlm
      ? (await import("@/lib/llm-enricher")).enrichDeterministic(top)
      : await enrichCandidatesWithLLM(top);

    const result = buildAnalysisResult(data, actions, candidates.length);

    return NextResponse.json({
      ...result,
      _meta: {
        total_latency_ms: Date.now() - start,
        llm_used: !opts.skipLlm,
        sources_loaded: Object.keys(bundle).filter(
          (k) => !!bundle[k as keyof RawCsvBundle],
        ),
        enriched_orders_sample: enrichOrders(data).slice(0, 3),
        enriched_tickets_sample: enrichTickets(data).slice(0, 3),
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
