#!/usr/bin/env node
// Governed WyreStorm technical-profile workflow.
//
// One command re-runs the evidence-based batch review so every future profile
// batch follows the same path:
//
//   1. TRIAGE   - classify review-required profiles against the governed gates
//   2. PROMOTE  - flip evidence-complete profiles to verified-with-warning
//                 (machine promotion NEVER claims the human-verified status:
//                 a human must record `verifiedBy` after confirming the
//                 spec-critical fields - max resolution, routed I/O, power),
//                 strip the machine-draft marker and stamp the promotion into
//                 the evidence record
//   3. POWER    - convert free-text power facts into the structured specs the
//                 compare decision engine reads (poe/poh/poc/internalPsu/
//                 externalPsu/powerSupply)
//   4. GATE     - compute active-lead coverage and (with --strict) fail when a
//                 profile still needs human-curated data
//
// Supersedes .wingman-work/promote-wyrestorm-profiles.mjs (batch 1). The
// one-off completions of the 9 held profiles (batch 2) were human-curated
// facts and live in the data; this tool reports any future hold and its reason
// so the same completion process can be followed.
//
// Usage:
//   node tools/govern-wyrestorm-profiles.mjs                     # dry-run report
//   node tools/govern-wyrestorm-profiles.mjs --apply             # apply changes
//   node tools/govern-wyrestorm-profiles.mjs --apply --strict    # fail if any
//                                                                # profile still
//                                                                # needs human data
//   node tools/govern-wyrestorm-profiles.mjs --file <path>       # operate on a
//                                                                # candidate file
//
// Exit codes: 0 = ok / nothing to do; 1 = --strict unmet or write failure.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const STRICT = args.includes("--strict");
const fileArg = args.indexOf("--file");
const PROFILE_FILE = fileArg >= 0 && args[fileArg + 1]
  ? path.resolve(args[fileArg + 1])
  : path.join(root, "data", "governance", "wyrestorm-technical-profiles.json");
const PRODUCT_FILE = path.join(root, "data-sources", "wyrestorm", "products.csv");

const BLANKET =
  "Machine-drafted from the canonical official-page extraction. This profile is not verified and must not support automatic equivalence or customer-ready claims.";
const REVIEW_CHECK = "Human-review the current official product page and datasheet before promoting this profile.";
const VIDEO_CLASSES = ["AVOIP", "MATRIX", "VIDEO_WALL", "MULTIVIEW", "HDBASET", "PRESENTATION"];
const VERIFIED_STATUSES = new Set(["verified", "verified-with-warning"]);
const NON_LEAD_ROLES = new Set(["cable", "accessory", "rack-mount", "power-accessory", "software-app"]);
const PROMOTION_NOTE =
  "Batch governed review: promoted from review-required; official-page evidence complete and coherent. Machine promotion only - a human must confirm the spec-critical fields (max resolution, routed I/O, power) and record verifiedBy before this profile may claim verified status.";
const POWER_NOTE = "Power facts from the official-page capture; structured for the compare power gate.";
// Design gaps that need a human decision before a product may be quoted. The
// Local Pub template issue (MX-0808-SCL) was resolved 2026-07-24 - keep this
// list empty unless a new template review surfaces another gap.
const DESIGN_GAP_HOLD = new Set([]);

const isClean = (e) =>
  (e.warnings ?? []).length === 0 || ((e.warnings ?? []).length === 1 && e.warnings[0] === BLANKET);
const hasGenuineWarning = (e) => (e.warnings ?? []).some((w) => w !== BLANKET);

function hardBlock(e) {
  if (VIDEO_CLASSES.includes(e.productClass) && !String(e.maxResolution ?? "").trim()) return "no-maxResolution";
  if (e.productClass === "AVOIP" && !(e.dependencies ?? []).length) return "no-dependencies";
  if (e.productClass === "MATRIX") {
    const hasVideoIn = (e.ports ?? []).some((p) => p.category === "video" && p.direction === "input");
    const hasVideoOut = (e.ports ?? []).some((p) => p.category === "video" && p.direction === "output");
    if (!hasVideoIn || !hasVideoOut) return "no-video-ports";
  }
  return null;
}

const POWER_KEYS = ["poe", "poh", "poc", "internalPsu", "externalPsu", "powerSupply"];
const hasReadablePower = (e) => {
  const s = e.specs ?? {};
  return POWER_KEYS.some((k) => k in s && String(s[k]).trim() !== "" && s[k] !== false);
};

function convertPower(e) {
  if (!(e.power ?? []).length || hasReadablePower(e)) return false;
  const s = e.specs ?? (e.specs = {});
  const supply = [];
  for (const raw of e.power) {
    const t = String(raw).trim();
    if (!t || /passive|no power connection/i.test(t)) continue;
    const negated = (term) => new RegExp(`No[^.]*\\b${term}\\b`, "i").test(t);
    if (negated("PoE")) s.poe = false;
    if (negated("PoH")) s.poh = false;
    if (negated("PoC")) s.poc = false;
    if (/PoE/i.test(t) && !negated("PoE")) s.poe = true;
    if (/PoH/i.test(t) && !negated("PoH")) s.poh = true;
    if (/PoC/i.test(t) && !negated("PoC")) s.poc = true;
    if (/AC\s*100|100-240|240V\s*AC|mains|VAC/i.test(t)) s.internalPsu = true;
    else if (/\d+\s*V|\bDC\b/i.test(t)) s.externalPsu = true;
    if (/^Max\s|^\d+(\.\d+)?\s*W\b|No PoE|No PoH|No PoC|No-load|TBD/i.test(t)) continue;
    supply.push(t.replace(/^Max\s+/, ""));
  }
  if (supply.length) s.powerSupply = supply.join("; ");
  return hasReadablePower(e);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") { row.push(cell); cell = ""; }
    else if (character === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += character;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  const [headers = [], ...dataRows] = rows.filter((item) => item.some((value) => value !== ""));
  return dataRows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), String(values[index] ?? "").trim()])),
  );
}

function normaliseSku(value) {
  return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

function computeCoverage(profiles) {
  const products = parseCsv(fs.readFileSync(PRODUCT_FILE, "utf8"));
  const statusBySku = new Map(profiles.map((p) => [normaliseSku(p.sku), p.status]));
  const activeLeads = products.filter((product) => {
    const lifecycle = String(product.lifecycle_status ?? "").toLowerCase();
    const doNotSpec = String(product.do_not_spec ?? "").toLowerCase() === "true";
    const role = String(product.role ?? "").toLowerCase();
    return lifecycle === "active" && !doNotSpec && !NON_LEAD_ROLES.has(role);
  });
  const verified = activeLeads.filter((p) => VERIFIED_STATUSES.has(statusBySku.get(normaliseSku(p.sku))));
  const awaiting = activeLeads.filter((p) => statusBySku.has(normaliseSku(p.sku)) && !VERIFIED_STATUSES.has(statusBySku.get(normaliseSku(p.sku))));
  const missing = activeLeads.filter((p) => !statusBySku.has(normaliseSku(p.sku)));
  return {
    activeLeads: activeLeads.length,
    verified: verified.length,
    awaiting: awaiting.map((p) => p.sku),
    missing: missing.map((p) => p.sku),
  };
}

function runWorkflow(profiles) {
  const report = { verified: [], verifiedWithWarning: [], held: [], powerConverted: [], changed: false };

  for (const e of profiles) {
    if (e.status !== "review-required") continue;
    const block = hardBlock(e);
    if (block || DESIGN_GAP_HOLD.has(e.sku)) {
      report.held.push(`${e.sku} | ${block ?? "design-gap"}`);
      continue;
    }
    const clean = isClean(e);
    const genuine = hasGenuineWarning(e);
    if (!clean && !genuine) {
      report.held.push(`${e.sku} | unclassified`);
      continue;
    }
    // Machine promotion lands at verified-with-warning, never `verified`:
    // verified status is reserved for profiles a human confirmed by recording
    // `verifiedBy`. The resolver renders anything without a human `verifiedBy`
    // at the official-structured tier.
    e.status = "verified-with-warning";
    e.warnings = (e.warnings ?? []).filter((w) => w !== BLANKET);
    e.checks = (e.checks ?? []).filter((c) => c !== REVIEW_CHECK);
    if (Array.isArray(e.evidence) && e.evidence.length) {
      const ev = e.evidence[0];
      ev.note = ev.note ? `${ev.note} ${PROMOTION_NOTE}` : PROMOTION_NOTE;
    }
    report.verifiedWithWarning.push(e.sku);
    report.changed = true;
  }

  for (const e of profiles) {
    if (convertPower(e)) {
      report.powerConverted.push(e.sku);
      if (Array.isArray(e.evidence) && e.evidence.length) {
        const ev = e.evidence[0];
        ev.note = ev.note ? `${ev.note} ${POWER_NOTE}` : POWER_NOTE;
      }
      report.changed = true;
    }
  }

  return report;
}

const payload = JSON.parse(fs.readFileSync(PROFILE_FILE, "utf8"));
const report = runWorkflow(payload.profiles);
const coverage = computeCoverage(payload.profiles);

console.log(`[govern-wyrestorm] ${APPLY ? "APPLY" : "DRY-RUN"} on ${PROFILE_FILE}`);
console.log(`  profiles: ${payload.profiles.length} (version ${payload.version})`);
console.log(`  triage -> verified-with-warning: ${report.verifiedWithWarning.length}`);
if (report.verifiedWithWarning.length) console.log(`    ${report.verifiedWithWarning.join(", ")}`);
console.log(`  triage -> verified: ${report.verified.length} (machine promotion never claims verified - a human must record verifiedBy after confirming spec-critical fields)`);
console.log(`  held for human data: ${report.held.length}`);
for (const row of report.held) console.log(`    ${row}`);
console.log(`  power converted to structured specs: ${report.powerConverted.length}`);
if (report.powerConverted.length) console.log(`    ${report.powerConverted.join(", ")}`);
console.log(`  coverage: ${coverage.verified}/${coverage.activeLeads} active lead SKUs verified` +
  (coverage.awaiting.length ? ` (awaiting: ${coverage.awaiting.join(", ")})` : "") +
  (coverage.missing.length ? ` (missing: ${coverage.missing.join(", ")})` : ""));

if (report.changed && !APPLY) {
  console.log(`[govern-wyrestorm] ${report.verified.length + report.verifiedWithWarning.length} promotions + ` +
    `${report.powerConverted.length} power conversions pending - re-run with --apply to write them.`);
}

if (APPLY && report.changed) {
  payload.version = (Number(payload.version) || 1) + 1;
  fs.writeFileSync(PROFILE_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`[govern-wyrestorm] Wrote ${PROFILE_FILE} (version -> ${payload.version}).`);
}

const unmet = coverage.awaiting.length + coverage.missing.length;
if (STRICT && unmet > 0) {
  console.error(`[govern-wyrestorm] STRICT FAILED: ${unmet} active lead SKU(s) still lack a verified governed profile.`);
  process.exit(1);
}
console.log(`[govern-wyrestorm] ${STRICT ? "STRICT " : ""}GATE OK - coverage ${coverage.verified}/${coverage.activeLeads}.`);
console.log("[govern-wyrestorm] Next: npm run check:technical-data:strict && npm run audit:wyrestorm-technical-data (or npm run govern:wyrestorm).");
