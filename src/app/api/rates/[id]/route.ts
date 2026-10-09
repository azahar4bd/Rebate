import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { rebateRates } from "@/db/schema";
import { isValidProduct } from "@/data/rebateData";
import { serializeRate } from "@/lib/rate";
import { isAdmin, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** PATCH — update an existing rate. Any subset of fields may be provided. */
export async function PATCH(request: Request, context: RouteContext) {
  if (!isAdmin(request)) return unauthorized();

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Invalid rate id." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const [current] = await getDb()
      .select()
      .from(rebateRates)
      .where(eq(rebateRates.id, id))
      .limit(1);

    if (!current) {
      return NextResponse.json({ error: "Rate not found." }, { status: 404 });
    }

    const product =
      body.product !== undefined ? String(body.product).trim() : current.product;
    const duration =
      body.duration !== undefined ? String(body.duration).trim() : current.duration;
    const kisti =
      body.kisti !== undefined ? Number(body.kisti) : current.kisti;
    const rate = body.rate !== undefined ? Number(body.rate) : Number(current.rate);

    if (!isValidProduct(product)) {
      return NextResponse.json(
        { error: `Invalid product: ${product}` },
        { status: 400 }
      );
    }
    if (!Number.isInteger(kisti) || kisti < 1) {
      return NextResponse.json(
        { error: "Kisti must be a positive whole number." },
        { status: 400 }
      );
    }
    if (!Number.isFinite(rate) || rate < 0) {
      return NextResponse.json(
        { error: "Rate must be a non-negative number." },
        { status: 400 }
      );
    }

    // Ensure the (product, duration, kisti) combination is unique.
    const [duplicate] = await getDb()
      .select({ id: rebateRates.id })
      .from(rebateRates)
      .where(
        and(
          eq(rebateRates.product, product),
          eq(rebateRates.duration, duration),
          eq(rebateRates.kisti, kisti)
        )
      )
      .limit(1);

    if (duplicate && duplicate.id !== id) {
      return NextResponse.json(
        { error: `Another rate already uses ${product} / ${duration} / kisti ${kisti}.` },
        { status: 409 }
      );
    }

    const [row] = await getDb()
      .update(rebateRates)
      .set({ product, duration, kisti, rate: rate.toFixed(2), updatedAt: new Date() })
      .where(eq(rebateRates.id, id))
      .returning();

    return NextResponse.json({ rate: serializeRate(row) });
  } catch (error) {
    console.error("PATCH /api/rates/[id] failed:", error);
    return NextResponse.json({ error: "Failed to update rate." }, { status: 500 });
  }
}

/** DELETE — remove a rate by id. */
export async function DELETE(request: Request, context: RouteContext) {
  if (!isAdmin(request)) return unauthorized();

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Invalid rate id." }, { status: 400 });
  }

  try {
    const deleted = await getDb()
      .delete(rebateRates)
      .where(eq(rebateRates.id, id))
      .returning({ id: rebateRates.id });

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Rate not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("DELETE /api/rates/[id] failed:", error);
    return NextResponse.json({ error: "Failed to delete rate." }, { status: 500 });
  }
}
