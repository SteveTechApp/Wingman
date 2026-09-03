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
 * The merge is deterministic, conservative and commutative: engine snapshots
 * come from the committed baseline, human approvals win over machine rows,
 * the newest review/update time breaks ties, and a full tie (equal review and
 * update times) falls back to the canonical row so the outcome never depends
 * on which side was passed first - two machines converge on the same ledger
 * without a conflict protocol, regardless of argument order. These invariants
 * are pinned by the randomized harness in
 * competitor-decision-ledger-merge.invariant.test.mjs.
 *
 * Env:
 *   WINGMAN_LEDGER_SYNC_MODE   "auto" (default; Supabase when credentials are
 *                              present) | "supabase" | "file" (never remote)
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY   shared Supabase credentials
 *   SUPABASE_COMPETITOR_DECISIONS_TABLE        default "competitor_match_decisions"
 *   WINGMAN_LEDGER_COMMIT_MAX_BYTES            default 8388608; pre-flight cap for
 *                              the mirror RPC payload. Migration 011 hard-codes
 *                              the same 8 MiB backstop. When the full mirror
 *                              exceeds it, pushLedgerToSupabase shards the rows
 *                              below the cap (migration 012: N mode='upsert'
 *                              calls + one mode='reconcile' with the id list)
 *                              instead of refusing wholesale. The payload-limit
 *                              suite pins both layers.
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
import { readAllSupabaseRows } from "../supabase-pagination.mjs";

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
// Migration 011: one function that reconciles the whole mirror (delete stale +/
// upsert) inside a single database transaction.
const SUPABASE_WINGMAN_LEDGER_COMMIT_FN = String(
  process.env.SUPABASE_WINGMAN_LEDGER_COMMIT_FUNCTION || "wingman_ledger_commit",
).trim();
const SUPABASE_URL = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

// Oversized-payload ceiling for the full-mirror RPC. Migration 011's
// wingman_ledger_commit hard-codes the same 8 MiB backstop, so this default
// and the SQL ceiling must move together - the payload-limit suite pins both
// to 8388608. Deployments behind a tighter platform request cap can lower the
// pre-flight via env; the SQL ceiling still guards direct callers.
export const LEDGER_COMMIT_MAX_PAYLOAD_BYTES = Math.max(
  1024,
  Number(process.env.WINGMAN_LEDGER_COMMIT_MAX_BYTES || 8_388_608),
);

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
    // Full-table read must page past PostgREST's 1000-row cap: a truncated
    // mirror would silently drop remote approvals, and the stale-row cleanup
    // in pushLedgerToSupabase would then DELETE the unread tail as "stale".
    const { data, error, truncated } = await readAllSupabaseRows(client, TABLE, {
      select: "payload",
      order: "id",
    });
    if (error) {
      const failure = {
        ok: false,
        error: truncated ? `Mirror read did not reach the end of the table: ${error.message}` : error.message,
        table: TABLE,
      };
      // The pagination sentinel's code travels with the result so callers can
      // branch on POSTGREST_PAGINATION_LIMIT without matching message text.
      // Present only when the underlying failure carried a code.
      if (error?.code) failure.errorCode = error.code;
      return failure;
    }
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

// ---------------------------------------------------------------------------
// Oversized-payload guard (migration 011 write path)
// ---------------------------------------------------------------------------

/**
 * Serialized size of the exact body the supabase-js client posts for the
 * full-mirror RPC: rpc("wingman_ledger_commit", { payload: { ledger: rows } })
 * sends JSON.stringify({ payload: { ledger: rows } }). Measuring that - not
 * the rows alone - keeps the pre-flight aligned with what the wire would
 * carry, the same quantity the API's 413 path bounds on the way in.
 */
export function ledgerCommitPayloadBytes(rows) {
  return Buffer.byteLength(JSON.stringify({ payload: { ledger: Array.isArray(rows) ? rows : [] } }));
}

/**
 * Serialized size of a SHARDED RPC call's body: migration 012's mode parameter
 * travels on the wire too, so rpc("wingman_ledger_commit", { payload: { ledger:
 * shard }, mode: "upsert" }) posts JSON.stringify({ payload: { ledger: shard },
 * mode: "upsert" }). Shards must be packed against THIS size - the mode key is
 * part of what the platform request cap sees.
 */
export function ledgerCommitShardBodyBytes(rows) {
  return Buffer.byteLength(JSON.stringify({ payload: { ledger: Array.isArray(rows) ? rows : [] }, mode: "upsert" }));
}

/**
 * Splits the mirror rows into shards whose serialized upsert bodies each stay
 * at or under `maxBytes` (default: the shared 8388608 ceiling), greedily
 * packing as many rows as fit per shard. Every shard is then pushed with
 * mode='upsert' (never deletes); a single final mode='reconcile' call with the
 * full id list removes stale rows atomically. Returns null when ONE row alone
 * exceeds the ceiling - nothing can be sharded in that case.
 */
export function ledgerCommitShards(rows, maxBytes = LEDGER_COMMIT_MAX_PAYLOAD_BYTES) {
  const list = Array.isArray(rows) ? rows : [];
  const shards = [];
  let current = [];
  for (const row of list) {
    const candidate = [...current, row];
    if (ledgerCommitShardBodyBytes(candidate) <= maxBytes) {
      current = candidate;
    } else {
      if (current.length === 0) return null; // a single row alone exceeds the ceiling
      shards.push(current);
      current = [row];
      if (ledgerCommitShardBodyBytes(current) > maxBytes) return null;
    }
  }
  if (current.length > 0) shards.push(current);
  return shards.length > 0 ? shards : null;
}

/**
 * Returns a refusal description when the serialized mirror payload exceeds
 * `maxBytes` (default: the shared 8388608 ceiling), else null. Exported so the
 * boundary math is unit-testable without materializing an 8 MiB fixture.
 */
export function ledgerCommitPayloadTooLargeError(rows, maxBytes = LEDGER_COMMIT_MAX_PAYLOAD_BYTES) {
  const bytes = ledgerCommitPayloadBytes(rows);
  if (bytes <= maxBytes) return null;
  return {
    bytes,
    maxBytes,
    error:
      `Ledger mirror payload is ${bytes} bytes, exceeding the ${maxBytes}-byte wingman_ledger_commit limit ` +
      "(migration 011 rejects oversized payloads just like the API's 413 path). Shrink the mirror or sync in shards; nothing was sent.",
  };
}

/**
 * Mirror the ledger to Supabase. When the serialized mirror fits under the
 * 8 MiB ceiling this is ONE atomic commit: the database function (migration
 * 011/012, wingman_ledger_commit, mode 'full') upserts every decision row and
 * deletes rows no longer in the ledger inside a single transaction, so the
 * table stays an exact mirror without ever existing in a torn state.
 *
 * When the mirror EXCEEDS the ceiling it is pushed in shards (migration 012):
 * each shard is upsert-only (mode 'upsert', never deletes) and stays below the
 * ceiling, then a single mode='reconcile' call carrying the full id list
 * removes stale rows atomically. Upsert-only shards can never erase a row a
 * concurrent writer just pushed; the final reconcile is one transaction, so
 * the mirror converges to exactly the pushed ledger.
 *
 * Only safe when `ledger` already contains both sides (the sync tool merges
 * before calling this); never use for a single approval.
 */
export async function pushLedgerToSupabase(ledger) {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: "Supabase ledger client is not available.", table: TABLE };

  // Migration 011's wingman_ledger_commit hard-codes the migration-created
  // public.competitor_match_decisions table. With a custom
  // SUPABASE_COMPETITOR_DECISIONS_TABLE override the reads address the custom
  // table while this RPC would reconcile the default one - a sync would report
  // success without touching the configured mirror. Reject loudly instead of
  // writing to the wrong dataset.
  if (TABLE !== "competitor_match_decisions") {
    return {
      ok: false,
      error:
        "Full-mirror commit is only supported on the migration-created competitor_match_decisions table " +
        `(migration 011's wingman_ledger_commit hard-codes it); SUPABASE_COMPETITOR_DECISIONS_TABLE is set to ${TABLE}. ` +
        "Remove the override, or provision wingman_ledger_commit for the custom table.",
      table: TABLE,
    };
  }


  const decisions = Array.isArray(ledger?.decisions) ? ledger.decisions : [];
  const rows = decisions
    .filter((decision) => text(decision.id))
    .map((decision) => ({
      id: text(decision.id),
      payload: decision,
      updated_at: text(decision.updatedAt) || nowIso(),
    }));
  if (rows.length === 0) return { ok: true, count: 0, table: TABLE };

  // 413-style write-path hardening (the read side has the pagination sentinel
  // and the API layer rejects oversized JSON bodies on the way in): the single
  // full-mirror RPC is refused when the exact serialized body would exceed the
  // migration-011 ceiling. Instead of refusing WHOLESALE, an oversized mirror
  // is pushed in shards (migration 012): N mode='upsert' calls, each bounded
  // below the ceiling and never deleting, then ONE mode='reconcile' call with
  // the full id list that removes stale rows atomically.
  const tooLarge = ledgerCommitPayloadTooLargeError(rows);
  if (tooLarge) {
    const shards = ledgerCommitShards(rows, LEDGER_COMMIT_MAX_PAYLOAD_BYTES);
    if (!shards) {
      // A single decision alone exceeds the ceiling - there is nothing to
      // shard, so the refusal is the only honest answer.
      return { ok: false, code: "LEDGER_PAYLOAD_TOO_LARGE", table: TABLE, ...tooLarge };
    }

    // The final reconcile passes ONLY ids, so its payload is far smaller than
    // the full rows; verify it still fits, then push every shard (upsert-only)
    // and reconcile once.
    const reconcilePayload = { ledger: rows.map((row) => ({ id: row.id })) };
    if (Buffer.byteLength(JSON.stringify({ payload: reconcilePayload, mode: "reconcile" })) > LEDGER_COMMIT_MAX_PAYLOAD_BYTES) {
      return {
        ok: false,
        code: "LEDGER_PAYLOAD_TOO_LARGE",
        table: TABLE,
        bytes: Buffer.byteLength(JSON.stringify({ payload: reconcilePayload, mode: "reconcile" })),
        maxBytes: LEDGER_COMMIT_MAX_PAYLOAD_BYTES,
        error:
          `Even the id-only reconcile payload exceeds the ${LEDGER_COMMIT_MAX_PAYLOAD_BYTES}-byte ceiling; ` +
          "the mirror has more rows than a single reconcile can address. Raise WINGMAN_LEDGER_COMMIT_MAX_BYTES or prune the mirror.",
      };
    }

    try {
      for (const shard of shards) {
        const { error } = await client.rpc(SUPABASE_WINGMAN_LEDGER_COMMIT_FN, {
          payload: { ledger: shard },
          mode: "upsert",
        });
        if (error) {
          return {
            ok: false,
            error: `Shard ${shards.indexOf(shard) + 1}/${shards.length} upsert failed: ${error.message}`,
            table: TABLE,
            sharded: true,
            shardCount: shards.length,
          };
        }
      }
      const { error } = await client.rpc(SUPABASE_WINGMAN_LEDGER_COMMIT_FN, {
        payload: reconcilePayload,
        mode: "reconcile",
      });
      if (error) {
        return { ok: false, error: `Final reconcile failed: ${error.message}`, table: TABLE, sharded: true, shardCount: shards.length };
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Supabase ledger push failed.",
        table: TABLE,
        sharded: true,
        shardCount: shards.length,
      };
    }
    return { ok: true, count: rows.length, table: TABLE, sharded: true, shardCount: shards.length };
  }

  try {
    const { error } = await client.rpc(SUPABASE_WINGMAN_LEDGER_COMMIT_FN, {
      payload: { ledger: rows },
    });
    if (error) return { ok: false, error: error.message, table: TABLE };
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

  const versions = [local?.version, remote?.version]
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0);

  return {
    // Max of both sides so the ledger version does not depend on argument
    // order (a merge of the same two ledgers must be identical either way).
    version: versions.length ? Math.max(...versions) : 1,
    updatedAt: timestamps[0] || nowIso(),
    decisions,
  };
}

/**
 * Approved rows win; otherwise the newest review/update time wins. A full tie
 * (equal review and update times, different content) falls back to the
 * canonical (JSON-serialized) smaller row so the merge is COMMUTATIVE: the
 * outcome never depends on which side was passed first, so two machines
 * holding differently-ordered or differently-shaped inputs still converge.
 */
function pickWinner(a, b) {
  const approvedRank = (decision) => (decision?.reviewStatus === "approved" ? 1 : 0);
  if (approvedRank(a) !== approvedRank(b)) {
    return approvedRank(a) > approvedRank(b) ? a : b;
  }
  const reviewedAt = (decision) => String(decision?.reviewedAt ?? decision?.updatedAt ?? "");
  if (reviewedAt(a) !== reviewedAt(b)) {
    return reviewedAt(a) > reviewedAt(b) ? a : b;
  }
  const updatedAt = (decision) => String(decision?.updatedAt ?? "");
  if (updatedAt(a) !== updatedAt(b)) {
    return updatedAt(a) > updatedAt(b) ? a : b;
  }
  return JSON.stringify(a) <= JSON.stringify(b) ? a : b;
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
      const fallback = {
        ledger: local,
        mode: "file-db-fallback",
        warnings: [`Supabase ledger read failed: ${remote.error}`],
      };
      if (remote.errorCode) fallback.errorCode = remote.errorCode;
      return fallback;
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
    const failure = {
      ok: false,
      mode: "error",
      merged: local,
      error: remote.error,
      warnings: [`Supabase ledger read failed: ${remote.error}`],
    };
    // Propagate the pagination sentinel code so the sync tool can distinguish
    // a truncated mirror from any other read failure without parsing text.
    if (remote.errorCode) failure.errorCode = remote.errorCode;
    return failure;
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
