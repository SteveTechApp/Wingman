/**
 * ADR-0001 §1.2i two-session E2E — concurrent edits to the requirements AND
 * productSelections collections in ONE project, in either sync order.
 *
 * The single-collision suite (project-store-two-session-merge.e2e.test.mjs)
 * runs each id-keyed collection in isolation: one collection per project, one
 * collision kind at a time. Real reps do not partition themselves that neatly —
 * two sessions routinely edit requirements AND product selections of the same
 * project between two syncs, so one mergeWorkspaceProjects call must compose
 * BOTH per-item merges correctly at once. This suite drives exactly that:
 *
 *   - one workspace, owner (Rep A) + invited sales member (Rep B), one project
 *     seeded with one shared item in EACH collection;
 *   - each session rewrites the shared item in BOTH collections and adds one
 *     item of its own to BOTH collections (disjoint identities), so a
 *     whole-array winner in either lane would silently drop the other
 *     session's items from that lane;
 *   - the two syncs run in BOTH orders (A-first and B-first), each session
 *     echoing the baseline revision as baseRevision — the first sync is fresh,
 *     the second is stale, exactly like two reps that loaded the same baseline
 *     and diverged;
 *   - the merged row must hold the UNION of both sessions' items in both
 *     lanes, one WHOLE version of each shared item (the later embedded edit
 *     wins), with no duplicates, and both orders must converge to the
 *     identical merged collections;
 *   - a same-millisecond variant proves the deterministic content-order
 *     tie-break converges both orders to the same shared versions in both
 *     lanes;
 *   - a follow-up fresh sync (basis == row revision) that removes one
 *     requirement while ADDING a product selection proves the freshness-
 *     guarded removal rule composes with a concurrent addition in the other
 *     lane: the removal is honored, every other session's item survives.
 *
 * Item shapes mirror the client types (StoredRequirementRecord,
 * StoredProductSelection in src/wingman2/data/projectStore.ts) and the server
 * merge keys (ID_KEYED_COLLECTION_MERGE_KEYS: requirements by id/updatedAt,
 * productSelections by sku/addedAt).
 *
 * Port: 8886 (distinct from two-session merge 8874, stress 8873, hydration
 * 8875, 413 test 8876, agents 8877/8878, unread-tail 8879, sync-conflict 8883,
 * incremental hydration 8884, per-project sync 8885).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 8886;
const BASE = `http://127.0.0.1:${PORT}`;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wingman-two-session-collections-"));

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
  throw new Error("two-session collections e2e: test server did not become healthy in time");
}

async function signup(name, email) {
  const res = await fetch(`${BASE}/api/wingman/auth/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, company: "Two Session Collections Co", email, password: "collections-pass" }),
  });
  expect(res.status).toBe(200);
  const setCookie = res.headers.getSetCookie().find((header) => header.startsWith("wingman_session="));
  expect(setCookie, "signup should issue a wingman_session cookie").toBeTruthy();
  return setCookie.split(";")[0].split("=").slice(1).join("=");
}

/** Owner invites a second sales rep; the invite accept returns that rep's own
 *  session in the SAME workspace. */
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

/** A StoredRequirementRecord-shaped item (requirements merge by id/updatedAt). */
function requirement(id, at, label, value) {
  return {
    id,
    label,
    value,
    category: "Display",
    source: "Discovery call",
    status: "confirmed",
    whyItMatters: `Sizing for ${label}`,
    updatedAt: at,
  };
}

/** A StoredProductSelection-shaped item (productSelections merge by
 *  sku/addedAt — the sku IS the identity). */
function selection(sku, at, source, quantity) {
  return {
    sku,
    quantity,
    title: `NetworkHD ${sku}`,
    family: "NX",
    category: "Video distribution",
    status: "recommended",
    tags: ["4K60"],
    addedAt: at,
    source,
    evidence: [`Quote line ${sku}`],
    cautions: [],
  };
}

const SHARED_SKU = "NHD-500-TX";
const A_SKU = "NHD-SW-10";
const B_SKU = "NHD-SW-40";

/** Baseline both reps load: one shared item in EACH collection. */
function makeBaseProject(projectId, t0) {
  return {
    id: projectId,
    name: "Acme HQ Meeting Room Refresh",
    owner: "Owner Rep",
    ownerId: "owner",
    stage: "Proposal Builder",
    status: "recommended",
    updated: "Just now",
    resumeTo: "/wingman/proposal",
    createdAt: t0,
    updatedAt: t0,
    discoveryBrief: {
      savedAt: t0,
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
      updatedAt: t0,
    },
    requirements: [requirement("req-shared", t0, "Baseline brief", "8 seats, 1 display")],
    productSelections: [selection(SHARED_SKU, t0, "Baseline", 2)],
  };
}

/**
 * One session's divergent copy: the shared item of EACH collection rewritten
 * at its own embedded time plus one NEW item per collection whose identity is
 * unique to the session (req-A/req-B ids, A_SKU/B_SKU skus).
 */
function withCollectionEdits(project, { at, rep, sharedReqValue, sharedSelQuantity }) {
  const next = cloneProject(project);
  next.updated = "Just now";
  next.updatedAt = at;
  next.requirements = [
    requirement("req-shared", at, `${rep} requirement pass`, sharedReqValue),
    requirement(`req-${rep.toLowerCase()}`, at, `${rep} new requirement`, `From ${rep}: dual display support`),
  ];
  next.productSelections = [
    selection(SHARED_SKU, at, rep, sharedSelQuantity),
    selection(rep === "A" ? A_SKU : B_SKU, at, rep, 1),
  ];
  return next;
}

/** The exact request projectStore.ts POSTs (full document + baseRevision). */
function syncBodyFromStoredProject(project, baseRevision) {
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

async function syncProject(token, project, baseRevision) {
  const res = await requestJson("/api/wingman/projects/sync", {
    method: "POST",
    token,
    body: syncBodyFromStoredProject(project, baseRevision),
  });
  expect(res.status, `sync of ${project.id} should succeed: ${JSON.stringify(res.json)?.slice(0, 160)}`).toBe(200);
  return res.json?.projects?.[0]?.syncRevision;
}

async function getProject(projectId, token = ownerToken) {
  const res = await requestJson("/api/wingman/projects", { token });
  expect(res.status).toBe(200);
  return res.json.projects.find((project) => project.id === projectId);
}

/**
 * Baseline sync (owner, revision 1), then BOTH sessions sync their divergent
 * copies — each echoing the BASELINE revision as baseRevision, exactly like
 * two reps that loaded the same baseline and edited offline. The first sync
 * is therefore fresh (basis == row revision) and the second stale, whichever
 * session goes first. Returns the merged project as the owner sees it.
 */
async function runCollectionsCollision(projectId, { tA, tB, firstEditor }) {
  const t0 = "2026-09-03T08:00:00.000Z";
  const base = makeBaseProject(projectId, t0);
  const aState = withCollectionEdits(base, {
    at: tA,
    rep: "A",
    sharedReqValue: "8 seats, 2 displays (A)",
    sharedSelQuantity: 3,
  });
  const bState = withCollectionEdits(base, {
    at: tB,
    rep: "B",
    sharedReqValue: "8 seats, 2 displays (B)",
    sharedSelQuantity: 4,
  });

  const baselineRevision = await syncProject(ownerToken, base, 0);
  expect(baselineRevision).toBe(1);

  const order = firstEditor === "A"
    ? [[ownerToken, aState], [memberToken, bState]]
    : [[memberToken, bState], [ownerToken, aState]];
  for (const [token, state] of order) {
    await syncProject(token, state, baselineRevision);
  }
  return getProject(projectId);
}

const EXPECTED_REQ_IDS = ["req-a", "req-b", "req-shared"].sort();
const EXPECTED_SKUS = [SHARED_SKU, A_SKU, B_SKU].sort();

/** The union + whole-version invariants both sync orders must satisfy. */
function expectUnionInvariants(merged, { sharedReqLabel, sharedSelSource }, where) {
  const reqs = merged?.requirements ?? [];
  const sels = merged?.productSelections ?? [];
  expect(reqs.map((item) => item.id).sort(), `requirements union ${where}`).toEqual(EXPECTED_REQ_IDS);
  expect(sels.map((item) => item.sku).sort(), `productSelections union ${where}`).toEqual(EXPECTED_SKUS);

  // Each session's own item keeps its own content - no cross-session mix.
  // (Item ids are lowercase: the factories build `req-a`/`req-b`.)
  const reqA = reqs.find((item) => item.id === "req-a");
  const reqB = reqs.find((item) => item.id === "req-b");
  expect(reqA?.label, `req-A owned by A ${where}`).toBe("A new requirement");
  expect(reqB?.label, `req-B owned by B ${where}`).toBe("B new requirement");
  expect(sels.find((item) => item.sku === A_SKU)?.source, `sel-A owned by A ${where}`).toBe("A");
  expect(sels.find((item) => item.sku === B_SKU)?.source, `sel-B owned by B ${where}`).toBe("B");

  // Each shared item resolves to ONE WHOLE version - never a mix.
  const sharedReq = reqs.find((item) => item.id === "req-shared");
  expect(sharedReq?.label, `shared requirement label ${where}`).toBe(sharedReqLabel);
  expect(sharedReq?.value, `shared requirement value travels with the winner ${where}`)
    .toBe(sharedReqLabel === "A requirement pass" ? "8 seats, 2 displays (A)" : "8 seats, 2 displays (B)");
  const sharedSel = sels.find((item) => item.sku === SHARED_SKU);
  expect(sharedSel?.source, `shared selection source ${where}`).toBe(sharedSelSource);
  expect(sharedSel?.quantity, `shared selection quantity travels with the winner ${where}`)
    .toBe(sharedSelSource === "A" ? 3 : 4);
}

/**
 * Canonical form of a merged collection for cross-order comparison: items
 * sorted by identity key. The merge's ARRAY order is stored-first + appended
 * editor-only items, so it legitimately depends on which sync arrived first;
 * membership and per-item content must not.
 */
function canonicalCollection(project, field, idKey) {
  return JSON.stringify(
    [...(project?.[field] ?? [])]
      .sort((a, b) => String(a?.[idKey]).localeCompare(String(b?.[idKey]))),
  );
}

beforeAll(async () => {
  child = spawn(process.execPath, ["server/competitor-lookup-server.mjs"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(PORT),
      WINGMAN_UI_PORT: "3995",
      WINGMAN_DATA_DIR: dataDir,
      WINGMAN_STORAGE_MODE: "file",
    },
    stdio: "ignore",
    windowsHide: true,
  });
  await waitForHealth();
  ownerToken = await signup("Owner Rep", "owner-two-session-collections@example.com");
  memberToken = await inviteAndAcceptMember(ownerToken, "member-two-session-collections");
}, 30_000);

afterAll(() => {
  if (child) {
    child.kill("SIGTERM");
    child = null;
  }
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe("two sessions editing requirements and productSelections concurrently", () => {
  const tA = "2026-09-03T08:10:00.000Z";
  const tB = "2026-09-03T08:20:00.000Z";

  it("unions both sessions' items in BOTH collections when A syncs first", async () => {
    const merged = await runCollectionsCollision("collections-a-first", { tA, tB, firstEditor: "A" });
    // B's shared-item edits carry the later embedded times, so B wins both
    // shared items while A's items survive alongside.
    expectUnionInvariants(merged, { sharedReqLabel: "B requirement pass", sharedSelSource: "B" }, "after A-first syncs");
  });

  it("unions both sessions' items in BOTH collections when B syncs first", async () => {
    const merged = await runCollectionsCollision("collections-b-first", { tA, tB, firstEditor: "B" });
    expectUnionInvariants(merged, { sharedReqLabel: "B requirement pass", sharedSelSource: "B" }, "after B-first syncs");
  });

  it("converges both sync orders to the IDENTICAL merged collections", async () => {
    const orderAFirst = await runCollectionsCollision("collections-converge-a", { tA, tB, firstEditor: "A" });
    const orderBFirst = await runCollectionsCollision("collections-converge-b", { tA, tB, firstEditor: "B" });
    // Compare canonically: array ORDER follows arrival (stored items keep
    // their slots, editor-only items append), but membership and per-item
    // content must converge to byte-identical state in either order.
    expect(canonicalCollection(orderAFirst, "requirements", "id"))
      .toBe(canonicalCollection(orderBFirst, "requirements", "id"));
    expect(canonicalCollection(orderAFirst, "productSelections", "sku"))
      .toBe(canonicalCollection(orderBFirst, "productSelections", "sku"));
    // The untouched sub-documents converge too (both sessions carried the same
    // baseline copies, so the merge keeps one copy verbatim).
    expect(orderAFirst.discoveryBrief).toEqual(orderBFirst.discoveryBrief);
    expect(orderAFirst.proposal).toEqual(orderBFirst.proposal);
  });

  it("resolves same-millisecond edits to BOTH shared items deterministically in either order", async () => {
    // Both sessions rewrite both shared items at the SAME millisecond with
    // different content: embedded time cannot decide, so the total content
    // order must pick ONE whole version per item and both sync orders must
    // converge to the same winners - while both sessions' own items union.
    const t = "2026-09-03T08:15:00.000Z";
    const orderAFirst = await runCollectionsCollision("collections-tie-a", { tA: t, tB: t, firstEditor: "A" });
    const orderBFirst = await runCollectionsCollision("collections-tie-b", { tA: t, tB: t, firstEditor: "B" });

    // Both orders converge to the identical merged collections.
    expect(canonicalCollection(orderAFirst, "requirements", "id"))
      .toBe(canonicalCollection(orderBFirst, "requirements", "id"));
    expect(canonicalCollection(orderAFirst, "productSelections", "sku"))
      .toBe(canonicalCollection(orderBFirst, "productSelections", "sku"));

    // The union still holds under the tie.
    expectUnionInvariants(
      orderAFirst,
      {
        sharedReqLabel: orderAFirst.requirements.find((item) => item.id === "req-shared")?.label,
        sharedSelSource: orderAFirst.productSelections.find((item) => item.sku === SHARED_SKU)?.source,
      },
      "tie A-first",
    );

    // Each shared item is ONE WHOLE version of exactly one rep - the label /
    // value (requirement) and source / quantity (selection) pairs must be
    // internally consistent, never a mix of the two sessions' rewrites.
    const sharedReq = orderAFirst.requirements.find((item) => item.id === "req-shared");
    const sharedSel = orderAFirst.productSelections.find((item) => item.sku === SHARED_SKU);
    const winners = [];
    if (sharedReq?.label === "A requirement pass") {
      expect(sharedReq.value).toBe("8 seats, 2 displays (A)");
      winners.push("A");
    } else {
      expect(sharedReq?.label).toBe("B requirement pass");
      expect(sharedReq?.value).toBe("8 seats, 2 displays (B)");
      winners.push("B");
    }
    if (sharedSel?.source === "A") {
      expect(sharedSel.quantity).toBe(3);
      winners.push("A");
    } else {
      expect(sharedSel?.source).toBe("B");
      expect(sharedSel?.quantity).toBe(4);
      winners.push("B");
    }
    // The deterministic content order decides BOTH ties the same way (the
    // items are built by the same factories, so the first differing field is
    // the rep marker) - asserted rather than assumed so a future factory
    // change that flips one tie fails here instead of silently diverging.
    expect(winners[0]).toBe(winners[1]);
  });

  it("honours a fresh session's requirement removal while it ADDS a product selection", async () => {
    // The freshness guard must compose per LANE: a fresh sync (basis == row
    // revision) whose payload omits req-B has REMOVED it, while the same
    // payload's new product selection must still be added. Built from the
    // fetched merged row - exactly how the real client reloads and re-syncs.
    const tA = "2026-09-03T08:10:00.000Z";
    const tB = "2026-09-03T08:20:00.000Z";
    const merged = await runCollectionsCollision("collections-removal", { tA, tB, firstEditor: "A" });
    const revision = Number(merged?.syncRevision) || 0;
    expect(revision).toBeGreaterThan(0);

    const t3 = "2026-09-03T08:30:00.000Z";
    const next = cloneProject(merged);
    next.updatedAt = t3;
    next.requirements = (merged.requirements ?? []).filter((item) => item.id !== "req-b");
    next.productSelections = [...(merged.productSelections ?? []), selection("NHD-CAM-1", t3, "A", 1)];

    const afterRemoval = await (async () => {
      const syncRevision = await syncProject(ownerToken, next, revision);
      expect(syncRevision).toBe(revision + 1);
      return getProject("collections-removal");
    })();

    // The deliberate removal is honoured...
    expect((afterRemoval.requirements ?? []).some((item) => item.id === "req-b")).toBe(false);
    expect((afterRemoval.requirements ?? []).some((item) => item.id === "req-a")).toBe(true);
    // ...while the concurrent addition in the OTHER lane lands.
    expect((afterRemoval.productSelections ?? []).some((item) => item.sku === "NHD-CAM-1")).toBe(true);
    expect((afterRemoval.productSelections ?? []).some((item) => item.sku === B_SKU)).toBe(true);
  });
});
