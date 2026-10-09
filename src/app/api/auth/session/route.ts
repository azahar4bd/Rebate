import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = isAdmin(request);
  return NextResponse.json({ isAdmin: admin }, { headers: { "Cache-Control": "no-store" } });
}
