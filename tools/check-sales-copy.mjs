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

const findings = [];

for (const root of targetRoots) {
  for (const file of walk(root)) {
    const relative = path.relative(repoRoot, file).replaceAll("\\", "/");
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);

    lines.forEach((line, index) => {
      const lowerLine = line.toLowerCase();

      for (const term of developerTerms) {
        if (lowerLine.includes(term)) {
          findings.push({
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

if (findings.length === 0) {
  console.log("[sales-copy] No obvious developer-facing UI terms found.");
  process.exit(0);
}

console.log("[sales-copy] Review these possible developer-facing UI terms:\n");

for (const item of findings.slice(0, 120)) {
  console.log(`${item.file}:${item.line} "${item.term}"`);
  console.log(`  ${item.text}`);
}

if (findings.length > 120) {
  console.log(`\n...and ${findings.length - 120} more.`);
}

process.exit(0);
