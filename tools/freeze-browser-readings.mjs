#!/usr/bin/env node
/**
 * Freeze the browser walk's readings into one generated file.
 *
 * The walk prints a sentence per pass, and each sentence is built from the
 * numbers that pass measured: card widths, entry widths and the characters a
 * design name kept, the box a step card holds, the bands a row wrapped over.
 * Those numbers are the evidence a layout promise is being kept, and copied into
 * prose they go stale in silence — a number that used to be true reads exactly
 * like one that still is.
 *
 * So the walk's output is written here, verbatim, with the run that produced it
 * (build stamp, exit status, commit and date) around it. This file is the
 * reading; `AGENTS.md` keeps the invariant and the reason, and points here for
 * the numbers. Regenerate it rather than editing it: `npm run readings:freeze`.
 *
 * A failing walk still writes a report — the failure is the most useful reading
 * of the day — and the script exits non-zero so a chain that runs it stops.
 *
 * The readings are printed in one section per surface, under an index, because a
 * flat list cannot be pointed at: a doc note saying the gallery holds its action
 * rows needs the line that says at which widths and with how much room left, and
 * "search the report" is not a pointer. The sections come from
 * `lib/browser-readings-sections.mjs`, which the documentation contract reads
 * too, so a note links to an anchor that exists by construction. A reading that
 * no section claims fails the freeze rather than being appended unindexed: it
 * would be a number no note could reach.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { BROWSER_READINGS_REPORT, buildReadingsReport } from "./lib/browser-readings-sections.mjs";

const REPORT_PATH = BROWSER_READINGS_REPORT;
const PREFIX = "[browser-smoke]";

function git(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : null;
}

const run = spawnSync(process.execPath, ["tools/browser-smoke-check.mjs"], {
  encoding: "utf8",
  maxBuffer: 32 * 1024 * 1024,
});
const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
const exit = run.status ?? 1;

const lines = output
  .split(/\r?\n/)
  .filter((line) => line.startsWith(PREFIX))
  .map((line) => line.slice(PREFIX.length).trim())
  .filter(Boolean);

const build = lines.find((line) => line.startsWith("Reading the build")) ?? "The walk printed no build stamp.";
const commit = git(["rev-parse", "--short", "HEAD"]) ?? "unknown";
const dirty = (git(["status", "--porcelain"]) ?? "").length > 0;
const captured = new Date().toISOString();

const { text: report, problems: filingProblems } = buildReadingsReport({
  lines,
  exit,
  build,
  commit,
  dirty,
  captured,
});

mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
writeFileSync(REPORT_PATH, report, "utf8");
console.log(`[readings] Wrote ${lines.length} reading(s) to ${REPORT_PATH} (walk exit ${exit}).`);
if (filingProblems.length) {
  console.error(`[readings] ${filingProblems.length} reading(s) could not be filed into the index:`);
  for (const problem of filingProblems) console.error(`- ${problem}`);
  console.error("Add a section or a matcher in tools/lib/browser-readings-sections.mjs, so a doc note can point at it.");
}
if (exit !== 0 || filingProblems.length) process.exitCode = exit !== 0 ? exit : 1;
