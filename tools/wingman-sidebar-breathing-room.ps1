# tools\wingman-sidebar-breathing-room.ps1

param(
  [string]$Root = "C:\Users\steve\wingman"
)

$ErrorActionPreference = "Stop"

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )
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
    return [regex]::Replace(
      $Content,
      $pattern,
      [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $NewBlock },
      1
    )
  }

  $sep = ""
  if ($Content.Length -gt 0 -and -not $Content.EndsWith("`r`n") -and -not $Content.EndsWith("`n")) {
    $sep = "`r`n"
  }

  return $Content + $sep + "`r`n" + $NewBlock + "`r`n"
}

$cssPath = Join-Path $Root "src\styles\wm-consistency-pass.css"
if (-not (Test-Path $cssPath)) {
  throw "CSS file not found: $cssPath"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $Root "_RESCUE\sidebar-breathing-room-$stamp"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
Backup-File -Path $cssPath -BackupRoot $backupRoot -RootPath $Root

$css = Get-Content $cssPath -Raw

$startMarker = "/* WINGMAN_SIDEBAR_BREATHING_ROOM_START */"
$endMarker   = "/* WINGMAN_SIDEBAR_BREATHING_ROOM_END */"

$block = @"
$startMarker

/* More space between main sidebar sections */
.wm-nav__sections {
  gap: 18px;
}

/* Slightly more space between section title and items */
.wm-nav__section {
  gap: 10px;
}

/* Center button stack within each section */
.wm-nav__list,
.wm-nav__links,
.wm-nav__items {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

/* Keep existing button width, just center each button */
.wm-nav:not(.is-collapsed) .wm-nav__item {
  width: 152px;
  max-width: 152px;
  margin-left: auto;
  margin-right: auto;
}

$endMarker
"@

$updated = Replace-OrAppendBlock `
  -Content $css `
  -StartMarker $startMarker `
  -EndMarker $endMarker `
  -NewBlock $block

Save-Utf8NoBom -Path $cssPath -Content $updated

Write-Host ""
Write-Host "Sidebar spacing updated." -ForegroundColor Green
Write-Host "Updated:"
Write-Host " - $cssPath"
Write-Host "Backup:"
Write-Host " - $backupRoot"
Write-Host ""
Write-Host "Run:"
Write-Host "npm run typecheck"