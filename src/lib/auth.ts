import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

export const COOKIE_NAME = "rebate_admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/** Missing environment variables disable admin access; never use public defaults. */
export function isAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.AUTH_SECRET);
}

export function signToken(payload: object, expiresInDays = 7): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required for admin sessions");

  const exp = Date.now() + expiresInDays * 24 * 60 * 60 * 1000;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken(token: string): Record<string, unknown> | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");

  try {
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload: unknown = JSON.parse(Buffer.from(body, "base64url").toString());
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
    const session = payload as Record<string, unknown>;
    if (
      typeof session.exp !== "number" ||
      !Number.isFinite(session.exp) ||
      session.exp <= Date.now()
    ) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function getSessionCookie(request: Request): string | null {
  if (!isAuthConfigured()) return null;
  const cookie = request.headers.get("cookie") || "";
  const prefix = COOKIE_NAME + "=";
  const match = cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith(prefix));
  if (!match) return null;
  const token = match.slice(prefix.length);
  const payload = verifyToken(token);
  return payload?.role === "admin" ? token : null;
}

export function isAdmin(request: Request): boolean {
  return getSessionCookie(request) !== null;
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export function unauthorized() {
  return NextResponse.json(
    { error: "Unauthorized. Admin access required." },
    { status: 401 }
  );
}
