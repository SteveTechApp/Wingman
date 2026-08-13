$ErrorActionPreference = "Stop"

$Repo = "C:\Users\steve\wingman"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

$CssFile = Join-Path $Repo "src\wingman2\styles\wingman-workflow-theme.css"

function Step($Message) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
}

function Write-Utf8NoBom($Path, $Text) {
    $utf8 = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($Path, $Text, $utf8)
}

Step "1. Opening Wingman"

Set-Location $Repo

if (-not (Test-Path ".git")) {
    throw "Wingman repository not found."
}

if (-not (Test-Path $CssFile)) {
    throw "CSS file not found: $CssFile"
}

git status -sb

Step "2. Backing up stylesheet"

$Backup = "$CssFile.$Timestamp.bak"
Copy-Item $CssFile $Backup -Force

Write-Host "Backup created:" -ForegroundColor Green
Write-Host $Backup

Step "3. Removing previous compact-chrome block"

$css = Get-Content $CssFile -Raw

$css = [regex]::Replace(
    $css,
    '(?s)/\* WINGMAN_DATA_MANAGER_COMPACT_CHROME_START \*/.*?/\* WINGMAN_DATA_MANAGER_COMPACT_CHROME_END \*/',
    ''
)

Step "4. Compacting Data Manager fixed chrome"

$patch = @'

/* WINGMAN_DATA_MANAGER_COMPACT_CHROME_START */

/* ============================================================
   DATA MANAGER
   COMPACT STATIC CHROME / MAXIMUM DATA VIEWPORT
   ============================================================ */


/* ------------------------------------------------------------
   PAGE PADDING
   ------------------------------------------------------------ */

html[data-wingman-route="data-manager"] .wm-data-manager-page {
  padding: 8px 16px 0 !important;
  gap: 0 !important;
}


/* ------------------------------------------------------------
   HEADER
   ------------------------------------------------------------ */

html[data-wingman-route="data-manager"] .wm-data-manager-header {
  min-height: 0 !important;
  padding: 0 0 8px !important;
  margin: 0 !important;

  align-items: center !important;
}

html[data-wingman-route="data-manager"] .wm-data-manager-header h1 {
  margin: 1px 0 1px !important;
  font-size: 1.35rem !important;
  line-height: 1.05 !important;
}

html[data-wingman-route="data-manager"] .wm-data-manager-header p {
  margin: 0 !important;
  font-size: .72rem !important;
  line-height: 1.2 !important;
}

html[data-wingman-route="data-manager"] .wm-data-manager-header .wm-ui-kicker,
html[data-wingman-route="data-manager"] .wm-data-manager-header small {
  font-size: .62rem !important;
  line-height: 1.1 !important;
}


/* ------------------------------------------------------------
   TABS
   ------------------------------------------------------------ */

html[data-wingman-route="data-manager"] .wm-data-tabs {
  min-height: 30px !important;
  margin: 5px 0 6px !important;
  padding: 0 !important;
  gap: 3px !important;
}

html[data-wingman-route="data-manager"] .wm-data-tabs button {
  min-height: 28px !important;
  padding: 4px 9px !important;
  font-size: .68rem !important;
  line-height: 1 !important;
}


/* ------------------------------------------------------------
   LIVE GOVERNANCE
   Change from tall card to compact horizontal strip
   ------------------------------------------------------------ */

html[data-wingman-route="data-manager"] .wm-data-quality-summary {
  display: grid !important;
  grid-template-columns: 150px minmax(0, 1fr) !important;

  align-items: center !important;
  gap: 10px !important;

  min-height: 0 !important;
  margin: 0 0 7px !important;
  padding: 8px 12px !important;
}

html[data-wingman-route="data-manager"] .wm-data-quality-heading {
  min-width: 0 !important;
}

html[data-wingman-route="data-manager"] .wm-data-quality-heading .wm-ui-kicker {
  margin: 0 !important;
  font-size: .58rem !important;
  line-height: 1 !important;
}

html[data-wingman-route="data-manager"] .wm-data-quality-heading h2 {
  margin: 2px 0 1px !important;
  font-size: .88rem !important;
  line-height: 1 !important;
}

html[data-wingman-route="data-manager"] .wm-data-quality-heading small {
  font-size: .62rem !important;
  line-height: 1 !important;
}

html[data-wingman-route="data-manager"] .wm-data-quality-metrics {
  display: grid !important;
  grid-template-columns: repeat(6, minmax(90px, 1fr)) !important;
  gap: 5px !important;
}

html[data-wingman-route="data-manager"] .wm-data-quality-metric {
  min-height: 34px !important;
  padding: 4px 7px !important;
  border-radius: 7px !important;
}

html[data-wingman-route="data-manager"] .wm-data-quality-metric strong {
  display: inline !important;
  margin-right: 3px !important;
  font-size: .82rem !important;
  line-height: 1 !important;
}

html[data-wingman-route="data-manager"] .wm-data-quality-metric span {
  display: inline !important;
  margin: 0 !important;
  font-size: .61rem !important;
  line-height: 1 !important;
  white-space: nowrap !important;
}


/* ------------------------------------------------------------
   FILTER TOOLBAR
   Reduce from two tall rows to compact controlled height
   ------------------------------------------------------------ */

html[data-wingman-route="data-manager"] .wm-data-toolbar {
  display: grid !important;

  grid-template-columns:
    minmax(260px, 1.6fr)
    repeat(4, minmax(130px, .85fr)) !important;

  gap: 7px !important;

  min-height: 0 !important;
  margin: 0 0 7px !important;
  padding: 8px 10px !important;
}

html[data-wingman-route="data-manager"] .wm-data-toolbar input,
html[data-wingman-route="data-manager"] .wm-data-toolbar select,
html[data-wingman-route="data-manager"] .wm-data-toolbar button,
html[data-wingman-route="data-manager"] .wm-data-search {
  height: 32px !important;
  min-height: 32px !important;
}

html[data-wingman-route="data-manager"] .wm-data-toolbar select,
html[data-wingman-route="data-manager"] .wm-data-toolbar input {
  font-size: .7rem !important;
}

html[data-wingman-route="data-manager"] .wm-data-toolbar > label:not(.wm-data-search) {
  font-size: .65rem !important;
}

/* Put secondary controls in one compact second line */
html[data-wingman-route="data-manager"] .wm-data-toolbar > label:nth-last-of-type(-n+2),
html[data-wingman-route="data-manager"] .wm-data-toolbar > button {
  min-height: 28px !important;
}


/* ------------------------------------------------------------
   RESULTS HEADER
   ------------------------------------------------------------ */

html[data-wingman-route="data-manager"] .wm-data-table-card > header {
  min-height: 44px !important;
  padding: 8px 12px !important;
}

html[data-wingman-route="data-manager"] .wm-data-table-card h2 {
  margin: 0 !important;
  font-size: .9rem !important;
  line-height: 1.05 !important;
}

html[data-wingman-route="data-manager"] .wm-data-table-card p {
  margin: 2px 0 0 !important;
  font-size: .64rem !important;
  line-height: 1.1 !important;
}

html[data-wingman-route="data-manager"] .wm-data-table-card > header button {
  min-height: 28px !important;
  padding: 4px 7px !important;
  font-size: .65rem !important;
}


/* ------------------------------------------------------------
   TABLE DENSITY
   More records visible
   ------------------------------------------------------------ */

html[data-wingman-route="data-manager"] .wm-data-table-card th {
  padding: 6px 9px !important;
  font-size: .62rem !important;
}

html[data-wingman-route="data-manager"] .wm-data-table-card td {
  padding: 7px 9px !important;
  font-size: .7rem !important;
}

html[data-wingman-route="data-manager"] .wm-data-table-card td span,
html[data-wingman-route="data-manager"] .wm-data-table-card td small {
  margin-top: 1px !important;
  font-size: .62rem !important;
}


/* ------------------------------------------------------------
   REFRESH BUTTON
   ------------------------------------------------------------ */

html[data-wingman-route="data-manager"] .wm-data-manager-header button {
  min-height: 30px !important;
  padding: 5px 9px !important;
  font-size: .68rem !important;
}


/* ------------------------------------------------------------
   RESPONSIVE FALLBACK
   ------------------------------------------------------------ */

@media (max-width: 1200px) {

  html[data-wingman-route="data-manager"] .wm-data-quality-summary {
    grid-template-columns: 130px minmax(0, 1fr) !important;
  }

  html[data-wingman-route="data-manager"] .wm-data-quality-metrics {
    grid-template-columns: repeat(3, minmax(90px, 1fr)) !important;
  }

  html[data-wingman-route="data-manager"] .wm-data-toolbar {
    grid-template-columns: repeat(3, minmax(150px, 1fr)) !important;
  }
}

/* WINGMAN_DATA_MANAGER_COMPACT_CHROME_END */

'@

$css = $css.TrimEnd() + "`r`n`r`n" + $patch.Trim() + "`r`n"

Write-Utf8NoBom $CssFile $css

Write-Host "Compact Data Manager chrome applied." -ForegroundColor Green

Step "5. Running typecheck"

npm run typecheck

if ($LASTEXITCODE -ne 0) {
    throw "Typecheck failed."
}

Step "6. Running build"

npm run build

if ($LASTEXITCODE -ne 0) {
    throw "Build failed."
}

Step "7. Complete"

git status -sb

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "DATA MANAGER CHROME COMPACTED" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green

Write-Host ""
Write-Host "Restart:" -ForegroundColor Cyan
Write-Host "npm run dev"
Write-Host ""
Write-Host "Then Ctrl+Shift+R the Data Manager page."
Write-Host ""
Write-Host "Expected improvement:" -ForegroundColor Green
Write-Host "- Header substantially shorter"
Write-Host "- Tabs tighter"
Write-Host "- Live Governance becomes a thin horizontal strip"
Write-Host "- Filters use less vertical space"
Write-Host "- Results header shorter"
Write-Host "- Product data viewport substantially taller"
Write-Host "- More records visible without scrolling"