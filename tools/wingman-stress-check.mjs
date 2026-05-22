import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const strict = process.argv.includes("--strict");
const results = [];
const incorrectNetworkHdMultiviewSku = ["MHD", "0401", "MV"].join("-");

function add(status, area, name, detail = "") {
  results.push({ status, area, name, detail });
}

function npmExecutable() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function read(file) {
  const full = path.join(root, file);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
}

function walk(dir, exts, out = []) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) return out;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const fullPath = path.join(full, entry.name);
    const rel = path.relative(root, fullPath).replaceAll("\\", "/");
    if (entry.isDirectory()) {
      if (["node_modules", "dist", "build", ".git", ".vite"].includes(entry.name)) continue;
      walk(rel, exts, out);
      continue;
    }
    if (exts.some((ext) => entry.name.endsWith(ext))) out.push(rel);
  }
  return out;
}

function allTextFiles() {
  return [
    ...walk("src", [".ts", ".tsx", ".js", ".jsx"]),
    ...walk("server", [".mjs", ".js"]),
    ...walk("tools", [".mjs", ".js"]),
    ...walk("data", [".json", ".md", ".txt"]),
    ...walk("public", [".json", ".md", ".txt"]),
  ];
}

function checkStructure() {
  for (const file of ["src/wingman2/pages/FinderPage.tsx", "src/wingman2/pages/DiscoveryPage.tsx", "src/wingman2/data/projectStore.ts", "package.json"]) {
    add(exists(file) ? "PASS" : "FAIL", "Structure", `${file} exists`);
  }
}

function checkProductMatchingGate() {
  const pkg = JSON.parse(read("package.json") || "{}");
  if (!pkg.scripts?.["check:product-matching"]) {
    add("WARN", "Product Finder", "check:product-matching is missing");
    return;
  }
  try {
    execFileSync(npmExecutable(), ["run", "--silent", "check:product-matching"], { cwd: root, stdio: "pipe", timeout: 120000 });
    add("PASS", "Product Finder", "Product matching scenario gate passes");
  } catch (error) {
    const stdout = error.stdout ? String(error.stdout).trim() : "";
    const stderr = error.stderr ? String(error.stderr).trim() : "";
    const message = [stdout, stderr, error.message].filter(Boolean).join("\n").slice(0, 4000);
    add("FAIL", "Product Finder", "Product matching scenario gate fails", message);
  }
}

function checkSkuAccuracy() {
  const offenders = [];
  for (const file of allTextFiles()) {
    if (file === "tools/wingman-stress-check.mjs" || file === "tools/check-product-matching-scenarios.mjs") continue;
    const lines = read(file).split(/\r?\n/);
    lines.forEach((line, index) => {
      if (line.includes(incorrectNetworkHdMultiviewSku)) offenders.push(`${file}:${index + 1}`);
    });
  }
  add(offenders.length ? "FAIL" : "PASS", "AV accuracy", "Incorrect MHD-0401-MV reference check", offenders.join(", "));
  const combined = allTextFiles().map(read).join("\n");
  for (const sku of ["NHD-0401-MV", "NHD-150-RX", "NHD-128-NDI-TRX", "SW-0206-VW", "SW-0204-VW"]) {
    add(combined.includes(sku) ? "PASS" : "WARN", "AV accuracy", `${sku} represented`);
  }
}

function checkProductDataNoise() {
  for (const file of ["data/wyrestorm-product-intelligence.json", "public/product-intelligence-index.json"]) {
    if (!exists(file)) {
      add("WARN", "Product data", `${file} missing`);
      continue;
    }
    const text = read(file);
    try {
      JSON.parse(text);
      add("PASS", "Product data", `${file} is valid JSON`);
    } catch (error) {
      add("FAIL", "Product data", `${file} is invalid JSON`, error.message);
    }
    const scrapedNoise = text.match(/\b(?:text|col|banner)-\d{6,}\b/g) || [];
    add(scrapedNoise.length ? "FAIL" : "PASS", "Product data", `${file} scraped CSS/noise ID check`, [...new Set(scrapedNoise)].slice(0, 20).join(", "));
  }
}

function checkUnsafePatterns() {
  const sourceFiles = walk("src", [".ts", ".tsx", ".js", ".jsx"]);
  const dangerousHtml = [];
  const rawHtml = [];
  const evalLike = [];
  for (const file of sourceFiles) {
    const text = read(file);
    if (text.includes("dangerouslySetInnerHTML")) dangerousHtml.push(file);
    if (/.innerHTML\s*=|.outerHTML\s*=|insertAdjacentHTML\s*\(/.test(text)) rawHtml.push(file);
    if (/\beval\s*\(|new Function\s*\(/.test(text)) evalLike.push(file);
  }
  add(dangerousHtml.length ? "WARN" : "PASS", "Security", "React dangerouslySetInnerHTML check", dangerousHtml.join(", "));
  add(rawHtml.length ? "WARN" : "PASS", "Security", "Raw HTML assignment check", rawHtml.join(", "));
  add(evalLike.length ? "FAIL" : "PASS", "Security", "eval/new Function check", evalLike.join(", "));
}

function checkDuplicateLiteralIds() {
  const pattern = /<(input|select|textarea)\b[^>]*\bid=["']([^"']+)["'][^>]*>/gi;
  const ids = new Map();
  for (const file of walk("src", [".ts", ".tsx", ".js", ".jsx"])) {
    const text = read(file);
    let match;
    while ((match = pattern.exec(text))) {
      const list = ids.get(match[2]) || [];
      const line = text.slice(0, match.index).split(/\r?\n/).length;
      list.push(`${file}:${line}`);
      ids.set(match[2], list);
    }
  }
  const duplicates = [...ids.entries()].filter(([, places]) => places.length > 1);
  add(duplicates.length ? "WARN" : "PASS", "Accessibility", "Duplicate literal form field ID check", duplicates.slice(0, 12).map(([id, places]) => `${id}: ${places.join(", ")}`).join(" | "));
}

function checkProjectStoreFallback() {
  const text = read("src/wingman2/data/projectStore.ts");
  add(text.includes("response.status === 401") ? "PASS" : "WARN", "Project Store", "401 handling exists");
  add(text.includes('credentials: "include"') ? "PASS" : "FAIL", "Project Store", "Project API requests include credentials");
}

function checkVisualModelDoc() {
  const file = "docs/WINGMAN_STRESS_TEST_MODEL.md";
  const text = read(file);
  add(text ? "PASS" : "FAIL", "Visual models", `${file} exists`);
  add(text.includes("```mermaid") ? "PASS" : "FAIL", "Visual models", "Mermaid diagram present");
  add(text.includes("Visual system model pipeline") ? "PASS" : "FAIL", "Visual models", "Visual system model pipeline section present");
}

function printReport() {
  const grouped = new Map();
  for (const result of results) {
    const list = grouped.get(result.area) || [];
    list.push(result);
    grouped.set(result.area, list);
  }
  console.log("\nWingman stress and integrity check\n==================================\n");
  for (const [area, items] of grouped.entries()) {
    console.log(area);
    console.log("-".repeat(area.length));
    for (const item of items) {
      console.log(`[${item.status}] ${item.name}`);
      if (item.detail) console.log(`       ${item.detail}`);
    }
    console.log("");
  }
  const pass = results.filter((item) => item.status === "PASS").length;
  const warn = results.filter((item) => item.status === "WARN").length;
  const fail = results.filter((item) => item.status === "FAIL").length;
  console.log(`Summary: ${pass} pass, ${warn} warn, ${fail} fail`);
  if (!strict && fail > 0) console.log("\nNon-strict mode: failures are reported but do not fail the command. Run check:stress:strict to block on failures.");
  if (strict && fail > 0) process.exit(1);
}

checkStructure();
checkProductMatchingGate();
checkSkuAccuracy();
checkProductDataNoise();
checkUnsafePatterns();
checkDuplicateLiteralIds();
checkProjectStoreFallback();
checkVisualModelDoc();
printReport();
