#!/usr/bin/env node
/**
 * Reproducible zero-network local Supabase stack (ADR-0001 §1.2c evidence).
 *
 * Runs the SAME supabase-tables storage path the app uses in production
 * against a REAL Postgres + PostgREST on this machine with NO network and NO
 * admin rights — so the SQL commit cost can be measured in isolation (the
 * "Zero-network SQL commit baseline" in docs/LOAD_TESTING.md). Everything the
 * ad-hoc assembly once did by hand is now one checked-in tool:
 *
 *   1. Postgres 18.4 embedded binaries (zonky, via the `embedded-postgres`
 *      npm devDependency — initdb/start on a scratch data dir, no admin).
 *   2. PostgREST single exe + bundled libpq/ICU DLLs, downloaded from the
 *      GitHub release and cached under the state dir. v12.2.12 is pinned: the
 *      v16.x exe does not load on this machine, v12.2.12 does.
 *   3. A tiny gateway proxy that strips supabase-js's hard-coded `/rest/v1`
 *      prefix onto bare PostgREST (Supabase's gateway does this; a bare
 *      PostgREST serves at `/` and 404s `/rest/v1`).
 *   4. server/migrations/001-015 applied verbatim EXCEPT the pg_cron block
 *      of 003 (pg_cron is Supabase-managed and absent on vanilla PG), after
 *      creating the anon/authenticated/service_role roles and the schema/
 *      table/function grants Supabase applies by default. PostgREST runs
 *      requests AS service_role (db-anon-role), so RLS policies scoped
 *      `TO service_role` behave exactly like the hosted project.
 *
 * Subcommands:
 *   install    Fetch + unpack the pinned PostgREST release into the cache
 *              (Postgres binaries come from the npm devDependency; run
 *              `npm install` first).
 *   start      Init the data dir (first run), scaffold roles/grants, apply any
 *              pending migrations, launch Postgres + PostgREST + the proxy,
 *              wait until the full stack answers, and print the env a
 *              supabase-tables run needs. Idempotent: re-running just checks.
 *   status     Report which components are up and print the connection env.
 *   baseline   Run the load harness standard baseline against the stack
 *              (auto-verifies persisted rows + self-cleans through the proxy).
 *              Extra args after the subcommand pass through to
 *              tools/load-test.mjs (e.g. `baseline --level smoke`).
 *   stop       Stop the proxy, PostgREST, then Postgres (graceful).
 *   clean      stop + delete the whole state dir (data, cache, logs, pids).
 *   proxy      Internal: run the gateway proxy in the foreground. `start`
 *              spawns this detached; not for direct use.
 *   all        install-if-needed + start + baseline + stop. The one-shot
 *              reproducible command behind `npm run load-test:local-supabase`.
 *
 * Env overrides (all optional):
 *   LOCAL_SUPABASE_STATE_DIR   state root (default <repo>/data/runtime/
 *                              local-supabase — data/runtime is gitignored)
 *   LOCAL_SUPABASE_PG_PORT         default 55432
 *   LOCAL_SUPABASE_POSTGREST_PORT  default 55332
 *   LOCAL_SUPABASE_PROXY_PORT      default 55232
 *   LOCAL_SUPABASE_LOAD_LEVEL      baseline level (default standard)
 *   LOCAL_SUPABASE_LOAD_ARGS       extra load-test args for `baseline`/`all`
 *
 * Ports 55432/55332/55232 are distinct from every other spawned port in the
 * repo (dev 3000/8787, e2e 8873-8884, agents 8877/8878, load harness 8897,
 * contract 8898, workflow 8899, ...) and are registered claims in
 * tools/check-spawn-port-collisions.mjs.
 */
import { spawn, spawnSync } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import pg from "pg";
import { splitStatements } from "./apply-wingman-migrations.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const projectRoot = path.resolve(__dirname, "..");
const toolFile = path.join(__dirname, "local-supabase-stack.mjs");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const POSTGREST_VERSION = "12.2.12";

const STATE_DIR = path.resolve(process.env.LOCAL_SUPABASE_STATE_DIR || path.join(projectRoot, "data", "runtime", "local-supabase"));
const PG_PORT = Number(process.env.LOCAL_SUPABASE_PG_PORT || 55432);
const POSTGREST_PORT = Number(process.env.LOCAL_SUPABASE_POSTGREST_PORT || 55332);
const PROXY_PORT = Number(process.env.LOCAL_SUPABASE_PROXY_PORT || 55232);
const LOAD_LEVEL = process.env.LOCAL_SUPABASE_LOAD_LEVEL || "standard";
const LOAD_TIMEOUT_MS = process.env.LOCAL_SUPABASE_LOAD_TIMEOUT_MS || "20000";

const POSTGREST_CACHE_DIR = path.join(STATE_DIR, "cache", `postgrest-${POSTGREST_VERSION}`);
const PG_DATA_DIR = path.join(STATE_DIR, "pg", "data");
const PG_LOG = path.join(STATE_DIR, "pg", "postgres.log");
const POSTGREST_CONF = path.join(STATE_DIR, "postgrest", "postgrest.conf");
const POSTGREST_LOG = path.join(STATE_DIR, "postgrest", "postgrest.log");
const PROXY_LOG = path.join(STATE_DIR, "proxy.log");
const POSTGREST_PID_FILE = path.join(STATE_DIR, "postgrest.pid");
const PROXY_PID_FILE = path.join(STATE_DIR, "proxy.pid");
const APPLIED_MIGRATIONS_FILE = path.join(STATE_DIR, "applied-migrations.json");

const MIGRATIONS_DIR = path.join(projectRoot, "server", "migrations");
const SUPABASE_PROXY_URL = `http://127.0.0.1:${PROXY_PORT}`;

// supabase-js ALWAYS sends `Authorization: Bearer <key>`, and PostgREST
// validates that as a JWT against db-jwt-secret — with no secret it refuses
// with "Server lacks JWT secret". So the local stack mirrors hosted exactly:
// a shared HS256 secret in postgrest.conf, and the "service role key" the app
// and harness receive is a real signed JWT carrying the service_role claim.
const JWT_SECRET_FILE = path.join(STATE_DIR, "jwt-secret");

/** The shared HS256 secret, persisted so a later `baseline` invocation signs
 *  keys PostgREST (started by an earlier `start`) will accept. */
function jwtSecret() {
  try {
    const existing = fs.readFileSync(JWT_SECRET_FILE, "utf8").trim();
    if (existing) return existing;
  } catch {
    // not yet persisted
  }
  const secret = `local-supabase-stack-jwt-secret-${randomBytes(16).toString("hex")}`;
  fs.mkdirSync(path.dirname(JWT_SECRET_FILE), { recursive: true });
  fs.writeFileSync(JWT_SECRET_FILE, secret);
  return secret;
}

function makeServiceRoleJwt() {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { role: "service_role", iss: "supabase-local", iat: now, exp: now + 60 * 60 * 24 * 365 * 10 };
  const b64url = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const signingInput = `${b64url(header)}.${b64url(payload)}`;
  const signature = createHmac("sha256", jwtSecret()).update(signingInput).digest("base64url");
  return `${signingInput}.${signature}`;
}

// Computed lazily so every consumer (env print, harness spawn) shares one key
// per tool invocation; the expiry is a decade out, so a long-lived `start` +
// separate `baseline` still works.
let serviceRoleJwt = null;
function serviceKey() {
  if (!serviceRoleJwt) serviceRoleJwt = makeServiceRoleJwt();
  return serviceRoleJwt;
}

// ---------------------------------------------------------------------------
// Platform / binary resolution
// ---------------------------------------------------------------------------

const POSTGREST_RELEASE_PLATFORMS = {
  "win32-x64": { asset: `postgrest-v${POSTGREST_VERSION}-windows-x86-64.zip`, archive: "zip" },
  "linux-x64": { asset: `postgrest-v${POSTGREST_VERSION}-linux-static-x86-64.tar.xz`, archive: "tarxz" },
  "darwin-x64": { asset: `postgrest-v${POSTGREST_VERSION}-macos-x86-64.tar.xz`, archive: "tarxz" },
  "darwin-arm64": { asset: `postgrest-v${POSTGREST_VERSION}-macos-aarch64.tar.xz`, archive: "tarxz" },
};

// npm package suffixes of @embedded-postgres/<platform> matching this machine.
const EMBEDDED_PLATFORM_SUFFIX = {
  "win32-x64": "windows-x64",
  "linux-x64": "linux-x64",
  "linux-arm64": "linux-arm64",
  "darwin-x64": "darwin-x64",
  "darwin-arm64": "darwin-arm64",
};

function currentPlatformKey() {
  return `${process.platform}-${process.arch}`;
}

function log(message) {
  console.log(`[local-supabase] ${message}`);
}

function logError(message) {
  console.error(`[local-supabase] ${message}`);
}

function postgresBinDir() {
  const suffix = EMBEDDED_PLATFORM_SUFFIX[currentPlatformKey()];
  if (!suffix) {
    throw new Error(`Unsupported platform ${currentPlatformKey()} for the embedded Postgres binaries (zonky publishes windows/linux/darwin x64 + arm64).`);
  }
  // Resolve through the installed platform package (a transitive dependency of
  // the `embedded-postgres` devDependency; only the matching package installs).
  let mainEntry;
  try {
    mainEntry = require.resolve(`@embedded-postgres/${suffix}`);
  } catch {
    throw new Error(
      `@embedded-postgres/${suffix} is not installed. Run \`npm install\` first (embedded-postgres is a devDependency; its binaries download as a normal package).`,
    );
  }
  // require.resolve points at the package's main FILE (dist/index.js); the
  // binaries live under the package root's native/bin. Walk up until found so
  // the layout of the platform package never matters.
  let packageRoot = path.dirname(mainEntry);
  while (packageRoot && !fs.existsSync(path.join(packageRoot, "native", "bin"))) {
    const parent = path.dirname(packageRoot);
    if (parent === packageRoot) break;
    packageRoot = parent;
  }
  return path.join(packageRoot, "native", "bin");
}

function pgBinary(name) {
  const binDir = postgresBinDir();
  const extension = process.platform === "win32" ? ".exe" : "";
  return { binDir, exe: path.join(binDir, `${name}${extension}`) };
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function pidAlive(pidFile) {
  try {
    const pid = Number(fs.readFileSync(pidFile, "utf8").trim());
    if (!Number.isFinite(pid) || pid <= 0) return false;
    process.kill(pid, 0); // throws when the process does not exist
    return true;
  } catch {
    return false;
  }
}

function readPid(pidFile) {
  try {
    return Number(fs.readFileSync(pidFile, "utf8").trim());
  } catch {
    return null;
  }
}

/** AGENTS.md: Git Bash kill cannot terminate Windows-native processes. */
function stopPidFile(pidFile, label) {
  const pid = readPid(pidFile);
  if (!pid || !pidAlive(pidFile)) {
    fs.rmSync(pidFile, { force: true });
    log(`${label} is not running.`);
    return;
  }
  const result = spawnSync(
    "powershell",
    ["-NoProfile", "-Command", `Stop-Process -Id ${pid} -Force`],
    { stdio: "ignore" },
  );
  if (result.error || result.status !== 0) {
    logError(`Could not stop ${label} (pid ${pid}): ${result.error?.message || `exit ${result.status}`}`);
  } else {
    log(`Stopped ${label} (pid ${pid}).`);
  }
  fs.rmSync(pidFile, { force: true });
}

async function downloadFile(url, destPath) {
  // fetch follows the GitHub release redirect to objects.githubusercontent.com.
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(300_000) });
  if (!response.ok || !response.body) {
    throw new Error(`Download of ${url} failed with HTTP ${response.status}`);
  }
  const file = fs.createWriteStream(destPath);
  const reader = response.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!file.write(Buffer.from(value))) {
        await new Promise((resolve) => file.once("drain", resolve));
      }
    }
    file.end();
    // Wait for the OS to flush before anything reads the archive back.
    await new Promise((resolve, reject) => {
      file.once("error", reject);
      file.once("close", resolve);
    });
  } finally {
    reader.releaseLock();
  }
}

async function waitForHttp(url, { timeoutMs = 60_000, intervalMs = 300, label = "endpoint" } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (response.status < 500) return; // 200 (and 4xx) prove the server answers
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out waiting for ${label} at ${url}${lastError ? ` (${lastError.message})` : ""}`);
}

// ---------------------------------------------------------------------------
// PostgREST install
// ---------------------------------------------------------------------------

function postgrestExePath() {
  return path.join(POSTGREST_CACHE_DIR, process.platform === "win32" ? "postgrest.exe" : "postgrest");
}

export async function installPostgrest() {
  const release = POSTGREST_RELEASE_PLATFORMS[currentPlatformKey()];
  if (!release) {
    throw new Error(
      `No pinned PostgREST ${POSTGREST_VERSION} release asset for ${currentPlatformKey()}. Supported: ${Object.keys(POSTGREST_RELEASE_PLATFORMS).join(", ")}.`,
    );
  }
  const dllMarker = process.platform === "win32" ? path.join(POSTGREST_CACHE_DIR, "libpq.dll") : null;
  if (fs.existsSync(postgrestExePath()) && (!dllMarker || fs.existsSync(dllMarker))) {
    log(`PostgREST ${POSTGREST_VERSION} already cached at ${path.dirname(postgrestExePath())}.`);
    return;
  }
  const downloadUrl = `https://github.com/PostgREST/postgrest/releases/download/v${POSTGREST_VERSION}/${release.asset}`;
  const archivePath = path.join(STATE_DIR, "cache", release.asset);
  log(`Downloading ${downloadUrl} ...`);
  await downloadFile(downloadUrl, archivePath);
  log(`Extracting ${release.asset} into ${POSTGREST_CACHE_DIR} ...`);
  fs.mkdirSync(POSTGREST_CACHE_DIR, { recursive: true });
  if (release.archive === "zip") {
    if (process.platform === "win32") {
      // Windows ships PowerShell's Expand-Archive (Git Bash's GNU tar cannot
      // read zip archives).
      const result = spawnSync(
        "powershell",
        ["-NoProfile", "-Command", `Expand-Archive -LiteralPath '${archivePath}' -DestinationPath '${POSTGREST_CACHE_DIR}' -Force`],
        { stdio: "inherit" },
      );
      if (result.status !== 0) throw new Error(`Expand-Archive failed with exit ${result.status}`);
    } else {
      const result = spawnSync("unzip", ["-o", archivePath, "-d", POSTGREST_CACHE_DIR], { stdio: "inherit" });
      if (result.status !== 0) throw new Error(`unzip failed with exit ${result.status}`);
    }
  } else {
    const result = spawnSync("tar", ["-xJf", archivePath, "-C", POSTGREST_CACHE_DIR], { stdio: "inherit" });
    if (result.status !== 0) throw new Error(`tar extraction failed with exit ${result.status}`);
  }
  if (!fs.existsSync(postgrestExePath())) {
    // The release archives sometimes nest one level deep.
    const nested = fs.readdirSync(POSTGREST_CACHE_DIR).find((entry) =>
      fs.existsSync(path.join(POSTGREST_CACHE_DIR, entry, process.platform === "win32" ? "postgrest.exe" : "postgrest")),
    );
    if (nested) {
      fs.renameSync(path.join(POSTGREST_CACHE_DIR, nested), path.join(POSTGREST_CACHE_DIR, "binary"));
      fs.renameSync(path.join(POSTGREST_CACHE_DIR, "binary", process.platform === "win32" ? "postgrest.exe" : "postgrest"), postgrestExePath());
    } else {
      throw new Error("PostgREST extraction did not produce the executable; inspect the cache dir.");
    }
  }
  if (process.platform === "win32") {
    // The Windows release exe links LIBPQ.dll / libssl / ICU dynamically; the
    // DLLs live in the embedded Postgres bin dir. Copy them next to the exe so
    // the cache dir is self-contained (documented behaviour of this stack).
    try {
      const pgBin = postgresBinDir();
      for (const dll of fs.readdirSync(pgBin).filter((name) => name.endsWith(".dll"))) {
        fs.copyFileSync(path.join(pgBin, dll), path.join(POSTGREST_CACHE_DIR, dll));
      }
      log(`Copied the Postgres client/ICU DLLs next to postgrest.exe (${POSTGREST_CACHE_DIR}).`);
    } catch (error) {
      logError(`Could not copy Postgres DLLs next to postgrest.exe: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  fs.rmSync(archivePath, { force: true });
  log(`PostgREST ${POSTGREST_VERSION} ready at ${postgrestExePath()}.`);
}

// ---------------------------------------------------------------------------
// Postgres init + migration
// ---------------------------------------------------------------------------

async function waitForPostgres(timeoutMs = 30_000) {
  const client = new pg.Client({ host: "127.0.0.1", port: PG_PORT, user: "postgres", database: "postgres" });
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      return;
    } catch {
      try {
        await client.end();
      } catch {
        // not connected
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error("Timed out waiting for local Postgres to accept connections.");
}

async function withPostgresClient(callback) {
  const client = new pg.Client({ host: "127.0.0.1", port: PG_PORT, user: "postgres", database: "postgres" });
  await client.connect();
  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}

async function ensureRolesAndGrants(client) {
  // Roles Supabase provisions by default; migration policies are scoped
  // `TO service_role`, so it must exist before 001 runs.
  const roles = ["anon", "authenticated", "service_role"];
  for (const role of roles) {
    const existing = await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [role]);
    if (existing.rowCount === 0) {
      await client.query(`CREATE ROLE ${role} NOLOGIN`);
      log(`Created role ${role}.`);
    }
  }
  await client.query("GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role");
  // Function bodies default to SECURITY INVOKER, so the request role needs
  // table access. Grants run after the migrations so every migration-created
  // object is covered (Supabase grants these by default on project creation).
  await client.query("GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role");
  await client.query("GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role");
  await client.query("GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role");
  await client.query("GRANT ALL ON ALL PROCEDURES IN SCHEMA public TO anon, authenticated, service_role");
}

const PG_CRON_STATEMENT = /pg_cron|cron\./i;

function migrationStatements(sql) {
  const all = splitStatements(sql);
  const kept = [];
  const skipped = [];
  for (const statement of all) {
    if (PG_CRON_STATEMENT.test(statement)) skipped.push(statement);
    else kept.push(statement);
  }
  return { kept, skipped };
}

async function applyPendingMigrations(client) {
  const applied = new Set(readJson(APPLIED_MIGRATIONS_FILE, []));
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => /^\d{3}_.+\.sql$/.test(name))
    .sort();

  const newlyApplied = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const { kept, skipped } = migrationStatements(sql);
    if (skipped.length > 0) {
      log(`${file}: skipping ${skipped.length} pg_cron statement(s) (pg_cron is Supabase-managed and absent on vanilla Postgres).`);
    }
    try {
      await client.query("BEGIN");
      for (let index = 0; index < kept.length; index += 1) {
        try {
          await client.query(kept[index]);
        } catch (statementError) {
          throw new Error(
            `${file} statement ${index + 1} of ${kept.length} failed: ${statementError instanceof Error ? statementError.message : String(statementError)}\n---\n${kept[index].slice(0, 400)}`,
          );
        }
      }
      await client.query("COMMIT");
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // connection may be broken; the outer error is the real one
      }
      throw error;
    }
    applied.add(file);
    newlyApplied.push(file);
    log(`Applied ${file}${skipped.length ? ` (${skipped.length} pg_cron statements skipped)` : ""}.`);
  }
  writeJson(APPLIED_MIGRATIONS_FILE, Array.from(applied).sort());
  if (newlyApplied.length === 0) log("No pending migrations (all files already applied to this data dir).");
  return newlyApplied;
}

async function initPostgresIfNeeded() {
  if (fs.existsSync(path.join(PG_DATA_DIR, "PG_VERSION"))) {
    log(`Postgres data dir already initialised at ${PG_DATA_DIR}.`);
    return;
  }
  const { binDir, exe } = pgBinary("initdb");
  log(`Running initdb into ${PG_DATA_DIR} (trust auth, 127.0.0.1 only, no admin).`);
  fs.mkdirSync(PG_DATA_DIR, { recursive: true });
  const result = spawnSync(exe, ["-D", PG_DATA_DIR, "-U", "postgres", "-A", "trust", "-E", "UTF8", "--no-locale"], {
    cwd: binDir,
    env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH || ""}` },
    stdio: "inherit",
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `initdb failed with exit ${result.status}${result.error ? ` (${result.error.message})` : ""}; delete ${PG_DATA_DIR} and retry.`,
    );
  }
}

function startPostgres() {
  if (isPostgresRunning()) {
    log(`Postgres already listening on 127.0.0.1:${PG_PORT}.`);
    return;
  }
  const { binDir, exe } = pgBinary("pg_ctl");
  fs.mkdirSync(path.dirname(PG_LOG), { recursive: true });
  log(`Starting Postgres on 127.0.0.1:${PG_PORT} (pg_ctl, daemonised).`);
  const result = spawnSync(exe, ["-D", PG_DATA_DIR, "-l", PG_LOG, "-o", `-p ${PG_PORT} -h 127.0.0.1`, "-w", "start"], {
    cwd: binDir,
    env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH || ""}` },
    stdio: "inherit",
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `pg_ctl start failed with exit ${result.status}${result.error ? ` (${result.error.message})` : ""}; see ${PG_LOG}`,
    );
  }
}

function isPostgresRunning() {
  try {
    const { exe } = pgBinary("pg_ctl");
    const result = spawnSync(exe, ["-D", PG_DATA_DIR, "status"], { stdio: "ignore" });
    return result.status === 0;
  } catch {
    return false;
  }
}

function stopPostgres() {
  if (!isPostgresRunning()) {
    log("Postgres is not running.");
    return;
  }
  const { binDir, exe } = pgBinary("pg_ctl");
  log("Stopping Postgres (pg_ctl -m fast).");
  const result = spawnSync(exe, ["-D", PG_DATA_DIR, "-m", "fast", "-w", "stop"], {
    cwd: binDir,
    env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH || ""}` },
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`pg_ctl stop failed with exit ${result.status}`);
  }
}

// ---------------------------------------------------------------------------
// PostgREST + gateway proxy lifecycle
// ---------------------------------------------------------------------------

function writePostgrestConf() {
  fs.mkdirSync(path.dirname(POSTGREST_CONF), { recursive: true });
  // db-anon-role service_role makes RLS policies scoped TO service_role behave
  // exactly like the hosted project for unauthenticated traffic, and the
  // scaffolded grants keep the request role authorized on every
  // migration-created object. db-jwt-secret makes supabase-js's always-present
  // `Authorization: Bearer <key>` header validate: the key the tool hands out
  // IS a signed service_role JWT, so authenticated traffic runs as
  // service_role exactly like hosted.
  const config = [
    `db-uri = "postgres://postgres@127.0.0.1:${PG_PORT}/postgres"`,
    'db-schemas = "public"',
    'db-anon-role = "service_role"',
    `jwt-secret = "${jwtSecret()}"`,
    'server-host = "127.0.0.1"',
    `server-port = ${POSTGREST_PORT}`,
    'log-level = "info"',
  ].join("\n");
  fs.writeFileSync(POSTGREST_CONF, `${config}\n`);
}

function startPostgrest() {
  if (pidAlive(POSTGREST_PID_FILE)) {
    log(`PostgREST already running (pid ${readPid(POSTGREST_PID_FILE)}).`);
    return;
  }
  if (!fs.existsSync(postgrestExePath())) {
    throw new Error("PostgREST is not installed; run `node tools/local-supabase-stack.mjs install` (or `npm run load-test:local-supabase -- all`).");
  }
  writePostgrestConf();
  fs.mkdirSync(path.dirname(POSTGREST_LOG), { recursive: true });
  const logFd = fs.openSync(POSTGREST_LOG, "a");
  log(`Starting PostgREST ${POSTGREST_VERSION} on 127.0.0.1:${POSTGREST_PORT}.`);
  const child = spawn(postgrestExePath(), [POSTGREST_CONF], {
    detached: true,
    stdio: ["ignore", logFd, logFd],
    windowsHide: true,
  });
  child.on("error", (error) => {
    logError(`PostgREST failed to spawn: ${error.message}`);
  });
  child.unref();
  fs.writeFileSync(POSTGREST_PID_FILE, String(child.pid ?? ""));
}

async function waitForPostgrest() {
  await waitForHttp(`http://127.0.0.1:${POSTGREST_PORT}/`, { label: "PostgREST" });
  log("PostgREST answers on its port.");
}

function startProxy() {
  if (pidAlive(PROXY_PID_FILE)) {
    log(`Gateway proxy already running (pid ${readPid(PROXY_PID_FILE)}).`);
    return;
  }
  fs.mkdirSync(path.dirname(PROXY_LOG), { recursive: true });
  const logFd = fs.openSync(PROXY_LOG, "a");
  log(`Starting the /rest/v1 gateway proxy on 127.0.0.1:${PROXY_PORT}.`);
  const child = spawn(process.execPath, [toolFile, "proxy"], {
    detached: true,
    stdio: ["ignore", logFd, logFd],
    windowsHide: true,
    env: {
      ...process.env,
      LOCAL_SUPABASE_PROXY_PORT: String(PROXY_PORT),
      LOCAL_SUPABASE_POSTGREST_PORT: String(POSTGREST_PORT),
    },
  });
  child.unref();
  fs.writeFileSync(PROXY_PID_FILE, String(child.pid ?? ""));
}

async function waitForProxy() {
  // A bare /rest/v1 root hits PostgREST's OpenAPI handler through the proxy.
  await waitForHttp(`${SUPABASE_PROXY_URL}/rest/v1/`, { label: "gateway proxy" });
  log("Gateway proxy answers on its port.");
}

/** Runs in the foreground when spawned by start(); serves supabase-js traffic. */
export function serveProxy() {
  const port = Number(process.env.LOCAL_SUPABASE_PROXY_PORT || PROXY_PORT);
  const upstreamPort = Number(process.env.LOCAL_SUPABASE_POSTGREST_PORT || POSTGREST_PORT);
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url || "/", `http://127.0.0.1:${port}`);
    // supabase-js hard-codes the /rest/v1 prefix (Supabase's gateway strips
    // it); bare PostgREST serves at / and 404s /rest/v1. Everything else
    // passes through unchanged.
    let pathname = requestUrl.pathname;
    if (pathname.startsWith("/rest/v1/")) {
      pathname = pathname.slice("/rest/v1".length);
    } else if (pathname === "/rest/v1") {
      pathname = "/";
    }
    const upstreamPath = `${pathname}${requestUrl.search}`;
    const headers = { ...request.headers, host: `127.0.0.1:${upstreamPort}` };
    delete headers["content-length"];
    const proxyRequest = http.request(
      {
        host: "127.0.0.1",
        port: upstreamPort,
        method: request.method,
        path: upstreamPath,
        headers,
      },
      (upstreamResponse) => {
        response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
        upstreamResponse.pipe(response);
      },
    );
    proxyRequest.on("error", (error) => {
      response.writeHead(502, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: false, error: `local gateway proxy: ${error.message}` }));
    });
    request.pipe(proxyRequest);
  });
  server.listen(port, "127.0.0.1");
  log(`Gateway proxy serving /rest/v1 -> PostgREST on 127.0.0.1:${port}.`);
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

function portInUse(port) {
  try {
    const result = spawnSync("powershell", ["-NoProfile", "-Command", `(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue).Count`], {
      stdio: ["ignore", "pipe", "ignore"],
    });
    return result.status === 0 && Number(String(result.stdout).trim()) > 0;
  } catch {
    return false;
  }
}

function assertPortsFree() {
  for (const [port, label] of [[PG_PORT, "Postgres"], [POSTGREST_PORT, "PostgREST"], [PROXY_PORT, "gateway proxy"]]) {
    if (portInUse(port)) {
      throw new Error(`${label} port ${port} is already in use. Override it with LOCAL_SUPABASE_${label.toUpperCase().replace(" ", "_")}_PORT or free the port.`);
    }
  }
}

async function startStack() {
  if (pidAlive(POSTGREST_PID_FILE) && pidAlive(PROXY_PID_FILE) && isPostgresRunning()) {
    log("The whole stack is already up.");
    printConnectionEnv();
    return;
  }
  // Clear stale members: a pid file whose sibling is down means a crashed or
  // half-stopped stack; leaving the pid file would trip the port-in-use guard.
  if (pidAlive(POSTGREST_PID_FILE) && !isPostgresRunning()) {
    stopPidFile(POSTGREST_PID_FILE, "Stale PostgREST");
  }
  if (pidAlive(PROXY_PID_FILE) && !pidAlive(POSTGREST_PID_FILE)) {
    stopPidFile(PROXY_PID_FILE, "Stale gateway proxy");
  }
  assertPortsFree();
  initPostgresIfNeeded();
  startPostgres();
  await waitForPostgres();
  await withPostgresClient(async (client) => {
    await ensureRolesAndGrants(client);
    await applyPendingMigrations(client);
  });
  startPostgrest();
  await waitForPostgrest();
  startProxy();
  await waitForProxy();
  printConnectionEnv();
}

function stopStack() {
  stopPidFile(PROXY_PID_FILE, "Gateway proxy");
  stopPidFile(POSTGREST_PID_FILE, "PostgREST");
  stopPostgres();
}

function cleanStack() {
  stopStack();
  log(`Deleting the state dir ${STATE_DIR}.`);
  fs.rmSync(STATE_DIR, { recursive: true, force: true });
  log("State dir removed (binaries will be re-fetched / re-initialised by the next start or install).");
}

function printConnectionEnv() {
  console.log("\n[local-supabase] Connection env for a supabase-tables run (all on 127.0.0.1, zero network):");
  console.log(`  SUPABASE_URL=${SUPABASE_PROXY_URL}`);
  console.log(`  SUPABASE_SERVICE_ROLE_KEY=${serviceKey()}`);
  console.log(`  Postgres    : 127.0.0.1:${PG_PORT}   (user postgres, trust auth, data ${PG_DATA_DIR})`);
  console.log(`  PostgREST   : 127.0.0.1:${POSTGREST_PORT}  (anon-role service_role)`);
  console.log(`  Gateway proxy: 127.0.0.1:${PROXY_PORT}   (/rest/v1 -> PostgREST)`);
  console.log(`  Migrations applied: ${readJson(APPLIED_MIGRATIONS_FILE, []).length}/15 (see ${APPLIED_MIGRATIONS_FILE})`);
}

function harnessArgs(extra) {
  const level = extra.includes("--level") ? null : LOAD_LEVEL;
  const args = ["tools/load-test.mjs"];
  if (level) args.push("--level", level);
  args.push("--storage-mode", "supabase-tables", "--timeout", LOAD_TIMEOUT_MS);
  // Any extra args (--scenarios, --users, --level ...) pass through last so
  // they can override the defaults above.
  args.push(...extra);
  return args;
}

async function runBaseline(extra) {
  if (!isPostgresRunning() || !pidAlive(POSTGREST_PID_FILE) || !pidAlive(PROXY_PID_FILE)) {
    throw new Error("The local stack is not running. Start it first with `node tools/local-supabase-stack.mjs start` (or use `all` for a one-shot run).");
  }
  const args = harnessArgs(extra);
  log(`Running the load harness: node ${args.join(" ")}`);
  log(`(the harness spawns the API server in supabase-tables mode, verifies persisted rows, and self-cleans through the proxy.)`);
  const result = spawnSync(process.execPath, args, {
    cwd: projectRoot,
    env: {
      ...process.env,
      SUPABASE_URL: SUPABASE_PROXY_URL,
      SUPABASE_SERVICE_ROLE_KEY: serviceKey(),
      SUPABASE_SECRET_KEY: serviceKey(),
    },
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printHelp() {
  console.log(`Usage: node tools/local-supabase-stack.mjs <command> [load-test args...]

Reproducible zero-network local Supabase stack (embedded Postgres 18.4 +
PostgREST ${POSTGREST_VERSION} + /rest/v1 gateway proxy + migrations 001-015).

Commands:
  install     Fetch the pinned PostgREST release into the cache (npm install
              provides the Postgres binaries).
  start       Init (first run), scaffold roles/grants, apply migrations, and
              launch Postgres + PostgREST + the proxy; print the env.
  status      Report what is running.
  baseline    Run the load-test harness standard baseline (default level:
              standard) against the running stack. Extra args pass through to
              tools/load-test.mjs (e.g. --level smoke --scenarios project-save).
  stop        Stop the proxy, PostgREST and Postgres.
  clean       stop and delete the whole state dir (data, cache, logs).
  all         install-if-needed + start + baseline + stop (one-shot).

Env: LOCAL_SUPABASE_STATE_DIR, LOCAL_SUPABASE_PG_PORT (${PG_PORT}),
LOCAL_SUPABASE_POSTGREST_PORT (${POSTGREST_PORT}),
LOCAL_SUPABASE_PROXY_PORT (${PROXY_PORT}),
LOCAL_SUPABASE_LOAD_LEVEL (${LOAD_LEVEL}).
`);
}

async function main() {
  const [command, ...extra] = process.argv.slice(2);
  switch (command) {
    case "install":
      await installPostgrest();
      return;
    case "start":
      await startStack();
      return;
    case "status": {
      const running = [];
      if (isPostgresRunning()) running.push(`Postgres :${PG_PORT}`);
      if (pidAlive(POSTGREST_PID_FILE)) running.push(`PostgREST :${POSTGREST_PORT}`);
      if (pidAlive(PROXY_PID_FILE)) running.push(`proxy :${PROXY_PORT}`);
      if (running.length === 0) log("Nothing is running.");
      else log(`Running: ${running.join(", ")}.`);
      if (running.length === 3) printConnectionEnv();
      return;
    }
    case "baseline":
      await runBaseline(extra);
      return;
    case "stop":
      stopStack();
      return;
    case "clean":
      cleanStack();
      return;
    case "proxy":
      serveProxy();
      return;
    case "all": {
      try {
        await installPostgrest();
        await startStack();
        await runBaseline(extra);
      } finally {
        stopStack();
      }
      return;
    }
    case undefined:
    case "help":
    case "--help":
    case "-h":
      printHelp();
      return;
    default:
      logError(`Unknown command "${command}".`);
      printHelp();
      process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    logError(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
