/**
 * Incremental project hydration (`since=revision`) — end-to-end against the
 * REAL server and the REAL client module.
 *
 * Hydration (GET /api/wingman/projects) used to download EVERY project in the
 * workspace on every reload and merge each against the local copy. With the
 * per-project revision counters (ADR-0001 Phase 2) the client can instead say
 * which revisions its copies are based on (X-Wingman-Since manifest); the
 * server returns only the rows that moved past those revisions, plus anything
 * the client never reported. A reload then downloads just the deltas.
 *
 * The SAFE side of the optimization is the contract these tests pin:
 *
 *   - a row whose syncRevision equals the reported revision is skipped only
 *     because the client provably holds its current content;
 *   - everything else is returned: rows a member moved, rows new to the
 *     client, rows whose reported revision is 0 (a syncConflict-flagged local
 *     copy must pull so hydration can adopt the row's newer content), and
 *     legacy rows without a revision;
 *   - a since-pull is READ-ONLY — it reports what changed and never rewrites
 *     the store (unlike the full GET, which persists its last-seen touch);
 *   - through the real module, a reload after a member edit adopts ONLY the
 *     changed project, and untouched projects keep their local copies.
 *
 * Port: 8884 (distinct from two-session 8873/8874, hydration 8875, 413 e2e
 * 8876, agents 8877/8878, unread-tail 8879, supabase fake 8880, two-process
 * 8881/8882, sync-conflict 8883, load-test 8897).
 */
import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 8884;
const BASE = `http://127.0.0.1:${PORT}`;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wingman-incremental-hydration-e2e-"));
const dbFile = path.join(dataDir, "runtime", "wingman-app-db.json");

const CLIENT_TOKEN_KEY = "wingman.projectSyncToken";
const SINCE_HEADER = "X-Wingman-Since";

let child = null;
let ownerToken = "";
let memberToken = "";
let originalFetch = null;

async function waitForHealth(timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch {
      // Server not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("incremental-hydration e2e: test server did not become healthy in time");
}

async function requestJson(requestPath, { method = "GET", body, token = "", headers = {} } = {}) {
  const requestHeaders = { accept: "application/json", ...headers };
  if (token) requestHeaders.authorization = `Bearer ${token}`;
  if (body !== undefined) requestHeaders["content-type"] = "application/json";
  const res = await fetch(`${BASE}${requestPath}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    // Non-JSON bodies are still worth asserting status on.
  }
  return { status: res.status, json, setCookie: res.headers.getSetCookie() };
}

async function inviteAndAcceptMember(ownerSession) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const invite = await requestJson("/api/wingman/workspace/invitations", {
    method: "POST",
    token: ownerSession,
    body: { email: `incremental-member-${suffix}@example.com`, role: "sales" },
  });
  expect(invite.status, `invite should succeed: ${JSON.stringify(invite.json)?.slice(0, 160)}`).toBe(200);
  const inviteToken = new URL(invite.json?.invitation?.acceptUrl ?? "", BASE).searchParams.get("token");
  expect(inviteToken).toBeTruthy();

  const accept = await requestJson("/api/wingman/invitations/accept", {
    method: "POST",
    body: { token: inviteToken, name: "Incremental Member", password: "member-incremental-pass-123" },
  });
  expect(accept.status, `accept should succeed: ${JSON.stringify(accept.json)?.slice(0, 160)}`).toBe(200);
  const memberCookie = accept.setCookie?.find?.((header) => header.startsWith("wingman_session=")) ?? null;
  expect(memberCookie, "accept should issue the member session cookie").toBeTruthy();
  return memberCookie.split(";")[0].split("=").slice(1).join("=");
}

/** The client module fetches RELATIVE endpoints; absolutize like same-origin. */
function patchFetchForSameOrigin() {
  if (originalFetch) return;
  originalFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const url = typeof input === "string" && input.startsWith("/") ? `${BASE}${input}` : input;
    return originalFetch(url, init);
  };
}

function unpatchFetch() {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
    originalFetch = null;
  }
}

function baseProject(projectId, name, t0) {
  return {
    id: projectId,
    name,
    owner: "Incremental E2E Owner",
    ownerId: "incremental-owner",
    stage: "Proposal Builder",
    status: "recommended",
    updated: "Just now",
    resumeTo: "/wingman/proposal",
    createdAt: t0,
    updatedAt: t0,
    proposal: {
      title: `${name} - Proposal`,
      summary: "AV refresh.",
      sections: ["Executive Summary"],
      products: [],
      assumptions: [],
      readinessScore: 88,
      updatedAt: t0,
    },
    discoveryBrief: {
      savedAt: t0,
      capturedPercent: 40,
      missingInformation: [],
      quoteSafetyStatus: "quote-ready",
    },
  };
}

function withProposalEdit(project, at, title) {
  const next = JSON.parse(JSON.stringify(project));
  next.updated = "Just now";
  next.updatedAt = at;
  next.proposal = { ...project.proposal, title, readinessScore: 95, updatedAt: at };
  return next;
}

async function postSync(token, projects, { activeProjectId } = {}) {
  const res = await requestJson("/api/wingman/projects/sync", {
    method: "POST",
    token,
    body: {
      activeProjectId: activeProjectId ?? projects[0]?.id ?? null,
      projects: projects.map((project) => ({ ...project, baseRevision: project.baseRevision ?? project.syncRevision ?? 0 })),
    },
  });
  expect(res.status, `sync should succeed: ${JSON.stringify(res.json)?.slice(0, 200)}`).toBe(200);
  return res.json?.projects ?? [];
}

function readDbUpdatedAt() {
  try {
    const raw = JSON.parse(fs.readFileSync(dbFile, "utf8"));
    return raw.updatedAt;
  } catch {
    return null;
  }
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
  const signup = await requestJson("/api/wingman/auth/signup", {
    method: "POST",
    body: {
      name: "Incremental E2E Owner",
      company: "Incremental E2E Co",
      email: `incremental-owner-${Date.now()}@example.com`,
      password: "incremental-e2e-pass",
    },
  });
  expect(signup.status).toBe(200);
  const ownerCookie = signup.setCookie?.find?.((header) => header.startsWith("wingman_session=")) ?? "";
  expect(ownerCookie, "signup should issue a wingman_session cookie").toBeTruthy();
  ownerToken = ownerCookie.split(";")[0].split("=").slice(1).join("=");
  memberToken = await inviteAndAcceptMember(ownerToken);
}, 30_000);

afterAll(() => {
  if (child) {
    child.kill("SIGTERM");
    child = null;
  }
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe("incremental hydration (since=revision)", () => {
  const t0 = "2026-09-03T13:00:00.000Z";
  const t1 = "2026-09-03T13:30:00.000Z";

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.resetModules();
    vi.stubEnv("VITE_WINGMAN_ENABLE_PROJECT_BACKEND_SYNC", "true");
    window.localStorage.setItem(CLIENT_TOKEN_KEY, memberToken);
    patchFetchForSameOrigin();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    unpatchFetch();
  });

  it("returns only moved rows to a since manifest, and the pull never writes", async () => {
    // Owner creates two projects on the server (each seeded at revision 1).
    const alpha = baseProject("inc-alpha", "Alpha Room", t0);
    const beta = baseProject("inc-beta", "Beta Room", t0);
    const synced = await postSync(ownerToken, [alpha, beta]);
    expect(synced).toHaveLength(2);
    expect(synced.map((project) => project.syncRevision)).toEqual([1, 1]);

    // Full GET: both rows, revision 1, measured payload.
    const full = await requestJson("/api/wingman/projects", { token: memberToken });
    expect(full.status).toBe(200);
    expect(full.json.projects.map((project) => project.id).sort()).toEqual(["inc-alpha", "inc-beta"]);
    const fullBytes = JSON.stringify(full.json).length;

    // Since GET with exact revisions: nothing moved -> no projects, much smaller.
    const since = await requestJson("/api/wingman/projects", {
      token: memberToken,
      headers: { [SINCE_HEADER]: JSON.stringify({ "inc-alpha": 1, "inc-beta": 1 }) },
    });
    expect(since.status).toBe(200);
    expect(since.json.projects).toEqual([]);
    const sinceBytes = JSON.stringify(since.json).length;
    expect(sinceBytes, "a no-change pull must be dramatically smaller than the full store").toBeLessThan(fullBytes / 5);

    // Since GET with one stale entry: only that row returns.
    const stale = await requestJson("/api/wingman/projects", {
      token: memberToken,
      headers: { [SINCE_HEADER]: JSON.stringify({ "inc-alpha": 0, "inc-beta": 1 }) },
    });
    expect(stale.status).toBe(200);
    expect(stale.json.projects.map((project) => project.id)).toEqual(["inc-alpha"]);
    expect(stale.json.projects[0].syncRevision).toBe(1);

    // An unknown id (new to the client) is always returned.
    const unknown = await requestJson("/api/wingman/projects", {
      token: memberToken,
      headers: { [SINCE_HEADER]: JSON.stringify({ "inc-alpha": 1 }) },
    });
    expect(unknown.status).toBe(200);
    expect(unknown.json.projects.map((project) => project.id)).toEqual(["inc-beta"]);

    // Malformed manifests are rejected with 400, never misread as full pulls.
    for (const bad of ["{not json", "[1,2]", '"a string"']) {
      const rejected = await requestJson("/api/wingman/projects", {
        token: memberToken,
        headers: { [SINCE_HEADER]: bad },
      });
      expect(rejected.status, `manifest ${bad} should 400`).toBe(400);
    }

    // A since-pull is READ-ONLY: the file-mode db (whose writeDb stamps
    // updatedAt) must NOT move across a since GET, while the full GET does
    // persist its last-seen touch.
    const beforeFull = readDbUpdatedAt();
    await requestJson("/api/wingman/projects", { token: memberToken });
    await new Promise((resolve) => setTimeout(resolve, 250));
    const afterFull = readDbUpdatedAt();
    expect(afterFull).not.toBeNull();
    expect(afterFull).not.toBe(beforeFull);

    const beforeSince = readDbUpdatedAt();
    await requestJson("/api/wingman/projects", {
      token: memberToken,
      headers: { [SINCE_HEADER]: JSON.stringify({ "inc-alpha": 1, "inc-beta": 1 }) },
    });
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(readDbUpdatedAt()).toBe(beforeSince);
  });

  it("the client module hydrates ONLY the changed project after a member edit", async () => {
    const projectStore = await import("../src/wingman2/data/projectStore");
    expect(projectStore.projectBackendSyncEnabled()).toBe(true);

    // This test owns its own project ids (the first test already created
    // inc-alpha/inc-beta in the same workspace at revision 1).
    const alpha = baseProject("inc-a2", "Alpha Two", t0);
    const beta = baseProject("inc-b2", "Beta Two", t0);
    const synced = await postSync(ownerToken, [alpha, beta]);
    expect(synced).toHaveLength(2);
    expect(synced.map((project) => project.syncRevision)).toEqual([1, 1]);

    // First load on this device: empty store -> the pull has nothing to
    // report, so the server returns everything and the module adopts both.
    projectStore.writeProjectStore(
      { projects: [], proposalDrafts: [], activeProjectId: null, syncStatus: { state: "local", message: "Saved in this browser." } },
      { syncBackend: false },
    );
    await projectStore.hydrateProjectStoreFromBackend();
    let store = projectStore.readProjectStore();
    expect(store.projects.map((project) => project.id).sort()).toEqual(["inc-a2", "inc-b2"]);
    expect(store.projects.find((project) => project.id === "inc-a2")?.syncRevision).toBe(1);
    expect(store.syncStatus?.state).toBe("synced");

    // Second reload with nothing changed: the pull returns no projects and the
    // store must be unchanged (both copies kept, no conflict). The module
    // memoizes hydration per page load (one fetch per reload), so each
    // simulated reload resets the session state first.
    projectStore.resetProjectBackendSyncSessionState();
    await projectStore.hydrateProjectStoreFromBackend();
    store = projectStore.readProjectStore();
    expect(store.projects).toHaveLength(2);
    expect(store.projects.find((project) => project.id === "inc-b2")?.name).toBe("Beta Two");
    expect(store.syncStatus?.state).toBe("synced");
    expect(store.projects.some((project) => project.syncConflict)).toBe(false);

    // Member edits ONLY alpha; beta stays untouched on the row.
    const ownerView = await requestJson("/api/wingman/projects", { token: ownerToken });
    const memberProject = ownerView.json.projects.find((project) => project.id === "inc-a2");
    await postSync(ownerToken, [withProposalEdit(memberProject, t1, "Alpha Two - member revised")], { activeProjectId: "inc-a2" });

    // Reload: ONLY alpha comes back (its row moved to revision 2); beta is
    // skipped and must keep its local copy byte-for-byte.
    projectStore.resetProjectBackendSyncSessionState();
    await projectStore.hydrateProjectStoreFromBackend();
    store = projectStore.readProjectStore();
    const alphaAfter = store.projects.find((project) => project.id === "inc-a2");
    const betaAfter = store.projects.find((project) => project.id === "inc-b2");
    expect(alphaAfter?.proposal?.title).toBe("Alpha Two - member revised");
    expect(alphaAfter?.syncRevision).toBe(2);
    expect(betaAfter?.name).toBe("Beta Two");
    expect(betaAfter?.syncRevision).toBe(1);
    expect(betaAfter?.proposal?.title).toBe("Beta Two - Proposal");
    expect(store.syncStatus?.state).toBe("synced");
  });
});
