import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const scripts = new Set(Object.keys(packageJson.scripts ?? {}));
const errors = [];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", "archive", "dist", "node_modules", "reports"].includes(entry.name)) return [];
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function requireText(relativePath, pattern, message) {
  if (!pattern.test(read(relativePath))) errors.push(message);
}

const markdownFiles = walk(root).filter((file) => file.toLowerCase().endsWith(".md"));
for (const file of markdownFiles) {
  const relative = path.relative(root, file);
  const text = fs.readFileSync(file, "utf8");

  for (const match of text.matchAll(/\[[^\]]*]\(([^)]+)\)/g)) {
    const target = match[1].trim().replace(/^<|>$/g, "");
    const localTarget = target.split("#")[0];
    if (!localTarget || /^(https?:|mailto:|#)/i.test(target)) continue;
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(localTarget));
    if (!fs.existsSync(resolved)) errors.push(`${relative} links to missing local path: ${target}`);
  }

  for (const match of text.matchAll(/npm run ([a-zA-Z0-9:_-]+)/g)) {
    if (!scripts.has(match[1])) errors.push(`${relative} references missing npm script: ${match[1]}`);
  }
}

const serverPackage = JSON.parse(read("server/package.json"));
if (!serverPackage.dependencies?.["@supabase/supabase-js"]) {
  errors.push("Production Supabase storage is documented but @supabase/supabase-js is absent from server/package.json.");
}

requireText(
  "Dockerfile.server",
  /data-sources\/[\s\S]*build-product-data-sources\.mjs[\s\S]*RUN node tools\/build-product-data-sources\.mjs/,
  "Dockerfile.server must compile canonical catalogues from tracked data-sources.",
);
requireText(
  "docker-compose.yml",
  /wingman-runtime:\/app\/data\/runtime/,
  "Docker Compose must persist data/runtime without hiding compiled catalogues under data/.",
);
if (/:\s*\/app\/data(?:\s|$)/m.test(read("docker-compose.yml"))) {
  errors.push("Docker Compose must not mount a volume over all of /app/data.");
}
if (!String(packageJson.scripts?.build ?? "").includes("data:canonical-products")) {
  errors.push("npm run build must compile the ignored canonical WyreStorm store in a clean checkout.");
}

const proposalSource = read("src/wingman2/lib/proposalExport.ts");
for (const heading of [
  "Confirmed Requirement",
  "Design Assumptions",
  "Recommended Architecture",
  "Required WyreStorm Products",
  "Optional Enhancements",
  "Risks / Needs Validation",
  "Next Steps",
]) {
  if (!proposalSource.includes(`<h2>${heading}</h2>`)) {
    errors.push(`Proposal export is missing required safety section: ${heading}`);
  }
}

requireText(
  "SECURITY.md",
  /Reporting a vulnerability[\s\S]*private/i,
  "SECURITY.md must contain a private vulnerability-reporting route.",
);
if (/Use this section to tell people/i.test(read("SECURITY.md"))) {
  errors.push("SECURITY.md still contains template placeholder copy.");
}

if (/187 products/i.test(read("docs/LAUNCH_CHECKLIST.md"))) {
  errors.push("Launch checklist still uses the retired 187-product baseline.");
}
if (/data\/\*\.json.*persisted runtime/i.test(read("src/wingman2/README.md"))) {
  errors.push("Wingman2 README treats generated source data as runtime persistence.");
}

if (errors.length) {
  console.error("[documentation-contract] Failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `[documentation-contract] Verified ${markdownFiles.length} active Markdown files, implementation links, deployment wiring, and safety contracts.`,
);
