import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  LEGACY_WINGMAN_APP_DB_FILE,
  WINGMAN_APP_DB_FILE,
} from "./catalog/files.mjs";
import { POSTGREST_MAX_ROWS, readAllSupabaseRows } from "./supabase-pagination.mjs";
import { canonicalStageForRow, canonicalStatusForRow } from "./project-row-vocabulary.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

let createSupabaseClient = null;
try {
  ({ createClient: createSupabaseClient } = await import("@supabase/supabase-js"));
} catch {
}

const GOVERNANCE_FILE = path.join(ROOT, "data", "governance", "wingman-governance.json");
const SESSION_TTL_MS = Math.max(60 * 60 * 1000, Number(process.env.WINGMAN_SESSION_TTL_MS || 7 * 24 * 60 * 60 * 1000));
const LAST_SEEN_TOUCH_COOLDOWN_MS = Math.max(5_000, Number(process.env.WINGMAN_LAST_SEEN_COOLDOWN_MS || 60_000));
const INVITATION_TTL_MS = Math.max(60 * 60 * 1000, Number(process.env.WINGMAN_INVITATION_TTL_MS || 7 * 24 * 60 * 60 * 1000));
const AUDIT_RETENTION = Math.max(50, Number(process.env.WINGMAN_AUDIT_RETENTION || 800));
const TELEMETRY_RETENTION = Math.max(50, Number(process.env.WINGMAN_TELEMETRY_RETENTION || 400));
const AUTH_RATE_LIMIT_WINDOW_MS = Math.max(5_000, Number(process.env.WINGMAN_AUTH_RATE_LIMIT_WINDOW_MS || 60_000));
const AUTH_RATE_LIMIT_MAX_REQUESTS = Math.max(1, Number(process.env.WINGMAN_AUTH_RATE_LIMIT_MAX_REQUESTS || 8));
const SESSION_COOKIE_SECURE = !["0", "false", "off", "no"].includes(
  String(process.env.WINGMAN_SESSION_COOKIE_SECURE ?? (process.env.NODE_ENV === "production" ? "true" : "false"))
    .trim()
    .toLowerCase(),
);
const SESSION_COOKIE_SAMESITE = String(
  process.env.WINGMAN_SESSION_COOKIE_SAMESITE ?? (process.env.NODE_ENV === "production" ? "Strict" : "Lax")
).trim();
const MIN_PASSWORD_LENGTH = Math.max(8, Number(process.env.WINGMAN_MIN_PASSWORD_LENGTH || 10));
const STORAGE_FAIL_CLOSED = !["0", "false", "off", "no"].includes(
  String(process.env.WINGMAN_STORAGE_FAIL_CLOSED ?? (process.env.NODE_ENV === "production" ? "true" : "false"))
    .trim()
    .toLowerCase(),
);
const scryptAsync = promisify(crypto.scrypt);
let supabaseAdmin = null;
let lastStorageModeUsed = "file";
let lastStorageWarning = "";

// Truncation sentinel for supabase-tables mode: set whenever a remote-tables
// read did not provably reach the end of every table (pagination safety valve,
// transport error, policy rejection). A subsequent writeDbToSupabaseTables
// must then refuse to commit: its server-side reconciliation (migration 009)
// deletes every row absent from the snapshot, so committing a snapshot built
// while the remote was unreadable would erase all rows written since. The
// commit RPC is the one action that destroys data, so it - not the read - is
// where the sentinel blocks. It is logged as a warning, not an error: the
// next successful full read clears it.
let lastTablesReadIncomplete = false;

// Optimistic-concurrency generation (migration 013) for supabase-tables mode:
// the generation register (wingman_db_generation) is read FIRST, before the
// eight snapshot tables, and every snapshot commit must name the generation
// its snapshot was read at. A commit that lands between our register read and
// our RPC can only move the generation AHEAD of the snapshot we are
// assembling, so the server-side commit refuses (committed:false, stale:true)
// instead of reconciling an older snapshot over rows we never saw. This
// sentinel holds the generation the CURRENT readDbFromSupabaseTables snapshot
// was read at; writeDbToSupabaseTables sends it as expected_generation.
let lastTablesGeneration = 0;

// Serializes the store read-modify-write cycles. Every mutating handler does
// readDb() -> mutate -> writeDb(), and in supabase-tables mode writeDb commits
// the whole snapshot atomically server-side via wingman_snapshot_commit
// (migration 009): one database transaction performs the upsert-all + delete-
// rows-not-in-snapshot reconciliation, so a commit either lands completely or
// not at all and two processes can no longer interleave their snapshot-deletes
// and erase each other's rows. The mutex serializes the read-modify-write
// cycle per process; multi-instance deployments still need an external lock or
// row-level writes to avoid last-writer-wins across instances.
let storeLockTail = Promise.resolve();
async function withStoreLock(fn) {
  const enqueueT0 = STORE_PROFILE ? performance.now() : 0;
  const run = storeLockTail.then(
    async () => {
      const start = STORE_PROFILE ? performance.now() : 0;
      if (STORE_PROFILE) storeProfile("storage.profile.lock_wait", { ms: roundMs(start - enqueueT0) });
      try {
        const result = await fn();
        if (STORE_PROFILE) storeProfile("storage.profile.lock_run", { ms: roundMs(performance.now() - start) });
        return result;
      } catch (error) {
        if (STORE_PROFILE) {
          storeProfile("storage.profile.lock_run", { ms: roundMs(performance.now() - start), failed: true });
        }
        throw error;
      }
    },
    // A previous cycle that rejected still hands the lock to this fn unchanged.
    fn,
  );
  // Keep the tail alive even when a previous cycle failed, so an error in one
  // request cannot wedge the lock for every later request.
  storeLockTail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
const authRateBuckets = new Map();

function nowIso() {
  return new Date().toISOString();
}

function tidy(value) {
  return String(value ?? "").trim();
}

// ---------------------------------------------------------------------------
// Structured logging
// ---------------------------------------------------------------------------
// This module handles every auth and storage path in Wingman and, until now,
// emitted no logs at all - a failed sign-in, a rate-limit trip or a Supabase
// write failure left no trace on the server. One JSON line per notable event
// so the output is greppable and machine-parseable in any log aggregator.
//
// Deliberately never logs passwords, password hashes, salts, session tokens or
// token hashes. Email addresses are reduced to a domain plus a short salted
// digest so repeated failures against one account can be correlated without
// writing the address itself into the logs.

const LOG_LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const LOG_LEVEL = LOG_LEVELS[String(process.env.WINGMAN_LOG_LEVEL || "info").trim().toLowerCase()] ?? LOG_LEVELS.info;

// Optional server-side stage profiling for remote storage modes. Off by
// default (zero overhead when unset); WINGMAN_STORE_PROFILE=1 makes the store
// emit per-stage timings (storage.profile.* events) so a load run can
// attribute its project-save latency to the remote table reads, the snapshot
// serialization, or the wingman_snapshot_commit RPC (see docs/LOAD_TESTING.md
// "Server-side stage attribution").
const STORE_PROFILE = String(process.env.WINGMAN_STORE_PROFILE || "").trim() === "1";

function roundMs(ms) {
  return Math.round(ms * 10) / 10;
}

function storeProfile(event, details = {}) {
  if (!STORE_PROFILE) return;
  logWingmanEvent("info", event, details);
}

function accountRef(email) {
  const value = tidy(email).toLowerCase();
  if (!value) return undefined;
  const [, domain = ""] = value.split("@");
  const digest = crypto.createHash("sha256").update(value).digest("hex").slice(0, 8);
  return domain ? `${digest}@${domain}` : digest;
}

export function logWingmanEvent(level, event, details = {}) {
  if ((LOG_LEVELS[level] ?? LOG_LEVELS.info) < LOG_LEVEL) return;

  const line = JSON.stringify({
    ts: nowIso(),
    level,
    scope: "wingman-app-store",
    event,
    ...details,
  });

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

const WINGMAN_STORAGE_MODE = String(process.env.WINGMAN_STORAGE_MODE || "auto").trim().toLowerCase();
const SUPABASE_URL = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = String(
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "",
).trim();
const SUPABASE_WINGMAN_STATE_TABLE = String(process.env.SUPABASE_WINGMAN_STATE_TABLE || "wingman_app_state").trim();
const SUPABASE_WINGMAN_STATE_ROW_ID = String(process.env.SUPABASE_WINGMAN_STATE_ROW_ID || "global").trim();
const SUPABASE_WINGMAN_TABLES_ENABLED = !["0", "false", "off", "no"].includes(
  String(process.env.SUPABASE_WINGMAN_TABLES_ENABLED || "false").trim().toLowerCase(),
);
const SUPABASE_WINGMAN_SNAPSHOT_COMMIT_FN = String(
  process.env.SUPABASE_WINGMAN_SNAPSHOT_COMMIT_FUNCTION || "wingman_snapshot_commit",
).trim();
// Migration-015 per-project guarded commit (ADR-0001 Phase 1 per-project
// revisioned sync): commits ONE project row (plus its audit row) atomically,
// guarded by the row's own payload syncRevision. Overridable per env like the
// whole-snapshot function name.
const SUPABASE_WINGMAN_PROJECT_PUT_FN = String(
  process.env.SUPABASE_WINGMAN_PROJECT_PUT_FUNCTION || "wingman_project_put",
).trim();
export const SNAPSHOT_COMMIT_MAX_PAYLOAD_BYTES = Math.max(
  1024,
  Number(process.env.WINGMAN_SNAPSHOT_COMMIT_MAX_BYTES || 8_388_608),
);
const SUPABASE_WINGMAN_USERS_TABLE = String(process.env.SUPABASE_WINGMAN_USERS_TABLE || "wingman_users").trim();
const SUPABASE_WINGMAN_WORKSPACES_TABLE = String(process.env.SUPABASE_WINGMAN_WORKSPACES_TABLE || "wingman_workspaces").trim();
const SUPABASE_WINGMAN_MEMBERS_TABLE = String(process.env.SUPABASE_WINGMAN_MEMBERS_TABLE || "wingman_workspace_members").trim();
const SUPABASE_WINGMAN_INVITATIONS_TABLE = String(process.env.SUPABASE_WINGMAN_INVITATIONS_TABLE || "wingman_workspace_invitations").trim();
const SUPABASE_WINGMAN_SESSIONS_TABLE = String(process.env.SUPABASE_WINGMAN_SESSIONS_TABLE || "wingman_sessions").trim();
const SUPABASE_WINGMAN_PROJECTS_TABLE = String(process.env.SUPABASE_WINGMAN_PROJECTS_TABLE || "wingman_projects").trim();
const SUPABASE_WINGMAN_AUDIT_TABLE = String(process.env.SUPABASE_WINGMAN_AUDIT_TABLE || "wingman_audit_events").trim();
const SUPABASE_WINGMAN_TELEMETRY_TABLE = String(process.env.SUPABASE_WINGMAN_TELEMETRY_TABLE || "wingman_telemetry_events").trim();
// Infrastructure register for the migration-013 generation guard. Unlike the
// eight snapshot tables this is deliberately NOT overridable: it is internal
// bookkeeping for the whole database, and the guard is only meaningful if
// every instance shares one register.
const SUPABASE_WINGMAN_GENERATION_TABLE = "wingman_db_generation";
const SUPABASE_WINGMAN_READ_PAGE_SIZE = Math.max(
  1,
  Number(process.env.SUPABASE_WINGMAN_READ_PAGE_SIZE || POSTGREST_MAX_ROWS),
);

// The normalized-table rows above can be overridden per env var, but migration
// 009's wingman_snapshot_commit reconciles the DEFAULT migration-created
// tables only (its DDL hard-codes wingman_*). Reads honoring a custom table
// while the atomic commit writes the default one would make every change
// "disappear" on the next read, so non-default table overrides are rejected
// in supabase-tables mode. The overrides remain meaningful for single-row
// `supabase` mode (SUPABASE_WINGMAN_STATE_TABLE) where every statement is
// addressed to the configured table directly.
const NORMALIZED_TABLE_DEFAULTS = {
  users: "wingman_users",
  workspaces: "wingman_workspaces",
  memberships: "wingman_workspace_members",
  invitations: "wingman_workspace_invitations",
  sessions: "wingman_sessions",
  projects: "wingman_projects",
  audit: "wingman_audit_events",
  telemetry: "wingman_telemetry_events",
};
const NORMALIZED_TABLE_OVERRIDES = {
  users: SUPABASE_WINGMAN_USERS_TABLE,
  workspaces: SUPABASE_WINGMAN_WORKSPACES_TABLE,
  memberships: SUPABASE_WINGMAN_MEMBERS_TABLE,
  invitations: SUPABASE_WINGMAN_INVITATIONS_TABLE,
  sessions: SUPABASE_WINGMAN_SESSIONS_TABLE,
  projects: SUPABASE_WINGMAN_PROJECTS_TABLE,
  audit: SUPABASE_WINGMAN_AUDIT_TABLE,
  telemetry: SUPABASE_WINGMAN_TELEMETRY_TABLE,
};

function normalizeEmail(value) {
  return tidy(value).toLowerCase();
}

function slugify(value) {
  const base = tidy(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base || "wingman-workspace";
}

function makeId(prefix = "wm") {
  return `${prefix}_${crypto.randomUUID()}`;
}

function normalizeWorkspaceRole(value, fallback = "sales") {
  const role = tidy(value).toLowerCase();
  if (role === "owner" || role === "admin" || role === "sales" || role === "customer") return role;
  if (role === "member") return "sales";
  return fallback;
}

function cloneJson(value, fallback = {}) {
  try {
    return JSON.parse(JSON.stringify(value ?? fallback));
  } catch {
    return fallback;
  }
}

async function readJsonFile(filePath, fallback) {
  try {
    const text = await fs.readFile(filePath, "utf8");
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath, payload) {
  // Crash-atomic write: serialize to a temp file in the same directory, then
  // rename over the target. A plain writeFile truncates the target first, so a
  // crash mid-write leaves the whole app-state file corrupted and the store
  // silently falls back to an empty database. fs.rename is atomic on both
  // POSIX and Windows (MoveFileEx with MOVEFILE_REPLACE_EXISTING).
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(tmpPath, JSON.stringify(payload, null, 2), "utf8");
    await fs.rename(tmpPath, filePath);
  } catch (error) {
    await fs.rm(tmpPath, { force: true }).catch(() => {});
    throw error;
  }
}

function configuredStorageMode() {
  const supabaseReady = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
  if (WINGMAN_STORAGE_MODE === "file") return "file";
  if (WINGMAN_STORAGE_MODE === "supabase" && supabaseReady) return "supabase";
  if (WINGMAN_STORAGE_MODE === "supabase" && !supabaseReady) {
    if (STORAGE_FAIL_CLOSED) {
      throw new Error("Supabase storage mode is configured but Supabase credentials are missing.");
    }
    return "file";
  }
  if (WINGMAN_STORAGE_MODE === "supabase-tables" && supabaseReady) return "supabase-tables";
  if (WINGMAN_STORAGE_MODE === "supabase-tables" && !supabaseReady) {
    if (STORAGE_FAIL_CLOSED) {
      throw new Error("Supabase tables storage mode is configured but Supabase credentials are missing.");
    }
    return "file";
  }
  if (supabaseReady && SUPABASE_WINGMAN_TABLES_ENABLED) return "supabase-tables";
  if (supabaseReady) return "supabase";
  if (WINGMAN_STORAGE_MODE === "auto" && STORAGE_FAIL_CLOSED) {
    throw new Error("Storage mode auto resolved to local file storage while fail-closed is enabled.");
  }
  return "file";
}

// Record the resolved storage mode once at startup. Which mode a running
// instance actually landed on is the single most useful fact when diagnosing
// "my project vanished" - an instance quietly serving from local file storage
// looks identical to a healthy one from the outside.
logWingmanEvent("info", "storage.mode.resolved", {
  configured: WINGMAN_STORAGE_MODE,
  resolved: (() => {
    try {
      return configuredStorageMode();
    } catch (error) {
      return `unavailable: ${error.message}`;
    }
  })(),
  failClosed: STORAGE_FAIL_CLOSED,
  supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY),
});

if (process.env.NODE_ENV === "production") {
  if (WINGMAN_STORAGE_MODE === "auto" || WINGMAN_STORAGE_MODE === "file") {
    throw new Error(
      `Refusing to start in production with WINGMAN_STORAGE_MODE="${WINGMAN_STORAGE_MODE}". ` +
        'Set WINGMAN_STORAGE_MODE to "supabase-tables" (or "supabase") explicitly so storage ' +
        "cannot silently fall back to local file storage.",
    );
  }
  if (!STORAGE_FAIL_CLOSED) {
    throw new Error(
      "Refusing to start in production with WINGMAN_STORAGE_FAIL_CLOSED disabled. " +
        "Set WINGMAN_STORAGE_FAIL_CLOSED=true so a Supabase outage fails loudly instead of " +
        "silently falling back to local file storage.",
    );
  }
  // Eagerly resolve the storage mode so a misconfiguration (e.g. missing Supabase
  // credentials) crashes the process at startup instead of on the first request.
  configuredStorageMode();
}

function getSupabaseAdmin() {
  const mode = configuredStorageMode();
  if (mode !== "supabase" && mode !== "supabase-tables") return null;
  if (supabaseAdmin) return supabaseAdmin;
  if (typeof createSupabaseClient !== "function") return null;
  try {
    supabaseAdmin = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    return supabaseAdmin;
  } catch {
    return null;
  }
}

export async function getStorageReadiness() {
  let mode;
  try {
    mode = configuredStorageMode();
  } catch (error) {
    return { ready: false, mode: "error", error: error instanceof Error ? error.message : "Storage configuration error." };
  }

  if (mode !== "supabase" && mode !== "supabase-tables") {
    return { ready: true, mode };
  }

  const client = getSupabaseAdmin();
  if (!client) {
    return { ready: false, mode, error: "Supabase client could not be constructed." };
  }

  const table = mode === "supabase-tables" ? SUPABASE_WINGMAN_USERS_TABLE : SUPABASE_WINGMAN_STATE_TABLE;
  try {
    const { error } = await client.from(table).select("*", { head: true, count: "exact" });
    if (error) {
      return { ready: false, mode, error: error.message };
    }
    return { ready: true, mode };
  } catch (error) {
    return { ready: false, mode, error: error instanceof Error ? error.message : "Supabase connectivity check failed." };
  }
}

function emptyDb() {
  return {
    version: 1,
    updatedAt: nowIso(),
    users: [],
    workspaces: [],
    invitations: [],
    sessions: [],
    projectsByWorkspace: {},
    auditEvents: [],
    telemetryEvents: [],
  };
}

function normalizeDb(db) {
  db.users = Array.isArray(db.users) ? db.users : [];
  db.workspaces = (Array.isArray(db.workspaces) ? db.workspaces : []).map((workspace) => {
    const ownerUserId = tidy(workspace?.ownerUserId);
    const legacyMembers = asArray(workspace?.memberIds)
      .map((userId) => tidy(userId))
      .filter(Boolean);
    const memberships = asArray(workspace?.memberships).map((membership) => ({
      userId: tidy(membership?.userId),
      role: normalizeWorkspaceRole(membership?.role, "sales"),
      createdAt: tidy(membership?.createdAt) || workspace?.createdAt || nowIso(),
    }))
      .filter((membership) => membership.userId);

    if (ownerUserId && !memberships.some((membership) => membership.userId === ownerUserId)) {
      memberships.unshift({
        userId: ownerUserId,
        role: "owner",
        createdAt: tidy(workspace?.createdAt) || nowIso(),
      });
    }

    for (const userId of legacyMembers) {
      if (!memberships.some((membership) => membership.userId === userId)) {
        memberships.push({
          userId,
          role: ownerUserId === userId ? "owner" : "sales",
          createdAt: tidy(workspace?.createdAt) || nowIso(),
        });
      }
    }

    const memberIds = Array.from(new Set(memberships.map((membership) => membership.userId)));

    return {
      ...workspace,
      id: tidy(workspace?.id),
      name: tidy(workspace?.name),
      slug: tidy(workspace?.slug),
      tier: tidy(workspace?.tier) || "pilot",
      ownerUserId,
      memberIds,
      memberships,
      createdAt: tidy(workspace?.createdAt) || nowIso(),
    };
  }).filter((workspace) => workspace.id);
  db.invitations = Array.isArray(db.invitations) ? db.invitations : [];
  db.sessions = Array.isArray(db.sessions) ? db.sessions : [];
  db.projectsByWorkspace = db.projectsByWorkspace && typeof db.projectsByWorkspace === "object" ? db.projectsByWorkspace : {};
  db.auditEvents = Array.isArray(db.auditEvents) ? db.auditEvents : [];
  db.telemetryEvents = Array.isArray(db.telemetryEvents) ? db.telemetryEvents : [];
  return db;
}

async function readDbFromSupabaseTables() {
  const client = getSupabaseAdmin();
  if (!client) return null;

  // Generation register FIRST, then the eight snapshot tables. Read ordering
  // is load-bearing for the migration-013 CAS: a commit that lands after our
  // register read but before our RPC has moved the generation AHEAD of the
  // snapshot we are assembling, so the commit refuses (stale) and the caller
  // retries. Reading the register last would admit the opposite race - a
  // register read AFTER a commit, against tables read BEFORE it - and let an
  // older snapshot reconcile over rows we never saw. The guard can therefore
  // only under-accept (a needless retry), never over-accept.
  const genReadT0 = STORE_PROFILE ? performance.now() : 0;
  const genResult = await readAllSupabaseRows(client, SUPABASE_WINGMAN_GENERATION_TABLE, {
    select: "id,generation",
    order: "id",
    pageSize: SUPABASE_WINGMAN_READ_PAGE_SIZE,
  });
  if (STORE_PROFILE) {
    storeProfile("storage.profile.read_table", {
      table: "generation",
      ms: roundMs(performance.now() - genReadT0),
      rows: Array.isArray(genResult?.data) ? genResult.data.length : 0,
      pages: genResult?.pages ?? 0,
      complete: !genResult?.error && !genResult?.truncated,
    });
  }
  if (genResult.error) {
    // No register means no commit baseline: without a generation to claim, a
    // snapshot commit would reconcile unguarded (migration 013 is not applied
    // to this database), so the read refuses instead of serving a snapshot
    // that could destroy rows in the next commit.
    lastTablesReadIncomplete = true;
    lastStorageWarning = `${genResult.error.message} (generation register read failed; refusing to serve a snapshot without a commit baseline)`;
    logWingmanEvent("error", "storage.read.truncated", { reason: genResult.error.message });
    return null;
  }
  // The register holds exactly one row ('global'). An empty register is
  // treated as generation 0: the commit RPC then refuses (the claim cannot
  // match a missing row), surfacing loudly instead of committing unguarded.
  const genRow = Array.isArray(genResult.data) ? genResult.data.find((row) => row?.id === "global") : undefined;
  lastTablesGeneration = genRow ? Math.max(0, Number(genRow.generation) || 0) : 0;

  const readOptions = { order: "id", pageSize: SUPABASE_WINGMAN_READ_PAGE_SIZE };
  const tableReads = [
    ["users", SUPABASE_WINGMAN_USERS_TABLE],
    ["workspaces", SUPABASE_WINGMAN_WORKSPACES_TABLE],
    ["members", SUPABASE_WINGMAN_MEMBERS_TABLE],
    ["invitations", SUPABASE_WINGMAN_INVITATIONS_TABLE],
    ["sessions", SUPABASE_WINGMAN_SESSIONS_TABLE],
    ["projects", SUPABASE_WINGMAN_PROJECTS_TABLE],
    ["audit", SUPABASE_WINGMAN_AUDIT_TABLE],
    ["telemetry", SUPABASE_WINGMAN_TELEMETRY_TABLE],
  ];
  const readT0 = STORE_PROFILE ? performance.now() : 0;
  const results = await Promise.all(
    tableReads.map(async ([label, table]) => {
      const t0 = STORE_PROFILE ? performance.now() : 0;
      const result = await readAllSupabaseRows(client, table, readOptions);
      if (STORE_PROFILE) {
        storeProfile("storage.profile.read_table", {
          table: label,
          ms: roundMs(performance.now() - t0),
          rows: Array.isArray(result?.data) ? result.data.length : 0,
          pages: result?.pages ?? 0,
          complete: !result?.error && !result?.truncated,
        });
      }
      return result;
    }),
  );
  if (STORE_PROFILE) {
    storeProfile("storage.profile.read_total", { ms: roundMs(performance.now() - readT0), tables: tableReads.length });
  }

  const firstError = results.find((result) => result.error)?.error;
  if (firstError) {
    lastTablesReadIncomplete = true;
    lastStorageWarning = `${firstError.message} (table read did not reach the end; refusing to serve a truncated snapshot)`;
    logWingmanEvent("error", "storage.read.truncated", {
      reason: firstError.message,
    });
    return null;
  }

  // Sentinel bookkeeping happens only after the every-table-completeness
  // gate above: reaching here proves all eight reads were full.
  lastTablesReadIncomplete = false;

  const usersRows = results[0].data ?? [];
  const workspaceRows = results[1].data ?? [];
  const memberRows = results[2].data ?? [];
  const invitationRows = results[3].data ?? [];
  const sessionRows = results[4].data ?? [];
  const projectRows = results[5].data ?? [];
  const auditRows = results[6].data ?? [];
  const telemetryRows = results[7].data ?? [];

  const membershipsByWorkspace = new Map();
  const workspaceIdsByUser = new Map();
  for (const member of memberRows) {
    const workspaceId = tidy(member?.workspace_id);
    const userId = tidy(member?.user_id);
    if (!workspaceId || !userId) continue;
    membershipsByWorkspace.set(workspaceId, [
      ...(membershipsByWorkspace.get(workspaceId) ?? []),
      {
        userId,
        role: normalizeWorkspaceRole(member?.role, "sales"),
        createdAt: tidy(member?.created_at) || nowIso(),
      },
    ]);
    workspaceIdsByUser.set(userId, [...(workspaceIdsByUser.get(userId) ?? []), workspaceId]);
  }

  const db = normalizeDb({
    version: 1,
    updatedAt: nowIso(),
    users: usersRows.map((row) => ({
      id: tidy(row?.id),
      name: tidy(row?.name),
      company: tidy(row?.company),
      email: tidy(row?.email),
      role: tidy(row?.role) || "sales",
      passwordSalt: tidy(row?.password_salt),
      passwordHash: tidy(row?.password_hash),
      workspaceIds: workspaceIdsByUser.get(tidy(row?.id)) ?? [],
      createdAt: tidy(row?.created_at),
      lastLoginAt: tidy(row?.last_login_at),
      status: tidy(row?.status) || "active",
    })),
    workspaces: workspaceRows.map((row) => ({
      id: tidy(row?.id),
      name: tidy(row?.name),
      slug: tidy(row?.slug),
      tier: tidy(row?.tier) || "pilot",
      ownerUserId: tidy(row?.owner_user_id),
      memberIds: (membershipsByWorkspace.get(tidy(row?.id)) ?? []).map((membership) => membership.userId),
      memberships: membershipsByWorkspace.get(tidy(row?.id)) ?? [],
      createdAt: tidy(row?.created_at),
    })),
    invitations: invitationRows.map((row) => ({
      id: tidy(row?.id),
      workspaceId: tidy(row?.workspace_id),
      email: normalizeEmail(row?.email),
      role: normalizeWorkspaceRole(row?.role, "customer"),
      status: tidy(row?.status) || "pending",
      invitedByUserId: tidy(row?.invited_by_user_id),
      invitedByName: tidy(row?.invited_by_name),
      invitedByEmail: normalizeEmail(row?.invited_by_email),
      tokenHash: tidy(row?.token_hash),
      createdAt: tidy(row?.created_at) || nowIso(),
      acceptedAt: tidy(row?.accepted_at) || undefined,
    })).filter((invitation) => invitation.id && invitation.workspaceId && invitation.email),
    sessions: sessionRows.map((row) => ({
      id: tidy(row?.id),
      tokenHash: tidy(row?.token_hash),
      userId: tidy(row?.user_id),
      workspaceId: tidy(row?.workspace_id),
      createdAt: tidy(row?.created_at),
      expiresAt: tidy(row?.expires_at),
      lastSeenAt: tidy(row?.last_seen_at),
    })),
    projectsByWorkspace: {},
    auditEvents: auditRows
      .map((row) => ({
        ...(row?.payload && typeof row.payload === "object" ? row.payload : {}),
        id: tidy(row?.id),
        workspaceId: tidy(row?.workspace_id) || undefined,
        projectId: tidy(row?.project_id) || undefined,
        actorName: tidy(row?.actor_name),
        actorEmail: tidy(row?.actor_email),
        scope: tidy(row?.scope),
        action: tidy(row?.action),
        severity: tidy(row?.severity),
        detail: tidy(row?.detail),
        createdAt: tidy(row?.created_at),
      }))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    telemetryEvents: telemetryRows
      .map((row) => ({
        ...(row?.payload && typeof row.payload === "object" ? row.payload : {}),
        id: tidy(row?.id),
        workspaceId: tidy(row?.workspace_id) || undefined,
        userId: tidy(row?.user_id) || undefined,
        projectId: tidy(row?.project_id) || undefined,
        kind: tidy(row?.kind),
        message: tidy(row?.message),
        timestamp: tidy(row?.timestamp),
      }))
      .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp))),
  });

  for (const row of workspaceRows) {
    const workspaceId = tidy(row?.id);
    if (!workspaceId) continue;
    db.projectsByWorkspace[workspaceId] = {
      activeProjectId: tidy(row?.active_project_id) || null,
      projects: projectRows
        .filter((project) => tidy(project?.workspace_id) === workspaceId)
        .map((project) => project?.payload)
        .filter(Boolean),
    };
  }

  lastStorageWarning = "";
  return db;
}

async function readDbFromSupabase() {
  const client = getSupabaseAdmin();
  if (!client) return null;

  const { data, error } = await client
    .from(SUPABASE_WINGMAN_STATE_TABLE)
    .select("payload")
    .eq("id", SUPABASE_WINGMAN_STATE_ROW_ID)
    .maybeSingle();

  if (error) {
    lastStorageWarning = error.message;
    return null;
  }

  if (!data?.payload || typeof data.payload !== "object") {
    lastStorageWarning = "";
    return emptyDb();
  }

  lastStorageWarning = "";
  return normalizeDb(data.payload);
}

export function snapshotCommitPayloadBytes(payload) {
  return Buffer.byteLength(JSON.stringify({ payload: payload ?? {} }));
}

/**
 * Migration-013 optimistic-concurrency refusal (migration 013).
 *
 * wingman_snapshot_commit claims the generation the snapshot was read at
 * inside its own transaction; when another writer (typically another Wingman
 * server instance sharing this Supabase project - each process has its own
 * store lock, so the in-process mutex cannot serialize them) committed
 * between our read and our commit, the claim misses and the RPC returns
 * { committed: false, stale: true, current_generation }. Throwing this typed
 * error lets the sync handler re-read the CURRENT snapshot (which contains
 * the winner's rows), re-merge its client payload, and retry - instead of
 * letting the second commit reconcile the first writer's rows away as
 * "stale". Any other handler that hits it surfaces a 503 rather than ever
 * committing an outdated whole-snapshot reconcile.
 */
export class SnapshotStaleError extends Error {
  constructor(expectedGeneration, currentGeneration, reason = "") {
    super(
      `wingman_snapshot_commit refused the snapshot: it was read at generation ${expectedGeneration} ` +
        `but the store is at ${currentGeneration}. Re-read the current snapshot and retry.${reason ? ` ${reason}` : ""}`,
    );
    this.name = "SnapshotStaleError";
    this.code = "SNAPSHOT_STALE";
    this.expectedGeneration = expectedGeneration;
    this.currentGeneration = currentGeneration;
  }
}

/**
 * Migration-015 per-row optimistic-concurrency refusal.
 *
 * wingman_project_put (ADR-0001 Phase 1 per-project revisioned sync) commits
 * ONE project row guarded by the row's OWN revision: the guarded UPDATE
 * matches on the payload syncRevision the caller read at, so a concurrent
 * commit from another server instance (own store lock, shared Supabase
 * project) leaves the row at a newer revision and the RPC refuses with
 * { committed: false, stale: true, current_revision } - nothing was written.
 * Throwing this typed error lets the per-project handler re-read the current
 * row, re-merge its client payload, and retry, exactly like the whole-snapshot
 * stale retry (SnapshotStaleError / migration 013) but scoped to one row.
 */
export class ProjectRowStaleError extends Error {
  constructor(expectedRevision, currentRevision, reason = "") {
    super(
      `wingman_project_put refused the row: it was read at revision ${expectedRevision} ` +
        `but the row is at ${currentRevision}. Re-read the current row and retry.${reason ? ` ${reason}` : ""}`,
    );
    this.name = "ProjectRowStaleError";
    this.code = "PROJECT_ROW_STALE";
    this.expectedRevision = expectedRevision;
    this.currentRevision = currentRevision;
  }
}

// Bounded read-merge-commit retries for the sync path when the whole-snapshot
// commit is refused as stale (another instance won the race). Each retry is a
// fresh read + merge + commit, so the bound only caps how many times the sync
// is willing to lose the generation race before surfacing a 503.
const SNAPSHOT_RETRY_MAX_ATTEMPTS = Math.max(
  2,
  Number(process.env.WINGMAN_SNAPSHOT_RETRY_ATTEMPTS || 5),
);

export function snapshotCommitPayloadTooLargeError(payload, maxBytes = SNAPSHOT_COMMIT_MAX_PAYLOAD_BYTES) {
  const bytes = snapshotCommitPayloadBytes(payload);
  if (bytes <= maxBytes) return null;
  return {
    bytes,
    maxBytes,
    error:
      `Snapshot payload is ${bytes} bytes, exceeding the ${maxBytes}-byte wingman_snapshot_commit limit. ` +
      "Shrink the snapshot or write in smaller batches; nothing was sent.",
  };
}

/**
 * The wingman_projects ROW shape for a project document, shared by the
 * whole-snapshot commit (writeDbToSupabaseTables) and the per-project guarded
 * commit (migration 015 wingman_project_put) so the two write paths cannot
 * drift. The row columns are CHECK-constrained to the canonical pipeline
 * vocabulary (migration 001) while the document the client owns speaks
 * ProjectStage/StatusVariant strings. Canonicalise here - verbatim copying
 * made every real "Proposal Builder" project fail the commit with a 23514
 * (ADR-0001 §1.2c/§1.2g). The full client document stays untouched inside
 * `payload`, so reads round-trip the original strings.
 */
function projectRowForCommit(project, workspaceId) {
  const payload = cloneJson(project, {});
  return {
    id: payload.id,
    workspace_id: workspaceId,
    owner_id: payload.ownerId || null,
    project_name: payload.name || "Untitled Project",
    customer: payload.customer || null,
    site: payload.site || null,
    room_name: payload.roomName || null,
    stage: canonicalStageForRow(payload.stage),
    status: canonicalStatusForRow(payload.status),
    created_at: payload.createdAt || nowIso(),
    updated_at: payload.updatedAt || payload.createdAt || nowIso(),
    payload,
  };
}

/** The wingman_audit_events ROW shape for an audit event (shared by the
 * whole-snapshot commit and the per-project guarded commit). */
function auditEventRowForCommit(event, workspaceIdFallback = null) {
  return {
    id: event.id,
    workspace_id: event.workspaceId || workspaceIdFallback || null,
    project_id: event.projectId || null,
    actor_name: event.actorName || "Wingman",
    actor_email: event.actorEmail || null,
    scope: event.scope || "projects",
    action: event.action || "updated",
    severity: event.severity || "info",
    detail: event.detail || "Workspace activity captured.",
    created_at: event.createdAt || nowIso(),
    payload: cloneJson(event, {}),
  };
}

/**
 * Commit ONE project row through the migration-015 wingman_project_put RPC
 * (supabase-tables mode). Returns true on success; refuses with
 * ProjectRowStaleError when the row moved past the expected revision (the
 * caller re-reads and retries); returns false on any other remote failure
 * (lastStorageWarning is set, mirroring the whole-snapshot writers).
 */
async function commitProjectRowViaRpc({ projectRow, expectedRevision, auditRow }) {
  const client = getSupabaseAdmin();
  if (!client) return false;

  const tooLarge = snapshotCommitPayloadTooLargeError(
    { projects: [projectRow] },
    SNAPSHOT_COMMIT_MAX_PAYLOAD_BYTES,
  );
  if (tooLarge) {
    logWingmanEvent("error", "storage.project_put.refused_payload_too_large", {
      reason: tooLarge.error,
      bytes: tooLarge.bytes,
      maxBytes: tooLarge.maxBytes,
    });
    lastStorageWarning = tooLarge.error;
    return false;
  }

  const rpcT0 = STORE_PROFILE ? performance.now() : 0;
  const { data, error } = await client.rpc(SUPABASE_WINGMAN_PROJECT_PUT_FN, {
    p_row: projectRow,
    p_expected_revision: expectedRevision,
    p_audit: auditRow ?? null,
  });
  if (STORE_PROFILE) {
    storeProfile("storage.profile.project_put_rpc", { ms: roundMs(performance.now() - rpcT0), ok: !error });
  }
  if (error) {
    lastStorageWarning = error.message;
    logWingmanEvent("error", "storage.project_put.failed", { reason: error.message });
    return false;
  }
  if (data && typeof data === "object" && data.committed === false) {
    if (data.stale === true) {
      // Lost the per-row revision race: NOTHING was written. Signal the caller
      // to re-read the row and re-merge.
      throw new ProjectRowStaleError(
        expectedRevision,
        Number(data.current_revision) || expectedRevision,
        data.reason,
      );
    }
    const refusal = typeof data.reason === "string" && data.reason ? data.reason : "wingman_project_put refused the commit without a reason.";
    lastStorageWarning = refusal;
    logWingmanEvent("error", "storage.project_put.refused", { reason: refusal });
    return false;
  }

  lastStorageWarning = "";
  return true;
}

async function writeDbToSupabaseTables(db) {
  const client = getSupabaseAdmin();
  if (!client) return false;

  const writeT0 = STORE_PROFILE ? performance.now() : 0;

  // Reject non-default SUPABASE_WINGMAN_*_TABLE overrides loudly: migration
  // 009's wingman_snapshot_commit hard-codes the migration-created tables, so
  // honoring overridden names on the write would commit to different tables
  // than the reads address - every change would silently disappear on the next
  // read. This must throw even outside fail-closed mode: it is a configuration
  // error, not a transient outage.
  const divergentOverrides = Object.entries(NORMALIZED_TABLE_OVERRIDES).filter(
    ([key, value]) => value !== NORMALIZED_TABLE_DEFAULTS[key],
  );
  if (divergentOverrides.length > 0) {
    const names = divergentOverrides.map(([key, value]) => `${key}=${value}`).join(", ");
    const error = new Error(
      "supabase-tables storage cannot honour table-name overrides: wingman_snapshot_commit " +
        `(migration 009) targets the migration-created default tables, but overrides are set (${names}). ` +
        "Remove the SUPABASE_WINGMAN_*_TABLE overrides (keep the migration-created wingman_* tables), " +
        "or use single-row `supabase` mode where SUPABASE_WINGMAN_STATE_TABLE is honoured.",
    );
    logWingmanEvent("error", "storage.table_overrides.unsupported", { reason: error.message });
    throw error;
  }

  const normalized = normalizeDb(cloneJson(db, emptyDb()));
  const workspaces = normalized.workspaces.map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    tier: workspace.tier || "pilot",
    owner_user_id: workspace.ownerUserId,
    active_project_id: normalized.projectsByWorkspace?.[workspace.id]?.activeProjectId || null,
    created_at: workspace.createdAt || nowIso(),
  }));
  const users = normalized.users.map((user) => ({
    id: user.id,
    name: user.name,
    company: user.company || null,
    email: user.email,
    role: user.role || "sales",
    password_salt: user.passwordSalt,
    password_hash: user.passwordHash,
    status: user.status || "active",
    created_at: user.createdAt || nowIso(),
    last_login_at: user.lastLoginAt || null,
  }));
  const memberships = normalized.workspaces.flatMap((workspace) =>
    asArray(workspace.memberships).map((membership) => ({
      id: `${workspace.id}:${membership.userId}`,
      workspace_id: workspace.id,
      user_id: membership.userId,
      role: normalizeWorkspaceRole(membership.role, workspace.ownerUserId === membership.userId ? "owner" : "sales"),
      created_at: membership.createdAt || workspace.createdAt || nowIso(),
    })),
  );
  const invitations = normalized.invitations.map((invitation) => ({
    id: invitation.id,
    workspace_id: invitation.workspaceId,
    email: invitation.email,
    role: normalizeWorkspaceRole(invitation.role, "customer"),
    status: tidy(invitation.status) || "pending",
    invited_by_user_id: invitation.invitedByUserId || null,
    invited_by_name: invitation.invitedByName || "Wingman",
    invited_by_email: invitation.invitedByEmail || null,
    token_hash: invitation.tokenHash,
    created_at: invitation.createdAt || nowIso(),
    accepted_at: invitation.acceptedAt || null,
  }));
  const sessions = normalized.sessions.map((session) => ({
    id: session.id,
    token_hash: session.tokenHash,
    user_id: session.userId,
    workspace_id: session.workspaceId,
    created_at: session.createdAt,
    expires_at: session.expiresAt,
    last_seen_at: session.lastSeenAt,
  }));
  const projectWorkspaceMap = new Map();
  const projects = Object.entries(normalized.projectsByWorkspace).flatMap(([workspaceId, state]) =>
    asArray(state?.projects).map((project) => {
      const row = projectRowForCommit(project, workspaceId);
      projectWorkspaceMap.set(row.id, workspaceId);
      return row;
    }),
  );
  const auditEvents = normalized.auditEvents.map((event) =>
    auditEventRowForCommit(event, projectWorkspaceMap.get(event.projectId) || null),
  );
  const telemetryEvents = normalized.telemetryEvents.map((event) => ({
    id: event.id,
    workspace_id: event.workspaceId || projectWorkspaceMap.get(event.projectId) || null,
    user_id: event.userId || null,
    project_id: event.projectId || null,
    kind: event.kind || "info",
    message: event.message || "Runtime event",
    timestamp: event.timestamp || nowIso(),
    payload: cloneJson(event, {}),
  }));

  const payload = { users, workspaces, memberships, invitations, sessions, projects, auditEvents, telemetryEvents };

  // Truncation sentinel: if the most recent supabase-tables read did not
  // provably reach the end of every table, this snapshot was built while the
  // remote was unreadable, and the commit's delete-rows-not-in-snapshot
  // reconciliation would erase everything written since. Abort before the RPC
  // - the commit is the only destructive step.
  if (lastTablesReadIncomplete) {
    const message =
      "Refusing to commit the snapshot: the most recent remote read did not reach the end of every table, " +
      "so this snapshot may be stale and committing it would delete rows written since (wingman_snapshot_commit " +
      "reconciles by deleting rows absent from the payload). Retry after a complete read.";
    logWingmanEvent("error", "storage.snapshot_commit.refused_stale_read", { reason: message });
    lastStorageWarning = message;
    return false;
  }

  const tooLarge = snapshotCommitPayloadTooLargeError(payload);
  if (tooLarge) {
    logWingmanEvent("error", "storage.snapshot_commit.refused_payload_too_large", {
      reason: tooLarge.error,
      bytes: tooLarge.bytes,
      maxBytes: tooLarge.maxBytes,
    });
    lastStorageWarning = tooLarge.error;
    return false;
  }

  if (STORE_PROFILE) {
    // normalizeDb + row building + payload assembly, up to (not including)
    // the RPC. The RPC stage below includes supabase-js's own re-serialization
    // of this payload plus the HTTP round trip and the server-side
    // transaction.
    storeProfile("storage.profile.write_serialize", {
      ms: roundMs(performance.now() - writeT0),
      payloadBytes: JSON.stringify(payload).length,
      users: users.length,
      workspaces: workspaces.length,
      projects: projects.length,
      sessions: sessions.length,
      auditEvents: auditEvents.length,
      telemetryEvents: telemetryEvents.length,
    });
  }

  // ONE atomic server-side commit (migration 009/013, wingman_snapshot_commit)
  // that also CLAIMS the generation this snapshot was read at (migration 013):
  // the single-register-row lock serializes concurrent commits across server
  // INSTANCES (the in-process store mutex only serializes one process), and a
  // commit that lost the race refuses with committed:false/stale:true instead
  // of reconciling an outdated snapshot over the winner's fresh rows.
  try {
    const rpcT0 = STORE_PROFILE ? performance.now() : 0;
    const { data, error } = await client.rpc(SUPABASE_WINGMAN_SNAPSHOT_COMMIT_FN, {
      payload,
      expected_generation: lastTablesGeneration,
    });
    if (STORE_PROFILE) {
      storeProfile("storage.profile.write_rpc", { ms: roundMs(performance.now() - rpcT0), ok: !error });
    }
    if (error) {
      lastStorageWarning = error.message;
      logWingmanEvent("error", "storage.snapshot_commit.failed", { reason: error.message });
      return false;
    }
    if (data && typeof data === "object" && data.committed === false) {
      if (data.stale === true) {
        // Lost the generation race: NOTHING was written (the RPC refuses
        // before touching any table). Signal the caller to re-read and retry.
        // Thrown even in fail-open mode: a stale refusal means another
        // instance owns the current state, so falling back to the local file
        // store would fork the database.
        throw new SnapshotStaleError(lastTablesGeneration, Number(data.current_generation) || lastTablesGeneration, data.reason);
      }
      const refusal = typeof data.reason === "string" && data.reason ? data.reason : "wingman_snapshot_commit refused the commit without a reason.";
      lastStorageWarning = refusal;
      logWingmanEvent("error", "storage.snapshot_commit.refused", { reason: refusal });
      return false;
    }
  } catch (reason) {
    if (reason instanceof SnapshotStaleError) throw reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    lastStorageWarning = message;
    logWingmanEvent("error", "storage.snapshot_commit.failed", { reason: message });
    return false;
  }

  lastStorageWarning = "";
  return true;
}

async function writeDbToSupabase(db) {
  const client = getSupabaseAdmin();
  if (!client) return false;

  const payload = normalizeDb(cloneJson(db, emptyDb()));
  const { error } = await client.from(SUPABASE_WINGMAN_STATE_TABLE).upsert({
    id: SUPABASE_WINGMAN_STATE_ROW_ID,
    payload,
    updated_at: nowIso(),
  });

  if (error) {
    lastStorageWarning = error.message;
    return false;
  }

  lastStorageWarning = "";
  return true;
}

async function readDb() {
  const mode = configuredStorageMode();
  if (mode === "supabase-tables") {
    const remote = await readDbFromSupabaseTables();
    if (remote) {
      lastStorageModeUsed = "supabase-tables";
      return remote;
    }
    if (STORAGE_FAIL_CLOSED) {
      throw new Error(`Supabase tables storage read failed${lastStorageWarning ? `: ${lastStorageWarning}` : "."}`);
    }
  }

  if (mode === "supabase") {
    const remote = await readDbFromSupabase();
    if (remote) {
      lastStorageModeUsed = "supabase";
      return remote;
    }
    if (STORAGE_FAIL_CLOSED) {
      throw new Error(`Supabase storage read failed${lastStorageWarning ? `: ${lastStorageWarning}` : "."}`);
    }
  }

  if (mode !== "file" && STORAGE_FAIL_CLOSED) {
    throw new Error(`File storage fallback is disabled while storage mode is ${mode}.`);
  }
  lastStorageModeUsed = "file";
  lastStorageWarning = "";
  const db =
    (await readJsonFile(WINGMAN_APP_DB_FILE, null)) ??
    (await readJsonFile(LEGACY_WINGMAN_APP_DB_FILE, emptyDb()));
  return normalizeDb(db);
}

async function writeDb(db) {
  db.updatedAt = nowIso();
  const mode = configuredStorageMode();
  if (mode === "supabase-tables") {
    const saved = await writeDbToSupabaseTables(db);
    if (saved) {
      lastStorageModeUsed = "supabase-tables";
      return;
    }
    if (STORAGE_FAIL_CLOSED) {
      throw new Error(`Supabase tables storage write failed${lastStorageWarning ? `: ${lastStorageWarning}` : "."}`);
    }
  }
  if (mode === "supabase") {
    const saved = await writeDbToSupabase(db);
    if (saved) {
      lastStorageModeUsed = "supabase";
      return;
    }
    if (STORAGE_FAIL_CLOSED) {
      throw new Error(`Supabase storage write failed${lastStorageWarning ? `: ${lastStorageWarning}` : "."}`);
    }
  }
  if (mode !== "file" && STORAGE_FAIL_CLOSED) {
    throw new Error(`File storage fallback is disabled while storage mode is ${mode}.`);
  }
  lastStorageModeUsed = "file";
  lastStorageWarning = "";
  await writeJsonFile(WINGMAN_APP_DB_FILE, db);
}

/**
 * Test-only seam: persist an arbitrary database object through the exact
 * file-mode write path (writeDb -> writeJsonFile's crash-atomic temp+rename),
 * so the process-kill crash-atomicity suite can drive a large file-mode write
 * in a child process without going through an HTTP handler. Refuses to run in
 * any Supabase-backed mode so it can never shadow real storage behaviour.
 */
export async function __writeFileModeDbForCrashTest(db) {
  if (configuredStorageMode() !== "file") {
    throw new Error("__writeFileModeDbForCrashTest requires WINGMAN_STORAGE_MODE=file.");
  }
  await writeDb(db);
}

async function readGovernance() {
  return readJsonFile(GOVERNANCE_FILE, {
    recommendationRules: {
      id: "guided-project-physical-dynamics",
      version: "2026.03.10",
      approvedAt: "2026-03-10T09:00:00.000Z",
      approvedBy: "WyreStorm Solutions Engineering",
      catalogVersion: "wingman-canonical-source-v1",
      changeSummary: "Guided Project recommendations branch on source origin, first hop, cable media, network readiness, and endpoint delivery.",
      explainability: [],
    },
    deploymentControls: {
      workspaceIsolation: "Projects, telemetry, and audit events are stored per authenticated workspace.",
      auditCoverage: [],
      retentionDays: 90,
    },
  });
}

async function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derived = await scryptAsync(password, salt, 64);
  return {
    salt,
    hash: Buffer.from(derived).toString("hex"),
  };
}

async function verifyPassword(password, user) {
  const next = await hashPassword(password, user.passwordSalt);
  const expected = Buffer.from(user.passwordHash, "hex");
  const actual = Buffer.from(next.hash, "hex");
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values) {
  return Array.from(new Set(asArray(values).map((value) => tidy(value)).filter(Boolean)));
}

function getWorkspaceMemberships(workspace) {
  const normalizedWorkspace = normalizeDb({ ...emptyDb(), workspaces: [workspace] }).workspaces[0];
  return asArray(normalizedWorkspace?.memberships);
}

function getWorkspaceRoleForUser(workspace, userId) {
  if (!workspace || !userId) return null;
  const membership = getWorkspaceMemberships(workspace).find((entry) => entry.userId === userId);
  return membership?.role || null;
}

function permissionsForWorkspaceRole(role) {
  const normalizedRole = normalizeWorkspaceRole(role, "sales");
  const isAdmin = normalizedRole === "owner" || normalizedRole === "admin";
  const isEditor = isAdmin || normalizedRole === "sales";
  return {
    canManageWorkspace: isAdmin,
    canEditProjects: isEditor,
    canCreateInternalComments: isEditor,
    canCreateCustomerComments: isEditor || normalizedRole === "customer",
    canPrepareShares: isEditor,
    canRegisterAttachments: isEditor,
    canMarkCommercialReady: isEditor,
    canViewDiagnostics: isEditor,
  };
}

function canManageWorkspaceRole(actorRole, targetRole) {
  const actor = normalizeWorkspaceRole(actorRole, "sales");
  const target = normalizeWorkspaceRole(targetRole, "sales");
  if (actor === "owner") return target !== "owner";
  if (actor === "admin") return target === "sales" || target === "customer";
  return false;
}

function addMembershipToWorkspace(workspace, userId, role, createdAt = nowIso()) {
  const memberships = getWorkspaceMemberships(workspace).filter((membership) => membership.userId !== userId);
  memberships.push({
    userId,
    role: normalizeWorkspaceRole(role, workspace.ownerUserId === userId ? "owner" : "sales"),
    createdAt,
  });
  workspace.memberships = memberships;
  workspace.memberIds = unique(memberships.map((membership) => membership.userId));
}

function removePendingInvitationsForMember(db, workspaceId, email) {
  db.invitations = asArray(db.invitations).map((invitation) => {
    if (invitation.workspaceId !== workspaceId || invitation.email !== email || invitation.status !== "pending") {
      return invitation;
    }
    return {
      ...invitation,
      status: "accepted",
      acceptedAt: invitation.acceptedAt || nowIso(),
    };
  });
}

function invitationExpiryIso(invitation) {
  const createdAtMs = Date.parse(invitation?.createdAt || "");
  const base = Number.isFinite(createdAtMs) ? createdAtMs : Date.now();
  return new Date(base + INVITATION_TTL_MS).toISOString();
}

function isInvitationExpired(invitation, nowMs = Date.now()) {
  const createdAtMs = Date.parse(invitation?.createdAt || "");
  if (!Number.isFinite(createdAtMs)) return true;
  return createdAtMs + INVITATION_TTL_MS <= nowMs;
}

function createInvitationToken() {
  return crypto.randomBytes(24).toString("hex");
}

function publicWorkspaceMember(workspace, membership, user, lastSeenAt) {
  return {
    id: `${workspace.id}:${membership.userId}`,
    userId: membership.userId,
    name: user?.name || user?.email || "Workspace member",
    email: user?.email || "",
    company: user?.company || undefined,
    role: normalizeWorkspaceRole(membership.role, membership.userId === workspace.ownerUserId ? "owner" : "sales"),
    joinedAt: membership.createdAt || workspace.createdAt || nowIso(),
    lastSeenAt: lastSeenAt || undefined,
  };
}

function publicInvitation(invitation, workspace, token) {
  return {
    id: invitation.id,
    workspaceId: invitation.workspaceId,
    workspaceName: workspace?.name || "Wingman Workspace",
    email: invitation.email,
    role: normalizeWorkspaceRole(invitation.role, "customer"),
    status: tidy(invitation.status) || "pending",
    invitedByName: invitation.invitedByName || "Wingman",
    invitedByEmail: invitation.invitedByEmail || "",
    createdAt: invitation.createdAt || nowIso(),
    expiresAt: invitationExpiryIso(invitation),
    acceptedAt: invitation.acceptedAt || undefined,
    acceptUrl: token ? `/invite?token=${encodeURIComponent(token)}` : undefined,
  };
}

function findWorkspaceMember(workspace, userId) {
  return getWorkspaceMemberships(workspace).find((membership) => membership.userId === userId) || null;
}

function findInvitationByToken(db, token) {
  const tokenHash = hashToken(token);
  return asArray(db.invitations).find((invitation) => invitation.tokenHash === tokenHash) || null;
}

function findPendingInvitationByToken(db, token) {
  const invitation = findInvitationByToken(db, token);
  if (!invitation) return null;
  if (invitation.status !== "pending") return null;
  if (isInvitationExpired(invitation)) return null;
  return invitation;
}

function sanitizeAuditEntry(entry, fallback = {}) {
  return {
    id: tidy(entry?.id) || makeId("audit"),
    workspaceId: tidy(entry?.workspaceId || fallback.workspaceId) || undefined,
    scope: tidy(entry?.scope || fallback.scope) || "projects",
    action: tidy(entry?.action || fallback.action) || "updated",
    detail: tidy(entry?.detail || fallback.detail) || "Workspace activity captured.",
    actorName: tidy(entry?.actorName || fallback.actorName) || "Wingman",
    actorEmail: normalizeEmail(entry?.actorEmail || fallback.actorEmail),
    severity: ["info", "warn", "error"].includes(tidy(entry?.severity || fallback.severity)) ? tidy(entry?.severity || fallback.severity) : "info",
    createdAt: tidy(entry?.createdAt || fallback.createdAt) || nowIso(),
    projectId: tidy(entry?.projectId || fallback.projectId) || undefined,
  };
}

function mergeById(existing, incoming, fallbackFactory = (item) => item) {
  const out = new Map();
  for (const item of asArray(existing)) {
    if (!item?.id) continue;
    out.set(item.id, cloneJson(item));
  }
  for (const item of asArray(incoming)) {
    const normalized = fallbackFactory(item);
    if (!normalized?.id) continue;
    out.set(normalized.id, normalized);
  }
  return Array.from(out.values());
}

/**
 * Id-keyed project collections merged per item with by-id last-writer-wins
 * (ADR-0001 §1.2i), mirroring the per-sub-document merge one level down: two
 * sessions adding their OWN items (or editing DIFFERENT items) of one
 * collection must both survive a sync instead of the whole array travelling
 * with the whole-project LWW winner (which dropped the other session's items
 * wholesale). Each entry names the item's identity key and the embedded
 * write-time key the client stamps on save. productSelections are keyed by
 * sku (their identity) rather than id. Kept identical to the client-side
 * mirror in src/wingman2/data/projectStore.ts (cross-side parity coverage:
 * server/project-store-id-keyed-collections.parity.test.mjs).
 */
export const ID_KEYED_COLLECTION_MERGE_KEYS = {
  compareRuns: { idKey: "id", timeKey: "createdAt" },
  proposalVersions: { idKey: "id", timeKey: "savedAt" },
  requirements: { idKey: "id", timeKey: "updatedAt" },
  productSelections: { idKey: "sku", timeKey: "addedAt" },
  visualAssets: { idKey: "id", timeKey: "updatedAt" },
};

/**
 * Deterministic per-item LWW between the STORED and the EDITOR copy of one
 * collection item (pure, both sides identical):
 *
 *   1. the item with the later embedded write time wins;
 *   2. when only one side carries a real time, that side wins (a timed save
 *      is a real save; a legacy untimed copy cannot displace it);
 *   3. equal/absent times fall back to a total content order (lexicographic
 *      JSON) so the outcome never depends on which sync arrived first or on
 *      per-item author bookkeeping the client cannot carry. An identical
 *      re-sync (equal serialization) keeps the stored copy - a no-op.
 */
export function pickCollectionItemVersion(storedItem, editorItem, timeKey) {
  if (editorItem === undefined) return { value: storedItem, editorWon: false };
  if (storedItem === undefined) return { value: editorItem, editorWon: false };

  const storedTime = Date.parse(storedItem?.[timeKey] ?? "");
  const editorTime = Date.parse(editorItem?.[timeKey] ?? "");
  const storedValid = Number.isFinite(storedTime);
  const editorValid = Number.isFinite(editorTime);

  if (storedValid && editorValid && editorTime !== storedTime) {
    return editorTime > storedTime
      ? { value: editorItem, editorWon: true }
      : { value: storedItem, editorWon: false };
  }
  if (storedValid !== editorValid) {
    return editorValid ? { value: editorItem, editorWon: true } : { value: storedItem, editorWon: false };
  }

  const storedJson = JSON.stringify(storedItem);
  const editorJson = JSON.stringify(editorItem);
  if (editorJson === storedJson) return { value: storedItem, editorWon: false };
  return editorJson < storedJson
    ? { value: editorItem, editorWon: true }
    : { value: storedItem, editorWon: false };
}

/**
 * Merges one id-keyed collection between the STORED set and the EDITOR's set
 * (pure, shared by the server sync merge and, role-mapped, the client
 * hydration merge):
 *
 *   - items in both sets resolve per item (pickCollectionItemVersion);
 *   - items only the EDITOR has are added (a new item or an offline addition
 *     must survive a sync - the same non-lossy rule as the append-mostly
 *     by-id lanes);
 *   - items only the STORED set has are dropped ONLY when the editor is at
 *     least as fresh as the stored document (editorBasis >= storedBasis): a
 *     fresh editor's omission is a deliberate removal, while a stale editor
 *     (whose base predates the stored copy) may simply never have seen the
 *     item, so it is kept. Without this guard a by-id union would resurrect
 *     every removal the whole-array LWW used to honour.
 */
export function mergeIdKeyedCollectionItems(storedItems, editorItems, { idKey, timeKey, editorIsFresh }) {
  const storedMap = new Map();
  const storedOrder = [];
  for (const item of asArray(storedItems)) {
    const key = item?.[idKey];
    if (key === undefined || key === null || String(key) === "") continue;
    const normalizedKey = String(key);
    if (!storedMap.has(normalizedKey)) storedOrder.push(normalizedKey);
    storedMap.set(normalizedKey, cloneJson(item));
  }

  const editorKeys = new Set();
  for (const item of asArray(editorItems)) {
    const key = item?.[idKey];
    if (key === undefined || key === null || String(key) === "") continue;
    editorKeys.add(String(key));
  }

  const result = [];
  const resultKeys = new Set();
  for (const key of storedOrder) {
    if (!editorKeys.has(key) && editorIsFresh) continue; // fresh editor removed it
    const editorItem = asArray(editorItems).find((item) => String(item?.[idKey]) === key);
    const picked = pickCollectionItemVersion(storedMap.get(key), editorItem, timeKey);
    result.push(picked.value);
    resultKeys.add(key);
  }
  for (const item of asArray(editorItems)) {
    const key = item?.[idKey];
    if (key === undefined || key === null || String(key) === "") continue;
    const normalizedKey = String(key);
    if (resultKeys.has(normalizedKey)) continue;
    result.push(cloneJson(item));
    resultKeys.add(normalizedKey);
  }
  return result;
}

function sanitizeProject(project, workspaceId, userId) {
  const source = cloneJson(project, {});
  const createdAt = tidy(source.createdAt) || nowIso();
  const updatedAt = tidy(source.updatedAt) || createdAt;

  return {
    ...source,
    id: tidy(source.id) || makeId("proj"),
    workspaceId,
    ownerId: tidy(source.ownerId) || userId,
    name: tidy(source.name) || "Untitled Project",
    customer: tidy(source.customer),
    site: tidy(source.site),
    roomName: tidy(source.roomName),
    stage: tidy(source.stage) || "Discovery",
    status: tidy(source.status) || "Draft",
    notes: tidy(source.notes),
    createdAt,
    updatedAt,
    attachments: mergeById([], source.attachments, (item) => ({
      id: tidy(item?.id) || makeId("attach"),
      name: tidy(item?.name) || "Imported asset",
      kind: tidy(item?.kind) || "other",
      source: tidy(item?.source) || "Wingman",
      summary: tidy(item?.summary) || undefined,
      contentType: tidy(item?.contentType) || undefined,
      sizeBytes: Number.isFinite(Number(item?.sizeBytes)) ? Number(item.sizeBytes) : undefined,
      uploadedAt: tidy(item?.uploadedAt) || nowIso(),
      uploadedBy: tidy(item?.uploadedBy) || userId,
    })),
    comments: mergeById([], source.comments, (item) => ({
      id: tidy(item?.id) || makeId("comment"),
      body: tidy(item?.body),
      audience: tidy(item?.audience) === "customer" ? "customer" : "internal",
      authorName: tidy(item?.authorName) || "Wingman user",
      authorEmail: normalizeEmail(item?.authorEmail),
      createdAt: tidy(item?.createdAt) || nowIso(),
    })).filter((item) => item.body),
    shares: mergeById([], source.shares, (item) => ({
      id: tidy(item?.id) || makeId("share"),
      title: tidy(item?.title) || "Customer share pack",
      message: tidy(item?.message) || "",
      audience: tidy(item?.audience) === "internal" ? "internal" : "customer",
      status: tidy(item?.status) || "draft",
      shareUrl: tidy(item?.shareUrl) || undefined,
      accessCode: tidy(item?.accessCode) || undefined,
      summaryHeadline: tidy(item?.summaryHeadline) || undefined,
      createdAt: tidy(item?.createdAt) || nowIso(),
      createdBy: tidy(item?.createdBy) || userId,
    })),
    auditTrail: mergeById([], source.auditTrail, (item) => sanitizeAuditEntry(item, { actorName: "Wingman", actorEmail: "" }))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 20),
    recommendationGovernance: source.recommendationGovernance && typeof source.recommendationGovernance === "object"
      ? cloneJson(source.recommendationGovernance)
      : undefined,
    customerSummary: source.customerSummary && typeof source.customerSummary === "object"
      ? cloneJson(source.customerSummary)
      : undefined,
  };
}

function makeProjectAuditEvent({ scope, action, detail, user, projectId, workspaceId, severity = "info" }) {
  return sanitizeAuditEntry({
    workspaceId,
    scope,
    action,
    detail,
    actorName: user.name || user.email || "Wingman user",
    actorEmail: user.email || "",
    severity,
    projectId,
  });
}

function appendAuditEvent(db, event) {
  db.auditEvents = [event, ...asArray(db.auditEvents)].slice(0, AUDIT_RETENTION);
}

function appendProjectAudit(project, event) {
  project.auditTrail = [event, ...asArray(project.auditTrail)].slice(0, 20);
}

function appendTelemetryEvent(db, event) {
  db.telemetryEvents = [event, ...asArray(db.telemetryEvents)].slice(0, TELEMETRY_RETENTION);
}

function ensureWorkspaceState(db, workspaceId) {
  if (!db.projectsByWorkspace[workspaceId]) {
    db.projectsByWorkspace[workspaceId] = {
      activeProjectId: null,
      projects: [],
    };
  }
  const state = db.projectsByWorkspace[workspaceId];
  state.projects = asArray(state.projects);
  state.activeProjectId = tidy(state.activeProjectId) || null;
  return state;
}

function pruneExpiredSessions(db) {
  const now = Date.now();
  db.sessions = asArray(db.sessions).filter((session) => {
    const expiresAt = Date.parse(session?.expiresAt || "");
    return Number.isFinite(expiresAt) && expiresAt > now;
  });
}

function requestClientAddress(req) {
  const forwardedFor = tidy(req?.headers?.["x-forwarded-for"]);
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0];
    if (first) return tidy(first).toLowerCase();
  }
  const realIp = tidy(req?.headers?.["x-real-ip"]);
  if (realIp) return realIp.toLowerCase();
  return tidy(req?.socket?.remoteAddress || req?.connection?.remoteAddress || "unknown").toLowerCase();
}

function takeAuthRateLimitToken(req, action) {
  const key = `${tidy(action).toLowerCase()}:${requestClientAddress(req) || "unknown"}`;
  const nowMs = Date.now();
  const current = authRateBuckets.get(key);

  if (!current || nowMs - current.windowStart >= AUTH_RATE_LIMIT_WINDOW_MS) {
    authRateBuckets.set(key, {
      windowStart: nowMs,
      count: 1,
    });
    return {
      ok: true,
      remaining: Math.max(0, AUTH_RATE_LIMIT_MAX_REQUESTS - 1),
      retryAfterMs: 0,
    };
  }

  if (current.count >= AUTH_RATE_LIMIT_MAX_REQUESTS) {
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: Math.max(0, (current.windowStart + AUTH_RATE_LIMIT_WINDOW_MS) - nowMs),
    };
  }

  current.count += 1;
  authRateBuckets.set(key, current);
  return {
    ok: true,
    remaining: Math.max(0, AUTH_RATE_LIMIT_MAX_REQUESTS - current.count),
    retryAfterMs: 0,
  };
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    company: user.company || undefined,
    role: user.role || "sales",
  };
}

function publicWorkspace(workspace) {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    tier: workspace.tier || "pilot",
    memberCount: getWorkspaceMemberships(workspace).length,
  };
}

function makeSessionPayload(user, workspace) {
  const workspaceRole = getWorkspaceRoleForUser(workspace, user.id) || "sales";
  return {
    ok: true,
    session: {
      mode: "backend",
      issuedAt: nowIso(),
      user: publicUser(user),
      workspace: publicWorkspace(workspace),
      workspaceRole,
      permissions: permissionsForWorkspaceRole(workspaceRole),
    },
  };
}

function getTokenFromRequest(req, _url) {
  const authorization = typeof req?.headers?.authorization === "string"
    ? req.headers.authorization.trim()
    : "";

  if (authorization.toLowerCase().startsWith("bearer ")) {
    const token = authorization.slice(7).trim();
    if (token) return token;
  }

  const headerToken = typeof req?.headers?.["x-wingman-session"] === "string"
    ? req.headers["x-wingman-session"].trim()
    : "";

  if (headerToken) return headerToken;

  const cookieHeader = typeof req?.headers?.cookie === "string"
    ? req.headers.cookie
    : "";

  if (!cookieHeader) return "";

  const cookies = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex <= 0) continue;

    const name = cookie.slice(0, separatorIndex).trim();
    if (name !== "wingman_session") continue;

    const rawValue = cookie.slice(separatorIndex + 1).trim();
    if (!rawValue) return "";

    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return "";
}

function getAuthContext(req, url, db) {
  const token = getTokenFromRequest(req, url);
  if (!token) return { ok: false, error: "Authentication required." };

  pruneExpiredSessions(db);
  const session = db.sessions.find((candidate) => candidate.tokenHash === hashToken(token));
  if (!session) return { ok: false, error: "Session not found or expired." };

  const user = db.users.find((candidate) => candidate.id === session.userId);
  const workspace = db.workspaces.find((candidate) => candidate.id === session.workspaceId);
  if (!user || !workspace) return { ok: false, error: "Session context could not be restored." };
  const workspaceMembers = new Set(getWorkspaceMemberships(workspace).map((membership) => membership.userId));
  const userWorkspaceIds = new Set(asArray(user.workspaceIds));
  const isMember =
    workspace.ownerUserId === user.id ||
    workspaceMembers.has(user.id) ||
    userWorkspaceIds.has(workspace.id);
  if (!isMember) return { ok: false, error: "User is not authorized for this workspace." };

  const workspaceRole = getWorkspaceRoleForUser(workspace, user.id) || "sales";
  const permissions = permissionsForWorkspaceRole(workspaceRole);

  // Throttled last-seen stamp: only advance when the previous touch is older
  // than the cooldown, and ONLY ever as a side-effect of a write the handler
  // performs for its own reasons. The auth gate itself never persists, so a
  // read-only request can no longer trigger a full database-snapshot rewrite
  // just to keep a "last seen" timestamp warm.
  const lastSeenMs = Date.parse(String(session.lastSeenAt || ""));
  if (!Number.isFinite(lastSeenMs) || Date.now() - lastSeenMs >= LAST_SEEN_TOUCH_COOLDOWN_MS) {
    session.lastSeenAt = nowIso();
  }
  return { ok: true, session, token, user, workspace, workspaceRole, permissions };
}

export async function getWingmanRequestAuth(req, url) {
  return withStoreLock(async () => {
    const db = await readDb();
    // Pure read gate: authentication and permission checks never write. Any
    // persistence (including the last-seen touch) happens inside the handlers
    // that are actually mutating state, so read-only requests no longer
    // rewrite the entire database snapshot on every call.
    return getAuthContext(req, url, db);
  });
}

function normalizeProjectsForWorkspace(projects, workspaceId, userId) {
  return asArray(projects)
    .map((project) => sanitizeProject(project, workspaceId, userId))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

// Sub-documents the client saves whole and stamps with an embedded timestamp
// (the StoredProject save functions set discoveryBrief.savedAt,
// proposal.updatedAt, ingest.updatedAt, recommendationEvidence.updatedAt,
// workflow.updatedAt, videowall.savedAt on every save). Two sessions editing
// DIFFERENT sub-documents of one project must not clobber each other: without
// this, the whole-project object spread below lets the later sync overwrite
// the earlier edit with its stale copy (B3 two-session gap, closed 2026-09-03
// by server/project-store-two-session-merge.e2e.test.mjs).
const SUB_DOCUMENT_TIMESTAMP_KEYS = {
  discoveryBrief: "savedAt",
  ingest: "updatedAt",
  recommendationEvidence: "updatedAt",
  proposal: "updatedAt",
  workflow: "updatedAt",
  videowall: "savedAt",
};

// Protocol fields that travel between client and server but are NOT part of
// the project document. baseRevision is sent by the client (the syncRevision
// of the server copy its local document was based on); syncRevision and _merge
// are server-owned and must never be taken from a client payload.
const PROJECT_PROTOCOL_FIELDS = ["baseRevision", "syncRevision", "_merge"];

function emptyMergeMeta() {
  return { basis: 0, by: "", subDocs: {} };
}

function mergeMetaFor(basis, by) {
  return { basis, by, subDocs: {} };
}

/**
 * Deterministic last-writer-wins between two versions of one mergeable unit
 * (a timestamped sub-document, or the project-level scalar fields). The
 * decision is a total order over (embedded edit time, revision basis, author):
 *
 *   1. later embedded edit timestamp wins (the edit the user made later);
 *   2. on equal/absent timestamps, the version based on the fresher server
 *      revision wins — a stale client's write cannot take the tie;
 *   3. on an equal basis too, the smaller author id wins ("" sorts first),
 *      so the outcome NEVER depends on which sync arrived first;
 *   4. a fully identical tie (same basis, author, timestamp) keeps the stored
 *      copy so re-syncing identical content is a no-op.
 *
 * Steps 2-3 replace the old "equal timestamps keep the stored copy" rule,
 * which made same-field concurrent edits resolve by arrival order. With the
 * revision basis (per-project revision counters, ADR-0001 Phase 2) plus the
 * deterministic author tie-break, both sync orders converge to the same state.
 */
function pickMergeVersion(existingValue, existingMeta, incomingValue, incomingMeta, timestampKey) {
  if (incomingValue === undefined) return { value: existingValue, meta: existingMeta };
  if (existingValue === undefined) return { value: incomingValue, meta: incomingMeta };

  const existingTime = Date.parse(existingValue?.[timestampKey] ?? "");
  const incomingTime = Date.parse(incomingValue?.[timestampKey] ?? "");
  const existingValid = Number.isFinite(existingTime);
  const incomingValid = Number.isFinite(incomingTime);

  if (existingValid && incomingValid && incomingTime !== existingTime) {
    return incomingTime > existingTime
      ? { value: incomingValue, meta: incomingMeta }
      : { value: existingValue, meta: existingMeta };
  }

  const eBasis = Math.max(0, Number(existingMeta?.basis) || 0);
  const iBasis = Math.max(0, Number(incomingMeta?.basis) || 0);
  if (iBasis !== eBasis) {
    return iBasis > eBasis
      ? { value: incomingValue, meta: incomingMeta }
      : { value: existingValue, meta: existingMeta };
  }

  const eBy = String(existingMeta?.by ?? "");
  const iBy = String(incomingMeta?.by ?? "");
  if (iBy !== eBy) {
    return iBy < eBy ? { value: incomingValue, meta: incomingMeta } : { value: existingValue, meta: existingMeta };
  }

  return { value: existingValue, meta: existingMeta };
}

function stripProjectProtocolFields(project) {
  for (const field of PROJECT_PROTOCOL_FIELDS) delete project[field];
  return project;
}

function mergeWorkspaceProjects(existingProjects, incomingProjects, workspaceId, userId) {
  const existingMap = new Map(
    asArray(existingProjects).map((project) => {
      const normalized = sanitizeProject(project, workspaceId, userId);
      return [normalized.id, normalized];
    }),
  );

  const merged = [];
  for (const rawProject of asArray(incomingProjects)) {
    // The client echoes the server revision its local copy was based on; it is
    // read BEFORE sanitize drops the protocol fields.
    const incomingBase = Math.max(0, Number(rawProject?.baseRevision) || 0);
    const incoming = stripProjectProtocolFields(sanitizeProject(rawProject, workspaceId, userId));
    const existing = existingMap.get(incoming.id);
    if (!existing) {
      // New project: seed the revision counter and merge metadata.
      incoming.syncRevision = Math.max(1, incomingBase + 1);
      const meta = mergeMetaFor(incomingBase, userId);
      for (const subDocumentKey of Object.keys(SUB_DOCUMENT_TIMESTAMP_KEYS)) {
        if (incoming[subDocumentKey] !== undefined) {
          meta.subDocs[subDocumentKey] = { basis: incomingBase, by: userId };
        }
      }
      incoming._merge = meta;
      merged.push(incoming);
      continue;
    }

    const existingRev = Math.max(0, Number(existing.syncRevision) || 0);
    const existingMeta = {
      ...(existing._merge ?? emptyMergeMeta()),
      subDocs: { ...(existing._merge?.subDocs ?? {}) },
    };
    const incomingMeta = mergeMetaFor(incomingBase, userId);

    // Project-level fields (name, stage, status, updatedAt, unknown keys) use
    // the same deterministic LWW; the winner's fields override, the loser's
    // fill gaps so a field present only on one side is never lost. Only the
    // timestamped sub-documents the client saves as units are merged per
    // embedded timestamp, so disjoint concurrent edits both survive.
    const fieldsPick = pickMergeVersion(existing, existingMeta, incoming, incomingMeta, "updatedAt");
    const combined = stripProjectProtocolFields({
      ...(fieldsPick.value === incoming ? existing : incoming),
      ...fieldsPick.value,
    });

    for (const [subDocumentKey, timestampKey] of Object.entries(SUB_DOCUMENT_TIMESTAMP_KEYS)) {
      const picked = pickMergeVersion(
        existing[subDocumentKey],
        existingMeta.subDocs[subDocumentKey] ?? { basis: 0, by: "" },
        incoming[subDocumentKey],
        { basis: incomingBase, by: userId },
        timestampKey,
      );
      combined[subDocumentKey] = picked.value;
      existingMeta.subDocs[subDocumentKey] = picked.meta;
    }
    combined.attachments = mergeById(existing.attachments, incoming.attachments, (item) => item);
    combined.comments = mergeById(existing.comments, incoming.comments, (item) => item);
    combined.shares = mergeById(existing.shares, incoming.shares, (item) => item);
    combined.auditTrail = mergeById(existing.auditTrail, incoming.auditTrail, (item) => sanitizeAuditEntry(item));
    // The id-keyed work-product collections merge per item by embedded write
    // time (ADR-0001 §1.2i) instead of travelling whole with the project-level
    // LWW winner, so two sessions editing DIFFERENT compare runs / proposal
    // versions / requirements / selections / visual assets all survive a
    // sync. `editorIsFresh` gates removals: only a payload based on at least
    // the stored revision may drop stored-only items (its omission is a
    // deliberate removal); a stale payload's omissions are kept.
    for (const [collectionKey, { idKey, timeKey }] of Object.entries(ID_KEYED_COLLECTION_MERGE_KEYS)) {
      const mergedItems = mergeIdKeyedCollectionItems(existing[collectionKey], incoming[collectionKey], {
        idKey,
        timeKey,
        editorIsFresh: incomingBase >= existingRev,
      });
      if (mergedItems.length > 0) combined[collectionKey] = mergedItems;
      else delete combined[collectionKey];
    }

    combined.syncRevision = Math.max(existingRev, incomingBase) + 1;
    combined._merge = existingMeta;
    merged.push(combined);
  }

  return merged.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

/**
 * The project document sent to clients: role-filtered and without the
 * server-owned _merge metadata (syncRevision is the one server field clients
 * do need, to echo back as baseRevision on their next sync).
 */
function projectForClient(project, workspaceRole) {
  const clientProject = { ...sanitizeProjectForRole(project, workspaceRole) };
  delete clientProject._merge;
  return clientProject;
}

function sanitizeProjectForRole(project, workspaceRole) {
  const normalizedRole = normalizeWorkspaceRole(workspaceRole, "sales");
  if (normalizedRole !== "customer") return project;
  return {
    ...project,
    comments: asArray(project.comments).filter((comment) => comment.audience === "customer"),
    shares: asArray(project.shares)
      .filter((share) => share.audience !== "internal")
      .map((share) => ({
        ...share,
        accessCode: undefined,
      })),
    auditTrail: [],
  };
}

async function createSession(db, user, workspace) {
  const token = crypto.randomBytes(32).toString("hex");
  db.sessions = [
    {
      id: makeId("session"),
      tokenHash: hashToken(token),
      userId: user.id,
      workspaceId: workspace.id,
      createdAt: nowIso(),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
      lastSeenAt: nowIso(),
    },
    ...asArray(db.sessions).filter((session) => session.userId !== user.id),
  ];
  return token;
}

export async function handleWingmanHealthGet(_req, res, { sendJson }) {
  let db = emptyDb();
  try {
    db = await readDb();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Storage unavailable.";
    sendJson(res, 503, {
      ok: false,
      service: "wingman-deployment-api",
      now: nowIso(),
      error: message,
    });
    return;
  }
  const governance = await readGovernance();
  const projectCount = Object.values(db.projectsByWorkspace).reduce((sum, state) => sum + asArray(state?.projects).length, 0);
  let storageModeConfigured = "file";
  let storageConfigError = "";
  try {
    storageModeConfigured = configuredStorageMode();
  } catch (error) {
    storageModeConfigured = "error";
    storageConfigError = error instanceof Error ? error.message : "Storage configuration error.";
  }

  sendJson(res, 200, {
    ok: true,
    service: "wingman-deployment-api",
    now: nowIso(),
    storageModeConfigured,
    storageConfigError: storageConfigError || undefined,
    storageModeActive: lastStorageModeUsed,
    storageWarning: lastStorageWarning || undefined,
    users: db.users.length,
    workspaces: db.workspaces.length,
    projects: projectCount,
    auditEvents: db.auditEvents.length,
    telemetryEvents: db.telemetryEvents.length,
    governanceVersion: governance?.recommendationRules?.version || "unknown",
  });
}

function buildWingmanSessionCookie(token) {
  const sameSite = ["Strict", "Lax", "None"].includes(SESSION_COOKIE_SAMESITE) ? SESSION_COOKIE_SAMESITE : "Lax";
  const parts = [
    `wingman_session=${encodeURIComponent(String(token || ""))}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`,
    "Max-Age=2592000",
  ];
  if (SESSION_COOKIE_SECURE) parts.push("Secure");
  return parts.join("; ");
}

function buildExpiredWingmanSessionCookie() {
  const sameSite = ["Strict", "Lax", "None"].includes(SESSION_COOKIE_SAMESITE) ? SESSION_COOKIE_SAMESITE : "Lax";
  const parts = [
    "wingman_session=",
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`,
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ];
  if (SESSION_COOKIE_SECURE) parts.push("Secure");
  return parts.join("; ");
}

function setWingmanSessionCookie(res, token) {
  res.setHeader("Set-Cookie", buildWingmanSessionCookie(token));
}

function clearWingmanSessionCookie(res) {
  res.setHeader("Set-Cookie", buildExpiredWingmanSessionCookie());
}
export async function handleWingmanAuthSignupPost(req, res, { sendJson, parseJsonBody }) {
  return withStoreLock(async () => {
  const signupRateLimit = takeAuthRateLimitToken(req, "signup");
  if (!signupRateLimit.ok) {
    const retryAfterSeconds = Math.max(1, Math.ceil(signupRateLimit.retryAfterMs / 1000));
    res.setHeader("Retry-After", String(retryAfterSeconds));
    logWingmanEvent("warn", "auth.signup.rate_limited", { retryAfterSeconds });
    sendJson(res, 429, {
      ok: false,
      error: "Too many sign-up attempts. Please try again shortly.",
      retryAfterSeconds,
    });
    return;
  }

  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const name = tidy(body?.name);
  const company = tidy(body?.company);
  const email = normalizeEmail(body?.email);
  const password = tidy(body?.password);

  if (!name || !company || !email || !password) {
    sendJson(res, 400, { ok: false, error: "Name, company, email, and password are required." });
    return;
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    sendJson(res, 400, { ok: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    return;
  }

  const db = await readDb();
  if (db.users.some((user) => user.email === email)) {
    sendJson(res, 409, { ok: false, error: "An account with that email already exists." });
    return;
  }

  const userId = makeId("user");
  const workspaceId = makeId("ws");
  const workspaceName = company || `${name}'s Workspace`;
  const passwordRecord = await hashPassword(password);

  const user = {
    id: userId,
    name,
    company,
    email,
    role: "sales",
    passwordSalt: passwordRecord.salt,
    passwordHash: passwordRecord.hash,
    workspaceIds: [workspaceId],
    createdAt: nowIso(),
    lastLoginAt: nowIso(),
    status: "active",
  };

  const workspace = {
    id: workspaceId,
    name: workspaceName,
    slug: slugify(workspaceName),
    tier: "pilot",
    ownerUserId: userId,
    memberIds: [userId],
    memberships: [{
      userId,
      role: "owner",
      createdAt: nowIso(),
    }],
    createdAt: nowIso(),
  };

  db.users.push(user);
  db.workspaces.push(workspace);
  ensureWorkspaceState(db, workspaceId);
  const sessionToken = await createSession(db, user, workspace);

  appendAuditEvent(db, makeProjectAuditEvent({
    scope: "auth",
    action: "signup",
    detail: `Workspace ${workspace.name} was created.`,
    user,
    workspaceId: workspace.id,
  }));

  await writeDb(db);
  setWingmanSessionCookie(res, sessionToken);
  sendJson(res, 200, makeSessionPayload(user, workspace));
  });
}

export async function handleWingmanAuthLoginPost(req, res, { sendJson, parseJsonBody }) {
  return withStoreLock(async () => {
  const loginRateLimit = takeAuthRateLimitToken(req, "login");
  if (!loginRateLimit.ok) {
    const retryAfterSeconds = Math.max(1, Math.ceil(loginRateLimit.retryAfterMs / 1000));
    res.setHeader("Retry-After", String(retryAfterSeconds));
    logWingmanEvent("warn", "auth.login.rate_limited", { retryAfterSeconds });
    sendJson(res, 429, {
      ok: false,
      error: "Too many sign-in attempts. Please try again shortly.",
      retryAfterSeconds,
    });
    return;
  }

  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const email = normalizeEmail(body?.email);
  const password = tidy(body?.password);
  if (!email || !password) {
    sendJson(res, 400, { ok: false, error: "Email and password are required." });
    return;
  }

  const db = await readDb();
  const user = db.users.find((candidate) => candidate.email === email);
  if (!user || !(await verifyPassword(password, user))) {
    // Deliberately does not record whether the account exists - the log should
    // not become an account-enumeration oracle, same as the response does not.
    logWingmanEvent("warn", "auth.login.failed", { account: accountRef(email) });
    sendJson(res, 401, { ok: false, error: "Email or password is incorrect." });
    return;
  }

  logWingmanEvent("info", "auth.login.succeeded", { account: accountRef(email), userId: user.id });

  const workspace = db.workspaces.find((candidate) => asArray(candidate.memberIds).includes(user.id))
    || db.workspaces.find((candidate) => candidate.ownerUserId === user.id);
  if (!workspace) {
    sendJson(res, 500, { ok: false, error: "Workspace not found for this user." });
    return;
  }

  user.lastLoginAt = nowIso();
  const sessionToken = await createSession(db, user, workspace);
  appendAuditEvent(db, makeProjectAuditEvent({
    scope: "auth",
    action: "login",
    detail: `User ${user.email} signed in.`,
    user,
    workspaceId: workspace.id,
  }));

  await writeDb(db);
  setWingmanSessionCookie(res, sessionToken);
  sendJson(res, 200, makeSessionPayload(user, workspace));
  });
}

export async function handleWingmanAuthSessionGet(req, res, url, { sendJson }) {
  return withStoreLock(async () => {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }

  // Read-only session check: the last-seen stamp rides the next real write;
  // it no longer forces a full snapshot write on its own.
  sendJson(res, 200, makeSessionPayload(auth.user, auth.workspace));
  });
}

export async function handleWingmanAuthLogoutPost(req, res, url, { sendJson }) {
  return withStoreLock(async () => {
  const db = await readDb();
  const token = getTokenFromRequest(req, url);
  if (token) {
    const tokenHash = hashToken(token);
    const session = db.sessions.find((entry) => entry.tokenHash === tokenHash);
    const user = session ? db.users.find((entry) => entry.id === session.userId) : null;
    db.sessions = db.sessions.filter((entry) => entry.tokenHash !== tokenHash);
    if (user) {
      appendAuditEvent(db, makeProjectAuditEvent({
        scope: "auth",
        action: "logout",
        detail: `User ${user.email} signed out.`,
        user,
        workspaceId: session?.workspaceId,
      }));
    }
    await writeDb(db);
  }
  clearWingmanSessionCookie(res);
  sendJson(res, 200, { ok: true });
  });
}

export async function handleWingmanWorkspaceGet(req, res, url, { sendJson }) {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }

  const state = ensureWorkspaceState(db, auth.workspace.id);
  sendJson(res, 200, {
    ok: true,
    workspace: publicWorkspace(auth.workspace),
    workspaceRole: auth.workspaceRole,
    permissions: auth.permissions,
    projects: asArray(state.projects).length,
    activeProjectId: state.activeProjectId,
  });
}

/**
 * Incremental hydration filter (ADR-0001 §1.2k): given a workspace's
 * normalized projects and the client's `since` manifest ({ projectId:
 * revision }), return only the projects the client cannot PROVE it is current
 * with. A project is current when the row's syncRevision equals the revision
 * the client reported - no server write has touched that row since the client
 * last saw it. Everything else is returned: ids the client never reported
 * (new to it), reported ids whose row revision moved (another member synced
 * it), manifest entries the client deliberately sent as 0 or omitted (a
 * syncConflict-flagged local copy must always pull so the hydration merge can
 * adopt the row's newer content), and legacy rows with no syncRevision (their
 * currency cannot be proven). Skipping is therefore only ever an optimization
 * over content the client already holds; it can never hide a row the merge
 * would change.
 */
export function selectProjectsForSince(projects, since) {
  const reported = since && typeof since === "object" ? since : {};
  return asArray(projects).filter((project) => {
    const id = tidy(project?.id);
    if (!id) return true;
    const reportedRevision = Number(reported[id]);
    if (!Number.isFinite(reportedRevision) || reportedRevision < 1) return true;
    const rowRevision = Math.max(0, Number(project?.syncRevision) || 0);
    if (rowRevision < 1) return true;
    return rowRevision !== reportedRevision;
  });
}

// HTTP header name for the incremental-hydration `since` manifest. A header
// (rather than a query string) keeps the manifest free of URL-length limits
// and leaves the no-since GET contract byte-identical. The value is a JSON
// object { [projectId]: lastSeenRevision }.
const PROJECT_SINCE_HEADER = "x-wingman-since";

function parseSinceHeader(req) {
  const raw = req.headers?.[PROJECT_SINCE_HEADER];
  if (raw === undefined || raw === null) return { since: null };
  if (typeof raw !== "string" || raw.trim() === "") return { since: null };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { error: "The X-Wingman-Since manifest must be a JSON object." };
    }
    return { since: parsed };
  } catch {
    return { error: "The X-Wingman-Since manifest must be valid JSON." };
  }
}

export async function handleWingmanProjectsGet(req, res, url, { sendJson }) {
  return withStoreLock(async () => {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }

  const state = ensureWorkspaceState(db, auth.workspace.id);
  state.projects = normalizeProjectsForWorkspace(state.projects, auth.workspace.id, auth.user.id);

  // Incremental pull (ADR-0001 §1.2k): the client's hydration sends the
  // per-project revisions it last saw; only rows that moved (or are new to it)
  // are returned. A since-pull is PURELY READ-ONLY - it reports what changed
  // and must never rewrite the store, so it skips the full-snapshot commit a
  // plain GET performs to persist its last-seen touch. That is the difference
  // between a reload costing a full read+write cycle in supabase-tables mode
  // and costing just the reads.
  const { since, error } = parseSinceHeader(req);
  if (error) {
    sendJson(res, 400, { ok: false, error });
    return;
  }
  if (since !== null) {
    const selected = selectProjectsForSince(state.projects, since);
    sendJson(res, 200, {
      ok: true,
      workspace: publicWorkspace(auth.workspace),
      activeProjectId: state.activeProjectId,
      projects: selected.map((project) => projectForClient(project, auth.workspaceRole)),
    });
    return;
  }

  await writeDb(db);

  sendJson(res, 200, {
    ok: true,
    workspace: publicWorkspace(auth.workspace),
    activeProjectId: state.activeProjectId,
    projects: state.projects.map((project) => projectForClient(project, auth.workspaceRole)),
  });
  });
}

export async function handleWingmanProjectsSyncPost(req, res, url, { sendJson, parseJsonBody }) {
  return withStoreLock(async () => {
    // Bounded read-merge-commit retry (migration 013). The whole-snapshot
    // commit claims the generation this read was taken at; when another
    // server instance (own store lock, shared Supabase project) committed
    // between this read and our commit, the RPC refuses and NO row was
    // written. Retrying re-reads the CURRENT snapshot - which contains the
    // other instance's rows - and re-merges this client's payload against it,
    // so two overlapping saves both land instead of the second reconciling
    // the first away. The request body is parsed once (it cannot be re-read
    // from the socket) and reused across attempts.
    let body = null;
    for (let attempt = 1; attempt <= SNAPSHOT_RETRY_MAX_ATTEMPTS; attempt += 1) {
      const db = await readDb();
      const auth = getAuthContext(req, url, db);
      if (!auth.ok) {
        sendJson(res, 401, { ok: false, error: auth.error });
        return;
      }
      if (!auth.permissions.canEditProjects) {
        sendJson(res, 403, { ok: false, error: "This workspace role is read-only for project changes." });
        return;
      }

      if (body === null) {
        try {
          body = await parseJsonBody(req);
        } catch {
          sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
          return;
        }
      }

      const state = ensureWorkspaceState(db, auth.workspace.id);
      const previousProjects = normalizeProjectsForWorkspace(state.projects, auth.workspace.id, auth.user.id);
      const incomingProjects = normalizeProjectsForWorkspace(body?.projects, auth.workspace.id, auth.user.id);
      const deletedIds = previousProjects
        .filter((project) => !incomingProjects.some((candidate) => candidate.id === project.id))
        .map((project) => project.id);

      state.projects = mergeWorkspaceProjects(previousProjects, incomingProjects, auth.workspace.id, auth.user.id);
      state.activeProjectId = tidy(body?.activeProjectId) || state.projects[0]?.id || null;

      const previousById = new Map(previousProjects.map((project) => [project.id, project]));
      for (const project of state.projects) {
        const previous = previousById.get(project.id);
        if (!previous || previous.updatedAt !== project.updatedAt) {
          appendProjectAudit(project, makeProjectAuditEvent({
            scope: "projects",
            action: previous ? "synced" : "created",
            detail: previous ? "Project changes were synchronized to the deployment backend." : "Project was created in the deployment backend.",
            user: auth.user,
            projectId: project.id,
            workspaceId: auth.workspace.id,
          }));
        }
      }

      appendAuditEvent(db, makeProjectAuditEvent({
        scope: "projects",
        action: "sync",
        detail: `Workspace sync stored ${state.projects.length} projects${deletedIds.length ? ` and removed ${deletedIds.length}` : ""}.`,
        user: auth.user,
        projectId: state.activeProjectId || undefined,
        workspaceId: auth.workspace.id,
      }));

      try {
        await writeDb(db);
      } catch (error) {
        if (!(error instanceof SnapshotStaleError)) throw error;
        if (attempt >= SNAPSHOT_RETRY_MAX_ATTEMPTS) {
          logWingmanEvent("error", "storage.snapshot_commit.stale_retries_exhausted", {
            expected: error.expectedGeneration,
            current: error.currentGeneration,
            attempts: attempt,
          });
          sendJson(res, 503, {
            ok: false,
            error: "The project store changed under this sync (a concurrent writer committed first); retry the sync.",
          });
          return;
        }
        logWingmanEvent("warn", "storage.snapshot_commit.stale_retry", {
          expected: error.expectedGeneration,
          current: error.currentGeneration,
          attempt,
        });
        // Re-read the current snapshot (it now contains the winner's rows),
        // re-merge this client's payload, and try again.
        continue;
      }

      sendJson(res, 200, {
        ok: true,
        workspace: publicWorkspace(auth.workspace),
        activeProjectId: state.activeProjectId,
        projects: state.projects.map((project) => projectForClient(project, auth.workspaceRole)),
      });
      return;
    }
  });
}

function findProject(state, projectId) {
  return asArray(state.projects).find((project) => project.id === projectId);
}

/**
 * PUT /api/wingman/projects/:id — per-project revisioned sync
 * (ADR-0001 Phase 1).
 *
 * Commits ONE project document guarded by the row's own revision, coexisting
 * with the whole-store sync POST until clients migrate. The body is the same
 * per-project entry the sync POST carries: the client document plus the
 * `baseRevision` the local copy was based on.
 *
 * Merge + retry: the incoming document is merged against the CURRENT row with
 * the same sub-document LWW semantics as the whole-store sync (so a stale PUT
 * preserves the winner's edits and applies this client's per the deterministic
 * order). In supabase-tables mode the commit is the migration-015 single-row
 * RPC; when a concurrent writer from another server instance advanced the row
 * between our read and the RPC, the RPC refuses (committed:false, stale:true)
 * and this handler re-reads the row, re-merges, and retries — bounded like the
 * whole-snapshot stale retry. The row's own revision is the guard, so a
 * per-project save no longer needs the whole-snapshot generation claim or the
 * whole-store lock's full read-modify-write cycle of every table.
 */
export async function handleWingmanProjectPut(req, res, url, projectId, { sendJson, parseJsonBody }) {
  return withStoreLock(async () => {
    let body = null;
    for (let attempt = 1; attempt <= SNAPSHOT_RETRY_MAX_ATTEMPTS; attempt += 1) {
      const db = await readDb();
      const auth = getAuthContext(req, url, db);
      if (!auth.ok) {
        sendJson(res, 401, { ok: false, error: auth.error });
        return;
      }
      if (!auth.permissions.canEditProjects) {
        sendJson(res, 403, { ok: false, error: "This workspace role is read-only for project changes." });
        return;
      }

      if (body === null) {
        try {
          body = await parseJsonBody(req);
        } catch {
          sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
          return;
        }
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          sendJson(res, 400, { ok: false, error: "The PUT body must be the project document (with its baseRevision)." });
          return;
        }
        const docId = tidy(body.id);
        if (!docId) {
          sendJson(res, 400, { ok: false, error: "The project document must carry an id." });
          return;
        }
        if (docId !== projectId) {
          sendJson(res, 400, {
            ok: false,
            error: `Project id mismatch: the URL names ${projectId} but the document carries ${docId}.`,
          });
          return;
        }
        if (!Number.isFinite(Number(body.baseRevision))) {
          sendJson(res, 400, { ok: false, error: "baseRevision must be a number." });
          return;
        }
      }

      const state = ensureWorkspaceState(db, auth.workspace.id);
      const previousProjects = normalizeProjectsForWorkspace(state.projects, auth.workspace.id, auth.user.id);
      const existing = previousProjects.find((candidate) => candidate.id === projectId) || null;
      const expectedRevision = existing ? Math.max(0, Number(existing.syncRevision) || 0) : 0;
      const incoming = normalizeProjectsForWorkspace([body], auth.workspace.id, auth.user.id);
      const merged = mergeWorkspaceProjects(existing ? [existing] : [], incoming, auth.workspace.id, auth.user.id)[0];

      if (!existing || existing.updatedAt !== merged.updatedAt) {
        appendProjectAudit(merged, makeProjectAuditEvent({
          scope: "projects",
          action: existing ? "synced" : "created",
          detail: existing
            ? "Project changes were synchronized to the deployment backend."
            : "Project was created in the deployment backend.",
          user: auth.user,
          projectId: merged.id,
          workspaceId: auth.workspace.id,
        }));
      }
      const workspaceAudit = makeProjectAuditEvent({
        scope: "projects",
        action: "sync",
        detail: `Project sync stored 1 project (${merged.id}).`,
        user: auth.user,
        projectId: merged.id,
        workspaceId: auth.workspace.id,
      });

      if (configuredStorageMode() === "supabase-tables") {
        // Single-row guarded commit; the row's own revision is the concurrency
        // guard, so overlapping per-project saves serialize on the row instead
        // of the whole-store lock's snapshot cycle.
        try {
          const committed = await commitProjectRowViaRpc({
            projectRow: projectRowForCommit(merged, auth.workspace.id),
            expectedRevision,
            auditRow: auditEventRowForCommit(workspaceAudit),
          });
          if (!committed) {
            const reason = lastStorageWarning || "the deployment store rejected the write.";
            logWingmanEvent("error", "storage.project_put.failed", { reason });
            sendJson(res, 503, {
              ok: false,
              error: `Project save failed: ${reason} Local changes were preserved.`,
            });
            return;
          }
        } catch (error) {
          if (!(error instanceof ProjectRowStaleError)) throw error;
          if (attempt >= SNAPSHOT_RETRY_MAX_ATTEMPTS) {
            logWingmanEvent("error", "storage.project_put.stale_retries_exhausted", {
              expected: error.expectedRevision,
              current: error.currentRevision,
              attempts: attempt,
            });
            sendJson(res, 409, {
              ok: false,
              error: "The project changed while this save was in flight (a concurrent writer committed first); reload the project and retry.",
              currentRevision: error.currentRevision,
            });
            return;
          }
          logWingmanEvent("warn", "storage.project_put.stale_retry", {
            expected: error.expectedRevision,
            current: error.currentRevision,
            attempt,
          });
          // Re-read the current row (it now contains the winner's content),
          // re-merge this client's payload, and try again.
          continue;
        }
        sendJson(res, 200, {
          ok: true,
          workspace: publicWorkspace(auth.workspace),
          project: projectForClient(merged, auth.workspaceRole),
        });
        return;
      }

      // File and single-row `supabase` modes: apply the merged row in memory
      // and write through the store's regular whole-state path (there is no
      // per-row remote commit to target in these modes).
      state.projects = [...asArray(state.projects).filter((project) => project.id !== merged.id), merged]
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      if (!state.activeProjectId) state.activeProjectId = merged.id;
      appendAuditEvent(db, workspaceAudit);
      try {
        await writeDb(db);
      } catch (error) {
        logWingmanEvent("error", "storage.project_put.write_failed", {
          reason: error instanceof Error ? error.message : String(error),
        });
        sendJson(res, 503, {
          ok: false,
          error: "Project save failed to persist. Local changes were preserved.",
        });
        return;
      }
      sendJson(res, 200, {
        ok: true,
        workspace: publicWorkspace(auth.workspace),
        project: projectForClient(merged, auth.workspaceRole),
      });
      return;
    }
  });
}

/**
 * GET /api/wingman/projects/:id — single-project read (ADR-0001 Phase 1).
 * Purely read-only: like the since-pull hydration path it never touches
 * writeDb, so a reload of one project costs reads only.
 */
export async function handleWingmanProjectGet(req, res, url, projectId, { sendJson }) {
  return withStoreLock(async () => {
    const db = await readDb();
    const auth = getAuthContext(req, url, db);
    if (!auth.ok) {
      sendJson(res, 401, { ok: false, error: auth.error });
      return;
    }

    const state = ensureWorkspaceState(db, auth.workspace.id);
    state.projects = normalizeProjectsForWorkspace(state.projects, auth.workspace.id, auth.user.id);
    const project = findProject(state, projectId);
    if (!project) {
      sendJson(res, 404, { ok: false, error: "Project not found." });
      return;
    }
    sendJson(res, 200, {
      ok: true,
      workspace: publicWorkspace(auth.workspace),
      project: projectForClient(project, auth.workspaceRole),
    });
  });
}

export async function handleWingmanProjectCommentsPost(req, res, url, projectId, { sendJson, parseJsonBody }) {
  return withStoreLock(async () => {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }

  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const text = tidy(body?.body);
  if (!text) {
    sendJson(res, 400, { ok: false, error: "Comment body is required." });
    return;
  }

  const audience = tidy(body?.audience) === "customer" ? "customer" : "internal";
  if (audience === "internal" && !auth.permissions.canCreateInternalComments) {
    sendJson(res, 403, { ok: false, error: "This workspace role cannot add internal comments." });
    return;
  }
  if (audience === "customer" && !auth.permissions.canCreateCustomerComments) {
    sendJson(res, 403, { ok: false, error: "This workspace role cannot add customer-safe comments." });
    return;
  }

  const state = ensureWorkspaceState(db, auth.workspace.id);
  const project = findProject(state, projectId);
  if (!project) {
    sendJson(res, 404, { ok: false, error: "Project not found." });
    return;
  }

  const comment = {
    id: makeId("comment"),
    body: text,
    audience,
    authorName: auth.user.name || auth.user.email,
    authorEmail: auth.user.email,
    createdAt: nowIso(),
  };

  project.comments = [comment, ...asArray(project.comments)].slice(0, 40);
  project.updatedAt = nowIso();
  appendProjectAudit(project, makeProjectAuditEvent({
    scope: "projects",
    action: "comment",
    detail: `A ${comment.audience} comment was added.`,
    user: auth.user,
    projectId: project.id,
    workspaceId: auth.workspace.id,
  }));
  appendAuditEvent(db, makeProjectAuditEvent({
    scope: "projects",
    action: "comment",
    detail: `Comment added to ${project.name}.`,
    user: auth.user,
    projectId: project.id,
    workspaceId: auth.workspace.id,
  }));

  await writeDb(db);
  sendJson(res, 200, { ok: true, project: sanitizeProjectForRole(project, auth.workspaceRole) });
  });
}

export async function handleWingmanProjectSharesPost(req, res, url, projectId, { sendJson, parseJsonBody }) {
  return withStoreLock(async () => {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }
  if (!auth.permissions.canPrepareShares) {
    sendJson(res, 403, { ok: false, error: "This workspace role cannot create share packs." });
    return;
  }

  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const title = tidy(body?.title) || "Customer share pack";
  const state = ensureWorkspaceState(db, auth.workspace.id);
  const project = findProject(state, projectId);
  if (!project) {
    sendJson(res, 404, { ok: false, error: "Project not found." });
    return;
  }

  const share = {
    id: makeId("share"),
    title,
    message: tidy(body?.message),
    audience: tidy(body?.audience) === "internal" ? "internal" : "customer",
    status: "draft",
    shareUrl: `/share/${project.id}/${makeId("public")}`,
    accessCode: crypto.randomBytes(3).toString("hex").toUpperCase(),
    summaryHeadline: tidy(body?.summaryHeadline) || undefined,
    createdAt: nowIso(),
    createdBy: auth.user.id,
  };

  project.shares = [share, ...asArray(project.shares)].slice(0, 20);
  project.updatedAt = nowIso();
  appendProjectAudit(project, makeProjectAuditEvent({
    scope: "projects",
    action: "share",
    detail: `A ${share.audience} share pack was prepared.`,
    user: auth.user,
    projectId: project.id,
    workspaceId: auth.workspace.id,
  }));
  appendAuditEvent(db, makeProjectAuditEvent({
    scope: "projects",
    action: "share",
    detail: `Share pack created for ${project.name}.`,
    user: auth.user,
    projectId: project.id,
    workspaceId: auth.workspace.id,
  }));

  await writeDb(db);
  sendJson(res, 200, { ok: true, project: sanitizeProjectForRole(project, auth.workspaceRole) });
  });
}

export async function handleWingmanProjectAttachmentsPost(req, res, url, projectId, { sendJson, parseJsonBody }) {
  return withStoreLock(async () => {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }
  if (!auth.permissions.canRegisterAttachments) {
    sendJson(res, 403, { ok: false, error: "This workspace role cannot register attachments." });
    return;
  }

  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const name = tidy(body?.name);
  if (!name) {
    sendJson(res, 400, { ok: false, error: "Attachment name is required." });
    return;
  }

  const state = ensureWorkspaceState(db, auth.workspace.id);
  const project = findProject(state, projectId);
  if (!project) {
    sendJson(res, 404, { ok: false, error: "Project not found." });
    return;
  }

  const attachment = {
    id: makeId("attach"),
    name,
    kind: ["document", "diagram", "brief"].includes(tidy(body?.kind)) ? tidy(body?.kind) : "other",
    source: tidy(body?.source) || "Wingman",
    summary: tidy(body?.summary) || undefined,
    contentType: tidy(body?.contentType) || undefined,
    sizeBytes: Number.isFinite(Number(body?.sizeBytes)) ? Number(body.sizeBytes) : undefined,
    uploadedAt: nowIso(),
    uploadedBy: auth.user.id,
  };

  project.attachments = [attachment, ...asArray(project.attachments)].slice(0, 20);
  project.updatedAt = nowIso();
  appendProjectAudit(project, makeProjectAuditEvent({
    scope: "projects",
    action: "attachment",
    detail: `${attachment.kind} attachment "${attachment.name}" was registered.`,
    user: auth.user,
    projectId: project.id,
    workspaceId: auth.workspace.id,
  }));
  appendAuditEvent(db, makeProjectAuditEvent({
    scope: "projects",
    action: "attachment",
    detail: `Attachment stored for ${project.name}.`,
    user: auth.user,
    projectId: project.id,
    workspaceId: auth.workspace.id,
  }));

  await writeDb(db);
  sendJson(res, 200, { ok: true, project: sanitizeProjectForRole(project, auth.workspaceRole) });
  });
}

export async function handleWingmanProjectMarkReadyPost(req, res, url, projectId, { sendJson, parseJsonBody }) {
  return withStoreLock(async () => {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }
  if (!auth.permissions.canMarkCommercialReady) {
    sendJson(res, 403, { ok: false, error: "This workspace role cannot complete the commercial readiness gate." });
    return;
  }

  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const state = ensureWorkspaceState(db, auth.workspace.id);
  const project = findProject(state, projectId);
  if (!project) {
    sendJson(res, 404, { ok: false, error: "Project not found." });
    return;
  }

  const completionNote = tidy(body?.completionNote) || `Completion gate passed on ${new Date().toLocaleString()}.`;
  project.status = "Commercial Ready";
  project.stage = tidy(project.stage) || "Proposal";
  project.notes = [tidy(project.notes), completionNote].filter(Boolean).join("\n\n");
  project.proposal = {
    ...(project.proposal && typeof project.proposal === "object" ? project.proposal : {}),
    notes: [tidy(project.proposal?.notes), completionNote].filter(Boolean).join("\n\n"),
  };
  project.updatedAt = nowIso();

  appendProjectAudit(project, makeProjectAuditEvent({
    scope: "projects",
    action: "mark-ready",
    detail: "Commercial readiness gate completed.",
    user: auth.user,
    projectId: project.id,
    workspaceId: auth.workspace.id,
  }));
  appendAuditEvent(db, makeProjectAuditEvent({
    scope: "projects",
    action: "mark-ready",
    detail: `Commercial readiness completed for ${project.name}.`,
    user: auth.user,
    projectId: project.id,
    workspaceId: auth.workspace.id,
  }));

  await writeDb(db);
  sendJson(res, 200, { ok: true, project: sanitizeProjectForRole(project, auth.workspaceRole) });
  });
}

export async function handleWingmanWorkspaceMembersGet(req, res, url, { sendJson }) {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }
  if (!auth.permissions.canManageWorkspace) {
    sendJson(res, 403, { ok: false, error: "Workspace member management is restricted to admins." });
    return;
  }

  const members = getWorkspaceMemberships(auth.workspace).map((membership) => {
    const user = db.users.find((candidate) => candidate.id === membership.userId);
    const lastSeenAt = asArray(db.sessions)
      .filter((session) => session.userId === membership.userId && session.workspaceId === auth.workspace.id)
      .sort((a, b) => String(b.lastSeenAt).localeCompare(String(a.lastSeenAt)))[0]?.lastSeenAt;
    return publicWorkspaceMember(auth.workspace, membership, user, lastSeenAt);
  });

  sendJson(res, 200, { ok: true, members });
}

export async function handleWingmanWorkspaceTeamGet(req, res, url, { sendJson }) {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }

  const members = getWorkspaceMemberships(auth.workspace).map((membership) => {
    const user = db.users.find((candidate) => candidate.id === membership.userId);
    return {
      id: membership.userId,
      name: tidy(user?.name) || "Team member",
      role: normalizeWorkspaceRole(membership.role, "sales"),
      lastSeenAt: asArray(db.sessions)
        .filter((session) => session.userId === membership.userId && session.workspaceId === auth.workspace.id)
        .sort((a, b) => String(b.lastSeenAt).localeCompare(String(a.lastSeenAt)))[0]?.lastSeenAt || null,
    };
  });

  sendJson(res, 200, {
    ok: true,
    team: members,
    currentUserId: auth.user.id,
  });
}

export async function handleWingmanWorkspaceInvitationsGet(req, res, url, { sendJson }) {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }
  if (!auth.permissions.canManageWorkspace) {
    sendJson(res, 403, { ok: false, error: "Workspace invitations are restricted to admins." });
    return;
  }

  const invitations = asArray(db.invitations)
    .filter((invitation) => invitation.workspaceId === auth.workspace.id)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .map((invitation) => publicInvitation(invitation, auth.workspace));

  sendJson(res, 200, { ok: true, invitations });
}

export async function handleWingmanWorkspaceInvitationsPost(req, res, url, { sendJson, parseJsonBody }) {
  return withStoreLock(async () => {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }
  if (!auth.permissions.canManageWorkspace) {
    sendJson(res, 403, { ok: false, error: "Workspace invitations are restricted to admins." });
    return;
  }

  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const email = normalizeEmail(body?.email);
  const role = normalizeWorkspaceRole(body?.role, "customer");
  if (!email) {
    sendJson(res, 400, { ok: false, error: "Invitation email is required." });
    return;
  }
  if (!canManageWorkspaceRole(auth.workspaceRole, role)) {
    sendJson(res, 403, { ok: false, error: "This workspace role cannot invite that member role." });
    return;
  }

  const existingMember = getWorkspaceMemberships(auth.workspace).find((membership) => {
    const memberUser = db.users.find((candidate) => candidate.id === membership.userId);
    return memberUser?.email === email;
  });
  if (existingMember) {
    sendJson(res, 409, { ok: false, error: "That user is already a member of this workspace." });
    return;
  }

  const token = createInvitationToken();
  const pendingIndex = asArray(db.invitations).findIndex((invitation) =>
    invitation.workspaceId === auth.workspace.id &&
    invitation.email === email &&
    invitation.status === "pending"
  );
  const invitation = {
    id: pendingIndex >= 0 ? db.invitations[pendingIndex].id : makeId("invite"),
    workspaceId: auth.workspace.id,
    email,
    role,
    status: "pending",
    invitedByUserId: auth.user.id,
    invitedByName: auth.user.name || auth.user.email,
    invitedByEmail: auth.user.email,
    tokenHash: hashToken(token),
    createdAt: pendingIndex >= 0 ? db.invitations[pendingIndex].createdAt : nowIso(),
    acceptedAt: undefined,
  };

  if (pendingIndex >= 0) db.invitations[pendingIndex] = invitation;
  else db.invitations = [invitation, ...asArray(db.invitations)];

  appendAuditEvent(db, makeProjectAuditEvent({
    scope: "workspace",
    action: "invite",
    detail: `Workspace invitation created for ${email}.`,
    user: auth.user,
    workspaceId: auth.workspace.id,
  }));

  await writeDb(db);
  sendJson(res, 200, {
    ok: true,
    invitation: publicInvitation(invitation, auth.workspace, token),
  });
  });
}

export async function handleWingmanWorkspaceMemberRolePost(req, res, url, userId, { sendJson, parseJsonBody }) {
  return withStoreLock(async () => {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }
  if (!auth.permissions.canManageWorkspace) {
    sendJson(res, 403, { ok: false, error: "Workspace member management is restricted to admins." });
    return;
  }

  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const membership = findWorkspaceMember(auth.workspace, userId);
  const targetUser = db.users.find((candidate) => candidate.id === userId);
  if (!membership || !targetUser) {
    sendJson(res, 404, { ok: false, error: "Workspace member not found." });
    return;
  }
  if (membership.role === "owner" || auth.workspace.ownerUserId === userId) {
    sendJson(res, 403, { ok: false, error: "Workspace ownership cannot be reassigned here." });
    return;
  }
  if (auth.user.id === userId) {
    sendJson(res, 403, { ok: false, error: "Change another member's role instead of your own." });
    return;
  }

  const nextRole = normalizeWorkspaceRole(body?.role, "sales");
  if (!canManageWorkspaceRole(auth.workspaceRole, nextRole)) {
    sendJson(res, 403, { ok: false, error: "This workspace role cannot assign that member role." });
    return;
  }
  if (!canManageWorkspaceRole(auth.workspaceRole, membership.role)) {
    sendJson(res, 403, { ok: false, error: "This workspace role cannot change that member." });
    return;
  }

  addMembershipToWorkspace(auth.workspace, userId, nextRole, membership.createdAt || nowIso());

  appendAuditEvent(db, makeProjectAuditEvent({
    scope: "workspace",
    action: "role-change",
    detail: `${targetUser.email} is now ${nextRole}.`,
    user: auth.user,
    workspaceId: auth.workspace.id,
  }));

  await writeDb(db);
  sendJson(res, 200, {
    ok: true,
    member: publicWorkspaceMember(auth.workspace, findWorkspaceMember(auth.workspace, userId), targetUser),
  });
  });
}

export async function handleWingmanWorkspaceSettingsPost(req, res, url, { sendJson, parseJsonBody }) {
  return withStoreLock(async () => {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }
  if (!auth.permissions.canManageWorkspace) {
    sendJson(res, 403, { ok: false, error: "Workspace settings are restricted to admins." });
    return;
  }

  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const name = tidy(body?.name);
  const tier = tidy(body?.tier) || auth.workspace.tier || "pilot";
  if (!name) {
    sendJson(res, 400, { ok: false, error: "Workspace name is required." });
    return;
  }

  auth.workspace.name = name;
  auth.workspace.slug = slugify(name);
  auth.workspace.tier = tier;

  appendAuditEvent(db, makeProjectAuditEvent({
    scope: "workspace",
    action: "settings",
    detail: `Workspace settings updated for ${name}.`,
    user: auth.user,
    workspaceId: auth.workspace.id,
  }));

  await writeDb(db);
  sendJson(res, 200, { ok: true, workspace: publicWorkspace(auth.workspace) });
  });
}

export async function handleWingmanInvitationResolveGet(_req, res, url, { sendJson }) {
  const db = await readDb();
  const token = tidy(url.searchParams.get("token"));
  if (!token) {
    sendJson(res, 400, { ok: false, error: "Invitation token is required." });
    return;
  }

  const invitationByToken = findInvitationByToken(db, token);
  if (invitationByToken && invitationByToken.status === "pending" && isInvitationExpired(invitationByToken)) {
    sendJson(res, 410, { ok: false, error: "Invitation has expired. Ask an administrator to send a new invite." });
    return;
  }

  const invitation = findPendingInvitationByToken(db, token);
  const workspace = invitation
    ? db.workspaces.find((candidate) => candidate.id === invitation.workspaceId)
    : null;
  if (!invitation || !workspace) {
    sendJson(res, 404, { ok: false, error: "Invitation not found or already used." });
    return;
  }

  sendJson(res, 200, {
    ok: true,
    invitation: publicInvitation(invitation, workspace, token),
  });
}

export async function handleWingmanInvitationAcceptPost(req, res, url, { sendJson, parseJsonBody }) {
  return withStoreLock(async () => {
  const db = await readDb();
  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const token = tidy(body?.token);
  if (!token) {
    sendJson(res, 400, { ok: false, error: "Invitation token is required." });
    return;
  }

  const invitationByToken = findInvitationByToken(db, token);
  if (invitationByToken && invitationByToken.status === "pending" && isInvitationExpired(invitationByToken)) {
    sendJson(res, 410, { ok: false, error: "Invitation has expired. Ask an administrator to send a new invite." });
    return;
  }

  const invitation = findPendingInvitationByToken(db, token);
  const workspace = invitation
    ? db.workspaces.find((candidate) => candidate.id === invitation.workspaceId)
    : null;
  if (!invitation || !workspace) {
    sendJson(res, 404, { ok: false, error: "Invitation not found or already used." });
    return;
  }

  const auth = getAuthContext(req, url, db);
  let user = auth.ok ? auth.user : null;

  if (user && user.email !== invitation.email) {
    sendJson(res, 403, { ok: false, error: "Sign in with the invited email address before accepting this invitation." });
    return;
  }

  if (!user) {
    const existingUser = db.users.find((candidate) => candidate.email === invitation.email);
    const password = tidy(body?.password);
    if (existingUser) {
      if (!password || !(await verifyPassword(password, existingUser))) {
        sendJson(res, 401, { ok: false, error: "Use the invited account password to join this workspace." });
        return;
      }
      user = existingUser;
    } else {
      const name = tidy(body?.name);
      if (!name || !password) {
        sendJson(res, 400, { ok: false, error: "Name and password are required to activate this invitation." });
        return;
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        sendJson(res, 400, { ok: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
        return;
      }
      const passwordRecord = await hashPassword(password);
      user = {
        id: makeId("user"),
        name,
        company: workspace.name,
        email: invitation.email,
        role: invitation.role === "admin" ? "admin" : invitation.role === "customer" ? "customer" : "sales",
        passwordSalt: passwordRecord.salt,
        passwordHash: passwordRecord.hash,
        workspaceIds: [],
        createdAt: nowIso(),
        lastLoginAt: nowIso(),
        status: "active",
      };
      db.users.push(user);
    }
  }

  user.workspaceIds = unique([...(asArray(user.workspaceIds)), workspace.id]);
  if (!findWorkspaceMember(workspace, user.id)) {
    addMembershipToWorkspace(workspace, user.id, invitation.role, nowIso());
  }
  removePendingInvitationsForMember(db, workspace.id, invitation.email);
  invitation.status = "accepted";
  invitation.acceptedAt = nowIso();
  user.lastLoginAt = nowIso();

  const sessionToken = await createSession(db, user, workspace);
  appendAuditEvent(db, makeProjectAuditEvent({
    scope: "workspace",
    action: "invite-accepted",
    detail: `${user.email} joined ${workspace.name}.`,
    user,
    workspaceId: workspace.id,
  }));

  await writeDb(db);
  setWingmanSessionCookie(res, sessionToken);
  sendJson(res, 200, makeSessionPayload(user, workspace));
  });
}

export async function handleWingmanGovernanceGet(req, res, url, { sendJson }) {
  const governance = await readGovernance();
  const db = await readDb();
  const auth = getAuthContext(req, url, db);

  sendJson(res, 200, {
    ...governance,
    workspaceScoped: Boolean(auth.ok),
  });
}

export async function handleWingmanAuditGet(req, res, url, { sendJson }) {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }
  if (!auth.permissions.canViewDiagnostics) {
    sendJson(res, 403, { ok: false, error: "Audit access is unavailable for this workspace role." });
    return;
  }

  const projectId = tidy(url.searchParams.get("projectId"));
  const state = ensureWorkspaceState(db, auth.workspace.id);
  const allowedProjectIds = new Set(asArray(state.projects).map((project) => project.id));
  const events = asArray(db.auditEvents)
    .filter((event) => !event.workspaceId || event.workspaceId === auth.workspace.id)
    .filter((event) => !event.projectId || allowedProjectIds.has(event.projectId))
    .filter((event) => !projectId || event.projectId === projectId)
    .slice(0, 60);

  sendJson(res, 200, { ok: true, events });
}

export async function handleWingmanTelemetryGet(req, res, url, { sendJson }) {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }
  if (!auth.permissions.canViewDiagnostics) {
    sendJson(res, 403, { ok: false, error: "Telemetry access is unavailable for this workspace role." });
    return;
  }

  const state = ensureWorkspaceState(db, auth.workspace.id);
  const allowedProjectIds = new Set(asArray(state.projects).map((project) => project.id));
  const events = asArray(db.telemetryEvents)
    .filter((event) => !event.workspaceId || event.workspaceId === auth.workspace.id)
    .filter((event) => !event.projectId || allowedProjectIds.has(event.projectId))
    .slice(0, 80);

  sendJson(res, 200, { ok: true, events });
}

export async function handleWingmanTelemetryPost(req, res, url, { sendJson, parseJsonBody }) {
  return withStoreLock(async () => {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }

  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const event = {
    id: tidy(body?.id) || makeId("telemetry"),
    kind: ["error", "unhandledrejection", "info"].includes(tidy(body?.kind)) ? tidy(body?.kind) : "info",
    message: tidy(body?.message) || "Runtime event",
    stack: tidy(body?.stack) || undefined,
    source: tidy(body?.source) || undefined,
    line: Number.isFinite(Number(body?.line)) ? Number(body.line) : undefined,
    column: Number.isFinite(Number(body?.column)) ? Number(body.column) : undefined,
    timestamp: tidy(body?.timestamp) || nowIso(),
    route: tidy(body?.route) || undefined,
    projectId: tidy(body?.projectId) || undefined,
    handled: typeof body?.handled === "boolean" ? body.handled : undefined,
    workspaceId: auth.workspace.id,
    userId: auth.user.id,
  };

  appendTelemetryEvent(db, event);
  appendAuditEvent(db, makeProjectAuditEvent({
    scope: "telemetry",
    action: "runtime",
    detail: `Runtime telemetry captured: ${event.kind}.`,
    user: auth.user,
    projectId: event.projectId,
    workspaceId: auth.workspace.id,
    severity: event.kind === "info" ? "info" : "warn",
  }));

  await writeDb(db);
  sendJson(res, 200, { ok: true });
  });
}
