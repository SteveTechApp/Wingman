import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const targetRoots = [
  path.join(repoRoot, "src", "wingman2"),
  path.join(repoRoot, "src", "features"),
];

const developerTerms = [
  "classification confidence",
  "extracted datapoints",
  "datapoints",
  "category overlap",
  "workflow context",
  "payload",
  "schema",
  "manifest",
  "canonical",
  "feature audit",
  "debug",
  "diagnostics",
  "route not found",
];

const scriptedSalesTerms = [
  "sell to",
  "pitch to",
  "simple customer pitch",
  "simple wyrestorm sales pitch",
  "future-proofing",
  "best-in-class",
  "game changer",
  "perfect solution",
  "push this product",
  "close the deal",
  "sales person",
];

const encodingTerms = [
  "Ã",
  "Â",
  "�",
  "Product page ?",
  "WyreStorm search ?",
];

const productLanguageFiles = [
  path.join(repoRoot, "data", "wyrestorm-product-intelligence.json"),
  path.join(repoRoot, "data", "product-intelligence-db.json"),
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function lineIncludesTerm(line, term) {
  if (/^[a-z0-9 -]+$/i.test(term)) {
    return new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(line);
  }

  return line.includes(term);
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (["node_modules", "dist", "build"].includes(entry.name) || entry.name.startsWith("_")) {
        continue;
      }

      walk(fullPath, files);
      continue;
    }

    if (/\.(tsx|ts|json)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function cleanSalesText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function collectSalesLanguage(value, output = [], seen = new Set()) {
  if (!value || typeof value !== "object") {
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectSalesLanguage(item, output, seen));
    return output;
  }

  if (value.salesLanguage && typeof value.salesLanguage === "object") {
    const key = JSON.stringify(value.salesLanguage);

    if (!seen.has(key)) {
      seen.add(key);
      output.push(value.salesLanguage);
    }
  }

  Object.entries(value).forEach(([key, child]) => {
    if (key === "salesLanguage") {
      return;
    }

    if (child && typeof child === "object") {
      collectSalesLanguage(child, output, seen);
    }
  });

  return output;
}

function summariseRepeatedProductLanguage(file) {
  if (!fs.existsSync(file)) {
    return [];
  }

  let parsed;

  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return [{
      file: path.relative(repoRoot, file).replaceAll("\\", "/"),
      field: "json",
      filled: 0,
      unique: 0,
      examples: ["Could not parse product language JSON."],
    }];
  }

  const salesLanguageRows = collectSalesLanguage(parsed);
  const fields = ["plainEnglishSummary", "customerValue", "salespersonCue", "realWorldApplication"];

  return fields.flatMap((field) => {
    const counts = new Map();

    salesLanguageRows.forEach((language) => {
      const text = cleanSalesText(language[field]);

      if (!text) {
        return;
      }

      counts.set(text, (counts.get(text) || 0) + 1);
    });

    const filled = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
    const unique = counts.size;

    if (filled < 12 || unique / filled >= 0.35) {
      return [];
    }

    const examples = Array.from(counts.entries())
      .filter(([, count]) => count >= 6)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([text, count]) => `${count}x ${text.slice(0, 180)}`);

    return [{
      file: path.relative(repoRoot, file).replaceAll("\\", "/"),
      field,
      filled,
      unique,
      examples,
    }];
  });
}

const findings = [];

for (const root of targetRoots) {
  for (const file of walk(root)) {
    const relative = path.relative(repoRoot, file).replaceAll("\\", "/");
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);

    lines.forEach((line, index) => {
      for (const term of developerTerms) {
        if (lineIncludesTerm(line, term)) {
          findings.push({
            kind: "developer-facing term",
            file: relative,
            line: index + 1,
            term,
            text: line.trim().slice(0, 180),
          });
        }
      }

      for (const term of scriptedSalesTerms) {
        if (lineIncludesTerm(line, term)) {
          findings.push({
            kind: "scripted sales wording",
            file: relative,
            line: index + 1,
            term,
            text: line.trim().slice(0, 180),
          });
        }
      }

      for (const term of encodingTerms) {
        if (lineIncludesTerm(line, term)) {
          findings.push({
            kind: "encoding/localization issue",
            file: relative,
            line: index + 1,
            term,
            text: line.trim().slice(0, 180),
          });
        }
      }
    });
  }
}

const languageDepthFindings = productLanguageFiles.flatMap(summariseRepeatedProductLanguage);

if (findings.length === 0 && languageDepthFindings.length === 0) {
  console.log("[sales-copy] No obvious developer-facing UI terms, scripted sales wording, encoding issues, or low-variety product language found.");
  process.exit(0);
}

if (findings.length > 0) {
  console.log("[sales-copy] Review these possible copy issues:\n");

  for (const item of findings.slice(0, 160)) {
    console.log(`${item.file}:${item.line} [${item.kind}] "${item.term}"`);
    console.log(`  ${item.text}`);
  }

  if (findings.length > 160) {
    console.log(`\n...and ${findings.length - 160} more.`);
  }
}

if (languageDepthFindings.length > 0) {
  console.log("\n[sales-copy] Review repeated product-language fields:\n");

  for (const item of languageDepthFindings) {
    console.log(`${item.file} [${item.field}] ${item.unique}/${item.filled} unique values`);
    item.examples.forEach((example) => console.log(`  ${example}`));
  }
}

process.exit(0);
