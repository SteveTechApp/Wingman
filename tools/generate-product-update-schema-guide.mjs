import fs from "node:fs";
import path from "node:path";

const sources = [
  {
    title: "WyreStorm catalogue source",
    controlled: "data-imports/wyrestorm-catalogue-current.csv",
    incoming: "data-imports/incoming/wyrestorm-catalogue-source.csv",
    template: "data-imports/incoming/wyrestorm-catalogue-source.template.csv"
  },
  {
    title: "WyreStorm lifecycle source",
    controlled: "data-imports/wyrestorm-lifecycle-current.csv",
    incoming: "data-imports/incoming/wyrestorm-lifecycle-source.csv",
    template: "data-imports/incoming/wyrestorm-lifecycle-source.template.csv"
  },
  {
    title: "Competitor fingerprint source",
    controlled: "data-imports/competitor-fingerprints-current.csv",
    incoming: "data-imports/incoming/competitor-fingerprints-source.csv",
    template: "data-imports/incoming/competitor-fingerprints-source.template.csv"
  },
  {
    title: "Competitor review notes source",
    controlled: "data-imports/competitor-review-notes.csv",
    incoming: "data-imports/incoming/competitor-review-notes-source.csv",
    template: "data-imports/incoming/competitor-review-notes-source.template.csv"
  }
];

function fail(message) {
  console.error(`[product-update:schema-guide] ${message}`);
  process.exit(1);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function firstLine(file) {
  return read(file)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")[0]
    ?.trim() ?? "";
}

function parseCsvHeader(header) {
  const fields = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < header.length; i += 1) {
    const char = header[i];
    const next = header[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      fields.push(value.trim());
      value = "";
      continue;
    }

    value += char;
  }

  fields.push(value.trim());

  return fields.filter(Boolean);
}

function describeField(field) {
  const key = field.toLowerCase();

  if (key.includes("sku") || key.includes("model")) {
    return "Product or competitor model identifier. Keep consistent and do not mix aliases with canonical SKUs unless the column explicitly expects aliases.";
  }

  if (key.includes("product") || key.includes("name") || key.includes("title")) {
    return "Plain-English product name used for review and reporting.";
  }

  if (key.includes("brand") || key.includes("manufacturer")) {
    return "Manufacturer or brand name. Use WyreStorm only in WyreStorm source files.";
  }

  if (key.includes("family") || key.includes("series")) {
    return "Product family or series, used for grouping and recommendation context.";
  }

  if (key.includes("lifecycle") || key.includes("status")) {
    return "Commercial lifecycle value. Use governed values only, for example active, discontinued, end-of-life, review or do-not-spec where supported.";
  }

  if (key.includes("do_not") || key.includes("do-not") || key.includes("donotspec")) {
    return "Boolean quote-safety field. Use true only where Wingman must not recommend/specify the item.";
  }

  if (key.includes("review")) {
    return "Review marker or reviewer note. Use this to keep uncertain data out of trusted recommendation flow.";
  }

  if (key.includes("source") || key.includes("evidence") || key.includes("url")) {
    return "Evidence/source reference for later audit. Prefer official product pages, datasheets, reviewed exports or internal governed sources.";
  }

  if (key.includes("role") || key.includes("class") || key.includes("type")) {
    return "Product class or system role. Be precise: encoder, decoder, matrix, extender, camera, controller, processor, cable, accessory.";
  }

  if (key.includes("input") || key.includes("output") || key.includes("io") || key.includes("i_o")) {
    return "Signal I/O information. Count only independently routed/switched I/O; do not count mirrored or loop outputs as independent matrix outputs.";
  }

  if (key.includes("usb")) {
    return "USB support, transport or role information. Required for BYOM/BYOD, camera, speakerphone and touch workflows.";
  }

  if (key.includes("audio")) {
    return "Audio support information such as analogue audio, de-embed, Dante, ARC/eARC or amplifier/DSP notes where applicable.";
  }

  if (key.includes("control")) {
    return "Control capability such as RS-232, IR, CEC, LAN/API or contact closure where applicable.";
  }

  if (key.includes("confidence")) {
    return "Review confidence. Keep low/medium values for unverified competitor data.";
  }

  if (key.includes("note")) {
    return "Reviewer note. Use concise factual notes, not sales copy.";
  }

  return "Populate from reviewed source data. Leave blank only if the schema allows it and the field is genuinely unknown.";
}

const lines = [];

lines.push("# Product Update CSV Schema Guide");
lines.push("");
lines.push("Generated by `npm run product-update:schema-guide`.");
lines.push("");
lines.push("Use this guide when preparing real WyreStorm and competitor source files for `data-imports/incoming`.");
lines.push("");
lines.push("## Operating rule");
lines.push("");
lines.push("- Do not edit governed `*-current.csv` files directly for routine updates.");
lines.push("- Prepare incoming `*-source.csv` files first.");
lines.push("- Run `npm run product-update:check-incoming` before promotion.");
lines.push("- Run `npm run product-update:promote-incoming` only after preflight passes.");
lines.push("- Competitor rows are for comparison and positioning only, never WyreStorm BOM output.");
lines.push("");

for (const source of sources) {
  if (!fs.existsSync(source.controlled)) {
    fail(`Missing controlled CSV: ${source.controlled}`);
  }

  const header = firstLine(source.controlled);
  const fields = parseCsvHeader(header);

  if (fields.length === 0) {
    fail(`No CSV headers found in ${source.controlled}`);
  }

  lines.push(`## ${source.title}`);
  lines.push("");
  lines.push(`- Controlled file: \`${source.controlled}\``);
  lines.push(`- Incoming file: \`${source.incoming}\``);
  lines.push(`- Template file: \`${source.template}\``);
  lines.push("");
  lines.push("| Field | Guidance |");
  lines.push("| --- | --- |");

  for (const field of fields) {
    lines.push(`| \`${field}\` | ${describeField(field)} |`);
  }

  lines.push("");
}

lines.push("## Minimum review checklist");
lines.push("");
lines.push("- WyreStorm active/current products are separated from discontinued, unlisted, do-not-spec and review-only items.");
lines.push("- Matrix output counts distinguish routed outputs from mirrored, loop, local monitor and auxiliary outputs.");
lines.push("- AVoIP rows separate 1G and 10G families and do not imply cross-series interoperability.");
lines.push("- USB, audio and control fields are populated where they materially affect system design.");
lines.push("- Competitor fingerprints identify product class, role, I/O, bandwidth/resolution and relevant USB/control notes where known.");
lines.push("- Unknown competitor data is marked for review rather than treated as verified.");
lines.push("");

fs.mkdirSync("docs", { recursive: true });
fs.writeFileSync("docs/product-update-csv-schema-guide.md", `${lines.join("\n")}\n`, "utf8");

console.log("[product-update:schema-guide] Wrote docs/product-update-csv-schema-guide.md");
