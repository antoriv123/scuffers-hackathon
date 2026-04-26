"use client";
import { useState } from "react";
import { demoInputs, type DemoInput } from "@/lib/demo-inputs";

type ApiResponse = {
  category: string;
  language_detected: string;
  escalate_human: boolean;
  escalate_reason: string | null;
  reply: string;
  internal_notes: string;
  suggested_compensation: {
    refund: boolean;
    discount_next_order_pct: number;
    free_shipping_next: boolean;
  } | null;
  order_found: Record<string, unknown> | null;
  _meta?: {
    model: string;
    cache_tokens: number;
    input_tokens: number;
    output_tokens: number;
    mode?: "demo" | "live";
  };
};

export default function Home() {
  const [email, setEmail] = useState(demoInputs[0].email);
  const [output, setOutput] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setOutput(null);
    setLatencyMs(null);
    const start = Date.now();
    try {
      const r = await fetch("/api/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await r.json();
      setLatencyMs(Date.now() - start);
      setOutput(json);
    } catch (e) {
      setOutput({
        category: "error",
        language_detected: "?",
        escalate_human: false,
        escalate_reason: null,
        reply: e instanceof Error ? e.message : "Error",
        internal_notes: "",
        suggested_compensation: null,
        order_found: null,
      });
    } finally {
      setLoading(false);
    }
  }

  function loadDemo(d: DemoInput) {
    setEmail(d.email);
    setOutput(null);
  }

  return (
    <main className="max-w-4xl mx-auto p-6 md:p-10">
      <header className="mb-8">
        <div className="text-xs uppercase tracking-widest text-neutral-500 mb-2">
          Scuffers · AI Builder Demo
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Customer Trust Engine
        </h1>
        <p className="text-neutral-600 mt-2 max-w-xl">
          Triage automático de help@scuffers.com en 6 idiomas. Detecta caso,
          consulta pedido, genera respuesta con tono &quot;As Always, With
          Love&quot; y escala lo crítico.
        </p>
      </header>

      <section className="mb-6">
        <div className="text-xs uppercase tracking-widest text-neutral-500 mb-2">
          Casos demo
        </div>
        <div className="flex flex-wrap gap-2">
          {demoInputs.map((d) => (
            <button
              key={d.id}
              onClick={() => loadDemo(d)}
              className="text-sm px-3 py-1.5 border border-neutral-300 rounded-full hover:bg-neutral-100 transition"
            >
              <span className="mr-1">{d.language}</span>
              {d.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <label className="block text-xs uppercase tracking-widest text-neutral-500 mb-2">
          Email del cliente
        </label>
        <textarea
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          rows={8}
          className="w-full border border-neutral-300 rounded-md p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-3 bg-black text-white px-5 py-2.5 rounded-md font-medium disabled:opacity-50"
        >
          {loading ? "Procesando..." : "Generar respuesta"}
        </button>
      </section>

      {output && (
        <section className="space-y-4 border-t border-neutral-200 pt-6">
          {output._meta?.mode === "demo" && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-md p-3 text-sm">
              <strong>Modo DEMO activo</strong> — respuesta pregenerada (sin
              llamada a Anthropic). Pega tu <code>ANTHROPIC_API_KEY</code> en{" "}
              <code>.env.local</code> y reinicia el server para activar Claude
              Sonnet 4.6 en vivo.
            </div>
          )}
          <div className="flex flex-wrap gap-2 text-xs">
            {output._meta?.mode === "live" && (
              <Badge label="🟢 LIVE Claude 4.6" variant="ok" />
            )}
            {output._meta?.mode === "demo" && (
              <Badge label="🟡 MOCK demo mode" />
            )}
            <Badge label={`Categoría: ${output.category}`} />
            <Badge label={`Idioma: ${output.language_detected}`} />
            <Badge
              label={
                output.escalate_human ? "🚨 Escalar humano" : "✓ Auto-resuelto"
              }
              variant={output.escalate_human ? "alert" : "ok"}
            />
            {latencyMs && <Badge label={`${latencyMs}ms`} />}
            {output._meta && output._meta.mode === "live" && (
              <Badge
                label={`Cache: ${output._meta.cache_tokens} tokens reused`}
              />
            )}
          </div>

          {output.escalate_human && output.escalate_reason && (
            <div className="bg-red-50 border border-red-200 text-red-900 rounded-md p-3 text-sm">
              <strong>Motivo escalado:</strong> {output.escalate_reason}
            </div>
          )}

          {output.order_found && (
            <details className="bg-neutral-50 border border-neutral-200 rounded-md p-3 text-sm">
              <summary className="cursor-pointer font-medium">
                Orden encontrada en Shopify
              </summary>
              <pre className="mt-2 text-xs overflow-x-auto">
                {JSON.stringify(output.order_found, null, 2)}
              </pre>
            </details>
          )}

          <div>
            <div className="text-xs uppercase tracking-widest text-neutral-500 mb-2">
              Respuesta al cliente
            </div>
            <div className="bg-neutral-50 border border-neutral-200 rounded-md p-4 whitespace-pre-wrap text-sm leading-relaxed">
              {output.reply}
            </div>
          </div>

          {output.internal_notes && (
            <div>
              <div className="text-xs uppercase tracking-widest text-neutral-500 mb-2">
                Notas internas (equipo soporte)
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm">
                {output.internal_notes}
              </div>
            </div>
          )}

          {output.suggested_compensation && (
            <div>
              <div className="text-xs uppercase tracking-widest text-neutral-500 mb-2">
                Compensación sugerida
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 text-sm flex flex-wrap gap-3">
                {output.suggested_compensation.refund && (
                  <span>💰 Refund completo</span>
                )}
                {output.suggested_compensation.discount_next_order_pct > 0 && (
                  <span>
                    🎟️ {output.suggested_compensation.discount_next_order_pct}%
                    next order
                  </span>
                )}
                {output.suggested_compensation.free_shipping_next && (
                  <span>📦 Envío gratis próximo</span>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      <footer className="mt-16 pt-6 border-t border-neutral-200 text-xs text-neutral-500">
        Demo construida para hackathon UDIA × ESIC × Scuffers · 28 abr 2026 ·
        Stack: Next.js 15 + Claude Sonnet 4.6 + Anthropic prompt caching
      </footer>
    </main>
  );
}

function Badge({
  label,
  variant = "default",
}: {
  label: string;
  variant?: "default" | "ok" | "alert";
}) {
  const styles = {
    default: "bg-neutral-100 text-neutral-700 border-neutral-300",
    ok: "bg-emerald-100 text-emerald-800 border-emerald-300",
    alert: "bg-red-100 text-red-800 border-red-300",
  }[variant];
  return (
    <span className={`px-2 py-1 border rounded-md font-medium ${styles}`}>
      {label}
    </span>
  );
}
