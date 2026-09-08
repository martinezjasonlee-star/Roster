# Cloudflare Error 1033 — Root Cause, Remediation, and Verification

**Date:** 2026-09-08
**Task:** Eliminate Cloudflare Error 1033 with resilient production hosting
**Domain:** roster-work.com (served via Cloudflare → Cloudflare Tunnel → localhost:3000)

---

## 1. Root Cause

`roster-work.com` is proxied through Cloudflare (proxied A records `104.21.87.14` /
`172.67.139.37`). The origin is not reachable over the public internet — it is a
**named Cloudflare Tunnel** (tunnel `20fbdf58-cab1-4c62-af00-0d2899eed036`, config in
`/home/team/shared/config.yml`) whose `cloudflared` process connected out to the
Cloudflare edge and served the site from `localhost:3000`.

**Why the site went down (Error 1033 / HTTP 530):**

1. The `cloudflared` process was started **manually** — nothing supervised it, so it
   died when the sandbox environment was replaced/restarted and was never brought
   back.
2. The tunnel's **credentials lived at `/root/.cloudflared/credentials.json`** — inside
   the root home directory, which is wiped on environment replacement. Without the
   credentials file (or a `CLOUDFLARE_TUNNEL_TOKEN`), `cloudflared` cannot
   authenticate as the named tunnel, so the Cloudflare edge has no origin to reach:
   visitors get **Error 1033** / HTTP 530.

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
- **Resolves credentials** from, in order: `CLOUDFLARE_TUNNEL_TOKEN` env →
  `/home/team/shared/.cloudflared/credentials.json` →
  `/root/.cloudflared/credentials.json` (legacy path, included for migration).
- **Persists credentials** into `/home/team/shared/.cloudflared/credentials.json` —
  a team-owned, environment-persistent location — so a future environment
  replacement no longer loses them.
- **Generates its own config** (`/home/team/shared/.cloudflared/config.yml`) that
  points `credentials-file` at the persisted copy and routes `roster-work.com` +
  `www.roster-work.com` → `http://localhost:3000` (404 for everything else).
- **Supervises the process**: on unexpected exit it restarts with backoff (up to 30
  times, 5s apart), resetting the counter once a tunnel connection registers.
- **Runs verifiable health checks** every 30s: `localhost:3000` (origin) and
  `https://roster-work.com` (public path through the tunnel). Results are appended to
  `/home/team/shared/tunnel_health.json` (last 50 entries) and to
  `.run/tunnel.log`.

Existing resilience in `serve.ts` (port takeover across user boundaries, EADDRINUSE
retry) continues to make restarts of the site server safe and idempotent.

## 3. Verification Evidence (2026-09-08)

| Check | Result |
|---|---|
| `https://d1359b97b85bb1aaccddfea0390a4eee.ctonew.app` (platform live) | **200** |
| `https://d1359b97b85bb1aaccddfea0390a4eee-dev.ctonew.app` (platform working) | **200** |
| `http://localhost:3000` (origin) | **200** |
| `https://roster-work.com` (custom domain via tunnel) | 530 (tunnel down — see limitations) |
| `cloudflared` binary installed | v2026.8.3 at `/home/team/shared/bin/cloudflared` |
| `resolveCredentials()` with no creds | `null` (clean log with exact remedy) |
| `ensureGeneratedConfig()` | true, correct tunnel id + persistent credentials path |
| `checkTunnelHealth()` | `originOk: true, publicOk: false` written to `tunnel_health.json` |
| Notification dispatch (serve.ts interval + script) | verified 2 rows dispatched, log + `sent_at` correct |

## 4. Limitations & Exact Recovery Steps

**Limitation:** the tunnel credentials were wiped with `/root` and are not recoverable
from the sandbox — they live in the owner's Cloudflare account. Until either is
provided, `roster-work.com` will continue to return 530/1033. **This is the only
remaining blocker for the custom domain**; the platform-hosted site is fully live.

**One-time recovery (owner):** do **either** of the following, then restart the site
server (or simply wait — `serve.ts` retries `bootstrapTunnel` on every restart):

1. Set the **tunnel token** env var: `CLOUDFLARE_TUNNEL_TOKEN` (Zero Trust →
   Networks → Tunnels → `roster-work` → Configure → token), **or**
2. Drop the tunnel's **`credentials.json`** at
   `/home/team/shared/.cloudflared/credentials.json` (the launcher also accepts the
   legacy `/root/.cloudflared/credentials.json` and copies it into the shared path).

Once either exists, the supervisor connects within seconds and
`tunnel_health.json` will flip `publicOk` to `true`. No other manual steps are
needed — restart-proof by construction.

## 5. Monitoring

- `.run/tunnel.log` — all launcher + cloudflared output.
- `/home/team/shared/tunnel_health.json` — time-series health evidence (origin +
  public reachability, last 50 entries).