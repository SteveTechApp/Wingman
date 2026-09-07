#!/usr/bin/env node
// Fails when a NEW unbounded PostgREST read appears in server/ or tools/.
//
// PostgREST caps every response at 1000 rows by default. A full-table read
// that forgets this silently truncates: stores then reconcile against partial
// data and delete the unread tail as "stale" (the exact data-loss bug the
// readAllSupabaseRows helper in server/supabase-pagination.mjs exists to
// prevent). This check keeps that posture from regressing.
//
// Two read styles are scanned:
//   1. supabase-js chains: client.from(<table>).select(...) - bounded when the
//      chain carries .range()/.limit(), a head-only count, a single-row
//      terminator (.single()/.maybeSingle()), or any filter predicate
//      (.eq/.in/.lt/... ). A select with ONLY order/ modifiers and no bound is
//      flagged: it reads the whole table.
//   2. raw PostgREST fetches: fetch(`<url>/rest/v1/<table>?...`) with a GET
//      (or omitted) method - bounded when the query string carries limit= or a
//      filter predicate (eq./in(/lt./... ). Write methods (POST/PATCH/PUT/
//      DELETE) are skipped, and bare GETs are flagged.
//
// KNOWN DELIBERATE UNFILTERED READ (allowlisted): tools/verify-supabase-rls.mjs
// issues an unfiltered anon probe on purpose - it is the RLS leak detector,
// and an unfiltered read IS the test. The allowlist is file-scoped with a
// written justification; adding entries requires the same justification bar.
//
// Usage: node tools/check-postgrest-reads.mjs
//   (lint heuristics, not a parser: a false positive costs one allowlist
//    entry with justification; a false negative costs data)

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SCAN_DIRS = ["server", "tools"];
const IGNORED_SEGMENTS = new Set(["node_modules", "dist", "coverage", ".git"]);
const IGNORED_SUFFIXES = [".test.mjs", ".test.ts", ".test.tsx", ".generated.json"];
const WRITE_METHODS = new Set(["post", "patch", "put", "delete"]);

// File-scoped, justified exemptions. Do not add entries casually: each one is
// a place where an unbounded read is the point.
const UNBOUNDED_READ_ALLOWLIST = [
  {
    file: "tools/verify-supabase-rls.mjs",
    reason:
      "The RLS leak probe issues an unfiltered anon read deliberately: proving rows are (or are not) publicly readable IS the check.",
  },
];

const BOUNDING_CHAIN_METHODS = [
  "range",
  "limit",
  "single",
  "maybeSingle",
  "eq",
  "neq",
  "in",
  "lt",
  "lte",
  "gt",
  "gte",
  "like",
  "ilike",
  "match",
  "textSearch",
  "or",
  "and",
  "contains",
  "overlaps",
];

// Extract the logical statement starting at a `.from(` occurrence: characters
// up to the first top-level `;` outside any string/template literal, capped
// so pathological files cannot stall the scan.
function extractChainStatement(text, startIndex, cap = 1200) {
  let quote = null;
  for (let i = startIndex; i < Math.min(text.length, startIndex + cap); i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === "\\") {
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === ";") return text.slice(startIndex, i + 1);
  }
  return text.slice(startIndex, Math.min(text.length, startIndex + cap));
}

function isBoundedSupabaseChain(chain) {
  if (!chain.includes(".select(")) return true; // not a read chain at all
  if (/\bhead\s*:\s*true\b/.test(chain)) return true; // count-only read: zero rows
  return BOUNDING_CHAIN_METHODS.some((method) => chain.includes(`.${method}(`));
}

const REST_URL_PATTERN = /fetch\s*\(\s*([`'"])([^`'"]*\/rest\/v1\/[^`'"]*)\1/g;

function urlIsBounded(url) {
  if (/[?&]limit=/.test(url)) return true;
  // Any filter predicate (eq./neq./lt./gt./lte./gte., in(, or(, and(, is.)
  // bounds the response to the matching rows rather than the whole table.
  return /(?:[?&][A-Za-z_][A-Za-z0-9_]*(?:\.[a-z]+)*=(?:eq|neq|lt|lte|gt|gte)\.)|(?:[?&](?:or|and|is)\()|(?:[?&][A-Za-z_][A-Za-z0-9_]*=in\()/.test(
    url,
  );
}

function isWriteFetch(text, fetchIndex) {
  const window = text.slice(fetchIndex, fetchIndex + 400);
  return [...WRITE_METHODS].some((method) =>
    new RegExp(`\\bmethod\\s*:\\s*["']${method}["']`, "i").test(window),
  );
}

function isInsideComment(sourceText, index) {
  const lineStart = sourceText.lastIndexOf("\n", index - 1) + 1;
  const prefix = sourceText.slice(lineStart, index).trimStart();
  return prefix.startsWith("//") || prefix.startsWith("/*") || prefix.startsWith("*");
}

export function scanSourceForUnboundedReads(sourceText, filePath) {
  const violations = [];

  // supabase-js chains
  const fromPattern = /\.from\s*\(/g;
  let match;
  while ((match = fromPattern.exec(sourceText)) !== null) {
    if (isInsideComment(sourceText, match.index)) continue;
    const chain = extractChainStatement(sourceText, match.index);
    if (!chain.includes(".select(")) continue;
    if (isBoundedSupabaseChain(chain)) continue;
    const line = sourceText.slice(0, match.index).split("\n").length;
    violations.push({
      file: filePath,
      line,
      kind: "supabase-js",
      snippet: chain.replace(/\s+/g, " ").slice(0, 160),
    });
  }

  // raw PostgREST fetches (URL-literal form; see header note)
  REST_URL_PATTERN.lastIndex = 0;
  while ((match = REST_URL_PATTERN.exec(sourceText)) !== null) {
    if (isInsideComment(sourceText, match.index)) continue;
    if (isWriteFetch(sourceText, match.index)) continue;
    const url = match[2];
    if (urlIsBounded(url)) continue;
    const line = sourceText.slice(0, match.index).split("\n").length;
    violations.push({
      file: filePath,
      line,
      kind: "rest-fetch",
      snippet: url.replace(/\s+/g, " ").slice(0, 160),
    });
  }

  return violations;
}

export function applyAllowlist(violations, allowlist = UNBOUNDED_READ_ALLOWLIST) {
  return violations.filter(
    (violation) => !allowlist.some((entry) => entry.file === violation.file),
  );
}

function listSourceFiles(dir, relative = "") {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_SEGMENTS.has(entry.name)) continue;
      files.push(...listSourceFiles(path.join(dir, entry.name), path.join(relative, entry.name)));
      continue;
    }
    if (!entry.name.endsWith(".mjs") && !entry.name.endsWith(".js")) continue;
    if (IGNORED_SUFFIXES.some((suffix) => entry.name.endsWith(suffix))) continue;
    files.push(path.join(dir, entry.name));
  }
  return files;
}

export function collectPostgrestReadViolations(root = projectRoot) {
  const raw = [];
  for (const dir of SCAN_DIRS) {
    const absDir = path.join(root, dir);
    let stat;
    try {
      stat = statSync(absDir);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;
    for (const file of listSourceFiles(absDir)) {
      const relativePath = path.relative(root, file).split(path.sep).join("/");
      let content;
      try {
        content = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      raw.push(...scanSourceForUnboundedReads(content, relativePath));
    }
  }
  return applyAllowlist(raw);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const violations = collectPostgrestReadViolations();
  if (violations.length) {
    console.error(`[postgrest-reads] Check failed - ${violations.length} unbounded PostgREST read(s):`);
    for (const violation of violations) {
      console.error(`  - ${violation.file}:${violation.line} (${violation.kind}) ${violation.snippet}`);
    }
    console.error(
      "\nPostgREST caps responses at 1000 rows: a full-table read silently truncates, and\n" +
        "reconciling against partial data deletes the unread tail as stale. Bound the read\n" +
        "with .range()/.limit(), a head-only count, a single-row terminator, a filter, or\n" +
        "the paging helper readAllSupabaseRows (server/supabase-pagination.mjs). If an\n" +
        "unfiltered read is deliberate (e.g. a probe), add a justified allowlist entry.",
    );
    process.exit(1);
  }
  console.log("[postgrest-reads] OK - no unbounded PostgREST reads in server/ or tools/.");
}
