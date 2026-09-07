import { afterEach, describe, expect, it, vi } from "vitest";

// Migration 009's wingman_snapshot_commit hard-codes the migration-created
// wingman_* tables, so in supabase-tables mode a SUPABASE_WINGMAN_*_TABLE
// override would make reads address a custom table while the atomic commit
// writes the default one - every change silently vanishing on the next read.
// The store must reject the override loudly. Because the table constants are
// captured when the module first loads, each test stubs the env and imports a
// FRESH module instance (vi.resetModules), with the supabase-js client kept
// stable across resets via a shared mutable holder.
const supabaseMock = { current: null };
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => supabaseMock.current),
}));

const STORE_ENV = {
  WINGMAN_STORAGE_MODE: "supabase-tables",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  WINGMAN_STORAGE_FAIL_CLOSED: "false",
};

function makeReadsOnlyClient() {
  const calls = { tables: [] };
  return {
    __calls: calls,
    from: (table) => {
      calls.tables.push(table);
      return {
        select: () => {
          const api = {
            range: (start, end) => {
              void start;
              void end;
              return api;
            },
            order: async () => ({ data: [], error: null }),
          };
          return api;
        },
        upsert: async () => ({ error: null }),
        delete: () => ({ not: async () => ({ error: null }) }),
      };
    },
    rpc: async () => ({ data: { committed: true }, error: null }),
  };
}

function makeReq() {
  return {
    headers: {},
    body: JSON.stringify({
      name: "Override Test",
      company: "Acme AV",
      email: "override@example.com",
      password: "correct horse battery staple",
    }),
  };
}

function makeRes() {
  return { setHeader: () => {} };
}

afterEach(() => {
  for (const key of [...Object.keys(STORE_ENV), "SUPABASE_WINGMAN_USERS_TABLE"]) {
    delete process.env[key];
  }
  vi.unstubAllEnvs();
});

describe("wingman-app-store supabase-tables table overrides", () => {
  it("rejects a non-default SUPABASE_WINGMAN_USERS_TABLE override with a clear configuration error", async () => {
    for (const [key, value] of Object.entries(STORE_ENV)) process.env[key] = value;
    process.env.SUPABASE_WINGMAN_USERS_TABLE = "wingman_users_custom";
    supabaseMock.current = makeReadsOnlyClient();
    vi.resetModules();

    const store = await import("./wingman-app-store.mjs");
    await expect(
      store.handleWingmanAuthSignupPost(makeReq(), makeRes(), {
        sendJson: () => {},
        parseJsonBody: async () => JSON.parse(makeReq().body),
      }),
    ).rejects.toThrow(/table-name overrides|wingman_snapshot_commit \(migration 009\)/);
  });

  it("still commits through the atomic rpc when every table uses its default name", async () => {
    for (const [key, value] of Object.entries(STORE_ENV)) process.env[key] = value;
    supabaseMock.current = makeReadsOnlyClient();
    vi.resetModules();

    const store = await import("./wingman-app-store.mjs");
    await store.handleWingmanAuthSignupPost(
      makeReq(),
      makeRes(),
      {
        sendJson: () => {},
        parseJsonBody: async () => JSON.parse(makeReq().body),
      },
    );
    expect(supabaseMock.current.__calls.tables.length).toBeGreaterThanOrEqual(8);
  });
});