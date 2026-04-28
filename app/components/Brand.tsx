"use client";

export function BrandLogo() {
  return (
    <div className="flex items-baseline gap-3">
      <div className="text-[15px] font-bold tracking-[-0.01em] text-[var(--ink)]">
        scuffers<span className="text-[9px] align-top">®</span>
      </div>
      <div className="text-[12px] text-[var(--muted)]">Ops</div>
    </div>
  );
}

export function BrandFooter({ latencyMs, llmUsed }: { latencyMs?: number; llmUsed?: boolean }) {
  if (latencyMs === undefined && llmUsed === undefined) return null;
  return (
    <footer className="mt-12 mb-8 pt-4 border-t border-[var(--line)] text-[11px] text-[var(--muted)] flex flex-wrap items-center gap-3">
      {latencyMs !== undefined && (
        <span>
          Análisis en <span className="font-mono text-[var(--ink)]">{(latencyMs / 1000).toFixed(2)}s</span>
        </span>
      )}
      {llmUsed !== undefined && (
        <span>· {llmUsed ? "Claude Sonnet" : "Modo determinístico"}</span>
      )}
    </footer>
  );
}
