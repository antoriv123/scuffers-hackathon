"use client";

import { useMemo } from "react";
import { Star } from "lucide-react";
import type { EnrichedOrderSample } from "./types";
import { formatEur, formatNumber } from "./types";
import { SegmentBadge } from "./Badges";

type Customer = NonNullable<EnrichedOrderSample["customer"]>;

export function TabClientes({
  orders,
  isFull,
}: {
  orders: EnrichedOrderSample[];
  isFull: boolean;
}) {
  const customers = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const o of orders) {
      if (o.customer && !map.has(o.customer.customer_id)) {
        map.set(o.customer.customer_id, o.customer);
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => b.customer_lifetime_value - a.customer_lifetime_value,
    );
  }, [orders]);

  return (
    <section className="fade-in">
      {!isFull && (
        <div className="mb-4 cream-card-soft p-3 text-[11px] text-[#6b6b6b]">
          Mostrando {customers.length} clientes derivados del sample. Implementación full pendiente.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {customers.map((c) => (
          <article key={c.customer_id} className="cream-card p-4 hover:bg-[#f6f5f1] transition-colors">
            <header className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <code className="font-mono text-sm font-semibold text-[#0A0A0A]">
                    {c.customer_id}
                  </code>
                  {c.is_vip && <Star className="w-4 h-4 fill-[#e07b00] text-[#e07b00]" />}
                </div>
                <div className="mt-1.5">
                  <SegmentBadge segment={c.customer_segment} />
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-[#6b6b6b]">LTV</div>
                <div className="font-serif font-bold text-2xl text-[#0A0A0A] leading-none">
                  {formatEur(c.customer_lifetime_value)}
                </div>
              </div>
            </header>
            <div className="flex gap-2 text-xs">
              <div className="flex-1 cream-card-soft px-2 py-1.5 text-center">
                <div className="font-mono font-bold text-[#0A0A0A]">
                  {formatNumber(c.customer_orders_count)}
                </div>
                <div className="text-[9px] uppercase tracking-widest text-[#6b6b6b] mt-0.5">
                  pedidos
                </div>
              </div>
              <div className="flex-1 cream-card-soft px-2 py-1.5 text-center">
                <div className="font-mono font-bold text-[#0A0A0A]">
                  {formatNumber(c.customer_returns_count)}
                </div>
                <div className="text-[9px] uppercase tracking-widest text-[#6b6b6b] mt-0.5">
                  devoluciones
                </div>
              </div>
            </div>
          </article>
        ))}
        {customers.length === 0 && (
          <div className="col-span-full text-center py-10 text-sm text-[#6b6b6b]">
            Sin clientes en el sample.
          </div>
        )}
      </div>
    </section>
  );
}
