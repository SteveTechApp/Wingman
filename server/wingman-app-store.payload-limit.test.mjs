import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The 413-style hardening story, on the write side: the API rejects oversized
// JSON bodies (413), the read side refuses a table it cannot page to the end
// (POSTGREST_PAGINATION_LIMIT), and migration 009's wingman_snapshot_commit
// must reject an oversized snapshot payload the same way - a bloated snapshot
// would otherwise be posted as a doomed multi-MB RPC (or be silently
// half-served), failing far from the real cause. The store pre-flights the
// exact serialized body before the RPC; the SQL raises the same ceiling for
// direct callers. This suite pins both layers and their lockstep. Modeled on
// the ledger's payload-limit suite (server/governance/
// competitor-decision-ledger.payload-limit.test.mjs) and the module-reset
// pattern from wingman-app-store.snapshot-sentinel.test.mjs: table constants
// are captured at module load, so each test stubs env and imports a fresh
// store instance over a shared mock client.
const supabaseMock = { current: null };
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => supabaseMock.current),
}));

// NOTE: paths must be built from fileURLToPath(import.meta.url), not
// `new URL(relative, import.meta.url)` - vite rewrites that asset-URL pattern
// to the dev-server base and fileURLToPath then throws.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function makeSnapshotClient() {
  // Healthy remote: every table read ends in a short page (proves exhaustion),
  // and the commit RPC records its arguments instead of touching a database.
  const rpc = vi.fn(async () => ({ data: { committed: true }, error: null }));
  const client = {
    __rpc: rpc,
    from: (table) => ({
      select: () => {
        const api = {
          range: () => api,
          order: async () => ({ data: [], error: null }),
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
  dataDir = mkdtempSync(path.join(tmpdir(), "wingman-snapshot-payload-limit-"));
  for (const key of [
    "WINGMAN_STORAGE_MODE",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "WINGMAN_STORAGE_FAIL_CLOSED",
    "WINGMAN_DATA_DIR",
    "WINGMAN_SNAPSHOT_COMMIT_MAX_BYTES",
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
  vi.resetModules();
});

function makeReq({ name = "Payload Limit Test", password = "correct horse battery staple" } = {}) {
  return {
    headers: {},
    body: JSON.stringify({
      name,
      company: "Acme AV",
      email: `payload-${Math.random().toString(36).slice(2)}@example.com`,
      password,
    }),
  };
}

function makeRes() {
  return { setHeader: () => {} };
}

async function signupThroughStore(req = makeReq()) {
  const store = await import("./wingman-app-store.mjs");
  await store.handleWingmanAuthSignupPost(req, makeRes(), {
    sendJson: () => {},
    parseJsonBody: async () => JSON.parse(req.body),
  });
  return store;
}

describe("migration 009 snapshot RPC oversized-payload rejection", () => {
  it("refuses an oversized snapshot before the RPC ever fires (write-path 413 analogue)", async () => {
    // The pre-flight cap floors at 1024 bytes; a long display name makes the
    // signup snapshot deterministically exceed it, so the write must be
    // refused without a single RPC.
    process.env.WINGMAN_SNAPSHOT_COMMIT_MAX_BYTES = "1024";
    supabaseMock.current = makeSnapshotClient();
    vi.resetModules();

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await signupThroughStore(makeReq({ name: "Avery Long Company Name ".repeat(200) }));

    // The write refused to RPC the oversized payload...
    expect(supabaseMock.current.__rpc).not.toHaveBeenCalled();
    // ...it logged the event class loudly...
    const errorLines = errorSpy.mock.calls.map((call) => String(call[0]));
    errorSpy.mockRestore();
    const refusedLog = errorLines.find((line) => line.includes("storage.snapshot_commit.refused_payload_too_large"));
    expect(refusedLog).toBeDefined();
    expect(refusedLog).toContain("1024");
    // ...and the fail-open fallback kept the signup in the file store.
    expect(existsSync(path.join(dataDir, "runtime", "wingman-app-db.json"))).toBe(true);
  });

  it("a snapshot under the ceiling still commits through the RPC unchanged", async () => {
    supabaseMock.current = makeSnapshotClient();
    vi.resetModules();

    const store = await signupThroughStore();

    expect(supabaseMock.current.__rpc).toHaveBeenCalledTimes(1);
    const [fn, args] = supabaseMock.current.__rpc.mock.calls[0];
    expect(fn).toBe("wingman_snapshot_commit");
    // The real (default 8 MiB) ceiling easily admits a realistic signup payload.
    expect(store.snapshotCommitPayloadBytes(args.payload)).toBeLessThan(store.SNAPSHOT_COMMIT_MAX_PAYLOAD_BYTES);
    expect(store.snapshotCommitPayloadTooLargeError(args.payload)).toBeNull();
  });

  it("boundary math: serialized-body bytes at the cap pass, one byte over is refused", async () => {
    const store = await import("./wingman-app-store.mjs");
    const payload = {
      users: [{ id: "u1", email: "a@example.com", password_hash: "x".repeat(64) }],
      workspaces: [{ id: "w1", name: "Acme", slug: "acme", owner_user_id: "u1" }],
      memberships: [{ id: "w1:u1", workspace_id: "w1", user_id: "u1", role: "owner" }],
      invitations: [],
      sessions: [{ id: "s1", token_hash: "t".repeat(64), user_id: "u1", workspace_id: "w1" }],
      projects: [],
      auditEvents: [],
      telemetryEvents: [],
    };
    const bytes = store.snapshotCommitPayloadBytes(payload);

    // The helper measures the exact body the client posts: {"payload":{...}}
    expect(bytes).toBe(Buffer.byteLength(JSON.stringify({ payload })));
    expect(store.snapshotCommitPayloadTooLargeError(payload, bytes)).toBeNull();
    expect(store.snapshotCommitPayloadTooLargeError(payload, bytes - 1)).toMatchObject({
      bytes,
      maxBytes: bytes - 1,
    });
    // No meaningful content: nothing to refuse.
    expect(store.snapshotCommitPayloadTooLargeError({}, bytes)).toBeNull();
  });

  it("migration 009 (server + supabase copies) and the store share one 8388608 ceiling", async () => {
    const serverSql = readFileSync(path.join(repoRoot, "server", "migrations", "009_atomic_snapshot_commit.sql"), "utf8");
    const supabaseSql = readFileSync(
      path.join(repoRoot, "supabase", "migrations", "20260902_atomic_snapshot_commit.sql"),
      "utf8",
    );

    // Mirrors must not drift: the parity gate compares the two trees.
    expect(serverSql).toBe(supabaseSql);
    expect(serverSql).toMatch(/octet_length\(payload::text\) > 8388608/);
    expect(serverSql).toMatch(/wingman_snapshot_commit payload too large \(413\)/);
    expect(serverSql).toMatch(/shrink the snapshot or write in smaller batches/);

    const store = await import("./wingman-app-store.mjs");
    expect(store.SNAPSHOT_COMMIT_MAX_PAYLOAD_BYTES).toBe(8_388_608);
  });
});