// Launch-readiness QA evidence: run each critical write path's EXACT SQL as the
// production handlers execute it, plus the read paths, against the live shared DB.
// All fixture rows use the qa-* marker prefix and are deleted at the end — no real
// user data is touched. (run: bun scripts/verify-launch-qa.ts)
import { esc, execDb, queryDb } from "../src/lib/db.ts";
import crypto from "node:crypto";

let pass = 0;
let fail = 0;
function ck(name: string, cond: boolean, detail?: unknown): void {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? "  " + JSON.stringify(detail) : ""}`);
  if (cond) pass++;
  else fail++;
}

const ids = {
  biz: "qa-biz-" + crypto.randomUUID().slice(0, 8),
  worker: "qa-wk-" + crypto.randomUUID().slice(0, 8),
  shift: "qa-sh-" + crypto.randomUUID().slice(0, 8),
  booking: "qa-bk-" + crypto.randomUUID().slice(0, 8),
  msg: "qa-msg-" + crypto.randomUUID().slice(0, 8),
  notif: "qa-n-" + crypto.randomUUID().slice(0, 8),
  notif2: "qa-n2-" + crypto.randomUUID().slice(0, 8),
  cert: "qa-c-" + crypto.randomUUID().slice(0, 8),
  slot: "qa-s-" + crypto.randomUUID().slice(0, 8),
  rating: "qa-rt-" + crypto.randomUUID().slice(0, 8),
};

try {
  // ============ WRITE PATHS (exact SQL used by production handlers) ============
  // 1. Worker onboarding (onboarding/worker.tsx saveWorker)
  ck(
    "worker insert",
    execDb(
      `INSERT INTO workers (id, email, first_name, last_name, phone, role_type, years_experience, service_style, travel_radius, city, state, is_verified, photo_url) VALUES ('${ids.worker}','qa-w@example.com','QA','Worker','','bartender',3,'fast-paced',10,'Denver','CO',0,'')`,
    ).success,
  );
  ck(
    "cert insert",
    execDb(
      `INSERT INTO worker_certifications (id, worker_id, certification_id, is_verified) VALUES ('${ids.cert}','${ids.worker}','cert-1',0)`,
    ).success,
  );
  ck(
    "availability insert",
    execDb(
      `INSERT INTO worker_availability (id, worker_id, day_of_week, start_time, end_time, is_available) VALUES ('${ids.slot}','${ids.worker}',1,'09:00','17:00',1)`,
    ).success,
  );

  // 2. Business onboarding (onboarding/business.tsx saveBusiness — includes photo_url)
  ck(
    "business insert (photo_url)",
    execDb(
      `INSERT INTO businesses (id, name, email, phone, venue_type, description, address, city, state, membership_tier, membership_status, photo_url) VALUES ('${ids.biz}','QA Biz','qa-b@example.com','','restaurant','','1 Main','Denver','CO','starter','trial','')`,
    ).success,
  );

  // 3. Shift posting (shifts/post.tsx saveShift)
  ck(
    "shift insert",
    execDb(
      `INSERT INTO shifts (id, business_id, role_type, status, shift_type, date, start_time, end_time, workers_needed, hourly_rate, tips_included, pay_type, dress_code, certifications_required, notes, location_name) VALUES ('${ids.shift}','${ids.biz}','bartender','open','event','2026-11-01','17:00','23:00',1,25,1,'hourly_plus_tips','black','','','QA Venue')`,
    ).success,
  );

  // 4. Application → booking (shifts/browse.tsx applyToShift)
  ck(
    "booking insert",
    execDb(
      `INSERT INTO bookings (id, shift_id, worker_id, business_id, status) VALUES ('${ids.booking}','${ids.shift}','${ids.worker}','${ids.biz}','pending')`,
    ).success,
  );

  // 5. Booking decision path (server.ts updateBookingStatus — confirmed)
  ck(
    "booking status update",
    execDb(`UPDATE bookings SET status='confirmed', confirmed_at='2026-10-07T00:00:00Z' WHERE id='${ids.booking}'`).success,
  );
  ck(
    "notification insert (worker notified)",
    execDb(
      `INSERT INTO notifications (id, recipient_email, subject, body, status) VALUES ('${ids.notif}','qa-w@example.com','Confirmed!','Body','pending')`,
    ).success,
  );
  ck(
    "auto system message insert",
    execDb(
      `INSERT INTO messages (id, sender_type, sender_id, recipient_id, content, booking_id, shift_id) VALUES ('${ids.msg}','business','${ids.biz}','${ids.worker}','Application Confirmed! Looking forward to working with you.','${ids.booking}','${ids.shift}')`,
    ).success,
  );
  ck(
    "shift filled update",
    execDb(`UPDATE shifts SET status='filled' WHERE id='${ids.shift}'`).success,
  );

  // 6. Messaging read path (server.ts getMessagesBetween mark-read)
  ck(
    "mark-read update",
    execDb(`UPDATE messages SET is_read = 1 WHERE sender_id='${ids.worker}' AND recipient_id='${ids.biz}'`).success,
  );

  // 7. Rating (rate.tsx submitRating)
  ck(
    "rating insert",
    execDb(
      `INSERT INTO ratings (id, booking_id, rater_type, rater_id, subject_type, subject_id, score, review) VALUES ('${ids.rating}','${ids.booking}','business','${ids.biz}','worker','${ids.worker}',5,'Great')`,
    ).success,
  );

  // 8. Worker notification queue (server.ts queueNotification)
  ck(
    "queueNotification insert",
    execDb(
      `INSERT INTO notifications (id, recipient_email, subject, body, status) VALUES ('${ids.notif2}','qa-w@example.com','New message on Roster','Body','pending')`,
    ).success,
  );

  // ============ READ PATHS ============
  ck("getShifts read", queryDb(`SELECT id, role_type, date, status FROM shifts WHERE id='${ids.shift}'`).length === 1);
  ck(
    "business dashboard bookings join",
    queryDb(
      `SELECT b.id as booking_id, s.id as shift_id, w.id as worker_id FROM bookings b JOIN shifts s ON b.shift_id = s.id JOIN workers w ON b.worker_id = w.id WHERE b.business_id = '${ids.biz}'`,
    ).length === 1,
  );
  ck(
    "worker dashboard bookings join",
    queryDb(
      `SELECT b.id as booking_id, s.id as shift_id, bus.id as business_id FROM bookings b JOIN shifts s ON b.shift_id = s.id JOIN businesses bus ON s.business_id = bus.id WHERE b.worker_id = '${ids.worker}'`,
    ).length === 1,
  );
  ck(
    "getConversations business→worker",
    queryDb(
      `SELECT DISTINCT w.id FROM bookings b JOIN workers w ON b.worker_id = w.id WHERE b.business_id = '${ids.biz}'`,
    ).length === 1,
  );
  ck(
    "getMessagesBetween select",
    queryDb(
      `SELECT * FROM messages WHERE (sender_id='${ids.biz}' AND recipient_id='${ids.worker}') OR (sender_id='${ids.worker}' AND recipient_id='${ids.biz}') ORDER BY created_at ASC`,
    ).length === 1,
  );
  ck("admin stats reads", queryDb("SELECT COUNT(*) as count FROM businesses")[0] !== undefined);

  console.log(`\n${pass} passed, ${fail} failed`);
} catch (error) {
  console.error("verify-launch-qa error:", error);
  process.exitCode = 2;
} finally {
  // cleanup — delete every qa-* fixture row
  execDb(`DELETE FROM bookings WHERE id='${ids.booking}'`);
  execDb(`DELETE FROM shifts WHERE id='${ids.shift}'`);
  execDb(`DELETE FROM businesses WHERE id='${ids.biz}'`);
  execDb(`DELETE FROM workers WHERE id='${ids.worker}'`);
  execDb(`DELETE FROM messages WHERE id='${ids.msg}' OR sender_id IN ('${ids.biz}','${ids.worker}')`);
  execDb(`DELETE FROM notifications WHERE id IN ('${ids.notif}','${ids.notif2}') OR recipient_email='qa-w@example.com'`);
  execDb(`DELETE FROM worker_certifications WHERE id='${ids.cert}'`);
  execDb(`DELETE FROM worker_availability WHERE id='${ids.slot}'`);
  execDb(`DELETE FROM ratings WHERE id='${ids.rating}'`);
}
process.exit(process.exitCode ?? (fail === 0 ? 0 : 1));