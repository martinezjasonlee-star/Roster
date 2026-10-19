# Roster — Launch Readiness Test Matrix (72-hour gate, task 01ecd3ad)

Date: 2026-10-12. Environment: shared team DB (`agent-team-cc229006.db`), platform live URL.
Standard: no claim of defect-freeness — critical paths pass, limitations documented, owner-dependent services marked.

## Summary
- **Release-blocking defects found: 3 schema-drift issues (breaking notification queueing, in-app messaging, business onboarding).** All fixed + verified. 1 mobile responsive defect fixed + verified.
- Automation suites: `verify-launch-qa.ts` **19/19 PASS** (was 12/19), `verify-db.ts` 19/19, `verify-dispatch.ts` 38/38, `bun run build` exit 0.
- All 13 routes return **200** on platform live URL (dev too). Mobile: no horizontal overflow on any page at 390/360/320px after fix.

## Fixes shipped (branch `roster/launch-qa-schema-guard`, PR #8)
1. **`src/lib/db.ts` — idempotent `ensureSchema()`** at module scope (server-side only): creates `notifications` table + indexes; adds `businesses.photo_url`, `messages.recipient_id` if missing (PRAGMA-guarded). Every process importing the DB layer now starts schema-correct — no more dependency on the first 60s dispatch tick, and no silent write failures.
2. **`scripts/dispatch-notifications.ts`** — deduped: imports the shared schema guard instead of its own duplicated DDL (eliminated `duplicate column` noise + single source of truth).
3. **`src/styles/app.css`** — Clerk card width constrained (`width:100%; max-width:100%` on `.cl-rootBox/.cl-cardBox/.cl-card`) to fix 8–10px horizontal overflow on mobile auth pages (and every logged-out protected route, which redirects there). Verified at 390/360/320px viewports in a real browser.
4. **`scripts/verify-launch-qa.ts` (new)** — reproducible suite: executes *exact* production SQL (worker/business onboarding, shift post, apply, booking decision + notification + auto-message, mark-read, rating, queueNotification, dashboard/conversation reads) with `qa-*` fixtures, cleans up after itself. Re-run anytime: `bun scripts/verify-launch-qa.ts`.

## Path-by-path matrix (platform URL, before → after fix)

| Path | Status | Evidence |
|---|---|---|
| `/` landing page | PASS | HTTP 200; mobile 390px sw=375 no overflow |
| `/terms`, `/privacy` | PASS | HTTP 200; mobile no overflow |
| `/auth/sign-in`, `/auth/sign-up` | PASS (was FAIL) | 200; **fixed mobile overflow** (sw 398→390 at 390px; also 360/320 clean). Full sign-in flow not exercised (needs live Clerk session/credentials) → **OWNER-DEPENDENT for e2e** |
| `/onboarding/worker` | PASS | 200; onboarding INSERT verified in QA suite (was broken: missing `businesses.photo_url` only affects business side) |
| `/onboarding/business` | PASS (was FAIL) | 200; INSERT with `photo_url` verified 19/19 |
| `/shifts/browse` | PASS | 200; encrypts browse SQL verified |
| `/worker-dashboard`, `/dashboard` | PASS | 200; dashboard reads verified |
| `/messaging` | PASS (was FAIL) | 200; send/mark-read/thread by `recipient_id` verified 19/19 |
| `/rate` | PASS | 200; rating insert verified |
| `/admin` | PASS | 200 |
| Shift post / apply / booking decision | PASS (was FAIL) | queueNotification + auto-message paths verified in QA suite |
| Notification queue | PASS | `verify-dispatch.ts` 38/38 (bounded batches, retries, lease, failure state). Live delivery needs `RESEND_API_KEY` + verified sender → **OWNER-DEPENDENT** (queued, never falsely marked sent) |
| Authentication (Clerk) | PARTIAL | Routes render 200; live sign-in needs owner's Clerk session — **OWNER-DEPENDENT** |
| Subscriptions/Stripe | EXCLUDED | Express account can't sell subscriptions; recurring billing excluded from this gate unless owner upgrades account → **OWNER-DEPENDENT** |
| Custom domain | BLOCKED | `roster-work.com` still HTTP 530 (Cloudflare public-hostname bound to old tunnel) → owner rebind required (see OWNER_ACTION_REQUIRED.md) |
| Mobile responsive | PASS (after fix) | Real-browser check at 390/360/320px on all 13 routes: no horizontal overflow |

## Known limitations (documented, per release standard)
- Live email delivery and Stripe billing not exercised — no real provider credentials in environment; not claimed as working.
- Clerk sign-in e2e requires live session; route-level render verified only.
- `roster-work.com` not launch-ready until external HTTP 200 post-restart check passes.

## How to re-verify (60 seconds)
```
cd /home/team/shared/site
bun scripts/verify-launch-qa.ts     # 19/19
bun scripts/verify-dispatch.ts      # 38/38 (requires branch with that script)
bun run build                       # exit 0
curl -s -o /dev/null -w "%{http_code}" https://d1359b97b85bb1aaccddfea0390a4eee.ctonew.app/  # 200
```