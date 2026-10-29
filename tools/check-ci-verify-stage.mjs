#!/usr/bin/env node
/**
 * Guards the CI Verify stage's own wiring.
 *
 * `.github/workflows/ci.yml` runs the verify pipeline as one job with a
 * `data | contract | visual` matrix, and most of this repo's wiring guards live
 * inside it: `check:init-order-wiring`, `check:export-validation-domains`,
 * `check:stored-records`, `check:audit-scopes`, `check:short-workflow-pages` and
 * the visual and data gates. Each of them answered, on the commit that added it,
 * the question "is this gate still wired?" — and every one of those answers is a
 * line in the job that this guard is about.
 *
 * So the job going away is not one failure among many: it is the failure that
 * makes every other wiring check silent at once, and the pipeline stays green
 * while the whole stage's questions stop being asked. Nothing inside the stage
 * can report that, because deleting the job deletes its runners too.
 *
 * That is why the guard is wired into `verify:fast` rather than into the stage
 * it inspects — the fast lane is what the pre-commit hook runs, and the same lane
 * runs twice in CI's `Pre-commit lane ×2` job, which is not the Verify job and
 * does not disappear with it.
 *
 * Four wirings are pinned, all read from `package.json` and the workflow text:
 *
 *   - the workflow still has a `verify:` job, and it is not gated off: a
 *     job-level `if:` keeps the job in the file and decides, outside this guard,
 *     whether GitHub schedules it. `if: true` and `if: always()` restate the
 *     default and are accepted; a condition that is false whatever the event is
 *     (`if: false` and its ilk) is reported as never true. Everything else is a
 *     condition this guard cannot evaluate, and it is reported as that — the job
 *     may be skipped — rather than as a job that never runs, because the guard
 *     reads the workflow text and not the repository the condition is about;
 *   - that job's matrix still names every stage this pipeline is split into
 *     (`data`, `contract`, `visual`), each of which has a `verify:<stage>`
 *     script in `package.json`;
 *   - a step in that job actually runs each stage — either by naming
 *     `verify:<stage>`, or by reaching it through a script whose chain includes
 *     it. A matrix entry is read for each stage it lists, so the job's
 *     `npm run verify:${{ matrix.stage }}` step is what satisfies the third
 *     check, and a matrix with three entries and one run step fails for the two
 *     stages that never run.
 *
 * Usage: node tools/check-ci-verify-stage.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { jobRegion, jobRunCommands, scriptsReached } from "./check-init-order-wiring.mjs";

export const CI_WORKFLOW = ".github/workflows/ci.yml";
export const CI_VERIFY_JOB = "verify";
export const CI_VERIFY_STAGES = ["data", "contract", "visual"];
export const GUARD_SCRIPT = "check:ci-verify-stage";

/** The YAML keys a stage list is never read from, because they are not one. */
const MATRIX_ITEM_KEYS = new Set(["include", "exclude"]);

const KEY_LINE = /^\s+([A-Za-z0-9_-]+):\s*(.*)$/;

/**
 * The job's stage matrix, as `{ slot, stages }`, or null when it has none.
 *
 * The slot matters rather than the values alone: a job that lists its stages
 * under `stage:` substitutes them as `${{ matrix.stage }}`, so the placeholder
 * in a `run:` line has to be resolved by the same name the matrix used. Both
 * YAML shapes are read — the flow sequence the job uses today
 * (`stage: [data, contract, visual]`) and a block sequence — because moving a
 * one-line list into the other shape is a formatting change, not an unwiring,
 * and should not read as a job that runs nothing.
 */
export function matrixStages(jobLines) {
  for (let index = 0; index < jobLines.length; index += 1) {
    const match = jobLines[index].match(KEY_LINE);
    if (!match) continue;
    const [, slot, rest] = match;
    if (MATRIX_ITEM_KEYS.has(slot)) continue;
    const value = rest.trim();

    if (value.startsWith("[")) {
      const stages = value
        .replace(/^\[/, "")
        .replace(/\]\s*(#.*)?$/, "")
        .split(",")
        .map((entry) => entry.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
      if (stages.length) return { slot, stages };
      continue;
    }
    if (value !== "" && !value.startsWith("#")) continue;

    const indent = jobLines[index].match(/^\s*/)[0].length;
    const stages = [];
    for (let next = index + 1; next < jobLines.length; next += 1) {
      const line = jobLines[next];
      if (line.trim() === "") continue;
      if (line.match(/^\s*/)[0].length <= indent) break;
      const item = line.match(/^\s*-\s*(.+?)\s*$/);
      // `- key: value` is an `include:`/`exclude:` row, not a stage list.
      if (!item || item[1].includes(":")) break;
      stages.push(item[1].replace(/^["']|["']$/g, ""));
    }
    if (stages.length) return { slot, stages };
  }
  return null;
}

/** The job's commands with one matrix stage substituted for its placeholder. */
export function commandsForStage(commands, slot, stage) {
  const placeholder = new RegExp(`\\$\\{\\{\\s*matrix\\.${slot}\\s*\\}\\}`, "g");
  return commands.map((command) => command.replace(placeholder, stage));
}

/** A condition with the template wrapper and the whitespace taken off. */
const normalizedCondition = (condition) =>
  String(condition ?? "")
    .replace(/^\$\{\{|\}\}$/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();

/**
 * The job's own `if:`, as the workflow wrote it, or null when it has none.
 *
 * Only a key at the job's own indent is read: a step's `if:` sits deeper and
 * decides one step, while this one decides whether GitHub schedules the job at
 * all — and that is the reading this guard exists for, because the job keeps its
 * matrix, its steps and its place in the file either way. Both YAML shapes are
 * read, the inline expression and the `|`/`>` block a long one is often wrapped
 * in, for the same reason the stage list reads both.
 */
export function jobIfCondition(jobLines) {
  for (let index = 0; index < jobLines.length; index += 1) {
    const match = jobLines[index].match(/^ {4}if:\s*(.*)$/);
    if (!match) continue;
    const inline = match[1].replace(/\s+#.*$/, "").trim();
    if (inline && !/^[|>][+-]?$/.test(inline)) return inline;
    const body = [];
    for (let next = index + 1; next < jobLines.length; next += 1) {
      const line = jobLines[next];
      if (line.trim() === "") continue;
      if (line.match(/^\s*/)[0].length <= 4) break;
      body.push(line.trim());
    }
    return body.join(" ").trim() || null;
  }
  return null;
}

/**
 * Whether a condition leaves the job scheduled whatever the event is.
 *
 * A job runs when its `if:` is true, and its `if:` defaults to `success()`, so the
 * expressions that ask for nothing are the ones restating that default: an empty
 * value, `true`, `always()`, in or out of `${{ }}`. Everything else depends on an
 * event, a repository variable, a secret or a `needs` result, which this guard
 * cannot evaluate — so the job is treated as possibly skipped rather than assumed
 * to run, the same fail-closed rule the rest of the guards follow.
 */
export function conditionSchedulesJob(condition) {
  const expression = normalizedCondition(condition);
  // No condition at all is the job's default, which is what leaves it scheduled.
  // A quoted empty string is not that: it is an expression GitHub reads as false.
  if (expression === "") return true;
  const unwrapped = expression.replace(/^["']|["']$/g, "");
  return unwrapped === "true" || unwrapped === "always()";
}

/** Conditions that are false whatever the event is, so the job can never run. */
const NEVER_TRUE = new Set(["false", "0", "null", "''", '""', "!true"]);

const neverTrue = (condition) => NEVER_TRUE.has(normalizedCondition(condition));

/**
 * What is wrong with the Verify stage's wiring, as sentences a person can act on.
 *
 * `scripts` is `package.json`'s `scripts` map and `ci` the workflow text, so the
 * judgement is made from two strings and a test needs neither a checkout nor a
 * build.
 */
export function collectCiVerifyStageProblems({ scripts, ci }) {
  const problems = [];
  const job = jobRegion(ci, CI_VERIFY_JOB);
  if (!job) {
    problems.push(
      `${CI_WORKFLOW} has no \`${CI_VERIFY_JOB}:\` job. The verify stages (` +
        `${CI_VERIFY_STAGES.map((stage) => `verify:${stage}`).join(", ")}) are run there and nowhere else in CI, ` +
        "so the wiring guards that live in those stages — init-order, export domains, stored records, audit scopes " +
        "and the rest — stop being asked while every remaining job stays green. Restore the job (and its matrix), " +
        "or move those stages to a job this workflow still runs.",
    );
    return problems;
  }

  // The job is there but may still never be scheduled, and a stage correctly
  // listed in a job GitHub skips measures nothing, so the condition is read
  // before the matrix that decided it was wired.
  const condition = jobIfCondition(job);
  if (condition !== null && !conditionSchedulesJob(condition)) {
    problems.push(
      neverTrue(condition)
        ? `${CI_WORKFLOW}: the \`${CI_VERIFY_JOB}\` job carries \`if: ${condition}\`, which is never true, so CI never schedules it. The ` +
            "job is still written and still looks wired, while every guard in the verify stages stops being asked and the rest of the " +
            "pipeline stays green."
        : `${CI_WORKFLOW}: the \`${CI_VERIFY_JOB}\` job carries a job-level \`if: ${condition}\`. This guard cannot prove that condition ` +
            "true, so the job may be skipped: the stage keeps its job, its matrix and its steps, and reads as wired whether or not the " +
            "condition holds — while every guard in those stages goes unasked whenever it does not, with nothing red to say so. " +
            "Drop the condition, or gate the individual steps that need it.",
    );
  }

  const matrix = matrixStages(job);
  if (!matrix) {
    problems.push(
      `${CI_WORKFLOW}: the \`${CI_VERIFY_JOB}\` job has no stage matrix this guard can read, so it cannot tell which ` +
        `verify stages CI runs. Expected a \`stage:\` list holding ${CI_VERIFY_STAGES.join(", ")}.`,
    );
    return problems;
  }

  for (const stage of CI_VERIFY_STAGES) {
    if (!matrix.stages.includes(stage)) {
      problems.push(
        `${CI_WORKFLOW}: the \`${CI_VERIFY_JOB}\` job's \`${matrix.slot}\` matrix no longer includes \`${stage}\`, ` +
          `so \`verify:${stage}\` is not run in CI. The guards in that stage go quiet with it.`,
      );
    }
  }

  const commands = jobRunCommands(job);
  for (const stage of matrix.stages) {
    const script = `verify:${stage}`;
    if (!scripts?.[script]) {
      problems.push(
        `${CI_WORKFLOW}: the \`${CI_VERIFY_JOB}\` job's matrix runs \`${script}\`, but package.json has no \`${script}\` ` +
          "script — the step would fail on an unknown script before any check ran.",
      );
      continue;
    }
    const runs = commandsForStage(commands, matrix.slot, stage).some((command) =>
      scriptsReached(command, scripts).has(script),
    );
    if (!runs) {
      problems.push(
        `${CI_WORKFLOW}: the \`${CI_VERIFY_JOB}\` job lists \`${stage}\` in its matrix but no step runs \`${script}\` — ` +
          `neither by name nor through a script whose chain reaches it. A matrix entry with no step measures nothing.`,
      );
    }
  }

  return problems;
}

/** Read the tree's own wiring and return the problems, if any. */
export function checkCiVerifyStage(projectRoot) {
  const scripts = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8")).scripts ?? {};
  const ci = fs.readFileSync(path.join(projectRoot, CI_WORKFLOW), "utf8");
  return collectCiVerifyStageProblems({ scripts, ci });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  let problems;
  try {
    problems = checkCiVerifyStage(root);
  } catch (caught) {
    console.error(`[ci-verify-stage] ${caught instanceof Error ? caught.message : String(caught)}`);
    process.exit(1);
  }
  if (problems.length) {
    console.error("[ci-verify-stage] Check failed:");
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error("\nThe Verify stage exists to be run; unwired, every guard inside it answers nothing.");
    process.exit(1);
  }
  const stages = CI_VERIFY_STAGES.map((stage) => `verify:${stage}`).join(", ");
  console.log(
    `[ci-verify-stage] OK — the CI \`${CI_VERIFY_JOB}\` job is unconditional and runs ${stages}, one step per matrix stage.`,
  );
}
