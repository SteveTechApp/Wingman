#!/usr/bin/env node
// Verifies, against a LIVE Supabase project, that row level security is
// actually protecting the Wingman tables.
//
// check:migration-parity proves the migration FILES agree. This proves the
// DATABASE agrees with them - which is a different question, and the one that
// matters. A project provisioned before 20260724_enable_rls_on_wingman_tables
// landed can still have RLS off no matter what the files now say.
//
// Read-only. It issues SELECTs and never writes, so it is safe to run against
// production. It is not part of `verify`, because it needs live credentials
// and network access.
//
// Usage:
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_ANON_KEY=eyJ... \
//   node tools/verify-supabase-rls.mjs
//
// The anon key is the public, client-side key from Settings > API. It is not a
// secret - the whole point of this check is that anyone could hold it, so the
// database must not rely on it being private.

const TABLES = [
  "wingman_app_state",
  "wingman_users",
  "wingman_workspaces",
  "wingman_workspace_members",
  "wingman_workspace_invitations",
  "wingman_sessions",
  "wingman_projects",
  "wingman_audit_events",
  "wingman_telemetry_events",
];

const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const anonKey = String(process.env.SUPABASE_ANON_KEY || "").trim();

if (!url || !anonKey) {
  console.error("[supabase-rls] SUPABASE_URL and SUPABASE_ANON_KEY are both required.");
  console.error("Get them from your Supabase dashboard: Settings > API.");
  process.exit(2);
}

async function probe(table) {
  const endpoint = `${url}/rest/v1/${table}?select=*&limit=1`;
  try {
    const response = await fetch(endpoint, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });

    if (response.status === 401 || response.status === 403) {
      return { table, verdict: "protected", detail: `HTTP ${response.status} - anon denied` };
    }

    const body = await response.text();

    if (!response.ok) {
      // PostgREST reports a missing table or a permission problem here too.
      if (/does not exist|could not find the table/i.test(body)) {
        return { table, verdict: "missing", detail: `HTTP ${response.status} - table not found` };
      }
      return { table, verdict: "protected", detail: `HTTP ${response.status}` };
    }

    let rows = [];
    try {
      rows = JSON.parse(body);
    } catch {
      return { table, verdict: "unknown", detail: "unparseable response" };
    }

    if (Array.isArray(rows) && rows.length > 0) {
      // Definitive. The public key read real application data.
      return { table, verdict: "exposed", detail: `anon key read ${rows.length} row(s)` };
    }

    // Ambiguous by design: with RLS on and no anon policy, PostgREST filters
    // rows rather than refusing, so it returns 200 []. An empty table with RLS
    // OFF returns exactly the same thing. This cannot be told apart from
    // outside the database - say so rather than implying a pass.
    return { table, verdict: "inconclusive", detail: "HTTP 200 but no rows - empty table and protected table look identical here" };
  } catch (error) {
    return { table, verdict: "unknown", detail: error.message };
  }
}

const results = [];
for (const table of TABLES) {
  results.push(await probe(table));
}

const exposed = results.filter((r) => r.verdict === "exposed");
const inconclusive = results.filter((r) => r.verdict === "inconclusive");
const missing = results.filter((r) => r.verdict === "missing");
const protectedTables = results.filter((r) => r.verdict === "protected");
const unknown = results.filter((r) => r.verdict === "unknown");

console.log(`[supabase-rls] Probed ${TABLES.length} tables at ${url} with the anon key.\n`);
for (const result of results) {
  const label = {
    exposed: "EXPOSED  ",
    protected: "protected",
    inconclusive: "unclear  ",
    missing: "missing  ",
    unknown: "unknown  ",
  }[result.verdict];
  console.log(`  ${label}  ${result.table.padEnd(32)} ${result.detail}`);
}

console.log("");

if (exposed.length) {
  console.error(`[supabase-rls] FAIL: ${exposed.length} table(s) returned data to the public anon key.`);
  console.error("RLS is not protecting these tables. Apply:");
  console.error("  supabase/migrations/20260724_enable_rls_on_wingman_tables.sql");
  process.exit(1);
}

if (missing.length === TABLES.length) {
  console.error("[supabase-rls] FAIL: no Wingman tables found. Wrong project, or migrations never applied.");
  process.exit(1);
}

if (unknown.length) {
  console.error(`[supabase-rls] Could not reach ${unknown.length} table(s). Is the project paused?`);
  process.exit(1);
}

console.log("[supabase-rls] No table returned data to the anon key.");

if (inconclusive.length) {
  console.log(
    `\nNote: ${inconclusive.length} table(s) were empty, which is indistinguishable from being\n` +
      "protected when probing from outside. For those, confirm in the dashboard:\n" +
      "  Database > Tables - the RLS toggle must be ON, or\n" +
      "  Advisors > Security - Supabase flags \"RLS disabled in public\" as an error.\n" +
      "This check is strongest against a database that actually holds rows.",
  );
}

if (protectedTables.length) {
  console.log(`\n${protectedTables.length} table(s) actively refused the anon key.`);
}
