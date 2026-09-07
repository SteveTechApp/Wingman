/**
 * ADR-0001 Phase B3 stress variant — 100 interleaved rounds of OVERLAPPING
 * saves from two sessions, asserting no edit is ever silently dropped.
 *
 * The single-collision suites (project-store-two-session-merge.e2e.test.mjs)
 * prove the merge converges for one brief-vs-proposal collision in both sync
 * orders. Real usage is not one collision: two reps hold DIVERGENT local
 * copies of one project and both sync continuously (the client debounces to
 * ~600 ms), each save carrying stale copies of everything the other rep has
 * changed since they last saw each other's state. This suite drives that:
 *
 *   - one workspace, owner (A) + invited sales member (B), one project;
 *   - 100 rounds x 2 syncs (200 overlapping saves, alternating first mover);
 *   - A owns the `discoveryBrief` lane, B owns the `proposal` lane — both
 *     stamp strictly increasing embedded timestamps per round;
 *   - a SHARED same-field lane (`recommendationEvidence`) is edited by A on
 *     odd rounds and B on even rounds, so every sync must let the newest
 *     editor's version win over the other session's stale copy;
 *   - a SHARED id-keyed collection (`requirements`) is edited by BOTH
 *     sessions (ADR-0001 §1.2i): each session appends its OWN item every
 *     round (req-A-<r> / req-B-<r>) AND both carry one shared item
 *     (`req-shared`) whose version the round's parity owner replaces. Per-
 *     item by-id LWW must keep every session's items and the newest shared
 *     version - the whole-array union used to let the project-level LWW
 *     winner drop the losing session's items permanently;
 *   - both sessions append distinct `attachments` every round, so the by-id
 *     union merge must keep every item from BOTH sessions;
 *
 * The requirements lane's per-response guarantee is deliberately weaker than
 * attachments': a FRESH sync (basis == row revision) whose payload omits an
 * item treats the omission as a removal, and these divergent sessions never
 * adopt sync-response content (only the syncRevision - exactly like
 * projectStore.ts), so the round's first-mover can transiently drop the
 * other session's items. The round's second (stale) sync always restores the
 * full union, so the asserted invariants are: every session's OWN items
 * survive every one of its own syncs, `req-shared` is always the newest
 * parity owner's whole version, and at every ROUND boundary the row holds
 * the exact union of everything both sessions have ever synced (final state
 * included) - no item is ever PERMANENTLY lost. (Adopting sync-response
 * content on the client would strengthen this to per-response union.)
 *   - each session tracks the `syncRevision` its own last response returned
 *     and echoes it back as `baseRevision`, exactly like projectStore.ts.
 *
 * After EVERY one of the 200 responses the merged project is asserted to hold
 * the newest version of every lane — never an older stale copy, never a mix:
 *   discoveryBrief.capturedPercent == A's synced-edit count,
 *   proposal.iteration          == B's synced-edit count,
 *   recommendationEvidence      == the newest round edited by its parity owner,
 *   attachments                 == the exact union of both sessions' items,
 *   requirements                == the syncing session's own items always
 *                                  present, req-shared == the newest parity
 *                                  owner's version, and the EXACT union of
 *                                  every item from both sessions at each round
 *                                  boundary (per-response churn is inherent
 *                                  to content-divergent sessions, see above).
 * Finally both sessions re-fetch and must converge on byte-identical state,
 * and the revision counter must equal 1 baseline + 200 accepted syncs.
 *
 * Port: 8873 (distinct from two-session merge e2e 8874, hydration e2e 8875,
 * 413 test 8876, agents 8877/8878, unread-tail 8879, load-test 8897).
 * Rounds: 100 by default; override with WINGMAN_STRESS_ROUNDS for a quick run.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 8873;
const BASE = `http://127.0.0.1:${PORT}`;
const STRESS_ROUNDS = Math.max(2, Number(process.env.WINGMAN_STRESS_ROUNDS) || 100);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wingman-two-session-stress-"));

const PROJECT_ID = "stress-project-1";
const T0 = "2026-09-03T08:00:00.000Z";

let child = null;
let ownerToken = "";
let memberToken = "";

function roundTime(round) {
  return new Date(Date.parse(T0) + round * 60_000).toISOString();
}

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
  throw new Error("two-session stress e2e: test server did not become healthy in time");
}

async function signup(name, email) {
  const res = await fetch(`${BASE}/api/wingman/auth/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, company: "Two Session Stress Co", email, password: "stress-session-pass" }),
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
    body: { token: inviteToken, name: "Stress Member", password: "member-stress-pass-123" },
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

/** Baseline project both reps diverge from: brief + proposal + the shared
 *  recommendationEvidence lane, all stamped at t0. */
function makeBaseProject() {
  return {
    id: PROJECT_ID,
    name: "Acme HQ Meeting Room Refresh",
    owner: "Owner Rep",
    ownerId: "owner",
    stage: "Proposal Builder",
    status: "recommended",
    updated: "Just now",
    resumeTo: "/wingman/proposal",
    createdAt: T0,
    updatedAt: T0,
    discoveryBrief: {
      savedAt: T0,
      roomModel: { customer: "Acme Corp", roomType: "Meeting room / boardroom" },
      capturedPercent: 0,
      missingInformation: [],
      quoteSafetyStatus: "quote-ready",
    },
    recommendationEvidence: {
      updatedAt: T0,
      source: "Discovery",
      marker: "Baseline",
      evidenceUsed: ["Baseline"],
    },
    requirements: [
      // The shared id-keyed item: both sessions carry it and the round's
      // parity owner replaces its local version (by-id LWW per updatedAt).
      {
        id: "req-shared",
        updatedAt: T0,
        marker: "Baseline",
        label: "Shared requirement (Baseline)",
        category: "stress",
        status: "confirmed",
        source: "stress",
      },
    ],
    proposal: {
      title: "Acme HQ Meeting Room Refresh - Proposal",
      summary: "NetworkHD-based AV refresh for the HQ meeting rooms.",
      sections: ["Executive Summary", "Equipment and Pricing"],
      products: [],
      assumptions: ["Existing network switch is 1GbE capable."],
      readinessScore: 88,
      iteration: 0,
      updatedAt: T0,
    },
    attachments: [],
  };
}

/** The exact request projectStore.ts POSTs: full document + baseRevision. */
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

function attachmentItem(session, round) {
  const at = roundTime(round);
  return {
    id: `attach-${session}-${round}`,
    name: `${session} asset ${round}`,
    kind: "other",
    source: "Stress",
    summary: `${session} attachment from round ${round}`,
    uploadedAt: at,
    uploadedBy: session === "A" ? "owner-stress" : "member-stress",
  };
}

/** A session's OWN round-r requirement item (id req-<session>-<round>). */
function ownRequirementItem(session, round) {
  const at = roundTime(round);
  return {
    id: `req-${session}-${round}`,
    updatedAt: at,
    label: `${session} requirement ${round}`,
    category: "stress",
    status: "confirmed",
    source: "stress",
  };
}

/** Append the session's own round-r requirement to its divergent copy. */
function withOwnRequirement(project, session, round) {
  const next = cloneProject(project);
  next.requirements = [...(project.requirements ?? []), ownRequirementItem(session, round)];
  return next;
}

/** Replace the SHARED req-shared item's local version (same id, new stamp). */
function withSharedRequirementEdit(project, marker, round) {
  const at = roundTime(round);
  const next = cloneProject(project);
  const withoutShared = (project.requirements ?? []).filter((item) => item?.id !== "req-shared");
  next.requirements = [
    ...withoutShared,
    {
      id: "req-shared",
      updatedAt: at,
      marker,
      label: `Shared requirement (${marker})`,
      category: "stress",
      status: "confirmed",
      source: "stress",
    },
  ];
  return next;
}

/** A's round-r edit: new discovery brief answers + its own attachment. */
function withBriefEdit(project, round) {
  const at = roundTime(round);
  const next = cloneProject(project);
  next.updated = "Just now";
  next.updatedAt = at;
  next.discoveryBrief = {
    ...project.discoveryBrief,
    savedAt: at,
    capturedPercent: round,
    missingInformation: [`A note ${round}`],
  };
  next.attachments = [...(project.attachments ?? []), attachmentItem("A", round)];
  return next;
}

/** B's round-r edit: new proposal revision + its own attachment. */
function withProposalEdit(project, round) {
  const at = roundTime(round);
  const next = cloneProject(project);
  next.updated = "Just now";
  next.updatedAt = at;
  next.proposal = {
    ...project.proposal,
    title: `Acme Proposal rev ${round}`,
    summary: `Revised design round ${round}.`,
    readinessScore: 90 + (round % 10),
    iteration: round,
    updatedAt: at,
  };
  next.attachments = [...(project.attachments ?? []), attachmentItem("B", round)];
  return next;
}

/** Same-field edit on the shared recommendationEvidence lane. */
function withEvidenceEdit(project, marker, round) {
  const at = roundTime(round);
  const next = cloneProject(project);
  next.updated = "Just now";
  next.updatedAt = at;
  next.recommendationEvidence = {
    ...project.recommendationEvidence,
    updatedAt: at,
    source: marker,
    marker,
    evidenceUsed: [...(project.recommendationEvidence?.evidenceUsed ?? []), marker],
  };
  return next;
}

/** One session's sync: POST its divergent state, return the merged project the
 *  server reports plus the new syncRevision it must echo next time. */
async function syncState(token, state, baseRevision) {
  const res = await requestJson("/api/wingman/projects/sync", {
    method: "POST",
    token,
    body: syncBodyFromStoredProject(state, baseRevision),
  });
  expect(res.status, `sync of ${state.id} should succeed`).toBe(200);
  const project = res.json?.projects?.find((candidate) => candidate.id === state.id);
  expect(project, "sync response should return the merged project").toBeDefined();
  return { project, revision: project?.syncRevision ?? 0 };
}

/**
 * The no-silent-drop invariant, checked after EVERY sync:
 *  - A's newest brief edit is present (never a stale copy from B's view),
 *  - B's newest proposal edit is present,
 *  - the shared evidence lane equals the newest round edited by its parity
 *    owner (same-field LWW: an older edit or a mix is a silent drop),
 *  - attachments hold the exact by-id union of both sessions' items,
 *  - the shared requirements collection holds the syncing session's OWN items
 *    (they must never be dropped by its own sync), req-shared is always the
 *    newest parity owner's whole version, and when `roundComplete` the row
 *    holds the EXACT union of every requirement item either session has ever
 *    synced (a fresh sync by a divergent session can transiently drop the
 *    other session's items - that churn is inherent and benign; permanent
 *    loss is not, and the union always reconverges by round boundary).
 */
function assertNoSilentDrop(merged, aSynced, bSynced, recEvRound, round, who, roundComplete = false) {
  const where = `after ${who}'s round ${round} sync`;
  expect(merged, `project must exist ${where}`).toBeDefined();
  expect(merged.discoveryBrief?.capturedPercent, `A's newest brief edit must survive ${where}`).toBe(aSynced);
  expect(merged.discoveryBrief?.savedAt, `brief timestamp must match A's newest edit ${where}`).toBe(
    aSynced === 0 ? T0 : roundTime(aSynced),
  );
  expect(merged.proposal?.iteration, `B's newest proposal edit must survive ${where}`).toBe(bSynced);
  expect(merged.proposal?.title, `proposal must be B's whole revision, not a mix ${where}`).toBe(
    bSynced === 0 ? "Acme HQ Meeting Room Refresh - Proposal" : `Acme Proposal rev ${bSynced}`,
  );

  const expectedEvidenceRound = recEvRound;
  const expectedMarker = expectedEvidenceRound === 0 ? "Baseline" : `${expectedEvidenceRound % 2 === 1 ? "A" : "B"}-${expectedEvidenceRound}`;
  expect(merged.recommendationEvidence?.marker, `shared lane must be the newest editor's whole version ${where}`).toBe(expectedMarker);
  expect(merged.recommendationEvidence?.updatedAt, `shared lane timestamp ${where}`).toBe(
    expectedEvidenceRound === 0 ? T0 : roundTime(expectedEvidenceRound),
  );

  const present = new Set((merged.attachments ?? []).map((item) => item?.id));
  const missing = [];
  for (let k = 1; k <= aSynced; k += 1) {
    if (!present.has(`attach-A-${k}`)) missing.push(`attach-A-${k}`);
  }
  for (let k = 1; k <= bSynced; k += 1) {
    if (!present.has(`attach-B-${k}`)) missing.push(`attach-B-${k}`);
  }
  expect(missing, `no attachment may be dropped by the union merge ${where}`).toEqual([]);
  expect((merged.attachments ?? []).length, `attachment union must be exact (no merges or dupes) ${where}`).toBe(
    aSynced + bSynced,
  );

  // --- shared requirements collection (by-id LWW, ADR-0001 §1.2i) ---
  const reqById = new Map((merged.requirements ?? []).map((item) => [item?.id, item]));
  const sessionsToCheck = who === "final" ? ["A", "B"] : [who];
  const missingOwnReq = [];
  for (const session of sessionsToCheck) {
    const ownSynced = session === "A" ? aSynced : bSynced;
    for (let k = 1; k <= ownSynced; k += 1) {
      if (!reqById.has(`req-${session}-${k}`)) missingOwnReq.push(`req-${session}-${k}`);
    }
  }
  expect(missingOwnReq, `a session's own requirement items must never be dropped by its own sync ${where}`).toEqual([]);

  // req-shared is carried by BOTH sessions, so it can never be dropped; per-
  // item LWW must keep the newest parity owner's WHOLE version, never a mix.
  const shared = reqById.get("req-shared");
  expect(shared, `req-shared must always be present ${where}`).toBeDefined();
  const expectedReqMarker = expectedEvidenceRound === 0 ? "Baseline" : `R-${expectedEvidenceRound % 2 === 1 ? "A" : "B"}-${expectedEvidenceRound}`;
  expect(shared.marker, `req-shared must be the newest editor's whole version ${where}`).toBe(expectedReqMarker);
  expect(shared.updatedAt, `req-shared timestamp ${where}`).toBe(expectedEvidenceRound === 0 ? T0 : roundTime(expectedEvidenceRound));

  // At round boundaries the exact union of everything both sessions have ever
  // synced must be present: no item from either session is ever lost for good.
  if (roundComplete) {
    const expectedReqIds = new Set(["req-shared"]);
    for (let k = 1; k <= aSynced; k += 1) expectedReqIds.add(`req-A-${k}`);
    for (let k = 1; k <= bSynced; k += 1) expectedReqIds.add(`req-B-${k}`);
    expect(
      new Set((merged.requirements ?? []).map((item) => item?.id)),
      `requirements must be the exact union of both sessions' items ${where}`,
    ).toEqual(expectedReqIds);
    expect((merged.requirements ?? []).length, `requirements union must have no dupes ${where}`).toBe(
      aSynced + bSynced + 1,
    );
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
  ownerToken = await signup("Stress Owner", "owner-stress@example.com");
  memberToken = await inviteAndAcceptMember(ownerToken, "member-stress");
}, 30_000);

afterAll(() => {
  if (child) {
    child.kill("SIGTERM");
    child = null;
  }
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe("two sessions under 100 rounds of overlapping saves", () => {
  it(`interleaves ${STRESS_ROUNDS} rounds x 2 sessions without ever silently dropping an edit`, async () => {
    // Baseline: owner creates the project (revision 1).
    const baseline = await syncState(ownerToken, makeBaseProject(), 0);
    expect(baseline.revision).toBe(1);

    // Each session keeps its OWN divergent copy (it never sees the other's
    // changes) and echoes the syncRevision its last response returned.
    let aLocal = makeBaseProject();
    let bLocal = makeBaseProject();
    let aBaseRevision = baseline.revision;
    let bBaseRevision = baseline.revision;
    let aSynced = 0;
    let bSynced = 0;
    let recEvRound = 0; // newest recommendationEvidence round whose owner has synced
    let lastRevision = baseline.revision;

    for (let round = 1; round <= STRESS_ROUNDS; round += 1) {
      // Odd rounds edit evidence lane with A (owner) first; even rounds with B
      // (member) first - every round the parity owner's edit lands first and
      // the other session's stale copy must lose.
      const order = round % 2 === 1 ? ["A", "B"] : ["B", "A"];
      let syncsThisRound = 0;
      for (const who of order) {
        syncsThisRound += 1;
        if (who === "A") {
          aLocal = withBriefEdit(aLocal, round);
          aLocal = withOwnRequirement(aLocal, "A", round);
          if (round % 2 === 1) {
            aLocal = withEvidenceEdit(aLocal, `A-${round}`, round);
            aLocal = withSharedRequirementEdit(aLocal, `R-A-${round}`, round);
            recEvRound = round;
          }
          const { project, revision } = await syncState(ownerToken, aLocal, aBaseRevision);
          aSynced += 1;
          aBaseRevision = revision;
          lastRevision = revision;
          assertNoSilentDrop(project, aSynced, bSynced, recEvRound, round, "A", syncsThisRound === 2);
        } else {
          bLocal = withProposalEdit(bLocal, round);
          bLocal = withOwnRequirement(bLocal, "B", round);
          if (round % 2 === 0) {
            bLocal = withEvidenceEdit(bLocal, `B-${round}`, round);
            bLocal = withSharedRequirementEdit(bLocal, `R-B-${round}`, round);
            recEvRound = round;
          }
          const { project, revision } = await syncState(memberToken, bLocal, bBaseRevision);
          bSynced += 1;
          bBaseRevision = revision;
          lastRevision = revision;
          assertNoSilentDrop(project, aSynced, bSynced, recEvRound, round, "B", syncsThisRound === 2);
        }
      }
    }

    expect(aSynced).toBe(STRESS_ROUNDS);
    expect(bSynced).toBe(STRESS_ROUNDS);
    // One baseline write + 2 accepted syncs per round.
    expect(lastRevision).toBe(1 + STRESS_ROUNDS * 2);

    // Both sessions must now converge on byte-identical state via a fresh read.
    const ownerView = await requestJson("/api/wingman/projects", { token: ownerToken });
    const memberView = await requestJson("/api/wingman/projects", { token: memberToken });
    expect(ownerView.status).toBe(200);
    expect(memberView.status).toBe(200);
    const ownerProject = ownerView.json.projects.find((project) => project.id === PROJECT_ID);
    const memberProject = memberView.json.projects.find((project) => project.id === PROJECT_ID);
    expect(ownerProject, "owner should see the project").toBeDefined();
    expect(memberProject, "member should see the project").toBeDefined();
    expect(memberProject).toEqual(ownerProject);

    // Final no-drop re-check on the converged state: full union of every
    // requirement item from both sessions must be present (round complete).
    assertNoSilentDrop(ownerProject, STRESS_ROUNDS, STRESS_ROUNDS, STRESS_ROUNDS, STRESS_ROUNDS, "final", true);
  }, 120_000);
});
