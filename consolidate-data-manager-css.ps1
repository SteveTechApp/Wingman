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

Step "2. Creating CSS backup"

$Backup = "$CssFile.$Timestamp.bak"

Copy-Item `
    -LiteralPath $CssFile `
    -Destination $Backup `
    -Force

Write-Host "Backup created:" -ForegroundColor Green
Write-Host $Backup

Step "3. Removing superseded Data Manager override blocks"

$css = Get-Content -LiteralPath $CssFile -Raw

$patterns = @(
    '(?s)/\* WINGMAN_DATA_MANAGER_COMPACT_START \*/.*?/\* WINGMAN_DATA_MANAGER_COMPACT_END \*/',
    '(?s)/\* WINGMAN_DATA_MANAGER_ACTION_FILTER_START \*/.*?/\* WINGMAN_DATA_MANAGER_ACTION_FILTER_END \*/',
    '(?s)/\* WINGMAN_DATA_MANAGER_SINGLE_SCROLL_START \*/.*?/\* WINGMAN_DATA_MANAGER_SINGLE_SCROLL_END \*/',
    '(?s)/\* WINGMAN_DATA_MANAGER_RESULTS_SCROLL_START \*/.*?/\* WINGMAN_DATA_MANAGER_RESULTS_SCROLL_END \*/',
    '(?s)/\* DATA MANAGER - DATA QUALITY SUMMARY END \*/'
)

foreach ($pattern in $patterns) {
    $css = [regex]::Replace($css, $pattern, '')
}

Write-Host "Old Data Manager override blocks removed." -ForegroundColor Green

Step "4. Adding one consolidated Data Manager block"

$consolidated = @'

/* WINGMAN_DATA_MANAGER_FINAL_START */

.wm-data-manager-page {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.wm-data-manager-header,
.wm-data-tabs,
.wm-data-quality-summary,
.wm-data-toolbar {
  flex: 0 0 auto;
}

.wm-data-manager-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.wm-data-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 5px 0 7px;
}

.wm-data-tabs button {
  min-height: 30px;
  padding: 5px 10px;
  font-size: .82rem;
}

.wm-data-quality-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  margin-bottom: 7px;
}

.wm-data-quality-heading {
  flex: 0 0 145px;
}

.wm-data-quality-heading h2 {
  margin: 0;
  font-size: .95rem;
}

.wm-data-quality-heading small {
  display: block;
  margin-top: 2px;
  font-size: .72rem;
  opacity: .78;
}

.wm-data-quality-metrics {
  display: grid;
  grid-template-columns: repeat(7, minmax(90px, 1fr));
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
}

.wm-data-quality-metric {
  appearance: none;
  min-width: 0;
  min-height: 44px;
  padding: 6px 9px;
  border: 1px solid var(--wm-border);
  border-radius: 8px;
  background: rgba(255,255,255,.025);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.wm-data-quality-metric:hover,
.wm-data-quality-metric.is-active {
  border-color: var(--wm-accent);
  background: rgba(45,212,191,.10);
}

.wm-data-quality-metric strong {
  display: block;
  font-size: .95rem;
  line-height: 1;
}

.wm-data-quality-metric span {
  display: block;
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: .67rem;
}

.wm-data-quality-clear {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 5px;
  padding: 3px 6px;
  min-height: 24px;
  border: 1px solid var(--wm-border);
  border-radius: 6px;
  background: transparent;
  color: var(--wm-text-muted);
  cursor: pointer;
  font-size: .68rem;
}

.wm-data-toolbar {
  display: grid;
  grid-template-columns:
    minmax(240px,1.6fr)
    repeat(4,minmax(130px,.8fr))
    minmax(140px,.7fr);
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 7px;
}

.wm-data-toolbar input,
.wm-data-toolbar select,
.wm-data-toolbar button {
  min-height: 38px;
  height: 38px;
}

.wm-data-manager-page > section:last-of-type {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.wm-data-manager-page .wm-data-results,
.wm-data-manager-page .wm-data-records,
.wm-data-manager-page .wm-data-list,
.wm-data-manager-page .wm-data-table-wrap,
.wm-data-manager-page .wm-data-table-container,
.wm-data-manager-page .wm-table-wrap,
.wm-data-manager-page .wm-table-container {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}

.wm-data-manager-page table {
  width: 100%;
  height: auto;
}

.wm-data-manager-page thead {
  position: sticky;
  top: 0;
  z-index: 3;
  background: var(--wm-surface,#0b2134);
}

.wm-data-manager-page th {
  padding: 7px 8px;
  font-size: .72rem;
}

.wm-data-manager-page td {
  padding: 8px;
  vertical-align: middle;
}

.wm-data-manager-page th:last-child,
.wm-data-manager-page td:last-child {
  width: 120px;
  min-width: 120px;
  white-space: nowrap;
}

.wm-data-actions,
.wm-data-row-actions {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 5px;
}

.wm-data-icon-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  padding: 0;
  border-radius: 7px;
}

.wm-data-icon-action svg {
  width: 16px;
  height: 16px;
  margin: 0;
}

.wm-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border: 0;
}

body:has(.wm-data-manager-page),
html:has(.wm-data-manager-page) {
  overflow: hidden;
}

@media (max-width: 1250px) {
  .wm-data-quality-summary {
    align-items: flex-start;
    flex-direction: column;
  }

  .wm-data-quality-metrics {
    width: 100%;
    grid-template-columns: repeat(4,minmax(90px,1fr));
  }

  .wm-data-toolbar {
    grid-template-columns: repeat(3,minmax(160px,1fr));
  }
}

@media (max-width: 850px) {
  .wm-data-quality-metrics {
    grid-template-columns: repeat(2,minmax(0,1fr));
  }

  .wm-data-toolbar {
    grid-template-columns: 1fr;
  }

  .wm-data-manager-header {
    flex-direction: column;
  }
}

/* WINGMAN_DATA_MANAGER_FINAL_END */

'@

$css += "`r`n" + $consolidated

Set-Content `
    -LiteralPath $CssFile `
    -Value $css `
    -Encoding utf8

Step "5. Checking resulting CSS size"

$size = (Get-Item $CssFile).Length

Write-Host "wingman-workflow-theme.css size:" -ForegroundColor Cyan
Write-Host "$size bytes"

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

Step "8. Running size-budget check"

npm run check:size-budgets

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Size budget still exceeds limits." -ForegroundColor Yellow
    Write-Host "Do not increase budgets yet." -ForegroundColor Yellow
}
else {
    Write-Host "Size budgets passed." -ForegroundColor Green
}

Step "9. Running full verify"

npm run verify

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Full verify still has a failing guard." -ForegroundColor Yellow
}
else {
    Write-Host "Full verification passed." -ForegroundColor Green
}

Step "10. Complete"

git status -sb

Write-Host ""
Write-Host "Diff summary:" -ForegroundColor Cyan
git diff --stat

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "DATA MANAGER CSS CONSOLIDATION COMPLETE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green