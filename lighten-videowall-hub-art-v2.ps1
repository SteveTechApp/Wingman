param(
    [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

function Step([string]$Text) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor DarkCyan
    Write-Host $Text -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor DarkCyan
}

function Write-Utf8NoBom([string]$Path, [string]$Text) {
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Text, $utf8)
}

$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
Set-Location -LiteralPath $RepoRoot

$cssPath = Join-Path $RepoRoot "src\wingman2\styles\wingman-style-stack.css"

if (-not (Test-Path -LiteralPath $cssPath)) {
    throw "Required file not found: $cssPath"
}

Step "1. Creating recovery backup"

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $env:TEMP ("wingman-videowall-art-v2-" + $stamp)
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
Copy-Item -LiteralPath $cssPath -Destination (Join-Path $backupRoot "wingman-style-stack.css") -Force

Write-Host "Backup: $backupRoot" -ForegroundColor Green

Step "2. Replacing Videowall Builder art tuning"

$css = [System.IO.File]::ReadAllText($cssPath)

$markerStart = "/* WINGMAN VIDEOWALL HUB ART - LIGHTWEIGHT */"
$markerEnd = "/* END WINGMAN VIDEOWALL HUB ART - LIGHTWEIGHT */"

$block = @'

/* WINGMAN VIDEOWALL HUB ART - LIGHTWEIGHT */
/*
   Videowall Builder artwork should read as a subtle supporting illustration,
   matching the visual weight of the other Product hub cards.
*/
.wm-polish-card-art:has(.wm-hub-art-videowall) {
  width: 118px !important;
  min-width: 118px !important;
  max-width: 118px !important;
  height: 82px !important;
  right: 28px !important;
  top: 50% !important;
  bottom: auto !important;
  transform: translateY(-50%) !important;
  opacity: 0.28 !important;
  filter: none !important;
  pointer-events: none !important;
}

.wm-polish-card-art .wm-hub-art-videowall {
  width: 118px !important;
  height: 82px !important;
  max-width: 118px !important;
  max-height: 82px !important;
  overflow: visible !important;
  stroke-width: 0.42 !important;
  filter: none !important;
}

/* Soften the large screen-frame geometry without affecting other card art. */
.wm-polish-card-art .wm-hub-art-videowall rect,
.wm-polish-card-art .wm-hub-art-videowall path {
  stroke-opacity: 0.58 !important;
}

.wm-polish-card-art .wm-hub-art-videowall [fill="currentColor"] {
  fill-opacity: 0.025 !important;
}

.wm-polish-card-art .wm-hub-art-videowall * {
  vector-effect: non-scaling-stroke;
}

@media (max-width: 1100px) {
  .wm-polish-card-art:has(.wm-hub-art-videowall) {
    width: 104px !important;
    min-width: 104px !important;
    max-width: 104px !important;
    height: 72px !important;
    right: 20px !important;
    opacity: 0.24 !important;
  }

  .wm-polish-card-art .wm-hub-art-videowall {
    width: 104px !important;
    height: 72px !important;
    max-width: 104px !important;
    max-height: 72px !important;
  }
}

@media (max-width: 760px) {
  .wm-polish-card-art:has(.wm-hub-art-videowall) {
    display: none !important;
  }
}
/* END WINGMAN VIDEOWALL HUB ART - LIGHTWEIGHT */
'@

if ($css.Contains($markerStart) -and $css.Contains($markerEnd)) {
    $pattern = '(?s)/\* WINGMAN VIDEOWALL HUB ART - LIGHTWEIGHT \*/.*?/\* END WINGMAN VIDEOWALL HUB ART - LIGHTWEIGHT \*/'
    $newCss = [regex]::Replace($css, $pattern, $block.Trim())
    Write-Host "Replaced existing Videowall Builder artwork override." -ForegroundColor Green
}
else {
    $newCss = $css.TrimEnd() + [Environment]::NewLine + $block + [Environment]::NewLine
    Write-Host "Added Videowall Builder artwork override." -ForegroundColor Green
}

Write-Utf8NoBom $cssPath $newCss

Step "3. Typechecking"

& npm run typecheck
if ($LASTEXITCODE -ne 0) {
    Copy-Item -LiteralPath (Join-Path $backupRoot "wingman-style-stack.css") -Destination $cssPath -Force
    throw "Typecheck failed. CSS was restored."
}

Step "4. Building"

& npm run build
if ($LASTEXITCODE -ne 0) {
    Copy-Item -LiteralPath (Join-Path $backupRoot "wingman-style-stack.css") -Destination $cssPath -Force
    throw "Build failed. CSS was restored."
}

Step "5. Complete"

Write-Host "Videowall artwork reduced to subtle supporting weight." -ForegroundColor Green
Write-Host ""
Write-Host "Expected change:"
Write-Host "  - width reduced to 118px"
Write-Host "  - opacity reduced to 28%"
Write-Host "  - much thinner apparent outline"
Write-Host "  - screen fill nearly removed"
Write-Host "  - no glow/filter"
Write-Host ""
Write-Host "Recovery backup:"
Write-Host "  $backupRoot"
Write-Host ""
Write-Host "Git diff:"
& git diff -- src/wingman2/styles/wingman-style-stack.css
