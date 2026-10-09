import {
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Rebate rate table.
 * One row per (product, duration, advance kisti) combination.
 * The full canonical dataset contains 299 rows.
 */
export const rebateRates = pgTable(
  "rebate_rates",
  {
    id: serial("id").primaryKey(),
    product: varchar("product", { length: 50 }).notNull(),
    duration: varchar("duration", { length: 50 }).notNull(),
    kisti: integer("kisti").notNull(),
    rate: numeric("rate", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    comboIdx: uniqueIndex("rebate_rates_combo_idx").on(
      table.product,
      table.duration,
      table.kisti
    ),
  })
);

export type RebateRateRow = typeof rebateRates.$inferSelect;
export type NewRebateRateRow = typeof rebateRates.$inferInsert;

/**
 * Editable site content (key-value store).
 * Lets the admin change UI text from the browser; persists across deployments.
 */
export const siteContent = pgTable("site_content", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SiteContentRow = typeof siteContent.$inferSelect;
export type NewSiteContentRow = typeof siteContent.$inferInsert;
