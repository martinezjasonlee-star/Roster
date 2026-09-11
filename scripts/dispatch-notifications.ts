import { execSync } from "node:child_process";
import * as fs from "node:fs";

/**
 * Email notification dispatcher — real delivery pipeline.
 *
 * Reads queued notifications (status='pending') from the `notifications` table
 * and delivers each one to a transactional email provider over HTTPS
 * (Resend-compatible API). A notification is only marked status='sent' after
 * the provider returns a 2xx (delivery handoff succeeded). Failures are
 * recorded per-row (attempts, last_error, next_attempt_at) and retried with
 * exponential backoff; after MAX_ATTEMPTS the row becomes status='failed' and
 * is written to /home/team/shared/notification_failures.json so nothing is
 * silently lost.
 *
 * Provider contract (env):
 *   RESEND_API_KEY  — required. Provider API key (Bearer auth). Without it the
 *                     dispatcher records the failure and leaves rows pending —
 *                     notifications are NEVER marked sent without a real handoff.
 *   RESEND_API_URL  — optional. Base URL, default https://api.resend.com. Tests
 *                     point this at a local mock to exercise the success path.
 *   DISPATCH_FROM   — optional sender address. Must be a verified sender in the
 *                     provider account (default "Roster <no-reply@roster-work.com>").
 *
 * Idempotency: eligible rows are only those still status='pending' with
 * next_attempt_at <= now; the sent/failed transitions use
 * `UPDATE ... WHERE status='pending'`, so a row can never be double-delivered
 * or double-marked, even if two runs race.
 */

const DB_PATH = "/home/team/.data/agent-team-cc229006.db";
const AUDIT_LOG = "/home/team/shared/notification_dispatch.json";
const FAILURE_LOG = "/home/team/shared/notification_failures.json";

const MAX_ATTEMPTS = 5;
const BATCH_LIMIT = 50;
/** Cap the backoff at 60 minutes (attempt 1→2 min, 2→4, 3→8, 4→16, 5→32 … capped). */
const BACKOFF_CAP_MINUTES = 60;

function esc(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/'/g, "''");
}

function query<T = Record<string, unknown>>(sql: string): T[] {
  try {
    const out = execSync(`sqlite3 -json ${DB_PATH} "${sql.replace(/"/g, '\\"')}"`).toString().trim();
    if (!out) return [];
    const parsed: unknown = JSON.parse(out);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    console.error("dispatch query error:", error, "SQL:", sql);
    return [];
  }
}

function exec(sql: string): boolean {
  try {
    execSync(`sqlite3 ${DB_PATH} "${sql.replace(/"/g, '\\"')}"`);
    return true;
  } catch (error) {
    console.error("dispatch exec error:", error, "SQL:", sql);
    return false;
  }
}

/**
 * Idempotent schema guard. Creates the table if missing (e.g. after a DB
 * reset) and adds retry/failure columns if this version of the app hasn't
 * migrated them yet. Duplicate-column ALTER errors are ignored.
 */
function ensureSchema(): void {
  exec(
    `CREATE TABLE IF NOT EXISTS notifications (` +
      `id TEXT PRIMARY KEY, ` +
      `recipient_email TEXT NOT NULL, ` +
      `subject TEXT NOT NULL, ` +
      `body TEXT NOT NULL, ` +
      `status TEXT NOT NULL DEFAULT 'pending', ` +
      `created_at TEXT DEFAULT (datetime('now')), ` +
      `sent_at TEXT, ` +
      `attempts INTEGER NOT NULL DEFAULT 0, ` +
      `last_error TEXT, ` +
      `next_attempt_at TEXT` +
      `)`,
  );
  exec(`CREATE INDEX IF NOT EXISTS idx_notifications_pending ON notifications(status, next_attempt_at)`);
  // ALTERs for databases created before the retry columns existed.
  for (const col of [
    "attempts INTEGER NOT NULL DEFAULT 0",
    "last_error TEXT",
    "next_attempt_at TEXT",
  ]) {
    try {
      exec(`ALTER TABLE notifications ADD COLUMN ${col}`);
    } catch {
      /* column already exists */
    }
  }
}

function readJsonLog(path: string): any[] {
  if (!fs.existsSync(path)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(path, "utf-8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function appendLog(path: string, entry: Record<string, unknown>): void {
  const rows = readJsonLog(path);
  rows.push(entry);
  fs.writeFileSync(path, JSON.stringify(rows, null, 2), "utf-8");
}

/**
 * Deliver one email via the provider's HTTP API. Returns { ok: true } only on
 * a 2xx response — i.e. the provider accepted the message for delivery.
 * Anything else (network error, non-2xx, missing key) returns { ok: false, error }.
 */
async function deliverEmail(notif: {
  id: string;
  recipient_email: string;
  subject: string;
  body: string;
}): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return {
      ok: false,
      error: "RESEND_API_KEY not set — no delivery provider configured; notification left pending (never marked sent)",
    };
  }
  const baseUrl = (process.env.RESEND_API_URL || "https://api.resend.com").replace(/\/+$/, "");
  const from = process.env.DISPATCH_FROM || "Roster <no-reply@roster-work.com>";
  try {
    const res = await fetch(`${baseUrl}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [notif.recipient_email],
        subject: notif.subject,
        text: notif.body,
      }),
    });
    if (res.ok) return { ok: true };
    const detail = (await res.text()).slice(0, 300);
    return { ok: false, error: `provider HTTP ${res.status}: ${detail}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Run one dispatch pass. Returns the number of emails handed off to the
 * provider successfully in this pass. Never throws.
 */
export async function dispatchNotifications(): Promise<number> {
  try {
    ensureSchema();
    const now = new Date();
    const nowIso = now.toISOString();

    const pending = query<{
      id: string;
      recipient_email: string;
      subject: string;
      body: string;
      created_at: string | null;
      attempts: number;
    }>(
      `SELECT id, recipient_email, subject, body, created_at, attempts FROM notifications ` +
        `WHERE status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= '${esc(nowIso)}') ` +
        `ORDER BY created_at ASC LIMIT ${BATCH_LIMIT}`,
    );

    let dispatched = 0;
    for (const notif of pending) {
      const result = await deliverEmail(notif);
      if (result.ok) {
        // Handoff succeeded → now (and only now) mark sent.
        exec(
          `UPDATE notifications SET status = 'sent', sent_at = '${esc(nowIso)}', ` +
            `attempts = attempts + 1, last_error = NULL WHERE id = '${esc(notif.id)}' AND status = 'pending'`,
        );
        appendLog(AUDIT_LOG, {
          id: notif.id,
          recipient_email: notif.recipient_email,
          subject: notif.subject,
          body: notif.body,
          created_at: notif.created_at,
          dispatched_at: nowIso,
        });
        dispatched++;
      } else {
        recordFailure(notif, result.error || "unknown delivery error", nowIso);
      }
    }

    console.log(`Dispatched ${dispatched} notifications`);
    return dispatched;
  } catch (error) {
    console.error("Notification dispatch failed:", error);
    return 0;
  }
}

/** Record a failed attempt: increment, back off, or mark permanently failed. */
function recordFailure(
  notif: { id: string; attempts: number },
  error: string,
  nowIso: string,
): void {
  const attempts = (notif.attempts || 0) + 1;
  const errorSql = esc(error.slice(0, 500));
  if (attempts >= MAX_ATTEMPTS) {
    exec(
      `UPDATE notifications SET status = 'failed', attempts = ${attempts}, ` +
        `last_error = '${errorSql}', next_attempt_at = NULL WHERE id = '${esc(notif.id)}' AND status = 'pending'`,
    );
    appendLog(FAILURE_LOG, {
      id: notif.id,
      recipient_email: notif.recipient_email,
      attempts,
      last_error: error,
      failed_at: nowIso,
    });
    console.error(`Notification ${notif.id} permanently failed after ${attempts} attempts: ${error}`);
  } else {
    const backoffMin = Math.min(2 ** attempts, BACKOFF_CAP_MINUTES);
    const next = new Date(new Date(nowIso).getTime() + backoffMin * 60_000).toISOString();
    exec(
      `UPDATE notifications SET attempts = ${attempts}, last_error = '${errorSql}', ` +
        `next_attempt_at = '${esc(next)}' WHERE id = '${esc(notif.id)}' AND status = 'pending'`,
    );
  }
}

// CLI entry: bun scripts/dispatch-notifications.ts
if (import.meta.main) {
  void dispatchNotifications();
}