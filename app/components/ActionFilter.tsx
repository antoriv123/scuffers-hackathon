"use client";

import type { Action } from "./types";
import { OWNER_LABELS } from "./types";

export function ActionFilter({
  actions,
  filter,
  setFilter,
}: {
  actions: Action[];
  filter: string | null;
  setFilter: (v: string | null) => void;
}) {
  const owners = Array.from(new Set(actions.map((a) => a.owner)));
  return (
    <div className="flex flex-wrap items-center gap-2 mb-5">
      <Pill active={filter === null} onClick={() => setFilter(null)}>
        Todos · {actions.length}
      </Pill>
      {owners.map((o) => {
        const count = actions.filter((a) => a.owner === o).length;
        const label = OWNER_LABELS[o] ?? o;
        return (
          <Pill
            key={o}
            active={filter === o}
            onClick={() => setFilter(o === filter ? null : o)}
          >
            {label} · {count}
          </Pill>
        );
      })}
    </div>
  );
}

function Pill({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-4 py-2 rounded-full border font-medium transition-colors ${
        active
          ? "bg-[#0A0A0A] text-[#ffffff] border-[#0A0A0A]"
          : "bg-white text-[#0A0A0A] border-[#e6e5e1] hover:bg-[#f6f5f1]"
      }`}
    >
      {children}
    </button>
  );
}
