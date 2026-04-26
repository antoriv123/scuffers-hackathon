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

export const runtime = "nodejs";
export const maxDuration = 30;

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

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const useMock = !apiKey || apiKey === "sk-ant-..." || apiKey.length < 20;

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

    if (useMock) {
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
          mode: "demo",
          latency_ms: Date.now() - start,
        },
      });
    }

    const anthropic = new Anthropic({ apiKey });

    const augmentedSystemPrompt = buildAugmentedPrompt(
      SCUFFERS_SUPPORT_PROMPT,
      preCategory,
    );
    const reviewsContext = buildReviewsContext(similarReviews);

    const userMessage = order
      ? `${reviewsContext}\n\n# EMAIL DEL CLIENTE\n${email}\n\n# DATOS DE LA ORDEN ENCONTRADA EN SHOPIFY\n${JSON.stringify(order, null, 2)}`
      : `${reviewsContext}\n\n# EMAIL DEL CLIENTE\n${email}\n\nNo se ha podido extraer un order id del email.`;

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
        mode: "live",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
