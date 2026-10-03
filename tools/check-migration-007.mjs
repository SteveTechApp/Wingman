#!/usr/bin/env node
// Verifies, against a LIVE Supabase project, that migration 007's end-state is
// actually enforced in the database.
//
// Migration 007 changes four things:
//   1. drops idx_wingman_sessions_workspace_active
//   2. drops idx_wingman_audit_workspace_recent
//   3. drops idx_wingman_telemetry_workspace_recent
//   4. drops wingman_now_immutable()
//   5. creates UNIQUE index idx_wingman_invitations_token_unique
//
// Items 1-4 are only visible through pg_catalog (pg_indexes / pg_proc), which
// the anon and service API keys cannot reach - those need psql or the
// Management API token and are verified with the query block in the
// migration's "Verify" section. This check covers what the API CAN prove:
//
//   * the unique index is ENFORCED. It attempts to insert two invitations
//     with the same token_hash using the service role (which bypasses RLS).
//     If the index exists, Postgres rejects the second insert with 409 and
//     names the index in the error body. If it accepts the row, the index is
//     not enforced and the check FAILS.
//
// The probe is transactional-safe: it inserts rows with ids prefixed
// migration-007-probe- and always deletes them in a finally block, then
// confirms no residue remains. It exits non-zero if cleanup could not be
// completed so a broken probe can never silently litter the table.
//
// Read-only in intent; the only writes are the self-cleaning probe rows.
// Not part of `verify`, because it needs live credentials and network access.
//
// Usage:
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SECRET_KEY=eyJ... \
//   node tools/check-migration-007.mjs

const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const secretKey = String(process.env.SUPABASE_SECRET_KEY || "").trim();

if (!url || !secretKey) {
  console.error("[migration-007] SUPABASE_URL and SUPABASE_SECRET_KEY are both required.");
  console.error("The secret key (service role) is required - the probe must bypass RLS.");
  process.exit(2);
}

const H = { apikey: secretKey, Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" };
const TABLE = "wingman_workspace_invitations";

const stamp = Date.now();
const probeIds = [`migration-007-probe-a-${stamp}`, `migration-007-probe-b-${stamp}`];
const sameHash = `probe-dup-hash-${stamp}-${Math.random().toString(16).slice(2)}`;

async function cleanup() {
  let residue = false;
  for (const id of probeIds) {
    try {
      const r = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: H });
      if (r.status !== 204) {
        console.error(`  cleanup ${id}: HTTP ${r.status} ${(await r.text()).slice(0, 100)}`);
        residue = true;
      }
    } catch (error) {
      console.error(`  cleanup ${id} failed: ${error.message}`);
      residue = true;
    }
  }
  for (const id of probeIds) {
    const r = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}&select=id`, { headers: H });
    const rows = await r.json();
    if (Array.isArray(rows) && rows.length > 0) {
      console.error(`  residue: probe row ${id} still present - manual deletion required.`);
      residue = true;
    }
  }
  return residue;
}

async function main() {
  console.log(`[migration-007] Probing ${url} with the service role key.\n`);

  const tableResp = await fetch(`${url}/rest/v1/${TABLE}?select=id&limit=1`, { headers: H });
  if (tableResp.status !== 200) {
    console.error(`[migration-007] FAIL: ${TABLE} is unreachable (HTTP ${tableResp.status}).`);
    process.exitCode = 1;
    return;
  }

  const wsResp = await fetch(`${url}/rest/v1/wingman_workspaces?select=id&limit=1`, { headers: H });
  const wsRows = await wsResp.json();
  if (!Array.isArray(wsRows) || wsRows.length === 0) {
    console.error("[migration-007] FAIL: wingman_workspaces has no rows - a real workspace_id is required by the invitations FK.");
    console.error("Seed one workspace first, then re-run this check.");
    process.exitCode = 1;
    return;
  }
  const workspaceId = wsRows[0].id;

  const a = await fetch(`${url}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      id: probeIds[0],
      workspace_id: workspaceId,
      email: "migration-007-probe-a@example.com",
      token_hash: sameHash,
    }),
  });
  if (a.status !== 201) {
    console.error(`[migration-007] FAIL: probe insert 1 unexpected HTTP ${a.status}: ${(await a.text()).slice(0, 200)}`);
    process.exitCode = 1;
    return;
  }

  console.log(`  probe row 1 inserted (token_hash ${sameHash.slice(0, 16)}...)`);
  console.log(`  attempting duplicate token_hash insert...`);

  const b = await fetch(`${url}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      id: probeIds[1],
      workspace_id: workspaceId,
      email: "migration-007-probe-b@example.com",
      token_hash: sameHash,
    }),
  });

  if (b.status === 409) {
    const body = await b.json();
    const message = `${body.message || ""} ${body.details || ""}`;
    const namesIndex = /idx_wingman_invitations_token_unique/.test(message);
    console.log(`  duplicate REJECTED (HTTP 409): ${message}`);
    if (namesIndex) {
      console.log(`\n[migration-007] PASS - idx_wingman_invitations_token_unique is enforced.`);
    } else {
      console.log(`\n[migration-007] WARN - duplicate rejected, but the error did not name the unique index: ${message}`);
      console.log("  Confirm via the pg_catalog verify query that it is idx_wingman_invitations_token_unique.");
      process.exitCode = 1;
    }
  } else if (b.status === 201) {
    console.error(`\n[migration-007] FAIL - duplicate token_hash was ACCEPTED (HTTP 201).`);
    console.error("  idx_wingman_invitations_token_unique is NOT enforced on this database.");
    console.error("  Migration 007 has not fully taken effect. Re-run in the SQL editor:");
    console.error("    CREATE UNIQUE INDEX IF NOT EXISTS idx_wingman_invitations_token_unique");
    console.error("        ON wingman_workspace_invitations (token_hash);");
    process.exitCode = 1;
  } else {
    console.error(`\n[migration-007] FAIL - unexpected HTTP ${b.status} on duplicate insert: ${(await b.text()).slice(0, 200)}`);
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(`[migration-007] ERROR: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    const residue = await cleanup();
    if (residue) process.exitCode = 1;
    if (process.exitCode !== 0) console.error("[migration-007] FAILED - see messages above.");
    else console.log("[migration-007] Probe rows removed - staging left clean.");
  });