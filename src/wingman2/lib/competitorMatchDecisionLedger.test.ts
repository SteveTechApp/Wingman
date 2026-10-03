import { describe, expect, it } from "vitest";
import {
  COMPETITOR_MATCH_DECISION_STORAGE_KEY,
  emptyCompetitorMatchDecisionLedger,
  findApprovedCompetitorMatchDecision,
  readCompetitorMatchDecisionLedger,
  saveCompetitorMatchDecision,
  validateCompetitorMatchDecision,
  type CompareDecisionStorage,
  type CompetitorMatchDecision,
} from "./competitorMatchDecisionLedger";

class MemoryStorage implements CompareDecisionStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function baseDecision(
  overrides: Partial<CompetitorMatchDecision> = {},
): CompetitorMatchDecision {
  const now = "2026-07-11T08:00:00.000Z";

  return {
    id: "blustream-ip250uhd-tx-to-nhd-500-tx",
    competitorManufacturer: "Blustream",
    competitorSku: "IP250UHD-TX",
    fingerprint: {
      productClass: "AV-over-IP encoder",
      endpointRole: "transmitter",
      transportClass: "avoip-1g",
      codec: "JPEG XS",
      maxResolution: "4K60",
      chroma: "4:4:4",
      hdr: true,
      inputCount: 1,
      routedOutputCount: 0,
      mirroredOutputCount: 1,
      loopOutputCount: 0,
      usb: "USB extension",
      audio: "Embedded audio",
      control: "Network control",
      distanceMetres: null,
      dependencies: ["Compatible decoder", "Managed network"],
      notes: [],
    },
    wyrestormSku: "NHD-500-TX",
    decisionType: "confirmed-equivalent",
    reviewStatus: "approved",
    reviewer: "Technical review",
    reviewedAt: now,
    matchedPoints: [
      "1G AV-over-IP encoder role",
      "4K60 transport class",
    ],
    importantDifferences: [
      "Confirm codec and USB behaviour from current datasheets",
    ],
    dependencies: ["NHD-CTL-PRO", "Compatible NetworkHD 500 decoder"],
    quoteBlockers: [],
    evidence: [
      {
        sourceUrl: "https://example.com/manufacturer-datasheet",
        sourceType: "manufacturer",
        checkedAt: now,
        note: "Test evidence record",
      },
    ],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("competitorMatchDecisionLedger", () => {
  it("starts with an empty versioned ledger", () => {
    expect(emptyCompetitorMatchDecisionLedger()).toEqual({
      version: 1,
      updatedAt: null,
      decisions: [],
    });
  });

  it("requires review and evidence before confirming an equivalent", () => {
    const decision = baseDecision({
      reviewStatus: "pending-review",
      reviewer: null,
      reviewedAt: null,
      evidence: [],
    });

    const errors = validateCompetitorMatchDecision(decision);

    expect(errors).toContain("Confirmed equivalents must be approved.");
    expect(errors).toContain("Confirmed equivalents require a reviewer.");
    expect(errors).toContain("Confirmed equivalents require a review date.");
    expect(errors).toContain("Confirmed equivalents require supporting evidence.");
  });

  it("stores and retrieves an approved competitor decision", () => {
    const storage = new MemoryStorage();
    const ledger = saveCompetitorMatchDecision(storage, baseDecision());

    expect(ledger.decisions).toHaveLength(1);
    expect(storage.getItem(COMPETITOR_MATCH_DECISION_STORAGE_KEY)).toBeTruthy();

    const reloaded = readCompetitorMatchDecisionLedger(storage);
    const approved = findApprovedCompetitorMatchDecision(
      reloaded,
      "blustream",
      "ip250uhd-tx",
    );

    expect(approved?.wyrestormSku).toBe("NHD-500-TX");
    expect(approved?.decisionType).toBe("confirmed-equivalent");
  });

  it("supports an explicit no-match decision without a WyreStorm SKU", () => {
    const storage = new MemoryStorage();
    const decision = baseDecision({
      id: "unsupported-product-no-match",
      competitorSku: "UNSUPPORTED-1",
      wyrestormSku: null,
      decisionType: "no-suitable-match",
      reviewStatus: "approved",
    });

    const ledger = saveCompetitorMatchDecision(storage, decision);

    expect(ledger.decisions[0].decisionType).toBe("no-suitable-match");
    expect(ledger.decisions[0].wyrestormSku).toBeNull();
  });

  it("rejects a transmitter decision that is saved as a no-match with a WyreStorm SKU", () => {
    const decision = baseDecision({
      decisionType: "no-suitable-match",
      wyrestormSku: "NHD-500-RX",
    });

    expect(validateCompetitorMatchDecision(decision)).toContain(
      "A no-suitable-match decision must not include a WyreStorm SKU.",
    );
  });
});