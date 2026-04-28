import { NextRequest, NextResponse } from "next/server";
import { findOrder } from "@/lib/mock-orders";
import { selectKnowledge } from "@/lib/knowledge-base";
import {
  classifyByKeywords,
  retrieveSimilarReviews,
} from "@/lib/reviews-retrieval";
import { executeClaudeCli, findClaudeBinary } from "@/lib/claude-cli";
import { tryFaqFastPath, suggestFollowups, type FaqLang } from "@/lib/chat-faq";

export const runtime = "nodejs";
export const maxDuration = 90;

/**
 * Slim system prompt (≈600 tokens vs 2500 antes).
 * El KB se inyecta en el user message, no aquí, para evitar reenviarlo cada turno.
 * Las reglas críticas (refund proactivo, UK duty honesto, no store credit forzado)
 * están condensadas — el modelo no necesita 8000 chars de contexto histórico.
 */
const CHAT_SYSTEM_PROMPT = `Asistente de chat de Scuffers (streetwear español, Madrid 2018, lema "As Always, With Love", comunidad "FF FAM").

Respuestas BREVES (2-4 frases, máx 350 chars salvo que pida detalle real). Conversacional, en el idioma del cliente. Sin JSON, sin markdown excepto saltos de línea.

TONO:
- Cercano, NUNCA corporativo. Sin "estimado/a", sin "atentamente", sin "lamentamos los inconvenientes".
- Honesto. Si hay retraso, dilo. Cero hype.
- "As Always, With Love" SOLO al cierre claro de un caso, no en cada turno.

REGLAS DE NEGOCIO (no negociables):
- Pedido >5 días sin movimiento → ofrece refund + 10% next order. NO pidas esperar al carrier.
- Pedido >2 semanas → refund + 15%, cliente nunca paga la diferencia.
- Devolución → link mock https://returns.scuffers.com/label/{order_id}/{country}. Refund en DINERO REAL al método original. JAMÁS forzar store credit.
- UK >£135 → AVISA: "policy says we cover duty, but FedEx sometimes bills you anyway. Save the receipt and we refund." (riesgo legal real).
- Wrong/missing item → reposición inmediata, sin investigación de 2 semanas.
- Sizing → cambio gratis ES, pagado intl.
- LatAm (Chile/AR/MX) → duty + manejo FedEx 30-100€ los paga el cliente — sé honesto.

ESCALADO INMEDIATO si el cliente menciona: estafa, scam, abogado, OCU, denuncia, policía, Trustpilot, Instagram público, Trading Standards. Caso UK duty con FedEx denunciando. Pedido >300€. Robo en tránsito. → di que María/Jorge escriben en <30 min por email/WhatsApp con solución concreta. NO uses "As Always, With Love" en escalados.

Si pregunta off-topic (clima, código, política): redirige amable a temas Scuffers.
Si menciona order id y te lo pasamos en contexto, USA esos datos. Si no encontramos, pídelo.
NO inventes políticas, fechas, descuentos. Si no lo tienes en contexto, dilo.`;

/* ───── Detection helpers ───────────────────────────────────────── */

const ESCALATE_REGEX =
  /\b(estafa|scam|fraud|abogado|lawyer|attorney|ocu|denuncia|polic[ií]a|police|legal action|trading standards|instagram p[uú]blico|public complaint|trustpilot.*review|denunciaré|denunciar|sue\b|demand)\b/i;

function detectLanguage(text: string): FaqLang {
  const t = text.toLowerCase();
  if (/\b(hello|hi |hey |please|thanks|order|return|delivery|i'm|i am|where|my )\b/.test(t)) return "en";
  if (/\b(bonjour|merci|commande|livraison|svp|s'il|j'ai|où|comment)\b/.test(t)) return "fr";
  if (/\b(ciao|grazie|ordine|spedizione|consegna|dove|sono|reso)\b/.test(t)) return "it";
  if (/\b(hallo|danke|bestellung|lieferung|wo ist|sendung)\b/.test(t)) return "de";
  return "es";
}

function detectEscalation(message: string): { escalate: boolean; reason: string | null } {
  const match = message.match(ESCALATE_REGEX);
  if (match) {
    return {
      escalate: true,
      reason: `Cliente menciona "${match[0]}" — derivar a humano (María/Jorge) en <30 min.`,
    };
  }
  return { escalate: false, reason: null };
}

/**
 * Extract order ID supporting multiple formats:
 * - #1234, 1234 (mock-orders.ts)
 * - ORD-10460 (data/orders.csv)
 * - SCF-1234, SCUF-12345 (vanity formats users might type)
 */
function extractOrderIdSmart(text: string): string | null {
  // Try ORD-/SCF-/SCUF- prefix first (more specific)
  const prefix = text.match(/\b(?:ORD|SCF|SCUF|SCUFFERS)[-\s]*(\d{3,7})\b/i);
  if (prefix) return prefix[1];
  // Then plain 4-6 digit numbers (mock-orders format)
  const plain = text.match(/#?\s*(\d{4,6})/);
  if (plain) return plain[1];
  return null;
}

type ChatHistoryItem = { role: "user" | "bot"; text: string };

/* ───── Route ───────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    const body = await req.json();
    const message: string = body?.message;
    const history: ChatHistoryItem[] = Array.isArray(body?.history)
      ? body.history
      : [];

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message field required" },
        { status: 400 },
      );
    }

    /* Common metadata calculated up front */
    const language = detectLanguage(message);
    const orderId = extractOrderIdSmart(message);
    const order = orderId ? findOrder(orderId) : undefined;
    const category = classifyByKeywords(message);
    const { escalate, reason: escalateReason } = detectEscalation(message);
    const kbChunks = selectKnowledge(category);
    const similarReviews = retrieveSimilarReviews(message, category, 3);

    const baseMeta = {
      category,
      language,
      escalate_human: escalate,
      escalate_reason: escalateReason,
      order_found: order ?? null,
      rag: {
        kb_chunks: kbChunks.map((c) => ({ id: c.id, title: c.title })),
        similar_reviews: similarReviews.map((r) => ({
          date: r.date,
          rating: r.rating,
          language: r.language,
          pattern: r.pattern,
          excerpt: r.text.slice(0, 140),
        })),
      },
    };

    /* ── 1. FAQ FAST PATH (instant, <50ms) ─────────────────────────
     * Only fires if no order ID was detected AND no escalation signal.
     * Order-specific or escalated cases always go to LLM for personalization.
     */
    if (!order && !escalate && !orderId) {
      const faqMatch = tryFaqFastPath(message, language);
      if (faqMatch) {
        return NextResponse.json({
          reply: faqMatch.reply,
          followups: faqMatch.followups,
          meta: {
            ...baseMeta,
            category: faqMatch.faq.category,
            mode: "faq" as const,
            model: "faq-fastpath",
            latency_ms: Date.now() - t0,
            cost_usd: 0,
            cache_read_tokens: 0,
            cache_creation_tokens: 0,
            input_tokens: 0,
            output_tokens: 0,
          },
        });
      }
    }

    /* ── 2. LLM PATH (Haiku) ──────────────────────────────────────
     * Slim user message: only the most relevant KB chunk (not all),
     * order context, recent history, escalation hint.
     */
    const cliAvailable = !!findClaudeBinary();

    if (!cliAvailable) {
      return NextResponse.json({
        reply:
          "Estoy en modo demo offline (no encuentro el binario de Claude). Verifica `which claude` y que el CLI esté autenticado con tu Max. As Always, With Love.",
        followups: suggestFollowups(category),
        meta: {
          ...baseMeta,
          mode: "demo" as const,
          model: "offline",
          latency_ms: Date.now() - t0,
          cost_usd: 0,
          cache_read_tokens: 0,
          cache_creation_tokens: 0,
          input_tokens: 0,
          output_tokens: 0,
        },
      });
    }

    // Inject only the highest-priority KB chunk for the detected category
    // (instead of all chunks → faster + smaller prompt + cheaper)
    const primaryChunk =
      kbChunks.find((c) => c.category === category) ??
      kbChunks.find((c) => c.id === "brand-dna") ??
      kbChunks[0];
    const knowledgeBlock = primaryChunk
      ? `### ${primaryChunk.title}\n${primaryChunk.content}`
      : "";

    const reviewsBlock =
      similarReviews.length === 0
        ? ""
        : `\n\n# CASOS HISTÓRICOS SIMILARES (Trustpilot, NO repetir esos errores):\n${similarReviews
            .slice(0, 2)
            .map(
              (r, i) =>
                `${i + 1}. [${r.date} · ${r.rating}★] "${r.text.slice(0, 160)}" — patrón: ${r.pattern}`,
            )
            .join("\n")}`;

    const orderBlock = order
      ? `\n\n# PEDIDO (datos reales de Shopify mock)\n${JSON.stringify(order, null, 2)}\nUsa estos datos para personalizar (días en tránsito, carrier, país, valor, item).`
      : orderId
        ? `\n\n# Cliente menciona pedido #${orderId} pero no está en nuestro mock. Pide email para verificar manualmente.`
        : "";

    const escalateBlock = escalate
      ? `\n\n# ESCALADO\n${escalateReason}\nResponde derivando a humano. María/Jorge escriben en <30 min por email con solución. NO promete tú la solución técnica. NO uses "As Always, With Love".`
      : "";

    // History as concise turn list (last 4 exchanges, truncated 200 chars)
    const historyBlock =
      history.length === 0
        ? ""
        : `\n\n# HISTORIAL RECIENTE\n${history
            .slice(-4)
            .map(
              (h) =>
                `${h.role === "user" ? "Cliente" : "Bot"}: ${h.text.slice(0, 200)}`,
            )
            .join("\n")}`;

    const userMessage = `# MENSAJE\n${message}${orderBlock}${escalateBlock}${historyBlock}${reviewsBlock}\n\n# CONTEXTO RELEVANTE\n${knowledgeBlock}\n\nResponde al cliente directamente, en ${language}, 2-4 frases, tono Scuffers.`;

    const start = Date.now();
    const cli = await executeClaudeCli({
      prompt: userMessage,
      systemPrompt: CHAT_SYSTEM_PROMPT,
      model: "haiku",
      timeoutMs: 45000,
    });

    const reply = cli.result
      .replace(/^```[a-z]*\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    return NextResponse.json({
      reply,
      followups: suggestFollowups(category),
      meta: {
        ...baseMeta,
        mode: "cli" as const,
        model: cli.model,
        latency_ms: Date.now() - start,
        cost_usd: cli.cost_usd,
        cache_read_tokens: cli.cache_read_tokens,
        cache_creation_tokens: cli.cache_creation_tokens,
        input_tokens: cli.input_tokens,
        output_tokens: cli.output_tokens,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown error";
    console.error("/api/chat error", msg);
    return NextResponse.json(
      {
        error: msg,
        hint: "Verifica `claude -p hello --output-format json`. .env.local debe tener USE_CLAUDE_CLI=true.",
      },
      { status: 500 },
    );
  }
}
