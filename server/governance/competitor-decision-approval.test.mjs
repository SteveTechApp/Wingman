import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  approvedCompetitorDecisions,
  pendingDecisionQueue,
  saveCompetitorDecisionApproval,
} from "./competitor-decision-approval.mjs";
import {
  __setLedgerSupabaseClientForTests,
  mergeLedgers,
  pushLedgerToSupabase,
} from "./competitor-decision-ledger-store.mjs";

const originalSyncMode = process.env.WINGMAN_LEDGER_SYNC_MODE;

afterEach(() => {
  __setLedgerSupabaseClientForTests(null);
  if (originalSyncMode === undefined) {
    delete process.env.WINGMAN_LEDGER_SYNC_MODE;
  } else {
    process.env.WINGMAN_LEDGER_SYNC_MODE = originalSyncMode;
  }
});

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

describe("mergeLedgers (two-way sync core)", () => {
  it("lets a remote approval beat a local pending row", () => {
    const local = { version: 1, updatedAt: "2026-08-16T00:00:00.000Z", decisions: [fixtureDecision()] };
    const remote = {
      version: 1,
      updatedAt: "2026-08-16T02:00:00.000Z",
      decisions: [
        fixtureDecision({
          reviewStatus: "approved",
          reviewer: "R. Remote",
          reviewedAt: "2026-08-16T02:00:00.000Z",
          evidence: [{ sourceUrl: "https://maker.example/sku-1", sourceType: "manufacturer" }],
        }),
      ],
    };

    const merged = mergeLedgers(local, remote);
    expect(merged.decisions).toHaveLength(1);
    expect(merged.decisions[0].reviewStatus).toBe("approved");
    expect(merged.decisions[0].reviewer).toBe("R. Remote");
    // The engine snapshot survives the merge untouched.
    expect(merged.decisions[0].engineSnapshot.decisionType).toBe("closest-technical-match");
  });

  it("preserves a local approval against a remote pending row", () => {
    const local = {
      version: 1,
      updatedAt: "2026-08-16T00:00:00.000Z",
      decisions: [
        fixtureDecision({
          reviewStatus: "approved",
          reviewer: "L. Local",
          reviewedAt: "2026-08-16T01:00:00.000Z",
          evidence: [{ sourceUrl: "https://maker.example/sku-1", sourceType: "manufacturer" }],
        }),
      ],
    };
    const remote = { version: 1, updatedAt: "2026-08-16T00:00:00.000Z", decisions: [fixtureDecision()] };

    const merged = mergeLedgers(local, remote);
    expect(merged.decisions[0].reviewStatus).toBe("approved");
    expect(merged.decisions[0].reviewer).toBe("L. Local");
  });

  it("keeps the newer review when both sides approved the same row", () => {
    const newer = fixtureDecision({
      reviewStatus: "approved",
      reviewer: "B. Reviewer",
      reviewedAt: "2026-08-16T03:00:00.000Z",
      updatedAt: "2026-08-16T03:00:00.000Z",
    });
    const older = fixtureDecision({
      reviewStatus: "approved",
      reviewer: "A. Reviewer",
      reviewedAt: "2026-08-16T01:00:00.000Z",
      updatedAt: "2026-08-16T01:00:00.000Z",
    });

    const merged = mergeLedgers(
      { version: 1, updatedAt: "2026-08-16T00:00:00.000Z", decisions: [older] },
      { version: 1, updatedAt: "2026-08-16T00:00:00.000Z", decisions: [newer] },
    );
    expect(merged.decisions[0].reviewer).toBe("B. Reviewer");
  });

  it("includes rows unique to either side and dedupes by identity", () => {
    const local = {
      version: 1,
      updatedAt: "2026-08-16T00:00:00.000Z",
      decisions: [fixtureDecision()], // Maker SKU-1
    };
    const remote = {
      version: 1,
      updatedAt: "2026-08-16T00:00:00.000Z",
      decisions: [fixtureDecision({ competitorSku: "SKU-9", id: "maker-SKU-9--review-required" })],
    };

    const merged = mergeLedgers(local, remote);
    expect(merged.decisions.map((decision) => decision.competitorSku).sort()).toEqual(["SKU-1", "SKU-9"]);
  });
});

// Recording fake for both single-row approvals and the atomic ledger RPC.
function fakeSupabaseClient() {
  let rows = [];
  const calls = [];
  return {
    __rows: () => rows,
    __calls: () => calls,
    rpc: async (fn, args) => {
      calls.push(`rpc:${fn}`);
      if (fn === "wingman_ledger_commit") {
        // Simulate migration 011's transaction: upsert every incoming row
        // and delete rows no longer in the incoming ledger, atomically.
        const incoming = args?.payload?.ledger ?? [];
        const incomingIds = new Set(incoming.map((row) => row.id));
        rows = rows.filter((row) => incomingIds.has(row.id));
        for (const row of incoming) {
          const index = rows.findIndex((existing) => existing.id === row.id);
          if (index >= 0) rows[index] = row;
          else rows.push(row);
        }
        return { error: null };
      }
      return { error: new Error(`unexpected rpc call: ${fn}`) };
    },
    from: () => {
      calls.push("from");
      return {
        select: () => {
          // supabase-js range-paging chain: select().range(from, to).order()
          let from = 0;
          let to = Number.MAX_SAFE_INTEGER;
          const api = {
            range: (start, end) => {
              from = start;
              to = end;
              return api;
            },
            order: async () => ({
              data: rows.slice(from, Math.min(to + 1, rows.length)).map((row) => ({ payload: row.payload })),
              error: null,
            }),
          };
          return api;
        },
        upsert: async (newRows) => {
          calls.push("upsert");
          for (const row of newRows) {
            const index = rows.findIndex((existing) => existing.id === row.id);
            if (index >= 0) rows[index] = row;
            else rows.push(row);
          }
          return { error: null };
        },
        delete: () => {
          calls.push("delete");
          return {
            in: async (column, ids) => {
              rows = rows.filter((row) => !ids.includes(row.id));
              return { error: null };
            },
          };
        },
      };
    },
  };
}

describe("Supabase write-through + cross-machine reads", () => {
  it("pushes an approval through to the Supabase mirror (write-through)", async () => {
    const client = fakeSupabaseClient();
    __setLedgerSupabaseClientForTests(client);
    process.env.WINGMAN_LEDGER_SYNC_MODE = "supabase";

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
      const mirrored = client.__rows().find((row) => row.id === "maker-SKU-1--closest-technical-match");
      expect(mirrored).toBeDefined();
      expect(mirrored.payload.reviewStatus).toBe("approved");
      expect(mirrored.payload.reviewer).toBe("A. Reviewer");
    });
  });

  it("approval pushes are row-scoped and never clobber another machine's approval", async () => {
    const client = fakeSupabaseClient();
    __setLedgerSupabaseClientForTests(client);
    process.env.WINGMAN_LEDGER_SYNC_MODE = "supabase";
    // The mirror already holds an approval from another machine (SKU-9) that
    // this machine's committed file does NOT contain. Approving SKU-1 must not
    // overwrite or drop it.
    client.__rows().push({
      id: "maker-SKU-9--approved",
      payload: fixtureDecision({
        id: "maker-SKU-9--approved",
        competitorSku: "SKU-9",
        reviewStatus: "approved",
        reviewer: "R. Remote",
        reviewedAt: "2026-08-16T02:00:00.000Z",
        evidence: [{ sourceUrl: "https://maker.example/sku-9", sourceType: "manufacturer" }],
      }),
    });

    await withTempLedgerFile(async (filePath) => {
      await saveCompetitorDecisionApproval(
        {
          competitorManufacturer: "Maker",
          competitorSku: "SKU-1",
          reviewer: "A. Reviewer",
          evidenceUrl: "https://maker.example/sku-1",
        },
        filePath,
      );

      const remoteBySku = new Map(client.__rows().map((row) => [row.payload.competitorSku, row.payload]));
      expect([...remoteBySku.keys()].sort()).toEqual(["SKU-1", "SKU-9"]);
      expect(remoteBySku.get("SKU-1").reviewStatus).toBe("approved");
      // The other machine's approval survives untouched.
      expect(remoteBySku.get("SKU-9").reviewStatus).toBe("approved");
      expect(remoteBySku.get("SKU-9").reviewer).toBe("R. Remote");
    });
  });

  it("serves remote approvals on reads so another machine's review is visible", async () => {
    const client = fakeSupabaseClient();
    __setLedgerSupabaseClientForTests(client);
    process.env.WINGMAN_LEDGER_SYNC_MODE = "supabase";
    // Seed the mirror with an approval NOT in the local committed file.
    client.__rows().push({
      id: "maker-SKU-9--approved",
      payload: fixtureDecision({
        id: "maker-SKU-9--approved",
        competitorSku: "SKU-9",
        reviewStatus: "approved",
        reviewer: "R. Remote",
        reviewedAt: "2026-08-16T02:00:00.000Z",
        evidence: [{ sourceUrl: "https://maker.example/sku-9", sourceType: "manufacturer" }],
      }),
    });

    await withTempLedgerFile(async (filePath) => {
      const result = await approvedCompetitorDecisions(filePath);
      expect(result.ok).toBe(true);
      const skus = result.decisions.map((decision) => decision.competitorSku).sort();
      expect(skus).toEqual(["SKU-3", "SKU-9"]);
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

describe("pushLedgerToSupabase - atomic mirror commit (migration 011)", () => {
  function ledgerFixture(decisionOverrides = {}) {
    return {
      version: 1,
      decisions: [
        fixtureDecision({
          id: "maker-SKU-1--closest-technical-match",
          competitorSku: "SKU-1",
          ...decisionOverrides.sku1,
        }),
        fixtureDecision({
          id: "maker-SKU-2--no-match",
          competitorSku: "SKU-2",
          decisionType: "no-technical-match",
          ...decisionOverrides.sku2,
        }),
      ],
    };
  }

  it("mirrors the whole ledger through ONE atomic RPC commit, stale-row delete included", async () => {
    const client = fakeSupabaseClient();
    // The mirror holds a third decision this machine's ledger no longer has;
    // the transaction must remove it while upserting the two pushed rows.
    client.__rows().push({
      id: "maker-SKU-9--approved",
      payload: fixtureDecision({
        id: "maker-SKU-9--approved",
        competitorSku: "SKU-9",
        reviewStatus: "approved",
      }),
      updated_at: "2026-08-16T02:00:00.000Z",
    });
    __setLedgerSupabaseClientForTests(client);

    const result = await pushLedgerToSupabase(ledgerFixture());

    expect(result.ok).toBe(true);
    expect(result.count).toBe(2);
    // Exactly one RPC commit and ZERO direct table reads/writes - the old
    // upsert -> read-back -> stale-delete choreography is gone.
    expect(client.__calls()).toEqual(["rpc:wingman_ledger_commit"]);
    // The mirror is exact: the two pushed rows present, SKU-9 gone.
    const ids = client.__rows().map((row) => row.id).sort();
    expect(ids).toEqual(["maker-SKU-1--closest-technical-match", "maker-SKU-2--no-match"]);
    expect(client.__rows().every((row) => typeof row.payload === "object")).toBe(true);
  });

  it("reconciles in one call even when the mirror has no stale rows", async () => {
    const client = fakeSupabaseClient();
    __setLedgerSupabaseClientForTests(client);

    const result = await pushLedgerToSupabase(ledgerFixture());

    expect(result.ok).toBe(true);
    expect(client.__calls()).toEqual(["rpc:wingman_ledger_commit"]);
    expect(client.__rows()).toHaveLength(2);
  });

  it("surfaces the RPC error instead of partially applying the mirror", async () => {
    const client = fakeSupabaseClient();
    __setLedgerSupabaseClientForTests(client);
    // Sabotage: make the rpc return an error; nothing must change in the mirror.
    const originalRpc = client.rpc;
    client.rpc = async () => ({ error: { message: "ledger commit denied" } });

    try {
      const result = await pushLedgerToSupabase(ledgerFixture());
      expect(result.ok).toBe(false);
      expect(result.error).toBe("ledger commit denied");
      expect(client.__rows()).toHaveLength(0);
    } finally {
      client.rpc = originalRpc;
    }
  });

  it("returns early without touching the mirror when the ledger is empty", async () => {
    const client = fakeSupabaseClient();
    __setLedgerSupabaseClientForTests(client);

    const result = await pushLedgerToSupabase({ version: 1, decisions: [] });
    expect(result.ok).toBe(true);
    expect(result.count).toBe(0);
    expect(client.__calls()).toEqual([]);
  });
});
