"use client";

import { useEffect } from "react";
import {
  X,
  Target,
  User,
  ShoppingBag,
  Package,
  Ticket as TicketIcon,
  Megaphone,
  Star,
  MapPin,
  Truck,
  Eye,
  Zap,
} from "lucide-react";
import type { Action, EnrichedOrderSample } from "./types";
import { defaultScoreDimensions, ACTION_LABELS, formatEur, formatNumber, timeAgo } from "./types";
import { ScoreBars } from "./ScoreBars";
import { TierBadge, OwnerBadge, PillBadge, StatusChip, SegmentBadge, SentimentBadge, UrgencyBadge } from "./Badges";

type Snap = Action["_data_snapshot"];

type SnapCustomer = {
  customer_id?: string;
  customer_segment?: string;
  customer_lifetime_value?: number;
  customer_orders_count?: number;
  customer_returns_count?: number;
  is_vip?: boolean;
};

type SnapOrder = {
  order_id?: string;
  order_value?: number;
  order_status?: string;
  shipping_city?: string;
  shipping_method?: string;
  sku?: string;
  product_name?: string;
  created_at?: string;
};

type SnapInventory = {
  sku?: string;
  product_name?: string;
  size?: string;
  inventory_available_units?: number;
  inventory_reserved_units?: number;
  inventory_incoming_units?: number;
  inventory_incoming_eta?: string | null;
  product_page_views_last_hour?: number;
  conversion_rate_last_hour?: number;
};

type SnapTicket = {
  support_ticket_id?: string;
  support_ticket_message?: string;
  support_ticket_urgency?: string;
  support_ticket_sentiment?: string;
  created_at?: string;
};

type SnapCampaign = {
  campaign_id?: string;
  campaign_source?: string;
  status?: string;
  intensity_numeric?: number;
  budget_spent?: number;
  target_city?: string;
  target_sku?: string;
};

function pick<T>(snap: Snap, ...keys: string[]): T | undefined {
  if (!snap) return undefined;
  for (const k of keys) {
    const v = (snap as Record<string, unknown>)[k];
    if (v && typeof v === "object") return v as T;
  }
  return undefined;
}

function pickArray<T>(snap: Snap, key: string): T[] | undefined {
  if (!snap) return undefined;
  const v = (snap as Record<string, unknown>)[key];
  if (Array.isArray(v)) return v as T[];
  return undefined;
}

export function DrillDownModal({
  action,
  onClose,
  onExecute,
}: {
  action: Action | null;
  onClose: () => void;
  onExecute: () => void;
}) {
  useEffect(() => {
    if (!action) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [action, onClose]);

  if (!action) return null;

  const dims = defaultScoreDimensions(action);
  const snap = action._data_snapshot;

  const customer =
    pick<SnapCustomer>(snap, "customer") ??
    pick<{ customer?: SnapCustomer }>(snap, "order")?.customer;
  const order =
    pick<SnapOrder>(snap, "order") ??
    (action.target_type === "order" && snap
      ? (snap as unknown as SnapOrder)
      : undefined);
  const inventory =
    pick<SnapInventory>(snap, "inventory") ??
    pick<{ inventory_item?: SnapInventory }>(snap, "order")?.inventory_item;
  const tickets =
    pickArray<SnapTicket>(snap, "open_tickets") ??
    pickArray<SnapTicket>(snap, "tickets") ??
    (pick<SnapTicket>(snap, "ticket") ? [pick<SnapTicket>(snap, "ticket") as SnapTicket] : undefined);
  const campaign =
    pick<SnapCampaign>(snap, "campaign") ??
    (action.target_type === "campaign" && snap ? (snap as unknown as SnapCampaign) : undefined);

  return (
    <>
      {/* overlay */}
      <div
        className="fixed inset-0 bg-[#0A0A0A]/40 z-40 overlay-in"
        onClick={onClose}
      />
      {/* sheet */}
      <aside
        className="fixed top-0 right-0 bottom-0 w-full sm:w-[600px] bg-[#ffffff] z-50 slide-in-right shadow-2xl border-l border-[#e6e5e1] overflow-y-auto"
        role="dialog"
      >
        {/* header */}
        <div className="sticky top-0 bg-[#ffffff]/95 backdrop-blur-sm border-b border-[#e6e5e1] px-6 py-5 flex items-start justify-between gap-4 z-10">
          <div className="flex items-center gap-4">
            <TierBadge tier={dims.tier} size="xl" />
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-serif font-bold text-[42px] leading-none text-[#0A0A0A]">
                  {Math.round(dims.total)}
                </span>
                <span className="text-sm text-[#6b6b6b] font-mono">/100</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <code className="text-[11px] font-mono text-[#6b6b6b]">
                  {action.target_id}
                </code>
                <PillBadge>{ACTION_LABELS[action.action_type] ?? action.action_type}</PillBadge>
                <OwnerBadge owner={action.owner} label={action.owner} />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#6b6b6b] hover:text-[#0A0A0A] hover:bg-[#f6f5f1] p-2 rounded-md transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* body */}
        <div className="px-6 py-6 space-y-4">
          {/* title + reason */}
          <div>
            <h2 className="font-serif font-bold text-2xl leading-tight text-[#0A0A0A] mb-2">
              {action.title}
            </h2>
            <p className="text-sm text-[#0A0A0A] leading-relaxed">{action.reason}</p>
            <p className="mt-2 text-sm italic text-[#6b6b6b]">
              <span className="not-italic">💡</span> {action.expected_impact}
            </p>
          </div>

          <Card icon={<Target className="w-4 h-4" />} title="Score breakdown" accent="#0A0A0A">
            <ScoreBars
              urgencia={dims.urgencia}
              impacto={dims.impacto}
              evidencia={dims.evidencia}
              size="lg"
            />
            <div className="mt-4 text-[11px] text-[#6b6b6b] flex items-center gap-3 font-mono">
              <span>weights:</span>
              <span>urgencia 0.40</span>
              <span>·</span>
              <span>impacto 0.35</span>
              <span>·</span>
              <span>evidencia 0.25</span>
            </div>
            {dims.explanation && (
              <ul className="mt-3 space-y-1 text-xs text-[#0A0A0A]">
                {dims.explanation.urgencia && (
                  <li>
                    <strong className="text-[#c1121f]">Urgencia:</strong> {dims.explanation.urgencia}
                  </li>
                )}
                {dims.explanation.impacto && (
                  <li>
                    <strong className="text-[#e07b00]">Impacto:</strong> {dims.explanation.impacto}
                  </li>
                )}
                {dims.explanation.evidencia && (
                  <li>
                    <strong className="text-[#2c5fb3]">Evidencia:</strong> {dims.explanation.evidencia}
                  </li>
                )}
              </ul>
            )}
          </Card>

          {customer && (
            <Card icon={<User className="w-4 h-4" />} title="Cliente" accent="#2c5fb3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-sm font-mono font-semibold text-[#0A0A0A]">
                      {customer.customer_id ?? "—"}
                    </code>
                    {customer.is_vip && (
                      <Star className="w-4 h-4 fill-[#e07b00] text-[#e07b00]" />
                    )}
                  </div>
                  {customer.customer_segment && (
                    <SegmentBadge segment={customer.customer_segment} />
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest text-[#6b6b6b]">LTV</div>
                  <div className="font-serif font-bold text-2xl text-[#0A0A0A]">
                    {formatEur(customer.customer_lifetime_value ?? 0)}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                <div className="cream-card-soft p-3">
                  <div className="text-[10px] uppercase tracking-widest text-[#6b6b6b]">Pedidos</div>
                  <div className="font-serif font-bold text-xl text-[#0A0A0A]">
                    {formatNumber(customer.customer_orders_count ?? 0)}
                  </div>
                </div>
                <div className="cream-card-soft p-3">
                  <div className="text-[10px] uppercase tracking-widest text-[#6b6b6b]">Devoluciones</div>
                  <div className="font-serif font-bold text-xl text-[#0A0A0A]">
                    {formatNumber(customer.customer_returns_count ?? 0)}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {order && (order.order_id || order.order_value !== undefined) && (
            <Card icon={<ShoppingBag className="w-4 h-4" />} title="Pedido" accent="#2b7551">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <code className="text-sm font-mono font-semibold text-[#0A0A0A]">
                    {order.order_id ?? "—"}
                  </code>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {order.order_status && <StatusChip status={order.order_status} />}
                    {order.shipping_method && (
                      <PillBadge variant="info">
                        <Truck className="w-3 h-3 mr-1" />
                        {order.shipping_method}
                      </PillBadge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest text-[#6b6b6b]">Valor</div>
                  <div className="font-serif font-bold text-2xl text-[#0A0A0A]">
                    {formatEur(order.order_value ?? 0)}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-[#6b6b6b]">
                {order.shipping_city && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {order.shipping_city}
                  </div>
                )}
                {order.created_at && <div>{timeAgo(order.created_at)}</div>}
                {order.product_name && (
                  <div className="col-span-2 truncate">{order.product_name}</div>
                )}
              </div>
            </Card>
          )}

          {inventory && (
            <Card icon={<Package className="w-4 h-4" />} title="Inventario" accent="#e07b00">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <code className="text-sm font-mono font-semibold text-[#0A0A0A]">
                    {inventory.sku ?? "—"}
                  </code>
                  {inventory.product_name && (
                    <div className="text-xs text-[#0A0A0A] mt-1">
                      {inventory.product_name}
                      {inventory.size && (
                        <span className="ml-2 text-[#6b6b6b]">· {inventory.size}</span>
                      )}
                    </div>
                  )}
                </div>
                {inventory.inventory_incoming_eta && (
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-widest text-[#6b6b6b]">ETA</div>
                    <div className="text-sm font-mono text-[#0A0A0A]">
                      {new Date(inventory.inventory_incoming_eta).toLocaleDateString("es-ES")}
                    </div>
                  </div>
                )}
              </div>
              <StockBar
                available={inventory.inventory_available_units ?? 0}
                reserved={inventory.inventory_reserved_units ?? 0}
                incoming={inventory.inventory_incoming_units ?? 0}
              />
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#0A0A0A]">
                {inventory.product_page_views_last_hour !== undefined && (
                  <div className="flex items-center gap-1.5 cream-card-soft px-3 py-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    {formatNumber(inventory.product_page_views_last_hour)} views/h
                  </div>
                )}
                {inventory.conversion_rate_last_hour !== undefined && (
                  <div className="cream-card-soft px-3 py-1.5">
                    Conv: {(inventory.conversion_rate_last_hour * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            </Card>
          )}

          {tickets && tickets.length > 0 && (
            <Card icon={<TicketIcon className="w-4 h-4" />} title="Tickets relacionados" accent="#c1121f">
              <div className="space-y-2">
                {tickets.slice(0, 4).map((t, i) => (
                  <div key={t.support_ticket_id ?? i} className="cream-card-soft p-3">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {t.support_ticket_urgency && <UrgencyBadge urgency={t.support_ticket_urgency} />}
                      {t.support_ticket_sentiment && (
                        <SentimentBadge sentiment={t.support_ticket_sentiment} />
                      )}
                      {t.created_at && (
                        <span className="text-[10px] text-[#6b6b6b]">{timeAgo(t.created_at)}</span>
                      )}
                    </div>
                    <p className="text-xs text-[#0A0A0A] leading-relaxed">
                      {truncate(t.support_ticket_message ?? "", 140)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {campaign && (
            <Card icon={<Megaphone className="w-4 h-4" />} title="Campaña" accent="#2c5fb3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-[#0A0A0A]">
                    {campaign.campaign_source ?? "—"}
                  </div>
                  <code className="text-[11px] font-mono text-[#6b6b6b]">
                    {campaign.campaign_id ?? ""}
                  </code>
                </div>
                {campaign.status && <StatusChip status={campaign.status} />}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                {campaign.budget_spent !== undefined && (
                  <div className="cream-card-soft p-3">
                    <div className="text-[10px] uppercase tracking-widest text-[#6b6b6b]">
                      Budget gastado
                    </div>
                    <div className="font-serif font-bold text-lg text-[#0A0A0A]">
                      {formatEur(campaign.budget_spent)}
                    </div>
                  </div>
                )}
                {campaign.target_city && (
                  <div className="cream-card-soft p-3">
                    <div className="text-[10px] uppercase tracking-widest text-[#6b6b6b]">Ciudad</div>
                    <div className="text-sm text-[#0A0A0A] mt-1">{campaign.target_city}</div>
                  </div>
                )}
              </div>
              {campaign.intensity_numeric !== undefined && (
                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-widest text-[#6b6b6b] mb-1">
                    Intensidad
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "#f6f5f1" }}>
                    <div
                      className="h-full"
                      style={{
                        width: `${Math.min(100, campaign.intensity_numeric * 100)}%`,
                        background: "#2c5fb3",
                      }}
                    />
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* footer actions */}
          <div className="pt-4 flex flex-wrap gap-2">
            <button
              onClick={onExecute}
              className="flex-1 text-sm px-4 py-3 rounded-md bg-[#0A0A0A] hover:bg-[#2c5fb3] text-[#ffffff] font-medium inline-flex items-center justify-center gap-2 transition-colors"
            >
              <Zap className="w-4 h-4" /> Ejecutar acción recomendada
            </button>
            <button
              onClick={onClose}
              className="text-sm px-4 py-3 rounded-md border border-[#e6e5e1] bg-white hover:bg-[#f6f5f1] text-[#0A0A0A] font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function Card({
  icon,
  title,
  accent,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="cream-card p-5">
      <header className="flex items-center gap-2 mb-3">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center"
          style={{ background: `${accent}15`, color: accent }}
        >
          {icon}
        </div>
        <h3 className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#0A0A0A]">
          {title}
        </h3>
      </header>
      {children}
    </section>
  );
}

export function StockBar({
  available,
  reserved,
  incoming,
}: {
  available: number;
  reserved: number;
  incoming: number;
}) {
  const total = Math.max(available + reserved + incoming, 1);
  const pAvail = (available / total) * 100;
  const pRes = (reserved / total) * 100;
  const pInc = (incoming / total) * 100;
  return (
    <div>
      <div className="h-3 rounded-full overflow-hidden flex" style={{ background: "#f6f5f1" }}>
        <div className="h-full" style={{ width: `${pAvail}%`, background: "#2b7551" }} />
        <div className="h-full" style={{ width: `${pRes}%`, background: "#c1121f" }} />
        <div className="h-full" style={{ width: `${pInc}%`, background: "#2c5fb3" }} />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] uppercase tracking-widest">
        <div className="text-[#2b7551]">
          <span className="font-mono font-bold text-sm normal-case tracking-normal">
            {formatNumber(available)}
          </span>{" "}
          disp
        </div>
        <div className="text-[#c1121f]">
          <span className="font-mono font-bold text-sm normal-case tracking-normal">
            {formatNumber(reserved)}
          </span>{" "}
          res
        </div>
        <div className="text-[#2c5fb3]">
          <span className="font-mono font-bold text-sm normal-case tracking-normal">
            {formatNumber(incoming)}
          </span>{" "}
          inc
        </div>
      </div>
    </div>
  );
}

function truncate(s: string, n: number): string {
  if (!s) return "";
  if (s.length <= n) return s;
  return s.slice(0, n).trimEnd() + "…";
}
