import { execFileSync } from "node:child_process";

/**
 * Shared SQLite access layer for the Roster marketplace.
 *
 * The team's database is a synced SQLite file at a fixed, team-owned path.
 * All reads/writes go through the `sqlite3` CLI — but NEVER through a shell:
 * every invocation uses `execFileSync` with an argument array, so there is no
 * shell to interpret `$(...)`, backticks, `;`, or quotes. The SQL text is
 * passed to the sqlite3 process verbatim as a single argv element.
 *
 * Conventions:
 * - SELECT → `queryDb<T>(sql)` → T[] (parsed JSON; [] on no rows/error).
 * - INSERT/UPDATE/DELETE → `execDb(sql)` → { success, error? }.
 * - NEVER interpolate untrusted values directly into SQL — wrap every string
 *   value in `esc(...)` (single-quote doubling for the SQL literal) and every
 *   numeric value in `num(...)` (strict validation). Dot-commands (`.shell`
 *   etc.) are rejected outright.
 */

/** Single source of truth for the database path. */
export const DB_PATH = "/home/team/.data/agent-team-cc229006.db";

/**
 * Escape a value for single-quoted SQL string literals: doubles every single
 * quote (SQLite standard). Empty string for null/undefined.
 */
export function esc(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/'/g, "''");
}

/**
 * Validate and coerce a numeric value for interpolation. Accepts finite
 * numbers and plain decimal strings; everything else (NaN, "1e3", "0x10",
 * objects, booleans) throws — no unvalidated numbers reach the SQL.
 */
export function num(value: unknown): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`num(): not a finite number: ${String(value)}`);
    return value;
  }
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    return Number(value.trim());
  }
  throw new Error(`num(): invalid number input: ${JSON.stringify(value)}`);
}

/** Reject dot-commands (e.g. `.shell`, `.read`) which sqlite3 interprets specially. */
function guard(sql: string): string {
  const trimmed = sql.trimStart();
  if (trimmed.startsWith(".")) {
    throw new Error("db: sqlite dot-commands are not allowed");
  }
  return sql;
}

/** Run sqlite3 with an argv array (no shell). Returns stdout or throws. */
function runSqlite(args: string[], sql: string): string {
  try {
    return execFileSync("sqlite3", args, {
      encoding: "utf-8",
      maxBuffer: 128 * 1024 * 1024,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("db error:", message, "SQL was:", sql);
    throw error;
  }
}

/** Run a read statement; returns parsed JSON rows or [] on failure. */
export function queryDb<T = Record<string, unknown>>(sql: string): T[] {
  try {
    const out: string = runSqlite(["-json", DB_PATH, guard(sql)], sql).trim();
    if (!out) return [];
    const parsed: unknown = JSON.parse(out);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    console.error("queryDb error:", error, "SQL was:", sql);
    return [];
  }
}

/** Run a write statement; returns { success: true } or { success: false, error }. */
export function execDb(sql: string): { success: boolean; error?: string } {
  try {
    runSqlite([DB_PATH, guard(sql)], sql);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

/**
 * Run a write statement followed by a trailing SELECT on the SAME sqlite3
 * connection (no shell), returning the SELECT's rows. Used for atomic
 * sequences such as `UPDATE ... ; SELECT changes()`.
 */
export function execDbThenQuery<T = Record<string, unknown>>(sqlWithSelect: string): T[] {
  try {
    const out: string = runSqlite(["-json", DB_PATH, guard(sqlWithSelect)], sqlWithSelect).trim();
    if (!out) return [];
    const parsed: unknown = JSON.parse(out);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    console.error("execDbThenQuery error:", error, "SQL was:", sqlWithSelect);
    return [];
  }
}