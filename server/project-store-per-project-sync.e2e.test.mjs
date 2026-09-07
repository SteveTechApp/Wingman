/**
 * ADR-0001 Phase 1 per-project revisioned sync — end-to-end against the REAL
 * server.
 *
 * PUT /api/wingman/projects/:id commits ONE project document guarded by the
 * row's own revision (migration 015 wingman_project_put in supabase-tables
 * mode; the in-memory apply + whole-state write in file mode), coexisting with
 * the whole-store sync POST until clients migrate. The merge semantics are the
 * SAME mergeWorkspaceProjects the sync POST uses, so a stale PUT never drops a
 * concurrent member's edits: the incoming document is merged against the
 * current row per sub-document embedded timestamp and the per-project revision
 * counters, and the row's revision advances by one.
 *
 * These tests boot the real server in file mode and drive the real HTTP
 * handlers with two workspace sessions (owner + invited sales member):
 *
 *   1. PUT creates a project at revision 1 and GET returns it; the single
 *      project GET is read-only (never rewrites the store file);
 *   2. a member edit landing between the owner's PUTs merges: the owner's
 *      stale PUT (based on revision 1 while the row is at 2) preserves BOTH
 *      edits and lands at revision 3;
 *   3. validation and authorization: 401 without a session, 403 for a
 *      read-only (customer-role) member, 404 for an unknown project GET,
 *      400 for a URL/body id mismatch and for a missing baseRevision.
 *
 * Port: 8885 (distinct from hydration 8875, two-session 8873/8874, sync-
 * conflict 8883, incremental-hydration 8884, supabase fake 8880, load 8897).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 8885;
const BASE = `http://127.0.0.1:${PORT}`;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wingman-per-project-e2e-"));
const dbFile = path.join(dataDir, "runtime", "wingman-app-db.json");

let child = null;
let ownerToken = "";
let memberToken = "";
let customerToken = "";

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
  throw new Error("per-project e2e: test server did not become healthy in time");
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

async function signupAndGetToken(name, email) {
  const res = await requestJson("/api/wingman/auth/signup", {
    method: "POST",
    body: { name, company: "Per-Project E2E Co", email, password: "per-project-e2e-pass" },
  });
  expect(res.status, `signup should succeed: ${JSON.stringify(res.json)?.slice(0, 160)}`).toBe(200);
  const cookieHeader = (res.setCookie ?? []).find((header) => header.startsWith("wingman_session="));
  expect(cookieHeader, "signup should issue a wingman_session cookie").toBeTruthy();
  return cookieHeader.split(";")[0].split("=").slice(1).join("=");
}

async function inviteAndAcceptMember(ownerSession, role, label) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const invite = await requestJson("/api/wingman/workspace/invitations", {
    method: "POST",
    token: ownerSession,
    body: { email: `${label}-${suffix}@example.com`, role },
  });
  expect(invite.status, `invite should succeed: ${JSON.stringify(invite.json)?.slice(0, 160)}`).toBe(200);
  const inviteToken = new URL(invite.json?.invitation?.acceptUrl ?? "", BASE).searchParams.get("token");
  expect(inviteToken).toBeTruthy();

  const accept = await requestJson("/api/wingman/invitations/accept", {
    method: "POST",
    body: { token: inviteToken, name: label, password: "per-project-member-pass-123" },
  });
  expect(accept.status, `accept should succeed: ${JSON.stringify(accept.json)?.slice(0, 160)}`).toBe(200);
  const cookieHeader = (accept.setCookie ?? []).find((header) => header.startsWith("wingman_session="));
  expect(cookieHeader, "accept should issue the member session cookie").toBeTruthy();
  return cookieHeader.split(";")[0].split("=").slice(1).join("=");
}

function baseProject(projectId, name, stampIso) {
  return {
    id: projectId,
    name,
    owner: "Per-Project E2E Owner",
    stage: "Proposal Builder",
    status: "recommended",
    updated: "Just now",
    updatedAt: stampIso,
    createdAt: stampIso,
    customer: "Per-Project E2E Co",
    site: "London HQ",
    roomName: "Meeting Room 1",
    discoveryBrief: { summary: "Initial brief", savedAt: stampIso },
  };
}

/** PUT one project; returns the response (status + json). */
async function putProject(token, project, baseRevision) {
  return requestJson(`/api/wingman/projects/${encodeURIComponent(project.id)}`, {
    method: "PUT",
    token,
    body: { ...project, baseRevision },
  });
}

function withDiscoveryEdit(project, at, summary) {
  const next = JSON.parse(JSON.stringify(project));
  next.updated = "Just now";
  next.updatedAt = at;
  next.discoveryBrief = { ...project.discoveryBrief, summary, savedAt: at };
  return next;
}

function withProposalEdit(project, at, title) {
  const next = JSON.parse(JSON.stringify(project));
  next.updated = "Just now";
  next.updatedAt = at;
  next.proposal = { title, readinessScore: 95, updatedAt: at };
  return next;
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
      WINGMAN_UI_PORT: "3997",
      WINGMAN_DATA_DIR: dataDir,
      WINGMAN_STORAGE_MODE: "file",
    },
    stdio: "ignore",
    windowsHide: true,
  });
  await waitForHealth();
  const suffix = Date.now();
  ownerToken = await signupAndGetToken("Per-Project Owner", `pp-owner-${suffix}@example.com`);
  memberToken = await inviteAndAcceptMember(ownerToken, "sales", "pp-sales-member");
  customerToken = await inviteAndAcceptMember(ownerToken, "customer", "pp-readonly-member");
}, 30_000);

afterAll(() => {
  if (child) {
    child.kill("SIGTERM");
    child = null;
  }
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe("per-project revisioned sync (Phase 1)", () => {
  const t0 = "2026-09-03T14:00:00.000Z";
  const t1 = "2026-09-03T14:30:00.000Z";
  const t2 = "2026-09-03T15:00:00.000Z";
  const t3 = "2026-09-03T15:30:00.000Z";

  it("PUT creates a project at revision 1 and GET returns it without writing", async () => {
    const created = baseProject("pp-create-1", "Acme HQ Refresh", t0);
    const res = await putProject(ownerToken, created, 0);
    expect(res.status, `PUT create should succeed: ${JSON.stringify(res.json)?.slice(0, 200)}`).toBe(200);
    expect(res.json?.ok).toBe(true);
    expect(res.json?.project?.id).toBe("pp-create-1");
    expect(res.json?.project?.name).toBe("Acme HQ Refresh");
    expect(res.json?.project?.syncRevision).toBe(1);
    // The client vocabulary survives inside the payload row untouched.
    expect(res.json?.project?.stage).toBe("Proposal Builder");
    expect(res.json?.project?.status).toBe("recommended");

    // Single-project GET returns the same row and never rewrites the store:
    // the file's updatedAt must not move (a plain no-since LIST GET would).
    const before = readDbUpdatedAt();
    const got = await requestJson("/api/wingman/projects/pp-create-1", { token: memberToken });
    expect(got.status).toBe(200);
    expect(got.json?.project?.id).toBe("pp-create-1");
    expect(got.json?.project?.syncRevision).toBe(1);
    expect(got.json?.project?.name).toBe("Acme HQ Refresh");
    expect(readDbUpdatedAt()).toBe(before);

    const missing = await requestJson("/api/wingman/projects/pp-ghost", { token: ownerToken });
    expect(missing.status).toBe(404);
    expect(missing.json?.ok).toBe(false);
  });

  it("a clean PUT advances the revision; a stale PUT merges the member's edit instead of dropping it", async () => {
    // Owner creates the project at revision 1 (proposal content included).
    const initial = withProposalEdit(baseProject("pp-merge-1", "Merge Room", t0), t0, "v1 proposal");
    const created = await putProject(ownerToken, initial, 0);
    expect(created.status).toBe(200);
    expect(created.json?.project?.syncRevision).toBe(1);

    // Member edits the DISCOVERY BRIEF based on revision 1 -> revision 2.
    const memberDoc = baseProject("pp-merge-1", "Merge Room", t1);
    const memberEdit = await putProject(memberToken, withDiscoveryEdit(memberDoc, t1, "Member brief rewrite"), 1);
    expect(memberEdit.status, `member PUT should succeed: ${JSON.stringify(memberEdit.json)?.slice(0, 200)}`).toBe(200);
    expect(memberEdit.json?.project?.syncRevision).toBe(2);
    expect(memberEdit.json?.project?.discoveryBrief?.summary).toBe("Member brief rewrite");

    // Owner saves its NEWER proposal edit while still based on revision 1
    // (stale: the row is at 2). The owner's copy predates the member's brief
    // (it carries no discoveryBrief at all), so the per-project merge must
    // preserve BOTH the member's discovery brief and the owner's proposal -
    // never a silent drop.
    const ownerDoc = baseProject("pp-merge-1", "Merge Room", t2);
    delete ownerDoc.discoveryBrief;
    const stale = await putProject(ownerToken, withProposalEdit(ownerDoc, t2, "v2 owner proposal"), 1);
    expect(stale.status, `stale PUT should merge: ${JSON.stringify(stale.json)?.slice(0, 300)}`).toBe(200);
    expect(stale.json?.project?.syncRevision).toBe(3);
    expect(stale.json?.project?.proposal?.title).toBe("v2 owner proposal");
    expect(stale.json?.project?.discoveryBrief?.summary).toBe("Member brief rewrite");

    // A later reader sees exactly that merged state.
    const read = await requestJson("/api/wingman/projects/pp-merge-1", { token: memberToken });
    expect(read.status).toBe(200);
    expect(read.json?.project?.syncRevision).toBe(3);
    expect(read.json?.project?.proposal?.title).toBe("v2 owner proposal");
    expect(read.json?.project?.discoveryBrief?.summary).toBe("Member brief rewrite");
  });

  it("repeated saves of one project keep advancing the revision deterministically", async () => {
    const doc = baseProject("pp-sequential-1", "Sequential Room", t0);
    const first = await putProject(ownerToken, doc, 0);
    expect(first.status).toBe(200);
    expect(first.json?.project?.syncRevision).toBe(1);

    const second = await putProject(ownerToken, withDiscoveryEdit(doc, t1, "second save"), 1);
    expect(second.status).toBe(200);
    expect(second.json?.project?.syncRevision).toBe(2);
    expect(second.json?.project?.discoveryBrief?.summary).toBe("second save");

    const third = await putProject(ownerToken, withDiscoveryEdit(doc, t3, "third save"), 2);
    expect(third.status).toBe(200);
    expect(third.json?.project?.syncRevision).toBe(3);
    expect(third.json?.project?.discoveryBrief?.summary).toBe("third save");
  });

  it("validates the payload and enforces auth and role gates", async () => {
    // No session -> 401 on both PUT and GET.
    const unauthPut = await putProject("", baseProject("pp-denied-1", "Denied", t0), 0);
    expect(unauthPut.status).toBe(401);
    const unauthGet = await requestJson("/api/wingman/projects/pp-denied-1");
    expect(unauthGet.status).toBe(401);

    // Read-only (customer) member cannot PUT -> 403.
    const denied = await putProject(customerToken, baseProject("pp-denied-1", "Denied", t0), 0);
    expect(denied.status).toBe(403);

    // URL/body id mismatch -> 400.
    const doc = baseProject("pp-body-id", "Body Id", t0);
    const mismatch = await requestJson("/api/wingman/projects/pp-url-id", {
      method: "PUT",
      token: ownerToken,
      body: { ...doc, baseRevision: 0 },
    });
    expect(mismatch.status).toBe(400);
    expect(mismatch.json?.error).toContain("id mismatch");

    // Missing baseRevision -> 400.
    const noBase = await requestJson("/api/wingman/projects/pp-body-id", {
      method: "PUT",
      token: ownerToken,
      body: doc,
    });
    expect(noBase.status).toBe(400);
    expect(noBase.json?.error).toContain("baseRevision");

    // A valid PUT still works after all the rejections.
    const ok = await putProject(ownerToken, doc, 0);
    expect(ok.status).toBe(200);
    expect(ok.json?.project?.syncRevision).toBe(1);
  });
});
