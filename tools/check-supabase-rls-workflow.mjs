#!/usr/bin/env node
// Guards the Supabase live-gate workflow wiring (the meta-check the CI dry-run
// job runs BEFORE anything touches the live database).
//
// The reusable workflow .github/workflows/supabase-rls.yml hosts TWO live
// jobs, each of which can SILENTLY weaken without its own live check noticing:
//
//   supabase-rls     - runs tools/verify-supabase-rls.mjs in SENTINEL mode
//     (seed one marker row per table through the service role, prove the
//     public anon key cannot read it).
//   migration-live   - runs tools/check-migration-live-state.mjs against the
//     Management API (read-only), proving the live schema matches the
//     migration files.
//
// For EACH job this check pins the same wiring:
//
//   - the gate step must reference every secret the job needs (scoped to the
//     gate region BETWEEN the job header and the tool invocation - the env
//     block after the tool line also contains "${{ secrets.<X> }}" text, so a
//     whole-file search would let a gate that dropped a secret pass as long
//     as the env mapping kept it, silently weakening the gate);
//   - the live step's env block must map every secret into the tool;
//   - the partial-setup branch must exit non-zero (a partial secret setup must
//     not silently run a weaker mode);
//   - the live step must be gated on its secrets check's skipped output;
//   - every caller (ci.yml push/PR, the nightly schedule) must pass
//     `secrets: inherit`.
//
// This tool makes no network calls and never runs either live probe. The
// secret PRESENCE dry run (fail when a required secret is absent from the
// repository) lives in the CI job itself, where the secrets context exists.
//
// Usage: node tools/check-supabase-rls-workflow.mjs

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const REUSABLE_WORKFLOW = ".github/workflows/supabase-rls.yml";
export const CALLER_WORKFLOWS = [".github/workflows/ci.yml", ".github/workflows/supabase-rls-nightly.yml"];

// The e2e smoke job runs the full product in CI. It is deliberately
// HERMETIC: the API boots with WINGMAN_STORAGE_MODE=file pinned in the tool
// (throwaway data dir), so CI never needs Supabase credentials and the walk
// always exercises the same storage path. If the pin disappears while a
// Supabase secret exists in the environment, the server silently boots into
// supabase/supabase-tables mode and the smoke test greens against a
// different system than the one it claims to verify; if a Supabase secret
// reference is ever added to the smoke step, the gate can silently SKIP on
// fork PRs (secrets unavailable) and CI loses the e2e signal entirely. The
// checker below pins both directions: the file-mode pin must stay in the
// tool, and no secrets.SUPABASE reference may appear in the smoke step or
// its env.
export const E2E_SMOKE_JOB_FILE = ".github/workflows/ci.yml";
export const E2E_SMOKE_TOOL = "tools/e2e-smoke-check.mjs";
export const E2E_SMOKE_HERMETICITY_MARKERS = [
  'WINGMAN_STORAGE_MODE: "file"',
];

const SECRETS = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SECRET_KEY"];

function normalize(text) {
  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n");
}

function linesOf(text) {
  return normalize(text).split("\n");
}

function findLine(lines, predicate, from = 0) {
  for (let i = from; i < lines.length; i += 1) {
    if (predicate(lines[i])) return i;
  }
  return -1;
}

/**
 * Wiring checks for ONE live step of the reusable workflow. The RLS sentinel
 * job and the migration-parity job share the same shape: a secrets-gate step
 * (which decides skip vs fail vs run) immediately followed by a tool step
 * whose env maps the secrets the tool needs.
 */
function checkLiveStep({
  reusable, lines, jobHeader, toolPath, secrets, gateOutput,
  jobLabel, toolName, failMessage,
}) {
  const problems = [];
  const jobStart = findLine(lines, (line) => new RegExp(`^\\s*${jobHeader}:\\s*$`).test(line));

  // The job itself must still exist.
  if (jobStart < 0) {
    problems.push(`${REUSABLE_WORKFLOW}: the ${jobLabel} job (\`${jobHeader}:\`) no longer exists.`);
    return problems;
  }

  const toolLine = findLine(lines, (line) => line.includes(toolPath), jobStart);

  // 1. The live step still runs the tool.
  if (toolLine < 0) {
    problems.push(
      `${REUSABLE_WORKFLOW}: the ${jobLabel} job no longer runs ${toolPath} - ` +
        "without the tool invocation there is no verification to wire secrets for.",
    );
    return problems;
  }

  // The secrets gate step sits BETWEEN the job header and the tool step. Its
  // env block (after the tool line) ALSO contains "${{ secrets.<X> }}" text,
  // so a whole-file search cannot prove the gate itself references a secret -
  // removing SUPABASE_SECRET_KEY from the gate while leaving the env mapping
  // would silently let the probe degrade to read-only mode. Scope every gate
  // reference check to the job-header..tool-invocation region.
  const gateRegion = lines.slice(jobStart, toolLine).join("\n");

  // 2. The secrets gate references every secret (so a missing secret can be
  //    detected and reported instead of silently changing the tool's mode).
  for (const secret of secrets) {
    if (!gateRegion.includes("secrets." + secret)) {
      problems.push(
        REUSABLE_WORKFLOW +
          `: the ${jobLabel} secrets gate no longer references ` +
          secret +
          ". Restore the `[ -z \"${{ secrets." +
          secret +
          " }}\" ]` branch so an absent " +
          secret +
          " fails loudly instead of silently weakening the " +
          toolName +
          " run.",
      );
    }
  }

  // 3. The live step maps every secret into the tool's environment.
  const envStart = findLine(lines, (line) => /^\s*env:\s*$/.test(line), toolLine);
  if (envStart < 0) {
    problems.push(
      `${REUSABLE_WORKFLOW}: the ${jobLabel} live step has no env block mapping secrets into the tool - ` +
        `the ${toolName} would run without credentials.`,
    );
  } else {
    const envLines = lines.slice(envStart + 1, envStart + 8);
    for (const secret of secrets) {
      const marker = secret + ": ${{ secrets." + secret + " }}";
      if (!envLines.some((line) => line.includes(marker))) {
        problems.push(
          REUSABLE_WORKFLOW + `: the ${jobLabel} live step env no longer maps ` + marker + ". " +
            failMessage,
        );
      }
    }
  }

  // 4. The partial-setup branch still fails instead of skipping: the URL
  //    present but a required secret missing must exit non-zero.
  if (!/\bexit 1\b/.test(gateRegion)) {
    problems.push(
      `${REUSABLE_WORKFLOW}: the ${jobLabel} secrets gate has no failing branch (no \`exit 1\` in the gate). ` +
        "A partial secret setup must fail the job, not silently skip or run a weaker mode.",
    );
  }

  // 4b. The gate must HONOR the caller-provided require_secrets input:
  //     scheduled callers pass `require_secrets: true` so a vanished secret
  //     set fails loudly instead of skipping to green on every future night.
  //     Both halves are pinned: the gate must read the input into its env,
  //     and the env value must drive a failing branch (a caller's pin is
  //     inert the moment either half disappears).
  const requireEnvMarker = "REQUIRE_SECRETS: ${{ inputs.require_secrets }}";
  if (!gateRegion.includes(requireEnvMarker)) {
    problems.push(
      `${REUSABLE_WORKFLOW}: the ${jobLabel} secrets gate no longer reads the require_secrets input ` +
        `(.\`${requireEnvMarker}\` is missing from the gate). Scheduled callers pass \`require_secrets: true\` ` +
        "so a vanished secret set fails loudly instead of silently skipping; without this line their pin is inert.",
    );
  } else if (!/\[\s*"\$REQUIRE_SECRETS"\s*=\s*"true"\s*\];\s*then[\s\S]{0,400}?exit 1/.test(gateRegion)) {
    problems.push(
      `${REUSABLE_WORKFLOW}: the ${jobLabel} secrets gate no longer fails loudly when require_secrets is set ` +
        "(no `exit 1` inside the `[ \"$REQUIRE_SECRETS\" = \"true\" ]` branch). A scheduled run whose secrets " +
        "have been removed would silently skip to green on every future night.",
    );
  }

  // 5. The live step is gated on its secrets check, so the skip path cannot
  //    accidentally run the tool half-configured.
  if (!reusable.includes(gateOutput)) {
    problems.push(
      `${REUSABLE_WORKFLOW}: the ${jobLabel} live step is no longer gated on the secrets check ` +
        `(\`if: ${gateOutput} == 'false'\`). Restore the gate so a skipped or failed secrets check ` +
        "never runs the tool half-configured.",
    );
  }

  return problems;
}

/** Collect wiring problems from the reusable workflow + caller texts. */
export function collectSupabaseRlsWorkflowProblems({ reusable, callers = [] }) {
  const problems = [];
  const lines = linesOf(reusable);

  // The RLS sentinel job - every secret must be in the gate AND mapped into
  // the live step's env, and the partial-setup branch must fail loudly.
  problems.push(...checkLiveStep({
    reusable, lines,
    jobHeader: "supabase-rls",
    toolPath: "tools/verify-supabase-rls.mjs",
    secrets: SECRETS,
    gateOutput: "steps.secrets.outputs.skipped",
    jobLabel: "RLS sentinel",
    toolName: "RLS probe",
    failMessage:
      "Without SUPABASE_SECRET_KEY the tool falls back to read-only mode, which cannot prove " +
      "protection on empty tables; restore the env line so sentinel mode keeps running.",
  }));

  // The migration-parity live job - same shape, but its credentials are the
  // Management API token (SUPABASE_ACCESS_TOKEN) rather than the anon/service
  // key pair. check-migration-live-state.mjs requires SUPABASE_URL + token.
  problems.push(...checkLiveStep({
    reusable, lines,
    jobHeader: "migration-live",
    toolPath: "tools/check-migration-live-state.mjs",
    secrets: ["SUPABASE_URL", "SUPABASE_ACCESS_TOKEN"],
    gateOutput: "steps.token.outputs.skipped",
    jobLabel: "migration-parity",
    toolName: "migration-live check",
    failMessage:
      "The tool exits with a config error when the token is missing; restore the env line so the " +
      "nightly migration-parity check actually runs.",
  }));

  // 6. Every caller must pass the repository secrets into the reusable job.
  for (const caller of callers) {
    const callerLines = linesOf(caller.text);
    const usesLine = findLine(callerLines, (line) => line.includes(`uses: ./.github/workflows/supabase-rls.yml`));
    if (usesLine < 0) {
      problems.push(
        `${caller.file}: no longer references the reusable Supabase RLS workflow ` +
          "(`uses: ./.github/workflows/supabase-rls.yml`) - the live RLS gate would not run at all.",
      );
      continue;
    }
    const inheritLine = findLine(
      callerLines,
      (line) => /^\s*secrets:\s*inherit\s*$/.test(line),
      usesLine + 1,
    );
    if (inheritLine < 0 || inheritLine > usesLine + 10) {
      problems.push(
        `${caller.file}: calls the reusable Supabase RLS workflow without \`secrets: inherit\`. ` +
          "The job would run without repository secrets and skip with a misleading message even when the " +
          "secrets ARE configured. Add `secrets: inherit` under the `uses:` line.",
      );
    }

    // 7. Scheduled callers must demand the secrets: a nightly run has no PR
    //    to surface a skip note on, so a vanished secret set would skip to
    //    green on every future night with nothing to notice. The caller must
    //    pass `require_secrets: true` in its `with:` block so the reusable
    //    gates fail loudly instead.
    if (caller.scheduled) {
      const withRegion = callerLines
        .slice(usesLine, inheritLine > 0 ? inheritLine : usesLine + 10)
        .join("\n");
      if (!/require_secrets:\s*true\b/.test(withRegion)) {
        problems.push(
          `${caller.file}: is a scheduled caller but does not set \`require_secrets: true\` in its \`with:\` block. ` +
            "A scheduled live gate whose secrets vanish would silently skip to green on every future night - " +
            "the exact failure mode this workflow exists to prevent. Add `require_secrets: true` under `uses:`.",
        );
      }
    }
  }

  return problems;
}

/**
 * Hermeticity pins for the e2e smoke job (the full-product CI walk).
 *
 * The smoke tool boots the real API with WINGMAN_STORAGE_MODE=file pinned so
 * the run never needs or touches Supabase. Both directions of drift are
 * silent: drop the pin while a Supabase secret exists in the CI environment
 * and the server boots into a Supabase mode the smoke never intended to
 * verify; add a secrets.SUPABASE reference to the smoke step and the gate
 * can skip entirely on fork PRs, silently removing the e2e signal. This
 * keeps the smoke hermetic (never secrets-gated, always file-mode) and the
 * live Supabase checks in the reusable workflow where they belong.
 */
export function collectE2eSmokeHermeticityProblems({ ciYml, smokeTool }) {
  const problems = [];
  const ciLines = linesOf(ciYml);

  // 1. The smoke step must still invoke the e2e tool - directly or through
  //    its npm script (`npm run check:e2e-smoke`), which is how ci.yml runs it.
  const toolLine = findLine(
    ciLines,
    (line) => line.includes("check:e2e-smoke") || line.includes(E2E_SMOKE_TOOL),
  );
  if (toolLine < 0) {
    problems.push(
      `${E2E_SMOKE_JOB_FILE}: no longer runs the e2e smoke check (expected \`npm run check:e2e-smoke\` or ${E2E_SMOKE_TOOL}) - the end-to-end smoke signal is gone from CI.`,
    );
    return problems;
  }

  // 2. Bound the smoke STEP (from its `- name:` marker to the next step or
  //    job-level key) and forbid any Supabase secret reference inside it: a
  //    secrets-gated smoke silently SKIPS on fork PRs and CI loses the e2e
  //    signal. The live Supabase checks belong in supabase-rls.yml.
  const stepIndent = (ciLines[toolLine].match(/^\s*/)[0] ?? "").length;
  let stepStart = toolLine;
  for (let i = toolLine; i >= 0; i -= 1) {
    const indent = (ciLines[i].match(/^\s*/)[0] ?? "").length;
    if (indent < stepIndent || (indent === stepIndent && /^\s*-\s/.test(ciLines[i]))) {
      stepStart = i;
      if (indent < stepIndent) break;
    }
  }
  let stepEnd = ciLines.length;
  for (let i = stepStart + 1; i < ciLines.length; i += 1) {
    const line = ciLines[i];
    const indent = (line.match(/^\s*/)[0] ?? "").length;
    // Sibling keys of the step item (run:/env:/if: at the tool line's indent)
    // belong to the step; anything dedented below it (the next `- ` step, the
    // next job) ends it. Blank lines never end a block.
    if (line.trim() !== "" && indent < stepIndent) {
      stepEnd = i;
      break;
    }
  }
  const stepRegion = ciLines.slice(stepStart, stepEnd).join("\n");
  for (const secret of SECRETS.concat(["SUPABASE_ACCESS_TOKEN"])) {
    if (stepRegion.includes("secrets." + secret)) {
      problems.push(
        `${E2E_SMOKE_JOB_FILE}: the e2e smoke step references ${secret} - the smoke must stay hermetic ` +
          "(a secrets-gated smoke silently SKIPS on fork PRs and CI loses the e2e signal). The live " +
          "Supabase checks belong in the reusable supabase-rls.yml workflow.",
      );
    }
  }

  // 3. The smoke tool must pin file storage itself: the run may never depend
  //    on ambient Supabase configuration for which storage mode boots.
  for (const marker of E2E_SMOKE_HERMETICITY_MARKERS) {
    if (!smokeTool.includes(marker)) {
      problems.push(
        `${E2E_SMOKE_TOOL}: no longer pins ${marker} - without it the smoke API boots in whatever storage mode the ` +
          "ambient environment selects, so CI could green against a different system than the one the walk verifies. " +
          "Restore the explicit file-mode pin (throwaway data dir) or redesign the smoke's storage contract deliberately.",
      );
    }
  }

  return problems;
}

/** Read the real workflow files from the repository and return any problems. */
export function checkSupabaseRlsWorkflowFiles(projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")) {
  const reusable = readFileSync(path.join(projectRoot, REUSABLE_WORKFLOW), "utf8");
  const callers = CALLER_WORKFLOWS.map((file) => ({
    file,
    text: readFileSync(path.join(projectRoot, file), "utf8"),
    // The nightly is the scheduled caller: it must demand its secrets.
    scheduled: file.includes("nightly"),
  }));
  const ciYml = callers.find((caller) => caller.file === E2E_SMOKE_JOB_FILE)?.text ?? "";
  const smokeTool = readFileSync(path.join(projectRoot, E2E_SMOKE_TOOL), "utf8");
  return [
    ...collectSupabaseRlsWorkflowProblems({ reusable, callers }),
    ...collectE2eSmokeHermeticityProblems({ ciYml, smokeTool }),
  ];
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const problems = checkSupabaseRlsWorkflowFiles();
  if (problems.length > 0) {
    console.error("[supabase-rls-workflow] Check failed:");
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error(
      "\nThis is the dry-run self-check of the Supabase live-gate CI wiring. Fix the workflow files above - the",
      "reusable gates (RLS sentinel + migration parity) depend on this wiring to run in full mode.",
    );
    process.exit(1);
  }
  console.log(
    `[supabase-rls-workflow] OK - ${REUSABLE_WORKFLOW} wires every secret into both jobs, both callers (ci.yml, nightly) pass them via \`secrets: inherit\`, the nightly demands them via require_secrets, and the e2e smoke stays hermetic.`,
  );
}
