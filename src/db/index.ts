import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

/** Normalize Neon URLs without connecting to the database during a build. */
function buildPoolConfig(databaseUrl: string): PoolConfig {
  const url = new URL(databaseUrl);
  const isNeon = url.hostname.endsWith(".neon.tech");
  // channel_binding is a libpq-only parameter, not supported by node-postgres.
  url.searchParams.delete("channel_binding");
  return {
    connectionString: url.toString(),
    ssl: isNeon ? { rejectUnauthorized: true } : undefined,
    max: 5,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 20_000,
  };
}

const globalForDb = globalThis as typeof globalThis & {
  __rebatePostgresqlPool?: Pool;
};
let database: ReturnType<typeof drizzle> | undefined;

/**
 * Initialize only when a request actually needs the database. Vercel can build
 * without production credentials; DATABASE_URL is still required at runtime.
 */
export function getDb() {
  if (database) return database;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required at runtime");
  }

  const pool =
    globalForDb.__rebatePostgresqlPool ?? new Pool(buildPoolConfig(databaseUrl));
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__rebatePostgresqlPool = pool;
  }
  database = drizzle(pool);
  return database;
}
