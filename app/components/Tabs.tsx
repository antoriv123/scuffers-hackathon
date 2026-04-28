"use client";

import { Zap, ShoppingBag, Users, Shirt, Ticket, Megaphone } from "lucide-react";

export type TabId = "acciones" | "pedidos" | "clientes" | "productos" | "tickets" | "campanas";

export const TABS: { id: TabId; label: string; icon: React.ReactNode; key: string }[] = [
  { id: "acciones", label: "Acciones", icon: <Zap className="w-4 h-4" strokeWidth={2.2} />, key: "1" },
  { id: "pedidos", label: "Pedidos", icon: <ShoppingBag className="w-4 h-4" strokeWidth={2.2} />, key: "2" },
  { id: "clientes", label: "Clientes", icon: <Users className="w-4 h-4" strokeWidth={2.2} />, key: "3" },
  { id: "productos", label: "Productos", icon: <Shirt className="w-4 h-4" strokeWidth={2.2} />, key: "4" },
  { id: "tickets", label: "Tickets", icon: <Ticket className="w-4 h-4" strokeWidth={2.2} />, key: "5" },
  { id: "campanas", label: "Campañas", icon: <Megaphone className="w-4 h-4" strokeWidth={2.2} />, key: "6" },
];

export function Tabs({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <nav className="border-b border-[var(--line)] mb-5 bg-[var(--bg)]">
      <div className="flex flex-wrap">
        {TABS.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`relative flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] transition-colors ${
                isActive
                  ? "text-[var(--ink)] font-semibold"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              <span className="opacity-70">{t.icon}</span>
              <span>{t.label}</span>
              <span className="hidden sm:inline text-[10px] text-[var(--muted)] ml-1 font-mono">
                {t.key}
              </span>
              {isActive && (
                <span
                  key={`underline-${t.id}`}
                  className="absolute left-0 right-0 -bottom-px h-[2px] bg-[var(--ink)]"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
