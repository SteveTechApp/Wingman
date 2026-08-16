/**
 * Regenerate or refresh the golden competitor-match-decision baseline from the
 * live spec engine, then verify it still matches the engine (the drift gate).
 *
 * Default (no flag): full rewrite via SNAPSHOT_COMPETITOR_DECISIONS=write -
 * every row becomes a fresh pending-review machine baseline. Destructive to
 * human approvals, so only use after deliberately reviewing an engine or data
 * change that alters comparison outcomes wholesale.
 *
 * `--preserve`: in-place refresh via SNAPSHOT_COMPETITOR_DECISIONS=refresh -
 * only rows whose outcome changed are updated, and approved rows keep their
 * approval unless their outcome moved (which fails loudly, requiring re-review).
 */

import { spawnSync } from "node:child_process";

const testFile = "src/wingman2/lib/competitorMatchDecisions.snapshot.test.ts";
const preserve = process.argv.includes("--preserve");
const mode = preserve ? "refresh" : "write";

// `shell: true` so the npx shim resolves on every platform (cmd.exe on
// Windows, sh elsewhere).
const write = spawnSync("npx", ["vitest", "run", testFile], {
  shell: true,
  env: { ...process.env, SNAPSHOT_COMPETITOR_DECISIONS: mode },
  stdio: "inherit",
});

if (write.status !== 0) {
  console.error(`[snapshot] failed to ${mode} the baseline ledger`);
  process.exit(write.status ?? 1);
}

console.log("[snapshot] verifying the written baseline against the live engine...");
const verify = spawnSync("npx", ["vitest", "run", testFile], {
  shell: true,
  env: { ...process.env, SNAPSHOT_COMPETITOR_DECISIONS: "" },
  stdio: "inherit",
});

process.exit(verify.status ?? 1);
