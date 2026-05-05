import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcRoot = path.join(root, "src");
const allowed = new Set([
  "src/main.tsx"
]);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const out = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "dist", ".git", "archive", "backups"].includes(entry.name)) continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      out.push(...walk(full));
      continue;
    }

    if ([".ts", ".tsx"].includes(path.extname(entry.name))) {
      out.push(full);
    }
  }

  return out;
}

function rel(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

const offenders = [];

for (const file of walk(srcRoot)) {
  const relative = rel(file);
  const raw = fs.readFileSync(file, "utf8");
  const matches = [...raw.matchAll(/import\s+["']([^"']+\.css)["'];/g)];

  if (matches.length === 0) continue;
  if (allowed.has(relative)) continue;

  for (const match of matches) {
    offenders.push({
      file: relative,
      import: match[1],
    });
  }
}

if (offenders.length > 0) {
  console.error("Blocked: CSS imports are only allowed through src/main.tsx -> wingman-style-stack.css");
  console.error("");

  for (const offender of offenders) {
    console.error(`${offender.file} imports ${offender.import}`);
  }

  process.exit(1);
}

console.log("CSS import guard passed. Only main.tsx imports the Wingman style stack.");