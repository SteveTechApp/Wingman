/**
 * Competitor match decision ledger - snapshot writer and drift gate.
 *
 * With `SNAPSHOT_COMPETITOR_DECISIONS=write` this regenerates the golden
 * baseline (`data/governance/competitor-match-decisions.json`) from the live
 * spec engine - run via `npm run snapshot:competitor-decisions`.
 *
 * Without the env flag it is the gate: it re-runs the engine over every
 * approved competitor row and FAILS LOUDLY on any outcome flip (decision type,
 * lead candidate, or option set) or on any approved row missing a baseline.
 * A flip means engine or data changed the answer a rep would see, so the
 * baseline must be re-snapshot deliberately.
 */

import { describe, expect, it, vi } from "vitest";
import index from "../../../public/product-intelligence-index.json";
import {
  buildLedgerFromEngine,
  diffLedgerAgainstEngine,
  formatFlips,
  readLedgerFile,
  refreshLedgerOutcomes,
  writeLedgerFile,
  type SnapshotDecision,
} from "./competitorMatchDecisionSnapshot";

vi.mock("./productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue(index),
}));

const DECISION_TYPES = new Set([
  "confirmed-equivalent",
  "closest-technical-match",
  "architecture-alternative",
  "review-required",
  "no-suitable-match",
]);

function structuralErrors(ledger: { decisions: SnapshotDecision[] }): string[] {
  const errors: string[] = [];
  const identities = new Set<string>();
  for (const decision of ledger.decisions) {
    const identity = `${decision.competitorManufacturer}::${decision.competitorSku}::${decision.wyrestormSku ?? "none"}`;
    if (identities.has(identity)) errors.push(`duplicate identity: ${identity}`);
    identities.add(identity);
    if (!DECISION_TYPES.has(decision.decisionType)) errors.push(`${identity}: bad decisionType ${decision.decisionType}`);
    if (!["pending-review", "approved"].includes(decision.reviewStatus)) {
      errors.push(`${identity}: snapshot reviewStatus must be pending-review or approved, got ${decision.reviewStatus}`);
    }
    // "Approved" requires a human, mirroring the governed profile contract:
    // an approved decision must name its reviewer, review date, and carry the
    // evidence the reviewer confirmed against. Machine rows stay pending-review.
    if (decision.reviewStatus === "approved") {
      if (!String(decision.reviewer ?? "").trim()) errors.push(`${identity}: approved decision must record a reviewer`);
      if (!String(decision.reviewedAt ?? "").trim()) errors.push(`${identity}: approved decision must record a review date`);
      if (!Array.isArray(decision.evidence) || decision.evidence.length === 0) {
        errors.push(`${identity}: approved decision must carry evidence`);
      }
    }
    if (!decision.fingerprint?.productClass || !decision.fingerprint?.endpointRole || !decision.fingerprint?.transportClass) {
      errors.push(`${identity}: fingerprint incomplete`);
    }
    if (!decision.engineSnapshot) errors.push(`${identity}: missing engineSnapshot`);
    if (decision.decisionType === "no-suitable-match" && decision.wyrestormSku) {
      errors.push(`${identity}: no-match must not carry a WyreStorm SKU`);
    }
  }
  return errors;
}

describe("competitor match decision ledger snapshot", () => {
  it("regenerates the golden baseline from the live engine (write mode)", async () => {
    if (process.env.SNAPSHOT_COMPETITOR_DECISIONS !== "write") {
      return;
    }
    const ledger = await buildLedgerFromEngine();
    const errors = structuralErrors(ledger);
    expect(errors).toEqual([]);
    writeLedgerFile(ledger);
    console.log(
      `[snapshot] wrote ${ledger.decisions.length} decisions (${ledger.decisions.filter((d) => d.decisionType === "confirmed-equivalent").length} confirmed-equivalent, ` +
        `${ledger.decisions.filter((d) => d.decisionType === "closest-technical-match").length} closest-technical-match, ` +
        `${ledger.decisions.filter((d) => d.decisionType === "architecture-alternative").length} architecture-alternative, ` +
        `${ledger.decisions.filter((d) => d.decisionType === "review-required").length} review-required, ` +
        `${ledger.decisions.filter((d) => d.decisionType === "no-suitable-match").length} no-suitable-match)`,
    );
  });

  it("refreshes changed outcomes in place, preserving human approvals (refresh mode)", async () => {
    if (process.env.SNAPSHOT_COMPETITOR_DECISIONS !== "refresh") {
      return;
    }
    const ledger = readLedgerFile();
    const approvedBefore = ledger.decisions.filter((d) => d.reviewStatus === "approved").length;
    const { ledger: refreshed, changed, approvedDemoted } = await refreshLedgerOutcomes(ledger);
    if (approvedDemoted.length > 0) {
      throw new Error(
        [
          "Refresh moved an approved decision's outcome - the approval must be re-reviewed before it can promote:",
          ...approvedDemoted.map((entry) => `- ${entry.manufacturer} ${entry.sku}: ${entry.from} -> ${entry.to}`),
        ].join("\n"),
      );
    }
    const errors = structuralErrors(refreshed as unknown as { decisions: SnapshotDecision[] });
    expect(errors).toEqual([]);
    writeLedgerFile(refreshed);
    const approvedAfter = refreshed.decisions.filter((d) => d.reviewStatus === "approved").length;
    expect(approvedAfter).toBe(approvedBefore);
    console.log(`[refresh] updated ${changed.length} rows in place (${approvedAfter} approvals preserved, 0 demoted)`);
  });

  it("fails loudly when the engine outcome flips or coverage is lost", async () => {
    if (process.env.SNAPSHOT_COMPETITOR_DECISIONS === "write" || process.env.SNAPSHOT_COMPETITOR_DECISIONS === "refresh") {
      return;
    }
    const ledger = readLedgerFile();
    const { flips, approvedCount, coveredCount } = await diffLedgerAgainstEngine(ledger);

    // The gate's honest failure: every approved row must have a baseline.
    expect(coveredCount, `ledger must cover all ${approvedCount} approved competitor rows`).toBe(approvedCount);

    // And the engine must still make the exact decisions the baseline records.
    expect(
      flips,
      [
        "Engine outcome flip detected - the answer a rep sees changed. Re-run `npm run snapshot:competitor-decisions` only after reviewing the change:",
        formatFlips(flips),
      ].join("\n"),
    ).toEqual([]);
  });
});
