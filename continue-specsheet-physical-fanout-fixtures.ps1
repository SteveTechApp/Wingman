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

$proofTest = Join-Path $worktree "src\wingman2\components\compare\CompareProofTable.provenance.test.tsx"
$showdownTest = Join-Path $worktree "src\wingman2\components\compare\CompareShowdown.test.tsx"

foreach ($file in @($proofTest, $showdownTest)) {
    if (-not (Test-Path -LiteralPath $file)) {
        Fail "Missing test file: $file"
    }
}

Step "Backing up the two stale SpecSheet fixtures"

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $worktree "_backups\specsheet-physical-fanout-test-fixtures-$stamp"

foreach ($relative in @(
    "src/wingman2/components/compare/CompareProofTable.provenance.test.tsx",
    "src/wingman2/components/compare/CompareShowdown.test.tsx"
)) {
    $src = Join-Path $worktree $relative
    $dst = Join-Path $backupRoot $relative
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dst) | Out-Null
    Copy-Item -LiteralPath $src -Destination $dst -Force
}

Ok "Backup created at $backupRoot"

Step "Updating matrix proof-table fixture with explicit physical/mirrored fan-out"

Replace-Exact `
    $proofTest `
@'
    hdmiIn: 8,
    hdmiOut: 8,
    routedIn: 8,
    routedOut: 8,
    usbVersion: "USB 2.0",
'@ `
@'
    hdmiIn: 8,
    hdmiOut: 8,
    routedIn: 8,
    routedOut: 8,
    physicalOut: 8,
    mirroredOut: 0,
    usbVersion: "USB 2.0",
'@ `
    "CompareProofTable fixture now satisfies the complete SpecSheet topology contract"

Step "Updating AVoIP showdown fixture with explicit physical/mirrored fan-out"

Replace-Exact `
    $showdownTest `
@'
    hdmiIn: 1,
    hdmiOut: 1,
    routedIn: 1,
    routedOut: 1,
    usbVersion: "USB 2.0",
'@ `
@'
    hdmiIn: 1,
    hdmiOut: 1,
    routedIn: 1,
    routedOut: 1,
    physicalOut: 1,
    mirroredOut: 0,
    usbVersion: "USB 2.0",
'@ `
    "CompareShowdown fixture now satisfies the complete SpecSheet topology contract"

Step "Running TypeScript typecheck"

npm run typecheck
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Typecheck still fails." -ForegroundColor Yellow
    Write-Host "Nothing was committed or pushed." -ForegroundColor Yellow
    Write-Host "Paste the first remaining error block." -ForegroundColor Yellow
    exit $LASTEXITCODE
}

Ok "Typecheck passed"

Step "Running the two affected component tests"

npx vitest run `
    "src/wingman2/components/compare/CompareProofTable.provenance.test.tsx" `
    "src/wingman2/components/compare/CompareShowdown.test.tsx"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "A component regression failed." -ForegroundColor Yellow
    Write-Host "Nothing was committed or pushed." -ForegroundColor Yellow
    exit $LASTEXITCODE
}

Ok "Affected Compare component tests passed"

Step "Re-running the semantic Compare regressions from the previous pass"

npx vitest run `
    "src/wingman2/lib/compareSpecEngine.topologyPurposeIntegrity.test.ts" `
    "src/wingman2/lib/compareSpecEngine.distributionRightSizing.test.ts" `
    "src/wingman2/lib/compareEligibilityEngine.distributionUndersize.test.ts" `
    "src/wingman2/lib/compareVerdictPipeline.fitPenaltyAuthority.test.ts" `
    "src/wingman2/lib/compareVerdictPipeline.runtimeAuthority.test.ts" `
    "src/wingman2/pages/ComparePageNew.semanticDistribution.test.tsx"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "A semantic Compare regression failed." -ForegroundColor Yellow
    Write-Host "Nothing was committed or pushed." -ForegroundColor Yellow
    exit $LASTEXITCODE
}

Ok "Semantic Compare regressions passed"

Step "Running product-data semantic gates"

npm run check:product-semantic-integrity
if ($LASTEXITCODE -ne 0) {
    Fail "Product semantic integrity gate failed."
}

npm run wm:check-routed-io
if ($LASTEXITCODE -ne 0) {
    Fail "Routed-I/O governance gate failed."
}

Ok "Product-data semantic gates passed"

Step "Running production build"

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Build failed. Nothing was committed or pushed." -ForegroundColor Yellow
    exit $LASTEXITCODE
}

Ok "Production build passed"

Step "Reviewing the remaining competitor-decision snapshot drift"

$reportDir = Join-Path $worktree "reports"
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
$snapshotLog = Join-Path $reportDir "competitor-decision-drift-after-topology-purpose-fix.txt"

$oldErrorPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
    & npx vitest run "src/wingman2/lib/competitorMatchDecisions.snapshot.test.ts" 2>&1 |
        Tee-Object -FilePath $snapshotLog
    $snapshotExit = $LASTEXITCODE
}
finally {
    $ErrorActionPreference = $oldErrorPreference
}

if ($snapshotExit -eq 0) {
    Ok "Golden competitor-decision snapshot matches the corrected engine"

    Step "Running full repository verification"
    npm run verify
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "Full verify found a different repository failure." -ForegroundColor Yellow
        Write-Host "Nothing was committed or pushed." -ForegroundColor Yellow
        exit $LASTEXITCODE
    }
    Ok "Full repository verification passed"
}
else {
    Write-Host ""
    Write-Host "Golden snapshot still differs from the corrected engine." -ForegroundColor Yellow
    Write-Host "It has NOT been rewritten." -ForegroundColor Yellow
    Write-Host ""

    $flipLines = @(
        Get-Content -LiteralPath $snapshotLog |
            Where-Object {
                $_ -match '^\s*-\s+.+:\s+(decisionType|wyrestormSku|topSkus)\s+flipped'
            } |
            Select-Object -Unique
    )

    if ($flipLines.Count -gt 0) {
        Write-Host "Remaining answer flips:" -ForegroundColor Cyan
        $flipLines | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
    }
    else {
        Warn "Could not extract concise flip lines; inspect the saved log."
    }

    Write-Host ""
    Write-Host "Snapshot review log:" -ForegroundColor Gray
    Write-Host "    $snapshotLog" -ForegroundColor Gray
    Write-Host ""
    Write-Host "This is a governance-review checkpoint, not a fixture/type failure." -ForegroundColor Yellow
}

Step "Checking diff hygiene"

git diff --check
if ($LASTEXITCODE -ne 0) {
    Fail "git diff --check failed."
}

Ok "git diff --check passed"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "SpecSheet fan-out fixture continuation complete" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "The new fields remain required in SpecSheet." -ForegroundColor Gray
Write-Host "Only stale test fixtures were updated:" -ForegroundColor Gray
Write-Host "  - matrix fixture: physicalOut=8, mirroredOut=0" -ForegroundColor Gray
Write-Host "  - AVoIP fixture: physicalOut=1, mirroredOut=0" -ForegroundColor Gray
Write-Host ""
Write-Host "No golden snapshot was rewritten automatically." -ForegroundColor Yellow
Write-Host "No commit or push was performed." -ForegroundColor Yellow
Write-Host "Backup: $backupRoot" -ForegroundColor Gray
Write-Host ""
git status --short
