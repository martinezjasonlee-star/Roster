# SQLite Access Layer — Ops Runbook

All database access in the Roster app goes through the shared module
`src/lib/db.ts`. This is the operating contract.

## Rules (conventions)
- **Never** use `bun:sqlite` — it breaks the TanStack Start SSR build. All reads and
  writes use the `sqlite3` CLI via `execSync`. Zero `bun:sqlite` occurrences must
  remain in `src/`, `scripts/`, or `serve.ts` (verify: `grep -rn "bun:sqlite" src/ scripts/ serve.ts`).
- **Path:** `DB_PATH` is defined once in `src/lib/db.ts`
  (`/home/team/.data/agent-team-cc229006.db`). Never hardcode the path elsewhere.
- **Escaping:** every value interpolated into SQL must go through `esc()` (single-quote
  doubling). Never insert `data.*` raw into a statement (see the SQL-injection fixes
  in `admin.verifyWorker` and `rate.submitRating`).

## Helpers
| Helper | Use | Behavior on error |
|---|---|---|
| `queryDb<T>(sql)` | SELECT | returns `[]`, logs the error + SQL |
| `execDb(sql)` | INSERT / UPDATE / DELETE | returns `{ success: false, error }`, logs; never throws |
| `esc(value)` | wrap every interpolated value | null/undefined → `""` |

Both helpers escape double-quotes inside the statement so the `sqlite3 "…"` shell
command stays intact, and use a 128 MB stdout buffer for photo/message payloads.

## Smoke test
- `bun scripts/verify-db.ts` — verifies DB path, escaping, INSERT→readback→DELETE
  round-trip, quote round-trip byte-exactness, and failure handling against the live
  DB. Expected output: all checks pass, invalid SQL returns `{success:false, error}`.

## Route/server convention
- `src/lib/server.ts` and every route handler import `{ esc, execDb, queryDb }` from
  `../lib/db` (relative path; no alias). New routes must do the same — do not inline
  `execSync`/`sqlite3`/`DB_PATH`/`esc` definitions.