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

function Save-Utf8($Path, $Content) {
    Set-Content -LiteralPath $Path -Value $Content -Encoding utf8
}

Step "1. Opening Wingman"

Set-Location $Repo

if (-not (Test-Path ".git")) {
    throw "Git repository not found: $Repo"
}

foreach ($file in @($PageFile, $CssFile)) {
    if (-not (Test-Path $file)) {
        throw "Required file not found: $file"
    }
}

git status -sb

Step "2. Creating backups"

Copy-Item $PageFile "$PageFile.$Timestamp.bak" -Force
Copy-Item $CssFile "$CssFile.$Timestamp.bak" -Force

Write-Host "Backups created." -ForegroundColor Green

# ============================================================
# 3. DATAMANAGERPAGE.TSX
# ============================================================

Step "3. Updating Data Manager behaviour"

$page = Get-Content -LiteralPath $PageFile -Raw

# ------------------------------------------------------------
# A. Add quality filter state
# ------------------------------------------------------------

if ($page -notmatch 'qualityFilter') {

    $stateAnchor = 'const \[query,\s*setQuery\]\s*=\s*useState\([^;]+;'

    $stateMatch = [regex]::Match($page, $stateAnchor)

    if (-not $stateMatch.Success) {
        throw "Could not safely locate query state in DataManagerPage.tsx"
    }

    $replacement = $stateMatch.Value + @'

  const [qualityFilter, setQualityFilter] = useState<ProductQualityIssue | null>(null);
'@

    $page = $page.Substring(0, $stateMatch.Index) +
            $replacement +
            $page.Substring($stateMatch.Index + $stateMatch.Length)

    Write-Host "Added quality filter state." -ForegroundColor Green
}
else {
    Write-Host "Quality filter state already exists." -ForegroundColor Yellow
}

# ------------------------------------------------------------
# B. Add record issue helper if missing
# ------------------------------------------------------------

if ($page -notmatch 'recordMatchesQualityFilter') {

    $helperAnchor = 'const isAdminSession'

    $index = $page.IndexOf($helperAnchor)

    if ($index -lt 0) {
        throw "Could not locate isAdminSession helper."
    }

    $helper = @'
function recordMatchesQualityFilter(
  record: ProductIntelligenceRecord,
  issue: ProductQualityIssue | null
): boolean {
  if (!issue) return true;

  const counts = qualityCounts([record]);
  return (counts[issue] ?? 0) > 0;
}

'@

    $page = $page.Insert($index, $helper)

    Write-Host "Added quality record matcher." -ForegroundColor Green
}

# ------------------------------------------------------------
# C. Add quality filter into visible records filtering
# ------------------------------------------------------------

if ($page -notmatch 'recordMatchesQualityFilter\(record,\s*qualityFilter\)') {

    $visiblePattern = '(const visible = useMemo\(\(\) => records\.filter\(\(record\) => \{\s*if \(record\.vendorType !== vendorType\) return false;)'

    if ($page -match $visiblePattern) {

        $page = [regex]::Replace(
            $page,
            $visiblePattern,
            '$1' + "`r`n    if (!recordMatchesQualityFilter(record, qualityFilter)) return false;",
            1
        )

        Write-Host "Connected quality filter to record list." -ForegroundColor Green
    }
    else {
        throw "Could not safely locate visible record filter."
    }
}

# ------------------------------------------------------------
# D. Ensure qualityFilter is part of useMemo dependencies
# ------------------------------------------------------------

# Find visible useMemo ending and add qualityFilter if not already present.
$visibleMemoPattern = '(?s)(const visible = useMemo\(\(\) => records\.filter.*?\),\s*\[)([^\]]*)(\]\);)'

$m = [regex]::Match($page, $visibleMemoPattern)

if ($m.Success) {

    $deps = $m.Groups[2].Value

    if ($deps -notmatch '\bqualityFilter\b') {

        $newDeps = $deps.Trim()

        if ($newDeps.Length -gt 0) {
            $newDeps += ", qualityFilter"
        }
        else {
            $newDeps = "qualityFilter"
        }

        $newBlock = $m.Groups[1].Value + $newDeps + $m.Groups[3].Value

        $page = $page.Substring(0, $m.Index) +
                $newBlock +
                $page.Substring($m.Index + $m.Length)

        Write-Host "Added qualityFilter dependency." -ForegroundColor Green
    }
}

# ------------------------------------------------------------
# E. Replace governance metric markup with buttons
# ------------------------------------------------------------

$metricPattern = '(?s)<div className="wm-data-quality-metric" key=\{issue\}>\s*<strong>\{dataQuality\[issue\] \?\? 0\}</strong>\s*<span>\{label\}</span>\s*</div>'

$metricReplacement = @'
<button
          type="button"
          className={`wm-data-quality-metric${qualityFilter === issue ? " is-active" : ""}`}
          key={issue}
          aria-pressed={qualityFilter === issue}
          title={`Filter records: ${label}`}
          onClick={() => setQualityFilter((current) => current === issue ? null : issue)}
        >
          <strong>{dataQuality[issue] ?? 0}</strong>
          <span>{label}</span>
        </button>
'@

if ($page -match $metricPattern) {

    $page = [regex]::Replace(
        $page,
        $metricPattern,
        [System.Text.RegularExpressions.MatchEvaluator]{
            param($m)
            return $metricReplacement
        }
    )

    Write-Host "Converted Data Quality metrics to buttons." -ForegroundColor Green
}
elseif ($page -match 'wm-data-quality-metric.*onClick') {
    Write-Host "Data Quality metrics already appear interactive." -ForegroundColor Yellow
}
else {
    throw "Could not safely locate Data Quality metric markup."
}

# ------------------------------------------------------------
# F. Add clear-filter indicator into quality heading
# ------------------------------------------------------------

if ($page -notmatch 'Clear quality filter') {

    $assessedPattern = '<small>\{vendorRecords\.length\} records assessed</small>'

    $assessedReplacement = @'
<small>{vendorRecords.length} records assessed</small>
    {qualityFilter ? (
      <button
        type="button"
        className="wm-data-quality-clear"
        onClick={() => setQualityFilter(null)}
        title="Clear quality filter"
      >
        <X aria-hidden="true" />
        <span>Clear filter</span>
      </button>
    ) : null}
'@

    if ($page -match $assessedPattern) {
        $page = [regex]::Replace(
            $page,
            $assessedPattern,
            [System.Text.RegularExpressions.MatchEvaluator]{
                param($m)
                return $assessedReplacement
            },
            1
        )
    }
}

# ------------------------------------------------------------
# G. Convert action buttons to icon only
# ------------------------------------------------------------

# Edit
$page = [regex]::Replace(
    $page,
    '<button([^>]*?)onClick=\{\(\) => ([^}]*?setEditing[^}]*)\}([^>]*)>\s*<Pencil\s*/>\s*Edit\s*</button>',
    '<button$1onClick={() => $2}$3 className="wm-data-icon-action" aria-label="Edit product" title="Edit"><Pencil /></button>'
)

# Generic text replacement fallback for existing action buttons.
$page = $page -replace '<Pencil\s*/>\s*Edit', '<Pencil /><span className="wm-sr-only">Edit</span>'
$page = $page -replace '<Copy\s*/>\s*Duplicate', '<Copy /><span className="wm-sr-only">Duplicate</span>'
$page = $page -replace '<Archive\s*/>\s*Archive', '<Archive /><span className="wm-sr-only">Archive</span>'

# Add icon-action class to buttons containing those icons where practical.
$page = $page -replace 'className="wm-button wm-button-secondary"(?=[^>]*>\s*<Pencil)', 'className="wm-button wm-button-secondary wm-data-icon-action"'
$page = $page -replace 'className="wm-button wm-button-secondary"(?=[^>]*>\s*<Copy)', 'className="wm-button wm-button-secondary wm-data-icon-action"'
$page = $page -replace 'className="wm-button wm-button-secondary"(?=[^>]*>\s*<Archive)', 'className="wm-button wm-button-secondary wm-data-icon-action"'

# Add accessible tooltip text where the existing JSX doesn't have it.
$page = $page -replace '<button([^>]*className="[^"]*wm-data-icon-action[^"]*"[^>]*)>\s*<Pencil', '<button$1 aria-label="Edit product" title="Edit"><Pencil'
$page = $page -replace '<button([^>]*className="[^"]*wm-data-icon-action[^"]*"[^>]*)>\s*<Copy', '<button$1 aria-label="Duplicate product" title="Duplicate"><Copy'
$page = $page -replace '<button([^>]*className="[^"]*wm-data-icon-action[^"]*"[^>]*)>\s*<Archive', '<button$1 aria-label="Archive product" title="Archive"><Archive'

Save-Utf8 $PageFile $page

Write-Host "Data Manager JSX updated." -ForegroundColor Green

# ============================================================
# 4. CSS
# ============================================================

Step "4. Updating compact Data Manager CSS"

$css = Get-Content -LiteralPath $CssFile -Raw

# Remove this script's block if rerun.
$css = [regex]::Replace(
    $css,
    '(?s)/\* WINGMAN_DATA_MANAGER_ACTION_FILTER_START \*/.*?/\* WINGMAN_DATA_MANAGER_ACTION_FILTER_END \*/',
    ''
)

$addition = @'

/* WINGMAN_DATA_MANAGER_ACTION_FILTER_START */

/* ---------------------------------------------
   Data Quality as compact interactive filters
   --------------------------------------------- */

.wm-data-quality-summary {
  padding: 8px 10px !important;
  gap: 10px !important;
}

.wm-data-quality-heading {
  flex: 0 0 145px !important;
}

.wm-data-quality-metrics {
  display: grid !important;
  grid-template-columns: repeat(7, minmax(90px, 1fr)) !important;
  gap: 6px !important;
}

.wm-data-quality-metric {
  appearance: none !important;
  width: 100% !important;
  min-width: 0 !important;
  min-height: 44px !important;
  margin: 0 !important;
  padding: 6px 9px !important;
  border: 1px solid var(--wm-border) !important;
  border-radius: 8px !important;
  background: rgba(255,255,255,.025) !important;
  color: inherit !important;
  text-align: left !important;
  cursor: pointer !important;
  transition:
    border-color .15s ease,
    background .15s ease,
    transform .15s ease !important;
}

.wm-data-quality-metric:hover {
  border-color: var(--wm-accent) !important;
  background: rgba(45,212,191,.07) !important;
}

.wm-data-quality-metric.is-active {
  border-color: var(--wm-accent) !important;
  background: rgba(45,212,191,.12) !important;
}

.wm-data-quality-metric strong {
  display: block !important;
  margin: 0 !important;
  font-size: .95rem !important;
  line-height: 1 !important;
}

.wm-data-quality-metric span {
  display: block !important;
  margin-top: 3px !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  font-size: .67rem !important;
}

.wm-data-quality-clear {
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  margin-top: 5px !important;
  padding: 3px 6px !important;
  min-height: 24px !important;
  border: 1px solid var(--wm-border) !important;
  border-radius: 6px !important;
  background: transparent !important;
  color: var(--wm-text-muted) !important;
  cursor: pointer !important;
  font-size: .68rem !important;
}

.wm-data-quality-clear svg {
  width: 12px !important;
  height: 12px !important;
}

/* ---------------------------------------------
   Product row actions - icon-only single line
   --------------------------------------------- */

.wm-data-manager-page td:last-child,
.wm-data-manager-page .wm-data-actions,
.wm-data-manager-page .wm-data-row-actions {
  white-space: nowrap !important;
}

.wm-data-icon-action {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 32px !important;
  height: 32px !important;
  min-width: 32px !important;
  min-height: 32px !important;
  padding: 0 !important;
  margin: 0 3px 0 0 !important;
  border-radius: 7px !important;
}

.wm-data-icon-action svg {
  width: 16px !important;
  height: 16px !important;
  margin: 0 !important;
}

.wm-data-manager-page td:last-child .wm-button {
  flex: 0 0 auto !important;
}

/* Ensure the actions cell stays compact */
.wm-data-manager-page th:last-child,
.wm-data-manager-page td:last-child {
  width: 120px !important;
  min-width: 120px !important;
  max-width: 120px !important;
}

/* Screen-reader-only accessible button text */
.wm-sr-only {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0,0,0,0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}

@media (max-width: 1250px) {
  .wm-data-quality-metrics {
    grid-template-columns: repeat(4, minmax(90px, 1fr)) !important;
  }
}

/* WINGMAN_DATA_MANAGER_ACTION_FILTER_END */
'@

Add-Content -LiteralPath $CssFile -Value $addition -Encoding utf8

Write-Host "CSS updated." -ForegroundColor Green

# ============================================================
# 5. VALIDATE
# ============================================================

Step "5. Running typecheck"

npm run typecheck

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "TYPECHECK FAILED." -ForegroundColor Red
    Write-Host "Backups:" -ForegroundColor Yellow
    Write-Host "$PageFile.$Timestamp.bak"
    Write-Host "$CssFile.$Timestamp.bak"
    exit $LASTEXITCODE
}

Step "6. Running tests"

npm test -- --run

if ($LASTEXITCODE -ne 0) {
    Write-Host "Tests failed." -ForegroundColor Red
    exit $LASTEXITCODE
}

Step "7. Running build"

npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed." -ForegroundColor Red
    exit $LASTEXITCODE
}

Step "8. Showing changes"

git status -sb

Write-Host ""
git diff --stat

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "DATA MANAGER ACTION/FILTER UPDATE COMPLETE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green

Write-Host ""
Write-Host "Restart/refresh Wingman and test:" -ForegroundColor Cyan
Write-Host "http://127.0.0.1:3000/wingman/admin/data-manager"
Write-Host ""
Write-Host "Check:" -ForegroundColor Cyan
Write-Host "1. Edit / Duplicate / Archive show as icons only"
Write-Host "2. All three actions remain on one line"
Write-Host "3. Hovering an icon shows its browser tooltip"
Write-Host "4. Clicking Missing I/O filters to those products"
Write-Host "5. Clicking Missing video filters to those products"
Write-Host "6. Clicking the active metric again clears that filter"
Write-Host "7. Clear filter also restores the complete list"