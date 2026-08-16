import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  approvedCompetitorDecisions,
  pendingDecisionQueue,
  saveCompetitorDecisionApproval,
} from "./competitor-decision-approval.mjs";

function fixtureDecision(overrides) {
  return {
    id: "maker-SKU-1--closest-technical-match",
    competitorManufacturer: "Maker",
    competitorSku: "SKU-1",
    fingerprint: {
      productClass: "MATRIX",
      endpointRole: "matrix",
      transportClass: "hdmi",
      dependencies: [],
      notes: [],
    },
    wyrestormSku: "MX-0808-SCL",
    decisionType: "closest-technical-match",
    reviewStatus: "pending-review",
    reviewer: null,
    reviewedAt: null,
    matchedPoints: [],
    importantDifferences: [],
    dependencies: [],
    quoteBlockers: [],
    evidence: [],
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
    engineSnapshot: {
      decisionType: "closest-technical-match",
      wyrestormSku: "MX-0808-SCL",
      topSkus: ["MX-0808-SCL"],
      rating: 75,
      comparableFields: 6,
      gapFields: 0,
      verified: false,
    },
    ...overrides,
  };
}

function fixtureLedger() {
  return {
    version: 1,
    updatedAt: "2026-08-16T00:00:00.000Z",
    decisions: [
      fixtureDecision(),
      fixtureDecision({
        id: "barco-CLICKSHARE-CX-30--closest-technical-match",
        competitorManufacturer: "Barco",
        competitorSku: "CLICKSHARE-CX-30",
        fingerprint: {
          productClass: "WIRELESS_PRESENTATION",
          endpointRole: "switcher",
          transportClass: "hybrid",
          dependencies: [],
          notes: [],
        },
        wyrestormSku: "SW-620-TX-W",
        decisionType: "closest-technical-match",
      }),
      fixtureDecision({
        id: "maker-SKU-2--review-required",
        competitorManufacturer: "Maker",
        competitorSku: "SKU-2",
        fingerprint: {
          productClass: "CONTROL",
          endpointRole: "controller",
          transportClass: "unknown",
          dependencies: [],
          notes: [],
        },
        wyrestormSku: null,
        decisionType: "review-required",
      }),
      fixtureDecision({
        id: "maker-SKU-3--approved",
        competitorManufacturer: "Maker",
        competitorSku: "SKU-3",
        reviewStatus: "approved",
        reviewer: "A. Reviewer",
        reviewedAt: "2026-08-16T01:00:00.000Z",
        evidence: [
          {
            sourceUrl: "https://maker.example/sku-3",
            sourceType: "manufacturer",
            checkedAt: "2026-08-16T01:00:00.000Z",
            reviewedOn: "2026-08-16",
            reviewer: "A. Reviewer",
          },
        ],
      }),
    ],
  };
}

async function withTempLedgerFile(run) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wm-decision-approval-"));
  const filePath = path.join(dir, "competitor-match-decisions.json");
  await fs.writeFile(filePath, JSON.stringify(fixtureLedger(), null, 2), "utf8");
  try {
    await run(filePath);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

async function readLedger(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

describe("saveCompetitorDecisionApproval", () => {
  it("writes approved status, reviewer, review date and evidence back to the ledger", async () => {
    await withTempLedgerFile(async (filePath) => {
      const result = await saveCompetitorDecisionApproval(
        {
          competitorManufacturer: "Maker",
          competitorSku: "SKU-1",
          reviewer: "A. Reviewer",
          evidenceUrl: "https://maker.example/sku-1",
        },
        filePath,
      );

      expect(result.ok).toBe(true);
      expect(result.decision.reviewStatus).toBe("approved");
      expect(result.decision.reviewer).toBe("A. Reviewer");
      expect(result.decision.reviewedAt).toBeTruthy();

      const ledger = await readLedger(filePath);
      const stored = ledger.decisions.find(
        (decision) => decision.competitorSku === "SKU-1",
      );
      expect(stored.reviewStatus).toBe("approved");
      expect(stored.reviewer).toBe("A. Reviewer");
      expect(stored.evidence.at(-1).sourceUrl).toBe("https://maker.example/sku-1");
      expect(stored.evidence.at(-1).reviewedOn).toBe(stored.reviewedAt.slice(0, 10));
      expect(ledger.updatedAt).toBe(stored.reviewedAt);
    });
  });

  it("records an optional verification note on the evidence entry", async () => {
    await withTempLedgerFile(async (filePath) => {
      const result = await saveCompetitorDecisionApproval(
        {
          competitorManufacturer: "Maker",
          competitorSku: "SKU-1",
          reviewer: "A. Reviewer",
          evidenceUrl: "https://maker.example/sku-1",
          note: "Official Maker SKU-1 datasheet (verified live).",
        },
        filePath,
      );

      expect(result.ok).toBe(true);
      expect(result.decision.evidence.at(-1).note).toBe(
        "Official Maker SKU-1 datasheet (verified live).",
      );
    });
  });

  it("rejects an approval without a reviewer name", async () => {
    await withTempLedgerFile(async (filePath) => {
      const result = await saveCompetitorDecisionApproval(
        {
          competitorManufacturer: "Maker",
          competitorSku: "SKU-1",
          reviewer: "  ",
          evidenceUrl: "https://maker.example/sku-1",
        },
        filePath,
      );
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/reviewer name/i);
    });
  });

  it("rejects an approval for a decision that is not in the ledger", async () => {
    await withTempLedgerFile(async (filePath) => {
      const result = await saveCompetitorDecisionApproval(
        {
          competitorManufacturer: "Maker",
          competitorSku: "SKU-999",
          reviewer: "A. Reviewer",
          evidenceUrl: "https://maker.example/sku-999",
        },
        filePath,
      );
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/no ledger decision/i);
    });
  });

  it("rejects approving an already-approved decision", async () => {
    await withTempLedgerFile(async (filePath) => {
      const result = await saveCompetitorDecisionApproval(
        {
          competitorManufacturer: "Maker",
          competitorSku: "SKU-3",
          reviewer: "B. Reviewer",
          evidenceUrl: "https://maker.example/sku-3",
        },
        filePath,
      );
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/already approved/i);
    });
  });

  it("rejects an approval without a valid evidence URL", async () => {
    await withTempLedgerFile(async (filePath) => {
      const result = await saveCompetitorDecisionApproval(
        {
          competitorManufacturer: "Maker",
          competitorSku: "SKU-1",
          reviewer: "A. Reviewer",
          evidenceUrl: "not-a-url",
        },
        filePath,
      );
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/source url/i);
    });
  });
});

describe("approvedCompetitorDecisions", () => {
  it("returns only approved rows as full records for runtime promotion", async () => {
    await withTempLedgerFile(async (filePath) => {
      const result = await approvedCompetitorDecisions(filePath);

      expect(result.ok).toBe(true);
      expect(result.total).toBe(4);
      expect(result.approved).toBe(1);
      expect(result.decisions).toHaveLength(1);

      // Full record shape (reviewer, evidence, engine snapshot) - the page
      // merges these straight into its runtime ledger, so the queue's
      // stripped surface shape must not leak through here.
      const approved = result.decisions[0];
      expect(approved.competitorSku).toBe("SKU-3");
      expect(approved.reviewer).toBe("A. Reviewer");
      expect(approved.reviewStatus).toBe("approved");
      expect(approved.evidence).toHaveLength(1);
      expect(approved.engineSnapshot).toBeDefined();
      expect(approved.lead).toBeUndefined();
    });
  });

  it("returns an empty approved set when nothing is approved yet", async () => {
    await withTempLedgerFile(async (filePath) => {
      const ledger = await readLedger(filePath);
      ledger.decisions = ledger.decisions.map((decision) => ({
        ...decision,
        reviewStatus: "pending-review",
      }));
      await fs.writeFile(filePath, JSON.stringify(ledger, null, 2), "utf8");

      const result = await approvedCompetitorDecisions(filePath);
      expect(result.ok).toBe(true);
      expect(result.total).toBe(4);
      expect(result.approved).toBe(0);
      expect(result.decisions).toEqual([]);
    });
  });
});

describe("pendingDecisionQueue", () => {
  it("sorts recommendation-bearing decisions and lead product classes first", async () => {
    await withTempLedgerFile(async (filePath) => {
      const queue = await pendingDecisionQueue(filePath, 100);

      expect(queue.ok).toBe(true);
      expect(queue.total).toBe(4);
      expect(queue.pending).toBe(3);
      expect(queue.approved).toBe(1);
      expect(queue.queue).toHaveLength(3);

      // Both recommendation-bearing rows are tier 1 with lead classes, so the
      // manufacturer::sku tiebreak puts Barco (wireless) before Maker (matrix);
      // the review-required row sorts after every recommendation-bearing row.
      const order = queue.queue.map((item) => item.competitorSku);
      expect(order[0]).toBe("CLICKSHARE-CX-30");
      expect(order[1]).toBe("SKU-1");
      expect(order[2]).toBe("SKU-2");

      // Queue items carry the trimmed surface shape with the lead flag.
      const barco = queue.queue[0];
      expect(barco.lead).toBe(true);
      expect(barco.wyrestormSku).toBe("SW-620-TX-W");
      expect(barco.productClass).toBe("WIRELESS_PRESENTATION");
      expect(barco.engineSnapshot).toBeUndefined();
    });
  });

  it("caps the queue at the requested limit", async () => {
    await withTempLedgerFile(async (filePath) => {
      const queue = await pendingDecisionQueue(filePath, 2);
      expect(queue.ok).toBe(true);
      expect(queue.queue).toHaveLength(2);
    });
  });
});
