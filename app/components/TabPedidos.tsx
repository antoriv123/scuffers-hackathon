"use client";

import { useMemo, useState } from "react";
import { Search, Star, MapPin, Truck } from "lucide-react";
import type { EnrichedOrderSample } from "./types";
import { formatEur, timeAgo } from "./types";
import { StatusChip, PillBadge } from "./Badges";

export function TabPedidos({
  orders,
  isFull,
  totalCount,
}: {
  orders: EnrichedOrderSample[];
  isFull: boolean;
  totalCount: number;
}) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [openOrder, setOpenOrder] = useState<EnrichedOrderSample | null>(null);

  const statuses = useMemo(
    () => Array.from(new Set(orders.map((o) => o.order_status))).sort(),
    [orders],
  );

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter && o.order_status !== statusFilter) return false;
      if (!ql) return true;
      return (
        o.order_id.toLowerCase().includes(ql) ||
        o.customer_id.toLowerCase().includes(ql) ||
        o.sku.toLowerCase().includes(ql) ||
        (o.shipping_city ?? "").toLowerCase().includes(ql)
      );
    });
  }, [orders, q, statusFilter]);

  return (
    <section className="fade-in">
      {!isFull && (
        <div className="mb-4 cream-card-soft p-3 text-[11px] text-[#6b6b6b]">
          Mostrando {orders.length} de {totalCount} pedidos. Implementación full pendiente (sesión B).
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b6b]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por order_id, customer, SKU o ciudad…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-white border border-[#e6e5e1] focus:border-[#0A0A0A] outline-none"
          />
        </div>
        <select
          value={statusFilter ?? ""}
          onChange={(e) => setStatusFilter(e.target.value || null)}
          className="text-sm px-3 py-2 rounded-md bg-white border border-[#e6e5e1] focus:border-[#0A0A0A] outline-none"
        >
          <option value="">Todos los estados</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="cream-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#f6f5f1] text-[10px] uppercase tracking-widest text-[#6b6b6b]">
            <tr>
              <Th>Pedido</Th>
              <Th>Cliente</Th>
              <Th>Estado</Th>
              <Th align="right">Valor</Th>
              <Th>Ciudad</Th>
              <Th>Envío</Th>
              <Th>Edad</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e6e5e1]">
            {filtered.map((o) => (
              <tr
                key={o.order_id}
                onClick={() => setOpenOrder(o)}
                className="hover:bg-[#f6f5f1] cursor-pointer transition-colors"
              >
                <Td>
                  <code className="font-mono text-xs">{o.order_id}</code>
                </Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    <code className="font-mono text-xs">{o.customer_id}</code>
                    {o.customer?.is_vip && <Star className="w-3 h-3 fill-[#e07b00] text-[#e07b00]" />}
                  </div>
                </Td>
                <Td>
                  <StatusChip status={o.order_status} />
                </Td>
                <Td align="right">
                  <span className="font-mono font-semibold">{formatEur(o.order_value)}</span>
                </Td>
                <Td>
                  <span className="text-xs text-[#0A0A0A]">{o.shipping_city ?? "—"}</span>
                </Td>
                <Td>
                  {o.shipping_method && (
                    <PillBadge variant="info">
                      <Truck className="w-3 h-3 mr-1" />
                      {o.shipping_method}
                    </PillBadge>
                  )}
                </Td>
                <Td>
                  <span className="text-xs text-[#6b6b6b]">{timeAgo(o.created_at)}</span>
                </Td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-sm text-[#6b6b6b]">
                  Sin resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {openOrder && <OrderDetailModal order={openOrder} onClose={() => setOpenOrder(null)} />}
    </section>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th className={`px-3 py-3 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <td className={`px-3 py-3 align-middle ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </td>
  );
}

function OrderDetailModal({
  order,
  onClose,
}: {
  order: EnrichedOrderSample;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-[#0A0A0A]/40 z-40 overlay-in" onClick={onClose} />
      <aside className="fixed top-0 right-0 bottom-0 w-full sm:w-[520px] bg-[#ffffff] z-50 slide-in-right shadow-2xl border-l border-[#e6e5e1] overflow-y-auto p-6">
        <header className="flex items-start justify-between mb-5">
          <div>
            <code className="font-mono text-sm font-semibold">{order.order_id}</code>
            <div className="mt-1.5 flex items-center gap-2">
              <StatusChip status={order.order_status} />
              {order.shipping_method && (
                <PillBadge variant="info">
                  <Truck className="w-3 h-3 mr-1" />
                  {order.shipping_method}
                </PillBadge>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-[#6b6b6b] hover:text-[#0A0A0A]">
            ✕
          </button>
        </header>
        <div className="cream-card p-4">
          <div className="text-[10px] uppercase tracking-widest text-[#6b6b6b]">Valor</div>
          <div className="font-serif font-bold text-3xl text-[#0A0A0A]">
            {formatEur(order.order_value)}
          </div>
          <div className="mt-2 text-xs text-[#6b6b6b] flex items-center gap-2">
            {order.shipping_city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {order.shipping_city}
              </span>
            )}
            <span>·</span>
            <span>{timeAgo(order.created_at)}</span>
          </div>
          {order.product_name && (
            <div className="mt-3 text-sm text-[#0A0A0A]">
              {order.product_name} <span className="text-[#6b6b6b]">· {order.sku}</span>
            </div>
          )}
        </div>
        {order.customer && (
          <div className="cream-card p-4 mt-3">
            <div className="text-[10px] uppercase tracking-widest text-[#6b6b6b] mb-1">Cliente</div>
            <div className="flex items-center gap-2">
              <code className="font-mono text-sm">{order.customer.customer_id}</code>
              {order.customer.is_vip && <Star className="w-3.5 h-3.5 fill-[#e07b00] text-[#e07b00]" />}
            </div>
            <div className="mt-2 text-xs text-[#6b6b6b]">
              LTV {formatEur(order.customer.customer_lifetime_value)} ·{" "}
              {order.customer.customer_orders_count} pedidos · {order.customer.customer_returns_count} devs
            </div>
          </div>
        )}
        {order.open_tickets && order.open_tickets.length > 0 && (
          <div className="cream-card p-4 mt-3">
            <div className="text-[10px] uppercase tracking-widest text-[#6b6b6b] mb-2">
              Tickets abiertos
            </div>
            {order.open_tickets.map((t) => (
              <div key={t.support_ticket_id} className="text-xs text-[#0A0A0A] mb-2">
                {t.support_ticket_message}
              </div>
            ))}
          </div>
        )}
      </aside>
    </>
  );
}
