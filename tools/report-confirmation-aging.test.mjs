import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { assessConfirmationAging } from "./report-confirmation-aging.mjs";
import profilesData from "../data/governance/wyrestorm-technical-profiles.json";
import agingConfig from "../data/governance/profile-confirmation-aging.json";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOOL = path.join(__dirname, "report-confirmation-aging.mjs");

// Calendar pinned so the fixture ages are deterministic.
const NOW = new Date("2026-10-30T12:00:00.000Z");

function profile(overrides = {}) {
  return {
    sku: "TEST-SKU",
    status: "review-required",
    evidence: [{ sourceType: "manufacturer", sourceUrl: "https://example.com/", reviewedOn: "2026-10-01" }],
    ...overrides,
  };
}

describe("confirmation-aging reporter core", () => {
  it("buckets machine-tier profiles into unconfirmed / aging / overdue", () => {
    const result = assessConfirmationAging(
      {
        profiles: [
          profile({ sku: "FRESH", evidence: [{ reviewedOn: "2026-10-25" }] }), // 5d: unconfirmed only
          profile({ sku: "AGING", evidence: [{ reviewedOn: "2026-10-14" }] }), // 16d: aging
          profile({ sku: "OVERDUE", evidence: [{ reviewedOn: "2026-09-12" }] }), // 48d: overdue (and aging)
        ],
      },
      agingConfig,
      NOW,
    );
    expect(result.unconfirmedCount).toBe(3);
    expect(result.aging.map((entry) => entry.sku)).toEqual(["OVERDUE", "AGING"]);
    expect(result.overdue.map((entry) => entry.sku)).toEqual(["OVERDUE"]);
    expect(result.warnAfterDays).toBe(14);
    expect(result.failAfterDays).toBe(30);
  });

  it("never buckets a human-verified profile - verification stops the confirmation clock", () => {
    const result = assessConfirmationAging(
      {
        profiles: [
          profile({ sku: "VERIFIED-OLD", status: "verified", verifiedBy: "Steve", evidence: [{ reviewedOn: "2026-01-01" }] }),
          profile({ sku: "WARN-OLD", status: "verified-with-warning", evidence: [{ reviewedOn: "2026-01-01" }] }),
        ],
      },
      agingConfig,
      NOW,
    );
    expect(result.unconfirmedCount).toBe(1);
    expect(result.overdue.map((entry) => entry.sku)).toEqual(["WARN-OLD"]);
  });

  it("counts an undatable profile as overdue (freshness cannot be verified)", () => {
    const result = assessConfirmationAging(
      { profiles: [profile({ sku: "NODATE", evidence: [{ sourceType: "manual" }] })] },
      agingConfig,
      NOW,
    );
    expect(result.overdue.map((entry) => entry.sku)).toEqual(["NODATE"]);
    expect(result.aging).toEqual([]);
  });

  it("mirrors the merge gate: overdue-in-report implies the gate would fail", () => {
    // The reporter is a mirror of tools/check-wyrestorm-technical-data.mjs,
    // not a second source of truth. The strongest pin available without
    // re-implementing the gate: the shared threshold config must drive both
    // buckets, and the machine-tier filter must match the gate's set exactly
    // (review-required + verified-with-warning, NOT verified).
    expect(agingConfig.warnAfterDays).toBe(14);
    expect(agingConfig.failAfterDays).toBe(30);
    const tierBoundary = assessConfirmationAging(
      {
        profiles: [
          profile({ sku: "A", status: "review-required", evidence: [{ reviewedOn: "2025-01-01" }] }),
          profile({ sku: "B", status: "verified-with-warning", evidence: [{ reviewedOn: "2025-01-01" }] }),
          profile({ sku: "C", status: "verified", evidence: [{ reviewedOn: "2025-01-01" }] }),
        ],
      },
      agingConfig,
      NOW,
    );
    expect(tierBoundary.unconfirmedCount).toBe(2);
  });

  it("reports the clean live dataset: zero backlog after the A1 confirmation passes", () => {
    const result = assessConfirmationAging(profilesData, agingConfig, new Date());
    expect(result.unconfirmedCount).toBe(0);
    expect(result.aging.length).toBe(0);
    expect(result.overdue.length).toBe(0);
  });
});

describe("confirmation-aging reporter CLI", () => {
  it("exits 0 on readable inputs (report-only, never the red lane)", () => {
    const stdout = execFileSync("node", [TOOL], { encoding: "utf8", env: { ...process.env } });
    expect(stdout).toContain("unconfirmed machine-tier profile(s)");
  });

  it("emits GitHub-output pairs on demand", () => {
    const stdout = execFileSync("node", [TOOL, "--github-output", "--summary"], { encoding: "utf8" });
    expect(stdout).toContain("count_unconfirmed=");
    expect(stdout).toContain("count_aging=");
    expect(stdout).toContain("count_overdue=");
    expect(stdout).toContain("aging (≥14d)");
  });

  it("fails loudly on a missing input file instead of reporting a fake zero", () => {
    expect(() =>
      execFileSync("node", [TOOL], {
        encoding: "utf8",
        env: { ...process.env, WINGMAN_PROFILES_FILE: "C:/definitely/not/here/profiles.json" },
      }),
    ).toThrow();
  });
});
