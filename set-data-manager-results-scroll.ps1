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

Step "2. Backing up CSS"

$Backup = "$CssFile.$Timestamp.bak"

Copy-Item `
    -LiteralPath $CssFile `
    -Destination $Backup `
    -Force

Write-Host "Backup created:" -ForegroundColor Green
Write-Host $Backup

Step "3. Removing previous Data Manager scroll overrides"

$css = Get-Content -LiteralPath $CssFile -Raw

$patterns = @(
    '(?s)/\* WINGMAN_DATA_MANAGER_SINGLE_SCROLL_START \*/.*?/\* WINGMAN_DATA_MANAGER_SINGLE_SCROLL_END \*/',
    '(?s)/\* WINGMAN_DATA_MANAGER_RESULTS_SCROLL_START \*/.*?/\* WINGMAN_DATA_MANAGER_RESULTS_SCROLL_END \*/'
)

foreach ($pattern in $patterns) {
    $css = [regex]::Replace($css, $pattern, '')
}

Step "4. Applying fixed-page / scrolling-results layout"

$patch = @'

/* WINGMAN_DATA_MANAGER_RESULTS_SCROLL_START */

/* ============================================================
   DATA MANAGER
   FIXED WORKSPACE + SCROLLING RECORDS ONLY
   ============================================================ */

/*
   Desired behaviour:
   - Data Manager page remains within the viewport
   - Header / tabs / quality / filters remain stationary
   - Product records area owns vertical scrolling
   - No second nested scrollbar inside the table itself
*/

.wm-data-manager-page {
  height: 100% !important;
  min-height: 0 !important;
  max-height: 100% !important;

  display: flex !important;
  flex-direction: column !important;

  overflow: hidden !important;
}

/* Header */
.wm-data-manager-header {
  flex: 0 0 auto !important;
}

/* Tabs */
.wm-data-tabs {
  flex: 0 0 auto !important;
}

/* Quality summary */
.wm-data-quality-summary {
  flex: 0 0 auto !important;
}

/* Filters */
.wm-data-toolbar {
  flex: 0 0 auto !important;
}

/* ============================================================
   RECORDS AREA OWNS SCROLLING
   ============================================================ */

/*
   The final Data Manager section is the results/list card.
   It fills remaining viewport height.
*/

.wm-data-manager-page > section:last-of-type {
  flex: 1 1 auto !important;

  min-height: 0 !important;
  max-height: none !important;

  display: flex !important;
  flex-direction: column !important;

  overflow: hidden !important;
}

/* Results/card header stays visible */
.wm-data-manager-page > section:last-of-type > :first-child {
  flex: 0 0 auto !important;
}

/* Generic records/table wrappers */
.wm-data-manager-page .wm-data-results,
.wm-data-manager-page .wm-data-records,
.wm-data-manager-page .wm-data-list,
.wm-data-manager-page .wm-data-table-wrap,
.wm-data-manager-page .wm-data-table-container,
.wm-data-manager-page .wm-table-wrap,
.wm-data-manager-page .wm-table-container {
  flex: 1 1 auto !important;

  min-height: 0 !important;
  max-height: none !important;

  overflow-y: auto !important;
  overflow-x: hidden !important;

  overscroll-behavior: contain !important;

  scrollbar-width: thin !important;
}

/* ============================================================
   TABLE ITSELF MUST NOT CREATE ANOTHER SCROLLBAR
   ============================================================ */

.wm-data-manager-page table {
  width: 100% !important;

  height: auto !important;
  max-height: none !important;

  overflow: visible !important;
}

/* Keep header visible while records scroll */
.wm-data-manager-page thead {
  position: sticky !important;
  top: 0 !important;
  z-index: 3 !important;

  background: var(--wm-surface, #0b2134) !important;
}

.wm-data-manager-page tbody {
  height: auto !important;
  max-height: none !important;

  overflow: visible !important;
}

/* Product action icons remain on one line */
.wm-data-manager-page td:last-child {
  white-space: nowrap !important;
}

.wm-data-manager-page .wm-data-actions,
.wm-data-manager-page .wm-data-row-actions {
  display: flex !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
  gap: 5px !important;
}

/* ============================================================
   PREVENT OUTER PAGE SCROLL
   ============================================================ */

/*
   The Wingman content shell must not add another scrollbar
   while Data Manager is active.
*/

body:has(.wm-data-manager-page),
html:has(.wm-data-manager-page) {
  overflow: hidden !important;
}

.wm-data-manager-page {
  overscroll-behavior: contain !important;
}

/* ============================================================
   COMPACT WORKSPACE
   ============================================================ */

.wm-data-manager-header {
  margin-bottom: 6px !important;
}

.wm-data-tabs {
  margin-top: 5px !important;
  margin-bottom: 7px !important;
}

.wm-data-quality-summary {
  margin-bottom: 7px !important;
}

.wm-data-toolbar {
  margin-bottom: 7px !important;
}

/* WINGMAN_DATA_MANAGER_RESULTS_SCROLL_END */

'@

$css += "`r`n" + $patch

Set-Content `
    -LiteralPath $CssFile `
    -Value $css `
    -Encoding utf8

Write-Host "Results-scroll layout applied." -ForegroundColor Green

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
Write-Host "Diff summary:" -ForegroundColor Cyan
git diff --stat

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "DATA MANAGER SCROLL OWNERSHIP UPDATED" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green

Write-Host ""
Write-Host "Run:" -ForegroundColor Cyan
Write-Host "npm run dev"
Write-Host ""
Write-Host "Then hard-refresh Data Manager with Ctrl+F5."
Write-Host ""
Write-Host "Expected behaviour:" -ForegroundColor Green
Write-Host "- Header remains fixed"
Write-Host "- Tabs remain fixed"
Write-Host "- Live Governance remains fixed"
Write-Host "- Filters remain fixed"
Write-Host "- Only product/result rows scroll"
Write-Host "- Table header remains visible"
Write-Host "- Outer page scrollbar is removed"
Write-Host "- No second scrollbar inside the table"