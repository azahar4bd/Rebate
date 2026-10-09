import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

test("all manifest PNG icons exist at their declared dimensions", () => {
  const manifest = JSON.parse(readFileSync("public/manifest.json", "utf8"));
  for (const icon of manifest.icons) {
    const png = readFileSync(`public${icon.src}`);
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
  }
});

function serviceWorker(fetchImpl: typeof fetch, cachedResponse?: Response) {
  const handlers = new Map<string, (event: { request: Request; respondWith: (response: Promise<Response>) => void }) => void>();
  const writes: string[] = [];
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    URL, Response, fetch: fetchImpl,
    self: {
      location: { origin: "https://test.example" },
      addEventListener: (name: string, handler: typeof handlers extends Map<string, infer V> ? V : never) => handlers.set(name, handler),
    },
    caches: {
      open: async () => ({ put: async (request: Request) => { writes.push(request.url); } }),
      match: async () => cachedResponse,
    },
  });
  return {
    writes,
    request: (path: string, method = "GET") => {
      let response: Promise<Response> | undefined;
      handlers.get("fetch")!({
        request: new Request(`https://test.example${path}`, { method }),
        respondWith: (value) => { response = value; },
      });
      return response;
    },
  };
}

test("service worker never intercepts or caches auth, health or writes", () => {
  const worker = serviceWorker(async () => { throw new Error("must not fetch"); });
  for (const path of ["/api/auth/session", "/api/auth/login", "/api/auth/logout", "/api/health", "/api/durations"]) {
    assert.equal(worker.request(path), undefined);
  }
  assert.equal(worker.request("/api/rates", "POST"), undefined);
  assert.deepEqual(worker.writes, []);
});

test("public rates fall back to cache only when offline", async () => {
  const cached = Response.json({ rates: [{ id: 1 }] });
  const worker = serviceWorker(async () => { throw new Error("offline"); }, cached);
  assert.equal(await worker.request("/api/rates"), cached);
  assert.deepEqual(worker.writes, []);
});

test("successful public responses are cached, errors and no-store are not", async () => {
  const fresh = serviceWorker(async () => Response.json({ content: {} }));
  assert.equal((await fresh.request("/api/content"))?.status, 200);
  assert.equal(fresh.writes.length, 1);

  const failed = serviceWorker(async () => new Response("Unavailable", { status: 503 }));
  assert.equal((await failed.request("/api/rates"))?.status, 503);
  assert.deepEqual(failed.writes, []);

  const privateResponse = serviceWorker(async () => new Response("private", { headers: { "Cache-Control": "no-store" } }));
  await privateResponse.request("/api/content");
  assert.deepEqual(privateResponse.writes, []);
});
