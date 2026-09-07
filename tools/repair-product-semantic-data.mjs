#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const APPLY = process.argv.includes("--apply");

function clean(v) {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}
function lower(v) {
  return clean(v).toLowerCase();
}
function num(v) {
  const text = clean(v);
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}
function writeJson(rel, value, pretty = true) {
  fs.writeFileSync(
    path.join(ROOT, rel),
    JSON.stringify(value, null, pretty ? 2 : 0) + "\n",
    "utf8",
  );
}
function payloadArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.profiles)) return payload.profiles;
  return [];
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    if (row.some((v) => v !== "")) rows.push(row);
  }

  if (!rows.length) return { headers: [], rows: [] };
  const headers = rows[0].map(clean);
  return {
    headers,
    rows: rows.slice(1).map((values) => {
      const out = {};
      headers.forEach((header, index) => {
        out[header] = values[index] ?? "";
      });
      return out;
    }),
  };
}

function csvEscape(v) {
  const text = String(v ?? "");
  return /[",\r\n]/.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}
function writeCsv(rel, headers, rows) {
  const body = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n") + "\n";
  fs.writeFileSync(path.join(ROOT, rel), body, "utf8");
}

function splitterSizeFromIdentity(sku, title) {
  const identity = `${sku} ${title}`;

  const explicit = identity
    .replaceAll("×", "x")
    .match(/\b1\s*x\s*(\d{1,2})\b/i);

  if (explicit) {
    const outputs = Number(explicit[1]);
    if (outputs >= 2 && outputs <= 64) {
      return { inputs: 1, outputs };
    }
  }

  const skuMatch = clean(sku)
    .toUpperCase()
    .match(/^(?:EXP-)?SP-01(\d{2})(?:-|$)/);

  if (skuMatch) {
    const outputs = Number(skuMatch[1]);
    if (outputs >= 2 && outputs <= 64) {
      return { inputs: 1, outputs };
    }
  }

  if (/^SP-618$/i.test(clean(sku))) {
    return { inputs: 1, outputs: 8 };
  }

  return null;
}

function isSplitterIdentity(sku, title, category = "", role = "") {
  const identity = lower(`${sku} ${title} ${category} ${role}`);
  if (/^(?:exp-)?sp-/i.test(clean(sku))) return Boolean(splitterSizeFromIdentity(sku, title));
  return /distribution amplifier|\bhdmi splitter\b|\bsplitter\b/.test(identity);
}

function cleanTechnicalIo(product, stats) {
  const profile = product?.technicalProfile;
  const io = profile?.io;
  if (!io || typeof io !== "object") return;

  const originalPorts = Array.isArray(io.ports) ? io.ports : [];
  const accessories = Array.isArray(io.accessories) ? [...io.accessories] : [];
  const kept = [];
  const seen = new Set();

  for (const port of originalPorts) {
    const count = num(port?.count);
    const evidence = clean(port?.evidence || port?.detail);
    const connector = clean(port?.connector);
    const combined = `${connector} ${evidence}`;

    const impossibleCount = count !== null && (count < 1 || count > 64);
    const resolutionAsPort =
      /\b(?:1920|2160|2560|3840|4096|5120|7680)\s*[x×]\s*(?:1080|1200|1440|1600|2160|2880|4320)\b/i.test(combined) &&
      count !== null &&
      count >= 1000;
    const zoomAsFibre =
      /\b\d+\s*x\s*optical(?:\s+zoom)?\b|\boptical\s+zoom\b/i.test(combined) &&
      /sfp|fibre|fiber|optical/i.test(connector);
    const accessory =
      /(?:ir|bluetooth)\s+remote\b|remote control|remote handset|quick\s*start|user guide|\bmanual\b|wall mount|rack mount|mounting bracket|rack bracket|battery not included|lens cap/i.test(evidence);

    if (impossibleCount || resolutionAsPort || zoomAsFibre || accessory) {
      accessories.push({ ...port, semanticDisposition: "accessory-or-capability" });
      stats.invalidPortsRemoved += 1;
      continue;
    }

    const next = { ...port };

    if (/5-?pin.*balanced.*audio|balanced.*audio.*5-?pin/i.test(evidence)) {
      next.connector = "Phoenix / Euroblock";
      next.category = "audio";
      stats.connectorCorrections += 1;
    }

    const signature = JSON.stringify([
      next.count,
      clean(next.connector).toLowerCase(),
      clean(next.direction).toLowerCase(),
      clean(next.category).toLowerCase(),
      clean(next.evidence).toLowerCase(),
    ]);

    if (seen.has(signature)) {
      stats.duplicatePortsRemoved += 1;
      continue;
    }
    seen.add(signature);
    kept.push(next);
  }

  const sku = clean(product.sku || product.id);
  const title = clean(product.name || product.title || product.summary);
  const size = isSplitterIdentity(sku, title, product.category, product.family)
    ? splitterSizeFromIdentity(sku, title)
    : null;

  if (size) {
    const withoutHdmiVideo = kept.filter((port) => {
      const direction = lower(port.direction);
      const videoHdmi = /\bhdmi\b/i.test(`${port.connector} ${port.evidence}`);
      return !(videoHdmi && (direction === "input" || direction === "output"));
    });

    withoutHdmiVideo.push(
      {
        count: 1,
        connector: "HDMI",
        direction: "input",
        category: "video",
        evidence: `Governed topology: ${size.inputs}x${size.outputs} HDMI splitter`,
        logicalFunction: "source-input",
      },
      {
        count: size.outputs,
        connector: "HDMI",
        direction: "output",
        category: "video",
        evidence: `Governed topology: ${size.inputs}x${size.outputs} mirrored HDMI distribution`,
        logicalFunction: "mirrored-output",
      },
    );

    kept.length = 0;
    kept.push(...withoutHdmiVideo);
    stats.splitterProfilesRebuilt += 1;

    product.topologyType = "one-to-many-mirrored";
    product.outputBehaviour = "mirrored";
    product.logicalInputs = 1;
    product.logicalOutputs = size.outputs;
    product.routedInputs = 0;
    product.routedOutputs = 0;
    product.routedInputCount = 0;
    product.routedOutputCount = 0;
    product.physicalOutputs = size.outputs;
    product.physicalOutputCount = size.outputs;
    product.physicalVideoOutputCount = size.outputs;
    product.mirroredOutputs = size.outputs;
    product.mirroredOutputCount = size.outputs;
    delete product.matrixInputs;
    delete product.matrixOutputs;
    delete product.matrixSize;
    delete product.matrixSizeEvidence;
  }

  io.ports = kept;
  for (const key of ["video", "audio", "usb", "network", "control", "other"]) {
    delete io[key];
  }

  for (const port of kept) {
    const category = ["video","audio","usb","network","control"].includes(lower(port.category))
      ? lower(port.category)
      : "other";
    io[category] ??= [];
    io[category].push(port);
  }

  const accessorySeen = new Set();
  io.accessories = accessories.filter((item) => {
    const signature = JSON.stringify(item);
    if (accessorySeen.has(signature)) return false;
    accessorySeen.add(signature);
    return true;
  });
  if (!io.accessories.length) delete io.accessories;

  product.connectors = [...new Set(kept.map((port) => clean(port.connector)).filter(Boolean))];
}

function repairWyrestormProductsCsv(stats) {
  const rel = "data-sources/wyrestorm/products.csv";
  const parsed = parseCsv(fs.readFileSync(path.join(ROOT, rel), "utf8"));

  for (const row of parsed.rows) {
    const sku = clean(row.sku);
    const title = clean(row.product_name);
    const size = splitterSizeFromIdentity(sku, title);

    if (!size || !isSplitterIdentity(sku, title, row.product_type, row.role)) {
      continue;
    }

    const before = JSON.stringify(row);

    row.family = "Splitter / Distribution";
    row.product_type = "Splitter / distribution amplifier";
    row.role = "primary-hardware";
    if ("transport_type" in row) row.transport_type = "HDMI";
    if ("inputs" in row) row.inputs = String(size.inputs);
    if ("outputs" in row) row.outputs = String(size.outputs);

    if (JSON.stringify(row) !== before) stats.wyrestormSourceRowsChanged += 1;
  }

  if (APPLY) writeCsv(rel, parsed.headers, parsed.rows);
}

function repairCompetitorCsvs(stats) {
  const dir = path.join(ROOT, "data-sources", "competitors");
  for (const fileName of fs.readdirSync(dir).filter((x) => x.toLowerCase().endsWith(".csv"))) {
    const rel = `data-sources/competitors/${fileName}`;
    const parsed = parseCsv(fs.readFileSync(path.join(ROOT, rel), "utf8"));
    let changed = 0;

    for (const row of parsed.rows) {
      // Product purpose must decide whether a record is a fixed distribution
      // amplifier. "one-to-many" is a topology shape shared by presentation
      // switchers, encoders and other products; using topology alone previously
      // zeroed valid routed I/O on products such as CYP EL-8100V.
      const identity = lower(
        `${row.product_name} ${row.product_class} ${row.subcategory} ${row.role} ${row.technology}`,
      );
      const fixedDistribution =
        /distribution amplifier|\bhdmi splitter\b|\bsplitter\b|\bduplicator\b|\bdistribution\b/.test(identity);

      if (!fixedDistribution) continue;

      const before = JSON.stringify(row);
      const outputs = num(row.output_count);
      const mirrored = num(row.mirrored_output_count);
      const physical = num(row.physical_output_count);
      const fanout = outputs ?? mirrored ?? physical;

      if ("routed_input_count" in row) row.routed_input_count = "0";
      if ("routed_output_count" in row) row.routed_output_count = "0";
      if (fanout !== null) {
        if ("physical_output_count" in row) row.physical_output_count = String(fanout);
        if ("mirrored_output_count" in row) row.mirrored_output_count = String(fanout);
      }
      if ("topology" in row) row.topology = "splitter/one-to-many";

      if (JSON.stringify(row) !== before) {
        changed += 1;
        stats.competitorRowsChanged += 1;
      }
    }

    if (APPLY && changed > 0) writeCsv(rel, parsed.headers, parsed.rows);
  }
}

function repairRoutedAuthority(stats) {
  const rel = "data/governance/routed-io-evidence.json";
  const data = readJson(rel);

  for (const [sku, entry] of Object.entries(data)) {
    const wsTitle = "";
    const size = splitterSizeFromIdentity(sku, wsTitle);
    const explicitSplitter =
      size ||
      /splitter|distribution/i.test(clean(entry.matrixSizeEvidence)) ||
      entry.outputBehaviour === "mirrored";

    if (!explicitSplitter) continue;

    const fanout =
      size?.outputs ??
      num(entry.mirroredOutputs) ??
      num(entry.physicalOutputs) ??
      num(entry.logicalOutputs) ??
      num(entry.routedOutputs);

    if (fanout === null || fanout < 2) continue;

    const before = JSON.stringify(entry);

    entry.logicalInputs = 1;
    entry.logicalOutputs = fanout;
    entry.routedInputs = 0;
    entry.routedOutputs = 0;
    entry.physicalOutputs = fanout;
    entry.mirroredOutputs = fanout;
    entry.topologyType = "one-to-many-mirrored";
    entry.outputBehaviour = "mirrored";
    entry.topologyEvidence =
      clean(entry.topologyEvidence || entry.matrixSizeEvidence) ||
      `Governed 1x${fanout} mirrored distribution`;
    delete entry.matrixSizeEvidence;

    if (JSON.stringify(entry) !== before) stats.routedAuthorityEntriesChanged += 1;
  }

  if (APPLY) writeJson(rel, data, true);
}

function repairProductIntelligenceDb(stats) {
  const rel = "data/product-intelligence-db.json";
  if (!fs.existsSync(path.join(ROOT, rel))) return;
  const payload = readJson(rel);

  for (const product of payloadArray(payload)) {
    const sku = clean(product.sku || product.id);
    const title = clean(product.title || product.name || product.summary);
    if (!isSplitterIdentity(sku, title, product.category, product.family)) continue;

    const size = splitterSizeFromIdentity(sku, title);
    if (!size) continue;

    const before = JSON.stringify(product);
    product.category = "HDMI splitter";
    product.family = "Splitter / Distribution";
    product.productClass = "HDMI splitter";
    product.role = "distribution amplifier";
    product.topologyType = "one-to-many-mirrored";
    product.outputBehaviour = "mirrored";
    product.logicalInputs = 1;
    product.logicalOutputs = size.outputs;
    product.routedInputs = 0;
    product.routedOutputs = 0;
    product.physicalOutputs = size.outputs;
    product.mirroredOutputs = size.outputs;

    if (JSON.stringify(product) !== before) stats.intelligenceRowsChanged += 1;
  }

  if (APPLY) writeJson(rel, payload, true);
}

function repairStructuredJson(rel, stats) {
  if (!fs.existsSync(path.join(ROOT, rel))) return;
  const payload = readJson(rel);
  for (const product of payloadArray(payload)) {
    cleanTechnicalIo(product, stats);
  }
  if (APPLY) writeJson(rel, payload, rel !== "public/product-intelligence-index.json");
}

function repairGovernedProfiles(stats) {
  const rel = "data/governance/wyrestorm-technical-profiles.json";
  const payload = readJson(rel);
  for (const profile of payloadArray(payload)) {
    const size = isSplitterIdentity(profile.sku, profile.productType, profile.productClass, profile.role)
      ? splitterSizeFromIdentity(profile.sku, profile.productType)
      : null;
    if (size) {
      const nonHdmiPorts = (Array.isArray(profile.ports) ? profile.ports : []).filter((port) =>
        !(/\bhdmi\b/i.test(`${port.connector} ${port.detail ?? ""}`) && /input|output/i.test(port.direction)),
      );
      profile.ports = [
        ...nonHdmiPorts,
        { count: 1, connector: "HDMI", direction: "input", category: "video", evidence: `Governed topology: 1x${size.outputs} HDMI splitter`, logicalFunction: "source-input" },
        { count: size.outputs, connector: "HDMI", direction: "output", category: "video", evidence: `Governed topology: 1x${size.outputs} mirrored HDMI distribution`, logicalFunction: "mirrored-output" },
      ];
      stats.splitterProfilesRebuilt += 1;
    }
    profile.ports = (Array.isArray(profile.ports) ? profile.ports : []).flatMap((port) => {
      const evidence = clean(port?.evidence || port?.detail);
      const connector = clean(port?.connector);
      const zoomAsFibre = /\b\d+\s*x\s*optical(?:\s+zoom)?\b|\boptical\s+zoom\b/i.test(evidence)
        && /sfp|fibre|fiber|optical/i.test(connector);
      if (zoomAsFibre) {
        stats.invalidPortsRemoved += 1;
        return [];
      }
      if (/5-?pin.*balanced.*audio|balanced.*audio.*5-?pin/i.test(evidence)) {
        stats.connectorCorrections += 1;
        return [{ ...port, connector: "Phoenix / Euroblock", category: "audio" }];
      }
      return [port];
    });
  }
  if (APPLY) writeJson(rel, payload, true);
}

const stats = {
  wyrestormSourceRowsChanged: 0,
  competitorRowsChanged: 0,
  routedAuthorityEntriesChanged: 0,
  intelligenceRowsChanged: 0,
  invalidPortsRemoved: 0,
  duplicatePortsRemoved: 0,
  connectorCorrections: 0,
  splitterProfilesRebuilt: 0,
};

repairWyrestormProductsCsv(stats);
repairCompetitorCsvs(stats);
repairRoutedAuthority(stats);
repairProductIntelligenceDb(stats);

// Source enrichment and test fixture are the only structured JSON inputs fixed
// directly here. Canonical/public artefacts are regenerated afterwards.
repairStructuredJson("data-sources/wyrestorm/enrichment.json", stats);
repairGovernedProfiles(stats);
repairStructuredJson(
  "src/wingman2/lib/__fixtures__/productIntelligenceIndexSample.json",
  stats,
);

console.log("");
console.log("[semantic-data-repair] mode:", APPLY ? "APPLY" : "CHECK");
for (const [key, value] of Object.entries(stats)) {
  console.log(`[semantic-data-repair] ${key}: ${value}`);
}
console.log("");

if (!APPLY) {
  console.log("[semantic-data-repair] Check mode only. Re-run with --apply to write.");
}
