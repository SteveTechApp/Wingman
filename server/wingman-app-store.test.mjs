import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
      otherRes,
      { sendJson, parseJsonBody },
    );

    expect(otherRes.statusCode).toBe(401);
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
