#!/usr/bin/env node
// Dependency alert-finding collector: the nightly companion to the merge gates.
//
// Why this exists next to tools/check-dependency-audit.mjs and
// tools/check-prod-unpatched.mjs: those gates run on PRs and pushes, driven by
// the lockfiles. A newly PUBLISHED advisory (like the 2026-07-24 react-router
// one, or the moderate sprintf-js one that only became visible post-merge)
// arrives without any commit touching a lockfile, and the merge-gate
// severities (high/critical) or fix-available heuristics can leave findings
// invisible in the meantime. This tool re-reads the advisory databases
// directly on a nightly schedule and reports every actionable finding:
//
//   - full npm audit (root and server)   -> high/critical anywhere
//   - production npm audit (--omit=dev)  -> moderate/low with NO fix available
//                                           become errors (the sprintf-js class);
//                                           moderate/low with a fix are shown
//                                           as warnings so the table is complete
//   - OSV build-time closure (root/server)-> open advisories at the installed
//                                           versions (the exact surface
//                                           tools/check-build-deps.mjs defends)
//
// Reviewed, unexpired exceptions (tools/dependency-audit-exceptions.json for
// the npm surfaces, tools/build-dep-exceptions.json for the build surface) are
// respected: an advisory whose assessment still stands is summarized as
// suppressed, not raised, so the nightly alert cannot outrun the process and
// be trained away. An EXPIRED exception stays actionable.
//
// It is an ALERT, not a merge gate: the nightly job (see
// .github/workflows/audit-findings-alert.yml) goes red when findings exist so
// the advisory is seen the morning after it is published, but a red night run
// never blocks a merge. The response is upgrade or remove; an exception
// remains the last resort with a justification and an expiry, unchanged.
//
// Exit status: 0 = no actionable findings; 1 = findings exist; 2 = a survey
// crashed (a blind green is a defect, not a pass).
//
// Usage: node tools/audit-alert-findings.mjs [--summary] [--annotations]
//
// The gate modules are imported STATICALLY on purpose: their audit runs guard
// on direct-execution, so importing them never triggers a live survey - and
// dynamic import() breaks this file under the vitest/Vite SSR transform (the
// helper injection lands before the shebang and becomes unparseable).

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { evaluateExceptionExpiry } from "./check-dependency-audit.mjs";
import { evaluateSurvey, resolveAuditClosure, surveyPackages } from "./check-build-deps.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SURFACES = [
  { tag: "root/audit", cwd: projectRoot, args: "" },
  { tag: "root/prod", cwd: projectRoot, args: "--omit=dev" },
  { tag: "server/audit", cwd: path.join(projectRoot, "server"), args: "" },
  { tag: "server/prod", cwd: path.join(projectRoot, "server"), args: "--omit=dev" },
];

const EXCEPTION_FILES = {
  npm: path.join(projectRoot, "tools", "dependency-audit-exceptions.json"),
  build: path.join(projectRoot, "tools", "build-dep-exceptions.json"),
};

const ERROR_SEVERITIES = new Set(["high", "critical"]);
const SEVERITY_RANK = { critical: 4, high: 3, moderate: 2, low: 1, info: 0 };

// ---------------------------------------------------------------------------
// Pure decision logic (exported for the fixture tests)
// ---------------------------------------------------------------------------

// One npm advisory -> one row. `report` is the parsed JSON of one
// `npm audit --json` run; `surface` is a display label like "root/audit".
// Pure-string `via` entries are inherited paths whose advisory payload is
// reported once on the package that owns the advisory object, so they are
// skipped here to avoid id-less rows.
export function collectNpmAuditFindings(report, surface) {
  if (!report || report.error || !report.vulnerabilities || typeof report.vulnerabilities !== "object" || Array.isArray(report.vulnerabilities)) {
    throw new Error(`Incomplete npm assessment for ${surface}`);
  }
  const rows = [];
  for (const [name, vulnerability] of Object.entries(report?.vulnerabilities ?? {})) {
    const severity = vulnerability.severity ?? "unknown";
    const fixAvailable = vulnerability.fixAvailable;
    for (const via of vulnerability.via ?? []) {
      if (typeof via === "string") continue;
      const id = String(via.url ?? "").split("/").pop() || "(no advisory id resolved)";
      // Actionable-finding classification, mirroring the merge gates' own
      // judgement: high/critical anywhere, and any severity with no upgrade
      // path (the sprintf-js class of finding).
      const actionable =
        ERROR_SEVERITIES.has(severity) || (surface.endsWith("/prod") && fixAvailable === false);
      rows.push({
        id,
        package: name,
        severity,
        title: via.title ?? "",
        range: vulnerability.range ?? "",
        fixAvailable: fixAvailable === true
          ? true
          : fixAvailable && typeof fixAvailable === "object"
            ? `${fixAvailable.name}@${fixAvailable.version}${fixAvailable.isSemVerMajor ? " (major)" : ""}`
            : fixAvailable ?? "",
        surface,
        isDirect: Boolean(vulnerability.isDirect),
        copyCount: vulnerability.nodes?.length ?? 1,
        class: actionable ? "error" : "warning",
        url: via.url ?? "",
      });
    }
  }
  return rows;
}

// Build-surface OSV affected items -> rows in the same shape.
export function normalizeBuildFindings(affectedList, surface) {
  return affectedList.map((item) => ({
    id: item.id,
    package: item.name,
    severity: item.severity || "unknown",
    title: item.summary,
    range: `installed ${item.version}`,
    fixAvailable: "",
    surface,
    isDirect: undefined,
    copyCount: 1,
    class: "error",
    url: item.url,
  }));
}

// Merge the per-surface rows into one row per unique advisory id, with the
// surface list joined and the strongest known severity kept.
export function mergeAdvisoryRows(rows) {
  const merged = new Map();
  for (const row of rows) {
    const known = merged.get(row.id);
    if (!known) {
      merged.set(row.id, { ...row, surfaces: [row.surface] });
      continue;
    }
    if (row.severity && SEVERITY_RANK[row.severity] > SEVERITY_RANK[known.severity]) {
      known.severity = row.severity;
    }
    if (row.fixAvailable === true) known.fixAvailable = true;
    if (row.copyCount > (known.copyCount ?? 1)) known.copyCount = row.copyCount;
    known.range = known.range || row.range;
    known.title = known.title || row.title;
    known.url = known.url || row.url;
    if (!known.surfaces.includes(row.surface)) known.surfaces.push(row.surface);
    if (row.class === "error") known.class = "error";
  }
  return [...merged.values()].sort((left, right) => {
    const rankDelta = (SEVERITY_RANK[right.severity] ?? 0) - (SEVERITY_RANK[left.severity] ?? 0);
    if (rankDelta !== 0) return rankDelta;
    return left.package.localeCompare(right.package);
  });
}

// Split merged rows by exception state: findings covered by a reviewed,
// unexpired exception are suppressed (listed but not raised) so the nightly
// alert matches what the merge gate accepts; all others stay actionable.
export function partitionByExceptions(mergedRows, openExceptionIds) {
  const actionable = [];
  const suppressed = [];
  for (const row of mergedRows) {
    (openExceptionIds.has(row.id) ? suppressed : actionable).push(row);
  }
  return { actionable, suppressed };
}

// The GitHub run-summary table, one line per finding, linked to its page.
export function buildSummaryTable(rows) {
  const header = "| Package | Advisory | Severity | Surfaces | Fix available |";
  const separator = "| --- | --- | --- | --- | --- |";
  if (rows.length === 0) return [header, separator];
  const body = rows.map((row) => {
    const advisory = row.url ? `[${row.id}](${row.url})` : row.id;
    const fix = row.fixAvailable === true
      ? "yes"
      : row.fixAvailable === false
        ? "**none**"
        : row.fixAvailable || "-";
    return `| ${row.package} | ${advisory} | ${row.severity}${row.isDirect === false ? " (transitive)" : ""} | ${row.surfaces.join(", ")} | ${fix} |`;
  });
  return [header, separator, ...body];
}

// Per-finding GitHub annotations (::error / ::warning) for the Actions run.
export function buildAnnotations(rows) {
  return rows.map((row) => {
    const annotation = row.class === "error" ? "::error" : "::warning";
    return `${annotation}::New dependency advisory ${String(row.id).replace(/[^A-Za-z0-9._-]/g, "-")}: ${row.package} ${row.severity} (${row.surfaces.join(", ")}) - ${row.title}`;
  });
}

// ---------------------------------------------------------------------------
// Live surveys
// ---------------------------------------------------------------------------

function runNpmAudit(surface) {
  const command = `npm audit --json ${surface.args}`.trim();
  try {
    const stdout = execSync(command, {
      cwd: surface.cwd,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return JSON.parse(stdout);
  } catch (error) {
    // npm audit exits non-zero whenever findings exist; the report still
    // arrives on stdout. Same static-literal command rationale as the other
    // gates (fixed literal, no interpolated input, no injection surface).
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch {
        throw new Error(`Could not parse npm audit output for ${surface.tag}.`);
      }
    }
    throw new Error(`npm audit failed for ${surface.tag}: ${error?.message ?? error}`);
  }
}

function loadOpenExceptionIds(today) {
  const open = new Set();
  for (const [, file] of [
    ["npm", EXCEPTION_FILES.npm],
    ["build", EXCEPTION_FILES.build],
  ]) {
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      continue; // a missing or unreadable exception file simply means: nothing excepted
    }
    const exceptions = Array.isArray(parsed.exceptions) ? parsed.exceptions : [];
    for (const exception of exceptions) {
      if (evaluateExceptionExpiry(exception, today) === "ok") {
        open.add(exception.advisory);
      }
    }
  }
  return open;
}

// The full nightly survey. Kept out of the module's top-level so importing it
// (as the tests do, for the pure decision functions) never runs a live audit.
export function checkedBuildFindings(result, surface) {
  if (result.unassessable.length) {
    throw new Error(`Incomplete OSV assessment for ${surface}: ${result.unassessable.map(item => `${item.name}@${item.version} (${item.id})`).join(", ")}`);
  }
  return normalizeBuildFindings(result.affected, surface);
}

export async function collectAllSurveys(today) {
  const openExceptionIds = loadOpenExceptionIds(today);
  const rows = [];
  // Exception-scope note: the two exception files share the same GHSA id
  // space, so one set honours both files. This matches how the merge gates
  // treat advisories (an id is either assessed or it is not).
  for (const surface of SURFACES) {
    rows.push(...collectNpmAuditFindings(runNpmAudit(surface), surface.tag));
  }
  for (const [scopeTag, lockPath] of [
    ["root", path.join(projectRoot, "package-lock.json")],
    ["server", path.join(projectRoot, "server", "package-lock.json")],
  ]) {
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    const installed = resolveAuditClosure(lock);
    if (installed.size > 0) {
      const survey = await surveyPackages(installed);
      rows.push(...checkedBuildFindings(evaluateSurvey(survey), `${scopeTag}/build`));
    } else {
      throw new Error(`Incomplete OSV assessment: empty ${scopeTag} dependency closure`);
    }
  }
  const merged = mergeAdvisoryRows(rows);
  const { actionable, suppressed } = partitionByExceptions(merged, openExceptionIds);
  return { actionable, suppressed };
}

async function main() {
  const flags = new Set(process.argv.slice(2));
  const today = new Date().toISOString().slice(0, 10);

  let actionable;
  let suppressed;
  try {
    const fixtureIndex = process.argv.indexOf("--fixture");
    if (fixtureIndex !== -1) {
      const fixture = JSON.parse(readFileSync(process.argv[fixtureIndex + 1], "utf8"));
      if (!Array.isArray(fixture.surfaces)) throw new Error("Fixture requires a surfaces array");
      console.log("[audit-alert-findings] REHEARSAL: fixture data, no live survey");
      const rows = fixture.surfaces.flatMap(({ tag, report }) => {
        if (!tag || !report?.vulnerabilities) throw new Error("Invalid fixture survey");
        return collectNpmAuditFindings(report, tag);
      });
      for (const { tag, result } of fixture.buildAssessments ?? []) {
        rows.push(...checkedBuildFindings(result, tag));
      }
      ({ actionable, suppressed } = partitionByExceptions(mergeAdvisoryRows(rows), new Set()));
    } else {
      ({ actionable, suppressed } = await collectAllSurveys(today));
    }
  } catch (error) {
    console.error(`[audit-alert-findings] Survey failed - failing closed: ${error?.message ?? error}`);
    console.error(
      "[audit-alert-findings] A survey crash must never read as a clean night. The run summary is only trustworthy when the survey actually ran.",
    );
    process.exit(2);
  }

  if (suppressed.length) {
    console.log(`[audit-alert-findings] ${suppressed.length} finding(s) covered by reviewed, unexpired exceptions (still listed in the summary):`);
    for (const row of suppressed) console.log(`  - ${row.id} ${row.package} (${row.surfaces.join(", ")})`);
  }

  if (flags.has("--summary")) {
    console.log("### All findings (including exception-covered)");
    for (const line of buildSummaryTable([...actionable, ...suppressed])) console.log(line);
  }
  if (!actionable.some(row => row.class === "error")) {
    if (flags.has("--annotations")) {
      for (const line of buildAnnotations(actionable)) console.log(line);
    }
    console.log(
      `[audit-alert-findings] No actionable findings across the npm surfaces and the OSV build-time closure (${suppressed.length} suppressed by exceptions).`,
    );
    process.exit(0);
  }

  console.log(`[audit-alert-findings] ${actionable.length} actionable finding(s):`);
  for (const row of actionable) {
    console.log(`  - ${row.id} ${row.package} (${row.severity}; ${row.surfaces.join(", ")}) ${row.title}`);
  }
  if (flags.has("--annotations")) {
    for (const line of buildAnnotations(actionable)) console.log(line);
  }
  process.exit(1);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((error) => {
    console.error(`[audit-alert-findings] Unexpected failure: ${error?.message ?? error}`);
    process.exit(2);
  });
}
