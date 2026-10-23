import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseRules, relativePath } from "./lib/dead-css.mjs";

/**
 * CSS coverage report: every stylesheet rule that matched on no route.
 *
 * The dead-CSS gate answers "can this selector ever match?" from the source.
 * This report answers a different question with evidence: which declared rules
 * did not match a single rendered route? It drives Chromium through the
 * `CSS.startRuleUsageTracking` protocol, which reports the byte range of every
 * rule the renderer actually matched, then maps those ranges onto the parsed
 * rules of each served stylesheet.
 *
 * Three findings are kept apart; none alone proves a rule can be deleted:
 *
 * - `unmatched`: no route rendered an element for the rule;
 * - `interaction`: the selector needs `:hover`/`:focus`/`:active` before it can
 *   match, so a sweep of static route loads cannot see it;
 * - `generated`: the rule is produced by the Tailwind expansion rather than
 *   written in the file (`wingman-layer-layout.css` ships utilities this way),
 *   so it is listed against that file but marked separately.
 *
 * Routes come from `src/wingman2/app/route-manifest.json`. Each route is
 * loaded in a fresh page per viewport so every stylesheet is registered again
 * and the usage offsets belong to that document only.
 *
 * Usage:
 *   npm run report:css-coverage
 *   node tools/report-css-coverage.mjs --routes=wingman,wingman/compare
 *   node tools/report-css-coverage.mjs --base-url=http://127.0.0.1:3000 --viewports=1440x1000
 *
 * Output: `reports/css-coverage.json` (full data) and `reports/css-coverage.md`
 * (readable list). Both live under the gitignored `reports/` directory.
 */

export const DEFAULT_VIEWPORTS = [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
];

const interactionPseudo = /:(?:hover|focus|focus-visible|focus-within|active|visited|target)\b/;

/** A selector that only matches after pointer or keyboard interaction. */
export function isInteractionSelector(selector) {
  return interactionPseudo.test(selector);
}

/** Route paths the report sweeps, in manifest order. */
export function readRoutes(root) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "src", "wingman2", "app", "route-manifest.json"), "utf8"));
  return manifest.map((route) => route.path);
}

/**
 * A `--routes` value as an app path. Git Bash rewrites an argument that starts
 * with `/` into a Windows path before Node sees it, so `wingman/compare` is the
 * portable spelling and `/wingman/compare` is accepted when the shell allows it.
 */
export function normalizeRoutePath(value) {
  const trimmed = value.trim();
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  if (/^[A-Za-z]:[\\/]/.test(trimmed)) {
    throw new Error(`The shell rewrote "${trimmed}" into a Windows path. Pass routes without the leading slash, for example --routes=wingman,wingman/compare.`);
  }
  return `/${trimmed.replace(/^\/+/, "")}`;
}

/** Parse a viewport flag such as `1440x1000`. */
export function parseViewport(value) {
  const match = /^(\d+)x(\d+)$/.exec(value.trim());
  if (!match) throw new Error(`Invalid viewport "${value}" — use WIDTHxHEIGHT, for example 1440x1000.`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

/**
 * Rule text with collapsed whitespace, so a rule matches its source form even
 * when the dev server re-serializes the stylesheet.
 */
function normalizeRuleText(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\s+/g, " ").trim();
}

/** Source rule texts per file, used to tell authored rules from generated ones. */
export function loadSourceRules(root, files) {
  const sources = new Map();
  for (const file of files) {
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute)) continue;
    const css = fs.readFileSync(absolute, "utf8");
    const rules = parseRules(css).map((rule) => normalizeRuleText(css.slice(rule.selectorStart, rule.deleteEnd)));
    sources.set(file, new Set(rules));
  }
  return sources;
}

/**
 * Turn per-route measurements into the report.
 *
 * `measurements` is one entry per route and viewport:
 * `{ route, viewport, sheets: [{ file, text, used: [[start, end]] }] }`, where
 * `used` holds the merged ranges Chromium reported as matched. A rule is
 * counted as matched as soon as one measured load overlapped it.
 */
export function analyzeCoverage({ measurements, sources = new Map(), baseURL = "", generatedAt = new Date().toISOString() }) {
  const files = new Map();
  const matched = new Map();

  for (const measurement of measurements) {
    const load = `${measurement.route} @ ${measurement.viewport.width}x${measurement.viewport.height}`;
    for (const sheet of measurement.sheets) {
      let entry = files.get(sheet.file);
      if (!entry) {
        entry = { file: sheet.file, text: sheet.text, rules: parseRules(sheet.text) };
        entry.ruleKeys = entry.rules.map((rule, index) => `${sheet.file}#${index}`);
        files.set(sheet.file, entry);
      }
      const ranges = [...sheet.used].sort((left, right) => left[0] - right[0]);
      let cursor = 0;
      for (const [start, end] of ranges) {
        while (cursor < entry.rules.length && entry.rules[cursor].deleteEnd <= start) cursor += 1;
        for (let index = cursor; index < entry.rules.length && entry.rules[index].selectorStart < end; index += 1) {
          const rule = entry.rules[index];
          if (rule.deleteEnd <= start) continue;
          const key = entry.ruleKeys[index];
          if (!matched.has(key)) matched.set(key, new Set());
          matched.get(key).add(load);
        }
      }
    }
  }

  const unmatched = [];
  const interaction = [];
  const stylesheets = [];
  const vendor = [];
  for (const entry of files.values()) {
    const sourceRules = sources.get(entry.file);
    const thirdParty = entry.file.includes("node_modules/");
    let fileMatched = 0;
    let fileUnmatched = 0;
    let fileInteraction = 0;
    entry.rules.forEach((rule, index) => {
      const hit = matched.has(entry.ruleKeys[index]);
      if (hit) {
        fileMatched += 1;
        return;
      }
      const generated = sourceRules ? !sourceRules.has(normalizeRuleText(entry.text.slice(rule.selectorStart, rule.deleteEnd))) : false;
      const finding = { file: entry.file, selector: rule.selector, generated };
      if (isInteractionSelector(rule.selector)) {
        fileInteraction += 1;
        if (!thirdParty) interaction.push(finding);
        return;
      }
      fileUnmatched += 1;
      if (!thirdParty) unmatched.push(finding);
    });
    const summary = {
      file: entry.file,
      rules: entry.rules.length,
      matched: fileMatched,
      unmatched: fileUnmatched,
      interaction: fileInteraction,
      bytes: Buffer.byteLength(entry.text),
    };
    (thirdParty ? vendor : stylesheets).push(summary);
  }

  for (const list of [stylesheets, vendor]) list.sort((left, right) => right.unmatched - left.unmatched || left.file.localeCompare(right.file));
  unmatched.sort((left, right) => left.file.localeCompare(right.file) || left.selector.localeCompare(right.selector));
  interaction.sort((left, right) => left.file.localeCompare(right.file) || left.selector.localeCompare(right.selector));

  return {
    generatedAt,
    baseURL,
    routes: measurements.map((measurement) => ({
      route: measurement.route,
      viewport: `${measurement.viewport.width}x${measurement.viewport.height}`,
      stylesheets: measurement.sheets.length,
      status: measurement.status ?? "ok",
    })),
    viewports: [...new Set(measurements.map((measurement) => `${measurement.viewport.width}x${measurement.viewport.height}`))],
    loads: measurements.length,
    stylesheets,
    vendor,
    unmatched,
    interaction,
    totals: {
      rules: stylesheets.reduce((total, sheet) => total + sheet.rules, 0),
      matched: stylesheets.reduce((total, sheet) => total + sheet.matched, 0),
      unmatched: unmatched.length,
      interaction: interaction.length,
      generated: unmatched.filter((finding) => finding.generated).length,
      vendorRules: vendor.reduce((total, sheet) => total + sheet.rules, 0),
      vendorUnmatched: vendor.reduce((total, sheet) => total + sheet.unmatched, 0),
    },
  };
}

/** Readable rendering of the report: the unmatched rules, grouped by file. */
export function renderMarkdown(report) {
  const lines = [
    "# CSS coverage report",
    "",
    `Measured ${report.loads} route loads over ${report.viewports.length} viewport${report.viewports.length === 1 ? "" : "s"} (${report.viewports.join(", ")}) against ${report.baseURL}.`,
    "",
    "A rule is listed when no measured route load matched it. Rules that need `:hover`, `:focus`, `:active` or `:visited` are counted separately under interaction-only, and rules produced by the Tailwind expansion are marked `(generated)`. Third-party stylesheets from `node_modules` are counted but not listed.",
    "",
    "Unmatched rules are coverage gaps, not confirmed dead CSS. Static route loads do not exercise every authenticated, populated, expanded, wizard-result or error state. Confirm source references and exercise the relevant states before removing a rule.",
    "",
    `- rules: ${report.totals.rules}`,
    `- matched: ${report.totals.matched}`,
    `- never matched: ${report.totals.unmatched}`,
    `- of those generated: ${report.totals.generated}`,
    `- interaction-only, not measured: ${report.totals.interaction}`,
    `- vendor rules: ${report.totals.vendorRules} (${report.totals.vendorUnmatched} never matched)`,
    "",
    "| stylesheet | rules | matched | never matched | interaction-only |",
    "|---|---:|---:|---:|---:|",
    ...report.stylesheets.map((sheet) => `| \`${sheet.file}\` | ${sheet.rules} | ${sheet.matched} | ${sheet.unmatched} | ${sheet.interaction} |`),
    "",
  ];

  if (report.unmatched.length === 0) {
    lines.push("Every task-bearing rule matched on at least one measured route.", "");
  } else {
    lines.push("## Rules never matched", "");
    const counts = new Map();
    for (const finding of report.unmatched) counts.set(finding.file, (counts.get(finding.file) ?? 0) + 1);
    let current = "";
    for (const finding of report.unmatched) {
      if (finding.file !== current) {
        current = finding.file;
        lines.push(`### \`${current}\` — ${counts.get(current)}`, "");
      }
      lines.push(`- \`${finding.selector}\`${finding.generated ? " (generated)" : ""}`);
    }
    lines.push("");
  }

  if (report.interaction.length > 0) {
    lines.push("## Interaction-only rules never matched", "", "These need pointer or keyboard state before they can match, which a static route sweep does not produce.", "");
    let current = "";
    for (const finding of report.interaction) {
      if (finding.file !== current) {
        current = finding.file;
        lines.push(`### \`${current}\``, "");
      }
      lines.push(`- \`${finding.selector}\``);
    }
    lines.push("");
  }

  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
}

async function defaultLaunchBrowser() {
  const { chromium } = await import("@playwright/test");
  return chromium.launch();
}

async function nodeAttributes(session, backendNodeId) {
  try {
    const described = await session.send("DOM.describeNode", { backendNodeId });
    const attributes = described.node?.attributes ?? [];
    const pairs = {};
    for (let index = 0; index + 1 < attributes.length; index += 2) pairs[attributes[index]] = attributes[index + 1];
    return pairs;
  } catch {
    return {};
  }
}

/** The repository-relative file a served stylesheet came from, when known. */
function stylesheetFile(root, header, attributes) {
  const devId = attributes["data-vite-dev-id"];
  if (devId) {
    const relative = relativePath(root, path.resolve(devId));
    return relative.startsWith("..") ? null : relative;
  }
  if (header.sourceURL?.startsWith("file://")) {
    const relative = relativePath(root, decodeURIComponent(new URL(header.sourceURL).pathname).replace(/^\/(?=[A-Za-z]:)/, ""));
    return relative.startsWith("..") ? null : relative;
  }
  return null;
}

async function measureRoute(browser, { root, baseURL, route, viewport, settleMs }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const session = await context.newCDPSession(page);
  const headers = new Map();
  session.on("CSS.styleSheetAdded", (event) => headers.set(event.header.styleSheetId, event.header));

  let status = "ok";
  try {
    await session.send("DOM.enable");
    await session.send("CSS.enable");
    await session.send("CSS.startRuleUsageTracking");
    const response = await page.goto(new URL(route, baseURL).href, { waitUntil: "domcontentloaded", timeout: 60_000 });
    if (response && response.status() >= 400) status = `http ${response.status()}`;
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(settleMs);
    const { ruleUsage } = await session.send("CSS.stopRuleUsageTracking");

    const usedBySheet = new Map();
    for (const entry of ruleUsage) {
      if (!entry.used) continue;
      if (!usedBySheet.has(entry.styleSheetId)) usedBySheet.set(entry.styleSheetId, []);
      usedBySheet.get(entry.styleSheetId).push([entry.startOffset, entry.endOffset]);
    }

    const sheets = [];
    for (const [styleSheetId, header] of headers) {
      const attributes = header.ownerNode ? await nodeAttributes(session, header.ownerNode) : {};
      const file = stylesheetFile(root, header, attributes);
      if (!file) continue;
      let text;
      try {
        text = (await session.send("CSS.getStyleSheetText", { styleSheetId })).text;
      } catch {
        continue;
      }
      sheets.push({ file, text, used: usedBySheet.get(styleSheetId) ?? [] });
    }
    return { route, viewport, status, sheets };
  } catch (caught) {
    return { route, viewport, status: `error: ${caught instanceof Error ? caught.message.split("\n")[0] : String(caught)}`, sheets: [] };
  } finally {
    await context.close().catch(() => {});
  }
}

function parseArgs(argv) {
  const options = { routes: null, baseURL: null, viewports: DEFAULT_VIEWPORTS, settleMs: 750, outDir: "reports" };
  for (const argument of argv) {
    if (argument.startsWith("--routes=")) options.routes = argument.slice("--routes=".length).split(",").map(normalizeRoutePath);
    else if (argument.startsWith("--base-url=")) options.baseURL = argument.slice("--base-url=".length).replace(/\/+$/, "");
    else if (argument.startsWith("--viewports=")) options.viewports = argument.slice("--viewports=".length).split(",").map(parseViewport);
    else if (argument.startsWith("--settle=")) options.settleMs = Number(argument.slice("--settle=".length));
    else if (argument.startsWith("--out=")) options.outDir = argument.slice("--out=".length);
  }
  return options;
}

export async function runCssCoverageReport({
  root = process.cwd(),
  routes,
  baseURL,
  viewports = DEFAULT_VIEWPORTS,
  settleMs = 750,
  outDir = "reports",
  log = console.log,
  error = console.error,
  launchBrowser,
} = {}) {
  const base = (baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/+$/, "");
  const paths = routes ?? readRoutes(root);

  const reachable = await fetch(`${base}/wingman`, { signal: AbortSignal.timeout(5000) }).then((response) => response.ok).catch(() => false);
  if (!reachable) {
    error(`[css-coverage] No app response at ${base}/wingman. Start the dev server first (npm run dev, or node node_modules/vite/bin/vite.js).`);
    return 1;
  }

  const browser = await (launchBrowser ?? defaultLaunchBrowser)();
  const measurements = [];
  try {
    for (const viewport of viewports) {
      for (const route of paths) {
        const measurement = await measureRoute(browser, { root, baseURL: base, route, viewport, settleMs });
        measurements.push(measurement);
        log(`[css-coverage] ${route} @ ${viewport.width}x${viewport.height}: ${measurement.status} (${measurement.sheets.length} stylesheets)`);
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  const files = [...new Set(measurements.flatMap((measurement) => measurement.sheets.map((sheet) => sheet.file)))];
  const report = analyzeCoverage({ measurements, sources: loadSourceRules(root, files), baseURL: base });

  const directory = path.join(root, outDir);
  fs.mkdirSync(directory, { recursive: true });
  const jsonPath = path.join(directory, "css-coverage.json");
  const markdownPath = path.join(directory, "css-coverage.md");
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, renderMarkdown(report));

  const failed = report.routes.filter((entry) => entry.status !== "ok");
  log(
    `[css-coverage] ${report.totals.matched}/${report.totals.rules} rules matched; ${report.totals.unmatched} never matched (${report.totals.generated} generated); ${report.totals.interaction} interaction-only.`,
  );
  log(`[css-coverage] Report: ${relativePath(root, markdownPath)} and ${relativePath(root, jsonPath)}`);
  if (failed.length > 0) {
    error(`[css-coverage] ${failed.length} route load${failed.length === 1 ? "" : "s"} did not complete cleanly:`);
    failed.forEach((entry) => error(`- ${entry.route} @ ${entry.viewport}: ${entry.status}`));
    return 1;
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let status;
  try {
    status = await runCssCoverageReport(parseArgs(process.argv.slice(2)));
  } catch (caught) {
    console.error(`[css-coverage] ${caught instanceof Error ? caught.message : String(caught)}`);
    status = 1;
  }
  process.exit(status);
}
