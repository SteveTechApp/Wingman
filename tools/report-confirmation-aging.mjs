#!/usr/bin/env node
// Confirmation-aging reporter (nightly early-warning lane).
//
// The confirmation-aging gate inside tools/check-wyrestorm-technical-data.mjs
// hard-fails a merge once a machine-transcribed profile sits past the FAIL
// threshold (default 30 days). That is the enforcement lever - but by the
// time it fires, the backlog has been silently aging for a month. This
// reporter posts the same counts NIGHTLY (WyreStorm Evidence Freshness
// workflow) so a recurring backlog is caught at the WARN threshold (14 days)
// while there is still more than two weeks of lead time before any merge
// can go red.
//
// Report-only by design: it always exits 0 on readable inputs (a red report
// job would just be noise next to the real gates), emits ::warning::
// annotations when the backlog is non-zero so it surfaces on the run, and
// publishes count outputs the workflow renders into its run-summary table.
// It mirrors the gate's computation (machine-tier filter, newest-evidence
// age, null-age-counts-as-overdue) from the same shared sources - the
// profiles file and data/governance/profile-confirmation-aging.json - so a
// report and a gate run over the same data can never disagree.
//
// Usage:
//   node tools/report-confirmation-aging.mjs                  # human text
//   node tools/report-confirmation-aging.mjs --github-output  # GITHUB_OUTPUT k=v pairs
//   node tools/report-confirmation-aging.mjs --summary        # markdown table row fragment
//
// Env overrides (for hermetic validation): WINGMAN_PROFILES_FILE,
// WINGMAN_AGING_CONFIG.

import { appendFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROFILES_FILE =
  process.env.WINGMAN_PROFILES_FILE ?? path.join(root, "data", "governance", "wyrestorm-technical-profiles.json");
const AGING_CONFIG_FILE =
  process.env.WINGMAN_AGING_CONFIG ?? path.join(root, "data", "governance", "profile-confirmation-aging.json");

const DAY_MS = 86_400_000;

/**
 * Pure core of the reporter: the confirmation-aging buckets for a profiles
 * payload, with the same semantics as the merge-blocking gate - only
 * machine-tier profiles (review-required / verified-with-warning) age, the
 * age is the newest evidence timestamp, and an undatable profile counts as
 * overdue because its freshness cannot be verified. `now` is injectable so
 * tests can pin the calendar.
 */
export function assessConfirmationAging(payload, config, now = new Date()) {
  const warnAfterDays = Number(config?.warnAfterDays) || 14;
  const failAfterDays = Number(config?.failAfterDays) || 30;

  function profileAgeDays(profile) {
    let newest = "";
    for (const evidence of profile?.evidence ?? []) {
      const date = String(evidence?.reviewedOn ?? "").trim() || String(evidence?.checkedAt ?? "").slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && date > newest) newest = date;
    }
    if (!newest) return null;
    const age = Math.floor((now.getTime() - Date.parse(`${newest}T00:00:00Z`)) / DAY_MS);
    return Number.isFinite(age) && age >= 0 ? age : null;
  }

  const unconfirmed = (payload?.profiles ?? [])
    .filter((profile) => profile.status === "review-required" || profile.status === "verified-with-warning")
    .map((profile) => ({ sku: String(profile.sku ?? "").toUpperCase().replace(/\s+/g, ""), ageDays: profileAgeDays(profile) }))
    .sort((a, b) => (b.ageDays ?? -1) - (a.ageDays ?? -1) || a.sku.localeCompare(b.sku));

  return {
    warnAfterDays,
    failAfterDays,
    unconfirmedCount: unconfirmed.length,
    aging: unconfirmed.filter((entry) => entry.ageDays !== null && entry.ageDays >= warnAfterDays),
    overdue: unconfirmed.filter((entry) => entry.ageDays === null || entry.ageDays >= failAfterDays),
  };
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function runCli() {
  if (!existsSync(PROFILES_FILE) || !existsSync(AGING_CONFIG_FILE)) {
    console.error(`[confirmation-aging] missing input: ${!existsSync(PROFILES_FILE) ? PROFILES_FILE : AGING_CONFIG_FILE}`);
    process.exit(1);
  }
  let result;
  try {
    result = assessConfirmationAging(readJson(PROFILES_FILE), readJson(AGING_CONFIG_FILE), new Date());
  } catch (error) {
    console.error(`[confirmation-aging] failed to read inputs: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  const describe = (entry) => `${entry.sku} (${entry.ageDays === null ? "no evidence timestamp" : `${entry.ageDays}d`})`;
  const githubOutput = process.argv.includes("--github-output");
  const humanLine =
    `[confirmation-aging] ${result.unconfirmedCount} unconfirmed machine-tier profile(s): ` +
    `${result.aging.length} past the ${result.warnAfterDays}-day warn threshold, ` +
    `${result.overdue.length} past the ${result.failAfterDays}-day fail threshold.`;
  const bucketLines = [
    ...result.overdue.map((entry) => `  OVERDUE ${describe(entry)}`),
    ...result.aging.map((entry) => `  aging    ${describe(entry)}`),
  ];
  if (githubOutput) {
    // In GitHub-output mode stdout is reserved for the k=v pairs (they are
    // piped into $GITHUB_OUTPUT); human-readable text goes to stderr so it
    // stays visible in the Actions log without corrupting the pipe.
    console.error(humanLine);
    for (const line of bucketLines) console.error(line);
  } else {
    console.log(humanLine);
    for (const line of bucketLines) console.log(line);
  }

  if (githubOutput) {
    const pairs = {
      count_unconfirmed: String(result.unconfirmedCount),
      count_aging: String(result.aging.length),
      count_overdue: String(result.overdue.length),
      warn_days: String(result.warnAfterDays),
      fail_days: String(result.failAfterDays),
    };
    const outputFile = process.env.GITHUB_OUTPUT;
    const rendered = Object.entries(pairs)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    if (outputFile) {
      appendFileSync(outputFile, `${rendered}\n`);
    } else {
      console.log(rendered);
    }
    if (result.overdue.length > 0) {
      console.error(
        `::warning::Confirmation backlog overdue: ${result.overdue.length} profile(s) past the ${result.failAfterDays}-day fail threshold - the next merge will fail the technical-data gate. Work the backlog via the dashboard confirmation strip or tools/apply-governed-review-pass.mjs.`,
      );
    } else if (result.aging.length > 0) {
      console.error(
        `::warning::Confirmation backlog aging: ${result.aging.length} profile(s) past the ${result.warnAfterDays}-day warn threshold - confirm them (dashboard confirmation strip or tools/apply-governed-review-pass.mjs) before they pass the ${result.failAfterDays}-day fail threshold, or the next merge fails the technical-data gate.`,
      );
    }
  }

  if (process.argv.includes("--summary")) {
    console.log(
      `${result.unconfirmedCount} unconfirmed · ${result.aging.length} aging (≥${result.warnAfterDays}d) · ${result.overdue.length} overdue (≥${result.failAfterDays}d)`,
    );
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runCli();
