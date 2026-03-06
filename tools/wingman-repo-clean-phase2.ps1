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

function Copy-Safe([string]$Source, [string]$Dest) {
  Ensure-Dir (Split-Path $Dest -Parent)
  Copy-Item -LiteralPath $Source -Destination $Dest -Force
}

$repo = Get-RepoRoot
Set-Location $repo

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$rescueRoot  = Join-Path $repo "_RESCUE\RepoStructureCleanup_Phase2_$stamp"
$archiveRoot = Join-Path $repo "_ARCHIVE\RepoStructureCleanup_Phase2_$stamp"
$reportRoot  = Join-Path $repo "_AUDITS\RepoStructureCleanup_Phase2_$stamp"

Ensure-Dir $rescueRoot
Ensure-Dir $archiveRoot
Ensure-Dir $reportRoot

$targets = @(
  "src\pages\tools\CompetitorComparePage.tsx",
  "src\pages\tools\ProposalBuilderPage.tsx",
  "src\pages\tools\RoomWizardPage.tsx",
  "src\pages\WelcomeScreen.tsx",
  "src\features\misc\WelcomeScreen.tsx",
  "src\pages\Landing.tsx",
  "src\pages\public\PublicLandingPage.tsx",
  "src\app\shell\PublicShell.legacy.tsx",
  "src\layout\PublicShell.tsx"
) | ForEach-Object { Join-Path $repo $_ }

$existing = $targets | Where-Object { Test-Path -LiteralPath $_ }

Write-Host "`n== Wingman Repo Cleanup Phase 2 ==" -ForegroundColor Cyan
Write-Host "Repo    : $repo"
Write-Host "Mode    : " -NoNewline
if ($Apply) { Write-Host "APPLY" -ForegroundColor Yellow } else { Write-Host "DRY RUN" -ForegroundColor Yellow }
Write-Host "Rescue  : $rescueRoot"
Write-Host "Archive : $archiveRoot"
Write-Host "Reports : $reportRoot"

Write-Host "`nTargets found:" -ForegroundColor Cyan
if (-not $existing) {
  Write-Host "None"
} else {
  $existing | ForEach-Object { Write-Host $_ }
}

$log = New-Object 'System.Collections.Generic.List[object]'

foreach ($path in $existing) {
  $relative = $path.Substring($repo.Length).TrimStart('\','/')
  $rescueDest = Join-Path $rescueRoot $relative
  $archiveDest = Join-Path $archiveRoot $relative

  $log.Add([pscustomobject]@{
    RelativePath = $relative
    RescueCopy   = $rescueDest
    ArchiveDest  = $archiveDest
    Action       = if ($Apply) { "Archived" } else { "WouldArchive" }
  })

  if ($Apply) {
    Copy-Safe -Source $path -Dest $rescueDest
    Ensure-Dir (Split-Path $archiveDest -Parent)
    Move-Item -LiteralPath $path -Destination $archiveDest -Force
  }
}

$log | Export-Csv (Join-Path $reportRoot "phase2-actions.csv") -NoTypeInformation -Encoding UTF8
$log | Format-Table -AutoSize

$summary = [pscustomobject]@{
  Repo         = $repo
  Timestamp    = $stamp
  Mode         = if ($Apply) { "APPLY" } else { "DRY RUN" }
  TargetsFound = $existing.Count
  RescueRoot   = $rescueRoot
  ArchiveRoot  = $archiveRoot
  ReportRoot   = $reportRoot
}

$summary | Format-List | Tee-Object -FilePath (Join-Path $reportRoot "SUMMARY.txt")

Write-Host "`nNext:" -ForegroundColor Cyan
Write-Host "npm run typecheck"
Write-Host "npm run dev"
Write-Host "git status --short"