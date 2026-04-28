"use client";

import type { Tier } from "./types";
import { TIER_COLORS } from "./types";

export function TierBadge({ tier, size = "sm" }: { tier: Tier; size?: "sm" | "lg" | "xl" }) {
  const c = TIER_COLORS[tier];
  const sizes: Record<string, string> = {
    sm: "text-[10px] px-2 py-0.5",
    lg: "text-xs px-2.5 py-1",
    xl: "text-sm px-3 py-1.5",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-mono font-semibold uppercase tracking-wider ${sizes[size]}`}
      style={{ background: c.bg, color: c.text }}
    >
      {tier}
    </span>
  );
}

export function OwnerBadge({ owner, label }: { owner: string; label: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    operations: { bg: "#2c5fb3", text: "#ffffff" },
    customer_service: { bg: "#c1121f", text: "#ffffff" },
    commercial: { bg: "#e07b00", text: "#0A0A0A" },
    warehouse: { bg: "#2b7551", text: "#ffffff" },
  };
  const c = colors[owner] ?? { bg: "#6b6b6b", text: "#ffffff" };
  return (
    <span
      className="inline-flex items-center text-[10px] px-2 py-0.5 rounded font-medium uppercase tracking-wider"
      style={{ background: c.bg, color: c.text }}
    >
      {label}
    </span>
  );
}

export function PillBadge({
  children,
  variant = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "neutral" | "danger" | "warn" | "info" | "ok";
  className?: string;
}) {
  const variants: Record<string, string> = {
    neutral: "bg-[#f6f5f1] text-[#0A0A0A] border border-[#e6e5e1]",
    danger: "bg-[#c1121f]/10 text-[#c1121f] border border-[#c1121f]/30",
    warn: "bg-[#e07b00]/15 text-[#7a5a30] border border-[#e07b00]/40",
    info: "bg-[#2c5fb3]/10 text-[#2c5fb3] border border-[#2c5fb3]/25",
    ok: "bg-[#2b7551]/10 text-[#2b7551] border border-[#2b7551]/25",
  };
  return (
    <span
      className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusChip({ status }: { status: string }) {
  const map: Record<string, "danger" | "warn" | "info" | "ok" | "neutral"> = {
    pending: "warn",
    payment_review: "danger",
    paid: "info",
    processing: "info",
    packed: "info",
    in_transit: "info",
    delivered: "ok",
    delivered_partial: "warn",
    lost: "danger",
    cancelled: "neutral",
    returned: "warn",
    open: "warn",
    resolved: "ok",
    escalated: "danger",
    active: "ok",
    paused: "neutral",
  };
  const v = map[status] ?? "neutral";
  return <PillBadge variant={v}>{status.replace(/_/g, " ")}</PillBadge>;
}

export function SegmentBadge({ segment }: { segment: string }) {
  const map: Record<string, "danger" | "warn" | "info" | "ok" | "neutral"> = {
    vip: "warn",
    loyal: "info",
    regular: "neutral",
    new: "ok",
    dormant: "neutral",
  };
  return <PillBadge variant={map[segment] ?? "neutral"}>{segment}</PillBadge>;
}

export function SentimentBadge({ sentiment }: { sentiment: string }) {
  const map: Record<string, "danger" | "warn" | "info" | "ok" | "neutral"> = {
    very_negative: "danger",
    negative: "warn",
    neutral: "neutral",
    positive: "ok",
  };
  return <PillBadge variant={map[sentiment] ?? "neutral"}>{sentiment.replace("_", " ")}</PillBadge>;
}

export function UrgencyBadge({ urgency }: { urgency: string }) {
  const map: Record<string, "danger" | "warn" | "info" | "neutral"> = {
    critical: "danger",
    high: "warn",
    medium: "info",
    low: "neutral",
  };
  return <PillBadge variant={map[urgency] ?? "neutral"}>{urgency}</PillBadge>;
}
