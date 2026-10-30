import { describe, expect, it } from "vitest";
import { ageInDays, auditCompetitorEvidenceAging } from "./check-competitor-evidence-aging.mjs";

const AT = new Date("2026-10-30T00:00:00Z");
const POLICY = { verifiedEvidenceWarnAfterDays: 60, verifiedEvidenceFailAfterDays: 120 };

function row(sku, lastReviewed, extra = {}) {
  return { sku, manufacturer: "Atlona", lastReviewed, sourceFile: "data-sources/competitors/atlona.csv", ...extra };
}

function audit(rows, { baseline = null, policy = POLICY } = {}) {
  return auditCompetitorEvidenceAging({ rows, baseline, policy, at: AT });
}

describe("competitor evidence aging", () => {
  it("counts whole days from the review date", () => {
    expect(ageInDays("2026-06-28", AT)).toBe(124);
    expect(ageInDays("2026-10-30", AT)).toBe(0);
    expect(ageInDays("", AT)).toBeNull();
    expect(ageInDays("not a date", AT)).toBeNull();
  });

  it("fails a row past the limit and names the source file to correct", () => {
    const result = audit([row("AT-OMNI-111", "2026-06-28")]);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain("AT-OMNI-111 (Atlona)");
    expect(result.failures[0]).toContain("124 days");
    expect(result.failures[0]).toContain("data-sources/competitors/atlona.csv");
  });

  it("keeps a pinned row quiet while it is still past the limit", () => {
    const result = audit([row("AT-OMNI-111", "2026-06-28")], {
      baseline: { rows: [{ sku: "AT-OMNI-111", reviewedOn: "2026-06-28" }] },
    });
    expect(result.failures).toEqual([]);
    expect(result.totals.pinned).toBe(1);
  });

  it("holds the limit rather than beating it: a row exactly at the limit passes", () => {
    const atLimit = audit([row("EDGE", "2026-07-02")]);
    expect(ageInDays("2026-07-02", AT)).toBe(120);
    expect(atLimit.failures).toEqual([]);
    expect(audit([row("EDGE", "2026-07-01")]).failures).toHaveLength(1);
  });

  it("fails a pin whose row has come back inside the clock, so the allowance only shrinks", () => {
    const result = audit([row("AT-OMNI-111", "2026-10-01")], {
      baseline: { rows: [{ sku: "AT-OMNI-111", reviewedOn: "2026-10-01" }] },
    });
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain("inside the 120-day limit");
  });

  it("fails a pin the catalogue no longer carries", () => {
    const result = audit([row("AT-OMNI-111", "2026-10-01")], {
      baseline: { rows: [{ sku: "AT-RETIRED", reviewedOn: "2026-06-28" }] },
    });
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain("AT-RETIRED");
    expect(result.failures[0]).toContain("no longer carries");
  });

  it("fails a pin whose recorded date disagrees with the row", () => {
    const result = audit([row("AT-OMNI-111", "2026-06-28")], {
      baseline: { rows: [{ sku: "AT-OMNI-111", reviewedOn: "2026-06-01" }] },
    });
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain("pinned as reviewed on 2026-06-01");
    expect(result.failures[0]).toContain("catalogue says 2026-06-28");
  });

  it("reports the warn band as a count and the oldest few, not as failures", () => {
    const result = audit([
      row("OLDEST", "2026-07-03"),
      row("MIDDLE", "2026-08-15"),
      row("FRESH", "2026-10-20"),
      row("OLDER", "2026-07-10"),
    ]);
    expect(result.failures).toEqual([]);
    expect(result.totals.overWarn).toBe(3);
    expect(result.totals.insideWarn).toBe(1);
    expect(result.totals.oldestAgeDays).toBe(119);
    expect(result.oldestOverWarn.map((entry) => entry.sku)).toEqual(["OLDEST", "OLDER", "MIDDLE"]);
  });

  it("fails a row with no readable or future review date", () => {
    const result = audit([row("NO-DATE", ""), row("FUTURE", "2027-01-01")]);
    expect(result.failures).toHaveLength(2);
    expect(result.failures[0]).toContain("no readable lastReviewed");
    expect(result.failures[1]).toContain("in the future");
  });

  it("fails a SKU pinned twice, which would let one row hold two answers", () => {
    const result = audit([row("AT-OMNI-111", "2026-06-28")], {
      baseline: {
        rows: [
          { sku: "AT-OMNI-111", reviewedOn: "2026-06-28" },
          { sku: "AT-OMNI-111", reviewedOn: "2026-06-28" },
        ],
      },
    });
    expect(result.failures.some((failure) => failure.includes("pinned twice"))).toBe(true);
  });

  it("takes its limits from the shared policy, not from a constant of its own", () => {
    const strict = { verifiedEvidenceWarnAfterDays: 2, verifiedEvidenceFailAfterDays: 4 };
    const result = audit([row("RECENT", "2026-10-25")], { policy: strict });
    expect(result.warnAfterDays).toBe(2);
    expect(result.failAfterDays).toBe(4);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain("past the 4-day evidence limit");
  });

  it("stops on a policy that cannot state the evidence limits", () => {
    expect(() => audit([row("RECENT", "2026-10-25")], { policy: {} })).toThrow(
      /profile-confirmation-aging\.json/,
    );
    expect(() =>
      audit([row("RECENT", "2026-10-25")], {
        policy: { verifiedEvidenceWarnAfterDays: 120, verifiedEvidenceFailAfterDays: 60 },
      }),
    ).toThrow(/fail >= warn/);
  });
});
