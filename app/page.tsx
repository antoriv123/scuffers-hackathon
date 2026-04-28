"use client";
import { useEffect, useState } from "react";

type Action = {
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
  _scores?: {
    base_score: number;
    components: Record<string, number>;
  };
  _data_snapshot?: Record<string, unknown>;
};

type AnalysisResult = {
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
    sources_loaded: string[];
  };
};

const OWNER_LABELS: Record<string, { label: string; color: string }> = {
  operations: { label: "Operations", color: "bg-blue-100 text-blue-800 border-blue-300" },
  customer_service: { label: "Customer Service", color: "bg-pink-100 text-pink-800 border-pink-300" },
  commercial: { label: "Commercial", color: "bg-amber-100 text-amber-800 border-amber-300" },
  warehouse: { label: "Warehouse", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
};

const ACTION_LABELS: Record<string, string> = {
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

export default function Home() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterOwner, setFilterOwner] = useState<string | null>(null);
  const [skipLlm, setSkipLlm] = useState(false);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/analyze?llm=${!skipLlm}&top=10`, { method: "GET" });
      const json = await r.json();
      if (json.error) {
        setError(json.error);
      } else {
        setResult(json);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredActions = filterOwner
    ? result?.actions.filter((a) => a.owner === filterOwner)
    : result?.actions;

  return (
    <main className="max-w-6xl mx-auto p-6 md:p-10">
      <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-neutral-500 mb-2">
            Scuffers · AI Ops Control Tower
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Top acciones del lanzamiento
          </h1>
          <p className="text-neutral-600 mt-2 max-w-2xl">
            Sistema de priorización automática de acciones operativas durante
            un lanzamiento de alta demanda. Cruza pedidos, clientes, stock,
            tickets y campañas para detectar dónde actuar primero.
          </p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="bg-black text-white px-5 py-2.5 rounded-md font-medium disabled:opacity-50 text-sm"
          >
            {loading ? "Analizando..." : "🔄 Re-analizar"}
          </button>
          <label className="flex items-center gap-2 text-xs text-neutral-600">
            <input
              type="checkbox"
              checked={skipLlm}
              onChange={(e) => setSkipLlm(e.target.checked)}
            />
            Modo determinístico (sin LLM, más rápido)
          </label>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-900 rounded-md p-4 mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && !result && (
        <div className="text-center py-20 text-neutral-500">
          Cargando datos y generando análisis...
          <br />
          <span className="text-xs">
            (con LLM tarda ~30-60s por la primera cache; siguientes mucho más
            rápidas)
          </span>
        </div>
      )}

      {result && (
        <>
          <DataSummary result={result} />

          <FilterBar
            filterOwner={filterOwner}
            setFilterOwner={setFilterOwner}
            actions={result.actions}
          />

          <section className="space-y-3">
            {filteredActions?.map((action) => (
              <ActionCard key={`${action.action_type}-${action.target_id}`} action={action} />
            ))}
          </section>

          {result.data_quality_warnings.length > 0 && (
            <details className="mt-10 bg-amber-50 border border-amber-200 rounded-md p-4 text-sm">
              <summary className="cursor-pointer font-medium">
                ⚠️ {result.data_quality_warnings.length} avisos de calidad de
                datos
              </summary>
              <ul className="mt-2 space-y-1 text-xs font-mono">
                {result.data_quality_warnings.slice(0, 20).map((w, i) => (
                  <li key={i}>· {w}</li>
                ))}
              </ul>
            </details>
          )}

          {result._meta && (
            <footer className="mt-10 pt-6 border-t border-neutral-200 text-xs text-neutral-500 flex flex-wrap gap-4">
              <span>
                Latencia: {(result._meta.total_latency_ms / 1000).toFixed(1)}s
              </span>
              <span>
                LLM:{" "}
                {result._meta.llm_used ? "✓ Claude (CLI)" : "✗ determinístico"}
              </span>
              <span>Sources: {result._meta.sources_loaded.join(", ")}</span>
              <span>
                Generado: {new Date(result.generated_at).toLocaleTimeString()}
              </span>
            </footer>
          )}
        </>
      )}
    </main>
  );
}

function DataSummary({ result }: { result: AnalysisResult }) {
  const ds = result.data_summary;
  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <Stat label="Pedidos analizados" value={ds.orders} />
      <Stat label="Clientes" value={ds.customers} />
      <Stat label="SKUs en stock" value={ds.inventory_items} />
      <Stat label="Tickets abiertos" value={ds.tickets} />
      <Stat label="Campañas activas" value={ds.campaigns} />
      <Stat label="Issues detectados" value={ds.issues_detected} />
      <Stat label="Top acciones" value={result.actions.length} highlight />
      <Stat
        label="Avisos calidad datos"
        value={result.data_quality_warnings.length}
      />
    </section>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`border rounded-md p-3 ${highlight ? "bg-black text-white border-black" : "bg-white border-neutral-200"}`}
    >
      <div className={`text-xs uppercase tracking-widest ${highlight ? "text-neutral-300" : "text-neutral-500"}`}>
        {label}
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function FilterBar({
  filterOwner,
  setFilterOwner,
  actions,
}: {
  filterOwner: string | null;
  setFilterOwner: (v: string | null) => void;
  actions: Action[];
}) {
  const owners = Array.from(new Set(actions.map((a) => a.owner)));
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
      <span className="text-xs uppercase tracking-widest text-neutral-500 mr-2">
        Filtrar por owner:
      </span>
      <button
        onClick={() => setFilterOwner(null)}
        className={`px-3 py-1 rounded-full border ${filterOwner === null ? "bg-black text-white border-black" : "bg-white border-neutral-300 hover:bg-neutral-100"}`}
      >
        Todos ({actions.length})
      </button>
      {owners.map((o) => {
        const count = actions.filter((a) => a.owner === o).length;
        const label = OWNER_LABELS[o]?.label ?? o;
        return (
          <button
            key={o}
            onClick={() => setFilterOwner(o === filterOwner ? null : o)}
            className={`px-3 py-1 rounded-full border ${filterOwner === o ? "bg-black text-white border-black" : "bg-white border-neutral-300 hover:bg-neutral-100"}`}
          >
            {label} ({count})
          </button>
        );
      })}
    </div>
  );
}

function ActionCard({ action }: { action: Action }) {
  const [expanded, setExpanded] = useState(false);
  const owner = OWNER_LABELS[action.owner] ?? {
    label: action.owner,
    color: "bg-neutral-100 text-neutral-800 border-neutral-300",
  };

  const confidencePct = Math.round(action.confidence * 100);
  const confidenceColor =
    action.confidence >= 0.85
      ? "text-emerald-700 bg-emerald-50"
      : action.confidence >= 0.7
        ? "text-blue-700 bg-blue-50"
        : "text-amber-700 bg-amber-50";

  return (
    <article className="border border-neutral-200 rounded-lg bg-white overflow-hidden">
      <div className="p-4 md:p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold">
            {action.rank}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-1.5">
              <span className={`text-xs px-2 py-0.5 border rounded-full font-medium ${owner.color}`}>
                {owner.label}
              </span>
              <span className="text-xs px-2 py-0.5 border border-neutral-300 rounded-full text-neutral-700">
                {ACTION_LABELS[action.action_type] ?? action.action_type}
              </span>
              <code className="text-xs text-neutral-500">{action.target_id}</code>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ml-auto ${confidenceColor}`}>
                {confidencePct}% confianza
              </span>
              {action.automation_possible && (
                <span className="text-xs px-2 py-0.5 rounded bg-violet-50 text-violet-700">
                  ⚡ Automatizable
                </span>
              )}
            </div>
            <h3 className="font-semibold text-base leading-snug mb-1">
              {action.title}
            </h3>
            <p className="text-sm text-neutral-700 leading-relaxed">
              {action.reason}
            </p>
            <div className="mt-2 text-sm text-neutral-600 italic">
              💡 {action.expected_impact}
            </div>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs text-neutral-500 hover:text-neutral-900"
        >
          {expanded ? "▼ Ocultar detalle técnico" : "▶ Ver detalle técnico (scores + datos)"}
        </button>
      </div>

      {expanded && (
        <div className="bg-neutral-50 border-t border-neutral-200 p-4 md:p-5 space-y-3">
          {action._scores && (
            <div>
              <div className="text-xs uppercase tracking-widest text-neutral-500 mb-1">
                Score breakdown
              </div>
              <div className="text-xs font-mono space-y-0.5">
                <div>base_score: <strong>{action._scores.base_score.toFixed(3)}</strong></div>
                {Object.entries(action._scores.components).map(([k, v]) => (
                  <div key={k} className="text-neutral-600">
                    {k}: {typeof v === "number" ? v.toFixed(3) : String(v)}
                  </div>
                ))}
              </div>
            </div>
          )}
          {action._data_snapshot && (
            <details>
              <summary className="text-xs cursor-pointer text-neutral-600">
                Data snapshot (lo que el scorer vio)
              </summary>
              <pre className="mt-2 text-xs bg-white border border-neutral-200 rounded p-2 overflow-x-auto max-h-72">
                {JSON.stringify(action._data_snapshot, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </article>
  );
}
