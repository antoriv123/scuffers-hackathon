"use client";

import { useMemo } from "react";
import { Eye, Flame } from "lucide-react";
import type { EnrichedOrderSample } from "./types";
import { formatNumber } from "./types";
import { StockBar } from "./DrillDownModal";

type Inv = NonNullable<EnrichedOrderSample["inventory_item"]>;

export function TabProductos({
  orders,
  isFull,
}: {
  orders: EnrichedOrderSample[];
  isFull: boolean;
}) {
  const items = useMemo(() => {
    const map = new Map<string, Inv>();
    for (const o of orders) {
      const inv = o.inventory_item;
      if (inv && inv.sku && !map.has(inv.sku)) map.set(inv.sku, inv);
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        (b.product_page_views_last_hour ?? 0) - (a.product_page_views_last_hour ?? 0),
    );
  }, [orders]);

  return (
    <section className="fade-in">
      {!isFull && (
        <div className="mb-4 cream-card-soft p-3 text-[11px] text-[#6b6b6b]">
          Mostrando {items.length} SKUs del sample. Implementación full pendiente.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((it) => {
          const available = it.inventory_available_units ?? 0;
          const reserved = it.inventory_reserved_units ?? 0;
          const isCritical = available <= reserved;
          const isLow = available < 10;
          const views = it.product_page_views_last_hour ?? 0;
          const isHot = views > 3000;
          const borderColor = isCritical
            ? "border-l-[3px] border-l-[#c1121f]"
            : isLow
              ? "border-l-[3px] border-l-[#e07b00]"
              : "border-l-[3px] border-l-[#2b7551]";
          return (
            <article key={it.sku} className={`cream-card p-4 ${borderColor}`}>
              <header className="flex items-start justify-between mb-3 gap-2">
                <div className="min-w-0">
                  <code className="font-mono text-sm font-semibold text-[#0A0A0A]">
                    {it.sku}
                  </code>
                  <div className="text-xs text-[#0A0A0A] mt-1 truncate">
                    {it.product_name ?? "Producto"}
                    {it.size && <span className="text-[#6b6b6b]"> · {it.size}</span>}
                  </div>
                </div>
                {isHot && (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold text-[#c1121f]">
                    <Flame className="w-3 h-3" /> HOT
                  </span>
                )}
              </header>
              <StockBar
                available={available}
                reserved={reserved}
                incoming={it.inventory_incoming_units ?? 0}
              />
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#6b6b6b]">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {formatNumber(views)} views/h
                </span>
                {it.conversion_rate_last_hour !== undefined && (
                  <span>· Conv {(it.conversion_rate_last_hour * 100).toFixed(1)}%</span>
                )}
                {it.inventory_incoming_eta && (
                  <span>· ETA {new Date(it.inventory_incoming_eta).toLocaleDateString("es-ES")}</span>
                )}
              </div>
            </article>
          );
        })}
        {items.length === 0 && (
          <div className="col-span-full text-center py-10 text-sm text-[#6b6b6b]">
            Sin inventario en el sample.
          </div>
        )}
      </div>
    </section>
  );
}
