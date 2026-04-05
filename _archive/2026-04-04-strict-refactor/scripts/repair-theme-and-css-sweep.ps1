Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# --------------------------------------------
# WyreStorm Wingman - Theme repair + CSS sweep
# --------------------------------------------

Set-Location "C:\Users\steve\wingman"

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path (Get-Location).Path "_BACKUPS\theme-repair-$timestamp"
$quarantineRoot = Join-Path (Get-Location).Path "_QUARANTINE\css-unused-$timestamp"

New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
New-Item -ItemType Directory -Force -Path $quarantineRoot | Out-Null

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  $fullPath = if ([System.IO.Path]::IsPathRooted($Path)) { $Path } else { Join-Path (Get-Location).Path $Path }
  $dir = Split-Path $fullPath -Parent

  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($fullPath, $Content, $utf8)
}

function Backup-File {
  param([Parameter(Mandatory = $true)][string]$Path)

  if (-not (Test-Path $Path)) { return }

  $source = Resolve-Path $Path
  $relative = [System.IO.Path]::GetRelativePath((Get-Location).Path, $source.Path)
  $target = Join-Path $backupRoot $relative
  $targetDir = Split-Path $target -Parent

  if ($targetDir -and -not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
  }

  Copy-Item $source.Path $target -Force
}

function Replace-InFile {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][hashtable]$Map
  )

  if (-not (Test-Path $Path)) { return $false }

  $original = Get-Content $Path -Raw
  $updated = $original

  foreach ($key in $Map.Keys) {
    $updated = $updated.Replace($key, [string]$Map[$key])
  }

  if ($updated -ne $original) {
    Backup-File $Path
    Save-Utf8NoBom $Path $updated
    return $true
  }

  return $false
}

function Remove-LegacyThemeImports {
  param([Parameter(Mandatory = $true)][string]$Root)

  $files = Get-ChildItem $Root -Recurse -File -Include *.ts,*.tsx,*.css
  $changed = @()

  foreach ($file in $files) {
    $text = Get-Content $file.FullName -Raw
    $newText = $text

    # Remove direct imports in TS/TSX
    $newText = [regex]::Replace(
      $newText,
      '(?ms)^\s*import\s+["''][^"'']*(wm-theme-final|wm-theme-system)\.css["''];\s*\r?\n?',
      ''
    )

    # Remove CSS @imports
    $newText = [regex]::Replace(
      $newText,
      '(?ms)^\s*@import\s+["''][^"'']*(wm-theme-final|wm-theme-system)\.css["''];\s*\r?\n?',
      ''
    )

    if ($newText -ne $text) {
      Backup-File $file.FullName
      Save-Utf8NoBom $file.FullName $newText
      $changed += $file.FullName
    }
  }

  return $changed
}

# --------------------------------------------
# 1) Replace app.css with theme-aware version
# --------------------------------------------

$appCssPath = "src\styles\app.css"
Backup-File $appCssPath

$appCss = @'
@import "./wm-floating.css";
@import "./wm-dashboard-evolution.css";
@import "./wm-unified-page-system.css";

:root {
  --wm-font-sans: "Aptos", "Segoe UI", sans-serif;
  --wm-font-display: "Bahnschrift", "Aptos", "Segoe UI", sans-serif;

  --wm-shadow-sm: 0 18px 40px rgba(2, 8, 23, 0.18);
  --wm-shadow-md: 0 28px 80px rgba(2, 8, 23, 0.3);

  --wm-radius-sm: 16px;
  --wm-radius-md: 22px;
  --wm-gap: 18px;
  --wm-topbar-h: 96px;
  --wm-sidebar-w: 272px;
}

html,
body,
#root {
  width: 100%;
  min-height: 100vh;
  margin: 0;
}

html {
  font-family: var(--wm-font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  color: var(--wm-text);
  background: var(--wm-bg);
  overflow-x: hidden;
}

body[data-theme="dark"] {
  background:
    radial-gradient(circle at top left, rgba(14, 165, 233, 0.14), transparent 22%),
    radial-gradient(circle at top right, rgba(96, 165, 250, 0.16), transparent 28%),
    linear-gradient(180deg, var(--wm-bg) 0%, var(--wm-bg-elevated) 100%);
}

body[data-theme="light"] {
  background: var(--wm-bg);
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

button,
input,
select,
textarea {
  font: inherit;
}

a {
  color: inherit;
  text-decoration: none;
}

:is(h1, h2, h3, h4, h5, h6) {
  margin: 0;
  color: var(--wm-text);
}

p {
  margin: 0;
  color: var(--wm-text-soft);
}

.wm-shell-root {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 100vh;
  color: var(--wm-text);
}

.wm-shell-grid {
  display: grid;
  grid-template-columns: var(--wm-sidebar-w) minmax(0, 1fr);
  min-height: 0;
}

.wm-shell-nav-column {
  min-height: 0;
  overflow-y: auto;
  border-right: 1px solid var(--wm-border);
  background: var(--wm-sidebar);
  backdrop-filter: blur(16px);
}

.wm-app-main {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 22px;
}

.wm-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: var(--wm-topbar-h);
  padding: 18px 24px;
  border-bottom: 1px solid var(--wm-border);
  background: var(--wm-topbar);
  backdrop-filter: blur(14px);
  position: sticky;
  top: 0;
  z-index: 40;
}

.wm-topbar__brand {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.wm-topbar__brand-logo {
  display: block;
  width: auto;
  height: 58px;
  object-fit: contain;
  filter: drop-shadow(0 18px 24px rgba(2, 8, 23, 0.18));
}

.wm-topbar__brand-copy {
  display: grid;
  gap: 4px;
}

.wm-topbar__eyebrow,
.wm-page-kicker,
.wm-focus-guide__title,
.wm-frame__eyebrow,
.wm-stat-card__label,
.wm-product-card__sku,
.wm-dashboard-start-card__eyebrow,
.wm-projects-page__row-stage,
.wm-guru-fab__eyebrow,
.wm-guru-fab__suggestion-title {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--wm-accent);
}

.wm-topbar__title {
  font-family: var(--wm-font-display);
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.wm-topbar__subtitle {
  font-size: 13px;
  color: var(--wm-text-muted);
}

.wm-topbar__nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.wm-pill-button {
  border: 1px solid var(--wm-border);
  border-radius: 999px;
  background: var(--wm-surface);
  color: var(--wm-text-soft);
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
  transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
}

.wm-pill-button:hover {
  transform: translateY(-1px);
  border-color: var(--wm-border-strong);
  background: var(--wm-surface-2);
}

.wm-pill-button--active {
  color: #04111d;
  border-color: transparent;
  background: linear-gradient(135deg, var(--wm-accent), color-mix(in srgb, var(--wm-accent) 40%, white 60%));
  box-shadow: 0 14px 28px color-mix(in srgb, var(--wm-accent) 24%, transparent);
}

.wm-nav {
  display: grid;
  gap: 18px;
  padding: 22px 16px 28px;
}

.wm-nav__section {
  display: grid;
  gap: 10px;
}

.wm-nav__title {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--wm-text-muted);
  padding-inline: 8px;
}

.wm-nav__items {
  display: grid;
  gap: 8px;
}

.wm-nav__item {
  display: flex;
  width: 100%;
  align-items: flex-start;
  padding: 12px 14px;
  border: 1px solid transparent;
  border-radius: 16px;
  background: var(--wm-surface);
  color: var(--wm-text-soft);
  cursor: pointer;
  text-align: left;
  transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
}

.wm-nav__item:hover {
  transform: translateX(2px);
  border-color: var(--wm-border-strong);
  background: var(--wm-surface-2);
}

.wm-nav__item--active {
  border-color: var(--wm-border-strong);
  background: color-mix(in srgb, var(--wm-accent) 10%, var(--wm-surface) 90%);
  color: var(--wm-text);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--wm-accent) 12%, transparent);
}

.wm-nav__item-copy {
  display: grid;
  gap: 4px;
}

.wm-nav__item-label {
  font-size: 14px;
  font-weight: 700;
}

.wm-nav__item-hint {
  font-size: 12px;
  color: var(--wm-text-muted);
}

.wm-fit-page,
.wm-page,
.wm-page--frame,
.wm-frame,
.wmu-adopt {
  display: grid;
  gap: var(--wm-gap);
  width: 100%;
  min-width: 0;
}

.wm-fit-page__hero,
.wm-frame__hero,
.wm-surface-card,
.wm-product-card,
.wm-block,
.wm-projects-page__row,
.wm-tool-card,
.wm-flow-card,
.wm-dashboard-start-card,
.wm-stat-card,
.wm-dashboard-empty,
.wm-guru-fab__panel,
.wm-guru-fab__summary,
.wm-guru-fab__suggestion {
  border-radius: var(--wm-radius-md);
  border: 1px solid var(--wm-border);
  background: var(--wm-surface);
  box-shadow: var(--wm-shadow-sm);
}

.wm-fit-page__hero,
.wm-frame__hero {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.9fr);
  gap: 22px;
  padding: 28px;
  position: relative;
  overflow: hidden;
}

.wm-fit-page__hero::before,
.wm-frame__hero::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--wm-accent) 16%, transparent), transparent 30%),
    radial-gradient(circle at bottom left, color-mix(in srgb, var(--wm-info) 12%, transparent), transparent 28%);
  pointer-events: none;
}

.wm-fit-page__body,
.wm-frame__body {
  display: grid;
  gap: var(--wm-gap);
}

.wm-fit-page__scroll {
  display: grid;
  gap: 12px;
  min-height: 0;
}

.wm-surface-card,
.wm-block {
  display: grid;
  gap: 14px;
  padding: 18px;
}

.wm-surface-card--soft {
  border-radius: var(--wm-radius-sm);
  border: 1px solid var(--wm-border);
  background: var(--wm-surface-2);
}

.wm-page-title {
  font-family: var(--wm-font-display);
  font-size: clamp(2rem, 3vw, 3rem);
  line-height: 0.98;
  letter-spacing: -0.04em;
}

.wm-page-title--compact {
  max-width: 16ch;
}

.wm-page-copy,
.wm-body,
.wm-body-sm,
.wm-section-copy,
.wm-focus-guide__copy,
.wm-focus-guide__note,
.wm-stat-card__meta,
.wm-product-card__copy,
.wm-product-card__meta,
.wm-dashboard-start-card__copy,
.wm-tool-card__copy,
.wm-tool-card__cta,
.wm-flow-card__label,
.wm-projects-page__row-meta,
.wm-guru-fab__suggestion-copy,
.wm-guru-fab__summary,
.wm-guru-fab__closed-copy,
.wm-route-loading {
  color: var(--wm-text-soft);
  line-height: 1.65;
}

.wm-body-sm {
  font-size: 13px;
}

.wm-section-title,
.wm-product-card__title,
.wm-tool-card__title,
.wm-block__title {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--wm-text);
}

.wm-toolbar-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.wm-toolbar-row--between {
  justify-content: space-between;
}

.wm-toolbar-row--end {
  justify-content: flex-end;
}

.wm-btn,
.wm-btn-primary,
.wm-btn-secondary,
.wm-auth-btn,
.wm-chip {
  appearance: none;
  cursor: pointer;
}

.wm-btn-primary,
.wm-btn-secondary,
.wm-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 11px 16px;
  border-radius: 14px;
  font-weight: 700;
  text-decoration: none;
  transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
}

.wm-btn,
.wm-btn-secondary {
  border: 1px solid var(--wm-border);
  background: var(--wm-surface);
  color: var(--wm-text);
}

.wm-btn-primary {
  border: 0;
  background: linear-gradient(135deg, var(--wm-accent), color-mix(in srgb, var(--wm-accent) 40%, white 60%));
  color: #04111d;
  box-shadow: 0 16px 32px color-mix(in srgb, var(--wm-accent) 20%, transparent);
}

.wm-btn:hover,
.wm-btn-primary:hover,
.wm-btn-secondary:hover {
  transform: translateY(-1px);
}

.wm-btn:focus-visible,
.wm-btn-primary:focus-visible,
.wm-btn-secondary:focus-visible,
.wm-chip:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--wm-accent) 18%, transparent);
}

.wm-chip {
  min-height: 38px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--wm-border);
  background: var(--wm-surface);
  color: var(--wm-text-soft);
  font-size: 13px;
  font-weight: 700;
}

.wm-chip--active {
  border-color: var(--wm-border-strong);
  background: color-mix(in srgb, var(--wm-accent) 10%, var(--wm-surface) 90%);
  color: var(--wm-text);
}

.wm-input-dark,
.wm-textarea-dark,
.wm-form-input {
  width: 100%;
  min-height: 44px;
  padding: 12px 14px;
  border: 1px solid var(--wm-border);
  border-radius: 14px;
  background: var(--wm-input);
  color: var(--wm-text);
  outline: none;
  transition: border-color 140ms ease, box-shadow 140ms ease;
}

.wm-textarea-dark {
  min-height: 120px;
  resize: vertical;
}

.wm-input-dark:focus,
.wm-textarea-dark:focus,
.wm-form-input:focus {
  border-color: var(--wm-border-strong);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--wm-accent) 16%, transparent);
}

.wm-form-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--wm-text-muted);
}

.wm-grid-2,
.wm-grid-3,
.wm-frame__stats,
.wm-dashboard-page__grid,
.wm-tool-card-grid,
.wm-flow-grid {
  display: grid;
  gap: var(--wm-gap);
}

.wm-grid-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.wm-grid-3,
.wm-frame__stats,
.wm-tool-card-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.wm-focus-guide {
  display: grid;
  gap: 12px;
  padding: 18px;
  border-radius: 20px;
  border: 1px solid var(--wm-border);
  background: var(--wm-surface-2);
  position: relative;
  z-index: 1;
}

.wm-focus-guide__step {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 12px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid var(--wm-border);
  background: var(--wm-surface);
}

.wm-focus-guide__step--active {
  border-color: var(--wm-border-strong);
  background: color-mix(in srgb, var(--wm-accent) 8%, var(--wm-surface) 92%);
}

.wm-focus-guide__badge {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--wm-accent), color-mix(in srgb, var(--wm-accent) 40%, white 60%));
  color: #04111d;
  font-weight: 800;
}

.wm-focus-guide__name {
  font-size: 14px;
  font-weight: 700;
  color: var(--wm-text);
}

.wm-product-card {
  display: grid;
  gap: 10px;
  padding: 16px;
  min-height: 0;
}

.wm-dashboard-page {
  display: grid;
  gap: var(--wm-gap);
}

.wm-dashboard-page__hero-copy {
  display: grid;
  gap: 12px;
  position: relative;
  z-index: 1;
}

.wm-dashboard-page__section {
  gap: 16px;
}

.wm-dashboard-page__grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.wm-dashboard-start-card {
  display: grid;
  gap: 12px;
  text-align: left;
  min-height: 220px;
  padding: 18px;
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.wm-dashboard-start-card:hover {
  transform: translateY(-2px);
  border-color: var(--wm-border-strong);
  box-shadow: var(--wm-shadow-md);
}

.wm-dashboard-start-card__top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.wm-dashboard-start-card__icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: color-mix(in srgb, var(--wm-accent) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--wm-accent) 24%, transparent);
  color: var(--wm-text);
  font-weight: 800;
}

.wm-dashboard-start-card__title {
  font-size: 26px;
  font-weight: 800;
  line-height: 1.05;
  color: var(--wm-text);
}

.wm-dashboard-start-card__cta {
  margin-top: auto;
  color: var(--wm-accent);
  font-size: 14px;
  font-weight: 800;
}

.wm-frame {
  gap: 18px;
}

.wm-frame__hero-main,
.wm-frame__body,
.wm-frame__actions {
  position: relative;
  z-index: 1;
}

.wm-frame__title {
  font-family: var(--wm-font-display);
  font-size: clamp(2.1rem, 3.4vw, 3.6rem);
  line-height: 0.98;
  letter-spacing: -0.04em;
  color: var(--wm-text);
}

.wm-frame__description,
.wm-block__description {
  max-width: 72ch;
}

.wm-stat-card {
  display: grid;
  gap: 8px;
  padding: 18px;
}

.wm-stat-card__value {
  font-family: var(--wm-font-display);
  font-size: 34px;
  line-height: 1;
  letter-spacing: -0.04em;
  color: var(--wm-text);
}

.wm-block__header {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
}

.wm-block__header-copy {
  display: grid;
  gap: 6px;
}

.wm-tool-card,
.wm-flow-card {
  display: grid;
  gap: 12px;
  padding: 18px;
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.wm-tool-card:hover,
.wm-flow-card:hover {
  transform: translateY(-2px);
  border-color: var(--wm-border-strong);
  box-shadow: var(--wm-shadow-md);
}

.wm-tool-card__head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}

.wm-tool-card__badge,
.wm-flow-card__step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 38px;
  min-height: 38px;
  padding: 6px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--wm-accent) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--wm-accent) 24%, transparent);
  color: var(--wm-text);
  font-size: 12px;
  font-weight: 800;
}

.wm-flow-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.wm-flow-card__label {
  font-size: 14px;
  font-weight: 700;
}

.wm-projects-page__list {
  display: grid;
  gap: 12px;
}

.wm-projects-page__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  padding: 16px;
}

.wm-projects-page__row-main {
  display: grid;
  gap: 10px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.wm-projects-page__row-topline {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.wm-projects-page__row-title {
  font-size: 17px;
  font-weight: 800;
  color: var(--wm-text);
}

.wm-projects-page__row-actions {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.wm-projects-page__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid var(--wm-border);
  background: var(--wm-surface);
  color: var(--wm-text);
}

.wm-projects-page__icon-btn--danger {
  color: var(--wm-danger);
}

.wm-dashboard-empty {
  padding: 18px;
  border-radius: var(--wm-radius-md);
  border: 1px dashed var(--wm-border);
  background: var(--wm-surface-2);
}

.wm-title-lg {
  font-size: 18px;
  font-weight: 800;
  margin-bottom: 6px;
  color: var(--wm-text);
}

.wm-guru-fab {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 55;
  width: 172px;
  transition: width 160ms ease;
}

.wm-guru-fab.is-open {
  width: 360px;
}

.wm-guru-fab__panel {
  border-radius: 22px;
  overflow: hidden;
  backdrop-filter: blur(16px);
}

.wm-guru-fab__toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.wm-guru-fab__header {
  display: grid;
  gap: 4px;
}

.wm-guru-fab__title {
  font-size: 15px;
  font-weight: 800;
  color: var(--wm-text);
}

.wm-guru-fab__toggle-pill {
  min-width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  border: 1px solid var(--wm-border);
  background: var(--wm-surface-2);
  font-weight: 800;
  color: var(--wm-text);
}

.wm-guru-fab__body {
  display: grid;
  gap: 12px;
  padding: 0 16px 16px;
}

.wm-guru-fab__summary,
.wm-guru-fab__suggestion {
  padding: 12px;
  border-radius: 16px;
  border: 1px solid var(--wm-border);
  background: var(--wm-surface-2);
}

.wm-guru-fab__suggestions {
  display: grid;
  gap: 10px;
}

::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--wm-text-muted) 45%, transparent);
  border-radius: 999px;
}

::-webkit-scrollbar-track {
  background: color-mix(in srgb, var(--wm-bg-elevated) 65%, transparent);
}

@media (max-width: 1180px) {
  .wm-shell-grid,
  .wm-fit-page__hero,
  .wm-frame__hero,
  .wm-grid-3,
  .wm-frame__stats,
  .wm-flow-grid,
  .wm-dashboard-page__grid,
  .wm-tool-card-grid {
    grid-template-columns: 1fr;
  }

  .wm-app-main {
    padding: 16px;
  }

  .wm-guru-fab,
  .wm-guru-fab.is-open {
    width: min(360px, calc(100vw - 24px));
    right: 12px;
    bottom: 12px;
  }
}

@media (max-width: 1100px) {
  .wm-shell-grid {
    grid-template-columns: 1fr;
  }

  .wm-shell-nav-column {
    display: none;
  }
}

@media (max-width: 880px) {
  .wm-topbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .wm-topbar__nav {
    justify-content: flex-start;
  }

  .wm-grid-2,
  .wm-projects-page__row {
    grid-template-columns: 1fr;
  }
}
'@

Save-Utf8NoBom $appCssPath $appCss

# --------------------------------------------
# 2) Patch known hard-coded theme offenders
# --------------------------------------------

$patchedFiles = @()

$patchMapByFile = @{
  "src\components\competitor\CompetitorLookupStatusPanel.tsx" = @{
    'color: "#fde68a"' = 'color: "var(--wm-warning)"'
  }
  "src\components\competitor\CompetitorManualComparisonPanel.tsx" = @{
    'color: "#eef5ff"' = 'color: "var(--wm-text)"'
    'color: "#dffcff"' = 'color: "var(--wm-info)"'
    'color: "#ffe6b7"' = 'color: "var(--wm-warning)"'
  }
  "src\components\competitor\CompetitorMatchFinderPanel.tsx" = @{
    'color: "#eef5ff"' = 'color: "var(--wm-text)"'
    'color: "#dbeafe"' = 'color: "var(--wm-text-soft)"'
  }
  "src\pages\InviteAcceptancePage.tsx" = @{
    'color: "#ff9da5"' = 'color: "var(--wm-danger)"'
  }
  "src\ui2\page\PageChrome.tsx" = @{
    'background: "linear-gradient(180deg, rgba(18,32,49,0.86), rgba(13,24,39,0.9))"' = 'background: "var(--wm-surface)"'
  }
}

foreach ($file in $patchMapByFile.Keys) {
  if (Replace-InFile -Path $file -Map $patchMapByFile[$file]) {
    $patchedFiles += $file
  }
}

# --------------------------------------------
# 3) Remove legacy theme override imports
# --------------------------------------------

$legacyImportChanges = Remove-LegacyThemeImports -Root "src"

# --------------------------------------------
# 4) Sweep unused CSS files
#    Moves unused CSS into quarantine, does not delete
# --------------------------------------------

function Get-RelativePathSafe {
  param([string]$Base, [string]$Path)
  return [System.IO.Path]::GetRelativePath($Base, $Path).Replace('\', '/')
}

function Resolve-ImportToFile {
  param(
    [Parameter(Mandatory = $true)][string]$ImporterFile,
    [Parameter(Mandatory = $true)][string]$ImportValue
  )

  if ([string]::IsNullOrWhiteSpace($ImportValue)) { return $null }
  if ($ImportValue -match '^(https?:)?//') { return $null }
  if (-not $ImportValue.StartsWith(".")) { return $null }

  $baseDir = Split-Path $ImporterFile -Parent
  $candidate = Join-Path $baseDir $ImportValue

  if ([System.IO.Path]::GetExtension($candidate)) {
    if (Test-Path $candidate) { return (Resolve-Path $candidate).Path }
  } else {
    $cssCandidate = "$candidate.css"
    if (Test-Path $cssCandidate) { return (Resolve-Path $cssCandidate).Path }
  }

  return $null
}

function Get-DirectCssImportsFromCode {
  param([Parameter(Mandatory = $true)][string]$FilePath)

  $text = Get-Content $FilePath -Raw
  $matches = [regex]::Matches($text, 'import\s+["'']([^"'']+\.css)["'']')
  $results = New-Object System.Collections.Generic.List[string]

  foreach ($m in $matches) {
    $resolved = Resolve-ImportToFile -ImporterFile $FilePath -ImportValue $m.Groups[1].Value
    if ($resolved) { $results.Add($resolved) }
  }

  return $results
}

function Get-DirectCssImportsFromCss {
  param([Parameter(Mandatory = $true)][string]$FilePath)

  $text = Get-Content $FilePath -Raw
  $matches = [regex]::Matches($text, '@import\s+["'']([^"'']+\.css)["'']')
  $results = New-Object System.Collections.Generic.List[string]

  foreach ($m in $matches) {
    $resolved = Resolve-ImportToFile -ImporterFile $FilePath -ImportValue $m.Groups[1].Value
    if ($resolved) { $results.Add($resolved) }
  }

  return $results
}

$srcRoot = Join-Path (Get-Location).Path "src"
$allCss = Get-ChildItem $srcRoot -Recurse -File -Include *.css | ForEach-Object { $_.FullName }
$allCode = Get-ChildItem $srcRoot -Recurse -File -Include *.ts,*.tsx,*.js,*.jsx | ForEach-Object { $_.FullName }

$usedCss = New-Object System.Collections.Generic.HashSet[string]([System.StringComparer]::OrdinalIgnoreCase)
$queue = New-Object System.Collections.Generic.Queue[string]

foreach ($codeFile in $allCode) {
  foreach ($importedCss in (Get-DirectCssImportsFromCode -FilePath $codeFile)) {
    if ($usedCss.Add($importedCss)) {
      $queue.Enqueue($importedCss)
    }
  }
}

while ($queue.Count -gt 0) {
  $currentCss = $queue.Dequeue()
  foreach ($childCss in (Get-DirectCssImportsFromCss -FilePath $currentCss)) {
    if ($usedCss.Add($childCss)) {
      $queue.Enqueue($childCss)
    }
  }
}

# Always keep core files even if graph misses them
$coreKeep = @(
  (Join-Path $srcRoot "styles\theme.css"),
  (Join-Path $srcRoot "styles\app.css")
) | Where-Object { Test-Path $_ }

foreach ($k in $coreKeep) { [void]$usedCss.Add((Resolve-Path $k).Path) }

$unusedCss = @()
foreach ($css in $allCss) {
  $resolvedCss = (Resolve-Path $css).Path
  if (-not $usedCss.Contains($resolvedCss)) {
    $unusedCss += $resolvedCss
  }
}

$quarantined = @()

foreach ($cssFile in $unusedCss) {
  $relative = [System.IO.Path]::GetRelativePath($srcRoot, $cssFile)
  $target = Join-Path $quarantineRoot $relative
  $targetDir = Split-Path $target -Parent

  if ($targetDir -and -not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
  }

  Move-Item $cssFile $target -Force
  $quarantined += $relative
}

# --------------------------------------------
# 5) Reports
# --------------------------------------------

$usedCssReport = @()
foreach ($css in ($usedCss | Sort-Object)) {
  $usedCssReport += (Get-RelativePathSafe -Base $srcRoot -Path $css)
}

$report = @"
Wingman Theme Repair + CSS Sweep
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

BACKUP:
$backupRoot

QUARANTINE:
$quarantineRoot

PATCHED FILES:
$($patchedFiles | Sort-Object | ForEach-Object { "- $_" } | Out-String)

FILES WITH LEGACY THEME IMPORTS REMOVED:
$($legacyImportChanges | Sort-Object | ForEach-Object { "- $([System.IO.Path]::GetRelativePath((Get-Location).Path, $_))" } | Out-String)

USED CSS FILES:
$($usedCssReport | ForEach-Object { "- $_" } | Out-String)

QUARANTINED UNUSED CSS FILES:
$($quarantined | Sort-Object | ForEach-Object { "- $_" } | Out-String)
"@

$reportPath = Join-Path $backupRoot "theme-repair-report.txt"
Save-Utf8NoBom $reportPath $report

Write-Host ""
Write-Host "Theme repair complete." -ForegroundColor Green
Write-Host "Backup: $backupRoot"
Write-Host "Quarantine: $quarantineRoot"
Write-Host "Report: $reportPath"
Write-Host ""

if ($quarantined.Count -gt 0) {
  Write-Host "Unused CSS moved to quarantine:" -ForegroundColor Yellow
  $quarantined | Sort-Object | ForEach-Object { Write-Host " - $_" }
} else {
  Write-Host "No unused CSS files were found by the import graph."
}

Write-Host ""
Write-Host "Next recommended steps:" -ForegroundColor Cyan
Write-Host "1. npm run typecheck"
Write-Host "2. npm run dev"
Write-Host "3. Toggle dark/light theme and inspect top bar, sidebar, cards, forms, and Guru panel"