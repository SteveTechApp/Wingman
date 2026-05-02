import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const backupRoot = path.join(repoRoot, "_RECOVERY", `repair-dangling-function-fragment-${stamp}`);
const relative = path.join("server", "competitor", "compare-intelligence.mjs");
const filePath = path.join(repoRoot, relative);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

if (!fs.existsSync(filePath)) {
  throw new Error(`Missing ${relative}`);
}

const backupPath = path.join(backupRoot, relative);
ensureDir(path.dirname(backupPath));
fs.copyFileSync(filePath, backupPath);

let lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
const output = [];
let removedBlocks = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const nextLine = lines[i + 1] || "";
  const nextNextLine = lines[i + 2] || "";

  const isDanglingKnownProductFragment =
    line.trim() === "}) {" &&
    nextLine.includes('const brand = lower(input.brand || "")') &&
    nextNextLine.includes("const sku = cleanText(input.sku");

  if (!isDanglingKnownProductFragment) {
    output.push(line);
    continue;
  }

  removedBlocks++;

  let depth = 1;
  i++;

  for (; i < lines.length; i++) {
    const current = lines[i];

    for (const char of current) {
      if (char === "{") {
        depth++;
      }

      if (char === "}") {
        depth--;
      }
    }

    if (depth <= 0) {
      break;
    }
  }
}

let text = output.join("\n");
text = text.replace(/\basync\s+async\s+function\b/g, "async function");

fs.writeFileSync(filePath, text, "utf8");

console.log("");
console.log(`Removed ${removedBlocks} dangling duplicate function fragment(s).`);
console.log(`Backup saved to: ${backupRoot}`);