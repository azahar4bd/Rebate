import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, test } from "node:test";
import { getTableColumns } from "drizzle-orm";
import { visitors } from "../src/db/schema";
import {
  ensureVisitorsTable,
  VISITORS_BOOTSTRAP_SQL,
} from "../src/db/bootstrap";
import {
  normalizeVisitorName,
  serializeVisitor,
  VISITOR_NAME_MAX_LENGTH,
} from "../src/lib/visitor";
import { COOKIE_NAME, signToken } from "../src/lib/auth";
import { POST as checkin } from "../src/app/api/visitors/checkin/route";
import { POST as calculation } from "../src/app/api/visitors/calculation/route";
import { GET as listVisitors } from "../src/app/api/visitors/route";
import { DELETE as deleteVisitor } from "../src/app/api/visitors/[id]/route";

const envKeys = [
  "ADMIN_PASSWORD",
  "AUTH_SECRET",
  "DATABASE_URL",
  "NODE_ENV",
] as const;
const originalEnv = new Map(envKeys.map((key) => [key, process.env[key]]));

beforeEach(() => {
  process.env.ADMIN_PASSWORD = "isolated-test-password";
  process.env.AUTH_SECRET = randomBytes(32).toString("hex");
  delete process.env.DATABASE_URL;
});

afterEach(() => {
  for (const [key, value] of originalEnv) {
    if (value === undefined) Reflect.deleteProperty(process.env, key);
    else Reflect.set(process.env, key, value);
  }
});

function jsonRequest(body: unknown, url = "http://test/api/visitors/checkin") {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function adminRequest(url: string, method = "GET") {
  return new Request(url, {
    method,
    headers: { cookie: `${COOKIE_NAME}=${signToken({ role: "admin" })}` },
  });
}

const deleteContext = { params: Promise.resolve({ id: "1" }) };

/* -------------------------------- Bootstrap -------------------------------- */

test("ensureVisitorsTable executes the bootstrap DDL exactly once per process", async () => {
  let calls = 0;
  const lastSql: unknown[] = [];
  const fakeDb = {
    execute: async (sql: unknown) => {
      calls += 1;
      lastSql.push(sql);
    },
  };
  await ensureVisitorsTable(fakeDb as never);
  await ensureVisitorsTable(fakeDb as never);
  assert.equal(calls, 1);
  assert.equal(lastSql[0], VISITORS_BOOTSTRAP_SQL);
});

test("bootstrap DDL stays in sync with the Drizzle visitors schema", () => {
  assert.match(VISITORS_BOOTSTRAP_SQL, /CREATE TABLE IF NOT EXISTS visitors \(/);
  assert.match(VISITORS_BOOTSTRAP_SQL, /CREATE UNIQUE INDEX IF NOT EXISTS visitors_name_idx ON visitors \(name\)/);
  for (const column of Object.values(getTableColumns(visitors))) {
    assert.ok(
      VISITORS_BOOTSTRAP_SQL.includes(`${column.name} `),
      `bootstrap DDL is missing column: ${column.name}`
    );
  }
});

/* ------------------------------ Name helpers ------------------------------- */

test("normalizeVisitorName trims and collapses whitespace, keeps case", () => {
  assert.equal(normalizeVisitorName("  Rahim   Uddin "), "Rahim Uddin");
  assert.equal(normalizeVisitorName("Rahim"), "Rahim");
  assert.notEqual(normalizeVisitorName("Rahim"), "rahim");
  assert.equal(
    normalizeVisitorName("x".repeat(VISITOR_NAME_MAX_LENGTH)),
    "x".repeat(VISITOR_NAME_MAX_LENGTH)
  );
});

test("normalizeVisitorName rejects blank, non-string and over-long names", () => {
  for (const invalid of [
    undefined,
    null,
    42,
    [],
    {},
    "",
    "   ",
    "\t\n ",
    "x".repeat(VISITOR_NAME_MAX_LENGTH + 1),
  ]) {
    assert.equal(normalizeVisitorName(invalid), null);
  }
});

test("serializeVisitor converts timestamp columns to ISO strings", () => {
  const row = {
    id: 7,
    name: "Karim",
    createdAt: new Date("2026-01-01T10:00:00.000Z"),
    lastSeenAt: new Date("2026-01-02T11:30:00.000Z"),
    visitCount: 3,
    calcCount: 5,
    lastProduct: "Jagoron",
    lastDuration: "Week",
    lastKisti: 2,
  };
  assert.deepEqual(serializeVisitor(row), {
    id: 7,
    name: "Karim",
    createdAt: "2026-01-01T10:00:00.000Z",
    lastSeenAt: "2026-01-02T11:30:00.000Z",
    visitCount: 3,
    calcCount: 5,
    lastProduct: "Jagoron",
    lastDuration: "Week",
    lastKisti: 2,
  });
});

/* ------------------------------ Public check-in ---------------------------- */

test("checkin rejects malformed bodies before touching the DB", async () => {
  for (const body of [
    null,
    [],
    42,
    {},
    { name: "" },
    { name: "   " },
    { name: 42 },
    { name: "x".repeat(VISITOR_NAME_MAX_LENGTH + 1) },
  ]) {
    assert.equal((await checkin(jsonRequest(body))).status, 400);
  }
  const malformed = new Request("http://test/api/visitors/checkin", {
    method: "POST",
    body: "{not json",
  });
  assert.equal((await checkin(malformed)).status, 400);
});

test("checkin with a valid name degrades to a generic 503 without a database", async () => {
  const response = await checkin(jsonRequest({ name: "  Rahim  Uddin " }));
  assert.equal(response.status, 503);
  const data = await response.json();
  assert.equal(data.error, "Visitor check-in is unavailable right now.");
});

/* ----------------------------- Calculation event --------------------------- */

test("calculation rejects malformed names before touching the DB", async () => {
  for (const body of [
    null,
    [],
    {},
    { name: "" },
    { name: "   " },
    { name: 42 },
    { name: "x".repeat(VISITOR_NAME_MAX_LENGTH + 1) },
  ]) {
    assert.equal(
      (await calculation(jsonRequest(body, "http://test/api/visitors/calculation"))).status,
      400
    );
  }
  const malformed = new Request("http://test/api/visitors/calculation", {
    method: "POST",
    body: "{not json",
  });
  assert.equal((await calculation(malformed)).status, 400);
});

test("calculation with a valid name degrades to a generic 503 without a database", async () => {
  const response = await calculation(
    jsonRequest(
      { name: "Rahim", product: "Jagoron", duration: "Week", kisti: 2 },
      "http://test/api/visitors/calculation"
    )
  );
  assert.equal(response.status, 503);
  const data = await response.json();
  assert.equal(data.error, "Visitor tracking is unavailable right now.");
});

/* ------------------------------ Admin endpoints ---------------------------- */

test("admin-only visitor endpoints reject anonymous requests before touching the DB", async () => {
  const responses = await Promise.all([
    listVisitors(new Request("http://test/api/visitors")),
    deleteVisitor(
      new Request("http://test/api/visitors/1", { method: "DELETE" }),
      deleteContext
    ),
  ]);
  for (const response of responses) assert.equal(response.status, 401);
});

test("admin listing and deletion validate input, then fail closed without a database", async () => {
  // Anonymous session check still reports correctly.
  assert.equal((await listVisitors(adminRequest("http://test/api/visitors"))).status, 503);

  const badId = adminRequest("http://test/api/visitors/abc", "DELETE");
  assert.equal((await deleteVisitor(badId, { params: Promise.resolve({ id: "abc" }) })).status, 400);

  const notPositive = adminRequest("http://test/api/visitors/0", "DELETE");
  assert.equal((await deleteVisitor(notPositive, { params: Promise.resolve({ id: "0" }) })).status, 400);

  const validId = adminRequest("http://test/api/visitors/1", "DELETE");
  assert.equal((await deleteVisitor(validId, deleteContext)).status, 503);
});
