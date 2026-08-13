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

Step "1. Opening Wingman repository"

Set-Location $Repo

if (-not (Test-Path ".git")) {
    throw "Wingman Git repository not found."
}

if (-not (Test-Path $CssFile)) {
    throw "CSS file not found: $CssFile"
}

git status -sb

# =====================================================================
# BACKUP
# =====================================================================

Step "2. Backing up stylesheet"

$Backup = "$CssFile.$Timestamp.bak"

Copy-Item `
    -LiteralPath $CssFile `
    -Destination $Backup `
    -Force

Write-Host "Backup created:" -ForegroundColor Green
Write-Host $Backup

# =====================================================================
# LOAD CSS
# =====================================================================

Step "3. Removing previous Data Manager scrolling experiments"

$css = Get-Content -LiteralPath $CssFile -Raw

$blocks = @(
    "WINGMAN_DATA_MANAGER_SINGLE_SCROLL",
    "WINGMAN_DATA_MANAGER_RESULTS_SCROLL",
    "WINGMAN_DATA_MANAGER_STATIC_SHELL",
    "WINGMAN_DATA_MANAGER_SCROLL_DIRECTION",
    "WINGMAN_DATA_MANAGER_FINAL",
    "WINGMAN_DATA_MANAGER_SCROLL_FINAL"
)

foreach ($block in $blocks) {

    $pattern = "(?s)/\* $($block)_START \*/.*?/\* $($block)_END \*/"

    $before = $css.Length

    $css = [regex]::Replace(
        $css,
        $pattern,
        ""
    )

    if ($css.Length -lt $before) {
        Write-Host "Removed old block: $block" -ForegroundColor DarkGray
    }
}

# =====================================================================
# FINAL CORRECT SCROLL MODEL
# =====================================================================

Step "4. Installing final Data Manager scroll model"

$patch = @'

/* WINGMAN_DATA_MANAGER_SCROLL_FINAL_START */

/* ================================================================
   DATA MANAGER - FINAL SCROLL OWNERSHIP

   Actual Wingman hierarchy:

   .wingman-app-main          NO SCROLL
     .wingman-page-host       NO SCROLL
       .wm-data-manager-page  NO SCROLL
         controls             STATIC
         records panel        FIXED AVAILABLE HEIGHT
           .wm-data-table-scroll   ONLY VERTICAL SCROLLER
   ================================================================ */


/* ----------------------------------------------------------------
   1. STOP THE REAL WINGMAN MAIN WORKSPACE FROM SCROLLING
   ---------------------------------------------------------------- */

/*
   This specifically overrides the global Wingman rule that normally
   makes .wingman-app-main the page scrolling region.
*/

body:has(.wm-data-manager-page) .wingman-app-main,
body:has(.wm-data-manager-page) main.wingman-app-main,
body:has(.wm-data-manager-page) .wingman-authority-shell .wingman-app-main,
body:has(.wm-data-manager-page) #root > .wingman-shell .wingman-app-main {

  flex: 1 1 auto !important;

  height: auto !important;
  min-height: 0 !important;

  max-height: calc(
    100dvh - var(--wingman-topbar-height, 4rem)
  ) !important;

  overflow: hidden !important;
  overflow-y: hidden !important;
  overflow-x: hidden !important;

  padding-bottom: 10px !important;

  scrollbar-gutter: auto !important;
}


/* ----------------------------------------------------------------
   2. PAGE HOST FILLS THE STATIC WORKSPACE
   ---------------------------------------------------------------- */

body:has(.wm-data-manager-page) .wingman-page-host,
body:has(.wm-data-manager-page) .wingman-authority-shell .wingman-page-host,
body:has(.wm-data-manager-page) #root > .wingman-shell .wingman-page-host {

  display: flex !important;
  flex-direction: column !important;

  flex: 1 1 auto !important;

  width: 100% !important;

  height: 100% !important;
  min-height: 0 !important;
  max-height: 100% !important;

  overflow: hidden !important;
  overflow-y: hidden !important;
  overflow-x: hidden !important;
}


/* ----------------------------------------------------------------
   3. DATA MANAGER FILLS PAGE HOST
   ---------------------------------------------------------------- */

body:has(.wm-data-manager-page) .wm-data-manager-page {

  display: flex !important;
  flex-direction: column !important;

  flex: 1 1 auto !important;

  width: 100% !important;

  height: 100% !important;
  min-height: 0 !important;
  max-height: 100% !important;

  overflow: hidden !important;

  padding-bottom: 0 !important;
}


/* ----------------------------------------------------------------
   4. EVERYTHING ABOVE THE PRODUCT LIST STAYS STATIC
   ---------------------------------------------------------------- */

.wm-data-manager-page .wm-data-manager-header,
.wm-data-manager-page .wm-data-tabs,
.wm-data-manager-page .wm-data-quality-summary,
.wm-data-manager-page .wm-data-toolbar {

  flex: 0 0 auto !important;

  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;

  overflow: visible !important;
}


/* Compact spacing so more of the records viewport remains available */

.wm-data-manager-page .wm-data-manager-header {
  margin-bottom: 5px !important;
}

.wm-data-manager-page .wm-data-tabs {
  margin-top: 3px !important;
  margin-bottom: 6px !important;
}

.wm-data-manager-page .wm-data-quality-summary {
  margin-bottom: 6px !important;
}

.wm-data-manager-page .wm-data-toolbar {
  margin-bottom: 6px !important;
}


/* ----------------------------------------------------------------
   5. PRODUCT RESULTS SECTION TAKES REMAINING HEIGHT
   ---------------------------------------------------------------- */

/*
   DataManagerPage has the results section containing
   .wm-data-table-scroll.

   Target that exact section instead of relying on last-of-type.
*/

.wm-data-manager-page section:has(> .wm-data-table-scroll),
.wm-data-manager-page section:has(.wm-data-table-scroll) {

  display: flex !important;
  flex-direction: column !important;

  flex: 1 1 0 !important;

  height: 0 !important;
  min-height: 0 !important;
  max-height: none !important;

  overflow: hidden !important;

  margin-bottom: 0 !important;
}


/* Anything above the table inside the results card remains static */

.wm-data-manager-page section:has(.wm-data-table-scroll)
  > :not(.wm-data-table-scroll) {

  flex: 0 0 auto !important;
}


/* ----------------------------------------------------------------
   6. THIS IS THE ONLY VERTICAL SCROLLER
   ---------------------------------------------------------------- */

.wm-data-manager-page .wm-data-table-scroll {

  display: block !important;

  flex: 1 1 0 !important;

  width: 100% !important;

  height: 0 !important;
  min-height: 0 !important;
  max-height: none !important;

  overflow-y: auto !important;
  overflow-x: auto !important;

  overscroll-behavior: contain !important;

  scrollbar-width: thin !important;
  scrollbar-gutter: stable !important;
}


/* ----------------------------------------------------------------
   7. TABLE ITSELF MUST NOT SCROLL
   ---------------------------------------------------------------- */

.wm-data-manager-page .wm-data-table-scroll table {

  display: table !important;

  width: 100% !important;

  height: auto !important;
  max-height: none !important;

  overflow: visible !important;
}


.wm-data-manager-page .wm-data-table-scroll tbody {

  display: table-row-group !important;

  height: auto !important;
  max-height: none !important;

  overflow: visible !important;
}


/* ----------------------------------------------------------------
   8. STICKY TABLE HEADER
   ---------------------------------------------------------------- */

.wm-data-manager-page .wm-data-table-scroll thead {

  display: table-header-group !important;

  position: sticky !important;
  top: 0 !important;

  z-index: 20 !important;

  background: #0b2134 !important;
}


.wm-data-manager-page .wm-data-table-scroll th {

  background: #0b2134 !important;
}


/* ----------------------------------------------------------------
   9. PREVENT BODY / HTML FROM BECOMING A SECOND SCROLLER
   ---------------------------------------------------------------- */

html:has(.wm-data-manager-page),
body:has(.wm-data-manager-page) {

  height: 100% !important;

  overflow-y: hidden !important;
  overflow-x: hidden !important;
}


/* ----------------------------------------------------------------
   10. KEEP ACTION ICONS ON ONE LINE
   ---------------------------------------------------------------- */

.wm-data-manager-page td:last-child,
.wm-data-manager-page th:last-child {

  white-space: nowrap !important;
}


.wm-data-manager-page .wm-data-actions,
.wm-data-manager-page .wm-data-row-actions {

  display: flex !important;

  flex-direction: row !important;
  flex-wrap: nowrap !important;

  align-items: center !important;

  gap: 4px !important;
}


/* WINGMAN_DATA_MANAGER_SCROLL_FINAL_END */

'@

$css = $css.TrimEnd() + "`r`n`r`n" + $patch.Trim() + "`r`n"

Set-Content `
    -LiteralPath $CssFile `
    -Value $css `
    -Encoding utf8

Write-Host "Final scroll rules installed." -ForegroundColor Green

# =====================================================================
# SHOW THE IMPORTANT RULES
# =====================================================================

Step "5. Confirming actual Data Manager table wrapper"

Select-String `
    -Path "src\wingman2\pages\DataManagerPage.tsx" `
    -Pattern "wm-data-table-scroll" `
    -Context 1,1

Step "6. Checking final stylesheet block"

Select-String `
    -Path $CssFile `
    -Pattern "WINGMAN_DATA_MANAGER_SCROLL_FINAL_START|wingman-app-main|wm-data-table-scroll" `
    -Context 0,1 |
    Select-Object -Last 20

# =====================================================================
# VALIDATION
# =====================================================================

Step "7. Running typecheck"

npm run typecheck

if ($LASTEXITCODE -ne 0) {
    throw "Typecheck failed."
}

Step "8. Running build"

npm run build

if ($LASTEXITCODE -ne 0) {
    throw "Build failed."
}

# =====================================================================
# DONE
# =====================================================================

Step "9. Complete"

git status -sb

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "DATA MANAGER SCROLL FIX COMPLETE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green

Write-Host ""
Write-Host "Restart Wingman:" -ForegroundColor Cyan
Write-Host ""
Write-Host "npm run dev"
Write-Host ""
Write-Host "Then use Ctrl+Shift+R on the Data Manager page."
Write-Host ""
Write-Host "CORRECT behaviour:" -ForegroundColor Green
Write-Host ""
Write-Host "  Wingman main workspace      STATIC"
Write-Host "  Data Manager page           STATIC"
Write-Host "  Data Manager heading        STATIC"
Write-Host "  Dataset tabs                STATIC"
Write-Host "  Live Governance             STATIC"
Write-Host "  Filters                     STATIC"
Write-Host "  Records count / sort        STATIC"
Write-Host "  Table headings              STICKY"
Write-Host "  Product rows                SCROLL"
Write-Host ""
Write-Host "The ONLY vertical scrollbar should now be inside the data table window."