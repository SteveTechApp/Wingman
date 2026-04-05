param(
  [string]$Root = "C:\Users\steve\wingman"
)

$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )
  $dir = Split-Path $Path -Parent
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Update-FileText {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][scriptblock]$Transform
  )

  if (-not (Test-Path $Path)) {
    throw "File not found: $Path"
  }

  $old = Get-Content -Path $Path -Raw
  $new = & $Transform $old

  if (-not ($new -is [string])) {
    throw "Transform for $Path did not return a string."
  }

  if ($new -ne $old) {
    [System.IO.File]::WriteAllText($Path, $new, $utf8)
    Write-Host "Updated: $Path" -ForegroundColor Green
  }
  else {
    Write-Host "No change: $Path" -ForegroundColor DarkYellow
  }
}

if (-not (Test-Path $Root)) {
  throw "Root path not found: $Root"
}

Set-Location $Root

$mainPath = Join-Path $Root "src\main.tsx"
$cssPath  = Join-Path $Root "src\styles\wm-global-page-normalization.css"

$pageTargets = @(
  "src\features\dashboard\DashboardPage.tsx",
  "src\features\tools\ToolHubPage.tsx",
  "src\features\catalog\CatalogPage.tsx",
  "src\features\catalog\CataloguePage.tsx",
  "src\features\proposal\ProposalPage.tsx",
  "src\features\templates\TemplatesPage.tsx",
  "src\features\misc\videoWall\VideoWallPlannerRebuild.tsx",
  "src\features\sales\SalesPositioningPage.tsx",
  "src\features\discovery\DiscoveryWizardPage.tsx",
  "src\features\import\ImportIntakePage.tsx",
  "src\features\room-wizard\RoomWizardPage.tsx",
  "src\features\navigator\AvNavigatorPage.tsx",
  "src\features\compare\CompetitorComparePage.tsx",
  "src\features\misc\TrainingHubPage.tsx",
  "src\features\support\ProductIntelligencePage.tsx",
  "src\pages\ProjectOverviewPage.tsx"
) | ForEach-Object { Join-Path $Root $_ }

$css = @'
/* =========================================
   WINGMAN GLOBAL PAGE NORMALIZATION PASS
   Final structural familiarity layer
========================================= */

:root {
  --wmu-bg-0: #03101f;
  --wmu-bg-1: #07182c;
  --wmu-bg-2: #0a1f39;
  --wmu-surface-1: rgba(15, 23, 42, 0.88);
  --wmu-surface-2: rgba(15, 23, 42, 0.72);
  --wmu-surface-3: rgba(255,255,255,0.04);
  --wmu-line: rgba(148,163,184,0.12);
  --wmu-line-strong: rgba(96,165,250,0.24);
  --wmu-text-strong: #ffffff;
  --wmu-text: rgba(248,250,252,0.94);
  --wmu-text-soft: rgba(226,232,240,0.78);
  --wmu-text-muted: rgba(226,232,240,0.56);
  --wmu-blue-1: #2563eb;
  --wmu-blue-2: #38bdf8;
  --wmu-orange-1: #f59e0b;
  --wmu-orange-2: #f97316;
  --wmu-radius-sm: 12px;
  --wmu-radius-md: 16px;
  --wmu-radius-lg: 20px;
  --wmu-shadow:
    inset 0 1px 0 rgba(255,255,255,0.04),
    0 14px 34px rgba(2,8,23,0.18);
}

/* -----------------------------------------
   Page-level consistency
----------------------------------------- */

.wm-page,
.wm-fit-page,
.wmu-page {
  width: 100%;
  min-width: 0;
  min-height: 100%;
  display: grid;
  gap: 14px;
  align-content: start;
  color: var(--wmu-text);
}

.wm-page.wmu-adopt,
.wm-fit-page.wmu-adopt {
  grid-template-rows: auto minmax(0, 1fr);
}

.wm-page > *,
.wm-fit-page > *,
.wmu-page > * {
  min-width: 0;
}

.wm-page-kicker,
.wm-eyebrow,
.wm-section-kicker,
.wmu-page-kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #93c5fd;
}

.wm-page-title,
.wm-section-title,
.wm-h1,
.wmu-page-title,
.wm-page h1,
.wm-fit-page h1 {
  color: var(--wmu-text-strong);
  font-size: clamp(22px, 2.2vw, 28px);
  line-height: 1.05;
  font-weight: 900;
  letter-spacing: -0.02em;
  margin: 0;
}

.wm-page-copy,
.wm-section-copy,
.wm-subtitle,
.wmu-page-copy,
.wm-page p,
.wm-fit-page p {
  color: var(--wmu-text-soft);
  line-height: 1.45;
}

/* -----------------------------------------
   Hero split layout
----------------------------------------- */

.wm-hero-split,
.wmu-hero-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  align-items: start;
}

.wm-hero-compact {
  padding: 14px !important;
}

/* -----------------------------------------
   Grids
----------------------------------------- */

.wm-grid-2,
.wmu-grid-2 {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 14px;
  min-width: 0;
}

.wm-grid-3,
.wmu-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  min-width: 0;
}

.wmu-grid-auto {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

/* -----------------------------------------
   Panels / cards
----------------------------------------- */

.wm-panel,
.wmu-panel,
.wm-card,
.wmu-card,
.wm-surface-card,
.wm-surface-card--soft,
.wm-info-card,
.wm-product-card,
.wm-tool-card,
.wm-choice-card,
.wm-stat-card,
.wm-list-item {
  border-radius: var(--wmu-radius-md);
  border: 1px solid var(--wmu-line);
  color: var(--wmu-text);
}

.wm-panel,
.wmu-panel,
.wm-card,
.wmu-card,
.wm-surface-card,
.wm-info-card,
.wm-product-card,
.wm-tool-card,
.wm-choice-card,
.wm-stat-card {
  background: linear-gradient(180deg, var(--wmu-surface-1), var(--wmu-surface-2));
  box-shadow: var(--wmu-shadow);
}

.wm-surface-card--soft {
  background: var(--wmu-surface-3);
}

.wm-panel,
.wmu-panel,
.wm-card,
.wmu-card,
.wm-surface-card,
.wm-surface-card--soft,
.wm-info-card,
.wm-product-card,
.wm-tool-card,
.wm-choice-card,
.wm-stat-card {
  padding: 14px;
}

.wm-choice-card,
.wm-tool-card,
.wm-card,
.wm-info-card,
.wm-list-item {
  transition:
    transform 140ms ease,
    border-color 140ms ease,
    box-shadow 140ms ease,
    background 140ms ease;
}

.wm-choice-card:hover,
.wm-tool-card:hover,
.wm-card:hover,
.wm-info-card:hover,
.wm-list-item:hover {
  transform: translateY(-2px);
  border-color: var(--wmu-line-strong);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.05),
    0 18px 38px rgba(2,8,23,0.22);
}

/* -----------------------------------------
   Lists / selectors
----------------------------------------- */

.wm-list,
.wmu-list {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.wm-list-item,
.wmu-list-item {
  appearance: none;
  width: 100%;
  text-align: left;
  background: rgba(255,255,255,0.04);
  cursor: pointer;
  padding: 14px;
}

.wm-list-item--active,
.wmu-list-item--active {
  background: linear-gradient(135deg, rgba(37,99,235,0.24), rgba(56,189,248,0.14));
  border-color: rgba(56,189,248,0.35);
  box-shadow: 0 0 24px rgba(56,189,248,0.08);
}

.wm-list-item__title,
.wmu-list-item__title {
  color: #ffffff;
  font-size: 15px;
  font-weight: 800;
  margin-bottom: 4px;
}

.wm-list-item__meta,
.wmu-list-item__meta {
  color: var(--wmu-text-soft);
  font-size: 12px;
  line-height: 1.4;
}

/* -----------------------------------------
   Toolbars / actions
----------------------------------------- */

.wm-toolbar-row,
.wmu-toolbar-row,
.wm-action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.wm-toolbar-row--between,
.wmu-toolbar-row--between {
  justify-content: space-between;
}

.wm-toolbar-row--end,
.wmu-toolbar-row--end {
  justify-content: flex-end;
}

/* -----------------------------------------
   Buttons / chips
----------------------------------------- */

.wm-btn,
.wm-btn-primary,
.wm-btn-secondary,
.wm-chip,
button[class*="wm-btn"],
button[class*="wm-chip"] {
  appearance: none;
  border-radius: 999px;
  min-height: 38px;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition:
    transform 120ms ease,
    box-shadow 120ms ease,
    border-color 120ms ease,
    background 120ms ease;
}

.wm-btn:hover,
.wm-btn-primary:hover,
.wm-btn-secondary:hover,
.wm-chip:hover {
  transform: translateY(-1px);
}

.wm-btn-primary,
.wm-chip--active {
  color: #ffffff;
  border: 1px solid rgba(96,165,250,0.30);
  background: linear-gradient(135deg, var(--wmu-blue-1), var(--wmu-blue-2));
  box-shadow: 0 10px 22px rgba(37,99,235,0.18);
}

.wm-btn-secondary,
.wm-btn,
.wm-chip {
  color: var(--wmu-text);
  border: 1px solid var(--wmu-line);
  background: rgba(255,255,255,0.05);
}

/* -----------------------------------------
   Inputs
----------------------------------------- */

input,
select,
textarea {
  color: #ffffff;
  caret-color: #ffffff;
}

input[type="text"],
input[type="email"],
input[type="password"],
input[type="search"],
input[type="number"],
select,
textarea {
  width: 100%;
  background: rgba(2,8,23,0.52);
  border: 1px solid var(--wmu-line);
  border-radius: 14px;
  padding: 12px 14px;
  box-sizing: border-box;
}

input::placeholder,
textarea::placeholder {
  color: var(--wmu-text-muted);
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: rgba(56,189,248,0.42);
  box-shadow: 0 0 0 3px rgba(56,189,248,0.12);
}

/* -----------------------------------------
   Scroll regions
----------------------------------------- */

.wm-fit-page__scroll,
.wmu-scroll {
  min-height: 0;
  overflow: auto;
  display: grid;
  gap: 10px;
}

/* -----------------------------------------
   Mission control
----------------------------------------- */

.wm-nav {
  display: grid;
  gap: 14px;
  padding: 12px;
}

.wm-nav__section {
  display: grid;
  gap: 8px;
}

.wm-nav__title {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(148,163,184,0.70);
}

.wm-nav__items {
  display: grid;
  gap: 6px;
}

.wm-nav__item {
  appearance: none;
  border: 1px solid rgba(148,163,184,0.12);
  background: rgba(255,255,255,0.04);
  color: #e2e8f0;
  border-radius: 10px;
  padding: 8px 10px;
  min-height: 36px;
  font-size: 12px;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  transition: all 120ms ease;
}

.wm-nav__item:hover {
  background: rgba(255,255,255,0.08);
  transform: translateY(-1px);
}

.wm-nav__item--active {
  background: linear-gradient(135deg, rgba(37,99,235,0.35), rgba(56,189,248,0.25));
  border-color: rgba(96,165,250,0.28);
  color: #ffffff;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
}

/* -----------------------------------------
   Compact laptop layout
----------------------------------------- */

@media (max-width: 1280px) {
  .wm-page-title,
  .wm-section-title,
  .wm-h1,
  .wm-page h1,
  .wm-fit-page h1 {
    font-size: 24px;
  }

  .wm-panel,
  .wmu-panel,
  .wm-card,
  .wmu-card,
  .wm-surface-card,
  .wm-surface-card--soft,
  .wm-info-card,
  .wm-product-card,
  .wm-tool-card,
  .wm-choice-card,
  .wm-stat-card,
  .wm-list-item {
    padding: 12px;
  }
}

@media (max-width: 1180px) {
  .wm-hero-split,
  .wmu-hero-split,
  .wm-grid-2,
  .wmu-grid-2,
  .wm-grid-3,
  .wmu-grid-3 {
    grid-template-columns: 1fr;
  }

  .wm-toolbar-row--between,
  .wmu-toolbar-row--between {
    justify-content: flex-start;
  }
}
'@

Save-Utf8NoBom -Path $cssPath -Content $css
Write-Host "Created: $cssPath" -ForegroundColor Green

Update-FileText -Path $mainPath -Transform {
  param($text)

  $importLine = 'import "@/styles/wm-global-page-normalization.css";'

  if ($text -notmatch 'wm-global-page-normalization.css') {
    return $text.TrimEnd() + "`r`n" + $importLine + "`r`n"
  }

  return $text
}

foreach ($target in $pageTargets) {
  if (Test-Path $target) {
    Update-FileText -Path $target -Transform {
      param($text)

      if ($text -match 'className="wm-page"' -and $text -notmatch 'className="wm-page wmu-adopt"') {
        $text = $text -replace 'className="wm-page"', 'className="wm-page wmu-adopt"'
      }

      if ($text -match 'className="wm-fit-page"' -and $text -notmatch 'className="wm-fit-page wmu-adopt"') {
        $text = $text -replace 'className="wm-fit-page"', 'className="wm-fit-page wmu-adopt"'
      }

      if ($text -match 'className="wm-toolbar-row"' -and $text -notmatch 'wm-toolbar-row--') {
        # leave as-is; utility variants can be added page-by-page later
      }

      return $text
    }
  }
}

Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process esbuild -ErrorAction SilentlyContinue | Stop-Process -Force

$viteCachePath = Join-Path $Root "node_modules\.vite"
if (Test-Path $viteCachePath) {
  Remove-Item $viteCachePath -Recurse -Force
}

Set-Location $Root
npm run dev