#!/usr/bin/env node
// Verifies, against a LIVE Supabase project, that row level security is
// actually protecting the Wingman tables.
//
// check:migration-parity proves the migration FILES agree. This proves the
// DATABASE agrees with them - which is a different question, and the one that
// matters. A project provisioned before 20260724_enable_rls_on_wingman_tables
// landed can still have RLS off no matter what the files now say.
//
// Two modes:
//
//   Read-only (SUPABASE_URL + SUPABASE_ANON_KEY):
//     Issues SELECTs only, never writes. Safe against production. The catch:
//     PostgREST returns HTTP 200 with an empty array both for an EMPTY table
//     and for a table whose rows RLS filtered out, so on a database with few
//     or no rows the verdicts come back "unclear" rather than definitive.
//
//   Sentinel mode (additionally SUPABASE_SECRET_KEY):
//     Definitive. For each table it seeds ONE secret marker row through the
//     service role (which bypasses RLS), then asks the public anon key for
//     that exact row:
//       - anon sees it            -> EXPOSED (RLS off or a permissive policy)
//       - anon gets [] or 401/403 -> PROTECTED (we know the row exists)
//     Every probe row is deleted in a finally block and residue is verified;
//     the tool exits non-zero rather than leave litter behind. This mode
//     writes transient rows, so it is only safe against databases you are
//     allowed to write probe rows into (staging, CI sandboxes).
//
//   Sentinel mode is STRICT (this is the mode CI runs): any table that cannot
//   be proven protected - a seed insert that failed (inconclusive) or a table
//   that is absent (missing) - fails the run. Read-only mode keeps those as
//   notes because an empty table legitimately looks identical to a protected
//   one there.
//
// The tool still only ever uses the *anon* key to check exposure - the secret
// key is used exclusively to seed/clean the markers.
//
// Usage:
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_ANON_KEY=eyJ... \
//   [SUPABASE_SECRET_KEY=eyJ...] \
//   node tools/verify-supabase-rls.mjs
//
// The anon key is the public, client-side key from Settings > API. It is not a
// secret - the whole point of this check is that anyone could hold it, so the
// database must not rely on it being private.

const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const anonKey = String(process.env.SUPABASE_ANON_KEY || "").trim();
const secretKey = String(process.env.SUPABASE_SECRET_KEY || "").trim();

if (!url || !anonKey) {
  console.error("[supabase-rls] SUPABASE_URL and SUPABASE_ANON_KEY are both required.");
  console.error("Get them from your Supabase dashboard: Settings > API.");
  process.exit(2);
}

const ANON = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
const SERVICE = secretKey ? { apikey: secretKey, Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" } : null;

// ---------------------------------------------------------------------------
// Sentinel seeding
// ---------------------------------------------------------------------------

const tag = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const ids = {
  appState: `rls-sentinel-appstate-${tag}`,
  user: `rls-sentinel-user-${tag}`,
  workspace: `rls-sentinel-ws-${tag}`,
  member: `rls-sentinel-member-${tag}`,
  invitation: `rls-sentinel-invite-${tag}`,
  session: `rls-sentinel-session-${tag}`,
  project: `rls-sentinel-project-${tag}`,
  audit: `rls-sentinel-audit-${tag}`,
  telemetry: `rls-sentinel-telemetry-${tag}`,
};

// Insert order matters: the FK targets (users, workspaces) come first.
const SEED = {
  wingman_app_state: () => ({ id: ids.appState, payload: { sentinel: true } }),
  wingman_users: () => ({
    id: ids.user,
    name: "RLS Sentinel User",
    email: `${ids.user}@example.com`,
    password_salt: "sentinel-not-a-real-salt",
    password_hash: "sentinel-not-a-real-hash",
  }),
  wingman_workspaces: () => ({
    id: ids.workspace,
    name: "RLS Sentinel Workspace",
    slug: `rls-sentinel-${tag}`,
    owner_user_id: ids.user,
  }),
  wingman_workspace_members: () => ({ id: ids.member, workspace_id: ids.workspace, user_id: ids.user }),
  wingman_workspace_invitations: () => ({
    id: ids.invitation,
    workspace_id: ids.workspace,
    email: `${ids.invitation}@invite.example.com`,
    token_hash: `rls-sentinel-token-${tag}`,
  }),
  wingman_sessions: () => ({
    id: ids.session,
    token_hash: `rls-sentinel-session-token-${tag}`,
    user_id: ids.user,
    workspace_id: ids.workspace,
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
  }),
  wingman_projects: () => ({ id: ids.project, workspace_id: ids.workspace, project_name: "RLS Sentinel Project", payload: { sentinel: true } }),
  wingman_audit_events: () => ({ id: ids.audit, workspace_id: ids.workspace, action: "rls-sentinel", detail: "RLS sentinel probe row", payload: { sentinel: true } }),
  wingman_telemetry_events: () => ({ id: ids.telemetry, workspace_id: ids.workspace, user_id: ids.user, kind: "info", message: "RLS sentinel probe row", payload: { sentinel: true } }),
};

const TABLES = Object.keys(SEED);

async function seedTable(table, body) {
  try {
    const response = await fetch(`${url}/rest/v1/${table}`, {
      method: "POST",
      headers: SERVICE,
      body: JSON.stringify(body),
    });
    if (response.status === 201) return { ok: true };
    return { ok: false, status: response.status, detail: (await response.text()).slice(0, 140) };
  } catch (error) {
    return { ok: false, detail: error.message };
  }
}

// Deletion must go dependents-first: workspaces.owner_user_id references
// wingman_users with ON DELETE RESTRICT, so the sentinel user row cannot be
// deleted while the sentinel workspace (or anything else) still points at it.
const CLEANUP_ORDER = [
  "wingman_telemetry_events",
  "wingman_audit_events",
  "wingman_projects",
  "wingman_sessions",
  "wingman_workspace_invitations",
  "wingman_workspace_members",
  "wingman_workspaces",
  "wingman_users",
  "wingman_app_state",
];

async function cleanup() {
  let residue = false;
  for (const table of CLEANUP_ORDER) {
    try {
      const r = await fetch(`${url}/rest/v1/${table}?id=eq.${encodeURIComponent(ids[TABLE_ID[table]])}`, {
        method: "DELETE",
        headers: SERVICE,
      });
      if (r.status !== 204) residue = true;
    } catch {
      residue = true;
    }
  }
  for (const table of CLEANUP_ORDER) {
    const r = await fetch(`${url}/rest/v1/${table}?id=eq.${encodeURIComponent(ids[TABLE_ID[table]])}&select=id`, { headers: SERVICE });
    const rows = await r.json();
    if (Array.isArray(rows) && rows.length > 0) {
      console.error(`  [cleanup] residue on ${table}: row ${ids[TABLE_ID[table]]} still present - needs manual deletion.`);
      residue = true;
    }
  }
  return residue;
}

// Which sentinel row id belongs to which table.
const TABLE_ID = {
  wingman_app_state: "appState",
  wingman_users: "user",
  wingman_workspaces: "workspace",
  wingman_workspace_members: "member",
  wingman_workspace_invitations: "invitation",
  wingman_sessions: "session",
  wingman_projects: "project",
  wingman_audit_events: "audit",
  wingman_telemetry_events: "telemetry",
};

// ---------------------------------------------------------------------------
// Probing
// ---------------------------------------------------------------------------

async function probe(table, sentinelSeeded) {
  const sentinelId = ids[TABLE_ID[table]];
  const endpoint = `${url}/rest/v1/${table}`;

  // Sentinel mode: anon key must not see the row the service role just wrote.
  if (SERVICE) {
    try {
      const r = await fetch(`${endpoint}?select=id&id=eq.${encodeURIComponent(sentinelId)}`, { headers: ANON });

      if (r.status === 401 || r.status === 403) {
        return { table, verdict: "protected", detail: `HTTP ${r.status} - anon denied (sentinel row seeded)` };
      }

      const body = await r.text();
      if (!r.ok) {
        if (/does not exist|could not find the table/i.test(body)) {
          return { table, verdict: "missing", detail: `HTTP ${r.status} - table not found` };
        }
        return { table, verdict: "unknown", detail: `HTTP ${r.status}` };
      }

      let rows = [];
      try {
        rows = JSON.parse(body);
      } catch {
        return { table, verdict: "unknown", detail: "unparseable response" };
      }

      if (Array.isArray(rows) && rows.length > 0) {
        // The anon key read the specific row we seeded. Definitive leak.
        return { table, verdict: "exposed", detail: `anon key read sentinel row ${sentinelId}` };
      }

      if (!sentinelSeeded) {
        // The seed insert failed, so an empty result proves nothing: the row
        // we asked for may simply not exist. Stay honest - inconclusive.
        return { table, verdict: "inconclusive", detail: "seed insert failed - could not prove protection" };
      }

      // We seeded the row via the service role moments ago, and the anon key
      // cannot see it via the filtered probe. But RLS policies can be narrow
      // as well as absent: a permissive policy whose predicate the sentinel
      // row does not satisfy (e.g. workspace_id = auth.uid()) still leaks the
      // table's real rows while returning [] for our filtered id probe. The
      // nightly gate exists to catch arbitrary policy drift, so ALSO issue an
      // unfiltered anon read: with the sentinel row provably present, any row
      // the anon key can see at all is a leak.
      try {
        const u = await fetch(`${endpoint}?select=id&limit=1`, { headers: ANON });
        if (u.status === 401 || u.status === 403) {
          return { table, verdict: "protected", detail: "sentinel row and unfiltered read both denied to anon" };
        }
        const uBody = await u.text();
        let uRows = [];
        try {
          uRows = JSON.parse(uBody);
        } catch {
          return { table, verdict: "unknown", detail: "unparseable unfiltered response" };
        }
        if (Array.isArray(uRows) && uRows.length > 0) {
          return { table, verdict: "exposed", detail: `anon key read ${uRows.length} row(s) via unfiltered probe (conditional policy leak)` };
        }
      } catch (error) {
        return { table, verdict: "unknown", detail: `unfiltered probe failed: ${error.message}` };
      }

      // The sentinel row exists (seeded moments ago) and the anon key can see
      // neither it nor any other row. Definitive protection - even though RLS
      // filtering and an empty table are indistinguishable in read-only mode,
      // they are NOT indistinguishable here.
      return { table, verdict: "protected", detail: "sentinel row and unfiltered read invisible to anon key" };
    } catch (error) {
      return { table, verdict: "unknown", detail: error.message };
    }
  }

  // Read-only mode: the original, write-free probe. Unclear when empty.
  try {
    const response = await fetch(`${endpoint}?select=*&limit=1`, { headers: ANON });

    if (response.status === 401 || response.status === 403) {
      return { table, verdict: "protected", detail: `HTTP ${response.status} - anon denied` };
    }

    const body = await response.text();

    if (!response.ok) {
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
      return { table, verdict: "exposed", detail: `anon key read ${rows.length} row(s)` };
    }

    return { table, verdict: "inconclusive", detail: "HTTP 200 but no rows - empty table and protected table look identical here" };
  } catch (error) {
    return { table, verdict: "unknown", detail: error.message };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`[supabase-rls] Probed ${TABLES.length} tables at ${url} with the anon key.\n`);
  if (SERVICE) console.log(`  mode: sentinel (seeding one marker row per table, tag ${tag})\n`);
  else console.log("  mode: read-only (no SUPABASE_SECRET_KEY - empty tables will be 'unclear')\n");

  // Seeding failures should not abort the run, but they must be visible.
  // Only ever seeds when the service key is present - read-only mode must
  // not send any write requests at all.
  const seededByTable = {};
  if (SERVICE) {
    for (const table of TABLES) {
      const seeded = await seedTable(table, SEED[table]());
      seededByTable[table] = seeded.ok;
      if (!seeded.ok) {
        console.error(`  [seed] ${table} FAILED: ${seeded.status || "?"} ${seeded.detail || ""}`);
      }
    }
  }

  const results = [];
  for (const table of TABLES) {
    results.push(await probe(table, seededByTable[table]));
  }

  const exposed = results.filter((r) => r.verdict === "exposed");
  const inconclusive = results.filter((r) => r.verdict === "inconclusive");
  const missing = results.filter((r) => r.verdict === "missing");
  const protectedTables = results.filter((r) => r.verdict === "protected");
  const unknown = results.filter((r) => r.verdict === "unknown");

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

  let fail = false;

  if (exposed.length) {
    console.error(`[supabase-rls] FAIL: ${exposed.length} table(s) returned data to the public anon key.`);
    console.error("RLS is not protecting these tables. Apply:");
    console.error("  supabase/migrations/20260724_enable_rls_on_wingman_tables.sql");
    fail = true;
  }

  if (missing.length === TABLES.length) {
    console.error("[supabase-rls] FAIL: no Wingman tables found. Wrong project, or migrations never applied.");
    fail = true;
  }

  if (unknown.length) {
    console.error(`[supabase-rls] Could not reach ${unknown.length} table(s). Is the project paused?`);
    fail = true;
  }

  // Sentinel mode is strict. The whole point of seeding a marker row is to
  // get a definitive verdict, so failing to prove protection must fail the
  // run - never degrade to a note the way read-only mode does for empty
  // tables. An inconclusive result here means the seed insert failed; a
  // missing table means the posture cannot be verified at all.
  if (SERVICE && (inconclusive.length || missing.length)) {
    const problems = [];
    if (inconclusive.length) {
      problems.push(`${inconclusive.length} table(s) could not be proven protected (sentinel seed failed)`);
    }
    if (missing.length) {
      problems.push(`${missing.length} table(s) are absent - posture unverifiable`);
    }
    console.error(`[supabase-rls] FAIL: ${problems.join("; ")}.`);
    fail = true;
  }

  if (fail) {
    process.exitCode = 1;
  } else {
    console.log("[supabase-rls] No table returned data to the anon key.");
  }

  // Read-only mode only: inconclusive is a soft note there (an empty table is
  // legitimately indistinguishable from a protected one). In sentinel mode an
  // inconclusive result already failed above.
  if (inconclusive.length && !SERVICE) {
    console.log(
      `\nNote: ${inconclusive.length} table(s) could not be proven either way (read-only mode with\n` +
        "no rows). For those, confirm in the dashboard:\n" +
        "  Database > Tables - the RLS toggle must be ON, or\n" +
        "  Advisors > Security - Supabase flags \"RLS disabled in public\" as an error.\n" +
        "Re-run with SUPABASE_SECRET_KEY set to seed marker rows (sentinel mode; warnings then fail)\n" +
        "to remove all ambiguity.",
    );
  }

  if (SERVICE && protectedTables.length) {
    console.log(`\n${protectedTables.length} table(s) hid their seeded marker row from the anon key - definitive protection.`);
  } else if (protectedTables.length) {
    console.log(`\n${protectedTables.length} table(s) actively refused the anon key.`);
  }
}

main()
  .catch((error) => {
    console.error(`[supabase-rls] ERROR: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (SERVICE) {
      const residue = await cleanup();
      if (residue) {
        console.error(`[supabase-rls] FAIL: probe row residue remained - manual cleanup required.`);
        process.exitCode = 1;
      } else {
        console.log("[supabase-rls] Probe rows removed - database left clean.");
      }
    }
  });