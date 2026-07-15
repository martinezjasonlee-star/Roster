import { createServerFn } from "@tanstack/react-start";
import { execSync } from "node:child_process";
import crypto from "node:crypto";

const DB_PATH = "/home/team/.data/agent-team-cc229006.db";

// Helper to safely execute a SQL SELECT query and return rows as JSON
function queryDb<T>(sql: string): T[] {
  try {
    const escapedSql = sql.replace(/"/g, '\\"');
    const result = execSync(`sqlite3 -json ${DB_PATH} "${escapedSql}"`);
    const output = result.toString().trim();
    if (!output) return [];
    return JSON.parse(output) as T[];
  } catch (error) {
    console.error("Query DB Error:", error, "SQL was:", sql);
    return [];
  }
}

// Helper to safely execute SQL write statements (INSERT, UPDATE, DELETE)
function execDb(sql: string): { success: boolean } {
  try {
    const escapedSql = sql.replace(/"/g, '\\"');
    execSync(`sqlite3 ${DB_PATH} "${escapedSql}"`);
    return { success: true };
  } catch (error) {
    console.error("Exec DB Error:", error, "SQL was:", sql);
    return { success: false };
  }
}

// Helper to escape single quotes for SQL insertion
function esc(str: string | undefined | null): string {
  if (!str) return "";
  return str.replace(/'/g, "''");
}

/**
 * 1. getUserByEmail
 * Looks up a user in the database by their Clerk email address.
 * Businesses and workers reside in separate tables.
 */
export const getUserByEmail = createServerFn({ method: "GET" })
  .validator((email: string) => email)
  .handler(async ({ data: email }) => {
    if (!email) return { type: null, id: null, details: null };

    const businesses = queryDb<any>(`SELECT * FROM businesses WHERE email = '${esc(email)}' LIMIT 1`);
    if (businesses.length > 0) {
      return { type: "business", id: businesses[0].id, details: businesses[0] };
    }

    const workers = queryDb<any>(`SELECT * FROM workers WHERE email = '${esc(email)}' LIMIT 1`);
    if (workers.length > 0) {
      return { type: "worker", id: workers[0].id, details: workers[0] };
    }

    return { type: null, id: null, details: null };
  });

/**
 * 2. getBusinessDashboard
 * Gathers all data required for the Business Venue Dashboard.
 */
export const getBusinessDashboard = createServerFn({ method: "GET" })
  .validator((email: string) => email)
  .handler(async ({ data: email }) => {
    const userRes = await getUserByEmail({ data: email });
    if (userRes.type !== "business" || !userRes.id) {
      throw new Error("Business user not found for " + email);
    }
    const businessId = userRes.id;

    // Fetch posted shifts
    const shifts = queryDb<any>(`SELECT * FROM shifts WHERE business_id = '${businessId}' ORDER BY date DESC, start_time DESC`);

    // Fetch all bookings (applicants) for this business's shifts
    const bookings = queryDb<any>(`
      SELECT b.id as booking_id, b.status as booking_status, b.applied_at, 
             s.id as shift_id, s.role_type, s.date, s.start_time, s.end_time, s.hourly_rate,
             w.id as worker_id, w.first_name, w.last_name, w.email as worker_email, w.phone as worker_phone, 
             w.photo_url, w.years_experience, w.reliability_score
      FROM bookings b
      JOIN shifts s ON b.shift_id = s.id
      JOIN workers w ON b.worker_id = w.id
      WHERE b.business_id = '${businessId}'
      ORDER BY b.applied_at DESC
    `);

    // Aggregate stats
    const openShifts = queryDb<any>(`SELECT COUNT(*) as count FROM shifts WHERE business_id = '${businessId}' AND status = 'open'`);
    const confirmedShifts = queryDb<any>(`SELECT COUNT(*) as count FROM bookings WHERE business_id = '${businessId}' AND status = 'confirmed'`);
    const pendingApplicants = queryDb<any>(`SELECT COUNT(*) as count FROM bookings WHERE business_id = '${businessId}' AND status = 'pending'`);

    return {
      business: userRes.details,
      shifts,
      bookings,
      stats: {
        openShifts: openShifts[0]?.count ?? 0,
        confirmedShifts: confirmedShifts[0]?.count ?? 0,
        pendingApplicants: pendingApplicants[0]?.count ?? 0,
      }
    };
  });

/**
 * 3. getWorkerDashboard
 * Gathers all data required for the Worker Dashboard.
 */
export const getWorkerDashboard = createServerFn({ method: "GET" })
  .validator((email: string) => email)
  .handler(async ({ data: email }) => {
    const userRes = await getUserByEmail({ data: email });
    if (userRes.type !== "worker" || !userRes.id) {
      throw new Error("Worker user not found for " + email);
    }
    const workerId = userRes.id;

    // Fetch shifts applied to
    const bookings = queryDb<any>(`
      SELECT b.id as booking_id, b.status as booking_status, b.applied_at,
             s.id as shift_id, s.role_type, s.date, s.start_time, s.end_time, s.hourly_rate, s.location_name,
             bus.id as business_id, bus.name as business_name, bus.phone as business_phone, bus.email as business_email
      FROM bookings b
      JOIN shifts s ON b.shift_id = s.id
      JOIN businesses bus ON s.business_id = bus.id
      WHERE b.worker_id = '${workerId}'
      ORDER BY s.date ASC, s.start_time ASC
    `);

    // Aggregate stats
    const upcoming = queryDb<any>(`SELECT COUNT(*) as count FROM bookings WHERE worker_id = '${workerId}' AND status = 'confirmed'`);
    const completed = queryDb<any>(`SELECT COUNT(*) as count FROM bookings WHERE worker_id = '${workerId}' AND status = 'completed'`);
    const applied = queryDb<any>(`SELECT COUNT(*) as count FROM bookings WHERE worker_id = '${workerId}'`);

    return {
      worker: userRes.details,
      bookings,
      stats: {
        upcoming: upcoming[0]?.count ?? 0,
        completed: completed[0]?.count ?? 0,
        applied: applied[0]?.count ?? 0,
      }
    };
  });

/**
 * 4. updateBookingStatus
 * Updates the status of an application/booking (accepting/declining/cancelling).
 */
export const updateBookingStatus = createServerFn({ method: "POST" })
  .validator((data: { bookingId: string; status: "confirmed" | "declined" | "cancelled" | "completed" | "no_show" }) => data)
  .handler(async ({ data }) => {
    const { bookingId, status } = data;
    const now = new Date().toISOString();
    
    let sql = `UPDATE bookings SET status = '${status}'`;
    if (status === "confirmed") {
      sql += `, confirmed_at = '${now}'`;
    } else if (status === "completed") {
      sql += `, completed_at = '${now}'`;
    }
    sql += ` WHERE id = '${bookingId}'`;

    const result = execDb(sql);

    // If confirmed, update shift status if needed (e.g. if open and now fully staffed)
    if (status === "confirmed" && result.success) {
      const bInfo = queryDb<any>(`SELECT shift_id, business_id, worker_id FROM bookings WHERE id = '${bookingId}' LIMIT 1`);
      if (bInfo.length > 0) {
        const shiftId = bInfo[0].shift_id;
        const shift = queryDb<any>(`SELECT workers_needed FROM shifts WHERE id = '${shiftId}' LIMIT 1`);
        const confirmedCount = queryDb<any>(`SELECT COUNT(*) as count FROM bookings WHERE shift_id = '${shiftId}' AND status = 'confirmed'`);
        if (shift.length > 0 && confirmedCount.length > 0) {
          if (confirmedCount[0].count >= shift[0].workers_needed) {
            execDb(`UPDATE shifts SET status = 'filled' WHERE id = '${shiftId}'`);
          }
        }

        // Send an automated confirmation system message to start the thread
        const msgId = crypto.randomUUID();
        execDb(`
          INSERT INTO messages (id, sender_type, sender_id, recipient_id, content, booking_id, shift_id)
          VALUES ('${msgId}', 'business', '${bInfo[0].business_id}', '${bInfo[0].worker_id}', 'Application Confirmed! Looking forward to working with you.', '${bookingId}', '${shiftId}')
        `);
      }
    }

    return result;
  });

/**
 * 5. getConversations
 * Returns active connection threads for a user.
 */
export const getConversations = createServerFn({ method: "GET" })
  .validator((email: string) => email)
  .handler(async ({ data: email }) => {
    const userRes = await getUserByEmail({ data: email });
    if (!userRes.type || !userRes.id) return [];

    if (userRes.type === "business") {
      // Find all workers this business has interactions with (via bookings)
      const workers = queryDb<any>(`
        SELECT DISTINCT w.id, w.first_name, w.last_name, w.email, w.photo_url, w.role_type, b.id as booking_id
        FROM bookings b
        JOIN workers w ON b.worker_id = w.id
        WHERE b.business_id = '${userRes.id}'
      `);
      return workers.map((w: any) => ({
        id: w.id,
        name: `${w.first_name} ${w.last_name}`,
        subtitle: w.role_type ? w.role_type.charAt(0).toUpperCase() + w.role_type.slice(1) : "Worker",
        photo_url: w.photo_url,
        booking_id: w.booking_id,
        type: "worker",
      }));
    } else {
      // Find all businesses this worker has interactions with
      const businesses = queryDb<any>(`
        SELECT DISTINCT bus.id, bus.name, bus.email, bus.venue_type, b.id as booking_id
        FROM bookings b
        JOIN businesses bus ON b.business_id = bus.id
        WHERE b.worker_id = '${userRes.id}'
      `);
      return businesses.map((b: any) => ({
        id: b.id,
        name: b.name,
        subtitle: b.venue_type ? b.venue_type.charAt(0).toUpperCase() + b.venue_type.slice(1) : "Venue",
        booking_id: b.booking_id,
        type: "business",
      }));
    }
  });

/**
 * 6. getMessagesBetween
 * Fetches the list of messages in a single thread.
 */
export const getMessagesBetween = createServerFn({ method: "GET" })
  .validator((data: { email: string; otherUserId: string }) => data)
  .handler(async ({ data }) => {
    const { email, otherUserId } = data;
    const userRes = await getUserByEmail({ data: email });
    if (!userRes.type || !userRes.id) return [];

    const myId = userRes.id;
    // Mark incoming messages as read
    execDb(`UPDATE messages SET is_read = 1 WHERE sender_id = '${otherUserId}' AND recipient_id = '${myId}'`);

    // Fetch message history
    const msgs = queryDb<any>(`
      SELECT * FROM messages 
      WHERE (sender_id = '${myId}' AND recipient_id = '${otherUserId}') 
         OR (sender_id = '${otherUserId}' AND recipient_id = '${myId}')
      ORDER BY created_at ASC
    `);
    return msgs;
  });

/**
 * 7. sendMessage
 * Sends a message in a conversation thread.
 */
export const sendMessage = createServerFn({ method: "POST" })
  .validator((data: { email: string; recipientId: string; content: string; bookingId?: string; shiftId?: string }) => data)
  .handler(async ({ data }) => {
    const { email, recipientId, content, bookingId, shiftId } = data;
    const userRes = await getUserByEmail({ data: email });
    if (!userRes.type || !userRes.id) {
      throw new Error("Sender not found");
    }

    const myId = userRes.id;
    const id = crypto.randomUUID();

    // Deduce booking_id or shift_id if not supplied but exists in database
    let bId = bookingId || "general";
    if (bId === "general") {
      const activeBooking = queryDb<any>(`
        SELECT id, shift_id FROM bookings 
        WHERE (business_id = '${myId}' AND worker_id = '${recipientId}')
           OR (business_id = '${recipientId}' AND worker_id = '${myId}')
        LIMIT 1
      `);
      if (activeBooking.length > 0) {
        bId = activeBooking[0].id;
      }
    }

    const result = execDb(`
      INSERT INTO messages (id, sender_type, sender_id, recipient_id, content, booking_id, shift_id) 
      VALUES ('${id}', '${userRes.type}', '${myId}', '${recipientId}', '${esc(content)}', '${bId}', ${shiftId ? `'${shiftId}'` : "NULL"})
    `);

    return { success: result.success, messageId: id };
  });
