$ErrorActionPreference = "Stop"

$Repo = "C:\Users\steve\wingman"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$CssFile = Join-Path $Repo "src\wingman2\styles\wingman-workflow-theme.css"

function Step($Text) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host $Text -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
}

function Write-Utf8NoBom($Path, $Text) {
    $utf8 = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($Path, $Text, $utf8)
}

Set-Location $Repo

Step "1. Checking stylesheet"

if (-not (Test-Path $CssFile)) {
    throw "CSS file not found: $CssFile"
}

Step "2. Backing up stylesheet"

$Backup = "$CssFile.$Stamp.bak"
Copy-Item $CssFile $Backup -Force

Write-Host "Backup:" -ForegroundColor Green
Write-Host $Backup

Step "3. Removing previous workspace compaction block"

$css = Get-Content $CssFile -Raw

$css = [regex]::Replace(
    $css,
    '(?s)/\* WINGMAN_DATA_MANAGER_MAX_WORKSPACE_START \*/.*?/\* WINGMAN_DATA_MANAGER_MAX_WORKSPACE_END \*/',
    ''
)

Step "4. Maximising useful Data Manager viewport"

$patch = @'

/* WINGMAN_DATA_MANAGER_MAX_WORKSPACE_START */

/* ============================================================
   DATA MANAGER
   REMOVE DUPLICATE PAGE CHROME / MAXIMISE DATA AREA
   ============================================================ */


/* ------------------------------------------------------------
   1. Page title is already supplied by the Wingman top bar.
      Remove the duplicate title/copy from the page itself.
   ------------------------------------------------------------ */

html[data-wingman-route="data-manager"]
.wm-data-manager-header > div:first-child {
  display: none !important;
}


/*
   Keep Refresh Data available without allowing the old header
   block to consume significant vertical space.
*/

html[data-wingman-route="data-manager"]
.wm-data-manager-header {
  min-height: 0 !important;
  height: 0 !important;

  margin: 0 !important;
  padding: 0 !important;

  border: 0 !important;

  position: relative !important;

  overflow: visible !important;
}


html[data-wingman-route="data-manager"]
.wm-data-manager-header > button,
html[data-wingman-route="data-manager"]
.wm-data-manager-header .wm-button {
  position: absolute !important;

  right: 0 !important;
  top: 4px !important;

  z-index: 20 !important;

  min-height: 28px !important;

  padding: 4px 8px !important;

  font-size: .66rem !important;
}


/* ------------------------------------------------------------
   2. Tabs become the first real row of Data Manager content
   ------------------------------------------------------------ */

html[data-wingman-route="data-manager"]
.wm-data-tabs {
  min-height: 28px !important;

  margin: 0 112px 4px 0 !important;
  padding: 0 !important;

  gap: 3px !important;
}


html[data-wingman-route="data-manager"]
.wm-data-tabs button {
  min-height: 27px !important;
  height: 27px !important;

  padding: 3px 8px !important;

  font-size: .67rem !important;
  line-height: 1 !important;
}


/* ------------------------------------------------------------
   3. LIVE GOVERNANCE
      Convert large presentation card into compact control strip
   ------------------------------------------------------------ */

html[data-wingman-route="data-manager"]
.wm-data-quality-summary {
  display: grid !important;

  grid-template-columns:
    150px
    minmax(0, 1fr) !important;

  align-items: center !important;

  min-height: 46px !important;
  height: 46px !important;
  max-height: 46px !important;

  margin: 0 0 5px !important;

  padding: 5px 10px !important;

  gap: 10px !important;

  overflow: hidden !important;

  border-radius: 11px !important;
}


html[data-wingman-route="data-manager"]
.wm-data-quality-heading {
  align-self: center !important;

  margin: 0 !important;
  padding: 0 !important;
}


html[data-wingman-route="data-manager"]
.wm-data-quality-heading .wm-ui-kicker {
  margin: 0 !important;

  font-size: .56rem !important;
  line-height: .95 !important;
}


html[data-wingman-route="data-manager"]
.wm-data-quality-heading h2 {
  margin: 1px 0 !important;

  font-size: .78rem !important;
  line-height: 1 !important;
}


html[data-wingman-route="data-manager"]
.wm-data-quality-heading small {
  margin: 0 !important;

  font-size: .56rem !important;
  line-height: 1 !important;
}


/* Governance filter buttons stay in one row */

html[data-wingman-route="data-manager"]
.wm-data-quality-metrics {
  display: grid !important;

  grid-template-columns:
    repeat(6, minmax(90px, 1fr)) !important;

  align-items: center !important;

  gap: 5px !important;

  min-height: 0 !important;
  height: 30px !important;

  margin: 0 !important;
}


html[data-wingman-route="data-manager"]
.wm-data-quality-metric {
  display: flex !important;

  align-items: center !important;
  justify-content: center !important;

  min-height: 28px !important;
  height: 28px !important;

  padding: 2px 6px !important;

  margin: 0 !important;

  white-space: nowrap !important;
}


html[data-wingman-route="data-manager"]
.wm-data-quality-metric strong {
  display: inline !important;

  margin: 0 3px 0 0 !important;

  font-size: .72rem !important;
  line-height: 1 !important;
}


html[data-wingman-route="data-manager"]
.wm-data-quality-metric span {
  display: inline !important;

  margin: 0 !important;

  font-size: .58rem !important;
  line-height: 1 !important;
}


/* ------------------------------------------------------------
   4. FILTER BAR
   ------------------------------------------------------------ */

html[data-wingman-route="data-manager"]
.wm-data-toolbar {
  min-height: 0 !important;

  margin: 0 0 5px !important;

  padding: 6px 9px !important;

  gap: 6px !important;
}


html[data-wingman-route="data-manager"]
.wm-data-search,
html[data-wingman-route="data-manager"]
.wm-data-toolbar select,
html[data-wingman-route="data-manager"]
.wm-data-toolbar input {
  min-height: 30px !important;
  height: 30px !important;
}


/* ------------------------------------------------------------
   5. RESULTS AREA
      Any saved vertical space now goes directly to the table.
   ------------------------------------------------------------ */

html[data-wingman-route="data-manager"]
.wm-data-table-card {
  margin-top: 0 !important;
}


html[data-wingman-route="data-manager"]
.wm-data-table-card > header {
  min-height: 40px !important;

  padding: 6px 12px !important;
}


html[data-wingman-route="data-manager"]
.wm-data-table-card h2 {
  font-size: .82rem !important;
}


html[data-wingman-route="data-manager"]
.wm-data-table-card p {
  font-size: .6rem !important;
}


/* ------------------------------------------------------------
   6. Page itself starts immediately beneath Wingman top bar
   ------------------------------------------------------------ */

html[data-wingman-route="data-manager"]
.wingman-page-host {
  padding-top: 0 !important;
}


html[data-wingman-route="data-manager"]
.wm-data-manager-page {
  padding-top: 3px !important;
}


/* WINGMAN_DATA_MANAGER_MAX_WORKSPACE_END */

'@

$css = $css.TrimEnd() + "`r`n`r`n" + $patch.Trim() + "`r`n"

Write-Utf8NoBom $CssFile $css

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
Write-Host "DATA MANAGER WORKSPACE MAXIMISED" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green

Write-Host ""
Write-Host "Restart:" -ForegroundColor Cyan
Write-Host "npm run dev"
Write-Host ""
Write-Host "Then Ctrl+Shift+R."
Write-Host ""
Write-Host "Expected:" -ForegroundColor Green
Write-Host "- duplicate Data Manager heading removed"
Write-Host "- top bar remains the single page heading"
Write-Host "- tabs move directly beneath the top bar"
Write-Host "- Refresh Data remains at upper right"
Write-Host "- Live Governance collapses to roughly 46px"
Write-Host "- large blank Governance areas disappear"
Write-Host "- filter bar moves upward"
Write-Host "- records viewport becomes substantially taller"
Write-Host "- existing data-only scrolling is unchanged"