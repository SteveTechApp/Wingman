import { describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Spawns the real tools/verify-supabase-rls.mjs against a loopback fake
// PostgREST endpoint. Pins the exit-code contract for both modes without any
// live Supabase credentials:
//
//   Sentinel mode (SUPABASE_SECRET_KEY set)  -> seeds marker rows, so a table
//     that returns [] to the anon key is definitively PROTECTED. Strict:
//     inconclusive (seed insert failed) and absent tables FAIL the run - this
//     is the CI wiring's "fail on warnings" behavior.
//   Read-only mode (no secret key)           -> soft notes on empty tables
//     (an empty table and a protected one are indistinguishable there).
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = path.join(projectRoot, "tools", "verify-supabase-rls.mjs");
const ANON_KEY = "anon-test-key";
const SECRET_KEY = "secret-test-key";
const TABLE_COUNT = 9;

// Fake PostgREST: records the call flow and answers per scenario.
//   plan.seedStatus      - HTTP status for POST (seed) inserts, default 201
//   plan.probeRows       - rows the ANON key's FILTERED GET (id=eq.) should
//                          return ([]); the unfiltered GET (no id filter)
//                          returns plan.unfilteredRows instead
//   plan.unfilteredRows  - rows the ANON key's UNFILTERED GET (limit=1) should
//                          return (default: same as probeRows - a table that
//                          returns nothing filtered also returns nothing
//                          unfiltered unless a conditional policy leaks)//   plan.probe404Tables  - Set of table names whose anon probe should 404
//                           with "could not find the table" (others return [])
//   plan.probeStatus     - HTTP status for the anon probe GET, default 200
//   plan.unfilteredStatus - HTTP status for the UNFILTERED anon probe GET,
//                           default 200 (the filtered probe still uses
//                           probeStatus, so the two failure modes can be
//                           exercised independently)
function startFakeSupabase(plan) {
  return new Promise((resolve) => {
    const calls = { seeds: [], probes: [], deletes: [], verifies: [] };
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const table = url.pathname.replace(/^\/rest\/v1\//, "");
      const isService = (req.headers.authorization ?? "").includes(SECRET_KEY);
      const body = (status, payload) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(payload === undefined ? "" : JSON.stringify(payload));
      };

      if (req.method === "POST") {
        calls.seeds.push(table);
        body(plan.seedStatus ?? 201, plan.seedStatus === 201 ? { ok: true } : { message: "seed rejected" });
        return;
      }
      if (req.method === "DELETE") {
        calls.deletes.push(table);
        res.writeHead(plan.deleteStatus ?? 204);
        res.end();
        return;
      }
      if (req.method === "GET") {
        if (isService) {
          // Cleanup residue verification - sentinel rows are gone.
          calls.verifies.push(table);
          body(200, []);
          return;
        }
        calls.probes.push(table);
        if (plan.probe404Tables?.has(table)) {
          body(404, { message: "could not find the table" });
          return;
        }
        const unfiltered = !url.searchParams.has("id");
        const rows = unfiltered ? (plan.unfilteredRows ?? plan.probeRows ?? []) : (plan.probeRows ?? []);
        if (unfiltered && plan.unfilteredStatus) {
          // PostgREST-style JSON-object error (not an array, not 401/403).
          body(plan.unfilteredStatus, { code: "PGRST999", message: "backend exploded", hint: null });
          return;
        }
        body(plan.probeStatus ?? 200, rows);
        return;
      }
      res.writeHead(405);
      res.end();
    });
    server.listen(0, "127.0.0.1", () =>
      resolve({ server, port: server.address().port, calls }),
    );
  });
}

function runTool({ port, secret }) {
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith("SUPABASE_")) env[key] = value;
  }
  env.SUPABASE_URL = `http://127.0.0.1:${port}`;
  env.SUPABASE_ANON_KEY = ANON_KEY;
  if (secret) env.SUPABASE_SECRET_KEY = SECRET_KEY;

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [TOOL], { env, cwd: projectRoot });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("close", (code) => resolve({ code, stdout, stderr, all: stdout + stderr }));
  });
}

describe("verify-supabase-rls.mjs — sentinel mode (CI wiring)", () => {
  it("definitively PROTECTED when the anon key cannot read a seeded marker row (exit 0, no residue)", async () => {
    const { server, port, calls } = await startFakeSupabase({ probeRows: [] });
    try {
      const result = await runTool({ port, secret: true });
      expect(result.code).toBe(0);
      expect(result.all).toMatch(/hid their seeded marker row from the anon key/);
      expect(result.all).not.toMatch(/unclear|inconclusive/i);
      expect(result.all).toContain("Probe rows removed");
      // Seed -> probe -> cleanup ran for every table: 9 seeds, 9 deletes,
      // and 2 anon GETs per table (the filtered sentinel probe plus the
      // unfiltered conditional-policy probe on the protected path).
      expect(calls.seeds).toHaveLength(TABLE_COUNT);
      expect(calls.probes).toHaveLength(TABLE_COUNT * 2);
      expect(calls.deletes).toHaveLength(TABLE_COUNT);
    } finally {
      server.close();
    }
  });

  it("EXPOSED when the anon key reads the seeded marker row (exit 1)", async () => {
    const { server, port } = await startFakeSupabase({ probeRows: [{ id: "rls-sentinel-leak" }] });
    try {
      const result = await runTool({ port, secret: true });
      expect(result.code).toBe(1);
      expect(result.all).toMatch(/EXPOSED/);
      expect(result.all).toMatch(/anon key read sentinel row/);
    } finally {
      server.close();
    }
  });

  it("FAILS on warnings: a failed seed insert makes the verdict inconclusive, which is a hard failure in sentinel mode", async () => {
    const { server, port } = await startFakeSupabase({ seedStatus: 500 });
    try {
      const result = await runTool({ port, secret: true });
      expect(result.code).toBe(1);
      expect(result.stderr).toMatch(/could not be proven protected \(sentinel seed failed\)/);
      expect(result.stderr).toMatch(/\[seed\] wingman_users FAILED/);
    } finally {
      server.close();
    }
  });

  it("does NOT report protected when the unfiltered probe errors with a JSON-object body (P1: non-401/403 failure must not read as a green)", async () => {
    // The unfiltered GET is the probe that decides between "protected" and
    // "leak" once the sentinel row is seeded. A transient backend error that
    // returns a JSON-object body (not an array) must classify as unknown and
    // FAIL the run - previously it parsed as a non-array and fell through to
    // the protected verdict, leaving the nightly gate green mid-outage.
    const { server, port } = await startFakeSupabase({
      probeRows: [],
      unfilteredStatus: 500,
    });
    try {
      const result = await runTool({ port, secret: true });
      expect(result.code).toBe(1);
      expect(result.all).toMatch(/unknown/);
      expect(result.all).toMatch(/HTTP 500 \(unfiltered probe\)/);
      // Never a false green: no table may be reported protected here.
      expect(result.all).not.toMatch(/hid their seeded marker row from the anon key/);
    } finally {
      server.close();
    }
  });

  it("EXPOSED via the unfiltered probe when a conditional policy leaks real rows the sentinel does not match", async () => {
    // A permissive-but-narrow policy (e.g. workspace_id = auth.uid()): the
    // seeded sentinel row fails the predicate, so the filtered id probe
    // returns [] - but real rows match it and stay publicly readable.
    const { server, port } = await startFakeSupabase({
      probeRows: [],
      unfilteredRows: [{ id: "real-public-row" }],
    });
    try {
      const result = await runTool({ port, secret: true });
      expect(result.code).toBe(1);
      // The per-table report (stdout) names the leak mechanism; the failure
      // summary (stderr) flags the exposed count.
      expect(result.all).toMatch(/unfiltered probe \(conditional policy leak\)/);
      expect(result.stderr).toMatch(/table\(s\) returned data to the public anon key/);
    } finally {
      server.close();
    }
  });

  it("FAILS when a single table is absent (posture unverifiable) - previously this passed silently", async () => {
    const { server, port } = await startFakeSupabase({
      probe404Tables: new Set(["wingman_audit_events"]),
    });
    try {
      const result = await runTool({ port, secret: true });
      expect(result.code).toBe(1);
      expect(result.all).toMatch(/1 table\(s\) are absent - posture unverifiable/);
      // Only the partial-missing failure - not the "no Wingman tables" one,
      // and definitely not a silent pass.
      expect(result.all).not.toMatch(/no Wingman tables found/);
    } finally {
      server.close();
    }
  });
});

describe("verify-supabase-rls.mjs — read-only mode (human, unchanged semantics)", () => {
  it("keeps empty tables as a soft NOTE (exit 0) - no secret key, so nothing can be seeded", async () => {
    const { server, port, calls } = await startFakeSupabase({ probeRows: [] });
    try {
      const result = await runTool({ port, secret: false });
      expect(result.code).toBe(0);
      expect(result.all).toMatch(/unclear/);
      expect(result.all).toMatch(/Re-run with SUPABASE_SECRET_KEY/);
      // Read-only mode must never write.
      expect(calls.seeds).toHaveLength(0);
      expect(calls.deletes).toHaveLength(0);
    } finally {
      server.close();
    }
  });

  it("still fails when the anon key can read rows", async () => {
    const { server, port } = await startFakeSupabase({ probeRows: [{ id: "real-user-row" }] });
    try {
      const result = await runTool({ port, secret: false });
      expect(result.code).toBe(1);
      expect(result.all).toMatch(/EXPOSED/);
    } finally {
      server.close();
    }
  });

  it("fails with exit 2 when URL or anon key is missing", async () => {
    const env = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (!key.startsWith("SUPABASE_")) env[key] = value;
    }
    env.SUPABASE_URL = "http://127.0.0.1:1";
    const result = await new Promise((resolve) => {
      const child = spawn(process.execPath, [TOOL], { env, cwd: projectRoot });
      let stderr = "";
      child.stderr.on("data", (chunk) => (stderr += chunk));
      child.on("close", (code) => resolve({ code, stderr }));
    });
    expect(result.code).toBe(2);
    expect(result.stderr).toMatch(/SUPABASE_URL and SUPABASE_ANON_KEY are both required/);
  });
});