import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Boots the REAL competitor-lookup server on a throwaway port + data dir and
// drives it over HTTP, so the oversized-body contract is pinned end to end:
// a body over MAX_JSON_BODY_BYTES must come back as 413 on the JSON-body
// routes, never as 400/500, and the socket must stay alive long enough for
// the response to reach the client.
//
// Port is distinct from tools/api-contract-check.mjs (8898) and
// check:workflow's server (8899).
const PORT = 8876;
const BASE = `http://127.0.0.1:${PORT}`;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wingman-413-test-"));
// Default MAX_JSON_BODY_BYTES is 1 MiB; send 2 MiB to trip it.
const OVERSIZED_BODY = JSON.stringify({ manufacturer: "Extron", model: "x".repeat(2 * 1024 * 1024) });

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

async function postJson(requestPath, body, cookie = "") {
  const headers = { "content-type": "application/json" };
  if (cookie) headers.cookie = cookie;
  const res = await fetch(`${BASE}${requestPath}`, {
    method: "POST",
    headers,
    body,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    // Non-JSON bodies (e.g. connection teardown) are still worth asserting on.
  }
  return { status: res.status, json };
}

async function signupAndCaptureCookie() {
  const res = await fetch(`${BASE}/api/wingman/auth/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "413 Audit User",
      company: "Audit Co",
      email: "audit413@example.com",
      password: "audit-pass-413",
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
      WINGMAN_UI_PORT: "3996",
      WINGMAN_DATA_DIR: dataDir,
      WINGMAN_STORAGE_MODE: "file",
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

describe("oversized JSON bodies", () => {
  it("POST /api/competitor/liveLookup returns 413, not 400/500, for a body over MAX_JSON_BODY_BYTES", async () => {
    const { status, json } = await postJson("/api/competitor/liveLookup", OVERSIZED_BODY, sessionCookie);
    expect(status).toBe(413);
    expect(json?.ok).toBe(false);
    expect(json?.error).toMatch(/too large|Live lookup failed/i);
  });

  it("POST /api/competitor/resolveMatch returns 413, not 400/500, for a body over MAX_JSON_BODY_BYTES", async () => {
    const { status, json } = await postJson("/api/competitor/resolveMatch", OVERSIZED_BODY, sessionCookie);
    expect(status).toBe(413);
    expect(json?.ok).toBe(false);
    expect(json?.error).toMatch(/too large|Resolve match failed/i);
  });

  it("small bodies still reach the handlers (business outcomes, not 413)", async () => {
    // liveLookup with no model resolves ok:false and the route maps it to 400.
    const lookup = await postJson(
      "/api/competitor/liveLookup",
      JSON.stringify({ manufacturer: "Extron" }),
      sessionCookie,
    );
    expect(lookup.status).toBe(400);
    expect(lookup.json?.ok).toBe(false);

    // resolveMatch with no model is a business no-match, stays 200 {ok:false}.
    const match = await postJson(
      "/api/competitor/resolveMatch",
      JSON.stringify({ manufacturer: "", model: "" }),
      sessionCookie,
    );
    expect(match.status).toBe(200);
    expect(match.json?.ok).toBe(false);
  });
});
