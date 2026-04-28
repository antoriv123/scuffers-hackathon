"use client";

import { useState } from "react";
import { Zap, Check } from "lucide-react";
import type { Action } from "./types";
import { ACTION_LABELS, OWNER_LABELS, defaultScoreDimensions, TIER_COLORS } from "./types";
import { ScoreBars } from "./ScoreBars";
import { TierBadge, OwnerBadge, PillBadge } from "./Badges";

export function ActionCard({
  action,
  onOpen,
  onExecute,
  executed,
  ignored,
  onIgnore,
}: {
  action: Action;
  onOpen: () => void;
  onExecute: () => void;
  executed: boolean;
  ignored: boolean;
  onIgnore: () => void;
}) {
  const dims = defaultScoreDimensions(action);
  const tierColor = TIER_COLORS[dims.tier];
  const score = Math.round(dims.total);
  const ownerLabel = OWNER_LABELS[action.owner] ?? action.owner;
  const actionLabel = ACTION_LABELS[action.action_type] ?? action.action_type;
  const isTop3 = action.rank <= 3;

  return (
    <article
      className={`cream-card p-6 transition-all fade-in ${
        executed ? "border-[var(--accent)] bg-[var(--accent-soft)] opacity-80" : ""
      } ${ignored ? "opacity-40" : ""}`}
    >
      <div className="flex gap-6 items-start">
        {/* LEFT: rank + tier + score (mono editorial column) */}
        <div className="flex flex-col items-center gap-3 w-[72px] flex-shrink-0">
          <div
            className={`w-14 h-14 flex items-center justify-center font-mono font-bold text-2xl rounded-[2px] tracking-tight ${
              isTop3 ? "alert-pulse" : ""
            }`}
            style={{
              background: tierColor.bg,
              color: tierColor.text,
            }}
          >
            {action.rank}
          </div>
          <TierBadge tier={dims.tier} />
          <div className="text-center pt-2 border-t border-[var(--line)] w-full">
            <div className="font-mono font-bold leading-none text-[28px] text-[var(--ink)] tracking-[-0.02em]">
              {score}
            </div>
            <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--muted)] mt-1">
              / 100
            </div>
          </div>
        </div>

        {/* CENTER: content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-3">
            <OwnerBadge owner={action.owner} label={ownerLabel} />
            <PillBadge>{actionLabel}</PillBadge>
            <code className="text-[11px] font-mono tracking-[0.05em] text-[var(--muted)]">
              {action.target_id}
            </code>
            {action.automation_possible && (
              <PillBadge variant="ok">
                <Zap className="w-3 h-3 mr-1" /> Automatizable
              </PillBadge>
            )}
            {executed && (
              <PillBadge variant="ok">
                <Check className="w-3 h-3 mr-1" /> Ejecutada
              </PillBadge>
            )}
          </div>
          <h3 className="text-[17px] font-bold leading-snug text-[var(--ink)] mb-1.5 uppercase tracking-[-0.01em]">
            {action.title}
          </h3>
          <p className="text-[14px] text-[var(--ink)] leading-[1.55]">{action.reason}</p>
          <p className="mt-2 text-[13px] text-[var(--muted)] font-mono uppercase tracking-[0.04em]">
            ▸ Impacto: <span className="normal-case tracking-normal text-[var(--ink)]">{action.expected_impact}</span>
          </p>

          {/* score bars */}
          <div className="mt-5">
            <ScoreBars
              urgencia={dims.urgencia}
              impacto={dims.impacto}
              evidencia={dims.evidencia}
            />
          </div>

          {/* actions */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              onClick={onOpen}
              className="btn-ghost"
            >
              Ver detalles →
            </button>
            {action.automation_possible && !executed && !ignored && (
              <button
                onClick={onExecute}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Zap className="w-3.5 h-3.5" /> Ejecutar acción
              </button>
            )}
            {!executed && !ignored && (
              <button
                onClick={onIgnore}
                className="text-[11px] font-mono uppercase tracking-[0.16em] px-3 py-2.5 text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
              >
                Ignorar
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function ActionCardSkeleton() {
  return (
    <article className="cream-card p-5">
      <div className="flex gap-5 items-start">
        <div className="flex flex-col items-center gap-2 w-[64px]">
          <div className="w-12 h-12 rounded-full shimmer" />
          <div className="w-8 h-4 rounded shimmer" />
          <div className="w-10 h-6 rounded shimmer" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex gap-2">
            <div className="w-16 h-4 rounded shimmer" />
            <div className="w-24 h-4 rounded shimmer" />
            <div className="w-20 h-4 rounded shimmer" />
          </div>
          <div className="w-3/4 h-5 rounded shimmer" />
          <div className="w-full h-3 rounded shimmer" />
          <div className="w-5/6 h-3 rounded shimmer" />
          <div className="flex gap-3 mt-3">
            <div className="w-[200px] h-6 rounded shimmer" />
            <div className="w-[200px] h-6 rounded shimmer" />
            <div className="w-[200px] h-6 rounded shimmer" />
          </div>
        </div>
      </div>
    </article>
  );
}
