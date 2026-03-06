[CmdletBinding()]
param(
  [switch]$Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Section([string]$text) {
  Write-Host "`n== $text ==" -ForegroundColor Cyan
}

function Ensure-Dir([string]$path) {
  if (-not (Test-Path $path)) {
    New-Item -ItemType Directory -Path $path -Force | Out-Null
  }
}

function Get-RepoRoot {
  $candidates = @(
    (Get-Location).Path,
    (Split-Path -Parent $PSCommandPath)
  ) | Where-Object { $_ }

  foreach ($start in $candidates | Select-Object -Unique) {
    $dir = Get-Item $start
    while ($dir) {
      $src = Join-Path $dir.FullName "src"
      $pkg = Join-Path $dir.FullName "package.json"
      if ((Test-Path $src) -and (Test-Path $pkg)) {
        return $dir.FullName
      }
      $dir = $dir.Parent
    }
  }

  throw "Could not locate repo root. Run this from inside the wingman repo."
}

function New-RelativeParentDir([string]$root, [string]$baseDir, [string]$fullPath) {
  $relative = $fullPath.Substring($root.Length).TrimStart('\','/')
  $parentRel = Split-Path $relative -Parent
  if ([string]::IsNullOrWhiteSpace($parentRel)) { return $baseDir }
  $targetParent = Join-Path $baseDir $parentRel
  Ensure-Dir $targetParent
  return $targetParent
}

function Copy-ItemSafe([string]$source, [string]$dest) {
  $destParent = Split-Path $dest -Parent
  Ensure-Dir $destParent
  Copy-Item -LiteralPath $source -Destination $dest -Force -Recurse
}

function Move-ToArchive([string]$repoRoot, [string]$path, [string]$archiveRoot, [System.Collections.Generic.List[object]]$log) {
  if (-not (Test-Path -LiteralPath $path)) { return }

  $item = Get-Item -LiteralPath $path -Force
  $relative = $item.FullName.Substring($repoRoot.Length).TrimStart('\','/')
  $archiveDest = Join-Path $archiveRoot $relative
  $archiveParent = Split-Path $archiveDest -Parent
  Ensure-Dir $archiveParent

  $log.Add([pscustomobject]@{
    Action       = "Archive"
    Type         = if ($item.PSIsContainer) { "Directory" } else { "File" }
    Source       = $item.FullName
    Destination  = $archiveDest
    ExistsBefore = $true
  })

  if ($Apply) {
    Move-Item -LiteralPath $item.FullName -Destination $archiveDest -Force
  }
}

$repo = Get-RepoRoot
Set-Location $repo

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$rescueRoot  = Join-Path $repo "_RESCUE\RepoStructureCleanup_Phase1_$stamp"
$archiveRoot = Join-Path $repo "_ARCHIVE\RepoStructureCleanup_Phase1_$stamp"
$reportRoot  = Join-Path $repo "_AUDITS\RepoStructureCleanup_Phase1_$stamp"

Ensure-Dir $rescueRoot
Ensure-Dir $archiveRoot
Ensure-Dir $reportRoot

Write-Section "Wingman Repo Cleanup Phase 1"
Write-Host "Repo     : $repo"
Write-Host "Mode     : " -NoNewline
if ($Apply) { Write-Host "APPLY" -ForegroundColor Yellow } else { Write-Host "DRY RUN" -ForegroundColor Yellow }
Write-Host "Rescue   : $rescueRoot"
Write-Host "Archive  : $archiveRoot"
Write-Host "Reports  : $reportRoot"

$targets = @(
  "src\_legacy",
  "src\app\shell\PublicShell.legacy.tsx",
  "src\layout\PublicShell.tsx",
  "src\components\nav\SideNav.tsx",
  "src\components\layout\Header.tsx",
  "src\components\layout\Footer.tsx",
  "src\components\layout\PageShell.tsx",
  "src\components\layout\Logo.tsx",
  "src\components\layout\MobileNavMenu.tsx",
  "src\components\layout\NavDropdown.tsx"
) | ForEach-Object { Join-Path $repo $_ }

$existingTargets = $targets | Where-Object { Test-Path -LiteralPath $_ }

Write-Section "Targets Found"
if (-not $existingTargets) {
  Write-Host "No Phase 1 targets were found."
} else {
  $existingTargets | ForEach-Object { Write-Host $_ }
}

# Rescue backup first
Write-Section "Creating Rescue Backup"
$rescueLog = New-Object 'System.Collections.Generic.List[object]'
foreach ($path in $existingTargets) {
  $item = Get-Item -LiteralPath $path -Force
  $relative = $item.FullName.Substring($repo.Length).TrimStart('\','/')
  $dest = Join-Path $rescueRoot $relative
  Copy-ItemSafe -source $item.FullName -dest $dest

  $rescueLog.Add([pscustomobject]@{
    Type        = if ($item.PSIsContainer) { "Directory" } else { "File" }
    Source      = $item.FullName
    RescueCopy  = $dest
  })
}
$rescueLog | Export-Csv (Join-Path $reportRoot "rescue-backup-log.csv") -NoTypeInformation -Encoding UTF8

# Archive move plan / execution
Write-Section "Archiving Phase 1 Targets"
$archiveLog = New-Object 'System.Collections.Generic.List[object]'
foreach ($path in $existingTargets) {
  Move-ToArchive -repoRoot $repo -path $path -archiveRoot $archiveRoot -log $archiveLog
}
$archiveLog | Export-Csv (Join-Path $reportRoot "archive-actions.csv") -NoTypeInformation -Encoding UTF8

# Post-check
Write-Section "Post Check"
$postCheck = foreach ($path in $targets) {
  [pscustomobject]@{
    Path         = $path
    ExistsNow    = Test-Path -LiteralPath $path
    WasTargeted  = $path -in $existingTargets
  }
}
$postCheck | Export-Csv (Join-Path $reportRoot "post-check.csv") -NoTypeInformation -Encoding UTF8
$postCheck | Format-Table -AutoSize

# Summary
$summary = [pscustomobject]@{
  Repo               = $repo
  Timestamp          = $stamp
  Mode               = if ($Apply) { "APPLY" } else { "DRY RUN" }
  TargetsRequested   = $targets.Count
  TargetsFound       = $existingTargets.Count
  RescueRoot         = $rescueRoot
  ArchiveRoot        = $archiveRoot
  ReportRoot         = $reportRoot
}
$summary | Format-List | Out-File (Join-Path $reportRoot "SUMMARY.txt") -Encoding UTF8
$summary | Format-List

Write-Section "Next Recommended Commands"
Write-Host "npm run typecheck"
Write-Host "npm run dev"
Write-Host "git status --short"