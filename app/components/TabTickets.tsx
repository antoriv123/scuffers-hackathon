"use client";

import { useMemo } from "react";
import { Mail, Camera, MessageCircle, Star } from "lucide-react";
import type { EnrichedTicketSample } from "./types";
import { formatEur, timeAgo } from "./types";
import { UrgencyBadge, SentimentBadge, PillBadge } from "./Badges";

const URGENCY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function TabTickets({
  tickets,
  isFull,
}: {
  tickets: EnrichedTicketSample[];
  isFull: boolean;
}) {
  const sorted = useMemo(
    () =>
      [...tickets].sort(
        (a, b) =>
          (URGENCY_RANK[a.support_ticket_urgency] ?? 9) -
          (URGENCY_RANK[b.support_ticket_urgency] ?? 9),
      ),
    [tickets],
  );

  return (
    <section className="fade-in">
      {!isFull && (
        <div className="mb-4 cream-card-soft p-3 text-[11px] text-[#6b6b6b]">
          Mostrando {tickets.length} tickets del sample. Implementación full pendiente.
        </div>
      )}
      <div className="space-y-3">
        {sorted.map((t) => (
          <article key={t.support_ticket_id} className="cream-card p-4">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <UrgencyBadge urgency={t.support_ticket_urgency} />
              <SentimentBadge sentiment={t.support_ticket_sentiment} />
              <ChannelBadge ticketId={t.support_ticket_id} />
              <code className="text-[10px] font-mono text-[#6b6b6b]">{t.support_ticket_id}</code>
              <span className="ml-auto text-[10px] text-[#6b6b6b]">
                {timeAgo(t.created_at)}
              </span>
            </div>
            <p className="text-sm text-[#0A0A0A] leading-relaxed mb-3">
              {t.support_ticket_message}
            </p>
            {t.customer && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#6b6b6b] pt-3 border-t border-[#e6e5e1]">
                <code className="font-mono text-[#0A0A0A]">{t.customer.customer_id}</code>
                {t.customer.is_vip && <Star className="w-3 h-3 fill-[#e07b00] text-[#e07b00]" />}
                <span>·</span>
                <span>LTV {formatEur(t.customer.customer_lifetime_value)}</span>
                {t.order && (
                  <>
                    <span>·</span>
                    <PillBadge>{t.order.order_id}</PillBadge>
                  </>
                )}
              </div>
            )}
          </article>
        ))}
        {sorted.length === 0 && (
          <div className="text-center py-10 text-sm text-[#6b6b6b]">Sin tickets en el sample.</div>
        )}
      </div>
    </section>
  );
}

function ChannelBadge({ ticketId }: { ticketId: string }) {
  const isIg = ticketId.toLowerCase().includes("ig") || ticketId.toLowerCase().includes("insta");
  const isEmail = ticketId.toLowerCase().includes("email") || ticketId.toLowerCase().includes("mail");
  if (isIg) {
    return (
      <PillBadge variant="warn">
        <Camera className="w-3 h-3 mr-1" />
        Instagram
      </PillBadge>
    );
  }
  if (isEmail) {
    return (
      <PillBadge variant="info">
        <Mail className="w-3 h-3 mr-1" />
        Email
      </PillBadge>
    );
  }
  return (
    <PillBadge>
      <MessageCircle className="w-3 h-3 mr-1" />
      Chat
    </PillBadge>
  );
}
