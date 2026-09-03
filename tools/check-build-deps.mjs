#!/usr/bin/env node
// Build-time dependency audit gate over the OSV advisory database.
//
// npm audit (tools/check-dependency-audit.mjs) covers the dependency tree the
// npm registry knows about, but says nothing about the BUILD-TIME transitive
// surface on its own terms: the version ranges OSV tracks, the advisories that
// were fixed by an upgrade already on disk (history), and advisories that are
// still open at the installed version. This check surveys exactly that surface
// — the transitive closure of the project's devDependencies (the build/test
// toolchain: vite, esbuild, postcss, browserslist, ...) — straight from OSV,
// and turns findings into a gate with the same reviewed, time-limited
// exception policy as the npm audit gate.
//
// For every package in the closure the check:
//   1. asks OSV which advisories exist (POST /v1/querybatch, versionless, so
//      fixed-AND-open history is visible);
//   2. fetches the full record of each unique advisory (GET /v1/vulns/<id> —
//      the batch endpoint only returns id+modified);
//   3. evaluates the advisory's SEMVER ranges against the INSTALLED version.
//   Resolved advisories are reported as history; open ones block unless a
//   reviewed exception in tools/build-dep-exceptions.json covers them.
//
// A prefix run (--prefix server) audits the PREFIX lock's closure. A runtime
// package (a root manifest without devDependencies — the API server) has no
// build toolchain of its own: its dependency closure IS the surface the
// shipped artifact loads, so that closure is audited. (Resolving the dev
// closure for such a lock used to yield an empty survey that audited
// nothing.) Each closure gets its own cache entry: the cache hash mixes the
// closure label (root vs prefix:<name>) with the lockfile bytes, so a stale
// survey for one closure can never satisfy the other.
//
// The OSV data is cached (tools/build-dep-cache.generated.json, gitignored):
// a run within CACHE_MAX_AGE_MINUTES of the last fetch that sees the same
// lockfiles evaluates offline from the cache. BUILD_DEP_REFRESH=1 forces a
// refetch; BUILD_DEP_OFFLINE=1 forbids the network (fails when the cache is
// absent). BUILD_DEP_TODAY=YYYY-MM-DD overrides the reference date for the
// exception-expiry logic (deterministic tests).
//
// Usage: node tools/check-build-deps.mjs [--prefix <dir>]
//   (default: the repo root lock; --prefix server surveys the server lock)

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prefixIndex = process.argv.indexOf("--prefix");
const prefix = prefixIndex !== -1 ? process.argv[prefixIndex + 1] : "";
// A prefix run surveys <prefix>/package-lock.json, resolved against the CWD so
// both "--prefix server" (from the root) and "--prefix ." (from server/) name
// the same lock. The label is that resolved path relative to the repo root,
// so every spelling of the same lock shares one cache entry.
const lockPath = prefix
  ? path.resolve(process.cwd(), prefix, "package-lock.json")
  : path.join(projectRoot, "package-lock.json");
const lockCacheLabel = prefix
  ? `prefix:${path.relative(projectRoot, lockPath).split(path.sep).join("/")}`
  : "root";
const lockFile = prefix ? path.basename(path.dirname(lockPath)) + "/package-lock.json" : "package-lock.json";
const label = prefix || "root";

const OSV_BATCH_URL = "https://api.osv.dev/v1/querybatch";
const OSV_VULN_URL = "https://api.osv.dev/v1/vulns/";
const CACHE_PATH = path.join(projectRoot, "tools", "build-dep-cache.generated.json");
const EXCEPTIONS_PATH = path.join(projectRoot, "tools", "build-dep-exceptions.json");
const CACHE_MAX_AGE_MINUTES = 6 * 60;
const RENEWAL_WINDOW_DAYS = 14;
const FETCH_CONCURRENCY = 12;

const refresh = process.env.BUILD_DEP_REFRESH === "1";
const offline = process.env.BUILD_DEP_OFFLINE === "1";
const today = process.env.BUILD_DEP_TODAY || new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Pure helpers (exported for the fixture suite)
// ---------------------------------------------------------------------------

function parseVersion(value) {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).trim().replace(/^v/, "").split("-")[0].split("+")[0];
  if (!/^\d+(\.\d+)*$/.test(cleaned)) return null;
  return cleaned.split(".").map((part) => Number(part));
}

// Classic npm semver compare on numeric segments. Prerelease/build metadata is
// stripped, which is acceptable for deciding whether an installed version sits
// inside an advisory window.
export function semverCompare(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (a === null || b === null) return null; // unparseable - caller decides
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (a[index] ?? 0) - (b[index] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}

// Is `version` inside the [introduced, fixed) window? Introduced "0" means the
// beginning of time (every version is >= 0). An undefined fixed event means
// the window is open-ended.
export function versionInWindow(version, introduced, fixed) {
  if (introduced === undefined || introduced === null) return false;
  const fromCompare = semverCompare(version, introduced);
  if (fromCompare === null || fromCompare < 0) return false;
  if (fixed === undefined || fixed === null) return true; // no fix released
  const toCompare = semverCompare(version, fixed);
  if (toCompare === null) return false;
  return toCompare < 0;
}

// Advisory -> installed-version verdict: "affected", "resolved", or null when
// the record carries no assessable range for this package.
export function evaluateAdvisoryForPackage(record, packageName, installedVersion) {
  const affected = (record.affected ?? []).find((entry) => entry?.package?.name === packageName);
  if (!affected) return null;
  const windows = [];
  for (const range of affected.ranges ?? []) {
    if (range.type !== "SEMVER" && range.type !== "ECOSYSTEM") continue;
    const events = range.events ?? [];
    let introduced;
    for (const event of events) {
      if (event.introduced !== undefined && introduced === undefined) {
        introduced = event.introduced;
      }
      if (event.fixed !== undefined) {
        windows.push({ introduced: introduced ?? "0", fixed: event.fixed });
        introduced = undefined;
      }
    }
    if (introduced !== undefined) {
      windows.push({ introduced, fixed: undefined }); // open-ended
    }
  }
  if (windows.length === 0 && (affected.versions?.length ?? 0) > 0) {
    return affected.versions.includes(installedVersion) ? "affected" : "resolved";
  }
  if (windows.length === 0) return null;
  const inWindow = windows.some((window) =>
    versionInWindow(installedVersion, window.introduced, window.fixed),
  );
  return inWindow ? "affected" : "resolved";
}

// Resolve the devDependency closure of a package-lock v3 file: the direct
// devDependencies plus everything they (transitively) depend on, with the
// installed version of each package as recorded in the lock.
function resolveClosureFrom(lock, seedNames) {
  const result = new Map();
  const queue = [...seedNames];
  const seen = new Set();
  while (queue.length > 0) {
    const name = queue.shift();
    if (seen.has(name)) continue;
    seen.add(name);
    const entry = lock.packages?.[`node_modules/${name}`];
    if (!entry) continue;
    if (entry.version) result.set(name, entry.version);
    for (const dep of Object.keys({
      ...(entry.dependencies ?? {}),
      ...(entry.optionalDependencies ?? {}),
    })) {
      if (!seen.has(dep)) queue.push(dep);
    }
  }
  return result;
}

export function resolveDevClosure(lock) {
  return resolveClosureFrom(lock, Object.keys(lock.packages?.[""]?.devDependencies ?? {}));
}

// Seed names for the audited closure: devDependencies (the build toolchain)
// when the manifest declares them; otherwise — a runtime package such as the
// API server — its dependency closure, which is the surface the shipped
// artifact loads at run time.
export function selectAuditClosureSeeds(rootEntry) {
  const dev = Object.keys(rootEntry?.devDependencies ?? {});
  if (dev.length > 0) return dev;
  return Object.keys(rootEntry?.dependencies ?? {});
}

// The audited closure for a lock: the dev toolchain for a manifest with
// devDependencies, the full runtime dependency closure for a runtime package.
export function resolveAuditClosure(lock) {
  return resolveClosureFrom(lock, selectAuditClosureSeeds(lock.packages?.[""]));
}

// Cache key for a surveyed closure: the lockfile bytes mixed with the closure
// label, so the root and prefix:<name> closures each get their own cache
// entry and a survey of one can never satisfy a lookup for the other. The
// label is the resolved lock path ("prefix:server/package-lock.json"), so any
// --prefix spelling that resolves the same lock shares one cache entry.
export function lockCacheHash(lockContents, closureLabel) {
  const hasher = createHash("sha256");
  hasher.update(lockContents);
  hasher.update("\u0000");
  hasher.update(closureLabel);
  return hasher.digest("hex");
}

export function daysUntilExpiry(expiresOn, referenceDay) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor(
    (new Date(`${expiresOn}T00:00:00Z`) - new Date(`${referenceDay}T00:00:00Z`)) / msPerDay,
  );
}

export function evaluateExceptionExpiry(exception, referenceDay, windowDays = RENEWAL_WINDOW_DAYS) {
  if (!exception.expiresOn || exception.expiresOn <= referenceDay) return "expired";
  if (daysUntilExpiry(exception.expiresOn, referenceDay) <= windowDays) return "due-for-renewal";
  return "ok";
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

function lockfileHash() {
  return lockCacheHash(readFileSync(lockPath, "utf8"), lockCacheLabel);
}

function loadCache() {
  if (!existsSync(CACHE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CACHE_PATH, "utf8"));
  } catch {
    return null;
  }
}

function cacheIsUsable(cache, hash) {
  if (!cache || cache.lockHash !== hash) return false;
  if (offline || refresh) return cache.lockHash === hash;
  const ageMs = Date.now() - new Date(cache.fetchedAt).getTime();
  return Number.isFinite(ageMs) && ageMs <= CACHE_MAX_AGE_MINUTES * 60 * 1000;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}`);
  }
  return response.json();
}

async function mapWithConcurrency(items, worker, concurrency = FETCH_CONCURRENCY) {
  const results = new Array(items.length);
  let cursor = 0;
  const run = async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  };
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => run());
  await Promise.all(runners);
  return results;
}

async function fetchWithRetry(url, attempts = 2) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fetchJson(url);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

// Survey installed (package -> version) pairs against OSV. Returns the map
// name -> { version, vulns: [full advisory records] }.
export async function surveyPackages(installed) {
  const names = [...installed.keys()];
  const perQuery = 1000;
  const advisoryIds = new Set();
  const idNames = new Map(); // advisory id -> names that reference it
  for (let start = 0; start < names.length; start += perQuery) {
    const chunk = names.slice(start, start + perQuery);
    const body = { queries: chunk.map((name) => ({ package: { name, ecosystem: "npm" } })) };
    const response = await fetchJson(OSV_BATCH_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    response.results.forEach((result, index) => {
      for (const vuln of result.vulns ?? []) {
        advisoryIds.add(vuln.id);
        if (!idNames.has(vuln.id)) idNames.set(vuln.id, []);
        idNames.get(vuln.id).push(chunk[index]);
      }
    });
  }

  const records = await mapWithConcurrency([...advisoryIds], (id) =>
    fetchWithRetry(`${OSV_VULN_URL}${encodeURIComponent(id)}`).then((record) => [id, record]),
  );
  const byId = new Map(records);

  const survey = new Map();
  for (const [name, version] of installed) {
    survey.set(name, { version, vulns: [] });
  }
  for (const [id, namesForId] of idNames) {
    const record = byId.get(id);
    if (!record) continue;
    for (const name of namesForId) {
      if (!survey.has(name)) continue;
      survey.get(name).vulns.push(record);
    }
  }
  return survey;
}

function loadExceptions() {
  const parsed = JSON.parse(readFileSync(EXCEPTIONS_PATH, "utf8"));
  return Array.isArray(parsed.exceptions) ? parsed.exceptions : [];
}

function evaluateSurvey(survey) {
  const affected = [];
  const resolved = [];
  const unassessable = [];
  for (const [name, entry] of survey) {
    for (const record of entry.vulns) {
      const verdict = evaluateAdvisoryForPackage(record, name, entry.version);
      const item = {
        name,
        version: entry.version,
        id: record.id,
        summary: record.summary ?? "",
        severity: (record.severity ?? []).map((entry) => entry.score ?? "").filter(Boolean)[0] ?? "",
        url: `https://osv.dev/vulnerability/${record.id}`,
      };
      if (verdict === "affected") affected.push(item);
      else if (verdict === "resolved") resolved.push(item);
      else unassessable.push(item);
    }
  }
  return { affected, resolved, unassessable };
}

async function main() {
  if (!existsSync(lockPath)) {
    console.error(`[build-deps:${label}] No ${lockFile} found - cannot resolve the build-time closure.`);
    process.exit(1);
  }
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  const installed = resolveAuditClosure(lock);
  if (installed.size === 0) {
    console.error(
      `[build-deps:${label}] The audited closure resolved to zero packages - ` +
        "the lock has neither devDependencies nor dependencies to survey. Cannot audit nothing; failing closed.",
    );
    process.exit(1);
  }
  const hash = lockfileHash();
  const cache = loadCache();

  let survey;
  if (!offline && !refresh && cacheIsUsable(cache, hash)) {
    survey = new Map(
      Object.entries(cache.survey ?? {}).map(([name, entry]) => [
        name,
        { version: entry.version, vulns: entry.vulns ?? [] },
      ]),
    );
    console.log(`[build-deps:${label}] Using cached OSV survey (${cache.fetchedAt}).`);
  } else if (offline) {
    if (cache && cache.lockHash === hash) {
      survey = new Map(
        Object.entries(cache.survey ?? {}).map(([name, entry]) => [
          name,
          { version: entry.version, vulns: entry.vulns ?? [] },
        ]),
      );
      console.log(`[build-deps:${label}] OFFLINE: using cached OSV survey (${cache.fetchedAt}).`);
    } else {
      console.error(
        `[build-deps:${label}] BUILD_DEP_OFFLINE is set but no matching OSV cache exists. ` +
          "Run once with network access so the cache can be built.",
      );
      process.exit(1);
    }
  } else {
    console.log(`[build-deps:${label}] Surveying ${installed.size} build-time packages against OSV...`);
    try {
      survey = await awaitSurveyWithCacheFallback(installed, hash);
    } catch (error) {
      if (cache && cache.lockHash === hash) {
        console.warn(`[build-deps:${label}] OSV fetch failed (${error.message}); falling back to the cached survey.`);
        survey = new Map(
          Object.entries(cache.survey ?? {}).map(([name, entry]) => [
            name,
            { version: entry.version, vulns: entry.vulns ?? [] },
          ]),
        );
      } else {
        console.error(
          `[build-deps:${label}] OSV fetch failed (${error.message}) and no matching cache exists. ` +
            "Cannot audit the build-time surface - failing closed.",
        );
        process.exit(1);
      }
    }
  }

  const { affected, resolved, unassessable } = evaluateSurvey(survey);
  const exceptions = loadExceptions();
  const matchedExceptionIds = new Set();
  const blocking = [];
  const accepted = [];

  for (const item of affected) {
    const exception = exceptions.find((entry) => entry.advisory === item.id);
    if (!exception) {
      blocking.push(
        `${item.name}@${item.version} ${item.id} - ${item.summary || item.url} ` +
          `(fixed release is available - see ${item.url})`,
      );
      continue;
    }
    matchedExceptionIds.add(exception.advisory);
    const expiryState = evaluateExceptionExpiry(exception, today);
    if (expiryState === "expired") {
      blocking.push(
        `${item.name} ${item.id} - exception expired on ${exception.expiresOn ?? "(no expiry set)"}. ` +
          "Re-assess it: upgrade if a fix now exists, or renew the exception with a fresh justification.",
      );
      continue;
    }
    if (expiryState === "due-for-renewal") {
      blocking.push(
        `${item.name} ${item.id} - exception expires on ${exception.expiresOn} ` +
          `(within ${RENEWAL_WINDOW_DAYS} days). Renew it now: update expiresOn with a fresh justification, or upgrade so the exception can be deleted.`,
      );
      continue;
    }
    accepted.push(`${item.name}@${item.version} ${item.id} - accepted until ${exception.expiresOn}`);
  }

  // Only the root run owns the exceptions file, so only it can judge staleness.
  if (!prefix) {
    const seenAdvisoryIds = new Set([...resolved, ...affected, ...unassessable].map((item) => item.id));
    for (const exception of exceptions) {
      if (!matchedExceptionIds.has(exception.advisory) && !seenAdvisoryIds.has(exception.advisory)) {
        blocking.push(
          `Exception ${exception.advisory} (${exception.package ?? "?"}) no longer matches any advisory OSV reports ` +
            "for the build-time surface. The finding is resolved - delete the exception rather than leaving it in place.",
        );
      }
    }
  }

  if (accepted.length) {
    console.log(`[build-deps:${label}] ${accepted.length} reviewed exception(s) in force:`);
    for (const entry of accepted) console.log(`  - ${entry}`);
  }

  if (resolved.length) {
    console.log(
      `[build-deps:${label}] Advisory history: ${resolved.length} OSV advisory(ies) resolved by the installed versions.`,
    );
    for (const entry of resolved.slice(0, 25)) {
      console.log(`  - ${entry.name} ${entry.id} fixed (installed ${entry.version})`);
    }
    if (resolved.length > 25) console.log(`  ... and ${resolved.length - 25} more.`);
  }
  if (unassessable.length) {
    console.warn(
      `[build-deps:${label}] ${unassessable.length} advisory record(s) carry no assessable range for the installed version and were skipped: ` +
        unassessable.map((entry) => `${entry.name} ${entry.id}`).join(", "),
    );
  }

  if (blocking.length) {
    console.error(`\n[build-deps:${label}] Check failed:`);
    for (const entry of blocking) console.error(`  - ${entry}`);
    console.error(
      "\nEither upgrade the dependency, or add a reviewed exception to\n" +
        "tools/build-dep-exceptions.json with a justification and an expiry date. An exception\n" +
        "records that an OSV advisory does not apply to how Wingman uses the package at build\n" +
        "time. It is not a way to silence a finding that has not been assessed.",
    );
    process.exit(1);
  }

  console.log(
    `[build-deps:${label}] OK - ${installed.size} build-time packages surveyed, ` +
      `${affected.length} affected, ${resolved.length} resolved-history advisory(ies).`,
  );
}

async function awaitSurveyWithCacheFallback(installed, hash) {
  const survey = await surveyPackages(installed);
  const serializable = Object.fromEntries(
    [...survey].map(([name, entry]) => [name, { version: entry.version, vulns: entry.vulns }]),
  );
  try {
    writeFileSync(
      CACHE_PATH,
      JSON.stringify({ fetchedAt: new Date().toISOString(), lockHash: hash, survey: serializable }, null, 2),
    );
  } catch (error) {
    console.warn(`[build-deps:${label}] Could not write the OSV cache (${error.message}).`);
  }
  return survey;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((error) => {
    if (process.env.BUILD_DEP_DEBUG) console.error(error.stack);
    console.error(`[build-deps:${label}] Unexpected failure: ${error.message}`);
    process.exit(1);
  });
}
