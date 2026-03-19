# wingman-sidebar-tools-spacing.ps1
# Reduces sidebar button size and adds extra spacing around the Tools & Reference section.

param(
  [string]$Root = "C:\Users\steve\wingman"
)

$ErrorActionPreference = "Stop"

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  $dir = Split-Path $Path -Parent
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Backup-File {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$BackupRoot,
    [Parameter(Mandatory = $true)][string]$RootPath
  )

  $resolvedPath = [System.IO.Path]::GetFullPath($Path)
  $resolvedRoot = [System.IO.Path]::GetFullPath($RootPath)

  $relative = $resolvedPath.Substring($resolvedRoot.Length).TrimStart('\')
  $dest = Join-Path $BackupRoot $relative
  $destDir = Split-Path $dest -Parent

  if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  }

  Copy-Item $resolvedPath $dest -Force
}

function Find-FirstExistingFile {
  param(
    [Parameter(Mandatory = $true)][string[]]$Candidates
  )

  foreach ($candidate in $Candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  return $null
}

function Replace-OrAppendBlock {
  param(
    [Parameter(Mandatory = $true)][string]$Content,
    [Parameter(Mandatory = $true)][string]$StartMarker,
    [Parameter(Mandatory = $true)][string]$EndMarker,
    [Parameter(Mandatory = $true)][string]$NewBlock
  )

  $escapedStart = [regex]::Escape($StartMarker)
  $escapedEnd = [regex]::Escape($EndMarker)
  $pattern = "(?s)$escapedStart.*?$escapedEnd"

  if ([regex]::IsMatch($Content, $pattern)) {
    return [regex]::Replace($Content, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $NewBlock }, 1)
  }

  $separator = ""
  if ($Content.Length -gt 0 -and -not $Content.EndsWith("`r`n") -and -not $Content.EndsWith("`n")) {
    $separator = "`r`n"
  }

  return $Content + $separator + "`r`n" + $NewBlock + "`r`n"
}

$srcRoot = Join-Path $Root "src"
if (-not (Test-Path $srcRoot)) {
  throw "Source folder not found: $srcRoot"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $Root "_RESCUE\sidebar-tools-spacing-$stamp"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

Write-Host ""
Write-Host "== Wingman sidebar tools spacing patch ==" -ForegroundColor Cyan
Write-Host "Root      : $Root"
Write-Host "Backup    : $backupRoot"
Write-Host ""

$candidates = @(
  (Join-Path $Root "src\styles\sidebar.css"),
  (Join-Path $Root "src\styles\app-shell.css"),
  (Join-Path $Root "src\styles\appShell.css"),
  (Join-Path $Root "src\app\shell\AppShell.css"),
  (Join-Path $Root "src\components\layout\AppShell.css"),
  (Join-Path $Root "src\components\shell\AppShell.css"),
  (Join-Path $Root "src\styles\index.css"),
  (Join-Path $Root "src\index.css")
)

$cssPath = Find-FirstExistingFile -Candidates $candidates

if (-not $cssPath) {
  Write-Host "No known sidebar CSS file was found. Checked:" -ForegroundColor Yellow
  $candidates | ForEach-Object { Write-Host " - $_" }
  throw "Unable to continue without a target CSS file."
}

Backup-File -Path $cssPath -BackupRoot $backupRoot -RootPath $Root
$css = Get-Content $cssPath -Raw

$startMarker = "/* WINGMAN_SIDEBAR_TOOLS_TUNING_START */"
$endMarker   = "/* WINGMAN_SIDEBAR_TOOLS_TUNING_END */"

$newBlock = @"
$startMarker
/* Sidebar density reduction + extra breathing room for Tools & Reference */

.wm-sidebar-section[data-section="tools"],
.wm-sidebar-group[data-section="tools"],
.wm-sidebar-tools-section {
  margin-top: 14px;
  padding-top: 6px;
}

.wm-sidebar-section[data-section="tools"] .wm-sidebar-button,
.wm-sidebar-group[data-section="tools"] .wm-sidebar-button,
.wm-sidebar-tools-section .wm-sidebar-button,
.wm-sidebar .wm-sidebar-button {
  min-height: 36px;
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.2;
  gap: 10px;
}

.wm-sidebar-section[data-section="tools"] .wm-sidebar-button + .wm-sidebar-button,
.wm-sidebar-group[data-section="tools"] .wm-sidebar-button + .wm-sidebar-button,
.wm-sidebar-tools-section .wm-sidebar-button + .wm-sidebar-button {
  margin-top: 6px;
}

.wm-sidebar .wm-sidebar-button .wm-sidebar-icon,
.wm-sidebar .wm-sidebar-button .wm-nav-icon,
.wm-sidebar .wm-sidebar-button .wm-icon {
  width: 18px;
  height: 18px;
  min-width: 18px;
  min-height: 18px;
}

/* Slightly reduce overall sidebar card heaviness where buttons are used */
.wm-sidebar .wm-sidebar-button {
  box-sizing: border-box;
}
$endMarker
"@

$updatedCss = Replace-OrAppendBlock `
  -Content $css `
  -StartMarker $startMarker `
  -EndMarker $endMarker `
  -NewBlock $newBlock

if ($updatedCss -ne $css) {
  Save-Utf8NoBom -Path $cssPath -Content $updatedCss
  Write-Host "Updated CSS:" -ForegroundColor Green
  Write-Host " - $cssPath"
} else {
  Write-Host "No CSS changes were needed." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Patch complete." -ForegroundColor Green
Write-Host "Backup saved to:"
Write-Host " - $backupRoot"
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. npm run dev"
Write-Host "2. Check the left sidebar"
Write-Host "3. Confirm Tools & Reference now has more breathing room and slightly smaller buttons"