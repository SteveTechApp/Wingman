param(
    [string]$Root = ".",
    [switch]$WhatIfOnly
)

$ErrorActionPreference = "Stop"

function Write-Section($Text) {
    Write-Host ""
    Write-Host ("=" * 72) -ForegroundColor DarkCyan
    Write-Host $Text -ForegroundColor Cyan
    Write-Host ("=" * 72) -ForegroundColor DarkCyan
}

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
        [Parameter(Mandatory = $true)][string]$BackupRoot
    )

    if (-not (Test-Path $Path)) {
        return
    }

    $relative = Resolve-Path -Relative $Path
    $safeRelative = $relative.TrimStart(".\")
    $dest = Join-Path $BackupRoot $safeRelative
    $destDir = Split-Path $dest -Parent

    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    }

    Copy-Item -LiteralPath $Path -Destination $dest -Force
}

function Replace-FileContent {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Content,
        [Parameter(Mandatory = $true)][string]$BackupRoot
    )

    if ($WhatIfOnly) {
        Write-Host "[WhatIf] Would rewrite $Path" -ForegroundColor Yellow
        return
    }

    Backup-File -Path $Path -BackupRoot $BackupRoot
    Save-Utf8NoBom -Path $Path -Content $Content
    Write-Host "Updated: $Path" -ForegroundColor Green
}

function Comment-OutImports {
    param(
        [Parameter(Mandatory = $true)][string]$MainPath,
        [Parameter(Mandatory = $true)][string[]]$ImportsToDisable,
        [Parameter(Mandatory = $true)][string]$BackupRoot
    )

    if (-not (Test-Path $MainPath)) {
        Write-Host "Skipping import cleanup; file not found: $MainPath" -ForegroundColor Yellow
        return
    }

    $text = Get-Content -LiteralPath $MainPath -Raw
    $original = $text

    foreach ($importPath in $ImportsToDisable) {
        $pattern = '^\s*import\s+["'']' + [regex]::Escape($importPath) + '["''];\s*$'
        $text = [regex]::Replace(
            $text,
            $pattern,
            ('// disabled by Refactor-WingmanLayout.ps1: import "' + $importPath + '";'),
            [System.Text.RegularExpressions.RegexOptions]::Multiline
        )
    }

    if ($text -ne $original) {
        if ($WhatIfOnly) {
            Write-Host "[WhatIf] Would update imports in $MainPath" -ForegroundColor Yellow
            return
        }

        Backup-File -Path $MainPath -BackupRoot $BackupRoot
        Save-Utf8NoBom -Path $MainPath -Content $text
        Write-Host "Updated imports in: $MainPath" -ForegroundColor Green
    }
    else {
        Write-Host "No matching imports to disable in: $MainPath" -ForegroundColor DarkGray
    }
}

$rootPath = Resolve-Path $Root
Set-Location $rootPath

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $rootPath "_LAYOUT_REFACTOR_BACKUP\$timestamp"

if (-not $WhatIfOnly) {
    New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
}

Write-Section "Wingman layout refactor"
Write-Host "Root: $rootPath" -ForegroundColor Gray
if (-not $WhatIfOnly) {
    Write-Host "Backup: $backupRoot" -ForegroundColor Gray
}

$mainPath = Join-Path $rootPath "src\main.tsx"
$referenceShellCssPath = Join-Path $rootPath "src\styles\wm-reference-shell.css"
$architectureCanvasCssPath = Join-Path $rootPath "src\styles\wm-architecture-canvas.css"
$schematicCssPath = Join-Path $rootPath "src\styles\wm-schematic-layout.css"
$fullWidthCssPath = Join-Path $rootPath "src\styles\wm-fullwidth-override.css"
$shellFixCssPath = Join-Path $rootPath "src\styles\wm-shell-fix.css"

Write-Section "1. Disable conflicting CSS imports in src/main.tsx"
Comment-OutImports -MainPath $mainPath -ImportsToDisable @(
    "./styles/wm-schematic-layout.css",
    "./styles/wm-fullwidth-override.css",
    "./styles/wm-shell-fix.css"
) -BackupRoot $backupRoot

Write-Section "2. Rewrite wm-reference-shell.css as the single shell layout source"

$referenceShellCss = @'
:root {
  --wm-ref-topbar-h: 78px;
  --wm-ref-sidebar-w: 294px;
  --wm-ref-bg: #0a1019;
  --wm-ref-bg-alt: #101720;
  --wm-ref-panel: #141c27;
  --wm-ref-line: rgba(176, 196, 220, 0.12);
  --wm-ref-text: #eef3fb;
  --wm-ref-text-soft: rgba(233, 240, 249, 0.78);
  --wm-ref-text-muted: rgba(202, 214, 229, 0.56);
}

.wm-reference-shell {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  color: var(--wm-ref-text);
  background:
    radial-gradient(circle at top, rgba(60, 95, 145, 0.08), transparent 28%),
    linear-gradient(180deg, #0d131b 0%, #111821 100%);
}

.wm-reference-shell__body {
  display: grid;
  grid-template-columns: var(--wm-ref-sidebar-w) minmax(0, 1fr);
  min-height: 0;
  height: calc(100vh - var(--wm-ref-topbar-h));
}

.wm-reference-shell__nav {
  min-height: 0;
  overflow: auto;
  padding: 16px 12px 24px;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  background:
    linear-gradient(180deg, rgba(14, 20, 27, 0.98), rgba(17, 24, 32, 0.96)),
    linear-gradient(180deg, rgba(83, 133, 215, 0.04), transparent 22%);
}

.wm-reference-shell__main {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 12px 14px;
}

.wm-reference-shell__stage {
  width: 100%;
  min-width: 0;
  max-width: none;
  margin: 0;
}

.wm-reference-nav {
  display: grid;
  gap: 8px;
}

.wm-reference-nav__item {
  position: relative;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  width: 100%;
  min-height: 72px;
  padding: 0 18px;
  border-radius: 0 14px 14px 0;
  border: 1px solid rgba(183, 199, 220, 0.14);
  background:
    linear-gradient(180deg, rgba(28, 35, 46, 0.96), rgba(20, 27, 36, 0.98)),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02), transparent 62%);
  color: var(--wm-ref-text-soft);
  text-align: left;
  transition:
    transform 140ms ease,
    border-color 140ms ease,
    background 140ms ease,
    color 140ms ease;
}

.wm-reference-nav__item:hover {
  transform: translateX(2px);
  border-color: rgba(91, 166, 255, 0.28);
  color: var(--wm-ref-text);
}

.wm-reference-nav__item::before {
  content: "";
  position: absolute;
  inset: -1px auto -1px -1px;
  width: 4px;
  border-radius: 14px 0 0 14px;
  background: transparent;
}

.wm-reference-nav__item--active {
  color: #ffffff;
  border-color: rgba(91, 166, 255, 0.42);
  background:
    linear-gradient(90deg, rgba(40, 86, 150, 0.52), rgba(34, 54, 88, 0.76) 62%, rgba(22, 30, 39, 0.94) 100%),
    linear-gradient(180deg, rgba(28, 35, 46, 0.96), rgba(20, 27, 36, 0.98));
}

.wm-reference-nav__item--active::before {
  background: linear-gradient(180deg, #3e8ee9, #61b3ff);
}

.wm-reference-nav__item-icon {
  display: inline-grid;
  place-items: center;
  color: inherit;
}

.wm-reference-nav__item-label {
  min-width: 0;
  font-size: 14px;
  font-weight: 650;
  letter-spacing: -0.01em;
}

@media (max-width: 1220px) {
  .wm-reference-shell__body {
    grid-template-columns: 1fr;
    height: auto;
  }

  .wm-reference-shell__nav {
    display: none;
  }

  .wm-reference-shell__main {
    padding: 12px;
  }
}
'@

Replace-FileContent -Path $referenceShellCssPath -Content $referenceShellCss -BackupRoot $backupRoot

Write-Section "3. Trim wm-architecture-canvas.css to component-local rules only"

$architectureCanvasCss = @'
.wm-architecture-preview {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: calc(100vh - 220px);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 18px;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 20%, rgba(43, 89, 201, 0.20), transparent 38%),
    linear-gradient(180deg, rgba(4, 10, 24, 0.92), rgba(4, 10, 24, 0.98));
}

.wm-arch-info {
  width: 320px;
  min-width: 320px;
  padding: 20px;
  border-right: 1px solid rgba(255,255,255,0.06);
  background: linear-gradient(180deg, rgba(10,18,36,0.82), rgba(8,13,28,0.92));
}

.wm-arch-kicker {
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #7ea6ff;
  margin-bottom: 6px;
}

.wm-arch-title {
  margin: 0 0 18px 0;
  font-size: 28px;
  line-height: 1.05;
}

.wm-arch-stat,
.wm-arch-products {
  margin-bottom: 14px;
  font-size: 13px;
  line-height: 1.45;
  color: rgba(226,232,240,0.92);
}

.wm-arch-canvas-inner {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 700px;
  overflow: hidden;
  background:
    linear-gradient(90deg, rgba(24,42,82,0.22), rgba(6,12,24,0.04) 18%, rgba(6,12,24,0.02) 82%, rgba(24,42,82,0.18)),
    linear-gradient(180deg, rgba(5,10,18,0.25), rgba(5,10,18,0.55));
}

.wm-arch-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px);
  background-size: 48px 48px;
  opacity: 0.28;
  pointer-events: none;
}

.wm-node {
  position: absolute;
  z-index: 2;
  min-width: 160px;
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.14);
  box-shadow: 0 14px 34px rgba(0,0,0,0.28);
  color: #f8fafc;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  backdrop-filter: blur(10px);
}

.wm-node-source {
  background: linear-gradient(180deg, rgba(37,99,235,0.85), rgba(29,78,216,0.74));
}

.wm-node-core {
  background: linear-gradient(180deg, rgba(14,116,144,0.90), rgba(8,92,116,0.76));
}

.wm-node-display {
  background: linear-gradient(180deg, rgba(124,58,237,0.88), rgba(109,40,217,0.72));
}

.wm-arch-lines {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.wm-arch-lines path {
  fill: none;
  stroke: rgba(96,165,250,0.95);
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 8px rgba(96,165,250,0.35));
}
'@

Replace-FileContent -Path $architectureCanvasCssPath -Content $architectureCanvasCss -BackupRoot $backupRoot

Write-Section "4. Disable conflicting legacy override files"

$disabledBanner = @'
/* Disabled by Refactor-WingmanLayout.ps1
   This file previously applied broad global layout overrides and has been
   intentionally archived in place. Restore from backup if needed. */
'@

Replace-FileContent -Path $schematicCssPath -Content $disabledBanner -BackupRoot $backupRoot
Replace-FileContent -Path $fullWidthCssPath -Content $disabledBanner -BackupRoot $backupRoot
Replace-FileContent -Path $shellFixCssPath -Content $disabledBanner -BackupRoot $backupRoot

Write-Section "5. Summary"
Write-Host "Refactor complete." -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. npm run typecheck" -ForegroundColor White
Write-Host "2. npm run dev" -ForegroundColor White
Write-Host "3. Hard refresh browser (Ctrl+F5)" -ForegroundColor White

if (-not $WhatIfOnly) {
    Write-Host ""
    Write-Host "Backup folder: $backupRoot" -ForegroundColor Gray
}