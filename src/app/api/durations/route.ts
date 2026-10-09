import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { rebateRates } from "@/db/schema";
import { isAdmin, unauthorized } from "@/lib/auth";
import { sortDurations } from "@/data/rebateData";

export const dynamic = "force-dynamic";

interface DurationInfo {
  product: string;
  duration: string;
  kistiCount: number;
}

/** GET — list all unique (product, duration) pairs with kisti counts. */
export async function GET() {
  try {
    const rows = await getDb()
      .select({
        product: rebateRates.product,
        duration: rebateRates.duration,
        kistiCount: sql<number>`count(*)::int`,
      })
      .from(rebateRates)
      .groupBy(rebateRates.product, rebateRates.duration);

    const durations: DurationInfo[] = rows
      .map((r) => ({
        product: r.product,
        duration: r.duration,
        kistiCount: Number(r.kistiCount),
      }))
      .sort(
        (a, b) =>
          a.product.localeCompare(b.product) ||
          sortDurations(a.duration, b.duration)
      );

    return NextResponse.json({ durations });
  } catch (error) {
    console.error("GET /api/durations failed:", error);
    return NextResponse.json(
      { error: "Failed to load durations." },
      { status: 500 }
    );
  }
}

/**
 * PATCH — rename a duration.
 * Body: { product, oldDuration, newDuration }
 * Updates ALL rate rows matching (product, oldDuration) to newDuration.
 */
export async function PATCH(request: Request) {
  if (!isAdmin(request)) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const product = String(body.product ?? "").trim();
  const oldDuration = String(body.oldDuration ?? "").trim();
  const newDuration = String(body.newDuration ?? "").trim();

  if (!product || !oldDuration || !newDuration) {
    return NextResponse.json(
      { error: "product, oldDuration and newDuration are required." },
      { status: 400 }
    );
  }

  if (oldDuration === newDuration) {
    return NextResponse.json(
      { error: "New duration name is the same as the old one." },
      { status: 400 }
    );
  }

  try {
    // Check if target name already exists for this product
    const existing = await getDb()
      .select({ id: rebateRates.id })
      .from(rebateRates)
      .where(
        sql`${rebateRates.product} = ${product} AND ${rebateRates.duration} = ${newDuration}`
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: `Duration "${newDuration}" already exists for ${product}.`,
        },
        { status: 409 }
      );
    }

    const result = await getDb()
      .update(rebateRates)
      .set({ duration: newDuration, updatedAt: new Date() })
      .where(
        sql`${rebateRates.product} = ${product} AND ${rebateRates.duration} = ${oldDuration}`
      )
      .returning({ id: rebateRates.id });

    if (result.length === 0) {
      return NextResponse.json(
        { error: `No rates found for ${product} / ${oldDuration}.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      renamed: result.length,
      product,
      oldDuration,
      newDuration,
    });
  } catch (error) {
    console.error("PATCH /api/durations failed:", error);
    return NextResponse.json(
      { error: "Failed to rename duration." },
      { status: 500 }
    );
  }
}

/**
 * DELETE — delete a duration and ALL its rates.
 * Body: { product, duration }
 */
export async function DELETE(request: Request) {
  if (!isAdmin(request)) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const product = String(body.product ?? "").trim();
  const duration = String(body.duration ?? "").trim();

  if (!product || !duration) {
    return NextResponse.json(
      { error: "product and duration are required." },
      { status: 400 }
    );
  }

  try {
    const result = await getDb()
      .delete(rebateRates)
      .where(
        sql`${rebateRates.product} = ${product} AND ${rebateRates.duration} = ${duration}`
      )
      .returning({ id: rebateRates.id });

    if (result.length === 0) {
      return NextResponse.json(
        { error: `No rates found for ${product} / ${duration}.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      deleted: result.length,
      product,
      duration,
    });
  } catch (error) {
    console.error("DELETE /api/durations failed:", error);
    return NextResponse.json(
      { error: "Failed to delete duration." },
      { status: 500 }
    );
  }
}
