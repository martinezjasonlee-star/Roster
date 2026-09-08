// Ad-hoc verification of src/lib/db.ts helpers (run: bun scripts/verify-db.ts)
import { DB_PATH, esc, execDb, queryDb } from "../src/lib/db.ts";

console.log("DB_PATH:", DB_PATH);
const escSamples = [esc("O'Brien"), esc(null), esc(undefined), esc(42), esc('it\'s "quoted"')];
console.log("esc tests:", JSON.stringify(escSamples));

// Runtime SELECT
const workers = queryDb<{ count: number }>("SELECT COUNT(*) as count FROM workers");
console.log("workers count:", JSON.stringify(workers));

// Runtime INSERT + readback + cleanup (temp row; notifications table exists)
const tid = "db-helpers-test-" + Date.now();
const ins = execDb(
  `INSERT INTO notifications (id, recipient_email, subject, body, status) VALUES ('${tid}', 't@example.com', 'x', 'y', 'pending')`,
);
console.log("insert success (expected true):", ins.success);
const back = queryDb<{ id: string }>(`SELECT id FROM notifications WHERE id = '${tid}'`);
console.log("readback (expected 1 row):", JSON.stringify(back));
const del = execDb(`DELETE FROM notifications WHERE id = '${tid}'`);
console.log("cleanup success (expected true):", del.success);

// Escaping through the full path: a value with a quote survives round-trip unaltered
const quoteId = "db-esc-test-" + Date.now();
const tricky = "O'Brien's shift \"final\"";
execDb(
  `INSERT INTO notifications (id, recipient_email, subject, body, status) VALUES ('${quoteId}', 't@example.com', '${esc(tricky)}', 'y', 'pending')`,
);
const roundtrip = queryDb<{ subject: string }>(`SELECT subject FROM notifications WHERE id = '${quoteId}'`);
console.log("quote round-trip (expected exact match):", roundtrip[0]?.subject === tricky, JSON.stringify(roundtrip[0]?.subject));
execDb(`DELETE FROM notifications WHERE id = '${quoteId}'`);

// Failure path: invalid SQL returns success:false + error, does not throw
const bad = execDb("INVALID SQL HERE");
console.log("bad exec success (expected false):", bad.success, "| error present (expected true):", !!bad.error);