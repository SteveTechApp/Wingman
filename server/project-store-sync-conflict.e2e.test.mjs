/**
 * Sync-response conflict surfacing — end-to-end against the REAL server.
 *
 * When two reps edit the same project, a sync response whose merged document
 * differs from the document this browser SENT means another member's accepted
 * changes reached the row without this copy. The response handler in
 * projectStore.ts marks the project with the existing "conflict" sync state
 * and records WHICH lanes changed (project.syncConflict.fields), so the UI can
 * tell the rep what a team member changed.
 *
 * These tests boot the real server, create a workspace with TWO sessions
 * (the module's owner + an invited member), and drive the REAL projectStore
 * module (backend-sync build flag on, real fetch, real 600 ms debounce):
 *
 *   1. solo edits never look conflicted (response == what we sent);
 *   2. a member edit landing between our syncs marks the project conflict with
 *      the changed lane (proposal) while our own newer lane stays unmarked;
 *   3. after a reload-style hydration adopts the member's version, the next
 *      sync response matches our copy and CLEARS the conflict mark.
 *
 * Port: 8883 (distinct from hydration e2e 8875, two-session 8873/8874,
 * supabase fake 8880, load-test 8897).
 */
import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 8883;
const BASE = `http://127.0.0.1:${PORT}`;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wingman-sync-conflict-e2e-"));

const CLIENT_TOKEN_KEY = "wingman.projectSyncToken";

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
  throw new Error("sync-conflict e2e: test server did not become healthy in time");
}

async function requestJson(requestPath, { method = "GET", body, token = "" } = {}) {
  const headers = { accept: "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(`${BASE}${requestPath}`, {
    method,
    headers,
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

async function signupOwner() {
  const res = await requestJson("/api/wingman/auth/signup", {
    method: "POST",
    body: {
      name: "Conflict E2E Owner",
      company: "Conflict E2E Co",
      email: `conflict-owner-${Date.now()}@example.com`,
      password: "conflict-e2e-pass",
    },
  });
  expect(res.status).toBe(200);
  const cookie = res.setCookie.find((header) => header.startsWith("wingman_session="));
  expect(cookie, "signup should issue a wingman_session cookie").toBeTruthy();
  return cookie.split(";")[0].split("=").slice(1).join("=");
}

async function inviteAndAcceptMember(ownerSession) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const invite = await requestJson("/api/wingman/workspace/invitations", {
    method: "POST",
    token: ownerSession,
    body: { email: `conflict-member-${suffix}@example.com`, role: "sales" },
  });
  expect(invite.status, `invite should succeed: ${JSON.stringify(invite.json)?.slice(0, 160)}`).toBe(200);
  const inviteToken = new URL(invite.json?.invitation?.acceptUrl ?? "", BASE).searchParams.get("token");
  expect(inviteToken).toBeTruthy();

  const accept = await requestJson("/api/wingman/invitations/accept", {
    method: "POST",
    body: { token: inviteToken, name: "Conflict Member", password: "member-conflict-pass-123" },
  });
  expect(accept.status, `accept should succeed: ${JSON.stringify(accept.json)?.slice(0, 160)}`).toBe(200);
  const memberCookie = accept.setCookie?.find((header) => header.startsWith("wingman_session="));
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

/** Polls a predicate against readProjectStore until it holds or times out. */
async function waitForStore(projectStore, predicate, { timeoutMs = 15_000, label = "store state" } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate(projectStore.readProjectStore())) return;
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
  throw new Error(`timed out waiting for ${label}`);
}

function baseProject(projectId, t0) {
  return {
    id: projectId,
    name: "Acme HQ Meeting Room Refresh",
    owner: "Conflict E2E Owner",
    ownerId: "conflict-owner",
    stage: "Proposal Builder",
    status: "recommended",
    updated: "Just now",
    resumeTo: "/wingman/proposal",
    createdAt: t0,
    updatedAt: t0,
    discoveryBrief: {
      savedAt: t0,
      roomModel: { customer: "Acme Corp", roomType: "Meeting room / boardroom" },
      capturedPercent: 40,
      missingInformation: [],
      quoteSafetyStatus: "quote-ready",
    },
    proposal: {
      title: "Acme HQ Meeting Room Refresh - Proposal",
      summary: "NetworkHD-based AV refresh.",
      sections: ["Executive Summary"],
      products: [],
      assumptions: ["Existing network switch is 1GbE capable."],
      readinessScore: 88,
      updatedAt: t0,
    },
  };
}

function withBriefEdit(project, at) {
  const next = JSON.parse(JSON.stringify(project));
  next.updated = "Just now";
  next.updatedAt = at;
  next.discoveryBrief = { ...project.discoveryBrief, savedAt: at, capturedPercent: 70, missingInformation: ["Confirm switch capacity."] };
  return next;
}

function withProposalEdit(project, at, title) {
  const next = JSON.parse(JSON.stringify(project));
  next.updated = "Just now";
  next.updatedAt = at;
  next.proposal = { ...project.proposal, title, readinessScore: 95, updatedAt: at };
  return next;
}

/** The exact per-project document projectStore.ts POSTs. */
function projectDoc(project, baseRevision = 0) {
  return {
    ...project,
    customer: project.owner,
    site: "",
    roomName: project.name,
    notes: `Resume workflow: ${project.resumeTo}`,
    baseRevision,
  };
}

async function postSync(token, project, baseRevision = 0) {
  const res = await requestJson("/api/wingman/projects/sync", {
    method: "POST",
    token,
    body: { activeProjectId: project.id, projects: [projectDoc(project, baseRevision)] },
  });
  expect(res.status, `sync of ${project.id} should succeed`).toBe(200);
  return res.json?.projects?.[0];
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
  ownerToken = await signupOwner();
  memberToken = await inviteAndAcceptMember(ownerToken);
}, 30_000);

afterAll(() => {
  if (child) {
    child.kill("SIGTERM");
    child = null;
  }
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe("sync-response conflict surfacing", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.resetModules();
    vi.stubEnv("VITE_WINGMAN_ENABLE_PROJECT_BACKEND_SYNC", "true");
    window.localStorage.setItem(CLIENT_TOKEN_KEY, ownerToken);
    patchFetchForSameOrigin();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    unpatchFetch();
  });

  it("does not flag a SOLO sync and flags the changed lane when a member edit lands between our syncs", async () => {
    const projectStore = await import("../src/wingman2/data/projectStore");
    expect(projectStore.projectBackendSyncEnabled()).toBe(true);

    const t0 = "2026-09-03T09:00:00.000Z";
    const t1 = "2026-09-03T09:30:00.000Z";
    const t2 = "2026-09-03T10:00:00.000Z";
    const project = baseProject("conflict-flag-proj", t0);

    // First write syncs solo (nothing else in the row): must end "synced"
    // with NO conflict mark even though the response revision is ahead of the
    // initial base 0 - advancing the revision alone is not a conflict.
    projectStore.writeProjectStore(
      { projects: [project], proposalDrafts: [], activeProjectId: project.id, syncStatus: { state: "local", message: "Saved in this browser." } },
      { syncBackend: false },
    );
    projectStore.writeProjectStore(projectStore.readProjectStore(), {});
    await waitForStore(projectStore, (store) => store.projects.find((item) => item.id === project.id)?.syncRevision === 1, {
      label: "solo baseline sync (revision 1)",
    });
    let store = projectStore.readProjectStore();
    expect(store.syncStatus?.state).toBe("synced");
    expect(store.projects.find((item) => item.id === project.id)?.syncConflict).toBeUndefined();

    // Member edits the PROPOSAL on the server while we keep our local copy.
    const memberView = await requestJson("/api/wingman/projects", { token: memberToken });
    expect(memberView.status).toBe(200);
    const memberProject = memberView.json.projects.find((item) => item.id === project.id);
    expect(memberProject, "member must see the shared project").toBeDefined();
    const memberEdited = withProposalEdit(memberProject, t1, "Acme Proposal - revised by member");
    await postSync(memberToken, memberEdited, Number(memberProject.syncRevision) || 1);

    // We keep editing OUR lane (the discovery brief) and sync. The response
    // carries the member's proposal (never adopted into our copy), so the
    // sync handler must mark the project conflict with the changed lane.
    const localEdit = withBriefEdit(store.projects.find((item) => item.id === project.id), t2);
    projectStore.writeProjectStore({ ...store, projects: [localEdit] }, {});

    await waitForStore(
      projectStore,
      (current) => current.syncStatus?.state === "conflict" && (current.projects.find((item) => item.id === project.id)?.syncConflict?.fields ?? []).includes("proposal"),
      { label: "conflict flag with the changed proposal lane" },
    );
    store = projectStore.readProjectStore();
    const flagged = store.projects.find((item) => item.id === project.id);
    expect(store.syncStatus?.message).toContain("Proposal");
    expect(flagged?.syncConflict?.fields).toEqual(["proposal"]);
    expect(flagged?.discoveryBrief?.capturedPercent, "our own newer lane must not be flagged away").toBe(70);
    // The whole-project merge response is adopted only as a revision.
    expect(flagged?.syncRevision).toBe(3);
    expect(flagged?.proposal?.title, "the member's proposal is NOT adopted by a sync response").toBe("Acme HQ Meeting Room Refresh - Proposal");
  });

  it("clears the conflict once hydration adopts the member's version and the next sync matches", async () => {
    const projectStore = await import("../src/wingman2/data/projectStore");
    expect(projectStore.projectBackendSyncEnabled()).toBe(true);

    const t0 = "2026-09-03T11:00:00.000Z";
    const t1 = "2026-09-03T11:30:00.000Z";
    const t2 = "2026-09-03T12:00:00.000Z";
    const project = baseProject("conflict-clear-proj", t0);

    // Same setup as the flag test: solo baseline, then a member proposal edit.
    projectStore.writeProjectStore(
      { projects: [project], proposalDrafts: [], activeProjectId: project.id, syncStatus: { state: "local", message: "Saved in this browser." } },
      { syncBackend: false },
    );
    projectStore.writeProjectStore(projectStore.readProjectStore(), {});
    await waitForStore(projectStore, (store) => store.projects.find((item) => item.id === project.id)?.syncRevision === 1, {
      label: "solo baseline sync (revision 1)",
    });
    let store = projectStore.readProjectStore();

    const memberView = await requestJson("/api/wingman/projects", { token: memberToken });
    const memberProject = memberView.json.projects.find((item) => item.id === project.id);
    const memberEdited = withProposalEdit(memberProject, t1, "Acme Proposal - member version");
    await postSync(memberToken, memberEdited, Number(memberProject.syncRevision) || 1);

    const localEdit = withBriefEdit(store.projects.find((item) => item.id === project.id), t2);
    projectStore.writeProjectStore({ ...store, projects: [localEdit] }, {});
    await waitForStore(
      projectStore,
      (current) => (current.projects.find((item) => item.id === project.id)?.syncConflict?.fields ?? []).includes("proposal"),
      { label: "conflict flag before reconciliation" },
    );

    // A reload merges local with the backend: the member's newer proposal is
    // adopted into the local copy (hydration merge, ADR-0001 §1.2f).
    await projectStore.hydrateProjectStoreFromBackend();
    store = projectStore.readProjectStore();
    expect(store.projects.find((item) => item.id === project.id)?.proposal?.title).toBe("Acme Proposal - member version");

    // The next sync's response now MATCHES our copy on every lane: the
    // conflict mark must clear and the store returns to "synced".
    projectStore.writeProjectStore(projectStore.readProjectStore(), {});
    await waitForStore(
      projectStore,
      (current) => current.syncStatus?.state === "synced" && current.projects.find((item) => item.id === project.id)?.syncConflict === undefined,
      { label: "conflict cleared after reconciliation" },
    );
  });
});
