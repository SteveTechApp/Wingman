#!/usr/bin/env node
// Fails when a test fixture or sample BOM quotes a discontinued or do-not-spec
// SKU as current equipment.
//
// The room-template gate (`check:template-sku-lifecycle`) covers the BOMs that
// become customer proposals. It does not cover the fixtures those proposals are
// tested against: an e2e parity BOM, a wizard's sample rows, a catalogue fixture
// the selector is proven on. Those fixtures are copied into new tests and read
// as the shape of a real quote, so a dead SKU sitting in one teaches the next
// author to quote it — and a snapshot that pins a retired product can quietly
// outlive its replacement.
//
// What counts is an equipment line, not a mention: an object literal carrying a
// `sku` string plus at least one equipment field (`qty`, `quantity`,
// `description`, `role`). `expect(sku).toBe("SYN-TOUCH10")` in a lifecycle test
// is a statement about a retired SKU, which is what those tests are for; the
// same SKU in a `{ sku, qty }` row is inventory someone will quote.
//
// Statuses resolve through `tools/lib/sku-lifecycle.mjs`, the same alias-aware
// rule the app and the template gate use, so a fixture quoting APO-VX20-UC is
// judged by the active `-V2` row rather than by a placeholder.
//
// tools/wingman-fixture-sku-allowlist.json records the fixtures that exist to
// prove retirement behaviour (a selector that must drop the old panel, an export
// gate that must block a dead SKU). An entry is only honoured for a row that is
// actually there, and the gate fails an entry whose row no longer quotes that
// SKU, so the list can only shrink.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { RETIRED_LIFECYCLE_STATUSES, loadLifecycleRows, resolveSkuStatus } from "./lib/sku-lifecycle.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Where the retirement-coverage allowances live, relative to the repository root. */
export const ALLOWLIST_PATH = path.join("tools", "wingman-fixture-sku-allowlist.json");

/** Directories that never hold fixtures worth judging. */
const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "coverage", "data", ".freebuff", ".codex-worktrees", "build"]);

/** A field that makes a `sku` object an equipment line rather than a reference. */
const EQUIPMENT_FIELD = /\b(qty|quantity|description|role)\s*:/;

const SKU_VALUE = /\bsku\s*:\s*["'`]([A-Za-z0-9][A-Za-z0-9 ._/-]{1,40})["'`]/g;

const SOURCE_FILE = /\.(ts|tsx|mjs|cjs|js)$/;

/**
 * Every object literal in `source`, with the spans of comments and string
 * literals so a `sku:` inside either is not read as code. Quote-aware: braces
 * inside a string or a template do not open a literal.
 */
function objectLiterals(source) {
  const literals = [];
  const masked = [];
  const stack = [];
  let index = 0;
  let quote = "";
  let quoteStart = 0;
  let blockComment = false;

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        masked.push({ start: index, end: index + 1 });
        index += 2;
        continue;
      }
      index += 1;
      continue;
    }

    if (quote) {
      if (char === "\\") {
        index += 2;
        continue;
      }
      if (char === quote) {
        quote = "";
        // The whole literal is masked, not just its quotes: a `sku:` written
        // inside a string is text, not a row.
        masked.push({ start: quoteStart, end: index });
      }
      index += 1;
      continue;
    }

    if (char === "/" && next === "/") {
      const end = source.indexOf("\n", index);
      const stop = end === -1 ? source.length - 1 : end;
      masked.push({ start: index, end: stop });
      index = stop + 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      masked.push({ start: index, end: index });
      index += 2;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      quoteStart = index;
      index += 1;
      continue;
    }
    if (char === "{") {
      stack.push(index);
      index += 1;
      continue;
    }
    if (char === "}") {
      const start = stack.pop();
      if (start !== undefined) literals.push({ start, end: index });
      index += 1;
      continue;
    }
    index += 1;
  }

  return { literals, masked };
}

function inMaskedSpan(masked, position) {
  return masked.some((span) => position >= span.start && position <= span.end);
}

/** The innermost object literal containing `position`, or null. */
function enclosingLiteral(literals, position) {
  let best = null;
  for (const literal of literals) {
    if (literal.start >= position || literal.end <= position) continue;
    if (!best || literal.end - literal.start < best.end - best.start) best = literal;
  }
  return best;
}

function lineOf(source, position) {
  let line = 1;
  for (let index = 0; index < position && index < source.length; index += 1) {
    if (source[index] === "\n") line += 1;
  }
  return line;
}

/**
 * Every equipment line in one source text: a `sku` string inside an object
 * literal that also carries an equipment field. A bare SKU mention, an
 * expectation or a comment is not equipment and is not returned.
 */
export function collectEquipmentSkus(source) {
  const { literals, masked } = objectLiterals(source);
  const rows = [];
  const seen = new Set();

  for (const match of source.matchAll(SKU_VALUE)) {
    const position = match.index ?? 0;
    if (inMaskedSpan(masked, position)) continue;
    const literal = enclosingLiteral(literals, position);
    if (!literal) continue;
    const text = source.slice(literal.start, literal.end + 1);
    if (!EQUIPMENT_FIELD.test(text)) continue;
    const key = `${position}\u0000${match[1]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ sku: match[1].trim(), line: lineOf(source, position) });
  }

  return rows;
}

/** True for a test file or anything under a `fixtures` directory. */
export function isFixtureFile(file) {
  if (/\.(test|spec)\.(ts|tsx|mjs|cjs|js)$/.test(path.basename(file))) return true;
  return file.split(path.sep).includes("fixtures");
}

/** Every test and fixture source file under `root`, in a stable order. */
export function fixtureSourceFiles(root) {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        walk(full);
      } else if (SOURCE_FILE.test(entry.name) && isFixtureFile(full)) {
        files.push(full);
      }
    }
  };
  for (const dir of ["src", "e2e", "server"]) {
    const full = path.join(root, dir);
    if (existsSync(full)) walk(full);
  }
  return files.sort();
}

/** The retirement-coverage allowances: `{ [file]: { [sku]: reason } }`. */
export function loadFixtureAllowlist(root = projectRoot) {
  const file = path.join(root, ALLOWLIST_PATH);
  if (!existsSync(file)) return {};
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  return parsed?.entries ?? {};
}

/**
 * Judge the equipment rows against the lifecycle table. Returns the problems to
 * fail on — a retired SKU with no allowance, and an allowance no row needs —
 * plus the counts the CLI reports.
 */
export function fixtureSkuProblems({ rows, statuses, allowlist = {} }) {
  const problems = [];
  const usedAllowances = new Set();
  const retired = [];

  for (const row of rows) {
    const status = resolveSkuStatus(row.sku, statuses);
    if (!RETIRED_LIFECYCLE_STATUSES.has(status)) continue;
    retired.push({ ...row, status });
    const reason = allowlist?.[row.file]?.[row.sku];
    if (typeof reason === "string" && reason.trim()) {
      usedAllowances.add(`${row.file}\u0000${row.sku}`);
      continue;
    }
    problems.push(
      `${row.file}:${row.line} quotes ${row.sku} as equipment, but the lifecycle table says "${status}".`,
    );
  }

  for (const [file, entries] of Object.entries(allowlist ?? {})) {
    for (const [sku, reason] of Object.entries(entries ?? {})) {
      if (!String(reason ?? "").trim()) {
        problems.push(`${file} has an allowlist entry for ${sku} with no reason. Say which retirement behaviour the fixture proves.`);
        continue;
      }
      if (usedAllowances.has(`${file}\u0000${sku}`)) continue;
      problems.push(
        `${file} allowlist entry ${sku} is no longer needed: the fixture no longer quotes it as equipment. Remove the entry.`,
      );
    }
  }

  return { problems, retired, usedAllowances };
}

/** The gate as the pre-commit chain calls it: prints, exits 1 on problems. */
export function checkFixtureSkuLifecycle({ root = projectRoot, allowlist = loadFixtureAllowlist(root) } = {}) {
  const statuses = loadLifecycleRows(root);
  const files = fixtureSourceFiles(root);
  const rows = [];
  for (const file of files) {
    const relative = path.relative(root, file).split(path.sep).join("/");
    for (const row of collectEquipmentSkus(readFileSync(file, "utf8"))) rows.push({ ...row, file: relative });
  }

  const { problems, retired, usedAllowances } = fixtureSkuProblems({ rows, statuses, allowlist });

  if (problems.length > 0) {
    console.error("[fixture-sku-lifecycle] Check failed:");
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error(
      "\nA fixture is the shape of a real quote: whatever it lists is what the next author copies.\n" +
        "Replace a retired SKU with its active successor from data-sources/wyrestorm/lifecycle.csv.\n" +
        "An entry in tools/wingman-fixture-sku-allowlist.json is only for a fixture that exists to\n" +
        "prove retirement behaviour, and it fails once the fixture stops quoting that SKU.",
    );
    process.exitCode = 1;
    return problems;
  }

  const allowanceText = usedAllowances.size
    ? ` ${usedAllowances.size} retirement-coverage allowance(s) apply.`
    : "";
  console.log(
    `[fixture-sku-lifecycle] Verified ${rows.length} equipment line(s) across ${files.length} test/fixture files: ` +
      `no discontinued or do-not-spec SKU is quoted as current equipment (${retired.length} retired row(s), all allowlisted).${allowanceText}`,
  );
  return problems;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  checkFixtureSkuLifecycle();
}
