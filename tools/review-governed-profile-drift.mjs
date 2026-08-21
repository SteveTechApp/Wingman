/**
 * Governed-profile drift review (repeatable).
 *
 * Cross-checks each governed WyreStorm profile's spec-critical fields (max
 * resolution, routed I/O, power) against the source-controlled canonical
 * product store (data/wingman-canonical-product-store.json), which was built
 * from live official product pages. Also flags internal contradictions (e.g.
 * matrixSize vs declared counts) and profiles with no store entry at all.
 *
 * Output: reports/governed-profile-drift.json + a ranked table on stdout.
 * The ranking is the input to the human review pass: the highest-drift
 * profiles are the ones a reviewer must verify against official pages first.
 *
 * Usage: node tools/review-governed-profile-drift.mjs [--strict]
 *
 * --strict turns the review into a gate: exits non-zero if any profile has
 * field drift or internal contradictions (the defects a confirmation pass
 * could introduce), or if a human-verified profile carries a max-resolution
 * value the review cannot classify (a confirmed value must stay
 * machine-readable). Missing values and missing store evidence stay
 * informational - they are the normal awaiting-data-work state.
 *
 * Env overrides (for hermetic validation): WINGMAN_PROFILES_FILE,
 * WINGMAN_STORE_FILE.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROFILES_FILE = process.env.WINGMAN_PROFILES_FILE ?? path.join(root, "data/governance/wyrestorm-technical-profiles.json");
const STORE_FILE = process.env.WINGMAN_STORE_FILE ?? path.join(root, "data/wingman-canonical-product-store.json");
const STRICT = process.argv.includes("--strict");
const REPORT_FILE = path.join(root, "reports/governed-profile-drift.json");

const RESOLUTION_FAMILIES = [
  { family: "8K", pattern: /7680|8k/i },
  { family: "4K60-4096", pattern: /4096x2160/i },
  { family: "4K60-3840", pattern: /3840x2160p?\s*(?:@|at)?\s*60|4k\s*(?:@|at)?\s*60|4k60/i },
  { family: "4K30-3840", pattern: /3840x2160p?\s*(?:@|at)?\s*30|4k\s*(?:@|at)?\s*30|4k30/i },
  // 5K-wide (5120x2160) sits AFTER 4K so a multi-resolution value like
  // "4096x2160p @60Hz; 5120x2160 @30Hz" classifies by its primary 4K60 line,
  // not the stretched-ultrawide bonus mode.
  { family: "5K60", pattern: /5120x2160p?\s*(?:@|at)?\s*60|5k60/i },
  { family: "5K30", pattern: /5120x2160p?\s*(?:@|at)?\s*30|5k30/i },
  // Bare pixel counts without a refresh rate ("3840x2160 (4K UHD passthrough)")
  // and the "4K UHD" phrasing that stands in for the same pixel count.
  { family: "4K", pattern: /3840x2160|4096x2160|4k\s*uhd/i },
  { family: "WXGA", pattern: /1280x800/i },
  { family: "1080p60", pattern: /1920x1080p?\s*(?:@|at)?\s*60|1080p60/i },
  { family: "1080p", pattern: /1920x1080|1080p/i },
];

function text(value) {
  return String(value ?? "").trim();
}

export function resolutionFamily(value) {
  const normalized = text(value);
  for (const entry of RESOLUTION_FAMILIES) {
    if (entry.pattern.test(normalized)) return entry.family;
  }
  return null;
}

function isPlaceholder(value) {
  return /not yet confirmed|must be confirmed|verify datasheet|to be confirmed|confirm source count|requires verification|not available/i.test(text(value));
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function storeBySku(store) {
  const map = new Map();
  for (const product of store.products ?? []) {
    const sku = text(product.sku).toUpperCase();
    if (sku) map.set(sku, product);
  }
  return map;
}

function normalizeResolutionList(storeEntry) {
  const list = storeEntry?.technicalProfile?.video?.maxResolutions;
  return Array.isArray(list) ? list : [];
}

export function maxResolutionDrift(profile, storeEntry) {
  const governed = text(profile.maxResolution);
  if (!governed || isPlaceholder(governed)) {
    return { status: "missing", detail: "No readable max resolution in the governed profile" };
  }
  if (!storeEntry) {
    return { status: "no-source", detail: `No canonical store entry for ${profile.sku}` };
  }
  const snippets = normalizeResolutionList(storeEntry);
  if (snippets.length === 0) {
    return { status: "no-source", detail: "Canonical store has no max-resolution evidence" };
  }
  const governedFamily = resolutionFamily(governed);
  const snippetText = snippets.join(" ");
  const storeFamilies = RESOLUTION_FAMILIES.filter((entry) => entry.pattern.test(snippetText)).map((entry) => entry.family);
  if (!governedFamily) {
    return { status: "unparseable", detail: `Cannot classify governed resolution "${governed}"` };
  }
  if (storeFamilies.length === 0) {
    // The store carries no resolution-classifiable evidence for this product
    // (page-level OCR noise such as "4K Audio Format MP3/WMA"). Nothing can be
    // adjudicated from it - informational, like a missing store entry.
    return { status: "no-source", detail: "Store max-resolution evidence is not resolution-classifiable" };
  }
  if (storeFamilies.includes(governedFamily)) {
    // Chroma is deliberately NOT compared: the store's maxResolutions are raw
    // page-level OCR snippets, and one official page legitimately lists several
    // chroma modes (e.g. 4:2:2 HDR10 and 4:4:4) for the same product.
    return { status: "agree", detail: `${governedFamily} matches store evidence` };
  }
  // Overlapping family bands are unverifiable from page-level OCR and need a
  // live page - classify as partial, not hard drift: 4096 vs 3840 within 4K60,
  // and 5K-wide modes on the same 4K60 product (a 5120x2160@30 device also
  // does 4K60, and vice versa).
  const fourK60 = /^4K60/;
  const fiveK = /^5K/;
  if (
    (fourK60.test(governedFamily) && storeFamilies.some((family) => fourK60.test(family) || fiveK.test(family))) ||
    (fiveK.test(governedFamily) && storeFamilies.some((family) => fourK60.test(family) || fiveK.test(family)))
  ) {
    return {
      status: "partial",
      detail: `${governedFamily} vs store ${storeFamilies.join("/")} - 4K60/5K overlap, needs live-page adjudication`,
    };
  }
  return {
    status: "drift",
    detail: `Governed "${governedFamily}" vs store ${storeFamilies.join("/") || "no resolution evidence"}`,
  };
}

function ioDrift(profile, storeEntry) {
  const governedIn = Number(profile.inputCount);
  const governedOut = Number(profile.outputCount);
  if (!(governedIn > 0) || !(governedOut > 0)) {
    return { status: "missing", detail: "No explicit I/O counts in the governed profile" };
  }
  if (!storeEntry) {
    return { status: "no-source", detail: `No canonical store entry for ${profile.sku}` };
  }
  const storeIn = Number(storeEntry.routedInputCount);
  const storeOut = Number(storeEntry.routedOutputCount);
  if (!(storeIn > 0) || !(storeOut > 0)) {
    return { status: "no-source", detail: "Canonical store has no routed I/O counts" };
  }
  if (storeIn === governedIn && storeOut === governedOut) {
    return { status: "agree", detail: `${governedIn} in / ${governedOut} out matches store` };
  }
  return {
    status: "drift",
    detail: `Governed ${governedIn} in / ${governedOut} out vs store ${storeIn} in / ${storeOut} out`,
  };
}

function powerDrift(profile, storeEntry) {
  const governedNotes = Array.isArray(profile.power) ? profile.power.map(text).filter(Boolean) : [];
  const specs = profile.specs ?? {};
  const hasGovernedPower =
    governedNotes.length > 0 ||
    ["poe", "poh", "poc", "internalPsu", "externalPsu", "powerSupply"].some((key) => {
      const value = specs[key];
      return value !== undefined && value !== null && text(value) !== "" && value !== false;
    });
  if (!hasGovernedPower) {
    return { status: "missing", detail: "No power facts in the governed profile" };
  }
  if (!storeEntry) {
    return { status: "no-source", detail: `No canonical store entry for ${profile.sku}` };
  }
  const storePower = storeEntry.technicalProfile?.power;
  if (!storePower || (Array.isArray(storePower.evidence) && storePower.evidence.length === 0)) {
    return { status: "no-source", detail: "Canonical store has no power evidence" };
  }
  const poeNotes = governedNotes.join(" ");
  // "No PoE or PoH" must not count as a PoE claim.
  const governedClaimsPoe =
    (/\bpoe\b|\bpoh\b|\bpoc\b/i.test(poeNotes) && !/no poe|no poh|no poc|without poe/i.test(poeNotes)) ||
    Boolean(specs.poe || specs.poh || specs.poc);
  // Only the explicit poe/poh/poc booleans count: the store's powerDelivery
  // flag is also set by USB-C PD3.0 charging, which is not PoE on the ports.
  const storeClaimsPoe = Boolean(storePower.poe || storePower.poh || storePower.poc);
  if (governedClaimsPoe !== storeClaimsPoe) {
    return {
      status: "drift",
      detail: `Governed ${governedClaimsPoe ? "claims" : "does not claim"} PoE vs store ${storeClaimsPoe ? "claims" : "does not claim"} PoE`,
    };
  }
  return { status: "agree", detail: "Power facts present and PoE state agrees with store" };
}

function internalContradictions(profile) {
  const problems = [];
  const matrix = text(profile.matrixSize);
  const match = matrix.match(/^(\d+)\s*[xX]\s*(\d+)$/);
  if (match) {
    const matrixIn = Number(match[1]);
    const matrixOut = Number(match[2]);
    if (Number(profile.inputCount) > 0 && Number(profile.inputCount) !== matrixIn) {
      problems.push(`matrixSize ${matrix} contradicts inputCount ${profile.inputCount}`);
    }
    if (Number(profile.outputCount) > 0 && Number(profile.outputCount) !== matrixOut) {
      problems.push(`matrixSize ${matrix} contradicts outputCount ${profile.outputCount}`);
    }
  }
  return problems;
}

function main() {
  const profiles = readJson(PROFILES_FILE, { profiles: [] }).profiles ?? [];
  const store = readJson(STORE_FILE, { products: [] });
  const bySku = storeBySku(store);

  const rows = profiles.map((profile) => {
    const sku = text(profile.sku);
    const storeEntry = bySku.get(sku.toUpperCase());
    const maxRes = maxResolutionDrift(profile, storeEntry);
    const io = ioDrift(profile, storeEntry);
    const power = powerDrift(profile, storeEntry);
    const contradictions = internalContradictions(profile);

    const drifted = [maxRes, io, power].filter((field) => field.status === "drift").length;
    const partial = [maxRes, io, power].filter((field) => field.status === "partial").length;
    const score = drifted * 3 + partial + contradictions.length + [maxRes, io, power].filter((field) => field.status === "missing").length;

    return {
      sku,
      productClass: text(profile.productClass) || "Unknown",
      status: text(profile.status),
      score,
      drifted,
      contradictions,
      fields: { maxResolution: maxRes, io, power },
    };
  });

  rows.sort((a, b) => b.score - a.score || a.sku.localeCompare(b.sku));

  fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2), "utf8");

  console.log(`Drift review: ${rows.length} governed profiles checked against the canonical store.`);
  console.log(`Report: ${REPORT_FILE}\n`);
  const header = "SCORE  DRIFT  SKU                  CLASS                 FINDINGS";
  console.log(header);
  console.log("-".repeat(header.length));
  for (const row of rows.slice(0, 30)) {
    const findings = [
      ...(row.drifted > 0 ? [`${row.drifted} field(s) drifted`] : []),
      ...row.contradictions,
    ].join("; ") || "clean";
    console.log(
      `${String(row.score).padStart(5)}  ${String(row.drifted).padStart(5)}  ${row.sku.padEnd(20)} ${row.productClass.padEnd(22)} ${findings}`,
    );
  }
  const summary = {
    total: rows.length,
    clean: rows.filter((row) => row.score === 0).length,
    drifted: rows.filter((row) => row.drifted > 0).length,
    missingField: rows.filter((row) => ["maxResolution", "io", "power"].some((key) => row.fields[key].status === "missing")).length,
    noSource: rows.filter((row) => ["maxResolution", "io", "power"].some((key) => row.fields[key].status === "no-source")).length,
  };
  console.log(`\nSummary: ${summary.total} total | ${summary.clean} clean | ${summary.drifted} with field drift | ${summary.missingField} missing a spec-critical value | ${summary.noSource} lacking store evidence`);

  if (STRICT) {
    const drifted = rows.filter((row) => row.drifted > 0 || row.contradictions.length > 0);
    const unparseableVerified = rows.filter(
      (row) => row.status === "verified" && row.fields.maxResolution?.status === "unparseable",
    );
    const offenders = [...drifted, ...unparseableVerified];
    if (offenders.length > 0) {
      console.error(`\n[drift --strict] FAIL: ${offenders.length} profile(s) with field drift, contradictions, or unparseable verified values:`);
      for (const row of offenders) {
        const problems = [
          row.drifted > 0 ? `${row.drifted} drifted field(s)` : null,
          ...row.contradictions,
          row.fields.maxResolution?.status === "unparseable" ? `unparseable max resolution ("${row.fields.maxResolution.detail}")` : null,
        ].filter(Boolean);
        console.error(`  - ${row.sku}: ${problems.join("; ")}`);
      }
      process.exit(1);
    }
    console.log("[drift --strict] PASS: no field drift, contradictions, or unparseable verified values.");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
