import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The 413-style hardening story, on the write side: the API rejects oversized
// JSON bodies (413), the read side refuses a table it cannot page to the end
// (POSTGREST_PAGINATION_LIMIT), and migration 011's wingman_ledger_commit must
// reject an oversized mirror payload the same way - a bloated ledger would
// otherwise be posted as a doomed multi-MB RPC (or be silently half-served),
// failing far from the real cause. The store pre-flights the exact serialized
// body before the RPC; the SQL raises the same ceiling for direct callers.
// This suite pins both layers and their lockstep.
//
// NOTE: paths must be built from fileURLToPath(import.meta.url), not
// `new URL(relative, import.meta.url)` - vite rewrites that asset-URL pattern
// to the dev-server base and fileURLToPath then throws.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", ".."); // server/governance -> repo root

describe("migration 011 ledger RPC oversized-payload rejection", () => {
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

  it("refuses an oversized mirror before the RPC ever fires (write-path 413 analogue)", async () => {
    process.env.WINGMAN_LEDGER_COMMIT_MAX_BYTES = "4096";
    vi.resetModules();

    let rpcCalled = 0;
    const store = await import("./competitor-decision-ledger-store.mjs");
    store.__setLedgerSupabaseClientForTests({
      rpc: async () => {
        rpcCalled += 1;
        return { error: null };
      },
    });

    // ~30 rows x ~430 bytes serialized = well over the 4 KiB test cap.
    const decisions = Array.from({ length: 30 }, (_, i) => decisionRow(i));
    const result = await store.pushLedgerToSupabase({ version: 1, decisions });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("LEDGER_PAYLOAD_TOO_LARGE");
    expect(result.bytes).toBeGreaterThan(4096);
    expect(result.error).toMatch(/wingman_ledger_commit/);
    expect(result.error).toMatch(/4096/);
    expect(result.error).toMatch(/413/);
    expect(rpcCalled).toBe(0);
  });

  it("a mirror under the ceiling still mirrors through the RPC unchanged", async () => {
    delete process.env.WINGMAN_LEDGER_COMMIT_MAX_BYTES;
    vi.resetModules();

    let rpcFn = null;
    const store = await import("./competitor-decision-ledger-store.mjs");
    store.__setLedgerSupabaseClientForTests({
      rpc: async (fn) => {
        rpcFn = fn;
        return { error: null };
      },
    });

    const result = await store.pushLedgerToSupabase({
      version: 1,
      decisions: [decisionRow(1), decisionRow(2)],
    });

    expect(result.ok).toBe(true);
    expect(result.count).toBe(2);
    expect(rpcFn).toBe("wingman_ledger_commit");
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
  });

  it("migration 011 (server + supabase copies) and the store share one 8388608 ceiling", async () => {
    const serverSql = fs.readFileSync(path.join(repoRoot, "server", "migrations", "011_atomic_ledger_snapshot.sql"), "utf8");
    const supabaseSql = fs.readFileSync(path.join(repoRoot, "supabase", "migrations", "20260902_atomic_ledger_snapshot.sql"), "utf8");

    // Mirrors must not drift: the parity gate compares the two trees.
    expect(serverSql).toBe(supabaseSql);
    expect(serverSql).toMatch(/octet_length\(payload::text\) > 8388608/);
    expect(serverSql).toMatch(/wingman_ledger_commit payload too large \(413\)/);
    expect(serverSql).toMatch(/shrink the mirror or sync in shards/);

    const store = await import("./competitor-decision-ledger-store.mjs");
    expect(store.LEDGER_COMMIT_MAX_PAYLOAD_BYTES).toBe(8_388_608);
  });
});
