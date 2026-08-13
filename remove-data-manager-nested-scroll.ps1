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

Step "1. Opening Wingman"

Set-Location $Repo

if (-not (Test-Path ".git")) {
    throw "Wingman Git repository not found."
}

if (-not (Test-Path $CssFile)) {
    throw "CSS file not found: $CssFile"
}

git status -sb

# --------------------------------------------------------------------
# BACKUP
# --------------------------------------------------------------------

Step "2. Backing up workflow CSS"

$Backup = "$CssFile.$Timestamp.bak"

Copy-Item `
    -LiteralPath $CssFile `
    -Destination $Backup `
    -Force

Write-Host "Backup created:" -ForegroundColor Green
Write-Host $Backup

# --------------------------------------------------------------------
# REMOVE PREVIOUS VERSION OF THIS PATCH
# --------------------------------------------------------------------

Step "3. Removing previous nested-scroll override if present"

$css = Get-Content -LiteralPath $CssFile -Raw

$css = [regex]::Replace(
    $css,
    '(?s)/\* WINGMAN_DATA_MANAGER_SINGLE_SCROLL_START \*/.*?/\* WINGMAN_DATA_MANAGER_SINGLE_SCROLL_END \*/',
    ''
)

# --------------------------------------------------------------------
# ADD STRONG DATA-MANAGER-ONLY SCROLL GOVERNANCE
# --------------------------------------------------------------------

Step "4. Applying single-scroll Data Manager layout"

$patch = @'

/* WINGMAN_DATA_MANAGER_SINGLE_SCROLL_START */

/* ============================================================
   DATA MANAGER
   ONE VERTICAL SCROLL REGION ONLY
   ============================================================ */

/*
   Data Manager must flow naturally with the main Wingman page.
   No section inside this page may create its own vertical scrollbar.
*/

.wm-data-manager-page {
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;

  overflow: visible !important;
  overflow-y: visible !important;
  overflow-x: hidden !important;
}

/* ------------------------------------------------------------
   TOP-LEVEL DATA MANAGER CONTAINERS
   ------------------------------------------------------------ */

.wm-data-manager-page > section,
.wm-data-manager-page > div,
.wm-data-manager-page main,
.wm-data-manager-page article {
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;

  overflow-y: visible !important;
}

/* ------------------------------------------------------------
   CARDS / PANELS
   ------------------------------------------------------------ */

.wm-data-manager-page .wm-section-card,
.wm-data-manager-page .wm-card,
.wm-data-manager-page .wm-panel,
.wm-data-manager-page .wm-data-manager-content,
.wm-data-manager-page .wm-data-content {
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;

  overflow-y: visible !important;
}

/* ------------------------------------------------------------
   PRODUCT RESULTS
   ------------------------------------------------------------ */

.wm-data-manager-page .wm-data-results,
.wm-data-manager-page .wm-data-records,
.wm-data-manager-page .wm-data-list,
.wm-data-manager-page .wm-data-table-wrap,
.wm-data-manager-page .wm-data-table-container,
.wm-data-manager-page .wm-data-table-scroll,
.wm-data-manager-page .wm-table-wrap,
.wm-data-manager-page .wm-table-container {
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;

  overflow-y: visible !important;
  overflow-x: visible !important;

  scrollbar-width: none !important;
}

/* Hide any residual WebKit scrollbar from these nested containers */
.wm-data-manager-page .wm-data-results::-webkit-scrollbar,
.wm-data-manager-page .wm-data-records::-webkit-scrollbar,
.wm-data-manager-page .wm-data-list::-webkit-scrollbar,
.wm-data-manager-page .wm-data-table-wrap::-webkit-scrollbar,
.wm-data-manager-page .wm-data-table-container::-webkit-scrollbar,
.wm-data-manager-page .wm-data-table-scroll::-webkit-scrollbar,
.wm-data-manager-page .wm-table-wrap::-webkit-scrollbar,
.wm-data-manager-page .wm-table-container::-webkit-scrollbar {
  display: none !important;
}

/* ------------------------------------------------------------
   TABLE
   ------------------------------------------------------------ */

.wm-data-manager-page table {
  display: table !important;

  width: 100% !important;

  height: auto !important;
  max-height: none !important;

  overflow: visible !important;
}

.wm-data-manager-page thead {
  display: table-header-group !important;
}

.wm-data-manager-page tbody {
  display: table-row-group !important;

  height: auto !important;
  max-height: none !important;

  overflow: visible !important;
}

.wm-data-manager-page tr {
  display: table-row !important;
}

.wm-data-manager-page th,
.wm-data-manager-page td {
  display: table-cell !important;
}

/* ------------------------------------------------------------
   REMOVE FIXED / CALCULATED HEIGHTS ON RESULTS CARD
   ------------------------------------------------------------ */

.wm-data-manager-page [class*="record"],
.wm-data-manager-page [class*="result"],
.wm-data-manager-page [class*="table"] {
  max-height: none !important;
}

/* Do not apply this to actual form controls */
.wm-data-manager-page select,
.wm-data-manager-page input,
.wm-data-manager-page textarea,
.wm-data-manager-page button {
  overflow: initial;
}

/* ------------------------------------------------------------
   PRODUCT ACTIONS
   Keep all icons on a single row
   ------------------------------------------------------------ */

.wm-data-manager-page td:last-child {
  white-space: nowrap !important;
}

.wm-data-manager-page .wm-data-actions,
.wm-data-manager-page .wm-data-row-actions {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;

  align-items: center !important;

  gap: 5px !important;

  width: max-content !important;
  min-width: max-content !important;
}

/* ------------------------------------------------------------
   REDUCE RECORD CARD HEIGHT
   ------------------------------------------------------------ */

.wm-data-manager-page th {
  padding-top: 7px !important;
  padding-bottom: 7px !important;
}

.wm-data-manager-page td {
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}

/* ============================================================
   IMPORTANT
   The browser / Wingman shell owns vertical scrolling.
   ============================================================ */

/* WINGMAN_DATA_MANAGER_SINGLE_SCROLL_END */

'@

$css += "`r`n" + $patch

Set-Content `
    -LiteralPath $CssFile `
    -Value $css `
    -Encoding utf8

Write-Host "Single-scroll rules applied." -ForegroundColor Green

# --------------------------------------------------------------------
# QUICK SEARCH FOR REMAINING DATA MANAGER OVERFLOW RULES
# --------------------------------------------------------------------

Step "5. Checking for competing overflow rules"

Select-String `
    -Path $CssFile `
    -Pattern "wm-data.*overflow|wm-data.*max-height|wm-data.*height:" `
    -ErrorAction SilentlyContinue |
    Select-Object LineNumber, Line |
    Format-Table -AutoSize

# --------------------------------------------------------------------
# VALIDATE
# --------------------------------------------------------------------

Step "6. Running typecheck"

npm run typecheck

if ($LASTEXITCODE -ne 0) {
    throw "Typecheck failed."
}

Step "7. Running build"

npm run build

if ($LASTEXITCODE -ne 0) {
    throw "Build failed."
}

# Don't block this visual fix on the known bundle-size budget issue.
Step "8. Checking Git state"

git status -sb

Write-Host ""
Write-Host "Diff summary:" -ForegroundColor Cyan
git diff --stat

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "DATA MANAGER SINGLE-SCROLL PATCH COMPLETE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green

Write-Host ""
Write-Host "Now run:" -ForegroundColor Cyan
Write-Host "npm run dev"
Write-Host ""
Write-Host "Then hard refresh the Data Manager page with Ctrl+F5."
Write-Host ""
Write-Host "Expected result:" -ForegroundColor Green
Write-Host "- scrollbar beside Refresh data removed"
Write-Host "- scrollbar inside product records removed"
Write-Host "- records expand vertically with the page"
Write-Host "- only the main Wingman/browser page scroll remains"
Write-Host "- Edit / Duplicate / Archive icons remain on one row"