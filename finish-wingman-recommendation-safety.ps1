[CmdletBinding()]
param(
    [string]$RepoRoot = (Get-Location).Path,
    [switch]$Apply,
    [switch]$RunTests,
    [switch]$Build,
    [switch]$Commit
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Phase {
    param([string]$Text)
    Write-Host ""
    Write-Host ("=" * 72) -ForegroundColor DarkCyan
    Write-Host $Text -ForegroundColor Cyan
    Write-Host ("=" * 72) -ForegroundColor DarkCyan
}

function Stop-Work {
    param([string]$Text)
    throw $Text
}

function Read-Utf8 {
    param([string]$Path)
    return [System.IO.File]::ReadAllText($Path, [System.Text.UTF8Encoding]::new($false))
}

function Write-Utf8 {
    param(
        [string]$Path,
        [string]$Text
    )
    [System.IO.File]::WriteAllText($Path, $Text, [System.Text.UTF8Encoding]::new($false))
}

function Resolve-RequiredFile {
    param([string]$RelativePath)
    $path = Join-Path $RepoRoot $RelativePath
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        Stop-Work "Required file was not found: $RelativePath"
    }
    return $path
}

function Assert-Contains {
    param(
        [string]$Text,
        [string]$Needle,
        [string]$Description
    )
    if ($Text.IndexOf($Needle, [System.StringComparison]::Ordinal) -lt 0) {
        Stop-Work "Anchor check failed: $Description. No files were written."
    }
}

function Replace-Required {
    param(
        [string]$Text,
        [string]$Pattern,
        [string]$Replacement,
        [string]$Description
    )
    $regex = [System.Text.RegularExpressions.Regex]::new(
        $Pattern,
        [System.Text.RegularExpressions.RegexOptions]::Singleline
    )
    $result = $regex.Replace($Text, $Replacement, 1)
    if ($result -eq $Text) {
        Stop-Work "Anchor check failed: $Description. No files were written."
    }
    return $result
}

function Backup-File {
    param([string]$Path)
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backup = "$Path.$stamp.bak"
    Copy-Item -LiteralPath $Path -Destination $backup -Force
    Write-Host "BACKUP $backup" -ForegroundColor DarkGray
}

function Invoke-Checked {
    param(
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$Description
    )
    Write-Host "RUN    $Description" -ForegroundColor Yellow
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        Stop-Work "Command failed with exit code $LASTEXITCODE`: $Description"
    }
}

Write-Phase "Wingman recommendation safety completion"

$RepoRoot = [System.IO.Path]::GetFullPath($RepoRoot)
if (-not (Test-Path -LiteralPath $RepoRoot -PathType Container)) {
    Stop-Work "Repository root was not found: $RepoRoot"
}

$boundaryPath = Resolve-RequiredFile "src/wingman2/lib/recommendationsDecisionBoundary.ts"
$gatePath = Resolve-RequiredFile "src/wingman2/lib/recommendationSafetyGate.ts"
$testPath = Resolve-RequiredFile "src/wingman2/lib/recommendationSafetyGate.test.ts"

$boundaryText = Read-Utf8 $boundaryPath
$gateText = Read-Utf8 $gatePath
$testText = Read-Utf8 $testPath

Assert-Contains $boundaryText "filterSafeRecommendationCandidates" "decision-boundary safety gate"
Assert-Contains $boundaryText "buildRecommendationSafetyContext(brief)" "brief context handoff"
Assert-Contains $gateText "export function filterSafeRecommendationCandidates" "safety filter export"
Assert-Contains $gateText "function recordOf" "record normalisation helper"
Assert-Contains $gateText "productSku?: unknown;" "candidate product type"
Assert-Contains $testText 'describe("recommendation safety"' "safety test suite"

$newGateText = $gateText

if ($newGateText.IndexOf("  product?: unknown;", [System.StringComparison]::Ordinal) -lt 0) {
    $newGateText = $newGateText.Replace(
        "  productSku?: unknown;",
        "  productSku?: unknown;`r`n  product?: unknown;"
    )
}

if ($newGateText.IndexOf("function candidateProduct", [System.StringComparison]::Ordinal) -lt 0) {
    $newGateText = Replace-Required `
        $newGateText `
        'function candidateSku\(candidate: RecommendationSafetyCandidate\): string \{.*?\r?\n\}' `
        "function candidateProduct(candidate: RecommendationSafetyCandidate): Record<string, unknown> {`r`n  return recordOf(candidate.product);`r`n}`r`n`r`nfunction candidateSku(candidate: RecommendationSafetyCandidate): string {`r`n  const product = candidateProduct(candidate);`r`n  return normalise(candidate.sku ?? candidate.productSku ?? product.sku ?? product.productSku);`r`n}" `
        "nested product SKU resolver"
}

if ($newGateText.IndexOf("product.roleContract", [System.StringComparison]::Ordinal) -lt 0) {
    $newGateText = Replace-Required `
        $newGateText `
        'function candidateRole\(candidate: RecommendationSafetyCandidate\): string \{.*?\r?\n\}' `
        "function candidateRole(candidate: RecommendationSafetyCandidate): string {`r`n  const product = candidateProduct(candidate);`r`n  return normalise(candidate.roleContract ?? candidate.role ?? product.roleContract ?? product.role);`r`n}" `
        "nested product role resolver"
}

if ($newGateText.IndexOf("product.pairedWith", [System.StringComparison]::Ordinal) -lt 0) {
    $newGateText = Replace-Required `
        $newGateText `
        'function candidatePairs\(candidate: RecommendationSafetyCandidate\): Set<string> \{\s*const raw = candidate\.pairedWith;' `
        "function candidatePairs(candidate: RecommendationSafetyCandidate): Set<string> {`r`n  const product = candidateProduct(candidate);`r`n  const raw = candidate.pairedWith ?? product.pairedWith;" `
        "nested product pairing resolver"
}

if ($newGateText.IndexOf("product.compatibility", [System.StringComparison]::Ordinal) -lt 0) {
    $newGateText = Replace-Required `
        $newGateText `
        'function compatibilityEvidence\(candidate: RecommendationSafetyCandidate, context: RecommendationSafetyContext\): boolean \{\s*const compatibility = candidate\.compatibility;' `
        "function compatibilityEvidence(candidate: RecommendationSafetyCandidate, context: RecommendationSafetyContext): boolean {`r`n  const product = candidateProduct(candidate);`r`n  const compatibility = candidate.compatibility ?? product.compatibility;" `
        "nested product compatibility resolver"
}

$newTestText = $testText
$nestedTestMarker = "reads SKU and compatibility from a RecommendationDecision product"
if ($newTestText.IndexOf($nestedTestMarker, [System.StringComparison]::Ordinal) -lt 0) {
    $nestedTest = @'

  it("reads SKU and compatibility from a RecommendationDecision product", () => {
    const decision = {
      product: {
        sku: "RX3-100",
        role: "receiver",
        pairedWith: ["SW-120-TX3"],
        compatibility: {
          hdBaseTGeneration: "HDBaseT-3.0",
          resolutionCompatible: true,
          usbCompatible: true,
          distanceCompatible: true,
        },
      },
    };
    expect(filterSafeRecommendationCandidates([decision])).toHaveLength(1);
  });
'@
    $lastClose = $newTestText.LastIndexOf("});", [System.StringComparison]::Ordinal)
    if ($lastClose -lt 0) {
        Stop-Work "Could not identify the end of the safety test suite. No files were written."
    }
    $newTestText = $newTestText.Insert($lastClose, $nestedTest)
}

$forbidden = -join @([char]0x65, [char]0x6c, [char]0x73, [char]0x65)
$scriptText = Read-Utf8 $PSCommandPath
if ($scriptText.IndexOf($forbidden, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
    Stop-Work "The script contains a forbidden branch keyword."
}

if (-not $Apply) {
    Write-Host "DRY RUN - no files have been changed." -ForegroundColor Green
    Write-Host "Planned files:" -ForegroundColor White
    Write-Host "  $gatePath"
    Write-Host "  $testPath"
    Write-Host "No unrelated files will be touched." -ForegroundColor Green
    return
}

Write-Phase "1. Backing up targeted files"
Backup-File $gatePath
Backup-File $testPath

Write-Phase "2. Applying nested RecommendationDecision support"
Write-Utf8 $gatePath $newGateText
Write-Utf8 $testPath $newTestText

Write-Phase "3. Structural validation"
$writtenGate = Read-Utf8 $gatePath
$writtenTest = Read-Utf8 $testPath
Assert-Contains $writtenGate "function candidateProduct" "nested product normalisation"
Assert-Contains $writtenGate "product.sku" "nested product SKU"
Assert-Contains $writtenGate "product.compatibility" "nested product compatibility"
Assert-Contains $writtenTest $nestedTestMarker "nested decision regression test"

if ($RunTests -or $Build) {
    Push-Location $RepoRoot
    try {
        $npm = Get-Command npm -ErrorAction Stop
        if ($RunTests) {
            Invoke-Checked $npm.Source @("run", "test", "--", "--run", "src/wingman2/lib/recommendationSafetyGate.test.ts") "recommendation safety tests"
        }
        if ($Build) {
            Invoke-Checked $npm.Source @("run", "build") "production build"
        }
    }
    finally {
        Pop-Location
    }
}

if ($Commit) {
    Push-Location $RepoRoot
    try {
        $git = Get-Command git -ErrorAction Stop
        Invoke-Checked $git.Source @("diff", "--check") "git whitespace check"
        Invoke-Checked $git.Source @("add", "src/wingman2/lib/recommendationSafetyGate.ts", "src/wingman2/lib/recommendationSafetyGate.test.ts") "stage safety files"
        Invoke-Checked $git.Source @("commit", "-m", "Read nested recommendation decision products safely") "commit safety repair"
    }
    finally {
        Pop-Location
    }
}

Write-Host ""
Write-Host "Recommendation safety completion finished." -ForegroundColor Green
