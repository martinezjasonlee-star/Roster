# Email Notification Dispatch — Ops Runbook

The Roster marketplace queues transactional emails (shift posted, application received,
booking accepted/declined, new message) in the `notifications` table and delivers them
through a real provider handoff. This document is the operating contract.

## Pipeline
- `src/lib/server.ts` / route handlers call `queueNotification(...)` → inserts a row
  with `status='pending'`.
- `serve.ts` runs `dispatchNotifications()` every 60 seconds (also runnable directly:
  `bun scripts/dispatch-notifications.ts`).
- The dispatcher POSTs each eligible pending notification to the configured provider
  and marks the row `sent` **only after a 2xx response**.

## Provider contract (environment)
| Variable | Required | Purpose |
|---|---|---|
| `RESEND_API_KEY` | yes (for delivery) | Bearer token for the transactional provider (Resend API). Without it rows stay `pending` and are retried — never falsely marked `sent`. |
| `RESEND_API_URL` | no | Base URL override (default `https://api.resend.com`); test harnesses point this at a local mock. |
| `DISPATCH_FROM` | no | Sender address; must be a verified sender in the provider account (default `Roster <no-reply@roster-work.com>`). |

## Retry / failure semantics
- Per-row columns: `attempts`, `last_error`, `next_attempt_at`.
- On failure: attempts+1, `next_attempt_at` = now + 2^attempts minutes (capped at 60).
- After 5 attempts the row becomes `status='failed'` **and** an entry is appended to
  `/home/team/shared/notification_failures.json` — nothing is silently lost.
- Successful deliveries are appended to `/home/team/shared/notification_dispatch.json`
  (audit trail only; the source of truth is the DB row).

## Idempotency
- Only rows with `status='pending'` and `next_attempt_at <= now` are selected.
- Transitions use `UPDATE ... WHERE status='pending'`, so a row can never be
  double-delivered or double-marked.
- `ensureSchema()` creates the table/columns idempotently (self-heals DB resets).

## Testing
- `bun scripts/verify-dispatch.ts` — 19-check end-to-end suite against a local mock
  provider (never sends real mail). Expected: `19/19 checks passed`.

## What to do if deliveries stall
1. `sqlite3 /home/team/.data/agent-team-cc229006.db "SELECT status, COUNT(*) FROM notifications GROUP BY status"`
2. Pending rows with `status='failed'` show up in `/home/team/shared/notification_failures.json`.
3. Check `RESEND_API_KEY` is set and the provider account/from-address is verified
   (`printenv RESEND_API_KEY`). The dispatcher records the exact reason in
   `last_error` on each pending row.