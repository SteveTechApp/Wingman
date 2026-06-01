#requires -version 5.1
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==> Installing Wingman task-first layout override" -ForegroundColor Cyan
Write-Host ""

$Root = Get-Location
$PackageJson = Join-Path $Root "package.json"

if (!(Test-Path $PackageJson)) {
    Write-Host "ERROR: package.json was not found. Run this from the Wingman project root." -ForegroundColor Red
    exit 1
}

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDir = Join-Path $Root "backups\task-first-layout-$Stamp"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

function Backup-File {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path
    )

    if (!(Test-Path $Path)) {
        return
    }

    $resolved = Resolve-Path $Path
    $relative = $resolved.Path.Substring($Root.Path.Length).TrimStart('\')
    $backupPath = Join-Path $BackupDir $relative
    $backupFolder = Split-Path $backupPath -Parent

    New-Item -ItemType Directory -Force -Path $backupFolder | Out-Null
    Copy-Item -Path $Path -Destination $backupPath -Force
}

function Save-Utf8NoBomNoBackup {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path,

        [Parameter(Mandatory = $true)]
        [string] $Content
    )

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Append-TextIfMissing {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path,

        [Parameter(Mandatory = $true)]
        [string] $Needle,

        [Parameter(Mandatory = $true)]
        [string] $AppendText
    )

    if (!(Test-Path $Path)) {
        return
    }

    $content = Get-Content -Path $Path -Raw

    if ($content.Contains($Needle)) {
        Write-Host "Task-first layout CSS already installed." -ForegroundColor DarkGray
        return
    }

    Backup-File -Path $Path

    $updated = $content.TrimEnd() + "`r`n`r`n" + $AppendText.Trim() + "`r`n"
    Save-Utf8NoBomNoBackup -Path $Path -Content $updated
}

$CssCandidates = @(
    "src\wingman2\styles\wingman.css",
    "src\wingman2\styles\wingman2.css",
    "src\index.css",
    "src\main.css",
    "src\App.css"
)

$CssPath = $null

foreach ($candidate in $CssCandidates) {
    $full = Join-Path $Root $candidate

    if (Test-Path $full) {
        $CssPath = $full
        break
    }
}

if ($null -eq $CssPath) {
    Write-Host "ERROR: Could not find the active Wingman CSS file." -ForegroundColor Red
    exit 1
}

Write-Host "Using CSS file:" -ForegroundColor Green
Write-Host $CssPath

Append-TextIfMissing -Path $CssPath -Needle "/* WINGMAN TASK FIRST LAYOUT START */" -AppendText @'
/* WINGMAN TASK FIRST LAYOUT START */

/*
  Task-first layout rule:
  The page header should orient the user.
  The workspace should own the screen.
*/

/* Hide failed/experimental utility dock while layout is stabilised. */
.wm-force-utility-dock,
.wm-header-dock,
.wm-topbar-utility-actions,
.wm-audience-coaching-panel {
  display: none !important;
}

/* Reduce global page gutters. */
main,
[class*="page" i],
[class*="workspace" i] {
  --wingman-task-gap: 10px;
}

/* App content should start higher and use available width. */
main,
.wm-page,
.wm-main,
.wm-content,
.wingman-content,
[class*="PageFrame"],
[class*="page-frame"],
[class*="Content"],
[class*="content"] {
  padding-top: 8px !important;
}

/* Convert hero/banner panels into compact command strips. */
[class*="hero" i],
[class*="PageHero"],
[class*="Hero"],
.wm-hero,
.wm-page-hero,
.wingman-hero,
[data-wingman-hero="true"],
section:has(> div > h1):has(a[href*="/wingman/projects"]),
section:has(> h1):has(a[href*="/wingman/projects"]) {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  align-items: center !important;
  min-height: 0 !important;
  max-height: 96px !important;
  overflow: hidden !important;
  margin: 6px 0 10px !important;
  padding: 12px 16px !important;
  border-radius: 18px !important;
}

/* Hero titles become page labels, not billboards. */
[class*="hero" i] h1,
[class*="PageHero"] h1,
[class*="Hero"] h1,
.wm-hero h1,
.wm-page-hero h1,
.wingman-hero h1,
[data-wingman-hero="true"] h1,
section:has(a[href*="/wingman/projects"]) h1 {
  margin: 0 !important;
  max-width: 760px !important;
  font-size: clamp(1.5rem, 2.4vw, 2.35rem) !important;
  line-height: 0.98 !important;
  letter-spacing: -0.045em !important;
}

/* Hero kicker text stays but gets compact. */
[class*="hero" i] [class*="eyebrow" i],
[class*="PageHero"] [class*="eyebrow" i],
[class*="Hero"] [class*="eyebrow" i],
.wm-hero [class*="eyebrow" i],
.wm-page-hero [class*="eyebrow" i],
.wingman-hero [class*="eyebrow" i] {
  margin-bottom: 5px !important;
  font-size: 0.62rem !important;
  letter-spacing: 0.14em !important;
}

/* Hide hero explanatory paragraphs on task pages unless they are inside the actual workspace. */
[class*="hero" i] p,
[class*="PageHero"] p,
[class*="Hero"] p,
.wm-hero p,
.wm-page-hero p,
.wingman-hero p,
[data-wingman-hero="true"] p {
  display: none !important;
}

/* Make hero action buttons compact and inline. */
[class*="hero" i] a,
[class*="hero" i] button,
[class*="PageHero"] a,
[class*="PageHero"] button,
[class*="Hero"] a,
[class*="Hero"] button,
.wm-hero a,
.wm-hero button,
.wm-page-hero a,
.wm-page-hero button,
.wingman-hero a,
.wingman-hero button {
  min-height: 30px !important;
  padding: 6px 12px !important;
  font-size: 0.76rem !important;
  border-radius: 999px !important;
}

/* The helper cards on the right of hero are too prominent. */
[class*="hero" i] article,
[class*="PageHero"] article,
[class*="Hero"] article,
.wm-hero article,
.wm-page-hero article,
.wingman-hero article {
  min-height: 0 !important;
  padding: 8px 12px !important;
  border-radius: 14px !important;
}

[class*="hero" i] article p,
[class*="PageHero"] article p,
[class*="Hero"] article p,
.wm-hero article p,
.wm-page-hero article p,
.wingman-hero article p {
  display: none !important;
}

/* Workspace card moves closer to top and becomes the main screen object. */
[class*="workspace" i],
[class*="Workspace"],
.wm-workspace,
.wingman-workspace {
  margin-top: 8px !important;
}

[class*="workspace-card" i],
[class*="WorkspaceCard"],
[class*="workspace-panel" i],
[class*="WorkspacePanel"],
.wm-workspace-card,
.wm-workspace-panel,
.wingman-workspace-card,
section:has(input[placeholder*="Search"]) {
  margin-top: 8px !important;
  padding: 12px !important;
  border-radius: 20px !important;
}

/* Workspace header should not consume a row. */
[class*="workspace" i] > header,
[class*="Workspace"] > header,
.wm-workspace > header,
.wingman-workspace > header,
section:has(input[placeholder*="Search"]) > header {
  min-height: 0 !important;
  padding: 8px 10px !important;
}

/* Workspace titles are functional labels. */
[class*="workspace" i] h1,
[class*="Workspace"] h1,
[class*="workspace" i] h2,
[class*="Workspace"] h2,
.wm-workspace h1,
.wm-workspace h2,
.wingman-workspace h1,
.wingman-workspace h2 {
  margin: 0 !important;
  font-size: clamp(1rem, 1.4vw, 1.35rem) !important;
  line-height: 1.1 !important;
}

/* Category/filter chips should occupy less height. */
[class*="filter" i],
[class*="Filter"],
[class*="category" i],
[class*="Category"],
[class*="tabs" i],
[class*="Tabs"] {
  gap: 8px !important;
  margin-bottom: 8px !important;
}

[class*="filter" i] button,
[class*="Filter"] button,
[class*="category" i] button,
[class*="Category"] button,
[class*="tabs" i] button,
[class*="Tabs"] button,
button[class*="chip" i],
button[class*="pill" i] {
  min-height: 30px !important;
  padding: 6px 11px !important;
  font-size: 0.76rem !important;
  border-radius: 999px !important;
}

/* Search bars should not create a large visual dead-zone. */
input[type="search"],
input[placeholder*="Search"],
input[placeholder*="search"] {
  min-height: 34px !important;
  height: 34px !important;
  padding-top: 6px !important;
  padding-bottom: 6px !important;
}

/* Release internal scroll panels where possible so content uses page height. */
[class*="scroll" i],
[class*="Scroll"],
[class*="list" i],
[class*="List"] {
  scrollbar-gutter: stable !important;
}

/* Template/product result areas should show more cards before scrolling. */
section:has(input[placeholder*="Search"]) [class*="grid" i],
section:has(input[placeholder*="Search"]) [class*="Grid"],
section:has(input[placeholder*="Search"]) [class*="list" i],
section:has(input[placeholder*="Search"]) [class*="List"],
[class*="template" i] [class*="grid" i],
[class*="Template"] [class*="Grid"],
[class*="product" i] [class*="grid" i],
[class*="Product"] [class*="Grid"] {
  gap: 10px !important;
}

/* Remove fixed shallow heights that trap template/product cards. */
section:has(input[placeholder*="Search"]) > div,
section:has(input[placeholder*="Search"]) > div > div,
[class*="template" i] > div,
[class*="Template"] > div,
[class*="product" i] > div,
[class*="Product"] > div {
  max-height: none !important;
}

/* Cards become denser, but still readable. */
[class*="card" i],
[class*="Card"] {
  border-radius: 16px !important;
}

[class*="card" i] h2,
[class*="Card"] h2,
[class*="card" i] h3,
[class*="Card"] h3 {
  margin-top: 0 !important;
  margin-bottom: 5px !important;
  line-height: 1.12 !important;
}

[class*="card" i] p,
[class*="Card"] p {
  font-size: 0.88rem !important;
  line-height: 1.32 !important;
}

/* Images inside template cards should not dominate the card height. */
[class*="template" i] img,
[class*="Template"] img,
[class*="room" i] img,
[class*="Room"] img {
  max-height: 150px !important;
  object-fit: cover !important;
}

/* Dashboard journey strip and similar progress strips should be compact. */
[class*="journey" i],
[class*="Journey"],
[class*="progress" i],
[class*="Progress"] {
  min-height: 0 !important;
  padding: 8px !important;
  gap: 8px !important;
}

[class*="journey" i] button,
[class*="Journey"] button,
[class*="progress" i] button,
[class*="Progress"] button {
  min-height: 34px !important;
  padding: 6px 10px !important;
}

/* Tighten the left rail so it does not dominate vertical space. */
aside nav a,
aside nav button,
[class*="sidebar" i] nav a,
[class*="Sidebar"] nav a,
[class*="sidebar" i] nav button,
[class*="Sidebar"] nav button {
  min-height: 34px !important;
  padding-top: 7px !important;
  padding-bottom: 7px !important;
  font-size: 0.86rem !important;
}

/* Brand block should be present but smaller. */
aside [class*="brand" i],
aside [class*="Brand"],
[class*="sidebar" i] [class*="brand" i],
[class*="Sidebar"] [class*="Brand"] {
  padding-top: 10px !important;
  padding-bottom: 10px !important;
  margin-bottom: 10px !important;
}

/* If the logo image is oversized, constrain it. */
aside img[src*="logo"],
aside img[alt*="WyreStorm"],
aside img[alt*="Wingman"],
[class*="sidebar" i] img {
  max-height: 64px !important;
  object-fit: contain !important;
}

/* The app top greeting strip should stay shallow. */
header:has(+ main),
[class*="topbar" i],
[class*="TopBar"],
[class*="app-header" i],
[class*="AppHeader"] {
  min-height: 44px !important;
  padding-top: 6px !important;
  padding-bottom: 6px !important;
}

header:has(+ main) h1,
[class*="topbar" i] h1,
[class*="TopBar"] h1,
[class*="app-header" i] h1,
[class*="AppHeader"] h1 {
  font-size: 0.92rem !important;
  line-height: 1.1 !important;
}

header:has(+ main) p,
[class*="topbar" i] p,
[class*="TopBar"] p,
[class*="app-header" i] p,
[class*="AppHeader"] p {
  font-size: 0.76rem !important;
  line-height: 1.15 !important;
}

/* The New Project button is useful but should not determine header height. */
a[href*="project"],
button:has(+ span),
button {
  line-height: 1.1 !important;
}

/* Keep Guru visible but slightly lower/right and less intrusive. */
[class*="guru" i],
[class*="Guru"],
button[aria-label*="Guru"],
button[title*="Guru"] {
  z-index: 2500 !important;
}

/* Page background should not create unnecessary blank visual weight. */
body {
  overflow-x: hidden !important;
}

/* Medium screens: make hero even smaller. */
@media (max-width: 1280px) {
  [class*="hero" i],
  [class*="PageHero"],
  [class*="Hero"],
  .wm-hero,
  .wm-page-hero,
  .wingman-hero,
  [data-wingman-hero="true"] {
    max-height: 82px !important;
    padding: 10px 14px !important;
  }

  [class*="hero" i] h1,
  [class*="PageHero"] h1,
  [class*="Hero"] h1,
  .wm-hero h1,
  .wm-page-hero h1,
  .wingman-hero h1,
  [data-wingman-hero="true"] h1 {
    font-size: clamp(1.35rem, 2.4vw, 2rem) !important;
  }
}

/* Mobile/tablet: hero should nearly disappear into a command header. */
@media (max-width: 820px) {
  [class*="hero" i],
  [class*="PageHero"],
  [class*="Hero"],
  .wm-hero,
  .wm-page-hero,
  .wingman-hero,
  [data-wingman-hero="true"] {
    display: block !important;
    max-height: none !important;
    padding: 10px 12px !important;
  }

  [class*="hero" i] h1,
  [class*="PageHero"] h1,
  [class*="Hero"] h1,
  .wm-hero h1,
  .wm-page-hero h1,
  .wingman-hero h1,
  [data-wingman-hero="true"] h1 {
    font-size: 1.35rem !important;
    line-height: 1 !important;
  }
}

/* WINGMAN TASK FIRST LAYOUT END */
'@

Write-Host ""
Write-Host "==> Running typecheck" -ForegroundColor Cyan
npm run typecheck

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Typecheck failed. Backups are here:" -ForegroundColor Yellow
    Write-Host $BackupDir -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "==> Running build" -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Build failed. Backups are here:" -ForegroundColor Yellow
    Write-Host $BackupDir -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "==> Wingman task-first layout installed successfully" -ForegroundColor Green
Write-Host ""
Write-Host "Expected result:" -ForegroundColor Cyan
Write-Host "- Hero becomes a compact command strip."
Write-Host "- Workspace content moves higher."
Write-Host "- More templates/products/options are visible above the fold."
Write-Host "- Page starts to feel like a working sales tool, not a landing page."
Write-Host ""
Write-Host "Backups saved to:" -ForegroundColor Cyan
Write-Host $BackupDir
Write-Host ""