import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { afterEach, beforeEach, test } from "node:test";
import {
  COOKIE_NAME, getSessionCookie, isAdmin, isAuthConfigured, signToken, verifyToken,
} from "../src/lib/auth";
import { POST as login } from "../src/app/api/auth/login/route";
import { GET as session } from "../src/app/api/auth/session/route";
import { POST as logout } from "../src/app/api/auth/logout/route";
import { POST as createRate } from "../src/app/api/rates/route";
import { PATCH as updateRate, DELETE as deleteRate } from "../src/app/api/rates/[id]/route";
import { POST as restoreRates } from "../src/app/api/rates/restore/route";
import { PUT as updateContent } from "../src/app/api/content/route";
import { PATCH as renameDuration, DELETE as deleteDuration } from "../src/app/api/durations/route";
import { GET as health } from "../src/app/api/health/route";
import { getDb } from "../src/db";

const envKeys = ["ADMIN_PASSWORD", "AUTH_SECRET", "DATABASE_URL", "NODE_ENV", "VERCEL_GIT_COMMIT_SHA"] as const;
const originalEnv = new Map(envKeys.map((key) => [key, process.env[key]]));

beforeEach(() => {
  process.env.ADMIN_PASSWORD = "isolated-test-password";
  process.env.AUTH_SECRET = randomBytes(32).toString("hex");
  delete process.env.DATABASE_URL;
  delete process.env.VERCEL_GIT_COMMIT_SHA;
});
afterEach(() => {
  for (const [key, value] of originalEnv) {
    if (value === undefined) Reflect.deleteProperty(process.env, key);
    else Reflect.set(process.env, key, value);
  }
});

function loginRequest(body: unknown) {
  return new Request("http://test/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function cookieRequest(token: string) {
  return new Request("http://test/api/auth/session", {
    headers: { cookie: `other=value;${COOKIE_NAME}=${token}` },
  });
}
function rawSignedToken(payload: unknown) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", process.env.AUTH_SECRET!).update(body).digest("base64url");
  return `${body}.${sig}`;
}

test("configured admin can log in with a secure, HTTP-only cookie", async () => {
  Reflect.set(process.env, "NODE_ENV", "production");
  const response = await login(loginRequest({ password: process.env.ADMIN_PASSWORD }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, isAdmin: true });
  assert.equal(response.headers.get("cache-control"), "no-store");
  const cookie = response.headers.get("set-cookie")!;
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /SameSite=lax/i);
  assert.match(cookie, /Max-Age=604800/i);
  const token = cookie.split(";")[0].slice(COOKIE_NAME.length + 1);
  assert.equal(isAdmin(cookieRequest(token)), true);
  assert.equal(getSessionCookie(cookieRequest(token)), token);
});

test("wrong passwords do not create a session", async () => {
  const response = await login(loginRequest({ password: "wrong" }));
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("set-cookie"), null);
});

test("login rejects malformed JSON and invalid password shapes", async () => {
  for (const body of [null, [], {}, { password: 123 }, "password"]) {
    assert.equal((await login(loginRequest(body))).status, 400);
  }
  const request = new Request("http://test/api/auth/login", { method: "POST", body: "{" });
  assert.equal((await login(request)).status, 400);
});

test("missing password or secret disables login and existing admin cookies", async () => {
  for (const key of ["ADMIN_PASSWORD", "AUTH_SECRET"] as const) {
    const saved = process.env[key];
    const token = signToken({ role: "admin" });
    delete process.env[key];
    assert.equal(isAuthConfigured(), false);
    assert.equal(isAdmin(cookieRequest(token)), false);
    const response = await login(loginRequest({ password: "admin123" }));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("set-cookie"), null);
    process.env[key] = saved;
  }
});

test("signing requires a configured secret", () => {
  delete process.env.AUTH_SECRET;
  assert.throws(() => signToken({ role: "admin" }), /AUTH_SECRET/);
  assert.equal(verifyToken("anything"), null);
});

test("expired, tampered and malformed tokens are rejected", () => {
  const token = signToken({ role: "admin" });
  assert.equal(verifyToken(token)?.role, "admin");
  for (const invalid of ["", ".", "garbage", `${token}.extra`, `x${token}`, signToken({ role: "admin" }, -1)]) {
    assert.equal(verifyToken(invalid), null);
  }
  for (const payload of [null, [], { role: "admin" }, { exp: "9999999999999" }, { exp: null }]) {
    assert.equal(verifyToken(rawSignedToken(payload)), null);
  }
});

test("only signed admin-role cookies grant admin access", () => {
  assert.equal(isAdmin(cookieRequest(signToken({ role: "reader" }))), false);
  assert.equal(isAdmin(cookieRequest(signToken({ user: "someone" }))), false);
  assert.equal(isAdmin(new Request("http://test")), false);
  assert.equal(isAdmin(cookieRequest(signToken({ role: "admin" }))), true);
});

test("rotating the signing secret invalidates old sessions", () => {
  const token = signToken({ role: "admin" });
  process.env.AUTH_SECRET = randomBytes(32).toString("hex");
  assert.equal(verifyToken(token), null);
});

test("session and logout responses are not cacheable", async () => {
  const response = await session(cookieRequest(signToken({ role: "admin" })));
  assert.deepEqual(await response.json(), { isAdmin: true });
  assert.equal(response.headers.get("cache-control"), "no-store");
  const loggedOut = await logout();
  assert.match(loggedOut.headers.get("set-cookie")!, /Max-Age=0/i);
  assert.equal(loggedOut.headers.get("cache-control"), "no-store");
});

test("all mutation endpoints reject anonymous requests before touching the DB", async () => {
  const context = { params: Promise.resolve({ id: "1" }) };
  const request = () => new Request("http://test/api", { method: "POST", body: "{}" });
  const responses = await Promise.all([
    createRate(request()), updateRate(request(), context), deleteRate(request(), context),
    restoreRates(request()), updateContent(request()), renameDuration(request()), deleteDuration(request()),
  ]);
  for (const response of responses) assert.equal(response.status, 401);
});

test("DB imports are build-safe and missing runtime configuration is explicit", async () => {
  assert.throws(() => getDb(), /DATABASE_URL is required at runtime/);
  const response = await health();
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ok: false, error: "Database is not configured." });
});

test("health exposes only the public deployment SHA for revision verification", async () => {
  process.env.VERCEL_GIT_COMMIT_SHA = "a".repeat(40);
  const response = await health();
  assert.deepEqual(await response.json(), {
    ok: false, error: "Database is not configured.", commit: "a".repeat(40),
  });
});
