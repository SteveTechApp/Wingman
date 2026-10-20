import { describe, expect, it } from "vitest";
import {
  checkedBuildFindings,
  buildAnnotations,
  buildSummaryTable,
  collectNpmAuditFindings,
  mergeAdvisoryRows,
  normalizeBuildFindings,
  partitionByExceptions,
} from "./audit-alert-findings.mjs";

// Fixtures mirroring real npm audit report shapes: an advisory object with
// full metadata, an inheritor carrying only string-via entries, a package
// holding two advisories, and an unpatched moderate finding (sprintf-js
// class).
const HIGH_REPORT = {
  vulnerabilities: {
    "react-router": {
      name: "react-router",
      severity: "high",
      isDirect: true,
      range: ">=7.5.1 <7.5.2",
      nodes: ["node_modules/react-router"],
      fixAvailable: { name: "react-router", version: "7.5.2", isSemVerMajor: false },
      via: [
        {
          url: "https://github.com/advisories/GHSA-xxxx-testhigh",
          title: "RSC-mode CSRF bypass",
        },
      ],
      effects: ["react-router-dom"],
    },
    "react-router-dom": {
      name: "react-router-dom",
      severity: "high",
      isDirect: true,
      range: ">=7.5.1 <7.5.2",
      nodes: ["node_modules/react-router-dom"],
      fixAvailable: false,
      via: ["react-router"],
      effects: [],
    },
  },
};

const MIXED_REPORT = {
  vulnerabilities: {
    "sprintf-js": {
      name: "sprintf-js",
      severity: "moderate",
      isDirect: false,
      range: "<=1.1.3",
      nodes: ["node_modules/mammoth/node_modules/sprintf-js", "node_modules/other/node_modules/sprintf-js"],
      fixAvailable: false,
      via: [
        {
          url: "https://github.com/advisories/GHSA-test-nofix",
          title: "ReDoS",
        },
      ],
    },
    "brace-expansion": {
      name: "brace-expansion",
      severity: "low",
      isDirect: false,
      range: "<1.1.12",
      nodes: ["node_modules/brace-expansion"],
      fixAvailable: { name: "brace-expansion", version: "1.1.12", isSemVerMajor: false },
      via: [
        {
          url: "https://github.com/advisories/GHSA-test-lowfix",
          title: "ReDoS (low, fixed available)",
        },
        {
          url: "https://github.com/advisories/GHSA-test-lowfix2",
          title: "Second low advisory",
        },
      ],
    },
  },
};

describe("collectNpmAuditFindings", () => {
  it("emits one row per advisory with metadata, marking high as actionable", () => {
    const rows = collectNpmAuditFindings(HIGH_REPORT, "root/audit");
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.id).toBe("GHSA-xxxx-testhigh");
    expect(row.package).toBe("react-router");
    expect(row.severity).toBe("high");
    expect(row.title).toBe("RSC-mode CSRF bypass");
    expect(row.class).toBe("error");
    expect(row.isDirect).toBe(true);
    expect(row.fixAvailable).toBe("react-router@7.5.2");
  });

  it("skips string-via inheritors instead of emitting id-less rows", () => {
    // react-router-dom carries via:["react-router"] only - the advisory is
    // reported once on the package that owns the advisory object.
    const ids = collectNpmAuditFindings(HIGH_REPORT, "root/audit").map((r) => r.id);
    expect(ids).toEqual(["GHSA-xxxx-testhigh"]);
  });

  it("marks moderate findings WITHOUT a fix available as actionable (sprintf-js class)", () => {
    const rows = collectNpmAuditFindings(MIXED_REPORT, "root/prod");
    const sprintf = rows.find((r) => r.package === "sprintf-js");
    expect(sprintf.class).toBe("error");
    expect(sprintf.fixAvailable).toBe(false);
  });

  it("emits one row per advisory on a multi-advisory package", () => {
    const rows = collectNpmAuditFindings(MIXED_REPORT, "root/prod");
    const lowRows = rows.filter((r) => r.package === "brace-expansion");
    expect(lowRows).toHaveLength(2);
    // low severity WITH a fix is visible but not actionable
    expect(lowRows.every((r) => r.class === "warning")).toBe(true);
  });

  it("returns nothing for a clean report", () => {
    expect(collectNpmAuditFindings({ vulnerabilities: {} }, "root/audit")).toEqual([]);
  });
});

describe("mergeAdvisoryRows", () => {
  it("merges duplicate advisories across surfaces, joining surface names and keeping the highest severity", () => {
    const base = collectNpmAuditFindings(HIGH_REPORT, "root/audit");
    const merged = mergeAdvisoryRows([
      ...base,
      { ...base[0], severity: "critical", surface: "root/prod" },
      { ...base[0], severity: "low", surface: "server/audit" },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].severity).toBe("critical");
    expect(merged[0].surfaces).toEqual(["root/audit", "root/prod", "server/audit"]);
  });

  it("sorts by severity rank then package", () => {
    const rows = [
      { id: "A-low", package: "zeta", severity: "low", class: "warning", surfaces: ["root/audit"], url: "" },
      { id: "B-high", package: "alpha", severity: "high", class: "error", surfaces: ["root/audit"], url: "" },
      { id: "C-crit", package: "mid", severity: "critical", class: "error", surfaces: ["root/prod"], url: "" },
    ];
    const merged = mergeAdvisoryRows(rows);
    expect(merged.map((r) => r.id)).toEqual(["C-crit", "B-high", "A-low"]);
  });

  describe("normalizeBuildFindings", () => {
    it("maps OSV affected items into summary rows as actionable errors", () => {
      const rows = normalizeBuildFindings(
        [
          {
            name: "esbuild",
            version: "0.21.0",
            id: "GHSA-test-build",
            summary: "XSS in dev server",
            severity: "moderate",
            url: "https://osv.dev/vulnerability/GHSA-test-build",
          },
        ],
        "root/build",
      );
      expect(rows[0].surface).toBe("root/build");
      expect(rows[0].class).toBe("error");
      expect(rows[0].range).toBe("installed 0.21.0");
    });
  });

  describe("partitionByExceptions", () => {
    it("routes exception-covered advisories into the suppressed set", () => {
      const merged = mergeAdvisoryRows([
        { id: "GHSA-covered", package: "a", severity: "high", class: "error", surfaces: ["root/audit"], url: "" },
        { id: "GHSA-open", package: "b", severity: "high", class: "error", surfaces: ["root/audit"], url: "" },
      ]);
      const { actionable, suppressed } = partitionByExceptions(merged, new Set(["GHSA-covered"]));
      expect(actionable.map((r) => r.id)).toEqual(["GHSA-open"]);
      expect(suppressed.map((r) => r.id)).toEqual(["GHSA-covered"]);
    });
  });
});

describe("buildSummaryTable", () => {
  it("renders one markdown row per finding with fix-available emphasis", () => {
    const rows = mergeAdvisoryRows(collectNpmAuditFindings(HIGH_REPORT, "root/audit"));
    const table = buildSummaryTable(rows);
    expect(table[0]).toContain("| Package | Advisory | Severity | Surfaces | Fix available |");
    expect(table[2]).toContain("[GHSA-xxxx-testhigh](https://github.com/advisories/GHSA-xxxx-testhigh)");
    expect(table[2]).toContain("react-router@7.5.2");
  });

  it("renders a bare header pair when the finding set is empty", () => {
    expect(buildSummaryTable([])).toHaveLength(2);
  });
});

describe("buildAnnotations", () => {
  it("emits ::error annotations for actionable rows", () => {
    const rows = mergeAdvisoryRows(collectNpmAuditFindings(HIGH_REPORT, "root/audit"));
    const [annotation] = buildAnnotations(rows);
    expect(annotation).toMatch(/^::error::New dependency advisory GHSA-xxxx-testhigh: react-router high \(root\/audit\)/);
  });
});

// Aunt: escalation path - a high advisory must arrive as an error wherever it
// appears, even when the surface does not use the --omit=dev scope.
describe("an exception still in force", () => {
  it("does not suppress a finding when the open set does not include the advisory", () => {
    const merged = mergeAdvisoryRows(collectNpmAuditFindings(MIXED_REPORT, "root/audit"));
    const { actionable } = partitionByExceptions(merged, new Set());
    expect(actionable).toHaveLength(merged.length);
  });
});


describe("incomplete assessment handling", () => {
  it("reports unassessable OSV packages instead of returning a clean result", () => {
    expect(() => checkedBuildFindings({ affected: [], unassessable: [{ name: "unknown-package", version: "1.0.0", id: "GHSA-incomplete" }] }, "root/build"))
      .toThrow("Incomplete OSV assessment for root/build: unknown-package@1.0.0 (GHSA-incomplete)");
  });
  it("accepts a completed clean OSV assessment", () => {
    expect(checkedBuildFindings({ affected: [], unassessable: [] }, "root/build")).toEqual([]);
  });
  it.each([{}, { error: { code: "ENOAUDIT" } }, { vulnerabilities: [] }])("rejects malformed npm surveys", report => {
    expect(() => collectNpmAuditFindings(report, "root/audit")).toThrow("Incomplete npm assessment");
  });
});
