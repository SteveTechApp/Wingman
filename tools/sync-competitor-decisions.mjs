/**
 * Competitor decision ledger two-way sync - the cross-machine story behind the
 * Supabase-backed store.
 *
 * The committed JSON (`data/governance/competitor-match-decisions.json`) is
 * the seed. This tool reconciles it with the Supabase mirror so approvals made
 * on one machine reach every other:
 *
 *   1. Pull the remote mirror.
 *   2. Merge it into the committed file (approvals win over machine rows; the
 *      newest review/update time breaks ties - see mergeLedgers).
 *   3. Write the merged ledger to the committed file.
 *   4. Run the DRIFT GATE on the merged state (the same engine re-check that
 *      guards commits) - the merged ledger must still match the engine before
 *      anything is pushed, so a sync can never silently ship a flipped answer.
 *   5. Push the merged ledger back to Supabase.
 *
 * `--seed`: force-push the committed file as the seed (use when the table is
 * empty or was reset). Without it, an empty remote mirror is seeded
 * automatically.
 *
 * Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (see
 * server/governance/competitor-decision-ledger-store.mjs for the table schema).
 * In file mode (no credentials) this prints that nothing needs syncing.
 */

import { spawnSync } from "node:child_process";
import {
  ledgerSyncEnabled,
  mergeLedgers,
  pushLedgerToSupabase,
  readCommittedLedgerFile,
  readLedgerFromSupabase,
  writeCommittedLedgerFile,
} from "../server/governance/competitor-decision-ledger-store.mjs";

const seedFlag = process.argv.includes("--seed");
const testFile = "src/wingman2/lib/competitorMatchDecisions.snapshot.test.ts";

if (!ledgerSyncEnabled()) {
  console.log("[sync:competitor-decisions] file mode - no Supabase credentials configured; the committed JSON is the only ledger. Nothing to sync.");
  process.exit(0);
}

const local = await readCommittedLedgerFile();
if (!local || !Array.isArray(local.decisions)) {
  console.error("[sync:competitor-decisions] committed ledger is missing or malformed - refusing to sync.");
  process.exit(1);
}

const remote = await readLedgerFromSupabase();
if (!remote.ok) {
  console.error(
    `[sync:competitor-decisions] failed to read the Supabase mirror` +
      `${remote.errorCode ? ` [${remote.errorCode}]` : ""}: ${remote.error}`,
  );
  process.exit(1);
}

let merged;
let mode;
if (seedFlag || remote.decisions.length === 0) {
  merged = local;
  mode = seedFlag ? "seeded (forced)" : "seeded (empty mirror)";
} else {
  merged = mergeLedgers(local, remote);
  mode = "merged";
}

const approved = merged.decisions.filter((decision) => decision.reviewStatus === "approved").length;
console.log(`[sync:competitor-decisions] ${mode}: ${merged.decisions.length} decisions (${approved} approved), writing the committed file...`);
await writeCommittedLedgerFile(merged);

// The drift gate on the merged state - the same re-run of the spec engine that
// guards commits. A flip means the merge (or the engine) changed an answer, so
// the push must not happen.
console.log("[sync:competitor-decisions] running the drift gate on the merged ledger...");
const gate = spawnSync("npx", ["vitest", "run", testFile], {
  shell: true,
  stdio: "inherit",
  env: { ...process.env, SNAPSHOT_COMPETITOR_DECISIONS: "" },
});
if (gate.status !== 0) {
  console.error("[sync:competitor-decisions] DRIFT GATE FAILED on the merged ledger - not pushing to Supabase. Investigate before re-running.");
  process.exit(gate.status ?? 1);
}

const pushed = await pushLedgerToSupabase(merged);
if (!pushed.ok) {
  console.error(`[sync:competitor-decisions] drift gate passed but the Supabase push failed: ${pushed.error}`);
  process.exit(1);
}

console.log(`[sync:competitor-decisions] ${mode} and pushed: ${merged.decisions.length} decisions (${approved} approved) now live in the Supabase mirror.`);
