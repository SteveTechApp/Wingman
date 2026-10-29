import fs from "node:fs";
import path from "node:path";
import { BROWSER_READINGS_REPORT, READING_SECTION_IDS } from "./lib/browser-readings-sections.mjs";

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

// Which report sections a doc note claims. The report is generated, so its own
// index cannot be the record: this asks the notes, which are the half that ships.
const linkedReadingSections = new Set();

const markdownFiles = walk(root).filter((file) => file.toLowerCase().endsWith(".md"));
for (const file of markdownFiles) {
  const relative = path.relative(root, file);
  const text = fs.readFileSync(file, "utf8");

  for (const match of text.matchAll(/\[[^\]]*]\(([^)]+)\)/g)) {
    const target = match[1].trim().replace(/^<|>$/g, "");
    const localTarget = target.split("#")[0];
    if (!localTarget || /^(https?:|mailto:|#)/i.test(target)) continue;
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(localTarget));

    // Resolved rather than matched as text: a note links the report from docs/'s
    // own depth (`../reports/...`), and what the check cares about is the file.
    const resolvedRelative = path.relative(root, resolved).split(path.sep).join("/");
    // The report is generated and `reports/` is ignored, so a note's link to it has
    // nothing to resolve on a clean checkout — the section it names is checked
    // against the index below, which is the half that ships. Anything else has to be
    // a path in the repo, or the note sends a reader nowhere.
    if (resolvedRelative !== BROWSER_READINGS_REPORT && !fs.existsSync(resolved)) {
      errors.push(`${relative} links to missing local path: ${target}`);
    }
    if (resolvedRelative !== BROWSER_READINGS_REPORT) continue;
    const anchor = (target.split("#")[1] ?? "").trim();
    if (!anchor) {
      errors.push(`${relative} links the browser readings without naming a section: ${target} (a report-wide link points at no surface)`);
      continue;
    }
    if (!READING_SECTION_IDS.has(anchor)) {
      errors.push(`${relative} links a browser-readings section the report does not print: #${anchor}`);
      continue;
    }
    linkedReadingSections.add(anchor);
  }

  for (const match of text.matchAll(/npm run ([a-zA-Z0-9:_-]+)/g)) {
    if (!scripts.has(match[1])) errors.push(`${relative} references missing npm script: ${match[1]}`);
  }
}

// A section with no note is a reading nobody can find, which is the same as not
// having measured it; the walk files its lines by this table, so the table is what
// the note count is asked against rather than a second list of surfaces.
for (const id of READING_SECTION_IDS) {
  if (!linkedReadingSections.has(id)) {
    errors.push(
      `No doc note links ${BROWSER_READINGS_REPORT}#${id}: the surface it measures has no reading a rep or a developer can find.`,
    );
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
if (String(packageJson.scripts?.build ?? "").includes("data:")) {
  errors.push("npm run build must leave tracked catalogue sources unchanged.");
}
if (!String(packageJson.scripts?.["build:prepare-data"] ?? "").includes("data:canonical-products")) {
  errors.push("Explicit build:prepare-data must compile canonical catalogues before deployment.");
}
requireText("tools/vitest-global-setup.mjs", /--canonical-only/, "Test bootstrap must generate only the ignored canonical store.");

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
  `[documentation-contract] Verified ${markdownFiles.length} active Markdown files, implementation links, ${linkedReadingSections.size} browser-readings sections claimed by a doc note, deployment wiring, and safety contracts.`,
);
