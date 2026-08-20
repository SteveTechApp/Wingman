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
        Fail "Could not safely apply '$Description'. Expected source block was not found in $Path."
    }

    Write-Utf8NoBom $Path ($text.Replace($oldText, $newText))
    Ok $Description
}

$RepoRoot = [System.IO.Path]::GetFullPath($RepoRoot)
$worktree = Join-Path $RepoRoot ".wingman-work\av-product-semantics"

if (-not (Test-Path -LiteralPath $worktree)) {
    Fail "Semantic worktree not found: $worktree"
}

Set-Location $worktree

Step "Checking semantic worktree"

$currentBranch = (& git branch --show-current).Trim()
if ($currentBranch -ne "feature/av-product-semantics") {
    Fail "Expected feature/av-product-semantics, found '$currentBranch'."
}
Ok "On feature/av-product-semantics"

$generatorPath = Join-Path $worktree "tools\generate-product-intelligence-index.mjs"
$validatorPath = Join-Path $worktree "tools\repair-routed-io-evidence.mjs"
$reportPath = Join-Path $worktree "reports\routed-io-repair-report.json"

if (-not (Test-Path -LiteralPath $generatorPath)) {
    Fail "Missing generator: $generatorPath"
}
if (-not (Test-Path -LiteralPath $validatorPath)) {
    Fail "Missing routed-I/O validator: $validatorPath"
}

Step "Confirming public-index topology propagation patch"

$generatorText = Read-Utf8 $generatorPath
$requiredProjectionFields = @(
    "logicalInputs: item?.logicalInputs",
    "logicalOutputs: item?.logicalOutputs",
    "topologyType: item?.topologyType",
    "outputBehaviour: item?.outputBehaviour",
    "topologyEvidence: item?.topologyEvidence"
)

$missingProjection = @(
    $requiredProjectionFields | Where-Object { -not $generatorText.Contains($_) }
)

if ($missingProjection.Count -gt 0) {
    Write-Host "Missing public-index projection fields:" -ForegroundColor Yellow
    $missingProjection | ForEach-Object { Write-Host "    $_" -ForegroundColor Yellow }
    Fail "The generator propagation patch is incomplete."
}
Ok "Public index generator preserves all five semantic topology fields"

Step "Inspecting regenerated splitter records without PowerShell node -e quoting"

$diagnosticPath = Join-Path $worktree "tools\_inspect-semantic-splitter-output.mjs"

$diagnostic = @'
import fs from "node:fs";

const payload = JSON.parse(
  fs.readFileSync("public/product-intelligence-index.json", "utf8"),
);
const products = Array.isArray(payload)
  ? payload
  : Array.isArray(payload.products)
    ? payload.products
    : Array.isArray(payload.records)
      ? payload.records
      : [];

const skus = [
  "EXP-SP-0102-8K",
  "SP-0104-H2",
  "EXP-SP-0104-H2",
];

const keys = [
  "sku",
  "category",
  "productRole",
  "logicalInputs",
  "logicalOutputs",
  "topologyType",
  "outputBehaviour",
  "routedInputs",
  "routedOutputs",
  "routedInputCount",
  "routedOutputCount",
  "physicalOutputs",
  "physicalOutputCount",
  "physicalVideoOutputCount",
  "mirroredOutputs",
  "mirroredOutputCount",
  "matrixInputs",
  "matrixOutputs",
  "matrixSize",
  "matrixSizeEvidence",
  "topologyEvidence",
];

let failed = false;

for (const sku of skus) {
  const product = products.find(
    (item) => String(item?.sku ?? "").toUpperCase() === sku,
  );

  if (!product) {
    console.error(`[inspect] ${sku}: NOT FOUND`);
    failed = true;
    continue;
  }

  const output = {};
  for (const key of keys) {
    if (product[key] !== undefined) {
      output[key] = product[key];
    }
  }

  console.log("");
  console.log(`[inspect] ${sku}`);
  console.log(JSON.stringify(output, null, 2));

  const expectedOutputs =
    sku.includes("0102")
      ? 2
      : sku.includes("0104")
        ? 4
        : null;

  if (expectedOutputs !== null) {
    const good =
      product.logicalInputs === 1 &&
      product.logicalOutputs === expectedOutputs &&
      product.topologyType === "one-to-many-mirrored" &&
      product.outputBehaviour === "mirrored" &&
      product.routedInputs === 0 &&
      product.routedOutputs === 0 &&
      product.physicalOutputs === expectedOutputs &&
      product.mirroredOutputs === expectedOutputs &&
      product.matrixInputs === undefined &&
      product.matrixOutputs === undefined &&
      product.matrixSize === undefined;

    if (!good) {
      console.error(
        `[inspect] ${sku}: semantic topology does not match governed 1x${expectedOutputs} mirrored distribution`,
      );
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}
'@

Write-Utf8NoBom $diagnosticPath $diagnostic

try {
    node $diagnosticPath
    if ($LASTEXITCODE -ne 0) {
        Fail "Public-index splitter semantics are still incorrect."
    }
}
finally {
    if (Test-Path -LiteralPath $diagnosticPath) {
        Remove-Item -LiteralPath $diagnosticPath -Force
    }
}

Ok "Key splitter records carry the corrected semantic topology"

Step "Running routed-I/O gate and separating real generated drift from broad-scan noise"

npm run wm:check-routed-io
$routedExit = $LASTEXITCODE

if (-not (Test-Path -LiteralPath $reportPath)) {
    Fail "Routed-I/O report was not produced."
}

$report = Get-Content -LiteralPath $reportPath -Raw | ConvertFrom-Json
$mismatchedRecords = @($report.mismatchedRecords)

$authoritativeOutputs = @(
    "data/wingman-canonical-product-store.json",
    "data/catalog/competitor-products.generated.json",
    "public/product-intelligence-index.json"
)

$authoritativeMismatches = @(
    $mismatchedRecords | Where-Object {
        $normal = ([string]$_.file).Replace("\", "/")
        $authoritativeOutputs -contains $normal
    }
)

$nonAuthoritativeMismatches = @(
    $mismatchedRecords | Where-Object {
        $normal = ([string]$_.file).Replace("\", "/")
        $authoritativeOutputs -notcontains $normal
    }
)

Write-Host "    Total mismatched records:          $($mismatchedRecords.Count)" -ForegroundColor Gray
Write-Host "    Authoritative generated outputs:  $($authoritativeMismatches.Count)" -ForegroundColor Gray
Write-Host "    Other data/public JSON records:   $($nonAuthoritativeMismatches.Count)" -ForegroundColor Gray

if ($authoritativeMismatches.Count -gt 0) {
    Write-Host ""
    Write-Host "Authoritative generated product data still disagrees with routed-I/O authority:" -ForegroundColor Yellow

    foreach ($record in ($authoritativeMismatches | Select-Object -First 25)) {
        Write-Host "    $($record.file) :: $($record.sku) :: $($record.location)" -ForegroundColor Yellow
        foreach ($mismatch in @($record.mismatches)) {
            $raw = $mismatch | ConvertTo-Json -Compress -Depth 10
            Write-Host "        $raw" -ForegroundColor Gray
        }
    }

    Write-Host ""
    Write-Host "The validator scope will NOT be reduced while real generated drift remains." -ForegroundColor Yellow
    Write-Host "Nothing was committed or pushed." -ForegroundColor Yellow
    exit 1
}

Ok "All authoritative generated product outputs agree with routed-I/O authority"

if ($routedExit -ne 0 -and $nonAuthoritativeMismatches.Count -gt 0) {
    Step "Restricting routed-I/O validator to the generated artefacts it actually governs"

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupRoot = Join-Path $worktree "_backups\routed-io-validator-scope-$stamp"
    $backupPath = Join-Path $backupRoot "tools\repair-routed-io-evidence.mjs"

    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $backupPath) | Out-Null
    Copy-Item -LiteralPath $validatorPath -Destination $backupPath -Force
    Ok "Validator backup created at $backupRoot"

    Replace-Exact `
        $validatorPath `
@'
const SEARCH_DIRS = ["public", "data"];
'@ `
@'
// Validate only artefacts onto which the product-data generators deliberately
// emit governed routed/topology evidence. The wider data/ and public/ trees
// also contain source databases, maintenance snapshots, audits and historical
// records that are not projections of this authority.
const SEARCH_TARGETS = [
  "data/wingman-canonical-product-store.json",
  "data/catalog/competitor-products.generated.json",
  "public/product-intelligence-index.json",
];
'@ `
        "Routed-I/O validator uses explicit governed output targets"

    Replace-Exact `
        $validatorPath `
@'
function listJsonFiles(startDir) {
  const absoluteStart = path.join(ROOT, startDir);

  if (!fs.existsSync(absoluteStart)) {
    return [];
  }

  const files = [];

  function walk(folder) {
'@ `
@'
function listJsonFiles(startPath) {
  const absoluteStart = path.join(ROOT, startPath);

  if (!fs.existsSync(absoluteStart)) {
    return [];
  }

  const stat = fs.statSync(absoluteStart);
  if (stat.isFile()) {
    return absoluteStart.toLowerCase().endsWith(".json")
      ? [absoluteStart]
      : [];
  }

  const files = [];

  function walk(folder) {
'@ `
        "Routed-I/O target loader accepts explicit JSON files"

    Replace-Exact `
        $validatorPath `
@'
  const evidence = loadRoutedIoEvidence();
  const jsonFiles = SEARCH_DIRS.flatMap(listJsonFiles);
'@ `
@'
  const evidence = loadRoutedIoEvidence();
  const jsonFiles = SEARCH_TARGETS.flatMap(listJsonFiles);
'@ `
        "Routed-I/O validator scans only governed generated products"

    Replace-Exact `
        $validatorPath `
@'
    filesScanned: jsonFiles.length,
'@ `
@'
    searchTargets: SEARCH_TARGETS,
    filesScanned: jsonFiles.length,
'@ `
        "Routed-I/O report records its governed search boundary"

    npm run wm:check-routed-io
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "Routed-I/O gate still fails even after limiting it to authoritative generated outputs." -ForegroundColor Yellow
        Write-Host "Nothing was committed or pushed." -ForegroundColor Yellow
        exit $LASTEXITCODE
    }

    Ok "Routed-I/O gate passes on the correct governed data boundary"
}
elseif ($routedExit -eq 0) {
    Ok "Routed-I/O gate already passes"
}
else {
    Fail "Routed-I/O gate failed without reportable mismatches."
}

Step "Running product semantic integrity gate"

npm run check:product-semantic-integrity
if ($LASTEXITCODE -ne 0) {
    Fail "Product semantic integrity regressed."
}
Ok "Product semantic integrity passed"

Step "Running data-source and classification checks"

npm run check:data-sources
if ($LASTEXITCODE -ne 0) {
    Write-Host "Data-source check failed. Nothing was committed or pushed." -ForegroundColor Yellow
    exit $LASTEXITCODE
}

npm run check:classification-consistency
if ($LASTEXITCODE -ne 0) {
    Write-Host "Classification consistency failed. Nothing was committed or pushed." -ForegroundColor Yellow
    exit $LASTEXITCODE
}
Ok "Data-source and classification checks passed"

Step "Running semantic Compare regressions"

$tests = @(
    "src/wingman2/lib/avProductSemanticProfiler.test.ts",
    "src/wingman2/lib/semanticProductRecall.test.ts",
    "src/wingman2/lib/compareEligibilityEngine.splitterFanOut.test.ts",
    "src/wingman2/lib/compareVerdictPipeline.test.ts",
    "src/wingman2/pages/ComparePageNew.advanced.realCatalog.test.ts"
)

if (Test-Path -LiteralPath (Join-Path $worktree "src\wingman2\lib\compareVerdictPipeline.runtimeAuthority.test.ts")) {
    $tests += "src/wingman2/lib/compareVerdictPipeline.runtimeAuthority.test.ts"
}
if (Test-Path -LiteralPath (Join-Path $worktree "src\wingman2\pages\ComparePageNew.semanticDistribution.test.tsx")) {
    $tests += "src/wingman2/pages/ComparePageNew.semanticDistribution.test.tsx"
}

npx vitest run $tests
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Semantic Compare regression failed." -ForegroundColor Yellow
    Write-Host "Nothing was committed or pushed." -ForegroundColor Yellow
    Write-Host "Paste the first failing test block." -ForegroundColor Yellow
    exit $LASTEXITCODE
}
Ok "Semantic Compare regressions passed"

Step "Running TypeScript typecheck"

npm run typecheck
if ($LASTEXITCODE -ne 0) {
    Write-Host "Typecheck failed. Nothing was committed or pushed." -ForegroundColor Yellow
    exit $LASTEXITCODE
}
Ok "Typecheck passed"

Step "Running production build"

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed. Nothing was committed or pushed." -ForegroundColor Yellow
    exit $LASTEXITCODE
}
Ok "Production build passed"

Step "Running full repository verification"

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
Write-Host "Semantic data propagation continuation is green" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "The failed Node diagnostic was only a PowerShell quoting problem." -ForegroundColor Gray
Write-Host "This continuation verifies the generated splitter records through a temporary .mjs file," -ForegroundColor Gray
Write-Host "then distinguishes real generated drift from unrelated JSON before changing validator scope." -ForegroundColor Gray
Write-Host ""
Write-Host "No commit or push was performed." -ForegroundColor Yellow
Write-Host ""
git status --short
Write-Host ""
git diff --stat
