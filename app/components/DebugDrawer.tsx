"use client";

export type ChatMeta = {
  category?: string;
  language?: string;
  escalate_human?: boolean;
  escalate_reason?: string | null;
  order_found?: {
    id: string;
    status: string;
    carrier: string;
    days_in_transit: number;
    country: string;
    value_eur: number;
    customer?: string;
  } | null;
  rag?: {
    kb_chunks: Array<{ id: string; title: string }>;
    similar_reviews: Array<{
      date: string;
      rating: number;
      language: string;
      pattern: string;
      excerpt: string;
    }>;
  };
  latency_ms?: number;
  cost_usd?: number;
  cache_read_tokens?: number;
  cache_creation_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
  model?: string;
  mode?: "cli" | "live" | "demo" | "mock" | "faq";
};

export default function DebugDrawer({
  meta,
  open,
  onClose,
}: {
  meta: ChatMeta | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar razonamiento"
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] overlay-in"
      />
      <aside
        className="fixed right-0 top-0 bottom-0 w-full sm:w-[380px] bg-white border-l border-scuffers-border z-[61] slide-in-right overflow-y-auto"
        role="dialog"
        aria-label="Razonamiento del bot"
      >
        <header className="sticky top-0 bg-white border-b border-scuffers-border px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] tracking-[0.22em] uppercase text-scuffers-taupe">
              Internal · Demo
            </div>
            <h3 className="font-black tracking-tightest text-lg leading-tight">
              Bot reasoning
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 flex items-center justify-center hover:bg-scuffers-cream-soft rounded-full"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </header>

        {!meta ? (
          <div className="p-5 text-sm text-scuffers-taupe">
            Aún no hay reasoning — manda un mensaje al bot primero.
          </div>
        ) : (
          <div className="p-5 space-y-5 text-[13px]">
            <DebugSection title="Classification">
              <Row label="Category" value={meta.category ?? "—"} mono />
              <Row label="Language" value={(meta.language ?? "—").toUpperCase()} mono />
              <Row
                label="Escalate"
                value={meta.escalate_human ? "YES — human" : "no"}
                badge={meta.escalate_human ? "alert" : "ok"}
              />
              {meta.escalate_reason && (
                <div className="mt-2 text-[12px] bg-red-50 border border-red-200 text-red-900 rounded p-2 leading-relaxed">
                  {meta.escalate_reason}
                </div>
              )}
            </DebugSection>

            {meta.order_found && (
              <DebugSection title="Order found in Shopify mock">
                <Row label="ID" value={`#${meta.order_found.id}`} mono />
                <Row label="Status" value={meta.order_found.status} mono />
                <Row label="Carrier" value={meta.order_found.carrier} mono />
                <Row label="Days in transit" value={String(meta.order_found.days_in_transit)} mono />
                <Row label="Country" value={meta.order_found.country} mono />
                <Row label="Value" value={`€${meta.order_found.value_eur}`} mono />
                {meta.order_found.customer && (
                  <Row label="Customer" value={meta.order_found.customer} mono />
                )}
              </DebugSection>
            )}

            {meta.rag && meta.rag.kb_chunks.length > 0 && (
              <DebugSection title={`Knowledge chunks (${meta.rag.kb_chunks.length})`}>
                <ul className="space-y-1.5">
                  {meta.rag.kb_chunks.map((c) => (
                    <li
                      key={c.id}
                      className="bg-scuffers-cream-soft border border-scuffers-border rounded px-2.5 py-1.5"
                    >
                      <span className="text-[11px] font-mono text-scuffers-taupe">
                        {c.id}
                      </span>
                      <div className="text-[12px]">{c.title}</div>
                    </li>
                  ))}
                </ul>
              </DebugSection>
            )}

            {meta.rag && meta.rag.similar_reviews.length > 0 && (
              <DebugSection
                title={`RAG · similar Trustpilot reviews (${meta.rag.similar_reviews.length})`}
              >
                <ul className="space-y-2">
                  {meta.rag.similar_reviews.map((r, i) => (
                    <li
                      key={i}
                      className="bg-amber-50 border border-amber-200 rounded p-2.5 text-[12px] leading-relaxed"
                    >
                      <div className="flex items-center gap-2 mb-1 text-[11px] font-mono text-amber-900">
                        <span>{r.date}</span>
                        <span>·</span>
                        <span>{"★".repeat(r.rating)}</span>
                        <span>·</span>
                        <span>{r.language.toUpperCase()}</span>
                      </div>
                      <div className="italic">"{r.excerpt}…"</div>
                      <div className="mt-1 text-[11px] text-amber-800">
                        Pattern: {r.pattern}
                      </div>
                    </li>
                  ))}
                </ul>
              </DebugSection>
            )}

            <DebugSection title="Performance">
              <Row
                label="Mode"
                value={meta.mode ?? "—"}
                mono
                badge={
                  meta.mode === "cli"
                    ? "ok"
                    : meta.mode === "live"
                      ? "info"
                      : "neutral"
                }
              />
              <Row label="Model" value={meta.model ?? "—"} mono />
              <Row
                label="Latency"
                value={
                  meta.latency_ms != null
                    ? `${(meta.latency_ms / 1000).toFixed(2)}s`
                    : "—"
                }
                mono
              />
              <Row
                label="Cost"
                value={
                  meta.cost_usd != null ? `$${meta.cost_usd.toFixed(4)}` : "—"
                }
                mono
              />
            </DebugSection>

            <DebugSection title="Token usage">
              <Row
                label="Input"
                value={String(meta.input_tokens ?? 0)}
                mono
              />
              <Row
                label="Output"
                value={String(meta.output_tokens ?? 0)}
                mono
              />
              <Row
                label="Cache read"
                value={String(meta.cache_read_tokens ?? 0)}
                mono
                badge={
                  (meta.cache_read_tokens ?? 0) > 0 ? "ok" : "neutral"
                }
              />
              <Row
                label="Cache creation"
                value={String(meta.cache_creation_tokens ?? 0)}
                mono
              />
            </DebugSection>

            <div className="pt-3 border-t border-scuffers-border text-[11px] text-scuffers-taupe leading-relaxed">
              Auth: Claude Code CLI · subscription Max (no API key).
              <br />
              Spawned <code className="font-mono">claude -p</code> as
              subprocess. Same pattern as Pepita.
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function DebugSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h4 className="text-[10px] tracking-[0.22em] uppercase text-scuffers-taupe font-semibold mb-2">
        {title}
      </h4>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  mono,
  badge,
}: {
  label: string;
  value: string;
  mono?: boolean;
  badge?: "ok" | "alert" | "info" | "neutral";
}) {
  const badgeColors: Record<string, string> = {
    ok: "bg-emerald-50 text-emerald-800 border-emerald-200",
    alert: "bg-red-50 text-red-800 border-red-200",
    info: "bg-blue-50 text-blue-800 border-blue-200",
    neutral: "bg-scuffers-cream-soft text-scuffers-taupe border-scuffers-border",
  };
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-scuffers-taupe text-[12px]">{label}</span>
      <span
        className={`${mono ? "font-mono text-[12px]" : "text-[13px]"} ${
          badge ? `px-2 py-0.5 rounded border text-[11px] ${badgeColors[badge]}` : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
