import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const maxDuration = 30;

const DATA_DIR = path.join(process.cwd(), "data");
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

const FIELD_TO_FILE: Record<string, string> = {
  orders: "orders.csv",
  customers: "customers.csv",
  inventory: "inventory.csv",
  support_tickets: "support_tickets.csv",
  campaigns: "campaigns.csv",
  order_items: "order_items.csv",
  products: "products.csv",
};

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return NextResponse.json(
      {
        error: "Content-Type must be multipart/form-data",
        hint: "Usa curl -F 'orders=@data/orders.csv' o un FormData en el cliente.",
      },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to parse multipart body",
        detail: err instanceof Error ? err.message : "unknown",
      },
      { status: 400 },
    );
  }

  // Collect files first to validate sizes before any disk write
  const collected: Array<{ filename: string; bytes: Uint8Array }> = [];
  for (const [field, file] of Object.entries(FIELD_TO_FILE)) {
    const value = form.get(field);
    if (!value) continue;
    if (typeof value === "string") {
      // Allow string-as-CSV too (treat as raw content)
      const buf = new TextEncoder().encode(value);
      if (buf.byteLength > MAX_BYTES) {
        return NextResponse.json(
          {
            error: `Field ${field} exceeds 5MB limit`,
            size_bytes: buf.byteLength,
          },
          { status: 413 },
        );
      }
      collected.push({ filename: file, bytes: buf });
      continue;
    }
    // File object
    if (value.size > MAX_BYTES) {
      return NextResponse.json(
        {
          error: `File ${field} (${value.name ?? file}) exceeds 5MB limit`,
          size_bytes: value.size,
        },
        { status: 413 },
      );
    }
    const ab = await value.arrayBuffer();
    collected.push({ filename: file, bytes: new Uint8Array(ab) });
  }

  if (collected.length === 0) {
    return NextResponse.json(
      {
        error: "No recognized fields in form-data",
        accepted_fields: Object.keys(FIELD_TO_FILE),
      },
      { status: 400 },
    );
  }

  // Ensure data dir exists
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to ensure data directory",
        detail: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 },
    );
  }

  let totalBytes = 0;
  const uploaded: string[] = [];
  for (const { filename, bytes } of collected) {
    const target = path.join(DATA_DIR, filename);
    try {
      await writeFile(target, bytes);
      uploaded.push(filename);
      totalBytes += bytes.byteLength;
    } catch (err) {
      return NextResponse.json(
        {
          error: `Failed to write ${filename}`,
          detail: err instanceof Error ? err.message : "unknown",
          uploaded_before_failure: uploaded,
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    uploaded,
    total_bytes: totalBytes,
  });
}
