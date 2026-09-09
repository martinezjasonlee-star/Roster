import { execSync, spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Supervised Cloudflare Tunnel launcher for roster-work.com.
 *
 * Why this exists: the custom domain is served through a Cloudflare Tunnel
 * (named tunnel, ID in /home/team/shared/config.yml). Historically the
 * `cloudflared` process was started by hand and its credentials lived in
 * /root/.cloudflared/credentials.json — both of which disappear when the
 * sandbox environment is replaced, leaving the Cloudflare edge unable to
 * reach the origin (Error 1033 / HTTP 530).
 *
 * This module makes the tunnel durable:
 *   1. Credentials are discovered in BOTH the legacy /root/.cloudflared path
 *      and the team-owned /home/team/shared/.cloudflared path, and any copy
 *      found is persisted to the shared path so it survives environment
 *      replacement.
 *   2. A config is generated that points `credentials-file` at the persisted
 *      copy — no dependency on /root state.
 *   3. The cloudflared process runs supervised: on unexpected exit it is
 *      restarted with backoff, connection state is detected from its logs,
 *      and verifiable health checks (origin :3000 + public roster-work.com)
 *      are run on an interval and written to /home/team/shared/tunnel_health.json.
 *
 * `bootstrapTunnel()` is called from serve.ts at production startup and is
 * deliberately no-throw: a missing tunnel must never take the site down.
 * If no token and no credentials exist, it logs the exact one-time action
 * the owner needs to take (provide CLOUDFLARE_TUNNEL_TOKEN or drop the
 * credentials.json in the shared path) and returns cleanly.
 */

const SHARED_DIR = "/home/team/shared";
const BIN_DIR = path.join(SHARED_DIR, "bin");
const CLOUDFLARED_PATH = path.join(BIN_DIR, "cloudflared");
const PERSISTENT_CF_DIR = path.join(SHARED_DIR, ".cloudflared");
const PERSISTENT_CREDENTIALS = path.join(PERSISTENT_CF_DIR, "credentials.json");
const LEGACY_CREDENTIALS = "/root/.cloudflared/credentials.json";
/** Source of truth for the tunnel identity (ID or name line of config.yml). */
const SOURCE_CONFIG = path.join(SHARED_DIR, "config.yml");
/** Generated config that always points credentials-file at the persisted copy. */
const GENERATED_CONFIG = path.join(PERSISTENT_CF_DIR, "config.yml");
const LOG_FILE = "/home/team/shared/site/.run/tunnel.log";
const HEALTH_FILE = "/home/team/shared/tunnel_health.json";
const HEALTH_CHECK_MS = 30_000;

let tunnelProcess: ChildProcess | null = null;
let restartAttempts = 0;
let healthTimer: ReturnType<typeof setInterval> | null = null;
const MAX_RESTART_ATTEMPTS = 30;
const RESTART_DELAY_MS = 5_000;

function log(msg: string): void {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, `${line}\n`);
  } catch {
    /* log file is best-effort */
  }
}

async function ensureCloudflaredInstalled(): Promise<boolean> {
  if (fs.existsSync(CLOUDFLARED_PATH)) {
    log("cloudflared binary already installed.");
    return true;
  }
  log("cloudflared binary missing — downloading stable linux-amd64 build...");
  try {
    fs.mkdirSync(BIN_DIR, { recursive: true });
    fs.chmodSync(BIN_DIR, 0o775);
    const downloadUrl =
      "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64";
    execSync(`curl -L --fail --retry 3 "${downloadUrl}" -o "${CLOUDFLARED_PATH}"`, {
      timeout: 120_000,
    });
    fs.chmodSync(CLOUDFLARED_PATH, 0o775);
    log("cloudflared downloaded and made executable.");
    return true;
  } catch (error) {
    log(`Failed to download cloudflared: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Returns the preferred authentication source: "token" when
 * CLOUDFLARE_TUNNEL_TOKEN is set, otherwise the path of an existing
 * credentials.json (persistent team path first, legacy /root path second).
 */
export function resolveCredentials(): string | null {
  if (process.env.CLOUDFLARE_TUNNEL_TOKEN) return "token";
  for (const p of [PERSISTENT_CREDENTIALS, LEGACY_CREDENTIALS]) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** Copy whatever credentials exist into the team-owned path so they survive restarts. */
export function persistCredentials(src: string): void {
  try {
    if (src === PERSISTENT_CREDENTIALS && fs.existsSync(src)) return;
    fs.mkdirSync(PERSISTENT_CF_DIR, { recursive: true });
    fs.copyFileSync(src, PERSISTENT_CREDENTIALS);
    log(`Credentials persisted to ${PERSISTENT_CREDENTIALS}`);
  } catch (error) {
    log(`Could not persist credentials: ${(error as Error).message}`);
  }
}

/**
 * Generate a config.yml under the persistent dir that routes roster-work.com
 * (and www) to localhost:3000 and points credentials-file at the team-owned
 * copy. Reads the tunnel identity from the shared source config so manual
 * edits stay in one place.
 */
export function ensureGeneratedConfig(): boolean {
  try {
    const src = fs.readFileSync(SOURCE_CONFIG, "utf-8");
    const m = src.match(/^tunnel:\s*(.+)$/m);
    if (!m) {
      log(`Could not read tunnel id from ${SOURCE_CONFIG}`);
      return false;
    }
    const tunnel = m[1].trim();
    fs.mkdirSync(PERSISTENT_CF_DIR, { recursive: true });
    fs.writeFileSync(
      GENERATED_CONFIG,
      [
        `tunnel: ${tunnel}`,
        `credentials-file: ${PERSISTENT_CREDENTIALS}`,
        "ingress:",
        "  - hostname: roster-work.com",
        "    service: http://localhost:3000",
        "  - hostname: www.roster-work.com",
        "    service: http://localhost:3000",
        "  - service: http_status:404",
        "",
      ].join("\n"),
    );
    log(`Generated tunnel config at ${GENERATED_CONFIG} (tunnel: ${tunnel})`);
    return true;
  } catch (error) {
    log(`Failed to generate tunnel config: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Verifiable health checks: origin reachable on :3000 and the public custom
 * domain answering 2xx through the tunnel. Writes each result to
 * /home/team/shared/tunnel_health.json (keeps last 50 entries).
 */
export function checkTunnelHealth(): { originOk: boolean; publicOk: boolean; time: string } {
  const result = { originOk: false, publicOk: false, time: new Date().toISOString() };
  try {
    execSync("curl -sf -o /dev/null --max-time 8 http://localhost:3000", {
      stdio: "ignore",
      timeout: 10_000,
    });
    result.originOk = true;
  } catch {
    result.originOk = false;
  }
  try {
    execSync("curl -sf -o /dev/null --max-time 12 https://roster-work.com", {
      stdio: "ignore",
      timeout: 15_000,
    });
    result.publicOk = true;
  } catch {
    result.publicOk = false;
  }
  try {
    let history: typeof result[] = [];
    if (fs.existsSync(HEALTH_FILE)) {
      try {
        history = JSON.parse(fs.readFileSync(HEALTH_FILE, "utf-8"));
        if (!Array.isArray(history)) history = [];
      } catch {
        history = [];
      }
    }
    history.push(result);
    const trimmed = history.slice(-50);
    fs.writeFileSync(HEALTH_FILE, JSON.stringify(trimmed, null, 2), "utf-8");
  } catch {
    /* health file best-effort */
  }
  return result;
}

function startHealthMonitor(): void {
  if (healthTimer) return;
  healthTimer = setInterval(() => {
    const h = checkTunnelHealth();
    log(`health: origin=${h.originOk ? "ok" : "FAIL"} public=${h.publicOk ? "ok" : "FAIL"}`);
  }, HEALTH_CHECK_MS);
  // First check right away so evidence exists without waiting 30s.
  const h = checkTunnelHealth();
  log(`health (initial): origin=${h.originOk ? "ok" : "FAIL"} public=${h.publicOk ? "ok" : "FAIL"}`);
}

export function startTunnelSupervisor(): void {
  const cred = resolveCredentials();
  if (!cred) {
    log(
      "Cannot start Cloudflare Tunnel: neither CLOUDFLARE_TUNNEL_TOKEN nor credentials.json " +
        `(checked ${PERSISTENT_CREDENTIALS} and ${LEGACY_CREDENTIALS}) is present. ` +
        "The custom domain roster-work.com will keep returning Cloudflare 530/1033 until one is provided. " +
        "One-time fix: set CLOUDFLARE_TUNNEL_TOKEN or place the tunnel's credentials.json at " +
        `${PERSISTENT_CREDENTIALS}.`,
    );
    return;
  }
  if (!ensureGeneratedConfig()) return;

  let args: string[];
  if (cred === "token") {
    log("Running tunnel with CLOUDFLARE_TUNNEL_TOKEN.");
    args = ["tunnel", "run", "--token", process.env.CLOUDFLARE_TUNNEL_TOKEN!];
  } else {
    persistCredentials(cred);
    log(`Running tunnel with credentials from ${PERSISTENT_CREDENTIALS}.`);
    args = ["tunnel", "--config", GENERATED_CONFIG, "run"];
  }

  try {
    tunnelProcess = spawn(CLOUDFLARED_PATH, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });
    tunnelProcess.stdout?.on("data", (data) => handleTunnelOutput(data.toString()));
    tunnelProcess.stderr?.on("data", (data) => handleTunnelOutput(data.toString()));
    tunnelProcess.on("error", (err) => log(`cloudflared spawn error: ${err.message}`));
    tunnelProcess.on("close", (code) => {
      log(`cloudflared exited with code ${code}`);
      tunnelProcess = null;
      if (restartAttempts < MAX_RESTART_ATTEMPTS) {
        restartAttempts++;
        log(
          `Restarting cloudflared in ${RESTART_DELAY_MS / 1000}s ` +
            `(attempt ${restartAttempts}/${MAX_RESTART_ATTEMPTS})...`,
        );
        setTimeout(() => startTunnelSupervisor(), RESTART_DELAY_MS);
      } else {
        log(`Max restart attempts reached — tunnel supervisor suspended (see ${LOG_FILE}).`);
      }
    });
    startHealthMonitor();
  } catch (error) {
    log(`Failed to spawn cloudflared: ${(error as Error).message}`);
  }
}

function handleTunnelOutput(line: string): void {
  try {
    fs.appendFileSync(LOG_FILE, `[cloudflared] ${line}`);
  } catch {
    /* best-effort */
  }
  if (line.includes("Registered tunnel connection") || line.includes("Connection registered")) {
    log("Cloudflare Tunnel connection established.");
    restartAttempts = 0; // healthy — reset backoff
  }
}

export async function bootstrapTunnel(): Promise<void> {
  try {
    const installed = await ensureCloudflaredInstalled();
    if (installed) {
      startTunnelSupervisor();
    } else {
      log("cloudflared not available; tunnel supervisor not started.");
    }
  } catch (error) {
    log(`bootstrapTunnel failed: ${(error as Error).message}`);
  }
}

// If run directly via CLI: bun scripts/tunnel-launcher.ts
if (import.meta.main) {
  void bootstrapTunnel();
}