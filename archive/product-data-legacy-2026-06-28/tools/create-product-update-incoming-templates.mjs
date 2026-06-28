import fs from "node:fs";
import path from "node:path";

const templates = [
  {
    source: "data-imports/wyrestorm-catalogue-current.csv",
    template: "data-imports/incoming/wyrestorm-catalogue-source.template.csv"
  },
  {
    source: "data-imports/wyrestorm-lifecycle-current.csv",
    template: "data-imports/incoming/wyrestorm-lifecycle-source.template.csv"
  },
  {
    source: "data-imports/competitor-fingerprints-current.csv",
    template: "data-imports/incoming/competitor-fingerprints-source.template.csv"
  },
  {
    source: "data-imports/competitor-review-notes.csv",
    template: "data-imports/incoming/competitor-review-notes-source.template.csv"
  }
];

function fail(message) {
  console.error(`[product-update:create-incoming-templates] ${message}`);
  process.exit(1);
}

function firstLine(text) {
  const normalised = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return normalised.split("\n")[0] ?? "";
}

for (const item of templates) {
  if (!fs.existsSync(item.source)) {
    fail(`Missing controlled source CSV: ${item.source}`);
  }

  const header = firstLine(fs.readFileSync(item.source, "utf8")).trim();

  if (!header) {
    fail(`Could not read CSV header from ${item.source}`);
  }

  fs.mkdirSync(path.dirname(item.template), { recursive: true });
  fs.writeFileSync(item.template, `${header}\n`, "utf8");

  console.log(`[product-update:create-incoming-templates] Wrote ${item.template}`);
}

console.log("\n[product-update:create-incoming-templates] Templates created. Copy each .template.csv to the matching -source.csv name before promotion.");
