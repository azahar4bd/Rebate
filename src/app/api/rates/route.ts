import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { rebateRates } from "@/db/schema";
import { isValidProduct } from "@/data/rebateData";
import { serializeRate } from "@/lib/rate";
import { isAdmin, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** GET all rebate rates. */
export async function GET() {
  try {
    const rows = await getDb()
      .select()
      .from(rebateRates)
      .orderBy(asc(rebateRates.id));
    return NextResponse.json({
      rates: rows.map(serializeRate),
      count: rows.length,
    });
  } catch (error) {
    console.error("GET /api/rates failed:", error);
    return NextResponse.json(
      { error: "Failed to load rates. Is the database ready?" },
      { status: 500 }
    );
  }
}

/** POST — create a new rate. Body: { product, duration, kisti, rate } */
export async function POST(request: Request) {
  if (!isAdmin(request)) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const product = String(body.product ?? "").trim();
  const duration = String(body.duration ?? "").trim();
  const kisti = Number(body.kisti);
  const rate = Number(body.rate);

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

  try {
    const [existing] = await getDb()
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

    if (existing) {
      return NextResponse.json(
        { error: `A rate already exists for ${product} / ${duration} / kisti ${kisti}.` },
        { status: 409 }
      );
    }

    const [row] = await getDb()
      .insert(rebateRates)
      .values({
        product,
        duration,
        kisti,
        rate: rate.toFixed(2),
      })
      .returning();

    return NextResponse.json({ rate: serializeRate(row) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/rates failed:", error);
    return NextResponse.json({ error: "Failed to create rate." }, { status: 500 });
  }
}
