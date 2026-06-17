import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const repoRoot = process.cwd();
const indexPath = resolve(repoRoot, "public/product-intelligence-index.json");

const outCsv = resolve(repoRoot, "reports/wingman-strict-matrix-output-topology-audit.csv");
const outMd = resolve(repoRoot, "reports/wingman-strict-matrix-output-topology-audit.md");
const outDomainCsv = resolve(repoRoot, "reports/wingman-product-domain-classification-audit.csv");

const expectedMatrixSkus = [
  "MXV-0808-H2A-V3",
  "MXV-0808-H2A-70-V3",
  "MXV-0808-H2A-KIT",
  "MX-0808-KIT-V2",
];

function ensureDir(path) {
  mkdirSync(dirname(path), { recursive: true });
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function findProducts(index) {
  if (Array.isArray(index)) {
    return index;
  }

  const record = asRecord(index);

  for (const key of ["products", "items", "entries", "productEntries", "records"]) {
    if (Array.isArray(record[key])) {
      return record[key];
    }
  }

  const nestedArrays = Object.values(record).filter(Array.isArray);

  if (nestedArrays.length === 1) {
    return nestedArrays[0];
  }

  return [];
}

function normaliseSku(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "-");
}

function normaliseKey(value) {
  return normaliseSku(value).replace(/[^A-Z0-9]/g, "");
}

function getSku(product) {
  const record = asRecord(product);
  return normaliseSku(record.sku ?? record.partNumber ?? record.model ?? record.id ?? "");
}

function getName(product) {
  const record = asRecord(product);
  return String(record.name ?? record.title ?? record.productName ?? "").trim();
}

function getFamily(product) {
  const record = asRecord(product);
  return String(record.family ?? record.category ?? record.productFamily ?? record.role ?? "").trim();
}

function getText(product) {
  const record = asRecord(product);

  return [
    record.sku,
    record.partNumber,
    record.model,
    record.name,
    record.title,
    record.productName,
    record.family,
    record.category,
    record.productFamily,
    record.role,
    record.description,
    record.summary,
    record.searchText,
    record.productText,
    JSON.stringify(record.specifications ?? {}),
    JSON.stringify(record.features ?? {}),
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const match = String(value ?? "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

function extractMatrixSize(text, sku) {
  const combined = `${sku} ${text}`;

  const patterns = [
    /(\d{1,2})\s*[xXÃ—]\s*(\d{1,2})/,
    /(\d{1,2})\s+by\s+(\d{1,2})/i,
    /(\d{1,2})\s*in(?:put)?s?\s*(?:\/|and|to|-)\s*(\d{1,2})\s*out(?:put)?s?/i,
  ];

  for (const pattern of patterns) {
    const match = combined.match(pattern);

    if (match) {
      return {
        inputs: Number(match[1]),
        outputs: Number(match[2]),
        evidence: match[0],
      };
    }
  }

  const skuMatch = sku.match(/^(?:MXV|MX)-?(\d{2})(\d{2})(?:-|$)/i);

  if (skuMatch) {
    return {
      inputs: Number(skuMatch[1]),
      outputs: Number(skuMatch[2]),
      evidence: "SKU pattern",
    };
  }

  return {
    inputs: null,
    outputs: null,
    evidence: "",
  };
}

function classifyProductDomain(product) {
  const sku = getSku(product);
  const text = getText(product).toLowerCase();

  if (/^CAB-/i.test(sku)) return "cable";
  if (/^SYN-KEY|^SYN-TOUCH|^TS-/i.test(sku)) return "controller";
  if (/^CAM-/i.test(sku)) return "camera_or_camera_bridge";
  if (/^APO-|^HALO/i.test(sku)) return "uc_audio";
  if (/^NHD-CTL/i.test(sku)) return "av_over_ip_controller";
  if (/^NHD-/i.test(sku)) return "av_over_ip_endpoint_or_processor";
  if (/^RX|^RXV/i.test(sku)) return "receiver_endpoint";
  if (/^TX-|^TXV|^TX3|^SW-\d{3}-TX/i.test(sku)) return "transmitter_endpoint";
  if (/^EX-/i.test(sku)) return "extender_or_kvm";
  if (/^SW-/i.test(sku)) return "presentation_switcher_or_processor";
  if (/^MXV-/i.test(sku)) return "matrix";
  if (/^MX-/i.test(sku)) return "matrix";
  if (/^TX-SCL-/i.test(sku)) return "matrix_output_card";
  if (/output\s+card|input\s+card|card\s+for\s+mx/i.test(text)) return "matrix_card_or_module";

  if (/\bmatrix\b/i.test(text) && !/\bpresentation\b|\bcamera\b|\bspeakerphone\b|\bcontroller\b|\btransmitter\b|\breceiver\b|\bextender\b|\bcable\b/i.test(text)) {
    return "matrix";
  }

  if (/\bmultiview\b|\bvideo wall\b/i.test(text)) {
    return "processor";
  }

  return "other";
}

function isTrueMatrixDomain(domain) {
  return domain === "matrix";
}

function classifyMatrixTopology(product) {
  const record = asRecord(product);
  const sku = getSku(product);
  const name = getName(product);
  const family = getFamily(product);
  const text = getText(product);
  const _lower = text.toLowerCase();
  const size = extractMatrixSize(text, sku);

  const routedInputCount = parseNumber(record.routedInputCount ?? record.inputCount ?? record.inputs ?? size.inputs);
  const routedOutputCount = parseNumber(record.routedOutputCount ?? record.outputCount ?? record.outputs ?? size.outputs);

  const hasHdbaset = /hdbaset|hdbase t|hdbt/i.test(text) || /^MXV-/i.test(sku);
  const hasHdmi = /hdmi/i.test(text);
  const hasMirrored = /mirror|mirrored|parallel|duplicate|duplicated/i.test(text);
  const hasLoop = /loop\s*out|loop-out|loopout|daisy\s*chain|cascade|cascad/i.test(text);
  const hasLocalMonitor = /local\s*(?:monitor|hdmi)|monitor\s*out|preview\s*out/i.test(text);
  const hasAux = /aux(?:iliary)?\s*out/i.test(text);

  const routedOutputTypes = hasHdbaset ? "HDBaseT" : hasHdmi ? "HDMI" : "";
  const mirroredOutputCount = hasMirrored ? (routedOutputCount ?? 1) : 0;
  const loopOutputCount = hasLoop ? 1 : 0;
  const localMonitorOutputCount = hasLocalMonitor ? 1 : 0;
  const auxOutputCount = hasAux ? 1 : 0;

  const warnings = [];

  if (routedInputCount === null || routedOutputCount === null) {
    warnings.push("Matrix product but routed input/output count not confirmed");
  }

  if (hasMirrored) {
    warnings.push("Mirrored HDMI detected; do not count as independent routed outputs");
  }

  if (hasLoop) {
    warnings.push("Loop/daisy-chain output detected; capture as topology feature, not matrix size");
  }

  const matrixSizeConfidence = routedInputCount !== null && routedOutputCount !== null
    ? size.evidence === "SKU pattern" ? "inferred" : "confirmed"
    : "needs-review";

  return {
    sku,
    name,
    family,
    routedInputCount,
    routedOutputCount,
    routedOutputTypes,
    mirroredOutputCount,
    loopOutputCount,
    localMonitorOutputCount,
    auxOutputCount,
    independentRoutingConfirmed: routedInputCount !== null && routedOutputCount !== null,
    matrixSizeConfidence,
    warnings,
  };
}

function csvEscape(value) {
  const text = String(value ?? "");

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function writeCsv(path, headers, rows) {
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => {
      const value = Array.isArray(row[header]) ? row[header].join("; ") : row[header];
      return csvEscape(value);
    }).join(",")),
  ].join("\n");

  ensureDir(path);
  writeFileSync(path, csv, "utf8");
}

if (!existsSync(indexPath)) {
  console.error("[strict-matrix-audit] Missing public/product-intelligence-index.json");
  console.error("[strict-matrix-audit] Run npm run data:product-intelligence-index first.");
  process.exit(1);
}

const index = JSON.parse(readFileSync(indexPath, "utf8"));
const products = findProducts(index);

const domainRows = products.map((product) => {
  const sku = getSku(product);
  const name = getName(product);
  const family = getFamily(product);
  const domain = classifyProductDomain(product);

  return {
    sku,
    name,
    family,
    domain,
  };
}).sort((a, b) => a.sku.localeCompare(b.sku));

const trueMatrixProducts = products.filter((product) => isTrueMatrixDomain(classifyProductDomain(product)));
const matrixRows = trueMatrixProducts.map(classifyMatrixTopology).sort((a, b) => a.sku.localeCompare(b.sku));

const needsReview = matrixRows.filter((row) => row.matrixSizeConfidence === "needs-review" || row.warnings.length);
const withMirrored = matrixRows.filter((row) => row.mirroredOutputCount > 0);
const withLoop = matrixRows.filter((row) => row.loopOutputCount > 0);

const allSkuKeys = new Set(products.map((product) => normaliseKey(getSku(product))));
const missingExpected = expectedMatrixSkus.filter((sku) => !allSkuKeys.has(normaliseKey(sku)));

const domainSummary = domainRows.reduce((acc, row) => {
  acc[row.domain] = (acc[row.domain] ?? 0) + 1;
  return acc;
}, {});

writeCsv(outDomainCsv, ["sku", "name", "family", "domain"], domainRows);
writeCsv(
  outCsv,
  [
    "sku",
    "name",
    "family",
    "routedInputCount",
    "routedOutputCount",
    "routedOutputTypes",
    "mirroredOutputCount",
    "loopOutputCount",
    "localMonitorOutputCount",
    "auxOutputCount",
    "independentRoutingConfirmed",
    "matrixSizeConfidence",
    "warnings",
  ],
  matrixRows,
);

const md = [
  "# Wingman Strict Matrix Output Topology Audit",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "## Summary",
  "",
  `- Total products indexed: ${products.length}`,
  `- Strict matrix products audited: ${matrixRows.length}`,
  `- Matrix products needing review: ${needsReview.length}`,
  `- Matrix products with mirrored/parallel output evidence: ${withMirrored.length}`,
  `- Matrix products with loop/daisy-chain output evidence: ${withLoop.length}`,
  `- Expected matrix SKUs missing from product index: ${missingExpected.length}`,
  "",
  "## Product domain summary",
  "",
  "| Domain | Count |",
  "|---|---:|",
  ...Object.entries(domainSummary).sort((a, b) => a[0].localeCompare(b[0])).map(([domain, count]) => `| ${domain} | ${count} |`),
  "",
  "## Expected matrix SKU coverage",
  "",
  missingExpected.length
    ? "| Missing SKU |\n|---|\n" + missingExpected.map((sku) => `| ${sku} |`).join("\n")
    : "All expected matrix SKUs were found in the product index.",
  "",
  "## Rules enforced",
  "",
  "- Only true matrix product domains are included in this audit.",
  "- Presentation switchers, extenders, receivers, transmitters, controllers, cameras, audio products, cables and cards are excluded from the matrix-size audit.",
  "- Routed/switched outputs count towards matrix size.",
  "- Mirrored HDMI outputs do not count as additional independent matrix outputs.",
  "- Loop outputs do not count as matrix outputs; they are topology/expansion features.",
  "- Local monitor, preview and auxiliary outputs must not be counted unless independently routable evidence exists.",
  "",
  "## Matrix products needing review",
  "",
  needsReview.length
    ? "| SKU | Name | Routed size | Confidence | Warnings |\n|---|---|---:|---|---|\n" + needsReview.map((row) => {
      const size = row.routedInputCount !== null && row.routedOutputCount !== null ? `${row.routedInputCount}x${row.routedOutputCount}` : "Needs review";
      return `| ${row.sku} | ${row.name} | ${size} | ${row.matrixSizeConfidence} | ${row.warnings.join("; ")} |`;
    }).join("\n")
    : "No matrix review items detected.",
  "",
  "## Mirrored output matrix products",
  "",
  withMirrored.length
    ? "| SKU | Name | Mirrored outputs | Note |\n|---|---|---:|---|\n" + withMirrored.map((row) => `| ${row.sku} | ${row.name} | ${row.mirroredOutputCount} | Do not count mirrored outputs as matrix outputs. |`).join("\n")
    : "No mirrored output candidates detected in strict matrix products.",
  "",
  "## Loop output matrix products",
  "",
  withLoop.length
    ? "| SKU | Name | Loop outputs | Note |\n|---|---|---:|---|\n" + withLoop.map((row) => `| ${row.sku} | ${row.name} | ${row.loopOutputCount} | Treat as topology/expansion feature only. |`).join("\n")
    : "No loop output candidates detected in strict matrix products.",
  "",
].join("\n");

ensureDir(outMd);
writeFileSync(outMd, md, "utf8");

console.log(`[strict-matrix-audit] Wrote ${outCsv}`);
console.log(`[strict-matrix-audit] Wrote ${outMd}`);
console.log(`[strict-matrix-audit] Wrote ${outDomainCsv}`);
console.log(`[strict-matrix-audit] Total products indexed: ${products.length}`);
console.log(`[strict-matrix-audit] Strict matrix products audited: ${matrixRows.length}`);
console.log(`[strict-matrix-audit] Matrix products needing review: ${needsReview.length}`);

if (missingExpected.length) {
  console.log(`[strict-matrix-audit] Missing expected matrix SKUs: ${missingExpected.join(", ")}`);
}