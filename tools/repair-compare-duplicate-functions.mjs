import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const backupRoot = path.join(repoRoot, "_RECOVERY", `repair-compare-duplicate-functions-${stamp}`);
const relative = path.join("server", "competitor", "compare-intelligence.mjs");
const filePath = path.join(repoRoot, relative);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readFile(file) {
  return fs.readFileSync(file, "utf8");
}

function writeFile(file, content) {
  fs.writeFileSync(file, content, "utf8");
}

function backupFile() {
  const target = path.join(backupRoot, relative);
  ensureDir(path.dirname(target));
  fs.copyFileSync(filePath, target);
  return target;
}

function functionBounds(text, functionName) {
  const results = [];
  const re = new RegExp(`(?:async\\s+)?function\\s+${functionName}\\s*\\(`, "g");
  let match;

  while ((match = re.exec(text)) !== null) {
    const start = match.index;
    const openBrace = text.indexOf("{", match.index);

    if (openBrace < 0) {
      continue;
    }

    let depth = 0;

    for (let i = openBrace; i < text.length; i++) {
      if (text[i] === "{") {
        depth++;
      }

      if (text[i] === "}") {
        depth--;

        if (depth === 0) {
          results.push({ start, end: i + 1, name: functionName });
          re.lastIndex = i + 1;
          break;
        }
      }
    }
  }

  return results;
}

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function removeRanges(text, ranges) {
  const sorted = ranges.slice().sort((a, b) => b.start - a.start);
  let output = text;

  for (const range of sorted) {
    output = output.slice(0, range.start) + output.slice(range.end);
  }

  return output;
}

if (!fs.existsSync(filePath)) {
  throw new Error(`Missing ${relative}`);
}

backupFile();

let text = readFile(filePath);
text = text.replace(/\basync\s+async\s+function\b/g, "async function");

const helperNames = [
  "safeMatrixMatch",
  "identifyVideoWallSpecificity",
  "identifyVideowallSpecificity",
  "curatedVideoWallCandidates",
  "identifyHdbasetMatrixSpecificity",
  "curatedHdbasetMatrixCandidates",
  "identifyHdbasetSpecificity",
  "buildCuratedWyrestormCandidates",
  "hasExplicitMultiviewFeature",
  "hasOnlyMultipleOutputsNotMultiview",
  "wyrestormCandidateSupportsMultiviewRole",
  "buildVerifiedSpecProfile",
  "sanitizeSpecProfileForComparison"
];

const removals = [];

for (const name of helperNames) {
  const found = functionBounds(text, name);

  if (found.length <= 1) {
    continue;
  }

  const keep = found[found.length - 1];
  const remove = found.slice(0, -1);
  removals.push(...remove);

  console.log(`Duplicate function: ${name}`);
  console.log(`  keeping line ${lineNumberForIndex(text, keep.start)}`);

  for (const item of remove) {
    console.log(`  removing earlier line ${lineNumberForIndex(text, item.start)}`);
  }
}

if (removals.length > 0) {
  text = removeRanges(text, removals);
}

writeFile(filePath, text);

console.log("");
console.log(`Removed ${removals.length} duplicate function declaration(s).`);
console.log(`Backup saved to: ${backupRoot}`);