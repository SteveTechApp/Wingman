import { describe, expect, it } from "vitest";
import { classifyCompetitorCompareDecision } from "./competitorCompareDecision";
import {
  mergeApprovedLedgerDecisions,
  type CompetitorMatchDecision,
  type CompetitorMatchDecisionLedger,
} from "./competitorMatchDecisionLedger";
import {
  applyGovernedCandidateOrder,
  governedDecisionSuppressesCandidates,
  resolveApprovedGovernedDecision,
} from "./governedCompareRuntime";

function decision(
  overrides: Partial<CompetitorMatchDecision> = {},
): CompetitorMatchDecision {
  const now = "2026-07-11T09:00:00.000Z";

  return {
    id: "governed-test",
    competitorManufacturer: "Blustream",
    competitorSku: "IP250UHD-TX",
    fingerprint: {
      productClass: "AV-over-IP encoder",
      endpointRole: "transmitter",
      transportClass: "avoip-1g",
      dependencies: [],
      notes: [],
    },
    wyrestormSku: "NHD-500-TX",
    decisionType: "closest-technical-match",
    reviewStatus: "approved",
    reviewer: "Test reviewer",
    reviewedAt: now,
    matchedPoints: [],
    importantDifferences: [],
    dependencies: [],
    quoteBlockers: [],
    evidence: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function ledger(...decisions: CompetitorMatchDecision[]): CompetitorMatchDecisionLedger {
  return {
    version: 1,
    updatedAt: decisions[0]?.updatedAt ?? null,
    decisions,
  };
}

describe("governed Compare runtime", () => {
  it("resolves an approved reviewed decision before heuristic ranking", () => {
    const approved = decision();

    expect(
      resolveApprovedGovernedDecision(
        ledger(approved),
        "blustream",
        "ip250uhd-tx",
      ),
    ).toEqual(approved);
  });

  it("promotes the reviewed WyreStorm SKU ahead of heuristic candidates", () => {
    const candidates = [
      { sku: "NHD-120-RX" },
      { sku: "NHD-500-TX" },
      { sku: "NHD-600-TRX" },
    ];

    expect(
      applyGovernedCandidateOrder(
        candidates,
        decision(),
        (candidate) => candidate.sku,
      ).map((candidate) => candidate.sku),
    ).toEqual(["NHD-500-TX", "NHD-120-RX", "NHD-600-TRX"]);
  });

  it("suppresses recurring suggestions after an approved no-match decision", () => {
    const noMatch = decision({
      wyrestormSku: null,
      decisionType: "no-suitable-match",
    });

    expect(governedDecisionSuppressesCandidates(noMatch)).toBe(true);
    expect(
      applyGovernedCandidateOrder(
        [{ sku: "NHD-500-TX" }],
        noMatch,
        (candidate) => candidate.sku,
      ),
    ).toEqual([]);
  });

  it("overlays server-approved decisions onto the local ledger by competitor identity", () => {
    const localApproved = decision({
      id: "local-approved",
      reviewer: "Local reviewer",
      reviewedAt: "2026-07-01T09:00:00.000Z",
      updatedAt: "2026-07-01T09:00:00.000Z",
    });
    const serverApproved = decision({
      id: "server-approved",
      reviewer: "Server reviewer",
      reviewedAt: "2026-07-02T09:00:00.000Z",
      updatedAt: "2026-07-02T09:00:00.000Z",
    });
    const unrelated = decision({
      id: "unrelated",
      competitorSku: "IP200UHD-TX",
      decisionType: "review-required",
      reviewStatus: "pending-review",
      reviewer: null,
      reviewedAt: null,
    });

    const merged = mergeApprovedLedgerDecisions(
      ledger(localApproved, unrelated),
      [serverApproved],
    );

    // The server approval replaces the same-identity local row and takes
    // precedence in runtime resolution; unrelated rows are untouched.
    expect(merged.decisions).toHaveLength(2);
    expect(merged.decisions[0]).toBe(serverApproved);
    expect(merged.decisions[1]).toBe(unrelated);
    expect(
      resolveApprovedGovernedDecision(merged, "blustream", "ip250uhd-tx"),
    ).toEqual(serverApproved);
  });

  it("leaves the local ledger untouched when there are no approved server decisions", () => {
    const local = ledger(
      decision({ reviewStatus: "pending-review", reviewer: null, reviewedAt: null }),
    );

    expect(mergeApprovedLedgerDecisions(local, [])).toBe(local);
  });

  it("hard-blocks transmitter versus receiver direction", () => {
    const result = classifyCompetitorCompareDecision({
      competitor: {
        sku: "SOURCE-TX",
        domain: "AVOIP",
        role: "transmitter",
        transport: "1GbE JPEG-XS",
        sourceTier: "verified-profile",
        specTier: "verified-profile",
      },
      wyrestorm: {
        sku: "NHD-500-RX",
        domain: "AVOIP",
        role: "receiver",
        transport: "1GbE JPEG-XS",
        sourceTier: "verified-profile",
      },
      score: 96,
    });

    expect(result.outcome).toBe("NO MATCH");
    expect(result.blockers.join(" ")).toMatch(/role mismatch/i);
  });

  it("hard-blocks 10G SDVoE against a 1G NetworkHD candidate", () => {
    const result = classifyCompetitorCompareDecision({
      competitor: {
        sku: "SDVOE-TX",
        domain: "AVOIP",
        role: "transmitter",
        transport: "10GbE SDVoE",
        specs: { networkSpeed: "10GbE" },
        features: { tenGig: true },
        sourceTier: "verified-profile",
        specTier: "verified-profile",
      },
      wyrestorm: {
        sku: "NHD-500-TX",
        domain: "AVOIP",
        role: "transmitter",
        transport: "1GbE JPEG-XS",
        specs: { networkSpeed: "1GbE" },
        features: { tenGig: false },
        sourceTier: "verified-profile",
      },
      score: 98,
    });

    expect(result.outcome).toBe("NO MATCH");
    expect(result.blockers.join(" ")).toMatch(/network class mismatch/i);
  });
});