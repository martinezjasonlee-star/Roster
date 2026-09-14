import { createServerFn } from "@tanstack/react-start";
import crypto from "node:crypto";
import { esc, execDb, queryDb } from "./db";

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

    try {
      // 1. Fetch current booking info (needed for shift & worker lookup)
      const bookings = queryDb<any>(`SELECT * FROM bookings WHERE id = '${esc(bookingId)}' LIMIT 1`);
      if (bookings.length === 0) {
        throw new Error("Booking not found");
      }
      const booking = bookings[0];

      // 2. Perform main UPDATE
      let queryStr = `UPDATE bookings SET status = '${esc(status)}'`;
      if (status === "confirmed") {
        queryStr += `, confirmed_at = '${esc(now)}'`;
      } else if (status === "completed") {
        queryStr += `, completed_at = '${esc(now)}'`;
      }
      queryStr += ` WHERE id = '${esc(bookingId)}'`;

      execDb(queryStr);

      // 3. If accepted ("confirmed") or declined, notify the worker!
      if (status === "confirmed" || status === "declined") {
        // Fetch worker, shift, and business names for personal touch
        const workerRes = queryDb<any>(`SELECT email, first_name FROM workers WHERE id = '${esc(booking.worker_id)}' LIMIT 1`);
        const worker = workerRes[0];
        const shiftRes = queryDb<any>(`SELECT role_type, date FROM shifts WHERE id = '${esc(booking.shift_id)}' LIMIT 1`);
        const shift = shiftRes[0];
        const businessRes = queryDb<any>(`SELECT name FROM businesses WHERE id = '${esc(booking.business_id)}' LIMIT 1`);
        const business = businessRes[0];

        if (worker && worker.email) {
          const roleName = shift?.role_type ? shift.role_type.charAt(0).toUpperCase() + shift.role_type.slice(1).replace(/_/g, " ") : "Shift";
          const shiftDate = shift?.date || "upcoming date";
          const bizName = business?.name || "Venue";

          let subject = "";
          let body = "";

          if (status === "confirmed") {
            subject = `Confirmed! Your Roster application for ${roleName} at ${bizName} is approved`;
            body = `Hi ${worker.first_name || "there"},\n\nCongratulations! ${bizName} has approved your application to cover their ${roleName} shift on ${shiftDate}.\n\nLog in to your Roster dashboard (https://roster-work.com/worker-dashboard) to view location, dress code, and details, and message the manager.\n\nBest,\nThe Roster Team`;
          } else {
            subject = `Update on your application for ${roleName} at ${bizName}`;
            body = `Hi ${worker.first_name || "there"},\n\nThank you for applying to cover the ${roleName} shift on ${shiftDate} at ${bizName}.\n\nUnfortunately, the venue has moved forward with another applicant for this particular shift. Don't worry — there are many other open opportunities on Roster!\n\nBrowse other available shifts here: https://roster-work.com/shifts/browse\n\nBest,\nThe Roster Team`;
          }

          const notifId = crypto.randomUUID();
          execDb(`INSERT INTO notifications (id, recipient_email, subject, body, status) VALUES ('${notifId}', '${esc(worker.email)}', '${esc(subject)}', '${esc(body)}', 'pending')`);
        }
      }

      // 4. Extra logic for "confirmed" state
      if (status === "confirmed") {
        const shiftId = booking.shift_id;
        const shiftRes = queryDb<any>(`SELECT workers_needed FROM shifts WHERE id = '${esc(shiftId)}' LIMIT 1`);
        const shift = shiftRes[0];
        const confirmedCountRes = queryDb<any>(`SELECT COUNT(*) as count FROM bookings WHERE shift_id = '${esc(shiftId)}' AND status = 'confirmed'`);
        const confirmedCount = confirmedCountRes[0];
        
        if (shift && confirmedCount) {
          if (confirmedCount.count >= shift.workers_needed) {
            execDb(`UPDATE shifts SET status = 'filled' WHERE id = '${esc(shiftId)}'`);
          }
        }

        // Send an automated confirmation system message to start the thread
        const msgId = crypto.randomUUID();
        execDb(`INSERT INTO messages (id, sender_type, sender_id, recipient_id, content, booking_id, shift_id) VALUES ('${msgId}', 'business', '${esc(booking.business_id)}', '${esc(booking.worker_id)}', 'Application Confirmed! Looking forward to working with you.', '${esc(bookingId)}', '${esc(shiftId)}')`);
      }

      return { success: true };
    } catch (e) {
      console.error("updateBookingStatus Error:", e);
      return { success: false };
    }
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

    try {
      const userRes = await getUserByEmail({ data: email });
      if (!userRes.type || !userRes.id) {
        throw new Error("Sender not found");
      }

      const myId = userRes.id;
      const id = crypto.randomUUID();

      // Deduce booking_id or shift_id if not supplied but exists in database
      let bId = bookingId || "general";
      if (bId === "general") {
        const activeBookingRes = queryDb<any>(`
          SELECT id, shift_id FROM bookings 
          WHERE (business_id = '${esc(myId)}' AND worker_id = '${esc(recipientId)}')
             OR (business_id = '${esc(recipientId)}' AND worker_id = '${esc(myId)}')
          LIMIT 1
        `);
        if (activeBookingRes.length > 0) {
          bId = activeBookingRes[0].id;
        }
      }

      // Insert message
      execDb(`
        INSERT INTO messages (id, sender_type, sender_id, recipient_id, content, booking_id, shift_id) 
        VALUES ('${id}', '${esc(userRes.type)}', '${esc(myId)}', '${esc(recipientId)}', '${esc(content)}', '${esc(bId)}', ${shiftId ? `'${esc(shiftId)}'` : "NULL"})
      `);

      // Retrieve recipient details and queue notification
      let recipientEmail = "";
      let recipientName = "";
      let senderName = "";

      if (userRes.type === "business") {
        // Sender: Business, Recipient: Worker
        const workerRes = queryDb<any>(`SELECT email, first_name FROM workers WHERE id = '${esc(recipientId)}' LIMIT 1`);
        if (workerRes.length > 0) {
          recipientEmail = workerRes[0].email;
          recipientName = workerRes[0].first_name;
        }
        const businessRes = queryDb<any>(`SELECT name FROM businesses WHERE id = '${esc(myId)}' LIMIT 1`);
        if (businessRes.length > 0) {
          senderName = businessRes[0].name;
        }
      } else {
        // Sender: Worker, Recipient: Business
        const businessRes = queryDb<any>(`SELECT email, name FROM businesses WHERE id = '${esc(recipientId)}' LIMIT 1`);
        if (businessRes.length > 0) {
          recipientEmail = businessRes[0].email;
          recipientName = businessRes[0].name;
        }
        const workerRes = queryDb<any>(`SELECT first_name, last_name FROM workers WHERE id = '${esc(myId)}' LIMIT 1`);
        if (workerRes.length > 0) {
          senderName = `${workerRes[0].first_name} ${workerRes[0].last_name}`;
        }
      }

      if (recipientEmail) {
        const notifId = crypto.randomUUID();
        const subject = `New message on Roster from ${senderName}`;
        const body = `Hi ${recipientName || "there"},\n\nYou have received a new message from ${senderName} on Roster:\n\n"${content}"\n\nReply directly in the Roster message center: https://roster-work.com/messaging\n\nBest,\nThe Roster Team`;
        
        execDb(`
          INSERT INTO notifications (id, recipient_email, subject, body, status)
          VALUES ('${notifId}', '${esc(recipientEmail)}', '${esc(subject)}', '${esc(body)}', 'pending')
        `);
      }

      return { success: true, messageId: id };
    } catch (e) {
      console.error("sendMessage Error:", e);
      return { success: false, messageId: null };
    }
  });

/**
 * 8. queueNotification
 * Helper to queue custom email notifications in the notifications table.
 */
export const queueNotification = createServerFn({ method: "POST" })
  .validator((data: { email: string; subject: string; body: string }) => data)
  .handler(async ({ data }) => {
    const id = crypto.randomUUID();
    try {
      execDb(`
        INSERT INTO notifications (id, recipient_email, subject, body, status)
        VALUES ('${id}', '${esc(data.email)}', '${esc(data.subject)}', '${esc(data.body)}', 'pending')
      `);
      return { success: true, notificationId: id };
    } catch (e) {
      console.error("queueNotification Error:", e);
      return { success: false, notificationId: null };
    }
  });
