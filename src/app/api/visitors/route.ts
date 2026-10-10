import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { visitors } from "@/db/schema";
import { isAdmin, unauthorized } from "@/lib/auth";
import { serializeVisitor } from "@/lib/visitor";

export const dynamic = "force-dynamic";

/**
 * GET — admin visitor report.
 * Returns every visitor (most recently seen first) plus totals.
 */
export async function GET(request: Request) {
  if (!isAdmin(request)) return unauthorized();

  try {
    const rows = await getDb()
      .select()
      .from(visitors)
      .orderBy(desc(visitors.lastSeenAt), desc(visitors.id));

    const list = rows.map(serializeVisitor);
    return NextResponse.json(
      {
        visitors: list,
        totals: {
          visitors: list.length,
          visits: list.reduce((sum, row) => sum + row.visitCount, 0),
          calculations: list.reduce((sum, row) => sum + row.calcCount, 0),
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/visitors failed:", error);
    return NextResponse.json(
      { error: "Failed to load visitors." },
      { status: 503 }
    );
  }
}
