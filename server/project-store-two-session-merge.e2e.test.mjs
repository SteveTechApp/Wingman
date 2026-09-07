/**
 * ADR-0001 Phase B3 contract tests — two-session concurrent edits of the same
 * project must both survive the server merge.
 *
 * Milestone B3: "Test multi-workspace concurrency ... confirm neither edit is
 * silently lost." The realistic divergence is two SALES REPS (two sessions in
 * one workspace) each holding a local snapshot of the same project. Rep A
 * edits the discovery brief, Rep B edits the proposal — neither has seen the
 * other's change — and both sync. The server merge
 * (`mergeWorkspaceProjects` in server/wingman-app-store.mjs) used to be a
 * whole-project object spread, so whichever session synced LAST overwrote the
 * other's sub-document with its stale copy: one edit silently lost.
 *
 * This suite boots the REAL server (throwaway port + data dir, file storage),
 * creates a workspace with TWO sessions (owner + invited sales member via
 * /api/wingman/invitations), and runs the collision in BOTH sync orders:
 *
 *   order 1: A (brief edit) syncs first, then B (proposal edit) syncs second;
 *   order 2: B syncs first, then A syncs second.
 *
 * Both orders must converge to the same merged project containing A's brief
 * edit AND B's proposal edit. Each session's payload is the full StoredProject
 * document shaped exactly as projectStore.ts POSTs it (backendProjectFromStored
 * adds customer/site/roomName/notes and baseRevision), carrying the embedded
 * sub-document timestamps the client stamps on save (discoveryBrief.savedAt,
 * proposal.updatedAt, project.updatedAt).
 *
 * Phase 2 extension (ADR-0001): per-project revision counters. The server
 * tracks syncRevision per project, the client echoes it back as baseRevision,
 * and the merge resolves SAME-FIELD concurrent edits by a deterministic total
 * order - embedded edit time, then revision basis, then author id - instead of
 * by arrival order. The suites below run the same proposal-vs-proposal
 * collision in both sync orders and assert the SAME winner, including the
 * equal-timestamp case that the old "keep the stored copy" tie rule got wrong.
 *
 * Phase 2 extension, id-keyed collections (ADR-0001 §1.2i): the five id-
 * bearing work-product collections (requirements, compareRuns,
 * proposalVersions, productSelections, visualAssets) used to travel whole with
 * the project-level LWW winner, so the losing session's items were dropped
 * from the row permanently. They now merge PER ITEM by embedded write time
 * (by-id last-writer-wins, freshness-guarded removal), and the suites below
 * run concurrent collection edits in both sync orders across ALL five
 * collections: disjoint items from both sessions must union, and a same-item
 * collision must resolve to ONE whole item version (later embedded time wins;
 * an exact time tie resolves by the deterministic total content order, so
 * both sync orders converge to the same winner).
 *
 * Port: 8874 (distinct from hydration e2e 8875, 413 test 8876, agents
 * 8877/8878, unread-tail 8879, load-test 8897, e2e-smoke 8892, docx-check
 * 8893, stranded-loop 8894, contract check 8898, workflow check 8899).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 8874;
const BASE = `http://127.0.0.1:${PORT}`;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wingman-two-session-e2e-"));

let child = null;
let ownerToken = "";
let memberToken = "";

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
  throw new Error("two-session e2e: test server did not become healthy in time");
}

async function signup(name, email) {
  const res = await fetch(`${BASE}/api/wingman/auth/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, company: "Two Session Co", email, password: "two-session-pass" }),
  });
  expect(res.status).toBe(200);
  const setCookie = res.headers.getSetCookie().find((header) => header.startsWith("wingman_session="));
  expect(setCookie, "signup should issue a wingman_session cookie").toBeTruthy();
  return setCookie.split(";")[0].split("=").slice(1).join("=");
}

/** Owner invites a second sales rep; the invite is accepted unauthenticated and
 *  returns that rep's own session in the SAME workspace. */
async function inviteAndAcceptMember(ownerToken, memberEmail) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const inviteEmail = `${memberEmail}-${suffix}@example.com`;
  const invite = await requestJson("/api/wingman/workspace/invitations", {
    method: "POST",
    token: ownerToken,
    body: { email: inviteEmail, role: "sales" },
  });
  expect(invite.status, `invite should succeed: ${JSON.stringify(invite.json)?.slice(0, 160)}`).toBe(200);
  const acceptUrl = invite.json?.invitation?.acceptUrl;
  expect(typeof acceptUrl).toBe("string");
  const inviteToken = new URL(acceptUrl, BASE).searchParams.get("token");
  expect(inviteToken).toBeTruthy();

  const accept = await requestJson("/api/wingman/invitations/accept", {
    method: "POST",
    body: { token: inviteToken, name: "Member Rep", password: "member-pass-123" },
  });
  expect(accept.status, `accept should succeed: ${JSON.stringify(accept.json)?.slice(0, 160)}`).toBe(200);
  const memberCookie = accept.setCookie?.find((header) => header.startsWith("wingman_session="));
  expect(memberCookie, "accept should issue the member session cookie").toBeTruthy();
  return memberCookie.split(";")[0].split("=").slice(1).join("=");
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

function cloneProject(project) {
  return JSON.parse(JSON.stringify(project));
}

/** Baseline project both reps load: discovery brief + proposal both present. */
function makeBaseProject(projectId, t) {
  return {
    id: projectId,
    name: "Acme HQ Meeting Room Refresh",
    owner: "Owner Rep",
    ownerId: "owner",
    stage: "Proposal Builder",
    status: "recommended",
    updated: "Just now",
    resumeTo: "/wingman/proposal",
    createdAt: t,
    updatedAt: t,
    discoveryBrief: {
      savedAt: t,
      roomModel: { customer: "Acme Corp", roomType: "Meeting room / boardroom" },
      capturedPercent: 94,
      missingInformation: [],
      quoteSafetyStatus: "quote-ready",
    },
    proposal: {
      title: "Acme HQ Meeting Room Refresh - Proposal",
      summary: "NetworkHD-based AV refresh for the HQ meeting rooms.",
      sections: ["Executive Summary", "Equipment and Pricing"],
      products: [],
      assumptions: ["Existing network switch is 1GbE capable."],
      readinessScore: 88,
      updatedAt: t,
    },
  };
}

/** Rep A's edit: ONLY the discovery brief (new answers + timestamp). */
function withDiscoveryEdit(project, at) {
  const next = cloneProject(project);
  next.updated = "Just now";
  next.updatedAt = at;
  next.discoveryBrief = {
    ...project.discoveryBrief,
    savedAt: at,
    capturedPercent: 100,
    missingInformation: ["Confirm network switch capacity before quoting."],
  };
  return next;
}

/** Rep B's edit: ONLY the proposal (revision + timestamp). */
function withProposalEdit(project, at) {
  const next = cloneProject(project);
  next.updated = "Just now";
  next.updatedAt = at;
  next.proposal = {
    ...project.proposal,
    title: "Acme HQ Meeting Room Refresh - Revised Proposal",
    summary: "Revised NetworkHD design after the site survey.",
    readinessScore: 95,
    updatedAt: at,
  };
  return next;
}

/** The exact request projectStore.ts POSTs (backendProjectFromStored shape):
 *  the full document plus baseRevision - the syncRevision of the server copy
 *  the local document was based on (ADR-0001 Phase 2 revision counters). */
function syncBodyFromStoredProject(project, baseRevision = 0) {
  return {
    activeProjectId: project.id,
    projects: [
      {
        ...project,
        customer: project.owner,
        site: "",
        roomName: project.name,
        notes: `Resume workflow: ${project.resumeTo}`,
        baseRevision,
      },
    ],
  };
}

/** A SAME-FIELD edit: both reps rewrite `proposal` (title/summary) at `at`. */
function withProposalTitleEdit(project, at, title) {
  const next = cloneProject(project);
  next.updated = "Just now";
  next.updatedAt = at;
  next.proposal = {
    ...project.proposal,
    title,
    summary: `Summary for "${title}"`,
    readinessScore: 90 + (title.length % 10),
    updatedAt: at,
  };
  return next;
}

async function getProject(projectId, token = ownerToken) {
  const res = await requestJson("/api/wingman/projects", { token });
  expect(res.status).toBe(200);
  return res.json.projects.find((project) => project.id === projectId);
}

/**
 * Baseline sync plus a deterministic sequence of (token, state, baseRevision)
 * syncs for ONE project. Returns the final project (as the owner sees it) and
 * the last syncRevision the server reported, so tests can assert the
 * revision-counter round trip as well as the merged content.
 */
async function runSyncSequence(projectId, sequence) {
  const t0 = "2026-09-03T08:00:00.000Z";
  const baseline = await requestJson("/api/wingman/projects/sync", {
    method: "POST",
    token: ownerToken,
    body: syncBodyFromStoredProject(makeBaseProject(projectId, t0), 0),
  });
  expect(baseline.status).toBe(200);
  let lastRevision = baseline.json?.projects?.[0]?.syncRevision;

  for (const step of sequence) {
    const sync = await requestJson("/api/wingman/projects/sync", {
      method: "POST",
      token: step.token,
      body: syncBodyFromStoredProject(step.state, step.baseRevision ?? 0),
    });
    expect(sync.status).toBe(200);
    lastRevision = sync.json?.projects?.[0]?.syncRevision;
  }

  return { project: await getProject(projectId, ownerToken), lastRevision };
}

/**
 * Same-field collision: A and B BOTH rewrite `proposal` (one sub-document)
 * from the same base revision, with edit timestamps tA / tB. Runs the two
 * syncs in the given order and returns the merged project + revision.
 */
async function runSameFieldSequence(projectId, { tA, tB, firstEditor }) {
  const t0 = "2026-09-03T08:00:00.000Z";
  const base = makeBaseProject(projectId, t0);
  const aState = withProposalTitleEdit(base, tA, "Proposal from Rep A");
  const bState = withProposalTitleEdit(base, tB, "Proposal from Rep B");
  const order = firstEditor === "A"
    ? [{ token: ownerToken, state: aState }, { token: memberToken, state: bState }]
    : [{ token: memberToken, state: bState }, { token: ownerToken, state: aState }];
  return runSyncSequence(projectId, order);
}

/**
 * Drives one collision in a given sync order and asserts the merged project
 * keeps BOTH edits. Times: baseline at t0; A's brief edit at tA; B's proposal
 * edit at tB (t0 < tA < tB). Each rep syncs from a divergent local snapshot:
 * the first editor's sync stores its fresh sub-document, the second editor's
 * sync carries a STALE copy of the first editor's sub-document.
 */
async function runCollision(projectId, firstEditor) {
  const t0 = "2026-09-03T08:00:00.000Z";
  const tA = "2026-09-03T08:10:00.000Z";
  const tB = "2026-09-03T08:20:00.000Z";

  const base = makeBaseProject(projectId, t0);
  const aState = withDiscoveryEdit(base, tA);
  const bState = withProposalEdit(base, tB);

  // Baseline exists server-side (owner's earlier sync).
  const baselineSync = await requestJson("/api/wingman/projects/sync", {
    method: "POST",
    token: ownerToken,
    body: syncBodyFromStoredProject(base),
  });
  expect(baselineSync.status).toBe(200);

  const order = firstEditor === "A" ? [aState, bState] : [bState, aState];
  const orderTokens = firstEditor === "A" ? [ownerToken, memberToken] : [memberToken, ownerToken];
  for (let i = 0; i < order.length; i += 1) {
    const sync = await requestJson("/api/wingman/projects/sync", {
      method: "POST",
      token: orderTokens[i],
      body: syncBodyFromStoredProject(order[i]),
    });
    expect(sync.status, `${order[i].id} sync ${i + 1} should succeed`).toBe(200);
  }

  const merged = await getProject(projectId, ownerToken);
  expect(merged, "the project must exist after both syncs").toBeDefined();

  // Rep A's discovery-brief edit must survive, even though the second sync
  // carried a stale copy of the brief (embedded savedAt decides per-sub-doc).
  expect(merged.discoveryBrief?.savedAt).toBe(tA);
  expect(merged.discoveryBrief?.capturedPercent).toBe(100);
  expect(merged.discoveryBrief?.missingInformation).toContain("Confirm network switch capacity before quoting.");

  // Rep B's proposal edit must survive, even though one sync carried a stale
  // copy of the proposal (embedded proposal.updatedAt decides per-sub-doc).
  expect(merged.proposal?.updatedAt).toBe(tB);
  expect(merged.proposal?.title).toContain("Revised Proposal");
  expect(merged.proposal?.readinessScore).toBe(95);
  return merged;
}

/**
 * The five id-keyed work-product collections under test, keyed exactly like
 * the server's ID_KEYED_COLLECTION_MERGE_KEYS (server/wingman-app-store.mjs):
 * productSelections by sku (its identity), the others by item id.
 */
const COLLECTION_E2E_SPECS = [
  { field: "requirements", idKey: "id", timeKey: "updatedAt" },
  { field: "compareRuns", idKey: "id", timeKey: "createdAt" },
  { field: "proposalVersions", idKey: "id", timeKey: "savedAt" },
  { field: "productSelections", idKey: "sku", timeKey: "addedAt" },
  { field: "visualAssets", idKey: "id", timeKey: "updatedAt" },
];

function collectionItemOf(spec, key, at, extra = {}) {
  return { [spec.idKey]: key, [spec.timeKey]: at, ...extra };
}

/** Baseline clone with the collection seeded to the given items. */
function seededBaseProject(projectId, t0, field, items) {
  const project = makeBaseProject(projectId, t0);
  project[field] = cloneProject(items);
  return project;
}

/** Replace one item of the collection (same identity key, new embedded time). */
function withCollectionItemEdit(project, field, spec, key, at, marker) {
  const next = cloneProject(project);
  next.updated = "Just now";
  next.updatedAt = at;
  const others = (project[field] ?? []).filter((item) => String(item?.[spec.idKey]) !== key);
  next[field] = [...others, collectionItemOf(spec, key, at, { marker, note: `${marker} content` })];
  return next;
}

/** Append a NEW item owned by one session (its identity key is unique to it). */
function withCollectionItemAdded(project, field, spec, key, at, marker) {
  const next = cloneProject(project);
  next.updated = "Just now";
  next.updatedAt = at;
  next[field] = [...(project[field] ?? []), collectionItemOf(spec, key, at, { marker, note: `${marker} content` })];
  return next;
}

/**
 * Disjoint-items collision on one collection: the baseline collection is
 * empty; A adds an item it owns, B adds a DIFFERENT item it owns (neither
 * payload ever carries the other's item). Syncs in `firstEditor` order and
 * returns the merged project.
 */
async function runDisjointCollectionCollision(projectId, spec, firstEditor) {
  const t0 = "2026-09-03T08:00:00.000Z";
  const tA = "2026-09-03T08:10:00.000Z";
  const tB = "2026-09-03T08:20:00.000Z";
  const base = seededBaseProject(projectId, t0, spec.field, []);
  const aState = withCollectionItemAdded(base, spec.field, spec, "item-a", tA, "A");
  const bState = withCollectionItemAdded(base, spec.field, spec, "item-b", tB, "B");
  const order = firstEditor === "A" ? [aState, bState] : [bState, aState];
  const orderTokens = firstEditor === "A" ? [ownerToken, memberToken] : [memberToken, ownerToken];

  const baselineSync = await requestJson("/api/wingman/projects/sync", {
    method: "POST",
    token: ownerToken,
    body: syncBodyFromStoredProject(base),
  });
  expect(baselineSync.status).toBe(200);
  for (let i = 0; i < order.length; i += 1) {
    const sync = await requestJson("/api/wingman/projects/sync", {
      method: "POST",
      token: orderTokens[i],
      body: syncBodyFromStoredProject(order[i]),
    });
    expect(sync.status, `${spec.field} sync ${i + 1} should succeed`).toBe(200);
  }
  return getProject(projectId, ownerToken);
}

/**
 * Same-item collision on one collection: the baseline collection holds one
 * SHARED item (`shared`) that BOTH sessions rewrite, and each session also
 * adds its OWN item (`item-a`/`item-b`) so a whole-array winner would drop
 * the other session's item. `tA`/`tB` are the embedded times of the two
 * shared-item edits. Syncs in `firstEditor` order and returns the merged
 * project.
 */
async function runSameItemCollectionCollision(projectId, spec, { tA, tB, firstEditor }) {
  const t0 = "2026-09-03T08:00:00.000Z";
  const at = tA; // A's own item carries the same stamp as its shared edit
  const bt = tB;
  const base = seededBaseProject(projectId, t0, spec.field, [
    collectionItemOf(spec, "shared", t0, { marker: "Baseline", note: "baseline content" }),
  ]);
  const aState = withCollectionItemAdded(
    withCollectionItemEdit(base, spec.field, spec, "shared", tA, "A"),
    spec.field,
    spec,
    "item-a",
    at,
    "A",
  );
  const bState = withCollectionItemAdded(
    withCollectionItemEdit(base, spec.field, spec, "shared", tB, "B"),
    spec.field,
    spec,
    "item-b",
    bt,
    "B",
  );
  const order = firstEditor === "A" ? [aState, bState] : [bState, aState];
  const orderTokens = firstEditor === "A" ? [ownerToken, memberToken] : [memberToken, ownerToken];

  const baselineSync = await requestJson("/api/wingman/projects/sync", {
    method: "POST",
    token: ownerToken,
    body: syncBodyFromStoredProject(base),
  });
  expect(baselineSync.status).toBe(200);
  for (let i = 0; i < order.length; i += 1) {
    const sync = await requestJson("/api/wingman/projects/sync", {
      method: "POST",
      token: orderTokens[i],
      body: syncBodyFromStoredProject(order[i]),
    });
    expect(sync.status, `${spec.field} sync ${i + 1} should succeed`).toBe(200);
  }
  return getProject(projectId, ownerToken);
}

/** Assert a merged collection holds exactly the given identity keys. */
function expectCollectionKeys(project, spec, expectedKeys, where) {
  const items = project?.[spec.field] ?? [];
  const actual = items.map((item) => String(item?.[spec.idKey]));
  expect(actual.sort(), `${spec.field} must hold exactly ${expectedKeys.join(",")} ${where}`).toEqual([...expectedKeys].sort());
  expect(items.length, `${spec.field} must have no duplicates or extras ${where}`).toBe(expectedKeys.length);
}

/** The one whole item version stored for `key`, or undefined. */
function itemByKey(project, spec, key) {
  return (project?.[spec.field] ?? []).find((item) => String(item?.[spec.idKey]) === key);
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
  ownerToken = await signup("Owner Rep", "owner-two-session@example.com");
  memberToken = await inviteAndAcceptMember(ownerToken, "member-two-session");
}, 30_000);

afterAll(() => {
  if (child) {
    child.kill("SIGTERM");
    child = null;
  }
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe("two sessions editing the same project", () => {
  it("keeps both edits when A (brief) syncs first and B (proposal) syncs second", async () => {
    const merged = await runCollision("brief-first-proj", "A");
    expect(merged.discoveryBrief?.missingInformation).not.toEqual([]);
  });

  it("keeps both edits when B (proposal) syncs first and A (brief) syncs second", async () => {
    const merged = await runCollision("proposal-first-proj", "B");
    // Same convergence as the other order: disjoint sub-document edits do not
    // depend on sync order.
    expect(merged.proposal?.title).toContain("Revised Proposal");
    expect(merged.discoveryBrief?.capturedPercent).toBe(100);
  });

  it("resolves a SAME-FIELD collision deterministically when both edits share one timestamp", async () => {
    // Both reps rewrite the proposal at the SAME millisecond from the same
    // base. Timestamps cannot decide; without revision counters the server's
    // "keep the stored copy on equal timestamps" rule made the first-applied
    // edit win - so the two sync orders converged to DIFFERENT final states.
    // The revision basis + deterministic author tie-break must converge both
    // orders to the SAME winner (ADR-0001 Phase 2).
    const t = "2026-09-03T08:10:00.000Z";
    const order1 = await runSameFieldSequence("samefield-tie-proj", { tA: t, tB: t, firstEditor: "A" });
    const order2 = await runSameFieldSequence("samefield-tie-proj-2", { tA: t, tB: t, firstEditor: "B" });

    expect(order1.project.proposal?.title).toBe(order2.project.proposal?.title);
    expect(["Proposal from Rep A", "Proposal from Rep B"]).toContain(order1.project.proposal?.title);
    // One whole edit wins, never a mix of the two.
    expect(order1.project.proposal?.readinessScore).toBe(order2.project.proposal?.readinessScore);
    // Revision counters still advance one per accepted sync.
    expect(order1.lastRevision).toBe(3);
    expect(order2.lastRevision).toBe(3);
  });

  it("resolves a SAME-FIELD collision by edit time: the later edit wins in both orders", async () => {
    const tA = "2026-09-03T08:10:00.000Z";
    const tB = "2026-09-03T08:20:00.000Z";
    const order1 = await runSameFieldSequence("samefield-time-proj", { tA, tB, firstEditor: "A" });
    const order2 = await runSameFieldSequence("samefield-time-proj-2", { tA, tB, firstEditor: "B" });

    // Rep B's proposal carries the later embedded edit timestamp, so B's edit
    // is the winner regardless of which sync landed first.
    expect(order1.project.proposal?.title).toBe("Proposal from Rep B");
    expect(order2.project.proposal?.title).toBe("Proposal from Rep B");
  });

  it("honours the baseRevision round trip: the server bumps the counter per accepted sync", async () => {
    const t0 = "2026-09-03T08:00:00.000Z";
    const t1 = "2026-09-03T08:10:00.000Z";
    const t2 = "2026-09-03T08:20:00.000Z";
    const base = makeBaseProject("revision-roundtrip-proj", t0);
    const first = withProposalTitleEdit(base, t1, "First edit");
    const second = withProposalTitleEdit(first, t2, "Second edit");

    const result = await runSyncSequence("revision-roundtrip-proj", [
      { token: ownerToken, state: first, baseRevision: 0 },
      { token: ownerToken, state: second, baseRevision: 1 },
    ]);

    expect(result.lastRevision).toBe(3);
    expect(result.project.proposal?.title).toBe("Second edit");
    expect(result.project.syncRevision).toBe(3);
  });

  it("unions both sessions' DISJOINT items in every id-keyed collection when A syncs first", async () => {
    for (let i = 0; i < COLLECTION_E2E_SPECS.length; i += 1) {
      const spec = COLLECTION_E2E_SPECS[i];
      const merged = await runDisjointCollectionCollision(`disjoint-a-first-${spec.field}-${i}`, spec, "A");
      expectCollectionKeys(merged, spec, ["item-a", "item-b"], "after A-first syncs");
      // Each session's own item keeps its own marker - no cross-session mix.
      expect(itemByKey(merged, spec, "item-a")?.marker).toBe("A");
      expect(itemByKey(merged, spec, "item-b")?.marker).toBe("B");
    }
  });

  it("unions both sessions' DISJOINT items in every id-keyed collection when B syncs first", async () => {
    for (let i = 0; i < COLLECTION_E2E_SPECS.length; i += 1) {
      const spec = COLLECTION_E2E_SPECS[i];
      const merged = await runDisjointCollectionCollision(`disjoint-b-first-${spec.field}-${i}`, spec, "B");
      expectCollectionKeys(merged, spec, ["item-a", "item-b"], "after B-first syncs");
      expect(itemByKey(merged, spec, "item-a")?.marker).toBe("A");
      expect(itemByKey(merged, spec, "item-b")?.marker).toBe("B");
    }
  });

  it("resolves a same-ITEM collision deterministically in every id-keyed collection when both edits share one timestamp", async () => {
    // Both sessions rewrite the SAME item at the SAME millisecond (embedded
    // time cannot decide) while each also adds its own item - so a whole-array
    // winner would silently drop the losing session's item. The per-item merge
    // must keep BOTH sessions' own items and one WHOLE version of the shared
    // item, and both sync orders must converge to the same version.
    const t = "2026-09-03T08:10:00.000Z";
    for (let i = 0; i < COLLECTION_E2E_SPECS.length; i += 1) {
      const spec = COLLECTION_E2E_SPECS[i];
      const order1 = await runSameItemCollectionCollision(`sameitem-tie-${spec.field}-${i}`, spec, {
        tA: t,
        tB: t,
        firstEditor: "A",
      });
      const order2 = await runSameItemCollectionCollision(`sameitem-tie2-${spec.field}-${i}`, spec, {
        tA: t,
        tB: t,
        firstEditor: "B",
      });

      expectCollectionKeys(order1, spec, ["item-a", "item-b", "shared"], `after tie order A-first (${spec.field})`);
      expectCollectionKeys(order2, spec, ["item-a", "item-b", "shared"], `after tie order B-first (${spec.field})`);
      // Same deterministic winner in both orders, one WHOLE version, never a mix.
      const shared1 = itemByKey(order1, spec, "shared");
      const shared2 = itemByKey(order2, spec, "shared");
      expect(shared1?.marker, `${spec.field} tie must converge to the same winner`).toBe(shared2?.marker);
      expect(["A", "B"]).toContain(shared1?.marker);
      expect(shared1?.note).toBe(`${shared1?.marker} content`);
      expect(shared2?.note).toBe(`${shared2?.marker} content`);
    }
  });

  it("resolves a same-ITEM collision by embedded edit time in every id-keyed collection", async () => {
    // B's rewrite of the shared item carries the LATER embedded timestamp, so
    // B's version must win in BOTH sync orders while both sessions' own items
    // survive alongside it.
    const tA = "2026-09-03T08:10:00.000Z";
    const tB = "2026-09-03T08:20:00.000Z";
    for (let i = 0; i < COLLECTION_E2E_SPECS.length; i += 1) {
      const spec = COLLECTION_E2E_SPECS[i];
      const order1 = await runSameItemCollectionCollision(`sameitem-time-${spec.field}-${i}`, spec, {
        tA,
        tB,
        firstEditor: "A",
      });
      const order2 = await runSameItemCollectionCollision(`sameitem-time2-${spec.field}-${i}`, spec, {
        tA,
        tB,
        firstEditor: "B",
      });

      expectCollectionKeys(order1, spec, ["item-a", "item-b", "shared"], `after time order A-first (${spec.field})`);
      expectCollectionKeys(order2, spec, ["item-a", "item-b", "shared"], `after time order B-first (${spec.field})`);
      expect(itemByKey(order1, spec, "shared")?.marker, `${spec.field} later edit must win (A-first)`).toBe("B");
      expect(itemByKey(order2, spec, "shared")?.marker, `${spec.field} later edit must win (B-first)`).toBe("B");
    }
  });
});
