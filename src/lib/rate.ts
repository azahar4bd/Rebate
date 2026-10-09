/** Shared types + helpers for the Rebate Calculator. */

/** A rate row as seen by the client (numeric parsed to a JS number). */
export interface RateRow {
  id: number;
  product: string;
  duration: string;
  kisti: number;
  rate: number;
}

/** Serialize a Drizzle row (numeric column comes back as a string). */
export function serializeRate(row: {
  id: number;
  product: string;
  duration: string;
  kisti: number;
  rate: string | number;
}): RateRow {
  return {
    id: row.id,
    product: row.product,
    duration: row.duration,
    kisti: row.kisti,
    rate: Number(row.rate),
  };
}

const intFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const rateFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Format an integer money amount with thousands separators. */
export function fmtInt(n: number): string {
  return intFormatter.format(n);
}

/** Format a rate (up to 2 decimals, trailing zeros trimmed). */
export function fmtRate(n: number): string {
  return rateFormatter.format(n);
}

/**
 * Core rebate formula:
 *   Rebate = (Disburse / 1000) * Rate   (rounded to a whole number)
 */
export function calcRebate(disburse: number, rate: number): number {
  return Math.round((disburse / 1000) * rate);
}
