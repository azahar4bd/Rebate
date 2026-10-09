import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { rebateRates } from "@/db/schema";
import { DEFAULT_RATES } from "@/data/rebateData";
import { serializeRate } from "@/lib/rate";
import { isAdmin, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** POST — wipe all rates and restore the canonical 299-rate dataset. */
export async function POST(request: Request) {
  if (!isAdmin(request)) return unauthorized();

  try {
    await getDb().delete(rebateRates);
    const rows = await getDb()
      .insert(rebateRates)
      .values(
        DEFAULT_RATES.map((r) => ({
          product: r.product,
          duration: r.duration,
          kisti: r.kisti,
          rate: r.rate.toFixed(2),
        }))
      )
      .returning();

    return NextResponse.json({
      rates: rows.map(serializeRate),
      count: rows.length,
    });
  } catch (error) {
    console.error("POST /api/rates/restore failed:", error);
    return NextResponse.json(
      { error: "Failed to restore default rates." },
      { status: 500 }
    );
  }
}
