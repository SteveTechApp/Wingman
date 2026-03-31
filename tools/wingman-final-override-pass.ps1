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

$cssPath = Join-Path $Root "src\styles\wm-final-override-pass.css"
$mainPath = Join-Path $Root "src\main.tsx"

$css = @'
/* =========================================
   WINGMAN FINAL OVERRIDE PASS
   This file is intended to win the cascade.
========================================= */

:root {
  --wm-ov-bg-0: #03101f;
  --wm-ov-bg-1: #07182c;
  --wm-ov-bg-2: #0a1f39;
  --wm-ov-surface-1: rgba(15, 23, 42, 0.88);
  --wm-ov-surface-2: rgba(15, 23, 42, 0.72);
  --wm-ov-surface-3: rgba(255,255,255,0.04);
  --wm-ov-line: rgba(148,163,184,0.12);
  --wm-ov-line-strong: rgba(96,165,250,0.24);
  --wm-ov-text: #f8fafc;
  --wm-ov-text-soft: rgba(226,232,240,0.78);
  --wm-ov-text-muted: rgba(226,232,240,0.56);
  --wm-ov-blue-1: #2563eb;
  --wm-ov-blue-2: #38bdf8;
  --wm-ov-orange-1: #f59e0b;
  --wm-ov-orange-2: #f97316;
  --wm-ov-shadow:
    inset 0 1px 0 rgba(255,255,255,0.04),
    0 14px 34px rgba(2,8,23,0.18);
}

/* -----------------------------------------
   GLOBAL DARK ENFORCEMENT
----------------------------------------- */

html,
body,
#root,
.wm-shell-root,
.wm-shell-main,
.wm-shell-main__viewport,
.wm-page,
.wm-fit-page,
.wm-app-bg {
  background-color: transparent !important;
  color: var(--wm-ov-text) !important;
}

body {
  background:
    radial-gradient(circle at top left, rgba(37,99,235,0.16), transparent 24%),
    linear-gradient(180deg, var(--wm-ov-bg-0) 0%, var(--wm-ov-bg-1) 55%, var(--wm-ov-bg-2) 100%) !important;
}

/* -----------------------------------------
   PAGE FRAME / GENERAL POLISH
----------------------------------------- */

.wm-page,
.wm-fit-page {
  display: grid !important;
  gap: 14px !important;
  align-content: start !important;
}

.wm-page > *,
.wm-fit-page > * {
  min-width: 0 !important;
}

.wm-page-kicker,
.wm-eyebrow,
.wm-section-kicker {
  color: #93c5fd !important;
  font-size: 11px !important;
  font-weight: 800 !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
}

.wm-page-title,
.wm-section-title,
.wm-h1,
.wm-page h1,
.wm-fit-page h1 {
  color: #ffffff !important;
  font-size: clamp(22px, 2.2vw, 28px) !important;
  line-height: 1.05 !important;
  font-weight: 900 !important;
  letter-spacing: -0.02em !important;
}

.wm-page-copy,
.wm-section-copy,
.wm-subtitle,
.wm-muted-copy,
.wm-page p,
.wm-fit-page p {
  color: var(--wm-ov-text-soft) !important;
}

/* -----------------------------------------
   CARDS / PANELS
----------------------------------------- */

.wm-surface-card,
.wm-surface-card--soft,
.wm-card,
.wm-panel,
.wm-info-card,
.wm-product-card,
.wm-tool-card,
.wm-choice-card,
.wm-stat-card,
.wm-page section,
.wm-fit-page section {
  border-radius: 18px !important;
  border: 1px solid var(--wm-ov-line) !important;
  color: var(--wm-ov-text) !important;
}

.wm-surface-card,
.wm-card,
.wm-panel,
.wm-info-card,
.wm-product-card,
.wm-tool-card,
.wm-stat-card {
  background: linear-gradient(180deg, var(--wm-ov-surface-1), var(--wm-ov-surface-2)) !important;
  box-shadow: var(--wm-ov-shadow) !important;
}

.wm-surface-card--soft {
  background: var(--wm-ov-surface-3) !important;
}

.wm-choice-card {
  background: linear-gradient(180deg, rgba(15,23,42,0.78), rgba(15,23,42,0.62)) !important;
  box-shadow: var(--wm-ov-shadow) !important;
  transition:
    transform 140ms ease,
    border-color 140ms ease,
    box-shadow 140ms ease !important;
}

.wm-choice-card:hover,
.wm-card:hover,
.wm-tool-card:hover,
.wm-info-card:hover {
  transform: translateY(-2px) !important;
  border-color: var(--wm-ov-line-strong) !important;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.05),
    0 18px 38px rgba(2,8,23,0.22) !important;
}

/* -----------------------------------------
   BUTTONS
----------------------------------------- */

button,
.wm-btn,
.wm-btn-primary,
.wm-btn-secondary,
.wm-chip,
a.wm-btn,
a.wm-btn-primary,
a.wm-btn-secondary {
  font-family: inherit !important;
}

.wm-btn,
.wm-btn-primary,
.wm-btn-secondary,
.wm-chip,
button[class*="wm-btn"],
button[class*="wm-chip"] {
  appearance: none !important;
  min-height: 38px !important;
  padding: 10px 14px !important;
  border-radius: 999px !important;
  font-size: 12px !important;
  font-weight: 800 !important;
  line-height: 1 !important;
  white-space: nowrap !important;
  cursor: pointer !important;
  transition:
    transform 120ms ease,
    box-shadow 120ms ease,
    border-color 120ms ease,
    background 120ms ease !important;
}

.wm-btn:hover,
.wm-btn-primary:hover,
.wm-btn-secondary:hover,
.wm-chip:hover {
  transform: translateY(-1px) !important;
}

.wm-btn-primary,
button.wm-btn-primary,
a.wm-btn-primary,
.wm-chip--active {
  color: #ffffff !important;
  border: 1px solid rgba(96,165,250,0.28) !important;
  background: linear-gradient(135deg, var(--wm-ov-blue-1), var(--wm-ov-blue-2)) !important;
  box-shadow: 0 10px 22px rgba(37,99,235,0.18) !important;
}

.wm-btn-secondary,
.wm-btn,
button.wm-btn-secondary,
a.wm-btn-secondary,
.wm-chip {
  color: var(--wm-ov-text) !important;
  border: 1px solid var(--wm-ov-line) !important;
  background: rgba(255,255,255,0.05) !important;
}

/* -----------------------------------------
   INPUTS / SELECTS / TEXTAREAS
----------------------------------------- */

input,
select,
textarea,
.wm-input-dark,
.wm-textarea-dark {
  color: #ffffff !important;
  caret-color: #ffffff !important;
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
  background: rgba(2,8,23,0.52) !important;
  border: 1px solid var(--wm-ov-line) !important;
  border-radius: 14px !important;
  padding: 12px 14px !important;
  box-sizing: border-box !important;
}

input::placeholder,
textarea::placeholder,
.wm-input-dark::placeholder,
.wm-textarea-dark::placeholder {
  color: var(--wm-ov-text-muted) !important;
}

input:focus,
select:focus,
textarea:focus,
.wm-input-dark:focus,
.wm-textarea-dark:focus {
  outline: none !important;
  border-color: rgba(56,189,248,0.42) !important;
  box-shadow: 0 0 0 3px rgba(56,189,248,0.12) !important;
}

/* -----------------------------------------
   MISSION CONTROL SIDEBAR
----------------------------------------- */

.wm-shell-sidebar,
.wm-shell-sidebar * {
  box-sizing: border-box !important;
}

.wm-shell-sidebar {
  background: linear-gradient(180deg, rgba(2,8,23,0.84), rgba(2,8,23,0.72)) !important;
  border-right: 1px solid rgba(148,163,184,0.10) !important;
}

.wm-shell-sidebar button,
.wm-shell-sidebar a {
  min-height: 36px !important;
}

.wm-shell-sidebar .wm-btn,
.wm-shell-sidebar .wm-chip,
.wm-shell-sidebar button,
.wm-shell-sidebar a[class] {
  border-radius: 12px !important;
  white-space: nowrap !important;
}

.wm-shell-sidebar .wm-btn-primary,
.wm-shell-sidebar .wm-chip--active,
.wm-shell-sidebar button[aria-current="page"],
.wm-shell-sidebar a[aria-current="page"],
.wm-shell-sidebar .active {
  background: linear-gradient(135deg, rgba(37,99,235,0.34), rgba(56,189,248,0.24)) !important;
  border-color: rgba(96,165,250,0.26) !important;
  color: #ffffff !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04) !important;
}

/* -----------------------------------------
   TABLES / DENSE DATA
----------------------------------------- */

table {
  width: 100% !important;
  border-collapse: collapse !important;
  color: var(--wm-ov-text) !important;
}

th,
td {
  padding: 10px 12px !important;
  border-bottom: 1px solid rgba(148,163,184,0.08) !important;
  vertical-align: top !important;
}

th {
  font-size: 12px !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.04em !important;
  color: #cbd5e1 !important;
}

/* -----------------------------------------
   GURU VISUAL SEPARATION
----------------------------------------- */

.wm-guru-drawer {
  border: 1px solid rgba(249,115,22,0.36) !important;
  background:
    radial-gradient(circle at top right, rgba(251,146,60,0.18), transparent 28%),
    linear-gradient(180deg, rgba(21,12,8,0.97), rgba(10,12,22,0.96)) !important;
  box-shadow:
    0 24px 60px rgba(0,0,0,0.48),
    0 0 0 1px rgba(249,115,22,0.08),
    0 0 36px rgba(249,115,22,0.16) !important;
}

.wm-floating-guru-logo {
  background: linear-gradient(135deg, var(--wm-ov-orange-1), var(--wm-ov-orange-2)) !important;
  border-color: rgba(249,115,22,0.34) !important;
}

/* -----------------------------------------
   LAPTOP DISCIPLINE
----------------------------------------- */

@media (max-width: 1280px) {
  .wm-page-title,
  .wm-section-title,
  .wm-h1,
  .wm-page h1,
  .wm-fit-page h1 {
    font-size: 24px !important;
  }

  .wm-surface-card,
  .wm-surface-card--soft,
  .wm-card,
  .wm-panel,
  .wm-info-card,
  .wm-product-card,
  .wm-tool-card,
  .wm-choice-card {
    padding: 12px !important;
  }
}

@media (max-width: 1180px) {
  .wm-grid-2,
  .wm-grid-3,
  [class*="grid-template-columns"] {
    grid-template-columns: 1fr !important;
  }
}
'@

Save-Utf8NoBom -Path $cssPath -Content $css

Update-FileText -Path $mainPath -Transform {
  param($text)

  if ($text -notmatch 'import "@/styles/wm-final-override-pass.css";') {
    return 'import "@/styles/wm-final-override-pass.css";' + "`r`n" + $text
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