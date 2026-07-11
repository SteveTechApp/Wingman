[CmdletBinding()]
param(
    [string]$RepoRoot = "C:\Users\steve\wingman",
    [switch]$RunBuild,
    [switch]$RunFullVerify
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Utf8NoBom {
    param(
        [Parameter(Mandatory)]
        [string]$Path,

        [Parameter(Mandatory)]
        [string]$Content
    )

    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Invoke-NativeCaptured {
    param(
        [Parameter(Mandatory)]
        [System.Management.Automation.CommandInfo]$Command,

        [Parameter(Mandatory)]
        [string[]]$Arguments
    )

    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"

    try {
        $output = & $Command.Source @Arguments 2>&1
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }

    [PSCustomObject]@{
        ExitCode = $exitCode
        Lines = @($output | ForEach-Object { [string]$_ })
    }
}

function Invoke-Npm {
    param(
        [Parameter(Mandatory)]
        [string[]]$Arguments
    )

    $result = Invoke-NativeCaptured -Command $script:Npm -Arguments $Arguments
    $result.Lines | ForEach-Object { Write-Host $_ }

    if ($result.ExitCode -ne 0) {
        throw "npm $($Arguments -join ' ') failed with exit code $($result.ExitCode)."
    }
}

$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
Set-Location -LiteralPath $RepoRoot

$script:Npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $script:Npm) {
    $script:Npm = Get-Command npm -ErrorAction Stop
}

$node = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $node) {
    $node = Get-Command node -ErrorAction Stop
}

$git = Get-Command git.exe -ErrorAction SilentlyContinue
if (-not $git) {
    $git = Get-Command git -ErrorAction Stop
}

$appShellPath = Join-Path $RepoRoot "src\wingman2\layout\AppShell.tsx"
$cssPath = Join-Path $RepoRoot "src\wingman2\styles\wingman-style-stack.css"
$packagePath = Join-Path $RepoRoot "package.json"
$checkerPath = Join-Path $RepoRoot "tools\check-app-page-style-consistency.mjs"

foreach ($requiredPath in @($appShellPath, $cssPath, $packagePath)) {
    if (-not (Test-Path -LiteralPath $requiredPath)) {
        throw "Required Wingman file was not found: $requiredPath"
    }
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDirectory = Join-Path $RepoRoot ".wingman-backups\app-style-consistency-$timestamp"
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null

Copy-Item -LiteralPath $appShellPath -Destination (Join-Path $backupDirectory "AppShell.tsx") -Force
Copy-Item -LiteralPath $cssPath -Destination (Join-Path $backupDirectory "wingman-style-stack.css") -Force
Copy-Item -LiteralPath $packagePath -Destination (Join-Path $backupDirectory "package.json") -Force

if (Test-Path -LiteralPath $checkerPath) {
    Copy-Item -LiteralPath $checkerPath -Destination (Join-Path $backupDirectory "check-app-page-style-consistency.mjs") -Force
}

Write-Host "==> Backup created" -ForegroundColor Cyan
Write-Host $backupDirectory

# ============================================================================
# 1. Govern the universal AppShell page header and page frame.
# ============================================================================

$appShell = [System.IO.File]::ReadAllText($appShellPath)
$originalAppShell = $appShell

$oldTopbarPattern = '(?s)<div className="wingman-topbar-title wm-balanced-topbar-title" title=\{`\$\{activeLabel\}: `\$\{activeSummary\}`\}>\s*<span>\s*\{activeLabel\}: \{activeSummary\}\s*</span>\s*</div>'

$newTopbar = @'
<div
            className="wingman-topbar-title wm-balanced-topbar-title"
            data-wingman-page-header="true"
            title={`${activeLabel}: ${activeSummary}`}
          >
            <strong className="wingman-topbar-page-label">{activeLabel}</strong>
            <span className="wingman-topbar-page-summary">{activeSummary}</span>
          </div>
'@

if (-not $appShell.Contains('className="wingman-topbar-page-label"')) {
    $updated = [regex]::Replace($appShell, $oldTopbarPattern, $newTopbar, 1)

    if ($updated -eq $appShell) {
        $oldTopbarLiteral = @'
<div className="wingman-topbar-title wm-balanced-topbar-title" title={`${activeLabel}: ${activeSummary}`}>
            <span>
              {activeLabel}: {activeSummary}
            </span>
          </div>
'@

        if (-not $appShell.Contains($oldTopbarLiteral)) {
            throw "Could not locate the current AppShell topbar title block."
        }

        $updated = $appShell.Replace($oldTopbarLiteral, $newTopbar)
    }

    $appShell = $updated
}

$oldHostPattern = '<div data-wingman-visual-root="true" className="wingman-page-host" key=\{`\$\{location\.pathname\}-`\$\{pageResetVersion\}`\}>'

$newHost = @'
<div
            data-wingman-visual-root="true"
            data-wingman-page-style="governed"
            data-wingman-page-key={activeRoute?.key ?? "dashboard"}
            className="wingman-page-host wm-app-page-frame"
            key={`${location.pathname}-${pageResetVersion}`}
          >
'@

if (-not $appShell.Contains('data-wingman-page-style="governed"')) {
    $updated = [regex]::Replace($appShell, $oldHostPattern, $newHost, 1)

    if ($updated -eq $appShell) {
        $oldHostLiteral = '<div data-wingman-visual-root="true" className="wingman-page-host" key={`${location.pathname}-${pageResetVersion}`}>'

        if (-not $appShell.Contains($oldHostLiteral)) {
            throw "Could not locate the AppShell page host."
        }

        $updated = $appShell.Replace($oldHostLiteral, $newHost)
    }

    $appShell = $updated
}

foreach ($marker in @(
    'data-wingman-page-header="true"',
    'className="wingman-topbar-page-label"',
    'className="wingman-topbar-page-summary"',
    'data-wingman-page-style="governed"',
    'className="wingman-page-host wm-app-page-frame"'
)) {
    if (-not $appShell.Contains($marker)) {
        throw "AppShell consistency marker is missing after repair: $marker"
    }
}

if ($appShell -ne $originalAppShell) {
    $appShell = $appShell.Replace("`r`n", "`n").Replace("`r", "`n")
    $appShell = $appShell.TrimEnd([char[]]"`r`n") + "`n"
    Write-Utf8NoBom -Path $appShellPath -Content $appShell
    Write-Host "Updated AppShell page header and governed page frame." -ForegroundColor Green
}
else {
    Write-Host "AppShell consistency structure already installed." -ForegroundColor Yellow
}

# ============================================================================
# 2. Append one final governed style layer to the existing single stylesheet.
# ============================================================================

$css = [System.IO.File]::ReadAllText($cssPath)

$startMarker = "/* WINGMAN APP-WIDE STYLE CONSISTENCY SWEEP START */"
$endMarker = "/* WINGMAN APP-WIDE STYLE CONSISTENCY SWEEP END */"

if ($css.Contains($startMarker)) {
    $escapedStart = [regex]::Escape($startMarker)
    $escapedEnd = [regex]::Escape($endMarker)
    $css = [regex]::Replace(
        $css,
        "(?s)\s*$escapedStart.*?$escapedEnd\s*",
        "`n",
        1
    )
}

$consistencyCss = @'
/* WINGMAN APP-WIDE STYLE CONSISTENCY SWEEP START
   Governs every route through AppShell > .wm-app-page-frame.
   White body copy, aquamarine headings, compact dark-navy panels,
   restrained radii and a consistent page/header rhythm.
   -------------------------------------------------------------------------- */

:root {
  --wm-app-page-max: 1560px;
  --wm-app-page-gutter: clamp(14px, 1.45vw, 24px);
  --wm-app-page-gap: 14px;
  --wm-app-panel: #0b1a2b;
  --wm-app-panel-strong: #10243a;
  --wm-app-panel-soft: #071522;
  --wm-app-border: rgba(94, 234, 212, 0.18);
  --wm-app-border-strong: rgba(94, 234, 212, 0.42);
  --wm-app-heading: #5eead4;
  --wm-app-heading-secondary: #67e8f9;
  --wm-app-copy: #f8fafc;
  --wm-app-copy-soft: #dbeafe;
  --wm-app-muted: #a8b7ca;
  --wm-app-radius: 14px;
  --wm-app-radius-small: 9px;
  --wm-app-shadow: 0 12px 32px rgba(0, 0, 0, 0.22);
}

/* Universal application frame ------------------------------------------------ */

.wingman-shell,
.wingman-workspace,
.wingman-app-main {
  color: var(--wm-app-copy);
}

.wingman-workspace {
  min-width: 0;
  background:
    radial-gradient(circle at 82% 0%, rgba(56, 189, 248, 0.07), transparent 30rem),
    linear-gradient(180deg, #06111f 0%, #040b14 100%);
}

.wingman-app-main {
  min-width: 0;
  overflow-x: hidden;
}

.wingman-app-main > .wm-app-page-frame {
  width: min(100%, var(--wm-app-page-max));
  min-width: 0;
  margin: 0 auto;
  padding: var(--wm-app-page-gutter);
}

.wm-app-page-frame > * {
  min-width: 0;
}

.wm-app-page-frame :where(
  .wm-ui-page,
  .wm-page,
  .wm20-page,
  .wingman-page,
  .wm-page-shell,
  [data-wingman-short-workflow="true"]
) {
  width: 100%;
  max-width: none;
  min-width: 0;
  margin: 0;
  padding: 0;
  color: var(--wm-app-copy);
  background: transparent;
}

.wm-app-page-frame :where(
  .grid,
  .flex,
  .wm-grid,
  .wm-ui-grid,
  .wm20-grid
) {
  min-width: 0;
}

/* Universal top header ------------------------------------------------------- */

.wingman-topbar.wm-balanced-topbar {
  min-height: 52px;
  padding: 8px 16px;
  gap: 14px;
  background: rgba(4, 11, 20, 0.94);
  border-bottom: 1px solid var(--wm-app-border);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  backdrop-filter: blur(16px);
}

.wingman-topbar-title[data-wingman-page-header="true"] {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  align-items: baseline;
  gap: 9px;
  overflow: hidden;
  line-height: 1.2;
}

.wingman-topbar-page-label {
  flex: 0 0 auto;
  color: var(--wm-app-heading);
  font-size: 0.9rem;
  font-weight: 850;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.wingman-topbar-page-summary {
  min-width: 0;
  overflow: hidden;
  color: var(--wm-app-copy-soft);
  font-size: 0.79rem;
  font-weight: 560;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wingman-new-project-button,
.wingman-mobile-nav-button {
  min-height: 34px;
  border-radius: var(--wm-app-radius-small);
}

/* Page rhythm and headers ---------------------------------------------------- */

.wm-app-page-frame :where(
  main,
  .wm-ui-page,
  .wm-page,
  .wm20-page,
  .wingman-page
) {
  color: var(--wm-app-copy);
}

.wm-app-page-frame :where(
  .wm-page-header,
  .wingman-page-header,
  .wm-ui-header,
  .wm20-header,
  .wm-hero,
  .wm-page-hero,
  .wm-dashboard-hero,
  .wm-template-hero,
  .wm-product-hero,
  .wm-compare-hero
) {
  margin: 0 0 var(--wm-app-page-gap);
  padding: 16px 18px;
  color: var(--wm-app-copy);
  background:
    linear-gradient(135deg, rgba(16, 36, 58, 0.96), rgba(7, 21, 34, 0.96));
  border: 1px solid var(--wm-app-border);
  border-radius: var(--wm-app-radius);
  box-shadow: var(--wm-app-shadow);
}

.wm-app-page-frame :where(h1, .wm-page-title, .wm-ui-title, .wm20-title) {
  margin-top: 0;
  margin-bottom: 6px;
  color: var(--wm-app-heading) !important;
  font-size: clamp(1.55rem, 1.25vw + 1rem, 2.15rem);
  font-weight: 820;
  line-height: 1.08;
  letter-spacing: -0.025em;
}

.wm-app-page-frame :where(h2, .wm-section-title, .wm-panel-title) {
  color: var(--wm-app-heading) !important;
  font-size: clamp(1.08rem, 0.45vw + 0.98rem, 1.38rem);
  font-weight: 780;
  line-height: 1.2;
  letter-spacing: -0.015em;
}

.wm-app-page-frame :where(h3, .wm-card-title) {
  color: var(--wm-app-heading-secondary) !important;
  font-size: 1rem;
  font-weight: 740;
  line-height: 1.25;
}

.wm-app-page-frame :where(
  p,
  li,
  dd,
  dt,
  label,
  .wm-copy,
  .wm-ui-copy,
  .wm-page-description,
  .wm-subtitle
) {
  color: var(--wm-app-copy);
}

.wm-app-page-frame :where(
  .wm-muted,
  .wm-meta,
  .wm-caption,
  .wm-help,
  small
) {
  color: var(--wm-app-muted);
}

/* Panels and cards ----------------------------------------------------------- */

.wm-app-page-frame :where(
  .wm-ui-card,
  .wm-card,
  .wm-panel,
  .wm-section-card,
  .wm-action-card,
  .wm-output-panel,
  .wm20-panel,
  .wm-ui-shell,
  .wingman-card,
  .wingman-panel,
  .rounded-3xl.border,
  .rounded-2xl.border
) {
  color: var(--wm-app-copy);
  background:
    linear-gradient(180deg, rgba(14, 33, 53, 0.97), rgba(7, 21, 34, 0.97));
  border-color: var(--wm-app-border) !important;
  border-radius: var(--wm-app-radius) !important;
  box-shadow: var(--wm-app-shadow);
}

.wm-app-page-frame :where(
  .wm-ui-card,
  .wm-card,
  .wm-panel,
  .wm-section-card,
  .wm-action-card,
  .wm-output-panel,
  .wm20-panel
):hover {
  border-color: var(--wm-app-border-strong) !important;
}

.wm-app-page-frame :where(
  .wm-section-card,
  .wm-output-panel,
  .wm20-panel
) {
  padding: clamp(14px, 1.2vw, 20px);
}

.wm-app-page-frame :where(
  [data-ui-tone="caution"],
  [data-ui-tone="warning"]
) {
  background: linear-gradient(180deg, rgba(69, 45, 12, 0.52), rgba(28, 23, 15, 0.72));
  border-color: rgba(251, 191, 36, 0.34) !important;
}

.wm-app-page-frame :where(
  [data-ui-tone="danger"],
  [data-ui-tone="blocked"]
) {
  background: linear-gradient(180deg, rgba(76, 20, 36, 0.52), rgba(33, 13, 24, 0.76));
  border-color: rgba(251, 113, 133, 0.36) !important;
}

/* Buttons, tabs and compact controls ---------------------------------------- */

.wm-app-page-frame :where(
  .wm-ui-button,
  .wm-button,
  .wm-btn,
  .button,
  [role="tab"],
  .wm-tab,
  .wm-tab-button
) {
  min-height: 36px;
  padding: 8px 13px;
  color: var(--wm-app-copy);
  font-weight: 700;
  line-height: 1.1;
  text-decoration: none;
  background: #0c2033;
  border: 1px solid var(--wm-app-border);
  border-radius: var(--wm-app-radius-small) !important;
  box-shadow: none;
}

.wm-app-page-frame :where(
  .wm-ui-button,
  .wm-button,
  .wm-btn,
  .button,
  [role="tab"],
  .wm-tab,
  .wm-tab-button
):hover {
  color: #ffffff;
  text-decoration: none;
  background: #12304a;
  border-color: var(--wm-app-border-strong);
}

.wm-app-page-frame :where(
  .wm-ui-button-primary,
  .wm-button-primary,
  .wm-btn-primary,
  .wm-ui-button-forward,
  [aria-selected="true"],
  [data-active="true"]
) {
  color: #021712 !important;
  background: linear-gradient(135deg, #5eead4, #22d3ee) !important;
  border-color: rgba(165, 243, 252, 0.72) !important;
}

.wm-app-page-frame :where(
  button.rounded-full,
  a.rounded-full,
  span.rounded-full
) {
  border-radius: var(--wm-app-radius-small) !important;
}

/* Forms --------------------------------------------------------------------- */

.wm-app-page-frame :where(
  input:not([type="checkbox"]):not([type="radio"]),
  select,
  textarea,
  .wm-ui-input,
  .wm-input,
  .wm-select,
  .wm-textarea
) {
  min-height: 40px;
  color: var(--wm-app-copy) !important;
  caret-color: var(--wm-app-heading);
  background: #061522 !important;
  border: 1px solid rgba(125, 211, 252, 0.24) !important;
  border-radius: var(--wm-app-radius-small) !important;
  box-shadow: none !important;
}

.wm-app-page-frame :where(
  input,
  select,
  textarea
):focus {
  border-color: var(--wm-app-border-strong) !important;
  outline: 2px solid rgba(94, 234, 212, 0.16);
  outline-offset: 1px;
}

.wm-app-page-frame ::placeholder {
  color: #8292a6;
  opacity: 1;
}

/* Tables, lists and structured output --------------------------------------- */

.wm-app-page-frame :where(table) {
  width: 100%;
  color: var(--wm-app-copy);
  background: transparent;
  border-collapse: separate;
  border-spacing: 0;
}

.wm-app-page-frame :where(thead) {
  background: #081a2a;
}

.wm-app-page-frame :where(th) {
  color: var(--wm-app-heading-secondary);
  font-size: 0.78rem;
  font-weight: 760;
  letter-spacing: 0.025em;
}

.wm-app-page-frame :where(td, th) {
  border-color: rgba(125, 211, 252, 0.14) !important;
}

.wm-app-page-frame :where(tbody tr) {
  background: rgba(7, 21, 34, 0.74);
}

.wm-app-page-frame :where(tbody tr:hover) {
  background: rgba(16, 36, 58, 0.82);
}

/* Product Pitch and other previously divergent pages ----------------------- */

.wm-route-product-pitch .wm-app-page-frame main.wingman-page-host {
  padding: 0;
}

.wm-route-product-pitch .wm-product-pitch-safety-panel {
  margin: 0;
  padding: 16px 18px;
}

.wm-route-product-pitch .wm-product-pitch-safety-grid {
  gap: 12px;
}

.wm-route-product-pitch .wm-product-pitch-safety-item {
  min-height: 0;
  padding: 13px 14px;
  background: rgba(6, 21, 34, 0.72);
  border: 1px solid rgba(94, 234, 212, 0.14);
  border-radius: var(--wm-app-radius-small);
}

.wm-route-compare .wm-app-page-frame,
.wm-route-discovery .wm-app-page-frame,
.wm-route-finder .wm-app-page-frame,
.wm-route-templates .wm-app-page-frame,
.wm-route-projects .wm-app-page-frame,
.wm-route-proposal .wm-app-page-frame {
  --wm-content-max: var(--wm-app-page-max);
}

/* Responsive behaviour ------------------------------------------------------ */

@media (max-width: 980px) {
  .wingman-topbar-page-summary {
    display: none;
  }

  .wingman-app-main > .wm-app-page-frame {
    padding: 12px;
  }

  .wm-app-page-frame :where(
    .wm-page-header,
    .wingman-page-header,
    .wm-ui-header,
    .wm20-header,
    .wm-hero,
    .wm-page-hero
  ) {
    padding: 14px;
  }
}

@media (max-width: 720px) {
  .wingman-topbar.wm-balanced-topbar {
    padding-inline: 10px;
  }

  .wingman-topbar-page-label {
    max-width: 48vw;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .wm-app-page-frame :where(h1, .wm-page-title, .wm-ui-title, .wm20-title) {
    font-size: 1.45rem;
  }

  .wm-app-page-frame :where(
    .wm-grid-2,
    .wm-grid-3,
    .wm-grid-4,
    .wm-dashboard-grid,
    .wm-product-pitch-safety-grid
  ) {
    grid-template-columns: 1fr;
  }
}

/* Print should remain clean and unthemed ------------------------------------ */

@media print {
  .wingman-topbar,
  .wingman-sidebar,
  .wingman-mobile-shade,
  .wingman-guru-fab {
    display: none !important;
  }

  .wingman-app-main > .wm-app-page-frame {
    width: 100%;
    max-width: none;
    padding: 0;
  }

  .wm-app-page-frame :where(
    .wm-ui-card,
    .wm-card,
    .wm-panel,
    .wm-section-card,
    .wm-output-panel,
    .wm20-panel
  ) {
    color: #111827 !important;
    background: #ffffff !important;
    border-color: #cbd5e1 !important;
    box-shadow: none !important;
  }
}

/* WINGMAN APP-WIDE STYLE CONSISTENCY SWEEP END */
'@

$css = $css.Replace("`r`n", "`n").Replace("`r", "`n")
$css = $css.TrimEnd([char[]]"`r`n") + "`n`n" + $consistencyCss.Trim() + "`n"
Write-Utf8NoBom -Path $cssPath -Content $css
Write-Host "Installed final app-wide consistency layer in wingman-style-stack.css." -ForegroundColor Green

# ============================================================================
# 3. Create a route-manifest-driven audit for every application page.
# ============================================================================

$checker = @'
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "src", "wingman2", "app", "route-manifest.json");
const appShellPath = path.join(root, "src", "wingman2", "layout", "AppShell.tsx");
const cssPath = path.join(root, "src", "wingman2", "styles", "wingman-style-stack.css");
const pagesDirectory = path.join(root, "src", "wingman2", "pages");
const reportPath = path.join(root, "docs", "app-page-style-consistency-audit.md");

const errors = [];
const warnings = [];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    errors.push(`Missing required file: ${relativePath}`);
    return "";
  }

  return fs.readFileSync(absolutePath, "utf8");
}

function count(source, pattern) {
  return source.match(pattern)?.length ?? 0;
}

const manifest = JSON.parse(read("src/wingman2/app/route-manifest.json") || "[]");
const appShell = read("src/wingman2/layout/AppShell.tsx");
const css = read("src/wingman2/styles/wingman-style-stack.css");

for (const marker of [
  'data-wingman-page-header="true"',
  'wingman-topbar-page-label',
  'wingman-topbar-page-summary',
  'data-wingman-page-style="governed"',
  'wm-app-page-frame',
]) {
  if (!appShell.includes(marker)) {
    errors.push(`AppShell is missing governed page-style marker: ${marker}`);
  }
}

for (const marker of [
  "WINGMAN APP-WIDE STYLE CONSISTENCY SWEEP START",
  "WINGMAN APP-WIDE STYLE CONSISTENCY SWEEP END",
  ".wingman-topbar-page-label",
  ".wingman-topbar-page-summary",
  ".wingman-app-main > .wm-app-page-frame",
  "--wm-app-heading",
  "--wm-app-copy",
  "--wm-app-panel",
]) {
  if (!css.includes(marker)) {
    errors.push(`Global stylesheet is missing consistency marker: ${marker}`);
  }
}

const activeImports = css
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.startsWith("@import"));

if (activeImports.length > 0) {
  errors.push("wingman-style-stack.css contains active @import lines; Wingman must retain one compiled global stylesheet.");
}

const routesByFile = new Map();

for (const route of manifest) {
  if (!route.pageFile) {
    errors.push(`Route ${route.key ?? "(unknown)"} has no pageFile.`);
    continue;
  }

  const routeList = routesByFile.get(route.pageFile) ?? [];
  routeList.push(route);
  routesByFile.set(route.pageFile, routeList);
}

const rows = [];

for (const [pageFile, routes] of [...routesByFile.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const relativePath = path.join("src", "wingman2", "pages", pageFile);
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    errors.push(`Routed page is missing: ${relativePath}`);
    rows.push({
      pageFile,
      routes: routes.map((route) => route.path).join(", "),
      status: "MISSING",
      h1: 0,
      roots: 0,
      cards: 0,
      hardLight: 0,
    });
    continue;
  }

  const source = fs.readFileSync(absolutePath, "utf8");
  const h1Count = count(source, /<h1\b/g);
  const rootCount = count(
    source,
    /\b(?:wm-ui-page|wm-page|wm20-page|wingman-page|wingman-page-host|wm-compare-page|wm-discovery-page|wm-finder-page)\b/g,
  );
  const cardCount = count(
    source,
    /\b(?:wm-ui-card|wm-card|wm-section-card|wm-output-panel|wm20-panel|wingman-card)\b/g,
  );
  const hardLightCount = count(
    source,
    /\b(?:bg-white|bg-slate-50|bg-gray-50|text-slate-950|text-gray-950)\b/g,
  );

  if (h1Count === 0) {
    warnings.push(`${relativePath} has no explicit <h1>; confirm that its routed hub/header still supplies a meaningful page title.`);
  }

  if (rootCount === 0) {
    warnings.push(`${relativePath} has no internal shared page-root class; it is currently governed only by AppShell.`);
  }

  if (hardLightCount > 0) {
    warnings.push(`${relativePath} contains ${hardLightCount} light-theme utility class occurrence(s); the final governed layer overrides these surfaces, but the markup should be normalised when next edited.`);
  }

  rows.push({
    pageFile,
    routes: routes.map((route) => route.path).join(", "),
    status: "Covered by AppShell",
    h1: h1Count,
    roots: rootCount,
    cards: cardCount,
    hardLight: hardLightCount,
  });
}

const allPageFiles = fs.existsSync(pagesDirectory)
  ? fs.readdirSync(pagesDirectory).filter((name) => name.endsWith(".tsx"))
  : [];

const routedFiles = new Set(routesByFile.keys());
const supplementalFiles = allPageFiles
  .filter((name) => !routedFiles.has(name))
  .sort();

const report = [
  "# Wingman app page style consistency audit",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "## Governed visual contract",
  "",
  "- Every route is wrapped by `AppShell > .wm-app-page-frame`.",
  "- The global top bar separates the aquamarine page label from the concise route summary.",
  "- Body copy is white; page and section headings use the governed aquamarine palette.",
  "- Cards and panels use a consistent dark-navy surface, border, radius and spacing system.",
  "- Buttons, tabs, inputs and tables share one compact interaction style.",
  "- The final CSS layer is contained in the single `wingman-style-stack.css` file.",
  "",
  "## Routed page coverage",
  "",
  "| Page implementation | Route(s) | Coverage | H1 | Shared roots | Shared cards | Light-theme utilities |",
  "|---|---|---:|---:|---:|---:|---:|",
  ...rows.map(
    (row) =>
      `| ${row.pageFile} | ${row.routes} | ${row.status} | ${row.h1} | ${row.roots} | ${row.cards} | ${row.hardLight} |`,
  ),
  "",
  "## Supplemental page modules",
  "",
  ...(supplementalFiles.length > 0
    ? supplementalFiles.map((name) => `- ${name}`)
    : ["- None"]),
  "",
  "## Warnings",
  "",
  ...(warnings.length > 0 ? warnings.map((warning) => `- ${warning}`) : ["- None"]),
  "",
];

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${report.join("\n")}\n`, "utf8");

console.log(
  `[app-page-style] Covered ${manifest.length} routes across ${routesByFile.size} routed page implementation(s).`,
);
console.log(`[app-page-style] Audit written to ${path.relative(root, reportPath)}.`);

if (warnings.length > 0) {
  console.warn(`[app-page-style] ${warnings.length} non-blocking markup warning(s) recorded in the audit.`);
}

if (errors.length > 0) {
  console.error("[app-page-style] FAILED:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("[app-page-style] AppShell, colour profile, header system and page coverage checks passed.");
'@

Write-Utf8NoBom -Path $checkerPath -Content ($checker.Trim() + "`n")
Write-Host "Created route-manifest-driven page style checker." -ForegroundColor Green

# Add the checker to package.json without disturbing the current script order.
$packageUpdateScript = @'
const fs = require("node:fs");
const file = process.argv[1];
const packageJson = JSON.parse(fs.readFileSync(file, "utf8"));
packageJson.scripts ||= {};
packageJson.scripts["check:app-page-style"] = "node tools/check-app-page-style-consistency.mjs";

const verify = String(packageJson.scripts.verify || "").trim();
if (verify && !verify.includes("check:app-page-style")) {
  packageJson.scripts.verify = `${verify} && npm run check:app-page-style`;
}

fs.writeFileSync(file, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
'@

$packageUpdateResult = Invoke-NativeCaptured -Command $node -Arguments @(
    "-e",
    $packageUpdateScript,
    $packagePath
)

$packageUpdateResult.Lines | ForEach-Object { Write-Host $_ }

if ($packageUpdateResult.ExitCode -ne 0) {
    throw "Failed to update package.json with check:app-page-style."
}

Write-Host "Added check:app-page-style to package.json and verify." -ForegroundColor Green

# ============================================================================
# 4. Validate.
# ============================================================================

Write-Host ""
Write-Host "==> App page style audit" -ForegroundColor Cyan
Invoke-Npm -Arguments @("run", "check:app-page-style")

Write-Host ""
Write-Host "==> TypeScript validation" -ForegroundColor Cyan
Invoke-Npm -Arguments @("run", "typecheck")

Write-Host ""
Write-Host "==> Sales-facing language validation" -ForegroundColor Cyan
Invoke-Npm -Arguments @("run", "check:sales-facing-language")

if ($RunBuild -or $RunFullVerify) {
    Write-Host ""
    Write-Host "==> Production build" -ForegroundColor Cyan
    Invoke-Npm -Arguments @("run", "build")
}

if ($RunFullVerify) {
    Write-Host ""
    Write-Host "==> Full Wingman verification" -ForegroundColor Cyan
    Invoke-Npm -Arguments @("run", "verify")
}

Write-Host ""
Write-Host "==> Git diff check" -ForegroundColor Cyan
$diffCheck = Invoke-NativeCaptured -Command $git -Arguments @("diff", "--check")

$realFindings = @(
    $diffCheck.Lines | Where-Object {
        $_ -notmatch "^warning: in the working copy of .*CRLF will be replaced by LF"
    }
)

if ($realFindings.Count -gt 0 -or $diffCheck.ExitCode -ne 0) {
    $realFindings | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
    throw "git diff --check reports a real whitespace problem."
}

Write-Host "git diff --check passed." -ForegroundColor Green

Write-Host ""
Write-Host "==> Changed files" -ForegroundColor Cyan
$status = Invoke-NativeCaptured -Command $git -Arguments @("status", "--short")
$status.Lines | ForEach-Object { Write-Host $_ }

Write-Host ""
Write-Host "Wingman app-wide style consistency sweep installed and validated." -ForegroundColor Green
Write-Host "Audit: $(Join-Path $RepoRoot 'docs\app-page-style-consistency-audit.md')"
Write-Host "Backup: $backupDirectory"
