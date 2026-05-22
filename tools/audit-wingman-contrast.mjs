import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import axeCore from "axe-core";

const repoRoot = process.cwd();
const baseUrl = process.env.WINGMAN_AUDIT_URL || "http://127.0.0.1:3000";

const routes = [
  "/wingman",
  "/wingman/dashboard",
  "/wingman/discovery",
  "/wingman/finder",
  "/wingman/product-pitch",
  "/wingman/product-families",
  "/wingman/templates",
  "/wingman/compare",
  "/wingman/video-wall",
  "/wingman/sales-language",
  "/wingman/proposal",
  "/wingman/projects",
  "/wingman/document-ingest",
  "/wingman/live-call-cards",
  "/wingman/support",
];

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const reportRoot = path.join(repoRoot, "reports", "contrast-audit");
const reportDir = path.join(reportRoot, stamp);
const latestDir = path.join(reportRoot, "latest");

fs.mkdirSync(reportDir, { recursive: true });
fs.mkdirSync(latestDir, { recursive: true });

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function csvEscape(value) {
  const text = cleanText(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function shortSelector(nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) return "";
  const target = nodes[0]?.target;
  if (Array.isArray(target)) return target.join(" ");
  return String(target ?? "");
}

function affectedText(nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) return "";
  return cleanText(nodes[0]?.html ?? "").slice(0, 260);
}

function htmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function waitForApp(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(900);

  const hasShell = await page.locator(".wingman-shell").count().catch(() => 0);

  if (hasShell > 0) {
    await page.locator(".wingman-shell").first().waitFor({ state: "visible", timeout: 7000 }).catch(() => {});
  }

  await page.waitForTimeout(500);
}

async function collectComputedContrastTargets(page) {
  return await page.evaluate(() => {
    function textOf(element) {
      return (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim();
    }

    function selectorFor(element) {
      if (!(element instanceof Element)) return "";

      if (element.id) return `#${element.id}`;

      const parts = [];
      let node = element;

      while (node && node.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
        let part = node.nodeName.toLowerCase();

        if (node.classList && node.classList.length) {
          part += "." + Array.from(node.classList).slice(0, 3).join(".");
        }

        parts.unshift(part);
        node = node.parentElement;
      }

      return parts.join(" > ");
    }

    const interesting = Array.from(document.querySelectorAll([
      "button",
      "a",
      "input",
      "select",
      "textarea",
      "label",
      "h1",
      "h2",
      "h3",
      "h4",
      "p",
      "span",
      "small",
      "[role='button']",
      "[class*='button']",
      "[class*='Button']",
      "[class*='card']",
      "[class*='Card']",
      "[class*='badge']",
      "[class*='Badge']",
    ].join(",")));

    return interesting
      .map((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        return {
          selector: selectorFor(element),
          tag: element.tagName.toLowerCase(),
          text: textOf(element).slice(0, 120),
          color: style.color,
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          visible: rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none",
        };
      })
      .filter((item) => item.visible && item.text);
  });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 1,
});

const allRows = [];
const rawResults = [];

for (const route of routes) {
  const page = await context.newPage();
  const url = `${baseUrl}${route}`;

  console.log(`Auditing ${url}`);

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await waitForApp(page);

    await page.addScriptTag({ content: axeCore.source });

    const axeResult = await page.evaluate(async () => {
      return await window.axe.run(document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
        },
        rules: {
          "color-contrast": { enabled: true },
        },
      });
    });

    const computedTargets = await collectComputedContrastTargets(page);

    const screenshotName = `${route.replaceAll("/", "_").replace(/^_/, "") || "root"}.png`;
    await page.screenshot({
      path: path.join(reportDir, screenshotName),
      fullPage: true,
    }).catch(() => {});

    const contrastViolations = axeResult.violations.filter((violation) => {
      return violation.id === "color-contrast";
    });

    for (const violation of contrastViolations) {
      for (const node of violation.nodes) {
        allRows.push({
          route,
          url,
          severity: violation.impact ?? "",
          rule: violation.id,
          help: violation.help,
          selector: Array.isArray(node.target) ? node.target.join(" ") : String(node.target ?? ""),
          html: cleanText(node.html).slice(0, 320),
          failureSummary: cleanText(node.failureSummary).slice(0, 520),
          screenshot: screenshotName,
        });
      }
    }

    rawResults.push({
      route,
      url,
      screenshot: screenshotName,
      contrastViolationCount: contrastViolations.reduce((sum, violation) => sum + violation.nodes.length, 0),
      violations: contrastViolations,
      computedTargets,
    });
  } catch (error) {
    allRows.push({
      route,
      url,
      severity: "error",
      rule: "audit-error",
      help: "Page could not be audited",
      selector: "",
      html: "",
      failureSummary: error instanceof Error ? error.message : String(error),
      screenshot: "",
    });

    rawResults.push({
      route,
      url,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    await page.close().catch(() => {});
  }
}

await browser.close();

const csvHeader = [
  "route",
  "url",
  "severity",
  "rule",
  "help",
  "selector",
  "html",
  "failureSummary",
  "screenshot",
];

const csv = [
  csvHeader.join(","),
  ...allRows.map((row) => csvHeader.map((key) => csvEscape(row[key])).join(",")),
].join("\n");

const json = JSON.stringify(
  {
    generatedAt: new Date().toISOString(),
    baseUrl,
    routes,
    issueCount: allRows.filter((row) => row.rule === "color-contrast").length,
    rows: allRows,
    rawResults,
  },
  null,
  2
);

const summaryByRoute = routes.map((route) => {
  const count = allRows.filter((row) => row.route === route && row.rule === "color-contrast").length;
  return { route, count };
});

const summaryRows = summaryByRoute.map((item) => {
  const status = item.count === 0 ? "Pass" : `${item.count} issue${item.count === 1 ? "" : "s"}`;

  return `<tr><td>${htmlEscape(item.route)}</td><td>${htmlEscape(status)}</td></tr>`;
}).join("");

const issueRows = allRows.map((row) => {
  return `
    <tr>
      <td>${htmlEscape(row.route)}</td>
      <td>${htmlEscape(row.severity)}</td>
      <td>${htmlEscape(row.selector)}</td>
      <td>${htmlEscape(row.html)}</td>
      <td>${htmlEscape(row.failureSummary)}</td>
      <td>${row.screenshot ? `<a href="./${htmlEscape(row.screenshot)}">${htmlEscape(row.screenshot)}</a>` : ""}</td>
    </tr>
  `;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Wingman Contrast Audit</title>
  <style>
    body {
      margin: 0;
      padding: 24px;
      font-family: Inter, Arial, sans-serif;
      background: #0b1220;
      color: #f8fafc;
    }

    h1, h2 {
      margin: 0 0 16px;
    }

    p {
      color: #cbd5e1;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0 32px;
      background: #111827;
      border: 1px solid #334155;
    }

    th, td {
      border-bottom: 1px solid #334155;
      padding: 10px;
      text-align: left;
      vertical-align: top;
      font-size: 13px;
    }

    th {
      background: #1e293b;
      color: #fbbf24;
    }

    td {
      color: #e2e8f0;
    }

    a {
      color: #93c5fd;
    }

    code {
      color: #fbbf24;
    }
  </style>
</head>
<body>
  <h1>Wingman Contrast Audit</h1>
  <p>Generated ${htmlEscape(new Date().toLocaleString())}. Base URL: <code>${htmlEscape(baseUrl)}</code></p>

  <h2>Summary by route</h2>
  <table>
    <thead>
      <tr><th>Route</th><th>Contrast result</th></tr>
    </thead>
    <tbody>${summaryRows}</tbody>
  </table>

  <h2>Issues</h2>
  <table>
    <thead>
      <tr>
        <th>Route</th>
        <th>Severity</th>
        <th>Selector</th>
        <th>HTML/Text</th>
        <th>Failure summary</th>
        <th>Screenshot</th>
      </tr>
    </thead>
    <tbody>${issueRows || '<tr><td colspan="6">No color contrast issues found.</td></tr>'}</tbody>
  </table>
</body>
</html>`;

fs.writeFileSync(path.join(reportDir, "contrast-audit.csv"), csv, "utf8");
fs.writeFileSync(path.join(reportDir, "contrast-audit.json"), json, "utf8");
fs.writeFileSync(path.join(reportDir, "contrast-audit.html"), html, "utf8");

fs.rmSync(latestDir, { recursive: true, force: true });
fs.mkdirSync(latestDir, { recursive: true });

for (const fileName of fs.readdirSync(reportDir)) {
  fs.copyFileSync(path.join(reportDir, fileName), path.join(latestDir, fileName));
}

console.log("");
console.log(`Contrast issues found: ${allRows.filter((row) => row.rule === "color-contrast").length}`);
console.log(`Report folder: ${path.relative(repoRoot, latestDir)}`);
console.log(`Open report: ${path.join(latestDir, "contrast-audit.html")}`);