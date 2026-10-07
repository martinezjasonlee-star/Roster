# Cloudflare Error 1033 — Root Cause, Remediation, and Verification
**Date:** 2026-09-08 (updated 2026-10-02)
**Task:** Eliminate Cloudflare Error 1033 with resilient production hosting
**Domain:** roster-work.com (served via Cloudflare → Cloudflare Tunnel → localhost:3000)

---
## 1. Root Cause
`roster-work.com` is proxied through Cloudflare (proxied A records `104.21.87.14` /
`172.67.139.37`). The origin is not reachable over the public internet — it is a
**named Cloudflare Tunnel** (historically tunnel `20fbdf58-cab1-4c62-af00-0d2899eed036`,
config in `/home/team/shared/config.yml`) whose `cloudflared` process connected out to the
Cloudflare edge and served the site from `localhost:3000`.

**Why the site went down (Error 1033 / HTTP 530):**
1. The `cloudflared` process was started **manually** — nothing supervised it, so it
   died when the sandbox environment was replaced/restarted and was never brought
   back.
2. The tunnel's **credentials lived at `/root/.cloudflared/credentials.json`** — inside
   the root home directory, which is wiped on environment replacement. Without the
   credentials file (or a tunnel token), `cloudflared` cannot authenticate as the
   named tunnel, so the Cloudflare edge has no origin to reach: visitors get
   **Error 1033** / HTTP 530.

The site itself was never broken — the platform's own hosting
(`https://d1359b97b85bb1aaccddfea0390a4eee.ctonew.app`) kept returning 200 the whole
time. Only the custom-domain tunnel path was down.

## 2. Durable Architecture (what changed)
### 2a. Platform persistent hosting is the primary production path
The site ships through the platform's persistent publishing flow (`publish_site`),
which is environment-independent and needs no manually run process. **This is the
resilient path** — verified 200 during the incident.

### 2b. Supervised Cloudflare Tunnel (`scripts/tunnel-launcher.ts`)
`serve.ts` now calls `bootstrapTunnel()` at every production startup (no-throw). The
launcher:
- **Downloads/installs** the `cloudflared` binary to the team-owned path
  `/home/team/shared/bin/cloudflared` (present: v2026.8.3).
- **Resolves the tunnel token** from, in order: `CLOUDFLARE_TUNNEL_TOKEN` env → the
  `api_key` env var (the owner's secret lands there as the full
  `cloudflared.exe service install <token>` one-liner Cloudflare prints) → a
  persisted token copy at `/home/team/shared/.cloudflared/tunnel-token` →
  `/home/team/shared/.cloudflared/credentials.json` (legacy) →
  `/root/.cloudflared/credentials.json` (legacy migration path).
- **Normalizes the token**: the owner's saved value is frequently the exact
  `cloudflared.exe service install <token>` string Cloudflare prints; the launcher
  strips that prefix so it runs `cloudflared tunnel run --token <bare-token>`.
- **Persists the discovered token** into `/home/team/shared/.cloudflared/tunnel-token`
  (mode 0600) — a team-owned, environment-persistent location — so a future
  environment replacement no longer loses it even if the env-var name changes.
- **Runs token-based in the primary path** (a token-bound tunnel uses Cloudflare's
  remotely-managed ingress config served from the dashboard; no local config.yml
  required). The legacy `credentials.json` + generated `config.yml` path remains as a
  fallback for locally-managed tunnels.
- **Supervises the process**: on unexpected exit it restarts with backoff (up to 30
  times, 5s apart), resetting the counter once a tunnel connection registers.
- **Runs verifiable health checks** every 30s: `localhost:3000` (origin) and
  `https://roster-work.com` (public path through the tunnel). Results are appended to
  `/home/team/shared/tunnel_health.json` (last 50 entries) and to `.run/tunnel.log`.

## 3. Verification Evidence (2026-10-02)
| Check | Result |
|---|---|
| `https://d1359b97b85bb1aaccddfea0390a4eee.ctonew.app` (platform live) | **200** |
| `http://localhost:3000` (origin) | **200** |
| `https://roster-work.com` (custom domain via tunnel) | **530 / error 1033** — see §4 |
| Tunnel token discovery (`resolveToken()`) | found, len 184, from `api_key` env |
| `cloudflared tunnel run --token` | **4 edge connections registered** (sea/pdx, QUIC) |
| Token persisted | `/home/team/shared/.cloudflared/tunnel-token` (0600) |
| **Restart-survival** (SIGKILL cloudflared pid 1371) | **PASS**: supervisor re-spawned pid 1441, 4 connections re-registered in ~2s |
| `checkTunnelHealth()` | `originOk: true, publicOk: false` written to `tunnel_health.json` |

The token decodes to tunnel `a1da8705-66f8-4646-88b7-fbfba98754e8` (account
`736c43eec02b33cc698dd5f4a798a001`) — **not** the historical `20fbdf58-…` in the old
local config.

| **Real environment-replacement survival (2026-10-07)** | **PASS**: sandbox was replaced (all processes killed); relaunch of the launcher found the persisted token and re-registered all 4 edge connections in ~3s |

## 4. Remaining Blocker (owner-side, as of 2026-10-07)
The tunnel **connector is now healthy and restart-proof**, but the Cloudflare **DNS
binding for `roster-work.com` still points at the old tunnel** (`20fbdf58-…`), which
has no live connector — so the edge returns 1033 and **zero requests reach the new,
connected tunnel** (confirmed: no request lines in `.run/tunnel.log` while the
connector is up).

**Exact owner action (one-time, Cloudflare dashboard):** in **Zero Trust → Networks →
Tunnels**, open the tunnel whose token was saved (tunnel id
`a1da8705-66f8-4646-88b7-fbfba98754e8`, or whatever name the account uses), and make
sure the **Public Hostname** `roster-work.com` (and `www.roster-work.com` if desired)
points to `http://localhost:3000`. The dashboard rewrites the DNS record
(CNAME → `<tunnel-id>.cfargotunnel.com`) automatically. Alternatively provide the
token for the tunnel that `roster-work.com` is *already* bound to.

Once the binding matches the running tunnel, `tunnel_health.json` flips `publicOk` to
`true` within a health-check cycle (≤30s) — no sandbox restart needed; the supervisor
is live now. **Verification command for the owner/lead:** `curl -sI -o /dev/null -w '%{http_code}\n' https://roster-work.com` → must be `200`.

## 5. Monitoring
- `.run/tunnel.log` — all launcher + cloudflared output.
- `/home/team/shared/tunnel_health.json` — time-series health evidence (origin +
  public reachability, last 50 entries).