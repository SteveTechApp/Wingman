import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Cross-INSTANCE concurrency regression for the whole-snapshot Supabase commit
// (ADR-0001 §1.2 / migration 013).
//
// Migration 009 made wingman_snapshot_commit atomic, and the in-process store
// lock (withStoreLock) serializes every read-merge-commit cycle WITHIN one
// server. But each Wingman server process has its OWN lock: two instances
// sharing one Supabase project can both read the same row state, both merge
// their own save against it, and the second whole-snapshot commit then
// RECONCILES the first instance's freshly written rows away as "stale" - two
// overlapping saves both report HTTP 200 and one edit is silently gone. The
// per-process lock cannot see the other process.
//
// Migration 013 closes that gap with a DB-side generation register
// (wingman_db_generation): a commit must name the generation its snapshot was
// read at, the register's single-row lock serializes concurrent claims across
// instances, and a claim against a moved register REFUSES
// (committed:false/stale:true) before touching any table. The sync handler
// then re-reads the CURRENT snapshot (which contains the winner's rows),
// re-merges the client payload, and retries (bounded).
//
// This suite proves it end to end with TWO REAL server processes against ONE
// stateful fake PostgREST that models the migration-013 register + CAS exactly.
// A commit gate holds both servers' commits until BOTH have provably finished
// reading - so both snapshots predate either commit, the exact interleaving
// that loses rows without the guard - then releases them. Assertions:
//   - both syncs return 200,
//   - the loser's first commit was REFUSED as stale and retried (staleRefusals
//     === 1, successful commits === 3 for the two syncs),
//   - BOTH projects, both users, both workspaces, and both sessions survive
//     in the shared tables (without the guard the second commit deletes the
//     first writer's rows),
//   - the register advanced by exactly the number of SUCCESSFUL commits
//     (refused commits never bump it).
//
// The negative control is run ad hoc during development by disabling the
// fake's CAS: both commits then land and the survivor's reconcile deletes the
// other writer's rows, failing the "both projects survive" assertion - proving
// the suite goes red against pre-013 behaviour.

const PORT_A = 8881; // distinct: 8873 stress, 8875/8880 hydration, 8876 413 e2e, 8877/8878 agents, 8879 unread-tail
const PORT_B = 8882;
const BASE_A = `http://127.0.0.1:${PORT_A}`;
const BASE_B = `http://127.0.0.1:${PORT_B}`;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const dataDirA = fs.mkdtempSync(path.join(os.tmpdir(), "wingman-two-process-a-"));
const dataDirB = fs.mkdtempSync(path.join(os.tmpdir(), "wingman-two-process-b-"));

const T0 = "2026-09-03T10:00:00.000Z";

// ---------------------------------------------------------------------------
// Stateful fake PostgREST (migration-009 reconcile + migration-013 register
// and CAS), shared by BOTH server processes. Modeled on the hydration e2e's
// fake; the only additions are the generation register/CAS and the commit
// gate the test uses to force the read-before-either-commit interleaving.
// ---------------------------------------------------------------------------

const TABLES = [
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

const SECTION_TO_TABLE = {
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
function rowsFor(table) {
  if (!fakeTables.has(table)) fakeTables.set(table, new Map());
  return fakeTables.get(table);
}
for (const table of TABLES) rowsFor(table);
rowsFor("wingman_db_generation").set("global", { id: "global", generation: 0 });

// Commit gate: while true, snapshot-commit RPCs queue instead of running, so
// the test can hold both servers' commits until both have finished reading.
let holdCommits = false;
const commitQueue = []; // thunks, flushed in arrival order by releaseCommitGate
// Counters (reset after signup) that pin the retry behaviour.
let commitSuccesses = 0;
let staleRefusals = 0;

function releaseCommitGate() {
  holdCommits = false;
  const pending = commitQueue.splice(0);
  for (const thunk of pending) thunk();
}

function runSnapshotCommit(parsed, res) {
  const register = rowsFor("wingman_db_generation");
  const globalRow = register.get("global");
  const current = globalRow ? Math.max(0, Number(globalRow.generation) || 0) : 0;
  const expected = parsed?.expected_generation;
  if (expected === undefined || expected === null) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: "wingman_snapshot_commit requires expected_generation" }));
    return;
  }
  if (Number(expected) !== current) {
    staleRefusals += 1;
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
  for (const [section, table] of Object.entries(SECTION_TO_TABLE)) {
    const rows = payload?.[section];
    if (!Array.isArray(rows)) continue; // omitted sections stay untouched
    const map = rowsFor(table);
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
  commitSuccesses += 1;
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ committed: true, generation: current + 1 }));
}

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
      if (holdCommits) {
        commitQueue.push(() => runSnapshotCommit(parsed, res));
        return;
      }
      runSnapshotCommit(parsed, res);
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
  if (!TABLES.includes(resource)) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: `Table ${resource} not found` }));
    return;
  }

  const rows = [...rowsFor(resource).values()];
  const total = rows.length;

  const order = url.searchParams.get("order");
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

// ---------------------------------------------------------------------------
// Test scaffolding
// ---------------------------------------------------------------------------

let fakeServer = null;
let childA = null;
let childB = null;
let tokenA = "";
let tokenB = "";
const childLog = [];

async function waitForHealth(base, timeoutMs = 40_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${base}/api/health`);
      if (res.ok) return;
    } catch {
      // Server not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`two-process race e2e: server at ${base} did not become healthy in time`);
}

function spawnServer(port, uiPort, dataDir) {
  const child = spawn(process.execPath, ["server/competitor-lookup-server.mjs"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(port),
      WINGMAN_UI_PORT: String(uiPort),
      WINGMAN_DATA_DIR: dataDir,
      WINGMAN_STORAGE_MODE: "supabase-tables",
      // Fail closed: a fake hiccup must surface as a request failure, never a
      // silent fallback to a throwaway file store (which would fork the DB).
      WINGMAN_STORAGE_FAIL_CLOSED: "true",
      SUPABASE_URL: `http://127.0.0.1:${fakeServer.address().port}`,
      SUPABASE_SERVICE_ROLE_KEY: "fake-service-role-key",
      LOOKUP_PERSIST_RUNTIME_EVENTS: "false",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  child.stdout?.on("data", (chunk) => childLog.push(`[${port}] ${String(chunk)}`));
  child.stderr?.on("data", (chunk) => childLog.push(`[${port}] ${String(chunk)}`));
  return child;
}

async function signup(base, name, emailPrefix) {
  const res = await fetch(`${base}/api/wingman/auth/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name,
      company: "Two Process Race Co",
      email: `${emailPrefix}-${Date.now()}@example.com`,
      password: "two-process-race-pass",
    }),
  });
  expect(res.status).toBe(200);
  const setCookie = res.headers.getSetCookie().find((header) => header.startsWith("wingman_session="));
  expect(setCookie, "signup should issue a wingman_session cookie").toBeTruthy();
  return setCookie.split(";")[0].split("=").slice(1).join("=");
}

async function fakeReadAll(table) {
  const res = await fetch(`http://127.0.0.1:${fakeServer.address().port}/rest/v1/${table}?select=*`);
  expect(res.status).toBe(200);
  return res.json();
}

async function waitForQueuedCommits(count, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (commitQueue.length >= count) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(
    `only ${commitQueue.length}/${count} commits reached the gate. Child logs:\n${childLog.slice(-40).join("\n")}`,
  );
}

async function syncProject(base, token, project) {
  const res = await fetch(`${base}/api/wingman/projects/sync`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      activeProjectId: project.id,
      projects: [project],
    }),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    // Non-JSON body (should not happen on 200) - status assertion still runs.
  }
  return { status: res.status, json };
}

/** A project document shaped exactly like what projectStore.ts posts. */
function makeProject(projectId, name) {
  return {
    id: projectId,
    name,
    owner: "Two Process Race User",
    ownerId: `owner-${projectId}`,
    stage: "Discovery",
    status: "Draft",
    updated: "Just now",
    resumeTo: "/wingman/discovery",
    createdAt: T0,
    updatedAt: T0,
    discoveryBrief: {
      savedAt: T0,
      roomModel: { customer: "Two Process Race Co", roomType: "Meeting room / boardroom" },
      capturedPercent: 0,
      missingInformation: [],
      quoteSafetyStatus: "quote-ready",
    },
  };
}

beforeAll(async () => {
  fakeServer = http.createServer(fakePostgrestHandler);
  await new Promise((resolve) => fakeServer.listen(0, "127.0.0.1", resolve));

  childA = spawnServer(PORT_A, 3993, dataDirA);
  childB = spawnServer(PORT_B, 3994, dataDirB);
  await waitForHealth(BASE_A);
  await waitForHealth(BASE_B);

  // Each process signs up its own user + workspace through its OWN server.
  // These signups commit through the fake (generation 0 -> 1 -> 2).
  tokenA = await signup(BASE_A, "Race User A", "race-a");
  tokenB = await signup(BASE_B, "Race User B", "race-b");

  // Reset the behavior counters after the signup commits so the assertions
  // below measure the two racing syncs only.
  commitSuccesses = 0;
  staleRefusals = 0;
}, 90_000);

afterAll(async () => {
  for (const child of [childA, childB]) {
    if (child) child.kill("SIGTERM");
  }
  childA = null;
  childB = null;
  if (fakeServer) {
    await new Promise((resolve) => fakeServer.close(resolve));
    fakeServer = null;
  }
  fs.rmSync(dataDirA, { recursive: true, force: true });
  fs.rmSync(dataDirB, { recursive: true, force: true });
});

describe("two server instances racing whole-snapshot commits (migration 013 CAS)", () => {
  it("overlapping syncs through two processes both land; neither reconcile deletes the other's rows", async () => {
    // Both servers' next commits are held at the gate until BOTH have
    // provably finished reading, so each snapshot predates the other's
    // commit - the interleaving that loses rows without the generation guard.
    holdCommits = true;

    const projectA = makeProject("two-process-a-proj", "Acme Project A (server A)");
    const projectB = makeProject("two-process-b-proj", "Acme Project B (server B)");
    const syncA = syncProject(BASE_A, tokenA, projectA);
    const syncB = syncProject(BASE_B, tokenB, projectB);

    // Both sync handlers have now read generation 2 and are parked at their
    // commit RPC. Releasing processes them in arrival order: the first claims
    // generation 2, the second finds the register at 3 and is REFUSED stale,
    // re-reads (now seeing the winner's rows), re-merges, and retries.
    await waitForQueuedCommits(2);
    expect(commitQueue.length).toBe(2);
    releaseCommitGate();

    const [resA, resB] = await Promise.all([syncA, syncB]);
    expect(resA.status, `sync A must succeed: ${JSON.stringify(resA.json)?.slice(0, 240)}`).toBe(200);
    expect(resB.status, `sync B must succeed: ${JSON.stringify(resB.json)?.slice(0, 240)}`).toBe(200);

    // The loser's first commit was refused as stale and retried to success:
    // one refusal and three successful commits (winner sync + loser retry +
    // ... the two signups already happened and their counters were reset).
    expect(staleRefusals, "exactly one of the two racing commits must be refused stale").toBe(1);
    expect(commitSuccesses, "winner + loser retry = 2 successful sync commits").toBe(2);

    // THE core assertion: neither whole-snapshot reconcile deleted the other
    // process's freshly written rows.
    const projects = await fakeReadAll("wingman_projects");
    const projectIds = new Set(projects.map((row) => row.id));
    expect(projectIds.has("two-process-a-proj"), "project A must survive the racing commits").toBe(true);
    expect(projectIds.has("two-process-b-proj"), "project B must survive the racing commits").toBe(true);
    expect(projects.length).toBe(2);

    // The loser's retry merged against the winner's snapshot, so the winner's
    // users/workspaces/sessions survived too - nothing was reconciled away.
    expect((await fakeReadAll("wingman_users")).length, "both signup users must survive").toBe(2);
    expect((await fakeReadAll("wingman_workspaces")).length, "both workspaces must survive").toBe(2);
    expect((await fakeReadAll("wingman_sessions")).length, "both sessions must survive").toBe(2);

    // Register accounting: 2 signup commits + 2 successful sync commits (the
    // refused attempt never bumped it) = generation 4.
    const [registerRow] = await fakeReadAll("wingman_db_generation");
    expect(Number(registerRow?.generation)).toBe(4);
  }, 60_000);
});
