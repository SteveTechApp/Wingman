import { readFileSync, writeFileSync } from "node:fs";

const decisionsPath = "data/wyrestorm-lifecycle-manual-decisions.json";
const productStoriesPath = "src/wingman2/data/productStories.ts";
const backlogPath = "docs/product-story-coverage-backlog.md";

const decisions = JSON.parse(readFileSync(decisionsPath, "utf8"));
const keep = decisions.keep.map((sku) => sku.toUpperCase());
const doNotUse = decisions.doNotUse.map((sku) => sku.toUpperCase());

const duplicated = keep.filter((sku) => doNotUse.includes(sku));

if (duplicated.length > 0) {
  throw new Error(`Manual lifecycle decision conflict: ${duplicated.join(", ")}`);
}

if (!keep.includes("SW-0X01-8K")) {
  throw new Error("SW-0X01-8K must remain in the keep list because X is a family/pattern placeholder.");
}

if (doNotUse.includes("SW-0X01-8K")) {
  throw new Error("SW-0X01-8K must not be in the do-not-use list.");
}

const productStories = readFileSync(productStoriesPath, "utf8").toUpperCase();
const storyOffenders = doNotUse.filter((sku) => productStories.includes(sku));

if (storyOffenders.length > 0) {
  throw new Error(`Do-not-use SKUs still referenced in productStories.ts: ${storyOffenders.join(", ")}`);
}

let backlog = "";

try {
  backlog = readFileSync(backlogPath, "utf8");
} catch {
  backlog = "# Product story coverage backlog\n";
}

const marker = "<!-- lifecycle-manual-decisions -->";
const manualSection = `
${marker}

## Manual lifecycle decisions

These SKUs have been reviewed separately from the generated lifecycle status.

### Keep / allow for review or storying

${keep.map((sku) => `- ${sku}`).join("\n")}

### Do not use / block from storying

${doNotUse.map((sku) => `- ${sku}`).join("\n")}

### Pattern note

- SW-0X01-8K is retained as a family / pattern reference. X denotes a variable number such as inputs, outputs or cable length.
`;

const markerIndex = backlog.indexOf(marker);

if (markerIndex >= 0) {
  backlog = backlog.slice(0, markerIndex).trimEnd() + "\n\n" + manualSection.trimStart();
}

if (markerIndex < 0) {
  backlog = backlog.trimEnd() + "\n\n" + manualSection.trimStart();
}

writeFileSync(backlogPath, backlog.trimEnd() + "\n", "utf8");

console.log("[lifecycle-manual-decisions] Keep:", keep.length);
console.log("[lifecycle-manual-decisions] Do not use:", doNotUse.length);
console.log("[lifecycle-manual-decisions] Story offenders:", storyOffenders.length);
