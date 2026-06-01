#requires -version 5.1
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==> Installing Wingman compact workspace density reset" -ForegroundColor Cyan
Write-Host ""

$Root = Get-Location
$PackageJson = Join-Path $Root "package.json"

if (!(Test-Path $PackageJson)) {
    Write-Host "ERROR: package.json was not found. Run this from the Wingman project root." -ForegroundColor Red
    exit 1
}

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDir = Join-Path $Root "backups\compact-workspace-density-$Stamp"
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
        Write-Host "Compact density CSS already installed." -ForegroundColor DarkGray
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
    Write-Host "Checked: src\wingman2\styles\wingman.css, wingman2.css, src\index.css, src\main.css, src\App.css" -ForegroundColor Yellow
    exit 1
}

Write-Host "Using CSS file:" -ForegroundColor Green
Write-Host $CssPath

Append-TextIfMissing -Path $CssPath -Needle "/* WINGMAN COMPACT WORKSPACE DENSITY RESET START */" -AppendText @'
/* WINGMAN COMPACT WORKSPACE DENSITY RESET START */

/*
  Purpose:
  Rebalance Wingman so the working area dominates.
  The header and hero should guide the user, not consume the screen.
*/

/* Temporarily hide the failed experimental utility dock until it is placed properly. */
.wm-force-utility-dock,
.wm-header-dock,
.wm-topbar-utility-actions,
.wm-audience-coaching-panel {
  display: none !important;
}

/* Keep the main app tighter and reduce oversized vertical padding. */
main,
.wm-main,
.wm-page,
.wm-page-main,
.wm-workspace,
.wingman-page,
.wingman-workspace,
[class*="PageFrame"],
[class*="page-frame"],
[class*="Workspace"],
[class*="workspace"] {
  scroll-margin-top: 0 !important;
}

/* Reduce the top application bar height without removing useful context. */
[class*="topbar"],
[class*="TopBar"],
[class*="page-top"],
[class*="PageTop"],
[class*="app-header"],
[class*="AppHeader"] {
  min-height: 48px !important;
}

[class*="topbar"] h1,
[class*="TopBar"] h1,
[class*="page-top"] h1,
[class*="PageTop"] h1,
[class*="app-header"] h1,
[class*="AppHeader"] h1 {
  font-size: 0.95rem !important;
  line-height: 1.15 !important;
}

[class*="topbar"] p,
[class*="TopBar"] p,
[class*="page-top"] p,
[class*="PageTop"] p,
[class*="app-header"] p,
[class*="AppHeader"] p {
  font-size: 0.78rem !important;
  line-height: 1.2 !important;
}

/* Reduce all large hero/header panels. */
[class*="hero" i],
[class*="PageHero"],
[class*="Hero"],
.wm-hero,
.wm-page-hero,
.wingman-hero,
[data-wingman-hero="true"] {
  min-height: 0 !important;
  margin-top: 10px !important;
  margin-bottom: 12px !important;
  padding: 18px 22px !important;
  border-radius: 22px !important;
}

/* Large hero titles were consuming the page. */
[class*="hero" i] h1,
[class*="PageHero"] h1,
[class*="Hero"] h1,
.wm-hero h1,
.wm-page-hero h1,
.wingman-hero h1,
[data-wingman-hero="true"] h1 {
  max-width: 920px !important;
  margin: 0 !important;
  font-size: clamp(2rem, 3.2vw, 3.6rem) !important;
  line-height: 0.96 !important;
  letter-spacing: -0.055em !important;
}

/* Smaller hero copy. */
[class*="hero" i] p,
[class*="PageHero"] p,
[class*="Hero"] p,
.wm-hero p,
.wm-page-hero p,
.wingman-hero p,
[data-wingman-hero="true"] p {
  max-width: 760px !important;
  margin-top: 8px !important;
  font-size: 0.9rem !important;
  line-height: 1.32 !important;
}

/* Make hero action buttons compact. */
[class*="hero" i] button,
[class*="hero" i] a,
[class*="PageHero"] button,
[class*="PageHero"] a,
[class*="Hero"] button,
[class*="Hero"] a,
.wm-hero button,
.wm-hero a,
.wm-page-hero button,
.wm-page-hero a,
.wingman-hero button,
.wingman-hero a {
  min-height: 32px !important;
  padding: 7px 13px !important;
  font-size: 0.78rem !important;
}

/* Workspace cards should begin higher and give more screen to the actual task. */
[class*="workspace-card" i],
[class*="WorkspaceCard"],
[class*="workspace-panel" i],
[class*="WorkspacePanel"],
.wm-workspace-card,
.wm-workspace-panel,
.wingman-workspace-card {
  margin-top: 10px !important;
  padding: 14px !important;
  border-radius: 22px !important;
}

/* Tighten section headers inside workspaces. */
[class*="workspace" i] header,
[class*="Workspace"] header,
.wm-workspace header,
.wingman-workspace header {
  padding-top: 8px !important;
  padding-bottom: 10px !important;
}

[class*="workspace" i] h1,
[class*="Workspace"] h1,
.wm-workspace h1,
.wingman-workspace h1 {
  font-size: clamp(1.4rem, 2vw, 2.1rem) !important;
  line-height: 1.05 !important;
}

[class*="workspace" i] h2,
[class*="Workspace"] h2,
.wm-workspace h2,
.wingman-workspace h2 {
  font-size: clamp(1rem, 1.45vw, 1.35rem) !important;
  line-height: 1.12 !important;
}

/* Reduce large decorative spacing around grids and cards. */
[class*="grid" i],
[class*="Grid"] {
  gap: 12px !important;
}

[class*="card" i],
[class*="Card"] {
  border-radius: 18px !important;
}

/* Make cards slightly denser without flattening the UI. */
[class*="card" i] h2,
[class*="Card"] h2,
[class*="card" i] h3,
[class*="Card"] h3 {
  margin-top: 0 !important;
  margin-bottom: 6px !important;
  line-height: 1.12 !important;
}

[class*="card" i] p,
[class*="Card"] p {
  line-height: 1.34 !important;
}

/* Compact category chips and option buttons. */
button,
a[role="button"],
[class*="chip" i],
[class*="Chip"],
[class*="pill" i],
[class*="Pill"] {
  line-height: 1.15 !important;
}

/* Do not make every button tiny, but reduce excess padding where components are oversized. */
[class*="chip" i],
[class*="Chip"],
[class*="pill" i],
[class*="Pill"],
[class*="filter" i] button,
[class*="Filter"] button,
[class*="tabs" i] button,
[class*="Tabs"] button {
  min-height: 30px !important;
  padding: 6px 12px !important;
  font-size: 0.78rem !important;
}

/* Template/product cards need to show more options above the fold. */
[class*="template" i] [class*="card" i],
[class*="Template"] [class*="Card"],
[class*="product" i] [class*="card" i],
[class*="Product"] [class*="Card"] {
  min-height: 0 !important;
}

/* Reduce empty page gutters on content-heavy pages. */
@media (min-width: 980px) {
  main,
  .wm-page-main,
  .wm-content,
  .wingman-content,
  [class*="content" i],
  [class*="Content"] {
    padding-top: 10px !important;
  }
}

/* Left navigation: slightly tighter but still readable. */
aside nav a,
aside nav button,
[class*="sidebar" i] nav a,
[class*="Sidebar"] nav a,
[class*="sidebar" i] nav button,
[class*="Sidebar"] nav button {
  min-height: 36px !important;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}

/* Reduce oversized logo/header area in the left rail. */
aside [class*="brand" i],
aside [class*="Brand"],
[class*="sidebar" i] [class*="brand" i],
[class*="Sidebar"] [class*="Brand"] {
  margin-bottom: 14px !important;
  padding-top: 12px !important;
  padding-bottom: 12px !important;
}

/* Make sidebars less dominant on large screens. */
@media (min-width: 1100px) {
  [class*="sidebar" i],
  [class*="Sidebar"],
  aside[class*="nav" i],
  aside[class*="Nav"] {
    max-width: 236px !important;
  }
}

/* Keep right-hand assistant/summary rails usable but less dominant. */
[class*="rail" i],
[class*="Rail"],
[class*="aside" i],
[class*="Aside"] {
  gap: 10px !important;
}

/* Toasts should not hide the active requirement or finder rail. */
[data-sonner-toaster],
.Toastify__toast-container,
[class*="toast-container"],
[class*="ToastContainer"] {
  right: 20px !important;
  bottom: 78px !important;
  top: auto !important;
}

/* On medium screens, be even more aggressive with hero size. */
@media (max-width: 1280px) {
  [class*="hero" i],
  [class*="PageHero"],
  [class*="Hero"],
  .wm-hero,
  .wm-page-hero,
  .wingman-hero,
  [data-wingman-hero="true"] {
    padding: 14px 18px !important;
  }

  [class*="hero" i] h1,
  [class*="PageHero"] h1,
  [class*="Hero"] h1,
  .wm-hero h1,
  .wm-page-hero h1,
  .wingman-hero h1,
  [data-wingman-hero="true"] h1 {
    font-size: clamp(1.8rem, 3vw, 2.8rem) !important;
  }
}

/* Mobile/tablet: remove hero dominance almost completely. */
@media (max-width: 820px) {
  [class*="hero" i],
  [class*="PageHero"],
  [class*="Hero"],
  .wm-hero,
  .wm-page-hero,
  .wingman-hero,
  [data-wingman-hero="true"] {
    padding: 12px 14px !important;
    margin-bottom: 10px !important;
  }

  [class*="hero" i] h1,
  [class*="PageHero"] h1,
  [class*="Hero"] h1,
  .wm-hero h1,
  .wm-page-hero h1,
  .wingman-hero h1,
  [data-wingman-hero="true"] h1 {
    font-size: 1.7rem !important;
    line-height: 1 !important;
  }

  [class*="hero" i] p,
  [class*="PageHero"] p,
  [class*="Hero"] p,
  .wm-hero p,
  .wm-page-hero p,
  .wingman-hero p,
  [data-wingman-hero="true"] p {
    font-size: 0.82rem !important;
  }
}

/* WINGMAN COMPACT WORKSPACE DENSITY RESET END */
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
Write-Host "==> Wingman compact workspace density reset installed successfully" -ForegroundColor Green
Write-Host ""
Write-Host "Expected result:" -ForegroundColor Cyan
Write-Host "- Page hero/header areas are much smaller."
Write-Host "- Workspace content starts higher."
Write-Host "- More templates, buttons and options fit above the fold."
Write-Host "- Experimental utility dock is hidden for now."
Write-Host "- Guru remains visible."
Write-Host ""
Write-Host "Backups saved to:" -ForegroundColor Cyan
Write-Host $BackupDir
Write-Host ""