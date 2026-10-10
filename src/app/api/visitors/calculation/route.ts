import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { ensureVisitorsTable } from "@/db/bootstrap";
import { visitors } from "@/db/schema";
import { isValidProduct } from "@/data/rebateData";
import { normalizeVisitorName } from "@/lib/visitor";

export const dynamic = "force-dynamic";

/**
 * POST — public calculation event from the calculator.
 * Body: { name, product?, duration?, kisti? } → upserts the visitor,
 * increments the calculation count and stores the last-used combination.
 * Disbursed amounts are deliberately not stored.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = normalizeVisitorName(body.name);
  if (!name) {
    return NextResponse.json(
      { error: "Provide a visitor name (1-100 characters)." },
      { status: 400 }
    );
  }

  let product: string | undefined;
  if (typeof body.product === "string" && isValidProduct(body.product.trim())) {
    product = body.product.trim();
  }

  let duration: string | undefined;
  if (typeof body.duration === "string") {
    const trimmed = body.duration.trim();
    if (trimmed.length > 0 && trimmed.length <= 50) duration = trimmed;
  }

  let kisti: number | undefined;
  if (
    typeof body.kisti === "number" &&
    Number.isInteger(body.kisti) &&
    body.kisti > 0
  ) {
    kisti = body.kisti;
  }

  try {
    const db = getDb();
    await ensureVisitorsTable(db);
    await db
      .insert(visitors)
      .values({ name })
      .onConflictDoUpdate({
        target: visitors.name,
        set: {
          lastSeenAt: new Date(),
          calcCount: sql`${visitors.calcCount} + 1`,
          ...(product ? { lastProduct: product } : {}),
          ...(duration ? { lastDuration: duration } : {}),
          ...(kisti !== undefined ? { lastKisti: kisti } : {}),
        },
      });
    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("POST /api/visitors/calculation failed:", error);
    return NextResponse.json(
      { error: "Visitor tracking is unavailable right now." },
      { status: 503 }
    );
  }
}
