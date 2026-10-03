import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const reportDir = path.join(root, "reports");
fs.mkdirSync(reportDir, { recursive: true });

const SOURCE_EXTENSIONS = [".ts", ".tsx"];
const IMPORT_LINE = /^\s*(?:import|export)\s+(?:type\s+)?(?:\*(?:\s+as\s+\w+)?|[^"';]+from\s+)?["']([^"']+)["']/gm;
const DYNAMIC_IMPORT = /import\(\s*["']([^"']+)["']\s*\)/g;
const unfinishedPattern = /\b(TODO|FIXME|WIP|NOT IMPLEMENTED|COMING SOON|UNDER CONSTRUCTION)\b/i;

function relative(filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/");
}

function listFiles(startDir) {
  const output = [];
  const stack = [startDir];

  while (stack.length) {
    const current = stack.pop();
    if (!fs.existsSync(current)) continue;

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "_backups") continue;
      const full = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }

      if (SOURCE_EXTENSIONS.includes(path.extname(entry.name))) {
        output.push(full);
      }
    }
  }

  return output;
}

function resolveSpecifier(fromFile, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    ...SOURCE_EXTENSIONS.map((extension) => base + extension),
    ...SOURCE_EXTENSIONS.map((extension) => path.join(base, "index" + extension)),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function importsOf(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const specifiers = new Set();
  let match;

  IMPORT_LINE.lastIndex = 0;
  while ((match = IMPORT_LINE.exec(source)) !== null) specifiers.add(match[1]);

  DYNAMIC_IMPORT.lastIndex = 0;
  while ((match = DYNAMIC_IMPORT.exec(source)) !== null) specifiers.add(match[1]);

  return [...specifiers]
    .map((specifier) => resolveSpecifier(filePath, specifier))
    .filter(Boolean);
}

const manifestPath = path.join(root, "src", "wingman2", "app", "route-manifest.json");
const policyPath = path.join(root, "tools", "wingman-feature-surface-policy.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8").replace(/^\uFEFF/, ""));
const policy = fs.existsSync(policyPath)
  ? JSON.parse(fs.readFileSync(policyPath, "utf8").replace(/^\uFEFF/, ""))
  : { approvedRouteKeys: [], retiredRouteKeys: [] };
const allSource = listFiles(path.join(root, "src")).filter((file) => !/\.test\.tsx?$/.test(file));

const entry = path.join(root, "src", "main.tsx");
const reachable = new Set();
const stack = [entry];

while (stack.length) {
  const current = stack.pop();
  if (!current || reachable.has(current) || !fs.existsSync(current)) continue;
  reachable.add(current);
  importsOf(current).forEach((target) => {
    if (!reachable.has(target)) stack.push(target);
  });
}

const scanRoots = [
  path.join(root, "src", "wingman2", "pages"),
  path.join(root, "src", "wingman2", "components"),
  path.join(root, "src", "wingman2", "lib"),
  path.join(root, "src", "wingman2", "data"),
];

const candidates = allSource.filter((file) =>
  scanRoots.some((scanRoot) => file.startsWith(scanRoot + path.sep)),
);

const approvedUnreachableSources = new Set(
  Array.isArray(policy.approvedUnreachableSources) ? policy.approvedUnreachableSources : [],
);

const intentionallyNonRuntime = candidates
  .filter((file) => !reachable.has(file))
  .map(relative)
  .filter((file) => approvedUnreachableSources.has(file))
  .sort();

const unreachable = candidates
  .filter((file) => !reachable.has(file))
  .map(relative)
  .filter((file) => !approvedUnreachableSources.has(file))
  .sort();

const unfinished = [...reachable]
  .filter((file) => SOURCE_EXTENSIONS.includes(path.extname(file)))
  .flatMap((file) => {
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    return lines.flatMap((line, index) =>
      unfinishedPattern.test(line)
        ? [{ file: relative(file), line: index + 1, text: line.trim().slice(0, 180) }]
        : [],
    );
  });

const duplicateKeys = [];
const duplicatePaths = [];
const keySet = new Set();
const pathSet = new Set();

for (const route of manifest) {
  if (keySet.has(route.key)) duplicateKeys.push(route.key);
  if (pathSet.has(route.path)) duplicatePaths.push(route.path);
  keySet.add(route.key);
  pathSet.add(route.path);
}

const missingPageFiles = manifest
  .filter((route) => !fs.existsSync(path.join(root, "src", "wingman2", "pages", route.pageFile)))
  .map((route) => ({ key: route.key, pageFile: route.pageFile }));

const overlapWarnings = [];
const approvedDistinctRoutePairs = Array.isArray(policy.approvedDistinctRoutePairs)
  ? policy.approvedDistinctRoutePairs
  : [];

function approvedDistinctPair(left, right) {
  return approvedDistinctRoutePairs.some((entry) => {
    const routes = Array.isArray(entry?.routes) ? entry.routes : [];
    return routes.includes(left) && routes.includes(right);
  });
}

if (
  keySet.has("salesHelper") &&
  keySet.has("callCoach") &&
  !approvedDistinctPair("salesHelper", "callCoach")
) {
  overlapWarnings.push("Sales Helper and Call Coach are both routed. Confirm that their customer intents remain distinct.");
}

const approvedRouteKeys = new Set(Array.isArray(policy.approvedRouteKeys) ? policy.approvedRouteKeys : []);
const retiredRouteKeys = new Set(Array.isArray(policy.retiredRouteKeys) ? policy.retiredRouteKeys : []);
const manifestRouteKeys = new Set(manifest.map((route) => route.key));
const unapprovedRoutes = [...manifestRouteKeys].filter((key) => !approvedRouteKeys.has(key));
const missingApprovedRoutes = [...approvedRouteKeys].filter((key) => !manifestRouteKeys.has(key));
const returnedRetiredRoutes = [...retiredRouteKeys].filter((key) => manifestRouteKeys.has(key));

const critical = [
  ...duplicateKeys.map((value) => `Duplicate route key: ${value}`),
  ...duplicatePaths.map((value) => `Duplicate route path: ${value}`),
  ...missingPageFiles.map((item) => `Missing page for route ${item.key}: ${item.pageFile}`),
  ...unapprovedRoutes.map((value) => `Unapproved live route: ${value}`),
  ...missingApprovedRoutes.map((value) => `Approved route missing from manifest: ${value}`),
  ...returnedRetiredRoutes.map((value) => `Retired route returned: ${value}`),
];

const report = {
  generatedAt: new Date().toISOString(),
  routeCount: manifest.length,
  reachableSourceCount: reachable.size,
  unreachable,
  unfinished,
  overlapWarnings,
  critical,
};

fs.writeFileSync(
  path.join(reportDir, "wingman-feature-surface-audit.json"),
  JSON.stringify(report, null, 2) + "\n",
  "utf8",
);

const markdown = [
  "# Wingman Feature Surface Audit",
  "",
  `Generated: ${report.generatedAt}`,
  "",
  "## Summary",
  "",
  `- Routed features: ${report.routeCount}`,
  `- Reachable source modules: ${report.reachableSourceCount}`,
  `- Unreachable source candidates: ${unreachable.length}`,
  `- Unfinished markers in reachable code: ${unfinished.length}`,
  `- Critical route problems: ${critical.length}`,
  "",
  "## Critical route problems",
  "",
  ...(critical.length ? critical.map((item) => "- " + item) : ["None."]),
  "",
  "## Potentially unreachable source",
  "",
  ...(unreachable.length ? unreachable.map((item) => "- " + item) : ["None detected."]),
  "",
  "## Intentional non-runtime support",
  "",
  ...(intentionallyNonRuntime.length ? intentionallyNonRuntime.map((item) => "- " + item) : ["None."]),
  "",
  "## Unfinished markers in live code",
  "",
  ...(unfinished.length
    ? unfinished.map((item) => `- ${item.file}:${item.line} — ${item.text}`)
    : ["None detected."]),
  "",
  "## Overlapping feature surfaces requiring a deliberate decision",
  "",
  ...(overlapWarnings.length ? overlapWarnings.map((item) => "- " + item) : ["None detected."]),
  "",
  "Unreachable and overlapping items are reported rather than deleted automatically. Delete only after confirming that no runtime, data, export or migration path depends on them.",
  "",
].join("\n");

fs.writeFileSync(
  path.join(reportDir, "wingman-feature-surface-audit.md"),
  markdown,
  "utf8",
);

console.log(`[feature-surface] Routes: ${report.routeCount}`);
console.log(`[feature-surface] Unreachable candidates: ${unreachable.length}`);
console.log(`[feature-surface] Unfinished live markers: ${unfinished.length}`);
console.log("[feature-surface] Report: reports/wingman-feature-surface-audit.md");

if (critical.length) {
  critical.forEach((item) => console.error("- " + item));
  process.exit(1);
}
