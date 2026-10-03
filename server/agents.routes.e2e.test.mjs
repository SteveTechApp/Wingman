import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, spawnSync } from "node:child_process";
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
// (8876), tools/api-contract-check.mjs (8898) and check:workflow (8899). A
// SECOND server on 8878 runs WITHOUT WINGMAN_AGENT_FORCE_MOCK and without a
// Gemini key — the negative control: the guru route must fail loudly (400)
// instead of silently returning mock data.
const PORT = 8877;
const BASE = `http://127.0.0.1:${PORT}`;
const NEG_PORT = 8878;
const NEG_BASE = `http://127.0.0.1:${NEG_PORT}`;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wingman-agents-e2e-"));
const negDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wingman-agents-neg-"));
// 1x1 transparent PNG, enough for the vision-context route to accept.
const PNG_1PX =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

// The architect/validate routes back their recommendations with the canonical
// WyreStorm product store (data/wingman-canonical-product-store.json), which
// is a gitignored GENERATED artifact (~14 MB). CI generates it before testing,
// but a fresh `npm test` / `verify:fast` checkout does not - and without it
// loadCatalogContext() reads zero records, the architect returns no
// recommended products, and this suite fails on a clean clone. Generate the
// store here (only when actually missing) so the suite is self-sufficient
// instead of relying on a pre-existing generated file or an earlier command
// having happened to run data:canonical-products first.
const CANONICAL_STORE = path.join(projectRoot, "data", "wingman-canonical-product-store.json");

function ensureCanonicalStore() {
  if (fs.existsSync(CANONICAL_STORE)) return;
  // eslint-disable-next-line no-console
  console.log("[agents-e2e] Canonical product store missing - generating it (one-time).");
  // `shell: true` so the npm shim resolves on every platform (npm.cmd on
  // Windows) - the same convention the repo's other npm-spawning tools use.
  const run = spawnSync("npm", ["run", "data:canonical-products"], {
    cwd: projectRoot,
    stdio: "inherit",
    shell: true,
  });
  if (run.status !== 0 || !fs.existsSync(CANONICAL_STORE)) {
    throw new Error(
      `[agents-e2e] data/wingman-canonical-product-store.json is missing and could not be generated ` +
        `(npm run data:canonical-products exited ${run.status}). Run it manually and re-run this suite.`,
    );
  }
}

let child = null;
let sessionCookie = "";
let negChild = null;
let negSessionCookie = "";

async function waitForHealth(url = BASE, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return;
    } catch {
      // Server not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("test server did not become healthy in time");
}

async function request(requestPath, { method = "POST", body, cookie = "", base = BASE } = {}) {
  const headers = { "content-type": "application/json" };
  if (cookie) headers.cookie = cookie;
  const res = await fetch(`${base}${requestPath}`, {
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

async function signupAndCaptureCookie(url = BASE) {
  const res = await fetch(`${url}/api/wingman/auth/signup`, {
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
  // The architect/validate assertions depend on live catalog records, so the
  // store must exist BEFORE the server boots (its route cache snapshots the
  // catalog on first load).
  ensureCanonicalStore();

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
  if (negChild) {
    negChild.kill("SIGTERM");
    negChild = null;
  }
  fs.rmSync(dataDir, { recursive: true, force: true });
  fs.rmSync(negDataDir, { recursive: true, force: true });
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

describe("phase-1 agent routes (discovery, architect, validate, run-pipeline, proposal)", () => {
  // Realistic discovery brief for a boardroom: the same shape the UI derives
  // before handing off to the architect phase.
  function boardroomBrief() {
    return {
      briefVersion: "1.0",
      summary: "boardroom, 4 sources, 2 displays, 25m max run",
      solutionIntent: "presentation",
      roomProfile: {
        roomType: "boardroom",
        displayCount: 2,
        sourceCount: 4,
        zones: 1,
        maxDistanceM: 25,
        videoWall: false,
        videoWallLayout: "none",
        usbRequired: true,
        audioBreakoutRequired: false,
        controlRequired: true,
      },
      commercialProfile: {
        budgetLevel: "mid",
        priority: "quality",
      },
      constraints: [],
      missingInformation: [],
      assumptions: [],
      recommendedNextAction: "architect",
    };
  }

  const PHASE_1_ROUTES = [
    "/api/wingman/agents/discovery",
    "/api/wingman/agents/architect",
    "/api/wingman/agents/validate",
    "/api/wingman/agents/run-pipeline",
    "/api/wingman/agents/proposal",
  ];

  it.each(PHASE_1_ROUTES)("%s requires authentication", async (route) => {
    const { status, json } = await request(route, { body: {} });
    expect(status).toBe(401);
    expect(json?.ok).toBe(false);
  });

  it("POST /api/wingman/agents/discovery derives a boardroom brief from a realistic opportunity description", async () => {
    const { status, json } = await request("/api/wingman/agents/discovery", {
      cookie: sessionCookie,
      body: {
        projectId: "proj-e2e-boardroom",
        userInput:
          "Boardroom with 4 sources and 2 displays, 25m maximum cable run, USB-C laptop input, RS-232 control, audio breakout to wall outputs, mid-range budget",
        context: {
          roomType: "boardroom",
          customerName: "Acme HQ",
        },
      },
    });

    expect(status).toBe(200);
    expect(json?.ok).toBe(true);
    expect(json?.phase).toBe("discovery");
    const data = json.data;
    expect(data.briefVersion).toBe("1.0");
    expect(data.roomProfile).toMatchObject({
      roomType: "boardroom",
      displayCount: 2,
      sourceCount: 4,
      maxDistanceM: 25,
      videoWall: false,
      usbRequired: true,
      controlRequired: true,
    });
    expect(data.summary).toContain("2 displays");
    expect(data.recommendedNextAction).toBe("architect");
    expect(data.confidence).toBeGreaterThan(0.5);
    expect(data.missingInformation).toEqual([]);
    // Throwaway data dir: no stored workspace/project for this id.
    expect(data.projectContext.workspace).toBeNull();
    expect(data.projectContext.projectId).toBe("proj-e2e-boardroom");
    expect(data.roomProfile.audioBreakoutRequired).toBe(true);
  });

  it("POST /api/wingman/agents/architect resolves a matrix architecture backed by the live catalog", async () => {
    const { status, json } = await request("/api/wingman/agents/architect", {
      cookie: sessionCookie,
      body: { brief: boardroomBrief() },
    });

    expect(status).toBe(200);
    expect(json?.ok).toBe(true);
    expect(json?.phase).toBe("architect");
    const data = json.data;
    expect(data.architectureVersion).toBe("1.0");
    expect(data.catalogBacked).toBe(true);
    expect(data.recommendedArchitecture.family).toBe("matrix");
    expect(data.recommendedArchitecture.topology).toContain("4x2");
    // Multi-source presentation switching: MX/SW products matched from the
    // committed WyreStorm catalog by prefix + keyword scoring.
    expect(data.recommendedProducts.length).toBeGreaterThan(0);
    for (const product of data.recommendedProducts) {
      expect(product.sku).toBeTruthy();
      expect(product.role).toBe("matrix");
    }
    expect(data.recommendedNextAction).toBe("validate");
    expect(data.catalogStats.recordCount).toBeGreaterThan(0);
  });

  it("POST /api/wingman/agents/validate passes a fully-specified architecture and fails an unresolved one", async () => {
    // Chain the architect output into validate, exactly as the pipeline would.
    const architect = await request("/api/wingman/agents/architect", {
      cookie: sessionCookie,
      body: { brief: boardroomBrief() },
    });
    expect(architect.status).toBe(200);
    const architecture = architect.json.data;
    expect(architecture.recommendedProducts.length).toBeGreaterThan(0);

    const { status, json } = await request("/api/wingman/agents/validate", {
      cookie: sessionCookie,
      body: {
        brief: boardroomBrief(),
        architecture,
      },
    });

    expect(status).toBe(200);
    expect(json?.ok).toBe(true);
    expect(json?.phase).toBe("validate");
    const data = json.data;
    expect(data.validationVersion).toBe("1.0");
    expect(data.status).toBe("pass");
    // Every check resolved: topology from architect, no missing info, distance
    // captured, products attached, and the recommended SKUs exist in the live
    // catalog index (the architect returned them, so compatibility passes).
    const codes = new Map(data.checks.map((check) => [check.code, check]));
    expect(codes.get("TOPOLOGY").status).toBe("pass");
    expect(codes.get("COMPATIBILITY").status).toBe("pass");
    expect(data.blockingIssues).toEqual([]);
    expect(data.recommendedNextAction).toBe("ready-for-proposal");
    expect(data.confidence).toBe(0.86);

    // The validator's failure path: an architecture with no family.
    const failing = await request("/api/wingman/agents/validate", {
      cookie: sessionCookie,
      body: {
        brief: { roomProfile: { maxDistanceM: 0 }, missingInformation: ["source count"] },
        architecture: {
          recommendedArchitecture: { family: "unknown" },
          recommendedProducts: [],
        },
      },
    });
    expect(failing.status).toBe(200);
    expect(failing.json.data.status).toBe("fail");
    expect(failing.json.data.blockingIssues).toContain("Architecture family is not yet resolved.");
    expect(failing.json.data.recommendedNextAction).toBe("return-to-architect");
  });

  it("POST /api/wingman/agents/run-pipeline derives discovery + architecture + validation in one call", async () => {
    const { status, json } = await request("/api/wingman/agents/run-pipeline", {
      cookie: sessionCookie,
      body: {
        workspaceId: "ws-e2e-training",
        projectId: "proj-e2e-training",
        userInput:
          "Training room with 2 sources and 2 displays, a 15m cable run, USB-C BYOD input, no video wall, budget-conscious",
        context: { roomType: "training" },
      },
    });

    expect(status).toBe(200);
    expect(json?.ok).toBe(true);
    expect(json?.mode).toBe("phase1-real-data-pipeline");
    expect(json.discovery.briefVersion).toBe("1.0");
    expect(json.discovery.roomProfile.roomType).toBe("training");
    expect(json.discovery.roomProfile.sourceCount).toBe(2);
    expect(json.discovery.roomProfile.displayCount).toBe(2);
    expect(json.architecture.recommendedArchitecture.family).toBeTruthy();
    expect(json.architecture.recommendedNextAction).toBe("validate");
    expect(["pass", "pass-with-warnings"]).toContain(json.validation.status);
    expect(json.status).toBe(json.validation.status);
    expect(json.projectContext.workspace).toBeNull();
    // The raw route context carries workspace/project objects; the discovery's
    // own context echoes the requested project id.
    expect(json.discovery.projectContext.projectId).toBe("proj-e2e-training");
  });

  it("POST /api/wingman/agents/proposal accepts a validated brief and echoes it (template binding pending)", async () => {
    const body = {
      projectId: "proj-e2e-proposal",
      brief: boardroomBrief(),
      architecture: {
        recommendedArchitecture: { family: "matrix", topology: "4x2 matrix" },
        recommendedProducts: [{ sku: "MX-0402-MST", role: "matrix", qty: 1 }],
      },
      commercial: { budgetLevel: "mid" },
    };
    const { status, json } = await request("/api/wingman/agents/proposal", {
      cookie: sessionCookie,
      body,
    });

    expect(status).toBe(200);
    expect(json?.ok).toBe(true);
    expect(json?.phase).toBe("proposal");
    expect(json.note).toMatch(/template binding/i);
    expect(json.received).toEqual(body);
  });
});

describe("guru route config gate (negative control over real HTTP)", () => {
  // Second server: deliberately NO WINGMAN_AGENT_FORCE_MOCK and NO Gemini key.
  // A misconfigured agent must fail loudly at the route boundary (400 with a
  // clear error), never answer a question with silently-derived mock data.
  beforeAll(async () => {
    negChild = spawn(process.execPath, ["server/competitor-lookup-server.mjs"], {
      cwd: projectRoot,
      env: {
        ...process.env,
        PORT: String(NEG_PORT),
        WINGMAN_UI_PORT: "3998",
        WINGMAN_DATA_DIR: negDataDir,
        WINGMAN_STORAGE_MODE: "file",
        GEMINI_API_KEY: "",
        // WINGMAN_AGENT_FORCE_MOCK intentionally absent.
      },
      stdio: "ignore",
      windowsHide: true,
    });
    await waitForHealth(NEG_BASE);
    negSessionCookie = await signupAndCaptureCookie(NEG_BASE);
  }, 30_000);

  it("returns 400 with a config error instead of silently mocking when forceMock is off and no key is set", async () => {
    const { status, json } = await request("/api/wingman/agents/guru", {
      base: NEG_BASE,
      cookie: negSessionCookie,
      body: { question: "What switcher fits a boardroom?" },
    });

    expect(status).toBe(400);
    expect(json?.ok).toBe(false);
    expect(json?.phase).toBe("guru");
    expect(json?.error).toMatch(/GEMINI_API_KEY/i);
  });
});
