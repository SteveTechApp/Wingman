# wingman-sidebar-compact-buttons.ps1

param(
  [string]$Root = "C:\Users\steve\wingman"
)

$ErrorActionPreference = "Stop"

function Save-Utf8NoBom {
  param(
    [string]$Path,
    [string]$Content
  )
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Backup-File {
  param($Path, $BackupRoot, $RootPath)

  $rel = $Path.Substring($RootPath.Length).TrimStart('\')
  $dest = Join-Path $BackupRoot $rel
  $dir = Split-Path $dest -Parent

  if (!(Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  Copy-Item $Path $dest -Force
}

# Locate CSS
$candidates = @(
  "$Root\src\styles\sidebar.css",
  "$Root\src\styles\app-shell.css",
  "$Root\src\index.css"
)

$cssPath = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $cssPath) {
  throw "No sidebar CSS file found"
}

# Backup
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = "$Root\_RESCUE\sidebar-compact-$stamp"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

Backup-File -Path $cssPath -BackupRoot $backupRoot -RootPath $Root

# Read CSS
$css = Get-Content $cssPath -Raw

# New compact style block
$block = @"

/* WINGMAN_COMPACT_SIDEBAR_BUTTONS_START */

.wm-sidebar .wm-sidebar-button {
  display: flex;
  align-items: center;
  justify-content: center; /* center horizontally */
  gap: 8px;

  height: 28px;            /* ~50% reduction */
  padding: 4px 8px;

  font-size: 12px;
  border-radius: 8px;
}

/* Center text */
.wm-sidebar .wm-sidebar-button span,
.wm-sidebar .wm-sidebar-button .label {
  text-align: center;
  flex: none;
}

/* Reduce icon size */
.wm-sidebar .wm-sidebar-button .wm-icon,
.wm-sidebar .wm-sidebar-button svg {
  width: 14px;
  height: 14px;
}

/* Reduce vertical spacing between buttons */
.wm-sidebar .wm-sidebar-button + .wm-sidebar-button {
  margin-top: 4px;
}

/* WINGMAN_COMPACT_SIDEBAR_BUTTONS_END */

"@

# Append safely
if ($css -notmatch "WINGMAN_COMPACT_SIDEBAR_BUTTONS_START") {
  $css = $css + "`r`n" + $block
}

Save-Utf8NoBom -Path $cssPath -Content $css

Write-Host ""
Write-Host "Sidebar buttons reduced + centered"
Write-Host "Backup: $backupRoot"
Write-Host ""