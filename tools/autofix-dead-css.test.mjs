import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runTool } from "./test-spawn-guard.mjs";
import { afterEach, describe, expect, it } from "vitest";
import {
  DELETION_DIFF_PATH,
  applyDeadRuleDeletions,
  removeDeadRules,
  runDeadCssAutofix,
  splitDeadBranches,
  writeDeletionProposal,
  selectDeletionRules,
} from "./autofix-dead-css.mjs";
import { runDeadCssGate } from "./check-wingman-dead-css-baseline.mjs";
import { createDeadBranchTest, createDeadSelectorTest } from "./lib/dead-css.mjs";

function runCommand(command, args, options) {
  // Hook-local Git variables must not redirect a fixture command into this checkout.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key)));
  return runTool(command, args, "autofix-dead-css", { ...options, env });
}

const sandboxes = [];

function sandbox(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dead-css-autofix-"));
  sandboxes.push(root);
  for (const [relative, content] of Object.entries(files)) {
    const absolute = path.join(root, relative);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, content);
  }
  return root;
}

afterEach(() => {
  for (const root of sandboxes.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

const THEME = "src/wingman2/styles/theme.css";
const COMPONENT = "src/wingman2/components/Widget.tsx";
const BASELINE = "tools/wingman-dead-css-baseline.json";
const quiet = { log: () => {}, error: () => {} };

function baseline(entries) {
  return {
    updatedAt: "2026-01-01T00:00:00.000Z",
    rule: "fixture baseline",
    deadSelectors: entries.map((selector) => ({ file: THEME, selector })),
  };
}

describe("dead CSS branch splitting", () => {
  it("splits a mixed list and leaves a fully dead rule alone", () => {
    const root = sandbox({
      [THEME]: [
        ".fixture-live, .fixture-dead { color: red; }",
        ".fixture-dead-two { color: blue; }",
        ".fixture-live-two:hover, .fixture-dead-three { color: green; }",
      ].join("\n"),
      [COMPONENT]: 'const cls = "fixture-live fixture-live-two";\n',
    });
    const isDeadBranch = createDeadBranchTest(root);
    const css = fs.readFileSync(path.join(root, THEME), "utf8");
    const result = splitDeadBranches(css, isDeadBranch);

    // The live declarations survive byte-for-byte; the fully dead rule is not
    // the autofix's business.
    expect(result.css).toBe(
      [".fixture-live { color: red; }", ".fixture-dead-two { color: blue; }", ".fixture-live-two:hover { color: green; }"].join("\n"),
    );
    expect(result.splits).toEqual([
      { selector: ".fixture-live, .fixture-dead", dead: [".fixture-dead"], kept: [".fixture-live"] },
      { selector: ".fixture-live-two:hover, .fixture-dead-three", dead: [".fixture-dead-three"], kept: [".fixture-live-two:hover"] },
    ]);
  });
});

describe("fully dead rule removal", () => {
  it("removes whole dead rules and the media block they empty, and leaves mixed lists alone", () => {
    const root = sandbox({
      [THEME]: [
        ".fixture-live { color: red; }",
        "@media (min-width: 600px) {",
        "  .fixture-dead { color: blue; }",
        "}",
        ".fixture-live-two, .fixture-dead-two { color: green; }",
      ].join("\n"),
      [COMPONENT]: 'const cls = "fixture-live fixture-live-two";\n',
    });
    const css = fs.readFileSync(path.join(root, THEME), "utf8");
    const result = removeDeadRules(css, createDeadSelectorTest(root));

    expect(result.removed).toEqual([".fixture-dead"]);
    expect(result.css).not.toContain("@media");
    expect(result.css).toContain(".fixture-live { color: red; }");
    // A mixed list needs a split, not a whole-rule deletion.
    expect(result.css).toContain(".fixture-live-two, .fixture-dead-two { color: green; }");
  });
});

describe("dead rule deletion proposal", () => {
  function sandboxWithDeadRules() {
    return sandbox({
      [THEME]: [
        ".fixture-live { color: red; }",
        ".fixture-gone { color: blue; }",
        "@media (min-width: 600px) {",
        "  .fixture-gone-in-media { color: pink; }",
        "}",
      ].join("\n"),
      [COMPONENT]: 'const cls = "fixture-live";\n',
      [BASELINE]: `${JSON.stringify(baseline([".fixture-gone", ".fixture-gone-in-media"]), null, 2)}\n`,
    });
  }

  it("writes a reviewable patch and leaves the tree untouched", () => {
    const root = sandboxWithDeadRules();
    const cssBefore = fs.readFileSync(path.join(root, THEME), "utf8");
    const baselineBefore = fs.readFileSync(path.join(root, BASELINE), "utf8");

    const proposal = writeDeletionProposal({ root });

    expect(proposal.removed.map((entry) => entry.selector)).toEqual([".fixture-gone", ".fixture-gone-in-media"]);
    expect(proposal.files).toHaveLength(1);
    expect(proposal.retired.map((entry) => entry.selector)).toEqual([".fixture-gone", ".fixture-gone-in-media"]);
    expect(fs.readFileSync(path.join(root, THEME), "utf8")).toBe(cssBefore);
    expect(fs.readFileSync(path.join(root, BASELINE), "utf8")).toBe(baselineBefore);

    const patch = fs.readFileSync(path.join(root, DELETION_DIFF_PATH), "utf8");
    expect(patch).toContain(`--- a/${THEME}`);
    expect(patch).toContain(`+++ b/${THEME}`);
    expect(patch).toContain("-.fixture-gone { color: blue; }");
    expect(patch).toContain("@media (min-width: 600px)");
    expect(patch).toContain(`--- a/${BASELINE}`);
    expect(patch).toContain('"selector": ".fixture-gone"');
  });

  it("produces a diff git apply accepts into exactly the accepted stylesheets", () => {
    const root = sandboxWithDeadRules();
    // The repository pins text files to LF, so an applied patch must land the
    // same bytes the accept path writes instead of the host's CRLF default.
    fs.writeFileSync(path.join(root, ".gitattributes"), "* text=auto eol=lf\n");
    runCommand("git", ["init", "-q"], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    const proposal = writeDeletionProposal({ root });

    runCommand("git", ["apply", "--check", DELETION_DIFF_PATH], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    runCommand("git", ["apply", DELETION_DIFF_PATH], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });

    expect(fs.readFileSync(path.join(root, THEME), "utf8")).toBe(proposal.files[0].after);
    expect(fs.readFileSync(path.join(root, BASELINE), "utf8")).toBe(proposal.baseline.after);
    expect(runDeadCssGate({ root, ...quiet })).toBe(0);
  });

  it("accepts the reviewed proposal, retires the allowances and leaves the gate green", () => {
    const root = sandboxWithDeadRules();
    writeDeletionProposal({ root });
    const result = applyDeadRuleDeletions({ root, ...quiet });

    expect(result.status).toBe(0);
    expect(result.changed).toEqual([THEME, BASELINE]);
    expect(result.removed.map((entry) => entry.selector)).toEqual([".fixture-gone", ".fixture-gone-in-media"]);
    expect(fs.readFileSync(path.join(root, THEME), "utf8")).not.toContain("fixture-gone");
    expect(JSON.parse(fs.readFileSync(path.join(root, BASELINE), "utf8")).deadSelectors).toEqual([]);
    expect(runDeadCssGate({ root, ...quiet })).toBe(0);
  });

  it("refuses to accept without a reviewed patch", () => {
    const root = sandboxWithDeadRules();

    expect(() => applyDeadRuleDeletions({ root, ...quiet })).toThrow(/No reviewed proposal/);
    // Nothing was deleted on the strength of an unreviewed list.
    expect(fs.readFileSync(path.join(root, THEME), "utf8")).toContain(".fixture-gone");
  });

  it("accepts individual rules even in adjacent diff hunks and retains their final patch", () => {
    const root = sandboxWithDeadRules();
    const full = writeDeletionProposal({ root });
    const selected = selectDeletionRules({ root, acceptedIds: [full.removed[0].id] });
    expect(selected.diff).toContain("unused classes: fixture-gone");
    expect(selected.removed).toHaveLength(1);
    const applied = applyDeadRuleDeletions({ root, ...quiet });
    expect(applied.status).toBe(0);
    expect(fs.readFileSync(path.join(root, THEME), "utf8")).toContain(".fixture-gone-in-media");
    expect(fs.readFileSync(path.join(root, DELETION_DIFF_PATH), "utf8")).toBe(selected.diff);
  });

  it("rejects unknown or stale individual selections", () => {
    const root = sandboxWithDeadRules();
    const full = writeDeletionProposal({ root });
    expect(() => selectDeletionRules({ root, acceptedIds: ["unknown"] })).toThrow(/Unknown/);
    fs.appendFileSync(path.join(root, THEME), "\n.fixture-later { color: black; }");
    expect(() => selectDeletionRules({ root, acceptedIds: [full.removed[0].id] })).toThrow(/stale/);
  });

  it("refuses a patch that no longer matches the rules it would delete", () => {
    const root = sandboxWithDeadRules();
    writeDeletionProposal({ root });
    fs.appendFileSync(path.join(root, THEME), ".fixture-gone-later { color: gray; }\n");

    expect(() => applyDeadRuleDeletions({ root, ...quiet })).toThrow(/older than the rules/);
    expect(fs.readFileSync(path.join(root, THEME), "utf8")).toContain(".fixture-gone");
  });

  it("proposes nothing and clears a stale patch when every rule is live", () => {
    const root = sandbox({
      [THEME]: ".fixture-live { color: red; }\n",
      [COMPONENT]: 'const cls = "fixture-live";\n',
      [BASELINE]: `${JSON.stringify(baseline([]), null, 2)}\n`,
    });
    fs.mkdirSync(path.join(root, "reports"), { recursive: true });
    fs.writeFileSync(path.join(root, DELETION_DIFF_PATH), "stale patch\n");

    const proposal = writeDeletionProposal({ root });

    expect(proposal.removed).toEqual([]);
    expect(proposal.diff).toBe("");
    expect(fs.existsSync(path.join(root, DELETION_DIFF_PATH))).toBe(false);
    expect(applyDeadRuleDeletions({ root, ...quiet }).changed).toEqual([]);
  });
});

describe("dead CSS autofix", () => {
  function sandboxWithBranch() {
    return sandbox({
      [THEME]: [".fixture-live, .fixture-dead { color: red; }", ".fixture-gone { color: blue; }"].join("\n"),
      [COMPONENT]: 'const cls = "fixture-live";\n',
      [BASELINE]: `${JSON.stringify(baseline([".fixture-dead", ".fixture-gone", ".fixture-removed"]), null, 2)}\n`,
    });
  }

  it("splits the branch, drops the allowances that split invalidated, and leaves the gate green", () => {
    const root = sandboxWithBranch();
    const result = runDeadCssAutofix({ root, ...quiet });

    expect(result.status).toBe(0);
    expect(result.changed).toEqual([THEME, BASELINE]);
    expect(result.splits.map((split) => split.selector)).toEqual([".fixture-live, .fixture-dead"]);

    const css = fs.readFileSync(path.join(root, THEME), "utf8");
    expect(css).toContain(".fixture-live { color: red; }");
    expect(css).toContain(".fixture-gone { color: blue; }");

    const file = JSON.parse(fs.readFileSync(path.join(root, BASELINE), "utf8"));
    // The split branch and the vanished rule are gone; the still-dead rule stays.
    expect(file.deadSelectors).toEqual([{ file: THEME, selector: ".fixture-gone" }]);
    expect(runDeadCssGate({ root, ...quiet })).toBe(0);
  });

  it("never adopts a newly dead selector, so the gate still blocks it", () => {
    const root = sandboxWithBranch();
    fs.writeFileSync(
      path.join(root, THEME),
      [".fixture-live, .fixture-dead { color: red; }", ".fixture-gone { color: blue; }", ".fixture-new-dead { color: pink; }"].join("\n"),
    );

    const result = runDeadCssAutofix({ root, ...quiet });
    expect(result.status).toBe(0);

    const file = JSON.parse(fs.readFileSync(path.join(root, BASELINE), "utf8"));
    expect(file.deadSelectors.map((entry) => entry.selector)).toEqual([".fixture-gone"]);

    const errors = [];
    expect(runDeadCssGate({ root, log: () => {}, error: (line) => errors.push(line) })).toBe(1);
    expect(errors.join("\n")).toContain(".fixture-new-dead");
  });

  it("writes nothing in check mode", () => {
    const root = sandboxWithBranch();
    const before = fs.readFileSync(path.join(root, THEME), "utf8");
    const baselineBefore = fs.readFileSync(path.join(root, BASELINE), "utf8");

    const result = runDeadCssAutofix({ root, write: false, ...quiet });

    expect(result.changed).toEqual([]);
    expect(result.splits).toHaveLength(1);
    expect(fs.readFileSync(path.join(root, THEME), "utf8")).toBe(before);
    expect(fs.readFileSync(path.join(root, BASELINE), "utf8")).toBe(baselineBefore);
  });

  it("is a no-op when every selector list is live", () => {
    const root = sandbox({
      [THEME]: ".fixture-live { color: red; }\n",
      [COMPONENT]: 'const cls = "fixture-live";\n',
      [BASELINE]: `${JSON.stringify(baseline([]), null, 2)}\n`,
    });

    const result = runDeadCssAutofix({ root, ...quiet });
    expect(result).toEqual({ status: 0, splits: [], changed: [], baselineChanged: false });
  });
});
