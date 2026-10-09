/**
 * Canonical microfinance rebate rate dataset (299 rates).
 *
 * Structure: Product -> Duration -> list of rates where index+1 = advance kisti.
 * This is the source of truth used for first-run seeding and for the
 * "Restore Defaults" action in the Rate Database manager.
 */

export const PRODUCTS = [
  "Jagoron",
  "Agrossor",
  "Buniyed",
  "Sufolon",
  "MFCE",
] as const;
export type Product = (typeof PRODUCTS)[number];

export const DURATIONS = ["Week", "1 Year", "1.5 Year", "2 Year"] as const;
export type Duration = (typeof DURATIONS)[number];

/** Which durations are applicable per product (seed defaults). */
export const PRODUCT_DURATIONS: Record<Product, Duration[]> = {
  Jagoron: ["Week", "1 Year", "1.5 Year"],
  Agrossor: ["Week", "1 Year", "1.5 Year", "2 Year"],
  Buniyed: ["Week"],
  Sufolon: ["Week"],
  MFCE: ["Week", "1 Year", "1.5 Year", "2 Year"],
};

// ---------------------------------------------------------------------------
// Raw rate tables (index 0 => kisti 1)
// ---------------------------------------------------------------------------

const JAGORON_WEEK = [
  0, 0, 0.26, 0.81, 1.5, 2.31, 3.26, 4.3, 5.52, 6.85, 8.3, 9.85, 11.55, 13.35,
  15.3, 17.35, 19.5, 21.8, 24.3, 26.85, 29.5, 32.3, 35.2, 38.2, 41.3, 44.61,
  47.9, 51.45, 55, 58.75, 62.5, 66.5, 70.5, 74.6, 78.9, 83.3, 87.8, 92.4, 97,
  101.9, 106.8, 111.8,
];

const JAGORON_MONTH = [
  1.25, 2.6, 4.7, 10.8, 19.1, 29.5, 42.0, 56.6, 73.2, 91.7, 112.2,
];

const JAGORON_HALF = [
  7, 11.4, 18.3, 31.1, 41.2, 57.4, 71.3, 82, 93.3, 103.4, 115.5, 126.3, 139,
  150.1, 160.2, 171.2, 182,
];

const AGROSSOR_2YEAR = [
  0.56, 1.6, 2.5, 3.4, 5.1, 9.5, 15.1, 21.8, 29.5, 37.3, 48.3, 59.3, 71.4, 81.4,
  98.5, 118, 129.8, 146.9, 165, 184.1, 204.2, 225.2, 247.1,
];

const BUNIYED_WEEK = [
  0, 0, 0.25, 0.72, 1.28, 1.87, 2.56, 3.46, 4.13, 5.38, 6.46, 7.68, 8.86, 9.96,
  11.67, 12.93, 14.96, 1.96, 18.28, 20.56, 22.36, 24.44, 26.76, 29.16, 31.18,
  33.76, 36.26, 38.97, 41.12, 4.82, 46.86, 49.96, 53.78, 56.75, 60.26, 63.16,
  67.12, 71.39, 74.55, 78.39, 82.35, 86.22,
];

const MFCE_WEEK = [
  0, 0, 0.22, 0.54, 1.1, 1.7, 2.4, 3.3, 4.1, 5, 6.1, 7.3, 8.6, 9.9, 11.4, 12.9,
  14.5, 16.3, 18.11, 20, 22, 24, 26.2, 28.2, 30.4, 33.2, 35.5, 38.3, 41, 43.7,
  46.6, 49.5, 52.5, 55.6, 58.5, 62, 65.4, 68.2, 72.2, 75.7, 79.5, 83.1,
];

const MFCE_MONTH = [0.9, 1.9, 3.5, 8, 14.1, 21.8, 31.1, 41.8, 54.1, 67.8, 82.95];

const MFCE_HALF = [
  3.7, 5.5, 8.9, 14.4, 24.5, 32.4, 45.2, 56.1, 64.6, 73.5, 81.4, 91, 99.5,
  109.5, 118.2, 126.2, 134.9, 0,
];

const MFCE_2YEAR = [
  0.4, 1.2, 1.8, 2.5, 3.7, 7, 11.1, 16.1, 21.8, 27.5, 35.7, 43.8, 52.7, 62.4,
  72.8, 87.2, 95.8, 108.5, 121.9, 136, 150.8, 166.3, 182.2,
];

interface RawCombo {
  product: Product;
  duration: Duration;
  rates: number[];
}

const RAW_TABLES: RawCombo[] = [
  { product: "Jagoron", duration: "Week", rates: JAGORON_WEEK },
  { product: "Jagoron", duration: "1 Year", rates: JAGORON_MONTH },
  { product: "Jagoron", duration: "1.5 Year", rates: JAGORON_HALF },
  { product: "Agrossor", duration: "Week", rates: JAGORON_WEEK },
  { product: "Agrossor", duration: "1 Year", rates: JAGORON_MONTH },
  { product: "Agrossor", duration: "1.5 Year", rates: JAGORON_HALF },
  { product: "Agrossor", duration: "2 Year", rates: AGROSSOR_2YEAR },
  { product: "Buniyed", duration: "Week", rates: BUNIYED_WEEK },
  { product: "MFCE", duration: "Week", rates: MFCE_WEEK },
  { product: "MFCE", duration: "1 Year", rates: MFCE_MONTH },
  { product: "MFCE", duration: "1.5 Year", rates: MFCE_HALF },
  { product: "MFCE", duration: "2 Year", rates: MFCE_2YEAR },
];

export interface DefaultRate {
  product: string;
  duration: string;
  kisti: number;
  rate: number;
}

/** Flattened canonical dataset: 299 rows. */
export const DEFAULT_RATES: DefaultRate[] = RAW_TABLES.flatMap(
  ({ product, duration, rates }) =>
    rates.map((rate, index) => ({
      product,
      duration,
      kisti: index + 1,
      rate,
    }))
);

export const DEFAULT_RATE_COUNT = DEFAULT_RATES.length;

/** Canonical display ordering for products (used by the DB manager). */
export const PRODUCT_ORDER: Record<string, number> = PRODUCTS.reduce(
  (acc, p, i) => ({ ...acc, [p]: i }),
  {} as Record<string, number>
);

export const DURATION_ORDER: Record<string, number> = DURATIONS.reduce(
  (acc, d, i) => ({ ...acc, [d]: i }),
  {} as Record<string, number>
);

/** Validate that a product is one of the known products. */
export function isValidProduct(product: string): boolean {
  return (PRODUCTS as readonly string[]).includes(product);
}

/** Known duration order for sorting (unknown durations sort after). */
export function sortDurations(a: string, b: string): number {
  const aIdx = DURATION_ORDER[a] ?? 99;
  const bIdx = DURATION_ORDER[b] ?? 99;
  if (aIdx !== bIdx) return aIdx - bIdx;
  return a.localeCompare(b);
}
