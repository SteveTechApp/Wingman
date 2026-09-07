#!/usr/bin/env node
// Compares the MIGRATION FILES (server/migrations + supabase/migrations) against
// the LIVE objects of a Supabase project, through the Management API - no
// database password, no psql, no `supabase link` required.
//
// The endpoint is POST /v1/projects/{ref}/database/query/read-only (the
// Management API's server-enforced read-only variant - non-SELECT statements
// are rejected), authenticated with a personal access token (sbp_... from
// supabase.com/dashboard > Account > Access Tokens, or the token
// `supabase login` writes to ~/.supabase/access-token). This tool sends only
// SELECT statements anyway; the endpoint itself refuses anything else.
//
// It verifies the FINAL STATE the migration history describes (001..008),
// including the deltas migrations make: objects 007/008 drop must be ABSENT
// (e.g. idx_wingman_sessions_workspace_active, wingman_now_immutable), objects
// later migrations create must be PRESENT (e.g. the 007 unique invitation
// token index). Every check = one row in the manifest below, with the last
// migration that dictates its expected state.
//
// Usage:
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_ACCESS_TOKEN=sbp_... \
//   node tools/check-migration-live-state.mjs
//
// SUPABASE_ACCESS_TOKEN may also come from ~/.supabase/access-token (written by
// `supabase login`); SUPABASE_URL may come from .env.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const apiBase = "https://api.supabase.com";

function envFromDotEnv(file) {
  try {
    return new Map(
      readFileSync(file, "utf8")
        .split(/\r?\n/)
        .filter((l) => l && !l.startsWith("#"))
        .map((l) => {
          const i = l.indexOf("=");
          return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
        }),
    );
  } catch {
    return new Map();
  }
}

const dotEnv = envFromDotEnv(".env");
const url = String(process.env.SUPABASE_URL || dotEnv.get("SUPABASE_URL") || "").trim().replace(/\/+$/, "");
const token = String(
  process.env.SUPABASE_ACCESS_TOKEN ||
    (() => {
      try {
        return readFileSync(join(homedir(), ".supabase", "access-token"), "utf8").trim();
      } catch {
        return "";
      }
    })(),
).trim();

// Credential/URL validation runs inside main() (not at module scope) so that
// importing this module for the queryRowsFromBody unit test does not exit the
// process. query() reads `ref`, which requireCredentials() populates first.
let ref = "";
function requireCredentials() {
  if (!url || !token) {
    console.error("[migration-live] SUPABASE_URL and a Supabase access token are required.");
    console.error("  - SUPABASE_URL from env or .env");
    console.error("  - token via SUPABASE_ACCESS_TOKEN env, or run `supabase login` once (writes ~/.supabase/access-token)");
    process.exit(2);
  }
  const parsed = url.match(/https:\/\/[a-z0-9]+\.supabase\.co/)?.[0].replace(/^https:\/\//, "").replace(/\.supabase\.co$/, "");
  if (!parsed) {
    console.error(`[migration-live] Cannot parse project ref from "${url}"`);
    process.exit(2);
  }
  ref = parsed;
}

// ---------------------------------------------------------------------------
// The manifest: every object the migration history expects, and whether the
// final state is present or absent. `migration` is informational - the object
// with the last say over its expected state.
// ---------------------------------------------------------------------------

const PRESENT = "present";
const ABSENT = "absent";

const manifest = [];
const add = (kind, name, expected, migration, table) =>
  manifest.push({ kind, name, expected, migration, table });

const WINGMAN_TABLES = [
  "wingman_app_state", "wingman_users", "wingman_workspaces",
  "wingman_workspace_members", "wingman_workspace_invitations", "wingman_sessions",
  "wingman_projects", "wingman_audit_events", "wingman_telemetry_events",
];
const COMPETITOR_TABLES = [
  "competitor_approvals", "competitor_lookup_runtime_events", "competitor_match_decisions",
];
const ALL_TABLES = [...WINGMAN_TABLES, ...COMPETITOR_TABLES];

for (const table of ALL_TABLES) {
  add("table", table, PRESENT, "001_initial_schema.sql / 003_competitor_tables_and_pg_cron.sql");
  add("rls", table, PRESENT, "001_initial_schema.sql / 003_competitor_tables_and_pg_cron.sql", table);
  add("policy", "service_role_all", PRESENT, "006_rls_fix_service_role.sql", table);
}

// Indexes 001 keeps: PK/UNIQUE-backed FKs used by wingman_snapshot_commit and
// the columns the cron jobs filter. Everything 001 created beyond these moved
// to IDX_010_DROPPED.
const IDX_001_KEPT = [
  "idx_wingman_workspaces_owner", "idx_wingman_members_user",
  "idx_wingman_invitations_workspace",
  "idx_wingman_sessions_user", "idx_wingman_sessions_workspace",
  "idx_wingman_sessions_expires",
  "idx_wingman_projects_workspace", "idx_wingman_projects_owner",
  "idx_wingman_audit_workspace", "idx_wingman_audit_created",
  "idx_wingman_telemetry_workspace", "idx_wingman_telemetry_user",
  "idx_wingman_telemetry_timestamp",
];
for (const name of IDX_001_KEPT) add("index", name, PRESENT, "001_initial_schema.sql / 010_drop_unused_indexes.sql");

// The only 003 index the runtime actually matches (order/lt on event_ts).
add("index", "idx_lookup_runtime_events_ts", PRESENT, "003_competitor_tables_and_pg_cron.sql");

const IDX_005_DROPPED_BY_007 = [
  "idx_wingman_sessions_workspace_active", "idx_wingman_audit_workspace_recent",
  "idx_wingman_telemetry_workspace_recent",
];
for (const name of IDX_005_DROPPED_BY_007) add("index", name, ABSENT, "007_drop_rotten_partial_indexes.sql");

add("index", "idx_wingman_invitations_token_unique", PRESENT, "007_drop_rotten_partial_indexes.sql");

// 010 drops 33 indexes no runtime query uses: duplicates of UNIQUE-constraint
// btrees, composites/partials whose predicates no WHERE clause carries, and
// competitor-table indexes on never-filtered columns.
const IDX_010_DROPPED = [
  // redundant with UNIQUE constraints
  "idx_wingman_users_email", "idx_wingman_sessions_token",
  "idx_wingman_invitations_token", "idx_wingman_members_workspace",
  // non-FK, never-filtered columns
  "idx_wingman_users_status", "idx_wingman_workspaces_slug",
  "idx_wingman_invitations_email", "idx_wingman_invitations_status",
  "idx_wingman_projects_stage", "idx_wingman_projects_status",
  "idx_wingman_projects_updated", "idx_wingman_audit_project",
  "idx_wingman_audit_scope", "idx_wingman_telemetry_project",
  "idx_wingman_telemetry_kind",
  // 004 composites for non-existent query patterns
  "idx_wingman_projects_workspace_updated", "idx_wingman_projects_workspace_stage",
  "idx_wingman_projects_workspace_status", "idx_wingman_projects_workspace_owner",
  "idx_wingman_sessions_workspace_user", "idx_wingman_audit_workspace_created",
  "idx_wingman_audit_project_created", "idx_wingman_telemetry_workspace_timestamp",
  "idx_wingman_telemetry_user_timestamp", "idx_wingman_members_user_workspace",
  // 005 partials whose predicates no WHERE clause carries
  "idx_wingman_projects_workspace_active", "idx_wingman_users_active",
  "idx_wingman_invitations_workspace_pending",
  // competitor-table extras
  "idx_competitor_approvals_brand", "idx_competitor_approvals_sku",
  "idx_competitor_approvals_cache_key", "idx_lookup_runtime_events_scope",
  "idx_lookup_runtime_events_severity",
];
for (const name of IDX_010_DROPPED) add("index", name, ABSENT, "010_drop_unused_indexes.sql");

const FUNCTIONS_ABSENT = [
  "wingman_now_immutable", "cleanup_expired_sessions",
  "cleanup_old_audit_events", "cleanup_old_telemetry_events",
];
for (const name of FUNCTIONS_ABSENT) add("function", name, ABSENT, "008_drop_dead_cleanup_functions.sql");

// 009 replaces the app's 16 separate upsert/delete calls with one atomic
// snapshot commit wrapped in a single database transaction.
add("function", "wingman_snapshot_commit", PRESENT, "009_atomic_snapshot_commit.sql");

// 011 gives the competitor decision ledger the same treatment: the mirror's
// two-call upsert + stale-row delete becomes one transaction function. 012
// then adds the mode parameter (full|upsert|reconcile) that lets an oversized
// mirror sync in shards; the function's final shape is the 012 signature.
add("function", "wingman_ledger_commit", PRESENT, "011_atomic_ledger_snapshot.sql / 012_atomic_ledger_sharded_commit.sql");

add("extension", "pg_cron", PRESENT, "003_competitor_tables_and_pg_cron.sql");

const CRON_JOBS = [
  "cleanup-expired-sessions", "cleanup-old-audit-events",
  "cleanup-old-telemetry-events", "cleanup-old-lookup-events",
];
for (const name of CRON_JOBS) add("cron", name, PRESENT, "003_competitor_tables_and_pg_cron.sql");

// ---------------------------------------------------------------------------
// Introspection (read-only SELECTs only)
// ---------------------------------------------------------------------------

// Maps a Management API query response body to its rows. The API returns two
// shapes depending on which endpoint answers:
//   - /database/query/read-only returns the bare SELECT rows directly:
//     [{ col: value, ... }, ...] (or [] for an empty result)
//   - the sibling /database/query returns one envelope per statement:
//     [{ type: 'SELECT', rows: [...], ... }, ...]
// Tolerate both, and NEVER fall through to [] on an unrecognized shape: an
// empty array here makes every expected object read as absent, which would
// report total DRIFT against a perfectly matching schema. (This is exactly the
// bug that shipped in 301ff764: the parser expected the envelope shape, the
// read-only endpoint returns bare rows, every mismatch silently became [] and
// a healthy database read as 98 drifts. The live run with a real token caught
// it - it never could in CI because the token gate ran first.)
//
// Returns an array of row objects. Throws on an unrecognized shape.
export function queryRowsFromBody(body) {
  if (Array.isArray(body)) {
    const envelope =
      body.length > 0 &&
      typeof body[0]?.type === "string" &&
      Array.isArray(body[0]?.rows);
    if (envelope) return body.flatMap((entry) => (Array.isArray(entry?.rows) ? entry.rows : []));
    return body;
  }
  if (body && typeof body === "object" && Array.isArray(body.rows)) return body.rows;
  throw new Error(
    `Unexpected response shape from the query endpoint (expected an array of rows or statement envelopes): ${JSON.stringify(body).slice(0, 300)}`,
  );
}

// PostgreSQL array columns can be returned by the Management API either as a
// JavaScript array or in PostgreSQL's text representation (for example,
// "{service_role}"). Normalize both shapes before checking policy roles.
export function postgresArrayIncludes(value, expected) {
  if (Array.isArray(value)) return value.includes(expected);
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return false;
  return trimmed
    .slice(1, -1)
    .split(",")
    .map((item) => item.trim().replace(/^"|"$/g, ""))
    .includes(expected);
}

async function query(sql) {
  const response = await fetch(`${apiBase}/v1/projects/${ref}/database/query/read-only`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  if (!response.ok) {
    const body = await response.text();
    if (response.status === 401 || response.status === 403) {
      console.error("[migration-live] Management API rejected the token - it needs database access.");
      console.error("  Full-access tokens (sbp_...) from Settings > Access Tokens work; fine-grained");
      console.error("  tokens need a scope that covers the project's database read access.");
    } else {
      console.error(`[migration-live] Management API HTTP ${response.status}: ${body.slice(0, 300)}`);
    }
    process.exit(1);
  }
  try {
    return queryRowsFromBody(await response.json());
  } catch (error) {
    console.error(`[migration-live] ${error.message}`);
    process.exit(1);
  }
}

async function readLiveState() {
  const tables = new Set((await query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`)).map((r) => r.tablename));
  const rls = new Map((await query(
    `SELECT c.relname AS table, c.relrowsecurity AS on FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r'`,
  )).map((r) => [r.table, r.on]));
  const indexes = new Set((await query(
    `SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`,
  )).map((r) => r.indexname));
  const functions = new Set((await query(
    `SELECT p.proname AS name FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'`,
  )).map((r) => r.name));
  const policyRoles = new Map();
  for (const r of await query(
    `SELECT tablename, policyname, roles FROM pg_policies
     WHERE schemaname = 'public' AND policyname = 'service_role_all'`,
  )) {
    policyRoles.set(r.tablename, r.roles);
  }
  const extensions = new Set((await query(`SELECT extname FROM pg_extension`)).map((r) => r.extname));
  const cronJobs = new Set();
  if (extensions.has("pg_cron")) {
    for (const r of await query(`SELECT jobname FROM cron.job`)) cronJobs.add(r.jobname);
  }
  return { tables, rls, indexes, functions, policyRoles, cronJobs, extensions };
}

// ---------------------------------------------------------------------------
// Compare + report
// ---------------------------------------------------------------------------

async function main() {
  requireCredentials();
  console.log(`[migration-live] Checking ${manifest.length} expected objects against ${ref}\n  (read-only SELECTs via the Management API - no DB password)\n`);

  let live;
  try {
    live = await readLiveState();
  } catch (error) {
    console.error(`[migration-live] ERROR: ${error.message}`);
    process.exit(1);
  }

  const drift = [];
  const byMigration = new Map();
  for (const entry of manifest) {
    const actual = (() => {
      switch (entry.kind) {
        case "table": return live.tables.has(entry.name);
        case "rls": return live.rls.get(entry.name) === true;
        case "index": return live.indexes.has(entry.name);
        case "function": return live.functions.has(entry.name);
        case "policy": {
          const roles = live.policyRoles.get(entry.table);
          return postgresArrayIncludes(roles, "service_role");
        }
        case "cron": return live.cronJobs.has(entry.name);
        case "extension": return live.extensions.has(entry.name);
        default: return false;
      }
    })();
    const ok = entry.expected === PRESENT ? actual : !actual;
    const label = entry.kind === "policy" ? `policy service_role_all on ${entry.table}` : `${entry.kind} ${entry.name}`;
    const expectedText = entry.expected === PRESENT ? "present" : "absent";
    if (!byMigration.has(entry.migration)) byMigration.set(entry.migration, { ok: 0, drift: 0 });
    const bucket = byMigration.get(entry.migration);
    if (ok) bucket.ok += 1;
    else {
      bucket.drift += 1;
      drift.push({ ...entry, label, expectedText, actual });
    }
  }

  for (const [migration, stats] of byMigration) {
    const mark = stats.drift ? "DRIFT" : "ok";
    console.log(`  [${mark}] ${migration.padEnd(42)} ${stats.ok}/${stats.ok + stats.drift} objects`);
  }

  console.log("");
  if (drift.length === 0) {
    console.log("[migration-live] PASS - every expected object is present, every expected absence is absent.");
  } else {
    console.error(`[migration-live] FAIL - ${drift.length} drift(s) between migration files and the live database:`);
    for (const d of drift) {
      console.error(
        `  - expected ${d.label} ${d.expectedText}, actually ${d.actual ? "PRESENT" : "absent"} (per ${d.migration})`,
      );
    }
    process.exitCode = 1;
  }
}

// Only run when executed directly - importing the module (e.g. from the unit
// test that pins queryRowsFromBody) must not start a live probe.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error(`[migration-live] ERROR: ${error.message}`);
    process.exit(1);
  });
}
