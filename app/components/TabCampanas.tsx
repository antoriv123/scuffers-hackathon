"use client";

import { Music2, Camera, Mail, Search, Users } from "lucide-react";
import type { AnalysisResult, EnrichedOrderSample } from "./types";
import { formatEur } from "./types";
import { StatusChip, PillBadge } from "./Badges";

type Campaign = NonNullable<AnalysisResult["_meta"]>["full_data"] extends infer F
  ? F extends { campaigns?: infer C }
    ? C extends Array<infer X>
      ? X
      : never
    : never
  : never;

export function TabCampanas({
  campaigns,
  inventory,
  isFull,
}: {
  campaigns: Campaign[];
  inventory: NonNullable<EnrichedOrderSample["inventory_item"]>[];
  isFull: boolean;
}) {
  const stockBySku = new Map(inventory.map((i) => [i.sku, i]));

  return (
    <section className="fade-in">
      {!isFull && (
        <div className="mb-4 cream-card-soft p-3 text-[11px] text-[#6b6b6b]">
          Mostrando {campaigns.length} campañas en el sample. Implementación full pendiente.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {campaigns.map((c) => {
          const inv = c.target_sku ? stockBySku.get(c.target_sku) : undefined;
          const isCritical =
            inv && (inv.inventory_available_units ?? 0) <= (inv.inventory_reserved_units ?? 0);
          return (
            <article
              key={c.campaign_id}
              className={`cream-card p-5 ${isCritical ? "border-l-[3px] border-l-[#c1121f]" : ""}`}
            >
              <header className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <SourceIcon source={c.campaign_source} />
                  <div>
                    <div className="text-sm font-semibold text-[#0A0A0A]">
                      {sourceLabel(c.campaign_source)}
                    </div>
                    <code className="text-[10px] font-mono text-[#6b6b6b]">{c.campaign_id}</code>
                  </div>
                </div>
                {c.status && <StatusChip status={c.status} />}
              </header>

              {c.target_sku && (
                <div className="mb-3">
                  <div className="text-[10px] uppercase tracking-widest text-[#6b6b6b]">
                    Target SKU
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="font-mono text-sm font-semibold">{c.target_sku}</code>
                    {isCritical && (
                      <PillBadge variant="danger">⚠ Stock crítico</PillBadge>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="cream-card-soft px-3 py-2">
                  <div className="text-[10px] uppercase tracking-widest text-[#6b6b6b]">
                    Budget gastado
                  </div>
                  <div className="font-serif font-bold text-xl text-[#0A0A0A]">
                    {formatEur(c.budget_spent)}
                  </div>
                </div>
                {c.target_city && (
                  <div className="cream-card-soft px-3 py-2">
                    <div className="text-[10px] uppercase tracking-widest text-[#6b6b6b]">
                      Ciudad
                    </div>
                    <div className="text-sm text-[#0A0A0A] mt-0.5 truncate">{c.target_city}</div>
                  </div>
                )}
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-widest text-[#6b6b6b] mb-1">
                  Intensidad
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "#f6f5f1" }}>
                  <div
                    className="h-full"
                    style={{
                      width: `${Math.min(100, (c.intensity_numeric ?? 0) * 100)}%`,
                      background: "#2c5fb3",
                    }}
                  />
                </div>
              </div>
            </article>
          );
        })}
        {campaigns.length === 0 && (
          <div className="col-span-full text-center py-10 text-sm text-[#6b6b6b]">
            Sin campañas disponibles en el sample.
          </div>
        )}
      </div>
    </section>
  );
}

function SourceIcon({ source }: { source: string }) {
  const map: Record<string, { icon: React.ReactNode; color: string }> = {
    tiktok_paid: { icon: <Music2 className="w-5 h-5" />, color: "#0A0A0A" },
    instagram_paid: { icon: <Camera className="w-5 h-5" />, color: "#c1121f" },
    instagram_organic: { icon: <Camera className="w-5 h-5" />, color: "#c1121f" },
    google_ads: { icon: <Search className="w-5 h-5" />, color: "#2c5fb3" },
    email: { icon: <Mail className="w-5 h-5" />, color: "#2c5fb3" },
    newsletter: { icon: <Mail className="w-5 h-5" />, color: "#2b7551" },
    influencer: { icon: <Users className="w-5 h-5" />, color: "#e07b00" },
  };
  const m = map[source] ?? { icon: <Users className="w-5 h-5" />, color: "#6b6b6b" };
  return (
    <div
      className="w-10 h-10 rounded-md flex items-center justify-center"
      style={{ background: `${m.color}14`, color: m.color }}
    >
      {m.icon}
    </div>
  );
}

function sourceLabel(source: string): string {
  const labels: Record<string, string> = {
    tiktok_paid: "TikTok Paid",
    instagram_paid: "Instagram Paid",
    instagram_organic: "Instagram Orgánico",
    google_ads: "Google Ads",
    email: "Email",
    newsletter: "Newsletter",
    influencer: "Influencer",
  };
  return labels[source] ?? source;
}
