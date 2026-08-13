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

$artPath = Join-Path $RepoRoot "src\wingman2\components\HubCardArt.tsx"
$cssPath = Join-Path $RepoRoot "src\wingman2\styles\wingman-style-stack.css"

Step "1. Checking files"

foreach ($path in @($artPath, $cssPath)) {
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Required file not found: $path"
    }
}

$art = [System.IO.File]::ReadAllText($artPath)
$css = [System.IO.File]::ReadAllText($cssPath)

if ($art -notmatch 'kind\s*===\s*"videowall"') {
    throw 'Could not find the "videowall" HubCardArt block.'
}

Step "2. Creating recovery backup"

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $env:TEMP ("wingman-videowall-art-" + $stamp)
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

Copy-Item -LiteralPath $artPath -Destination (Join-Path $backupRoot "HubCardArt.tsx") -Force
Copy-Item -LiteralPath $cssPath -Destination (Join-Path $backupRoot "wingman-style-stack.css") -Force

Write-Host "Backup: $backupRoot" -ForegroundColor Green

Step "3. Giving only the videowall artwork its own class"

if ($art -notmatch 'className="wm-hub-art-videowall"') {
    $pattern = '(?s)(if\s*\(\s*kind\s*===\s*"videowall"\s*\)\s*\{.*?<svg)(\s+viewBox=)'
    $updatedArt = [regex]::Replace(
        $art,
        $pattern,
        '$1 className="wm-hub-art-videowall"$2',
        1
    )

    if ($updatedArt -eq $art) {
        throw "Found the videowall block, but could not identify its opening <svg> element."
    }

    Write-Utf8NoBom $artPath $updatedArt
    Write-Host "Added wm-hub-art-videowall to the videowall SVG." -ForegroundColor Green
}
else {
    Write-Host "Videowall SVG already has wm-hub-art-videowall." -ForegroundColor DarkGray
}

Step "4. Installing lightweight videowall artwork styling"

$markerStart = "/* WINGMAN VIDEOWALL HUB ART - LIGHTWEIGHT */"
$markerEnd = "/* END WINGMAN VIDEOWALL HUB ART - LIGHTWEIGHT */"

$block = @'

/* WINGMAN VIDEOWALL HUB ART - LIGHTWEIGHT */
/*
   Keep the Videowall Builder illustration visually secondary to the card copy.
   The bespoke artwork was substantially heavier than neighbouring hub-card art.
*/
.wm-polish-card-art:has(.wm-hub-art-videowall) {
  width: min(18%, 190px) !important;
  min-width: 132px !important;
  max-width: 190px !important;
  height: auto !important;
  right: 22px !important;
  top: 50% !important;
  bottom: auto !important;
  transform: translateY(-50%) !important;
  opacity: 0.58 !important;
  filter: none !important;
}

.wm-polish-card-art .wm-hub-art-videowall {
  width: 100% !important;
  height: auto !important;
  max-height: 118px !important;
  overflow: visible;
  stroke-width: 0.72 !important;
  filter: none !important;
}

.wm-polish-card-art .wm-hub-art-videowall * {
  vector-effect: non-scaling-stroke;
}

@media (max-width: 1100px) {
  .wm-polish-card-art:has(.wm-hub-art-videowall) {
    width: 150px !important;
    min-width: 120px !important;
    right: 16px !important;
    opacity: 0.48 !important;
  }

  .wm-polish-card-art .wm-hub-art-videowall {
    max-height: 100px !important;
  }
}

@media (max-width: 760px) {
  .wm-polish-card-art:has(.wm-hub-art-videowall) {
    display: none !important;
  }
}
/* END WINGMAN VIDEOWALL HUB ART - LIGHTWEIGHT */
'@

$cssNow = [System.IO.File]::ReadAllText($cssPath)

if ($cssNow.Contains($markerStart)) {
    $replacePattern = '(?s)/\* WINGMAN VIDEOWALL HUB ART - LIGHTWEIGHT \*/.*?/\* END WINGMAN VIDEOWALL HUB ART - LIGHTWEIGHT \*/'
    $cssNow = [regex]::Replace($cssNow, $replacePattern, $block.Trim())
    Write-Host "Replaced existing videowall artwork tuning block." -ForegroundColor Yellow
}
else {
    $cssNow = $cssNow.TrimEnd() + [Environment]::NewLine + $block + [Environment]::NewLine
    Write-Host "Added videowall artwork tuning to canonical style stack." -ForegroundColor Green
}

Write-Utf8NoBom $cssPath $cssNow

Step "5. Typechecking"

& npm run typecheck
if ($LASTEXITCODE -ne 0) {
    Write-Host "Typecheck failed. Restoring files..." -ForegroundColor Red
    Copy-Item -LiteralPath (Join-Path $backupRoot "HubCardArt.tsx") -Destination $artPath -Force
    Copy-Item -LiteralPath (Join-Path $backupRoot "wingman-style-stack.css") -Destination $cssPath -Force
    throw "Typecheck failed; changes were restored."
}

Step "6. Building"

& npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed. Restoring files..." -ForegroundColor Red
    Copy-Item -LiteralPath (Join-Path $backupRoot "HubCardArt.tsx") -Destination $artPath -Force
    Copy-Item -LiteralPath (Join-Path $backupRoot "wingman-style-stack.css") -Destination $cssPath -Force
    throw "Build failed; changes were restored."
}

Step "7. Complete"

Write-Host "Videowall hub graphic has been reduced in visual weight." -ForegroundColor Green
Write-Host ""
Write-Host "Changed:"
Write-Host "  src\wingman2\components\HubCardArt.tsx"
Write-Host "  src\wingman2\styles\wingman-style-stack.css"
Write-Host ""
Write-Host "Expected result:"
Write-Host "  - smaller artwork footprint"
Write-Host "  - substantially thinner apparent line weight"
Write-Host "  - lower opacity"
Write-Host "  - no heavy filter/glow"
Write-Host "  - hidden on narrow mobile layouts"
Write-Host ""
Write-Host "Recovery backup:"
Write-Host "  $backupRoot"
Write-Host ""
Write-Host "Git diff:"
& git diff -- src/wingman2/components/HubCardArt.tsx src/wingman2/styles/wingman-style-stack.css
