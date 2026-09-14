// End-to-end verification of the email dispatch pipeline (v2: lease/claim).
// (run: bun scripts/verify-dispatch.ts) — uses a LOCAL mock provider, never sends real mail.
// Covers: success handoff, idempotency, no-key safety, backoff, 5xx, exhaustion,
// stale-lease recovery, active-lease skip, CONCURRENT exactly-one-send, and
// adversarial shell-metachar content handled safely.
import crypto from "node:crypto";
import * as fs from "node:fs";
import { execDb, queryDb, esc } from "../src/lib/db.ts";
import { dispatchNotifications } from "./dispatch-notifications.ts";

const AUDIT_LOG = "/home/team/shared/notification_dispatch.json";
const FAILURE_LOG = "/home/team/shared/notification_failures.json";
const MARKER = "/tmp/roster_dispatch_pwned_marker";

function row(id: string) {
  const out = queryDb<{ status: string; attempts: number; last_error: string | null; next_attempt_at: string | null; sent_at: string | null }>(
    `SELECT status || '|' || attempts || '|' || IFNULL(last_error,'') || '|' || IFNULL(next_attempt_at,'') || '|' || IFNULL(sent_at,'') AS s FROM notifications WHERE id='${esc(id)}'`,
  );
  const raw = out[0] as unknown as { s?: string };
  if (!raw?.s) return null;
  const [status, attempts, last_error, next_attempt_at, sent_at] = raw.s.split("|");
  return { status, attempts: Number(attempts), last_error, next_attempt_at, sent_at };
}
function insert(id: string, attempts = 0, lease?: { token: string; expires: string }): void {
  const cols = ["id", "recipient_email", "subject", "body", "status", "attempts"];
  const vals = [`'${esc(id)}'`, "'mock@example.com'", "'Test subject'", "'Test body'", "'pending'", String(attempts)];
  if (lease) {
    cols.push("claim_token", "lease_expires_at");
    vals.push(`'${esc(lease.token)}'`, `'${esc(lease.expires)}'`);
  }
  execDb(`INSERT INTO notifications (${cols.join(",")}) VALUES (${vals.join(",")})`);
}
function cleanUp(ids: string[]): void {
  if (ids.length) execDb(`DELETE FROM notifications WHERE id IN (${ids.map((i) => `'${esc(i)}'`).join(",")})`);
}
function resetLogs(): void {
  fs.writeFileSync(AUDIT_LOG, "[]", "utf-8");
  fs.writeFileSync(FAILURE_LOG, "[]", "utf-8");
}

let mockMode: "ok" | "fail" = "ok";
let mockDelayMs = 0;
let received: any[] = [];
const server = Bun.serve({
  port: 0,
  async fetch(req) {
    if (req.method === "POST" && new URL(req.url).pathname === "/emails") {
      received.push(await req.json());
      if (mockDelayMs > 0) await Bun.sleep(mockDelayMs);
      return new Response(JSON.stringify({ id: "mock-mail-id" }), { status: mockMode === "ok" ? 200 : 500 });
    }
    return new Response("not found", { status: 404 });
  },
});
const BASE = `http://127.0.0.1:${server.port}`;

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: unknown): void {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? "  " + JSON.stringify(detail) : ""}`);
  if (cond) pass++;
  else fail++;
}

try {
  fs.rmSync(MARKER, { force: true });
  resetLogs();
  // Remove leftovers from prior runs and ensure schema (table + claim/lease columns).
  execDb(`DELETE FROM notifications WHERE id LIKE 'verify-%'`);
  await dispatchNotifications();

  process.env.RESEND_API_KEY = "test-key";
  process.env.RESEND_API_URL = BASE;
  process.env.DISPATCH_FROM = "Roster Verify <verify@roster-work.com>";

  // ---- 1. Success: 2xx → sent + audit + payload; no re-send ----
  const okId = "verify-ok-" + crypto.randomUUID().slice(0, 8);
  insert(okId);
  mockMode = "ok";
  mockDelayMs = 0;
  const n1 = await dispatchNotifications();
  const r1 = row(okId);
  check("success returns 1", n1 === 1);
  check("row marked sent", r1?.status === "sent", r1?.status);
  check("sent_at set", !!r1?.sent_at);
  check("audit entry written", JSON.parse(fs.readFileSync(AUDIT_LOG, "utf-8")).some((e: any) => e.id === okId));
  const p = received.find((r: any) => r.to?.[0] === "mock@example.com");
  check("provider payload exact", !!p && p.from === "Roster Verify <verify@roster-work.com>" && p.subject === "Test subject" && p.text === "Test body");
  received = [];
  check("sent row not re-dispatched", (await dispatchNotifications()) === 0 && received.length === 0);

  // ---- 2. No key → stays pending, never sent ----
  const noKeyId = "verify-nokey-" + crypto.randomUUID().slice(0, 8);
  insert(noKeyId);
  delete process.env.RESEND_API_KEY;
  check("no-key: 0 dispatched", (await dispatchNotifications()) === 0);
  const r2 = row(noKeyId);
  check("no-key: stays pending (NOT sent)", r2?.status === "pending", r2?.status);
  check("no-key: attempts=1", r2?.attempts === 1, r2?.attempts);
  check("no-key: error names key", /RESEND_API_KEY/.test(r2?.last_error || ""));

  // ---- 3. Backoff: immediate rerun skips ----
  check("backoff: rerun skips (0)", (await dispatchNotifications()) === 0);
  const r3 = row(noKeyId);
  check("backoff: attempts unchanged", r3?.attempts === 1);
  check("backoff: next_attempt_at future", !!r3?.next_attempt_at && r3.next_attempt_at > new Date().toISOString());

  // ---- 4. Provider 5xx → recorded, stays pending ----
  const failId = "verify-5xx-" + crypto.randomUUID().slice(0, 8);
  insert(failId);
  process.env.RESEND_API_KEY = "test-key";
  mockMode = "fail";
  check("5xx: 0 dispatched", (await dispatchNotifications()) === 0);
  const r4 = row(failId);
  check("5xx: stays pending", r4?.status === "pending");
  check("5xx: error has HTTP 500", /HTTP 500/.test(r4?.last_error || ""), r4?.last_error);

  // ---- 5. Exhaustion (pre-seeded attempts=4 → claim→5 → failed + failure log) ----
  const deadId = "verify-dead-" + crypto.randomUUID().slice(0, 8);
  insert(deadId, 4);
  mockMode = "fail";
  check("exhaustion: 0 dispatched", (await dispatchNotifications()) === 0);
  const r5 = row(deadId);
  check("exhaustion: failed", r5?.status === "failed", r5?.status);
  check("failure log entry", JSON.parse(fs.readFileSync(FAILURE_LOG, "utf-8")).some((e: any) => e.id === deadId));

  // ---- 6. Stale-lease recovery: dead lease → reclaimed & delivered exactly once ----
  const staleId = "verify-stale-" + crypto.randomUUID().slice(0, 8);
  insert(staleId, 0, { token: "dead-token", expires: new Date(Date.now() - 60_000).toISOString() });
  mockMode = "ok";
  const n6 = await dispatchNotifications();
  const r6 = row(staleId);
  check("stale lease: delivered (1)", n6 === 1);
  check("stale lease: row sent", r6?.status === "sent", r6?.status);

  // ---- 7. Active lease: row held by another pass → NOT claimed/delivered ----
  const activeId = "verify-active-" + crypto.randomUUID().slice(0, 8);
  insert(activeId, 0, { token: "live-holder", expires: new Date(Date.now() + 600_000).toISOString() });
  mockMode = "ok";
  const n7 = await dispatchNotifications();
  const r7 = row(activeId);
  check("active lease: not dispatched (0 total)", n7 === 0);
  check("active lease: row still pending, attempts untouched", r7?.status === "pending" && r7?.attempts === 0, r7);

  // ---- 8. CONCURRENCY: three overlapping passes → EXACTLY one delivery ----
  const concId = "verify-conc-" + crypto.randomUUID().slice(0, 8);
  insert(concId);
  received = [];
  mockDelayMs = 300; // keep passes overlapping while pass 1 delivers
  const [a, b, c] = await Promise.all([dispatchNotifications(), dispatchNotifications(), dispatchNotifications()]);
  mockDelayMs = 0;
  const r8 = row(concId);
  const deliveries = received.filter((r: any) => r.to?.[0] === "mock@example.com").length;
  check("concurrency: exactly one handoff", deliveries === 1, { a, b, c, deliveries });
  check("concurrency: row sent once", r8?.status === "sent");
  check("concurrency: attempts counted once", r8?.attempts === 1, r8?.attempts);

  // ---- 9. Adversarial content: $(), backticks, ; DROP, quotes, newline ----
  const advId = "verify-adv-" + crypto.randomUUID().slice(0, 8);
  const hostile = `$(touch ${MARKER})` + "`touch " + MARKER + "2`" + `"; DROP TABLE notifications;-- ' "\nline2`;
  execDb(
    `INSERT INTO notifications (id, recipient_email, subject, body, status) VALUES ('${advId}', 'mock@example.com', '${esc(hostile)}', '${esc(hostile)}', 'pending')`,
  );
  received = [];
  mockMode = "ok";
  check("adversarial: dispatch delivers 1", (await dispatchNotifications()) === 1);
  const r9 = row(advId);
  check("adversarial: row sent", r9?.status === "sent");
  const sentPayload = received.find((r: any) => r.to?.[0] === "mock@example.com");
  check("adversarial: content intact end-to-end", !!sentPayload && sentPayload.subject === hostile && sentPayload.text === hostile);
  check("adversarial: no shell execution ($()/backticks inert)", !fs.existsSync(MARKER) && !fs.existsSync(MARKER + "2"));
  const tableAlive = queryDb<{ count: number }>("SELECT COUNT(*) as count FROM notifications");
  check("adversarial: table intact", tableAlive[0]?.count !== undefined);

  cleanUp([okId, noKeyId, failId, deadId, staleId, activeId, concId, advId]);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
} catch (error) {
  console.error("verify-dispatch error:", error);
  process.exit(2);
} finally {
  server.stop();
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_URL;
  delete process.env.DISPATCH_FROM;
}