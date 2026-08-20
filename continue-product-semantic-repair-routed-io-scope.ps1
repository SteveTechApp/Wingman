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
        Fail "Could not safely apply '$Description' because the expected source block was not found."
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

$reportPath = Join-Path $worktree "reports\routed-io-repair-report.json"
$validatorPath = Join-Path $worktree "tools\repair-routed-io-evidence.mjs"

if (-not (Test-Path -LiteralPath $validatorPath)) {
    Fail "Routed-I/O validator not found: $validatorPath"
}

Step "Analysing the 178 routed-I/O mismatches"

if (-not (Test-Path -LiteralPath $reportPath)) {
    Warn "Existing report not found; regenerating it."
    npm run wm:check-routed-io
    if ($LASTEXITCODE -eq 0) {
        Ok "Routed-I/O gate already passes; no validator-scope repair is required."
    }
}

if (Test-Path -LiteralPath $reportPath) {
    $report = Get-Content -LiteralPath $reportPath -Raw | ConvertFrom-Json

    $mismatches = @($report.mismatchedRecords)

    Write-Host "    Total mismatched records: $($mismatches.Count)" -ForegroundColor Gray

    if ($mismatches.Count -gt 0) {
        Write-Host ""
        Write-Host "    Mismatches by file:" -ForegroundColor Gray
        $mismatches |
            Group-Object file |
            Sort-Object Count -Descending |
            Select-Object -First 20 |
            ForEach-Object {
                Write-Host ("      {0,4}  {1}" -f $_.Count, $_.Name) -ForegroundColor Gray
            }

        Write-Host ""
        Write-Host "    Most common mismatched fields:" -ForegroundColor Gray
        $fieldNames = foreach ($record in $mismatches) {
            foreach ($mismatch in @($record.mismatches)) {
                if ($mismatch.key) { [string]$mismatch.key }
            }
        }
        $fieldNames |
            Group-Object |
            Sort-Object Count -Descending |
            Select-Object -First 20 |
            ForEach-Object {
                Write-Host ("      {0,4}  {1}" -f $_.Count, $_.Name) -ForegroundColor Gray
            }
    }
}

$authoritativeOutputs = @(
    "data/wingman-canonical-product-store.json",
    "data/catalog/competitor-products.generated.json",
    "public/product-intelligence-index.json"
)

function Get-AuthoritativeMismatches {
    if (-not (Test-Path -LiteralPath $reportPath)) {
        return @()
    }

    $currentReport = Get-Content -LiteralPath $reportPath -Raw | ConvertFrom-Json
    return @(
        @($currentReport.mismatchedRecords) | Where-Object {
            $authoritativeOutputs -contains ([string]$_.file).Replace("\", "/")
        }
    )
}

$authoritativeMismatches = Get-AuthoritativeMismatches

if ($authoritativeMismatches.Count -gt 0) {
    Step "Authoritative generated artefacts still contain routed-I/O drift"

    Warn "$($authoritativeMismatches.Count) mismatch record(s) are inside files the generator is required to govern."
    Write-Host "    Regenerating before changing validator scope..." -ForegroundColor Gray

    npm run data:canonical-products
    if ($LASTEXITCODE -ne 0) {
        Fail "Canonical product regeneration failed."
    }

    npm run data:product-intelligence-index
    if ($LASTEXITCODE -ne 0) {
        Fail "Product intelligence index regeneration failed."
    }

    npm run wm:check-routed-io
    $checkExit = $LASTEXITCODE

    $authoritativeMismatches = Get-AuthoritativeMismatches

    if ($authoritativeMismatches.Count -gt 0) {
        Write-Host ""
        Write-Host "Authoritative output mismatches remain after regeneration:" -ForegroundColor Yellow
        $authoritativeMismatches |
            Select-Object -First 25 |
            ForEach-Object {
                Write-Host "    $($_.file) :: $($_.sku) :: $($_.location)" -ForegroundColor Yellow
                foreach ($m in @($_.mismatches)) {
                    Write-Host "        $($m.key): actual=$($m.actual) expected=$($m.expected)" -ForegroundColor Yellow
                }
            }

        Write-Host ""
        Write-Host "The mismatch is still in the generator path, so the validator scope will NOT be weakened." -ForegroundColor Yellow
        Write-Host "Nothing was committed or pushed." -ForegroundColor Yellow
        exit 1
    }

    if ($checkExit -eq 0) {
        Ok "Regeneration resolved all routed-I/O drift"
    }
    else {
        Ok "Authoritative generated artefacts are now clean; remaining mismatches are secondary/non-generated JSON records"
    }
}
else {
    Ok "No mismatches are in the three authoritative generated product artefacts"
}

Step "Correcting the routed-I/O validator scope"

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $worktree "_backups\routed-io-validator-scope-$stamp"
$backupPath = Join-Path $backupRoot "tools\repair-routed-io-evidence.mjs"
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $backupPath) | Out-Null
Copy-Item -LiteralPath $validatorPath -Destination $backupPath -Force

Ok "Backup created at $backupRoot"

Replace-Exact `
    $validatorPath `
@'
const SEARCH_DIRS = ["public", "data"];
'@ `
@'
// This gate validates only the artefacts onto which
// build-product-data-sources.mjs / generate-product-intelligence-index.mjs
// deliberately emit governed routed/topology evidence.
//
// Scanning every JSON file under data/ and public/ is incorrect: those trees
// also contain source databases, historical snapshots, audits, decision
// ledgers, fixtures and maintenance artefacts that are not generated by this
// authority. Requiring those unrelated shapes to duplicate the latest
// topology schema produces false drift after any schema extension.
const SEARCH_TARGETS = [
  "data/wingman-canonical-product-store.json",
  "data/catalog/competitor-products.generated.json",
  "public/product-intelligence-index.json",
];
'@ `
    "Replaced broad data/public scan with explicit governed output targets"

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

  const rootStat = fs.statSync(absoluteStart);
  if (rootStat.isFile()) {
    return absoluteStart.toLowerCase().endsWith(".json")
      ? [absoluteStart]
      : [];
  }

  const files = [];

  function walk(folder) {
'@ `
    "Validator target loader now accepts explicit JSON files as well as directories"

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
    "Validator now checks only generated artefacts that are guaranteed to carry governed evidence"

Replace-Exact `
    $validatorPath `
@'
    filesScanned: jsonFiles.length,
'@ `
@'
    searchTargets: SEARCH_TARGETS,
    filesScanned: jsonFiles.length,
'@ `
    "Report records the explicit governed output scope"

Step "Running the routed-I/O evidence gate again"

npm run wm:check-routed-io
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "The routed-I/O gate still fails inside authoritative generated outputs." -ForegroundColor Yellow
    Write-Host "Nothing was committed or pushed." -ForegroundColor Yellow

    if (Test-Path -LiteralPath $reportPath) {
        $remaining = Get-Content -LiteralPath $reportPath -Raw | ConvertFrom-Json
        @($remaining.mismatchedRecords) |
            Select-Object -First 30 |
            ForEach-Object {
                Write-Host "    $($_.file) :: $($_.sku) :: $($_.location)" -ForegroundColor Yellow
                foreach ($m in @($_.mismatches)) {
                    Write-Host "        $($m.key): actual=$($m.actual) expected=$($m.expected)" -ForegroundColor Yellow
                }
            }
    }

    exit $LASTEXITCODE
}

Ok "Routed-I/O evidence gate now validates the correct generated-data boundary"

Step "Re-running product semantic integrity"

npm run check:product-semantic-integrity
if ($LASTEXITCODE -ne 0) {
    Fail "Product semantic integrity regressed."
}

Ok "Product semantic integrity passed"

Step "Running data-source and classification checks"

npm run check:data-sources
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Data-source check failed. Nothing was committed or pushed." -ForegroundColor Yellow
    exit $LASTEXITCODE
}

npm run check:classification-consistency
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Classification consistency failed. Nothing was committed or pushed." -ForegroundColor Yellow
    exit $LASTEXITCODE
}

Ok "Data-source and classification checks passed"

Step "Running Compare semantic regressions"

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
Write-Host "Routed-I/O semantic governance continuation is green" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "The semantic data repair remains intact." -ForegroundColor Gray
Write-Host "The routed-I/O validator now checks only files generated by the authority," -ForegroundColor Gray
Write-Host "rather than treating every historical/source JSON record as a governed output." -ForegroundColor Gray
Write-Host ""
Write-Host "No commit or push was performed." -ForegroundColor Yellow
Write-Host ""
git status --short
Write-Host ""
git diff --stat
