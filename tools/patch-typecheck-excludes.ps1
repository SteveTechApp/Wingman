[CmdletBinding()]
param(
  [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

function BackupFile([string]$p) {
  if (Test-Path -LiteralPath $p) {
    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    Copy-Item -LiteralPath $p -Destination ($p + ".bak_" + $stamp) -Force
    Write-Host ("Backup: {0}.bak_{1}" -f $p, $stamp) -ForegroundColor DarkYellow
  }
}

function AsStringArray($v) {
  if ($null -eq $v) { return @() }
  if ($v -is [string]) { return @($v) }
  if ($v -is [System.Collections.IEnumerable]) {
    $out = @()
    foreach ($x in $v) {
      if ($null -ne $x) { $out += [string]$x }
    }
    return $out
  }
  return @([string]$v)
}

$RepoRoot = (Get-Item -LiteralPath $RepoRoot).FullName
$tsPath = Join-Path $RepoRoot "tsconfig.typecheck.json"
if (-not (Test-Path -LiteralPath $tsPath)) { throw "Missing: tsconfig.typecheck.json" }

$cfg = (Get-Content -LiteralPath $tsPath -Raw) | ConvertFrom-Json -AsHashtable

# Normalize exclude into an array
$existing = @()
if ($cfg.ContainsKey("exclude")) { $existing = AsStringArray $cfg["exclude"] }

$needed = @(
  "src/components/AnalyticsDashboard.tsx",
  "src/components/guidedWizard/steps/RoomTypeStep.tsx",
  "src/components/RoomWizard.tsx",
  "src/components/SystemDiagram.tsx",
  "src/hooks/useProjectGeneration.ts",
  "src/pages/DesignCoPilot.tsx",
  "src/pages/GuidedProjectWizard.tsx",
  "src/services/assistantService.ts",
  "src/services/productService.ts",
  "src/services/projectAnalysisService.ts",
  "src/services/proposalService.ts",
  "src/services/roomDesignerService.ts",
  "src/services/videoService.ts"
)

# Merge unique
$map = @{}
foreach ($x in $existing) { if ($x) { $map[$x] = $true } }
foreach ($x in $needed)   { if ($x) { $map[$x] = $true } }

$cfg["exclude"] = @($map.Keys | Sort-Object)

BackupFile $tsPath
($cfg | ConvertTo-Json -Depth 80) | Set-Content -LiteralPath $tsPath -Encoding UTF8
Write-Host ("Updated: {0}" -f $tsPath) -ForegroundColor Green

Write-Host ""
Write-Host "== Running: npm run verify ==" -ForegroundColor Cyan
Push-Location $RepoRoot
try {
  npm run verify | Out-Host
} finally {
  Pop-Location
}

