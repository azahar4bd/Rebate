import type { VisitorRow } from "@/db/schema";

/** Shared types + helpers for visitor tracking. */

export const VISITOR_NAME_MAX_LENGTH = 100;

/** A visitor record as returned by the admin API (dates as ISO strings). */
export interface VisitorRecord {
  id: number;
  name: string;
  createdAt: string;
  lastSeenAt: string;
  visitCount: number;
  calcCount: number;
  lastProduct: string | null;
  lastDuration: string | null;
  lastKisti: number | null;
}

/** Serialize a Drizzle row for the API (timestamp columns come back as Date). */
export function serializeVisitor(row: VisitorRow): VisitorRecord {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
    visitCount: row.visitCount,
    calcCount: row.calcCount,
    lastProduct: row.lastProduct,
    lastDuration: row.lastDuration,
    lastKisti: row.lastKisti,
  };
}

/**
 * Normalize a raw visitor name: trim it and collapse runs of whitespace to
 * single spaces so "Rahim   Uddin" and "Rahim Uddin" map to the same row.
 * Case is preserved, so "Rahim" and "rahim" stay distinct.
 * Returns null when the value is not a string, is blank, or is too long.
 */
export function normalizeVisitorName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length === 0 || name.length > VISITOR_NAME_MAX_LENGTH) return null;
  return name;
}
