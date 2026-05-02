import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const backupRoot = path.join(repoRoot, "_RECOVERY", `repair-compare-dangling-profile-fragment-${stamp}`);
const relative = path.join("server", "competitor", "compare-intelligence.mjs");
const filePath = path.join(repoRoot, relative);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function countBraces(line) {
  let count = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let escaped = false;

  for (const char of line) {
    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (!inDouble && !inTemplate && char === "'") {
      inSingle = !inSingle;
      continue;
    }

    if (!inSingle && !inTemplate && char === '"') {
      inDouble = !inDouble;
      continue;
    }

    if (!inSingle && !inDouble && char === "`") {
      inTemplate = !inTemplate;
      continue;
    }

    if (inSingle || inDouble || inTemplate) {
      continue;
    }

    if (char === "{") {
      count++;
    }

    if (char === "}") {
      count--;
    }
  }

  return count;
}

if (!fs.existsSync(filePath)) {
  throw new Error(`Missing ${relative}`);
}

const backupPath = path.join(backupRoot, relative);
ensureDir(path.dirname(backupPath));
fs.copyFileSync(filePath, backupPath);

const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
const output = [];
let removedFragments = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const nextLine = lines[i + 1] || "";

  const isDanglingBuildVerifiedSpecProfileFragment =
    line.trim() === "}) {" &&
    nextLine.includes("const key = knownProductKeyForVerifiedFacts(input);");

  const isDanglingKnownProductKeyFragment =
    line.trim() === "}) {" &&
    nextLine.includes('const brand = lower(input.brand || "")');

  if (!isDanglingBuildVerifiedSpecProfileFragment && !isDanglingKnownProductKeyFragment) {
    output.push(line);
    continue;
  }

  removedFragments++;

  // The malformed line is standing where the valid previous function needs a closing brace.
  output.push("}");

  // Now skip the stale duplicate fragment body that began after the dangling "{"
  let depth = 1;

  for (i = i + 1; i < lines.length; i++) {
    depth += countBraces(lines[i]);

    if (depth <= 0) {
      break;
    }
  }
}

let text = output.join("\n");
text = text.replace(/\basync\s+async\s+function\b/g, "async function");

fs.writeFileSync(filePath, text, "utf8");

console.log("");
console.log(`Removed ${removedFragments} dangling duplicate fragment(s).`);
console.log(`Backup saved to: ${backupRoot}`);