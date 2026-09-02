#!/usr/bin/env node
// Dependency audit gate with reviewed, time-limited exceptions.
//
// Replaces a bare `npm audit --audit-level=high`. That command has no way to
// accept a single assessed advisory, so one finding that does not apply to how
// Wingman uses a package blocks every merge - which is what happened on
// 2026-07-24, when a newly published react-router advisory turned the gate red
// on every branch with no code change at all.
//
// The two bad answers to that are silencing the gate, and downgrading a working
// dependency to satisfy a finding that is not reachable in this application.
// This takes the third: an exception must be written down in
// tools/dependency-audit-exceptions.json with a justification, and it must
// carry an expiry date. The check fails once an exception expires, so an
// exception cannot quietly become permanent.
//
// Fails on: any high/critical advisory that is not excepted; any exception that
// has expired; any exception within RENEWAL_WINDOW_DAYS of its expiry (so a
// renewal is prepared ahead of the deadline instead of being discovered by a
// red build at the last minute); any exception that no longer matches a real
// advisory (so stale entries get cleaned up rather than lingering).
//
// DEPENDENCY_AUDIT_TODAY=YYYY-MM-DD overrides the reference date - the check
// normally uses the real clock; the override exists so the window logic can be
// verified deterministically.
//
// Usage: node tools/check-dependency-audit.mjs [--prefix server]

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prefixIndex = process.argv.indexOf("--prefix");
const prefix = prefixIndex !== -1 ? process.argv[prefixIndex + 1] : "";
const cwd = prefix ? path.join(projectRoot, prefix) : projectRoot;
const label = prefix || "root";

const BLOCKING = new Set(["high", "critical"]);

// The renewal notice horizon: an exception that still passes is a deadline you
// must act on soon, not later. 14 days is comfortably inside a release/PR
// cycle, so no exception can expire without at least one CI run demanding its
// renewal before the date arrives.
const RENEWAL_WINDOW_DAYS = 14;

// Whole days from `today` (YYYY-MM-DD) until `expiresOn` (YYYY-MM-DD).
// Negative when already past.
export function daysUntilExpiry(expiresOn, today) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((new Date(`${expiresOn}T00:00:00Z`) - new Date(`${today}T00:00:00Z`)) / msPerDay);
}

// Decides what the check must do with an exception record.
// Returns 'ok', 'due-for-renewal', or 'expired'.
export function evaluateExceptionExpiry(exception, today, windowDays = RENEWAL_WINDOW_DAYS) {
  if (!exception.expiresOn || exception.expiresOn <= today) return "expired";
  if (daysUntilExpiry(exception.expiresOn, today) <= windowDays) return "due-for-renewal";
  return "ok";
}

function loadExceptions() {
  const file = path.join(projectRoot, "tools", "dependency-audit-exceptions.json");
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  return Array.isArray(parsed.exceptions) ? parsed.exceptions : [];
}

function runAudit() {
  try {
    // execSync with a fixed command string, rather than execFileSync with an
    // args array. On Windows npm is a .cmd shim, which recent Node refuses to
    // spawn directly (EINVAL), and passing args alongside shell:true raises a
    // deprecation warning. The command is a static literal with no interpolated
    // input, so there is no injection surface here.
    const stdout = execSync("npm audit --json", {
      cwd,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return JSON.parse(stdout);
  } catch (error) {
    // npm audit exits non-zero when it finds anything. That is expected - the
    // report still comes back on stdout, and this tool decides what blocks.
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch {
        throw new Error(`Could not parse npm audit output for ${label}.`);
      }
    }
    throw error;
  }
}

// An advisory id can appear nested in `via` entries, which are either strings
// (an indirect path via another package) or objects carrying the real advisory.
function advisoriesFor(vulnerability) {
  const found = [];
  for (const via of vulnerability.via ?? []) {
    if (typeof via === "string") continue;
    const url = String(via.url ?? "");
    const id = url.split("/").pop();
    if (id) found.push({ id, title: via.title ?? "", url });
  }
  return found;
}

function main() {
const exceptions = loadExceptions();
const today = String(process.env.DEPENDENCY_AUDIT_TODAY || new Date().toISOString().slice(0, 10));
const report = runAudit();
const vulnerabilities = Object.entries(report.vulnerabilities ?? {});

const blocking = [];
const accepted = [];
const matchedExceptionIds = new Set();

for (const [name, vulnerability] of vulnerabilities) {
  if (!BLOCKING.has(vulnerability.severity)) continue;

  const advisories = advisoriesFor(vulnerability);

  // An indirect vulnerability (via: ["react-router"]) carries no advisory of
  // its own. It is covered if the package it comes through is covered.
  if (advisories.length === 0) {
    const covered = exceptions.some(
      (e) => e.package === name || (e.alsoAffects ?? []).includes(name),
    );
    if (covered) {
      accepted.push(`${name} (${vulnerability.severity}) - inherited from an excepted dependency`);
      continue;
    }
    blocking.push(`${name} (${vulnerability.severity}) - no advisory id resolved and no exception covers it`);
    continue;
  }

  for (const advisory of advisories) {
    const exception = exceptions.find((e) => e.advisory === advisory.id);

    if (!exception) {
      blocking.push(`${name} (${vulnerability.severity}) ${advisory.id} - ${advisory.title}`);
      continue;
    }

    matchedExceptionIds.add(exception.advisory);

    const expiryState = evaluateExceptionExpiry(exception, today);
    if (expiryState === "expired") {
      blocking.push(
        `${name} ${advisory.id} - exception expired on ${exception.expiresOn ?? "(no expiry set)"}. ` +
          "Re-assess it: upgrade if a fix now exists, or renew the exception with a fresh justification.",
      );
      continue;
    }
    if (expiryState === "due-for-renewal") {
      blocking.push(
        `${name} ${advisory.id} - exception expires on ${exception.expiresOn} (within ${RENEWAL_WINDOW_DAYS} days). ` +
          "Renew it now: update expiresOn with a fresh justification, or resolve the advisory so the exception can be deleted.",
      );
      continue;
    }

    accepted.push(`${name} ${advisory.id} - accepted until ${exception.expiresOn}`);
  }
}

if (accepted.length) {
  console.log(`[dependency-audit:${label}] ${accepted.length} reviewed exception(s) in force:`);
  for (const entry of accepted) console.log(`  - ${entry}`);
}

// Only the root run owns the exceptions file, so only it can judge staleness.
if (!prefix) {
  for (const exception of exceptions) {
    if (!matchedExceptionIds.has(exception.advisory)) {
      blocking.push(
        `Exception ${exception.advisory} (${exception.package}) no longer matches any advisory. ` +
          "The finding is resolved - delete the exception rather than leaving it in place.",
      );
    }
  }
}

if (blocking.length) {
  console.error(`\n[dependency-audit:${label}] Check failed:`);
  for (const entry of blocking) console.error(`  - ${entry}`);
  console.error(
    "\nEither fix the dependency, or add a reviewed exception to\n" +
      "tools/dependency-audit-exceptions.json with a justification and an expiry date.\n" +
      "An exception records that an advisory does not apply to how Wingman uses the\n" +
      "package. It is not a way to silence a finding that has not been assessed.",
  );
  process.exit(1);
}

const counts = report.metadata?.vulnerabilities ?? {};
console.log(
  `[dependency-audit:${label}] No unaccepted high or critical advisories. ` +
    `(total reported: ${counts.total ?? 0}; high ${counts.high ?? 0}, critical ${counts.critical ?? 0})`,
);
}

// Run as a CLI only when directly executed. Importing the module (as the tests
// do, for the exported expiry helpers) must not trigger a live npm audit.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
