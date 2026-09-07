import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildMarkerCleanupPlan,
  buildRunCleanupPlan,
  checkOwnerRows,
  corpusProjectCount,
  corpusProjectId,
  corpusProjectName,
  deleteLoadTestArtifacts,
  deleteSupabaseRunRows,
  verifySupabaseRunPersistence,
} from "./load-test.mjs";
import { canonicalStageForRow, canonicalStatusForRow } from "../server/project-row-vocabulary.mjs";

// PostgREST-shaped wingman_projects rows as read back after a supabase-tables
// load run. The canonical row columns mirror what the server's row builder
// committed (server/project-row-vocabulary.mjs), and `payload` holds the full
// client document with its original strings.
function rowFor(namespace, index, overrides = {}) {
  const id = corpusProjectId(namespace, index);
  const payload = {
    id,
    name: corpusProjectName(index),
    stage: "Proposal Builder",
    status: "recommended",
  };
  return {
    id,
    workspace_id: "ws-run-1",
    owner_id: "owner-1",
    stage: canonicalStageForRow(payload.stage),
    status: canonicalStatusForRow(payload.status),
    payload,
    ...overrides,
  };
}

function corpusRows(namespace = "u7", count = 4) {
  return Array.from({ length: count }, (_, index) => rowFor(namespace, index));
}

function baseOptions(extra = {}) {
  return {
    rows: [],
    ownerId: "owner-1",
    corpusCount: 4,
    allowedNamespaces: new Set([7]),
    workspaceIds: new Set(["ws-run-1"]),
    ...extra,
  };
}

describe("corpusProjectCount", () => {
  it("mirrors the harness corpus sizes", () => {
    expect(corpusProjectCount("small")).toBe(1);
    expect(corpusProjectCount("standard")).toBe(4);
    expect(corpusProjectCount("large")).toBe(10);
    expect(corpusProjectCount("unknown")).toBe(4);
  });
});

describe("checkOwnerRows", () => {
  it("accepts one full corpus synced by the run", () => {
    const failures = checkOwnerRows(baseOptions({ rows: corpusRows("u7") }));
    expect(failures).toEqual([]);
  });

  it("accepts a corpus from any namespace the owner's sessions synced", () => {
    // u3 can win the replace race even though u7 was the later-issued save.
    const failures = checkOwnerRows(
      baseOptions({ allowedNamespaces: new Set([3, 7]), rows: corpusRows("u3") }),
    );
    expect(failures).toEqual([]);
  });

  it("fails on zero rows - the silent local-store fallback shape", () => {
    const failures = checkOwnerRows(baseOptions({ rows: [] }));
    expect(failures).toEqual(
      expect.arrayContaining([expect.stringContaining("expected exactly 4 persisted project row(s)"), expect.stringContaining("found 0")]),
    );
  });

  it("fails on a truncated corpus (partial commit)", () => {
    const failures = checkOwnerRows(baseOptions({ rows: corpusRows("u7", 2) }));
    expect(failures).toEqual(
      expect.arrayContaining([expect.stringContaining("expected exactly 4 persisted project row(s)"), expect.stringContaining("found 2")]),
    );
  });

  it("fails when the corpus belongs to a namespace this run never synced", () => {
    const failures = checkOwnerRows(baseOptions({ rows: corpusRows("u99") }));
    expect(failures).toEqual(
      expect.arrayContaining([expect.stringContaining("belongs to corpus u99"), expect.stringContaining("never successfully synced")]),
    );
  });

  it("fails when one owner's rows span two corpora (not one atomic corpus)", () => {
    const rows = [...corpusRows("u7", 2), ...corpusRows("u33", 2)];
    const failures = checkOwnerRows(baseOptions({ rows }));
    expect(failures).toEqual(
      expect.arrayContaining([expect.stringContaining("rows span 2 corpora"), expect.stringContaining("u33")]),
    );
  });

  it("fails on row ids outside the corpus shape (foreign/leftover projects)", () => {
    const rows = [...corpusRows("u7", 3), rowFor("u7", 3, { id: "legacy-project-9" })];
    const failures = checkOwnerRows(baseOptions({ rows }));
    expect(failures).toEqual(
      expect.arrayContaining([expect.stringContaining("legacy-project-9"), expect.stringContaining("not a load-test corpus id")]),
    );
  });

  it("fails when a row's project index exceeds the corpus", () => {
    const rows = [...corpusRows("u7", 3), rowFor("u7", 3, { id: corpusProjectId("u7", 9) })];
    const failures = checkOwnerRows(baseOptions({ rows }));
    expect(failures).toEqual(
      expect.arrayContaining([expect.stringContaining("project index 9"), expect.stringContaining("outside the 4-project corpus")]),
    );
  });

  it("fails when the payload loses the client vocabulary (stage/status)", () => {
    const rows = corpusRows("u7").map((row, index) =>
      index === 0
        ? {
            ...row,
            payload: {
              ...row.payload,
              stage: "Discovery",
              status: "alternative",
            },
          }
        : row,
    );
    const failures = checkOwnerRows(baseOptions({ rows }));
    expect(failures).toEqual(
      expect.arrayContaining([
        expect.stringContaining("payload.stage is \"Discovery\"; client vocabulary not preserved"),
        expect.stringContaining("payload.status is \"alternative\"; client vocabulary not preserved"),
      ]),
    );
  });

  it("fails when the row stage/status columns were copied verbatim (the 23514 bug shape)", () => {
    // Pre-ADR-0001 §1.2g behavior: the CHECK-constrained columns held the
    // client strings verbatim instead of the canonical values.
    const rows = corpusRows("u7").map((row) => ({
      ...row,
      stage: row.payload.stage,
      status: row.payload.status,
    }));
    const failures = checkOwnerRows(baseOptions({ rows }));
    expect(failures).toEqual(
      expect.arrayContaining([
        expect.stringContaining("stage column is \"Proposal Builder\" (expected \"Proposal\")"),
        expect.stringContaining("status column is \"recommended\" (expected \"Commercial Ready\")"),
      ]),
    );
  });

  it("fails when rows belong to another owner or workspace", () => {
    const wrongOwner = checkOwnerRows(baseOptions({ rows: corpusRows("u7").map((row) => ({ ...row, owner_id: "someone-else" })) }));
    expect(wrongOwner).toEqual(expect.arrayContaining([expect.stringContaining("owned by someone-else")]));

    const wrongWorkspace = checkOwnerRows(baseOptions({ rows: corpusRows("u7").map((row) => ({ ...row, workspace_id: "ws-other" })) }));
    expect(wrongWorkspace).toEqual(expect.arrayContaining([expect.stringContaining("outside this run's workspaces")]));
  });

  it("fails loudly when the read-back returned no row list at all", () => {
    const failures = checkOwnerRows(baseOptions({ rows: null }));
    expect(failures).toEqual(expect.arrayContaining([expect.stringContaining("did not return a row list")]));
  });

  it("reports a single coherent failure bundle for a totally empty silent run", () => {
    // The exact failure a file-store fallback run produced before fail-closed:
    // zero rows behind 100% 200s.
    const failures = checkOwnerRows(baseOptions({ rows: [], allowedNamespaces: new Set([0, 1, 2, 3]) }));
    expect(failures.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// buildRunCleanupPlan / deleteSupabaseRunRows (post-run row cleanup)
// ---------------------------------------------------------------------------

function fakeResponse({ ok = true, status = 200, contentRange = "", body = "" } = {}) {
  return {
    ok,
    status,
    text: async () => body,
    headers: { get: (name) => (String(name).toLowerCase() === "content-range" ? contentRange : null) },
  };
}

describe("buildRunCleanupPlan", () => {
  it("maps each run session to its user + workspace ids and dedupes", () => {
    const plan = buildRunCleanupPlan([
      { userId: "u-1", workspaceId: "ws-1" },
      { userId: "u-2", workspaceId: "ws-2" },
      { userId: "u-2", workspaceId: "ws-2" },
    ]);
    expect(plan.userIds).toEqual(["u-1", "u-2"]);
    expect(plan.workspaceIds).toEqual(["ws-1", "ws-2"]);
  });

  it("orders deletes children-before-workspaces-before-users (FK-safe)", () => {
    const plan = buildRunCleanupPlan([{ userId: "u-1", workspaceId: "ws-1" }]);
    const tables = plan.deletes.map((entry) => entry.table);
    expect(tables).toEqual([
      "wingman_audit_events",
      "wingman_projects",
      "wingman_sessions",
      "wingman_workspace_invitations",
      "wingman_workspace_members",
      "wingman_telemetry_events",
      "wingman_workspaces",
      "wingman_users",
    ]);
    // Children before the workspace row; workspace before its RESTRICT owner.
    expect(tables.indexOf("wingman_projects")).toBeLessThan(tables.indexOf("wingman_workspaces"));
    expect(tables.indexOf("wingman_sessions")).toBeLessThan(tables.indexOf("wingman_workspaces"));
    expect(tables.indexOf("wingman_workspaces")).toBeLessThan(tables.indexOf("wingman_users"));
    // Projects/sessions/members/invitations address the workspace or user; the
    // workspace and user rows address their own primary keys.
    const projects = plan.deletes.find((entry) => entry.table === "wingman_projects");
    expect(projects.filters).toEqual([{ column: "workspace_id", values: ["ws-1"] }]);
    const sessions = plan.deletes.find((entry) => entry.table === "wingman_sessions");
    expect(sessions.filters).toEqual([{ column: "user_id", values: ["u-1"] }]);
    const workspaces = plan.deletes.find((entry) => entry.table === "wingman_workspaces");
    expect(workspaces.filters).toEqual([{ column: "id", values: ["ws-1"] }]);
    const telemetry = plan.deletes.find((entry) => entry.table === "wingman_telemetry_events");
    expect(telemetry.filters).toHaveLength(2);
  });

  it("returns an empty plan for no sessions", () => {
    const plan = buildRunCleanupPlan([]);
    expect(plan.userIds).toEqual([]);
    expect(plan.workspaceIds).toEqual([]);
    expect(plan.deletes.every((entry) => entry.filters.every((f) => f.values.length === 0))).toBe(true);
  });
});

describe("buildMarkerCleanupPlan", () => {
  it("dedupes discovered ids and addresses orphaned load projects across all workspaces", () => {
    const plan = buildMarkerCleanupPlan({
      userIds: ["u-1", "u-1", ""],
      workspaceIds: ["ws-1", "ws-1"],
      projectIds: ["load-u5-project-0", "load-u5-project-0"],
    });
    expect(plan.userIds).toEqual(["u-1"]);
    expect(plan.workspaceIds).toEqual(["ws-1"]);
    expect(plan.projectIds).toEqual(["load-u5-project-0"]);
  });

  it("orders deletes children-before-workspaces-before-users (FK-safe)", () => {
    const plan = buildMarkerCleanupPlan({ userIds: ["u-1"], workspaceIds: ["ws-1"], projectIds: ["load-u5-project-0"] });
    const tables = plan.deletes.map((entry) => entry.table);
    expect(tables).toEqual([
      "wingman_audit_events",
      "wingman_projects",
      "wingman_sessions",
      "wingman_workspace_invitations",
      "wingman_workspace_members",
      "wingman_telemetry_events",
      "wingman_workspaces",
      "wingman_users",
    ]);
    expect(tables.indexOf("wingman_workspaces")).toBeLessThan(tables.indexOf("wingman_users"));

    // Audit and projects are addressed by marker workspace OR the orphaned
    // load-project id, so a --cookie run's corpus inside a real (non-loadtest)
    // workspace is removed without touching that workspace or its owner.
    const audit = plan.deletes.find((entry) => entry.table === "wingman_audit_events");
    expect(audit.filters).toEqual([
      { column: "workspace_id", values: ["ws-1"] },
      { column: "project_id", values: ["load-u5-project-0"] },
    ]);
    const projects = plan.deletes.find((entry) => entry.table === "wingman_projects");
    expect(projects.filters).toEqual([
      { column: "workspace_id", values: ["ws-1"] },
      { column: "id", values: ["load-u5-project-0"] },
    ]);
    const telemetry = plan.deletes.find((entry) => entry.table === "wingman_telemetry_events");
    expect(telemetry.filters).toHaveLength(3);
    const workspaces = plan.deletes.find((entry) => entry.table === "wingman_workspaces");
    expect(workspaces.filters).toEqual([{ column: "id", values: ["ws-1"] }]);
    const users = plan.deletes.find((entry) => entry.table === "wingman_users");
    expect(users.filters).toEqual([{ column: "id", values: ["u-1"] }]);
  });

  it("returns an empty plan for no discovered artifacts", () => {
    const plan = buildMarkerCleanupPlan({});
    expect(plan.userIds).toEqual([]);
    expect(plan.deletes.every((entry) => entry.filters.every((f) => f.values.length === 0))).toBe(true);
  });
});

describe("deleteLoadTestArtifacts (--cleanup-only)", () => {
  afterEach(() => vi.unstubAllGlobals());

  // PostgREST-shaped discovery responses per table; content-range stays 0 so
  // every delete/re-check count reads as zero (data comes from the JSON body).
  function markerFetchMock() {
    const calls = [];
    return vi.fn(async (url, init) => {
      const table = /rest\/v1\/(\w+)\?/.exec(String(url))?.[1] ?? "";
      const method = init?.method || "GET";
      calls.push({ method, table, url: String(url) });
      if (method === "DELETE") return fakeResponse({ status: 204, contentRange: "*/0" });
      const body = {
        wingman_users: [{ id: "u-1", email: "loadtest-0-x1y2z3@example.com", name: "Load Test User 0" }],
        wingman_workspaces: [{ id: "ws-1", name: "Load Test Co", owner_user_id: "u-1" }],
        // The id-pattern scan sees every project; the workspace-scoped read
        // (workspace_id=in.(ws-1)) returns only that workspace's rows.
        wingman_projects: String(url).includes("workspace_id=in")
          ? [{ id: "load-u7-project-0", workspace_id: "ws-1" }]
          : [
              { id: "load-u7-project-0", workspace_id: "ws-1" },
              { id: "load-u5-project-0", workspace_id: "ws-other" },
              { id: "real-project-1", workspace_id: "ws-other" },
            ],
      }[table] ?? [];
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(body),
        json: async () => body,
        headers: { get: (name) => (String(name).toLowerCase() === "content-range" ? "*/0" : null) },
      };
    });
  }

  it("discovers marker artifacts (pattern-filtered) and deletes them FK-safely", async () => {
    const fetchMock = markerFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const result = await deleteLoadTestArtifacts({
      supabaseUrl: "https://x.supabase.co",
      serviceKey: "service-key",
    });
    expect(result.ok).toBe(true);
    // The real workspace (ws-other) is never discovered; only the marker
    // workspace and the pattern-matched load projects are. The real project
    // row (id does not match the pattern) must never be touched.
    expect(result.discovered.counts.users).toBe(1);
    expect(result.discovered.workspaceIds).toEqual(["ws-1"]);
    expect(result.discovered.projectIds.slice().sort()).toEqual(["load-u5-project-0", "load-u7-project-0"]);
    const deleteCalls = fetchMock.mock.calls.filter(([, init]) => (init?.method || "GET") === "DELETE");
    expect(deleteCalls).toHaveLength(8);
    const projectDelete = deleteCalls.find(([url]) => /wingman_projects\?/.test(String(url)));
    expect(String(projectDelete[0])).toContain("load-u5-project-0");
    // The real project's id must never appear in any delete.
    const all = JSON.stringify(fetchMock.mock.calls.map(([url, init]) => [init?.method, url]));
    expect(all).not.toContain("real-project-1");
  });

  it("--dry-run discovers but never deletes", async () => {
    const fetchMock = markerFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const result = await deleteLoadTestArtifacts({
      supabaseUrl: "https://x.supabase.co",
      serviceKey: "service-key",
      dryRun: true,
    });
    expect(result.ok).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(fetchMock.mock.calls.some(([, init]) => (init?.method || "GET") === "DELETE")).toBe(false);
  });
});

describe("deleteSupabaseRunRows", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("deletes every run-owned table then re-checks all of them (zero remaining)", async () => {
    const calls = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url, init) => {
        const table = /rest\/v1\/(\w+)\?/.exec(String(url))?.[1] ?? "";
        const method = init?.method || "GET";
        calls.push({ method, table });
        if (method === "DELETE") return fakeResponse({ status: 204, contentRange: "*/0" });
        return fakeResponse({ status: 200, contentRange: "*/0" });
      }),
    );

    const result = await deleteSupabaseRunRows({
      supabaseUrl: "https://x.supabase.co/",
      serviceKey: "service-key",
      sessions: [{ userId: "u-1", workspaceId: "ws-1" }],
    });
    expect(result.ok).toBe(true);
    expect(result.remaining).toEqual({
      wingman_audit_events: 0,
      wingman_projects: 0,
      wingman_sessions: 0,
      wingman_workspace_invitations: 0,
      wingman_workspace_members: 0,
      wingman_telemetry_events: 0,
      wingman_workspaces: 0,
      wingman_users: 0,
    });
    const deleteTables = calls.filter((c) => c.method === "DELETE").map((c) => c.table);
    // The zero-remaining proof: every table is re-read after its delete (the
    // count-only re-check arrives as a HEAD request under supabase-js).
    const checkTables = calls.filter((c) => c.method !== "DELETE").map((c) => c.table);
    expect(deleteTables).toEqual([
      "wingman_audit_events",
      "wingman_projects",
      "wingman_sessions",
      "wingman_workspace_invitations",
      "wingman_workspace_members",
      "wingman_telemetry_events",
      "wingman_workspaces",
      "wingman_users",
    ]);
    expect(checkTables).toEqual(deleteTables);
  });

  it("fails (without touching other tables) when a delete errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url, init) => {
        const table = /rest\/v1\/(\w+)\?/.exec(String(url))?.[1] ?? "";
        const method = init?.method || "GET";
        if (method === "DELETE" && table === "wingman_projects") {
          return fakeResponse({ ok: false, status: 500, body: "fk violation" });
        }
        return fakeResponse({ status: 204, contentRange: "*/0" });
      }),
    );
    const result = await deleteSupabaseRunRows({
      supabaseUrl: "https://x.supabase.co",
      serviceKey: "service-key",
      sessions: [{ userId: "u-1", workspaceId: "ws-1" }],
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("wingman_projects");
    expect(result.reason).toContain("fk violation");
    // No re-checks ran (deletes already failed).
    expect(result.remaining).toBeUndefined();
  });

  it("fails when the zero-remaining re-check finds leftover rows", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url, init) => {
        const table = /rest\/v1\/(\w+)\?/.exec(String(url))?.[1] ?? "";
        const method = init?.method || "GET";
        if (method === "DELETE") return fakeResponse({ status: 204, contentRange: "*/0" });
        if (table === "wingman_audit_events") return fakeResponse({ status: 200, contentRange: "*/3" });
        return fakeResponse({ status: 200, contentRange: "*/0" });
      }),
    );
    const result = await deleteSupabaseRunRows({
      supabaseUrl: "https://x.supabase.co",
      serviceKey: "service-key",
      sessions: [{ userId: "u-1", workspaceId: "ws-1" }],
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("wingman_audit_events: 3 row(s) still present");
  });

  it("is a no-op for empty sessions (nothing to own)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await deleteSupabaseRunRows({
      supabaseUrl: "https://x.supabase.co",
      serviceKey: "service-key",
      sessions: [],
    });
    expect(result.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("verifySupabaseRunPersistence mode derivation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function readBackMock(rows) {
    return vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => rows,
      text: async () => "",
    }));
  }

  function verificationOptions(rows) {
    vi.stubEnv("SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "svc-key");
    vi.stubGlobal("fetch", readBackMock(rows));
    return {
      config: { spawnOwnServer: true, storageMode: "supabase-tables", users: 1, payload: "standard" },
      storageDetails: { storageModeActive: "unknown" },
      saveAnalysis: {
        scenario: "project-save",
        failed: 0,
        successful: 1,
        saveSummary: { successesBySlot: [1], namespacesBySlot: [new Set([7])] },
      },
      sessions: [{ userId: "u-1", workspaceId: "ws-1" }],
    };
  }

  it("still verifies (spawn config is authoritative) when the health report hiccuped", async () => {
    const rows = corpusRows("u7").map((row) => ({ ...row, owner_id: "u-1", workspace_id: "ws-1" }));
    const result = await verifySupabaseRunPersistence(verificationOptions(rows));
    // checked:true proves verification RAN despite storageModeActive=unknown -
    // the pre-fix code returned { ok:true, checked:false } without reading.
    expect(result).toEqual({ ok: true, checked: true });
  });

  it("catches zero persisted rows instead of silently passing when mode is unknown", async () => {
    const result = await verifySupabaseRunPersistence(verificationOptions([]));
    expect(result.ok).toBe(false);
    expect(result.checked).toBe(true);
  });
});
