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

Step "1. Checking repository"

$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
Set-Location -LiteralPath $RepoRoot

if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot "package.json"))) {
    throw "package.json not found. Run this from the Wingman repository or pass -RepoRoot."
}

Step "2. Locating Data Manager and active stylesheet"

$dataPage = Get-ChildItem -LiteralPath (Join-Path $RepoRoot "src") -Recurse -File -Filter "*.tsx" |
    Where-Object {
        $_.Name -match "DataManager" -or
        (Select-String -LiteralPath $_.FullName -Pattern 'data-wingman-page="data-manager"|Data Manager' -Quiet -ErrorAction SilentlyContinue)
    } |
    Sort-Object @{Expression={if ($_.Name -eq "DataManagerPage.tsx") {0} else {1}}}, FullName |
    Select-Object -First 1

if (-not $dataPage) {
    throw "Could not locate the Data Manager TSX file."
}

$pageText = Get-Content -LiteralPath $dataPage.FullName -Raw
foreach ($required in @("wm-data-manager-page","wm-data-tabs","wm-data-toolbar","wm-data-table-card")) {
    if ($pageText -notmatch [regex]::Escape($required)) {
        throw "Expected Data Manager class '$required' was not found. No changes made."
    }
}

$cssFiles = Get-ChildItem -LiteralPath (Join-Path $RepoRoot "src") -Recurse -File -Filter "*.css"
$styleFile = $cssFiles |
    Where-Object {
        Select-String -LiteralPath $_.FullName -Pattern 'WINGMAN DATA MANAGER COMPACT VIEWPORT - START|\.wm-data-manager-page|\.wm-data-table-card' -Quiet -ErrorAction SilentlyContinue
    } |
    Sort-Object @{
        Expression = {
            if (Select-String -LiteralPath $_.FullName -Pattern 'WINGMAN DATA MANAGER COMPACT VIEWPORT - START' -Quiet -ErrorAction SilentlyContinue) { 0 } else { 1 }
        }
    }, FullName |
    Select-Object -First 1

if (-not $styleFile) {
    throw "Could not identify the Wingman stylesheet containing Data Manager rules."
}

Write-Host "Data Manager: $($dataPage.FullName)" -ForegroundColor Green
Write-Host "Stylesheet:   $($styleFile.FullName)" -ForegroundColor Green

Step "3. Creating timestamped backups"

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item -LiteralPath $dataPage.FullName -Destination "$($dataPage.FullName).$stamp.bak" -Force
Copy-Item -LiteralPath $styleFile.FullName -Destination "$($styleFile.FullName).$stamp.bak" -Force

Write-Host "Backups created: $stamp" -ForegroundColor DarkGray

Step "4. Installing Data Manager density patch 2"

$css = Get-Content -LiteralPath $styleFile.FullName -Raw

$start = "/* WINGMAN DATA MANAGER DENSITY PATCH 2 - START */"
$end   = "/* WINGMAN DATA MANAGER DENSITY PATCH 2 - END */"

# Make the patch re-runnable.
$pattern = "(?s)\s*" + [regex]::Escape($start) + ".*?" + [regex]::Escape($end) + "\s*"
$css = [regex]::Replace($css, $pattern, "`r`n")

$patch = @'
/* WINGMAN DATA MANAGER DENSITY PATCH 2 - START */
/*
  Purpose:
  - collapse the large Live Governance / Data Quality panel
  - keep all metrics visible
  - force filters into one desktop row
  - return the reclaimed height to the records table
*/

/*
  In the current Data Manager DOM, the governance/data-quality panel is the
  section directly after the dataset tabs. The toolbar is explicitly excluded
  so this remains safe on builds where governance is absent.
*/
.wm-data-manager-page .wm-data-tabs + section:not(.wm-data-toolbar) {
  flex: 0 0 auto !important;
  height: 58px !important;
  min-height: 58px !important;
  max-height: 58px !important;
  margin: 0 !important;
  padding: 7px 12px !important;
  overflow: hidden !important;
  display: grid !important;
  grid-template-columns: 165px minmax(0, 1fr) !important;
  align-items: center !important;
  column-gap: 10px !important;
  row-gap: 0 !important;
}

/* Remove large internal spacing/min-heights from the governance block. */
.wm-data-manager-page .wm-data-tabs + section:not(.wm-data-toolbar) > * {
  min-height: 0 !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}

.wm-data-manager-page .wm-data-tabs + section:not(.wm-data-toolbar) h1,
.wm-data-manager-page .wm-data-tabs + section:not(.wm-data-toolbar) h2,
.wm-data-manager-page .wm-data-tabs + section:not(.wm-data-toolbar) h3,
.wm-data-manager-page .wm-data-tabs + section:not(.wm-data-toolbar) p {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  line-height: 1.05 !important;
}

/*
  The first child is normally the LIVE GOVERNANCE / Data Quality label block.
  Keep it compact at the left.
*/
.wm-data-manager-page .wm-data-tabs + section:not(.wm-data-toolbar) > :first-child {
  align-self: center !important;
  min-width: 0 !important;
}

/*
  Any metric container after the label block is flattened into a compact row.
  This catches the current implementation without depending on its exact class.
*/
.wm-data-manager-page .wm-data-tabs + section:not(.wm-data-toolbar) > :not(:first-child) {
  min-width: 0 !important;
  align-self: center !important;
}

.wm-data-manager-page .wm-data-tabs + section:not(.wm-data-toolbar) > :not(:first-child):has(> *) {
  display: grid !important;
  grid-auto-flow: column !important;
  grid-auto-columns: minmax(105px, 1fr) !important;
  gap: 6px !important;
  align-items: center !important;
}

/* Metric cards/counters themselves. */
.wm-data-manager-page .wm-data-tabs + section:not(.wm-data-toolbar)
  :is(article, li, [class*="metric"], [class*="stat"], [class*="quality"], [class*="counter"]) {
  min-height: 30px !important;
  height: 30px !important;
  max-height: 30px !important;
  padding: 4px 7px !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  white-space: nowrap !important;
  line-height: 1 !important;
}

/*
  Filter toolbar:
  force all eight controls onto one row at the desktop width shown in the
  supplied screenshot. Exact columns are deliberately narrow but readable.
*/
@media (min-width: 1180px) {
  .wm-data-manager-page .wm-data-toolbar {
    display: grid !important;
    grid-template-columns:
      minmax(245px, 1.55fr)
      minmax(125px, .78fr)
      minmax(125px, .78fr)
      minmax(125px, .78fr)
      minmax(115px, .7fr)
      105px
      105px
      minmax(145px, .82fr) !important;
    grid-template-rows: 36px !important;
    grid-auto-rows: 36px !important;
    align-items: center !important;
    gap: 6px !important;
    min-height: 50px !important;
    max-height: 50px !important;
    padding: 7px 9px !important;
    overflow: hidden !important;
  }

  .wm-data-manager-page .wm-data-toolbar > * {
    min-width: 0 !important;
    margin: 0 !important;
  }

  .wm-data-manager-page .wm-data-toolbar > label:not(.wm-data-search) {
    display: flex !important;
    align-items: center !important;
    gap: 5px !important;
    white-space: nowrap !important;
    font-size: 12px !important;
  }

  .wm-data-manager-page .wm-data-toolbar :is(input, select, button) {
    height: 34px !important;
    min-height: 34px !important;
  }

  .wm-data-manager-page .wm-data-toolbar input[type="checkbox"] {
    width: 14px !important;
    height: 14px !important;
    min-height: 14px !important;
    flex: 0 0 14px !important;
  }
}

/* Give every recovered pixel to the records workspace. */
.wm-data-manager-page .wm-data-table-card {
  flex: 1 1 0 !important;
  min-height: 0 !important;
  margin-top: 0 !important;
}

/* A little more table density without making the rows cramped. */
.wm-data-manager-page .wm-data-table-scroll tbody tr {
  height: 55px !important;
  min-height: 55px !important;
}

.wm-data-manager-page .wm-data-table-scroll tbody td {
  padding-top: 5px !important;
  padding-bottom: 5px !important;
}

.wm-data-manager-page .wm-data-table-card > header {
  min-height: 36px !important;
  padding-bottom: 5px !important;
}

/*
  If the viewport becomes too narrow, allow the filter toolbar to wrap naturally
  rather than introducing horizontal page scrolling.
*/
@media (max-width: 1179px) {
  .wm-data-manager-page .wm-data-toolbar {
    max-height: none !important;
    overflow: visible !important;
  }

  .wm-data-manager-page .wm-data-tabs + section:not(.wm-data-toolbar) {
    height: auto !important;
    max-height: none !important;
    min-height: 58px !important;
  }
}
/* WINGMAN DATA MANAGER DENSITY PATCH 2 - END */
'@

$css = $css.TrimEnd() + "`r`n`r`n" + $patch.Trim() + "`r`n"
Write-Utf8NoBom -Path $styleFile.FullName -Text $css

Step "5. Verifying patch installation"

$check = Get-Content -LiteralPath $styleFile.FullName -Raw
if ($check -notmatch [regex]::Escape($start)) {
    throw "Patch marker was not written successfully."
}

if ($check -notmatch 'wm-data-tabs \+ section:not\(\.wm-data-toolbar\)') {
    throw "Governance compaction selector is missing."
}

Write-Host "Density patch 2 installed." -ForegroundColor Green

if (-not $SkipValidation) {
    Step "6. Running typecheck"
    & npm run typecheck
    if ($LASTEXITCODE -ne 0) {
        throw "npm run typecheck failed. Restore from the timestamped backup if required."
    }

    Step "7. Running build"
    & npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "npm run build failed. Restore from the timestamped backup if required."
    }
}
else {
    Write-Host "Validation skipped (-SkipValidation)." -ForegroundColor Yellow
}

Step "8. Complete"

Write-Host "Patch installed successfully." -ForegroundColor Green
Write-Host ""
Write-Host "Expected visual result:"
Write-Host "  - Live Governance / Data Quality reduced to about 58px"
Write-Host "  - all governance metrics remain visible"
Write-Host "  - filters fit on one row at the current desktop viewport"
Write-Host "  - records area gains roughly 140-180px"
Write-Host "  - around 7-9 product rows should now be visible"
Write-Host ""
Write-Host "Refresh:"
Write-Host "  http://127.0.0.1:3000/wingman/admin/data-manager"
Write-Host ""
Write-Host "Do not commit yet; visually review the result first."
