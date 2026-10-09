import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { isAuthConfigured, setSessionCookie, signToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("password" in body) ||
    typeof body.password !== "string"
  ) {
    return NextResponse.json({ error: "A password is required." }, { status: 400 });
  }

  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: "Admin login is not configured. Set ADMIN_PASSWORD and AUTH_SECRET." },
      { status: 503 }
    );
  }

  const hash = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(hash(body.password), hash(process.env.ADMIN_PASSWORD!))) {
    return NextResponse.json({ error: "Incorrect admin password." }, { status: 401 });
  }

  const token = signToken({ role: "admin", iat: Date.now() });
  const response = NextResponse.json({ ok: true, isAdmin: true });
  response.headers.set("Cache-Control", "no-store");
  setSessionCookie(response, token);
  return response;
}
