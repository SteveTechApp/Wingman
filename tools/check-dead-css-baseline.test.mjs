import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runDeadCssGate } from "./check-wingman-dead-css-baseline.mjs";
import {
  compoundClassTokens,
  collectDeadSelectors,
  compareDeadSelectors,
  createDeadBranchTest,
  normalizeSelector,
  partitionSelectorBranches,
  relativePath,
  selectorBranches,
  selectorCompounds,
  styleSheetFiles,
} from "./lib/dead-css.mjs";

const sandboxes = [];

function sandbox(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dead-css-"));
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

const THEME = `src/wingman2/styles/theme.css`;
const WIDGET = `src/wingman2/components/widget.css`;
const COMPONENT = `src/wingman2/components/Widget.tsx`;

describe("dead CSS detection", () => {
  it("finds unused selectors and keeps live, dynamic and library classes", () => {
    const root = sandbox({
      [THEME]: [
        ".fixture-live { color: red; }",
        ".fixture-dead { color: blue; }",
        ".fixture-dynamic--danger { color: orange; }",
        ".recharts-tooltip { color: gray; }",
        "a:hover { color: green; }",
        "@media (min-width: 600px) { .fixture-dead-in-media { color: pink; } }",
        ".fixture-dead,\n.fixture-dead-2 { color: black; }",
      ].join("\n"),
      [WIDGET]: ".fixture-widget-shell { display: grid; }",
      [COMPONENT]: "const toneClass = \"fixture-dynamic--\" + status;\nconst shell = \"fixture-live fixture-widget-shell\";\n",
    });

    expect(collectDeadSelectors(root).map((entry) => entry.selector).sort()).toEqual([
      ".fixture-dead",
      ".fixture-dead, .fixture-dead-2",
      ".fixture-dead-in-media",
    ]);
  });

  it("splits selector lists and compound chains without touching nested arguments", () => {
    expect(selectorBranches(":is(.fixture-a, .fixture-b) .fixture-c, .fixture-d")).toEqual([
      ":is(.fixture-a, .fixture-b) .fixture-c",
      ".fixture-d",
    ]);
    expect(selectorCompounds("#root .fixture-a > .fixture-b + .fixture-c ~ .fixture-d")).toEqual([
      "#root",
      ".fixture-a",
      ".fixture-b",
      ".fixture-c",
      ".fixture-d",
    ]);
    expect(compoundClassTokens(".fixture-a.fixture-b:not(.fixture-c)[data-x='.fixture-d']")).toEqual([
      "fixture-a",
      "fixture-b",
    ]);
  });

  it("flags a rule whose ancestor class has gone even when the descendant is live", () => {
    const root = sandbox({
      [THEME]: [
        ".fixture-retired-workspace .fixture-live-card { padding: 1rem; }",
        ".fixture-live-card { display: grid; }",
        ".fixture-retired-workspace > .fixture-live-card { gap: 1rem; }",
        ".fixture-live-shell .fixture-retired-panel { color: red; }",
        ".fixture-live-shell { color: blue; }",
      ].join("\n"),
      [COMPONENT]: "const cls = \"fixture-live-card fixture-live-shell\";\n",
    });

    expect(collectDeadSelectors(root).map((entry) => entry.selector).sort()).toEqual([
      ".fixture-live-shell .fixture-retired-panel",
      ".fixture-retired-workspace .fixture-live-card",
      ".fixture-retired-workspace > .fixture-live-card",
    ]);
  });

  it("reports a dead branch inside a live list, and keeps nested arguments and dynamic families", () => {
    const root = sandbox({
      [THEME]: [
        ".fixture-retired-one, .fixture-live-card { color: red; }",
        ".fixture-retired-two, .fixture-retired-three { color: blue; }",
        ":is(.fixture-live-card, .fixture-retired-four):not(.fixture-retired-five) { color: green; }",
        ".fixture-live-card .fixture-retired--dynamic { color: orange; }",
        ".fixture-retired-six svg { color: pink; }",
        ".fixture-live-card svg { color: gray; }",
      ].join("\n"),
      [COMPONENT]: [
        "const cls = \"fixture-live-card\";",
        "const toneClass = \"fixture-retired--\" + status;",
      ].join("\n"),
    });

    // A fully dead rule is reported once, not per branch; a mixed list reports
    // only its dead branch, which is exactly the text a split removes.
    expect(collectDeadSelectors(root).map((entry) => entry.selector)).toEqual([
      ".fixture-retired-one",
      ".fixture-retired-two, .fixture-retired-three",
      ".fixture-retired-six svg",
    ]);
  });

  it("keeps a family a class attribute builds, and only that family", () => {
    const root = sandbox({
      [THEME]: [
        ".fixture-status--ok { color: green; }",
        ".fixture-status--watch { color: amber; }",
        ".fixture-status-latest { color: gray; }",
      ].join("\n"),
      [COMPONENT]: "const node = <span className={`fixture-status fixture-status--${link.status}`} />;\n",
    });

    // The interpolation is evidence for the family it actually assembles, and
    // a longer class that merely shares part of it is still dead.
    expect(collectDeadSelectors(root).map((entry) => entry.selector)).toEqual([".fixture-status-latest"]);
  });

  it("does not treat a prefix mentioned in prose, an id or a filename as assembly", () => {
    const root = sandbox({
      [THEME]: [
        ".vw-badge { color: red; }",
        ".compare-badge { color: orange; }",
        ".report-badge { color: blue; }",
      ].join("\n"),
      [COMPONENT]: [
        // A regex alternative that happens to look like a class prefix.
        "const marker = /\\b(video\\s*wall|vw-|multiview)\\b/i;",
        // A DOM id, and a download filename.
        "items.push({ id: `compare-${index}` });",
        "download(new Blob([csv]), `report-${projectId}-runs.csv`);",
      ].join("\n"),
    });

    expect(collectDeadSelectors(root).map((entry) => entry.selector).sort()).toEqual([
      ".compare-badge",
      ".report-badge",
      ".vw-badge",
    ]);
  });

  it("accepts a class builder named for the classes it returns", () => {
    const root = sandbox({
      [THEME]: ".fixture-tier--danger { color: red; }\n.fixture-tier--quiet { color: gray; }",
      [COMPONENT]: [
        "function rowClassName(tier) {",
        "  const value = tier.toLowerCase();",
        "  return `fixture-row fixture-tier--${value}`;",
        "}",
      ].join("\n"),
    });

    expect(collectDeadSelectors(root)).toEqual([]);
  });

  it("reads the class word in a builder name, not its first letters", () => {
    const root = sandbox({
      [THEME]: [
        ".fixture-mode--dark { color: red; }",
        ".fixture-room-badge { color: blue; }",
        ".fixture-classification-badge { color: orange; }",
      ].join("\n"),
      [COMPONENT]: [
        "function classForMode(mode) {",
        "  return `fixture-mode fixture-mode--${mode}`;",
        "}",
        "function buildClassroomIndex(rooms) {",
        "  return rooms.map((room) => `fixture-room-${room.id}`);",
        "}",
        "const classify = (row) => `fixture-classification-${row.id}`;",
      ].join("\n"),
    });

    // `classForMode` builds classes; `buildClassroomIndex` and `classify` only
    // start with the letters, so their ids are still mentions.
    expect(collectDeadSelectors(root).map((entry) => entry.selector).sort()).toEqual([
      ".fixture-classification-badge",
      ".fixture-room-badge",
    ]);
  });

  it("partitions a selector list into the branches a split would keep and drop", () => {
    const root = sandbox({
      [THEME]: ".fixture-live-card { color: red; }",
      [COMPONENT]: "const cls = \"fixture-live-card\";\n",
    });
    const isDeadBranch = createDeadBranchTest(root);

    expect(partitionSelectorBranches(".fixture-live-card, .fixture-retired-a > .fixture-live-card", isDeadBranch)).toEqual({
      live: [".fixture-live-card"],
      dead: [".fixture-retired-a > .fixture-live-card"],
    });
    expect(partitionSelectorBranches(".fixture-retired-a, .fixture-retired-b", isDeadBranch).live).toEqual([]);
  });

  it("keeps a comment out of the selector key while preserving it in the file", () => {
    const root = sandbox({
      [THEME]: "/* Discovery workflow */ .fixture-dead { color: red; }\n",
      [COMPONENT]: "const cls = \"fixture-other\";\n",
    });

    expect(collectDeadSelectors(root).map((entry) => entry.selector)).toEqual([".fixture-dead"]);
  });

  it("scans stylesheets in route and component folders, not backups", () => {
    const root = sandbox({
      [THEME]: ".fixture-live { color: red; }",
      [WIDGET]: ".fixture-widget-shell { display: grid; }",
      "src/wingman2/styles/theme.css.bak": ".fixture-backup-only { color: red; }",
    });

    expect(styleSheetFiles(root).map((file) => relativePath(root, file))).toEqual([WIDGET, THEME].sort());
  });

  it("normalizes multiline selectors to a stable baseline key", () => {
    expect(normalizeSelector(".fixture-dead,\n  .fixture-dead-2\n")).toBe(".fixture-dead, .fixture-dead-2");
  });
});

describe("dead selector baseline comparison", () => {
  it("reports additions and stale allowances", () => {
    const current = [
      { file: THEME, selector: ".fixture-live-dead", bytes: 12 },
      { file: THEME, selector: ".fixture-still-dead", bytes: 10 },
    ];
    const baseline = [
      { file: THEME, selector: ".fixture-still-dead" },
      { file: THEME, selector: ".fixture-removed" },
    ];

    const { added, stale } = compareDeadSelectors(current, baseline);
    expect(added.map((entry) => entry.selector)).toEqual([".fixture-live-dead"]);
    expect(stale.map((entry) => entry.selector)).toEqual([".fixture-removed"]);
  });

  it("passes when current and baseline agree", () => {
    const entry = { file: THEME, selector: ".fixture-dead", bytes: 8 };
    expect(compareDeadSelectors([entry], [{ file: THEME, selector: ".fixture-dead" }])).toEqual({ added: [], stale: [] });
  });
});

describe("dead CSS gate", () => {
  function source(deadRule) {
    return `${deadRule ? `${deadRule} { color: blue; }\n` : ""}.fixture-live { color: red; }\n`;
  }

  it("records the current dead selectors, passes, and fails on creep", () => {
    const root = sandbox({
      [THEME]: source(".fixture-dead"),
      [COMPONENT]: "const cls = \"fixture-live\";\n",
    });
    const baselinePath = path.join(root, "tools", "wingman-dead-css-baseline.json");
    const errors = [];
    const quiet = { log: () => {}, error: (line) => errors.push(line) };

    expect(runDeadCssGate({ root, updateBaseline: true, ...quiet })).toBe(0);
    const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
    expect(baseline.deadSelectors).toEqual([{ file: THEME, selector: ".fixture-dead" }]);

    // The baseline itself must not make its own entries look live.
    expect(runDeadCssGate({ root, ...quiet })).toBe(0);

    fs.writeFileSync(path.join(root, THEME), `${source(".fixture-dead")}.fixture-new-dead { color: pink; }\n`);
    errors.length = 0;
    expect(runDeadCssGate({ root, ...quiet })).toBe(1);
    expect(errors.join("\n")).toContain(".fixture-new-dead");
    expect(errors.join("\n")).toContain("not in the baseline");
  });

  it("fails when a baseline entry is no longer dead", () => {
    const root = sandbox({
      [THEME]: source(".fixture-dead"),
      [COMPONENT]: "const cls = \"fixture-live\";\n",
    });
    const quiet = { log: () => {}, error: () => {} };
    expect(runDeadCssGate({ root, updateBaseline: true, ...quiet })).toBe(0);

    fs.writeFileSync(path.join(root, THEME), source(""));
    const errors = [];
    expect(runDeadCssGate({ root, ...quiet, error: (line) => errors.push(line) })).toBe(1);
    expect(errors.join("\n")).toContain(".fixture-dead");
    expect(errors.join("\n")).toContain("no longer dead");
  });

  it("fails when the baseline is missing", () => {
    const root = sandbox({ [THEME]: source(""), [COMPONENT]: "const cls = \"fixture-live\";\n" });
    const errors = [];
    expect(runDeadCssGate({ root, error: (line) => errors.push(line), log: () => {} })).toBe(1);
    expect(errors.join("\n")).toContain("Missing baseline");
  });
});
