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
  }

  return problems;
}

/** Read the real workflow files from the repository and return any problems. */
export function checkSupabaseRlsWorkflowFiles(projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")) {
  const reusable = readFileSync(path.join(projectRoot, REUSABLE_WORKFLOW), "utf8");
  const callers = CALLER_WORKFLOWS.map((file) => ({
    file,
    text: readFileSync(path.join(projectRoot, file), "utf8"),
  }));
  return collectSupabaseRlsWorkflowProblems({ reusable, callers });
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
    `[supabase-rls-workflow] OK - ${REUSABLE_WORKFLOW} wires every secret into both jobs and both callers (ci.yml, nightly) pass them via \`secrets: inherit\`.`,
  );
}
