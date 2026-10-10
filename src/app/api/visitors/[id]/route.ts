import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { ensureVisitorsTable } from "@/db/bootstrap";
import { visitors } from "@/db/schema";
import { isAdmin, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** DELETE — remove a visitor record by id (admin only). */
export async function DELETE(request: Request, context: RouteContext) {
  if (!isAdmin(request)) return unauthorized();

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Invalid visitor id." }, { status: 400 });
  }

  try {
    const db = getDb();
    await ensureVisitorsTable(db);
    const deleted = await db
      .delete(visitors)
      .where(eq(visitors.id, id))
      .returning({ id: visitors.id });

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Visitor not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("DELETE /api/visitors/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to delete visitor." },
      { status: 503 }
    );
  }
}
