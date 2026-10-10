/** Structural type: any drizzle node-postgres database client satisfies it. */
export interface BootstrapDatabase {
  execute: (sql: string) => Promise<unknown>;
}

/**
 * Runtime bootstrap for tables that did not exist in older deployments.
 *
 * The DDL below must stay in sync with the `visitors` table in
 * `src/db/schema.ts` — tests/visitors.test.ts asserts that every column
 * defined in the Drizzle schema appears in this statement.
 *
 * `CREATE ... IF NOT EXISTS` makes the bootstrap idempotent: it is a no-op
 * once the table exists, and it also self-heals fresh preview databases
 * without requiring `npm run db:push` on every environment.
 */
export const VISITORS_BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS visitors (
  id serial PRIMARY KEY,
  name varchar(100) NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  last_seen_at timestamp NOT NULL DEFAULT now(),
  visit_count integer NOT NULL DEFAULT 1,
  calc_count integer NOT NULL DEFAULT 0,
  last_product varchar(50),
  last_duration varchar(50),
  last_kisti integer
);
CREATE UNIQUE INDEX IF NOT EXISTS visitors_name_idx ON visitors (name);
`.trim();

let ensured = false;

/**
 * Create the visitors table if the database does not have it yet.
 * Runs at most once per process; failures propagate to the caller's
 * existing error handling (routes answer with a generic 503).
 */
export async function ensureVisitorsTable(db: BootstrapDatabase) {
  if (ensured) return;
  await db.execute(VISITORS_BOOTSTRAP_SQL);
  ensured = true;
}
