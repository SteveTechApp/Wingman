import fs from "node:fs";
import path from "node:path";
import { atomicWriteJsonSync } from "./lib/atomic-json-writer.mjs";
import {
  ROUTE_REGISTRY_PATHS,
  STALE_LINK_BASELINE_PATH,
  STALE_LINK_BASELINE_POLICY,
  compareStaleLinks,
  mergeStaleLinkBaseline,
  readRouteRegistryDirect,
} from "./lib/route-registry-direct.mjs";

/**
 * The reporter for the direct route-registry audit.
 *
 * What this script is for — the registry's own imports, catalogue paths, the Product
 * Call Cards ownership verdict, the `/wingman` links no route table serves and the orphan
 * ComparePage — is read by `readRouteRegistryDirect`, which `route-registry-direct.test.mjs`
 * holds against trees written for each shape. What is left here is the adapters: the
 * walk over `src` and the reading of each file, because that is the part that has to
 * touch this checkout, and the printing, because that is the part that has to look
 * like the report it has always printed.
 *
 * The route manifest is an adapter too, and one that fails the run rather than reading
 * as an answer: the link scan is held to the addresses it declares, so a manifest this
 * cannot read would list every link in the tree as stale — a report that looks like a
 * broken tree when the broken thing is the read.
 *
 * The stale-link section is the one part of this report that sets the exit code, and the
 * baseline it is held to (`STALE_LINK_BASELINE_PATH`) fails the run when the file is
 * there but cannot be read, for the same reason the manifest does: a file that has
 * drifted into rubbish would report every decision as work and every recorded file as
 * suspect. An absent file is not that — it reads as no decisions made yet, so the run
 * reports every stale link as work (and the updater can create the file).
 */

const repo = process.cwd();

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const files = [];

  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);

    if (item.isDirectory()) {
      if (!["node_modules", "dist", ".git", "build"].includes(item.name)) {
        files.push(...walk(full));
      }
      continue;
    }

    if (/\.(ts|tsx|js|jsx)$/.test(item.name)) {
      files.push(full);
    }
  }

  return files;
}

const sourceFiles = walk(path.join(repo, "src")).map((file) => ({
  path: path.relative(repo, file).replaceAll("\\", "/"),
  text: fs.readFileSync(file, "utf8"),
}));

const manifestFile = path.join(repo, ROUTE_REGISTRY_PATHS.routeManifest);
let routeManifest = [];
try {
  routeManifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
} catch {
  console.log("");
  console.log("== WINGMAN ROUTE REGISTRY DIRECT AUDIT ==");
  console.log("");
  console.log(`Missing: ${ROUTE_REGISTRY_PATHS.routeManifest}`);
  process.exit(1);
}

const baselineFile = path.join(repo, STALE_LINK_BASELINE_PATH);
let staleLinkBaseline = [];
// The date the allowance was last written, read beside the entries so the run can
// print it: a count with no date says how much the list allows, not whether it grew
// this week or two months ago. Null when the file does not exist, which the report
// says apart from a file that is simply empty.
let staleLinkBaselineUpdatedAt = null;
try {
  const parsed = JSON.parse(fs.readFileSync(baselineFile, "utf8"));
  if (!Array.isArray(parsed?.links)) {
    throw new Error("it has no links array");
  }
  staleLinkBaseline = parsed.links;
  staleLinkBaselineUpdatedAt = typeof parsed.updatedAt === "string" ? parsed.updatedAt : "undated";
} catch (error) {
  if (error.code !== "ENOENT") {
    console.log("");
    console.log("== WINGMAN ROUTE REGISTRY DIRECT AUDIT ==");
    console.log("");
    console.log(`Unreadable: ${STALE_LINK_BASELINE_PATH} (${error.message})`);
    process.exit(1);
  }
}

const reading = readRouteRegistryDirect({ sourceFiles, routeManifest });

// The one way to write the baseline, and it writes from the run's own reading rather
// than from what a person typed: the file then says exactly what the tree holds, and the
// reason field is left empty for the entries that are new, so the next run reports them
// instead of accepting them.
if (process.argv.includes("--update-baseline")) {
  staleLinkBaseline = mergeStaleLinkBaseline({
    baseline: staleLinkBaseline,
    links: reading.unownedLinks,
  });
  staleLinkBaselineUpdatedAt = new Date().toISOString().slice(0, 10);
  atomicWriteJsonSync(baselineFile, {
    policy: STALE_LINK_BASELINE_POLICY,
    updatedAt: staleLinkBaselineUpdatedAt,
    links: staleLinkBaseline,
  });
  console.log("");
  console.log(`Updated ${STALE_LINK_BASELINE_PATH} from this run's reading.`);
}

console.log("");
console.log("== WINGMAN ROUTE REGISTRY DIRECT AUDIT ==");
console.log("");

if (reading.missingRoutesFile) {
  console.log(`Missing: ${reading.routesPath}`);
  process.exit(1);
}

console.log("== routes.tsx lazy imports ==");
for (const item of reading.routeImports) {
  console.log(
    `${item.key.padEnd(24)} line ${String(item.line).padStart(3)}  ${item.source}  =>  ${item.resolved || "UNRESOLVED"}`,
  );
}

if (!reading.routeImports.length) {
  console.log("No lazy route imports found. routes.tsx may use a different pattern.");
}

console.log("");
console.log("== routeCatalog.ts /wingman paths ==");
for (const item of reading.catalogPaths) {
  console.log(`${item.key.padEnd(24)} line ${String(item.line).padStart(3)}  ${item.routePath}`);
}

console.log("");
console.log("== page files imported by routes.tsx ==");
for (const item of reading.importStatuses) {
  console.log(`${(item.exists ? "OK" : "MISSING").padEnd(8)} ${item.key.padEnd(24)} ${item.resolved || item.source}`);
}

console.log("");
console.log("== Product Call Cards ownership ==");
const { canonicalPath, canonicalExists, legacyPath, legacyFiles, ownershipOk } = reading.productCallCards;
console.log(`${canonicalExists ? "OK" : "MISSING"}  ${canonicalPath}`);
console.log(
  `${legacyFiles.length ? "STALE" : "OK"}  one routed implementation; no legacy multi-page duplicate` +
    (legacyFiles.length ? ` (${legacyPath} holds ${legacyFiles.length}: ${legacyFiles.join(", ")})` : ""),
);

if (!ownershipOk) {
  process.exitCode = 1;
}

console.log("");
console.log("== files importing Product Call Cards files ==");
for (const file of reading.productCallCardsImporters) {
  console.log(file);
}

console.log("");
console.log("== /wingman links the route tables do not serve ==");
console.log(
  `held to ${reading.declaredAddresses.length} addresses from ${reading.routeManifestPath}`
    + ` and ${reading.routerAddresses.length} rows registered by ${reading.routesPath};`
    + " a parameter and a splat each serve the addresses below them:",
);
const allowanceSince = staleLinkBaselineUpdatedAt && staleLinkBaselineUpdatedAt !== "undated"
  ? `, last updated ${staleLinkBaselineUpdatedAt}`
  : ", with no updatedAt recorded";
console.log(
  staleLinkBaselineUpdatedAt
    ? `Allowance: ${staleLinkBaseline.length} stale link(s) in ${STALE_LINK_BASELINE_PATH}${allowanceSince}.`
    : `Allowance: none — there is no ${STALE_LINK_BASELINE_PATH} yet, so every stale link below fails the run.`,
);
if (!reading.unownedLinks.length) {
  console.log("No /wingman link names an address the manifest or the router does not serve.");
}
for (const link of reading.unownedLinks) {
  const compared = link.address === link.routePath ? "" : `  (as ${link.address})`;
  console.log(`${link.file}:${link.line}  ${link.routePath}${compared}`);
}

// The verdict. A stale link here is either a link to fix or a decision to write down, and
// the run cannot tell which without the baseline, so the section named each one and left
// it at that — which read as a pass. It is the one question in this report about the
// tree's behaviour rather than the registry's shape: a renamed address is a link a rep
// clicks into a dead page, and the lines above are how the last rename was found.
const staleLinkGate = compareStaleLinks({
  links: reading.unownedLinks,
  baseline: staleLinkBaseline,
});

if (staleLinkGate.added.length) {
  console.error("");
  console.error(
    `[route-registry-direct] FAILED. ${staleLinkGate.added.length} stale /wingman link(s) no decision covers:`,
  );
  for (const link of staleLinkGate.added) {
    console.error(`- ${link.file}:${link.line}  ${link.routePath}`);
  }
  console.error(
    "Each one is a link to a page the route tables do not serve. Fix the address, or — if the address is the point, as a spec's negative case is — record it with its reason:",
  );
  console.error(`  node tools/audit-wingman-route-registry-direct.mjs --update-baseline  then fill in reason in ${STALE_LINK_BASELINE_PATH}`);
  process.exitCode = 1;
}

if (staleLinkGate.stale.length) {
  console.error("");
  console.error(
    `[route-registry-direct] FAILED. ${staleLinkGate.stale.length} recorded allowance(s) this tree no longer needs: the baseline only ratchets down.`,
  );
  for (const entry of staleLinkGate.stale) {
    console.error(`- ${entry.file} — ${entry.address}`);
  }
  console.error(
    `The link was fixed or removed, so the entry is now a note that its file is suspect. Drop it: node tools/audit-wingman-route-registry-direct.mjs --update-baseline`,
  );
  process.exitCode = 1;
}

if (staleLinkGate.unreasoned.length) {
  console.error("");
  console.error(
    `[route-registry-direct] FAILED. ${staleLinkGate.unreasoned.length} recorded allowance(s) do not say what the address is for:`,
  );
  for (const entry of staleLinkGate.unreasoned) {
    console.error(`- ${entry.file} — ${entry.address}`);
  }
  console.error(
    `An allowance is a decision, and a decision without a sentence is one a reader cannot review. Say what the address is for in ${STALE_LINK_BASELINE_PATH}.`,
  );
  process.exitCode = 1;
}

if (
  reading.unownedLinks.length &&
  !staleLinkGate.added.length &&
  !staleLinkGate.stale.length &&
  !staleLinkGate.unreasoned.length
) {
  console.log(
    `Every one of them is recorded with its reason in ${STALE_LINK_BASELINE_PATH}; a link added or renamed here fails the run.`,
  );
}

console.log("");
console.log("== orphan ComparePage check ==");
if (!reading.comparePage.exists) {
  console.log("ComparePage.tsx does not exist.");
} else {
  console.log(`${reading.comparePage.path} exists`);
  console.log(
    `Imported by: ${reading.comparePage.importedBy.length ? reading.comparePage.importedBy.join(", ") : "nothing detected"}`,
  );
}

console.log("");
console.log("Audit complete.");
