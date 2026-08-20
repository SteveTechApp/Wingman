param(
    [string]$RepoRoot = "C:\Users\steve\wingman"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Step([string]$Text) {
    Write-Host ""
    Write-Host "==> $Text" -ForegroundColor Cyan
}
function Ok([string]$Text) {
    Write-Host "    $Text" -ForegroundColor Green
}
function Warn([string]$Text) {
    Write-Host "    $Text" -ForegroundColor Yellow
}
function Fail([string]$Text) {
    throw $Text
}
function Read-Utf8([string]$Path) {
    return [System.IO.File]::ReadAllText($Path)
}
function Write-Utf8NoBom([string]$Path, [string]$Text) {
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    $parent = Split-Path -Parent $Path
    if ($parent) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }
    [System.IO.File]::WriteAllText($Path, $Text, $utf8)
}
function Adapt-Newlines([string]$Text, [string]$Reference) {
    $lf = $Text.Replace("`r`n", "`n")
    if ($Reference.Contains("`r`n")) {
        return $lf.Replace("`n", "`r`n")
    }
    return $lf
}
function Replace-Exact(
    [string]$Path,
    [string]$Old,
    [string]$New,
    [string]$Description
) {
    $text = Read-Utf8 $Path
    $oldText = Adapt-Newlines $Old $text
    $newText = Adapt-Newlines $New $text

    if ($text.Contains($newText)) {
        Ok "$Description already applied"
        return
    }

    if (-not $text.Contains($oldText)) {
        Write-Host ""
        Write-Host "Could not safely apply: $Description" -ForegroundColor Yellow
        Write-Host "File: $Path" -ForegroundColor Yellow
        Fail "Expected source marker was not found. No blind replacement attempted."
    }

    Write-Utf8NoBom $Path ($text.Replace($oldText, $newText))
    Ok $Description
}

$RepoRoot = [System.IO.Path]::GetFullPath($RepoRoot)
$semanticWorktree = Join-Path $RepoRoot ".wingman-work\av-product-semantics"
$TargetRoot = if (Test-Path -LiteralPath $semanticWorktree) { $semanticWorktree } else { $RepoRoot }

if (-not (Test-Path -LiteralPath $TargetRoot)) {
    Fail "Wingman repository/worktree not found: $TargetRoot"
}

Set-Location $TargetRoot

Step "Checking repository state"

$currentBranch = (& git branch --show-current).Trim()
Write-Host "    Target: $TargetRoot" -ForegroundColor Gray
Write-Host "    Branch: $currentBranch" -ForegroundColor Gray

if ($TargetRoot -eq $semanticWorktree -and $currentBranch -ne "feature/av-product-semantics") {
    Fail "Semantic worktree exists but is on '$currentBranch', expected 'feature/av-product-semantics'."
}

# Allow the existing semantic/Compare work already produced in this worktree,
# plus files created by a previous partial run of this repair. Reject unrelated
# user/development work.
$allowedExistingPatterns = @(
    '^data/governance/av-product-semantics-registry\.json$',
    '^src/wingman2/types/avProductSemantics\.ts$',
    '^src/wingman2/lib/avProductSemanticProfiler(\.test)?\.ts$',
    '^src/wingman2/lib/semanticProductRecall(\.test)?\.ts$',
    '^src/wingman2/lib/rigorousCompare\.ts$',
    '^src/wingman2/lib/wyrestormCompareProfile\.ts$',
    '^src/wingman2/types/productTruth\.ts$',
    '^src/wingman2/pages/ComparePageNew\.advanced\.tsx$',
    '^src/wingman2/lib/compareVerdictPipeline\.ts$',
    '^src/wingman2/lib/compareVerdictPipeline\.runtimeAuthority\.test\.ts$',
    '^src/wingman2/pages/ComparePageNew\.semanticDistribution\.test\.tsx$',

    '^tools/enrich-wyrestorm-product-intelligence\.mjs$',
    '^tools/separate-port-accessories\.mjs$',
    '^tools/lib/routed-io-evidence\.mjs$',
    '^tools/repair-product-semantic-data\.mjs$',
    '^tools/check-product-semantic-integrity\.mjs$',
    '^package\.json$',

    '^data-sources/wyrestorm/products\.csv$',
    '^data-sources/wyrestorm/enrichment\.json$',
    '^data-sources/competitors/.+\.csv$',
    '^data/governance/routed-io-evidence\.json$',
    '^data/product-intelligence-db\.json$',
    '^data/wingman-canonical-product-store\.json$',
    '^data/catalog/competitor-products\.generated\.json$',
    '^data/catalog/product-data-manifest\.generated\.json$',
    '^public/product-intelligence-index\.json$',
    '^src/wingman2/lib/__fixtures__/productIntelligenceIndexSample\.json$'
)

$dirty = @(git status --porcelain=v1 --untracked-files=all)
$unexpected = @()

foreach ($line in $dirty) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }

    $relative = $line.Substring(3).Trim()
    if ($relative -match ' -> ') {
        $relative = ($relative -split ' -> ')[-1]
    }
    $relative = $relative.Replace('\', '/')

    $allowed = $false
    foreach ($pattern in $allowedExistingPatterns) {
        if ($relative -match $pattern) {
            $allowed = $true
            break
        }
    }

    if (-not $allowed) {
        $unexpected += $line
    }
}

if ($unexpected.Count -gt 0) {
    Write-Host "Unexpected existing changes:" -ForegroundColor Yellow
    $unexpected | ForEach-Object { Write-Host "    $_" -ForegroundColor Yellow }
    Fail "Refusing to mix unrelated changes into the product-data semantic repair."
}

Ok "No unrelated existing work detected"

Step "Creating backups"

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $TargetRoot "_backups\product-semantic-data-repair-$stamp"

$backupCandidates = @(
    "tools/enrich-wyrestorm-product-intelligence.mjs",
    "tools/separate-port-accessories.mjs",
    "tools/lib/routed-io-evidence.mjs",
    "package.json",
    "data-sources/wyrestorm/products.csv",
    "data-sources/wyrestorm/enrichment.json",
    "data/governance/routed-io-evidence.json",
    "data/product-intelligence-db.json",
    "data/wingman-canonical-product-store.json",
    "data/catalog/competitor-products.generated.json",
    "data/catalog/product-data-manifest.generated.json",
    "public/product-intelligence-index.json",
    "src/wingman2/lib/__fixtures__/productIntelligenceIndexSample.json"
)

$competitorDir = Join-Path $TargetRoot "data-sources\competitors"
if (Test-Path -LiteralPath $competitorDir) {
    Get-ChildItem -LiteralPath $competitorDir -Filter "*.csv" -File | ForEach-Object {
        $backupCandidates += ("data-sources/competitors/" + $_.Name)
    }
}

foreach ($relative in $backupCandidates | Select-Object -Unique) {
    $source = Join-Path $TargetRoot $relative
    if (-not (Test-Path -LiteralPath $source)) { continue }

    $dest = Join-Path $backupRoot $relative
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest) | Out-Null
    Copy-Item -LiteralPath $source -Destination $dest -Force
}

Ok "Backup created at $backupRoot"

Step "Hardening the WyreStorm enrichment parser"

$enrichPath = Join-Path $TargetRoot "tools\enrich-wyrestorm-product-intelligence.mjs"

Replace-Exact `
    $enrichPath `
@'
  if (/sfp|fiber|fibre|optical/i.test(raw)) return "SFP / fibre";
'@ `
@'
  // "Optical" on its own is ambiguous: camera datasheets use it for optical
  // zoom, which must never become an SFP/fibre connector.
  if (/sfp|fiber|fibre/i.test(raw)) return "SFP / fibre";
'@ `
    "Stopped bare 'optical' from becoming an SFP/fibre connector"

Replace-Exact `
    $enrichPath `
@'
function extractPorts(lines) {
  const ports = [];
  let direction = "";

  for (const line of lines) {
    if (/^inputs?$/i.test(line)) {
      direction = "input";
      continue;
    }
    if (/^outputs?$/i.test(line)) {
      direction = "output";
      continue;
    }

    const explicitDirection = /\b(in|input)\b/i.test(line) ? "input" : /\b(out|output)\b/i.test(line) ? "output" : direction;
    const compactPortMatches = [...line.matchAll(/\b(\d+)\s*x\s*([A-Za-z0-9+ ./_-]+?)(?=$|,|\||;|\()/gi)];

    for (const match of compactPortMatches) {
      const count = Number(match[1]);
      const rawConnector = clean(match[2]);
      if (!rawConnector || rawConnector.length > 80) continue;

      // The compact match prefix is always a substring of the line; prepending it
      // made normaliseConnector see doubled text for non-family connectors (e.g.
      // "1x EXP-MX-0402-H2 Matrix" became "EXP-MX-0402-H2 Matrix 1x EXP-MX-0402-H2
      // Matrix"). The line itself already carries the connector phrase.
      const connector = normaliseConnector(line);
      ports.push({
        count,
        connector,
        direction: explicitDirection || "unspecified",
        category: portCategory(connector, line),
        evidence: line,
      });
    }
  }

  return uniqueObjects(ports, (port) => `${port.count}:${port.connector}:${port.direction}:${port.evidence}`);
}
'@ `
@'
const PHYSICAL_PORT_SIGNAL =
  /\bhdmi\b|hdbaset|hdbt|displayport|\bdp\b|\bsdi\b|\bvga\b|\bdvi\b|usb[- ]?[abc]\b|usb\s+\d(?:\.\d)?\b|rj-?45|ethernet|\blan\b|rs-?232|phoenix|euroblock|terminal block|screw\s*down|\d+\s*-?\s*pin\b|3\.5mm|toslink|spdif|\bsfp\b|fibre|fiber|dante|aes67|\bir\s+(?:in|out|input|output)\b|\bcec\b|\brelay\b|\bgpio\b|\bline\s+(?:in|out|input|output)\b|\bspeaker\s+(?:out|output)\b|balanced|composite|mini din|\bbnc\b|\bxlr\b|\brca\b|\btrs\b/i;

const NON_PORT_CAPABILITY =
  /\b\d{3,5}\s*[x×]\s*\d{3,5}\b|\b\d+\s*x\s+optical(?:\s+zoom)?\b|\b\d+\s*x\s+digital(?:\s+zoom)?\b|\boptical\s+zoom\b|\bdigital\s+zoom\b|4:4:4|4:2:0|\bdfov\b|\bfov\b|\bmegapixel\b|\bmp\b/i;

const BOX_CONTENT_ONLY =
  /\b(?:ir|bluetooth)\s+remote\b|remote control|remote handset|quick\s*start|user guide|\bmanual\b|wall mount|rack mount|mounting bracket|rack bracket|power cord|battery not included|cable tie|lens cap/i;

function extractPorts(lines) {
  const ports = [];
  let direction = "";

  for (const line of lines) {
    if (/^inputs?$/i.test(line)) {
      direction = "input";
      continue;
    }
    if (/^outputs?$/i.test(line)) {
      direction = "output";
      continue;
    }

    if (BOX_CONTENT_ONLY.test(line)) continue;

    const explicitDirection =
      /\b(in|input)\b/i.test(line)
        ? "input"
        : /\b(out|output)\b/i.test(line)
          ? "output"
          : direction;

    const compactPortMatches = [
      ...line.matchAll(/\b(\d+)\s*x\s*([A-Za-z0-9+ ./_-]+?)(?=$|,|\||;|\()/gi),
    ];

    for (const match of compactPortMatches) {
      const count = Number(match[1]);
      const rawConnector = clean(match[2]);

      // Physical AV connector quantities are small integers. This prevents
      // 3840x2160 / 5120x2880 / 75x... capability text becoming I/O.
      if (!Number.isFinite(count) || count < 1 || count > 64) continue;
      if (!rawConnector || rawConnector.length > 80) continue;

      const localEvidence = clean(match[0]);
      if (NON_PORT_CAPABILITY.test(localEvidence) || NON_PORT_CAPABILITY.test(rawConnector)) {
        continue;
      }

      // Classify the matched connector phrase, not the whole source line.
      // The whole line can mention Ethernet, audio, zoom or another connector
      // and previously contaminated the connector type.
      if (!PHYSICAL_PORT_SIGNAL.test(rawConnector)) continue;
      const connector = normaliseConnector(rawConnector);

      ports.push({
        count,
        connector,
        direction: explicitDirection || "unspecified",
        category: portCategory(connector, rawConnector),
        evidence: line,
      });
    }
  }

  return uniqueObjects(
    ports,
    (port) => `${port.count}:${port.connector}:${port.direction}:${port.evidence}`,
  );
}
'@ `
    "Rebuilt extractPorts around physical connector evidence"

Replace-Exact `
    $enrichPath `
@'
  if (/^SP-/.test(sku) || includesAny(identityText, ["splitter", "distribution amplifier"])) {
'@ `
@'
  if (/^(?:SP-|EXP-SP-)/.test(sku) || includesAny(identityText, ["splitter", "distribution amplifier"])) {
'@ `
    "Classifies SP and EXP-SP families explicitly as distribution products"

Step "Hardening the existing port/accessory cleaner"

$separatorPath = Join-Path $TargetRoot "tools\separate-port-accessories.mjs"

Replace-Exact `
    $separatorPath `
@'
function isAccessoryText(text, sku) {
  const value = lower(text);
  if (CONNECTOR_SIGNAL.test(value)) return false;
  if (sku && value.includes(lower(sku))) return true;
  if (BOX_CONTENT.test(value)) return true;
  if (CAPABILITY_ONLY.test(value)) return true;
  return false;
}
'@ `
@'
function isAccessoryText(text, sku) {
  const value = lower(text);

  // Strong accessory/capability signals must win before generic connector
  // keywords. "IR Remote" is an accessory, and "12x optical zoom" is a
  // camera capability even though both contain words that can also describe
  // real AV connectors.
  if (/(?:ir|bluetooth)\s+remote\b|remote control|remote handset|quick\s*start|user guide|\bmanual\b|wall mount|rack mount|mounting bracket|rack bracket|battery not included|lens cap/i.test(value)) {
    return true;
  }
  if (/\b\d+\s*x\s+optical(?:\s+zoom)?\b|\b\d+\s*x\s+digital(?:\s+zoom)?\b|\boptical\s+zoom\b|\bdigital\s+zoom\b/i.test(value)) {
    return true;
  }
  if (/\b\d{3,5}\s*[x×]\s*\d{3,5}\b/.test(value) && !/\bhdmi\b|hdbaset|displayport|sdi/i.test(value)) {
    return true;
  }

  if (CONNECTOR_SIGNAL.test(value)) return false;
  if (sku && value.includes(lower(sku))) return true;
  if (BOX_CONTENT.test(value)) return true;
  if (CAPABILITY_ONLY.test(value)) return true;
  return false;
}
'@ `
    "Accessory/capability evidence now wins over ambiguous connector keywords"

Step "Separating mirrored distribution from routed matrix semantics"

$routedLibPath = Join-Path $TargetRoot "tools\lib\routed-io-evidence.mjs"

Replace-Exact `
    $routedLibPath `
@'
  "physicalVideoOutputCount",
];
'@ `
@'
  "physicalVideoOutputCount",
  "logicalInputs",
  "logicalOutputs",
  "topologyType",
  "outputBehaviour",
  "topologyEvidence",
];
'@ `
    "Added logical topology fields to routed-I/O governance"

Replace-Exact `
    $routedLibPath `
@'
export function applyRoutedIoEvidence(record, evidence) {
  preservePhysicalCount(record, "outputs", evidence.routedOutputs, "physicalOutputCount");
  preservePhysicalCount(record, "outputCount", evidence.routedOutputs, "physicalOutputCount");
  preservePhysicalCount(record, "videoOutputs", evidence.routedOutputs, "physicalVideoOutputCount");

  for (const fieldName of NUMERIC_INPUT_FIELDS) {
    patchNumericField(record, fieldName, evidence.routedInputs);
  }
  for (const fieldName of NUMERIC_OUTPUT_FIELDS) {
    patchNumericField(record, fieldName, evidence.routedOutputs);
  }

  record.routedInputs = evidence.routedInputs;
  record.routedOutputs = evidence.routedOutputs;
  record.routedInputCount = evidence.routedInputs;
  record.routedOutputCount = evidence.routedOutputs;
  record.matrixInputs = evidence.routedInputs;
  record.matrixOutputs = evidence.routedOutputs;
  record.matrixSize = `${evidence.routedInputs}x${evidence.routedOutputs}`;
  record.matrixSizeEvidence = evidence.matrixSizeEvidence;
  record.ioEvidenceStatus = evidence.ioEvidenceStatus;
  record.quoteSafety = evidence.quoteSafety;

  if (typeof evidence.physicalOutputs === "number") {
    record.physicalOutputs = evidence.physicalOutputs;
    record.physicalOutputCount = evidence.physicalOutputs;
  }
  if (typeof evidence.mirroredOutputs === "number") {
    record.mirroredOutputs = evidence.mirroredOutputs;
    record.mirroredOutputCount = evidence.mirroredOutputs;
  }

  return record;
}
'@ `
@'
export function applyRoutedIoEvidence(record, evidence) {
  const mirroredDistribution =
    evidence.outputBehaviour === "mirrored" ||
    evidence.topologyType === "one-to-many-mirrored";

  if (mirroredDistribution) {
    const logicalInputs =
      getNumber(evidence.logicalInputs) ??
      getNumber(evidence.physicalInputs) ??
      1;
    const logicalOutputs =
      getNumber(evidence.logicalOutputs) ??
      getNumber(evidence.mirroredOutputs) ??
      getNumber(evidence.physicalOutputs) ??
      0;

    // Generic inputs/outputs describe functional source/destination capacity.
    // They must not be replaced with routed=0 merely because a splitter has
    // no independently routable destinations.
    for (const fieldName of NUMERIC_INPUT_FIELDS) {
      patchNumericField(record, fieldName, logicalInputs);
    }
    for (const fieldName of NUMERIC_OUTPUT_FIELDS) {
      patchNumericField(record, fieldName, logicalOutputs);
    }

    record.logicalInputs = logicalInputs;
    record.logicalOutputs = logicalOutputs;
    record.routedInputs = 0;
    record.routedOutputs = 0;
    record.routedInputCount = 0;
    record.routedOutputCount = 0;

    // A fixed splitter is not a matrix.
    delete record.matrixInputs;
    delete record.matrixOutputs;
    delete record.matrixSize;
    delete record.matrixSizeEvidence;

    record.topologyType = "one-to-many-mirrored";
    record.outputBehaviour = "mirrored";
    record.topologyEvidence =
      evidence.topologyEvidence ??
      evidence.matrixSizeEvidence ??
      `Governed mirrored distribution: ${logicalInputs}x${logicalOutputs}`;
    record.ioEvidenceStatus = evidence.ioEvidenceStatus;
    record.quoteSafety = evidence.quoteSafety;

    const physicalOutputs =
      getNumber(evidence.physicalOutputs) ??
      logicalOutputs;
    const mirroredOutputs =
      getNumber(evidence.mirroredOutputs) ??
      logicalOutputs;

    record.physicalOutputs = physicalOutputs;
    record.physicalOutputCount = physicalOutputs;
    record.physicalVideoOutputCount = physicalOutputs;
    record.mirroredOutputs = mirroredOutputs;
    record.mirroredOutputCount = mirroredOutputs;

    return record;
  }

  preservePhysicalCount(record, "outputs", evidence.routedOutputs, "physicalOutputCount");
  preservePhysicalCount(record, "outputCount", evidence.routedOutputs, "physicalOutputCount");
  preservePhysicalCount(record, "videoOutputs", evidence.routedOutputs, "physicalVideoOutputCount");

  for (const fieldName of NUMERIC_INPUT_FIELDS) {
    patchNumericField(record, fieldName, evidence.routedInputs);
  }
  for (const fieldName of NUMERIC_OUTPUT_FIELDS) {
    patchNumericField(record, fieldName, evidence.routedOutputs);
  }

  record.logicalInputs =
    getNumber(evidence.logicalInputs) ??
    evidence.routedInputs;
  record.logicalOutputs =
    getNumber(evidence.logicalOutputs) ??
    evidence.routedOutputs;
  record.routedInputs = evidence.routedInputs;
  record.routedOutputs = evidence.routedOutputs;
  record.routedInputCount = evidence.routedInputs;
  record.routedOutputCount = evidence.routedOutputs;
  record.matrixInputs = evidence.routedInputs;
  record.matrixOutputs = evidence.routedOutputs;
  record.matrixSize = `${evidence.routedInputs}x${evidence.routedOutputs}`;
  record.matrixSizeEvidence = evidence.matrixSizeEvidence;
  if (evidence.topologyType) record.topologyType = evidence.topologyType;
  if (evidence.outputBehaviour) record.outputBehaviour = evidence.outputBehaviour;
  if (evidence.topologyEvidence) record.topologyEvidence = evidence.topologyEvidence;
  record.ioEvidenceStatus = evidence.ioEvidenceStatus;
  record.quoteSafety = evidence.quoteSafety;

  if (typeof evidence.physicalOutputs === "number") {
    record.physicalOutputs = evidence.physicalOutputs;
    record.physicalOutputCount = evidence.physicalOutputs;
  }
  if (typeof evidence.mirroredOutputs === "number") {
    record.mirroredOutputs = evidence.mirroredOutputs;
    record.mirroredOutputCount = evidence.mirroredOutputs;
  }

  return record;
}
'@ `
    "Routed-I/O authority now models fixed fan-out separately from matrix routing"

Step "Installing source-data semantic repair tool"

$repairToolPath = Join-Path $TargetRoot "tools\repair-product-semantic-data.mjs"

$repairTool = @'
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
    row.role = "distribution-amplifier";
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
      const identity = lower(
        `${row.product_name} ${row.product_class} ${row.subcategory} ${row.role} ${row.topology}`,
      );
      const fixedDistribution =
        /distribution amplifier|\bhdmi splitter\b|\bsplitter\b|one-to-many/.test(identity);

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
'@

Write-Utf8NoBom $repairToolPath $repairTool
Ok "Installed tools/repair-product-semantic-data.mjs"

Step "Installing permanent semantic integrity gate"

$gatePath = Join-Path $TargetRoot "tools\check-product-semantic-integrity.mjs"

$gate = @'
#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const failures = [];

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
function fail(source, sku, detail) {
  failures.push({ source, sku: clean(sku), detail });
}
function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}
function payloadArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.records)) return payload.records;
  return [];
}
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; }
        else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((v) => v !== "")) rows.push(row);
      row = []; field = "";
    } else field += ch;
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    if (row.some((v) => v !== "")) rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows[0].map(clean);
  return rows.slice(1).map((values) => {
    const out = {};
    headers.forEach((header, index) => out[header] = values[index] ?? "");
    return out;
  });
}
function csv(rel) {
  return parseCsv(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}
function splitterSize(sku, title) {
  const explicit = `${sku} ${title}`.replaceAll("×", "x").match(/\b1\s*x\s*(\d{1,2})\b/i);
  if (explicit) return { inputs: 1, outputs: Number(explicit[1]) };
  const skuMatch = clean(sku).toUpperCase().match(/^(?:EXP-)?SP-01(\d{2})(?:-|$)/);
  if (skuMatch) return { inputs: 1, outputs: Number(skuMatch[1]) };
  if (/^SP-618$/i.test(clean(sku))) return { inputs: 1, outputs: 8 };
  return null;
}
function isSplitter(sku, title, extra = "") {
  return Boolean(splitterSize(sku, title)) ||
    /distribution amplifier|\bhdmi splitter\b|\bsplitter\b|one-to-many/i.test(`${title} ${extra}`);
}

for (const rel of [
  "data-sources/wyrestorm/enrichment.json",
  "data/wingman-canonical-product-store.json",
  "public/product-intelligence-index.json",
  "src/wingman2/lib/__fixtures__/productIntelligenceIndexSample.json",
]) {
  const payload = readJson(rel);
  for (const product of payloadArray(payload)) {
    const sku = clean(product.sku || product.id);
    const title = clean(product.name || product.title || product.summary);
    const ports = Array.isArray(product?.technicalProfile?.io?.ports)
      ? product.technicalProfile.io.ports
      : [];

    for (const port of ports) {
      const count = num(port.count);
      const evidence = clean(port.evidence || port.detail);
      const connector = clean(port.connector);
      const combined = `${connector} ${evidence}`;

      if (count !== null && count > 64) {
        fail(rel, sku, `Impossible port count ${count}: ${combined}`);
      }
      if (/\b\d+\s*x\s+optical(?:\s+zoom)?\b|\boptical\s+zoom\b/i.test(combined) &&
          /sfp|fibre|fiber|optical/i.test(connector)) {
        fail(rel, sku, `Optical zoom parsed as fibre/SFP: ${combined}`);
      }
      if (/(?:ir|bluetooth)\s+remote\b|remote control|remote handset|quick\s*start|user guide|\bmanual\b|wall mount|rack mount|mounting bracket|rack bracket|battery not included/i.test(evidence)) {
        fail(rel, sku, `Accessory remains in io.ports: ${evidence}`);
      }
      if (/5-?pin.*balanced.*audio|balanced.*audio.*5-?pin/i.test(evidence) &&
          /rj-?45|ethernet/i.test(connector)) {
        fail(rel, sku, `Balanced audio terminal block is still Ethernet/RJ45: ${combined}`);
      }
    }

    const size = splitterSize(sku, title);
    if (size && isSplitter(sku, title, `${product.category} ${product.family}`)) {
      const hdmiInput = ports
        .filter((p) => lower(p.direction) === "input" && /\bhdmi\b/i.test(`${p.connector} ${p.evidence}`))
        .reduce((sum, p) => sum + (num(p.count) ?? 0), 0);
      const hdmiOutput = ports
        .filter((p) => lower(p.direction) === "output" && /\bhdmi\b/i.test(`${p.connector} ${p.evidence}`))
        .reduce((sum, p) => sum + (num(p.count) ?? 0), 0);

      if (hdmiInput !== 1 || hdmiOutput !== size.outputs) {
        fail(rel, sku, `Splitter HDMI I/O is ${hdmiInput} in / ${hdmiOutput} out; expected 1 in / ${size.outputs} mirrored out.`);
      }

      const routed =
        num(product.routedOutputCount) ??
        num(product.routedOutputs);
      if (routed !== null && routed !== 0) {
        fail(rel, sku, `Fixed splitter exposes ${routed} independently routed outputs.`);
      }
    }
  }
}

const authority = readJson("data/governance/routed-io-evidence.json");
for (const [sku, entry] of Object.entries(authority)) {
  const size = splitterSize(sku, "");
  const splitter =
    Boolean(size) ||
    entry.outputBehaviour === "mirrored" ||
    entry.topologyType === "one-to-many-mirrored";

  if (!splitter) continue;

  if (num(entry.routedOutputs) !== 0) {
    fail("data/governance/routed-io-evidence.json", sku, "Fixed splitter routedOutputs must be 0.");
  }
  if (entry.outputBehaviour !== "mirrored") {
    fail("data/governance/routed-io-evidence.json", sku, "Fixed splitter outputBehaviour must be mirrored.");
  }
  if (entry.topologyType !== "one-to-many-mirrored") {
    fail("data/governance/routed-io-evidence.json", sku, "Fixed splitter topologyType must be one-to-many-mirrored.");
  }
  const logical = num(entry.logicalOutputs);
  const mirrored = num(entry.mirroredOutputs);
  const physical = num(entry.physicalOutputs);
  if (logical === null || mirrored === null || physical === null ||
      logical !== mirrored || mirrored !== physical) {
    fail(
      "data/governance/routed-io-evidence.json",
      sku,
      `Logical/physical/mirrored fan-out must agree. logical=${logical}, physical=${physical}, mirrored=${mirrored}`,
    );
  }
}

const wsRows = csv("data-sources/wyrestorm/products.csv");
for (const row of wsRows) {
  const size = splitterSize(row.sku, row.product_name);
  if (!size) continue;

  if (!/splitter|distribution/i.test(`${row.family} ${row.product_type} ${row.role}`)) {
    fail("data-sources/wyrestorm/products.csv", row.sku, "Splitter remains generic/unclassified.");
  }
  if (num(row.inputs) !== 1 || num(row.outputs) !== size.outputs) {
    fail(
      "data-sources/wyrestorm/products.csv",
      row.sku,
      `Canonical splitter I/O is ${row.inputs}/${row.outputs}; expected 1/${size.outputs}.`,
    );
  }
}

const competitorDir = path.join(ROOT, "data-sources", "competitors");
for (const fileName of fs.readdirSync(competitorDir).filter((x) => x.endsWith(".csv"))) {
  const rel = `data-sources/competitors/${fileName}`;
  for (const row of csv(rel)) {
    if (!isSplitter(row.model, row.product_name, `${row.product_class} ${row.role} ${row.topology}`)) continue;
    const mirrored = num(row.mirrored_output_count);
    if (mirrored !== null && mirrored > 0 && num(row.routed_output_count) !== 0) {
      fail(rel, row.model, `Fixed distribution product has routed_output_count=${row.routed_output_count}.`);
    }
  }
}

if (failures.length) {
  console.error("");
  console.error("Product semantic integrity gate FAILED");
  for (const item of failures.slice(0, 100)) {
    console.error(`- ${item.source} :: ${item.sku} :: ${item.detail}`);
  }
  if (failures.length > 100) {
    console.error(`... ${failures.length - 100} more failure(s) omitted`);
  }
  process.exit(1);
}

console.log("");
console.log("Product semantic integrity gate PASS");
console.log("Validated:");
console.log("- no impossible physical port counts");
console.log("- no camera zoom represented as optical/fibre I/O");
console.log("- no known box-content accessories in io.ports");
console.log("- balanced terminal audio is not Ethernet");
console.log("- 1xN splitter physical I/O is explicit");
console.log("- fixed distribution fan-out is mirrored, not independently routed");
console.log("- WyreStorm source splitter classification/I-O is explicit");
console.log("- competitor fixed distribution routing semantics are separated");
'@

Write-Utf8NoBom $gatePath $gate
Ok "Installed tools/check-product-semantic-integrity.mjs"

Step "Adding the permanent gate to package verification"

$packagePath = Join-Path $TargetRoot "package.json"
$packageNodePath = Join-Path $TargetRoot "tools\_patch-product-semantic-package.mjs"

$packagePatch = @'
import fs from "node:fs";

const file = "package.json";
const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
pkg.scripts ??= {};

pkg.scripts["check:product-semantic-integrity"] =
  "node tools/check-product-semantic-integrity.mjs";

const verifyData = pkg.scripts["verify:data"];
if (!verifyData) {
  throw new Error("package.json has no verify:data script; refusing to invent the verification chain.");
}

if (!verifyData.includes("check:product-semantic-integrity")) {
  pkg.scripts["verify:data"] =
    `${verifyData} && npm run check:product-semantic-integrity`;
}

fs.writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
'@

Write-Utf8NoBom $packageNodePath $packagePatch
node $packageNodePath
$packageExit = $LASTEXITCODE
Remove-Item -LiteralPath $packageNodePath -Force
if ($packageExit -ne 0) {
    Fail "Could not safely add the semantic data gate to package.json."
}

Ok "check:product-semantic-integrity is now part of verify:data"

Step "Applying conservative source-data repairs"

node tools/repair-product-semantic-data.mjs --apply
if ($LASTEXITCODE -ne 0) {
    Fail "Source-data semantic repair failed."
}

Ok "Source truth repaired"

Step "Regenerating canonical and public product artefacts"

node tools/build-product-data-sources.mjs
if ($LASTEXITCODE -ne 0) {
    Fail "Canonical product-data generation failed."
}

node tools/generate-product-intelligence-index.mjs
if ($LASTEXITCODE -ne 0) {
    Fail "Product intelligence index generation failed."
}

node tools/sanitize-product-intelligence-index.mjs
if ($LASTEXITCODE -ne 0) {
    Fail "Product intelligence index sanitization failed."
}

Ok "Derived product artefacts regenerated from repaired sources"

Step "Running permanent semantic integrity gate"

npm run check:product-semantic-integrity
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Semantic integrity gate found remaining source defects." -ForegroundColor Yellow
    Write-Host "Nothing was committed or pushed." -ForegroundColor Yellow
    Write-Host "Paste the first failure block." -ForegroundColor Yellow
    exit $LASTEXITCODE
}

Ok "Product semantic integrity gate passed"

Step "Checking routed-I/O governance propagation"

npm run wm:check-routed-io
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Routed-I/O propagation still has drift." -ForegroundColor Yellow
    Write-Host "Nothing was committed or pushed." -ForegroundColor Yellow
    exit $LASTEXITCODE
}

Ok "Routed-I/O governance propagation passed"

Step "Running data-source and classification checks"

npm run check:data-sources
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Data-source verification failed." -ForegroundColor Yellow
    Write-Host "Nothing was committed or pushed." -ForegroundColor Yellow
    exit $LASTEXITCODE
}

npm run check:classification-consistency
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Classification consistency failed." -ForegroundColor Yellow
    Write-Host "Nothing was committed or pushed." -ForegroundColor Yellow
    exit $LASTEXITCODE
}

Ok "Data source and classification checks passed"

Step "Running Compare semantic regressions"

$tests = @(
    "src/wingman2/lib/avProductSemanticProfiler.test.ts",
    "src/wingman2/lib/semanticProductRecall.test.ts",
    "src/wingman2/lib/compareEligibilityEngine.splitterFanOut.test.ts",
    "src/wingman2/lib/compareVerdictPipeline.test.ts",
    "src/wingman2/pages/ComparePageNew.advanced.realCatalog.test.ts"
)

if (Test-Path -LiteralPath (Join-Path $TargetRoot "src\wingman2\lib\compareVerdictPipeline.runtimeAuthority.test.ts")) {
    $tests += "src/wingman2/lib/compareVerdictPipeline.runtimeAuthority.test.ts"
}
if (Test-Path -LiteralPath (Join-Path $TargetRoot "src\wingman2\pages\ComparePageNew.semanticDistribution.test.tsx")) {
    $tests += "src/wingman2/pages/ComparePageNew.semanticDistribution.test.tsx"
}

npx vitest run $tests
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Compare semantic regression failed." -ForegroundColor Yellow
    Write-Host "Nothing was committed or pushed." -ForegroundColor Yellow
    Write-Host "Paste the first failing test block." -ForegroundColor Yellow
    exit $LASTEXITCODE
}

Ok "Compare semantic regressions passed"

Step "Running TypeScript typecheck"

npm run typecheck
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Typecheck failed. Nothing was committed or pushed." -ForegroundColor Yellow
    exit $LASTEXITCODE
}

Ok "Typecheck passed"

Step "Running production build"

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Build failed. Nothing was committed or pushed." -ForegroundColor Yellow
    exit $LASTEXITCODE
}

Ok "Production build passed"

Step "Running full verification"

npm run verify
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Full verify found a remaining repository gate failure." -ForegroundColor Yellow
    Write-Host "Nothing was committed or pushed." -ForegroundColor Yellow
    Write-Host "Paste only the final failing section." -ForegroundColor Yellow
    exit $LASTEXITCODE
}

Ok "Full verification passed"

Step "Checking diff hygiene"

git diff --check
if ($LASTEXITCODE -ne 0) {
    Fail "git diff --check failed."
}

Ok "git diff --check passed"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "Wingman product semantic data repair is green" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Implemented:" -ForegroundColor Gray
Write-Host "  - parser guards against resolution/zoom/accessory contamination" -ForegroundColor Gray
Write-Host "  - explicit splitter/distribution source classification" -ForegroundColor Gray
Write-Host "  - logical vs physical vs mirrored vs routed output semantics" -ForegroundColor Gray
Write-Host "  - competitor fixed-distribution topology correction" -ForegroundColor Gray
Write-Host "  - repaired source enrichment and generated downstream artefacts" -ForegroundColor Gray
Write-Host "  - permanent product-semantic integrity gate in verify:data" -ForegroundColor Gray
Write-Host ""
Write-Host "No commit or push was performed." -ForegroundColor Yellow
Write-Host "Backup: $backupRoot" -ForegroundColor Gray
Write-Host ""
git status --short
Write-Host ""
git diff --stat
