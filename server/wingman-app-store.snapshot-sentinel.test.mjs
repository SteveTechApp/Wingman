import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Truncation sentinel for the wingman snapshot path. Migration 009's
// wingman_snapshot_commit reconciles by deleting every row absent from the
// committed payload, so a snapshot built while the remote was unreadable (a
// table read that never reached a short page - the POSTGREST_PAGINATION_LIMIT
// safety valve - or any transport/policy error) must never be committed: the
// delete would erase every row written since the last complete read. The read
// path already refuses to serve a truncated snapshot (storage.read.truncated);
// this suite pins the other half: writeDbToSupabaseTables aborts BEFORE the
// commit RPC. Modeled on the ledger invariant harness (POSTGREST_PAGINATION_
// LIMIT sentinel) and the module-reset pattern from wingman-app-store.override
// .test.mjs: table constants are captured at module load, so each test stubs
// env and imports a fresh store instance over a shared mock client.
const supabaseMock = { current: null };
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => supabaseMock.current),
}));

function makeSnapshotClient({ initialState = null } = {}) {
  // initialState: name of the table whose read emulates the pagination valve
  // (always-full pages, so readAllSupabaseRows exhausts maxPages and returns
  // its POSTGREST_PAGINATION_LIMIT error), or null for a fully healthy table
  // set. Mutable between requests so a test can prove recovery.
  const state = { valveTable: initialState };
  const rpc = vi.fn(async () => ({ data: { committed: true }, error: null }));
  const client = {
    __rpc: rpc,
    __state: state,
    from: (table) => ({
      select: () => {
        const api = {
          range: () => api,
          order: async () => {
            if (state.valveTable && table === state.valveTable) {
              // A full page: readAllSupabaseRows keeps paging, hits its
              // maxPages safety valve, and returns
              // { error: { code: "POSTGREST_PAGINATION_LIMIT" }, truncated: true }.
              return { data: Array.from({ length: 1000 }, () => ({})), error: null };
            }
            // A short page proves the table was read to the end.
            return { data: [], error: null };
          },
        };
        return api;
      },
      upsert: async () => ({ error: null }),
    }),
    rpc,
  };
  return client;
}

let dataDir = "";

beforeEach(() => {
  dataDir = mkdtempSync(path.join(tmpdir(), "wingman-snapshot-sentinel-"));
  for (const key of [
    "WINGMAN_STORAGE_MODE",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "WINGMAN_STORAGE_FAIL_CLOSED",
    "WINGMAN_DATA_DIR",
  ]) {
    delete process.env[key];
  }
  process.env.WINGMAN_STORAGE_MODE = "supabase-tables";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  process.env.WINGMAN_STORAGE_FAIL_CLOSED = "false";
  process.env.WINGMAN_DATA_DIR = dataDir;
});

afterEach(() => {
  rmSync(dataDir, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

function makeReq() {
  return {
    headers: {},
    body: JSON.stringify({
      name: "Sentinel Test",
      company: "Acme AV",
      email: `sentinel-${Math.random().toString(36).slice(2)}@example.com`,
      password: "correct horse battery staple",
    }),
  };
}

function makeRes() {
  return { setHeader: () => {} };
}

async function signupThroughStore() {
  const store = await import("./wingman-app-store.mjs");
  await store.handleWingmanAuthSignupPost(makeReq(), makeRes(), {
    sendJson: () => {},
    parseJsonBody: async () => JSON.parse(makeReq().body),
  });
  return store;
}

describe("wingman snapshot truncation sentinel", () => {
  it("aborts before the commit rpc when a table read hits the pagination limit", async () => {
    supabaseMock.current = makeSnapshotClient({ initialState: "wingman_telemetry_events" });
    vi.resetModules();

    await signupThroughStore();

    // The write refused to RPC the destructive reconciliation...
    expect(supabaseMock.current.__rpc).not.toHaveBeenCalled();
    // ...and the fail-open fallback kept the signup in the file store.
    expect(existsSync(path.join(dataDir, "runtime", "wingman-app-db.json"))).toBe(true);
  });

  it("recovers: a later write commits once a complete read clears the sentinel", async () => {
    supabaseMock.current = makeSnapshotClient({ initialState: "wingman_telemetry_events" });
    vi.resetModules();

    await signupThroughStore();
    expect(supabaseMock.current.__rpc).not.toHaveBeenCalled();

    // The remote becomes fully readable again: every table read now ends in a
    // short page, clearing the sentinel, so the next snapshot commits.
    supabaseMock.current.__state.valveTable = null;
    await signupThroughStore();
    expect(supabaseMock.current.__rpc).toHaveBeenCalledTimes(1);
  });

  it("also aborts when a table read fails with a transport/policy error", async () => {
    supabaseMock.current = {
      ...makeSnapshotClient(),
      from: (table) => ({
        select: () => {
          const api = {
            range: () => api,
            order: async () =>
              table === "wingman_audit_events"
                ? { data: null, error: { message: "simulated policy rejection" } }
                : { data: [], error: null },
          };
          return api;
        },
        upsert: async () => ({ error: null }),
      }),
    };
    vi.resetModules();

    await signupThroughStore();

    expect(supabaseMock.current.__rpc).not.toHaveBeenCalled();
  });
});
