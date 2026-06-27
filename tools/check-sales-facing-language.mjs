import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const scanRoots = [
  "src/wingman2/pages",
  "src/wingman2/components",
  "src/wingman2/layout"
];

const bannedPatterns = [
  {
    pattern: /\bworkflow consolidated\b/i,
    reason: "Release-note wording. Use a user task heading instead."
  },
  {
    pattern: /\bhas moved into\b/i,
    reason: "Migration wording. Say what the salesperson should do now."
  },
  {
    pattern: /\bold .*workflow\b/i,
    reason: "Internal transition wording. Avoid describing implementation history."
  },
  {
    pattern: /\bconfusing\b/i,
    reason: "Internal critique. Replace with clear direction."
  },
  {
    pattern: /\bdemoted\b/i,
    reason: "Developer/product-management wording. Use salesperson-facing routing."
  },
  {
    pattern: /\bdeprecated\b/i,
    reason: "Developer lifecycle wording. Avoid in customer/sales-facing UI."
  },
  {
    pattern: /\barchived\b/i,
    reason: "Internal lifecycle wording unless this is an archive admin page."
  },
  {
    pattern: /\broute safe\b/i,
    reason: "Routing implementation wording."
  },
  {
    pattern: /\bhandoff page\b/i,
    reason: "Implementation wording. Use next step, sales action, or open."
  },
  {
    pattern: /\bprimary workflow\b/i,
    reason: "Internal IA wording. Use clearer user-facing task language."
  },
  {
    pattern: /\bthe user\b/i,
    reason: "Avoid referring to the salesperson as 'the user' in visible UI."
  }
];

const allowedFiles = new Set([
  "src/wingman2/pages/ArchivedCallCardsPage.tsx"
]);

function walk(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return walk(absolute);
    }

    if (!/\.(tsx|ts)$/.test(entry.name)) {
      return [];
    }

    return [absolute];
  });
}

const findings = [];

for (const scanRoot of scanRoots) {
  const absoluteRoot = path.join(root, scanRoot);

  for (const file of walk(absoluteRoot)) {
    const relative = path.relative(root, file).replaceAll("\\", "/");

    if (allowedFiles.has(relative)) {
      continue;
    }

    const text = fs.readFileSync(file, "utf8");
    const lines = text.split(/\r?\n/);

    lines.forEach((line, index) => {
      for (const banned of bannedPatterns) {
        if (banned.pattern.test(line)) {
          findings.push({
            file: relative,
            line: index + 1,
            text: line.trim(),
            reason: banned.reason
          });
        }
      }
    });
  }
}

if (findings.length > 0) {
  console.error("[sales-facing-language] Found developer-facing wording in user-facing UI:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line}`);
    console.error(`  ${finding.reason}`);
    console.error(`  ${finding.text}`);
  }
  process.exit(1);
}

console.log("[sales-facing-language] User-facing UI copy avoids developer/release-note wording.");