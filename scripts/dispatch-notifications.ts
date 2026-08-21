import { execSync } from "node:child_process";
import * as fs from "node:fs";

const DB_PATH = "/home/team/.data/agent-team-cc229006.db";
const LOG_PATH = "/home/team/shared/notification_dispatch.json";

export function dispatchNotifications(): number {
  try {
    const esc = (s: string) => s.replace(/'/g, "''");

    // 1. Read all pending notifications (status='pending')
    const pendingRes = execSync(`sqlite3 -json ${DB_PATH} "SELECT id, recipient_email, subject, body, created_at FROM notifications WHERE status = 'pending'"`).toString().trim();
    const pendingList = JSON.parse(pendingRes || "[]");

    if (pendingList.length === 0) {
      console.log("Dispatched 0 notifications");
      return 0;
    }

    // 2. Read existing dispatch log if it exists
    let existingLogs: any[] = [];
    if (fs.existsSync(LOG_PATH)) {
      try {
        const fileContent = fs.readFileSync(LOG_PATH, "utf-8").trim();
        existingLogs = JSON.parse(fileContent || "[]");
        if (!Array.isArray(existingLogs)) {
          existingLogs = [];
        }
      } catch (err) {
        console.error("Error reading dispatch log file, resetting to empty array:", err);
        existingLogs = [];
      }
    }

    const now = new Date().toISOString();

    // 3. Process each notification
    for (const notif of pendingList) {
      const dispatchEntry = {
        id: notif.id,
        recipient_email: notif.recipient_email,
        subject: notif.subject,
        body: notif.body,
        created_at: notif.created_at,
        dispatched_at: now,
      };

      existingLogs.push(dispatchEntry);

      // Mark the notification as status='sent' with sent_at=now
      execSync(`sqlite3 ${DB_PATH} "UPDATE notifications SET status = 'sent', sent_at = '${esc(now)}' WHERE id = '${esc(notif.id)}'"`);
    }

    // 4. Write back to dispatch log file with pretty print
    fs.writeFileSync(LOG_PATH, JSON.stringify(existingLogs, null, 2), "utf-8");

    console.log(`Dispatched ${pendingList.length} notifications`);
    return pendingList.length;
  } catch (error) {
    console.error("Error during notification dispatch:", error);
    return 0;
  }
}

// If run directly via CLI (e.g. bun scripts/dispatch-notifications.ts)
if (import.meta.main) {
  dispatchNotifications();
}
