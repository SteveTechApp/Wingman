$ErrorActionPreference = "Stop"

$Repo = "C:\Users\steve\wingman"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

$PageFile = Join-Path $Repo "src\wingman2\pages\DataManagerPage.tsx"
$CssFile  = Join-Path $Repo "src\wingman2\styles\wingman-workflow-theme.css"

function Step($Message) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
}

Step "1. Opening Wingman repository"

Set-Location $Repo

if (-not (Test-Path ".git")) {
    throw "Wingman Git repository not found at $Repo"
}

if (-not (Test-Path $PageFile)) {
    throw "DataManagerPage.tsx not found."
}

if (-not (Test-Path $CssFile)) {
    throw "wingman-workflow-theme.css not found."
}

git status -sb

Step "2. Creating backups"

Copy-Item $PageFile "$PageFile.$Timestamp.bak" -Force
Copy-Item $CssFile "$CssFile.$Timestamp.bak" -Force

Write-Host "Backups created:" -ForegroundColor Green
Write-Host "$PageFile.$Timestamp.bak"
Write-Host "$CssFile.$Timestamp.bak"

Step "3. Updating Data Manager page layout classes"

$page = Get-Content -LiteralPath $PageFile -Raw

# Replace the existing quality summary section with a compact metric strip.
$oldQualityPattern = '(?s)<section className="wm-data-quality-summary wm-section-card".*?</section>'

$newQuality = @'
<section className="wm-data-quality-summary wm-section-card" aria-labelledby="data-quality-title">
  <div className="wm-data-quality-heading">
    <p className="wm-ui-kicker">Live governance</p>
    <h2 id="data-quality-title">Data Quality</h2>
    <small>{vendorRecords.length} records assessed</small>
  </div>

  <div className="wm-data-quality-metrics">
    {QUALITY_SUMMARY
      .filter(({ issue }) => issue !== "missing-equivalence-review" || vendorType === "competitor")
      .map(({ issue, label }) => (
        <div className="wm-data-quality-metric" key={issue}>
          <strong>{dataQuality[issue] ?? 0}</strong>
          <span>{label}</span>
        </div>
      ))}
  </div>
</section>
'@

if ($page -match $oldQualityPattern) {
    $page = [regex]::Replace(
        $page,
        $oldQualityPattern,
        [System.Text.RegularExpressions.MatchEvaluator]{
            param($m)
            return $newQuality
        },
        1
    )

    Write-Host "Data Quality markup compacted." -ForegroundColor Green
}
else {
    Write-Host "Existing Data Quality section pattern not found; page markup left unchanged." -ForegroundColor Yellow
}

Set-Content `
    -LiteralPath $PageFile `
    -Value $page `
    -Encoding utf8

Step "4. Replacing Data Manager layout CSS"

$css = Get-Content -LiteralPath $CssFile -Raw

# Remove previous Data Manager compact-layout block if this script has been run before.
$css = [regex]::Replace(
    $css,
    '(?s)/\* WINGMAN_DATA_MANAGER_COMPACT_START \*/.*?/\* WINGMAN_DATA_MANAGER_COMPACT_END \*/',
    ''
)

$compactCss = @'

/* WINGMAN_DATA_MANAGER_COMPACT_START */

/* Page shell: allow normal application/page scrolling only */
.wm-data-manager-page {
  min-height: auto !important;
  height: auto !important;
  overflow: visible !important;
  padding-bottom: 20px !important;
}

/* Remove nested scrolling from all Data Manager sections */
.wm-data-manager-page .wm-section-card,
.wm-data-manager-page .wm-data-table,
.wm-data-manager-page .wm-data-table-wrap,
.wm-data-manager-page .wm-data-results,
.wm-data-manager-page .wm-data-records,
.wm-data-manager-page .wm-data-list,
.wm-data-manager-page .wm-data-manager-content {
  max-height: none !important;
  height: auto !important;
  overflow-y: visible !important;
  overflow-x: visible !important;
}

/* Compact header */
.wm-data-manager-header {
  display: flex !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  gap: 16px !important;
  margin-bottom: 10px !important;
  padding: 0 !important;
}

.wm-data-manager-header h1 {
  margin: 2px 0 2px !important;
  line-height: 1.05 !important;
}

.wm-data-manager-header p {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}

/* Tabs */
.wm-data-tabs {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 4px !important;
  margin: 8px 0 10px !important;
  padding: 0 0 8px !important;
  overflow: visible !important;
}

.wm-data-tabs button {
  min-height: 30px !important;
  padding: 5px 10px !important;
  font-size: 0.82rem !important;
}

/* Compact data quality strip */
.wm-data-quality-summary {
  display: flex !important;
  align-items: center !important;
  gap: 14px !important;
  padding: 10px 12px !important;
  margin-bottom: 10px !important;
  min-height: 0 !important;
}

.wm-data-quality-heading {
  flex: 0 0 160px !important;
  min-width: 140px !important;
}

.wm-data-quality-heading .wm-ui-kicker {
  margin: 0 0 2px !important;
  font-size: 0.68rem !important;
}

.wm-data-quality-heading h2 {
  margin: 0 !important;
  font-size: 0.95rem !important;
}

.wm-data-quality-heading small {
  display: block !important;
  margin-top: 2px !important;
  font-size: 0.72rem !important;
  opacity: 0.78 !important;
}

.wm-data-quality-metrics {
  display: grid !important;
  grid-template-columns: repeat(7, minmax(86px, 1fr)) !important;
  gap: 7px !important;
  flex: 1 1 auto !important;
  min-width: 0 !important;
}

.wm-data-quality-metric {
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  min-height: 46px !important;
  padding: 6px 8px !important;
  border: 1px solid var(--wm-border) !important;
  border-radius: 8px !important;
  background: rgba(255,255,255,0.025) !important;
}

.wm-data-quality-metric strong {
  font-size: 1rem !important;
  line-height: 1 !important;
}

.wm-data-quality-metric span {
  margin-top: 3px !important;
  font-size: 0.68rem !important;
  line-height: 1.15 !important;
  opacity: 0.8 !important;
}

/* Toolbar: compact desktop row */
.wm-data-toolbar {
  display: grid !important;
  grid-template-columns:
    minmax(240px, 1.6fr)
    minmax(140px, 0.8fr)
    minmax(140px, 0.8fr)
    minmax(140px, 0.8fr)
    minmax(120px, 0.7fr)
    minmax(140px, 0.7fr) !important;
  gap: 8px !important;
  align-items: center !important;
  padding: 10px 12px !important;
  margin-bottom: 10px !important;
}

.wm-data-toolbar input,
.wm-data-toolbar select,
.wm-data-toolbar button {
  min-height: 38px !important;
  height: 38px !important;
}

.wm-data-toolbar .wm-data-search {
  min-width: 0 !important;
}

/* Secondary toolbar controls */
.wm-data-toolbar label:not(.wm-data-search) {
  min-height: 30px !important;
  padding: 2px 0 !important;
}

/* Results/list card */
.wm-data-manager-page .wm-data-results,
.wm-data-manager-page .wm-data-records,
.wm-data-manager-page .wm-data-list,
.wm-data-manager-page section:has(.wm-data-table) {
  padding: 10px 12px !important;
}

/* Product row density */
.wm-data-manager-page table {
  width: 100% !important;
  table-layout: auto !important;
}

.wm-data-manager-page th {
  padding: 7px 8px !important;
  font-size: 0.72rem !important;
}

.wm-data-manager-page td {
  padding: 8px !important;
  vertical-align: middle !important;
}

.wm-data-manager-page .wm-button {
  min-height: 30px !important;
  padding: 5px 9px !important;
}

/* Prevent internal table/body scroll */
.wm-data-manager-page tbody,
.wm-data-manager-page table,
.wm-data-manager-page .wm-data-table {
  display: table-row-group;
  overflow: visible !important;
  max-height: none !important;
}

/* Restore normal table semantics where needed */
.wm-data-manager-page table {
  display: table !important;
}

.wm-data-manager-page thead {
  display: table-header-group !important;
}

.wm-data-manager-page tbody {
  display: table-row-group !important;
}

.wm-data-manager-page tr {
  display: table-row !important;
}

.wm-data-manager-page th,
.wm-data-manager-page td {
  display: table-cell !important;
}

/* Responsive */
@media (max-width: 1250px) {
  .wm-data-quality-summary {
    align-items: flex-start !important;
    flex-direction: column !important;
  }

  .wm-data-quality-heading {
    flex: none !important;
  }

  .wm-data-quality-metrics {
    width: 100% !important;
    grid-template-columns: repeat(4, minmax(100px, 1fr)) !important;
  }

  .wm-data-toolbar {
    grid-template-columns: repeat(3, minmax(160px, 1fr)) !important;
  }
}

@media (max-width: 850px) {
  .wm-data-quality-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  .wm-data-toolbar {
    grid-template-columns: 1fr !important;
  }

  .wm-data-manager-header {
    flex-direction: column !important;
  }
}

/* WINGMAN_DATA_MANAGER_COMPACT_END */
'@

Add-Content `
    -LiteralPath $CssFile `
    -Value $compactCss `
    -Encoding utf8

Write-Host "Compact Data Manager CSS applied." -ForegroundColor Green

Step "5. Running typecheck"

npm run typecheck

if ($LASTEXITCODE -ne 0) {
    throw "Typecheck failed. Backups are available with timestamp $Timestamp."
}

Step "6. Running build"

npm run build

if ($LASTEXITCODE -ne 0) {
    throw "Build failed. Backups are available with timestamp $Timestamp."
}

Step "7. Running full verify"

npm run verify

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "npm run verify failed." -ForegroundColor Yellow
    Write-Host "The layout patch remains in place for inspection." -ForegroundColor Yellow
    Write-Host "Run npm run verify separately to inspect the failing guard." -ForegroundColor Yellow
}
else {
    Write-Host "Full verification passed." -ForegroundColor Green
}

Step "8. Complete"

git status -sb

Write-Host ""
Write-Host "Diff summary:" -ForegroundColor Cyan
git diff --stat

Write-Host ""
Write-Host "Start Wingman with:" -ForegroundColor Cyan
Write-Host "npm run dev"

Write-Host ""
Write-Host "Then refresh:" -ForegroundColor Cyan
Write-Host "http://127.0.0.1:3000/wingman/admin/data-manager"

Write-Host ""
Write-Host "Expected result:" -ForegroundColor Green
Write-Host "- One main vertical page scroll"
Write-Host "- No nested product-list scrollbar"
Write-Host "- Much shorter Data Quality section"
Write-Host "- Compact filter controls"
Write-Host "- More product rows visible in the viewport"