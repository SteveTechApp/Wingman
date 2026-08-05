import { describe, expect, it } from "vitest";

import {
  TRACKED_ENTRIES,
  allowedBytes,
  evaluateBudgets,
  matchesChunk,
  measureEntry,
} from "./wingman-size-budgets.mjs";

const sampleData = {
  jsFiles: [
    { name: "wm-compare-engine-CnI2uzzZ.js", bytes: 1000 },
    { name: "wm-compare-ui-BQnQR5oF.js", bytes: 500 },
    { name: "wm-competitor-registry-CYyphrre.js", bytes: 700 },
    { name: "index-BbA7zDOZ.js", bytes: 300 },
  ],
  cssFiles: [{ name: "index-CDZlRXus.css", bytes: 800 }],
  sourceSizes: { "src/wingman2/pages/ComparePageNew.advanced.tsx": 2000 },
};

describe("matchesChunk", () => {
  it("matches a named chunk by its stable prefix and hash separator", () => {
    expect(matchesChunk("wm-compare-engine-CnI2uzzZ.js", "wm-compare-engine")).toBe(true);
  });

  it("does not let sibling chunk names collide", () => {
    // The tracked match strings are all distinct and none is a prefix of
    // another, so `wm-compare-engine` never claims `wm-compare-ui`'s bytes.
    expect(matchesChunk("wm-compare-ui-BQnQR5oF.js", "wm-compare-engine")).toBe(false);
    expect(matchesChunk("wm-compare-engine-CnI2uzzZ.js", "wm-compare-ui")).toBe(false);
  });

  it("ignores non-js files", () => {
    expect(matchesChunk("wm-compare-engine-x.css", "wm-compare-engine")).toBe(false);
  });
});

describe("measureEntry", () => {
  it("sums only the files belonging to a chunk group", () => {
    const entry = { kind: "chunk", match: "wm-compare-engine" };
    expect(measureEntry(entry, sampleData)).toEqual({
      bytes: 1000,
      matched: ["wm-compare-engine-CnI2uzzZ.js"],
    });
  });

  it("sums every emitted js file for totalJs", () => {
    expect(measureEntry({ kind: "totalJs" }, sampleData).bytes).toBe(2500);
  });

  it("reads a source file size by path", () => {
    const entry = { kind: "source", path: "src/wingman2/pages/ComparePageNew.advanced.tsx" };
    expect(measureEntry(entry, sampleData).bytes).toBe(2000);
  });

  it("returns null when a chunk group emitted nothing", () => {
    expect(measureEntry({ kind: "chunk", match: "wm-missing" }, sampleData).bytes).toBeNull();
  });
});

describe("allowedBytes", () => {
  it("widens the limit by the tolerance percentage", () => {
    expect(allowedBytes(1000, 1)).toBe(1010);
    expect(allowedBytes(1000, 0)).toBe(1000);
  });
});

describe("evaluateBudgets", () => {
  const entries = [
    { id: "chunk:compare-engine", kind: "chunk", match: "wm-compare-engine", label: "Compare engine", remediation: "" },
    { id: "total:js", kind: "totalJs", label: "Total JS", remediation: "" },
  ];

  it("passes when a measurement sits within limit plus tolerance", () => {
    const baseline = { tolerancePct: 1, limits: { "chunk:compare-engine": 1000, "total:js": 2500 } };
    const result = evaluateBudgets(entries, sampleData, baseline);
    expect(result.failures).toHaveLength(0);
    expect(result.results.every((row) => row.status === "ok")).toBe(true);
  });

  it("tolerates growth up to the tolerance ceiling", () => {
    // measured 1000, limit 995, allowed floor(995*1.01)=1004 -> ok
    const baseline = { tolerancePct: 1, limits: { "chunk:compare-engine": 995, "total:js": 2500 } };
    const result = evaluateBudgets(entries, sampleData, baseline);
    expect(result.failures).toHaveLength(0);
  });

  it("fails when a measurement clears the tolerance ceiling", () => {
    // measured 1000, limit 900, allowed floor(900*1.01)=909 -> fail
    const baseline = { tolerancePct: 1, limits: { "chunk:compare-engine": 900, "total:js": 2500 } };
    const result = evaluateBudgets(entries, sampleData, baseline);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].entry.id).toBe("chunk:compare-engine");
  });

  it("reports a missing limit rather than silently passing", () => {
    const baseline = { tolerancePct: 1, limits: { "total:js": 2500 } };
    const result = evaluateBudgets(entries, sampleData, baseline);
    expect(result.missingLimits).toContain("chunk:compare-engine");
  });
});

describe("TRACKED_ENTRIES", () => {
  it("has unique ids and required fields", () => {
    const ids = new Set();
    for (const entry of TRACKED_ENTRIES) {
      expect(entry.id).toBeTruthy();
      expect(entry.label).toBeTruthy();
      expect(ids.has(entry.id)).toBe(false);
      ids.add(entry.id);
      if (entry.kind === "chunk") {
        expect(entry.match).toBeTruthy();
      }
      if (entry.kind === "source") {
        expect(entry.path).toBeTruthy();
      }
    }
  });

  it("tracks the artefacts the programme requires", () => {
    const ids = TRACKED_ENTRIES.map((entry) => entry.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "chunk:compare-engine",
        "chunk:competitor-registry",
        "chunk:project-workflow",
        "total:js",
        "source:compare-advanced",
        "source:discovery-page",
        "source:product-call-cards",
        "source:project-detail",
        "source:style-stack-css",
      ]),
    );
  });
});
