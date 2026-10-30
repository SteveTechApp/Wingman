import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const LONG_REASON =
  "A writer that changed stored data once; running it again is not a step in any pipeline.";
import { expandVerifyChain } from "./verify-chain.mjs";
import {
  EXEMPTIONS_FILE,
  GUARD_SCRIPT,
  TOOL_EXEMPTIONS_FILE,
  VERIFY_ROOTS,
  checkVerifyScriptCoverage,
  collectToolReachProblems,
  collectVerifyScriptCoverageProblems,
  isToolFile,
  reachableFromVerify,
} from "./check-verify-script-coverage.mjs";

/**
 * The wirings this guard exists for, without a checkout: a scripts map, the
 * declarations file as an object, and the sentence the person who dropped a line
 * would read.
 *
 * The fixture is small on purpose — a root, two stages, a nested gate — because
 * the question is whether a gate hangs off a verify entry point, not what the
 * repo's own 258 scripts happen to be.
 */
const SCRIPTS = {
  verify: "npm run verify:fast && npm run verify:contract",
  "verify:strict": "npm run verify:fast && npm run check:strict-only",
  "verify:fast": "npm run typecheck && npm run test",
  "verify:contract": "npm run check:contract-thing",
  "check:contract-thing": "node tools/contract-thing.mjs",
  "check:strict-only": "node tools/strict-only.mjs",
  typecheck: "tsc --noEmit",
  test: "vitest run",
  dev: "vite",
};

const EXEMPTIONS = {
  outside: [{ reason: "a local server, not a check", scripts: ["dev"] }],
};

const problemsFor = (overrides = {}) =>
  collectVerifyScriptCoverageProblems({
    scripts: overrides.scripts ?? SCRIPTS,
    exemptions: "exemptions" in overrides ? overrides.exemptions : EXEMPTIONS,
  });

describe("verify script coverage", () => {
  it("passes a graph where every script is asked or declared", () => {
    expect(problemsFor()).toEqual([]);
    // The declaration is one script wide: `dev` is outside and declared, and the
    // gate beside it is reached, so neither is reported.
    expect(reachableFromVerify(SCRIPTS).has("dev")).toBe(false);
    expect(reachableFromVerify(SCRIPTS).has("check:contract-thing")).toBe(true);
  });

  it("names a gate whose stage line was dropped, rather than staying green", () => {
    // The rename's quiet half: the script keeps its name in package.json, the
    // `npm run` line goes with the old one, and nothing fails anywhere.
    const scripts = { ...SCRIPTS, "verify:contract": "npm run check:contract-thing" };
    delete scripts["check:contract-thing"];
    const problems = problemsFor({
      scripts: {
        ...SCRIPTS,
        "verify:contract": "npm run check:something-else",
        "check:something-else": "node tools/something-else.mjs",
      },
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("check:contract-thing");
    expect(problems[0]).toContain("reachable from no verify stage");
    expect(problems[0]).toContain(EXEMPTIONS_FILE);
    // The replacement is asked, so it is not part of the report.
    expect(problems[0]).not.toContain("check:something-else");
  });

  it("counts a gate reached only through the strict root", () => {
    expect(problemsFor()).toEqual([]);
    expect(reachableFromVerify(SCRIPTS).has("check:strict-only")).toBe(true);
  });

  it("reads a nested chain, so a stage that runs a stage still asks its gates", () => {
    const scripts = {
      verify: "npm run verify:fast",
      "verify:strict": "npm run verify:fast",
      "verify:fast": "npm run verify:deep",
      "verify:deep": "npm run check:deep-thing",
      "check:deep-thing": "node tools/deep.mjs",
    };
    expect(problemsFor({ scripts, exemptions: null })).toEqual([]);
  });

  it("reads the flags a stage adds to a gate it runs", () => {
    // `npm run check:technical-data -- --update-baseline` is one script with an
    // argument, not a second script named after the flag.
    const scripts = {
      verify: "npm run gate -- --update-baseline",
      "verify:strict": "npm run gate",
      gate: "node tools/gate.mjs",
    };
    expect(problemsFor({ scripts, exemptions: null })).toEqual([]);
    expect(reachableFromVerify(scripts).has("gate")).toBe(true);
  });

  it("fails an exemption that has gained a verify line, so the file cannot say a gate is unrun", () => {
    const exemptions = {
      outside: [
        ...EXEMPTIONS.outside,
        { reason: "used to be manual", scripts: ["check:contract-thing"] },
      ],
    };
    const problems = problemsFor({ exemptions });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("already reaches: check:contract-thing");
    expect(problems[0]).toContain("drop the entry");
  });

  it("fails an exemption naming a script package.json no longer has, beside the new orphan", () => {
    // A rename done in the wrong order: the script is renamed in package.json and
    // the declarations file still names the old one, while the stage line was
    // rewritten to something that runs neither. The old name excuses nothing and
    // the new one asks nothing — two lines that only read wrong together.
    const scripts = { ...SCRIPTS, "check:renamed-thing": "node tools/renamed-thing.mjs" };
    delete scripts["check:contract-thing"];
    scripts["verify:contract"] = "npm run check:something-else";
    scripts["check:something-else"] = "node tools/something-else.mjs";
    const problems = problemsFor({
      scripts,
      exemptions: { outside: [...EXEMPTIONS.outside, { reason: "renamed", scripts: ["check:contract-thing"] }] },
    });
    expect(problems).toHaveLength(2);
    expect(problems.join("\n")).toContain("check:renamed-thing");
    expect(problems.join("\n")).toContain("package.json no longer has: check:contract-thing");
    expect(problems.join("\n")).toContain("the new script is orphaned above");
  });

  it("fails an exemption with no reason, because the reason is the declaration", () => {
    const problems = problemsFor({
      exemptions: { outside: [{ scripts: ["dev"] }] },
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("with no reason");
    expect(problems[0]).toContain("dev");
  });

  it("fails one script declared twice, which reads as two reasons for one silence", () => {
    const problems = problemsFor({
      exemptions: {
        outside: [
          { reason: "a local server", scripts: ["dev"] },
          { reason: "also a local server", scripts: ["dev"] },
        ],
      },
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("`dev` twice");
  });

  it("fails when a root is gone, and reports only what that root alone reached", () => {
    const scripts = { ...SCRIPTS };
    delete scripts.verify;
    const problems = problemsFor({ scripts });
    expect(problems.some((problem) => problem.includes("has no `verify` script"))).toBe(true);
    // The other root still reaches `verify:fast` and what hangs off it, so the
    // report is the two scripts `verify` alone composed — not every gate, which a
    // graph with no root at all would have called orphaned.
    const orphans = problems.find((problem) => problem.includes("reachable from no verify stage"));
    expect(orphans).toContain("check:contract-thing");
    expect(orphans).not.toContain("typecheck");
  });

  it("treats an unreadable declarations file as declaring nothing", () => {
    // Fail closed: a malformed file must not read as "nothing is outside", which
    // would excuse every script at once.
    const problems = problemsFor({ exemptions: { outside: "not a list" } });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("dev");
    expect(problems[0]).toContain("reachable from no verify stage");
  });
});

describe("the guard's own wiring", () => {
  const scripts = JSON.parse(readFileSync(path.resolve(process.cwd(), "package.json"), "utf8")).scripts ?? {};

  it("runs in the fast lane, which the pre-commit hook and CI's pre-commit job both run", () => {
    expect(expandVerifyChain(scripts, "verify:fast").has(GUARD_SCRIPT)).toBe(true);
  });

  it("finds this tree's scripts accounted for", () => {
    // The real file, the real package.json: a script landing outside the graph is
    // what this guard is for, and this is the reading that would fail first.
    expect(checkVerifyScriptCoverage(process.cwd())).toEqual([]);
  });

  it("declares every script it names, all of which package.json still has", () => {
    const exemptions = JSON.parse(
      readFileSync(path.resolve(process.cwd(), EXEMPTIONS_FILE), "utf8"),
    ).outside;
    for (const group of exemptions) {
      expect(group.reason.trim().length).toBeGreaterThan(0);
      for (const script of group.scripts) expect(scripts[script], script).toBeTypeOf("string");
    }
  });

  it("reads the two entry points a person actually types", () => {
    expect(VERIFY_ROOTS).toEqual(["verify", "verify:strict"]);
  });
});

describe("tool files a script does not reach", () => {
  const toolFiles = ["called-gate.mjs", "uncalled-gate.mjs", "declared-writer.mjs"];
  const referenced = new Map([["called-gate.mjs", "script `check:called`"]]);

  it("counts a tool file but not a spec, whose glob is the runner's job", () => {
    expect(isToolFile("repair-thing.mjs")).toBe(true);
    expect(isToolFile("repair-thing.test.mjs")).toBe(false);
    expect(isToolFile("lib/repair-thing.mjs")).toBe(true);
  });

  it("passes when every tool is called or declared", () => {
    const exemptions = {
      tools: [{ reason: LONG_REASON, files: ["uncalled-gate.mjs", "declared-writer.mjs"] }],
    };

    expect(collectToolReachProblems({ toolFiles, referenced, exemptions })).toEqual([]);
  });

  it("names a tool no script, workflow or import reaches", () => {
    const exemptions = { tools: [{ reason: LONG_REASON, files: ["declared-writer.mjs"] }] };

    const [problem] = collectToolReachProblems({ toolFiles, referenced, exemptions });

    // The quiet failure is a script renamed and the file it called left sitting
    // there: nothing goes red, and the question simply stops being asked.
    expect(problem).toContain("1 tool file under tools/ is reached by no script, no workflow and no import");
    expect(problem).toContain("uncalled-gate.mjs");
    expect(problem).not.toContain("called-gate.mjs,");
  });

  it("refuses a declaration for a file something already calls", () => {
    const exemptions = {
      tools: [{ reason: LONG_REASON, files: ["called-gate.mjs", "uncalled-gate.mjs", "declared-writer.mjs"] }],
    };

    const [problem] = collectToolReachProblems({ toolFiles, referenced, exemptions });

    expect(problem).toContain("declares 1 file something already reaches");
    expect(problem).toContain("called-gate.mjs ← script `check:called`");
    expect(problem).toContain("drop the entry");
  });

  it("refuses a declaration for a file tools/ no longer has", () => {
    const exemptions = {
      tools: [{ reason: LONG_REASON, files: ["queued-gate.mjs", "uncalled-gate.mjs", "declared-writer.mjs"] }],
    };

    const [problem] = collectToolReachProblems({ toolFiles, referenced, exemptions });

    expect(problem).toContain("1 file that tools/ no longer has");
    expect(problem).toContain("queued-gate.mjs");
  });

  it("refuses a declaration that says nothing, and one file declared twice", () => {
    const exemptions = {
      tools: [
        { reason: "", files: ["uncalled-gate.mjs"] },
        { reason: LONG_REASON, files: ["uncalled-gate.mjs", "declared-writer.mjs"] },
      ],
    };

    const problems = collectToolReachProblems({ toolFiles, referenced, exemptions }).join("\n");

    expect(problems).toContain("with no reason");
    expect(problems).toContain("declares `uncalled-gate.mjs` twice");
  });

  it("reads a tree that declares nothing as every tool being orphaned", () => {
    const problems = collectToolReachProblems({ toolFiles: ["a.mjs"], referenced: new Map() });

    expect(problems.join("\n")).toContain("a.mjs");
    expect(problems.join("\n")).toContain(TOOL_EXEMPTIONS_FILE);
  });
});
