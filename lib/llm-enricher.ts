/**
 * LLM enricher: convierte ActionCandidate en PrioritizedAction final.
 * Usa Claude CLI para generar title, reason, expected_impact y confidence
 * con tono Scuffers + reasoning natural.
 *
 * Falla en silencio: si CLI no responde, usa los hints determinísticos.
 */

import { executeClaudeCli, findClaudeBinary } from "./claude-cli";
import type { PrioritizedAction } from "./types";
import type { ActionCandidate } from "./prioritizer";

const ENRICHER_PROMPT = `Eres el AI Ops Control Tower de Scuffers. Tu trabajo: convertir N action candidates (cada uno con title_hint, reason_hint, action_type, target_id) en acciones finales BIEN REDACTADAS para mostrar al equipo de operaciones durante un lanzamiento de alta demanda.

CONTEXTO DE NEGOCIO:
- Scuffers (streetwear español, ~12-15M€/año, 6K pedidos/mes, 50% internacional)
- Lanzamiento de capsule collection con unidades limitadas
- Drops vuelan en horas — ya hay 32% de reviews 1-2★ en Trustpilot por mala gestión de picos
- Stack: Shopify Plus + Klaviyo + Klarna + Netsuite + Reveni (devoluciones, fuente de fricción)
- Equipos: operations, customer_service, commercial, warehouse
- Tono: cercano, FF FAM, "As Always With Love" — sin jerga corporativa

PARA CADA ACTION CANDIDATE devuelve un objeto:
{
  "rank": <1..N según importancia>,
  "title": "<frase corta accionable, max 80 chars, sin emojis>",
  "reason": "<explicación 1-2 frases con DATOS específicos del candidate>",
  "expected_impact": "<qué se mejora con la acción, 1 frase con métrica si posible>",
  "confidence": <0.6-0.95 según fortaleza de la señal>
}

REGLAS:
- ranking: las pause_campaign con stock crítico van top. Luego escalate_ticket VIP. Luego prioritize_order con tickets. Luego restock_alert. Luego review_manually.
- Confianza alta (0.85+) cuando hay múltiples señales convergentes (VIP + ticket + stock bajo).
- Confianza media (0.7-0.84) cuando hay una señal fuerte.
- Confianza baja (0.6-0.69) cuando es preventivo.
- NUNCA uses palabras vacías: "es importante", "es crucial", "innovador". Sé específico.
- Cada reason DEBE referenciar datos concretos del candidate (números, IDs, contexto).
- Lenguaje natural en español, frases cortas.

OUTPUT: SOLO JSON ARRAY. Sin markdown. Sin texto adicional. Schema estricto.`;

export async function enrichCandidatesWithLLM(
  candidates: ActionCandidate[],
  options?: { useCli?: boolean; useApi?: boolean; apiKey?: string },
): Promise<PrioritizedAction[]> {
  const useCli = options?.useCli ?? !!findClaudeBinary();
  if (!useCli) {
    return enrichDeterministic(candidates);
  }

  // Build user message with all candidates
  const userMessage = `# ACTION CANDIDATES (${candidates.length} items)

${candidates
  .map(
    (c, i) =>
      `## ${i + 1}. action_type=${c.action_type} target=${c.target_id} target_type=${c.target_type}
title_hint: ${c.title_hint}
reason_hint: ${c.reason_hint}
raw_score: ${c.raw_score.toFixed(3)}
owner: ${c.owner}
automation_possible: ${c.automation_possible}`,
  )
  .join("\n\n")}

Devuelve un array JSON con ${candidates.length} objetos enriquecidos, mismo orden de input. Schema:
[{ "rank": int, "title": string, "reason": string, "expected_impact": string, "confidence": number }]`;

  try {
    const cli = await executeClaudeCli({
      prompt: userMessage,
      systemPrompt: ENRICHER_PROMPT,
      model: "sonnet",
      timeoutMs: 120000,
    });

    const cleaned = cli.result
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const enriched = JSON.parse(cleaned) as Array<{
      rank: number;
      title: string;
      reason: string;
      expected_impact: string;
      confidence: number;
    }>;

    if (!Array.isArray(enriched) || enriched.length !== candidates.length) {
      console.warn(
        `LLM returned ${enriched?.length ?? "?"} items, expected ${candidates.length}. Falling back.`,
      );
      return enrichDeterministic(candidates);
    }

    // Sort by enriched rank
    const indexed = candidates.map((c, i) => ({ ...c, _e: enriched[i] }));
    indexed.sort((a, b) => a._e.rank - b._e.rank);

    return indexed.map((c, i) => ({
      rank: i + 1,
      action_type: c.action_type,
      target_id: c.target_id,
      target_type: c.target_type,
      title: c._e.title,
      reason: c._e.reason,
      expected_impact: c._e.expected_impact,
      confidence: c._e.confidence,
      owner: c.owner,
      automation_possible: c.automation_possible,
      _scores: c._scores,
      _data_snapshot: c._data_snapshot,
    }));
  } catch (e) {
    console.error("LLM enricher failed:", e);
    return enrichDeterministic(candidates);
  }
}

/**
 * Fallback determinístico: usa hints como título y razón directos.
 * Útil cuando Claude CLI no está disponible o falla.
 */
export function enrichDeterministic(
  candidates: ActionCandidate[],
): PrioritizedAction[] {
  const sorted = [...candidates].sort((a, b) => b.raw_score - a.raw_score);
  return sorted.map((c, i) => ({
    rank: i + 1,
    action_type: c.action_type,
    target_id: c.target_id,
    target_type: c.target_type,
    title: c.title_hint,
    reason: c.reason_hint,
    expected_impact: deriveImpact(c.action_type),
    confidence: clamp(c.raw_score, 0.6, 0.92),
    owner: c.owner,
    automation_possible: c.automation_possible,
    _scores: c._scores,
    _data_snapshot: c._data_snapshot,
  }));
}

function deriveImpact(actionType: string): string {
  const map: Record<string, string> = {
    pause_campaign:
      "Detener gasto en producto agotado y redirigir tráfico a SKUs con stock disponible.",
    escalate_ticket:
      "Resolver caso crítico antes de que escale a Trustpilot/IG público.",
    prioritize_order:
      "Reducir tiempo de entrega y prevenir incidencia de soporte adicional.",
    contact_customer:
      "Recuperar confianza del cliente antes de que reclame, reducir churn.",
    review_manually:
      "Detectar fraude o error de pago antes de procesar el pedido.",
    restock_alert:
      "Coordinar con proveedor para reducir tiempo de stock-out y oversell.",
    limit_purchase_per_customer:
      "Distribuir stock limitado entre más clientes, prevenir reventa.",
    offer_compensation:
      "Convertir cliente furioso en advocate antes de que escale.",
    merge_orders:
      "Reducir coste de envío y consolidar atención.",
    cancel_order_proactively:
      "Devolver dinero antes de que el cliente reclame y evitar disputa.",
    expedite_shipping:
      "Cumplir promesa de express ya pagado por el cliente.",
  };
  return map[actionType] ?? "Mejorar experiencia operativa del lanzamiento.";
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
