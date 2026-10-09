import { getDb } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  // Public Git SHA helps verify which revision Vercel is actually serving.
  const commit = process.env.VERCEL_GIT_COMMIT_SHA;
  const deployment = commit ? { commit } : {};
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "Database is not configured.", ...deployment },
      { status: 503 }
    );
  }
  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ ok: true, ...deployment });
  } catch (error) {
    console.error("Database health check failed:", error);
    return Response.json(
      { ok: false, error: "Database is unavailable.", ...deployment },
      { status: 503 }
    );
  }
}
