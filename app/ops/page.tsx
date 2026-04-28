"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Maximize2, Minimize2 } from "lucide-react";

import type { Action, AnalysisResult } from "../components/types";
import { computeFallbackHeroMetrics, defaultScoreDimensions } from "../components/types";
import { HeroStrip } from "../components/HeroStrip";
import { HeroSkeleton, LoadingHeader } from "../components/SkeletonHero";
import { Tabs, TABS } from "../components/Tabs";
import type { TabId } from "../components/Tabs";
import { ActionFilter } from "../components/ActionFilter";
import { ActionCard, ActionCardSkeleton } from "../components/ActionCard";
import { DrillDownModal } from "../components/DrillDownModal";
import { Toast } from "../components/Toast";
import { TabPedidos } from "../components/TabPedidos";
import { TabClientes } from "../components/TabClientes";
import { TabProductos } from "../components/TabProductos";
import { TabTickets } from "../components/TabTickets";
import { TabCampanas } from "../components/TabCampanas";

export default function OpsHome() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipLlm, setSkipLlm] = useState(true);
  const [tab, setTab] = useState<TabId>("acciones");
  const [filterOwner, setFilterOwner] = useState<string | null>(null);
  const [executed, setExecuted] = useState<Set<string>>(new Set());
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [openAction, setOpenAction] = useState<Action | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(
        `/api/analyze?llm=${!skipLlm}&top=10&include_full_data=true`,
        { method: "GET" },
      );
      const json = (await r.json()) as AnalysisResult & { error?: string };
      if (json.error) {
        setError(json.error);
      } else {
        setResult(json);
        setLastUpdatedAt(new Date());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [skipLlm]);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  // Lightweight ticking clock for "hace Xs" relative timestamp
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const ordersSample = result?._meta?.full_data?.orders ?? result?._meta?.enriched_orders_sample ?? [];
  const ticketsSample = result?._meta?.full_data?.tickets ?? result?._meta?.enriched_tickets_sample ?? [];
  const campaignsFull = result?._meta?.full_data?.campaigns ?? [];
  const isFullData = !!result?._meta?.full_data;

  const heroMetrics = useMemo(() => {
    if (result?._meta?.hero_metrics) return result._meta.hero_metrics;
    return computeFallbackHeroMetrics(result?.actions ?? [], ordersSample, ticketsSample);
  }, [result, ordersSample, ticketsSample]);

  const sortedActions = useMemo(() => {
    if (!result) return [];
    const arr = [...result.actions];
    arr.sort((a, b) => {
      const ad = defaultScoreDimensions(a);
      const bd = defaultScoreDimensions(b);
      return bd.total - ad.total;
    });
    return arr.map((a, i) => ({ ...a, rank: i + 1 }));
  }, [result]);

  const filteredActions = filterOwner
    ? sortedActions.filter((a) => a.owner === filterOwner)
    : sortedActions;

  const inventory = useMemo(() => {
    const map = new Map<string, NonNullable<typeof ordersSample[number]["inventory_item"]>>();
    for (const o of ordersSample) {
      const inv = o.inventory_item;
      if (inv && inv.sku && !map.has(inv.sku)) map.set(inv.sku, inv);
    }
    return Array.from(map.values());
  }, [ordersSample]);

  const actionKey = (a: Action) => `${a.action_type}::${a.target_id}`;

  const onExecute = (a: Action) => {
    setExecuted((prev) => new Set(prev).add(actionKey(a)));
    setIgnored((prev) => {
      const next = new Set(prev);
      next.delete(actionKey(a));
      return next;
    });
    setToast("Acción ejecutada");
    if (openAction && actionKey(openAction) === actionKey(a)) setOpenAction(null);
  };

  const onIgnore = (a: Action) => {
    setIgnored((prev) => new Set(prev).add(actionKey(a)));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")
      )
        return;
      if (openAction) return;
      if (e.key === "f" || e.key === "F") {
        setFullscreen((v) => !v);
        return;
      }
      if (e.key === "r" || e.key === "R") {
        runAnalysis();
        return;
      }
      const idx = ["1", "2", "3", "4", "5", "6"].indexOf(e.key);
      if (idx >= 0 && idx < TABS.length) {
        setTab(TABS[idx].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openAction, runAnalysis]);

  const wrapClass = fullscreen
    ? "max-w-none mx-auto px-6 md:px-10"
    : "max-w-[1280px] mx-auto px-5 md:px-7";

  const summary = result?.data_summary;
  const issuesDetected = summary?.issues_detected ?? 0;
  const updatedAgo = lastUpdatedAt
    ? Math.max(0, Math.round((now.getTime() - lastUpdatedAt.getTime()) / 1000))
    : null;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      {/* TOPBAR — quiet, dense, ops-feel */}
      <div className="sticky top-0 z-30 bg-[var(--bg)]/95 backdrop-blur border-b border-[var(--line)]">
        <div className={`${wrapClass} flex items-center justify-between gap-4 py-3`}>
          <div className="flex items-baseline gap-4">
            <a href="/" className="text-[15px] font-bold tracking-[-0.01em] text-[var(--ink)] hover:text-[var(--accent)] transition-colors">
              scuffers<span className="text-[9px] align-top">®</span>
            </a>
            <span className="text-[13px] text-[var(--muted)]">Ops</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-[11px] text-[var(--muted)] mr-2">
              {updatedAgo !== null ? (
                <>
                  Actualizado{" "}
                  <span className="text-[var(--ink)] tabular-nums">
                    {updatedAgo < 60 ? `hace ${updatedAgo}s` : `hace ${Math.round(updatedAgo / 60)}m`}
                  </span>
                </>
              ) : (
                "Cargando…"
              )}
            </span>
            <label className="hidden sm:flex items-center gap-1.5 text-[12px] text-[var(--muted)] px-2.5 py-1.5 border border-[var(--line)] rounded-[4px] hover:border-[var(--accent)] cursor-pointer">
              <input
                type="checkbox"
                checked={!skipLlm}
                onChange={(e) => setSkipLlm(!e.target.checked)}
                className="accent-[var(--accent)]"
              />
              LLM
            </label>
            <button
              onClick={() => setFullscreen((v) => !v)}
              title="Pantalla completa (F)"
              className="text-[12px] px-2.5 py-1.5 border border-[var(--line)] rounded-[4px] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors inline-flex items-center gap-1.5"
            >
              {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={runAnalysis}
              disabled={loading}
              title="Re-analizar (R)"
              className="text-[12px] px-3 py-1.5 bg-[var(--ink)] text-white rounded-[4px] hover:bg-[var(--accent)] disabled:opacity-50 inline-flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Analizando…" : "Re-analizar"}
            </button>
          </div>
        </div>
      </div>

      <main className={`${wrapClass} pt-5 pb-12`}>
        {/* Page meta — single line, factual */}
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[20px] font-bold tracking-[-0.01em] text-[var(--ink)]">
              Acciones priorizadas
            </h1>
            {summary && (
              <span className="text-[12px] text-[var(--muted)] tabular-nums">
                {sortedActions.length} mostradas · {issuesDetected} candidatas · {summary.orders} pedidos · {summary.tickets} tickets · {summary.campaigns} campañas
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 border border-[var(--p0)]/40 bg-[var(--p0)]/5 text-[var(--p0)] rounded-[4px] px-3 py-2 text-[13px]">
            <strong className="font-bold">Error:</strong> {error}
          </div>
        )}

        {/* KPI strip — dense */}
        {(loading && !result) || !result ? <HeroSkeleton /> : <HeroStrip metrics={heroMetrics} />}
        {loading && !result && (
          <div className="mt-2">
            <LoadingHeader />
          </div>
        )}

        <div className="mt-6" />

        <Tabs active={tab} onChange={setTab} />

        {tab === "acciones" && (
          <section>
            {!result || loading ? (
              <div className="space-y-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                  <ActionCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <>
                <ActionFilter actions={sortedActions} filter={filterOwner} setFilter={setFilterOwner} />
                <div className="space-y-2">
                  {filteredActions.map((a) => {
                    const key = actionKey(a);
                    return (
                      <ActionCard
                        key={key}
                        action={a}
                        executed={executed.has(key)}
                        ignored={ignored.has(key)}
                        onOpen={() => setOpenAction(a)}
                        onExecute={() => onExecute(a)}
                        onIgnore={() => onIgnore(a)}
                      />
                    );
                  })}
                  {filteredActions.length === 0 && (
                    <div className="text-center py-8 text-[13px] text-[var(--muted)] border border-dashed border-[var(--line)] rounded-[4px]">
                      Sin acciones para este owner.
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {tab === "pedidos" && (
          <TabPedidos
            orders={ordersSample}
            isFull={isFullData}
            totalCount={result?.data_summary.orders ?? ordersSample.length}
          />
        )}
        {tab === "clientes" && <TabClientes orders={ordersSample} isFull={isFullData} />}
        {tab === "productos" && <TabProductos orders={ordersSample} isFull={isFullData} />}
        {tab === "tickets" && <TabTickets tickets={ticketsSample} isFull={isFullData} />}
        {tab === "campanas" && (
          <TabCampanas campaigns={campaignsFull} inventory={inventory} isFull={isFullData} />
        )}

        {result && result.data_quality_warnings.length > 0 && tab === "acciones" && (
          <details className="mt-8 border border-[var(--line)] rounded-[4px] p-3 text-[12px] text-[var(--muted)]">
            <summary className="cursor-pointer text-[var(--ink)]">
              {result.data_quality_warnings.length} avisos de calidad de datos
            </summary>
            <ul className="mt-2 space-y-1 font-mono text-[11px]">
              {result.data_quality_warnings.slice(0, 30).map((w, i) => (
                <li key={i}>· {w}</li>
              ))}
            </ul>
          </details>
        )}

        {result?._meta && (
          <footer className="mt-10 pt-3 border-t border-[var(--line)] text-[11px] text-[var(--muted)] flex flex-wrap items-center gap-3">
            {result._meta.total_latency_ms !== undefined && (
              <span>
                Análisis en{" "}
                <span className="font-mono text-[var(--ink)] tabular-nums">
                  {(result._meta.total_latency_ms / 1000).toFixed(2)}s
                </span>
              </span>
            )}
            <span>·</span>
            <span>{result._meta.llm_used ? "Claude Sonnet" : "Determinístico"}</span>
            {result._meta.fallback_used && (
              <span className="text-[var(--p1)]">· fallback aplicado</span>
            )}
            <span className="ml-auto text-[var(--muted)]">
              <kbd className="font-mono border border-[var(--line)] px-1 py-0.5 rounded-[2px]">R</kbd> recargar ·{" "}
              <kbd className="font-mono border border-[var(--line)] px-1 py-0.5 rounded-[2px]">F</kbd> fullscreen ·{" "}
              <kbd className="font-mono border border-[var(--line)] px-1 py-0.5 rounded-[2px]">1-6</kbd> tabs
            </span>
          </footer>
        )}
      </main>

      <DrillDownModal
        action={openAction}
        onClose={() => setOpenAction(null)}
        onExecute={() => openAction && onExecute(openAction)}
      />
      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
