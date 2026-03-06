[CmdletBinding()]
param(
  [switch]$Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Get-RepoRoot {
  $dir = Get-Location
  while ($dir) {
    if ((Test-Path (Join-Path $dir.FullName "src")) -and (Test-Path (Join-Path $dir.FullName "package.json"))) {
      return $dir.FullName
    }
    $dir = $dir.Parent
  }
  throw "Could not locate repo root."
}

function Get-LatestFolder([string]$Parent, [string]$Prefix) {
  if (-not (Test-Path -LiteralPath $Parent)) { return $null }
  Get-ChildItem -LiteralPath $Parent -Directory |
    Where-Object { $_.Name -like "$Prefix*" } |
    Sort-Object Name -Descending |
    Select-Object -First 1
}

$repo = Get-RepoRoot
Set-Location $repo

$latestRescue  = Get-LatestFolder -Parent (Join-Path $repo "_RESCUE")  -Prefix "RepoStructureCleanup_Phase1_"
$latestArchive = Get-LatestFolder -Parent (Join-Path $repo "_ARCHIVE") -Prefix "RepoStructureCleanup_Phase1_"

if (-not $latestRescue -and -not $latestArchive) {
  throw "No Phase 1 rescue/archive folder found."
}

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$reportDir = Join-Path $repo "_AUDITS\RepoStructureCleanup_Phase1_Restore_$stamp"
Ensure-Dir $reportDir

$restoreList = @(
  "src\components\layout\Header.tsx",
  "src\components\layout\Footer.tsx",
  "src\components\layout\Logo.tsx",
  "src\components\layout\PageShell.tsx",
  "src\components\layout\MobileNavMenu.tsx",
  "src\components\layout\NavDropdown.tsx"
)

Write-Host "`n== Phase 1 compatibility restore ==" -ForegroundColor Cyan
Write-Host "Repo          : $repo"
Write-Host "Mode          : " -NoNewline
if ($Apply) { Write-Host "APPLY" -ForegroundColor Yellow } else { Write-Host "DRY RUN" -ForegroundColor Yellow }
Write-Host "Latest rescue : $($latestRescue.FullName)"
if ($latestArchive) { Write-Host "Latest archive: $($latestArchive.FullName)" }
Write-Host "Report dir    : $reportDir"

$log = foreach ($rel in $restoreList) {
  $dest = Join-Path $repo $rel

  $candidateSources = @()
  if ($latestRescue)  { $candidateSources += (Join-Path $latestRescue.FullName  $rel) }
  if ($latestArchive) { $candidateSources += (Join-Path $latestArchive.FullName $rel) }

  $source = $candidateSources | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

  [pscustomobject]@{
    RelativePath = $rel
    ExistsNow    = Test-Path -LiteralPath $dest
    SourceFound  = [bool]$source
    SourcePath   = $source
    Destination  = $dest
    Action       = if ((-not (Test-Path -LiteralPath $dest)) -and $source) { "Restore" } elseif ((Test-Path -LiteralPath $dest)) { "SkipAlreadyExists" } else { "MissingSource" }
  }
}

$log | Export-Csv (Join-Path $reportDir "restore-plan.csv") -NoTypeInformation -Encoding UTF8
$log | Format-Table RelativePath, ExistsNow, SourceFound, Action -AutoSize

if ($Apply) {
  foreach ($row in $log | Where-Object { $_.Action -eq "Restore" }) {
    $parent = Split-Path $row.Destination -Parent
    Ensure-Dir $parent
    Copy-Item -LiteralPath $row.SourcePath -Destination $row.Destination -Force
    Write-Host "Restored: $($row.RelativePath)" -ForegroundColor Green
  }
}

"`nRestore report: $reportDir" | Tee-Object -FilePath (Join-Path $reportDir "SUMMARY.txt")