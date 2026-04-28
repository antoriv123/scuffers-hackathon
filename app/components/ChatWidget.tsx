"use client";

import { useEffect, useRef, useState } from "react";
import DebugDrawer, { type ChatMeta } from "./DebugDrawer";

type Role = "user" | "bot";

type Followup = { label: string; send: string };

type Message = {
  id: string;
  role: Role;
  text: string;
  meta?: ChatMeta;
  followups?: Followup[];
  ts: number;
};

const STORAGE_KEY = "scuffers-chat-v2";
const REQUEST_TIMEOUT_MS = 50000;

const WELCOME_TEXT =
  "Hey, soy el asistente FF FAM. Te ayudo con pedidos, devoluciones, tallas, tiendas y aduanas. Elige una categoría o escríbeme directamente.";

const WELCOME: Message = {
  id: "welcome",
  role: "bot",
  ts: Date.now(),
  text: WELCOME_TEXT,
};

const CATEGORY_BUTTONS: Array<{ icon: string; label: string; send: string }> = [
  { icon: "📦", label: "Mi pedido", send: "¿Dónde está mi pedido?" },
  { icon: "↩️", label: "Devolución", send: "¿Cómo devuelvo un pedido?" },
  { icon: "📏", label: "Tallas", send: "¿Cómo elijo la talla? ¿Vais oversized?" },
  { icon: "💳", label: "Pagos", send: "¿Qué métodos de pago aceptáis?" },
  { icon: "🏬", label: "Tiendas", send: "¿Qué tiendas físicas tenéis abiertas ahora?" },
  { icon: "🚚", label: "Envíos", send: "¿Cuánto tarda el envío a mi país?" },
];

const QUICK_PROMPTS: string[] = [
  "Llevo 3 semanas esperando mi pedido #1234, ¿qué hago?",
  "Hi, will I pay UK duty if my cart is over £150?",
  "Pedí talla M de un hoodie y me queda enorme",
  "¿Cuándo es vuestro próximo drop?",
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [latestMeta, setLatestMeta] = useState<ChatMeta | null>(null);
  const [unread, setUnread] = useState(1);
  const [hydrated, setHydrated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* ── localStorage hydrate / persist ───────────────────────────── */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { messages: Message[]; latestMeta: ChatMeta | null };
        if (parsed?.messages?.length) setMessages(parsed.messages);
        if (parsed?.latestMeta) setLatestMeta(parsed.latestMeta);
        setUnread(0);
      }
    } catch {
      /* ignore corrupted state */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ messages, latestMeta }),
      );
    } catch {
      /* localStorage may be full or disabled */
    }
  }, [messages, latestMeta, hydrated]);

  /* ── Scroll to bottom on new messages ─────────────────────────── */
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  /* ── Focus input + clear unread when opening ──────────────────── */
  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  /* ── Send message with abort + timeout ────────────────────────── */
  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      text: trimmed,
      ts: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== "welcome")
        .slice(-6)
        .map((m) => ({ role: m.role, text: m.text }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
        signal: ctrl.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const meta: ChatMeta = data.meta ?? {};
      const followups: Followup[] = Array.isArray(data.followups)
        ? data.followups
        : [];
      const botMsg: Message = {
        id: `b-${Date.now()}`,
        role: "bot",
        text: data.reply ?? "(respuesta vacía)",
        meta,
        followups,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, botMsg]);
      setLatestMeta(meta);
    } catch (err) {
      const aborted = (err as { name?: string })?.name === "AbortError";
      const errorMsg: Message = {
        id: `e-${Date.now()}`,
        role: "bot",
        ts: Date.now(),
        text: aborted
          ? "Estoy tardando más de la cuenta — el equipo te escribe en menos de 30 minutos por email. Si es urgente, mándanos un DM a @scuffers.co."
          : "Algo se ha ido — escríbenos a help@scuffers.com y te respondemos en cuanto pueda.",
        meta: { mode: "mock", category: "general" },
      };
      setMessages((prev) => [...prev, errorMsg]);
      console.error(err);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }

  function reset() {
    abortRef.current?.abort();
    setMessages([{ ...WELCOME, ts: Date.now() }]);
    setLatestMeta(null);
    setDebugOpen(false);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  function handover() {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const note = lastUser
      ? `Te conecto con María del equipo. Te escribe por email/WhatsApp en menos de 30 minutos con solución concreta sobre: "${lastUser.text.slice(0, 80)}". Si tienes order id, pásalo aquí para que María lo tenga listo antes de contactarte.`
      : "Te conecto con María del equipo. Escríbenos tu email y order id (si lo tienes) y te contacta en menos de 30 minutos.";
    const handoverMsg: Message = {
      id: `h-${Date.now()}`,
      role: "bot",
      ts: Date.now(),
      text: note,
      meta: {
        category: "handover",
        language: "es",
        escalate_human: true,
        escalate_reason: "Cliente solicitó humano vía botón de handover.",
        mode: "mock",
        model: "handover",
      },
    };
    setMessages((prev) => [...prev, handoverMsg]);
    setLatestMeta(handoverMsg.meta as ChatMeta);
  }

  /* ── Last bot message followups ───────────────────────────────── */
  const lastBot = [...messages].reverse().find((m) => m.role === "bot");
  const lastBotFollowups: Followup[] =
    !loading && lastBot && lastBot.id !== "welcome" && lastBot.followups?.length
      ? lastBot.followups
      : [];

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 md:bottom-7 md:right-7 z-40 bg-scuffers-black text-scuffers-cream w-14 h-14 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.18)] hover:scale-105 transition-transform flex items-center justify-center"
          aria-label="Abrir chat de soporte"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 12a8 8 0 1 1-3.5-6.6L21 4l-1 4.2A7.97 7.97 0 0 1 21 12Z" />
            <circle cx="9" cy="12" r="0.9" fill="currentColor" />
            <circle cx="13" cy="12" r="0.9" fill="currentColor" />
            <circle cx="17" cy="12" r="0.9" fill="currentColor" />
          </svg>
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-scuffers-cream text-scuffers-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-scuffers-black">
              {unread}
            </span>
          )}
        </button>
      )}

      {open && (
        <section
          className="fixed inset-0 md:inset-auto md:bottom-6 md:right-6 z-40 md:w-[420px] md:h-[680px] md:max-h-[calc(100vh-3rem)] bg-white md:rounded-2xl md:shadow-[0_24px_80px_rgba(0,0,0,0.22)] flex flex-col overflow-hidden chat-slide-up border border-scuffers-border"
          role="dialog"
          aria-label="Chat de soporte Scuffers"
        >
          <header className="bg-scuffers-black text-scuffers-cream px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-scuffers-cream/10 border border-scuffers-cream/20 rounded-full flex items-center justify-center font-black tracking-tightest text-[13px]">
                S
              </div>
              <div>
                <div className="text-[10px] tracking-[0.22em] uppercase text-scuffers-cream/60">
                  Scuffers Help
                </div>
                <div className="font-black tracking-tightest text-[15px] leading-tight flex items-center gap-2">
                  As Always, With Love
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium tracking-wide">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    online
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={reset}
                aria-label="Empezar de nuevo"
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
                title="Empezar de nuevo"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                  <polyline points="3 4 3 9 8 9" />
                </svg>
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar chat"
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-5 space-y-3 bg-scuffers-cream"
          >
            {messages.map((m) => (
              <Bubble key={m.id} message={m} />
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-scuffers-border rounded-2xl rounded-bl-sm px-4 py-3">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}

            {/* Welcome state — show category buttons + quick prompts */}
            {messages.length === 1 && !loading && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORY_BUTTONS.map((c) => (
                    <button
                      key={c.label}
                      onClick={() => send(c.send)}
                      className="bg-white border border-scuffers-border hover:border-scuffers-black hover:bg-scuffers-cream-soft transition-all rounded-xl px-2 py-3 flex flex-col items-center gap-1 text-[12px] font-medium"
                    >
                      <span className="text-lg">{c.icon}</span>
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] tracking-[0.18em] uppercase text-scuffers-taupe">
                    O prueba con uno real
                  </div>
                  {QUICK_PROMPTS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="block w-full text-left text-[12px] bg-white/60 border border-scuffers-border hover:bg-white hover:border-scuffers-black transition-colors px-3 py-2 rounded-lg text-scuffers-black/85"
                    >
                      "{s}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Followup chips after a reply */}
            {lastBotFollowups.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {lastBotFollowups.map((f) => (
                  <button
                    key={f.label}
                    onClick={() => send(f.send)}
                    className="text-[12px] bg-white border border-scuffers-border hover:bg-scuffers-cream-soft hover:border-scuffers-black transition-colors px-3 py-1.5 rounded-full text-scuffers-black/80"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-scuffers-border bg-white px-3 py-2 flex items-center justify-between gap-2">
            <button
              onClick={handover}
              className="text-[11px] text-scuffers-black hover:text-scuffers-black/70 flex items-center gap-1.5 px-2 py-1 font-medium"
              title="Hablar con María o Jorge del equipo"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                <circle cx="10" cy="8" r="4" />
                <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M17 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Hablar con un humano
            </button>
            <button
              onClick={() => setDebugOpen(true)}
              disabled={!latestMeta}
              className="text-[11px] text-scuffers-taupe hover:text-scuffers-black disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 px-2 py-1"
              title="Ver razonamiento del bot (interno)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Razonamiento
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-scuffers-border bg-white px-3 py-3 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu mensaje…"
              className="flex-1 px-3 py-2.5 bg-scuffers-cream-soft rounded-full text-[14px] focus:outline-none focus:bg-white focus:ring-1 focus:ring-scuffers-black/20"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Enviar"
              className="bg-scuffers-black text-scuffers-cream w-10 h-10 rounded-full flex items-center justify-center hover:opacity-85 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </form>

          <div className="bg-scuffers-cream-soft border-t border-scuffers-border px-3 py-1.5 text-center">
            <span className="text-[10px] tracking-widest uppercase text-scuffers-taupe-soft">
              powered by Claude · Antonio's Max
            </span>
          </div>
        </section>
      )}

      <DebugDrawer
        meta={latestMeta}
        open={debugOpen}
        onClose={() => setDebugOpen(false)}
      />
    </>
  );
}

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  // Detect mode for subtle badge on bot bubbles
  const modeLabel = !isUser && message.meta?.mode
    ? message.meta.mode === "faq"
      ? "fast path"
      : message.meta.mode === "cli"
        ? "Claude haiku"
        : message.meta.mode === "mock"
          ? "agent"
          : null
    : null;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} chat-bubble-in`}>
      <div
        className={
          isUser
            ? "bg-scuffers-black text-scuffers-cream rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[80%] text-[14px] leading-relaxed"
            : "bg-white border border-scuffers-border text-scuffers-black rounded-2xl rounded-bl-sm px-4 py-3 max-w-[88%] text-[14px] leading-relaxed whitespace-pre-wrap"
        }
      >
        {message.text}
        {!isUser && message.meta?.escalate_human && (
          <div className="mt-2 pt-2 border-t border-scuffers-border text-[11px] text-red-700 flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <circle cx="12" cy="12" r="9" />
            </svg>
            Escalado a María/Jorge · &lt;30 min
          </div>
        )}
        {!isUser && modeLabel && (
          <div className="mt-2 text-[10px] tracking-widest uppercase text-scuffers-taupe-soft">
            via {modeLabel}
            {message.meta?.latency_ms != null && message.meta.mode === "cli" && (
              <span> · {(message.meta.latency_ms / 1000).toFixed(1)}s</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
