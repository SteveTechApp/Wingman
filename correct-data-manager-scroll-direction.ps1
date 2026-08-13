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

# ---------------------------------------------------------------------
# BACKUP
# ---------------------------------------------------------------------

Step "2. Backing up stylesheet"

$Backup = "$CssFile.$Timestamp.bak"

Copy-Item `
    -LiteralPath $CssFile `
    -Destination $Backup `
    -Force

Write-Host "Backup:" -ForegroundColor Green
Write-Host $Backup

# ---------------------------------------------------------------------
# LOAD CSS
# ---------------------------------------------------------------------

Step "3. Removing previous Data Manager scroll patches"

$css = Get-Content -LiteralPath $CssFile -Raw

$oldBlocks = @(
    'WINGMAN_DATA_MANAGER_COMPACT',
    'WINGMAN_DATA_MANAGER_SINGLE_SCROLL',
    'WINGMAN_DATA_MANAGER_RESULTS_SCROLL',
    'WINGMAN_DATA_MANAGER_STATIC_SHELL',
    'WINGMAN_DATA_MANAGER_FINAL',
    'WINGMAN_DATA_MANAGER_SCROLL_DIRECTION'
)

foreach ($name in $oldBlocks) {

    $pattern =
        "(?s)/\* $($name)_START \*/.*?/\* $($name)_END \*/"

    $css = [regex]::Replace(
        $css,
        $pattern,
        ""
    )
}

Write-Host "Old conflicting scroll blocks removed." -ForegroundColor Green

# ---------------------------------------------------------------------
# FINAL SCROLL OWNERSHIP
# ---------------------------------------------------------------------

Step "4. Setting PAGE STATIC / DATA WINDOW SCROLLING"

$patch = @'

/* WINGMAN_DATA_MANAGER_SCROLL_DIRECTION_START */

/* ============================================================
   DATA MANAGER SCROLL OWNERSHIP

   PAGE     = STATIC
   TOOLBAR  = STATIC
   DATA     = SCROLLING

   There must NOT be a page-level vertical scrollbar.
   ============================================================ */

/* ------------------------------------------------------------
   DATA MANAGER OCCUPIES AVAILABLE VIEWPORT
   ------------------------------------------------------------ */

.wm-data-manager-page {
  box-sizing: border-box !important;

  display: flex !important;
  flex-direction: column !important;

  width: 100% !important;
  height: 100% !important;

  min-width: 0 !important;
  min-height: 0 !important;

  max-height: 100% !important;

  overflow: hidden !important;
  overflow-y: hidden !important;
  overflow-x: hidden !important;
}

/* ------------------------------------------------------------
   FIXED / NON-SCROLLING CONTROLS
   ------------------------------------------------------------ */

.wm-data-manager-header,
.wm-data-tabs,
.wm-data-quality-summary,
.wm-data-toolbar {
  flex: 0 0 auto !important;

  min-height: 0 !important;
  max-height: none !important;

  overflow: visible !important;
}

/* Keep these sections compact */
.wm-data-manager-header {
  margin-bottom: 5px !important;
}

.wm-data-tabs {
  margin-top: 4px !important;
  margin-bottom: 6px !important;
}

.wm-data-quality-summary {
  margin-bottom: 6px !important;
}

.wm-data-toolbar {
  margin-bottom: 6px !important;
}

/* ------------------------------------------------------------
   RESULTS PANEL FILLS ALL REMAINING SPACE
   ------------------------------------------------------------ */

/*
   The final section on the Data Manager page is the product
   records panel.
*/

.wm-data-manager-page > section:last-of-type {
  flex: 1 1 0 !important;

  display: flex !important;
  flex-direction: column !important;

  min-height: 0 !important;
  height: 0 !important;

  max-height: none !important;

  overflow: hidden !important;
}

/* ------------------------------------------------------------
   RESULTS PANEL HEADER / SORT CONTROL REMAINS STATIC
   ------------------------------------------------------------ */

.wm-data-manager-page > section:last-of-type > :first-child {
  flex: 0 0 auto !important;
}

/* ------------------------------------------------------------
   THE ELEMENT CONTAINING THE TABLE OWNS THE SCROLL
   ------------------------------------------------------------ */

/*
   Chrome supports :has(), so explicitly identify the child
   containing the records table instead of guessing its class.
*/

.wm-data-manager-page > section:last-of-type > div:has(table),
.wm-data-manager-page > section:last-of-type > section:has(table),
.wm-data-manager-page > section:last-of-type > article:has(table) {
  flex: 1 1 0 !important;

  min-height: 0 !important;
  height: 0 !important;

  max-height: none !important;

  overflow-y: auto !important;
  overflow-x: hidden !important;

  overscroll-behavior-y: contain !important;

  scrollbar-width: thin !important;
  scrollbar-gutter: stable !important;
}

/* Existing named wrappers get the same behaviour */
.wm-data-manager-page .wm-data-table-wrap,
.wm-data-manager-page .wm-data-table-container,
.wm-data-manager-page .wm-data-table-scroll,
.wm-data-manager-page .wm-data-records,
.wm-data-manager-page .wm-data-results,
.wm-data-manager-page .wm-table-wrap {
  flex: 1 1 0 !important;

  min-height: 0 !important;
  height: auto !important;

  max-height: none !important;

  overflow-y: auto !important;
  overflow-x: hidden !important;

  overscroll-behavior-y: contain !important;
}

/* ------------------------------------------------------------
   TABLE MUST NEVER BECOME A SECOND SCROLL REGION
   ------------------------------------------------------------ */

.wm-data-manager-page table {
  display: table !important;

  width: 100% !important;

  height: auto !important;
  max-height: none !important;

  overflow: visible !important;
}

.wm-data-manager-page tbody {
  display: table-row-group !important;

  height: auto !important;
  max-height: none !important;

  overflow: visible !important;
}

/* Column headings remain visible while DATA scrolls */
.wm-data-manager-page thead {
  display: table-header-group !important;

  position: sticky !important;
  top: 0 !important;

  z-index: 10 !important;

  background: #0b2134 !important;
}

/* ------------------------------------------------------------
   STOP THE OUTER APPLICATION CONTENT FROM SCROLLING
   ------------------------------------------------------------ */

html:has(.wm-data-manager-page),
body:has(.wm-data-manager-page) {
  height: 100% !important;
  overflow: hidden !important;
}

/*
   Wingman shell containers.

   These are deliberately scoped through :has() so they only
   change behaviour while Data Manager is open.
*/

body:has(.wm-data-manager-page) .wm-main,
body:has(.wm-data-manager-page) .wm-main-content,
body:has(.wm-data-manager-page) .wingman-main,
body:has(.wm-data-manager-page) .wingman-content,
body:has(.wm-data-manager-page) .wingman-page-content {
  min-height: 0 !important;
  max-height: 100% !important;

  overflow: hidden !important;
  overflow-y: hidden !important;
}

/* ------------------------------------------------------------
   PRODUCT ACTIONS REMAIN ON ONE LINE
   ------------------------------------------------------------ */

.wm-data-manager-page th:last-child,
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
}

/* WINGMAN_DATA_MANAGER_SCROLL_DIRECTION_END */

'@

$css += "`r`n" + $patch

Set-Content `
    -LiteralPath $CssFile `
    -Value $css `
    -Encoding utf8

Write-Host "Correct scroll ownership applied." -ForegroundColor Green

# ---------------------------------------------------------------------
# CHECK FOR OLD OVERFLOW RULES
# ---------------------------------------------------------------------

Step "5. Reporting remaining Data Manager overflow declarations"

Select-String `
    -Path $CssFile `
    -Pattern 'wm-data-manager.*overflow|wm-data-table.*overflow|wm-data-record.*overflow' `
    -ErrorAction SilentlyContinue |
    Select-Object LineNumber, Line |
    Format-Table -AutoSize

# ---------------------------------------------------------------------
# VALIDATION
# ---------------------------------------------------------------------

Step "6. Typecheck"

npm run typecheck

if ($LASTEXITCODE -ne 0) {
    throw "Typecheck failed."
}

Step "7. Build"

npm run build

if ($LASTEXITCODE -ne 0) {
    throw "Build failed."
}

# ---------------------------------------------------------------------
# RESULT
# ---------------------------------------------------------------------

Step "8. Finished"

git status -sb

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "SCROLL DIRECTION CORRECTED" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green

Write-Host ""
Write-Host "Start/restart Wingman:" -ForegroundColor Cyan
Write-Host ""
Write-Host "npm run dev"
Write-Host ""
Write-Host "Then press Ctrl+F5 on Data Manager."
Write-Host ""
Write-Host "CORRECT behaviour:" -ForegroundColor Green
Write-Host ""
Write-Host "  Data Manager page        STATIC"
Write-Host "  Header                   STATIC"
Write-Host "  Navigation tabs          STATIC"
Write-Host "  Live Governance          STATIC"
Write-Host "  Search / filters         STATIC"
Write-Host "  Records card header      STATIC"
Write-Host "  Column headings          STICKY"
Write-Host "  Product rows             SCROLL"
Write-Host ""
Write-Host "There should be NO scrollbar beside Refresh Data."
Write-Host "There SHOULD be a scrollbar inside the product records window."