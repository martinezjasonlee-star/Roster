#!/usr/bin/env bash
# External verification of the custom domain, with optional supervised-restart test.
#
#   bash scripts/verify-domains.sh            # sample both hostnames now
#   bash scripts/verify-domains.sh restart    # sample, kill the connector (supervisor
#                                        # restarts it), sample again
#
# Prints one line per hostname with the HTTP status and, on failure, the
# Cloudflare error code found in the body. Exit code 0 only when apex AND www
# both return 200.

set -uo pipefail

HOSTS=(roster-work.com www.roster-work.com)
LAUNCHER_LOG=/home/team/shared/site/.run/tunnel-launcher.log

probe() {
  local host="$1" code body
  body="$(mktemp)"
  code="$(curl -s -o "$body" -w '%{http_code}' -m 15 "https://$host" 2>/dev/null || echo 000)"
  local err=""
  err="$(grep -oE 'error code: [0-9]+|Error 1[0-9]{3}' "$body" 2>/dev/null | head -1)"
  rm -f "$body"
  printf '  %-24s HTTP %s%s\n' "$host" "$code" "${err:+  ($err)}"
  [[ "$code" == "200" ]]
}

sample() {
  local label="$1" fail=0
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $label"
  for h in "${HOSTS[@]}"; do probe "$h" || fail=1; done
  return $fail
}

status=0
sample "BEFORE" || status=1

if [[ "${1:-}" == "restart" ]]; then
  pid="$(pgrep -f 'cloudflared tunnel run' | head -1)"
  if [[ -z "$pid" ]]; then
    echo "!! no connector process running; nothing to restart"
    status=1
  else
    echo "-- killing connector pid=$pid; supervisor should respawn within ~10s"
    kill "$pid" 2>/dev/null
    for _ in $(seq 1 30); do
      sleep 1
      [[ -n "$(pgrep -f 'cloudflared tunnel run' | head -1)" ]] && break
    done
    newpid="$(pgrep -f 'cloudflared tunnel run' | head -1)"
    echo "-- connector now pid=${newpid:-NONE}"
    tail -4 "$LAUNCHER_LOG" 2>/dev/null | sed 's/^/   /'
    sleep 3
  fi
  sample "AFTER RESTART" || status=1
fi

if [[ $status -eq 0 ]]; then
  echo "RESULT: PASS - both hostnames return HTTP 200"
else
  echo "RESULT: FAIL - a hostname above is not 200 (see error code)"
fi
exit $status
