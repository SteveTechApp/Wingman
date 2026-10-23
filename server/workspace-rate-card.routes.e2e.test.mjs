import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Boots the real API on a throwaway port and data dir and drives the workspace
// rate card over HTTP: the auth gate, the round trip a rep's second device
// makes, and the merge that keeps a saved baseline when a proposal leaves a
// cell blank. Port is distinct from the agents suites (8877/8878), the 413 test
// (8876), the unread-tail suite (8879), the store suites (8880–8886) and the
// contract check (8898).
const PORT = 8887;
const BASE = `http://127.0.0.1:${PORT}`;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wingman-rate-card-e2e-"));

const BACK_BOX = "install-enclosure-back-box";
const OUTLET = "install-termination-cat6a-outlet";

let child = null;

async function waitForHealth(timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch {
      // Server not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("test server did not become healthy in time");
}

async function request(requestPath, { method = "GET", body, cookie = "" } = {}) {
  const headers = { "content-type": "application/json" };
  if (cookie) headers.cookie = cookie;
  const res = await fetch(`${BASE}${requestPath}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    // A non-JSON body is still worth asserting on.
  }
  return { status: res.status, json };
}

async function signup(email, company) {
  const res = await fetch(`${BASE}/api/wingman/auth/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Rate Card Rep", company, email, password: "rate-card-pass" }),
  });
  expect(res.status).toBe(200);
  const setCookie = res.headers.getSetCookie().find((header) => header.startsWith("wingman_session="));
  expect(setCookie, "signup should issue a wingman_session cookie").toBeTruthy();
  return setCookie.split(";")[0];
}

beforeAll(async () => {
  child = spawn(process.execPath, ["server/competitor-lookup-server.mjs"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(PORT),
      WINGMAN_UI_PORT: "3998",
      WINGMAN_DATA_DIR: dataDir,
      WINGMAN_STORAGE_MODE: "file",
      GEMINI_API_KEY: "",
    },
    stdio: "ignore",
    windowsHide: true,
  });
  await waitForHealth();
}, 30_000);

afterAll(() => {
  if (child) {
    child.kill("SIGTERM");
    child = null;
  }
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe("workspace installation rate card routes", () => {
  let cookie = "";

  it("refuses a card without a workspace session", async () => {
    const read = await request("/api/wingman/workspace/rate-card");
    const write = await request("/api/wingman/workspace/rate-card", { method: "PUT", body: { rates: { [BACK_BOX]: "120" } } });

    expect(read.status).toBe(401);
    expect(write.status).toBe(401);
  });

  it("starts a new rep with an empty card", async () => {
    cookie = await signup("rate-card-e2e@example.com", "Rate Card Co");
    const { status, json } = await request("/api/wingman/workspace/rate-card", { cookie });

    expect(status).toBe(200);
    expect(json).toMatchObject({ ok: true, card: { updatedAt: "", currency: "GBP", rates: {} } });
  });

  it("keeps the rates a rep saved, which is what makes them follow a device", async () => {
    const saved = await request("/api/wingman/workspace/rate-card", {
      method: "PUT",
      cookie,
      body: { rates: { [BACK_BOX]: "120" }, currency: "GBP" },
    });
    expect(saved.status).toBe(200);
    expect(saved.json.card.rates).toEqual({ [BACK_BOX]: "120" });
    expect(saved.json.card.updatedAt).not.toBe("");

    // The next machine signs in and reads the same card.
    const read = await request("/api/wingman/workspace/rate-card", { cookie });
    expect(read.json.card).toMatchObject({ currency: "GBP", rates: { [BACK_BOX]: "120" } });
  });

  it("merges a later save, and a blank cell never erases the baseline", async () => {
    const merged = await request("/api/wingman/workspace/rate-card", {
      method: "PUT",
      cookie,
      body: { rates: { [BACK_BOX]: "", [OUTLET]: "35" }, currency: "GBP" },
    });

    expect(merged.status).toBe(200);
    expect(merged.json.card.rates).toEqual({ [BACK_BOX]: "120", [OUTLET]: "35" });
  });

  it("does not hand one workspace's card to another", async () => {
    const otherCookie = await signup("rate-card-other@example.com", "Other Wall Co");
    const { json } = await request("/api/wingman/workspace/rate-card", { cookie: otherCookie });

    expect(json.card.rates).toEqual({});
  });

  it("rejects a save it could not print", async () => {
    const badCurrency = await request("/api/wingman/workspace/rate-card", {
      method: "PUT",
      cookie,
      body: { rates: { [BACK_BOX]: "120" }, currency: "JPY" },
    });
    const badRates = await request("/api/wingman/workspace/rate-card", {
      method: "PUT",
      cookie,
      body: { rates: ["120"] },
    });

    expect(badCurrency.status).toBe(400);
    expect(badRates.status).toBe(400);
  });
});
