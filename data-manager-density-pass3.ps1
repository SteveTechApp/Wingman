param(
    [string]$RepoRoot = (Get-Location).Path,
    [switch]$SkipValidation
)

$ErrorActionPreference = "Stop"

function Step([string]$Text) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor DarkCyan
    Write-Host $Text -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor DarkCyan
}

function Write-Utf8NoBom([string]$Path, [string]$Text) {
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Text, $utf8)
}

Step "1. Checking Wingman repository"

$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
Set-Location -LiteralPath $RepoRoot

if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot "package.json"))) {
    throw "package.json not found. Run this from the Wingman repository or pass -RepoRoot."
}

Step "2. Locating Data Manager source"

$dataPage = Get-ChildItem -LiteralPath (Join-Path $RepoRoot "src") -Recurse -File -Filter "*.tsx" |
    Where-Object {
        $_.Name -match "DataManager" -or
        (Select-String -LiteralPath $_.FullName -Pattern 'data-wingman-page="data-manager"|Data Manager' -Quiet -ErrorAction SilentlyContinue)
    } |
    Sort-Object @{Expression={if ($_.Name -eq "DataManagerPage.tsx") {0} else {1}}}, FullName |
    Select-Object -First 1

if (-not $dataPage) {
    throw "Could not locate DataManagerPage.tsx."
}

$pageText = Get-Content -LiteralPath $dataPage.FullName -Raw

if ($pageText -notmatch 'LIVE GOVERNANCE|Data Quality') {
    throw "The local Data Manager source does not contain the Live Governance / Data Quality markup. No changes made."
}

Write-Host "Data Manager: $($dataPage.FullName)" -ForegroundColor Green

Step "3. Locating the stylesheet used by the previous density patches"

$cssFiles = Get-ChildItem -LiteralPath (Join-Path $RepoRoot "src") -Recurse -File -Filter "*.css"

$styleFile = $cssFiles |
    Where-Object {
        Select-String -LiteralPath $_.FullName -Pattern 'WINGMAN DATA MANAGER DENSITY PATCH 2 - START|WINGMAN DATA MANAGER COMPACT VIEWPORT - START' -Quiet -ErrorAction SilentlyContinue
    } |
    Sort-Object FullName |
    Select-Object -First 1

if (-not $styleFile) {
    $styleFile = $cssFiles |
        Where-Object {
            Select-String -LiteralPath $_.FullName -Pattern '\.wm-data-manager-page|\.wm-data-toolbar|\.wm-data-table-card' -Quiet -ErrorAction SilentlyContinue
        } |
        Sort-Object FullName |
        Select-Object -First 1
}

if (-not $styleFile) {
    throw "Could not identify the shared Wingman stylesheet."
}

Write-Host "Stylesheet:   $($styleFile.FullName)" -ForegroundColor Green

Step "4. Creating backups"

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item -LiteralPath $dataPage.FullName -Destination "$($dataPage.FullName).$stamp.bak" -Force
Copy-Item -LiteralPath $styleFile.FullName -Destination "$($styleFile.FullName).$stamp.bak" -Force

Write-Host "Backups created with timestamp $stamp" -ForegroundColor DarkGray

Step "5. Adding an explicit class to the real governance section"

if ($pageText -notmatch 'wm-data-governance-compact') {
    $needleIndex = $pageText.IndexOf("LIVE GOVERNANCE")
    if ($needleIndex -lt 0) {
        $needleIndex = $pageText.IndexOf("Data Quality")
    }

    if ($needleIndex -lt 0) {
        throw "Unable to find the governance text in Data Manager."
    }

    $beforeNeedle = $pageText.Substring(0, $needleIndex)
    $sectionIndex = $beforeNeedle.LastIndexOf("<section")

    if ($sectionIndex -lt 0) {
        throw "Could not locate the section containing Live Governance."
    }

    $tagEnd = $pageText.IndexOf(">", $sectionIndex)
    if ($tagEnd -lt 0 -or $tagEnd -gt $needleIndex) {
        throw "Could not safely identify the Live Governance section opening tag."
    }

    $openTag = $pageText.Substring($sectionIndex, $tagEnd - $sectionIndex + 1)

    if ($openTag -match 'className="([^"]*)"') {
        $existingClass = $Matches[1]
        $newClass = ($existingClass + " wm-data-governance-compact").Trim()
        $newTag = $openTag -replace 'className="[^"]*"', ('className="' + $newClass + '"')
    }
    else {
        $newTag = $openTag.Substring(0, $openTag.Length - 1) + ' className="wm-data-governance-compact">'
    }

    $pageText = $pageText.Substring(0, $sectionIndex) + $newTag + $pageText.Substring($tagEnd + 1)
    Write-Utf8NoBom -Path $dataPage.FullName -Text $pageText
    Write-Host "Added wm-data-governance-compact to the actual governance section." -ForegroundColor Green
}
else {
    Write-Host "Governance section already has wm-data-governance-compact." -ForegroundColor DarkGray
}

Step "6. Installing precise density patch 3"

$css = Get-Content -LiteralPath $styleFile.FullName -Raw
$start = "/* WINGMAN DATA MANAGER DENSITY PATCH 3 - START */"
$end   = "/* WINGMAN DATA MANAGER DENSITY PATCH 3 - END */"

$removePattern = "(?s)\s*" + [regex]::Escape($start) + ".*?" + [regex]::Escape($end) + "\s*"
$css = [regex]::Replace($css, $removePattern, "`r`n")

$patch = @'
/* WINGMAN DATA MANAGER DENSITY PATCH 3 - START */

/*
  Explicitly target the real Live Governance section identified in
  DataManagerPage.tsx. This replaces the earlier generic selector.
*/
.wm-data-manager-page .wm-data-governance-compact {
  box-sizing: border-box !important;
  flex: 0 0 52px !important;
  width: 100% !important;
  height: 52px !important;
  min-height: 52px !important;
  max-height: 52px !important;
  margin: 0 !important;
  padding: 6px 12px !important;
  overflow: hidden !important;

  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 12px !important;
}

/* Neutralise old dashboard spacing/positioning inside this section. */
.wm-data-manager-page .wm-data-governance-compact * {
  min-height: 0 !important;
}

.wm-data-manager-page .wm-data-governance-compact > * {
  position: static !important;
  inset: auto !important;
  transform: none !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}

/*
  First child = label/assessment block in the current Data Manager.
  Keep it readable and stop LIVE GOVERNANCE / Data Quality overlapping.
*/
.wm-data-manager-page .wm-data-governance-compact > :first-child {
  flex: 0 0 165px !important;
  width: 165px !important;
  max-width: 165px !important;
  display: grid !important;
  grid-template-columns: 1fr !important;
  grid-auto-rows: min-content !important;
  align-content: center !important;
  gap: 0 !important;
  line-height: 1.05 !important;
  white-space: normal !important;
}

.wm-data-manager-page .wm-data-governance-compact > :first-child :is(h1,h2,h3,h4,p,span,small,strong) {
  position: static !important;
  inset: auto !important;
  transform: none !important;
  margin: 0 !important;
  line-height: 1.05 !important;
}

/*
  Remaining governance content is flattened into a single metric row.
*/
.wm-data-manager-page .wm-data-governance-compact > :not(:first-child) {
  flex: 1 1 auto !important;
  min-width: 0 !important;
  width: auto !important;
  height: 36px !important;
  max-height: 36px !important;
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 6px !important;
  overflow: hidden !important;
}

/* If metrics are nested one level deeper, flatten that wrapper too. */
.wm-data-manager-page .wm-data-governance-compact > :not(:first-child) > :is(div,ul) {
  flex: 1 1 auto !important;
  min-width: 0 !important;
  width: 100% !important;
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
  gap: 6px !important;
  margin: 0 !important;
  padding: 0 !important;
}

.wm-data-manager-page .wm-data-governance-compact
  :is(article,li,[class*="metric"],[class*="stat"],[class*="counter"]) {
  flex: 1 1 0 !important;
  min-width: 94px !important;
  width: auto !important;
  height: 32px !important;
  min-height: 32px !important;
  max-height: 32px !important;
  margin: 0 !important;
  padding: 4px 7px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  white-space: nowrap !important;
  line-height: 1 !important;
}

/*
  FILTER TOOLBAR
  Previous styles allowed the checkbox/add controls to fall onto a hidden
  second row. Force every direct child onto the same explicit grid row.
*/
@media (min-width: 1180px) {
  .wm-data-manager-page .wm-data-toolbar {
    box-sizing: border-box !important;
    display: grid !important;
    grid-template-columns:
      minmax(220px, 1.45fr)
      minmax(118px, .78fr)
      minmax(118px, .78fr)
      minmax(118px, .78fr)
      minmax(108px, .72fr)
      104px
      108px
      minmax(135px, .84fr) !important;
    grid-template-rows: 36px !important;
    grid-auto-flow: column !important;
    grid-auto-rows: 36px !important;

    height: 50px !important;
    min-height: 50px !important;
    max-height: 50px !important;
    padding: 7px 9px !important;
    margin: 0 !important;
    gap: 6px !important;
    align-items: center !important;
    overflow: hidden !important;
  }

  .wm-data-manager-page .wm-data-toolbar > * {
    grid-row: 1 !important;
    grid-column: auto !important;
    min-width: 0 !important;
    max-width: 100% !important;
    margin: 0 !important;
  }

  .wm-data-manager-page .wm-data-toolbar > :nth-child(1) { grid-column: 1 !important; }
  .wm-data-manager-page .wm-data-toolbar > :nth-child(2) { grid-column: 2 !important; }
  .wm-data-manager-page .wm-data-toolbar > :nth-child(3) { grid-column: 3 !important; }
  .wm-data-manager-page .wm-data-toolbar > :nth-child(4) { grid-column: 4 !important; }
  .wm-data-manager-page .wm-data-toolbar > :nth-child(5) { grid-column: 5 !important; }
  .wm-data-manager-page .wm-data-toolbar > :nth-child(6) { grid-column: 6 !important; }
  .wm-data-manager-page .wm-data-toolbar > :nth-child(7) { grid-column: 7 !important; }
  .wm-data-manager-page .wm-data-toolbar > :nth-child(8) { grid-column: 8 !important; }

  .wm-data-manager-page .wm-data-toolbar > label:not(.wm-data-search) {
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    justify-content: flex-start !important;
    gap: 4px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    font-size: 11px !important;
  }

  .wm-data-manager-page .wm-data-toolbar :is(input:not([type="checkbox"]),select,button) {
    width: 100% !important;
    min-width: 0 !important;
    height: 34px !important;
    min-height: 34px !important;
  }

  .wm-data-manager-page .wm-data-toolbar input[type="checkbox"] {
    flex: 0 0 14px !important;
    width: 14px !important;
    min-width: 14px !important;
    height: 14px !important;
    min-height: 14px !important;
    margin: 0 !important;
  }
}

/* Records retain every pixel reclaimed above. */
.wm-data-manager-page .wm-data-table-card {
  flex: 1 1 0 !important;
  min-height: 0 !important;
}

/* Keep table compact but readable. */
.wm-data-manager-page .wm-data-table-scroll tbody tr {
  height: 54px !important;
}

.wm-data-manager-page .wm-data-table-scroll tbody td {
  padding-top: 4px !important;
  padding-bottom: 4px !important;
}

/* Responsive fallback. */
@media (max-width: 1179px) {
  .wm-data-manager-page .wm-data-governance-compact {
    height: auto !important;
    max-height: none !important;
    min-height: 52px !important;
    flex-wrap: wrap !important;
  }

  .wm-data-manager-page .wm-data-toolbar {
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
  }
}

/* WINGMAN DATA MANAGER DENSITY PATCH 3 - END */
'@

$css = $css.TrimEnd() + "`r`n`r`n" + $patch.Trim() + "`r`n"
Write-Utf8NoBom -Path $styleFile.FullName -Text $css

Step "7. Sanity checks"

$pageCheck = Get-Content -LiteralPath $dataPage.FullName -Raw
$cssCheck  = Get-Content -LiteralPath $styleFile.FullName -Raw

if ($pageCheck -notmatch 'wm-data-governance-compact') {
    throw "Governance class was not installed."
}

if ($cssCheck -notmatch [regex]::Escape($start)) {
    throw "Density patch 3 CSS marker was not installed."
}

Write-Host "Markup and CSS checks passed." -ForegroundColor Green

if (-not $SkipValidation) {
    Step "8. Running typecheck"
    & npm run typecheck
    if ($LASTEXITCODE -ne 0) {
        throw "npm run typecheck failed. Timestamped backups are available."
    }

    Step "9. Running build"
    & npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "npm run build failed. Timestamped backups are available."
    }
}
else {
    Write-Host "Validation skipped (-SkipValidation)." -ForegroundColor Yellow
}

Step "10. Complete"

Write-Host "Precise Data Manager density patch installed." -ForegroundColor Green
Write-Host ""
Write-Host "Expected changes:"
Write-Host "  - governance panel collapses to ~52px"
Write-Host "  - LIVE GOVERNANCE / Data Quality text no longer overlaps"
Write-Host "  - all six governance counters sit on one row"
Write-Host "  - Incomplete only, Reported errors and Add Product return to the toolbar"
Write-Host "  - all filter controls sit on one desktop row"
Write-Host "  - records table gains the reclaimed height"
Write-Host "  - more product rows remain visible"
Write-Host ""
Write-Host "Refresh:"
Write-Host "  http://127.0.0.1:3000/wingman/admin/data-manager"
Write-Host ""
Write-Host "Do not commit until visually reviewed."
