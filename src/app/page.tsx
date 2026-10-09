import { asc } from "drizzle-orm";
import Calculator from "@/components/Calculator";
import { getDb } from "@/db";
import { rebateRates, siteContent } from "@/db/schema";
import { DEFAULT_RATES } from "@/data/rebateData";
import { defaultContentMap, type ContentMap } from "@/data/defaultContent";
import { serializeRate, type RateRow } from "@/lib/rate";

export const dynamic = "force-dynamic";

/**
 * Load all rates from the database.
 * On first run (empty table) the canonical 299-rate dataset is seeded
 * automatically so the calculator is fully functional out of the box.
 */
async function loadRates(): Promise<RateRow[]> {
  const rows = await getDb()
    .select()
    .from(rebateRates)
    .orderBy(asc(rebateRates.id));

  if (rows.length === 0) {
    await getDb()
      .insert(rebateRates)
      .values(
        DEFAULT_RATES.map((r) => ({
          product: r.product,
          duration: r.duration,
          kisti: r.kisti,
          rate: r.rate.toFixed(2),
        }))
      )
      .onConflictDoNothing();

    const seeded = await getDb()
      .select()
      .from(rebateRates)
      .orderBy(asc(rebateRates.id));
    return seeded.map(serializeRate);
  }

  return rows.map(serializeRate);
}

/** Load editable site content (falls back to defaults). */
async function loadContent(): Promise<ContentMap> {
  const fallback = defaultContentMap();
  try {
    const rows = await getDb().select().from(siteContent);
    const content: ContentMap = { ...fallback };
    for (const row of rows) {
      content[row.key] = row.value;
    }
    return content;
  } catch {
    return fallback;
  }
}

export default async function Home() {
  const [initialRates, initialContent] = await Promise.all([
    loadRates().catch((error) => {
      console.error("Failed to load rebate rates:", error);
      return [] as RateRow[];
    }),
    loadContent(),
  ]);

  return (
    <Calculator
      initialRates={initialRates}
      initialContent={initialContent}
    />
  );
}
