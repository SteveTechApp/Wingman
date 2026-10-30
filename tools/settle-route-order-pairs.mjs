#!/usr/bin/env node
/**
 * Settle the subject-disjoint order pairs by asking the rendered page.
 *
 * The route-stylesheet split reports pairs whose two selectors share no token —
 * no class, no element name — so nothing in the text says whether the two can be
 * one element. The reviewed file pins them as "a person accepted that this page's
 * copy may load after the shared rule", which is true and tells a reader nothing
 * about whether the pair can happen at all.
 *
 * The rendered page answers that directly: does any element in the route's DOM
 * match both selectors? A pair with no such element cannot re-decide a
 * declaration, so it is not a decision a person has to keep reviewing; a pair
 * with one is, and it stays in the reviewed list. The question is asked at two
 * widths, because a page that mounts a region only inside a breakpoint is the
 * case a single viewport would call settled.
 *
 * The run is both the measurement and the re-proof of one: with no flag it
 * compares the page against the entries the baseline calls settled and fails if
 * any of them now reaches one element, or if a settled entry stopped occurring.
 * `--write` moves the occurrences the pages settle out of `pairs` and into
 * `settled`, with one evidence line per page.
 *
 * Usage: node tools/settle-route-order-pairs.mjs [--write]
 */
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { assertFreshBuild } from "./lib/build-freshness.mjs";
import {
  ROUTE_ORDER_BASELINE_FILE,
  routeOrderPairKey,
  routeOrderPinnedKey,
  routeStylesheetOrderReport,
} from "./lib/route-stylesheet-order.mjs";

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), "..");
const WRITE = process.argv.includes("--write");
const port = Number(process.env.WINGMAN_ROUTE_ORDER_PORT || 4179);
const previewCommand = process.platform === "win32" ? "cmd.exe" : "npx";
const previewArgs = process.platform === "win32"
  ? ["/d", "/s", "/c", `npx vite preview --host 127.0.0.1 --port ${port}`]
  : ["vite", "preview", "--host", "127.0.0.1", "--port", String(port)];

/** Two widths, because a route can mount a region only inside a breakpoint. */
const VIEWPORTS = [{ width: 1366, height: 900 }, { width: 390, height: 844 }];

function stopWindowsPortListener() {
  if (process.platform !== "win32") return;
  const command = [
    `$ids = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue`,
    "| Select-Object -ExpandProperty OwningProcess -Unique;",
    "foreach ($id in $ids) {",
    "if ($id) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue }",
    "}",
  ].join(" ");
  try {
    execFileSync("powershell.exe", ["-NoProfile", "-Command", command], { stdio: "ignore" });
  } catch {
    // Best-effort cleanup for a stale local preview server.
  }
}

async function waitForPreview() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/wingman`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw new Error(`The preview server did not answer on ${port}.`);
}

/**
 * The baseline as the file writes it: one pair per line.
 *
 * `JSON.stringify` with an indent explodes every pair into eight lines, which
 * turns a bookkeeping change into a two-thousand-line diff and hides the entries
 * a reviewer is here to read. A pair and a settled entry are one identity each,
 * so each is printed as one line; only the page around them is indented.
 */
function serializeBaseline(baseline) {
  const list = (name, entries, indent) => {
    if (!entries.length) return `${indent}"${name}": []`;
    const pad = `${indent}  `;
    return `${indent}"${name}": [\n${entries.map((entry) => `${pad}${JSON.stringify(entry)}`).join(",\n")}\n${indent}]`;
  };
  const pages = baseline.pages.map((page) => {
    const fields = [
      `      "route": ${JSON.stringify(page.route)}`,
      `      "file": ${JSON.stringify(page.file)}`,
      `      "reason": ${JSON.stringify(page.reason)}`,
    ];
    if (page.settledEvidence) fields.push(`      "settledEvidence": ${JSON.stringify(page.settledEvidence)}`);
    fields.push(list("pairs", page.pairs ?? [], "      "));
    if ((page.settled ?? []).length) fields.push(list("settled", page.settled, "      "));
    return `    {\n${fields.join(",\n")}\n    }`;
  });
  return `{\n  "policy": ${JSON.stringify(baseline.policy)},\n  "updatedAt": ${JSON.stringify(baseline.updatedAt)},\n  "pages": [\n${pages.join(",\n")}\n  ]\n}\n`;
}

const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, "src/wingman2/app/route-manifest.json"), "utf8"));
const pathByKey = new Map(manifest.map((route) => [String(route.key), String(route.path)]));
const keyBySegment = new Map(manifest.map((route) => [String(route.segment), String(route.key)]));

const report = routeStylesheetOrderReport({ root: projectRoot });
const build = assertFreshBuild(projectRoot);
const baselinePath = path.join(projectRoot, ROUTE_ORDER_BASELINE_FILE);
const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));

stopWindowsPortListener();
const preview = spawn(previewCommand, previewArgs, {
  cwd: projectRoot,
  env: { ...process.env, WINGMAN_UI_PORT: String(port) },
  stdio: "ignore",
  windowsHide: true,
});

let browser;
const failures = [];
const settledByRoute = new Map();
try {
  await waitForPreview();
  browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
  });

  for (const page of report.pages) {
    const disjoint = page.conflicts.filter((conflict) => conflict.rank > 1);
    if (!disjoint.length) continue;
    const routePath = pathByKey.get(keyBySegment.get(page.route) ?? "");
    if (!routePath) {
      failures.push(`The settle run has no manifest path for the ${page.route} page, so its DOM was never asked.`);
      continue;
    }
    const entry = baseline.pages.find((candidate) => candidate.route === page.route);

    // Keyed by position, because a repeated pair is a repeated occurrence: one
    // selector pair that meets twice is two lines in the reviewed list, and a
    // map keyed by identity would quietly settle only the first.
    const answers = disjoint.map((conflict, index) => ({
      index,
      key: routeOrderPairKey(conflict),
      property: conflict.property,
      first: conflict.beforeFirst.selector,
      second: conflict.beforeSecond.selector,
      both: 0,
      unmatched: false,
    }));

    const context = await browser.newContext();
    const tab = await context.newPage();
    try {
      for (const viewport of VIEWPORTS) {
        await tab.setViewportSize(viewport);
        await tab.goto(`http://127.0.0.1:${port}${routePath}`, { waitUntil: "networkidle" });
        await tab.waitForTimeout(400);
        const readings = await tab.evaluate((entries) => {
          const query = (selector) => {
            try {
              return [...document.querySelectorAll(selector)];
            } catch {
              return null;
            }
          };
          return entries.map((entry) => {
            const first = query(entry.first);
            const second = query(entry.second);
            if (!first || !second) return { index: entry.index, both: 0, unmatched: true };
            let both = 0;
            for (const element of first) {
              try {
                if (element.matches(entry.second)) both += 1;
              } catch {
                return { index: entry.index, both: 0, unmatched: true };
              }
            }
            return { index: entry.index, both, unmatched: false };
          });
        }, answers.map((answer) => ({ index: answer.index, first: answer.first, second: answer.second })));
        for (const reading of readings) {
          const held = answers.find((answer) => answer.index === reading.index);
          held.both = Math.max(held.both, reading.both);
          held.unmatched = held.unmatched || reading.unmatched;
        }
      }
    } finally {
      await context.close();
    }

    const settled = answers.filter((answer) => !answer.unmatched && answer.both === 0);
    const open = answers.filter((answer) => !answer.unmatched && answer.both > 0);
    const unknown = answers.filter((answer) => answer.unmatched);
    settledByRoute.set(page.route, settled.map((answer) => answer.key));
    console.log(
      `[settle] ${page.route} (${routePath}): ${settled.length} settled, ${open.length} can be one element, `
      + `${unknown.length} unreadable`,
    );
    for (const answer of open) {
      console.log(`    ${answer.both} element(s) match both: ${answer.property} ${answer.first} / ${answer.second}`);
    }

    if (WRITE) continue;
    if (!entry) continue;

    // The re-proof: what the baseline calls settled has to still be settled.
    const recorded = (entry.settled ?? []).map((pair) => pair.key);
    for (const answer of open) {
      if (recorded.includes(answer.key)) {
        failures.push(
          `The route-stylesheet order baseline settled a pair on ${page.route} that now reaches one element: `
          + `${answer.both} element(s) match both \`${answer.first}\` and \`${answer.second}\` (${answer.property}). `
          + "A page that started mounting that element has to bring the pair back into `pairs` with a decision.",
        );
      }
    }
    for (const key of recorded) {
      if (disjoint.every((conflict) => routeOrderPairKey(conflict) !== key)) {
        failures.push(
          `The route-stylesheet order baseline settles a pair on ${page.route} that the split no longer reads (${key}). `
          + "A settled entry that stopped occurring has to leave the file.",
        );
      }
    }
  }

  const settledTotal = [...settledByRoute.values()].reduce((sum, keys) => sum + keys.length, 0);
  console.log(
    `\n[settle] ${settledTotal} of ${report.totals.subjectDisjoint} subject-disjoint occurrence(s) cannot be one element `
    + `on their route's page at ${VIEWPORTS.map((viewport) => viewport.width).join("px and ")}px.`,
  );

  if (WRITE) {
    const measuredAt = new Date().toISOString().slice(0, 10);
    for (const entry of baseline.pages) {
      const settledKeys = new Set(settledByRoute.get(entry.route) ?? []);
      if (!settledKeys.size) continue;
      const kept = [];
      const settled = [];
      for (const pair of entry.pairs ?? []) {
        const key = routeOrderPinnedKey(pair);
        if (settledKeys.has(key)) settled.push({ key });
        else kept.push(pair);
      }
      entry.pairs = kept;
      if (settled.length) {
        entry.settled = settled;
        entry.settledEvidence = `Measured ${measuredAt} against a build of revision ${build.revision ?? "unknown"} at `
          + `${VIEWPORTS.map((viewport) => `${viewport.width}×${viewport.height}`).join(" and ")}: no element the `
          + `${entry.route} page renders matches both selectors of these ${settled.length} occurrence(s), so the split `
          + "cannot re-decide a declaration through them. Re-run the settle tool when the page's markup changes; a pair "
          + "that starts matching again has to come back into `pairs` with its decision.";
      }
    }
    baseline.updatedAt = measuredAt;
    fs.writeFileSync(baselinePath, serializeBaseline(baseline), "utf8");
    console.log(`[settle] wrote ${ROUTE_ORDER_BASELINE_FILE}`);
  }

  if (failures.length) {
    console.error("\n[settle] the settled half of the baseline no longer holds:");
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exitCode = 1;
  }
} finally {
  if (browser) await browser.close();
  preview.kill("SIGTERM");
  stopWindowsPortListener();
}
