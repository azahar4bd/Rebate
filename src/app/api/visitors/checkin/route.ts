import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { visitors } from "@/db/schema";
import { normalizeVisitorName } from "@/lib/visitor";

export const dynamic = "force-dynamic";

/**
 * POST — public visitor check-in from the name gate.
 * Body: { name } → upserts the visitor and increments the visit count.
 * Never blocks the calculator: the client treats failures as best-effort.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = normalizeVisitorName(
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).name
      : undefined
  );
  if (!name) {
    return NextResponse.json(
      { error: "Provide a visitor name (1-100 characters)." },
      { status: 400 }
    );
  }

  try {
    await getDb()
      .insert(visitors)
      .values({ name })
      .onConflictDoUpdate({
        target: visitors.name,
        set: {
          lastSeenAt: new Date(),
          visitCount: sql`${visitors.visitCount} + 1`,
        },
      });
    return NextResponse.json(
      { ok: true, name },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("POST /api/visitors/checkin failed:", error);
    return NextResponse.json(
      { error: "Visitor check-in is unavailable right now." },
      { status: 503 }
    );
  }
}
