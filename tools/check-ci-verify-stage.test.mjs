import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { expandVerifyChain } from "./verify-chain.mjs";
import { jobRegion } from "./check-init-order-wiring.mjs";
import {
  CI_VERIFY_JOB,
  GUARD_SCRIPT,
  collectCiVerifyStageProblems,
  commandsForStage,
  conditionSchedulesJob,
  jobIfCondition,
  matrixStages,
} from "./check-ci-verify-stage.mjs";

/**
 * The wrong wirings this guard exists for, without a checkout or a build: each
 * case is two strings — the scripts map and a workflow — and the sentence the
 * person who dropped the job would read.
 */
const SCRIPTS = {
  "verify:data": "node tools/data-revision-status.mjs",
  "verify:contract": "npm run check:init-order-wiring",
  "verify:visual": "npm run check:dead-css",
  "verify:fast": "npm run typecheck && npm run lint && npm run test",
};

/** A Verify job shaped like the one CI runs: a stage matrix and one run step. */
const WORKFLOW = [
  "on:",
  "  pull_request:",
  "jobs:",
  "  lint:",
  "    runs-on: ubuntu-latest",
  "    steps:",
  "      - name: Run ESLint",
  "        run: npm run lint",
  "  verify:",
  "    name: Verify (${{ matrix.stage }})",
  "    strategy:",
  "      fail-fast: false",
  "      matrix:",
  "        stage: [data, contract, visual]",
  "    steps:",
  "      - name: Build",
  "        run: npm run build",
  "      - name: Run verify stage",
  "        run: npm run verify:${{ matrix.stage }}",
  "  audit:",
  "    runs-on: ubuntu-latest",
  "    steps:",
  "      - name: Audit",
  "        run: npm run check:dependency-audit",
].join("\n");

/** The workflow with a job's whole region cut out, the way a person deletes it. */
const withoutJob = (ci, jobName) => {
  const lines = ci.split("\n");
  const start = lines.findIndex((line) => line === `  ${jobName}:`);
  const end = lines.findIndex((line, index) => index > start && /^ {2}[A-Za-z0-9_-]+:\s*$/.test(line));
  return [...lines.slice(0, start), ...lines.slice(end < 0 ? lines.length : end)].join("\n");
};

const problemsFor = (overrides = {}) =>
  collectCiVerifyStageProblems({
    scripts: overrides.scripts ?? SCRIPTS,
    ci: overrides.ci ?? WORKFLOW,
  });

describe("CI Verify stage wiring", () => {
  it("passes the wiring this repo's shape describes", () => {
    expect(problemsFor()).toEqual([]);
  });

  it("fails when the Verify job is gone, naming the guards it takes with it", () => {
    const problems = problemsFor({ ci: withoutJob(WORKFLOW, CI_VERIFY_JOB) });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(`has no \`${CI_VERIFY_JOB}:\` job`);
    expect(problems[0]).toContain("verify:contract");
    expect(problems[0]).toContain("stop being asked");
  });

  it("fails when the matrix still has a stage list but one stage is dropped", () => {
    const ci = WORKFLOW.replace("stage: [data, contract, visual]", "stage: [data, visual]");
    const problems = problemsFor({ ci });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("no longer includes `contract`");
    expect(problems[0]).toContain("`verify:contract` is not run in CI");
  });

  it("fails for every matrix stage the job's steps do not run", () => {
    const ci = WORKFLOW.replace("run: npm run verify:${{ matrix.stage }}", "run: npm run verify:contract");
    const problems = problemsFor({ ci });
    expect(problems).toHaveLength(2);
    expect(problems.join("\n")).toContain("lists `data` in its matrix but no step runs `verify:data`");
    expect(problems.join("\n")).toContain("lists `visual` in its matrix but no step runs `verify:visual`");
  });

  it("fails when the matrix names a stage package.json does not have", () => {
    const ci = WORKFLOW.replace("stage: [data, contract, visual]", "stage: [data, contract, visual, security]");
    const problems = problemsFor({ ci });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("package.json has no `verify:security` script");
  });

  it("reads a block-sequence matrix, so a reformatted list is not an unwiring", () => {
    const ci = WORKFLOW.replace(
      "        stage: [data, contract, visual]",
      ["        stage:", "          - data", "          - contract", "          - visual"].join("\n"),
    );
    expect(problemsFor({ ci })).toEqual([]);
  });

  it("fails when the stage matrix is gone entirely", () => {
    const ci = WORKFLOW.replace("        stage: [data, contract, visual]\n", "");
    const problems = problemsFor({ ci });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("has no stage matrix this guard can read");
  });

  it("reads a stage the job runs through another script", () => {
    const scripts = {
      ...SCRIPTS,
      "ci:stages": "npm run verify:data && npm run verify:contract && npm run verify:visual",
    };
    const ci = WORKFLOW.replace("run: npm run verify:${{ matrix.stage }}", "run: npm run ci:stages");
    expect(problemsFor({ ci, scripts })).toEqual([]);
  });

  it("substitutes the placeholder by the name the matrix gave it", () => {
    const ci = WORKFLOW.replace("stage: [data, contract, visual]", "verifyStage: [data, contract, visual]")
      .replaceAll("matrix.stage", "matrix.verifyStage");
    expect(problemsFor({ ci })).toEqual([]);
    expect(commandsForStage(["npm run verify:${{ matrix.verifyStage }}"], "verifyStage", "data")).toEqual([
      "npm run verify:data",
    ]);
    expect(matrixStages(jobRegion(ci, CI_VERIFY_JOB))).toEqual({
      slot: "verifyStage",
      stages: ["data", "contract", "visual"],
    });
  });

  it("skips an include block, which lists matrix rows rather than stages", () => {
    const ci = WORKFLOW.replace(
      "        stage: [data, contract, visual]",
      ["        include:", "          - stage: contract", "            node: 22"].join("\n"),
    );
    const problems = problemsFor({ ci });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("has no stage matrix this guard can read");
  });

  it("fails when the job is gated off with a condition that is never true", () => {
    // The file still reads as though the stage runs: same job, same matrix, same
    // steps. Only GitHub has stopped scheduling it.
    const ci = WORKFLOW.replace("    name: Verify (${{ matrix.stage }})", "    if: false\n    name: Verify (${{ matrix.stage }})");
    const problems = problemsFor({ ci });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("`if: false`, which is never true");
    expect(problems[0]).toContain("never schedules it");
    expect(problems[0]).toContain("still looks wired");
  });

  it("reads a false condition written in a template wrapper", () => {
    const ci = WORKFLOW.replace("    name: Verify (${{ matrix.stage }})", "    if: ${{ false }}\n    name: Verify (${{ matrix.stage }})");
    const problems = problemsFor({ ci });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("which is never true");
    expect(conditionSchedulesJob("${{ false }}")).toBe(false);
    expect(conditionSchedulesJob("")).toBe(true);
    // A quoted empty string is an expression, not the absence of one.
    expect(conditionSchedulesJob('""')).toBe(false);
  });

  it("fails on any condition the guard cannot prove true", () => {
    // A variable nobody sets skips the whole gating stage without a single red
    // job, which is the same silence as deleting it.
    const ci = WORKFLOW.replace(
      "    name: Verify (${{ matrix.stage }})",
      "    if: vars.WINGMAN_ENABLE_VERIFY_GATES == 'true'\n    name: Verify (${{ matrix.stage }})",
    );
    const problems = problemsFor({ ci });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("vars.WINGMAN_ENABLE_VERIFY_GATES == 'true'");
    expect(problems[0]).toContain("cannot prove that condition true");
    // What it may claim is that the job can be skipped, not that it never runs:
    // the guard reads the workflow text, and the condition is decided by the
    // repository the text is about — a variable that is set today makes this job
    // run today, so "never runs" would be a claim the guard cannot support.
    expect(problems[0]).toContain("the job may be skipped");
    expect(problems[0]).not.toContain("never runs");
    expect(problems[0]).not.toContain("never schedules");
  });

  it("accepts a condition that restates the default the job already has", () => {
    for (const condition of ["true", "${{ true }}", "always()", "${{ always() }}"]) {
      const ci = WORKFLOW.replace(
        "    name: Verify (${{ matrix.stage }})",
        "    if: " + condition + "\n    name: Verify (${{ matrix.stage }})",
      );
      expect(problemsFor({ ci }), condition).toEqual([]);
    }
  });

  it("reads a condition wrapped over several lines", () => {
    const ci = WORKFLOW.replace(
      "    name: Verify (${{ matrix.stage }})",
      ["    if: |", "      true"].join("\n") + "\n    name: Verify (${{ matrix.stage }})",
    );
    expect(problemsFor({ ci })).toEqual([]);
    const gated = WORKFLOW.replace(
      "    name: Verify (${{ matrix.stage }})",
      ["    if: >", "      github.event_name == 'push'"].join("\n") + "\n    name: Verify (${{ matrix.stage }})",
    );
    expect(problemsFor({ ci: gated })[0]).toContain("github.event_name == 'push'");
  });

  it("does not read a step's own condition, which decides one step rather than the job", () => {
    const ci = WORKFLOW.replace(
      "      - name: Build\n        run: npm run build",
      "      - name: Build\n        if: matrix.stage == 'visual'\n        run: npm run build",
    );
    expect(problemsFor({ ci })).toEqual([]);
    expect(jobIfCondition(jobRegion(ci, CI_VERIFY_JOB))).toBeNull();
  });

  it("reads the job's condition by the job's own indent", () => {
    const job = jobRegion(
      ["  verify:", "    if: github.ref == 'refs/heads/main'", "    steps:", "      - run: npm run verify:contract"].join("\n"),
      "verify",
    );
    expect(jobIfCondition(job)).toBe("github.ref == 'refs/heads/main'");
    expect(jobIfCondition(["  verify:", "    runs-on: ubuntu-latest"])).toBeNull();
  });
});

describe("the guard's own wiring", () => {
  it("runs in the fast lane, which the pre-commit hook and CI's pre-commit job both run", () => {
    const scripts = JSON.parse(readFileSync(path.resolve(process.cwd(), "package.json"), "utf8")).scripts ?? {};
    expect(expandVerifyChain(scripts, "verify:fast").has(GUARD_SCRIPT)).toBe(true);
  });
});
