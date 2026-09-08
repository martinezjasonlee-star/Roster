import { execSync } from "node:child_process";

/**
 * Shared SQLite access layer for the Roster marketplace.
 *
 * The team's database is a synced SQLite file at a fixed, team-owned path.
 * All reads/writes go through the `sqlite3` CLI (never the Bun-native
 * binding, which fails in the TanStack Start SSR build) and are routed
 * through the helpers here so the path, escaping, and error handling stay
 * consistent.
 *
 * Conventions:
 * - SELECT → `queryDb<T>(sql)` → T[] (parsed JSON; [] on no rows/error).
 * - INSERT/UPDATE/DELETE → `execDb(sql)` → { success, error? }.
 * - NEVER interpolate untrusted values directly into SQL — wrap every value
 *   in `esc(...)` (single-quote doubling). Double quotes inside statements are
 *   escaped by the helpers below so the shell command stays intact.
 */

/** Single source of truth for the database path. */
export const DB_PATH = "/home/team/.data/agent-team-cc229006.db";

/**
 * Escape a value for single-quoted SQL string literals: doubles every single
 * quote (SQLite standard). Empty string for null/undefined — treat those as
 * empty rather than NULL to match prior behavior.
 */
export function esc(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/'/g, "''");
}

/** Build the shell command for a read query (sqlite3 -json). */
function readCommand(sql: string): string {
  return `sqlite3 -json ${DB_PATH} "${sql.replace(/"/g, '\\"')}"`;
}

/** Build the shell command for a write statement. */
function writeCommand(sql: string): string {
  return `sqlite3 ${DB_PATH} "${sql.replace(/"/g, '\\"')}"`;
}

/**
 * Run a SELECT and return parsed rows. Empty array when there is no output.
 * Errors are logged and surfaced as [] so callers can distinguish "no rows"
 * from "query failed" by checking console output — same contract as the old
 * inline helper, but with correct JSON-shape validation and a larger buffer
 * for photo/message payloads.
 */
export function queryDb<T = Record<string, unknown>>(sql: string): T[] {
  try {
    const result = execSync(readCommand(sql), { maxBuffer: 128 * 1024 * 1024 });
    const output = result.toString().trim();
    if (!output) return [];
    const parsed: unknown = JSON.parse(output);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    console.error("queryDb error:", error, "SQL was:", sql);
    return [];
  }
}

/**
 * Run an INSERT/UPDATE/DELETE. Returns { success: true } on completion or
 * { success: false, error } with the failure logged. Callers that need to
 * react to write failures can check the result.
 */
export function execDb(sql: string): { success: boolean; error?: string } {
  try {
    execSync(writeCommand(sql), { maxBuffer: 128 * 1024 * 1024 });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("execDb error:", error, "SQL was:", sql);
    return { success: false, error: message };
  }
}