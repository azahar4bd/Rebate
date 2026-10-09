import assert from "node:assert/strict";
import { test } from "node:test";
import { calcRebate, fmtInt, fmtRate, serializeRate } from "../src/lib/rate";
import { DEFAULT_RATES, PRODUCTS, isValidProduct, sortDurations } from "../src/data/rebateData";

test("rebate formula rounds to whole taka", () => {
  assert.equal(calcRebate(10_000, 12.34), 123);
  assert.equal(calcRebate(1_000, 12.5), 13);
  assert.equal(calcRebate(0, 20), 0);
  assert.equal(calcRebate(50_000, 0), 0);
});

test("database numeric strings are serialized as numbers", () => {
  assert.deepEqual(serializeRate({ id: 1, product: "Jagoron", duration: "Week", kisti: 2, rate: "12.50" }),
    { id: 1, product: "Jagoron", duration: "Week", kisti: 2, rate: 12.5 });
  assert.equal(fmtInt(12_345), "12,345");
  assert.equal(fmtRate(12.5), "12.5");
  assert.equal(fmtRate(12), "12");
});

test("canonical default dataset has 299 unique valid combinations", () => {
  assert.equal(DEFAULT_RATES.length, 299);
  const keys = new Set<string>();
  for (const row of DEFAULT_RATES) {
    assert.equal(isValidProduct(row.product), true);
    assert.ok(row.duration.trim().length > 0);
    assert.ok(Number.isInteger(row.kisti) && row.kisti > 0);
    assert.ok(Number.isFinite(row.rate) && row.rate >= 0);
    keys.add(`${row.product}/${row.duration}/${row.kisti}`);
  }
  assert.equal(keys.size, 299);
  assert.equal(PRODUCTS.length, 5);
  assert.equal(isValidProduct("not-a-product"), false);
});

test("default duration order is stable with custom durations after defaults", () => {
  assert.deepEqual(["Custom", "2 Year", "Week", "1.5 Year", "1 Year"].sort(sortDurations),
    ["Week", "1 Year", "1.5 Year", "2 Year", "Custom"]);
});
