#!/usr/bin/env node
// Guards the Supabase RLS workflow wiring (the meta-check the CI dry-run job
// runs BEFORE anything touches the live database).
//
// The reusable workflow .github/workflows/supabase-rls.yml is the live gate:
// it runs tools/verify-supabase-rls.mjs in SENTINEL mode (seed one marker row
// per table through the service role, prove the public anon key cannot read
// it). That gate can SILENTLY weaken without the live check noticing:
//
//   - drop SUPABASE_SECRET_KEY from the env mapping of the live step and the
//     tool falls back to read-only mode, which cannot prove protection on
//     empty tables - the job still reports green when tables hold rows;
//   - drop `secrets: inherit` from a caller and the reusable job skips with a
//     "not configured" message even though the repository HAS the secrets;
//   - remove the `exit 1` branch of the secrets gate and a partial secret
//     setup (URL + anon key present, secret key missing) silently runs the
//     weaker read-only mode instead of failing.
//
// None of these regressions is visible to the live RLS check itself, so this
// static check pins the wiring instead: every secret the sentinel mode needs
// must be referenced in the secrets gate AND mapped into the env of the live
// step, and every caller (ci.yml push/PR, the nightly schedule) must pass
// `secrets: inherit`.
//
// This tool makes no network calls and never runs the RLS probe. The secret
// PRESENCE dry run (fail when SUPABASE_SECRET_KEY is absent from the
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

/** Collect wiring problems from the reusable workflow + caller texts. */
export function collectSupabaseRlsWorkflowProblems({ reusable, callers = [] }) {
  const problems = [];
  const lines = linesOf(reusable);

  // 1. The live step still runs the tool.
  if (!reusable.includes("tools/verify-supabase-rls.mjs")) {
    problems.push(
      `${REUSABLE_WORKFLOW}: the live step no longer runs tools/verify-supabase-rls.mjs - ` +
        "without the tool invocation there is no RLS verification to wire secrets for.",
    );
  }

  // 2. The secrets gate references every secret (so a missing secret can be
  //    detected and reported instead of silently changing the tool's mode).
  for (const secret of SECRETS) {
    if (!reusable.includes("secrets." + secret)) {
      problems.push(
        REUSABLE_WORKFLOW +
          ": the secrets gate no longer references " +
          secret +
          ". Restore the `[ -z \"${{ secrets." +
          secret +
          " }}\" ]` branch so an absent " +
          secret +
          " fails loudly instead of silently weakening the sentinel mode.",
      );
    }
  }

  // 3. The live step maps every secret into the tool's environment. Losing any
  //    one of these makes the tool run in a weaker mode while the job stays
  //    green - the exact silent regression this check exists to catch.
  const toolLine = findLine(lines, (line) => line.includes("tools/verify-supabase-rls.mjs"));
  const envStart = toolLine >= 0 ? findLine(lines, (line) => /^\s*env:\s*$/.test(line), toolLine) : -1;
  if (envStart < 0) {
    problems.push(
      `${REUSABLE_WORKFLOW}: the live step has no env block mapping secrets into the tool - ` +
        "the RLS probe would run without credentials.",
    );
  } else {
    const envLines = lines.slice(envStart + 1, envStart + 8);
    for (const secret of SECRETS) {
      const marker = secret + ": ${{ secrets." + secret + " }}";
      if (!envLines.some((line) => line.includes(marker))) {
        problems.push(
          REUSABLE_WORKFLOW + ": the live step env no longer maps " + marker + ". " +
            "Without SUPABASE_SECRET_KEY the tool falls back to read-only mode, which cannot prove " +
            "protection on empty tables; restore the env line so sentinel mode keeps running.",
        );
      }
    }
  }

  // 4. The partial-setup branch still fails instead of skipping: URL + anon
  //    key present but the secret key missing must exit non-zero.
  if (toolLine >= 0) {
    const gateRegion = lines.slice(0, toolLine).join("\n");
    if (!/\bexit 1\b/.test(gateRegion)) {
      problems.push(
        `${REUSABLE_WORKFLOW}: the secrets gate has no failing branch (no \`exit 1\` before the live step). ` +
          "A partial secret setup (SUPABASE_URL + SUPABASE_ANON_KEY present, SUPABASE_SECRET_KEY missing) " +
          "must fail the job, not silently run the weaker read-only mode.",
      );
    }
  }

  // 5. The live step is gated on the secrets check, so the skip path cannot
  //    accidentally run the probe without sentinel credentials.
  if (!reusable.includes("steps.secrets.outputs.skipped")) {
    problems.push(
      `${REUSABLE_WORKFLOW}: the live step is no longer gated on the secrets check ` +
        "(`if: steps.secrets.outputs.skipped == 'false'`). Restore the gate so a skipped or failed " +
        "secrets check never runs the probe half-configured.",
    );
  }

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
      "\nThis is the dry-run self-check of the RLS CI wiring. Fix the workflow files above - the live",
      "Supabase RLS gate depends on this wiring to run in sentinel mode.",
    );
    process.exit(1);
  }
  console.log(
    `[supabase-rls-workflow] OK - ${REUSABLE_WORKFLOW} wires all three secrets and both callers (ci.yml, nightly) pass them via \`secrets: inherit\`.`,
  );
}
