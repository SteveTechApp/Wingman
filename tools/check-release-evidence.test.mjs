import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkReleaseEvidence } from "./check-release-evidence.mjs";

const now = new Date("2026-09-17T12:00:00.000Z");
const approver = { name: "Release Owner", role: "Engineering" };

function artifact() {
  const dir = mkdtempSync(join(tmpdir(), "wingman-evidence-"));
  const path = join(dir, "result.json");
  writeFileSync(path, "{}\n");
  return path;
}

function criterion(overrides = {}) {
  return {
    id: "api-contract",
    title: "API contract",
    evidenceType: "automated",
    claimedStatus: "pass",
    measuredAt: "2026-09-16T10:00:00.000Z",
    expiresAfterDays: 30,
    artifactPath: artifact(),
    approver,
    ...overrides,
  };
}

describe("release evidence checker", () => {
  it("blocks a claimed pass when its artifact is missing", () => {
    const result = checkReleaseEvidence({ criteria: [criterion({ artifactPath: join(tmpdir(), "absent-wingman-evidence.json") })] }, now);
    expect(result.state).toBe("blocked");
    expect(result.criteria[0].reasons).toContain("artifact_missing");
  });

  it("blocks expired evidence", () => {
    const result = checkReleaseEvidence({ criteria: [criterion({ measuredAt: "2026-07-01T00:00:00.000Z", expiresAfterDays: 14 })] }, now);
    expect(result.criteria[0].reasons).toContain("evidence_expired");
  });

  it("blocks a pass without an approver", () => {
    const result = checkReleaseEvidence({ criteria: [criterion({ approver: null })] }, now);
    expect(result.criteria[0].reasons).toContain("approver_missing");
  });

  it("blocks unmet latency and error budgets", () => {
    const result = checkReleaseEvidence({ criteria: [criterion({ metrics: { p95Ms: 900, p99Ms: 1800, errorRate: 0.04 }, budgets: { maxP95Ms: 500, maxP99Ms: 1200, maxErrorRate: 0.01 } })] }, now);
    expect(result.criteria[0].reasons).toEqual(expect.arrayContaining(["p95_budget_unmet", "p99_budget_unmet", "error_budget_unmet"]));
  });

  it("passes a current, signed result that meets its budgets", () => {
    const result = checkReleaseEvidence({ criteria: [criterion({ metrics: { p95Ms: 300, p99Ms: 700, errorRate: 0.001 }, budgets: { maxP95Ms: 500, maxP99Ms: 1200, maxErrorRate: 0.01 } })] }, now);
    expect(result).toMatchObject({ state: "pass", criteria: [{ state: "pass", reasons: [] }] });
  });

  it("keeps declared external work blocked without pretending it was observed", () => {
    const result = checkReleaseEvidence({ criteria: [criterion({ evidenceType: "human", claimedStatus: "blocked", measuredAt: null, artifactPath: null, approver: null })] }, now);
    expect(result).toMatchObject({ state: "blocked", criteria: [{ state: "blocked", reasons: ["external_evidence_not_supplied"] }] });
  });
});
