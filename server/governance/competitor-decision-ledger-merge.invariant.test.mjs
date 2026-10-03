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

import fsp from "node:fs/promises";
import path from "node:path";

import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import {
  __setLedgerSupabaseClientForTests,
  mergeLedgers,
  readCommittedLedgerFile,
  readLedgerForApi,
  readLedgerFromSupabase,
  syncCompetitorDecisionLedger,
} from "./competitor-decision-ledger-store.mjs";
import { POSTGREST_PAGINATION_LIMIT, readAllSupabaseRows } from "../supabase-pagination.mjs";
import { COMPETITOR_DECISION_LEDGER_FILE } from "../catalog/files.mjs";

// The sync-level suites below drive syncCompetitorDecisionLedger through its
// SUCCESS path, which rewrites the committed ledger file. The full suite runs
// test files in parallel and other files READ the committed ledger (e.g. the
// competitorMatchDecisions snapshot gate), so a mid-run rewrite of the real
// file races those readers even with a perfect backup/restore. Redirect the
// ledger file to a per-run temp copy for this whole file: every test here -
// including the committed-baseline pins - sees byte-identical content, while
// the real file is never touched.
vi.mock("../catalog/files.mjs", async (importOriginal) => {
  const actual = await importOriginal();
  // The factory is hoisted above this file's top-level consts, so the mirror
  // path is computed here from dynamically imported built-ins. Everything
  // downstream (seeding, sync reads/writes) uses the exported
  // COMPETITOR_DECISION_LEDGER_FILE constant, so they agree by construction.
  const os = await import("node:os");
  const nodePath = await import("node:path");
  const LEDGER_FILE_MIRROR = nodePath.join(
    os.tmpdir(),
    `ledger-invariant-harness-${process.pid}-${Math.random().toString(36).slice(2)}`,
    "competitor-match-decisions.json",
  );
  return {
    ...actual,
    COMPETITOR_DECISION_LEDGER_FILE: LEDGER_FILE_MIRROR,
  };
});

// Resolved in beforeAll via vi.importActual (which bypasses the mock above).
let REAL_LEDGER_FILE = "";

// Seed the mirror before the FIRST test in this file runs (the committed-
// baseline pins read it too) and clean it up after the last.
beforeAll(async () => {
  // The REAL committed ledger path, resolved through vi.importActual (which
  // bypasses the mock above).
  ({ COMPETITOR_DECISION_LEDGER_FILE: REAL_LEDGER_FILE } = await vi.importActual("../catalog/files.mjs"));
  await fsp.mkdir(path.dirname(COMPETITOR_DECISION_LEDGER_FILE), { recursive: true });
  await fsp.copyFile(REAL_LEDGER_FILE, COMPETITOR_DECISION_LEDGER_FILE);
});

afterAll(async () => {
  await fsp.rm(path.dirname(COMPETITOR_DECISION_LEDGER_FILE), { recursive: true, force: true });
});

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

// ---------------------------------------------------------------------------
// Truncating-mirror sentinel (POSTGREST_PAGINATION_LIMIT)
// ---------------------------------------------------------------------------
//
// The convergence story only ends well if the mirror is read COMPLETELY. The
// committed baseline can exceed 299 rows on any machine, and the mirror can
// hold thousands; PostgREST answers at most 1000 rows per request, so a read
// that stops after one request sees a truncation it cannot detect. The store
// reads through readAllSupabaseRows, which pages until a short page proves
// exhaustion - and, when a pathological mirror NEVER reports a short page,
// trips the POSTGREST_PAGINATION_LIMIT safety valve instead of returning a
// dataset that merely looks complete. These tests drive that sentinel through
// the real seam: a truncating mirror must abort the sync and the API read
// before the merge ever sees it, because a merged ledger built from the
// visible slice of a truncating mirror would converge straight into a
// data-loss push (wingman_ledger_commit deletes every row not in the pushed
// ledger).

function truncatingMirrorClient({ rows: count = 1500, pageSize = 1000 } = {}) {
  const mirror = [];
  for (let i = 0; i < count; i += 1) {
    const id = `sentinel-mirror-${String(i).padStart(4, "0")}`;
    mirror.push({
      id,
      updated_at: "2026-09-01T00:00:00.000Z",
      payload: {
        id,
        competitorManufacturer: "Mirror Sentinel",
        competitorSku: `SENTINEL-${String(i).padStart(4, "0")}`,
        decisionType: "closest-technical-match",
        reviewStatus: "pending-review",
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
    });
  }
  const windows = [];
  let rpcCalls = 0;
  const client = {
    __mirrorRows: () => mirror,
    __windows: () => windows,
    __rpcCalls: () => rpcCalls,
    from: () => ({
      select: () => {
        let from = 0;
        const api = {
          range: (start) => {
            from = start;
            return api;
          },
          order: async () => {
            // The sentinel: answer EVERY window with a full pageSize page,
            // however far the reader pages, so a short page is never observed
            // and readAllSupabaseRows must stop at its maxPages safety valve
            // with POSTGREST_PAGINATION_LIMIT rather than report a complete
            // read. Content is cycled - it never reaches a commit anyway.
            windows.push(from);
            const data = Array.from({ length: pageSize }, (_, k) => mirror[(from + k) % mirror.length]);
            return { data, error: null };
          },
        };
        return api;
      },
    }),
    rpc: async () => {
      rpcCalls += 1;
      return { error: null };
    },
  };
  return client;
}

describe("truncating-mirror sentinel (POSTGREST_PAGINATION_LIMIT)", () => {
  let previousSyncMode;

  beforeEach(() => {
    previousSyncMode = process.env.WINGMAN_LEDGER_SYNC_MODE;
    process.env.WINGMAN_LEDGER_SYNC_MODE = "supabase";
  });

  afterEach(() => {
    __setLedgerSupabaseClientForTests(null);
    if (previousSyncMode === undefined) delete process.env.WINGMAN_LEDGER_SYNC_MODE;
    else process.env.WINGMAN_LEDGER_SYNC_MODE = previousSyncMode;
  });

  it("readLedgerFromSupabase surfaces the truncation as a hard error, never a partial remote", async () => {
    const client = truncatingMirrorClient();
    __setLedgerSupabaseClientForTests(client);

    const result = await readLedgerFromSupabase();

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/did not reach the end of the table/);
    expect(result.error).toMatch(/without reporting a short page/);
    // Callers key off the propagated sentinel code, not message text.
    expect(result.errorCode).toBe(POSTGREST_PAGINATION_LIMIT);
    // The read paged past the cap instead of trusting one response: 100
    // full-page windows (maxPages) all came back non-short.
    expect(client.__windows().length).toBeGreaterThan(1);

    // The code-level pin: the exact sentinel that stopped the read is
    // POSTGREST_PAGINATION_LIMIT, so a caller can tell truncation apart from
    // a genuinely complete (short-page-terminated) read.
    const direct = await readAllSupabaseRows(client, "competitor_match_decisions", {
      select: "payload",
      order: "id",
    });
    expect(direct.error?.code).toBe("POSTGREST_PAGINATION_LIMIT");
    expect(direct.truncated).toBe(true);
  });

  it("syncCompetitorDecisionLedger refuses to push when the mirror read truncates", async () => {
    const client = truncatingMirrorClient();
    __setLedgerSupabaseClientForTests(client);
    const before = await readCommittedLedgerFile();

    const result = await syncCompetitorDecisionLedger();

    expect(result.ok).toBe(false);
    expect(result.mode).toBe("error");
    expect(result.error).toMatch(/did not reach the end of the table/);
    // The sync surface propagates the sentinel code for programmatic triage.
    expect(result.errorCode).toBe(POSTGREST_PAGINATION_LIMIT);
    // The mirror commit (the only thing that can delete rows) was never
    // invoked: a truncating mirror cannot converge into a data-loss push.
    expect(client.__rpcCalls()).toBe(0);
    // And the committed file - the durable record - was left byte-identical.
    const after = await readCommittedLedgerFile();
    expect(after).toEqual(before);
  });

  it("readLedgerForApi falls back to the committed file rather than merging a truncation", async () => {
    const client = truncatingMirrorClient();
    __setLedgerSupabaseClientForTests(client);
    const local = await readCommittedLedgerFile();

    const result = await readLedgerForApi();

    expect(result.mode).toBe("file-db-fallback");
    expect(result.ledger).toEqual(local);
    expect(result.warnings.join(" ")).toMatch(/did not reach the end of the table/);
    expect(result.errorCode).toBe(POSTGREST_PAGINATION_LIMIT);
    expect(client.__rpcCalls()).toBe(0);
  });

  it("the refusal is load-bearing: a push built from the visible slice of a truncating mirror deletes the tail", async () => {
    // Merge-math demonstration with wingman_ledger_commit's real semantics.
    // A truncating mirror exposes only its first 1000 rows; if that visible
    // slice were merged and pushed (the pre-guard behaviour), the commit
    // reconciles the table to the pushed ledger and the 500-row tail dies.
    const client = truncatingMirrorClient();
    const mirror = client.__mirrorRows();
    const local = await readCommittedLedgerFile();
    // readLedgerFromSupabase maps table rows to their payload before merging;
    // a truncating read exposes exactly the first 1000 payloads.
    const visible = mirror.slice(0, 1000).map((row) => row.payload);
    const tail = mirror.slice(1000).map((row) => row.payload);

    const merged = mergeLedgers(local ?? { version: 1, decisions: [] }, { version: 1, decisions: visible });

    // The merge cannot conjure the tail back: those identities existed only
    // past the truncation cut and nowhere in the committed baseline.
    for (const decision of tail) {
      const key = identityKey(decision);
      expect(key).not.toBe("");
      expect(merged.decisions.some((candidate) => identityKey(candidate) === key)).toBe(false);
    }

    // Reconcile a simulated mirror DB exactly like wingman_ledger_commit:
    // keep rows whose id is in the pushed ledger, delete the rest.
    const kept = new Set(merged.decisions.map((decision) => decision.id).filter(Boolean));
    const deleted = mirror.filter((row) => !kept.has(row.id));
    const head = mirror.slice(0, 1000);

    expect(head.every((row) => kept.has(row.id))).toBe(true); // head survives
    expect(deleted.length).toBe(tail.length); // the whole 500-row tail is deleted
    expect(tail.every((decision) => deleted.some((gone) => gone.id === decision.id))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Randomized merge coverage ABOVE the PostgREST cap (>1000 rows)
// ---------------------------------------------------------------------------
//
// Every randomized invariant above runs at ~8-row sizes, and the
// truncating-mirror suite proves only that a truncating read is REFUSED.
// Nothing yet exercises the convergence story at mirror sizes the cap
// actually binds: a healthy >1000-row mirror needs readAllSupabaseRows to
// page (full page, then a short page) before the merge even sees the data,
// and the merged/pushed ledger must round-trip that size end to end.
// narrowIdentityPool exists because the shared randomDecision pool
// (5 manufacturers x 5 SKUs) collapses to ~25 identities - useless at sizes
// where identity breadth is the point. The sync-level tests back up and
// restore the committed ledger file, since a successful sync rewrites it.

const ABOVE_CAP_ROWS = 1200;

function poolRow(rnd, prefix, i) {
  return {
    id: `${prefix}-${String(i).padStart(5, "0")}`,
    competitorManufacturer: "Pool Maker",
    competitorSku: `${prefix.toUpperCase()}-${String(i).padStart(5, "0")}`,
    decisionType: "closest-technical-match",
    reviewStatus: REVIEW_STATUSES[Math.floor(rnd() * REVIEW_STATUSES.length)],
    reviewer: rnd() < 0.3 ? "A. Reviewer" : null,
    reviewedAt: rnd() < 0.4 ? null : TIMESTAMPS[Math.floor(rnd() * TIMESTAMPS.length)],
    updatedAt: TIMESTAMPS[Math.floor(rnd() * TIMESTAMPS.length)],
    engineSnapshot: {
      decisionType: "closest-technical-match",
      wyrestormSku: "MX-0808-SCL",
      topSkus: ["MX-0808-SCL"],
      rating: Math.floor(rnd() * 100),
      comparableFields: Math.floor(rnd() * 8),
      verified: rnd() < 0.5,
    },
  };
}

function healthyAboveCapMirrorClient(rows) {
  // A HEALTHY large mirror: pages of exactly pageSize rows until the final
  // short page proves exhaustion - the shape readAllSupabaseRows must page
  // past the 1000-row PostgREST cap without ever tripping its valve. The
  // cap crossing sits deliberately between page 1 (rows 0..999) and page 2
  // (rows 1000.., short).
  const mirror = [];
  for (let i = 0; i < rows; i += 1) {
    const id = `above-cap-mirror-${String(i).padStart(5, "0")}`;
    mirror.push({
      id,
      updated_at: "2026-09-01T00:00:00.000Z",
      payload: {
        id,
        competitorManufacturer: "Above Cap",
        competitorSku: `ABOVECAP-${String(i).padStart(5, "0")}`,
        decisionType: "closest-technical-match",
        reviewStatus: "pending-review",
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
    });
  }
  const windows = [];
  let rpcCalls = 0;
  let rpcRowCount = 0;
  const client = {
    __mirrorRows: () => mirror,
    __windows: () => windows,
    __rpcCalls: () => rpcCalls,
    __rpcRowCount: () => rpcRowCount,
    from: () => ({
      select: () => {
        let from = 0;
        const api = {
          range: (start) => {
            from = start;
            return api;
          },
          order: async () => {
            windows.push(from);
            const data = mirror.slice(from, from + 1000);
            return { data, error: null };
          },
        };
        return api;
      },
    }),
    rpc: async (_fn, { payload } = {}) => {
      rpcCalls += 1;
      rpcRowCount = Array.isArray(payload?.ledger) ? payload.ledger.length : 0;
      return { error: null };
    },
  };
  return client;
}

describe("mergeLedgers above the PostgREST cap (>1000 rows)", () => {
  it("keeps every invariant at above-cap sizes: no identity lost, none duplicated, rows verbatim, approvals win, order-independent", () => {
    const rnd = mulberry32(0xca100000);

    for (let iteration = 0; iteration < 12; iteration += 1) {
      // Three disjoint identity pools: local-only head, shared middle
      // (present on both sides), remote-only tail past the cap - so neither
      // side alone holds the full identity set and the merge must union them.
      const localOnly = Array.from({ length: 400 }, (_, i) => poolRow(rnd, "poola", i));
      const shared = Array.from({ length: 500 }, (_, i) => poolRow(rnd, "poolb", i));
      const remoteOnly = Array.from({ length: 300 }, (_, i) => poolRow(rnd, "poolc", i));
      // Seed conflicting winners on the shared pool: every 9th remote row is
      // a human approval while its local twin is pending - the merged row
      // must carry the approval, verbatim.
      const remoteShared = shared.map((row, i) =>
        i % 9 === 0
          ? { ...row, reviewStatus: "approved", reviewer: "A. Reviewer", reviewedAt: "2026-08-16T11:45:00.000Z" }
          : row,
      );

      const local = { version: 1, updatedAt: TIMESTAMPS[0], decisions: [...localOnly, ...shared] };
      const remote = { version: 1, updatedAt: TIMESTAMPS[1], decisions: [...remoteShared, ...remoteOnly] };
      const merged = mergeLedgers(
        { ...local, decisions: shuffle(local.decisions, rnd) },
        { ...remote, decisions: shuffle(remote.decisions, rnd) },
      );

      const expectedKeys = new Set([
        ...inputRowsByKey(local).keys(),
        ...inputRowsByKey(remote).keys(),
      ]);
      expect(expectedKeys.size, `iteration ${iteration}: fixture identity breadth`).toBe(1200);
      expect(merged.decisions.length, `iteration ${iteration}: one row per identity`).toBe(1200);

      const mergedRowsByKey = new Map();
      for (const row of merged.decisions) {
        const key = identityKey(row);
        expect(key, `iteration ${iteration}: empty identity leaked through`).not.toBe("");
        expect(mergedRowsByKey.has(key), `iteration ${iteration}: duplicate identity ${key}`).toBe(false);
        mergedRowsByKey.set(key, row);
        expect(expectedKeys.has(key), `iteration ${iteration}: unexpected identity ${key}`).toBe(true);
      }
      for (const key of expectedKeys) {
        expect(mergedRowsByKey.has(key), `iteration ${iteration}: identity ${key} was lost`).toBe(true);
      }

      // Verbatim + approved-wins, per identity.
      const localRows = inputRowsByKey(local);
      const remoteRows = inputRowsByKey(remote);
      for (const [key, row] of mergedRowsByKey) {
        const candidates = [...(localRows.get(key) ?? []), ...(remoteRows.get(key) ?? [])];
        const source = candidates.find((candidate) => same(candidate, row));
        expect(source, `iteration ${iteration}: merged row ${key} is not verbatim from any input`).toBeDefined();
        if ((remoteRows.get(key) ?? localRows.get(key) ?? []).some((candidate) => candidate.reviewStatus === "approved")) {
          expect(row.reviewStatus, `iteration ${iteration}: approval for ${key} lost`).toBe("approved");
        }
      }

      // Order independence at size: shuffles and side swaps converge to the
      // identical ledger.
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
});

describe("healthy above-cap mirror through the real sync seam", () => {
  let previousSyncMode;

  beforeEach(() => {
    previousSyncMode = process.env.WINGMAN_LEDGER_SYNC_MODE;
    process.env.WINGMAN_LEDGER_SYNC_MODE = "supabase";
  });

  afterEach(() => {
    __setLedgerSupabaseClientForTests(null);
    if (previousSyncMode === undefined) delete process.env.WINGMAN_LEDGER_SYNC_MODE;
    else process.env.WINGMAN_LEDGER_SYNC_MODE = previousSyncMode;
  });

  it("pages past the cap and converges end to end at above-cap sizes", async () => {
    const client = healthyAboveCapMirrorClient(ABOVE_CAP_ROWS);
    __setLedgerSupabaseClientForTests(client);

    // COMPETITOR_DECISION_LEDGER_FILE is redirected to a temp copy of the
    // committed baseline for this whole file (see the vi.mock above), so the
    // successful sync's rewrite stays off the real file.
    const local = JSON.parse(await fsp.readFile(COMPETITOR_DECISION_LEDGER_FILE, "utf8"));
    const localKeys = new Set((local?.decisions ?? []).map(identityKey));

    const result = await syncCompetitorDecisionLedger();

    expect(result.ok).toBe(true);
    expect(result.mode).toBe("merged");

    // The read paged past the cap: one full 1000-row window, then a short
    // one proving exhaustion - the POSTGREST_PAGINATION_LIMIT valve never
    // fired.
    expect(client.__windows()).toEqual([0, 1000]);

    // The merged ledger holds the committed baseline PLUS every above-cap
    // mirror identity, exactly once each.
    expect(result.merged.decisions.length).toBe(localKeys.size + ABOVE_CAP_ROWS);
    const keys = new Set(result.merged.decisions.map(identityKey));
    expect(keys.size).toBe(result.merged.decisions.length);
    for (const row of client.__mirrorRows()) {
      expect(keys.has(identityKey(row.payload))).toBe(true);
    }

    // The push carried the FULL merged ledger (baseline + 1200) to the
    // commit RPC - not just the visible first page.
    expect(client.__rpcCalls()).toBe(1);
    expect(client.__rpcRowCount()).toBe(result.merged.decisions.length);
  });

  it("boundary sizes at and just past the cap page to a provably complete read", async () => {
    for (const size of [999, 1000, 1001, 1200]) {
      const client = healthyAboveCapMirrorClient(size);
      __setLedgerSupabaseClientForTests(client);

      const read = await readLedgerFromSupabase();

      expect(read.ok, `size ${size}: read succeeds`).toBe(true);
      expect(read.decisions.length, `size ${size}: every row survives`).toBe(size);
      const expectedWindows = Math.floor((size - 1) / 1000) + 1 + (size % 1000 === 0 ? 1 : 0);
      expect(client.__windows().length, `size ${size}: window count`).toBe(expectedWindows);
    }
  });
});
