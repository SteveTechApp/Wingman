/**
 * Competitor decision ledger store - Supabase-backed with the committed JSON
 * as the seed, so approvals made on one machine are visible on every other.
 *
 * The ledger (`data/governance/competitor-match-decisions.json`) is the
 * committed golden baseline the drift gate re-verifies against the live
 * engine. This store keeps that file authoritative locally while mirroring it
 * to a Supabase table when configured:
 *
 *   - READ   (`readLedgerForApi`): merge the remote table into the committed
 *            file and serve the merged state, so an approval written by
 *            another machine shows up on this one without a manual step.
 *   - WRITE  (`saveCompetitorDecisionApproval` in the approval module): the
 *            file stays the durable record AND the merged ledger is pushed to
 *            Supabase (write-through mirror), so the approval leaves this
 *            machine.
 *   - SYNC   (`syncCompetitorDecisionLedger` / tools/sync-competitor-decisions.mjs):
 *            the two-way reconcile - pull remote, merge, write the committed
 *            file, run the drift gate on the merged state, and push it back.
 *            The drift gate is the "nothing silently drifted" check of the
 *            whole story: the merged ledger must still match the engine before
 *            it is pushed anywhere.
 *
 * The merge is deterministic and conservative: engine snapshots come from the
 * committed baseline, human approvals win over machine rows, and the newest
 * review/update time breaks ties - so two machines converge on the same
 * ledger without a conflict protocol.
 *
 * Env:
 *   WINGMAN_LEDGER_SYNC_MODE   "auto" (default; Supabase when credentials are
 *                              present) | "supabase" | "file" (never remote)
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY   shared Supabase credentials
 *   SUPABASE_COMPETITOR_DECISIONS_TABLE        default "competitor_match_decisions"
 *
 * Table schema (one row per decision; the full decision is the `payload`):
 *   create table competitor_match_decisions (
 *     id text primary key,
 *     payload jsonb not null,
 *     updated_at timestamptz
 *   );
 */

import fs from "node:fs/promises";
import path from "node:path";
import { COMPETITOR_DECISION_LEDGER_FILE } from "../catalog/files.mjs";

function text(value) {
  return String(value ?? "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

function identityKey(decision) {
  const manufacturer = text(decision?.competitorManufacturer).toLowerCase();
  const sku = text(decision?.competitorSku).toUpperCase();
  return manufacturer && sku ? `${manufacturer}::${sku}` : "";
}

async function readJsonFile(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

// ---------------------------------------------------------------------------
// Supabase connectivity
// ---------------------------------------------------------------------------

const TABLE = String(process.env.SUPABASE_COMPETITOR_DECISIONS_TABLE || "competitor_match_decisions").trim();
const SUPABASE_URL = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

let createSupabaseClient = null;
try {
  ({ createClient: createSupabaseClient } = await import("@supabase/supabase-js"));
} catch {
  // Supabase not installed in this deployment - the ledger stays file-only.
}

/** Test seam: inject a fake client (record-shape compatible with supabase-js). */
let testClient = null;
export function __setLedgerSupabaseClientForTests(client) {
  testClient = client;
}

/** Whether the ledger should mirror to Supabase at all. Read per call so tests can flip it. */
export function ledgerSyncEnabled() {
  const mode = String(process.env.WINGMAN_LEDGER_SYNC_MODE || "auto").trim().toLowerCase();
  if (mode === "file") return false;
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) || Boolean(testClient);
}

function getSupabaseClient() {
  if (testClient) return testClient;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  if (typeof createSupabaseClient !== "function") return null;
  try {
    return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Remote (Supabase) read / write
// ---------------------------------------------------------------------------

/** Read the full ledger mirror from Supabase, or null when empty/unreadable. */
export async function readLedgerFromSupabase() {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: "Supabase ledger client is not available.", table: TABLE };
  try {
    const { data, error } = await client.from(TABLE).select("payload").order("id");
    if (error) return { ok: false, error: error.message, table: TABLE };
    const decisions = (data ?? [])
      .map((row) => row?.payload)
      .filter((payload) => payload && typeof payload === "object");
    if (decisions.length === 0) return { ok: true, decisions: [], table: TABLE };
    return {
      ok: true,
      decisions,
      table: TABLE,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Supabase ledger read failed.", table: TABLE };
  }
}

/**
 * Publish ONE approval to the Supabase mirror. Row-scoped on purpose: an
 * approval write must never overwrite another row, so it can't clobber a
 * concurrent machine's approval even when this machine's committed file is
 * stale relative to the mirror. The full-mirror upsert (`pushLedgerToSupabase`)
 * is reserved for the sync tool, which merges both sides before pushing.
 */
export async function pushDecisionToSupabase(decision) {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: "Supabase ledger client is not available.", table: TABLE };
  const id = text(decision?.id);
  if (!id) return { ok: false, error: "Decision has no id to push.", table: TABLE };
  try {
    const { error } = await client.from(TABLE).upsert(
      [{ id, payload: decision, updated_at: text(decision.updatedAt) || nowIso() }],
      { onConflict: "id" },
    );
    if (error) return { ok: false, error: error.message, table: TABLE };
    return { ok: true, table: TABLE };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Supabase ledger push failed.", table: TABLE };
  }
}

/**
 * Mirror the ledger to Supabase: upsert every decision row (the full decision
 * as `payload`), then delete rows no longer in the ledger so the table stays
 * an exact mirror. Only safe when `ledger` already contains both sides (the
 * sync tool merges before calling this); never use for a single approval.
 */
export async function pushLedgerToSupabase(ledger) {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: "Supabase ledger client is not available.", table: TABLE };
  const decisions = Array.isArray(ledger?.decisions) ? ledger.decisions : [];
  const rows = decisions
    .filter((decision) => text(decision.id))
    .map((decision) => ({
      id: text(decision.id),
      payload: decision,
      updated_at: text(decision.updatedAt) || nowIso(),
    }));
  if (rows.length === 0) return { ok: true, count: 0, table: TABLE };

  try {
    const { error: upsertError } = await client.from(TABLE).upsert(rows, { onConflict: "id" });
    if (upsertError) return { ok: false, error: upsertError.message, table: TABLE };

    const remote = await readLedgerFromSupabase();
    const remoteIds = new Set(
      (remote.ok ? remote.decisions : []).map((decision) => text(decision.id)).filter(Boolean),
    );
    const keptIds = new Set(rows.map((row) => row.id));
    const staleIds = [...remoteIds].filter((id) => !keptIds.has(id));
    if (staleIds.length > 0) {
      const { error: deleteError } = await client.from(TABLE).delete().in("id", staleIds);
      if (deleteError) {
        return { ok: false, error: `Upsert succeeded but stale-row cleanup failed: ${deleteError.message}`, table: TABLE };
      }
    }
    return { ok: true, count: rows.length, table: TABLE };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Supabase ledger push failed.", table: TABLE };
  }
}

// ---------------------------------------------------------------------------
// Two-way merge
// ---------------------------------------------------------------------------

/**
 * The deterministic two-way merge: every decision identity that exists on
 * either side appears once in the result. Human approvals beat machine rows;
 * the newest review/update time breaks ties. Engine snapshots are untouched by
 * the merge (only review fields ever change), so the merged ledger satisfies
 * the drift gate whenever the committed baseline did.
 */
export function mergeLedgers(local, remote) {
  const localDecisions = Array.isArray(local?.decisions) ? local.decisions : [];
  const remoteDecisions = Array.isArray(remote?.decisions) ? remote.decisions : [];
  const byKey = new Map();

  const add = (decision) => {
    const key = identityKey(decision);
    if (!key) return;
    const existing = byKey.get(key);
    byKey.set(key, existing ? pickWinner(existing, decision) : decision);
  };

  for (const decision of localDecisions) add(decision);
  for (const decision of remoteDecisions) add(decision);

  const decisions = [...byKey.values()].sort((a, b) => {
    const keyA = `${text(a.competitorManufacturer).toLowerCase()}::${text(a.competitorSku).toUpperCase()}`;
    const keyB = `${text(b.competitorManufacturer).toLowerCase()}::${text(b.competitorSku).toUpperCase()}`;
    return keyA.localeCompare(keyB);
  });

  const timestamps = [
    text(local?.updatedAt),
    text(remote?.updatedAt),
    ...decisions.map((decision) => text(decision.updatedAt)),
  ].filter(Boolean).sort().reverse();

  return {
    version: Number.isFinite(Number(local?.version)) ? Number(local.version) : Number(remote?.version) || 1,
    updatedAt: timestamps[0] || nowIso(),
    decisions,
  };
}

/** Approved rows win; otherwise the newest review/update time wins. */
function pickWinner(a, b) {
  const approvedRank = (decision) => (decision?.reviewStatus === "approved" ? 1 : 0);
  if (approvedRank(a) !== approvedRank(b)) {
    return approvedRank(a) > approvedRank(b) ? a : b;
  }
  const reviewedAt = (decision) => String(decision?.reviewedAt ?? decision?.updatedAt ?? "");
  if (reviewedAt(a) !== reviewedAt(b)) {
    return reviewedAt(a) > reviewedAt(b) ? a : b;
  }
  return String(a?.updatedAt ?? "") >= String(b?.updatedAt ?? "") ? a : b;
}

// ---------------------------------------------------------------------------
// Ledger access (file + remote-aware)
// ---------------------------------------------------------------------------

/** Read the committed JSON file - the seed / golden baseline. */
export async function readCommittedLedgerFile(filePath = COMPETITOR_DECISION_LEDGER_FILE) {
  return readJsonFile(filePath, null);
}

/** Write the committed JSON file (the drift gate reads exactly this file). */
export async function writeCommittedLedgerFile(ledger, filePath = COMPETITOR_DECISION_LEDGER_FILE) {
  await writeJsonFile(filePath, ledger);
}

/**
 * The remote-aware read used by the approval handlers: when Supabase is
 * enabled, merge the remote mirror into the committed file and serve the
 * merged state, so cross-machine approvals are visible without a manual sync.
 */
export async function readLedgerForApi(filePath = COMPETITOR_DECISION_LEDGER_FILE) {
  const local = await readCommittedLedgerFile(filePath);
  if (!ledgerSyncEnabled()) {
    return { ledger: local, mode: "file-db", warnings: [] };
  }
  try {
    const remote = await readLedgerFromSupabase();
    if (!remote.ok) {
      return { ledger: local, mode: "file-db-fallback", warnings: [`Supabase ledger read failed: ${remote.error}`] };
    }
    if (remote.decisions.length === 0) {
      // The remote mirror is empty - the committed file is the seed.
      return { ledger: local, mode: "file-db-seed", warnings: [] };
    }
    return {
      ledger: mergeLedgers(local ?? { version: 1, decisions: [] }, remote),
      mode: "supabase-merged",
      warnings: [],
    };
  } catch (error) {
    return {
      ledger: local,
      mode: "file-db-fallback",
      warnings: [`Supabase ledger merge failed: ${error instanceof Error ? error.message : "unknown error"}`],
    };
  }
}

/**
 * The two-way sync: pull the remote mirror, merge it into the committed file,
 * and write the merged state to the file. `push` (default true) then mirrors
 * the merged ledger back to Supabase so both sides converge. Returns the
 * merged ledger and what happened. The drift gate is a separate step (run via
 * the sync tool after this returns) so a gate failure can stop the push.
 */
export async function syncCompetitorDecisionLedger({ push = true } = {}) {
  const local = await readCommittedLedgerFile();
  if (!ledgerSyncEnabled()) {
    return { ok: true, mode: "file", merged: local, warnings: [] };
  }

  const remote = await readLedgerFromSupabase();
  if (!remote.ok) {
    return { ok: false, mode: "error", merged: local, error: remote.error, warnings: [`Supabase ledger read failed: ${remote.error}`] };
  }

  let merged;
  let mode;
  if (remote.decisions.length === 0) {
    // Empty remote mirror - the committed JSON seeds Supabase.
    merged = local;
    mode = "seeded";
  } else {
    merged = mergeLedgers(local ?? { version: 1, decisions: [] }, remote);
    mode = "merged";
  }

  await writeCommittedLedgerFile(merged);

  if (!push) {
    return { ok: true, mode, merged, warnings: [] };
  }

  const pushed = await pushLedgerToSupabase(merged);
  if (!pushed.ok) {
    return { ok: true, mode, merged, warnings: [`Supabase push failed: ${pushed.error}`], pushError: pushed.error };
  }
  return { ok: true, mode, merged, warnings: [] };
}
