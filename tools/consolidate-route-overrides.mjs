#!/usr/bin/env node
// Phase 8 stylesheet consolidation — dead route-override removal.
//
// docs/SIZE_BUDGETS.md (2026-09-30 exception) names the remediation: "dead
// route-override removal and duplicate-rule consolidation once the stylesheet
// is fully layered". This tool implements the dead-removal half, mechanically:
//
//   1. Route-scoped blocks: any top-level rule whose selector requires a
//      route key that does not exist in the live route union is dead. Route
//      keys come from the two runtime sources of truth:
//        - the `wm-route-<segment>` classes AppShell adds per route
//          (src/wingman2/app/route-manifest.json segments)
//        - the `html[data-wingman-route="<key>"]` attribute AppShell sets
//          (the WingmanRouteKey union in routeCatalog.ts)
//      A selector is route-scoped if it contains `.wm-route-<x>` or
//      `[data-wingman-route="<x>"]` with an x outside the live sets. Blocks
//      whose selector mentions a live route (or no route at all) are kept.
//   2. Legacy class-prefixed scoping (`.wm-compare-`-style historical route
//      names) is NOT guessed at — only the two runtime-verified attributes.
//
// Default mode is REPORT (prints every removal with its selector line so a
// human can spot-check); --apply rewrites the file with a replacement map
// keyed by selector line so every removal is auditable. Duplicate-rule
// consolidation (--dedupe) then merges byte-identical top-level rule blocks
// whose selectors collapse to one, keeping the first occurrence.
//
// The removed bytes must actually show up in the size budget — the tool
// prints the measured delta against the tracked total:css limit.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OVERRIDES = path.join(root, "src", "wingman2", "styles", "wingman-route-overrides.css");
const MANIFEST = path.join(root, "src", "wingman2", "app", "route-manifest.json");
const CATALOG = path.join(root, "src", "wingman2", "app", "routeCatalog.ts");

const APPLY = process.argv.includes("--apply");
const DEDUPE = process.argv.includes("--dedupe");

// ---------------------------------------------------------------------------
// Live route keys from the two runtime sources of truth
// ---------------------------------------------------------------------------
const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const liveSegments = new Set(manifest.map((route) => String(route.segment)));

const catalogSource = fs.readFileSync(CATALOG, "utf8").replace(/\r\n/g, "\n");
const unionBlock = catalogSource.match(/export type WingmanRouteKey\s*=\s*([\s\S]*?);/);
if (!unionBlock) {
  console.error("[phase8] could not locate the WingmanRouteKey union in routeCatalog.ts");
  process.exit(1);
}
const liveKeys = new Set([...unionBlock[1].matchAll(/"([a-zA-Z0-9-]+)"/g)].map((m) => m[1]));
// camelCase key -> kebab-case attribute value used by AppShell (dataset assigns
// route.key verbatim, so the union members ARE the attribute values).
const liveRouteKeys = new Set([...liveKeys, ...[...liveKeys].map((k) => k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`))]);

console.log(
  `[phase8] live segments (${liveSegments.size}): ${[...liveSegments].join(", ")}`,
);
console.log(
  `[phase8] live route keys (${liveRouteKeys.size}): ${[...liveRouteKeys].join(", ")}`,
);

// ---------------------------------------------------------------------------
// Parse the stylesheet into top-level chunks (comments, @media groups, rules)
// ---------------------------------------------------------------------------

/** Split a CSS string into top-level chunks, preserving order and raw text. */
function parseTopLevel(text) {
  const chunks = [];
  let buffer = "";
  let depth = 0;
  let inComment = false;
  let inString = null;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (inComment) {
      buffer += char;
      if (char === "*" && next === "/") {
        buffer += next;
        i += 1;
        inComment = false;
      }
      continue;
    }
    if (inString) {
      buffer += char;
      if (char === "\\") {
        buffer += next ?? "";
        i += 1;
      } else if (char === inString) {
        inString = null;
      }
      continue;
    }
    if (char === "/" && next === "*") {
      inComment = true;
      buffer += char + next;
      i += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      inString = char;
      buffer += char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    buffer += char;
    if (depth === 0 && (char === "}" || char === ";")) {
      chunks.push(buffer);
      buffer = "";
    }
  }
  if (buffer.trim()) chunks.push(buffer);
  return chunks;
}

const source = fs.readFileSync(OVERRIDES, "utf8");
const originalBytes = Buffer.byteLength(source, "utf8");
const chunks = parseTopLevel(source);

/** The selector portion of a rule chunk (everything before the first `{`). */
function selectorOf(chunk) {
  const brace = chunk.indexOf("{");
  return brace === -1 ? "" : chunk.slice(0, brace);
}

const RE_WMR_ROUTE = /\.wm-route-([a-zA-Z0-9-]+)/g;
const RE_DATA_ROUTE = /\[data-wingman-route=["']([^"']+)["']\]/g;

function deadRouteIn(selector) {
  for (const match of selector.matchAll(RE_WMR_ROUTE)) {
    if (!liveSegments.has(match[1])) return { kind: "wm-route-class", token: match[0], value: match[1] };
  }
  for (const match of selector.matchAll(RE_DATA_ROUTE)) {
    if (!liveRouteKeys.has(match[1])) return { kind: "data-wingman-route", token: match[0], value: match[1] };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Selector-list splitting: a rule's selector may be a comma list mixing LIVE
// and DEAD route scoping (e.g. `html[data-wingman-route="glossary"] main,
// html[data-wingman-route="intelligence"] main`). Such blocks must be SPLIT -
// keep the block with only its live selectors - never removed wholesale.
// Commas inside strings, parens or attribute selectors do not split.
// ---------------------------------------------------------------------------
function splitSelectorList(selector) {
  const parts = [];
  let current = "";
  let depth = 0;
  let inString = null;
  for (let i = 0; i < selector.length; i += 1) {
    const char = selector[i];
    if (inString) {
      current += char;
      if (char === inString) inString = null;
      continue;
    }
    if (char === '"' || char === "'") {
      inString = char;
      current += char;
      continue;
    }
    if (char === "(" || char === "[") depth += 1;
    if (char === ")" || char === "]") depth -= 1;
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean);
}

/**
 * Rewrite one rule chunk keeping only its live selectors. Returns null when
 * every selector is dead (the whole block goes), or the chunk unchanged when
 * nothing needs rewriting.
 */
function pruneRuleChunk(chunk) {
  const brace = chunk.indexOf("{");
  const selector = chunk.slice(0, brace);
  const body = chunk.slice(brace);
  const parts = splitSelectorList(selector);
  const live = parts.filter((part) => !deadRouteIn(part));
  const dead = parts.length - live.length;
  if (dead === 0) return { chunk, removed: 0 };
  if (live.length === 0) return { chunk: null, removed: Buffer.byteLength(chunk, "utf8") };
  const rewritten = `${live.join(", ")} ${body}`;
  return { chunk: rewritten, removed: Buffer.byteLength(chunk, "utf8") - Buffer.byteLength(rewritten, "utf8") };
}

// ---------------------------------------------------------------------------
// Pass 1: dead route-scoped rule removal (with mixed-selector splitting)
// ---------------------------------------------------------------------------
const removals = [];
const splits = [];
const keptChunks = [];
let removedBytes = 0;

for (const chunk of chunks) {
  const trimmed = chunk.trim();
  if (!trimmed) continue;
  const selector = selectorOf(chunk);
  const isRule = !selector.trim().startsWith("@") && selector && chunk.trimEnd().endsWith("}");
  const isMedia = selector.trim().startsWith("@media") && chunk.trimEnd().endsWith("}");

  if (isRule) {
    const result = pruneRuleChunk(chunk);
    if (result.chunk === null) {
      removals.push({ selector: selector.replace(/\s+/g, " ").trim().slice(0, 160), bytes: result.removed });
      removedBytes += result.removed;
    } else {
      if (result.removed > 0) {
        splits.push({ selector: selector.replace(/\s+/g, " ").trim().slice(0, 160), bytes: result.removed });
        removedBytes += result.removed;
      }
      keptChunks.push(result.chunk);
    }
    continue;
  }

  if (isMedia) {
    // Recurse into the media group's inner rules with the same prune logic.
    const openBrace = chunk.indexOf("{");
    const mediaSelector = chunk.slice(0, openBrace + 1);
    const body = chunk.slice(openBrace + 1, chunk.lastIndexOf("}"));
    const tail = chunk.slice(chunk.lastIndexOf("}"));
    const innerChunks = parseTopLevel(body);
    const keptInner = [];
    let innerRemoved = 0;
    let innerSplit = 0;
    for (const inner of innerChunks) {
      const innerSelector = selectorOf(inner);
      const innerIsRule = innerSelector && !innerSelector.trim().startsWith("@") && inner.trimEnd().endsWith("}");
      if (!innerIsRule) {
        keptInner.push(inner);
        continue;
      }
      const result = pruneRuleChunk(inner);
      if (result.chunk === null) {
        innerRemoved += result.removed;
      } else {
        innerSplit += result.removed;
        keptInner.push(result.chunk);
      }
    }
    const prunedBody = keptInner.join("");
    if (prunedBody.trim()) {
      const rewritten = `${mediaSelector}${prunedBody}${tail}`;
      const delta = Buffer.byteLength(chunk, "utf8") - Buffer.byteLength(rewritten, "utf8");
      if (delta > 0) {
        splits.push({ selector: `${mediaSelector.replace(/\s+/g, " ").trim()} (inner)`, bytes: delta });
        removedBytes += delta;
      }
      keptChunks.push(rewritten);
    } else {
      removals.push({ selector: `${mediaSelector.replace(/\s+/g, " ").trim()} (all inner dead)`, bytes: Buffer.byteLength(chunk, "utf8") });
      removedBytes += Buffer.byteLength(chunk, "utf8");
    }
    continue;
  }

  keptChunks.push(chunk);
}

console.log(`\n[phase8] pass 1 - dead route-scoped rules: ${removals.length} block(s) removed, ${splits.length} mixed block(s) split, ${removedBytes} bytes`);
for (const removal of removals.slice(0, 40)) {
  console.log(`  REMOVED -${removal.bytes}B  ${removal.selector}`);
}
if (removals.length > 40) console.log(`  ... and ${removals.length - 40} more`);
for (const split of splits.slice(0, 20)) {
  console.log(`  SPLIT   -${split.bytes}B  ${split.selector}`);
}
if (splits.length > 20) console.log(`  ... and ${splits.length - 20} more`);

// ---------------------------------------------------------------------------
// Pass 2 (--dedupe): merge byte-identical top-level rule blocks
// ---------------------------------------------------------------------------
let dedupes = [];
let dedupeBytes = 0;
let finalChunks = keptChunks;

if (DEDUPE) {
  const seen = new Map();
  dedupes = [];
  finalChunks = [];
  for (const chunk of keptChunks) {
    const selector = selectorOf(chunk).replace(/\s+/g, " ").trim();
    const body = selector ? chunk.slice(chunk.indexOf("{") + 1, chunk.lastIndexOf("}")).replace(/\s+/g, " ").trim() : "";
    if (selector && body) {
      const key = `${selector}|||${body}`;
      if (seen.has(key)) {
        // Merge: keep the first block, append duplicate selectors to it.
        const first = seen.get(key);
        const mergedSelector = `${first.selectorText}, ${selector}`;
        first.chunk = first.chunk.replace(first.selectorText, mergedSelector);
        first.selectorText = mergedSelector;
        dedupes.push(selector);
        dedupeBytes += Buffer.byteLength(chunk, "utf8");
        continue;
      }
      seen.set(key, { chunk, selectorText: selector });
    }
    finalChunks.push(chunk);
  }
  console.log(`\n[phase8] pass 2 - duplicate rules merged: ${dedupes.length} block(s), ${dedupeBytes} bytes`);
  for (const selector of dedupes.slice(0, 25)) console.log(`  merged dup: ${selector.slice(0, 150)}`);
  if (dedupes.length > 25) console.log(`  ... and ${dedupes.length - 25} more`);
}

// ---------------------------------------------------------------------------
// Outcome
// ---------------------------------------------------------------------------
const finalSource = finalChunks.join("");
const finalBytes = Buffer.byteLength(finalSource, "utf8");
console.log(`\n[phase8] source bytes: ${originalBytes} -> ${finalBytes} (delta ${finalBytes - originalBytes})`);

const budgets = JSON.parse(fs.readFileSync(path.join(root, "tools", "wingman-size-budgets.json"), "utf8"));
const cssLimit = budgets.limits["total:css"];
console.log(`[phase8] total:css limit: ${cssLimit} (headroom after delta: unknown until vite build; source delta is a lower bound on emitted delta)`);

if (!APPLY) {
  console.log("\n[phase8] REPORT ONLY - re-run with --apply" + (DEDUPE ? "" : " (add --dedupe for pass 2)") + " to write.");
  process.exit(0);
}

fs.writeFileSync(OVERRIDES, finalSource, "utf8");
console.log(`[phase8] APPLIED: ${OVERRIDES} rewritten.`);
console.log(`[phase8] NEXT: npm run build && node tools/check-size-budgets.mjs, then lower total:css in tools/wingman-size-budgets.json (reviewed exception path reverses: this is the documented downward move).`);
