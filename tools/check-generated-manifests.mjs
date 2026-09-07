#!/usr/bin/env node
// Permanent drift guard for the two TRACKED generated manifests:
//
//   1. data/catalog/product-data-manifest.generated.json - records a sha256
//      per source file (data-sources/**). A source edit without a rebuild
//      leaves the checked-in hash stale; the manifest can also gain or lose a
//      source without the hashes notice. This check recomputes every listed
//      source's hash and verifies the source list is complete, so a source
//      edit can never be committed with an unrebuilt manifest.
//
//   2. data/catalog/product-technology-profiles.generated.json - a materialised
//      records blob with NO embedded hashes, so drift is invisible: a new
//      product in competitor-products.generated.json / product-intelligence-
//      index.json, a changed normalization rule, or updated routed-io evidence
//      all silently desync it. This check regenerates the records in-memory
//      (deterministic - see tools/lib/product-technology-profiles.mjs) and
//      byte-compares against the committed file.
//
// Hash-only commits (a manifest updated without the underlying data change, or
// a data change whose manifest wasn't rebuilt) fail here instead of shipping.
//
// Wire-in: `npm run check:generated-manifests` (verify:data).

import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadRoutedIoEvidence } from "./lib/routed-io-evidence.mjs";
import {
  materialiseTechnologyProfiles,
  rowsFrom,
} from "./lib/product-technology-profiles.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..");

export const DATA_MANIFEST_PATH = "data/catalog/product-data-manifest.generated.json";
export const TECHNOLOGY_PROFILES_PATH = "data/catalog/product-technology-profiles.generated.json";
const WYRESTORM_INPUTS = [
  "data-sources/wyrestorm/products.csv",
  "data-sources/wyrestorm/lifecycle.csv",
  "data-sources/wyrestorm/enrichment.json",
];
const COMPETITOR_DIR = "data-sources/competitors";

export function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function readText(rootDir, relative) {
  try {
    return readFileSync(path.join(rootDir, relative), "utf8");
  } catch {
    return null;
  }
}

/**
 * Current expected source list for the data manifest (the three WyreStorm
 * inputs plus every competitor CSV present in the tree).
 */
export function expectedDataManifestSources(rootDir = REPO_ROOT) {
  let competitorFiles = [];
  try {
    competitorFiles = readdirSync(path.join(rootDir, COMPETITOR_DIR))
      .filter((name) => name.endsWith(".csv"))
      .sort()
      .map((name) => `${COMPETITOR_DIR}/${name}`);
  } catch {
    // Competitor dir missing - the source validation gate will report it.
  }
  return [...WYRESTORM_INPUTS, ...competitorFiles];
}

/**
 * Pure core of check 1: given the committed manifest, a source-text reader
 * and the expected source list, return every drift error.
 * `readSourceText(relative)` returns the file's current text or null when
 * missing.
 */
export function dataManifestDriftErrors(manifest, readSourceText, expectedSources = []) {
  const errors = [];
  if (!manifest || typeof manifest !== "object") {
    return ["committed product-data-manifest is missing or unreadable"];
  }
  const { sourceFiles, hashes } = manifest;
  if (!Array.isArray(sourceFiles)) {
    errors.push("committed manifest has no sourceFiles array");
  }
  if (!hashes || typeof hashes !== "object") {
    errors.push("committed manifest has no hashes object");
  }
  if (errors.length) return errors;

  const listed = new Set(sourceFiles);
  for (const file of sourceFiles) {
    const text = readSourceText(file);
    if (text === null) {
      errors.push(`manifest lists source "${file}" but it is missing from the tree - rebuild the manifest`);
      continue;
    }
    const expected = hashes[file];
    const actual = sha256(text);
    if (typeof expected !== "string" || expected !== actual) {
      errors.push(`source "${file}" changed since the manifest was generated - run: npm run data:sources:build`);
    }
  }

  // Bidirectional completeness: every current source must be listed, so a
  // source added (or a whole file dropped from the manifest) cannot slip by.
  for (const file of expectedSources) {
    if (!listed.has(file)) {
      errors.push(`source "${file}" exists but is not listed in the manifest - run: npm run data:sources:build`);
    }
  }
  return errors;
}

function recordDiffSummary(committed, fresh) {
  const key = (r) => `${r.vendorType}|${r.manufacturer || ""}|${r.sku}`;
  const freshKeys = new Map(fresh.map((r) => [key(r), r]));
  const committedKeys = new Set(committed.map((r) => key(r)));
  const added = [...freshKeys.keys()].filter((k) => !committedKeys.has(k));
  const removed = committed.filter((r) => !freshKeys.has(key(r))).map((r) => key(r));
  const lines = [`technology profiles drifted: committed ${committed.length} records vs regenerated ${fresh.length}`];
  for (const k of added.slice(0, 10)) lines.push(`  + ${k}`);
  for (const k of removed.slice(0, 10)) lines.push(`  - ${k}`);
  lines.push("run: node tools/audit-product-technology-normalization.mjs and commit the regenerated manifest");
  return lines.join("\n");
}

/**
 * Pure core of check 2: regenerate the records from the current inputs and
 * compare with what is committed. Deterministic by contract.
 */
export function technologyProfilesDriftErrors(committedRecords, competitorRows, wyrestormRows, routedIoEvidence) {
  if (!Array.isArray(committedRecords)) {
    return ["committed product-technology-profiles has no records array - regenerate it"];
  }
  const fresh = materialiseTechnologyProfiles(competitorRows, wyrestormRows, routedIoEvidence);
  if (JSON.stringify(fresh) === JSON.stringify(committedRecords)) return [];
  return [recordDiffSummary(committedRecords, fresh)];
}

/** Run both checks against the working tree; returns the full error list. */
export function checkGeneratedManifestDrift(rootDir = REPO_ROOT) {
  const errors = [];

  const manifestText = readText(rootDir, DATA_MANIFEST_PATH);
  if (manifestText === null) {
    errors.push(`${DATA_MANIFEST_PATH} is missing from the tree`);
  } else {
    let manifest;
    try {
      manifest = JSON.parse(manifestText);
    } catch (error) {
      errors.push(`${DATA_MANIFEST_PATH} is not valid JSON: ${error.message}`);
    }
    if (manifest) {
      errors.push(...dataManifestDriftErrors(manifest, (file) => readText(rootDir, file), expectedDataManifestSources(rootDir)));
    }
  }

  const profilesText = readText(rootDir, TECHNOLOGY_PROFILES_PATH);
  if (profilesText === null) {
    errors.push(`${TECHNOLOGY_PROFILES_PATH} is missing from the tree`);
  } else {
    let committed;
    try {
      committed = JSON.parse(profilesText);
    } catch (error) {
      errors.push(`${TECHNOLOGY_PROFILES_PATH} is not valid JSON: ${error.message}`);
    }
    if (committed) {
      const competitor = rowsFrom(JSON.parse(readText(rootDir, "data/catalog/competitor-products.generated.json") ?? "[]"));
      const wyrestorm = rowsFrom(JSON.parse(readText(rootDir, "public/product-intelligence-index.json") ?? "[]"));
      let routedIoEvidence;
      try {
        routedIoEvidence = loadRoutedIoEvidence();
      } catch {
        errors.push("could not load data/governance/routed-io-evidence.json needed to regenerate technology profiles");
      }
      if (routedIoEvidence) {
        errors.push(...technologyProfilesDriftErrors(committed.records, competitor, wyrestorm, routedIoEvidence));
      }
    }
  }

  return errors;
}

// CLI ----------------------------------------------------------------------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkGeneratedManifestDrift();
  if (errors.length) {
    for (const error of errors) console.error(`[generated-manifests] ${error}`);
    console.error("[generated-manifests] FAIL - committed generated manifests drifted from their source files.");
    process.exit(1);
  }
  console.log("[generated-manifests] OK - both tracked generated manifests match their committed sources.");
}
