#!/usr/bin/env node
/**
 * Competitor catalogue rows age on the same clock as a confirmed WyreStorm profile.
 *
 * A competitor row is quoted evidence: a rep lifts its ports, resolution or
 * transport into a comparison against a WyreStorm product, and the proposal can
 * then carry that claim to a customer. `lastReviewed` is when a person last read
 * the manufacturer's page for that model, so the age of that date is the age of
 * the argument. Nothing else in the tree reads it — `check:enrichment-freshness`
 * asks how many rows were enriched in the last week, which is a throughput
 * question and goes quiet on a catalogue nobody is enriching.
 *
 * The clock is `data/governance/profile-confirmation-aging.json`, the file the
 * WyreStorm technical-data gate already reads for its verified profiles, so the
 * two surfaces cannot drift into holding evidence to different ages. This gate
 * reads only the evidence half of that policy: `verifiedEvidenceWarnAfterDays`
 * and `verifiedEvidenceFailAfterDays`. The confirmation half (`warnAfterDays`,
 * `failAfterDays`) is about a human confirming a machine transcription, which a
 * competitor row never goes through.
 *
 * The bands are deliberately different in shape. Over the fail limit is reported
 * one row at a time, because each one is a datasheet someone has to open, and the
 * failure names the source CSV to edit. Over the warn limit is reported as a
 * count and the oldest few, because a warn line per row on a catalogue that
 * needs its first full pass is a wall of text a reader skips — the backlog is real
 * and one number states it.
 *
 * `tools/wingman-competitor-evidence-aging-baseline.json` is a ratchet, not a
 * waiver list. It pins the rows that were already past the limit when the clock
 * was introduced, and it fails in four directions so it can only shrink:
 * an unpinned row over the limit, a pinned row that is no longer in the
 * catalogue, a pinned row that has come back inside the clock, and a pin whose
 * recorded review date disagrees with the row. A pinned row that is re-reviewed
 * still past the limit keeps its pin with the new date; that is a real page read
 * and the ratchet records it rather than pretending it did not happen.
 *
 * Usage:
 *   node tools/check-competitor-evidence-aging.mjs
 *   node tools/check-competitor-evidence-aging.mjs --update-baseline
 *
 * `--update-baseline` writes the pins from the current catalogue. It is the tool
 * for a deliberate re-pin (a row re-read and still old), never a way past a red
 * run: a row that is over the limit because nobody has read its page belongs on
 * the list only with that reason recorded.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

const CATALOG_FILE =
  process.env.WINGMAN_COMPETITOR_CATALOG || path.join(ROOT, "data/catalog/competitor-products.generated.json");
const AGING_POLICY_FILE =
  process.env.WINGMAN_PROFILE_AGING_POLICY || path.join(ROOT, "data/governance/profile-confirmation-aging.json");
const BASELINE_FILE =
  process.env.WINGMAN_COMPETITOR_AGING_BASELINE ||
  path.join(ROOT, "tools/wingman-competitor-evidence-aging-baseline.json");
const REPORT_FILE =
  process.env.WINGMAN_COMPETITOR_AGING_REPORT || path.join(ROOT, "reports/competitor-evidence-aging.json");

const DAY_MS = 24 * 60 * 60 * 1000;

function readJson(file, label) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read the ${label} at ${path.relative(ROOT, file)}: ${error.message}`);
  }
}

function today(now = process.env.WINGMAN_AGING_NOW) {
  if (now) {
    const parsed = new Date(now);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`WINGMAN_AGING_NOW is not a date: ${now}`);
    }
    return parsed;
  }
  return new Date();
}

/** Whole days between the review date and now; a future date is a data error, not a negative age. */
export function ageInDays(reviewedOn, at) {
  const reviewed = Date.parse(reviewedOn);
  if (Number.isNaN(reviewed)) return null;
  return Math.floor((at.getTime() - reviewed) / DAY_MS);
}

function policyDays(policy) {
  const warn = Number(policy?.verifiedEvidenceWarnAfterDays);
  const fail = Number(policy?.verifiedEvidenceFailAfterDays);
  if (!Number.isFinite(warn) || !Number.isFinite(fail) || warn <= 0 || fail < warn) {
    throw new Error(
      "profile-confirmation-aging.json must carry verifiedEvidenceWarnAfterDays and " +
        `verifiedEvidenceFailAfterDays with fail >= warn > 0 (saw ${warn} / ${fail}).`,
    );
  }
  return { warnAfterDays: warn, failAfterDays: fail };
}

/**
 * The reading. Pure: the gate below owns files and exit codes, the spec owns
 * fixtures, and both ask this one function so a passing spec proves the gate.
 */
export function auditCompetitorEvidenceAging({ rows, baseline, policy, at }) {
  const { warnAfterDays, failAfterDays } = policyDays(policy);
  const pins = Array.isArray(baseline?.rows) ? baseline.rows : [];
  const pinnedBySku = new Map();
  const failures = [];

  for (const pin of pins) {
    const sku = String(pin?.sku || "").trim();
    if (!sku) {
      failures.push("The baseline holds a pin with no SKU, so nothing can be aged against it.");
      continue;
    }
    if (pinnedBySku.has(sku)) {
      failures.push(`${sku} is pinned twice in the baseline; keep one row per SKU.`);
      continue;
    }
    pinnedBySku.set(sku, pin);
  }

  const seen = new Set();
  const aged = [];

  for (const row of rows) {
    const sku = String(row?.sku || row?.model || "").trim();
    if (!sku) {
      failures.push(`A competitor row in ${row?.sourceFile || "the catalogue"} has no SKU.`);
      continue;
    }
    seen.add(sku);
    const reviewedOn = String(row?.lastReviewed || "").trim();
    const age = ageInDays(reviewedOn, at);
    if (age === null) {
      failures.push(
        `${sku} has no readable lastReviewed date (saw "${reviewedOn}"), so its evidence has no age to hold it to.`,
      );
      continue;
    }
    if (age < 0) {
      failures.push(`${sku} records a review date in the future (${reviewedOn}); correct the source row.`);
      continue;
    }
    aged.push({
      sku,
      manufacturer: row?.manufacturer || row?.brand || "",
      reviewedOn,
      ageDays: age,
      sourceFile: row?.sourceFile || "",
      pinned: pinnedBySku.has(sku),
    });
  }

  const overLimit = aged.filter((row) => row.ageDays > failAfterDays);
  const overWarn = aged.filter((row) => row.ageDays > warnAfterDays);

  for (const row of overLimit) {
    if (row.pinned) continue;
    failures.push(
      `${row.sku}${row.manufacturer ? ` (${row.manufacturer})` : ""} was last reviewed ${row.reviewedOn} — ` +
        `${row.ageDays} days, past the ${failAfterDays}-day evidence limit. ` +
        `Re-read the manufacturer's page and update last_reviewed in ${row.sourceFile || "its competitor source"}.`,
    );
  }

  for (const [sku, pin] of pinnedBySku) {
    const row = aged.find((entry) => entry.sku === sku);
    if (!row) {
      failures.push(
        `The baseline pins ${sku}, which the competitor catalogue no longer carries. ` +
          "Remove the pin so the allowance only ever shrinks.",
      );
      continue;
    }
    if (row.ageDays <= failAfterDays) {
      failures.push(
        `${sku} is pinned as overdue but sits at ${row.ageDays} days, inside the ${failAfterDays}-day limit. ` +
          "Remove the pin now that the evidence has been re-read.",
      );
      continue;
    }
    const pinnedDate = String(pin.reviewedOn || "").trim();
    if (pinnedDate && pinnedDate !== row.reviewedOn) {
      failures.push(
        `${sku} is pinned as reviewed on ${pinnedDate} but the catalogue says ${row.reviewedOn}. ` +
          "Update the pin to the date that was actually read, or drop it.",
      );
    }
  }

  const oldest = [...overWarn].sort((left, right) => right.ageDays - left.ageDays);
  const fresh = aged.length - overWarn.length;

  return {
    warnAfterDays,
    failAfterDays,
    totals: {
      rows: aged.length,
      overWarn: overWarn.length,
      overLimit: overLimit.length,
      pinned: pinnedBySku.size,
      insideWarn: fresh,
      oldestAgeDays: oldest[0]?.ageDays ?? null,
    },
    overLimit: [...overLimit].sort((left, right) => right.ageDays - left.ageDays),
    oldestOverWarn: oldest.slice(0, 5),
    failures,
  };
}

function describe(result) {
  const { totals } = result;
  console.log(
    `Competitor evidence aging: ${totals.rows} rows, ${totals.overWarn} past ${result.warnAfterDays} days, ` +
      `${totals.overLimit} past ${result.failAfterDays} days, ${totals.pinned} pinned.`,
  );
  if (totals.overWarn > 0) {
    console.warn(
      `Review line: ${totals.overWarn} of ${totals.rows} competitor rows have not been read ` +
        `in ${result.warnAfterDays} days; the oldest is ${totals.oldestAgeDays} days old ` +
        `(${result.oldestOverWarn.map((row) => `${row.sku} ${row.ageDays}d`).join(", ")}).`,
    );
  }
}

function writeReport(result) {
  const report = {
    generatedAt: new Date().toISOString(),
    policy: {
      source: path.relative(ROOT, AGING_POLICY_FILE),
      warnAfterDays: result.warnAfterDays,
      failAfterDays: result.failAfterDays,
    },
    totals: result.totals,
    overLimit: result.overLimit.map(({ sku, manufacturer, reviewedOn, ageDays, sourceFile, pinned }) => ({
      sku,
      manufacturer,
      reviewedOn,
      ageDays,
      sourceFile,
      pinned,
    })),
    oldestOverWarn: result.oldestOverWarn,
    failures: result.failures,
  };
  fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
  fs.writeFileSync(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${path.relative(ROOT, REPORT_FILE)}.`);
}

function writeBaseline(result) {
  const baseline = {
    version: 1,
    establishedAt: new Date().toISOString().slice(0, 10),
    failAfterDays: result.failAfterDays,
    purpose:
      "Competitor rows that were already past the evidence clock when it was introduced. " +
      "The list only shrinks: a row leaves when its page is re-read and lastReviewed moves inside the limit, " +
      "and a row that is still old after a real read keeps its pin with that read's date.",
    rows: result.overLimit.map(({ sku, manufacturer, reviewedOn, ageDays, sourceFile }) => ({
      sku,
      manufacturer,
      reviewedOn,
      ageDaysWhenPinned: ageDays,
      sourceFile,
    })),
  };
  fs.writeFileSync(BASELINE_FILE, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`Wrote ${path.relative(ROOT, BASELINE_FILE)} with ${baseline.rows.length} pins.`);
}

function main() {
  const updateBaseline = process.argv.includes("--update-baseline");
  const at = today();
  const catalog = readJson(CATALOG_FILE, "competitor catalogue");
  const policy = readJson(AGING_POLICY_FILE, "profile confirmation aging policy");
  const baseline = fs.existsSync(BASELINE_FILE) ? readJson(BASELINE_FILE, "competitor evidence aging baseline") : null;

  const rows = Array.isArray(catalog) ? catalog : Array.isArray(catalog?.products) ? catalog.products : null;
  if (!rows) {
    throw new Error(`${path.relative(ROOT, CATALOG_FILE)} does not hold an array of competitor rows.`);
  }
  if (!baseline && !updateBaseline) {
    throw new Error(
      `No baseline at ${path.relative(ROOT, BASELINE_FILE)}. Run with --update-baseline once, ` +
        "and review that every pinned row really is a page nobody has read since.",
    );
  }

  const result = auditCompetitorEvidenceAging({ rows, baseline, policy, at });
  describe(result);
  writeReport(result);

  if (updateBaseline) {
    writeBaseline(result);
    return;
  }

  if (result.failures.length > 0) {
    console.error(`\n${result.failures.length} competitor evidence aging failure(s):`);
    for (const failure of result.failures) console.error(`  - ${failure}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`Competitor evidence aging check stopped: ${error.message}`);
    process.exitCode = 1;
  }
}
