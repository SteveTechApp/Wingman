/**
 * Randomized invariant harness for the two-way ledger merge.
 *
 * mergeLedgers is the convergence primitive of the cross-machine approval
 * story: every identity on either side appears exactly once, human approvals
 * beat machine rows, and the newest review/update time breaks ties. Because
 * pickWinner always returns one of the two input rows wholesale (never a
 * field-level blend), every merged row is a verbatim copy of one of its
 * inputs - which is exactly what makes the drift gate hold: the gate re-runs
 * the engine per identity and compares to the stored outcome, so a merged row
 * with the same identity and the same engineSnapshot as its source row can
 * never flip an answer.
 *
 * The generator is seeded (mulberry32), so the suite is deterministic in CI
 * while still exercising thousands of arbitrary shapes, orderings and ties.
 * Real-ledger cases at the bottom pin the invariants against the committed
 * 299-row baseline.
 */

import { describe, expect, it } from "vitest";

import {
  mergeLedgers,
  readCommittedLedgerFile,
} from "./competitor-decision-ledger-store.mjs";

// ---------------------------------------------------------------------------
// Seeded PRNG + generators
// ---------------------------------------------------------------------------

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, rnd) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const TIMESTAMPS = [
  "2026-08-14T08:00:00.000Z",
  "2026-08-15T09:30:00.000Z",
  "2026-08-16T10:15:00.000Z",
  "2026-08-16T11:45:00.000Z",
];

const MANUFACTURERS = ["Maker", "barco", "Kramer", "Atlona", ""];
const SKUS = ["SKU-1", "CLICKSHARE-CX-30", "VS-42H", "MX-0808-SCL", ""];
const REVIEW_STATUSES = ["pending-review", "approved", "review-required"];

function randomDecision(rnd, overrides = {}) {
  const hasSnapshot = rnd() < 0.7;
  return {
    id: `dec-${Math.floor(rnd() * 1e6)}`,
    competitorManufacturer: MANUFACTURERS[Math.floor(rnd() * MANUFACTURERS.length)],
    competitorSku: SKUS[Math.floor(rnd() * SKUS.length)],
    wyrestormSku: rnd() < 0.8 ? "MX-0808-SCL" : null,
    decisionType: "closest-technical-match",
    reviewStatus: REVIEW_STATUSES[Math.floor(rnd() * REVIEW_STATUSES.length)],
    reviewer: rnd() < 0.3 ? "A. Reviewer" : null,
    reviewedAt: rnd() < 0.4 ? null : TIMESTAMPS[Math.floor(rnd() * TIMESTAMPS.length)],
    updatedAt: TIMESTAMPS[Math.floor(rnd() * TIMESTAMPS.length)],
    ...(rnd() < 0.3 ? { payload: { note: `blob-${Math.floor(rnd() * 1e3)}`, flag: rnd() < 0.5 } } : {}),
    ...(hasSnapshot
      ? {
          engineSnapshot: {
            decisionType: "closest-technical-match",
            wyrestormSku: "MX-0808-SCL",
            topSkus: ["MX-0808-SCL"],
            rating: Math.floor(rnd() * 100),
            comparableFields: Math.floor(rnd() * 8),
            verified: rnd() < 0.5,
          },
        }
      : {}),
    ...overrides,
  };
}

function randomLedger(rnd, { rows = 8, duplicates = 0 } = {}) {
  const decisions = [];
  for (let i = 0; i < rows; i += 1) {
    decisions.push(randomDecision(rnd));
  }
  for (let i = 0; i < duplicates; i += 1) {
    // Occasionally duplicate an identity within one side (malformed input):
    // the merge must still converge on a single row.
    decisions.push({ ...decisions[Math.floor(rnd() * decisions.length)] });
  }
  return {
    version: rnd() < 0.8 ? 1 : 2,
    updatedAt: TIMESTAMPS[Math.floor(rnd() * TIMESTAMPS.length)],
    decisions,
  };
}

function identityKey(decision) {
  const manufacturer = String(decision?.competitorManufacturer ?? "").trim().toLowerCase();
  const sku = String(decision?.competitorSku ?? "").trim().toUpperCase();
  return manufacturer && sku ? `${manufacturer}::${sku}` : "";
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const inputRowsByKey = (ledger) => {
  const map = new Map();
  for (const decision of ledger?.decisions ?? []) {
    const key = identityKey(decision);
    if (!key) continue;
    const rows = map.get(key) ?? [];
    rows.push(decision);
    map.set(key, rows);
  }
  return map;
};

// ---------------------------------------------------------------------------
// Invariants under arbitrary shuffles
// ---------------------------------------------------------------------------

const ITERATIONS = 400;

describe("mergeLedgers randomized invariants", () => {
  it("never loses an identity and never duplicates one", () => {
    const rnd = mulberry32(0x5eed1234);

    for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
      const local = randomLedger(rnd, { duplicates: rnd() < 0.15 ? 1 : 0 });
      const remote = randomLedger(rnd, { duplicates: rnd() < 0.15 ? 1 : 0 });
      const merged = mergeLedgers(
        { ...local, decisions: shuffle(local.decisions, rnd) },
        { ...remote, decisions: shuffle(remote.decisions, rnd) },
      );

      const expectedKeys = new Set([
        ...inputRowsByKey(local).keys(),
        ...inputRowsByKey(remote).keys(),
      ]);
      const mergedKeys = merged.decisions.map(identityKey);
      const seen = new Set();

      for (const key of mergedKeys) {
        expect(key, `iteration ${iteration}: empty identity leaked through`).not.toBe("");
        if (seen.has(key)) {
          throw new Error(`iteration ${iteration}: duplicate identity ${key} in merged output`);
        }
        seen.add(key);
        if (!expectedKeys.has(key)) {
          throw new Error(`iteration ${iteration}: unexpected identity ${key} in merged output`);
        }
      }

      for (const key of expectedKeys) {
        if (!seen.has(key)) {
          throw new Error(`iteration ${iteration}: identity ${key} was lost in the merge`);
        }
      }
    }
  });

  it("returns every merged row verbatim from one of its inputs (snapshot preservation => drift-gate equivalence)", () => {
    const rnd = mulberry32(0xabcde001);

    for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
      const local = randomLedger(rnd, { duplicates: rnd() < 0.15 ? 1 : 0 });
      const remote = randomLedger(rnd, { duplicates: rnd() < 0.15 ? 1 : 0 });
      const merged = mergeLedgers(local, remote);

      const localRows = inputRowsByKey(local);
      const remoteRows = inputRowsByKey(remote);

      for (const row of merged.decisions) {
        const key = identityKey(row);
        const candidates = [...(localRows.get(key) ?? []), ...(remoteRows.get(key) ?? [])];
        const source = candidates.find((candidate) => same(candidate, row));

        if (!source) {
          throw new Error(
            `iteration ${iteration}: merged row for ${key} is not a verbatim copy of any input row (field-level blending would break drift-gate equivalence)`,
          );
        }

        if (row.engineSnapshot && !same(row.engineSnapshot, source.engineSnapshot)) {
          throw new Error(
            `iteration ${iteration}: engineSnapshot for ${key} drifted away from its source row`,
          );
        }
      }
    }
  });

  it("lets a human approval on either side always win", () => {
    const rnd = mulberry32(0xdefaced0);

    for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
      const local = randomLedger(rnd);
      const remote = randomLedger(rnd);
      const merged = mergeLedgers(local, remote);
      const mergedByKey = new Map(merged.decisions.map((d) => [identityKey(d), d]));

      for (const key of inputRowsByKey(local).keys()) {
        const anyApproved = [...inputRowsByKey(local).get(key), ...(inputRowsByKey(remote).get(key) ?? [])]
          .some((row) => row.reviewStatus === "approved");

        if (anyApproved) {
          expect(
            mergedByKey.get(key).reviewStatus,
            `iteration ${iteration}: an approved row for ${key} lost to a non-approved row`,
          ).toBe("approved");
        }
      }
    }
  });

  it("is order-independent: arbitrary shuffles of both sides produce the identical ledger", () => {
    const rnd = mulberry32(0xf00dfeed);

    for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
      const local = randomLedger(rnd);
      const remote = randomLedger(rnd);

      const a = mergeLedgers(local, remote);
      const b = mergeLedgers(
        { ...local, decisions: shuffle(local.decisions, rnd) },
        { ...remote, decisions: shuffle(remote.decisions, rnd) },
      );
      const c = mergeLedgers(
        { ...remote, decisions: shuffle(remote.decisions, rnd) },
        { ...local, decisions: shuffle(local.decisions, rnd) },
      );

      expect(same(a, b), `iteration ${iteration}: shuffle changed the merge`).toBe(true);
      expect(same(a, c), `iteration ${iteration}: side swap changed the merge`).toBe(true);
    }
  });

  it("drops rows without a resolvable identity", () => {
    const rnd = mulberry32(0xbadc0de0);

    for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
      const local = randomLedger(rnd);
      const remote = randomLedger(rnd);
      local.decisions.push(
        randomDecision(rnd, { competitorManufacturer: "", competitorSku: "GHOST" }),
        randomDecision(rnd, { competitorManufacturer: "Ghost Maker", competitorSku: "" }),
      );
      remote.decisions.push(randomDecision(rnd, { competitorManufacturer: "", competitorSku: "" }));

      const merged = mergeLedgers(local, remote);

      for (const row of merged.decisions) {
        expect(identityKey(row), `iteration ${iteration}: identity-less row leaked through`).not.toBe("");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Real-ledger pins (committed 299-row baseline)
// ---------------------------------------------------------------------------

describe("mergeLedgers against the committed ledger", () => {
  it("is idempotent under a full shuffle of the committed baseline", async () => {
    const committed = await readCommittedLedgerFile();
    expect(committed).toBeTruthy();
    expect(committed.decisions.length).toBeGreaterThan(0);

    const rnd = mulberry32(0x29929929);
    const merged = mergeLedgers(
      committed,
      { ...committed, decisions: shuffle([...committed.decisions], rnd) },
    );
    const localOnly = mergeLedgers(committed, { version: 1, decisions: [] });

    expect(merged.decisions).toEqual(localOnly.decisions);
    expect(merged.updatedAt).toBe(localOnly.updatedAt);
    expect(merged.version).toBe(localOnly.version);
  });

  it("promotes a newly approved row and leaves every other row verbatim", async () => {
    const committed = await readCommittedLedgerFile();
    const pendingIndex = committed.decisions.findIndex((row) => row.reviewStatus !== "approved");
    expect(pendingIndex).toBeGreaterThanOrEqual(0);

    const approvedCopy = {
      ...committed.decisions[pendingIndex],
      reviewStatus: "approved",
      reviewer: "Invariant Harness",
      reviewedAt: "2026-08-16T23:59:59.000Z",
      updatedAt: "2026-08-16T23:59:59.000Z",
    };
    const local = { version: 1, decisions: [approvedCopy] };
    const merged = mergeLedgers(local, committed);
    const key = identityKey(approvedCopy);

    const mergedRow = merged.decisions.find((row) => identityKey(row) === key);
    expect(mergedRow).toEqual(approvedCopy);
    expect(mergedRow.reviewStatus).toBe("approved");

    for (const row of merged.decisions) {
      if (identityKey(row) === key) continue;
      const committedRow = committed.decisions.find((candidate) => identityKey(candidate) === identityKey(row));
      expect(row).toEqual(committedRow);
    }
  });

  it("keeps every engine snapshot byte-identical through a shuffled merge", async () => {
    const committed = await readCommittedLedgerFile();
    const rnd = mulberry32(0x5a57e12e);
    const merged = mergeLedgers(
      { ...committed, decisions: shuffle([...committed.decisions], rnd) },
      { ...committed, decisions: shuffle([...committed.decisions], rnd) },
    );

    const byKey = new Map(committed.decisions.map((row) => [identityKey(row), row]));
    expect(merged.decisions.length).toBe(committed.decisions.length);

    for (const row of merged.decisions) {
      const committedRow = byKey.get(identityKey(row));
      expect(row.engineSnapshot).toEqual(committedRow.engineSnapshot);
      expect(row.updatedAt).toBe(committedRow.updatedAt);
    }
  });
});
