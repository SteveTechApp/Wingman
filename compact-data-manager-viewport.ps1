param(
    [string]$RepoRoot = (Get-Location).Path,
    [switch]$SkipValidation
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Text) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor DarkCyan
    Write-Host $Text -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor DarkCyan
}

function Write-Utf8NoBom([string]$Path, [string]$Text) {
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Text, $utf8)
}

function Backup-File([string]$Path, [string]$Stamp) {
    $backup = "$Path.$Stamp.bak"
    Copy-Item -LiteralPath $Path -Destination $backup -Force
    Write-Host "Backup: $backup" -ForegroundColor DarkGray
}

Write-Step "1. Checking Wingman repository"

$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
Set-Location -LiteralPath $RepoRoot

if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot "package.json"))) {
    throw "package.json was not found in '$RepoRoot'. Run this script from C:\Users\steve\wingman or pass -RepoRoot."
}

Write-Host "Repository: $RepoRoot"

Write-Step "2. Locating the current Data Manager page"

$dataPage = Get-ChildItem -LiteralPath (Join-Path $RepoRoot "src") -Recurse -File -Filter "*.tsx" |
    Where-Object {
        $_.Name -match "DataManager" -or
        (Select-String -LiteralPath $_.FullName -Pattern 'data-wingman-page="data-manager"|Data Manager' -Quiet -ErrorAction SilentlyContinue)
    } |
    Sort-Object @{ Expression = { if ($_.Name -eq "DataManagerPage.tsx") { 0 } else { 1 } } }, FullName |
    Select-Object -First 1

if (-not $dataPage) {
    throw "Could not locate the Data Manager TSX file under src."
}

Write-Host "Data Manager: $($dataPage.FullName)" -ForegroundColor Green

$pageText = Get-Content -LiteralPath $dataPage.FullName -Raw

$requiredClasses = @(
    "wm-data-manager-page",
    "wm-data-tabs",
    "wm-data-toolbar",
    "wm-data-table-card",
    "wm-data-table-scroll"
)

foreach ($className in $requiredClasses) {
    if ($pageText -notmatch [regex]::Escape($className)) {
        throw "The current Data Manager page does not contain '$className'. No changes were made. The page structure has changed and this script should be revised before patching."
    }
}

Write-Step "3. Locating the shared stylesheet used by Data Manager"

$cssFiles = Get-ChildItem -LiteralPath (Join-Path $RepoRoot "src") -Recurse -File -Filter "*.css"

$styleFile = $cssFiles |
    Where-Object {
        Select-String -LiteralPath $_.FullName -Pattern '\.wm-data-manager-page|\.wm-data-table-card|\.wm-data-toolbar' -Quiet -ErrorAction SilentlyContinue
    } |
    Sort-Object FullName |
    Select-Object -First 1

if (-not $styleFile) {
    # Fallback: find CSS imported by src/main.tsx / src/main.ts
    $mainFile = @(
        (Join-Path $RepoRoot "src\main.tsx"),
        (Join-Path $RepoRoot "src\main.ts")
    ) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

    if ($mainFile) {
        $mainText = Get-Content -LiteralPath $mainFile -Raw
        $imports = [regex]::Matches($mainText, 'import\s+["''](.+?\.css)["'']')
        foreach ($match in $imports) {
            $candidate = Join-Path (Split-Path $mainFile -Parent) $match.Groups[1].Value
            if (Test-Path -LiteralPath $candidate) {
                $styleFile = Get-Item -LiteralPath $candidate
                break
            }
        }
    }
}

if (-not $styleFile) {
    throw "Could not safely identify the shared Wingman stylesheet. No changes were made."
}

Write-Host "Stylesheet:  $($styleFile.FullName)" -ForegroundColor Green

Write-Step "4. Creating backups"

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
Backup-File -Path $dataPage.FullName -Stamp $stamp
Backup-File -Path $styleFile.FullName -Stamp $stamp

Write-Step "5. Installing compact Data Manager viewport layout"

$css = Get-Content -LiteralPath $styleFile.FullName -Raw

$startMarker = "/* WINGMAN DATA MANAGER COMPACT VIEWPORT - START */"
$endMarker   = "/* WINGMAN DATA MANAGER COMPACT VIEWPORT - END */"

$override = @'
/* WINGMAN DATA MANAGER COMPACT VIEWPORT - START */
/*
   Data Manager is a high-density administration workspace.
   Keep the records table dominant, minimise non-working vertical space,
   and scroll the records region rather than the whole page.
*/
.wm-data-manager-page {
  height: calc(100dvh - 16px) !important;
  max-height: calc(100dvh - 16px) !important;
  min-height: 0 !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}

/* Compact page heading/action area. */
.wm-data-manager-page .wm-data-manager-header {
  flex: 0 0 auto !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 4px 4px 2px !important;
  gap: 12px !important;
  align-items: center !important;
}

.wm-data-manager-page .wm-data-manager-header h1 {
  margin: 0 !important;
  line-height: 1.05 !important;
}

.wm-data-manager-page .wm-data-manager-header p {
  margin-top: 2px !important;
  margin-bottom: 0 !important;
}

.wm-data-manager-page .wm-data-manager-header .wm-ui-kicker {
  display: none !important;
}

/* Keep dataset tabs compact and single-line on a normal desktop viewport. */
.wm-data-manager-page .wm-data-tabs {
  flex: 0 0 auto !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  gap: 4px !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  scrollbar-width: thin;
}

.wm-data-manager-page .wm-data-tabs button {
  min-height: 30px !important;
  padding: 5px 10px !important;
  line-height: 1.1 !important;
  white-space: nowrap !important;
}

/*
   Local builds have used several names for the Live Governance / Data Quality
   block. These selectors are intentionally scoped to Data Manager only.
*/
.wm-data-manager-page :is(
  .wm-data-governance,
  .wm-data-governance-card,
  .wm-data-quality,
  .wm-data-quality-card,
  .wm-data-quality-panel,
  .wm-live-governance,
  section[class*="governance"],
  section[class*="data-quality"],
  section[class*="dataQuality"]
) {
  flex: 0 0 auto !important;
  min-height: 0 !important;
  height: auto !important;
  margin: 0 !important;
  padding: 8px 12px !important;
  gap: 8px !important;
  align-items: center !important;
}

/* Remove large fixed/min heights left behind by earlier dashboard-style cards. */
.wm-data-manager-page :is(
  [class*="governance"],
  [class*="data-quality"],
  [class*="dataQuality"]
) {
  min-height: 0 !important;
}

/* Compress governance metric cards/counters without removing their information. */
.wm-data-manager-page :is(
  [class*="governance"],
  [class*="data-quality"],
  [class*="dataQuality"]
) :is(article, [class*="metric"], [class*="stat"], [class*="counter"]) {
  min-height: 30px !important;
  padding: 5px 8px !important;
  margin: 0 !important;
  line-height: 1.1 !important;
}

/* Search/filter controls: dense desktop toolbar, responsive when required. */
.wm-data-manager-page .wm-data-toolbar {
  flex: 0 0 auto !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 7px 10px !important;
  gap: 6px 8px !important;
  align-items: center !important;
}

@media (min-width: 1280px) {
  .wm-data-manager-page .wm-data-toolbar {
    display: grid !important;
    grid-template-columns:
      minmax(280px, 1.8fr)
      minmax(150px, 1fr)
      minmax(150px, 1fr)
      minmax(150px, 1fr)
      minmax(130px, 0.9fr)
      auto
      auto
      minmax(150px, 0.9fr) !important;
  }
}

.wm-data-manager-page .wm-data-toolbar :is(input, select, button) {
  min-height: 34px !important;
}

.wm-data-manager-page .wm-data-toolbar label {
  margin: 0 !important;
}

.wm-data-manager-page .wm-data-search {
  min-width: 0 !important;
}

/*
   Records become the dominant viewport region.
   min-height:0 is critical so the internal table can actually shrink/scroll.
*/
.wm-data-manager-page .wm-data-table-card {
  flex: 1 1 0 !important;
  min-height: 0 !important;
  height: auto !important;
  margin: 0 !important;
  padding: 8px 10px 0 !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
}

.wm-data-manager-page .wm-data-table-card > header {
  flex: 0 0 auto !important;
  min-height: 38px !important;
  margin: 0 !important;
  padding: 0 2px 7px !important;
  align-items: center !important;
}

.wm-data-manager-page .wm-data-table-card > header h2 {
  margin: 0 !important;
  line-height: 1.1 !important;
}

.wm-data-manager-page .wm-data-table-card > header p {
  margin: 1px 0 0 !important;
  line-height: 1.15 !important;
}

.wm-data-manager-page .wm-data-table-scroll {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  height: auto !important;
  max-height: none !important;
  overflow-y: auto !important;
  overflow-x: auto !important;
  overscroll-behavior: contain;
}

/* Compact table while preserving SKU/name/manufacturer hierarchy. */
.wm-data-manager-page .wm-data-table-scroll table {
  width: 100% !important;
}

.wm-data-manager-page .wm-data-table-scroll thead th {
  position: sticky !important;
  top: 0 !important;
  z-index: 2 !important;
  height: 36px !important;
  padding-top: 6px !important;
  padding-bottom: 6px !important;
}

.wm-data-manager-page .wm-data-table-scroll tbody tr {
  height: 58px !important;
}

.wm-data-manager-page .wm-data-table-scroll tbody td {
  padding-top: 6px !important;
  padding-bottom: 6px !important;
  vertical-align: middle !important;
}

.wm-data-manager-page .wm-data-table-scroll td > strong,
.wm-data-manager-page .wm-data-table-scroll td > span,
.wm-data-manager-page .wm-data-table-scroll td > small {
  line-height: 1.15 !important;
}

.wm-data-manager-page .wm-data-table-scroll td > span {
  display: block !important;
  max-width: 100% !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.wm-data-manager-page .wm-data-row-actions {
  gap: 4px !important;
}

.wm-data-manager-page .wm-data-row-actions button {
  min-width: 32px !important;
  min-height: 32px !important;
  padding: 5px !important;
}

/* Do not let status messages steal permanent table height. */
.wm-data-manager-page .wm-data-message {
  flex: 0 0 auto !important;
  margin: 0 !important;
  padding: 5px 8px !important;
}

/* Smaller displays may return to natural page scrolling rather than clipping controls. */
@media (max-width: 1100px), (max-height: 720px) {
  .wm-data-manager-page {
    height: auto !important;
    max-height: none !important;
    min-height: calc(100dvh - 16px) !important;
    overflow: visible !important;
  }

  .wm-data-manager-page .wm-data-table-card {
    min-height: 480px !important;
  }

  .wm-data-manager-page .wm-data-table-scroll {
    max-height: 65dvh !important;
  }
}
/* WINGMAN DATA MANAGER COMPACT VIEWPORT - END */
'@

# Remove a previous copy of this exact override block so the script is safely re-runnable.
$escapedStart = [regex]::Escape($startMarker)
$escapedEnd   = [regex]::Escape($endMarker)
$blockPattern = "(?s)\s*$escapedStart.*?$escapedEnd\s*"
$css = [regex]::Replace($css, $blockPattern, "`r`n")

$css = $css.TrimEnd() + "`r`n`r`n" + $override.Trim() + "`r`n"
Write-Utf8NoBom -Path $styleFile.FullName -Text $css

Write-Host "Installed compact Data Manager CSS override." -ForegroundColor Green

Write-Step "6. Sanity checks"

$updatedCss = Get-Content -LiteralPath $styleFile.FullName -Raw
if ($updatedCss -notmatch [regex]::Escape($startMarker)) {
    throw "Compact Data Manager marker was not written successfully."
}

if ($updatedCss -notmatch '\.wm-data-manager-page\s+\.wm-data-table-card') {
    throw "Expected Data Manager table layout rule is missing after write."
}

Write-Host "Patch markers verified." -ForegroundColor Green

if (-not $SkipValidation) {
    Write-Step "7. Running validation"

    if (Get-Command npm -ErrorAction SilentlyContinue) {
        Write-Host "Running npm run typecheck..."
        & npm run typecheck
        if ($LASTEXITCODE -ne 0) {
            throw "npm run typecheck failed. Your backups are still available."
        }

        Write-Host ""
        Write-Host "Running npm run build..."
        & npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "npm run build failed. Your backups are still available."
        }
    }
    else {
        Write-Warning "npm was not found in PATH, so typecheck/build were skipped."
    }
}
else {
    Write-Host "Validation skipped because -SkipValidation was supplied." -ForegroundColor Yellow
}

Write-Step "8. Finished"

Write-Host "Data Manager compact viewport patch installed." -ForegroundColor Green
Write-Host ""
Write-Host "Changed:"
Write-Host "  $($styleFile.FullName)"
Write-Host ""
Write-Host "Backups were created with timestamp:"
Write-Host "  $stamp"
Write-Host ""
Write-Host "Now refresh:" -ForegroundColor Cyan
Write-Host "  http://127.0.0.1:3000/wingman/admin/data-manager"
Write-Host ""
Write-Host "Expected result:"
Write-Host "  - compact header/tabs"
Write-Host "  - compact Live Governance / Data Quality area"
Write-Host "  - denser filter toolbar"
Write-Host "  - records panel fills remaining viewport"
Write-Host "  - table becomes the primary vertical scroll area"
Write-Host "  - materially more product rows visible at 1920x1080"
Write-Host ""
Write-Host "Review the page visually before committing."
