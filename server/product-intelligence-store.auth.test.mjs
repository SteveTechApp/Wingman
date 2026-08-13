import { afterEach, describe, expect, it, vi } from "vitest";
import {
  allowsLocalDataManagerRequest,
  handleProductIntelligenceGet,
  resolveProductIntelligenceAuth,
} from "./product-intelligence-store.mjs";

const originalNodeEnv = process.env.NODE_ENV;

function sendJson(res, status, body) {
  res.status = status;
  res.body = body;
}

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  vi.restoreAllMocks();
});

describe("product intelligence Data Manager authentication", () => {
  it("allows unauthenticated Data Manager API access in development", async () => {
    process.env.NODE_ENV = "development";
    const getRequestAuth = vi.fn();
    const auth = await resolveProductIntelligenceAuth(
      {},
      {},
      new URL("http://localhost/api/product-intelligence"),
      sendJson,
      { requireAdmin: true, getRequestAuth },
    );

    expect(auth).toMatchObject({
      ok: true,
      developmentBypass: true,
      user: { id: "local-development-admin", role: "admin" },
      permissions: { canManageWorkspace: true },
    });
    expect(getRequestAuth).not.toHaveBeenCalled();
  });

  it("loads records from the governed product intelligence store in development", async () => {
    process.env.NODE_ENV = "development";
    const res = {};

    await handleProductIntelligenceGet(
      {}, res, new URL("http://localhost/api/product-intelligence?limit=1"), { sendJson },
    );

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("file-db");
    expect(res.body.file).toMatch(/product-intelligence-state\.json$/);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.records).toHaveLength(1);
  });

  it("rejects unauthenticated Data Manager API access in production", async () => {
    process.env.NODE_ENV = "production";
    const res = {};
    const getRequestAuth = vi.fn().mockResolvedValue({ ok: false, error: "Authentication required." });
    const auth = await resolveProductIntelligenceAuth(
      {}, res, new URL("https://wingman.example/api/product-intelligence/upsert"), sendJson,
      { requireAdmin: true, getRequestAuth },
    );

    expect(auth).toBeNull();
    expect(res).toMatchObject({ status: 401, body: { ok: false, error: "Authentication required." } });
  });

  it("keeps unrelated unauthenticated APIs protected in development", async () => {
    process.env.NODE_ENV = "development";
    const res = {};
    const url = new URL("http://localhost/api/wingman/projects");
    const getRequestAuth = vi.fn().mockResolvedValue({ ok: false, error: "Authentication required." });
    const auth = await resolveProductIntelligenceAuth({}, res, url, sendJson, { getRequestAuth });

    expect(allowsLocalDataManagerRequest(url)).toBe(false);
    expect(auth).toBeNull();
    expect(res.status).toBe(401);
    expect(getRequestAuth).toHaveBeenCalledOnce();
  });

  it("preserves authenticated admin authorization outside the development bypass", async () => {
    process.env.NODE_ENV = "production";
    const authenticated = {
      ok: true,
      user: { id: "user-1", role: "admin" },
      permissions: { canManageWorkspace: true },
    };
    const auth = await resolveProductIntelligenceAuth(
      {}, {}, new URL("https://wingman.example/api/product-intelligence/status"), sendJson,
      { requireAdmin: true, getRequestAuth: vi.fn().mockResolvedValue(authenticated) },
    );

    expect(auth).toBe(authenticated);
  });
});
