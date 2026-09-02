import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Regression test for the PostgREST 1000-row cap class of bug, end to end.
//
// The Supabase-tables snapshot write (`writeDbToSupabaseTables`) hands the
// whole in-memory DB to wingman_snapshot_commit, whose SQL reconciles each
// table against the payload: rows whose id is NOT in the payload are DELETED.
// The payload comes from the table reads, so a read that silently stops at
// PostgREST's 1000-row cap omits the unread tail from the payload - and the
// commit then permanently deletes that tail. The fix is readAllSupabaseRows
// paging every full-table read until a short page proves exhaustion.
//
// To pin the fix we boot the REAL competitor-lookup server in supabase-tables
// mode against an in-process FAKE PostgREST that holds 1500 telemetry rows -
// more than the real PostgREST would ever return in one request - and then
// drive a real signup over HTTP. The signup reads the whole DB (must page past
// the cap) and commits the snapshot (must NOT delete the tail). If anyone
// regresses the read back to a single unpaged `select`, the fake's 1000-row
// cap (mirroring real PostgREST) truncates the read, the payload loses the
// tail, the commit deletes it, and this test goes red.
//
// The fake also ships a negative control: a commit whose payload really WAS
// truncated to the first 1000 rows deletes exactly the tail - proving the
// delete half of the reconciliation is live, so a green result is not vacuous.

const PORT = 8877; // distinct from 413 e2e (8876), api-contract-check (8898), check:workflow (8899)
const BASE = `http://127.0.0.1:${PORT}`;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wingman-unread-tail-e2e-"));

const TELEMETRY_TABLE = "wingman_telemetry_events";
const SEED_COUNT = 1500; // > PostgREST's 1000-row default cap
const CAP = 1000;

const WINGMAN_TABLES = [
  "wingman_app_state",
  "wingman_users",
  "wingman_workspaces",
  "wingman_workspace_members",
  "wingman_workspace_invitations",
  "wingman_sessions",
  "wingman_projects",
  "wingman_audit_events",
  TELEMETRY_TABLE,
];

const SECTION_TO_TABLE = {
  users: "wingman_users",
  workspaces: "wingman_workspaces",
  memberships: "wingman_workspace_members",
  invitations: "wingman_workspace_invitations",
  sessions: "wingman_sessions",
  projects: "wingman_projects",
  auditEvents: "wingman_audit_events",
  telemetryEvents: TELEMETRY_TABLE,
};

// ---------------------------------------------------------------------------
// Fake PostgREST: real cap semantics (1000 rows per un-ranged request), the
// offset/limit window postgrest-js sends for .range(), HEAD count probes, and
// the migration-009-style atomic snapshot commit reconciliation.
// ---------------------------------------------------------------------------

const fakeStore = new Map(); // table -> Map(id -> row)
const requestLog = [];

function rowsFor(table) {
  if (!fakeStore.has(table)) fakeStore.set(table, new Map());
  return fakeStore.get(table);
}

for (const table of WINGMAN_TABLES) rowsFor(table);

function seedTelemetry(count) {
  const map = rowsFor(TELEMETRY_TABLE);
  map.clear();
  for (let i = 0; i < count; i += 1) {
    const id = `seed-telemetry-${String(i).padStart(4, "0")}`;
    map.set(id, {
      id,
      workspace_id: null,
      user_id: null,
      project_id: null,
      kind: "info",
      message: `seeded row ${i}`,
      timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, 0) + i * 1000).toISOString(),
      payload: { seeded: true, index: i },
    });
  }
}

function fakePostgrestHandler(req, res) {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname.startsWith("/rest/v1/rpc/")) {
    const fn = url.pathname.slice("/rest/v1/rpc/".length);
    // Atomic snapshot commit (migration 009): for every section present as an
    // array in the payload, upsert its rows and DELETE table rows whose id is
    // not in the section - the exact semantics that made a truncated read
    // permanently delete the unread tail.
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      let payload;
      try {
        payload = JSON.parse(body || "{}").payload;
      } catch {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ message: "Invalid RPC payload" }));
        return;
      }
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
      requestLog.push({ method: req.method, resource: `rpc/${fn}`, rpc: true });
      res.writeHead(204);
      res.end();
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

  if (!WINGMAN_TABLES.includes(resource)) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: `Table ${resource} not found` }));
    return;
  }

  const rows = [...rowsFor(resource).values()];
  const total = rows.length;

  // Real PostgREST orders before applying the window.
  const order = url.searchParams.get("order"); // e.g. "id.asc"
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
    // postgrest-js .range(a, b) sends offset=a&limit=b-a+1.
    from = offsetParam !== null ? Math.max(0, Number(offsetParam) || 0) : 0;
    const limit = limitParam !== null ? Math.max(0, Number(limitParam) || 0) : total;
    toExclusive = Math.min(total, from + limit);
  } else {
    // No window: PostgREST silently returns at most CAP rows (its default
    // max-rows). THIS is the truncation behavior the pagination fix exists for.
    from = 0;
    toExclusive = Math.min(total, CAP);
  }

  const prefer = String(req.headers.prefer || "");
  const wantCount = /count=(exact|planned|estimated)/.test(prefer);
  const slice = rows.slice(from, toExclusive);

  if (wantCount || total > 0) {
    const rangeStart = slice.length > 0 ? from : "*";
    const rangeEnd = slice.length > 0 ? from + slice.length - 1 : "*";
    res.setHeader("content-range", `${rangeStart}-${rangeEnd === "*" ? "*" : rangeEnd}/${total}`);
  }

  if (req.method === "HEAD") {
    requestLog.push({ method: req.method, resource, offset: offsetParam, limit: limitParam, count: wantCount });
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== "GET") {
    res.writeHead(405, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: `Method ${req.method} not supported by the fake` }));
    return;
  }

  // Column projection, if the caller asked for a subset.
  const select = url.searchParams.get("select") || "*";
  const projected = select === "*" ? slice : slice.map((row) => {
    const out = {};
    for (const column of select.split(",")) {
      const key = column.trim();
      if (key) out[key] = row[key];
    }
    return out;
  });

  requestLog.push({ method: req.method, resource, offset: offsetParam, limit: limitParam, count: wantCount, returned: projected.length, total });
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify(projected));
}

// ---------------------------------------------------------------------------
// Test scaffolding
// ---------------------------------------------------------------------------

let child = null;
let fakeServer = null;
let fakePort = 0;
let sessionCookie = "";

async function waitForHealth(timeoutMs = 30_000) {
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
  throw new Error("test server did not become healthy in time");
}

async function signupAndCaptureCookie() {
  const res = await fetch(`${BASE}/api/wingman/auth/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Unread Tail E2E User",
      company: "Tail Audit Co",
      email: `unread-tail-${Date.now()}@example.com`,
      password: "tail-pass-8877",
    }),
  });
  expect(res.status).toBe(200);
  const setCookie = res.headers.getSetCookie().find((header) => header.startsWith("wingman_session="));
  expect(setCookie, "signup should issue a wingman_session cookie").toBeTruthy();
  return setCookie.split(";")[0];
}

async function fakeReadPage(table, { offset = 0, limit = 1000 } = {}) {
  const res = await fetch(`http://127.0.0.1:${fakePort}/rest/v1/${table}?select=*&offset=${offset}&limit=${limit}`);
  expect(res.status).toBe(200);
  return res.json();
}

async function fakeReadAll(table) {
  const all = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await fakeReadPage(table, { offset });
    all.push(...page);
    if (page.length < 1000) break;
  }
  return all;
}

function seedIds(count) {
  return Array.from({ length: count }, (_, i) => `seed-telemetry-${String(i).padStart(4, "0")}`);
}

beforeAll(async () => {
  // Fake PostgREST first, seeded BEFORE the server boots so any warm read sees
  // the full 1500-row table from the start.
  fakeServer = http.createServer(fakePostgrestHandler);
  await new Promise((resolve) => fakeServer.listen(0, "127.0.0.1", resolve));
  fakePort = fakeServer.address().port;
  seedTelemetry(SEED_COUNT);

  child = spawn(process.execPath, ["server/competitor-lookup-server.mjs"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(PORT),
      WINGMAN_UI_PORT: "3997",
      WINGMAN_DATA_DIR: dataDir,
      WINGMAN_STORAGE_MODE: "supabase-tables",
      SUPABASE_URL: `http://127.0.0.1:${fakePort}`,
      SUPABASE_SERVICE_ROLE_KEY: "fake-service-role-key",
      // Keep the lookup server's own competitor approvals/runtime-events
      // features dormant: this test exercises the wingman snapshot path only.
      LOOKUP_PERSIST_RUNTIME_EVENTS: "false",
    },
    stdio: "ignore",
    windowsHide: true,
  });

  await waitForHealth();
  // Clear the log of pre-signup noise (boot probes) so the paging assertion
  // below proves the signup read specifically walked past the cap.
  requestLog.length = 0;
  sessionCookie = await signupAndCaptureCookie();
}, 60_000);

afterAll(async () => {
  if (child) {
    child.kill("SIGTERM");
    child = null;
  }
  if (fakeServer) {
    await new Promise((resolve) => fakeServer.close(resolve));
    fakeServer = null;
  }
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe("snapshot write past the 1000-row PostgREST cap", () => {
  it("keeps every seeded row beyond the cap after a real signup write cycle", async () => {
    const telemetry = await fakeReadAll(TELEMETRY_TABLE);
    const ids = new Set(telemetry.map((row) => row.id));

    // Every pre-seeded row - including the 500-row tail that a capped read
    // would have omitted from the commit payload and thus deleted - survives.
    for (const id of seedIds(SEED_COUNT)) {
      expect(ids.has(id), `seeded row ${id} was deleted by the snapshot write`).toBe(true);
    }
    expect(telemetry.length).toBeGreaterThanOrEqual(SEED_COUNT);
  });

  it("actually paged the read past the cap during signup", async () => {
    // readAllSupabaseRows asks for offset=1000 (its second page). A store that
    // read once, uncapped, would only ever have asked offset=0.
    const telemetryReads = requestLog.filter(
      (entry) => entry.resource === TELEMETRY_TABLE && entry.method === "GET" && entry.offset !== null,
    );
    expect(telemetryReads.some((entry) => Number(entry.offset) >= CAP)).toBe(true);
  });

  it("the fake's cap is real: an unpaged read sees only the first 1000 of 1500+ rows", async () => {
    // Mirrors real PostgREST: an un-ranged select returns CAP rows with the
    // true total in Content-Range - so a caller that does not page cannot tell
    // it is missing the tail until the commit deletes it.
    const res = await fetch(`http://127.0.0.1:${fakePort}/rest/v1/${TELEMETRY_TABLE}?select=*`);
    const rows = await res.json();
    const contentRange = res.headers.get("content-range") || "";
    expect(rows).toHaveLength(CAP);
    expect(rows[0].id).toBe("seed-telemetry-0000");
    expect(contentRange).toMatch(/\/\d{4,}$/); // total >= 1000 advertised
  });

  it("the write path actually reached the fake (commit ran, rows stored)", async () => {
    // Guards against a silent storage fallback: if the server had degraded to
    // file mode the fake would still hold exactly the 1500 seeds and no user.
    const users = await fakeReadAll("wingman_users");
    expect(users.length).toBeGreaterThanOrEqual(1);
  });

  it("negative control: a genuinely truncated commit payload deletes exactly the tail", async () => {
    // Prove the delete half of the reconciliation is live: reset the table,
    // commit a payload that contains only the first 1000 rows (what a
    // truncating read WOULD have produced before the fix), and assert the
    // 500-row tail is removed. A green main assertion is therefore meaningful.
    seedTelemetry(SEED_COUNT);
    const firstPage = await fakeReadPage(TELEMETRY_TABLE, { offset: 0, limit: CAP });
    expect(firstPage).toHaveLength(CAP);

    const res = await fetch(`http://127.0.0.1:${fakePort}/rest/v1/rpc/wingman_snapshot_commit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ payload: { telemetryEvents: firstPage } }),
    });
    expect(res.status).toBe(204);

    const remaining = await fakeReadAll(TELEMETRY_TABLE);
    const remainingIds = new Set(remaining.map((row) => row.id));
    for (const id of seedIds(CAP)) {
      expect(remainingIds.has(id), `head row ${id} should survive the commit`).toBe(true);
    }
    for (const id of seedIds(SEED_COUNT).slice(CAP)) {
      expect(remainingIds.has(id), `tail row ${id} should have been deleted by the truncated commit`).toBe(false);
    }
  });
});
