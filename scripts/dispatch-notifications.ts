import crypto from "node:crypto";
import * as fs from "node:fs";
import { esc, execDb, queryDb } from "../src/lib/db.ts";

/**
 * Email notification dispatcher — real delivery with atomic claim/lease.
 *
 * Delivery pipeline:
 *   1. ATOMIC CLAIM — one batched UPDATE claims every eligible row for THIS
 *      pass under a fresh `claim_token` + `lease_expires_at`. Eligibility:
 *      status='pending', due (next_attempt_at <= now), and NOT held by an
 *      active lease. SQLite serializes the UPDATE, so two concurrent passes
 *      can never both claim the same row: the second pass's UPDATE matches
 *      zero rows for that row (its lease is active), so it never delivers it.
 *   2. DELIVER — each row we own is handed to the transactional provider over
 *      HTTPS. The row is marked status='sent' ONLY after a 2xx handoff.
 *   3. FINALIZE — success: sent + sent_at (token-scoped UPDATE so only the
 *      owner can finalize). Failure: attempts/error/backoff, or permanent
 *      'failed' + /home/team/shared/notification_failures.json after
 *      MAX_ATTEMPTS — nothing is silently lost.
 *   4. STALE-LEASE RECOVERY — if a pass dies mid-delivery its lease expires
 *      (lease_expires_at in the past) and the next pass re-claims the row.
 *
 * Provider contract (env):
 *   RESEND_API_KEY  — required for delivery (Bearer token). Without it rows
 *                     are retried and NEVER marked sent.
 *   RESEND_API_URL  — optional base URL (default https://api.resend.com).
 *   DISPATCH_FROM   — optional verified sender address.
 *
 * All DB access goes through the no-shell shared layer in src/lib/db.ts
 * (execFileSync + argument arrays — no shell metacharacter interpretation).
 */

const AUDIT_LOG = "/home/team/shared/notification_dispatch.json";
const FAILURE_LOG = "/home/team/shared/notification_failures.json";

const MAX_ATTEMPTS = 5;
/** Rows owned per pass (bounded work; unprocessed claims release via lease). */
const BATCH_LIMIT = 100;
/** Lease lifetime; after this a crashed pass's claim is reclaimable. */
const LEASE_MS = 120_000;
/** Backoff cap: 2^attempts minutes, capped at this. */
const BACKOFF_CAP_MINUTES = 60;

interface OwnedNotification {
  id: string;
  recipient_email: string;
  subject: string;
  body: string;
  created_at: string | null;
  attempts: number;
}

/**
 * Idempotent schema guard: creates the table (with claim/lease columns) if
 * missing and adds any missing columns to an older table (duplicate-column
 * ALTER errors are swallowed).
 */
function ensureSchema(): void {
  execDb(
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
      `next_attempt_at TEXT, ` +
      `claim_token TEXT, ` +
      `lease_expires_at TEXT` +
      `)`,
  );
  execDb(`CREATE INDEX IF NOT EXISTS idx_notifications_pending ON notifications(status, next_attempt_at)`);
  execDb(
    `CREATE INDEX IF NOT EXISTS idx_notifications_claim ON notifications(status, claim_token, lease_expires_at)`,
  );
  for (const col of [
    "attempts INTEGER NOT NULL DEFAULT 0",
    "last_error TEXT",
    "next_attempt_at TEXT",
    "claim_token TEXT",
    "lease_expires_at TEXT",
  ]) {
    // Swallow "duplicate column" — the column already exists.
    execDb(`ALTER TABLE notifications ADD COLUMN ${col}`);
  }
}

function readJsonLog(path: string): unknown[] {
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

/** Deliver one email; ok:true only on a 2xx provider response (handoff). */
async function deliverEmail(notif: OwnedNotification): Promise<{ ok: boolean; error?: string }> {
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
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [notif.recipient_email], subject: notif.subject, text: notif.body }),
    });
    if (res.ok) return { ok: true };
    const detail = (await res.text()).slice(0, 300);
    return { ok: false, error: `provider HTTP ${res.status}: ${detail}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Failure finalize: backoff + retry, or permanent 'failed' + failure log. */
function finalizeFailure(notif: OwnedNotification, claimToken: string, error: string, nowIso: string): void {
  const attempts = notif.attempts; // incremented at claim time
  const errSql = esc(error.slice(0, 500));
  if (attempts >= MAX_ATTEMPTS) {
    execDb(
      `UPDATE notifications SET status='failed', attempts=${attempts}, last_error='${errSql}', ` +
        `next_attempt_at=NULL, claim_token=NULL, lease_expires_at=NULL ` +
        `WHERE id='${esc(notif.id)}' AND claim_token='${esc(claimToken)}'`,
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
    execDb(
      `UPDATE notifications SET attempts=${attempts}, last_error='${errSql}', next_attempt_at='${esc(next)}', ` +
        `claim_token=NULL, lease_expires_at=NULL ` +
        `WHERE id='${esc(notif.id)}' AND claim_token='${esc(claimToken)}'`,
    );
  }
}

/** Run one dispatch pass; returns the number of successful handoffs. Never throws. */
export async function dispatchNotifications(): Promise<number> {
  try {
    ensureSchema();
    const now = new Date();
    const nowIso = now.toISOString();
    const claimToken = crypto.randomUUID();
    const leaseExp = new Date(now.getTime() + LEASE_MS).toISOString();

    // 1. Atomic batch claim: only pending, due, lease-free rows. SQLite's write
    //    lock serializes this UPDATE, so concurrent passes cannot double-claim.
    execDb(
      `UPDATE notifications SET claim_token='${esc(claimToken)}', lease_expires_at='${esc(leaseExp)}', attempts=attempts+1 ` +
        `WHERE status='pending' ` +
        `AND (next_attempt_at IS NULL OR next_attempt_at <= '${esc(nowIso)}') ` +
        `AND (claim_token IS NULL OR lease_expires_at IS NULL OR lease_expires_at < '${esc(nowIso)}')`,
    );

    // 2. The rows carrying OUR token are the ones we exclusively own.
    const owned = queryDb<OwnedNotification>(
      `SELECT id, recipient_email, subject, body, created_at, attempts FROM notifications ` +
        `WHERE claim_token='${esc(claimToken)}' LIMIT ${BATCH_LIMIT}`,
    );

    let dispatched = 0;
    for (const notif of owned) {
      const result = await deliverEmail(notif);
      if (result.ok) {
        // 3a. Sent ONLY after a successful provider handoff; token-scoped so only we can finalize.
        execDb(
          `UPDATE notifications SET status='sent', sent_at='${esc(nowIso)}', last_error=NULL, ` +
            `claim_token=NULL, lease_expires_at=NULL ` +
            `WHERE id='${esc(notif.id)}' AND claim_token='${esc(claimToken)}'`,
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
        // 3b. Failure: backoff + retry (or permanent failed + failure log).
        finalizeFailure(notif, claimToken, result.error || "unknown delivery error", nowIso);
      }
    }

    console.log(`Dispatched ${dispatched} notifications`);
    return dispatched;
  } catch (error) {
    console.error("Notification dispatch failed:", error);
    return 0;
  }
}

// CLI entry: bun scripts/dispatch-notifications.ts
if (import.meta.main) {
  void dispatchNotifications();
}