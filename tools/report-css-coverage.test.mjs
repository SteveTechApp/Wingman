import { describe, expect, it } from "vitest";
import { parseRules } from "./lib/dead-css.mjs";
import {
  analyzeCoverage,
  isInteractionSelector,
  normalizeRoutePath,
  parseViewport,
  renderMarkdown,
} from "./report-css-coverage.mjs";

const CSS = [
  ".fixture-shell { color: red; }",
  ".fixture-compare { color: blue; }",
  ".fixture-hover:hover { color: green; }",
  ".fixture-gone { color: orange; }",
].join("\n");

/** A measurement whose used ranges are the first `count` rules of `css`. */
function measurement(route, css, indexes) {
  const rules = parseRules(css);
  return {
    route,
    viewport: { width: 1440, height: 1000 },
    status: "ok",
    sheets: [
      {
        file: "src/wingman2/styles/fixture.css",
        text: css,
        used: indexes.map((index) => [rules[index].selectorStart, rules[index].deleteEnd]),
      },
    ],
  };
}

describe("css coverage inputs", () => {
  it("recognises selectors that need pointer or keyboard state", () => {
    expect(isInteractionSelector(".fixture-hover:hover")).toBe(true);
    expect(isInteractionSelector(".fixture:focus-visible")).toBe(true);
    expect(isInteractionSelector(".fixture:is(.a, .b:active)")).toBe(true);
    expect(isInteractionSelector(".fixture-shell .fixture-panel")).toBe(false);
    expect(isInteractionSelector('html[data-wingman-route="compare"] .fixture')).toBe(false);
  });

  it("normalizes route arguments and viewports, refusing shell-rewritten paths", () => {
    expect(normalizeRoutePath("wingman")).toBe("/wingman");
    expect(normalizeRoutePath("/wingman/compare")).toBe("/wingman/compare");
    expect(normalizeRoutePath("https://example.test/wingman")).toBe("https://example.test/wingman");
    expect(() => normalizeRoutePath("C:/Program Files/Git/wingman")).toThrow(/without the leading slash/);
    expect(parseViewport("1440x1000")).toEqual({ width: 1440, height: 1000 });
    expect(() => parseViewport("1440")).toThrow(/WIDTHxHEIGHT/);
  });
});

describe("css coverage analysis", () => {
  it("unions route loads and separates unmatched, interaction and generated rules", () => {
    const report = analyzeCoverage({
      measurements: [measurement("/wingman", CSS, [0]), measurement("/wingman/compare", CSS, [1])],
      sources: new Map([["src/wingman2/styles/fixture.css", new Set([".fixture-shell { color: red; }", ".fixture-compare { color: blue; }", ".fixture-hover:hover { color: green; }"])]]),
      baseURL: "http://127.0.0.1:3000",
    });

    expect(report.loads).toBe(2);
    expect(report.stylesheets).toEqual([
      expect.objectContaining({ file: "src/wingman2/styles/fixture.css", rules: 4, matched: 2, unmatched: 1, interaction: 1 }),
    ]);
    expect(report.unmatched).toEqual([
      { file: "src/wingman2/styles/fixture.css", selector: ".fixture-gone", generated: true },
    ]);
    expect(report.interaction).toEqual([
      { file: "src/wingman2/styles/fixture.css", selector: ".fixture-hover:hover", generated: false },
    ]);
    expect(report.totals).toEqual({
      rules: 4,
      matched: 2,
      unmatched: 1,
      interaction: 1,
      generated: 1,
      vendorRules: 0,
      vendorUnmatched: 0,
    });
  });

  it("counts third-party stylesheets without listing them as findings", () => {
    const report = analyzeCoverage({
      measurements: [
        {
          route: "/wingman",
          viewport: { width: 390, height: 844 },
          status: "ok",
          sheets: [{ file: "node_modules/@xyflow/react/dist/style.css", text: ".xyflow-node { color: red; }", used: [] }],
        },
      ],
    });

    expect(report.unmatched).toEqual([]);
    expect(report.vendor).toEqual([
      expect.objectContaining({ file: "node_modules/@xyflow/react/dist/style.css", rules: 1, unmatched: 1 }),
    ]);
    expect(report.totals.vendorUnmatched).toBe(1);
  });

  it("keeps route load failures in the report", () => {
    const report = analyzeCoverage({
      measurements: [{ route: "/wingman/compare", viewport: { width: 1440, height: 1000 }, status: "http 500", sheets: [] }],
    });

    expect(report.routes).toEqual([{ route: "/wingman/compare", viewport: "1440x1000", stylesheets: 0, status: "http 500" }]);
  });
});

describe("css coverage markdown", () => {
  it("lists the unmatched rules by file and keeps generated rules labelled", () => {
    const report = analyzeCoverage({
      measurements: [measurement("/wingman", CSS, [0])],
      baseURL: "http://127.0.0.1:3000",
    });
    const markdown = renderMarkdown(report);

    expect(markdown).toContain("Measured 1 route loads over 1 viewport (1440x1000)");
    expect(markdown).toContain("### `src/wingman2/styles/fixture.css` — 2");
    expect(markdown).toContain("- `.fixture-gone`");
    expect(markdown).toContain("- `.fixture-hover:hover`");
    expect(markdown).toContain("## Interaction-only rules never matched");
    expect(markdown).toContain("vendor rules: 0");
  });
});
