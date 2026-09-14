// Ad-hoc verification of src/lib/db.ts no-shell helpers (run: bun scripts/verify-db.ts)
// Covers: escaping, numeric validation, round-trips, failure handling, and
// ADVERSARIAL SHELL-METACHARACTER input ($(), backticks, semicolons, quotes,
// newlines) proving no shell is invoked anywhere in the DB layer.
import * as fs from "node:fs";
import { DB_PATH, esc, execDb, num, queryDb } from "../src/lib/db.ts";

const MARKER = "/tmp/roster_db_pwned_marker";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: unknown): void {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? "  " + JSON.stringify(detail) : ""}`);
  if (cond) pass++;
  else fail++;
}

try {
  fs.rmSync(MARKER, { force: true });
  console.log("DB_PATH:", DB_PATH);

  // --- Pure helper behavior ---
  check("esc doubles single quotes", esc("O'Brien") === "O''Brien", esc("O'Brien"));
  check("esc null/undefined -> empty", esc(null) === "" && esc(undefined) === "");
  check("num accepts number", num(42) === 42 && num(3.5) === 3.5);
  check("num accepts numeric string", num("12") === 12 && num("2.75") === 2.75);
  let numThrew = false;
  try { num("1e3"); } catch { numThrew = true; }
  check("num rejects '1e3'", numThrew);
  numThrew = false;
  try { num("$(id)"); } catch { numThrew = true; }
  check("num rejects metachar string", numThrew);

  // --- Read path ---
  const workers = queryDb<{ count: number }>("SELECT COUNT(*) as count FROM workers");
  check("SELECT COUNT parses", workers.length === 1 && typeof workers[0]?.count === "number", workers);

  // --- Write/read/delete round-trip ---
  const tid = "db-helpers-test-" + Date.now();
  check("INSERT ok", execDb(`INSERT INTO notifications (id, recipient_email, subject, body, status) VALUES ('${tid}', 't@example.com', 'x', 'y', 'pending')`).success);
  check("readback", queryDb<{ id: string }>(`SELECT id FROM notifications WHERE id='${tid}'`)[0]?.id === tid);
  check("DELETE ok", execDb(`DELETE FROM notifications WHERE id='${tid}'`).success);

  // --- Quote round-trip through the full no-shell path ---
  const quoteId = "db-esc-test-" + Date.now();
  const tricky = `O'Brien's shift "final" ; SELECT 1;`;
  execDb(`INSERT INTO notifications (id, recipient_email, subject, body, status) VALUES ('${quoteId}', 't@example.com', '${esc(tricky)}', 'y', 'pending')`);
  const rt = queryDb<{ subject: string }>(`SELECT subject FROM notifications WHERE id='${quoteId}'`);
  check("quote+metachar value round-trips byte-exact", rt[0]?.subject === tricky, rt[0]?.subject);
  execDb(`DELETE FROM notifications WHERE id='${quoteId}'`);

  // --- ADVERSARIAL: $(), backticks, ; DROP, quotes, newline as a VALUE ---
  const advId = "db-adv-" + Date.now();
  const adversarial = `$(touch ${MARKER})` + "`touch " + MARKER + "2`" + `; DROP TABLE IF EXISTS notifications;-- ' " \nline2`;
  const insAdv = execDb(
    `INSERT INTO notifications (id, recipient_email, subject, body, status) VALUES ` +
      `('${advId}', 't@example.com', '${esc(adversarial)}', 'y', 'pending')`,
  );
  check("adversarial INSERT succeeds (no shell explosion)", insAdv.success, insAdv.error);
  const advBack = queryDb<{ subject: string }>(`SELECT subject FROM notifications WHERE id='${advId}'`);
  check("adversarial value round-trips byte-exact", advBack[0]?.subject === adversarial, advBack[0]?.subject);
  // The table must still exist (DROP in the value must NOT have executed).
  const stillThere = queryDb<{ count: number }>("SELECT COUNT(*) as count FROM notifications");
  check("notifications table intact after adversarial value", stillThere.length === 1);
  // No marker file may exist — proof $()/backticks were never interpreted by a shell.
  check("no shell metachar execution ($()/backticks inert)", !fs.existsSync(MARKER) && !fs.existsSync(MARKER + "2"));
  execDb(`DELETE FROM notifications WHERE id='${advId}'`);

  // --- Statement-level adversarial input must not execute either ---
  const missile = `SELECT 1; DROP TABLE notifications;--`;
  const mIns = execDb(
    `INSERT INTO notifications (id, recipient_email, subject, body, status) VALUES ('db-missile-${Date.now()}', 't@example.com', '${esc(missile)}', 'y', 'pending')`,
  );
  check("semicolon-laden value insert ok", mIns.success);
  // If a shell had been used, `; DROP TABLE` would have been a second statement — table must still exist:
  check("table survives semicolon-laden value", queryDb<{ count: number }>("SELECT COUNT(*) as count FROM notifications").length === 1);

  // --- Dot-command rejection ---
  const dotGuarded = execDb(".tables");
  check("dot-commands rejected", dotGuarded.success === false);

  // --- Failure path (invalid SQL) ---
  const bad = execDb("INVALID SQL HERE");
  check("invalid SQL -> {success:false,error} no throw", bad.success === false && !!bad.error);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
} catch (error) {
  console.error("verify-db error:", error);
  process.exit(2);
}