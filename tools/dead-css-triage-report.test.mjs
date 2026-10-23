import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildDeadCssTriage,
  classFamily,
  deadNamePrefixes,
  renderDeadCssTriageMarkdown,
  runDeadCssTriage,
} from "./report-dead-css-triage.mjs";

const sandboxes = [];

function sandbox(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dead-css-triage-"));
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

describe("dead CSS triage families", () => {
  it("files a family under its first hyphen, and a name without one under itself", () => {
    expect(classFamily("fixture-badge-wide")).toBe("fixture-");
    expect(classFamily("tablerow")).toBe("tablerow");
  });

  it("searches mentions at each dead name's longest prefix", () => {
    // `wm-projects-` is the family of every live sibling, so only the innermost
    // prefix can build this exact dead name.
    expect(deadNamePrefixes("wm-", ["wm-projects-old-tab"])).toEqual(["wm-projects-old-"]);
    expect(deadNamePrefixes("tablerow", ["tablerow"])).toEqual([]);
  });

  it("groups the dead rules by family and names the class each one lost", () => {
    const root = sandbox({
      [THEME]: [
        ".fixture-live { color: red; }",
        ".fixture-gone { color: blue; }",
        ".fixture-gone-wide { color: pink; }",
        ".fixture-retired .fixture-live { color: green; }",
      ].join("\n"),
      [COMPONENT]: "const cls = \"fixture-live\";\n",
    });

    const triage = buildDeadCssTriage({ root });

    expect(triage.totals.selectors).toBe(3);
    expect(triage.families.map((family) => family.key)).toEqual(["fixture-"]);
    expect(triage.families[0].selectorCount).toBe(3);
    // A selector is filed under its first dead class and keeps the rest on the
    // row, so an ancestor orphan names both sides of the chain.
    const orphan = triage.families[0].selectors.find((entry) => entry.selector === ".fixture-retired .fixture-live");
    expect(orphan.classes).toEqual(["fixture-retired"]);
  });
});

describe("dead CSS triage evidence", () => {
  it("marks a family nothing mentions as safe to remove", () => {
    const root = sandbox({
      [THEME]: ".fixture-gone { color: blue; }\n",
      [COMPONENT]: "const cls = \"fixture-live\";\n",
    });

    const triage = buildDeadCssTriage({ root });

    expect(triage.families[0].verdict).toBe("prune");
    expect(triage.families[0].mentions).toEqual([]);
    expect(triage.families[0].assemblies).toEqual([]);
    expect(renderDeadCssTriageMarkdown(triage)).toContain("safe to remove");
  });

  it("lists the places a prefix is mentioned without counting them as assembly", () => {
    const root = sandbox({
      // The dead name itself never appears in source; only its prefix does, in
      // a regex and a DOM id, which the rule refuses to read as assembly.
      [THEME]: ".fixture-gone-wide { color: red; }\n",
      [COMPONENT]: [
        "const marker = /\\b(fixture-gone-|multiview)\\b/i;",
        "items.push({ id: `fixture-gone-tab-${index}` });",
        "const near = <span className=\"fixture-gone-wide-badge\" />;",
      ].join("\n"),
    });

    const triage = buildDeadCssTriage({ root });
    const family = triage.families[0];

    // All three places share a longer prefix with the dead name, so they are the
    // ones a reader checks; none of them builds this exact class, so the rule
    // stays dead. The token that starts with the dead name reads first.
    expect(family.verdict).toBe("review");
    expect(family.mentions.map((entry) => entry.line)).toEqual([3, 1, 2]);
    expect(family.mentions.map((entry) => entry.file)).toEqual([COMPONENT, COMPONENT, COMPONENT]);
    expect(family.assemblies).toEqual([]);
    const markdown = renderDeadCssTriageMarkdown(triage);
    expect(markdown).toContain("review before removing");
    expect(markdown).toContain("Prefix mentioned, not assembled");
    expect(markdown).toContain(`${COMPONENT}:1`);
  });

  it("shows the fragment that keeps a neighbouring name alive", () => {
    const root = sandbox({
      [THEME]: [
        ".fixture-status--ok { color: green; }",
        ".fixture-status-latest { color: gray; }",
      ].join("\n"),
      [COMPONENT]: "const node = <span className={`fixture-status fixture-status--${tone}`} />;\n",
    });

    const triage = buildDeadCssTriage({ root });
    const family = triage.families[0];

    // The assembled name is alive; the reader is shown the fragment so the dead
    // name can be read as a variant of it rather than a mystery.
    expect(family.verdict).toBe("review");
    expect(family.assemblies.map((entry) => entry.fragment)).toEqual(["fixture-status--"]);
    expect(family.assemblies[0].line).toBe(1);
    expect(family.selectors.map((entry) => entry.selector)).toEqual([".fixture-status-latest"]);
    expect(renderDeadCssTriageMarkdown(triage)).toContain("Assembled at");
    expect(renderDeadCssTriageMarkdown(triage)).toContain("fixture-status--");
  });

  it("does not blame a live sibling for a dead family's mentions", () => {
    const root = sandbox({
      [THEME]: [
        ".fixture-live-card { color: red; }",
        ".fixture-old-tab { color: blue; }",
      ].join("\n"),
      [COMPONENT]: "const cls = \"fixture-live-card\";\n",
    });

    const triage = buildDeadCssTriage({ root });

    // The live class shares the `fixture-` prefix but none of the dead name's own
    // longer prefixes, so it is not evidence and the family reads as removable.
    expect(triage.families[0].verdict).toBe("prune");
    expect(triage.families[0].mentions).toEqual([]);
  });
});

describe("dead CSS triage report", () => {
  it("writes the readable and machine-readable reports without gating", () => {
    const root = sandbox({
      [THEME]: ".fixture-gone { color: red; }\n.fixture-live { color: blue; }\n",
      [COMPONENT]: "const cls = \"fixture-live\";\n",
    });

    const lines = [];
    expect(runDeadCssTriage({ root, log: (line) => lines.push(line) })).toBe(0);

    const markdown = fs.readFileSync(path.join(root, "reports", "dead-css-triage.md"), "utf8");
    const data = JSON.parse(fs.readFileSync(path.join(root, "reports", "dead-css-triage.json"), "utf8"));
    expect(markdown).toContain("# Dead CSS triage");
    expect(markdown).toContain(".fixture-gone");
    expect(markdown).not.toContain(".fixture-live");
    expect(data.totals.selectors).toBe(1);
    expect(data.families[0].key).toBe("fixture-");
    expect(lines.join("\n")).toContain("1 dead selector in 1 family");
    expect(lines.join("\n")).toContain("reports/dead-css-triage.md");
  });

  it("keeps a pipe in a selector from breaking the table row", () => {
    const root = sandbox({
      [THEME]: "[data-kind=\"a|b\"] .fixture-gone { color: red; }\n",
      [COMPONENT]: "const cls = \"fixture-live\";\n",
    });

    const markdown = renderDeadCssTriageMarkdown(buildDeadCssTriage({ root }));

    expect(markdown).toContain('`[data-kind="a\\|b"] .fixture-gone`');
  });

  it("says there is nothing to triage on a clean tree", () => {
    const root = sandbox({
      [THEME]: ".fixture-live { color: red; }\n",
      [COMPONENT]: "const cls = \"fixture-live\";\n",
    });

    const lines = [];
    expect(runDeadCssTriage({ root, log: (line) => lines.push(line) })).toBe(0);

    expect(lines.join("\n")).toContain("nothing to triage");
    expect(fs.readFileSync(path.join(root, "reports", "dead-css-triage.md"), "utf8")).toContain("No unmatchable selectors");
  });
});
