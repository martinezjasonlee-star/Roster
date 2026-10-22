#!/usr/bin/env bash
# Restart-survival hook for the Cloudflare tunnel supervisor.
#
# The platform's managed-server loop re-runs `bun run dev` after every
# environment replacement (and on dev-server crashes). That loop is the only
# supervisor guaranteed to come back, so this script respawns the tunnel
# launcher (which self-heals `cloudflared` with backoff and writes health
# evidence to /home/team/shared/tunnel_health.json) before starting the dev
# server. Idempotent: if a launcher is already alive it does nothing.
set -u
cd "$(dirname "$0")/.." || exit 1
mkdir -p .run
if ! pgrep -f "scripts/tunnel-launcher.ts" >/dev/null 2>&1; then
  nohup bun scripts/tunnel-launcher.ts >> .run/tunnel-launcher.log 2>&1 < /dev/null &
fi
exec vite dev