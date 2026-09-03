import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The 413-style hardening story, on the write side: the API rejects oversized
// JSON bodies (413), the read side refuses a table it cannot page to the end
// (POSTGREST_PAGINATION_LIMIT), and migration 011/012's wingman_ledger_commit
// must reject an oversized mirror payload the same way - a bloated ledger would
// otherwise be posted as a doomed multi-MB RPC (or be silently half-served),
// failing far from the real cause. Rather than refusing WHOLESALE, migration
// 012 lets the store push an oversized mirror in shards: N mode='upsert' calls
// (each below the ceiling, never deleting) followed by ONE mode='reconcile'
// call with the full id list that removes stale rows atomically. This suite
// pins the shard math, the wire shape, the store protocol, and the lockstep
// of the SQL ceiling with the store default.
//
// NOTE: paths must be built from fileURLToPath(import.meta.url), not
// `new URL(relative, import.meta.url)` - vite rewrites that asset-URL pattern
// to the dev-server base and fileURLToPath then throws.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", ".."); // server/governance -> repo root

describe("migration 011/012 ledger RPC oversized-payload handling", () => {
  afterEach(() => {
    delete process.env.WINGMAN_LEDGER_COMMIT_MAX_BYTES;
    vi.resetModules();
  });

  function decisionRow(index) {
    return {
      id: `maker-SKU-${index}--closest-technical-match`,
      competitorManufacturer: "Maker",
      competitorSku: `SKU-${index}`,
      reviewStatus: "approved",
      reviewedAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      recommendationSummary:
        "A deliberately padded free-text field so the fixture row is large enough to trip a small test cap without thousands of rows.",
    };
  }

  // A fake that simulates migration 012's mode semantics: 'upsert' adds or
  // refreshes rows and never deletes; 'reconcile' deletes rows whose id is not
  // in the incoming list and never writes. 'full' (default) does both.
  function makeModeAwareClient() {
    const rows = [];
    const rpcCalls = [];
    return {
      __rows: () => rows,
      __calls: () => rpcCalls,
      rpc: async (fn, args) => {
        rpcCalls.push({ fn, args });
        if (fn !== "wingman_ledger_commit") return { error: new Error(`unexpected rpc: ${fn}`) };
        const mode = args?.mode ?? "full";
        const incoming = Array.isArray(args?.payload?.ledger) ? args.payload.ledger : [];
        const incomingIds = new Set(incoming.map((row) => row.id));
        if (mode === "full" || mode === "reconcile") {
          for (let i = rows.length - 1; i >= 0; i -= 1) {
            if (!incomingIds.has(rows[i].id)) rows.splice(i, 1);
          }
        }
        if (mode === "full" || mode === "upsert") {
          for (const row of incoming) {
            const index = rows.findIndex((existing) => existing.id === row.id);
            if (index >= 0) rows[index] = row;
            else rows.push(row);
          }
        }
        return { error: null };
      },
    };
  }

  it("pushes an oversized mirror in shards below the ceiling, then reconciles stale rows once", async () => {
    process.env.WINGMAN_LEDGER_COMMIT_MAX_BYTES = "4096";
    vi.resetModules();

    const client = makeModeAwareClient();
    // Seed the mirror with a stale row this machine's ledger no longer has.
    client.__rows().push({
      id: "maker-SKU-999--approved",
      payload: decisionRow(999),
      updated_at: "2026-09-01T00:00:00.000Z",
    });

    const store = await import("./competitor-decision-ledger-store.mjs");
    store.__setLedgerSupabaseClientForTests(client);

    // ~30 rows x ~430 bytes serialized = well over the 4 KiB test cap.
    const decisions = Array.from({ length: 30 }, (_, i) => decisionRow(i));
    const result = await store.pushLedgerToSupabase({ version: 1, decisions });

    expect(result.ok).toBe(true);
    expect(result.count).toBe(30);
    expect(result.sharded).toBe(true);
    expect(result.shardCount).toBeGreaterThan(1);

    // Every RPC was wingman_ledger_commit; shards are upsert-only and the last
    // call is the id-only reconcile.
    const calls = client.__calls();
    expect(calls.length).toBe(result.shardCount + 1);
    expect(calls.every((call) => call.fn === "wingman_ledger_commit")).toBe(true);
    for (let i = 0; i < result.shardCount; i += 1) {
      expect(calls[i].args.mode).toBe("upsert");
      const bodyBytes = Buffer.byteLength(JSON.stringify(calls[i].args));
      expect(bodyBytes).toBeLessThanOrEqual(4096);
      // Upsert shards must never carry the delete phase's id list shape alone.
      expect(calls[i].args.payload.ledger.length).toBeGreaterThan(0);
    }
    const reconcile = calls[calls.length - 1];
    expect(reconcile.args.mode).toBe("reconcile");
    expect(reconcile.args.payload.ledger).toHaveLength(30);
    expect(reconcile.args.payload.ledger.every((row) => Object.keys(row).length === 1 && row.id)).toBe(true);
    expect(Buffer.byteLength(JSON.stringify(reconcile.args))).toBeLessThanOrEqual(4096);

    // The mirror is exact: the 30 pushed rows present, the stale SKU-999 gone.
    const ids = client.__rows().map((row) => row.id).sort();
    expect(ids).toHaveLength(30);
    expect(ids).not.toContain("maker-SKU-999--approved");
    expect(client.__rows().every((row) => typeof row.payload === "object")).toBe(true);
  });

  it("a mirror under the ceiling still mirrors through a single full RPC unchanged", async () => {
    delete process.env.WINGMAN_LEDGER_COMMIT_MAX_BYTES;
    vi.resetModules();

    let rpcFn = null;
    let rpcArgs = null;
    const store = await import("./competitor-decision-ledger-store.mjs");
    store.__setLedgerSupabaseClientForTests({
      rpc: async (fn, args) => {
        rpcFn = fn;
        rpcArgs = args;
        return { error: null };
      },
    });

    const result = await store.pushLedgerToSupabase({
      version: 1,
      decisions: [decisionRow(1), decisionRow(2)],
    });

    expect(result.ok).toBe(true);
    expect(result.count).toBe(2);
    expect(result.sharded).toBeUndefined();
    expect(rpcFn).toBe("wingman_ledger_commit");
    // No mode key: the call still uses migration 011's default 'full' shape.
    expect(rpcArgs.mode).toBeUndefined();
    expect(rpcArgs.payload.ledger).toHaveLength(2);
  });

  it("refuses only when a SINGLE row alone exceeds the ceiling (nothing to shard)", async () => {
    process.env.WINGMAN_LEDGER_COMMIT_MAX_BYTES = "1024";
    vi.resetModules();

    let rpcCalled = 0;
    const store = await import("./competitor-decision-ledger-store.mjs");
    store.__setLedgerSupabaseClientForTests({
      rpc: async () => {
        rpcCalled += 1;
        return { error: null };
      },
    });

    // One row with a huge recommendation summary is alone over the 1 KiB cap.
    const huge = decisionRow(1);
    huge.recommendationSummary = "x".repeat(4096);
    const result = await store.pushLedgerToSupabase({ version: 1, decisions: [huge] });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("LEDGER_PAYLOAD_TOO_LARGE");
    expect(rpcCalled).toBe(0);
  });

  it("boundary math: serialized-body bytes at the cap pass, one byte over is refused", async () => {
    const store = await import("./competitor-decision-ledger-store.mjs");
    const rows = [{ id: "maker-SKU-1--closest-technical-match", payload: decisionRow(1), updated_at: decisionRow(1).updatedAt }];
    const bytes = store.ledgerCommitPayloadBytes(rows);

    // The helper measures the exact body the client posts: {"payload":{"ledger":[...]}}
    expect(bytes).toBe(Buffer.byteLength(JSON.stringify({ payload: { ledger: rows } })));
    expect(store.ledgerCommitPayloadTooLargeError(rows, bytes)).toBeNull();
    expect(store.ledgerCommitPayloadTooLargeError(rows, bytes - 1)).toMatchObject({
      bytes,
      maxBytes: bytes - 1,
    });
    // No rows: nothing to refuse (the store returns count 0 before the guard).
    expect(store.ledgerCommitPayloadTooLargeError([], bytes)).toBeNull();
  });

  it("shard math: shards fit under the cap, the mode key counts, and a lone oversized row yields null", async () => {
    const store = await import("./competitor-decision-ledger-store.mjs");
    const rows = [1, 2, 3, 4, 5].map((index) => ({
      id: `maker-SKU-${index}--closest-technical-match`,
      payload: decisionRow(index),
      updated_at: decisionRow(index).updatedAt,
    }));

    // The shard wire shape includes the mode key: rpc(fn, {payload, mode:"upsert"}).
    for (const row of rows) {
      expect(store.ledgerCommitShardBodyBytes([row])).toBe(
        Buffer.byteLength(JSON.stringify({ payload: { ledger: [row] }, mode: "upsert" })),
      );
    }

    // With a cap that fits exactly two rows, greedy packing yields ceil(5/2)=3
    // shards and every shard's wire body is at or under the cap.
    const twoRows = store.ledgerCommitShardBodyBytes([rows[0], rows[1]]);
    const shards = store.ledgerCommitShards(rows, twoRows);
    expect(shards).not.toBeNull();
    expect(shards.length).toBe(3);
    for (const shard of shards) {
      expect(store.ledgerCommitShardBodyBytes(shard)).toBeLessThanOrEqual(twoRows);
    }
    expect([...shards[0], ...shards[1], ...shards[2]].map((row) => row.id)).toEqual(rows.map((row) => row.id));

    // A single row alone over the cap: nothing can be sharded.
    const hugeRow = { id: "maker-SKU-1--closest-technical-match", payload: decisionRow(1), updated_at: decisionRow(1).updatedAt };
    const hugeBytes = store.ledgerCommitShardBodyBytes([hugeRow]);
    expect(store.ledgerCommitShards(rows, hugeBytes - 1)).toBeNull();
  });

  it("a realistic full mirror sits comfortably under the shared ceiling", async () => {
    const ledgerPath = path.join(repoRoot, "data", "governance", "competitor-match-decisions.json");
    const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
    const store = await import("./competitor-decision-ledger-store.mjs");
    const rows = (ledger.decisions ?? [])
      .filter((decision) => decision && typeof decision === "object")
      .map((decision) => ({
        id: String(decision.id ?? "").trim(),
        payload: decision,
        updated_at: String(decision.updatedAt ?? "") || new Date().toISOString(),
      }));
    expect(rows.length).toBeGreaterThan(0);
    const bytes = store.ledgerCommitPayloadBytes(rows);
    expect(bytes).toBeLessThan(store.LEDGER_COMMIT_MAX_PAYLOAD_BYTES);
    expect(store.ledgerCommitPayloadTooLargeError(rows)).toBeNull();
    // Even if greedily packed for a hypothetical shard push, no shard the
    // realistic mirror can produce would violate the ceiling.
    const packed = store.ledgerCommitShards(rows, store.LEDGER_COMMIT_MAX_PAYLOAD_BYTES);
    if (packed) {
      for (const shard of packed) {
        expect(store.ledgerCommitShardBodyBytes(shard)).toBeLessThanOrEqual(store.LEDGER_COMMIT_MAX_PAYLOAD_BYTES);
      }
    }
  });

  it("migrations 011 + 012 (server + supabase copies) and the store share one 8388608 ceiling", async () => {
    const readSql = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");
    const server011 = readSql(path.join("server", "migrations", "011_atomic_ledger_snapshot.sql"));
    const supabase011 = readSql(path.join("supabase", "migrations", "20260902_atomic_ledger_snapshot.sql"));
    const server012 = readSql(path.join("server", "migrations", "012_atomic_ledger_sharded_commit.sql"));
    const supabase012 = readSql(path.join("supabase", "migrations", "20260903_atomic_ledger_sharded_commit.sql"));

    // Mirrors must not drift: the parity gate compares the two trees.
    expect(server011).toBe(supabase011);
    expect(server012).toBe(supabase012);
    expect(server011).toMatch(/octet_length\(payload::text\) > 8388608/);
    expect(server011).toMatch(/wingman_ledger_commit payload too large \(413\)/);
    expect(server011).toMatch(/shrink the mirror or sync in shards/);
    // 012 keeps the ceiling, drops the old one-arg signature, and adds the
    // mode parameter with the same 413-style ceiling on every mode.
    expect(server012).toMatch(/drop function if exists public\.wingman_ledger_commit\(jsonb\)/);
    expect(server012).toMatch(/mode text default 'full'/);
    expect(server012).toMatch(/mode not in \('full', 'upsert', 'reconcile'\)/);
    expect(server012).toMatch(/octet_length\(payload::text\) > 8388608/);

    const store = await import("./competitor-decision-ledger-store.mjs");
    expect(store.LEDGER_COMMIT_MAX_PAYLOAD_BYTES).toBe(8_388_608);
  });
});