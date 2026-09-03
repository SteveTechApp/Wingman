import { afterEach, describe, expect, it, vi } from "vitest";

// Migration 011's wingman_ledger_commit hard-codes
// public.competitor_match_decisions, so with a custom
// SUPABASE_COMPETITOR_DECISIONS_TABLE the full-mirror RPC would reconcile the
// default table while reads address the custom one - a sync that reports
// success without touching the configured mirror. The push must refuse the
// override loudly. The TABLE constant is captured at module load, so each
// test stubs the env and imports a fresh module instance.
describe("competitor-decision-ledger-store table override guard", () => {
  afterEach(() => {
    delete process.env.SUPABASE_COMPETITOR_DECISIONS_TABLE;
    vi.resetModules();
  });

  it("refuses the atomic mirror commit when a custom table is configured, without calling the RPC", async () => {
    process.env.SUPABASE_COMPETITOR_DECISIONS_TABLE = "custom_decision_mirror";
    vi.resetModules();

    let rpcCalled = false;
    const store = await import("./competitor-decision-ledger-store.mjs");
    store.__setLedgerSupabaseClientForTests({
      rpc: async () => {
        rpcCalled = true;
        return { error: null };
      },
    });

    const result = await store.pushLedgerToSupabase({
      version: 1,
      decisions: [
        {          id: "maker-SKU-1--closest-technical-match",
          competitorManufacturer: "Maker",
          competitorSku: "SKU-1",
          updatedAt: "2026-09-01T00:00:00.000Z",
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/SUPABASE_COMPETITOR_DECISIONS_TABLE/);
    expect(result.error).toMatch(/migration 011|wingman_ledger_commit/);
    expect(rpcCalled).toBe(false);
  });

  it("mirrors through the atomic rpc when the default table name is used", async () => {
    delete process.env.SUPABASE_COMPETITOR_DECISIONS_TABLE;
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
      decisions: [
        {          id: "maker-SKU-1--closest-technical-match",
          competitorManufacturer: "Maker",
          competitorSku: "SKU-1",
          updatedAt: "2026-09-01T00:00:00.000Z",
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(rpcFn).toBe("wingman_ledger_commit");
  });
});