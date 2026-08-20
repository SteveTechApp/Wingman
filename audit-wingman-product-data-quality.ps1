param(
    [string]$RepoRoot = "C:\Users\steve\wingman"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Step([string]$Text) {
    Write-Host ""
    Write-Host "==> $Text" -ForegroundColor Cyan
}
function Fail([string]$Text) {
    throw $Text
}

$RepoRoot = [System.IO.Path]::GetFullPath($RepoRoot)
$semanticWorktree = Join-Path $RepoRoot ".wingman-work\av-product-semantics"
$TargetRoot = if (Test-Path -LiteralPath $semanticWorktree) { $semanticWorktree } else { $RepoRoot }

if (-not (Test-Path -LiteralPath $TargetRoot)) {
    Fail "Wingman repository/worktree not found: $TargetRoot"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportRoot = Join-Path $env:USERPROFILE "Wingman-Data-Audits\$stamp"
New-Item -ItemType Directory -Force -Path $ReportRoot | Out-Null

Step "Auditing Wingman product data"
Write-Host "    Repository: $TargetRoot" -ForegroundColor Gray
Write-Host "    Report:     $ReportRoot" -ForegroundColor Gray

$nodeScript = Join-Path $ReportRoot "audit-product-data.mjs"

$node = @'
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.argv[2];
const reportRoot = process.argv[3];

const issues = [];
const stats = {
  wyrestormRows: 0,
  competitorRows: 0,
  competitorFiles: 0,
  jsonProductsScanned: 0,
  manifestHashMismatches: 0,
};

function clean(v) {
  return String(v ?? "").trim();
}
function lower(v) {
  return clean(v).toLowerCase();
}
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
function bool(v) {
  return /^(true|1|yes)$/i.test(clean(v));
}
function severityRank(v) {
  return ({ CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[v] ?? 0);
}
function addIssue(severity, area, source, sku, field, current, expected, detail) {
  issues.push({
    severity, area, source, sku: clean(sku), field,
    current: clean(current), expected: clean(expected), detail
  });
}
function readText(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, "utf8");
}
function readJson(rel) {
  const text = readText(rel);
  if (text == null) return null;
  if (!text.trim()) {
    addIssue(
      "HIGH", "source-integrity", rel, "", "file-content", "EMPTY",
      "valid JSON data or deliberate generated-file marker",
      "File is empty in this worktree. If another manifest or build step expects content, this is a source-of-truth risk."
    );
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    addIssue("CRITICAL", "source-integrity", rel, "", "json", error.message, "valid JSON", "JSON cannot be parsed.");
    return null;
  }
}

// RFC4180-ish parser: quoted fields, escaped quotes, CRLF/LF.
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
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
  if (!rows.length) return [];
  const headers = rows[0].map((h) => clean(h));
  return rows.slice(1).map((values) => {
    const out = {};
    headers.forEach((h, idx) => out[h] = values[idx] ?? "");
    return out;
  });
}
function parseCsvFile(rel) {
  const text = readText(rel);
  if (text == null) return [];
  try {
    return parseCsv(text);
  } catch (error) {
    addIssue("CRITICAL", "source-integrity", rel, "", "csv", error.message, "parseable CSV", "CSV parsing failed.");
    return [];
  }
}
function parseJsonCell(value) {
  const text = clean(value);
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}
function payloadArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.records)) return payload.records;
  return [];
}
function topologyFromText(text) {
  const t = lower(text);
  if (/distribution amplifier|hdmi splitter|\bsplitter\b/.test(t)) return "splitter";
  if (/\bmatrix\b/.test(t)) return "matrix";
  if (/\bswitcher\b/.test(t)) return "switcher";
  if (/encoder|transmitter|\btx\b/.test(t)) return "source-endpoint";
  if (/decoder|receiver|\brx\b/.test(t)) return "destination-endpoint";
  if (/transceiver|\btrx\b/.test(t)) return "transceiver";
  if (/ptz|camera/.test(t)) return "camera";
  if (/video wall|videowall/.test(t)) return "video-wall";
  if (/multiview|multi-view/.test(t)) return "multiview";
  return "";
}
function sizeFromText(text) {
  const m = String(text ?? "").replace(/×/g, "x").match(/\b(\d{1,2})\s*[x:]\s*(\d{1,2})\b/i);
  return m ? { inputs: Number(m[1]), outputs: Number(m[2]) } : {};
}
function sumJsonPorts(value) {
  if (!Array.isArray(value)) return null;
  let total = 0, saw = false;
  for (const item of value) {
    const n = num(item?.count);
    if (n !== null) {
      total += n;
      saw = true;
    }
  }
  return saw ? total : null;
}
function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}
function csvEscape(v) {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}
function writeCsv(file, rows) {
  if (!rows.length) {
    fs.writeFileSync(file, "severity,area,source,sku,field,current,expected,detail\n");
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  fs.writeFileSync(file, lines.join("\n") + "\n");
}

const manifestRel = "data/catalog/product-data-manifest.generated.json";
const manifest = readJson(manifestRel);

// ---------- Source integrity / manifest ----------
if (manifest?.hashes) {
  for (const [rel, expectedHash] of Object.entries(manifest.hashes)) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) {
      addIssue("CRITICAL", "source-integrity", manifestRel, "", rel, "MISSING", expectedHash, "Manifest references a source file that is missing.");
      stats.manifestHashMismatches++;
      continue;
    }
    const actualHash = sha256File(file);
    if (actualHash !== expectedHash) {
      addIssue(
        "CRITICAL", "source-integrity", manifestRel, "", rel,
        actualHash, expectedHash,
        "Committed/generated manifest hash does not match the source file. Build inputs and declared provenance are out of sync."
      );
      stats.manifestHashMismatches++;
    }
  }
}

// ---------- WyreStorm source CSV ----------
const wsRel = "data-sources/wyrestorm/products.csv";
const wsRows = parseCsvFile(wsRel);
stats.wyrestormRows = wsRows.length;
const wsBySku = new Map(wsRows.map((r) => [clean(r.sku).toUpperCase(), r]));

const genericClasses = new Set(["unclassified", "general av", "other", "unknown"]);
const suspiciousTransportExact = new Set([
  "general av", "matrix switching", "presentation switcher", "video wall",
  "camera / capture", "cables", "cable / accessory", "uc / conferencing"
]);

for (const r of wsRows) {
  const sku = clean(r.sku).toUpperCase();
  const name = clean(r.product_name);
  const text = `${sku} ${name} ${r.family} ${r.product_type}`;
  const topology = topologyFromText(text);
  const size = sizeFromText(text);
  const activeQuoteable = lower(r.lifecycle_status) === "active" && !bool(r.do_not_spec);

  if (activeQuoteable && (genericClasses.has(lower(r.family)) || genericClasses.has(lower(r.product_type)))) {
    addIssue(
      "HIGH", "wyrestorm-source", wsRel, sku, "classification",
      `${r.family} / ${r.product_type}`, "specific product family and functional product type",
      "Active quoteable product is still generic/unclassified, forcing downstream inference."
    );
  }

  const transport = lower(r.transport_type);
  if (activeQuoteable && (!transport || suspiciousTransportExact.has(transport))) {
    addIssue(
      topology ? "HIGH" : "MEDIUM", "wyrestorm-source", wsRel, sku, "transport_type",
      r.transport_type || "BLANK", "actual transport/connection architecture",
      "Transport is missing or contains a category label rather than a signal transport."
    );
  }

  if (activeQuoteable && ["splitter", "matrix", "switcher"].includes(topology)) {
    if (!clean(r.inputs)) {
      addIssue("HIGH", "wyrestorm-source", wsRel, sku, "inputs", "BLANK", size.inputs ?? "verified quantity", "Switching/distribution product has no source I/O quantity.");
    }
    if (!clean(r.outputs)) {
      addIssue("HIGH", "wyrestorm-source", wsRel, sku, "outputs", "BLANK", size.outputs ?? "verified quantity", "Switching/distribution product has no destination I/O quantity.");
    }
  }

  if (size.inputs && num(r.inputs) !== null && num(r.inputs) !== size.inputs) {
    addIssue("HIGH", "wyrestorm-source", wsRel, sku, "inputs", r.inputs, size.inputs, "SKU/title topology disagrees with stored input count.");
  }
  if (size.outputs && num(r.outputs) !== null && num(r.outputs) !== size.outputs) {
    addIssue("HIGH", "wyrestorm-source", wsRel, sku, "outputs", r.outputs, size.outputs, "SKU/title topology disagrees with stored output count.");
  }
}

// ---------- WyreStorm intelligence DB ----------
const dbRel = "data/product-intelligence-db.json";
const db = readJson(dbRel);
const dbRecords = payloadArray(db).filter((p) => lower(p.vendorType) === "wyrestorm" || lower(p.brand) === "wyrestorm");
const dbBySku = new Map(dbRecords.map((p) => [clean(p.sku).toUpperCase(), p]));

for (const p of dbRecords) {
  const sku = clean(p.sku).toUpperCase();
  const title = clean(p.title || p.name || p.summary);
  const topo = topologyFromText(`${sku} ${title} ${p.description}`);
  const category = `${clean(p.category)} / ${clean(p.family)}`;

  if (topo === "splitter" && !/splitter|distribution/i.test(category)) {
    addIssue("CRITICAL", "wyrestorm-intelligence", dbRel, sku, "category/family", category, "HDMI splitter / distribution", "Product text says splitter but intelligence classification says another product family.");
  }
  if (topo === "matrix" && !/matrix|routing/i.test(category)) {
    addIssue("HIGH", "wyrestorm-intelligence", dbRel, sku, "category/family", category, "matrix/routing", "Product text says matrix but intelligence classification is inconsistent.");
  }

  const src = wsBySku.get(sku);
  if (src && lower(src.product_type) !== lower(p.category) && !genericClasses.has(lower(src.product_type))) {
    const sameBroad =
      (/splitter|distribution/i.test(src.product_type) && /splitter|distribution/i.test(p.category)) ||
      (/matrix/i.test(src.product_type) && /matrix/i.test(p.category)) ||
      (/camera/i.test(src.product_type) && /camera/i.test(p.category));
    if (!sameBroad) {
      addIssue(
        "MEDIUM", "cross-source", `${wsRel} ↔ ${dbRel}`, sku, "product classification",
        `${src.product_type} ↔ ${p.category}`, "one canonical classification",
        "Two source-of-truth layers disagree on product classification."
      );
    }
  }
}

// ---------- Structured product JSON audit ----------
const jsonSources = [
  "data-sources/wyrestorm/enrichment.json",
  "data/wingman-canonical-product-store.json",
  "public/product-intelligence-index.json",
  "src/wingman2/lib/__fixtures__/productIntelligenceIndexSample.json",
];

const accessoryWords = /\b(quickstart|quick start|guide|manual|mount|bracket|power supply|power adapter|power cord|remote|battery|rack brackets?|wall brackets?|in the box)\b/i;
const resolutionEvidence = /\b(1920|2160|3840|4096)\s*[x×]/i;
const zoomEvidence = /\b(optical|digital)\s+zoom\b|\b\d+x\s+optical\b/i;

for (const rel of jsonSources) {
  const payload = readJson(rel);
  const products = payloadArray(payload);
  for (const p of products) {
    stats.jsonProductsScanned++;
    const sku = clean(p.sku || p.id).toUpperCase();
    const title = clean(p.name || p.title || p.summary);
    const topo = topologyFromText(`${sku} ${title} ${p.description}`);
    const size = sizeFromText(`${sku} ${title} ${p.summary}`);
    const ports = Array.isArray(p?.technicalProfile?.io?.ports) ? p.technicalProfile.io.ports : [];

    const sigSeen = new Set();
    for (const port of ports) {
      const count = num(port?.count);
      const connector = clean(port?.connector);
      const evidence = clean(port?.evidence || port?.detail);
      const category = lower(port?.category);
      const sig = JSON.stringify([count, connector, clean(port?.direction), category, evidence]);

      if (sigSeen.has(sig)) {
        addIssue("MEDIUM", "technical-profile", rel, sku, "io.ports", evidence, "deduplicated physical ports", "Exact duplicate port row exists.");
      }
      sigSeen.add(sig);

      if (count !== null && count > 64) {
        addIssue("CRITICAL", "technical-profile", rel, sku, "port.count", count, "real physical connector quantity", "Impossible/high port count strongly suggests a resolution or marketing number was parsed as connector quantity.");
      }
      if (resolutionEvidence.test(evidence) && count !== null && [1920,2160,3840,4096].includes(count)) {
        addIssue("CRITICAL", "technical-profile", rel, sku, "io.ports", `${count}x ${connector}`, "not a port row", "Video resolution text has been converted into a physical connector.");
      }
      if (zoomEvidence.test(evidence) && /sfp|fibre|fiber/i.test(connector)) {
        addIssue("CRITICAL", "technical-profile", rel, sku, "io.ports", `${count}x ${connector}: ${evidence}`, "camera zoom capability, not fibre I/O", "Optical zoom was misread as an optical/fibre connector.");
      }
      if (accessoryWords.test(evidence) && !/\bterminal block\b/i.test(evidence)) {
        addIssue("HIGH", "technical-profile", rel, sku, "io.ports", evidence, "io.accessories / box contents", "Included accessory or packaging item is stored as a physical I/O port.");
      }
      if (/5-pin balanced audio/i.test(evidence) && /rj45|ethernet/i.test(connector)) {
        addIssue("CRITICAL", "technical-profile", rel, sku, "connector", connector, "Phoenix/Euroblock balanced audio", "Balanced audio terminal block is misclassified as Ethernet/RJ45.");
      }
      if (/bracket/i.test(evidence) && category === "control") {
        addIssue("HIGH", "technical-profile", rel, sku, "category", category, "accessory", "Mounting hardware is classified as a control port.");
      }
    }

    if (topo === "splitter" && size.inputs && size.outputs) {
      const hdmiInputs = ports.filter((x) => lower(x.direction) === "input" && /hdmi/i.test(`${x.connector} ${x.evidence}`)).reduce((s,x)=>s+(num(x.count)??0),0);
      const hdmiOutputs = ports.filter((x) => lower(x.direction) === "output" && /hdmi/i.test(`${x.connector} ${x.evidence}`)).reduce((s,x)=>s+(num(x.count)??0),0);

      if (hdmiInputs !== size.inputs || hdmiOutputs !== size.outputs) {
        addIssue(
          "CRITICAL", "technical-profile", rel, sku, "splitter I/O",
          `HDMI ${hdmiInputs} in / ${hdmiOutputs} out`,
          `HDMI ${size.inputs} in / ${size.outputs} mirrored out`,
          "Structured technical profile contradicts the product's own 1xN splitter identity."
        );
      }
    }
  }
}

// ---------- Routed / mirrored governance ----------
const routedRel = "data/governance/routed-io-evidence.json";
const routed = readJson(routedRel) ?? {};
for (const [skuRaw, entry] of Object.entries(routed)) {
  const sku = skuRaw.toUpperCase();
  const ws = wsBySku.get(sku);
  const dbp = dbBySku.get(sku);
  const text = `${sku} ${ws?.product_name ?? ""} ${dbp?.name ?? ""} ${dbp?.title ?? ""}`;
  const topo = topologyFromText(text);
  const routedOut = num(entry?.routedOutputs);
  const mirroredOut = num(entry?.mirroredOutputs);
  const physicalOut = num(entry?.physicalOutputs);

  if (topo === "splitter" && routedOut !== null && routedOut > 0 && mirroredOut !== null && mirroredOut > 0) {
    addIssue(
      "HIGH", "governance-semantics", routedRel, sku, "routedOutputs",
      `${routedOut} routed + ${mirroredOut} mirrored`,
      `0/N/A routed; ${mirroredOut} mirrored physical outputs`,
      "A fixed splitter cannot independently route its outputs. Storing the same fan-out as both routed and mirrored destroys the distinction Compare needs."
    );
  }
  if (physicalOut !== null && mirroredOut !== null && mirroredOut > physicalOut) {
    addIssue("CRITICAL", "governance-semantics", routedRel, sku, "physicalOutputs", physicalOut, `>= mirroredOutputs (${mirroredOut})`, "Mirrored output count exceeds physical output count.");
  }
}

// ---------- Competitor catalog audit ----------
const compDir = path.join(root, "data-sources", "competitors");
const competitorFiles = fs.existsSync(compDir)
  ? fs.readdirSync(compDir).filter((x) => x.toLowerCase().endsWith(".csv")).sort()
  : [];
stats.competitorFiles = competitorFiles.length;

for (const fileName of competitorFiles) {
  const rel = `data-sources/competitors/${fileName}`;
  const rows = parseCsvFile(rel);
  stats.competitorRows += rows.length;

  for (const r of rows) {
    const sku = clean(r.model).toUpperCase();
    const text = `${r.product_name} ${r.product_class} ${r.subcategory} ${r.role} ${r.topology}`;
    const topo = topologyFromText(text);
    const approved = lower(r.approval_status) === "approved";
    const inputCount = num(r.input_count);
    const outputCount = num(r.output_count);
    const inputsJson = parseJsonCell(r.inputs_json);
    const outputsJson = parseJsonCell(r.outputs_json);
    const jsonIn = sumJsonPorts(inputsJson);
    const jsonOut = sumJsonPorts(outputsJson);

    if (approved && !clean(r.role)) {
      addIssue("HIGH", "competitor-source", rel, sku, "role", "BLANK", "canonical functional role", "Approved competitor product has no functional role.");
    }
    if (approved && !clean(r.product_class)) {
      addIssue("HIGH", "competitor-source", rel, sku, "product_class", "BLANK", "canonical product class", "Approved competitor product has no product class.");
    }

    if (inputCount !== null && jsonIn !== null && inputCount !== jsonIn) {
      addIssue("HIGH", "competitor-source", rel, sku, "input_count", inputCount, jsonIn, "Top-level input count disagrees with structured inputs_json.");
    }
    if (outputCount !== null && jsonOut !== null && outputCount !== jsonOut) {
      addIssue("HIGH", "competitor-source", rel, sku, "output_count", outputCount, jsonOut, "Top-level output count disagrees with structured outputs_json.");
    }

    const routedOut = num(r.routed_output_count);
    const mirroredOut = num(r.mirrored_output_count);
    if (topo === "splitter" && routedOut !== null && routedOut > 0 && mirroredOut !== null && mirroredOut > 0) {
      addIssue(
        "HIGH", "competitor-semantics", rel, sku, "routed_output_count",
        `${routedOut} routed + ${mirroredOut} mirrored`,
        `0/N/A routed; ${mirroredOut} mirrored`,
        "Distribution amplifier has the same outputs marked as routed and mirrored. That conflates fan-out with matrix routing."
      );
    }

    if (topo === "matrix" && approved && (num(r.routed_input_count) === null || num(r.routed_output_count) === null)) {
      addIssue("MEDIUM", "competitor-semantics", rel, sku, "routed I/O", `${r.routed_input_count}/${r.routed_output_count}`, "explicit routed input/output counts", "Approved matrix is missing routed-I/O topology evidence.");
    }
  }
}

// ---------- Key SKU truth snapshot ----------
const keySkus = [
  "SP-0104-H2","EXP-SP-0104-H2","EXP-SP-0102-H2","SP-0108-SCL",
  "AT-HDDA-2","AT-HDDA-4","AT-HDDA-8"
];

const keyRows = [];
for (const sku of keySkus) {
  const ws = wsBySku.get(sku);
  const dbp = dbBySku.get(sku);
  let comp = null;
  if (sku.startsWith("AT-")) {
    for (const fileName of competitorFiles) {
      const rows = parseCsvFile(`data-sources/competitors/${fileName}`);
      const found = rows.find((r) => clean(r.model).toUpperCase() === sku);
      if (found) { comp = found; break; }
    }
  }
  const gov = routed[sku];

  keyRows.push({
    sku,
    source_name: ws?.product_name ?? comp?.product_name ?? "",
    source_class: ws ? `${ws.family} / ${ws.product_type}` : `${comp?.family ?? ""} / ${comp?.product_class ?? ""}`,
    source_transport: ws?.transport_type ?? comp?.transport_type ?? "",
    source_inputs: ws?.inputs ?? comp?.input_count ?? "",
    source_outputs: ws?.outputs ?? comp?.output_count ?? "",
    db_category: dbp?.category ?? "",
    db_family: dbp?.family ?? "",
    governed_routed_outputs: gov?.routedOutputs ?? comp?.routed_output_count ?? "",
    governed_mirrored_outputs: gov?.mirroredOutputs ?? comp?.mirrored_output_count ?? "",
    closest_wyrestorm: comp?.closest_wyrestorm_sku_or_family ?? "",
  });
}

// ---------- Manifest counts ----------
if (manifest?.counts) {
  if (Number(manifest.counts.wyrestorm) !== wsRows.length) {
    addIssue("HIGH", "source-integrity", manifestRel, "", "counts.wyrestorm", manifest.counts.wyrestorm, wsRows.length, "Manifest WyreStorm count disagrees with source CSV row count.");
  }
  if (Number(manifest.counts.competitor) !== stats.competitorRows) {
    addIssue("HIGH", "source-integrity", manifestRel, "", "counts.competitor", manifest.counts.competitor, stats.competitorRows, "Manifest competitor count disagrees with total source CSV rows.");
  }
}

issues.sort((a,b) =>
  severityRank(b.severity) - severityRank(a.severity) ||
  a.area.localeCompare(b.area) ||
  a.source.localeCompare(b.source) ||
  a.sku.localeCompare(b.sku)
);

const counts = Object.fromEntries(["CRITICAL","HIGH","MEDIUM","LOW"].map(
  (severity) => [severity, issues.filter((x) => x.severity === severity).length]
));

writeCsv(path.join(reportRoot, "issues.csv"), issues);
writeCsv(path.join(reportRoot, "key-sku-truth.csv"), keyRows);
fs.writeFileSync(path.join(reportRoot, "issues.json"), JSON.stringify(issues, null, 2) + "\n");

const summary = [];
summary.push("# Wingman Product Data Quality Audit");
summary.push("");
summary.push(`Repository: \`${root}\``);
summary.push(`Generated: ${new Date().toISOString()}`);
summary.push("");
summary.push("## Dataset size");
summary.push("");
summary.push(`- WyreStorm source rows: ${stats.wyrestormRows}`);
summary.push(`- Competitor source rows: ${stats.competitorRows}`);
summary.push(`- Competitor files: ${stats.competitorFiles}`);
summary.push(`- Structured JSON products scanned: ${stats.jsonProductsScanned}`);
summary.push(`- Manifest hash mismatches: ${stats.manifestHashMismatches}`);
summary.push("");
summary.push("## Issues");
summary.push("");
summary.push(`- CRITICAL: ${counts.CRITICAL}`);
summary.push(`- HIGH: ${counts.HIGH}`);
summary.push(`- MEDIUM: ${counts.MEDIUM}`);
summary.push(`- LOW: ${counts.LOW}`);
summary.push("");
summary.push("## Top findings");
summary.push("");
for (const issue of issues.slice(0, 40)) {
  summary.push(`- **${issue.severity}** [${issue.area}] ${issue.source}${issue.sku ? ` :: ${issue.sku}` : ""} :: ${issue.field} — ${issue.detail} Current: \`${issue.current}\`; expected: \`${issue.expected}\`.`);
}
summary.push("");
summary.push("## Interpretation");
summary.push("");
summary.push("CRITICAL/HIGH findings should be treated as data-governance blockers for automatic Compare matching. Do not tune ranking weights around these defects; repair the canonical product truth and regenerate downstream artefacts first.");
summary.push("");

fs.writeFileSync(path.join(reportRoot, "summary.md"), summary.join("\n") + "\n");

console.log("");
console.log("============================================================");
console.log("Wingman product data quality audit complete");
console.log("============================================================");
console.log(`WyreStorm rows:       ${stats.wyrestormRows}`);
console.log(`Competitor rows:      ${stats.competitorRows}`);
console.log(`JSON products:        ${stats.jsonProductsScanned}`);
console.log(`Manifest mismatches:  ${stats.manifestHashMismatches}`);
console.log(`CRITICAL:             ${counts.CRITICAL}`);
console.log(`HIGH:                 ${counts.HIGH}`);
console.log(`MEDIUM:               ${counts.MEDIUM}`);
console.log(`LOW:                  ${counts.LOW}`);
console.log("");
console.log("Top 20:");
for (const issue of issues.slice(0, 20)) {
  console.log(`${issue.severity.padEnd(8)} ${issue.area.padEnd(22)} ${issue.sku.padEnd(22)} ${issue.field} :: ${issue.detail}`);
}
console.log("");
console.log(`Report: ${reportRoot}`);
'@

$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($nodeScript, $node, $utf8)

Step "Running read-only audit"

node $nodeScript $TargetRoot $ReportRoot
if ($LASTEXITCODE -ne 0) {
    Fail "Data quality audit failed."
}

Step "Report files"
Get-ChildItem -LiteralPath $ReportRoot | Select-Object Name, Length | Format-Table -AutoSize

Write-Host ""
Write-Host "No Wingman source file was modified." -ForegroundColor Green
Write-Host "Paste the console summary, or send summary.md / issues.csv for the repair pass." -ForegroundColor Yellow
