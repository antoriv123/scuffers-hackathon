"use client";

import type { HeroMetrics } from "./types";
import { formatEur, formatNumber } from "./types";

type Card = {
  label: string;
  value: string;
  hint: string;
  tone: "p0" | "p1" | "p2" | "p3";
};

const TONE_TO_COLOR: Record<Card["tone"], string> = {
  p0: "var(--p0)",
  p1: "var(--p1)",
  p2: "var(--p2)",
  p3: "var(--p3)",
};

export function HeroStrip({ metrics }: { metrics: HeroMetrics }) {
  const cards: Card[] = [
    {
      label: "Spend en riesgo",
      value: formatEur(metrics.total_spend_at_risk),
      hint: "Presupuesto activo sobre stock crítico",
      tone: "p0",
    },
    {
      label: "SKUs críticos",
      value: formatNumber(metrics.critical_skus_count),
      hint: "Available ≤ reserved",
      tone: "p1",
    },
    {
      label: "VIPs en riesgo",
      value: formatNumber(metrics.vips_at_risk),
      hint: "Pedidos abiertos · alto LTV",
      tone: "p3",
    },
    {
      label: "Tickets urgentes",
      value: formatNumber(metrics.urgent_tickets_count),
      hint: "High / urgent / critical",
      tone: "p0",
    },
  ];

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {cards.map((c) => {
        const color = TONE_TO_COLOR[c.tone];
        return (
          <div
            key={c.label}
            className="bg-[var(--bg)] border border-[var(--line)] rounded-[4px] px-4 py-3 relative"
          >
            <div className="text-[11px] text-[var(--muted)] mb-1">{c.label}</div>
            <div className="text-[26px] font-bold leading-none text-[var(--ink)] tracking-[-0.02em] tabular-nums">
              {c.value}
            </div>
            <div className="text-[11px] text-[var(--muted)] mt-1.5">{c.hint}</div>
            <div
              className="absolute left-0 right-0 bottom-0 h-[2px]"
              style={{ background: color }}
            />
          </div>
        );
      })}
    </section>
  );
}

// Kept for backwards compatibility; now a no-op (pitch panel removed).
export function ContrastStrip() {
  return null;
}
