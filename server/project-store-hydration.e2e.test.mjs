/**
 * ADR-0001 Phase 0 contract tests — reload-after-successful-sync thinning
 * hazard in projectStore hydration.
 *
 * Background (docs/design/0001-project-workspace-persistence.md §1.3.1):
 * the client stores the rich project document (discovery brief, selections,
 * compare runs, proposal, ...) in localStorage under `wingman-project-store-v1`
 * and uploads it to POST /api/wingman/projects/sync. The server's
 * `sanitizeProject` is an allowlist that stores only a thin shell but keeps
 * the client's own `updatedAt`. Hydration (GET /api/wingman/projects →
 * hydrateProjectStoreFromBackendOnce) replaces any local project whose
 * updatedAt is NOT newer than the backend copy — so on the next page load
 * after a successful sync (equal timestamps) the rich local content can be
 * replaced by the thin shell and then persisted, losing it from both places.
 *
 * These tests boot the REAL server (throwaway port + data dir, file storage),
 * sign up a real workspace session, drive the REAL client projectStore module
 * in-process against that server, and answer the question with assertions:
 *
 *   1. strictly-newer local project survives hydration (known-good path);
 *   2. equal-aged backend copy from a successful sync must NOT thin the
 *      richer local project on reload (the hazard contract);
 *   3. an equal-aged THIN backend row (db surgery) must not displace the
 *      richer local document (the hazard's residual data-shape);
 *   4. offline-then-reload: a locally-edited (never-synced) sub-document must
 *      survive hydration even when the backend WHOLE project is newer (a
 *      different sub-document advanced via another session) — and the
 *      backend's newer sub-document must be adopted too (no loss either way);
 *   5. two-tab: a reloading tab must adopt the other tab's newer sub-document
 *      from the backend even when the whole-project timestamps TIE.
 *
 * Cases 4-5 pin the per-sub-document hydration merge (ADR-0001 §1.2f): the
 * whole-project LWW they replace silently dropped the offline edit (case 4)
 * and left the reloading tab blind to the other tab's edit (case 5).
 *
 * A SECOND describe boots the same real server in supabase-tables mode
 * against a stateful fake PostgREST and syncs a REAL client project whose
 * stage/status speak the UI vocabulary ("Proposal Builder"/"recommended").
 * The commit's wingman_projects row columns are CHECK-constrained to the
 * canonical pipeline vocabulary (migration 001); before ADR-0001 §1.2g the
 * server copied the client strings verbatim and every real project failed the
 * commit with a Postgres 23514. Case 6 asserts the row columns are
 * canonicalised while the client strings round-trip untouched inside the
 * payload blob.
 *
 * The client module is imported with vi.resetModules + vi.stubEnv so the
 * backend-sync build flag (`VITE_WINGMAN_ENABLE_PROJECT_BACKEND_SYNC`) is on
 * for this suite only, exactly as production bakes it on.
 *
 * Port: 8875 (distinct from 413 test 8876, agents 8877/8878, unread-tail
 * 8879, supabase-tables stage-gap server 8880, load-test 8897, e2e-smoke
 * 8892, docx-check 8893, stranded-loop 8894, contract check 8898, workflow
 * check 8899).
 */
import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 8875;
const BASE = `http://127.0.0.1:${PORT}`;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wingman-hydration-e2e-"));

// Second real server, in supabase-tables mode against a fake PostgREST.
const SUPABASE_PORT = 8880;
const SUPABASE_BASE = `http://127.0.0.1:${SUPABASE_PORT}`;
const supabaseDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wingman-hydration-supabase-"));

const CLIENT_TOKEN_KEY = "wingman.projectSyncToken";
const DB_FILE_REL = path.join("runtime", "wingman-app-db.json");

let child = null;
let sessionToken = "";
let workspaceId = "";
let originalFetch = null;

async function waitForHealth(timeoutMs = 20_000, base = BASE) {
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
  throw new Error(`hydration e2e: test server at ${base} did not become healthy in time`);
}

async function signupAndCaptureToken(base = BASE, emailPrefix = "hydration") {
  const res = await fetch(`${base}/api/wingman/auth/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Hydration E2E User",
      company: "Hydration E2E Co",
      email: `${emailPrefix}-${Date.now()}@example.com`,
      password: "hydration-e2e-pass",
    }),
  });
  expect(res.status).toBe(200);
  const setCookie = res.headers.getSetCookie().find((header) => header.startsWith("wingman_session="));
  expect(setCookie, "signup should issue a wingman_session cookie").toBeTruthy();
  const json = await res.json();
  workspaceId = json.session?.workspace?.id || "";
  // The cookie value IS the raw session token; the client sends it as
  // `Authorization: Bearer <token>` (projectStore buildProjectApiRequest) and
  // the server accepts it (getTokenFromRequest).
  return setCookie.split(";")[0].split("=").slice(1).join("=");
}

/**
 * The client module calls fetch with RELATIVE endpoint paths (e.g.
 * "/api/wingman/projects") — in the browser they resolve against the page
 * origin. Node's fetch rejects relative URLs, so the suite shims globalThis.fetch
 * to absolutize them against the spawned server, exactly like same-origin.
 */
function patchFetchForSameOrigin(base = BASE) {
  if (originalFetch) return;
  originalFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const url = typeof input === "string" && input.startsWith("/") ? `${base}${input}` : input;
    return originalFetch(url, init);
  };
}

function unpatchFetch() {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
    originalFetch = null;
  }
}

function readFileModeDb() {
  return JSON.parse(fs.readFileSync(path.join(dataDir, DB_FILE_REL), "utf8"));
}

function writeFileModeDb(db) {
  fs.writeFileSync(path.join(dataDir, DB_FILE_REL), JSON.stringify(db), "utf8");
}

function stripRichFieldsFromStoredProject(db, projectId) {
  // Simulates a THIN server row of the same age: a legacy/allowlist copy that
  // kept the client's updatedAt but lost the work-product fields. This is the
  // exact row shape ADR-0001 §1.2 worried the sanitizer produced.
  const state = db.projectsByWorkspace?.[workspaceId];
  const project = state?.projects?.find((item) => item.id === projectId);
  if (!project) throw new Error(`db surgery: project ${projectId} not found in the file store`);
  for (const key of ["discoveryBrief", "productSelections", "compareRuns", "proposal", "workflow", "proposalVersions", "requirements", "auditTrail"]) {
    delete project[key];
  }
  return project;
}

async function requestJson(requestPath, { method = "GET", body, token = "", base = BASE } = {}) {
  const headers = { accept: "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(`${base}${requestPath}`, {
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
  return { status: res.status, json };
}

/**
 * A rich client-side project, shaped exactly like what projectStore.ts writes
 * to localStorage and POSTs to /api/wingman/projects/sync. The fields under
 * test are the ones `sanitizeProject` on the server drops (thin shell).
 */
function makeRichProject(projectId, updatedAtIso) {
  return {
    id: projectId,
    name: "Acme HQ Meeting Room Refresh",
    owner: "Hydration E2E User",
    ownerId: "hydration-owner",
    stage: "Proposal Builder",
    status: "recommended",
    updated: "Just now",
    resumeTo: "/wingman/proposal",
    createdAt: updatedAtIso,
    updatedAt: updatedAtIso,
    discoveryBrief: {
      savedAt: updatedAtIso,
      roomModel: {
        customer: "Acme Corp",
        roomType: "Meeting room / boardroom",
        estimatedAreaM2: 48,
      },
      capturedPercent: 94,
      missingInformation: [],
      quoteSafetyStatus: "quote-ready",
    },
    productSelections: [
      { sku: "NHD-621-TX", quantity: 4, title: "NetworkHD 600 4K60 Encoder", family: "NetworkHD", status: "recommended", addedAt: updatedAtIso, source: "Recommendations", evidence: [], cautions: [] },
      { sku: "NHD-621-RX", quantity: 4, title: "NetworkHD 600 4K60 Decoder", family: "NetworkHD", status: "recommended", addedAt: updatedAtIso, source: "Recommendations", evidence: [], cautions: [] },
    ],
    compareRuns: [
      {
        id: "compare-run-1",
        createdAt: updatedAtIso,
        version: 1,
        competitorBrand: "Crestron",
        competitorSku: "DM-NVX-350",
        wyrestormSku: "NHD-621-TX",
        wyrestormTitle: "NetworkHD 600 4K60 Encoder",
        mode: "saved-history",
        summary: "Equivalent 1GbE AV-over-IP encode.",
        matchScore: 90,
        confidence: "High",
        matchType: "direct",
        evidence: ["Governed comparison profile."],
        source: "Competitor Compare",
      },
    ],
    proposal: {
      title: "Acme HQ Meeting Room Refresh - Proposal",
      summary: "NetworkHD-based AV refresh.",
      sections: ["Executive Summary", "Equipment and Pricing"],
      products: [],
      assumptions: ["Existing network switch is 1GbE capable."],
      updatedAt: updatedAtIso,
    },
    workflow: {
      source: "Proposal Builder",
      lastStep: "Proposal preview generated",
      nextRoute: "/wingman/proposal",
      updatedAt: updatedAtIso,
    },
  };
}

/** The per-project document projectStore.ts POSTs (backendProjectFromStored):
 *  the project spread plus customer/site/roomName/notes and the baseRevision
 *  echoed from the server revision its local copy was based on. */
function projectDocFromStored(project) {
  return {
    ...project,
    customer: project.owner,
    site: "",
    roomName: project.name,
    notes: `Resume workflow: ${project.resumeTo}`,
    baseRevision: project.syncRevision ?? 0,
  };
}

/**
 * The exact request projectStore.ts sends to /api/wingman/projects/sync.
 */
function syncBodyFromStoredProject(project) {
  return {
    activeProjectId: project.id,
    projects: [projectDocFromStored(project)],
  };
}

/** Minimal but full project both merge cases diverge from (distinct marker
 *  values per version so the test can tell WHICH version won a lane). */
function makeMergeProject(projectId, at) {
  return {
    id: projectId,
    name: "Acme HQ Meeting Room Refresh",
    owner: "Hydration E2E User",
    ownerId: "hydration-owner",
    stage: "Proposal Builder",
    status: "recommended",
    updated: "Just now",
    resumeTo: "/wingman/proposal",
    createdAt: at,
    updatedAt: at,
    discoveryBrief: {
      savedAt: at,
      roomModel: { customer: "Acme Corp" },
      capturedPercent: 40,
      missingInformation: [],
      quoteSafetyStatus: "quote-ready",
    },
    proposal: {
      title: "Acme Proposal - base",
      summary: "Base design.",
      sections: [],
      products: [],
      assumptions: [],
      updatedAt: at,
    },
  };
}

function withBriefEdit(project, at, capturedPercent, customer) {
  const next = JSON.parse(JSON.stringify(project));
  next.updatedAt = at;
  next.discoveryBrief = {
    ...project.discoveryBrief,
    savedAt: at,
    capturedPercent,
    roomModel: { customer },
  };
  return next;
}

function withProposalEdit(project, at, title) {
  const next = JSON.parse(JSON.stringify(project));
  next.updatedAt = at;
  next.proposal = {
    ...project.proposal,
    title,
    summary: `${title} - summary`,
    updatedAt: at,
  };
  return next;
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
  sessionToken = await signupAndCaptureToken();
}, 30_000);

afterAll(() => {
  if (child) {
    child.kill("SIGTERM");
    child = null;
  }
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe("projectStore hydration after a backend sync", () => {
  beforeEach(() => {
    // Fresh browser per test: the suite runs with the backend-sync build flag
    // enabled (as production bakes it on), and the client module must be
    // re-imported so its module-level session state is reset like a page load.
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.resetModules();
    vi.stubEnv("VITE_WINGMAN_ENABLE_PROJECT_BACKEND_SYNC", "true");
    window.localStorage.setItem(CLIENT_TOKEN_KEY, sessionToken);
    patchFetchForSameOrigin();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    unpatchFetch();
  });

  it("keeps the strictly-newer local project over the backend copy during hydration", async () => {
    const projectStore = await import("../src/wingman2/data/projectStore");
    expect(projectStore.projectBackendSyncEnabled()).toBe(true);

    // Rep state at T0: rich local project; a first sync pushed the same (thin)
    // shell at T0, so the backend copy is older than the follow-up edit below.
    const t0 = "2026-09-03T09:00:00.000Z";
    const t1 = "2026-09-03T09:30:00.000Z";
    const project = makeRichProject("newer-local-proj", t0);

    projectStore.writeProjectStore(
      { projects: [project], proposalDrafts: [], activeProjectId: project.id, syncStatus: { state: "local", message: "Saved in this browser.", updatedAt: t0 } },
      { syncBackend: false },
    );

    // Simulate the debounced backend sync of the T0 edit (deterministic: the
    // real path is writeProjectStore -> scheduleBackendProjectSync with a 600ms
    // debounce; here we fire the identical POST directly).
    const firstSync = await requestJson("/api/wingman/projects/sync", {
      method: "POST",
      token: sessionToken,
      body: syncBodyFromStoredProject(project),
    });
    expect(firstSync.status).toBe(200);

    // Rep keeps working locally: newer edit at T1 (not yet synced).
    const newerProject = makeRichProject("newer-local-proj", t1);
    projectStore.writeProjectStore(
      { projects: [newerProject], proposalDrafts: [], activeProjectId: newerProject.id, syncStatus: { state: "local", message: "Saved in this browser.", updatedAt: t1 } },
      { syncBackend: false },
    );

    // Reload: hydration fetches the backend copy (T0) and must keep the local
    // T1 project with its rich content.
    await projectStore.hydrateProjectStoreFromBackend();

    const reloaded = projectStore.readProjectStore();
    const surviving = reloaded.projects.find((item) => item.id === "newer-local-proj");
    expect(surviving).toBeDefined();
    expect(surviving.updatedAt).toBe(t1);
    expect(surviving.discoveryBrief?.capturedPercent).toBe(94);
    expect(surviving.proposal?.title).toContain("Meeting Room Refresh");
  });

  it("does not thin the rich local project on reload after a successful sync of the same content", async () => {
    const projectStore = await import("../src/wingman2/data/projectStore");
    expect(projectStore.projectBackendSyncEnabled()).toBe(true);

    // Rep works at T, and the debounced backend sync succeeds: the server
    // stores a THIN shell of the project but keeps the client's own updatedAt,
    // so the backend copy is the same age as the local rich document.
    const t = "2026-09-03T10:00:00.000Z";
    const project = makeRichProject("reload-thinning-proj", t);

    projectStore.writeProjectStore(
      { projects: [project], proposalDrafts: [], activeProjectId: project.id, syncStatus: { state: "local", message: "Saved in this browser.", updatedAt: t } },
      { syncBackend: false },
    );

    const sync = await requestJson("/api/wingman/projects/sync", {
      method: "POST",
      token: sessionToken,
      body: syncBodyFromStoredProject(project),
    });
    expect(sync.status).toBe(200);
    const backendProject = sync.json.projects.find((item) => item.id === project.id);
    expect(backendProject).toBeDefined();

    // The backend copy carries the client's own updatedAt unchanged AND the
    // full rich document: sanitizeProject spreads the source project, so this
    // is a full round-trip, not an allowlist shell. That full round-trip is
    // what makes the plain reload-after-sync safe; the assertion below pins it
    // (if a future refactor makes the server row thin, this test turns red and
    // the equal-aged reload case becomes the hazard exercised by test 3).
    expect(backendProject.updatedAt).toBe(t);
    expect(backendProject.discoveryBrief?.capturedPercent).toBe(94);

    // Reload: hydration runs with an equal-aged backend copy present.
    await projectStore.hydrateProjectStoreFromBackend();

    const reloaded = projectStore.readProjectStore();
    // Guard: hydration must have actually taken the remote path (not early-
    // returned because the sync flag/auth were unavailable).
    expect(["synced", "conflict"]).toContain(reloaded.syncStatus?.state);

    const surviving = reloaded.projects.find((item) => item.id === project.id);
    expect(surviving, "the project must survive the reload").toBeDefined();
    expect(surviving.discoveryBrief, "the discovery brief must survive the reload").toBeDefined();
    expect(surviving.discoveryBrief?.capturedPercent).toBe(94);
    expect(surviving.productSelections?.length).toBe(2);
    expect(surviving.compareRuns?.length).toBe(1);
    expect(surviving.proposal?.title).toContain("Meeting Room Refresh");
  });

  it("keeps the richer local project when an equal-aged backend row is thin (legacy/allowlist shape)", async () => {
    const projectStore = await import("../src/wingman2/data/projectStore");
    expect(projectStore.projectBackendSyncEnabled()).toBe(true);

    // Rep works at T and the sync succeeds — the server row is FULL. Then the
    // row is made thin by direct file-store surgery (same updatedAt kept):
    // this is the row shape the ADR's thinning hazard is about (legacy rows,
    // or a future allowlist refactor that drops the work-product fields).
    const t = "2026-09-03T11:00:00.000Z";
    const project = makeRichProject("thin-row-proj", t);

    projectStore.writeProjectStore(
      { projects: [project], proposalDrafts: [], activeProjectId: project.id, syncStatus: { state: "local", message: "Saved in this browser.", updatedAt: t } },
      { syncBackend: false },
    );

    const sync = await requestJson("/api/wingman/projects/sync", {
      method: "POST",
      token: sessionToken,
      body: syncBodyFromStoredProject(project),
    });
    expect(sync.status).toBe(200);
    expect(sync.json.projects.find((item) => item.id === project.id)?.updatedAt).toBe(t);

    // Server-side row surgery: strip the work product, keep the timestamp.
    const db = readFileModeDb();
    const thinned = stripRichFieldsFromStoredProject(db, project.id);
    expect(thinned.updatedAt).toBe(t);
    expect(thinned.discoveryBrief).toBeUndefined();
    writeFileModeDb(db);

    // Reload: hydration sees an equal-aged THIN backend row next to the rich
    // local project. The rich local content must survive, not be replaced by
    // the thin row and persisted as loss.
    await projectStore.hydrateProjectStoreFromBackend();

    const reloaded = projectStore.readProjectStore();
    expect(["synced", "conflict"]).toContain(reloaded.syncStatus?.state);

    const surviving = reloaded.projects.find((item) => item.id === project.id);
    expect(surviving, "the project must survive the reload").toBeDefined();
    expect(surviving.discoveryBrief, "rich local content must not be replaced by an equal-aged thin backend row").toBeDefined();
    expect(surviving.discoveryBrief?.capturedPercent).toBe(94);
    expect(surviving.proposal?.title).toContain("Meeting Room Refresh");
  });

  it("keeps the offline brief edit AND adopts the backend's newer proposal when the backend whole project is newer (offline-then-reload)", async () => {
    const projectStore = await import("../src/wingman2/data/projectStore");
    expect(projectStore.projectBackendSyncEnabled()).toBe(true);

    const t0 = "2026-09-03T12:00:00.000Z"; // shared baseline, synced while online
    const tOffline = "2026-09-03T12:10:00.000Z"; // rep's brief edit, never synced
    const tOther = "2026-09-03T12:20:00.000Z"; // another session's proposal edit, after the rep went offline

    // Shared baseline (server revision 1).
    const baseline = { ...makeMergeProject("offline-reload-proj", t0), syncRevision: 1 };
    const firstSync = await requestJson("/api/wingman/projects/sync", {
      method: "POST",
      token: sessionToken,
      body: syncBodyFromStoredProject(baseline),
    });
    expect(firstSync.status).toBe(200);

    // Rep goes offline and edits the BRIEF at tOffline. The edit never reaches
    // the server: the local copy still carries the revision (1) it was based on.
    const localOffline = withBriefEdit(baseline, tOffline, 55, "Acme Corp (offline edit)");
    projectStore.writeProjectStore(
      {
        projects: [localOffline],
        proposalDrafts: [],
        activeProjectId: localOffline.id,
        syncStatus: { state: "local", message: "Saved in this browser.", updatedAt: tOffline },
      },
      { syncBackend: false },
    );

    // Meanwhile another session edits the PROPOSAL at tOther and syncs: the
    // backend whole project is now NEWER than the rep's local offline copy.
    const otherSession = withProposalEdit({ ...baseline, syncRevision: 1 }, tOther, "Acme Proposal - other session rev");
    const otherSync = await requestJson("/api/wingman/projects/sync", {
      method: "POST",
      token: sessionToken,
      body: syncBodyFromStoredProject(otherSession),
    });
    expect(otherSync.status).toBe(200);

    // Rep comes back online and reloads. The whole-project comparison would
    // replace the local copy with the newer backend project, silently losing
    // the offline brief edit; the per-sub-document merge must keep the offline
    // brief (its embedded timestamp is newer than the backend brief) and adopt
    // the backend's newer proposal.
    await projectStore.hydrateProjectStoreFromBackend();

    const reloaded = projectStore.readProjectStore();
    expect(["synced", "conflict"]).toContain(reloaded.syncStatus?.state);
    const surviving = reloaded.projects.find((item) => item.id === "offline-reload-proj");
    expect(surviving, "the project must survive the reload").toBeDefined();
    expect(surviving.discoveryBrief?.capturedPercent, "the offline brief edit must survive hydration").toBe(55);
    expect(surviving.discoveryBrief?.roomModel?.customer, "the offline brief content must be the edited version").toBe("Acme Corp (offline edit)");
    expect(surviving.discoveryBrief?.savedAt).toBe(tOffline);
    expect(surviving.proposal?.title, "the backend's newer proposal must be adopted, not clobbered by the stale local copy").toBe("Acme Proposal - other session rev");
    expect(surviving.updatedAt, "the merged project must carry the newest whole-project time").toBe(tOther);
  });

  it("adopts the other tab's newer sub-document from the backend when whole-project timestamps tie (two-tab)", async () => {
    const projectStore = await import("../src/wingman2/data/projectStore");
    expect(projectStore.projectBackendSyncEnabled()).toBe(true);

    const t0 = "2026-09-03T13:00:00.000Z"; // shared baseline
    const tA = "2026-09-03T13:10:00.000Z"; // tab A's brief edit
    const tB = "2026-09-03T13:12:00.000Z"; // tab B's (this tab's) proposal edit

    // Shared baseline (revision 1), tab A edit (revision 2), tab B edit
    // (revision 3) all sync in order; the server merge keeps A's brief and
    // B's proposal regardless of who syncs last, so the backend holds both.
    const baseline = { ...makeMergeProject("two-tab-proj", t0), syncRevision: 1 };
    const baselineSync = await requestJson("/api/wingman/projects/sync", {
      method: "POST",
      token: sessionToken,
      body: syncBodyFromStoredProject(baseline),
    });
    expect(baselineSync.status).toBe(200);

    const tabA = withBriefEdit({ ...baseline, syncRevision: 1 }, tA, 72, "Acme Corp (tab A)");
    const tabASync = await requestJson("/api/wingman/projects/sync", {
      method: "POST",
      token: sessionToken,
      body: syncBodyFromStoredProject(tabA),
    });
    expect(tabASync.status).toBe(200);

    // Tab B edits the proposal from the SAME baseline: its sync carries the
    // stale t0 brief, which the server correctly keeps out of A's newer brief.
    const tabB = withProposalEdit({ ...baseline, syncRevision: 2 }, tB, "Acme Proposal - tab B rev");
    const tabBSync = await requestJson("/api/wingman/projects/sync", {
      method: "POST",
      token: sessionToken,
      body: syncBodyFromStoredProject(tabB),
    });
    expect(tabBSync.status).toBe(200);

    // This browser IS tab B: it holds its own divergent copy (stale t0 brief +
    // its own tB proposal) and has adopted revision 3 from its last sync
    // response — sync responses update the revision, never the content, so the
    // other tab's brief edit has never reached this local document.
    const tabBLocal = { ...tabB, syncRevision: 3 };
    projectStore.writeProjectStore(
      {
        projects: [tabBLocal],
        proposalDrafts: [],
        activeProjectId: tabBLocal.id,
        syncStatus: { state: "synced", message: "Project changes are synced to the workspace backend.", updatedAt: tB },
      },
      { syncBackend: false },
    );

    // Tab B reloads: the whole-project timestamps TIE (both tB — tab B's own
    // edit was the last whole-project change on the server too), so the old
    // whole-project LWW kept the stale local brief and tab B stayed blind to
    // tab A's edit. The per-sub-document merge must adopt A's newer brief by
    // its embedded timestamp while keeping B's own proposal.
    await projectStore.hydrateProjectStoreFromBackend();

    const reloaded = projectStore.readProjectStore();
    expect(["synced", "conflict"]).toContain(reloaded.syncStatus?.state);
    const surviving = reloaded.projects.find((item) => item.id === "two-tab-proj");
    expect(surviving, "the project must survive the reload").toBeDefined();
    expect(surviving.discoveryBrief?.capturedPercent, "the reloading tab must adopt the other tab's newer brief").toBe(72);
    expect(surviving.discoveryBrief?.roomModel?.customer).toBe("Acme Corp (tab A)");
    expect(surviving.discoveryBrief?.savedAt).toBe(tA);
    expect(surviving.proposal?.title, "the reloading tab's own proposal edit must survive").toBe("Acme Proposal - tab B rev");
  });
});

// ---------------------------------------------------------------------------
// Supabase-tables describe (ADR-0001 §1.2g): boot the real server in
// supabase-tables mode against a stateful fake PostgREST, drive the real
// client module, and prove a project speaking the client's UI vocabulary
// ("Proposal Builder"/"recommended") commits with CHECK-safe row columns while
// its document strings round-trip untouched.
// ---------------------------------------------------------------------------

const SUPABASE_TABLES = [
  "wingman_app_state",
  "wingman_db_generation",
  "wingman_users",
  "wingman_workspaces",
  "wingman_workspace_members",
  "wingman_workspace_invitations",
  "wingman_sessions",
  "wingman_projects",
  "wingman_audit_events",
  "wingman_telemetry_events",
];

const SUPABASE_SECTION_TO_TABLE = {
  users: "wingman_users",
  workspaces: "wingman_workspaces",
  memberships: "wingman_workspace_members",
  invitations: "wingman_workspace_invitations",
  sessions: "wingman_sessions",
  projects: "wingman_projects",
  auditEvents: "wingman_audit_events",
  telemetryEvents: "wingman_telemetry_events",
};

const fakeTables = new Map(); // table -> Map(id -> row)
const commitLog = []; // every wingman_snapshot_commit payload, in order

function fakeRowsFor(table) {
  if (!fakeTables.has(table)) fakeTables.set(table, new Map());
  return fakeTables.get(table);
}

for (const table of SUPABASE_TABLES) fakeRowsFor(table);
// Migration-013 register: the single 'global' generation row every snapshot
// commit must claim. Starts at 0 and moves +1 per successful commit, exactly
// like the real wingman_db_generation table.
fakeRowsFor("wingman_db_generation").set("global", { id: "global", generation: 0 });

/** Stateful fake PostgREST: table reads honour select/order/offset/limit and
 *  the count preference; the atomic snapshot commit reconciles each table
 *  (upsert payload rows, delete rows whose id is absent) exactly like
 *  migration 009. Semantics modelled on supabase-unread-tail.e2e.test.mjs. */
function fakePostgrestHandler(req, res) {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname.startsWith("/rest/v1/rpc/")) {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      let parsed;
      try {
        parsed = JSON.parse(body || "{}");
      } catch {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ message: "Invalid RPC payload" }));
        return;
      }
      // Migration-013 generation claim, mirroring wingman_snapshot_commit's
      // plpgsql: the commit must name the generation its snapshot was read at;
      // a claim against a moved register refuses with committed:false/stale:
      // true BEFORE touching any table (and the register bumps only on a
      // successful commit, exactly like the real function).
      const register = fakeRowsFor("wingman_db_generation");
      const globalRow = register.get("global");
      const current = globalRow ? Math.max(0, Number(globalRow.generation) || 0) : 0;
      const expected = parsed?.expected_generation;
      if (expected === undefined || expected === null) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ message: "wingman_snapshot_commit requires expected_generation" }));
        return;
      }
      if (Number(expected) !== current) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          committed: false,
          stale: true,
          reason: `snapshot was read at generation ${expected} but the current generation is ${current}`,
          expected_generation: expected,
          current_generation: current,
        }));
        return;
      }
      const { payload } = parsed;
      for (const [section, table] of Object.entries(SUPABASE_SECTION_TO_TABLE)) {
        const rows = payload?.[section];
        if (!Array.isArray(rows)) continue;
        const map = fakeRowsFor(table);
        const kept = new Set();
        for (const row of rows) {
          if (row?.id != null) {
            const key = String(row.id);
            kept.add(key);
            map.set(key, row);
          }
        }
        for (const key of [...map.keys()]) {
          if (!kept.has(key)) map.delete(key);
        }
      }
      register.set("global", { id: "global", generation: current + 1 });
      commitLog.push(payload);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ committed: true, generation: current + 1 }));
    });
    return;
  }

  const match = url.pathname.match(/^\/rest\/v1\/([^/]+)$/);
  if (!match) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: "Unknown PostgREST path" }));
    return;
  }
  const resource = match[1];
  if (!SUPABASE_TABLES.includes(resource)) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: `Table ${resource} not found` }));
    return;
  }

  const rows = [...fakeRowsFor(resource).values()];
  const total = rows.length;

  const order = url.searchParams.get("order"); // e.g. "id.asc" or "id"
  if (order) {
    const [column, direction] = order.split(".");
    const dir = direction === "desc" ? -1 : 1;
    rows.sort((a, b) => {
      const av = a?.[column];
      const bv = b?.[column];
      if (av == null && bv == null) return 0;
      if (av == null) return dir;
      if (bv == null) return -dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  const offsetParam = url.searchParams.get("offset");
  const limitParam = url.searchParams.get("limit");
  let from;
  let toExclusive;
  if (offsetParam !== null || limitParam !== null) {
    from = offsetParam !== null ? Math.max(0, Number(offsetParam) || 0) : 0;
    const limit = limitParam !== null ? Math.max(0, Number(limitParam) || 0) : total;
    toExclusive = Math.min(total, from + limit);
  } else {
    from = 0;
    toExclusive = total;
  }

  const prefer = String(req.headers.prefer || "");
  const wantCount = /count=(exact|planned|estimated)/.test(prefer);
  const slice = rows.slice(from, toExclusive);

  if (wantCount || total > 0) {
    const rangeStart = slice.length > 0 ? from : "*";
    const rangeEnd = slice.length > 0 ? from + slice.length - 1 : "*";
    res.setHeader("content-range", `${rangeStart}-${rangeEnd}/${total}`);
  }

  if (req.method === "HEAD") {
    res.writeHead(200);
    res.end();
    return;
  }
  if (req.method !== "GET") {
    res.writeHead(405, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: `Method ${req.method} not supported by the fake` }));
    return;
  }

  const select = url.searchParams.get("select") || "*";
  const projected =
    select === "*"
      ? slice
      : slice.map((row) => {
          const out = {};
          for (const column of select.split(",")) {
            const key = column.trim();
            if (key) out[key] = row[key];
          }
          return out;
        });

  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify(projected));
}

let supabaseChild = null;
let fakeServer = null;
let supabaseSessionToken = "";

/** The exact document projectStore.ts posts: full project + baseRevision. */
function makeVocabularyProject(projectId, at, stage, status) {
  return {
    id: projectId,
    name: `Acme ${stage} Project`,
    owner: "Hydration E2E User",
    ownerId: "hydration-owner",
    stage,
    status,
    updated: "Just now",
    resumeTo: stage === "Proposal Builder" ? "/wingman/proposal" : "/wingman/compare",
    createdAt: at,
    updatedAt: at,
    discoveryBrief: {
      savedAt: at,
      roomModel: { customer: "Acme Corp" },
      capturedPercent: 60,
      missingInformation: [],
      quoteSafetyStatus: "quote-ready",
    },
  };
}

describe("projectStore sync in supabase-tables mode (stage/status row vocabulary)", () => {
  beforeAll(async () => {
    // Fake PostgREST first, then the real server pointed at it.
    fakeServer = http.createServer(fakePostgrestHandler);
    await new Promise((resolve) => fakeServer.listen(0, "127.0.0.1", resolve));
    const fakePort = fakeServer.address().port;

    supabaseChild = spawn(process.execPath, ["server/competitor-lookup-server.mjs"], {
      cwd: projectRoot,
      env: {
        ...process.env,
        PORT: String(SUPABASE_PORT),
        WINGMAN_UI_PORT: "3996",
        WINGMAN_DATA_DIR: supabaseDataDir,
        WINGMAN_STORAGE_MODE: "supabase-tables",
        // Fail closed so a fake hiccup surfaces as a request failure instead of
        // a silent fallback to the throwaway file store.
        WINGMAN_STORAGE_FAIL_CLOSED: "true",
        SUPABASE_URL: `http://127.0.0.1:${fakePort}`,
        SUPABASE_SERVICE_ROLE_KEY: "fake-service-role-key",
        LOOKUP_PERSIST_RUNTIME_EVENTS: "false",
      },
      stdio: "ignore",
      windowsHide: true,
    });
    await waitForHealth(30_000, SUPABASE_BASE);
    supabaseSessionToken = await signupAndCaptureToken(SUPABASE_BASE, "hydration-supabase");
  }, 60_000);

  afterAll(() => {
    if (supabaseChild) {
      supabaseChild.kill("SIGTERM");
      supabaseChild = null;
    }
    if (fakeServer) {
      fakeServer.close();
      fakeServer = null;
    }
    fs.rmSync(supabaseDataDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.resetModules();
    vi.stubEnv("VITE_WINGMAN_ENABLE_PROJECT_BACKEND_SYNC", "true");
    window.localStorage.setItem(CLIENT_TOKEN_KEY, supabaseSessionToken);
    patchFetchForSameOrigin(SUPABASE_BASE);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    unpatchFetch();
  });

  it("canonicalises client stage/status into the CHECK-safe row columns and round-trips the original strings", async () => {
    const projectStore = await import("../src/wingman2/data/projectStore");
    expect(projectStore.projectBackendSyncEnabled()).toBe(true);

    // Two real client projects speaking the UI vocabulary, posted exactly as
    // projectStore.ts syncs them (backendProjectFromStored body + baseRevision).
    const at = "2026-09-03T14:00:00.000Z";
    const proposalProject = makeVocabularyProject("stage-gap-proposal", at, "Proposal Builder", "recommended");
    const compareProject = makeVocabularyProject("stage-gap-compare", at, "Competitor Compare", "caution");
    const sync = await requestJson(
      "/api/wingman/projects/sync",
      {
        method: "POST",
        token: supabaseSessionToken,
        base: SUPABASE_BASE,
        body: {
          activeProjectId: proposalProject.id,
          projects: [projectDocFromStored(proposalProject), projectDocFromStored(compareProject)],
        },
      },
    );
    expect(sync.status, `sync must succeed against the supabase-tables store: ${JSON.stringify(sync.json)?.slice(0, 200)}`).toBe(200);

    // The committed wingman_projects rows must carry CHECK-safe column values
    // (migration 001) - the exact thing real Postgres rejected before §1.2g -
    // while the payload blob keeps the client's document strings untouched.
    // The committed wingman_projects rows must carry CHECK-safe column values
    // (migration 001) - the exact thing real Postgres rejected before §1.2g -
    // while the payload blob keeps the client's document strings untouched.
    const rows = [...fakeRowsFor("wingman_projects").values()];
    const proposalRow = rows.find((row) => row?.id === "stage-gap-proposal");
    const compareRow = rows.find((row) => row?.id === "stage-gap-compare");
    expect(proposalRow, "the proposal project row must exist in the fake wingman_projects").toBeDefined();
    expect(compareRow, "the compare project row must exist in the fake wingman_projects").toBeDefined();
    expect(proposalRow.stage, "'Proposal Builder' must canonicalise to the CHECK-safe 'Proposal'").toBe("Proposal");
    expect(proposalRow.status, "'recommended' must canonicalise to the CHECK-safe 'Commercial Ready'").toBe("Commercial Ready");
    expect(compareRow.stage, "'Competitor Compare' must canonicalise to 'Design'").toBe("Design");
    expect(compareRow.status, "'caution' must canonicalise to 'In Progress'").toBe("In Progress");
    expect(proposalRow.payload?.stage, "the payload blob must keep the client's own stage string").toBe("Proposal Builder");
    expect(proposalRow.payload?.status, "the payload blob must keep the client's own status string").toBe("recommended");

    // Round trip: reload hydration must hand the client back its own
    // vocabulary, never the canonical row values.
    await projectStore.hydrateProjectStoreFromBackend();
    const reloaded = projectStore.readProjectStore();
    expect(["synced", "conflict"]).toContain(reloaded.syncStatus?.state);
    const surviving = reloaded.projects.find((item) => item.id === "stage-gap-proposal");
    expect(surviving, "the project must come back from hydration").toBeDefined();
    expect(surviving.stage, "the client must see its own stage after the round trip").toBe("Proposal Builder");
    expect(surviving.status, "the client must see its own status after the round trip").toBe("recommended");
    expect(surviving.discoveryBrief?.capturedPercent).toBe(60);
  });
});
