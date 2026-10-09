import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { siteContent } from "@/db/schema";
import { defaultContentMap, type ContentMap } from "@/data/defaultContent";
import { isAdmin, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** GET — all site content as a key→value map (public). */
export async function GET() {
  try {
    const rows = await getDb().select().from(siteContent);
    const content: ContentMap = defaultContentMap();
    for (const row of rows) {
      content[row.key] = row.value;
    }
    return NextResponse.json({ content });
  } catch (error) {
    console.error("GET /api/content failed:", error);
    // Fall back to defaults if the table doesn't exist yet
    return NextResponse.json({ content: defaultContentMap() });
  }
}

/** PUT — update site content (admin only). Body: { key, value } or { items: [{key, value}] } */
export async function PUT(request: Request) {
  if (!isAdmin(request)) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Support both single {key, value} and batch {items: [...]}
  const items: { key: string; value: string }[] = [];
  if (Array.isArray(body.items)) {
    for (const item of body.items) {
      if (
        item &&
        typeof item.key === "string" &&
        typeof item.value === "string"
      ) {
        items.push({ key: item.key, value: item.value });
      }
    }
  } else if (
    typeof body.key === "string" &&
    typeof body.value === "string"
  ) {
    items.push({ key: body.key, value: body.value });
  }

  if (items.length === 0) {
    return NextResponse.json(
      { error: "Provide { key, value } or { items: [{key, value}] }." },
      { status: 400 }
    );
  }

  try {
    for (const { key, value } of items) {
      await getDb()
        .insert(siteContent)
        .values({ key, value })
        .onConflictDoUpdate({
          target: siteContent.key,
          set: { value, updatedAt: new Date() },
        });
    }

    const rows = await getDb().select().from(siteContent);
    const content: ContentMap = defaultContentMap();
    for (const row of rows) {
      content[row.key] = row.value;
    }
    return NextResponse.json({ content });
  } catch (error) {
    console.error("PUT /api/content failed:", error);
    return NextResponse.json(
      { error: "Failed to update content." },
      { status: 500 }
    );
  }
}
