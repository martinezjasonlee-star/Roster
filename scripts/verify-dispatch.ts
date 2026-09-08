// End-to-end verification of the email dispatch pipeline
// (run: bun scripts/verify-dispatch.ts) — uses a LOCAL mock provider, never sends real mail.
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import * as fs from "node:fs";
import { dispatchNotifications } from "./dispatch-notifications.ts";

const DB_PATH = "/home/team/.data/agent-team-cc229006.db";
const AUDIT_LOG = "/home/team/shared/notification_dispatch.json";
const FAILURE_LOG = "/home/team/shared/notification_failures.json";
const MAX_ATTEMPTS = 5;

function esc(s: string) {
  return s.replace(/'/g, "''");
}
function sh(query: string): string {
  return execSync(`sqlite3 ${DB_PATH} "${query.replace(/"/g, '\\"')}"`).toString().trim();
}
// Plain-text row readback: status|attempts|last_error|next_attempt_at|sent_at
function row(id: string) {
  const out = sh(
    `SELECT status || '|' || attempts || '|' || IFNULL(last_error,'') || '|' || IFNULL(next_attempt_at,'') || '|' || IFNULL(sent_at,'') FROM notifications WHERE id='${esc(id)}'`,
  );
  if (!out) return null;
  const [status, attempts, last_error, next_attempt_at, sent_at] = out.split("|");
  return { status, attempts: Number(attempts), last_error, next_attempt_at, sent_at };
}
function cleanUp(ids: string[]): void {
  try {
    sh(`DELETE FROM notifications WHERE id IN (${ids.map((i) => `'${esc(i)}'`).join(",")})`);
  } catch {
    /* ignore */
  }
}
function resetLogs(): void {
  fs.writeFileSync(AUDIT_LOG, "[]", "utf-8");
  fs.writeFileSync(FAILURE_LOG, "[]", "utf-8");
}
function insert(id: string, attempts = 0): void {
  sh(
    `INSERT INTO notifications (id, recipient_email, subject, body, status, attempts) VALUES ('${id}', 'mock@example.com', 'Test subject', 'Test body', 'pending', ${attempts})`,
  );
}

let mockMode: "ok" | "fail" = "ok";
let received: any[] = [];
const server = Bun.serve({
  port: 0,
  async fetch(req) {
    if (req.method === "POST" && new URL(req.url).pathname === "/emails") {
      received.push(await req.json());
      const status = mockMode === "ok" ? 200 : 500;
      return new Response(JSON.stringify({ id: "mock-mail-id" }), { status });
    }
    return new Response("not found", { status: 404 });
  },
});
const BASE = `http://127.0.0.1:${server.port}`;

let pass = 0;
const checks: [string, boolean, unknown?][] = [];
function check(name: string, cond: boolean, detail?: unknown): void {
  checks.push([name, cond, detail]);
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? "  " + JSON.stringify(detail) : ""}`);
  if (cond) pass++;
}

try {
  // Remove leftovers from any prior crashed run, then ensure schema.
  sh(`DELETE FROM notifications WHERE id LIKE 'verify-%'`);
  await dispatchNotifications();

  process.env.RESEND_API_KEY = "test-key";
  process.env.RESEND_API_URL = BASE;
  process.env.DISPATCH_FROM = "Roster Verify <verify@roster-work.com>";

  // 1. Success: provider 2xx → sent + audit + payload correct; no re-send.
  const okId = "verify-ok-" + crypto.randomUUID().slice(0, 8);
  insert(okId);
  mockMode = "ok";
  const n1 = await dispatchNotifications();
  const r1 = row(okId);
  check("success handoff returns 1", n1 === 1);
  check("row marked sent", r1?.status === "sent", r1?.status);
  check("sent_at set", !!r1?.sent_at);
  check("audit log entry written", JSON.parse(fs.readFileSync(AUDIT_LOG, "utf-8")).some((e: any) => e.id === okId));
  const p = received.find((r) => r.to?.[0] === "mock@example.com");
  check(
    "provider payload correct",
    !!p && p.from === "Roster Verify <verify@roster-work.com>" && p.subject === "Test subject" && p.text === "Test body",
  );
  received = [];
  const n1b = await dispatchNotifications();
  check("sent row not re-dispatched", n1b === 0 && received.length === 0);

  // 2. No provider key → never marked sent, failure recorded.
  const noKeyId = "verify-nokey-" + crypto.randomUUID().slice(0, 8);
  insert(noKeyId);
  delete process.env.RESEND_API_KEY;
  const n2 = await dispatchNotifications();
  const r2 = row(noKeyId);
  check("no-key: 0 dispatched", n2 === 0);
  check("no-key: stays pending (NOT sent)", r2?.status === "pending", r2?.status);
  check("no-key: attempts incremented", r2?.attempts === 1, r2?.attempts);
  check("no-key: last_error explains missing key", /RESEND_API_KEY/.test(r2?.last_error || ""));

  // 3. Backoff: immediate rerun skips the row.
  const n3 = await dispatchNotifications();
  const r3 = row(noKeyId);
  check("backoff: rerun skips (0 dispatched)", n3 === 0);
  check("backoff: attempts unchanged", r3?.attempts === 1);
  check("backoff: next_attempt_at is in the future", !!r3?.next_attempt_at && r3.next_attempt_at > new Date().toISOString());

  // 4. Provider 5xx → failure recorded, stays pending.
  const failId = "verify-5xx-" + crypto.randomUUID().slice(0, 8);
  insert(failId);
  process.env.RESEND_API_KEY = "test-key";
  mockMode = "fail";
  const n4 = await dispatchNotifications();
  const r4 = row(failId);
  check("5xx: 0 dispatched", n4 === 0);
  check("5xx: stays pending", r4?.status === "pending");
  check("5xx: last_error contains HTTP 500", /HTTP 500/.test(r4?.last_error || ""), r4?.last_error);

  // 5. Exhaustion → permanent failed + failure log (not silently lost).
  const deadId = "verify-dead-" + crypto.randomUUID().slice(0, 8);
  insert(deadId, MAX_ATTEMPTS - 1);
  const n5 = await dispatchNotifications();
  const r5 = row(deadId);
  check("exhaustion: 0 dispatched", n5 === 0);
  check("exhaustion: status=failed", r5?.status === "failed", r5?.status);
  check("failure log entry written", JSON.parse(fs.readFileSync(FAILURE_LOG, "utf-8")).some((e: any) => e.id === deadId));

  cleanUp([okId, noKeyId, failId, deadId]);
  console.log(`\n${pass}/${checks.length} checks passed`);
  process.exit(pass === checks.length ? 0 : 1);
} catch (error) {
  console.error("verify-dispatch error:", error);
  process.exit(2);
} finally {
  server.stop();
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_URL;
  delete process.env.DISPATCH_FROM;
}