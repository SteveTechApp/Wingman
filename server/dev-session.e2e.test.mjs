import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Boots the real API twice: once as a development process and once as a
// production one. The development instance is the subject - it holds a real
// workspace session for a browser on this machine, and project sync then runs
// through the ordinary endpoints. The production instance proves the same route
// hands out no account there. Ports are distinct from the other suites
// (8876-8887, 8898-8899).
const DEV_PORT = 8888;
const PROD_PORT = 8889;
const DEV_BASE = `http://127.0.0.1:${DEV_PORT}`;
const PROD_BASE = `http://127.0.0.1:${PROD_PORT}`;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const devDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wingman-dev-session-"));
const prodDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wingman-dev-session-prod-"));

const children = [];

function boot(port, dataDir, extraEnv) {
  const child = spawn(process.execPath, ["server/competitor-lookup-server.mjs"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(port),
      WINGMAN_DATA_DIR: dataDir,
      WINGMAN_STORAGE_MODE: "file",
      GEMINI_API_KEY: "",
      ...extraEnv,
    },
    stdio: "ignore",
    windowsHide: true,
  });
  children.push(child);
  return child;
}

async function waitForHealth(base, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${base}/api/health`);
      if (res.ok) return;
    } catch {
      // Server not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`test server at ${base} did not become healthy in time`);
}

async function request(base, requestPath, { method = "GET", body, cookie = "", headers = {} } = {}) {
  const requestHeaders = { accept: "application/json", ...headers };
  if (cookie) requestHeaders.cookie = cookie;
  if (body !== undefined) requestHeaders["content-type"] = "application/json";
  const res = await fetch(`${base}${requestPath}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    // A non-JSON body is still worth asserting a status on.
  }
  return { status: res.status, json, setCookie: res.headers.getSetCookie() };
}

function sessionCookie(setCookie) {
  const header = setCookie.find((entry) => entry.startsWith("wingman_session="));
  return header ? header.split(";")[0] : "";
}

function baseProject(stampIso) {
  return {
    id: "dev-session-project",
    name: "Meeting Room 1",
    owner: "Wingman Dev",
    stage: "Proposal Builder",
    status: "recommended",
    updated: "Just now",
    updatedAt: stampIso,
    createdAt: stampIso,
    customer: "Wingman Local",
    site: "Local",
    roomName: "Meeting Room 1",
    discoveryBrief: { summary: "Local development project", savedAt: stampIso },
  };
}

beforeAll(async () => {
  boot(DEV_PORT, devDataDir, {});
  await waitForHealth(DEV_BASE);
  boot(PROD_PORT, prodDataDir, { NODE_ENV: "production" });
  await waitForHealth(PROD_BASE);
}, 40_000);

afterAll(() => {
  for (const child of children) child.kill("SIGTERM");
  children.length = 0;
  fs.rmSync(devDataDir, { recursive: true, force: true });
  fs.rmSync(prodDataDir, { recursive: true, force: true });
});

describe("local development workspace session", () => {
  let cookie = "";
  let workspaceId = "";

  it("signs this browser into a real workspace, with the permissions an owner holds", async () => {
    const { status, json, setCookie } = await request(DEV_BASE, "/api/wingman/auth/dev-session", { method: "POST" });

    expect(status).toBe(200);
    expect(json).toMatchObject({
      ok: true,
      session: {
        mode: "backend",
        user: { email: "dev@wingman.local" },
        workspaceRole: "owner",
        permissions: { canManageWorkspace: true, canEditProjects: true },
      },
    });
    cookie = sessionCookie(setCookie);
    workspaceId = json.session.workspace.id;
    expect(cookie, "the route should issue the ordinary session cookie").not.toBe("");
  });

  it("issues a session the rest of the API recognises", async () => {
    const session = await request(DEV_BASE, "/api/wingman/auth/session", { cookie });
    const workspace = await request(DEV_BASE, "/api/wingman/workspace", { cookie });

    expect(session.status).toBe(200);
    expect(session.json.session.workspace.id).toBe(workspaceId);
    expect(workspace.status).toBe(200);
    expect(workspace.json.workspace.id).toBe(workspaceId);
  });

  it("holds the projects a development browser syncs, which is the point of the session", async () => {
    const project = baseProject(new Date().toISOString());
    const sync = await request(DEV_BASE, "/api/wingman/projects/sync", {
      method: "POST",
      cookie,
      body: { activeProjectId: project.id, projects: [{ ...project, baseRevision: 0 }] },
    });
    expect(sync.status).toBe(200);

    const read = await request(DEV_BASE, "/api/wingman/projects", { cookie });
    expect(read.status).toBe(200);
    expect(read.json.projects.map((entry) => entry.id)).toContain("dev-session-project");
  });

  it("reuses that workspace on a later sign-in instead of seeding another", async () => {
    const again = await request(DEV_BASE, "/api/wingman/auth/dev-session", { method: "POST" });

    expect(again.status).toBe(200);
    expect(again.json.session.workspace.id).toBe(workspaceId);
    const read = await request(DEV_BASE, "/api/wingman/projects", { cookie: sessionCookie(again.setCookie) });
    expect(read.json.projects.map((entry) => entry.id)).toContain("dev-session-project");
  });

  it("refuses a request that came from another machine", async () => {
    const { status, json, setCookie } = await request(DEV_BASE, "/api/wingman/auth/dev-session", {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.9" },
    });

    expect(status).toBe(403);
    expect(json.ok).toBe(false);
    expect(sessionCookie(setCookie)).toBe("");
  });

  it("refuses a production process, where an account would be a real one", async () => {
    const { status, json, setCookie } = await request(PROD_BASE, "/api/wingman/auth/dev-session", { method: "POST" });

    expect(status).toBe(403);
    expect(json.ok).toBe(false);
    expect(sessionCookie(setCookie)).toBe("");
  });
});
