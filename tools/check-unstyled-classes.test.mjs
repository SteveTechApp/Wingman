import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runUnstyledClassGate } from "./check-wingman-unstyled-classes.mjs";
import { runTool } from "./test-spawn-guard.mjs";
import {
  classTokensIn,
  collectClassUsage,
  collectUtilityClasses,
  compareUnstyledClasses,
  styleSheetClassNames,
  unstyledClasses,
} from "./lib/unstyled-classes.mjs";

const sandboxes = [];

function sandbox(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "unstyled-classes-"));
  sandboxes.push(root);
  for (const [relative, content] of Object.entries(files)) {
    const absolute = path.join(root, relative);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, content);
  }
  return root;
}

function gitSandbox(files) {
  const root = sandbox(files);
  runTool("git", ["init", "--quiet"], "unstyled-class-sandbox", { cwd: root });
  return root;
}

afterEach(() => {
  for (const root of sandboxes.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

const THEME = "src/wingman2/styles/theme.css";
const COMPONENT = "src/wingman2/components/Widget.tsx";
const EXPORT = "src/wingman2/lib/documentExport.ts";

describe("class tokens in markup", () => {
  it("reads every class attribute shape and skips runtime-assembled names", () => {
    const source = [
      '<span className="fixture-live fixture-wide" />',
      "<span className='fixture-quoted' />",
      "<span className={`fixture-live fixture-tone--${tone} ${other} fixture-tail`} />",
      '<span className={active ? "fixture-on" : "fixture-off"} />',
      '<span className={cx("fixture-joined", disabled && "fixture-muted")} />',
      "<span className={styles.fragment} />",
      "<span class={condition ? { fixture_object: true } : null} />",
    ].join("\n");

    expect(classTokensIn(source)).toEqual([
      "fixture-live",
      "fixture-wide",
      "fixture-quoted",
      "fixture-live",
      "fixture-tail",
      "fixture-on",
      "fixture-off",
      "fixture-joined",
      "fixture-muted",
    ]);
  });

  it("never reads a comparison operand as a class name", () => {
    const source = [
      '<span className={mode === "guided" ? "is-active" : ""} />',
      '<span className={"expert" !== mode ? "fixture-on" : "fixture-off"} />',
      '<span className={cx("fixture-joined", "on" === mode && "fixture-muted")} />',
    ].join("\n");

    expect(classTokensIn(source)).toEqual([
      "is-active",
      "fixture-on",
      "fixture-off",
      "fixture-joined",
      "fixture-muted",
    ]);
  });

  it("collects usage per file, leaving tests and declarations out of the markup corpus", () => {
    const root = sandbox({
      [COMPONENT]: '<div className="fixture-shell fixture-shell" />\n<div className="fixture-panel" />\n',
      "src/wingman2/components/Widget.test.tsx": '<div className="fixture-asserted" />\n',
      [THEME]: ".fixture-declared { color: red; }\n",
    });

    expect(collectClassUsage(root)).toEqual([
      { file: COMPONENT, name: "fixture-panel" },
      { file: COMPONENT, name: "fixture-shell" },
    ]);
  });
});

describe("stylesheet answers", () => {
  it("counts project rules and the style block an export document ships", () => {
    const root = sandbox({
      [THEME]: ".fixture-declared { color: red; }\n/* .fixture-commented { color: blue; } */\n",
      [EXPORT]: 'const html = `<style>.fixture-document { margin: 0; }</style><p class="fixture-document">`;\n',
    });

    const names = styleSheetClassNames(root);
    expect(names.has("fixture-declared")).toBe(true);
    expect(names.has("fixture-document")).toBe(true);
    expect(names.has("fixture-commented")).toBe(false);
  });

  it("asks only about markup the build ships and sheets it ships", () => {
    const root = gitSandbox({
      ".gitignore": "scratch/\n",
      [THEME]: ".fixture-declared { color: red; }\n",
      // Untracked work in progress is still source: nothing is ignored here.
      [COMPONENT]: '<div className="fixture-declared fixture-orphan" />\n',
      // A parked copy of an old component is not markup the app renders, so the
      // class only it names must not be asked about.
      "src/wingman2/scratch/Old.tsx": '<div className="fixture-from-scratch" />\n',
      // Nor is a scratch sheet one the build ships: it cannot answer a class.
      "src/wingman2/scratch/answer.css": ".fixture-orphan { color: blue; }\n",
    });

    expect(collectClassUsage(root)).toEqual([
      { file: COMPONENT, name: "fixture-declared" },
      { file: COMPONENT, name: "fixture-orphan" },
    ]);
    const answered = styleSheetClassNames(root);
    expect(answered.has("fixture-declared")).toBe(true);
    expect(answered.has("fixture-orphan")).toBe(false);
  });

  it("asks the Tailwind compiler which candidates are utilities", async () => {
    const utilities = await collectUtilityClasses(["flex", "w-3.5", "hover:bg-red-500", "fixture-live"]);
    expect(utilities.has("flex")).toBe(true);
    expect(utilities.has("w-3.5")).toBe(true);
    expect(utilities.has("hover:bg-red-500")).toBe(true);
    expect(utilities.has("fixture-live")).toBe(false);
  });

  it("reports a class only when no stylesheet, utility or marker answers it", () => {
    const usage = [
      { file: COMPONENT, name: "fixture-declared" },
      { file: COMPONENT, name: "flex" },
      { file: COMPONENT, name: "group" },
      { file: COMPONENT, name: "peer/label" },
      { file: COMPONENT, name: "fixture-unstyled" },
    ];

    expect(
      unstyledClasses(usage, { stylesheetClasses: new Set(["fixture-declared"]), utilityClasses: new Set(["flex"]) }),
    ).toEqual([{ file: COMPONENT, name: "fixture-unstyled" }]);
  });
});

describe("baseline comparison", () => {
  it("reports additions and stale allowances", () => {
    const { added, stale } = compareUnstyledClasses(
      [
        { file: COMPONENT, name: "fixture-new" },
        { file: COMPONENT, name: "fixture-held" },
      ],
      [
        { file: COMPONENT, name: "fixture-held" },
        { file: COMPONENT, name: "fixture-answered" },
      ],
    );

    expect(added.map((entry) => entry.name)).toEqual(["fixture-new"]);
    expect(stale.map((entry) => entry.name)).toEqual(["fixture-answered"]);
  });
});

describe("unstyled-class gate", () => {
  const noUtilities = async () => new Set();
  const quiet = { log: () => {}, error: () => {} };

  it("records the current classes, passes, then fails when markup adds one", async () => {
    const root = sandbox({
      [THEME]: ".fixture-live { color: red; }\n",
      [COMPONENT]: '<div className="fixture-live fixture-orphan" />\n',
    });
    const baselinePath = path.join(root, "tools", "wingman-unstyled-classes-baseline.json");

    expect(await runUnstyledClassGate({ root, updateBaseline: true, classifyUtilities: noUtilities, ...quiet })).toBe(0);
    const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
    expect(baseline.unstyledClasses).toEqual([{ file: COMPONENT, name: "fixture-orphan" }]);

    // The baseline itself must not make its own entries look styled.
    expect(await runUnstyledClassGate({ root, classifyUtilities: noUtilities, ...quiet })).toBe(0);

    fs.writeFileSync(path.join(root, COMPONENT), '<div className="fixture-live fixture-orphan fixture-added" />\n');
    const errors = [];
    expect(
      await runUnstyledClassGate({ root, classifyUtilities: noUtilities, log: () => {}, error: (line) => errors.push(line) }),
    ).toBe(1);
    expect(errors.join("\n")).toContain("fixture-added");
    expect(errors.join("\n")).toContain("not in the baseline");
  });

  it("fails when the stylesheet starts answering a recorded class", async () => {
    const root = sandbox({
      [THEME]: ".fixture-live { color: red; }\n",
      [COMPONENT]: '<div className="fixture-live fixture-orphan" />\n',
    });
    expect(await runUnstyledClassGate({ root, updateBaseline: true, classifyUtilities: noUtilities, ...quiet })).toBe(0);

    fs.writeFileSync(path.join(root, THEME), ".fixture-live { color: red; }\n.fixture-orphan { color: blue; }\n");
    const errors = [];
    expect(
      await runUnstyledClassGate({ root, classifyUtilities: noUtilities, log: () => {}, error: (line) => errors.push(line) }),
    ).toBe(1);
    expect(errors.join("\n")).toContain("fixture-orphan");
    expect(errors.join("\n")).toContain("now styles");
  });

  it("accepts a utility the compiler generates and a marker that carries behaviour", async () => {
    const root = sandbox({
      [THEME]: ".fixture-live { color: red; }\n",
      [COMPONENT]: '<div className="fixture-live flex group w-3.5" />\n',
    });
    const utilities = await collectUtilityClasses(["flex", "group", "w-3.5"]);

    expect(await runUnstyledClassGate({ root, updateBaseline: true, classifyUtilities: () => utilities, ...quiet })).toBe(0);
    const baseline = JSON.parse(fs.readFileSync(path.join(root, "tools", "wingman-unstyled-classes-baseline.json"), "utf8"));
    expect(baseline.unstyledClasses).toEqual([]);
  });

  it("fails when the baseline is missing", async () => {
    const root = sandbox({
      [THEME]: ".fixture-live { color: red; }\n",
      [COMPONENT]: '<div className="fixture-live" />\n',
    });
    const errors = [];

    expect(
      await runUnstyledClassGate({ root, classifyUtilities: noUtilities, log: () => {}, error: (line) => errors.push(line) }),
    ).toBe(1);
    expect(errors.join("\n")).toContain("Missing baseline");
  });
});
