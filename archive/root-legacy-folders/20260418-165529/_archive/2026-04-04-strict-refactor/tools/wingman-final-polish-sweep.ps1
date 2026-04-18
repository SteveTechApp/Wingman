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
$cssPath  = Join-Path $Root "src\styles\wm-final-polish.css"

$css = @'
/* =========================================
   WINGMAN FINAL POLISH SWEEP
   Global familiarity + consistent UX layer
========================================= */

:root {
  --wm-bg-0: #03101f;
  --wm-bg-1: #07182c;
  --wm-bg-2: #0a1f39;
  --wm-surface-1: rgba(15, 23, 42, 0.82);
  --wm-surface-2: rgba(15, 23, 42, 0.64);
  --wm-surface-3: rgba(255, 255, 255, 0.03);
  --wm-surface-4: rgba(255, 255, 255, 0.05);
  --wm-line-soft: rgba(148, 163, 184, 0.10);
  --wm-line-mid: rgba(148, 163, 184, 0.14);
  --wm-text-strong: #ffffff;
  --wm-text: rgba(248, 250, 252, 0.94);
  --wm-text-soft: rgba(226, 232, 240, 0.76);
  --wm-text-muted: rgba(226, 232, 240, 0.56);
  --wm-blue: #38bdf8;
  --wm-blue-2: #2563eb;
  --wm-orange: #f97316;
  --wm-orange-2: #f59e0b;
  --wm-radius-xs: 10px;
  --wm-radius-sm: 14px;
  --wm-radius-md: 18px;
  --wm-radius-lg: 22px;
  --wm-shadow-card:
    inset 0 1px 0 rgba(255,255,255,0.04),
    0 14px 34px rgba(2,8,23,0.16);
  --wm-shadow-pop:
    0 18px 42px rgba(0,0,0,0.28);
}

/* -----------------------------------------
   Global dark consistency
----------------------------------------- */

html,
body,
#root {
  background: linear-gradient(180deg, var(--wm-bg-0) 0%, var(--wm-bg-1) 55%, var(--wm-bg-2) 100%);
  color: var(--wm-text);
}

body,
button,
input,
select,
textarea {
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

.wm-shell-root,
.wm-app-bg,
.wm-page,
.wm-fit-page,
.wm-shell-main,
.wm-shell-main__viewport {
  color: var(--wm-text);
}

/* -----------------------------------------
   Familiar page frame
----------------------------------------- */

.wm-shell-main__viewport > * {
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
}

.wm-page,
.wm-fit-page {
  display: grid;
  gap: 14px;
  align-content: start;
}

.wm-page > *,
.wm-fit-page > * {
  min-width: 0;
}

.wm-page-kicker,
.wm-eyebrow,
.wm-section-kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #93c5fd;
}

.wm-page-title,
.wm-section-title,
.wm-h1 {
  font-size: clamp(22px, 2.2vw, 28px);
  line-height: 1.05;
  font-weight: 900;
  color: var(--wm-text-strong);
  letter-spacing: -0.02em;
}

.wm-page-copy,
.wm-section-copy,
.wm-subtitle,
.wm-muted-copy {
  font-size: 14px;
  line-height: 1.45;
  color: var(--wm-text-soft);
}

.wm-route-loading {
  min-height: 100vh;
  display: grid;
  place-items: center;
  color: var(--wm-text-soft);
  background: linear-gradient(180deg, var(--wm-bg-0) 0%, var(--wm-bg-1) 55%, var(--wm-bg-2) 100%);
}

/* -----------------------------------------
   Card system unification
----------------------------------------- */

.wm-surface-card,
.wm-surface-card--soft,
.wm-info-card,
.wm-product-card,
.wm-panel,
.wm-card,
.wm-stat-card,
.wm-hero-card,
.wm-tool-card,
.wm-choice-card {
  border-radius: var(--wm-radius-md);
  border: 1px solid var(--wm-line-soft);
  color: var(--wm-text);
}

.wm-surface-card,
.wm-panel,
.wm-card,
.wm-stat-card,
.wm-hero-card,
.wm-tool-card,
.wm-product-card,
.wm-info-card {
  background: linear-gradient(180deg, var(--wm-surface-1), var(--wm-surface-2));
  box-shadow: var(--wm-shadow-card);
}

.wm-surface-card--soft {
  background: var(--wm-surface-3);
}

.wm-choice-card {
  background: linear-gradient(180deg, rgba(15,23,42,0.72), rgba(15,23,42,0.58));
  box-shadow: var(--wm-shadow-card);
  transition:
    transform 140ms ease,
    border-color 140ms ease,
    box-shadow 140ms ease,
    background 140ms ease;
}

.wm-choice-card:hover,
.wm-tool-card:hover,
.wm-card:hover,
.wm-info-card:hover {
  transform: translateY(-2px);
  border-color: rgba(96,165,250,0.22);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.05),
    0 18px 38px rgba(2,8,23,0.22);
}

/* -----------------------------------------
   Section spacing consistency
----------------------------------------- */

.wm-page section,
.wm-fit-page section,
.wm-page article,
.wm-fit-page article {
  min-width: 0;
}

.wm-section,
.wm-block,
.wm-panel,
.wm-card,
.wm-surface-card,
.wm-product-card,
.wm-info-card {
  padding: 14px;
}

.wm-page > .wm-surface-card:first-child,
.wm-fit-page > .wm-surface-card:first-child {
  border-radius: var(--wm-radius-lg);
}

/* -----------------------------------------
   Buttons and chips
----------------------------------------- */

.wm-btn,
.wm-btn-primary,
.wm-btn-secondary,
.wm-chip,
button[class*="wm-btn"],
button[class*="wm-chip"] {
  appearance: none;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  min-height: 38px;
  padding: 10px 14px;
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
button.wm-btn-primary,
a.wm-btn-primary,
.wm-chip--active {
  border: 1px solid rgba(96,165,250,0.30);
  background: linear-gradient(135deg, var(--wm-blue-2), var(--wm-blue));
  color: #fff;
  box-shadow: 0 10px 22px rgba(37,99,235,0.18);
}

.wm-btn-secondary,
.wm-btn,
button.wm-btn-secondary,
a.wm-btn-secondary,
.wm-chip {
  border: 1px solid var(--wm-line-soft);
  background: var(--wm-surface-4);
  color: var(--wm-text);
}

.wm-toolbar,
.wm-toolbar-row,
.wm-action-row,
.wm-inline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

/* -----------------------------------------
   Input system consistency
----------------------------------------- */

input,
select,
textarea,
.wm-input-dark,
.wm-textarea-dark {
  color: var(--wm-text-strong);
}

input[type="text"],
input[type="email"],
input[type="password"],
input[type="search"],
input[type="number"],
select,
textarea,
.wm-input-dark,
.wm-textarea-dark {
  width: 100%;
  border-radius: var(--wm-radius-sm);
  border: 1px solid var(--wm-line-mid);
  background: rgba(2,8,23,0.46);
  padding: 12px 14px;
  font: inherit;
  box-sizing: border-box;
}

input::placeholder,
textarea::placeholder,
.wm-input-dark::placeholder,
.wm-textarea-dark::placeholder {
  color: var(--wm-text-muted);
}

input:focus,
select:focus,
textarea:focus,
.wm-input-dark:focus,
.wm-textarea-dark:focus {
  outline: none;
  border-color: rgba(56,189,248,0.42);
  box-shadow: 0 0 0 3px rgba(56,189,248,0.12);
}

/* -----------------------------------------
   Tables / result lists
----------------------------------------- */

table {
  width: 100%;
  border-collapse: collapse;
  color: var(--wm-text);
}

th,
td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(148,163,184,0.08);
  text-align: left;
  vertical-align: top;
}

th {
  font-size: 12px;
  font-weight: 800;
  color: #cbd5e1;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* -----------------------------------------
   Scroll areas
----------------------------------------- */

.wm-fit-page__scroll,
.wm-scroll,
.wm-shell-main__viewport,
.wm-guru-drawer__body {
  scrollbar-width: thin;
  scrollbar-color: rgba(148,163,184,0.35) transparent;
}

/* -----------------------------------------
   Mission control familiarity
----------------------------------------- */

.wm-shell-sidebar,
.wm-shell-sidebar * {
  box-sizing: border-box;
}

.wm-shell-sidebar button,
.wm-shell-sidebar a {
  min-height: 36px;
}

.wm-shell-sidebar .wm-chip,
.wm-shell-sidebar .wm-btn,
.wm-shell-sidebar button,
.wm-shell-sidebar a[class] {
  border-radius: 12px;
}

/* -----------------------------------------
   Guru identity
----------------------------------------- */

.wm-guru-backdrop {
  position: fixed;
  inset: 0;
  z-index: 119;
  border: 0;
  background: rgba(2, 8, 23, 0.24);
  backdrop-filter: blur(2px);
}

.wm-guru-drawer {
  position: fixed;
  top: 86px;
  right: 18px;
  width: min(560px, calc(100vw - 240px));
  height: min(520px, calc(100vh - 120px));
  z-index: 120;
  display: grid;
  grid-template-rows: auto 1fr;
  border-radius: 24px;
  border: 1px solid rgba(249, 115, 22, 0.36);
  background:
    radial-gradient(circle at top right, rgba(251, 146, 60, 0.18), transparent 28%),
    linear-gradient(180deg, rgba(21, 12, 8, 0.97), rgba(10, 12, 22, 0.96));
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.48),
    0 0 0 1px rgba(249, 115, 22, 0.08),
    0 0 36px rgba(249, 115, 22, 0.16);
  overflow: hidden;
  transform: translateY(10px) scale(0.98);
  opacity: 0;
  pointer-events: none;
  transition: transform 160ms ease, opacity 160ms ease;
}

.wm-guru-drawer--open {
  transform: translateY(0) scale(1);
  opacity: 1;
  pointer-events: auto;
}

.wm-guru-drawer__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(249, 115, 22, 0.16);
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.14), rgba(249, 115, 22, 0.06));
}

.wm-guru-drawer__eyebrow {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #fdba74;
}

.wm-guru-drawer__title {
  font-size: 18px;
  font-weight: 800;
  color: #fff;
}

.wm-floating-guru-logo {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 121;
  width: 60px;
  height: 60px;
  border-radius: 999px;
  border: 1px solid rgba(249,115,22,0.34);
  background: linear-gradient(135deg, var(--wm-orange-2), var(--wm-orange));
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow:
    0 18px 36px rgba(0,0,0,0.32),
    0 0 28px rgba(249,115,22,0.22);
  transition: transform 140ms ease, box-shadow 140ms ease;
}

.wm-floating-guru-logo:hover {
  transform: translateY(-2px) scale(1.03);
}

.wm-floating-guru-logo--active {
  box-shadow:
    0 18px 36px rgba(0,0,0,0.36),
    0 0 36px rgba(249,115,22,0.36);
}

.wm-floating-guru-logo__core {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: rgba(255,255,255,0.18);
  color: #fff;
}

/* -----------------------------------------
   Compact laptop discipline
----------------------------------------- */

@media (max-width: 1280px) {
  .wm-shell-body {
    grid-template-columns: 186px 1fr;
  }

  .wm-page-title,
  .wm-section-title,
  .wm-h1 {
    font-size: 24px;
  }

  .wm-section,
  .wm-block,
  .wm-panel,
  .wm-card,
  .wm-surface-card,
  .wm-product-card,
  .wm-info-card {
    padding: 12px;
  }
}

@media (max-width: 1180px) {
  .wm-guru-drawer {
    top: 82px;
    right: 12px;
    width: min(520px, calc(100vw - 210px));
    height: min(500px, calc(100vh - 110px));
  }

  .wm-grid-2,
  .wm-grid-3 {
    grid-template-columns: 1fr !important;
  }
}

@media (max-width: 900px) {
  .wm-guru-drawer {
    right: 10px;
    width: calc(100vw - 20px);
    height: min(500px, calc(100vh - 100px));
  }
}
'@

Save-Utf8NoBom -Path $cssPath -Content $css

Update-FileText -Path $mainPath -Transform {
  param($text)

  if ($text -notmatch 'import "@/styles/wm-final-polish.css";') {
    return 'import "@/styles/wm-final-polish.css";' + "`r`n" + $text
  }

  return $text
}

Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process esbuild -ErrorAction SilentlyContinue | Stop-Process -Force

$viteCachePath = Join-Path $Root "node_modules\.vite"
if (Test-Path $viteCachePath) {
  Remove-Item $viteCachePath -Recurse -Force
}

Set-Location $Root
npm run dev