import { describe, expect, it } from "vitest";
import {
  BUILD_GATES,
  collectBuildStageWiringProblems,
  jobRegion,
  jobRunCommands,
} from "./check-init-order-wiring.mjs";

/**
 * The wrong wirings this guard exists for, without a checkout or a build: each
 * case is two strings — the scripts map and a workflow — and the sentence the
 * person who dropped the line would read.
 *
 * Both gates the list holds are in the fixture, because the guard reads the
 * whole list: a fixture that wired one gate would report the other as missing and
 * every case here would be about that instead of the wiring it names.
 */
const GATE_SCRIPTS = Object.fromEntries(
  BUILD_GATES.map((gate) => [gate.script, `node tools/${gate.script.replace("check:", "check-")}.mjs`]),
);
const SCRIPTS = {
  ...GATE_SCRIPTS,
  build: "vite build",
  "verify:build": `npm run build && ${BUILD_GATES.map((gate) => `npm run ${gate.script}`).join(" && ")} && npm run check:size-budgets`,
  "verify:contract": "npm run check:routes",
  verify: "npm run verify:build && npm run verify:contract",
};

/** A Build job shaped like the one CI runs: build, both gates, budgets. */
const BUILD_STEPS = BUILD_GATES
  .map((gate) => [
    `      - name: Check ${gate.script}`,
    `        run: npm run ${gate.script}`,
  ].join("\n"))
  .join("\n");

const WORKFLOW = [
  "on:",
  "  push:",
  "jobs:",
  "  lint:",
  "    runs-on: ubuntu-latest",
  "    steps:",
  "      - name: Run lint",
  "        run: npm run lint",
  "  build:",
  "    name: Build",
  "    needs: [lint]",
  "    steps:",
  "      - name: Build application",
  "        run: npm run build",
  BUILD_STEPS,
  "  smoke:",
  "    runs-on: ubuntu-latest",
  "    steps:",
  "      - name: Run browser smoke check",
  "        run: npm run check:browser",
].join("\n");

const problemsFor = (overrides = {}) =>
  collectBuildStageWiringProblems({
    scripts: overrides.scripts ?? SCRIPTS,
    ci: overrides.ci ?? WORKFLOW,
  });

/** The findings that are about one gate: the guard reports the others too. */
const forGate = (problems, script) => problems.filter((problem) => problem.includes(script));

const dropStep = (ci, script) => ci.replace(`      - name: Check ${script}\n        run: npm run ${script}\n`, "");

describe("build-stage wiring", () => {
  it("passes the wiring this repo ships", () => {
    expect(problemsFor()).toEqual([]);
  });

  it("pins a list, so a third build-stage gate is one entry", () => {
    expect(BUILD_GATES.map((gate) => gate.script)).toEqual(["check:init-order", "check:published-surface"]);
    // Each entry has to carry its own reason, or a failure names only a line.
    for (const gate of BUILD_GATES) {
      expect(gate.question).toMatch(/\?$/);
      expect(gate.stage.length).toBeGreaterThan(20);
      expect(gate.afterBuild.length).toBeGreaterThan(10);
    }
  });

  for (const gate of BUILD_GATES) {
    it(`fails when \`${gate.script}\` is dropped from the build stage`, () => {
      const scripts = {
        ...SCRIPTS,
        "verify:build": `npm run build && ${BUILD_GATES.filter((other) => other !== gate)
          .map((other) => `npm run ${other.script}`).join(" && ")}`,
      };
      const problems = problemsFor({ scripts });
      const about = forGate(problems, gate.script);
      expect(about).toHaveLength(1);
      expect(about[0]).toContain("verify:build");
      // The gate's own sentence, not a generic one: it says what went unasked.
      expect(about[0]).toContain(gate.stage);
    });

    it(`fails when the CI Build job stops running \`${gate.script}\``, () => {
      const problems = problemsFor({ ci: dropStep(WORKFLOW, gate.script) });
      expect(problems).toHaveLength(1);
      expect(problems[0]).toMatch(/ci\.yml/);
      expect(problems[0]).toMatch(/`build` job/);
      expect(problems[0]).toContain(gate.script);
    });

    it(`fails when \`${gate.script}\` has no script at all`, () => {
      // The stage keeps the other gates, so the only thing missing is the script:
      // dropping them all would report their own removals beside this one.
      const scripts = {
        ...SCRIPTS,
        "verify:build": `npm run build && ${BUILD_GATES.filter((other) => other !== gate)
          .map((other) => `npm run ${other.script}`).join(" && ")}`,
      };
      delete scripts[gate.script];
      const problems = problemsFor({ scripts });
      // One finding for the deletion: the stage and job readings would restate it.
      expect(problems).toHaveLength(1);
      expect(problems[0]).toContain(`no \`${gate.script}\` script`);
      expect(problems[0]).toContain(gate.question);
    });
  }

  it("reports one gate without disturbing the other", () => {
    const [first, second] = BUILD_GATES;
    const problems = problemsFor({ ci: dropStep(WORKFLOW, first.script) });
    expect(forGate(problems, first.script)).toHaveLength(1);
    expect(forGate(problems, second.script)).toEqual([]);
  });

  it("accepts a Build job that reaches each gate through the stage it guards", () => {
    const ci = WORKFLOW.replace(BUILD_STEPS, "      - name: Build checks\n        run: npm run verify:build");
    expect(problemsFor({ ci })).toEqual([]);
  });

  it("does not accept the stage name alone when the stage no longer holds a gate", () => {
    // Both halves have to be true, or a job running a stage that dropped the
    // gates would read as covered.
    const scripts = { ...SCRIPTS, "verify:build": "npm run build" };
    const ci = WORKFLOW.replace(BUILD_STEPS, "      - name: Build checks\n        run: npm run verify:build");
    const problems = problemsFor({ scripts, ci });
    expect(problems).toHaveLength(BUILD_GATES.length * 2);
    for (const gate of BUILD_GATES) {
      expect(problems.join("\n")).toContain(`\`verify:build\` does not include \`${gate.script}\``);
      expect(forGate(problems, gate.script).some((problem) => problem.includes("`build` job"))).toBe(true);
    }
  });

  it("accepts the gates inside a multi-line run block", () => {
    const ci = WORKFLOW.replace(
      BUILD_STEPS,
      [
        "      - name: Build checks",
        "        run: |",
        "          npm run build",
        ...BUILD_GATES.map((gate) => `          npm run ${gate.script}`),
      ].join("\n"),
    );
    expect(problemsFor({ ci })).toEqual([]);
  });

  it("fails once, and says so, when there is no Build job to run them", () => {
    const ci = WORKFLOW.replace(/^ {2}build:$[\s\S]*?(?=^ {2}smoke:)/m, "");
    const problems = problemsFor({ ci });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/no `build:` job/);
  });

  it("fails when there is no build stage to hold them", () => {
    const scripts = { ...SCRIPTS };
    delete scripts["verify:build"];
    const problems = problemsFor({ scripts });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("no `verify:build` script");
  });

  it("reads only the job it was asked about", () => {
    const region = jobRegion(WORKFLOW, "build").join("\n");
    for (const gate of BUILD_GATES) expect(region).toContain(gate.script);
    expect(region).not.toContain("check:browser");
    expect(jobRegion(WORKFLOW, "absent")).toBeNull();
  });

  it("reads a run command in both YAML shapes", () => {
    const commands = jobRunCommands([
      "    steps:",
      "      - run: npm run build",
      "      - run: |",
      "          npm run build:prepare-data",
      "          npm run check:init-order",
      "  next:",
    ]);
    expect(commands).toEqual(["npm run build", "npm run build:prepare-data\nnpm run check:init-order"]);
  });
});
