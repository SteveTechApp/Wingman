param(
  [switch]$Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location C:\Users\steve\wingman

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Force -Path $Path | Out-Null
  }
}

function Read-Text([string]$Path) {
  [System.IO.File]::ReadAllText($Path)
}

function Write-Text([string]$Path, [string]$Content) {
  $enc = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText($Path, $Content, $enc)
}

function Get-LatestDir([string]$Parent, [string]$Pattern) {
  if (-not (Test-Path $Parent)) { return $null }
  Get-ChildItem $Parent -Directory |
    Where-Object { $_.Name -like $Pattern } |
    Sort-Object Name -Descending |
    Select-Object -First 1
}

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$rescue = "_RESCUE\LayoutRealRestore_$stamp"
$report = "_AUDITS\LayoutRealRestore_$stamp"

Ensure-Dir $rescue
Ensure-Dir $report

Write-Host "`n== Restore real layout files ==" -ForegroundColor Cyan
Write-Host "Mode:" ($Apply ? "APPLY" : "DRY RUN")
Write-Host "Rescue: $rescue"
Write-Host "Report: $report"

$latestArchive = Get-LatestDir ".\_ARCHIVE" "RepoStructureCleanup_Phase1_*"
$latestPromote = Get-LatestDir ".\_RESCUE" "LayoutPromote_*"
$latestPhase1B = Get-LatestDir ".\_RESCUE" "RepoStructureCleanup_Phase1B_*"

$files = @(
  "MobileNavMenu.tsx",
  "NavDropdown.tsx",
  "PageShell.tsx"
)

$log = New-Object System.Collections.Generic.List[object]

foreach($name in $files) {
  $target = "src\app\layout\$name"

  $candidates = @()

  if ($latestArchive) {
    $candidates += (Join-Path $latestArchive.FullName "src\components\layout\$name")
  }
  if ($latestPromote) {
    $candidates += (Join-Path $latestPromote.FullName "$name.components.bak")
  }
  if ($latestPhase1B) {
    $candidates += (Join-Path $latestPhase1B.FullName "src\components\layout\$name")
  }

  $source = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1

  $log.Add([pscustomobject]@{
    File = $name
    Source = $source
    Target = $target
    Action = if ($source) { "RestoreRealImplementationToAppLayout" } else { "SourceNotFound" }
  })

  if ($Apply -and $source) {
    Ensure-Dir (Split-Path $target -Parent)
    if (Test-Path $target) {
      Copy-Item $target (Join-Path $rescue "$name.app.before.bak") -Force
    }
    Copy-Item $source $target -Force
    Write-Host "Restored real implementation to $target" -ForegroundColor Green
  }
}

# recreate compatibility wrappers in components/layout
$wrapperFiles = @(
  "MobileNavMenu.tsx",
  "NavDropdown.tsx",
  "PageShell.tsx"
)

foreach($name in $wrapperFiles) {
  $wrapperPath = "src\components\layout\$name"
  $moduleName = [System.IO.Path]::GetFileNameWithoutExtension($name)

  $content = @"
export * from "@/app/layout/$moduleName";
export { default } from "@/app/layout/$moduleName";
"@

  $log.Add([pscustomobject]@{
    File = $name
    Source = "-"
    Target = $wrapperPath
    Action = "CreateCompatibilityWrapper"
  })

  if ($Apply) {
    Ensure-Dir (Split-Path $wrapperPath -Parent)
    if (Test-Path $wrapperPath) {
      Copy-Item $wrapperPath (Join-Path $rescue "$name.components.before.bak") -Force
    }
    Write-Text $wrapperPath $content
    Write-Host "Created wrapper $wrapperPath" -ForegroundColor Green
  }
}

$log | Export-Csv (Join-Path $report "restore-log.csv") -NoTypeInformation -Encoding UTF8
$log | Format-Table -AutoSize

Write-Host "`nNext:" -ForegroundColor Cyan
Write-Host "npm run typecheck"
Write-Host "git status --short"