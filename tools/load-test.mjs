#!/usr/bin/env node
/**
 * Wingman Load Testing Harness
 *
 * Benchmarks the REAL Wingman API (server/competitor-lookup-server.mjs) with
 * authenticated workspace sessions. By default it spawns its own server on a
 * throwaway port + data dir (file storage), signs up one throwaway workspace
 * per virtual user, and exercises the flows a sales rep actually hits:
 *
 *   health         GET /api/health, /api/ready                (no session)
 *   project-list   GET  /api/wingman/projects        (load)   (session)
 *   project-save   POST /api/wingman/projects/sync   (save)   (session)
 *   project-put    PUT  /api/wingman/projects/:id    (save)   (session) (opt-in)
 *   compare        POST /api/wingman/competitor-lookup        (session)
 *   payload-413    oversized-body probe against the sync route (local runs)
 *
 * project-put is the opt-in per-project revisioned-sync scenario (ADR-0001
 * Phase 1): each request PUTs ONE project to /api/wingman/projects/:id, so in
 * supabase-tables mode it benchmarks the migration-015 single-row guarded
 * commit (one row + audit + register advance) instead of the whole-snapshot
 * sync POST - the comparison that isolates the store-lock queue and
 * whole-snapshot RPC cost of project-save.
 *
 * Supabase-backed synchronization is exercised by booting the same server with
 * WINGMAN_STORAGE_MODE=supabase-tables + SUPABASE_* credentials (staging) or by
 * pointing the harness at such a deployment with --url. The harness reports the
 * server's storage mode (from /api/health/details) on every run so a file-mode
 * result is never mistaken for a Supabase result.
 *
 * A spawned supabase-tables run is no longer trusted on the strength of its
 * 200s: after all scenarios finish the harness reads the run's wingman_projects
 * rows STRAIGHT from Supabase (service-role key, bypassing the app server) and
 * asserts each workspace that saved now holds exactly the corpus it synced - id
 * count, owner, workspace, and the client-vocabulary payload (stage "Proposal
 * Builder" / status "recommended") sitting in CHECK-safe row columns. A run
 * whose 200s persisted nothing (the silent file-store fallback that predates
 * fail-closed, or any partial commit) exits 1 instead of reporting a green
 * baseline that only a manual read-back would have caught.
 *
 * Proposal compilation/export runs in the CLIENT (browser docx/visual build),
 * not over HTTP, so it is benchmarked separately by
 * tools/proposal-export-load.test.mjs (`npm run load-test:proposal-export`).
 *
 * Usage:
 *   node tools/load-test.mjs [options]
 *
 * Options:
 *   --url <url>          Target server. When omitted the harness boots its own
 *                        server on port 8897 with a throwaway data dir.
 *   --level <level>      smoke|standard|stress|spike (see docs/LOAD_TESTING.md)
 *   --concurrency <n>    Override level concurrency (default 10)
 *   --requests <n>       Override level request count per scenario (default 100)
 *   --scenarios <list>   Comma-separated scenario ids (default: all except
 *                        payload-413, which is local-spawn only). Two opt-in
 *                        ids exist: "hydrate-since" runs a POST-RUN benchmark
 *                        of the incremental-hydration payload (full vs
 *                        X-Wingman-Since GET) after project-save rows exist,
 *                        and "project-put" benchmarks the per-project
 *                        revisioned PUT (single-row guarded commit).
 *   --users <n>          Virtual users / workspaces (default 3). Signups are
 *                        rate-limited per IP (default 8/window); spawned local
 *                        servers raise the limit so larger counts work.
 *   --payload <preset>   Project corpus for project-save: small|standard|large
 *   --timeout <ms>       Per-request timeout (default 5000)
 *   --cookie <value>     Reuse an existing wingman_session cookie instead of
 *                        signing up (staging runs with a shared session)
 *   --storage-mode <m>   Spawned-server storage mode (default file). Set to
 *                        supabase-tables to benchmark the Supabase commit path
 *                        on the harness's own server; the spawned server
 *                        inherits SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (or
 *                        SUPABASE_SECRET_KEY) from the harness process env.
 *                        Spawned supabase-tables runs AUTO-VERIFY that the
 *                        committed project rows persisted (direct Supabase
 *                        read-back) and fail the run otherwise; a VERIFIED
 *                        pass then deletes the run's own signups, workspaces
 *                        and project rows (self-verified zero remaining) so
 *                        repeated runs never need manual DB cleanup
 *                        (--keep-db-data opts out).
 *   --strict             Fail (exit 2) when p95/p99/error-rate exceed the
 *                        recorded budgets in docs/LOAD_TESTING.md
 *   --keep-data          Keep the throwaway data dir + server logs on success
 *   --keep-db-data       Keep this run's Supabase rows after a verified pass
 *   --cleanup-only       Delete leftover load-test artifacts (signups,
 *                        workspaces, project rows from prior failed or
 *                        --keep-db-data runs) keyed on the loadtest markers
 *                        (loadtest-*@example.com users / "Load Test Co"
 *                        workspaces / load-u<N>-project-<K> project ids), then
 *                        self-verify zero remain. Needs SUPABASE_URL +
 *                        SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY).
 *   --dry-run            With --cleanup-only: list what would be deleted
 *                        without deleting anything.
 *   --help               Show this help message
 *
 * Exit codes: 0 = all scenarios passed (or cleanup-only left zero rows),
 * 1 = request failures / harness error / cleanup leftovers remain,
 * 2 = --strict budget violation.
 *
 * Port: 8897 (distinct from 413 test 8876, agents 8877/8878, unread-tail 8879,
 * e2e-smoke 8892, docx-check 8893, stranded-loop 8894, contract check 8898,
 * workflow check 8899).
 */

import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { canonicalStageForRow, canonicalStatusForRow } from "../server/project-row-vocabulary.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const DEFAULT_PORT = 8897;
const DEFAULT_CONCURRENCY = 10;
const DEFAULT_REQUESTS = 100;
const DEFAULT_TIMEOUT = 5000;
const DEFAULT_USERS = 3;

const LEVELS = {
  smoke: { concurrency: 5, requests: 20 },
  standard: { concurrency: 10, requests: 100 },
  stress: { concurrency: 50, requests: 500 },
  spike: { concurrency: 100, requests: 1000 },
};

// Recorded budgets (p95 ms, p99 ms, max error %) per scenario. These are the
// numbers in docs/LOAD_TESTING.md "Budgets (2026-09-03)" and are only enforced
// under --strict (CI-able gate). Refine them from dated real runs; never lower
// them to make a red run pass.
const STRICT_BUDGETS = {
  health: { p95: 150, p99: 300, errorPct: 0 },
  "project-list": { p95: 750, p99: 1500, errorPct: 0 },
  "project-save": { p95: 1500, p99: 4000, errorPct: 0 },
  compare: { p95: 2000, p99: 6000, errorPct: 0 },
};

const ALL_SCENARIOS = ["health", "project-list", "project-save", "compare", "payload-413"];

// Opt-in post-run benchmark (NOT part of the default scenario loop): measures
// the incremental-hydration payload saving after project-save rows exist.
// See benchmarkIncrementalHydration below.
const INCREMENTAL_HYDRATION_SCENARIO = "hydrate-since";

// Opt-in per-project revisioned-sync scenario (ADR-0001 Phase 1): PUT one
// project per request to /api/wingman/projects/:id (migration-015 single-row
// guarded commit in supabase-tables mode). NOT part of the default loop so
// recorded whole-store baselines stay comparable; run it explicitly with
// `--scenarios project-save,project-put` to compare the two write paths.
const PER_PROJECT_PUT_SCENARIO = "project-put";
const VALID_SCENARIOS = [...ALL_SCENARIOS, INCREMENTAL_HYDRATION_SCENARIO, PER_PROJECT_PUT_SCENARIO];

// The wingman_projects row table the supabase-tables commit writes (migration
// 001; table-name overrides are rejected by the server in tables mode, so the
// default name is the only one a tables-mode run can hit).
const SUPABASE_PROJECTS_TABLE = "wingman_projects";

// Corpus project ids are load-u<namespace>-project-<index>: the namespace is
// the request/job index (so every sync of a session carries a fresh, unique
// id set) and the index is the project slot inside the corpus.
const LOAD_PROJECT_ID_PATTERN = /^load-u(\d+)-project-(\d+)$/;

function printHelp() {
  console.log(`
Wingman Load Testing Harness

Usage:
  node tools/load-test.mjs [options]

Options:
  --url <url>          Target server (default: boots own server on :${DEFAULT_PORT})
  --level <level>      smoke | standard | stress | spike
  --concurrency <n>    Override concurrency (default ${DEFAULT_CONCURRENCY})
  --requests <n>       Requests per scenario (default ${DEFAULT_REQUESTS})
  --scenarios <list>   Comma-separated: ${ALL_SCENARIOS.join(", ")}, plus the
                       opt-in "${PER_PROJECT_PUT_SCENARIO}" (per-project
                       revisioned PUT) and the post-run benchmark
                       "${INCREMENTAL_HYDRATION_SCENARIO}" (payload saved by
                       incremental hydration vs a full reload)
  --users <n>          Virtual workspace sessions (default ${DEFAULT_USERS})
  --payload <preset>   Project-save corpus: small | standard | large
  --timeout <ms>       Request timeout (default ${DEFAULT_TIMEOUT})
  --cookie <value>     Reuse a wingman_session cookie instead of signing up
  --strict             Enforce the recorded p95/p99/error budgets
  --keep-data          Keep data dir + logs after a successful run
  --keep-db-data       Keep this run's Supabase rows after a verified pass
  --cleanup-only       Cleanup MODE (no server, no signups): delete leftover
                       load-test artifacts from prior failed / --keep-db-data
                       runs, keyed on the loadtest markers (loadtest-*@example
                       .com users, "Load Test Co" workspaces, load-u<N>-
                       project-<K> project ids) and self-verify zero remain.
                       Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or
                       SUPABASE_SECRET_KEY) in the harness env.
  --dry-run            With --cleanup-only: list leftovers, delete nothing.
  --storage-mode <m>   Spawned-server storage mode: file | supabase |
                       supabase-tables (default file). supabase* modes need
                       SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or
                       SUPABASE_SECRET_KEY) in the harness env. Spawned
                       supabase-tables runs auto-verify persisted rows and,
                       after a verified pass, delete the run's own signups,
                       workspaces and project rows so repeated runs never
                       need manual DB cleanup (--keep-db-data opts out).
  --help               Show this help

Examples:
  node tools/load-test.mjs                       # standard, own server
  node tools/load-test.mjs --level smoke         # quick validation
  node tools/load-test.mjs --level stress --users 8
  node tools/load-test.mjs --url https://staging.example.com --users 2
  # Delete leftover artifacts after a failed / --keep-db-data supabase run:
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
    node tools/load-test.mjs --cleanup-only --dry-run   # preview first
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
    node tools/load-test.mjs --cleanup-only             # delete + verify

Examples:
  node tools/load-test.mjs                       # standard, own server
  node tools/load-test.mjs --level smoke         # quick validation
  node tools/load-test.mjs --level stress --users 8
  node tools/load-test.mjs --url https://staging.example.com --users 2
`);
}

function parseCliArgs() {
  const { values } = parseArgs({
    options: {
      url: { type: "string", default: "" },
      level: { type: "string", default: "" },
      concurrency: { type: "string", default: "" },
      requests: { type: "string", default: "" },
      scenarios: { type: "string", default: "" },
      users: { type: "string", default: "" },
      payload: { type: "string", default: "standard" },
      timeout: { type: "string", default: String(DEFAULT_TIMEOUT) },
      cookie: { type: "string", default: "" },
      strict: { type: "boolean", default: false },
      "keep-data": { type: "boolean", default: false },
      "keep-db-data": { type: "boolean", default: false },
      "cleanup-only": { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      "storage-mode": { type: "string", default: "" },
      help: { type: "boolean", default: false },
    },
    allowPositionals: false,
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  const level = values.level ? values.level.toLowerCase() : "";
  if (level && !LEVELS[level]) {
    console.error(`Unknown level "${level}". Choose from: ${Object.keys(LEVELS).join(", ")}`);
    process.exit(1);
  }

  const concurrency = parseInt(values.concurrency || "", 10);
  const requests = parseInt(values.requests || "", 10);
  const payload = values.payload.toLowerCase();
  if (!["small", "standard", "large"].includes(payload)) {
    console.error(`Unknown payload "${payload}". Choose from: small, standard, large`);
    process.exit(1);
  }

  if (values["cleanup-only"]) {
    // Cleanup mode talks to Supabase directly (no server to spawn), so it
    // needs only the Supabase credentials - fail loudly when they are absent
    // rather than discovering nothing against an unreadable project.
    const { supabaseUrl, serviceKey } = readSupabaseCreds();
    if (!supabaseUrl || !serviceKey) {
      console.error(
        "[load-test] --cleanup-only needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) exported to the harness process.",
      );
      process.exit(1);
    }
  }

  const storageMode = (values["storage-mode"] || "file").toLowerCase();
  if (!["file", "supabase", "supabase-tables"].includes(storageMode)) {
    console.error(`Unknown storage mode "${storageMode}". Choose from: file, supabase, supabase-tables`);
    process.exit(1);
  }
  if (values["storage-mode"] && !values.url && storageMode !== "file") {
    // A remote store needs SUPABASE_URL + a service-role key in the harness
    // process env; the spawned server inherits process.env. Warn loudly when
    // they are absent so a supabase run never silently falls back to file.
    const hasCreds = Boolean(process.env.SUPABASE_URL) && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY);
    if (!hasCreds) {
      console.error(
        `[load-test] --storage-mode ${storageMode} needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY ` +
          `(or SUPABASE_SECRET_KEY) exported to the harness process; the spawned server inherits them.`,
      );
      process.exit(1);
    }
  }

  const scenarios = values.scenarios
    ? values.scenarios.split(",").map((s) => s.trim()).filter(Boolean)
    : ALL_SCENARIOS;
  for (const scenario of scenarios) {
    if (!VALID_SCENARIOS.includes(scenario)) {
      console.error(
        `Unknown scenario "${scenario}". Choose from: ${ALL_SCENARIOS.join(", ")} (or the opt-in "${PER_PROJECT_PUT_SCENARIO}" and the post-run benchmark "${INCREMENTAL_HYDRATION_SCENARIO}")`,
      );
      process.exit(1);
    }
  }

  return {
    baseUrl: (values.url || "").replace(/\/$/, ""),
    spawnOwnServer: !values.url,
    level: level || "standard",
    concurrency: Number.isFinite(concurrency) && concurrency > 0 ? concurrency : LEVELS[level || "standard"].concurrency,
    totalRequests: Number.isFinite(requests) && requests > 0 ? requests : LEVELS[level || "standard"].requests,
    scenarios,
    users: Number.isFinite(parseInt(values.users || "", 10)) && parseInt(values.users || "", 10) > 0
      ? parseInt(values.users || "", 10)
      : DEFAULT_USERS,
    payload,
    timeout: Number.isFinite(parseInt(values.timeout, 10)) ? parseInt(values.timeout, 10) : DEFAULT_TIMEOUT,
    cookie: values.cookie,
    strict: values.strict,
    keepData: values["keep-data"],
    keepDbData: values["keep-db-data"],
    cleanupOnly: values["cleanup-only"],
    dryRun: values["dry-run"],
    storageMode,
  };
}

// ---------------------------------------------------------------------------
// Server lifecycle (local runs)
// ---------------------------------------------------------------------------

function stopWindowsPortListener(port) {
  if (process.platform !== "win32") return;
  const command = [
    `$ids = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue`,
    "| Select-Object -ExpandProperty OwningProcess -Unique;",
    "foreach ($id in $ids) {",
    "if ($id) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue }",
    "}",
  ].join(" ");
  try {
    execFileSync("powershell.exe", ["-NoProfile", "-Command", command], { stdio: "ignore" });
  } catch {
    // Best-effort cleanup for stale local listeners.
  }
}

async function waitForHealth(baseUrl, label, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) return;
      lastError = `HTTP ${res.status}`;
    } catch (error) {
      lastError = error.message;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`[load-test] ${label} did not become healthy in time (${lastError}).`);
}

async function fetchServerDetails(baseUrl) {
  try {
    // /api/wingman/health is the wingman-app-store handler that reports the
    // configured/active storage mode (file | supabase | supabase-tables).
    const res = await fetch(`${baseUrl}/api/wingman/health`);
    if (!res.ok) return {};
    const json = await res.json();
    return {
      storageModeConfigured: json.storageModeConfigured || "unknown",
      storageModeActive: json.storageModeActive || "unknown",
      storageConfigError: json.storageConfigError || undefined,
      service: json.service || "unknown",
      version: process.env.WINGMAN_VERSION || "unknown",
    };
  } catch {
    return { storageModeConfigured: "unknown", storageModeActive: "unknown", version: "unknown" };
  }
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

function randomSuffix() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function signupUser(baseUrl, index) {
  const suffix = randomSuffix();
  const res = await fetch(`${baseUrl}/api/wingman/auth/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: `Load Test User ${index}`,
      company: "Load Test Co",
      email: `loadtest-${index}-${suffix}@example.com`,
      password: `load-pass-${suffix}`,
    }),
  });
  if (res.status !== 200) {
    const body = await res.text();
    throw new Error(`[load-test] signup for user ${index} failed with HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const setCookie = res.headers.getSetCookie().find((header) => header.startsWith("wingman_session="));
  if (!setCookie) {
    throw new Error(`[load-test] signup for user ${index} did not issue a wingman_session cookie.`);
  }
  return setCookie.split(";")[0];
}

// Resolve the session's user and workspace ids (ownerId of that user's
// projects must be a real wingman_users row in supabase-tables mode - owner_id
// is a foreign key; the workspace id scopes the wingman_projects rows).
async function resolveSession(baseUrl, cookie) {
  const res = await fetch(`${baseUrl}/api/wingman/auth/session`, {
    headers: { accept: "application/json", cookie },
  });
  if (!res.ok) {
    throw new Error(`[load-test] could not resolve session user id (HTTP ${res.status}).`);
  }
  const body = await res.json();
  const id = body?.session?.user?.id || body?.user?.id;
  if (!id) {
    throw new Error(`[load-test] session response had no user id: ${JSON.stringify(body).slice(0, 160)}`);
  }
  return {
    userId: id,
    workspaceId: String(body?.session?.workspace?.id ?? ""),
  };
}

// ---------------------------------------------------------------------------
// Project-save corpus (mirrors what projectStore.ts POSTs to /projects/sync)
// ---------------------------------------------------------------------------

function iso(daysAgo) {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString();
}

function dataUrlOfSize(targetBytes) {
  // Deterministic stand-in for a proposal visual asset's inline SVG data URL.
  const svgBody = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900">${
    "<rect x=\"0\" y=\"0\" width=\"1600\" height=\"900\" fill=\"#12263a\"/>" +
    Array.from({ length: 24 }, (_, i) =>
      `<rect x="${(i * 66) % 1500}" y="${(i * 37) % 800}" width="40" height="24" fill="#37b6a7"/>`).join("")
  }</svg>`;
  const repeats = Math.max(1, Math.ceil(targetBytes / svgBody.length));
  return `data:image/svg+xml;base64,${Buffer.from(svgBody.repeat(repeats)).toString("base64")}`;
}

export function corpusProjectId(namespace, index) {
  return `load-${namespace}-project-${index}`;
}

export function corpusProjectName(index) {
  return `Load Test Project ${index} - HQ Meeting Rooms`;
}

export function corpusProjectCount(preset) {
  return { small: 1, standard: 4, large: 10 }[preset] ?? 4;
}

function buildProject(namespace, index, { includeVisuals, ownerId = "load-owner" }) {
  // The id must be globally unique: wingman_projects.id is a single-column
  // primary key shared across ALL workspaces in supabase-tables mode (file
  // mode scopes project state per workspace, so collisions were invisible
  // there). Real clients stamp uuid ids; the harness namespaces per virtual
  // user so two workspaces never contend for the same row id.
  const projectId = corpusProjectId(namespace, index);
  const timestamp = iso(index);
  const proposalVisualCount = includeVisuals ? 2 : 0;
  return {
    id: projectId,
    name: corpusProjectName(index),
    owner: "Load Test User",
    ownerId,
    customer: "Load Test Co",
    site: "London HQ",
    roomName: `Meeting Room ${index}`,
    notes: "Resume workflow: /wingman/proposals",
    // Row vocabulary: the supabase-tables commit used to copy stage/status
    // VERBATIM into the CHECK-constrained wingman_projects columns and every
    // real client project ("Proposal Builder"/"recommended") failed with a
    // Postgres 23514 (ADR-0001 §1.2c). The server now canonicalises the row
    // columns (server/project-row-vocabulary.mjs, ADR-0001 §1.2g) while the
    // payload blob keeps the client strings, so the corpus speaks the REAL
    // client vocabulary again - a supabase-tables run is therefore a live
    // regression test of the canonicalisation against real CHECK constraints.
    stage: "Proposal Builder",
    status: "recommended",
    updated: "Just now",
    resumeTo: "/wingman/proposal",
    createdAt: timestamp,
    updatedAt: timestamp,
    isDemo: false,
    discoveryBrief: {
      savedAt: timestamp,
      roomModel: {
        customer: "Load Test Co",
        customerName: "Load Test Co",
        companyName: "Load Test Co",
        roomType: "Meeting room / boardroom",
        floorPlan: `Floor ${index}`,
        estimatedAreaM2: 40 + index,
        occupancy: 8,
      },
      topology: {
        locations: [{ id: "loc-1", name: "Room", x: 0, y: 0, width: 6000, height: 4000 }],
        connections: [
          { id: "conn-1", from: "src-1", to: "dst-1", signal: "video", transport: "hdmi", lengthM: 8 },
          { id: "conn-2", from: "src-2", to: "dst-1", signal: "video", transport: "usb-c", lengthM: 5 },
        ],
      },
      capturedPercent: 92,
      missingInformation: [],
      nextBestQuestion: "None - design is complete.",
      quoteSafetyStatus: "quote-ready",
      decisionIntegrity: {
        status: "confirmed",
        unknownCount: 0,
        inferredCount: 1,
        conflictCount: 0,
        canQuote: true,
      },
      discoveryConversation: Array.from({ length: 8 }, (_, i) => ({
        stepId: `step-${i}`,
        question: `Discovery question ${i} for room ${index}?`,
        answer: `Captured answer ${i}`,
        note: "",
        confirmed: true,
        confidence: "high",
        confidenceScore: 10,
      })),
    },
    productSelections: Array.from({ length: 6 }, (_, i) => ({
      sku: `NHD-${400 + i}-TX`,
      quantity: 1 + (i % 3),
      title: `NetworkHD ${400 + i} Series Transmitter`,
      family: "NetworkHD",
      category: "AV over IP",
      status: "recommended",
      tags: ["networkhd", "encoder"],
      addedAt: timestamp,
      source: "Recommendations",
      evidence: ["Governed product technical data verified against WyreStorm documentation."],
      cautions: [],
    })),
    compareRuns: Array.from({ length: 3 }, (_, i) => ({
      id: `compare-run-${index}-${i}`,
      createdAt: iso(index + i * 0.1),
      version: i + 1,
      competitorBrand: "Crestron",
      competitorSku: `DM-NVX-35${i}`,
      competitorName: `DM-NVX-35${i}`,
      wyrestormSku: "NHD-621-TX",
      wyrestormTitle: "NetworkHD 600 4K60 Encoder",
      mode: "saved-history",
      summary: "Equivalent 1GbE AV-over-IP encode/decode with comparable latency.",
      warnings: ["Confirm network readiness before selecting AVoIP."],
      matchScore: 92,
      confidence: "High",
      matchType: "direct",
      evidence: ["Curated governed comparison profile for the competitor model."],
      source: "Competitor Compare",
    })),
    proposal: {
      title: `Load Test Proposal ${index} - Meeting Room AV Refresh`,
      summary: "NetworkHD-based AV refresh for meeting rooms with unified control and scheduling.",
      sections: ["Executive Summary", "Scope of Work", "Equipment and Pricing", "Services and Commercial Allowances"],
      products: Array.from({ length: 6 }, (_, i) => ({
        sku: `NHD-${400 + i}-TX`,
        quantity: 1 + (i % 3),
        title: `NetworkHD ${400 + i} Series Transmitter`,
        family: "NetworkHD",
        category: "AV over IP",
        status: "recommended",
        addedAt: timestamp,
        source: "Proposal Builder",
        evidence: [],
        cautions: [],
      })),
      assumptions: ["Existing network switch provides sufficient capacity.", "Installation outside business hours."],
      productFamilyScores: [{ family: "NetworkHD", score: 91, reasons: ["1GbE design fits the room count."], cautions: [] }],
      outputPurpose: {
        motion: "Customer proposal",
        summary: "Present the recommended architecture and commercial terms.",
        customerOutput: "Proposal document",
        nextAction: "Confirm and issue",
      },
      bomRows: Array.from({ length: 8 }, (_, i) => ({
        item: i + 1,
        sku: i < 6 ? `NHD-${400 + i}-TX` : i === 6 ? "NHD-CTL-PRO-V2" : "CAB-HDMI-5M",
        description: `BOM line item ${i + 1}`,
        role: i < 6 ? "Source encoder" : i === 6 ? "System controller" : "Cable",
        qty: 1 + (i % 3),
        type: "Required",
        status: "included",
        evidence: "Governed profile verified",
        notes: "",
      })),
      readinessScore: 88,
      verification: { status: "VERIFIED", acknowledged: true, summary: "All governed checks passed.", issues: [] },
      approvalStatus: "approved",
      approvedBy: "Load Test Manager",
      updatedAt: timestamp,
      visualBlocks: Array.from({ length: proposalVisualCount }, (_, i) => ({
        id: `visual-block-${index}-${i}`,
        assetId: `visual-${index}-${i}`,
        kind: "block-diagram",
        title: "Signal flow block diagram",
        summary: "Source-to-display routing diagram",
        proposalUse: "Show the customer how sources route to displays.",
        exportLabel: `Revision ${i + 1}`,
        renderSrc: dataUrlOfSize(proposalVisualCount ? 24_000 : 0),
      })),
      discoveryConversation: [
        { stepId: "opportunity", question: "What type of opportunity is this?", answer: "Meeting room / boardroom", note: "", confirmed: true },
      ],
    },
    proposalVersions: Array.from({ length: 3 }, (_, i) => ({
      id: `proposal-version-${index}-${i}`,
      versionNumber: i + 1,
      savedAt: iso(index + (3 - i) * 0.5),
      label: `v${i + 1} — Saved revision`,
      proposal: { title: `Load Test Proposal ${index}`, summary: "Earlier revision.", sections: [], products: [], assumptions: [], updatedAt: iso(index + (3 - i) * 0.5) },
    })),
    requirements: Array.from({ length: 6 }, (_, i) => ({
      id: `requirement-${index}-${i}`,
      label: `Requirement ${i}`,
      value: `Requirement value ${i}`,
      category: "AV",
      source: "Wingman",
      status: "confirmed",
      whyItMatters: "Drives the system design.",
      updatedAt: timestamp,
    })),
    recommendationEvidence: {
      updatedAt: timestamp,
      source: "Product Pitch",
      customerRequirement: "Distribute sources to every display in the room.",
      productDirection: "NetworkHD over 1GbE",
      systemShape: "Contained AV routing system per room.",
      whyThisFits: ["Room count matches NetworkHD scale.", "1GbE switch is already available."],
      evidenceUsed: ["Governed product technical data", "WyreStorm documentation"],
      productFamilyScores: [{ family: "NetworkHD", score: 91, reasons: [], cautions: [] }],
      quoteChecks: ["Confirm network readiness."],
      missingInformation: [],
      requiredDependencies: ["Managed network switch"],
      optionalUpgrades: [],
      alternatives: ["Dedicated matrix switching"],
      customerSafeWording: ["The system routes every source to every display."],
      internalGuidance: ["Confirm switch port count."],
      quoteSafetyStatus: "quote-ready",
      quoteSafetyMessage: "Ready to quote.",
      confidence: "high",
    },
    workflow: {
      source: "Proposal Builder",
      lastStep: "Proposal preview generated",
      nextRoute: "/wingman/proposal",
      updatedAt: timestamp,
    },
    auditTrail: [
      {
        id: `audit-${index}`,
        action: "proposal-save",
        detail: "Proposal updated - 6 products, readiness 88%",
        actorName: "Load Test User",
        actorEmail: "loadtest@example.com",
        scope: "proposal",
        severity: "info",
        createdAt: timestamp,
      },
    ],
    visualAssets: proposalVisualCount
      ? Array.from({ length: proposalVisualCount }, (_, i) => ({
          id: `visual-${index}-${i}`,
          projectId,
          kind: "block-diagram",
          title: "Signal flow block diagram",
          purpose: "proposal",
          status: "approved",
          revision: 1,
          source: { productSkus: ["NHD-621-TX", "NHD-621-RX"] },
          model: {},
          render: { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="1600" height="900" fill="#fff"/></svg>`, width: 1600, height: 900 },
          caption: "Signal flow diagram",
          assumptions: [],
          warnings: [],
          createdAt: timestamp,
          updatedAt: timestamp,
        }))
      : undefined,
  };
}

function buildSyncCorpus(preset, stampIso = new Date().toISOString(), namespace = "u0", ownerId = "load-owner") {
  const count = corpusProjectCount(preset);
  const includeVisuals = preset !== "small";
  const projects = Array.from({ length: count }, (_, i) => {
    const project = buildProject(namespace, i, { includeVisuals, ownerId });
    // Stamp every sync fresh so the server merge path (not the idempotent
    // same-timestamp path) is what gets benchmarked, like a live client.
    project.updated = "Just now";
    project.updatedAt = stampIso;
    if (project.proposal) project.proposal.updatedAt = stampIso;
    return project;
  });
  const body = JSON.stringify({ activeProjectId: projects[0].id, projects });
  return { body, bytes: Buffer.byteLength(body), projectCount: count };
}

/** ONE project document for the per-project PUT scenario, stamped fresh. */
function buildPutProject(preset, stampIso, namespace, index, ownerId) {
  const project = buildProject(namespace, index, { includeVisuals: preset !== "small", ownerId });
  project.updated = "Just now";
  project.updatedAt = stampIso;
  if (project.proposal) project.proposal.updatedAt = stampIso;
  return project;
}

// ---------------------------------------------------------------------------
// Load runner
// ---------------------------------------------------------------------------

function calculatePercentile(sortedValues, percentile) {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}

function formatMs(ms) {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}us`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function runScenario({ baseUrl, scenario, concurrency, totalRequests, timeout, cookies, userIds, payload }) {
  // The 413 probe is a contract check, not a throughput benchmark: a handful
  // of oversized requests is enough (each one moves ~2 MiB).
  const requestCount = scenario === "payload-413" ? Math.min(totalRequests, 3) : totalRequests;

  // Corpus namespaces become part of the GLOBAL row id (wingman_projects.id is
  // a single-column primary key shared across every workspace AND every run).
  // Job indexes restart at 0 on each run, so without a run-scoped offset two
  // back-to-back runs against the same DB would stamp the SAME ids, and a
  // whole-DB snapshot commit carrying both workspaces would fail with "ON
  // CONFLICT DO UPDATE command cannot affect row a second time" (one payload,
  // duplicate id). The offset keeps every run's id space disjoint even when
  // the previous run's rows were left in place.
  const namespaceBase = 1_000_000 + Math.floor(Math.random() * 2_000_000_000);

  const job = (userIndex) => {
    const cookie = cookies[userIndex % cookies.length] || "";
    const headers = { accept: "application/json" };
    if (cookie) headers.cookie = cookie;

    if (scenario === "health") {
      // Round-robin both public probes so the row measures the pair.
      const healthUrl = userIndex % 2 === 0 ? `${baseUrl}/api/health` : `${baseUrl}/api/ready`;
      return { url: healthUrl, init: { method: "GET", headers } };
    }
    if (scenario === "project-list") {
      return { url: `${baseUrl}/api/wingman/projects`, init: { method: "GET", headers } };
    }
    if (scenario === "project-save") {
      // Namespace the corpus per virtual user so every workspace's project ids
      // are unique across the shared wingman_projects table (see buildProject),
      // and stamp the real session user as owner (owner_id is an FK to
      // wingman_users in supabase-tables mode).
      const corpus = buildSyncCorpus(payload, new Date().toISOString(), `u${namespaceBase + userIndex}`, userIds[userIndex % userIds.length]);
      return {
        url: `${baseUrl}/api/wingman/projects/sync`,
        init: {
          method: "POST",
          headers: { ...headers, "content-type": "application/json" },
          body: corpus.body,
        },
        bytesSent: corpus.bytes,
      };
    }
    if (scenario === PER_PROJECT_PUT_SCENARIO) {
      // Per-project revisioned PUT (ADR-0001 Phase 1): ONE project per
      // request, a fresh namespace per job so every request's row id is
      // globally unique (wingman_projects.id is a shared single-column PK in
      // supabase-tables mode). In tables mode each PUT is the migration-015
      // single-row guarded commit - the write path whose per-save cost is a
      // row CAS + audit + register advance, not the whole-snapshot RPC.
      const project = buildPutProject(
        payload,
        new Date().toISOString(),
        `u${namespaceBase + userIndex}`,
        userIndex,
        userIds[userIndex % userIds.length],
      );
      const body = JSON.stringify({ ...project, baseRevision: 0 });
      return {
        url: `${baseUrl}/api/wingman/projects/${encodeURIComponent(project.id)}`,
        init: {
          method: "PUT",
          headers: { ...headers, "content-type": "application/json" },
          body,
        },
        bytesSent: Buffer.byteLength(body),
      };
    }
    if (scenario === "compare") {
      return {
        url: `${baseUrl}/api/wingman/competitor-lookup`,
        init: {
          method: "POST",
          headers: { ...headers, "content-type": "application/json" },
          body: JSON.stringify({ brand: "Crestron", sku: "DM-NVX-350", query: "Crestron DM-NVX-350" }),
        },
      };
    }
    if (scenario === "payload-413") {
      // Oversized-body probe: a body over the JSON cap must be rejected with a
      // payload-limit response, never 500. The competitor JSON routes return
      // 413 (pinned by competitor-lookup.413.test.mjs); the project-sync
      // handler maps the same parse failure to 400 "Invalid JSON body." — both
      // are the over-cap rejection this probe asserts.
      return {
        url: `${baseUrl}/api/wingman/projects/sync`,
        init: {
          method: "POST",
          headers: { ...headers, "content-type": "application/json" },
          body: JSON.stringify({ activeProjectId: null, projects: [{ name: "probe", notes: "x".repeat(2 * 1024 * 1024) }] }),
        },
      };
    }
    throw new Error(`Unknown scenario ${scenario}`);
  };

  // project-save / project-put: tally which session slot landed a successful
  // save and which namespaces it wrote. project-save REPLACES the workspace's
  // project set per sync (a corpus is the whole payload), so after a
  // project-save run each workspace that saved must hold exactly ONE corpus of
  // its own; project-put ACCUMULATES one row per successful PUT. Both feed the
  // post-run persistence verification (see verifySupabaseRunPersistence), which
  // picks the expected row shape by scenario. Warm-up saves commit rows too,
  // but they complete BEFORE any measured request fires - project-save warm-ups
  // are replaced by later syncs, and project-put skips warm-up entirely - so
  // only the measured phase is tallied.
  const saveTally = scenario === "project-save" || scenario === PER_PROJECT_PUT_SCENARIO
    ? {
        successesBySlot: new Array(cookies.length).fill(0),
        namespacesBySlot: Array.from({ length: cookies.length }, () => new Set()),
      }
    : null;
  const tallySave = (slotIndex, ok) => {
    if (!saveTally) return;
    if (!ok) return;
    const slot = slotIndex % cookies.length;
    saveTally.successesBySlot[slot] += 1;
    // The row ids embed namespaceBase + slotIndex, NOT the bare job index -
    // record the actual namespace so the verification compares like for like.
    saveTally.namespacesBySlot[slot].add(namespaceBase + slotIndex);
  };

  // Steady-state measurement: fire a few unmeasured requests first so
  // one-off cold starts (competitor catalog load, first DB read) do not skew
  // p95/p99 at small request counts.
  // project-put skips warm-up because it ACCUMULATES rows (each PUT creates a
  // new row): an unmeasured warm-up PUT would break the verification's exact
  // rows == successes accounting. project-save warm-ups are safe (each sync
  // replaces the workspace corpus) and payload-413 is a contract probe.
  const warmupCount = scenario === "payload-413" || scenario === PER_PROJECT_PUT_SCENARIO ? 0 : 4;
  for (let w = 0; w < warmupCount; w += 1) {
    const { url, init } = job(w);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(url, { ...init, signal: controller.signal });
      await response.text();
      clearTimeout(timeoutId);
    } catch {
      // Warm-up failures are ignored; the measured phase will surface them.
    }
  }

  const results = [];
  let completed = 0;
  let currentJob = 0;

  async function worker() {
    while (completed < requestCount) {
      const jobIndex = currentJob++;
      completed++;
      const { url, init, bytesSent } = job(jobIndex);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const start = performance.now();
      let outcome;
      try {
        const response = await fetch(url, { ...init, signal: controller.signal });
        // Drain the body so connection reuse / latency includes the payload.
        const text = await response.text();
        outcome = {
          ok: response.ok,
          status: response.status,
          elapsed: performance.now() - start,
          error: null,
          responseBytes: text.length,
          bytesSent,
        };
      } catch (error) {
        outcome = {
          ok: false,
          status: 0,
          elapsed: performance.now() - start,
          error: error.name === "AbortError" ? "timeout" : error.message,
          responseBytes: 0,
          bytesSent,
        };
      } finally {
        clearTimeout(timeoutId);
      }
      results.push(outcome);
      tallySave(jobIndex, outcome.ok);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, Math.max(requestCount, 1)) }, () => worker());
  const started = performance.now();
  await Promise.all(workers);
  const wallMs = performance.now() - started;

  // payload-413 is a contract probe: its "success" is a payload-limit
  // rejection (413 on the competitor JSON routes, 400 on project-sync), and it
  // is never part of the percentile/error aggregates for the summary.
  const isProbe = scenario === "payload-413";
  const probePassed = (r) => r.status === 413 || r.status === 400;
  const successSet = results.filter((r) => (isProbe ? probePassed(r) : r.ok));
  const failed = results.filter((r) => !(isProbe ? probePassed(r) : r.ok));
  const times = successSet.map((r) => r.elapsed).sort((a, b) => a - b);
  const bytesSent = results.reduce((sum, r) => sum + (r.bytesSent || 0), 0);
  const bytesReceived = results.reduce((sum, r) => sum + (r.responseBytes || 0), 0);

  const statusCounts = {};
  for (const r of results) {
    const key = r.error ? `error:${r.error}` : String(r.status);
    statusCounts[key] = (statusCounts[key] || 0) + 1;
  }

  return {
    scenario,
    isProbe,
    total: results.length,
    successful: successSet.length,
    failed: failed.length,
    successRate: isProbe ? 100 : ((successSet.length / results.length) * 100).toFixed(2),
    times: {
      min: times.length ? Math.min(...times) : 0,
      max: times.length ? Math.max(...times) : 0,
      avg: times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0,
      p50: calculatePercentile(times, 50),
      p95: calculatePercentile(times, 95),
      p99: calculatePercentile(times, 99),
    },
    wallMs,
    statusCounts,
    bytesSent,
    bytesReceived,
    meanPayloadBytes: results.length ? Math.round(bytesSent / results.length) : 0,
    // Feed for the post-run supabase-tables persistence verification: which
    // session slots successfully synced and which corpus namespaces each one
    // sent. null unless the scenario writes projects.
    saveSummary: saveTally
      ? {
          successesBySlot: saveTally.successesBySlot,
          namespacesBySlot: saveTally.namespacesBySlot.map((set) => Array.from(set).sort((a, b) => a - b)),
        }
      : null,
  };
}

function scenarioLabel(scenario, payload) {
  if (scenario === "project-save") return `project-save (payload=${payload})`;
  if (scenario === "project-put") return `project-put (payload=${payload})`;
  if (scenario === "health") return "health (public /api/health + /api/ready)";
  if (scenario === "project-list") return "project-list (auth GET /projects)";
  if (scenario === "compare") return "compare (auth /api/wingman/competitor-lookup)";
  if (scenario === "payload-413") return "payload-413 (2 MiB body probe)";
  return scenario;
}

function printReport(analysis, payload) {
  console.log(`\n${"=".repeat(72)}`);
  console.log(`Scenario: ${scenarioLabel(analysis.scenario, payload)}`);
  console.log("=".repeat(72));

  if (analysis.isProbe) {
    console.log(`\n  Probe requests: ${analysis.total} (expected over-cap rejection: HTTP 413 or 400)`);
    for (const [status, count] of Object.entries(analysis.statusCounts)) {
      console.log(`  ${status}: ${count}`);
    }
    console.log(`  Mean request body: ${formatBytes(analysis.meanPayloadBytes)}`);
    console.log(`  Mean response:     ${formatBytes(analysis.total ? Math.round(analysis.bytesReceived / analysis.total) : 0)}`);
    console.log(`  Rejection latency: min ${formatMs(analysis.times.min)}  max ${formatMs(analysis.times.max)}  avg ${formatMs(analysis.times.avg)}`);
    return;
  }

  console.log(`\nRequests:`);
  console.log(`  Total:      ${analysis.total}`);
  console.log(`  Successful: ${analysis.successful} (${analysis.successRate}%)`);
  console.log(`  Failed:     ${analysis.failed}`);

  console.log(`\nResponse Times:`);
  console.log(`  Min:    ${formatMs(analysis.times.min)}`);
  console.log(`  Max:    ${formatMs(analysis.times.max)}`);
  console.log(`  Avg:    ${formatMs(analysis.times.avg)}`);
  console.log(`  p50:    ${formatMs(analysis.times.p50)}`);
  console.log(`  p95:    ${formatMs(analysis.times.p95)}`);
  console.log(`  p99:    ${formatMs(analysis.times.p99)}`);

  console.log(`\nPayloads:`);
  console.log(`  Request body mean: ${formatBytes(analysis.meanPayloadBytes)} (${formatBytes(analysis.bytesSent)} total sent)`);
  console.log(`  Response mean:     ${formatBytes(analysis.total ? Math.round(analysis.bytesReceived / analysis.total) : 0)}`);

  console.log(`\nThroughput:`);
  console.log(`  ${analysis.total / (analysis.wallMs / 1000) > 0 ? (analysis.total / (analysis.wallMs / 1000)).toFixed(2) : "0.00"} req/s (wall ${formatMs(analysis.wallMs)})`);

  console.log(`\nStatus Breakdown:`);
  for (const [status, count] of Object.entries(analysis.statusCounts)) {
    console.log(`  ${status}: ${count}`);
  }
}

function printSummary(analyses, { level, users, payload, storageDetails, strict }) {
  console.log(`\n${"=".repeat(72)}`);
  console.log("SUMMARY");
  console.log("=".repeat(72));
  console.log(`Level: ${level}  |  virtual users: ${users}  |  project-save payload: ${payload}`);
  console.log(`Storage mode (server /api/wingman/health): configured=${storageDetails.storageModeConfigured} active=${storageDetails.storageModeActive}${storageDetails.storageConfigError ? ` (error: ${storageDetails.storageConfigError})` : ""}`);

  const headers = ["Scenario", "Success%", "p50", "p95", "p99", "req/s", "payload/req"];
  const rows = analyses
    .filter((a) => !a.isProbe)
    .map((a) => [
      scenarioLabel(a.scenario, payload).replace(/ \(.*\)$/, ""),
      `${a.successRate}%`,
      formatMs(a.times.p50),
      formatMs(a.times.p95),
      formatMs(a.times.p99),
      (a.total / (a.wallMs / 1000)).toFixed(2),
      formatBytes(a.meanPayloadBytes),
    ]);
  const colWidths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  console.log("\n" + headers.map((h, i) => h.padEnd(colWidths[i])).join(" | "));
  console.log(colWidths.map((w) => "-".repeat(w)).join("-+-"));
  for (const row of rows) {
    console.log(row.map((c, i) => c.padEnd(colWidths[i])).join(" | "));
  }

  const benchmarks = analyses.filter((a) => !a.isProbe);
  const allSuccessful = benchmarks.every((a) => parseFloat(a.successRate) === 100);
  const avgP95 = benchmarks.reduce((sum, a) => sum + a.times.p95, 0) / benchmarks.length;

  console.log("\nOverall Assessment:");
  if (!allSuccessful) {
    console.log("  [CRITICAL] Some requests failed - investigate immediately");
  } else if (avgP95 < 100) {
    console.log("  [EXCELLENT] All scenarios healthy with fast response times");
  } else if (avgP95 < 500) {
    console.log("  [GOOD] All scenarios healthy with acceptable response times");
  } else if (avgP95 < 1500) {
    console.log("  [WARNING] All scenarios healthy but response times are elevated");
  } else {
    console.log("  [WARNING] All scenarios healthy; response times are high - review budgets");
  }

  if (strict) {
    console.log("\nBudget check (--strict):");
    let violations = 0;
    for (const a of benchmarks) {
      const budget = STRICT_BUDGETS[a.scenario];
      if (!budget) continue;
      const failures = [];
      if (a.times.p95 > budget.p95) failures.push(`p95 ${formatMs(a.times.p95)} > ${formatMs(budget.p95)}`);
      if (a.times.p99 > budget.p99) failures.push(`p99 ${formatMs(a.times.p99)} > ${formatMs(budget.p99)}`);
      if (parseFloat(a.successRate) < 100 - budget.errorPct) failures.push(`error rate ${(100 - parseFloat(a.successRate)).toFixed(2)}% > ${budget.errorPct}%`);
      if (failures.length) {
        violations += 1;
        console.log(`  [FAIL] ${a.scenario}: ${failures.join("; ")}`);
      } else {
        console.log(`  [PASS] ${a.scenario}`);
      }
    }
    console.log(violations === 0 ? "  All recorded budgets met." : `  ${violations} scenario(s) exceeded recorded budgets.`);
  }
}

// ---------------------------------------------------------------------------
// Post-run persistence verification (supabase-tables)
// ---------------------------------------------------------------------------
// A supabase-tables project-save REPLACES the workspace's project set (the
// sync handler drops projects absent from the incoming body) and commits the
// whole snapshot atomically, so after a project-save run each workspace that
// saved must hold exactly ONE corpus from that run: corpusProjectCount rows
// whose ids are load-u<namespace>-project-<index> for a single namespace the
// session actually synced. The opt-in project-put scenario ACCUMULATES one row
// per successful PUT instead (checkPutRows). Both are verified straight
// against PostgREST - deliberately bypassing the app server, because the
// failure mode this catches (200s answered from a silent local-store fallback
// while zero rows reached Supabase) is invisible through any app-server read.
// Fail-closed already makes that fallback impossible on the harness's own
// server, but the verification is what makes a recorded baseline
// ATTRIBUTABLE: a run only exits 0 when its 200s provably left rows behind.
/**
 * project-put row shape: each successful PUT created exactly one row, so a
 * workspace that saved must hold exactly `expectedCount` rows - one per
 * successful request, each with a unique load-u<N>-project-<K> id from a
 * namespace this run actually PUT, owned by this session's user, carrying the
 * client-vocabulary payload in CHECK-safe row columns. Index K is the global
 * job index (each request PUTs a fresh project), so it is NOT bounded by the
 * corpus size the way a project-save sync corpus is.
 */
export function checkPutRows({ rows, ownerId, expectedCount, allowedNamespaces, workspaceIds, label = ownerId }) {
  const failures = [];
  if (!Array.isArray(rows)) {
    return [`owner ${label}: remote read-back did not return a row list`];
  }
  if (rows.length !== expectedCount) {
    failures.push(
      `owner ${label}: expected exactly ${expectedCount} persisted project row(s) (one per successful PUT), found ${rows.length}`,
    );
  }
  const seenIndices = new Set();
  for (const row of rows) {
    const id = String(row?.id ?? "");
    const match = LOAD_PROJECT_ID_PATTERN.exec(id);
    if (!match) {
      failures.push(`owner ${label}: row id ${JSON.stringify(id)} is not a load-test corpus id (load-u<N>-project-<K>)`);
      continue;
    }
    const namespace = Number(match[1]);
    const index = Number(match[2]);
    if (seenIndices.has(index)) {
      failures.push(`owner ${label}: two rows share project index ${index} - a PUT created a duplicate row`);
    }
    seenIndices.add(index);
    if (!allowedNamespaces.has(namespace)) {
      failures.push(`owner ${label}: row ${id} belongs to namespace u${namespace}, which this run never successfully PUT`);
    }
    if (row?.owner_id && row.owner_id !== ownerId) {
      failures.push(`owner ${label}: row ${id} is owned by ${row.owner_id}, not ${ownerId}`);
    }
    if (workspaceIds && workspaceIds.size > 0 && !workspaceIds.has(String(row?.workspace_id ?? ""))) {
      failures.push(
        `owner ${label}: row ${id} sits in workspace ${JSON.stringify(row?.workspace_id)}, outside this run's workspaces`,
      );
    }
    const payload = row?.payload && typeof row.payload === "object" ? row.payload : {};
    if (payload.stage !== "Proposal Builder") {
      failures.push(`owner ${label}: row ${id} payload.stage is ${JSON.stringify(payload.stage)}; client vocabulary not preserved`);
    }
    if (payload.status !== "recommended") {
      failures.push(`owner ${label}: row ${id} payload.status is ${JSON.stringify(payload.status)}; client vocabulary not preserved`);
    }
    if (payload.name !== corpusProjectName(index)) {
      failures.push(
        `owner ${label}: row ${id} payload.name is ${JSON.stringify(payload.name)}; expected ${JSON.stringify(corpusProjectName(index))}`,
      );
    }
    if (row?.stage !== canonicalStageForRow(payload.stage)) {
      failures.push(
        `owner ${label}: row ${id} stage column is ${JSON.stringify(row?.stage)} (expected ${JSON.stringify(canonicalStageForRow(payload.stage))})`,
      );
    }
    if (row?.status !== canonicalStatusForRow(payload.status)) {
      failures.push(
        `owner ${label}: row ${id} status column is ${JSON.stringify(row?.status)} (expected ${JSON.stringify(canonicalStatusForRow(payload.status))})`,
      );
    }
  }
  return failures;
}

export function checkOwnerRows({ rows, ownerId, corpusCount, allowedNamespaces, workspaceIds, label = ownerId }) {
  const failures = [];
  if (!Array.isArray(rows)) {
    return [`owner ${label}: remote read-back did not return a row list`];
  }
  if (rows.length !== corpusCount) {
    failures.push(
      `owner ${label}: expected exactly ${corpusCount} persisted project row(s) (one full corpus), found ${rows.length}`,
    );
  }
  const corpusNamespaces = new Set();
  for (const row of rows) {
    const id = String(row?.id ?? "");
    const match = LOAD_PROJECT_ID_PATTERN.exec(id);
    if (!match) {
      failures.push(`owner ${label}: row id ${JSON.stringify(id)} is not a load-test corpus id (load-u<N>-project-<K>)`);
      continue;
    }
    const namespace = Number(match[1]);
    const index = Number(match[2]);
    corpusNamespaces.add(namespace);
    if (index >= corpusCount) {
      failures.push(`owner ${label}: row ${id} has project index ${index}, outside the ${corpusCount}-project corpus`);
    }
    if (!allowedNamespaces.has(namespace)) {
      failures.push(`owner ${label}: row ${id} belongs to corpus u${namespace}, which this run never successfully synced`);
    }
    if (row?.owner_id && row.owner_id !== ownerId) {
      failures.push(`owner ${label}: row ${id} is owned by ${row.owner_id}, not ${ownerId}`);
    }
    if (workspaceIds && workspaceIds.size > 0 && !workspaceIds.has(String(row?.workspace_id ?? ""))) {
      failures.push(
        `owner ${label}: row ${id} sits in workspace ${JSON.stringify(row?.workspace_id)}, outside this run's workspaces`,
      );
    }
    const payload = row?.payload && typeof row.payload === "object" ? row.payload : {};
    if (payload.stage !== "Proposal Builder") {
      failures.push(`owner ${label}: row ${id} payload.stage is ${JSON.stringify(payload.stage)}; client vocabulary not preserved`);
    }
    if (payload.status !== "recommended") {
      failures.push(`owner ${label}: row ${id} payload.status is ${JSON.stringify(payload.status)}; client vocabulary not preserved`);
    }
    if (payload.name !== corpusProjectName(index)) {
      failures.push(
        `owner ${label}: row ${id} payload.name is ${JSON.stringify(payload.name)}; expected ${JSON.stringify(corpusProjectName(index))}`,
      );
    }
    if (row?.stage !== canonicalStageForRow(payload.stage)) {
      failures.push(
        `owner ${label}: row ${id} stage column is ${JSON.stringify(row?.stage)} (expected ${JSON.stringify(canonicalStageForRow(payload.stage))})`,
      );
    }
    if (row?.status !== canonicalStatusForRow(payload.status)) {
      failures.push(
        `owner ${label}: row ${id} status column is ${JSON.stringify(row?.status)} (expected ${JSON.stringify(canonicalStatusForRow(payload.status))})`,
      );
    }
  }
  if (corpusNamespaces.size > 1) {
    failures.push(
      `owner ${label}: rows span ${corpusNamespaces.size} corpora ` +
        `(${Array.from(corpusNamespaces).map((n) => `u${n}`).join(", ")}); a workspace's rows must be one atomically committed corpus`,
    );
  }
  return failures;
}

async function fetchSupabaseProjectRows({ supabaseUrl, serviceKey, ownerId }) {
  const baseUrl = String(supabaseUrl).replace(/\/+$/, "");
  // The owner_id=eq. filter is inlined in the URL literal (not hidden behind a
  // variable) so tools/check-postgrest-reads.mjs can see the read is bounded.
  const attempts = 3;
  let lastError = "";
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(
        `${baseUrl}/rest/v1/${SUPABASE_PROJECTS_TABLE}?select=id,workspace_id,owner_id,stage,status,payload&owner_id=eq.${encodeURIComponent(ownerId)}`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            accept: "application/json",
          },
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 240)}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    } finally {
      clearTimeout(timeoutId);
    }
  }
  throw new Error(`Supabase read-back failed after ${attempts} attempts: ${lastError}`);
}

/**
 * Verify every workspace that saved during this run now holds its corpus in
 * wingman_projects. Prints a per-owner verdict; returns
 * { ok, checked, failures? } where ok:false must fail the whole run.
 */
export async function verifySupabaseRunPersistence({ config, storageDetails, saveAnalysis, sessions }) {
  const saveSummary = saveAnalysis?.saveSummary;
  // The health/details report is informational: for a spawned run the harness's
  // own --storage-mode config IS the storage mode. If the health call hiccuped
  // at boot (a transient store read failure 503s it and the mode reads as
  // "unknown"), verification and cleanup must still run - otherwise a
  // supabase-tables green could silently skip both and leave rows behind.
  const activeTablesMode = config.spawnOwnServer
    ? config.storageMode === "supabase-tables" || storageDetails?.storageModeActive === "supabase-tables"
    : storageDetails?.storageModeActive === "supabase-tables";

  if (saveAnalysis && saveSummary && activeTablesMode && !config.spawnOwnServer) {
    console.log(
      "\nPersistence verification skipped: this run targeted an external server. Export SUPABASE_URL + a " +
        "service-role key matching that deployment to enable automatic row verification, or read the rows back manually.",
    );
    return { ok: true, checked: false };
  }
  if (!config.spawnOwnServer || !activeTablesMode || !saveAnalysis || !saveSummary) {
    // File-mode and non-supabase runs have no remote rows to verify.
    return { ok: true, checked: false };
  }
  if (saveAnalysis.failed > 0) {
    console.log(
      `\nPersistence verification skipped: some ${saveAnalysis.scenario} requests already failed, so the run is red regardless of what persisted.`,
    );
    return { ok: true, checked: false };
  }

  const { supabaseUrl, serviceKey } = readSupabaseCreds();
  if (!supabaseUrl || !serviceKey) {
    return {
      ok: false,
      checked: false,
      reason: "SUPABASE_URL and a service-role key must be in the harness env to verify persisted rows after the run",
    };
  }

  // Group session slots by owner: distinct signups are one slot each; a
  // --cookie run reuses ONE owner across all slots (and therefore one
  // workspace), so all its namespaces are legitimate for that owner.
  const groupsByOwner = new Map();
  for (let slot = 0; slot < config.users; slot += 1) {
    const session = sessions[slot % sessions.length];
    if (!groupsByOwner.has(session.userId)) {
      groupsByOwner.set(session.userId, {
        ownerId: session.userId,
        slots: [],
        namespaces: new Set(),
        successes: 0,
        workspaceIds: new Set(),
      });
    }
    const group = groupsByOwner.get(session.userId);
    group.slots.push(slot);
    group.workspaceIds.add(session.workspaceId);
    group.successes += saveSummary.successesBySlot[slot] ?? 0;
    for (const namespace of saveSummary.namespacesBySlot[slot] ?? []) group.namespaces.add(namespace);
  }
  const groups = Array.from(groupsByOwner.values()).filter((group) => group.successes > 0);

  // The tally must account for every successful save: if successful syncs
  // exist but none were attributed to a session slot (or the totals drift),
  // verification would silently skip - a harness bug, not a persistence
  // outcome, so it must fail the run rather than fake a green.
  const talliedTotal = groups.reduce((sum, group) => sum + group.successes, 0);
  if (talliedTotal !== saveAnalysis.successful) {
    console.log(
      `  [FAIL] Internal error: save tally accounted for ${talliedTotal} of ${saveAnalysis.successful} successful syncs.`,
    );
    return { ok: false, checked: true, failures: ["save tally drift"] };
  }

const putRowsMode = saveAnalysis.scenario === PER_PROJECT_PUT_SCENARIO;
  const corpusCount = corpusProjectCount(config.payload);
  console.log("\nPersistence verification (direct Supabase read-back of wingman_projects):");
  if (groups.length === 0) {
    console.log(`  No ${putRowsMode ? "PUT" : "project-save"} succeeded for any workspace; nothing to verify.`);
    return { ok: true, checked: true };
  }

  const failures = [];
  for (const group of groups) {
    const label = `${group.ownerId} (slots ${group.slots.join(",")})`;
    let rows;
    try {
      rows = await fetchSupabaseProjectRows({ supabaseUrl, serviceKey, ownerId: group.ownerId });
    } catch (error) {
      failures.push(`owner ${label}: ${error.message}`);
      continue;
    }
    const groupFailures = putRowsMode
      ? checkPutRows({
          rows,
          ownerId: group.ownerId,
          expectedCount: group.successes,
          allowedNamespaces: group.namespaces,
          workspaceIds: group.workspaceIds,
          label,
        })
      : checkOwnerRows({
          rows,
          ownerId: group.ownerId,
          corpusCount,
          allowedNamespaces: group.namespaces,
          workspaceIds: group.workspaceIds,
          label,
        });
    if (groupFailures.length > 0) {
      failures.push(...groupFailures);
      continue;
    }
    if (putRowsMode) {
      console.log(`  owner ${group.ownerId}: ${rows.length}/${group.successes} rows present (one per successful PUT) — PASS`);
    } else {
      const corpusNamespace = Number(LOAD_PROJECT_ID_PATTERN.exec(String(rows[0]?.id ?? ""))?.[1]);
      console.log(`  owner ${group.ownerId}: ${rows.length}/${corpusCount} rows present (corpus u${corpusNamespace}) — PASS`);
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) console.log(`  [FAIL] ${failure}`);
    console.log(
      `  Persistence verification FAILED: successful ${putRowsMode ? "PUTs" : "syncs"} did not leave the expected wingman_projects rows.`,
    );
    return { ok: false, checked: true, failures };
  }
  console.log(`  All ${groups.length} workspace row set(s) verified persisted.`);
  return { ok: true, checked: true };
}

// ---------------------------------------------------------------------------
// Incremental-hydration payload benchmark (opt-in: --scenarios hydrate-since)
// ---------------------------------------------------------------------------
// ADR-0001 §1.2k: the client's hydration sends an X-Wingman-Since manifest of
// the per-project revisions its local copies are based on, and the server
// returns only the rows that moved (or are new). This post-run benchmark runs
// AFTER project-save (rows exist) and measures, per workspace that saved:
//
//   full  GET without since      - what a since-less reload downloads
//   since GET, exact manifest    - a reload with nothing changed: 0 projects
//   stale GET, one revision zeroed - a reload where exactly one project moved
//
// Under supabase-tables the since GETs are also READ-ONLY (they skip the
// snapshot commit a full GET performs for its last-seen touch), so the latency
// column measures the true incremental-pull cost, not just the bytes.
// Failures fail the run: an unattributable benchmark is worse than none.
async function benchmarkIncrementalHydration({ baseUrl, cookies, saveSummary, timeoutMs, storageModeLabel }) {
  const successesBySlot = saveSummary?.successesBySlot ?? [];
  const measuredSlots = successesBySlot
    .map((count, slot) => ({ slot, count }))
    .filter((entry) => entry.count > 0);
  if (measuredSlots.length === 0) {
    console.log("\n[hydrate-since] No workspace saved a corpus this run (project-save had zero successes); skipping the incremental benchmark.");
    return;
  }

  const rows = [];
  for (const { slot } of measuredSlots) {
    const cookie = cookies[slot % cookies.length] || "";
    const headers = { accept: "application/json" };
    if (cookie) headers.cookie = cookie;

    async function timedGet(extraHeaders = {}) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const start = performance.now();
      try {
        const response = await fetch(`${baseUrl}/api/wingman/projects`, {
          method: "GET",
          headers: { ...headers, ...extraHeaders },
          signal: controller.signal,
        });
        const text = await response.text();
        if (!response.ok) {
          throw new Error(`[hydrate-since] slot ${slot} GET failed with HTTP ${response.status}: ${text.slice(0, 200)}`);
        }
        return { elapsed: performance.now() - start, bytes: text.length, projects: (() => {
          try {
            const parsed = JSON.parse(text);
            return Array.isArray(parsed.projects) ? parsed.projects : [];
          } catch {
            return [];
          }
        })() };
      } finally {
        clearTimeout(timeoutId);
      }
    }

    const full = await timedGet();
    if (full.projects.length === 0) {
      console.log(`[hydrate-since] slot ${slot}: workspace holds no projects after its saves; skipping.`);
      continue;
    }
    const sinceManifest = {};
    for (const project of full.projects) {
      const id = typeof project?.id === "string" ? project.id : null;
      if (!id) continue;
      const revision = Number(project?.syncRevision);
      sinceManifest[id] = Number.isFinite(revision) && revision > 0 ? revision : 0;
    }
    const current = await timedGet({ "X-Wingman-Since": JSON.stringify(sinceManifest) });
    if (current.projects.length !== 0) {
      throw new Error(
        `[hydrate-since] slot ${slot}: an exact since manifest should return 0 projects, got ${current.projects.length} ` +
          `(ids: ${current.projects.map((project) => project.id).join(",")}). The incremental pull skipped rows it must not skip.`,
      );
    }
    const staleManifest = { ...sinceManifest };
    const firstId = Object.keys(staleManifest)[0];
    if (firstId && staleManifest[firstId] > 0) staleManifest[firstId] = 0;
    const stale = firstId ? await timedGet({ "X-Wingman-Since": JSON.stringify(staleManifest) }) : current;
    if (firstId && stale.projects.length !== 1) {
      throw new Error(
        `[hydrate-since] slot ${slot}: a one-stale manifest should return exactly the stale project, got ${stale.projects.length}.`,
      );
    }

    const savedPercent = full.bytes > 0 ? Math.round((1 - current.bytes / full.bytes) * 1000) / 10 : 0;
    rows.push({
      slot,
      projects: full.projects.length,
      fullBytes: full.bytes,
      fullMs: full.elapsed,
      currentBytes: current.bytes,
      currentMs: current.elapsed,
      staleBytes: firstId ? stale.bytes : current.bytes,
      staleMs: firstId ? stale.elapsed : current.elapsed,
      savedPercent,
    });
  }

  if (rows.length === 0) {
    console.log("\n[hydrate-since] No measured workspace; skipping the report.");
    return;
  }

  const avg = (pick) => Math.round(rows.reduce((sum, row) => sum + pick(row), 0) / rows.length);
  const maxProjects = Math.max(...rows.map((row) => row.projects));
  console.log(`\n${"=".repeat(72)}`);
  console.log("Incremental hydration payload benchmark (hydrate-since)");
  console.log("=".repeat(72));
  console.log(`Storage: ${storageModeLabel}  |  workspaces measured: ${rows.length}  |  largest corpus: ${maxProjects} project(s)`);
  console.log(`\n  Full reload GET (no since):        ${formatBytes(avg((row) => row.fullBytes))}/req mean  ${formatMs(avg((row) => row.fullMs))} mean`);
  console.log(`  Since GET, nothing changed:       ${formatBytes(avg((row) => row.currentBytes))}/req mean  ${formatMs(avg((row) => row.currentMs))} mean`);
  console.log(`  Since GET, exactly one moved:     ${formatBytes(avg((row) => row.staleBytes))}/req mean  ${formatMs(avg((row) => row.staleMs))} mean`);
  console.log(`  Payload saved on a no-change reload: ${avg((row) => row.savedPercent)}%`);
  console.log(`  Requests: ${rows.length} full + ${rows.length} since-current + ${rows.length} since-one-stale (all HTTP 200).`);
}

// ---------------------------------------------------------------------------
// Post-run row cleanup (supabase-tables)
// ---------------------------------------------------------------------------
// A verified supabase-tables run deletes its OWN signups, workspaces and
// project rows afterwards so repeated runs never need manual DB cleanup (and
// never accumulate throwaway rows in a shared dev/staging project). Deletion
// is direct PostgREST with the service-role key - deliberately NOT through the
// app server, exactly like the verification read-back - and only rows
// belonging to this run's signed-up sessions (their user + workspace ids) are
// touched. Order matters (children before parents):
// wingman_workspaces.owner_user_id is ON DELETE RESTRICT, so workspaces must
// be deleted before their owner users, and every child (projects, sessions,
// audit events, members, invitations, telemetry) before the workspace row
// (see server/migrations/001_initial_schema.sql).

function readSupabaseCreds() {
  return {
    supabaseUrl: String(process.env.SUPABASE_URL || "").trim(),
    serviceKey: String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "").trim(),
  };
}

/**
 * The run-owned tables and how to address this run's rows in each, in
 * FK-safe deletion order. A session's signup creates one wingman_users row and
 * one wingman_workspaces row; everything else is a child of those ids.
 */
export function buildRunCleanupPlan(sessions) {
  const userIds = Array.from(new Set(sessions.map((s) => s.userId).filter(Boolean)));
  const workspaceIds = Array.from(new Set(sessions.map((s) => s.workspaceId).filter(Boolean)));
  return {
    userIds,
    workspaceIds,
    deletes: [
      { table: "wingman_audit_events", filters: [{ column: "workspace_id", values: workspaceIds }] },
      { table: "wingman_projects", filters: [{ column: "workspace_id", values: workspaceIds }] },
      { table: "wingman_sessions", filters: [{ column: "user_id", values: userIds }] },
      { table: "wingman_workspace_invitations", filters: [{ column: "workspace_id", values: workspaceIds }] },
      { table: "wingman_workspace_members", filters: [{ column: "workspace_id", values: workspaceIds }] },
      {
        table: "wingman_telemetry_events",
        filters: [
          { column: "workspace_id", values: workspaceIds },
          { column: "user_id", values: userIds },
        ],
      },
      { table: "wingman_workspaces", filters: [{ column: "id", values: workspaceIds }] },
      { table: "wingman_users", filters: [{ column: "id", values: userIds }] },
    ],
  };
}

/**
 * Chain a filter onto a supabase-js query: a single IN filter, or an OR of
 * several (telemetry rows are addressed by workspace_id OR user_id). Values
 * are server-generated ids (user_<uuid> / ws_<uuid>), bare tokens safe in
 * PostgREST filter syntax.
 */
function applySupabaseFilter(query, filters) {
  if (filters.length === 1) {
    return query.in(filters[0].column, filters[0].values);
  }
  const orExpression = filters.map(({ column, values }) => `${column}.in.(${values.join(",")})`).join(",");
  return query.or(orExpression);
}

// Retry only THROWN failures (network/timeout). An HTTP error surfaces as a
// supabase-js `{ error }` result on the first attempt and must not be retried
// pointlessly.
async function withRetry(fn, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  throw lastError;
}

/**
 * Execute one cleanup plan against PostgREST: delete every planned scope in
 * FK-safe order, then re-read each one and fail if anything remains. Shared
 * by the session-keyed post-run cleanup (deleteSupabaseRunRows) and the
 * marker-keyed --cleanup-only mode (deleteLoadTestArtifacts). Returns
 * { ok, deleted?, remaining?, failures?, reason? }.
 */
async function runCleanupPlan({ supabaseUrl, serviceKey, plan }) {
  const active = plan.deletes.filter((entry) => entry.filters.some((f) => f.values.length > 0));
  if (active.length === 0) return { ok: true, deleted: {}, remaining: {} };

  const client = createClient(String(supabaseUrl).replace(/\/+$/, ""), serviceKey);

  const deleted = {};
  const failures = [];
  for (const entry of active) {
    try {
      const result = await withRetry(() =>
        applySupabaseFilter(client.from(entry.table).delete({ count: "exact" }), entry.filters),
      );
      if (result.error) throw new Error(result.error.message);
      deleted[entry.table] = result.count ?? 0;
    } catch (error) {
      failures.push(`${entry.table}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failures.length > 0) {
    return { ok: false, deleted, failures, reason: `delete failed: ${failures.join("; ")}` };
  }

  // Self-verify: nothing may remain in any run-owned table, otherwise the
  // cleanup silently failed and the next run would accumulate rows again.
  const remaining = {};
  const remainFailures = [];
  for (const entry of active) {
    try {
      const result = await withRetry(() =>
        applySupabaseFilter(client.from(entry.table).select("id", { count: "exact", head: true }), entry.filters),
      );
      if (result.error) throw new Error(result.error.message);
      if ((result.count ?? 0) > 0) remainFailures.push(`${entry.table}: ${result.count} row(s) still present`);
      remaining[entry.table] = result.count ?? 0;
    } catch (error) {
      remainFailures.push(`${entry.table} re-check: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (remainFailures.length > 0) {
    return {
      ok: false,
      deleted,
      remaining,
      failures: remainFailures,
      reason: `verification after delete failed: ${remainFailures.join("; ")}`,
    };
  }
  return { ok: true, deleted, remaining };
}

/**
 * Delete every row this run created (signups, workspaces, project rows), then
 * re-read each run-owned table and fail if anything remains. Returns
 * { ok, deleted?, remaining?, failures?, reason? }.
 */
export async function deleteSupabaseRunRows({ supabaseUrl, serviceKey, sessions }) {
  const plan = buildRunCleanupPlan(sessions);
  const active = plan.deletes.filter((entry) => entry.filters.some((f) => f.values.length > 0));
  if (active.length === 0) return { ok: true, deleted: {}, remaining: {} };
  return runCleanupPlan({ supabaseUrl, serviceKey, plan });
}

// ---------------------------------------------------------------------------
// Marker-keyed cleanup (--cleanup-only)
// ---------------------------------------------------------------------------
// A verified supabase-tables run self-cleans, but FAILED runs and
// --keep-db-data runs leave their signups, workspaces and project rows behind
// (by design - failed runs keep them for diagnosis, and the docs told users to
// delete them with manual FK-safe SQL). Those leftovers are discoverable
// WITHOUT the run's session ids, because every harness artifact carries a
// stable marker: signup emails are always loadtest-<index>-<suffix>@example.com
// (company "Load Test Co", which becomes the workspace name), and corpus
// project ids always match load-u<namespace>-project-<slot>.
//
// --cleanup-only finds those markers and deletes them in the same FK-safe
// order as the session-keyed cleanup, self-verifying zero remain - so
// accumulation after a red run never needs manual SQL. Two scopes beyond a
// plain session cleanup are handled:
//
//   * workspaces are also matched by NAME ("Load Test Co"), so an orphaned
//     workspace whose owner user was already removed is still found;
//   * project rows are matched by their load-u<N>-project-<K> id pattern
//     ACROSS ALL workspaces, so --cookie runs that wrote a corpus into a real
//     (non-loadtest) workspace are cleaned without touching the workspace
//     itself, its owner, or its other rows. Only the pattern-matched project
//     rows and the audit/telemetry rows that reference them are deleted.

// Every harness signup uses this email shape; company "Load Test Co" becomes
// the workspace name (server: workspaceName = company || `${name}'s Workspace`).
const MARKER_USER_EMAIL_ILIKE = "loadtest-%@example.com";
const MARKER_WORKSPACE_NAME = "Load Test Co";
// Corpus project ids (tools/load-test.mjs corpusProjectId): load-u<N>-project-<K>.
const MARKER_PROJECT_ID_PATTERN = LOAD_PROJECT_ID_PATTERN;

/**
 * The marker-scoped tables and how to address them, in FK-safe deletion
 * order. ids are discovered artifacts (signup users, their workspaces, and
 * every load-project id found anywhere); audit/telemetry rows are addressed
 * by workspace OR user OR the orphaned project ids so rows referencing a
 * load-project inside a NON-loadtest workspace (a --cookie run) are removed
 * without touching that workspace or its owner.
 */
export function buildMarkerCleanupPlan({ userIds = [], workspaceIds = [], projectIds = [] } = {}) {
  const users = Array.from(new Set(userIds.filter(Boolean)));
  const workspaces = Array.from(new Set(workspaceIds.filter(Boolean)));
  const projects = Array.from(new Set(projectIds.filter(Boolean)));
  return {
    userIds: users,
    workspaceIds: workspaces,
    projectIds: projects,
    deletes: [
      {
        table: "wingman_audit_events",
        filters: [
          { column: "workspace_id", values: workspaces },
          { column: "project_id", values: projects },
        ],
      },
      {
        table: "wingman_projects",
        filters: [
          { column: "workspace_id", values: workspaces },
          { column: "id", values: projects },
        ],
      },
      { table: "wingman_sessions", filters: [{ column: "user_id", values: users }] },
      { table: "wingman_workspace_invitations", filters: [{ column: "workspace_id", values: workspaces }] },
      { table: "wingman_workspace_members", filters: [{ column: "workspace_id", values: workspaces }] },
      {
        table: "wingman_telemetry_events",
        filters: [
          { column: "workspace_id", values: workspaces },
          { column: "user_id", values: users },
          { column: "project_id", values: projects },
        ],
      },
      { table: "wingman_workspaces", filters: [{ column: "id", values: workspaces }] },
      { table: "wingman_users", filters: [{ column: "id", values: users }] },
    ],
  };
}

/**
 * Discover every load-test artifact currently in the project: marker signup
 * users, their workspaces (plus any name-matched orphaned workspace), and
 * every load-project row (in marker workspaces or anywhere else). Pure reads
 * with the service-role key; never deletes. Returns
 * { userIds, workspaceIds, projectIds, counts }.
 */
export async function discoverLoadTestArtifacts({ supabaseUrl, serviceKey }) {
  const client = createClient(String(supabaseUrl).replace(/\/+$/, ""), serviceKey);

  const readAll = async (query) => {
    const result = await withRetry(async () => query);
    if (result.error) throw new Error(result.error.message);
    return result.data ?? [];
  };

  // 1. Marker signup users (loadtest-<index>-<suffix>@example.com).
  const users = await readAll(
    client.from("wingman_users").select("id,email,name").ilike("email", MARKER_USER_EMAIL_ILIKE),
  );
  const userIds = Array.from(new Set(users.map((user) => user?.id).filter(Boolean)));

  // 2. Workspaces: named "Load Test Co" (covers orphaned workspaces whose
  // owner user was already removed) OR owned by a marker user.
  const namedWorkspaces = await readAll(
    client.from("wingman_workspaces").select("id,name,owner_user_id").eq("name", MARKER_WORKSPACE_NAME),
  );
  const workspaceIds = new Set(namedWorkspaces.map((workspace) => workspace?.id).filter(Boolean));
  if (userIds.length > 0) {
    const ownedWorkspaces = await readAll(
      client.from("wingman_workspaces").select("id,name,owner_user_id").in("owner_user_id", userIds),
    );
    for (const workspace of ownedWorkspaces) {
      if (workspace?.id) workspaceIds.add(workspace.id);
    }
  }

  // 3. Load-project rows by id pattern, anywhere (a --cookie run writes its
  // corpus into a real workspace). Also pull every project inside a marker
  // workspace so a non-pattern row there is still cleaned.
  const patternProjects = await readAll(
    client.from("wingman_projects").select("id,workspace_id").ilike("id", "load-%"),
  );
  const projectIds = new Set(
    patternProjects
      .map((project) => project?.id)
      .filter((id) => MARKER_PROJECT_ID_PATTERN.test(String(id))),
  );
  const markerWorkspaceList = Array.from(workspaceIds);
  if (markerWorkspaceList.length > 0) {
    const workspaceProjects = await readAll(
      client.from("wingman_projects").select("id,workspace_id").in("workspace_id", markerWorkspaceList),
    );
    for (const project of workspaceProjects) {
      if (project?.id) projectIds.add(project.id);
    }
  }

  return {
    userIds,
    workspaceIds: Array.from(workspaceIds),
    projectIds: Array.from(projectIds),
    counts: {
      users: users.length,
      workspaces: workspaceIds.size,
      projects: projectIds.size,
    },
  };
}

function cleanupSummary(plan) {
  const byTable = {};
  for (const entry of plan.deletes) {
    const value = entry.filters.flatMap((f) => f.values);
    if (value.length > 0) byTable[entry.table] = value.length;
  }
  return byTable;
}

/**
 * The --cleanup-only entry point: discover leftover load-test artifacts, print
 * them, and (unless dryRun) delete them FK-safely + self-verify zero remain.
 * Returns { ok, dryRun?, discovered, deleted?, remaining?, reason? }.
 */
export async function deleteLoadTestArtifacts({ supabaseUrl, serviceKey, dryRun = false }) {
  const discovered = await discoverLoadTestArtifacts({ supabaseUrl, serviceKey });
  const plan = buildMarkerCleanupPlan(discovered);

  console.log("\nCleanup discovery (direct Supabase read-back, marker-keyed):");
  console.log(`  ${discovered.counts.users} loadtest user(s)`);
  console.log(`  ${discovered.counts.workspaces} "Load Test Co" workspace(s)`);
  console.log(`  ${discovered.counts.projects} load-u<N>-project-<K> project row(s)`);
  const scope = cleanupSummary(plan);
  console.log(
    `  Scoped deletes: ${Object.entries(scope).map(([table, count]) => `${table} (${count} id(s))`).join(", ") || "none"}`,
  );

  if (dryRun) {
    console.log("  [dry-run] Nothing was deleted.");
    return { ok: true, dryRun: true, discovered, plan };
  }
  if (discovered.counts.users + discovered.counts.workspaces + discovered.counts.projects === 0) {
    console.log("  No leftover load-test artifacts; nothing to delete.");
    return { ok: true, discovered, deleted: {}, remaining: {} };
  }

  const result = await runCleanupPlan({ supabaseUrl, serviceKey, plan });
  if (!result.ok) return { ...result, discovered };

  const deletedTotal = Object.values(result.deleted).reduce((sum, count) => sum + count, 0);
  console.log(
    `\n  Deleted ${deletedTotal} load-test artifact row(s); 0 remaining across run-owned tables (self-verified).`,
  );
  return { ok: true, discovered, deleted: result.deleted, remaining: result.remaining };
}

/** CLI mode: --cleanup-only (with optional --dry-run). No server, no signups. */
async function runCleanupOnlyMode(dryRun) {
  const { supabaseUrl, serviceKey } = readSupabaseCreds();
  console.log("\nWingman Load Test — marker-keyed cleanup of leftover load-test artifacts");
  console.log("=".repeat(72));
  console.log(`Target: ${supabaseUrl}  |  dry-run: ${dryRun ? "yes (nothing will be deleted)" : "no"}`);
  try {
    const result = await deleteLoadTestArtifacts({ supabaseUrl, serviceKey, dryRun });
    if (!result.ok) {
      console.error(`\n[load-test] Cleanup failed: ${result.reason || "leftover rows could not be deleted."}`);
      process.exitCode = 1;
      return;
    }
    console.log("\n[load-test] Cleanup passed.");
    process.exitCode = 0;
  } catch (error) {
    console.error(`\n[load-test] Cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

async function main() {
  const config = parseCliArgs();

  // Cleanup-only mode never touches the API server: no spawn, no signups, no
  // scenarios. It discovers leftover load-test artifacts straight from
  // Supabase (marker-keyed) and deletes them FK-safely.
  if (config.cleanupOnly) {
    await runCleanupOnlyMode(config.dryRun);
    return;
  }

  const dataDir = config.spawnOwnServer
    ? fs.mkdtempSync(path.join(os.tmpdir(), "wingman-load-test-"))
    : null;
  const logFd = dataDir ? fs.openSync(path.join(dataDir, "server.log"), "a") : null;
  let child = null;

  console.log(`\nWingman Load Test`);
  console.log("=".repeat(72));
  console.log(`Level:        ${config.level} (concurrency ${config.concurrency}, ${config.totalRequests} requests/scenario)`);
  console.log(`Virtual users:${config.users}`);
  console.log(`Timeout:      ${config.timeout}ms`);
  console.log(`Scenarios:    ${config.scenarios.join(", ")}`);
  console.log(`Project-save payload: ${config.payload}`);
  if (config.spawnOwnServer) console.log(`Storage mode: ${config.storageMode}`);

  try {
    let baseUrl = config.baseUrl;
    if (config.spawnOwnServer) {
      const port = Number(process.env.LOAD_TEST_API_PORT || DEFAULT_PORT);
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`\nBooting server on :${port} (data dir ${dataDir}).`);
      child = spawn(process.execPath, ["server/competitor-lookup-server.mjs"], {
        cwd: projectRoot,
        env: {
          ...process.env,
          PORT: String(port),
          WINGMAN_UI_PORT: "3996",
          WINGMAN_DATA_DIR: dataDir,
          WINGMAN_STORAGE_MODE: config.storageMode,
          // Remote-storage runs must FAIL LOUDLY, not silently fall back to the
          // throwaway local file store: wingman-app-store falls back to file
          // mode when a supabase read/write fails unless WINGMAN_STORAGE_FAIL_-
          // CLOSED=true (the .env default is false). A load run measuring the
          // Supabase commit path needs every 200 to mean "committed remotely",
          // so fail-closed is forced on for supabase* storage modes.
          WINGMAN_STORAGE_FAIL_CLOSED: config.storageMode === "file" ? "false" : "true",
          // More than one workspace session per run trips the default 8/min
          // signup rate limit; raise it for the harness's own server only.
          WINGMAN_AUTH_RATE_LIMIT_MAX_REQUESTS: String(Math.max(64, config.users * 2)),
        },
        stdio: ["ignore", logFd, logFd],
        windowsHide: true,
      });
      await waitForHealth(baseUrl, `load-test server on :${port}`);
      console.log(`Server healthy at ${baseUrl}.`);
    } else {
      console.log(`\nUsing external server at ${baseUrl} (no spawn).`);
      await waitForHealth(baseUrl, "external server", 10_000);
    }

    const storageDetails = await fetchServerDetails(baseUrl);

    // Establish sessions. One workspace per virtual user keeps the write paths
    // independent, exactly like N reps; --cookie reuses a shared session
    // instead (useful against staging where signups are rate-limited).
    let cookies = [];
    if (config.cookie) {
      cookies = Array.from({ length: config.users }, () => config.cookie);
    } else {
      for (let i = 0; i < config.users; i += 1) {
        cookies.push(await signupUser(baseUrl, i));
      }
      console.log(`Authenticated ${config.users} workspace session(s) via /api/wingman/auth/signup.`);
    }
    const sessions = [];
    for (const cookie of cookies) {
      sessions.push(await resolveSession(baseUrl, cookie));
    }
    const userIds = sessions.map((session) => session.userId);

    const analyses = [];
    for (const scenario of config.scenarios) {
      // hydrate-since is a POST-RUN benchmark (it needs project-save rows to
      // exist), not an endpoint scenario: it runs after the scenario loop and
      // the persistence verification, never here.
      if (scenario === INCREMENTAL_HYDRATION_SCENARIO) continue;
      if (scenario === "payload-413" && !config.spawnOwnServer) {
        console.log(`\nSkipping payload-413: only valid against the harness's own server (default 1 MiB body cap).`);
        continue;
      }
      console.log(`\nTesting: ${scenarioLabel(scenario, config.payload)}`);
      const analysis = await runScenario({
        baseUrl,
        scenario,
        concurrency: config.concurrency,
        totalRequests: config.totalRequests,
        timeout: config.timeout,
        cookies,
        userIds,
        payload: config.payload,
      });
      analyses.push(analysis);
      printReport(analysis, config.payload);
    }

    printSummary(analyses, {
      level: config.level,
      users: config.users,
      payload: config.payload,
      storageDetails,
      strict: config.strict,
    });

    const hasFailures = analyses.some((a) => !a.isProbe && a.failed > 0)
      || analyses.some((a) => a.isProbe && (a.failed > 0 || a.successful === 0));
    if (hasFailures) {
      console.error(`\n[load-test] Some requests failed. ${dataDir ? `Server logs kept at ${path.join(dataDir, "server.log")}.` : ""}`);
      process.exitCode = 1;
      return;
    }

    if (config.strict) {
      const violations = analyses
        .filter((a) => !a.isProbe && STRICT_BUDGETS[a.scenario])
        .filter((a) => {
          const budget = STRICT_BUDGETS[a.scenario];
          return a.times.p95 > budget.p95 || a.times.p99 > budget.p99 || parseFloat(a.successRate) < 100 - budget.errorPct;
        });
      if (violations.length > 0) {
        console.error(`\n[load-test] --strict: ${violations.length} scenario(s) exceeded recorded budgets.`);
        process.exitCode = 2;
        return;
      }
    }

    // A supabase-tables run is only attributable when its 200s provably left
    // rows behind - verify that directly against Supabase before passing. The
    // project-writing scenario drives the expected row shape: project-save
    // leaves one full corpus per workspace, project-put one row per successful
    // PUT (prefer project-save when both ran).
    const saveAnalysis =
      analyses.find((analysis) => analysis.scenario === "project-save")
      ?? analyses.find((analysis) => analysis.scenario === PER_PROJECT_PUT_SCENARIO)
      ?? null;
    const persistence = await verifySupabaseRunPersistence({
      config,
      storageDetails,
      saveAnalysis,
      sessions,
    });
    if (!persistence.ok) {
      console.error(
        `\n[load-test] Persistence verification failed: ${persistence.reason || "successful syncs did not leave the expected wingman_projects rows."}`,
      );
      if (dataDir) {
        console.error(`[load-test] Server logs kept at ${path.join(dataDir, "server.log")}.`);
        console.error("[load-test] The run's Supabase rows were left in place for inspection (clean them up before the next run).");
      }
      process.exitCode = 1;
      return;
    }

    // Opt-in post-run benchmark: measure the incremental-hydration payload
    // saving now that project-save rows provably exist. Runs BEFORE cleanup so
    // the rows are still there; failures fail the run.
    if (config.scenarios.includes(INCREMENTAL_HYDRATION_SCENARIO)) {
      const saveSummary = analyses.find((analysis) => analysis.scenario === "project-save")?.saveSummary ?? null;
      await benchmarkIncrementalHydration({
        baseUrl,
        cookies,
        saveSummary,
        timeoutMs: config.timeout,
        storageModeLabel: config.spawnOwnServer ? config.storageMode : String(storageDetails?.storageModeActive || storageDetails?.storageModeConfigured || "external"),
      });
    }

    // A VERIFIED supabase-tables run on the harness's own server deletes the
    // signups, workspaces and project rows it created, so repeated runs never
    // need manual DB cleanup. Skipped with --cookie (that user/workspace is
    // not ours to delete), with --keep-db-data, and for external servers. The
    // spawn config decides the mode (not the health report, which can hiccup
    // at boot and read as "unknown" - see verifySupabaseRunPersistence).
    const isSpawnedTablesRun = config.spawnOwnServer && config.storageMode === "supabase-tables";
    if (isSpawnedTablesRun && !config.cookie) {
      const { supabaseUrl, serviceKey } = readSupabaseCreds();
      if (config.keepDbData || !supabaseUrl || !serviceKey) {
        console.log(
          `\n[load-test] ${config.keepDbData ? "--keep-db-data" : "No Supabase credentials"}: leaving this run's Supabase rows in place.`,
        );
      } else {
        const cleanup = await deleteSupabaseRunRows({ supabaseUrl, serviceKey, sessions });
        if (!cleanup.ok) {
          console.error(`\n[load-test] Supabase cleanup failed: ${cleanup.reason}`);
          console.error("[load-test] The run's signups/workspaces/project rows were left in place; clean them manually before the next run.");
          if (dataDir) console.error(`[load-test] Server logs kept at ${path.join(dataDir, "server.log")}.`);
          process.exitCode = 1;
          return;
        }
        const deletedTotal = Object.values(cleanup.deleted).reduce((sum, n) => sum + n, 0);
        console.log(`\n[load-test] Cleaned up this run's Supabase rows (${deletedTotal} deleted; 0 remaining across run-owned tables).`);
      }
    }

    console.log(`\n[load-test] Passed.${config.keepData && dataDir ? ` Data dir kept at ${dataDir}.` : ""}`);
    process.exitCode = 0;
  } catch (error) {
    console.error(`\n[load-test] Failed: ${error instanceof Error ? error.message : String(error)}`);
    if (dataDir) {
      console.error(`[load-test] Server logs kept at ${path.join(dataDir, "server.log")}.`);
    }
    process.exitCode = 1;
  } finally {
    if (logFd) fs.closeSync(logFd);
    if (child) {
      child.kill("SIGTERM");
      child = null;
    }
    if (config.spawnOwnServer) {
      const port = Number(process.env.LOAD_TEST_API_PORT || DEFAULT_PORT);
      stopWindowsPortListener(port);
      if (process.exitCode === 0 && !config.keepData && dataDir) {
        fs.rmSync(dataDir, { recursive: true, force: true });
      }
      // Failures always keep the data dir + server log for diagnosis.
    }
  }
}

// Run the harness only when invoked directly (node tools/load-test.mjs).
// Importing the module (unit tests, other tools) must not boot it.
const isEntryModule = Boolean(process.argv[1]) && path.resolve(String(process.argv[1])) === __filename;
if (isEntryModule) {
  main();
}
