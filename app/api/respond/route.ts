import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { SCUFFERS_SUPPORT_PROMPT } from "@/lib/system-prompt";
import { extractOrderId, findOrder } from "@/lib/mock-orders";

export const runtime = "nodejs";
export const maxDuration = 30;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

    const userMessage = order
      ? `EMAIL DEL CLIENTE:\n${email}\n\n---\nDATOS DE LA ORDEN ENCONTRADA EN SHOPIFY:\n${JSON.stringify(order, null, 2)}`
      : `EMAIL DEL CLIENTE:\n${email}\n\n---\nNo se ha podido extraer un order id del email.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: [
        {
          type: "text",
          text: SCUFFERS_SUPPORT_PROMPT,
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
        category: "general",
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
      _meta: {
        model: "claude-sonnet-4-6",
        cache_tokens: response.usage.cache_read_input_tokens ?? 0,
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
