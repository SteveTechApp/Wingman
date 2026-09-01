import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Boots the REAL competitor-lookup server (which mounts the agents router via
// handleAgentsRoute) on a throwaway port + data dir and drives the guru and
// vision-context agent routes over HTTP, end to end: auth gate, route
// dispatch, agent execution, and error paths.
//
// WINGMAN_AGENT_FORCE_MOCK=true makes both agents run in their deterministic
// mock mode (no Gemini API key, no network), so the assertions pin real
// behavior instead of live-model output. Port is distinct from the 413 test
// (8876), tools/api-contract-check.mjs (8898) and check:workflow (8899).
const PORT = 8877;
const BASE = `http://127.0.0.1:${PORT}`;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wingman-agents-e2e-"));
// 1x1 transparent PNG, enough for the vision-context route to accept.
const PNG_1PX =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

let child = null;
let sessionCookie = "";

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

async function request(requestPath, { method = "POST", body, cookie = "" } = {}) {
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
    // Non-JSON bodies are still worth asserting on.
  }
  return { status: res.status, json };
}

async function signupAndCaptureCookie() {
  const res = await fetch(`${BASE}/api/wingman/auth/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Agents E2E User",
      company: "Agents Co",
      email: "agents-e2e@example.com",
      password: "agents-e2e-pass",
    }),
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
      WINGMAN_UI_PORT: "3997",
      WINGMAN_DATA_DIR: dataDir,
      WINGMAN_STORAGE_MODE: "file",
      // Deterministic agent execution: no live model calls, no network.
      WINGMAN_AGENT_FORCE_MOCK: "true",
      GEMINI_API_KEY: "",
    },
    stdio: "ignore",
    windowsHide: true,
  });
  await waitForHealth();
  sessionCookie = await signupAndCaptureCookie();
}, 30_000);

afterAll(() => {
  if (child) {
    child.kill("SIGTERM");
    child = null;
  }
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe("agents routes (end to end over real HTTP)", () => {
  it("health route is public and reports the agents service", async () => {
    const { status, json } = await request("/api/wingman/agents/health", { method: "GET" });
    expect(status).toBe(200);
    expect(json?.ok).toBe(true);
    expect(json?.service).toBe("wingman-agents");
    expect(json?.phases).toContain("guru");
    expect(json?.phases).toContain("vision-context");
  });

  it("requires authentication for the guru route", async () => {
    const { status, json } = await request("/api/wingman/agents/guru", { body: { question: "What switcher fits?" } });
    expect(status).toBe(401);
    expect(json?.ok).toBe(false);
  });

  it("POST /api/wingman/agents/guru answers a question in mock mode", async () => {
    const { status, json } = await request("/api/wingman/agents/guru", {
      cookie: sessionCookie,
      body: { question: "Which matrix switcher should I use for a boardroom with 4 sources and 2 displays?" },
    });
    expect(status).toBe(200);
    expect(json?.ok).toBe(true);
    expect(json?.phase).toBe("guru");
    expect(json?.data).toBeDefined();
    expect(json.data.guruVersion).toBe("1.0");
    expect(json.data.answer).toMatch(/best-fit architecture/i);
    expect(Array.isArray(json.data.bullets)).toBe(true);
    expect(Array.isArray(json.data.followUpActions)).toBe(true);
    expect(json.data.confidence).toBe(0.68);
  });

  it("guru route rejects malformed JSON with 400", async () => {
    const res = await fetch(`${BASE}/api/wingman/agents/guru`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: sessionCookie },
      body: "{not-json",
    });
    expect(res.status).toBe(400);
    const json = await res.json().catch(() => null);
    expect(json?.ok).toBe(false);
    expect(json?.phase).toBe("guru");
  });

  it("POST /api/wingman/agents/vision-context analyzes an image in mock mode", async () => {
    const { status, json } = await request("/api/wingman/agents/vision-context", {
      cookie: sessionCookie,
      body: {
        fileName: "boardroom-layout.png",
        mimeType: "image/png",
        base64Data: PNG_1PX,
        hint: "identify display positions",
      },
    });
    expect(status).toBe(200);
    expect(json?.ok).toBe(true);
    expect(json?.phase).toBe("vision-context");
    expect(json?.data).toBeDefined();
    expect(json.data.visionVersion).toBe("1.0");
    expect(json.data.attachmentKind).toBe("unclear");
    expect(json.data.summary).toContain("boardroom-layout.png");
    expect(Array.isArray(json.data.roomObservations)).toBe(true);
    expect(json.data.confidence).toBe(0);
  });

  it("vision-context rejects requests without image data", async () => {
    const { status, json } = await request("/api/wingman/agents/vision-context", {
      cookie: sessionCookie,
      body: { fileName: "no-image.png" },
    });
    expect(status).toBe(400);
    expect(json?.ok).toBe(false);
    expect(json?.phase).toBe("vision-context");
    expect(json?.error).toMatch(/missing image data/i);
  });

  it("unknown agents route returns 404", async () => {
    const { status, json } = await request("/api/wingman/agents/nope", {
      cookie: sessionCookie,
      body: {},
    });
    expect(status).toBe(404);
    expect(json?.ok).toBe(false);
    expect(json?.error).toMatch(/unknown wingman agents route/i);
  });
});
