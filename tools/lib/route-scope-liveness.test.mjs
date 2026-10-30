import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assignmentLiterals,
  catalogueKeys,
  deadRouteScopesIn,
  routeScopeBaselineFailure,
  routeScopeTokens,
  routeScopeWriters,
} from "./route-scope-liveness.mjs";

const CATALOG = `export type WingmanRouteKey =
  | "dashboard"
  | "callCoach"
  | "approvalQueue"
  | "analyticsDashboard";

export const routeCatalog = [];
`;

const MANIFEST = JSON.stringify([
  { key: "dashboard", segment: "dashboard" },
  { key: "callCoach", segment: "call-coach" },
  { key: "approvalQueue", segment: "approval-queue" },
  { key: "analyticsDashboard", segment: "analytics" },
]);

/**
 * The shell's two writers, cut down to their shape: a path in the condition, the
 * admin literal in one branch, the catalogue key in the other, and a template
 * that fills the segment in.
 */
const SHELL = `const activeRoute = useMemo(() => routeByPath(location.pathname), [location.pathname]);

  const wingmanPageKey =

    location.pathname.includes("/admin/data-manager")

      ? "data-manager"

      : activeRoute?.key ?? "dashboard";

  const activeRouteClass = isDataManagerRoute ? "wm-route-data-manager" : activeRoute ? \`wm-route-\${activeRoute.segment}\` : "wm-route-dashboard";
`;

function fakeTree() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "route-scope-"));
  const write = (relative, text) => {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text);
  };
  write(path.join("src", "wingman2", "app", "routeCatalog.ts"), CATALOG);
  write(path.join("src", "wingman2", "app", "route-manifest.json"), MANIFEST);
  write(path.join("src", "wingman2", "layout", "AppShell.tsx"), SHELL);
  return root;
}

describe("route scope writers", () => {
  it("reads the attribute values off the catalogue union and the segments off the manifest", () => {
    const writers = routeScopeWriters({ root: fakeTree() });

    expect([...writers.attribute].sort()).toEqual(["analyticsDashboard", "approvalQueue", "callCoach", "dashboard", "data-manager"]);
    expect([...writers.className].sort()).toEqual(["analytics", "approval-queue", "call-coach", "dashboard", "data-manager"]);
  });

  it("keeps the two vocabularies apart: a kebab segment is not an attribute value and a key is not a class", () => {
    const writers = routeScopeWriters({ root: fakeTree() });

    // The trap in both directions. `call-coach` and `.wm-route-callCoach` are the
    // spellings that look right and match nothing; `callCoach` and
    // `.wm-route-call-coach` are the ones a page sets.
    expect(writers.attribute.has("call-coach")).toBe(false);
    expect(writers.className.has("callCoach")).toBe(false);
    expect(writers.attribute.has("callCoach")).toBe(true);
    expect(writers.className.has("call-coach")).toBe(true);
  });

  it("takes the admin literal in both spellings, and never the path the shell asks about", () => {
    const writers = routeScopeWriters({ root: fakeTree() });

    expect(writers.attribute.has("data-manager")).toBe(true);
    expect(writers.className.has("data-manager")).toBe(true);
    // `/admin/data-manager` is the condition of the ternary, not a value: reading
    // it as one would make `[data-wingman-route="/admin/data-manager"]` live.
    expect(writers.attribute.has("/admin/data-manager")).toBe(false);
    // The template is filled in from the manifest, so its `${…}` is not a segment.
    expect(writers.className.has("$" + "{activeRoute.segment}")).toBe(false);
  });

  it("reads only the branches of an assignment, and nothing at all from a missing one", () => {
    const found = assignmentLiterals(SHELL, "const wingmanPageKey =");

    expect(found.questionAt).toBeGreaterThan(0);
    expect(found.literals.map((entry) => entry.value)).toContain("/admin/data-manager");
    expect(assignmentLiterals(SHELL, "const retiredThing =")).toEqual({ literals: [], statement: "", questionAt: -1 });
  });

  it("finds the same two writers in the real shell", () => {
    const writers = routeScopeWriters({ root: process.cwd() });

    expect(writers.attribute.has("callCoach")).toBe(true);
    expect(writers.attribute.has("call-coach")).toBe(false);
    expect(writers.className.has("call-coach")).toBe(true);
    expect(writers.className.has("analytics")).toBe(true);
    expect(writers.className.has("analyticsDashboard")).toBe(false);
    // Both writers special-case the admin page, which is not a catalogue route.
    expect(writers.attribute.has("data-manager")).toBe(true);
    expect(writers.className.has("data-manager")).toBe(true);
  });
});

describe("dead route scopes", () => {
  const writers = { attribute: new Set(["callCoach"]), className: new Set(["call-coach"]) };

  it("names both scopes a selector carries, with the spelling each one is", () => {
    expect(routeScopeTokens('html[data-wingman-route="callCoach"] .wm-route-call-coach .wm-card')).toEqual([
      { kind: "attribute", value: "callCoach", token: '[data-wingman-route="callCoach"]' },
      { kind: "class", value: "call-coach", token: ".wm-route-call-coach" },
    ]);
  });

  it("reports the crossed spellings and leaves the correct pair alone", () => {
    const css = [
      'html[data-wingman-route="callCoach"] .wm-card { color: red; }',
      'html[data-wingman-route="call-coach"] .wm-card { color: blue; }',
      ".wm-route-call-coach .wm-card { color: green; }",
      ".wm-route-callCoach .wm-card { color: black; }",
    ].join("\n");

    const found = deadRouteScopesIn(css, writers, "styles/route.css");

    expect(found.map((scope) => `${scope.kind}:${scope.value}`).sort()).toEqual(["attribute:call-coach", "class:callCoach"]);
    expect(found.find((scope) => scope.value === "call-coach").selectors).toEqual([
      'html[data-wingman-route="call-coach"] .wm-card',
    ]);
  });

  it("counts the rules a dead value scopes, and the files it appears in", () => {
    const css = 'html[data-wingman-route="planner"] .a { color: red; }\nhtml[data-wingman-route="planner"] .b { color: blue; }';

    const [scope] = deadRouteScopesIn(css, writers, "styles/one.css");

    expect(scope).toMatchObject({ kind: "attribute", value: "planner", count: 2, files: ["styles/one.css"] });
  });

  it("reads a catalogue union and fails loudly when there is no union to read", () => {
    expect(catalogueKeys(CATALOG)).toEqual(["dashboard", "callCoach", "approvalQueue", "analyticsDashboard"]);
    expect(() => catalogueKeys("export type Something = string;")).toThrow(/WingmanRouteKey/);
  });
});

describe("route scope baseline", () => {
  const report = (scopes, totals = {}) => ({
    scopes,
    totals: { files: 1, rules: 10, scoped: 4, deadValues: scopes.length, deadRules: 2, attributeValues: 1, classSegments: 1, ...totals },
  });

  const scope = (kind, value, count) => ({
    kind,
    value,
    count,
    files: ["src/wingman2/styles/one.css"],
    selectors: [`html[data-wingman-route="${value}"] .wm-page`],
  });

  const entry = (kind, value, count, reason = "The route was retired and the rules behind this scope are dead styling a person has not deleted yet.") => ({
    kind,
    value,
    count,
    reason,
  });

  it("passes when every dead value is pinned as often as it occurs", () => {
    expect(routeScopeBaselineFailure(report([scope("attribute", "planner", 2)]), { scopes: [entry("attribute", "planner", 2)] })).toEqual([]);
  });

  it("fails on a dead value nobody reviewed, naming the file and a selector", () => {
    const [failure] = routeScopeBaselineFailure(report([scope("class", "planner-head", 2)]), { scopes: [] });

    expect(failure).toContain("A route scope nothing writes");
    expect(failure).toContain("`planner-head`");
    expect(failure).toContain("src/wingman2/styles/one.css");
    expect(failure).toContain('html[data-wingman-route="planner-head"] .wm-page');
    // The sentence has to say which vocabulary the value was guessed in.
    expect(failure).toContain("a camelCase key is not a class");
  });

  it("fails when a pinned scope spreads to more rules", () => {
    const [failure] = routeScopeBaselineFailure(report([scope("attribute", "planner", 3)]), { scopes: [entry("attribute", "planner", 2)] });

    expect(failure).toContain("pins `planner` (attribute) 2 rule(s) and the tree now has 3");
  });

  it("fails when a pinned scope has nothing left guarding it", () => {
    const [failure] = routeScopeBaselineFailure(report([]), { scopes: [entry("class", "planner", 2)] });

    expect(failure).toContain("no stylesheet uses it any more");
  });

  it("fails on an entry with no reason, a duplicate, and a kind it cannot place", () => {
    const failures = routeScopeBaselineFailure(report([scope("attribute", "planner", 2)]), {
      scopes: [entry("attribute", "planner", 2, "dead"), entry("attribute", "planner", 2), entry("attribute", "gone", 1), { kind: "segment", value: "gone", count: 1 }],
    });

    expect(failures.some((failure) => failure.includes("does not say why that scope is kept"))).toBe(true);
    expect(failures.some((failure) => failure.includes("holds attribute value `planner` twice"))).toBe(true);
    expect(failures.some((failure) => failure.includes("does not say which spelling"))).toBe(true);
  });
});
