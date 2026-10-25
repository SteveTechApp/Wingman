import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assessDescriptionFreshness,
  claimPaths,
  closedByThisPullRequest,
  extractDescriptionClaims,
  KEEP_OUTSTANDING_MARKER,
  readFailureVerdict,
  SKIP_MARKER,
  summariseChecks,
} from "./check-pr-description-freshness.mjs";

const green = [
  { name: "Lint", status: "completed", conclusion: "success" },
  { name: "Type Check", status: "completed", conclusion: "success" },
  { name: "Verify (contract)", status: "completed", conclusion: "success" },
];

const failing = [
  { name: "Lint", status: "completed", conclusion: "success" },
  { name: "Verify (visual)", status: "completed", conclusion: "failure" },
];

describe("extractDescriptionClaims", () => {
  it("reports a present-tense failure claim with its line", () => {
    const claims = extractDescriptionClaims("## Verification\n\nCI is red on Verify (visual) right now.\n");
    expect(claims).toHaveLength(1);
    expect(claims[0]).toMatchObject({ kind: "failure", line: 3 });
    expect(claims[0].phrase).toMatch(/ci is red/i);
  });

  it("does not treat a report about a fixed or previous run as a claim", () => {
    const body = [
      "## What changed",
      "",
      "The gate was failing on main before this change; it passes now.",
      "Before this fix the suite was failing in Verify (visual).",
      "It was still failing when the branch was opened.",
      "There are no failing tests left.",
      "Previously CI was red on Lint.",
      "There is no outstanding item in tools/check-new.mjs.",
      "",
    ].join("\n");
    expect(extractDescriptionClaims(body)).toEqual([]);
  });

  it("ignores a pasted failing log inside a fenced block or a quote", () => {
    const body = [
      "## Log",
      "",
      "```",
      "Verify (visual) still failing after the retry",
      "```",
      "",
      "> checks are red",
      "",
    ].join("\n");
    expect(extractDescriptionClaims(body)).toEqual([]);
  });

  it("reports an unticked checklist box and skips a ticked one", () => {
    const body = ["## Checklist", "", "- [x] tests", "- [ ] wire the gate into ci.yml", ""].join("\n");
    const claims = extractDescriptionClaims(body);
    expect(claims).toHaveLength(1);
    expect(claims[0]).toMatchObject({ kind: "outstanding", source: "checkbox", text: "wire the gate into ci.yml" });
  });

  it("reads the bullets under a remaining-work heading, not the sections around it", () => {
    const body = [
      "## What changed",
      "",
      "- Adds the parser",
      "",
      "## Remaining",
      "",
      "- the tool is not wired into CI yet",
      "",
      "## Verification",
      "",
      "- npm run check:docs - OK",
      "",
    ].join("\n");
    const claims = extractDescriptionClaims(body);
    expect(claims.map((claim) => claim.text)).toEqual(["the tool is not wired into CI yet"]);
    expect(claims[0].source).toBe("section");
  });

  it("does not read an instructions heading as a statement that work is undone", () => {
    const body = ["## How to do it", "", "- run the tool with a body file", "- read the failure lines", ""].join("\n");
    expect(extractDescriptionClaims(body)).toEqual([]);
  });

  it("keeps a claim a person annotated as genuinely open", () => {
    const body = ["## Checklist", "", `- [ ] manual QA on the LED wall ${KEEP_OUTSTANDING_MARKER}: no simulator here -->`, ""].join("\n");
    expect(extractDescriptionClaims(body)).toEqual([]);
  });

  it("keeps every item under a remaining-work heading that carries the marker", () => {
    const body = [
      `## Remaining ${KEEP_OUTSTANDING_MARKER}: waits for the device -->`,
      "",
      "- manual QA on the wall",
      "- photos of the rack",
      "",
    ].join("\n");
    expect(extractDescriptionClaims(body)).toEqual([]);
  });

  it("reads this repo's own standup wording as a clean description", () => {
    const body = [
      "## What changed",
      "",
      "The picker is a list of rows now, drawn from the same layout as the elevation.",
      "",
      "## Verification",
      "",
      "- `npm run check:docs` - 337 active Markdown files verified.",
      "- CI on the head (`daaf8bfd`): Lint, Type Check, Verify (contract/data/visual) pass; the Supabase jobs skip.",
      "- Full pre-commit hook: 474 test files / 3,736 tests passing.",
      "",
    ].join("\n");
    expect(extractDescriptionClaims(body)).toEqual([]);
  });
});

describe("summariseChecks", () => {
  it("is green only when something completed and passed", () => {
    expect(summariseChecks(green).verdict).toBe("green");
  });

  it("is red when anything completed failed", () => {
    const summary = summariseChecks(failing);
    expect(summary.verdict).toBe("red");
    expect(summary.failed).toEqual(["Verify (visual) (failure)"]);
  });

  it("does not call skipped jobs a green run", () => {
    const summary = summariseChecks([
      { name: "Supabase live gates", status: "completed", conclusion: "skipped" },
      { name: "Verify (visual)", status: "in_progress", conclusion: null },
    ]);
    expect(summary.verdict).toBe("unknown");
    expect(summary.running).toEqual(["Verify (visual)"]);
  });

  it("does not let a run in flight make a green head look unknown or red", () => {
    const summary = summariseChecks([...green, { name: "PR description", status: "in_progress", conclusion: null }]);
    expect(summary.verdict).toBe("green");
    expect(summary.running).toEqual(["PR description"]);
  });

  it("is unknown with no runs at all", () => {
    expect(summariseChecks([]).verdict).toBe("unknown");
  });
});

describe("claimPaths and closedByThisPullRequest", () => {
  it("reads full and bare paths a claim names", () => {
    expect(claimPaths("wire `tools/check-new.mjs` into `.github/workflows/ci.yml` and package.json")).toEqual([
      "tools/check-new.mjs",
      ".github/workflows/ci.yml",
      "package.json",
    ]);
  });

  it("credits a bare filename only when one changed file carries it", () => {
    const claim = { text: "wire the tool into ci.yml" };
    expect(closedByThisPullRequest(claim, [{ filename: ".github/workflows/ci.yml", status: "modified" }])).toBe(
      ".github/workflows/ci.yml",
    );
    expect(
      closedByThisPullRequest(claim, [
        { filename: ".github/workflows/ci.yml", status: "modified" },
        { filename: "docs/ci.yml", status: "added" },
      ]),
    ).toBeNull();
  });

  it("does not close a claim on a file the branch deletes", () => {
    const claim = { text: "add tests in tools/check-new.test.mjs" };
    expect(closedByThisPullRequest(claim, [{ filename: "tools/check-new.test.mjs", status: "removed" }])).toBeNull();
  });
});

describe("assessDescriptionFreshness", () => {
  it("fails a body that still reports failing checks on a green head", () => {
    const result = assessDescriptionFreshness({
      body: "## Verification\n\nStill failing: the Verify (visual) job.\n",
      checks: green,
      changedFiles: [],
    });
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0].reason).toMatch(/failing checks the head no longer has/);
    expect(result.problems[0].detail).toMatch(/3 completed check runs passed/);
  });

  it("leaves an accurate failure report alone while the head is red", () => {
    const result = assessDescriptionFreshness({
      body: "## Verification\n\nStill failing: the Verify (visual) job.\n",
      checks: failing,
      changedFiles: [],
    });
    expect(result.problems).toEqual([]);
  });

  it("fails an unticked checklist box on a green, non-draft branch", () => {
    const result = assessDescriptionFreshness({
      body: "## Checklist\n\n- [ ] add the guard test\n",
      checks: green,
    });
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0].reason).toMatch(/checklist box open/);
  });

  it("leaves the same box alone while the pull request is a draft", () => {
    const result = assessDescriptionFreshness({
      body: "## Checklist\n\n- [ ] add the guard test\n",
      checks: green,
      draft: true,
    });
    expect(result.problems).toEqual([]);
  });

  it("fails an open item the branch has already closed, even before CI is green", () => {
    const result = assessDescriptionFreshness({
      body: "## Remaining\n\n- wire `tools/check-pr-description-freshness.mjs` into the workflow\n",
      checks: [{ name: "Lint", status: "in_progress", conclusion: null }],
      changedFiles: [{ filename: "tools/check-pr-description-freshness.mjs", status: "added" }],
    });
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0].detail).toMatch(/this PR changes tools\/check-pr-description-freshness.mjs/);
  });

  it("does not fail prose about work outside this branch", () => {
    const result = assessDescriptionFreshness({
      body: "## Notes\n\nThe rate card still needs a currency column, which lands in a later PR.\n",
      checks: green,
    });
    expect(result.problems).toEqual([]);
  });

  it("skips a description that opts out", () => {
    const result = assessDescriptionFreshness({
      body: `${SKIP_MARKER}\n\nStill failing: Verify (visual); - [ ] everything\n`,
      checks: green,
    });
    expect(result).toMatchObject({ skipped: true, problems: [] });
  });
});

describe("readFailureVerdict", () => {
  it("fails when the token cannot see the pull request, because the gate is then not running", () => {
    expect(readFailureVerdict({ status: 401, authenticated: true })).toBe("fail");
    expect(readFailureVerdict({ status: 404, authenticated: true })).toBe("fail");
  });

  it("skips an anonymous 404, a rate limit and an outage rather than guessing", () => {
    expect(readFailureVerdict({ status: 404, authenticated: false })).toBe("skip");
    expect(readFailureVerdict({ status: 403, authenticated: true })).toBe("skip");
    expect(readFailureVerdict({ status: 502, authenticated: true })).toBe("skip");
    expect(readFailureVerdict({})).toBe("skip");
  });
});

describe("the gate is wired into CI", () => {
  const root = process.cwd();
  const workflow = readFileSync(path.join(root, ".github", "workflows", "pr-description.yml"), "utf8");
  const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

  it("runs on pull request edits, not only on pushes", () => {
    expect(workflow).toMatch(/pull_request:/);
    expect(workflow).toMatch(/types:\s*\[[^\]]*edited[^\]]*\]/);
  });

  it("runs the tool with the token and the pull request number", () => {
    expect(workflow).toContain("node tools/check-pr-description-freshness.mjs");
    expect(workflow).toMatch(/GITHUB_TOKEN:\s*\$\{\{\s*github\.token\s*\}\}/);
    expect(workflow).toMatch(/PR_NUMBER:\s*\$\{\{\s*github\.event\.pull_request\.number\s*\}\}/);
  });

  it("asks only for the scopes it reads", () => {
    expect(workflow).toMatch(/pull-requests:\s*read/);
    expect(workflow).toMatch(/checks:\s*read/);
    expect(workflow).not.toMatch(/contents:\s*write/);
  });

  it("exposes the check as an npm script", () => {
    expect(packageJson.scripts["check:pr-description"]).toBe("node tools/check-pr-description-freshness.mjs");
  });
});
