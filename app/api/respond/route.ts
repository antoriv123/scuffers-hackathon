import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { SCUFFERS_SUPPORT_PROMPT } from "@/lib/system-prompt";
import { extractOrderId, findOrder } from "@/lib/mock-orders";
import { findMockResponse } from "@/lib/mock-responses";
import { buildAugmentedPrompt, selectKnowledge } from "@/lib/knowledge-base";
import {
  classifyByKeywords,
  retrieveSimilarReviews,
  buildReviewsContext,
} from "@/lib/reviews-retrieval";
import { executeClaudeCli, findClaudeBinary } from "@/lib/claude-cli";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "email field required" },
        { status: 400 },
      );
    }

    const orderId = extractOrderId(email);
    const order = orderId ? findOrder(orderId) : undefined;

    const preCategory = classifyByKeywords(email);
    const kbChunks = selectKnowledge(preCategory);
    const similarReviews = retrieveSimilarReviews(email, preCategory, 3);

    const augmentedSystemPrompt = buildAugmentedPrompt(
      SCUFFERS_SUPPORT_PROMPT,
      preCategory,
    );
    const reviewsContext = buildReviewsContext(similarReviews);

    const userMessage = order
      ? `${reviewsContext}\n\n# EMAIL DEL CLIENTE\n${email}\n\n# DATOS DE LA ORDEN ENCONTRADA EN SHOPIFY\n${JSON.stringify(order, null, 2)}`
      : `${reviewsContext}\n\n# EMAIL DEL CLIENTE\n${email}\n\nNo se ha podido extraer un order id del email.`;

    const ragMeta = {
      pre_classification: preCategory,
      kb_chunks_loaded: kbChunks.map((c) => ({ id: c.id, title: c.title })),
      similar_reviews: similarReviews.map((r) => ({
        date: r.date,
        rating: r.rating,
        language: r.language,
        pattern: r.pattern,
        excerpt: r.text.slice(0, 140),
      })),
    };

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const hasApiKey = !!apiKey && apiKey !== "sk-ant-..." && apiKey.length >= 20;
    const useCli = process.env.USE_CLAUDE_CLI === "true" || !hasApiKey;
    const cliAvailable = !!findClaudeBinary();

    if (useCli && cliAvailable) {
      try {
        const start = Date.now();
        const cli = await executeClaudeCli({
          prompt: userMessage,
          systemPrompt: augmentedSystemPrompt,
          model: "sonnet",
          timeoutMs: 90000,
        });

        const cleaned = cli.result
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/```\s*$/i, "")
          .trim();

        let parsed;
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          parsed = {
            category: preCategory,
            language_detected: "es",
            escalate_human: false,
            escalate_reason: null,
            reply: cli.result,
            internal_notes: "Respuesta CLI no fue JSON parseable, devuelta tal cual.",
            suggested_compensation: null,
          };
        }

        return NextResponse.json({
          ...parsed,
          order_found: order ?? null,
          rag: ragMeta,
          _meta: {
            model: cli.model,
            cache_tokens: cli.cache_read_tokens,
            cache_creation_tokens: cli.cache_creation_tokens,
            input_tokens: cli.input_tokens,
            output_tokens: cli.output_tokens,
            cost_usd: cli.cost_usd,
            cli_duration_ms: cli.duration_ms,
            total_latency_ms: Date.now() - start,
            mode: "cli" as const,
          },
        });
      } catch (cliError) {
        const message =
          cliError instanceof Error ? cliError.message : "CLI failed";
        return NextResponse.json(
          {
            error: `Claude CLI error: ${message}`,
            hint: "Verifica que 'claude' esté en PATH y autenticado. Prueba: claude -p hello",
          },
          { status: 500 },
        );
      }
    }

    if (!hasApiKey && !cliAvailable) {
      const start = Date.now();
      const mock = findMockResponse(email);
      await new Promise((r) => setTimeout(r, 600));
      return NextResponse.json({
        ...mock,
        order_found: order ?? null,
        rag: ragMeta,
        _meta: {
          model: "mock-mode",
          cache_tokens: 0,
          input_tokens: 0,
          output_tokens: 0,
          mode: "demo" as const,
          latency_ms: Date.now() - start,
        },
      });
    }

    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: [
        {
          type: "text",
          text: augmentedSystemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        category: preCategory,
        language_detected: "es",
        escalate_human: false,
        escalate_reason: null,
        reply: text,
        internal_notes: "Modelo no devolvió JSON parseable",
        suggested_compensation: null,
      };
    }

    return NextResponse.json({
      ...parsed,
      order_found: order ?? null,
      rag: ragMeta,
      _meta: {
        model: "claude-sonnet-4-6",
        cache_tokens: response.usage.cache_read_input_tokens ?? 0,
        cache_creation_tokens: response.usage.cache_creation_input_tokens ?? 0,
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        mode: "live" as const,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
