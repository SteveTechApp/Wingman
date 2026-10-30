import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { expandVerifyChain } from "./verify-chain.mjs";
import {
  GUARD_SCRIPT,
  STRICT_LANE,
  collectDirectNodeTools,
  collectStrictChainProblems,
} from "./check-strict-verify-chains.mjs";

/**
 * The wrong chains this guard exists for, without a checkout: the scripts map is
 * the whole input, and each case names the sentence the person who dropped the
 * line would read.
 */
const SCRIPTS = {
  "verify:build": "npm run build && npm run check:init-order",
  "verify:build:strict": "npm run build && npm run check:init-order && npm run check:size-budgets",
  "verify:data": "npm run check:data-sources",
  "verify:data:strict": "npm run check:data-sources && npm run check:governance-data",
  "verify:contract": "npm run check:routes && npm run check:stored-records",
  "verify:contract:strict": "npm run check:routes && npm run check:stored-records",
  "verify:visual": "npm run check:dead-css",
  [STRICT_LANE]:
    "npm run verify:build:strict && npm run verify:data:strict && npm run verify:contract:strict && npm run verify:visual",
};

const problemsFor = (scripts = SCRIPTS) => collectStrictChainProblems({ scripts });

describe("strict verify chains", () => {
  it("passes chains shaped like this repo's", () => {
    expect(problemsFor()).toEqual([]);
  });

  it("fails when a gate is dropped from the strict build chain", () => {
    const scripts = {
      ...SCRIPTS,
      "verify:build:strict": "npm run build && npm run check:size-budgets",
    };
    const problems = problemsFor(scripts);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("`verify:build:strict` does not run 1 gate that `verify:build` runs: check:init-order");
    expect(problems[0]).toContain("`verify:strict` composes `verify:build:strict` in place of `verify:build`");
  });

  it("fails when a gate is dropped from the strict contract chain", () => {
    const scripts = {
      ...SCRIPTS,
      "verify:contract:strict": "npm run check:routes",
    };
    const problems = problemsFor(scripts);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("check:stored-records");
    expect(problems[0]).toContain("stops being asked exactly when the deeper run is trusted");
  });

  it("counts a gate the strict chain reaches through another script", () => {
    const scripts = {
      ...SCRIPTS,
      "strict:contract": "npm run check:routes && npm run check:stored-records",
      "verify:contract:strict": "npm run strict:contract",
    };
    expect(problemsFor(scripts)).toEqual([]);
  });

  it("fails when the strict lane stops composing a strict stage", () => {
    const scripts = {
      ...SCRIPTS,
      [STRICT_LANE]:
        "npm run verify:build:strict && npm run verify:data:strict && npm run verify:visual",
    };
    const problems = problemsFor(scripts);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(`\`${STRICT_LANE}\` no longer runs \`verify:contract:strict\``);
    expect(problems[0]).toContain("every contract gate is unasked in a strict run");
  });

  it("fails when the strict lane stops running the stage that has no twin", () => {
    const scripts = {
      ...SCRIPTS,
      [STRICT_LANE]:
        "npm run verify:build:strict && npm run verify:data:strict && npm run verify:contract:strict",
    };
    const problems = problemsFor(scripts);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(`\`${STRICT_LANE}\` no longer runs \`verify:visual\``);
  });

  it("fails when a stage has no strict twin at all", () => {
    const scripts = { ...SCRIPTS };
    delete scripts["verify:contract:strict"];
    const problems = problemsFor(scripts);
    // One finding, not two: a lane still naming a deleted script would fail on
    // the missing script itself, so the absent twin is the thing to restore.
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("package.json has no `verify:contract:strict` script");
    expect(problems[0]).toContain("the contract gates have no lane at all in a strict run");
  });

  it("fails when a stage's direct node tool is missing from its strict twin", () => {
    // The shape `verify:data` opens with: a gate named on the stage's own line is
    // not an npm script, so only reading the scripts would leave it unheld.
    const scripts = {
      ...SCRIPTS,
      "verify:build": "npm run build && node tools/check-published-surface.mjs",
    };
    const problems = problemsFor(scripts);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("`verify:build:strict` does not run 1 tool that `verify:build` calls with `node` directly");
    expect(problems[0]).toContain("node tools/check-published-surface.mjs");
    expect(problems[0]).toContain("stops being asked exactly when the deeper run is trusted");
  });

  it("counts a node tool the strict stage reaches through a script", () => {
    const scripts = {
      ...SCRIPTS,
      "verify:build": "npm run build && node tools/check-published-surface.mjs",
      "strict:surface": "node tools/check-published-surface.mjs",
      "verify:build:strict":
        "npm run build && npm run check:init-order && npm run check:size-budgets && npm run strict:surface",
    };
    expect(problemsFor(scripts)).toEqual([]);
  });

  it("reads a tool by its file, so deeper flags are the same gate", () => {
    const scripts = {
      ...SCRIPTS,
      "verify:contract": "npm run check:routes && node ./tools/check-order.mjs",
      "verify:contract:strict":
        "npm run check:routes && npm run check:stored-records && node tools/check-order.mjs --strict",
    };
    expect(problemsFor(scripts)).toEqual([]);
    expect([...collectDirectNodeTools(scripts, "verify:contract")]).toEqual(["tools/check-order.mjs"]);
  });

  it("holds a notice printed on the stage's own line like any other tool", () => {
    // There is no exemption to fall back on: a tool named on the stage's line and
    // not on its twin's is a line that stops being asked, whatever it prints.
    const withNotice = {
      ...SCRIPTS,
      "verify:data": "node tools/data-revision-status.mjs && npm run check:data-sources",
    };
    const problems = problemsFor(withNotice);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("node tools/data-revision-status.mjs");
  });

  it("reaches the data stage's notice by script name in both lanes", () => {
    // The way out the message names: a notice both stages can reach is a script,
    // and the comparison sees it in each lane rather than excusing a line.
    const scripts = JSON.parse(readFileSync(path.resolve(process.cwd(), "package.json"), "utf8")).scripts ?? {};
    for (const stage of ["verify:data", "verify:data:strict"]) {
      expect(expandVerifyChain(scripts, stage).has("notice:data-revision"), `${stage} runs the notice`).toBe(true);
    }
  });

  it("passes this repo's own chains, direct node lines included", () => {
    const scripts = JSON.parse(readFileSync(path.resolve(process.cwd(), "package.json"), "utf8")).scripts ?? {};
    expect(collectStrictChainProblems({ scripts })).toEqual([]);
  });

  it("fails when there is no strict lane to hold the chains to", () => {
    const scripts = { ...SCRIPTS };
    delete scripts[STRICT_LANE];
    const problems = problemsFor(scripts);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(`package.json has no \`${STRICT_LANE}\` script`);
  });
});

describe("the guard's own wiring", () => {
  it("runs in the fast lane, which the pre-commit hook and CI's pre-commit job both run", () => {
    const scripts = JSON.parse(readFileSync(path.resolve(process.cwd(), "package.json"), "utf8")).scripts ?? {};
    expect(expandVerifyChain(scripts, "verify:fast").has(GUARD_SCRIPT)).toBe(true);
  });
});
