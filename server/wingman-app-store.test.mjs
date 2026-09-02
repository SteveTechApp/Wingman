import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";

// wingman-app-store.mjs dynamically imports this only when Supabase-backed
// storage is actually used; these tests exercise file-mode and fail-closed-
// without-credentials paths, so a mock avoids depending on server/'s
// separately-installed node_modules being present.
vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));

const files = new Map();

function makeEnoent() {
  const error = new Error("ENOENT: no such file or directory");
  error.code = "ENOENT";
  return error;
}

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn(async (filePath) => {
      const key = String(filePath);
      if (!files.has(key)) throw makeEnoent();
      return files.get(key);
    }),
    writeFile: vi.fn(async (filePath, content) => {
      files.set(String(filePath), String(content));
    }),
    rename: vi.fn(async (from, to) => {
      const key = String(from);
      if (!files.has(key)) throw makeEnoent();
      files.set(String(to), files.get(key));
      files.delete(key);
    }),
    rm: vi.fn(async () => undefined),
    mkdir: vi.fn(async () => undefined),
  },
}));

function makeRes() {
  const headers = {};
  return {
    statusCode: null,
    body: null,
    headers,
    setHeader(name, value) {
      headers[String(name).toLowerCase()] = value;
    },
  };
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.body = payload;
}

async function parseJsonBody(req) {
  return req._body ?? {};
}

function makeReq(body, { ip = "127.0.0.1", headers = {} } = {}) {
  return {
    _body: body,
    headers,
    socket: { remoteAddress: ip },
  };
}

function extractSessionToken(res) {
  const setCookie = res.headers["set-cookie"] || "";
  const match = /wingman_session=([^;]+)/.exec(setCookie);
  return match ? decodeURIComponent(match[1]) : "";
}

const SESSION_URL = new URL("http://localhost/api/wingman/workspace");

async function signUp(store, overrides = {}) {
  const res = makeRes();
  await store.handleWingmanAuthSignupPost(
    makeReq({
      name: "Ada",
      company: "Acme AV",
      email: "ada@example.com",
      password: "correct horse battery staple",
      ...overrides,
    }),
    res,
    { sendJson, parseJsonBody },
  );
  return res;
}

describe("wingman-app-store: auth", () => {
  beforeEach(() => {
    files.clear();
    vi.resetModules();
  });

  it("signs up a new user, creates a workspace, and issues a working session token", async () => {
    const store = await import("./wingman-app-store.mjs");
    const res = await signUp(store);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.session.workspaceRole).toBe("owner");
    expect(res.body.session.permissions.canManageWorkspace).toBe(true);

    const token = extractSessionToken(res);
    expect(token).toBeTruthy();

    const auth = await store.getWingmanRequestAuth(
      makeReq(undefined, { headers: { authorization: `Bearer ${token}` } }),
      SESSION_URL,
    );
    expect(auth.ok).toBe(true);
    expect(auth.user.email).toBe("ada@example.com");
    expect(auth.permissions.canManageWorkspace).toBe(true);
  });

  it("rejects a request with no session token", async () => {
    const store = await import("./wingman-app-store.mjs");
    const auth = await store.getWingmanRequestAuth(makeReq(undefined, {}), SESSION_URL);
    expect(auth.ok).toBe(false);
  });

  it("serializes concurrent read-modify-write cycles so no signup is lost", async () => {
    const store = await import("./wingman-app-store.mjs");
    // Two signups racing through the same read-modify-write cycle. Without the
    // store lock the second read can see the first's pre-write state and the
    // second write then overwrites it, silently dropping a user. The lock
    // serializes the cycles so both users must survive.
    const [first, second] = await Promise.all([
      signUp(store, { name: "Racer One", email: "racer1@example.com" }),
      signUp(store, { name: "Racer Two", email: "racer2@example.com" }),
    ]);

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);

    const health = makeRes();
    await store.handleWingmanHealthGet(undefined, health, { sendJson });
    expect(health.body.users).toBe(2);
    expect(health.body.workspaces).toBe(2);
  });

  it("auth gate and session check are pure reads: no snapshot write on read-only requests", async () => {
    const store = await import("./wingman-app-store.mjs");
    const signupRes = await signUp(store);

    // Locate the persisted db file the mocked fs captured during signup.
    const dbKeys = [...files.keys()].filter((key) => String(key).endsWith("wingman-app-db.json"));
    expect(dbKeys.length).toBeGreaterThan(0);
    const dbKey = dbKeys[0];
    const persistedBefore = files.get(dbKey);

    const token = extractSessionToken(signupRes);
    const auth = await store.getWingmanRequestAuth(
      makeReq(undefined, { headers: { authorization: `Bearer ${token}` } }),
      SESSION_URL,
    );
    expect(auth.ok).toBe(true);

    const sessionRes = makeRes();
    await store.handleWingmanAuthSessionGet(
      makeReq(undefined, { headers: { authorization: `Bearer ${token}` } }),
      sessionRes,
      SESSION_URL,
      { sendJson },
    );
    expect(sessionRes.statusCode).toBe(200);

    // Neither the gate nor the session GET may rewrite the database snapshot:
    // the last-seen touch rides real writes only.
    expect(files.get(dbKey)).toBe(persistedBefore);
  });

  it("rejects a session token that does not match any session", async () => {
    const store = await import("./wingman-app-store.mjs");
    const auth = await store.getWingmanRequestAuth(
      makeReq(undefined, { headers: { authorization: "Bearer not-a-real-token" } }),
      SESSION_URL,
    );
    expect(auth.ok).toBe(false);
  });

  it("rejects login with the wrong password", async () => {
    const store = await import("./wingman-app-store.mjs");
    await signUp(store);

    const loginRes = makeRes();
    await store.handleWingmanAuthLoginPost(
      makeReq({ email: "ada@example.com", password: "wrong password" }, { ip: "10.0.0.2" }),
      loginRes,
      { sendJson, parseJsonBody },
    );

    expect(loginRes.statusCode).toBe(401);
    expect(loginRes.body.ok).toBe(false);
  });

  it("logs in with the correct password and returns a session usable for auth", async () => {
    const store = await import("./wingman-app-store.mjs");
    await signUp(store);

    const loginRes = makeRes();
    await store.handleWingmanAuthLoginPost(
      makeReq({ email: "ada@example.com", password: "correct horse battery staple" }, { ip: "10.0.0.3" }),
      loginRes,
      { sendJson, parseJsonBody },
    );

    expect(loginRes.statusCode).toBe(200);
    const token = extractSessionToken(loginRes);
    expect(token).toBeTruthy();

    const auth = await store.getWingmanRequestAuth(
      makeReq(undefined, { headers: { "x-wingman-session": token } }),
      SESSION_URL,
    );
    expect(auth.ok).toBe(true);
  });

  it("rate limits repeated login attempts from the same address", async () => {
    const store = await import("./wingman-app-store.mjs");
    const ip = "10.0.0.9";
    let lastRes;
    for (let attempt = 0; attempt < 9; attempt += 1) {
      lastRes = makeRes();
      await store.handleWingmanAuthLoginPost(
        makeReq({ email: "nobody@example.com", password: "whatever-1234" }, { ip }),
        lastRes,
        { sendJson, parseJsonBody },
      );
    }

    expect(lastRes.statusCode).toBe(429);
  });

  it("does not rate limit attempts from a different address", async () => {
    const store = await import("./wingman-app-store.mjs");
    for (let attempt = 0; attempt < 9; attempt += 1) {
      await store.handleWingmanAuthLoginPost(
        makeReq({ email: "nobody@example.com", password: "whatever-1234" }, { ip: "10.0.0.10" }),
        makeRes(),
        { sendJson, parseJsonBody },
      );
    }

    const otherRes = makeRes();
    await store.handleWingmanAuthLoginPost(
      makeReq({ email: "nobody@example.com", password: "whatever-1234" }, { ip: "10.0.0.11" }),
      otherRes,        { sendJson, parseJsonBody },
    );

    expect(otherRes.statusCode).toBe(401);
  });
});

describe("wingman-app-store: atomic snapshot commit", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    files.clear();
    vi.resetModules();
    vi.resetAllMocks();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  function makeTablesClient() {
    const calls = {
      tables: [],
      upserts: [],
      deletes: [],
      rpcs: [],
    };
    const client = {
      __calls: calls,
      from: (table) => {
        calls.tables.push(table);
        // Read path only: paged select with empty data (fresh database). Any
        // attempt to accumulate a write chain (upsert/delete) is recorded so
        // the test can assert the write path goes exclusively through rpc().
        return {
          select: () => {
            const state = { from: 0, to: 999 };
            const api = {
              range: (start, end) => {
                state.from = start;
                state.to = end;
                return api;
              },
              order: async () => {
                // A full page (1000 rows) retriggers recursion; serve empty so
                // pagination concludes after one request per table.
                if (state.from === 0) return { data: [], error: null };
                return { data: [], error: null };
              },
            };
            return api;
          },
          upsert: async (rows) => {
            calls.upserts.push({ table, rows });
            return { error: null };
          },
          delete: () => {
            calls.deletes.push({ table });
            return {
              not: async () => ({ error: null }),
            };
          },
        };
      },
      rpc: async (fn, args) => {
        calls.rpcs.push({ fn, args });
        return {
          data: { committed: true, upserted_users: (args?.payload?.users ?? []).length },
          error: null,
        };
      },
    };
    return client;
  }

  it("commits the whole snapshot through one atomic rpc call, never per-table writes", async () => {
    process.env.WINGMAN_STORAGE_MODE = "supabase-tables";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    process.env.WINGMAN_STORAGE_FAIL_CLOSED = "false";

    const client = makeTablesClient();
    vi.mocked(createClient).mockImplementation(() => client);

    const store = await import("./wingman-app-store.mjs");
    const res = makeRes();
    await store.handleWingmanAuthSignupPost(
      makeReq({
        name: "Tabatha",
        company: "Acme AV",
        email: "tabatha@example.com",
        password: "correct horse battery staple",
      }),
      res,
      { sendJson, parseJsonBody },
    );

    expect(res.statusCode).toBe(200);

    // Exactly ONE write to the database: the atomic RPC commit.
    expect(client.__calls.rpcs.length).toBe(1);
    expect(client.__calls.rpcs[0].fn).toBe("wingman_snapshot_commit");
    expect(client.__calls.upserts.length).toBe(0);
    expect(client.__calls.deletes.length).toBe(0);

    // The payload carries the full normalized snapshot for the new workspace.
    const payload = client.__calls.rpcs[0].args.payload;
    expect(payload.users.length).toBe(1);
    expect(payload.users[0].email).toBe("tabatha@example.com");
    expect(payload.workspaces.length).toBe(1);
    expect(payload.memberships.length).toBe(1);
    expect(payload.sessions.length).toBe(1);
    expect(payload.projects).toEqual([]);
    // Signup records one audit event inside the same atomic commit.
    expect(payload.auditEvents.length).toBe(1);
    expect(payload.auditEvents[0].action).toBe("signup");
    expect(payload.telemetryEvents).toEqual([]);

    // The table reads still flow through the (paginated) select path: the read
    // side uses all eight tables before the first write.
    expect(new Set(client.__calls.tables).size).toBeGreaterThanOrEqual(8);
  });

  it("surfaces an rpc error as a write failure and logs the event class", async () => {
    process.env.WINGMAN_STORAGE_MODE = "supabase-tables";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    process.env.WINGMAN_STORAGE_FAIL_CLOSED = "false";

    const client = makeTablesClient();
    client.rpc = async () => ({ data: null, error: new Error("function wingman_snapshot_commit does not exist") });
    vi.mocked(createClient).mockImplementation(() => client);

    // The rpc failure is logged loudly (error event), even though this
    // fail-open instance then falls back to file storage.
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const store = await import("./wingman-app-store.mjs");
    const res = makeRes();
    await store.handleWingmanAuthSignupPost(
      makeReq({
        name: "Failing",
        company: "Acme AV",
        email: "failing@example.com",
        password: "correct horse battery staple",
      }),
      res,
      { sendJson, parseJsonBody },
    );

    expect(res.statusCode).toBe(200);
    const errorLines = errorSpy.mock.calls.map((call) => String(call[0]));
    errorSpy.mockRestore();
    const commitLog = errorLines.find((line) => line.includes("storage.snapshot_commit.failed"));
    expect(commitLog).toBeDefined();
    expect(commitLog).toContain("does not exist");
  });
});

describe("wingman-app-store: storage fail-closed behavior", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    files.clear();
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("reports ready for explicit file storage regardless of fail-closed", async () => {
    process.env.WINGMAN_STORAGE_MODE = "file";
    process.env.WINGMAN_STORAGE_FAIL_CLOSED = "true";
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const store = await import("./wingman-app-store.mjs");
    expect(await store.getStorageReadiness()).toEqual({ ready: true, mode: "file" });
  });

  it("fails closed when supabase-tables mode is configured without credentials", async () => {
    process.env.WINGMAN_STORAGE_MODE = "supabase-tables";
    process.env.WINGMAN_STORAGE_FAIL_CLOSED = "true";
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const store = await import("./wingman-app-store.mjs");
    const readiness = await store.getStorageReadiness();
    expect(readiness.ready).toBe(false);
    expect(readiness.mode).toBe("error");
    expect(readiness.error).toMatch(/credentials are missing/i);
  });

  it("silently falls back to file storage when fail-closed is disabled", async () => {
    process.env.WINGMAN_STORAGE_MODE = "supabase-tables";
    process.env.WINGMAN_STORAGE_FAIL_CLOSED = "false";
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const store = await import("./wingman-app-store.mjs");
    expect(await store.getStorageReadiness()).toEqual({ ready: true, mode: "file" });
  });

  it("fails closed in auto mode when nothing is configured and fail-closed is enabled", async () => {
    process.env.WINGMAN_STORAGE_MODE = "auto";
    process.env.WINGMAN_STORAGE_FAIL_CLOSED = "true";
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const store = await import("./wingman-app-store.mjs");
    const readiness = await store.getStorageReadiness();
    expect(readiness.ready).toBe(false);
    expect(readiness.mode).toBe("error");
  });
});
