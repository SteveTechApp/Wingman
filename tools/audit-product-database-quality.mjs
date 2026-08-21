import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const reportsDir = path.join(repoRoot, "reports");
const reportJsonPath = path.join(reportsDir, "product-database-quality-audit.json");
const reportMdPath = path.join(reportsDir, "product-database-quality-audit.md");

const sources = [
  { name: "canonical-product-store", path: "data/wingman-canonical-product-store.json", productKey: "products" },
  { name: "wyrestorm-source-enrichment", path: "data-sources/wyrestorm/enrichment.json" },
  { name: "public-product-intelligence-index", path: "public/product-intelligence-index.json", productKey: "products" },
  { name: "competitor-products-generated", path: "data/catalog/competitor-products.generated.json" },
];

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function key(value) {
  return clean(value).toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [];

  for (const field of ["products", "records", "items", "catalog", "data"]) {
    if (Array.isArray(value[field])) return value[field];
  }

  return [];
}

async function readJson(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!existsSync(fullPath)) return null;
  return JSON.parse(await readFile(fullPath, "utf8"));
}

function textBlob(product) {
  return [
    product.sku,
    product.SKU,
    product.model,
    product.partNumber,
    product.brand,
    product.manufacturer,
    product.name,
    product.title,
    product.family,
    product.productFamily,
    product.category,
    product.type,
    product.role,
    product.domain,
    product.description,
    product.summary,
    product.searchText,
    product.sourceText,
    product.rawText,
    ...(Array.isArray(product.features) ? product.features : []),
    ...(Array.isArray(product.tags) ? product.tags : []),
    ...(Array.isArray(product.capabilities) ? product.capabilities : []),
  ].filter(Boolean).join(" ");
}

function skuOf(product) {
  return clean(product.sku || product.SKU || product.model || product.partNumber || product.id || product.title);
}

function brandOf(product) {
  return clean(product.brand || product.manufacturer || product.vendor || (key(skuOf(product)).startsWith("MX") ? "WyreStorm" : ""));
}

function titleOf(product) {
  return clean(product.name || product.title || product.productName || skuOf(product));
}

function parseNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const match = clean(value).match(/\d+/);
  return match ? Number(match[0]) : null;
}

function fieldCount(product, fields) {
  for (const field of fields) {
    const value = product[field];

    if (typeof value === "number" || typeof value === "string") {
      const parsed = parseNumber(value);
      if (parsed !== null) return parsed;
    }

    if (Array.isArray(value)) {
      const total = value.reduce((sum, item) => {
        if (typeof item === "number" || typeof item === "string") return sum + (parseNumber(item) ?? 0);
        if (isRecord(item)) return sum + (parseNumber(item.count ?? item.value ?? item.quantity) ?? 0);
        return sum;
      }, 0);

      if (total > 0) return total;
    }
  }

  return null;
}

function modeledMatrixSize(product) {
  const inputs = fieldCount(product, ["matrixInputs", "routedInputCount", "routedInputs"]);
  const outputs = fieldCount(product, ["matrixOutputs", "routedOutputCount", "routedOutputs"]);

  if (inputs !== null && outputs !== null) {
    return {
      inputs,
      outputs,
      evidence: clean(product.matrixSizeEvidence || product.matrixSize || "Modeled routed I/O"),
      source: "modeled",
    };
  }

  return null;
}

function extractMatrixSize(product) {
  const modeled = modeledMatrixSize(product);
  if (modeled) return modeled;

  const sku = skuOf(product);
  const text = `${sku} ${textBlob(product)}`;
  const patterns = [
    /(\d{1,2})\s*[xX×]\s*(\d{1,2})\s+(?:advanced\s+|seamless\s+|scaling\s+|hdmi\s+|hdbaset\s+|tps\s+)?matrix/i,
    /(\d{1,2})\s*[xX×]\s*(\d{1,2})\s+(?:hdmi|hdbaset|tps|matrix|switcher|splitter|distribution amplifier)/i,
    /matrix\s+(?:switch(?:er)?\s+)?(?:with\s+)?(\d{1,2})\s*[xX×]\s*(\d{1,2})/i,
    /(\d{1,2})\s+inputs?\s*(?:\/|and|to|-)\s*(\d{1,2})\s+outputs?/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return { inputs: Number(match[1]), outputs: Number(match[2]), evidence: match[0], source: "text" };
  }

  const crossPoint = text.match(/\b(?:cross\s*point|crosspoint)\s*(\d)(\d)\b/i);
  if (crossPoint) {
    return { inputs: Number(crossPoint[1]), outputs: Number(crossPoint[2]), evidence: crossPoint[0], source: "text" };
  }

  const compactSku = key(sku);
  const skuPatterns = [
    /(?:MXV|MX|MMX|VS|MTRX)(\d{2})(\d{2})/,
    /MMX(\d{1,2})X(\d{1,2})/,
    /(\d{1,2})X(\d{1,2})(?:HDMI|HDBT|HT|KIT|SCL|H2|H2A|H20|H40|DA|DISTRIBUTION|SPLITTER)/,
  ];

  for (const pattern of skuPatterns) {
    const match = compactSku.match(pattern);
    if (match) return { inputs: Number(match[1]), outputs: Number(match[2]), evidence: sku, source: "sku" };
  }

  return null;
}

function portText(port) {
  return clean([port.connector, port.evidence, port.category, port.direction, port.type, port.name].filter(Boolean).join(" ")).toLowerCase();
}

function isFalsePort(port) {
  const text = portText(port);
  if (!text) return true;
  if ((parseNumber(port.count) ?? 0) > 64) return true;

  return /\b(bracket|mount|remote|battery|psu|power supply|quickstart|guide|rack|terminal block|sensor|handset|matrix\b.*matrix)\b/i.test(text);
}

function isVideoPort(port) {
  const text = portText(port);
  if (isFalsePort(port)) return false;
  const category = clean(port.category).toLowerCase();
  // A structured category is authoritative. Audio de-embed rows often refer
  // to their HDMI source in the detail text; that does not make the S/PDIF or
  // analogue connector a second video output.
  if (category) return category === "video";
  return /\b(hdmi|hdbaset|hdbt|tps|displayport|usb-c|usbc|sdi)\b/i.test(text);
}

function isNonRoutedOutput(port) {
  return /\b(mirror|mirrored|parallel|duplicate|loop|daisy|cascade|local monitor|monitor out|preview|aux)\b/i.test(portText(port));
}

function technicalPorts(product) {
  const profile = isRecord(product.technicalProfile) ? product.technicalProfile : {};
  const io = isRecord(profile.io) ? profile.io : {};
  const ports = [
    ...(Array.isArray(io.video) ? io.video : []),
    ...(Array.isArray(io.ports) ? io.ports : []),
  ].filter(isRecord);

  const byKey = new Map();

  for (const port of ports) {
    const portKey = [
      clean(port.count),
      clean(port.connector).toLowerCase(),
      clean(port.direction).toLowerCase(),
      clean(port.category).toLowerCase(),
      clean(port.evidence).toLowerCase(),
    ].join("|");

    if (!byKey.has(portKey)) byKey.set(portKey, port);
  }

  return Array.from(byKey.values());
}

function structuredVideoCount(product, direction, options = {}) {
  const total = technicalPorts(product)
    .filter(isVideoPort)
    .filter((port) => clean(port.direction).toLowerCase() === direction)
    .filter((port) => !options.routedOnly || !isNonRoutedOutput(port))
    .reduce((sum, port) => sum + (parseNumber(port.count) ?? 0), 0);

  return total > 0 ? total : null;
}

function explicitMirroredCount(product) {
  const modeled = fieldCount(product, ["mirroredOutputCount", "mirroredOutputs"]);
  if (modeled !== null) return modeled;

  const text = textBlob(product);
  const patterns = [
    /\b(\d{1,2})\s*x?\s+(?:additional\s+)?(?:mirrored|parallel|duplicate|duplicated)\s+(?:hdmi\s+)?(?:out(?:put)?s?)?\b/i,
    /\b(\d{1,2})\s*x?\s+(?:hdmi\s+)?(?:out(?:put)?s?)?\s+(?:which\s+are\s+)?(?:mirrored|parallel|duplicate|duplicated)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }

  const matrix = extractMatrixSize(product);
  if (matrix?.inputs === 1 && isSplitterOrDistribution(product)) {
    return matrix.outputs;
  }

  if (/\b(?:a|one|1x?)\s+(?:additional\s+)?(?:mirrored|parallel|duplicate|duplicated)\s+(?:hdmi\s+)?out(?:put)?\b/i.test(text) ||
    /\b(?:hdmi\s+)?out(?:put)?\s*[–-]?\s*(?:mirrored|parallel|duplicate|duplicated)\b/i.test(text)) {
    return 1;
  }

  return null;
}

function hasOfficialEvidence(product) {
  const profile = isRecord(product.technicalProfile) ? product.technicalProfile : {};
  const sourceQuality = isRecord(profile.sourceQuality) ? profile.sourceQuality : {};

  return Boolean(
    product.officialUrl ||
      product.sourceUrl ||
      product.productUrl ||
      sourceQuality.officialProductUrl ||
      sourceQuality.officialUrl ||
      sourceQuality.productGuidePdf ||
      sourceQuality.sourcePdfs
  );
}

function sourceTier(product) {
  const profile = isRecord(product.technicalProfile) ? product.technicalProfile : {};
  const sourceQuality = isRecord(profile.sourceQuality) ? profile.sourceQuality : {};
  if (sourceQuality.livePageUsed || sourceQuality.officialProductUrl || sourceQuality.productGuidePdf) return "official-structured";
  if (hasOfficialEvidence(product)) return "official-reference";
  return "unverified-or-seeded";
}

function issue(severity, source, product, code, message, details = {}) {
  return {
    severity,
    source,
    sku: skuOf(product),
    brand: brandOf(product),
    title: titleOf(product),
    code,
    message,
    details,
  };
}

function isSplitterOrDistribution(product) {
  const text = clean([
    titleOf(product),
    product.category,
    product.type,
    product.role,
    product.domain,
  ].filter(Boolean).join(" ")).toLowerCase();

  if (/\bswitcher\b/.test(text) && !/\b(splitter|distribution amplifier|distribution amp)\b/.test(text)) {
    return false;
  }

  return /\b(splitter|distribution amplifier|distribution amp|duplicate displays?)\b/i.test(text);
}

function isEndpointOrAccessory(product) {
  const sku = key(skuOf(product));
  const text = textBlob(product).toLowerCase();

  if (/^(NHD|RX|TX|EX|CAB|CAM|APO|CON)/.test(sku)) return true;
  if (/\b(encoder|decoder|transmitter|receiver|transceiver|extender|adapter|cable|scaler|controller|rack|mount|power supply|psu)\b/i.test(text)) {
    return true;
  }

  return false;
}

function isMatrixProduct(product) {
  const text = textBlob(product).toLowerCase();

  if (extractMatrixSize(product)) return true;
  if (isEndpointOrAccessory(product)) return false;

  return /\b(matrix switcher|hdmi matrix|hdbaset matrix|presentation matrix|seamless matrix|scaling matrix|cross\s*point|crosspoint|splitter|distribution amplifier)\b/i.test(text);
}

function auditProduct(source, product, officialEvidenceSkus = new Set()) {
  const issues = [];
  if (!isRecord(product)) return issues;
  if (!skuOf(product)) return issues;

  const text = textBlob(product);
  const matrix = extractMatrixSize(product);
  const matrixProduct = isMatrixProduct(product);
  const routedInputField = fieldCount(product, ["routedInputCount"]);
  const routedOutputField = fieldCount(product, ["routedOutputCount"]);
  const genericInputField = fieldCount(product, ["inputCount", "inputs", "sourceCount"]);
  const genericOutputField = fieldCount(product, ["outputCount", "outputs", "displayCount"]);
  const structuredInputs = structuredVideoCount(product, "input", { routedOnly: true });
  const structuredRoutedOutputs = structuredVideoCount(product, "output", { routedOnly: true });
  const structuredPhysicalOutputs = structuredVideoCount(product, "output", { routedOnly: false });
  const mirroredCount = explicitMirroredCount(product);
  const hasMirrored = /\b(mirrored|parallel|duplicate|duplicated)\b/i.test(text) || isSplitterOrDistribution(product);
  const hasLoop = /\b(loop|daisy|cascade)\b/i.test(text);

  if (matrixProduct && !matrix) {
    issues.push(issue("warning", source, product, "matrix-size-missing", "Matrix-like product has no extractable routed matrix size."));
  }

  if (matrix) {
    const trustedInput = routedInputField ?? genericInputField ?? structuredInputs;
    const trustedOutput = routedOutputField ?? genericOutputField ?? structuredRoutedOutputs;

    if (trustedInput !== null && trustedInput !== matrix.inputs) {
      issues.push(issue("critical", source, product, "input-count-conflict", "Stored input count conflicts with matrix-size evidence.", {
        matrixInputs: matrix.inputs,
        storedInputs: trustedInput,
        matrixEvidence: matrix.evidence,
      }));
    }

    if (trustedOutput !== null && trustedOutput !== matrix.outputs) {
      issues.push(issue("critical", source, product, "output-count-conflict", "Stored output count conflicts with routed matrix-size evidence.", {
        matrixOutputs: matrix.outputs,
        storedOutputs: trustedOutput,
        matrixEvidence: matrix.evidence,
      }));
    }

    const routedOutputIsExplicit = routedOutputField !== null && routedOutputField === matrix.outputs;
    const mirroredOrLoopIsModeled = mirroredCount !== null || fieldCount(product, ["physicalOutputCount", "physicalOutputs"]) !== null;

    if (
      structuredPhysicalOutputs !== null &&
      structuredPhysicalOutputs > matrix.outputs &&
      (hasMirrored || hasLoop) &&
      (!routedOutputIsExplicit || !mirroredOrLoopIsModeled)
    ) {
      issues.push(issue("critical", source, product, "physical-output-count-used-as-routed", "Physical output count appears larger than routed matrix output count because mirrored/loop outputs are present.", {
        routedOutputsFromMatrix: matrix.outputs,
        structuredPhysicalOutputs,
        mirroredCount,
      }));
    }

    if (!hasOfficialEvidence(product) && !officialEvidenceSkus.has(key(skuOf(product))) && source !== "wyrestorm-sku-catalog-2026") {
      issues.push(issue("warning", source, product, "missing-official-evidence", "Matrix product lacks attached official page/PDF evidence in this data source.", {
        sourceTier: sourceTier(product),
      }));
    }
  }

  if (hasMirrored && mirroredCount === null) {
    issues.push(issue("warning", source, product, "mirrored-count-missing", "Mirrored output wording found but no explicit mirrored output count was extracted."));
  }

  if (hasLoop && matrixProduct) {
    issues.push(issue("info", source, product, "loop-output-present", "Loop/daisy-chain wording found. It must remain a feature, not routed output capacity."));
  }

  return issues;
}

function groupBy(items, mapper) {
  const groups = new Map();
  for (const item of items) {
    const keyValue = mapper(item);
    groups.set(keyValue, [...(groups.get(keyValue) ?? []), item]);
  }
  return groups;
}

function markdownTable(rows, columns) {
  if (!rows.length) return "_None found._";
  const header = `| ${columns.map((column) => column.label).join(" | ")} |`;
  const separator = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${columns.map((column) => clean(column.value(row)).replace(/\|/g, "\\|")).join(" | ")} |`);
  return [header, separator, ...body].join("\n");
}

async function main() {
  const sourceReports = [];
  const allIssues = [];
  const loadedSources = [];
  const officialEvidenceSkus = new Set();

  for (const source of sources) {
    const payload = await readJson(source.path);
    const records = asArray(payload);
    const products = records.filter(isRecord);

    loadedSources.push({ source, products });

    for (const product of products) {
      if (hasOfficialEvidence(product)) {
        officialEvidenceSkus.add(key(skuOf(product)));
      }
    }
  }

  for (const { source, products } of loadedSources) {
    const issues = products.flatMap((product) => auditProduct(source.name, product, officialEvidenceSkus));

    sourceReports.push({
      source: source.name,
      path: source.path,
      products: products.length,
      matrixProducts: products.filter(isMatrixProduct).length,
      issues: issues.length,
      critical: issues.filter((item) => item.severity === "critical").length,
      warning: issues.filter((item) => item.severity === "warning").length,
      info: issues.filter((item) => item.severity === "info").length,
    });

    allIssues.push(...issues);
  }

  const severityOrder = { critical: 0, warning: 1, info: 2 };
  allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || a.source.localeCompare(b.source) || a.sku.localeCompare(b.sku));

  const byCode = Array.from(groupBy(allIssues, (item) => item.code).entries())
    .map(([code, issues]) => ({ code, count: issues.length, critical: issues.filter((item) => item.severity === "critical").length }))
    .sort((a, b) => b.critical - a.critical || b.count - a.count || a.code.localeCompare(b.code));

  const report = {
    generatedAt: new Date().toISOString(),
    scope: sources.map((source) => source.path),
    sourceReports,
    issueSummary: {
      total: allIssues.length,
      critical: allIssues.filter((item) => item.severity === "critical").length,
      warning: allIssues.filter((item) => item.severity === "warning").length,
      info: allIssues.filter((item) => item.severity === "info").length,
    },
    byCode,
    issues: allIssues,
  };

  await mkdir(reportsDir, { recursive: true });
  await writeFile(reportJsonPath, JSON.stringify(report, null, 2) + "\n");

  const md = [
    "# Product Database Quality Audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Products scanned: ${sourceReports.reduce((sum, item) => sum + item.products, 0)}`,
    `- Matrix-like products scanned: ${sourceReports.reduce((sum, item) => sum + item.matrixProducts, 0)}`,
    `- Critical issues: ${report.issueSummary.critical}`,
    `- Warnings: ${report.issueSummary.warning}`,
    `- Info items: ${report.issueSummary.info}`,
    "",
    "## Source Coverage",
    "",
    markdownTable(sourceReports, [
      { label: "Source", value: (row) => row.source },
      { label: "Products", value: (row) => row.products },
      { label: "Matrix products", value: (row) => row.matrixProducts },
      { label: "Critical", value: (row) => row.critical },
      { label: "Warnings", value: (row) => row.warning },
    ]),
    "",
    "## Issue Types",
    "",
    markdownTable(byCode, [
      { label: "Code", value: (row) => row.code },
      { label: "Count", value: (row) => row.count },
      { label: "Critical", value: (row) => row.critical },
    ]),
    "",
    "## Critical Issues",
    "",
    markdownTable(allIssues.filter((item) => item.severity === "critical").slice(0, 80), [
      { label: "Source", value: (row) => row.source },
      { label: "SKU", value: (row) => row.sku },
      { label: "Issue", value: (row) => row.code },
      { label: "Details", value: (row) => `${row.message} ${JSON.stringify(row.details)}` },
    ]),
    "",
    "## Required Data Rules",
    "",
    "- Routed matrix inputs and outputs must come from routed I/O evidence, not total physical connector count.",
    "- Mirrored HDMI outputs, loop outputs, local monitor outputs, audio ports, control ports and accessories must never increase matrix size.",
    "- Known profile overrides must be SKU-specific and evidence-backed; they must not override better source text with guessed values.",
    "- Numeric comparison must compare numbers as numbers. A 2-output product must never match a 12-output product via substring matching.",
    "- Missing official evidence should keep the product in verify/check status, not quote-ready status.",
    "",
  ].join("\n");

  await writeFile(reportMdPath, md);

  console.log(`[product-database-quality-audit] Wrote ${path.relative(repoRoot, reportJsonPath)}`);
  console.log(`[product-database-quality-audit] Wrote ${path.relative(repoRoot, reportMdPath)}`);
  console.log(`[product-database-quality-audit] Critical=${report.issueSummary.critical} Warning=${report.issueSummary.warning} Info=${report.issueSummary.info}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
