import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const START_MARKER = "<!-- release-evidence:start -->";
export const END_MARKER = "<!-- release-evidence:end -->";

const DOCS = [
  "docs/CURRENT_STATUS.md",
  "docs/PRE_PRODUCTION_REPORT.md",
  "docs/V1_RELEASE_EVIDENCE.md",
];

function required(value, label, id) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Criterion ${id || "(unknown)"} requires ${label}.`);
}

export function validateManifest(manifest) {
  if (!Array.isArray(manifest?.criteria) || manifest.criteria.length === 0) throw new Error("Release evidence manifest requires criteria.");
  const states = new Map();
  for (const criterion of manifest.criteria) {
    required(criterion?.id, "an id");
    required(criterion?.title, "a title", criterion.id);
    required(criterion?.owner, "an owner", criterion.id);
    required(criterion?.closureCondition, "a closure condition", criterion.id);
    if (!["pass", "partial", "blocked"].includes(criterion.claimedStatus)) throw new Error(`Criterion ${criterion.id} has an invalid status.`);
    if (states.has(criterion.id) && states.get(criterion.id) !== criterion.claimedStatus) {
      throw new Error(`Criterion ${criterion.id} has contradictory states.`);
    }
    if (states.has(criterion.id)) throw new Error(`Criterion ${criterion.id} is duplicated.`);
    states.set(criterion.id, criterion.claimedStatus);
  }
  return manifest;
}

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function statusLabel(status) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function evidenceLink(criterion) {
  if (!criterion.artifactPath) return "Evidence not supplied";
  const label = criterion.measuredAt ? criterion.measuredAt.slice(0, 10) : "Artifact";
  const path = criterion.artifactPath.replaceAll("\\", "/").replace(/^docs\//, "");
  return `[${label}](${path})`;
}

export function generateReleaseSection(input) {
  const manifest = validateManifest(input);
  const metadata = manifest.generatedMetadata ?? {};
  const measuredAt = metadata.measuredAt ? String(metadata.measuredAt).slice(0, 10) : "not measured";
  const commit = metadata.commit || "not recorded";
  const rows = manifest.criteria.map((criterion) =>
    `| ${escapeCell(criterion.title)} | **${statusLabel(criterion.claimedStatus)}** | ${evidenceLink(criterion)} | ${escapeCell(criterion.owner)} | ${escapeCell(criterion.closureCondition)} |`,
  );
  return [
    START_MARKER,
    "## Release evidence status",
    "",
    `_Generated from \`docs/release-evidence/release-evidence-manifest.json\` · Measured: ${measuredAt} · Commit: ${commit}_`,
    "",
    "| Criterion | Status | Artifact | Owner | Closure condition |",
    "|---|---|---|---|---|",
    ...rows,
    END_MARKER,
  ].join("\n");
}

export function replaceGeneratedSection(document, section) {
  const start = document.indexOf(START_MARKER);
  const end = document.indexOf(END_MARKER);
  if (start >= 0 && end > start) return `${document.slice(0, start)}${section}${document.slice(end + END_MARKER.length)}`;
  const heading = document.match(/^# .+$/m)?.[0];
  return `${heading ?? "# Release status"}\n\n${section}\n`;
}

export function generateReleaseDocuments({ root = process.cwd(), check = false } = {}) {
  const manifestPath = resolve(root, "docs/release-evidence/release-evidence-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const section = generateReleaseSection(manifest);
  const dirty = [];
  for (const relativePath of DOCS) {
    const path = resolve(root, relativePath);
    const current = readFileSync(path, "utf8");
    const generated = replaceGeneratedSection(current, section);
    if (generated === current) continue;
    dirty.push(relativePath);
    if (!check) writeFileSync(path, generated, "utf8");
  }
  if (check && dirty.length) throw new Error(`Generated release documentation is stale: ${dirty.join(", ")}`);
  return { dirty };
}

function runCli() {
  try {
    const check = process.argv.includes("--check");
    const { dirty } = generateReleaseDocuments({ check });
    process.stdout.write(check ? "[release-docs] Generated sections are current.\n" : `[release-docs] Updated ${dirty.length} document(s).\n`);
  } catch (error) {
    console.error(`[release-docs] ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runCli();
