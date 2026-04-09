param(
  [string]$RepoRoot = "C:\Users\steve\wingman"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Info($msg) {
  Write-Host "[INFO] $msg" -ForegroundColor Cyan
}

function Write-Ok($msg) {
  Write-Host "[ OK ] $msg" -ForegroundColor Green
}

function Write-WarnMsg($msg) {
  Write-Host "[WARN] $msg" -ForegroundColor Yellow
}

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Backup-File {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$BackupRoot
  )

  if (-not (Test-Path -LiteralPath $Path)) { return }

  $name = Split-Path $Path -Leaf
  $dest = Join-Path $BackupRoot $name
  Copy-Item -LiteralPath $Path -Destination $dest -Force
}

function Ensure-ImportLast {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string]$ImportLine
  )

  if (-not (Test-Path -LiteralPath $FilePath)) {
    throw "Cannot update imports because file does not exist: $FilePath"
  }

  $raw = Get-Content -LiteralPath $FilePath -Raw
  $escaped = [regex]::Escape($ImportLine)

  $raw = [regex]::Replace(
    $raw,
    "^\s*$escaped\s*\r?\n?",
    "",
    [System.Text.RegularExpressions.RegexOptions]::Multiline
  )

  $importMatches = [regex]::Matches(
    $raw,
    '^\s*import\s+.*?;\s*$',
    [System.Text.RegularExpressions.RegexOptions]::Multiline
  )

  if ($importMatches.Count -gt 0) {
    $last = $importMatches[$importMatches.Count - 1]
    $insertAt = $last.Index + $last.Length
    $updated = $raw.Insert($insertAt, "`r`n$ImportLine")
    Save-Utf8NoBom -Path $FilePath -Content $updated
    return
  }

  Save-Utf8NoBom -Path $FilePath -Content ($ImportLine + "`r`n" + $raw)
}

function Ensure-ImportsAreLast {
  param(
    [Parameter(Mandatory = $true)][string]$MainTsxPath
  )

  Ensure-ImportLast -FilePath $MainTsxPath -ImportLine 'import "./styles/wm-tokens.css";'
  Ensure-ImportLast -FilePath $MainTsxPath -ImportLine 'import "./styles/wm-system.css";'
}

function Ensure-AuthorityBootstrap {
  param(
    [Parameter(Mandatory = $true)][string]$MainTsxPath
  )

  if (-not (Test-Path -LiteralPath $MainTsxPath)) {
    throw "main.tsx not found: $MainTsxPath"
  }

  $raw = Get-Content -LiteralPath $MainTsxPath -Raw

  $bootstrap = @'
document.documentElement.classList.add("wm-force-authority");
document.body.classList.add("wm-force-authority");
'@

  if ($raw -match 'document\.documentElement\.classList\.add\("wm-force-authority"\)') {
    return
  }

  $reactDomImport = [regex]::Match(
    $raw,
    '^\s*import\s+ReactDOM\s+from\s+["'']react-dom\/client["''];\s*$',
    [System.Text.RegularExpressions.RegexOptions]::Multiline
  )

  if ($reactDomImport.Success) {
    $insertAt = $reactDomImport.Index + $reactDomImport.Length
    $updated = $raw.Insert($insertAt, "`r`n`r`n$bootstrap")
    Save-Utf8NoBom -Path $MainTsxPath -Content $updated
    return
  }

  $updated = $bootstrap + "`r`n" + $raw
  Save-Utf8NoBom -Path $MainTsxPath -Content $updated
}

$RepoRoot = [System.IO.Path]::GetFullPath($RepoRoot)
if (-not (Test-Path -LiteralPath $RepoRoot)) {
  throw "Repo root not found: $RepoRoot"
}

Set-Location $RepoRoot
Write-Info "Repo root: $RepoRoot"

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $RepoRoot "_STYLE_AUTHORITY_BACKUP\$timestamp"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

$mainTsx = Join-Path $RepoRoot "src\main.tsx"
$tokensCssPath = Join-Path $RepoRoot "src\styles\wm-tokens.css"
$systemCssPath = Join-Path $RepoRoot "src\styles\wm-system.css"
$pageFramePath = Join-Path $RepoRoot "src\components\wm\WingmanPageFrame.tsx"
$sectionPath = Join-Path $RepoRoot "src\components\wm\WingmanSection.tsx"
$statStripPath = Join-Path $RepoRoot "src\components\wm\WingmanStatStrip.tsx"
$emptyStatePath = Join-Path $RepoRoot "src\components\wm\WingmanEmptyState.tsx"
$indexPath = Join-Path $RepoRoot "src\components\wm\index.ts"

Backup-File -Path $mainTsx -BackupRoot $backupRoot
Backup-File -Path $tokensCssPath -BackupRoot $backupRoot
Backup-File -Path $systemCssPath -BackupRoot $backupRoot
Backup-File -Path $pageFramePath -BackupRoot $backupRoot
Backup-File -Path $sectionPath -BackupRoot $backupRoot
Backup-File -Path $statStripPath -BackupRoot $backupRoot
Backup-File -Path $emptyStatePath -BackupRoot $backupRoot
Backup-File -Path $indexPath -BackupRoot $backupRoot

Write-Info "Writing wm-tokens.css"
$tokensCss = @'
:root,
html.wm-force-authority,
body.wm-force-authority {
  color-scheme: dark;

  --wm-bg: #07111f;
  --wm-bg-elevated: #0b1628;
  --wm-surface-0: rgba(8, 18, 34, 0.90);
  --wm-surface-1: rgba(10, 22, 40, 0.94);
  --wm-surface-2: rgba(14, 28, 50, 0.97);
  --wm-surface-3: rgba(18, 36, 64, 0.99);

  --wm-border-subtle: rgba(96, 141, 198, 0.16);
  --wm-border-default: rgba(96, 141, 198, 0.22);
  --wm-border-strong: rgba(96, 141, 198, 0.34);

  --wm-text: #e8f0fb;
  --wm-text-soft: #b8c7dd;
  --wm-text-muted: #88a0bf;
  --wm-text-faint: #6c82a0;

  --wm-accent: #6ea8ff;
  --wm-accent-strong: #86b8ff;
  --wm-accent-wash: rgba(110, 168, 255, 0.10);
  --wm-accent-line: rgba(110, 168, 255, 0.24);

  --wm-brand: #d68b4f;
  --wm-brand-soft: rgba(214, 139, 79, 0.15);
  --wm-brand-line: rgba(214, 139, 79, 0.28);

  --wm-success: #43c37b;
  --wm-success-soft: rgba(67, 195, 123, 0.14);
  --wm-warning: #e1ac4a;
  --wm-warning-soft: rgba(225, 172, 74, 0.14);
  --wm-danger: #dc6d79;
  --wm-danger-soft: rgba(220, 109, 121, 0.14);

  --wm-glow-soft: 0 0 0 1px rgba(110, 168, 255, 0.06), 0 18px 40px rgba(4, 10, 20, 0.26);
  --wm-glow-panel: 0 0 0 1px rgba(110, 168, 255, 0.08), inset 0 1px 0 rgba(255,255,255,0.03), 0 18px 38px rgba(0,0,0,0.28);
  --wm-glow-brand: 0 0 0 1px rgba(214, 139, 79, 0.12), 0 18px 42px rgba(57, 29, 9, 0.22);

  --wm-radius-xs: 8px;
  --wm-radius-sm: 12px;
  --wm-radius-md: 16px;
  --wm-radius-lg: 20px;
  --wm-radius-xl: 24px;
  --wm-radius-pill: 999px;

  --wm-space-1: 4px;
  --wm-space-2: 8px;
  --wm-space-3: 12px;
  --wm-space-4: 16px;
  --wm-space-5: 20px;
  --wm-space-6: 24px;
  --wm-space-7: 32px;
  --wm-space-8: 40px;

  --wm-font: Inter, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --wm-fs-caption: 11px;
  --wm-fs-meta: 12px;
  --wm-fs-body: 14px;
  --wm-fs-body-lg: 15px;
  --wm-fs-label: 13px;
  --wm-fs-title: 20px;
  --wm-fs-page: clamp(28px, 3.2vw, 40px);

  --wm-lh-tight: 1.1;
  --wm-lh-body: 1.45;
  --wm-lh-relaxed: 1.6;

  --wm-topbar-h: 72px;
  --wm-sidebar-w: 250px;
  --wm-sidebar-w-collapsed: 84px;
  --wm-content-max: 1600px;
  --wm-control-h: 42px;
  --wm-control-h-lg: 48px;

  --wm-fast: 120ms ease;
  --wm-med: 180ms ease;
  --wm-slow: 240ms ease;
}

html[data-theme="light"],
:root[data-theme="light"],
body.theme-light {
  color-scheme: light;

  --wm-bg: #edf3fb;
  --wm-bg-elevated: #f7faff;
  --wm-surface-0: rgba(255, 255, 255, 0.90);
  --wm-surface-1: rgba(255, 255, 255, 0.95);
  --wm-surface-2: rgba(255, 255, 255, 0.98);
  --wm-surface-3: rgba(248, 251, 255, 1);

  --wm-border-subtle: rgba(34, 76, 132, 0.10);
  --wm-border-default: rgba(34, 76, 132, 0.18);
  --wm-border-strong: rgba(34, 76, 132, 0.28);

  --wm-text: #13243c;
  --wm-text-soft: #2a4366;
  --wm-text-muted: #587294;
  --wm-text-faint: #7c90a9;

  --wm-accent: #2d74d7;
  --wm-accent-strong: #1d63c5;
  --wm-accent-wash: rgba(45, 116, 215, 0.10);
  --wm-accent-line: rgba(45, 116, 215, 0.22);

  --wm-brand: #b86d28;
  --wm-brand-soft: rgba(184, 109, 40, 0.12);
  --wm-brand-line: rgba(184, 109, 40, 0.22);

  --wm-success: #238a53;
  --wm-success-soft: rgba(35, 138, 83, 0.12);
  --wm-warning: #b57914;
  --wm-warning-soft: rgba(181, 121, 20, 0.12);
  --wm-danger: #bf4b5a;
  --wm-danger-soft: rgba(191, 75, 90, 0.12);

  --wm-glow-soft: 0 0 0 1px rgba(45, 116, 215, 0.05), 0 14px 26px rgba(60, 88, 128, 0.12);
  --wm-glow-panel: 0 0 0 1px rgba(45, 116, 215, 0.06), inset 0 1px 0 rgba(255,255,255,0.7), 0 14px 30px rgba(60, 88, 128, 0.12);
  --wm-glow-brand: 0 0 0 1px rgba(184, 109, 40, 0.10), 0 16px 34px rgba(117, 73, 24, 0.10);
}
'@
Save-Utf8NoBom -Path $tokensCssPath -Content $tokensCss
Write-Ok "Wrote src\styles\wm-tokens.css"

Write-Info "Writing wm-system.css"
$systemCss = @'
/* =========================================================
   WINGMAN GLOBAL STYLE AUTHORITY
   Imported last on purpose.
   Uses wm-force-authority + high specificity + !important
   so this layer wins over normal page CSS.
   ========================================================= */

/* ---------- base reset ---------- */

html.wm-force-authority,
body.wm-force-authority,
body.wm-force-authority #root {
  min-height: 100% !important;
}

html.wm-force-authority {
  background:
    radial-gradient(circle at top center, rgba(110, 168, 255, 0.08), transparent 34%),
    linear-gradient(180deg, rgba(7, 17, 31, 1), rgba(5, 12, 22, 1)) !important;
}

body.wm-force-authority {
  margin: 0 !important;
  font-family: var(--wm-font) !important;
  font-size: var(--wm-fs-body) !important;
  line-height: var(--wm-lh-body) !important;
  color: var(--wm-text) !important;
  background:
    radial-gradient(circle at top center, rgba(110, 168, 255, 0.06), transparent 36%),
    linear-gradient(180deg, var(--wm-bg) 0%, #06101d 100%) !important;
  -webkit-font-smoothing: antialiased !important;
  text-rendering: optimizeLegibility !important;
}

body.wm-force-authority *,
body.wm-force-authority *::before,
body.wm-force-authority *::after {
  box-sizing: border-box !important;
}

body.wm-force-authority img,
body.wm-force-authority svg,
body.wm-force-authority video,
body.wm-force-authority canvas {
  display: block !important;
  max-width: 100% !important;
}

body.wm-force-authority a {
  color: inherit !important;
  text-decoration: none !important;
}

body.wm-force-authority button,
body.wm-force-authority input,
body.wm-force-authority select,
body.wm-force-authority textarea {
  font: inherit !important;
}

body.wm-force-authority :focus-visible {
  outline: none !important;
  box-shadow:
    0 0 0 2px rgba(110, 168, 255, 0.18),
    0 0 0 4px rgba(110, 168, 255, 0.08) !important;
}

/* ---------- shell authority ---------- */

body.wm-force-authority .wm-shell-root,
body.wm-force-authority .app-shell,
body.wm-force-authority [data-wm-shell="root"] {
  min-height: 100vh !important;
  background:
    radial-gradient(circle at top center, rgba(110, 168, 255, 0.06), transparent 34%),
    linear-gradient(180deg, var(--wm-bg) 0%, #06101d 100%) !important;
  color: var(--wm-text) !important;
}

body.wm-force-authority .wm-shell-body,
body.wm-force-authority [data-wm-shell="body"] {
  display: grid !important;
  grid-template-columns: var(--wm-sidebar-w) minmax(0, 1fr) !important;
  min-height: calc(100vh - var(--wm-topbar-h)) !important;
}

body.wm-force-authority .wm-topbar,
body.wm-force-authority header.wm-topbar,
body.wm-force-authority [data-wm-topbar] {
  min-height: var(--wm-topbar-h) !important;
  height: var(--wm-topbar-h) !important;
  border-bottom: 1px solid var(--wm-border-default) !important;
  background:
    linear-gradient(180deg, rgba(8, 18, 34, 0.96), rgba(8, 18, 34, 0.88)) !important;
  box-shadow: 0 10px 24px rgba(0,0,0,0.18) !important;
  position: sticky !important;
  top: 0 !important;
  z-index: 40 !important;
  backdrop-filter: blur(14px) !important;
}

body.wm-force-authority .wm-sidebar,
body.wm-force-authority aside.wm-sidebar,
body.wm-force-authority [data-wm-sidebar] {
  min-width: 0 !important;
  width: var(--wm-sidebar-w) !important;
  border-right: 1px solid var(--wm-border-default) !important;
  background:
    linear-gradient(180deg, rgba(6, 18, 32, 0.96), rgba(5, 14, 26, 0.98)) !important;
  overflow: auto !important;
  padding: var(--wm-space-4) !important;
}

body.wm-force-authority .wm-main,
body.wm-force-authority main.wm-main,
body.wm-force-authority [data-wm-main] {
  min-width: 0 !important;
  overflow: auto !important;
  padding: var(--wm-space-5) !important;
}

/* ---------- page authority ---------- */

body.wm-force-authority .wm-page,
body.wm-force-authority .wm-page-frame {
  width: 100% !important;
  max-width: var(--wm-content-max) !important;
  margin: 0 auto !important;
  display: grid !important;
  gap: var(--wm-space-5) !important;
}

body.wm-force-authority .wm-page-header {
  display: grid !important;
  gap: var(--wm-space-3) !important;
  padding: var(--wm-space-5) !important;
  border: 1px solid var(--wm-border-default) !important;
  border-radius: var(--wm-radius-lg) !important;
  background:
    linear-gradient(180deg, rgba(10, 22, 40, 0.92), rgba(8, 18, 34, 0.90)) !important;
  box-shadow: var(--wm-glow-panel) !important;
}

body.wm-force-authority .wm-page-header__top {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: var(--wm-space-4) !important;
  flex-wrap: wrap !important;
}

body.wm-force-authority .wm-page-header__eyebrow {
  display: inline-flex !important;
  align-items: center !important;
  gap: var(--wm-space-2) !important;
  min-height: 28px !important;
  padding: 0 12px !important;
  border: 1px solid var(--wm-accent-line) !important;
  border-radius: var(--wm-radius-pill) !important;
  background: var(--wm-accent-wash) !important;
  color: var(--wm-accent-strong) !important;
  font-size: var(--wm-fs-caption) !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.1em !important;
}

body.wm-force-authority .wm-page-header__actions {
  display: inline-flex !important;
  align-items: center !important;
  gap: var(--wm-space-2) !important;
  flex-wrap: wrap !important;
}

body.wm-force-authority .wm-page-title {
  margin: 0 !important;
  font-size: var(--wm-fs-page) !important;
  line-height: var(--wm-lh-tight) !important;
  letter-spacing: -0.03em !important;
  font-weight: 800 !important;
  color: var(--wm-text) !important;
}

body.wm-force-authority .wm-page-subtitle {
  margin: 0 !important;
  max-width: 1100px !important;
  color: var(--wm-text-soft) !important;
  font-size: var(--wm-fs-body-lg) !important;
}

body.wm-force-authority .wm-page-toolbar {
  display: flex !important;
  gap: var(--wm-space-3) !important;
  align-items: center !important;
  justify-content: space-between !important;
  flex-wrap: wrap !important;
}

/* ---------- panels / sections ---------- */

body.wm-force-authority .wm-panel,
body.wm-force-authority .wm-section {
  border: 1px solid var(--wm-border-default) !important;
  border-radius: var(--wm-radius-lg) !important;
  background:
    linear-gradient(180deg, rgba(10, 22, 40, 0.92), rgba(8, 18, 34, 0.92)) !important;
  box-shadow: var(--wm-glow-panel) !important;
  overflow: hidden !important;
}

body.wm-force-authority .wm-panel--brand {
  border-color: var(--wm-brand-line) !important;
  box-shadow: var(--wm-glow-brand) !important;
}

body.wm-force-authority .wm-section__header {
  display: flex !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  gap: var(--wm-space-4) !important;
  padding: var(--wm-space-5) var(--wm-space-5) var(--wm-space-3) !important;
  flex-wrap: wrap !important;
}

body.wm-force-authority .wm-section__heading {
  min-width: 0 !important;
  display: grid !important;
  gap: 6px !important;
}

body.wm-force-authority .wm-section__eyebrow {
  margin: 0 !important;
  color: var(--wm-text-muted) !important;
  font-size: var(--wm-fs-caption) !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.1em !important;
}

body.wm-force-authority .wm-section__title {
  margin: 0 !important;
  color: var(--wm-text) !important;
  font-size: var(--wm-fs-title) !important;
  font-weight: 800 !important;
  line-height: 1.15 !important;
}

body.wm-force-authority .wm-section__description {
  margin: 0 !important;
  color: var(--wm-text-soft) !important;
  font-size: var(--wm-fs-body) !important;
}

body.wm-force-authority .wm-section__actions {
  display: inline-flex !important;
  gap: var(--wm-space-2) !important;
  align-items: center !important;
  flex-wrap: wrap !important;
}

body.wm-force-authority .wm-section__body {
  padding: 0 var(--wm-space-5) var(--wm-space-5) !important;
}

body.wm-force-authority .wm-section__body > * + * {
  margin-top: var(--wm-space-4) !important;
}

/* ---------- stat strip ---------- */

body.wm-force-authority .wm-stat-strip {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: var(--wm-space-3) !important;
}

body.wm-force-authority .wm-stat {
  min-width: 0 !important;
  padding: var(--wm-space-4) !important;
  border: 1px solid var(--wm-border-subtle) !important;
  border-radius: var(--wm-radius-md) !important;
  background:
    linear-gradient(180deg, rgba(11, 24, 44, 0.88), rgba(8, 18, 34, 0.88)) !important;
}

body.wm-force-authority .wm-stat__label {
  margin: 0 0 8px !important;
  color: var(--wm-text-muted) !important;
  font-size: var(--wm-fs-caption) !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.08em !important;
}

body.wm-force-authority .wm-stat__value {
  margin: 0 !important;
  color: var(--wm-text) !important;
  font-size: 26px !important;
  font-weight: 800 !important;
  line-height: 1.05 !important;
}

body.wm-force-authority .wm-stat__meta {
  margin: 8px 0 0 !important;
  color: var(--wm-text-soft) !important;
  font-size: var(--wm-fs-meta) !important;
}

/* ---------- global controls override ---------- */

body.wm-force-authority input:not([type="checkbox"]):not([type="radio"]),
body.wm-force-authority select,
body.wm-force-authority textarea,
body.wm-force-authority .wm-input,
body.wm-force-authority .wm-select,
body.wm-force-authority .wm-textarea {
  width: 100% !important;
  min-height: var(--wm-control-h) !important;
  border: 1px solid var(--wm-border-default) !important;
  border-radius: var(--wm-radius-sm) !important;
  background: rgba(7, 18, 34, 0.86) !important;
  color: var(--wm-text) !important;
  padding: 0 12px !important;
  box-shadow: none !important;
  transition: border-color var(--wm-med), box-shadow var(--wm-med), background var(--wm-med) !important;
}

body.wm-force-authority textarea,
body.wm-force-authority .wm-textarea {
  min-height: 112px !important;
  padding: 12px !important;
  resize: vertical !important;
}

body.wm-force-authority input::placeholder,
body.wm-force-authority textarea::placeholder {
  color: var(--wm-text-faint) !important;
}

body.wm-force-authority input:hover,
body.wm-force-authority select:hover,
body.wm-force-authority textarea:hover,
body.wm-force-authority .wm-input:hover,
body.wm-force-authority .wm-select:hover,
body.wm-force-authority .wm-textarea:hover {
  border-color: var(--wm-border-strong) !important;
}

body.wm-force-authority input:focus,
body.wm-force-authority select:focus,
body.wm-force-authority textarea:focus,
body.wm-force-authority .wm-input:focus,
body.wm-force-authority .wm-select:focus,
body.wm-force-authority .wm-textarea:focus {
  border-color: var(--wm-accent) !important;
  box-shadow: 0 0 0 3px rgba(110, 168, 255, 0.12) !important;
}

/* ---------- global button override ---------- */

body.wm-force-authority button,
body.wm-force-authority .wm-btn,
body.wm-force-authority [role="button"] {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: var(--wm-space-2) !important;
  min-height: var(--wm-control-h) !important;
  padding: 0 14px !important;
  border: 1px solid var(--wm-border-default) !important;
  border-radius: var(--wm-radius-pill) !important;
  background:
    linear-gradient(180deg, rgba(14, 28, 50, 0.98), rgba(10, 22, 40, 0.98)) !important;
  color: var(--wm-text) !important;
  cursor: pointer !important;
  transition:
    transform var(--wm-fast),
    border-color var(--wm-med),
    background var(--wm-med),
    box-shadow var(--wm-med),
    color var(--wm-med) !important;
  white-space: nowrap !important;
}

body.wm-force-authority button:hover,
body.wm-force-authority .wm-btn:hover,
body.wm-force-authority [role="button"]:hover {
  border-color: var(--wm-border-strong) !important;
  transform: translateY(-1px) !important;
}

body.wm-force-authority button:active,
body.wm-force-authority .wm-btn:active,
body.wm-force-authority [role="button"]:active {
  transform: translateY(0) !important;
}

body.wm-force-authority .wm-btn--primary {
  border-color: var(--wm-accent-line) !important;
  background:
    linear-gradient(180deg, rgba(38, 83, 147, 0.98), rgba(28, 65, 122, 0.98)) !important;
  color: #f5f9ff !important;
  box-shadow: 0 8px 22px rgba(18, 45, 88, 0.26) !important;
}

body.wm-force-authority .wm-btn--secondary {
  border-color: var(--wm-border-default) !important;
}

body.wm-force-authority .wm-btn--brand {
  border-color: var(--wm-brand-line) !important;
  background:
    linear-gradient(180deg, rgba(126, 79, 34, 0.98), rgba(96, 59, 24, 0.98)) !important;
  color: #fff7ef !important;
}

body.wm-force-authority .wm-btn--quiet {
  border-color: transparent !important;
  background: transparent !important;
  color: var(--wm-text-soft) !important;
  box-shadow: none !important;
}

body.wm-force-authority .wm-btn--danger {
  border-color: rgba(220, 109, 121, 0.25) !important;
  background:
    linear-gradient(180deg, rgba(103, 36, 47, 0.98), rgba(79, 25, 36, 0.98)) !important;
}

/* ---------- tabs / pills / chips ---------- */

body.wm-force-authority .wm-pill-group {
  display: inline-flex !important;
  align-items: center !important;
  gap: var(--wm-space-2) !important;
  flex-wrap: wrap !important;
}

body.wm-force-authority .wm-pill,
body.wm-force-authority .wm-tab,
body.wm-force-authority .wm-chip {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-height: 34px !important;
  padding: 0 12px !important;
  border: 1px solid var(--wm-border-default) !important;
  border-radius: var(--wm-radius-pill) !important;
  background: rgba(12, 25, 45, 0.86) !important;
  color: var(--wm-text-soft) !important;
  font-size: var(--wm-fs-meta) !important;
  font-weight: 700 !important;
}

body.wm-force-authority .wm-pill.is-active,
body.wm-force-authority .wm-tab.is-active,
body.wm-force-authority .wm-chip.is-active,
body.wm-force-authority [aria-selected="true"].wm-tab {
  color: var(--wm-text) !important;
  border-color: var(--wm-accent-line) !important;
  background: var(--wm-accent-wash) !important;
}

/* ---------- fields / grids ---------- */

body.wm-force-authority .wm-grid {
  display: grid !important;
  gap: var(--wm-space-4) !important;
}

body.wm-force-authority .wm-grid--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
}

body.wm-force-authority .wm-grid--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
}

body.wm-force-authority .wm-field {
  min-width: 0 !important;
  display: grid !important;
  gap: var(--wm-space-2) !important;
}

body.wm-force-authority .wm-field__label {
  color: var(--wm-text-soft) !important;
  font-size: var(--wm-fs-label) !important;
  font-weight: 700 !important;
}

body.wm-force-authority .wm-field__hint {
  color: var(--wm-text-muted) !important;
  font-size: var(--wm-fs-meta) !important;
}

/* ---------- nav authority ---------- */

body.wm-force-authority .wm-sidebar .wm-nav-group,
body.wm-force-authority .wm-sidebar .nav-group,
body.wm-force-authority .wm-sidebar section {
  display: grid !important;
  gap: var(--wm-space-3) !important;
}

body.wm-force-authority .wm-sidebar .wm-nav-card,
body.wm-force-authority .wm-sidebar .wm-group-card,
body.wm-force-authority .wm-sidebar .quick-ref,
body.wm-force-authority .wm-sidebar .workflow-group,
body.wm-force-authority .wm-sidebar .project-output-group {
  padding: var(--wm-space-3) !important;
  border: 1px solid var(--wm-border-default) !important;
  border-radius: var(--wm-radius-lg) !important;
  background:
    linear-gradient(180deg, rgba(11, 24, 44, 0.92), rgba(8, 18, 34, 0.92)) !important;
  box-shadow: var(--wm-glow-soft) !important;
}

body.wm-force-authority .wm-sidebar .wm-nav-group-title,
body.wm-force-authority .wm-sidebar .group-title,
body.wm-force-authority .wm-sidebar h4 {
  margin: 0 0 var(--wm-space-2) !important;
  color: var(--wm-text-muted) !important;
  font-size: var(--wm-fs-caption) !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.1em !important;
}

body.wm-force-authority .wm-sidebar a,
body.wm-force-authority .wm-sidebar button {
  min-height: 42px !important;
}

body.wm-force-authority .wm-sidebar .active,
body.wm-force-authority .wm-sidebar [aria-current="page"],
body.wm-force-authority .wm-sidebar [data-active="true"] {
  border-color: var(--wm-accent-line) !important;
  background: linear-gradient(180deg, rgba(20, 39, 70, 0.98), rgba(13, 29, 54, 0.98)) !important;
  color: var(--wm-text) !important;
}

/* ---------- empty state ---------- */

body.wm-force-authority .wm-empty-state {
  display: grid !important;
  gap: var(--wm-space-3) !important;
  justify-items: start !important;
  padding: var(--wm-space-6) !important;
  border: 1px dashed var(--wm-border-default) !important;
  border-radius: var(--wm-radius-lg) !important;
  background:
    linear-gradient(180deg, rgba(10, 22, 40, 0.62), rgba(8, 18, 34, 0.62)) !important;
}

body.wm-force-authority .wm-empty-state__title {
  margin: 0 !important;
  font-size: 18px !important;
  font-weight: 800 !important;
}

body.wm-force-authority .wm-empty-state__body {
  margin: 0 !important;
  color: var(--wm-text-soft) !important;
  max-width: 78ch !important;
}

/* ---------- utility ---------- */

body.wm-force-authority .wm-muted { color: var(--wm-text-muted) !important; }
body.wm-force-authority .wm-soft { color: var(--wm-text-soft) !important; }
body.wm-force-authority .wm-brand { color: var(--wm-brand) !important; }
body.wm-force-authority .wm-accent { color: var(--wm-accent-strong) !important; }

body.wm-force-authority .wm-stack-xs > * + * { margin-top: var(--wm-space-2) !important; }
body.wm-force-authority .wm-stack-sm > * + * { margin-top: var(--wm-space-3) !important; }
body.wm-force-authority .wm-stack-md > * + * { margin-top: var(--wm-space-4) !important; }
body.wm-force-authority .wm-stack-lg > * + * { margin-top: var(--wm-space-5) !important; }

body.wm-force-authority .wm-flex {
  display: flex !important;
  gap: var(--wm-space-3) !important;
  align-items: center !important;
  flex-wrap: wrap !important;
}

body.wm-force-authority .wm-between {
  display: flex !important;
  gap: var(--wm-space-3) !important;
  align-items: center !important;
  justify-content: space-between !important;
  flex-wrap: wrap !important;
}

/* ---------- responsive ---------- */

@media (max-width: 1180px) {
  body.wm-force-authority .wm-shell-body,
  body.wm-force-authority [data-wm-shell="body"] {
    grid-template-columns: 1fr !important;
  }

  body.wm-force-authority .wm-sidebar,
  body.wm-force-authority aside.wm-sidebar,
  body.wm-force-authority [data-wm-sidebar] {
    width: 100% !important;
    border-right: 0 !important;
    border-bottom: 1px solid var(--wm-border-default) !important;
  }

  body.wm-force-authority .wm-grid--3 {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  body.wm-force-authority .wm-stat-strip {
    grid-template-columns: 1fr !important;
  }
}

@media (max-width: 820px) {
  body.wm-force-authority .wm-main,
  body.wm-force-authority main.wm-main,
  body.wm-force-authority [data-wm-main] {
    padding: var(--wm-space-4) !important;
  }

  body.wm-force-authority .wm-page-header,
  body.wm-force-authority .wm-section__header,
  body.wm-force-authority .wm-section__body {
    padding-left: var(--wm-space-4) !important;
    padding-right: var(--wm-space-4) !important;
  }

  body.wm-force-authority .wm-grid--2,
  body.wm-force-authority .wm-grid--3 {
    grid-template-columns: 1fr !important;
  }

  body.wm-force-authority .wm-page-title {
    font-size: clamp(24px, 7vw, 34px) !important;
  }
}
'@
Save-Utf8NoBom -Path $systemCssPath -Content $systemCss
Write-Ok "Wrote src\styles\wm-system.css"

Write-Info "Writing shared wm React wrappers"
$pageFrameTsx = @'
import type { ReactNode } from "react";

type WingmanPageFrameProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function WingmanPageFrame({
  eyebrow,
  title,
  subtitle,
  actions,
  toolbar,
  children,
  className,
}: WingmanPageFrameProps) {
  return (
    <div className={cx("wm-page-frame", className)}>
      <header className="wm-page-header">
        <div className="wm-page-header__top">
          <div className="wm-stack-sm">
            {eyebrow ? <div className="wm-page-header__eyebrow">{eyebrow}</div> : null}
            <div className="wm-stack-xs">
              <h1 className="wm-page-title">{title}</h1>
              {subtitle ? <p className="wm-page-subtitle">{subtitle}</p> : null}
            </div>
          </div>

          {actions ? <div className="wm-page-header__actions">{actions}</div> : null}
        </div>

        {toolbar ? <div className="wm-page-toolbar">{toolbar}</div> : null}
      </header>

      {children}
    </div>
  );
}
'@
Save-Utf8NoBom -Path $pageFramePath -Content $pageFrameTsx
Write-Ok "Wrote src\components\wm\WingmanPageFrame.tsx"

$sectionTsx = @'
import type { ReactNode } from "react";

type WingmanSectionProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  brand?: boolean;
  className?: string;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function WingmanSection({
  eyebrow,
  title,
  description,
  actions,
  children,
  brand = false,
  className,
}: WingmanSectionProps) {
  return (
    <section className={cx("wm-section", brand && "wm-panel--brand", className)}>
      <div className="wm-section__header">
        <div className="wm-section__heading">
          {eyebrow ? <p className="wm-section__eyebrow">{eyebrow}</p> : null}
          <h2 className="wm-section__title">{title}</h2>
          {description ? <p className="wm-section__description">{description}</p> : null}
        </div>

        {actions ? <div className="wm-section__actions">{actions}</div> : null}
      </div>

      <div className="wm-section__body">{children}</div>
    </section>
  );
}
'@
Save-Utf8NoBom -Path $sectionPath -Content $sectionTsx
Write-Ok "Wrote src\components\wm\WingmanSection.tsx"

$statStripTsx = @'
import type { ReactNode } from "react";

export type WingmanStatItem = {
  label: ReactNode;
  value: ReactNode;
  meta?: ReactNode;
};

type WingmanStatStripProps = {
  items: WingmanStatItem[];
  className?: string;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function WingmanStatStrip({ items, className }: WingmanStatStripProps) {
  return (
    <div className={cx("wm-stat-strip", className)}>
      {items.map((item, index) => (
        <div className="wm-stat" key={index}>
          <p className="wm-stat__label">{item.label}</p>
          <p className="wm-stat__value">{item.value}</p>
          {item.meta ? <p className="wm-stat__meta">{item.meta}</p> : null}
        </div>
      ))}
    </div>
  );
}
'@
Save-Utf8NoBom -Path $statStripPath -Content $statStripTsx
Write-Ok "Wrote src\components\wm\WingmanStatStrip.tsx"

$emptyStateTsx = @'
import type { ReactNode } from "react";

type WingmanEmptyStateProps = {
  title: ReactNode;
  body?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function WingmanEmptyState({
  title,
  body,
  actions,
  className,
}: WingmanEmptyStateProps) {
  return (
    <div className={cx("wm-empty-state", className)}>
      <h3 className="wm-empty-state__title">{title}</h3>
      {body ? <p className="wm-empty-state__body">{body}</p> : null}
      {actions ? <div className="wm-flex">{actions}</div> : null}
    </div>
  );
}
'@
Save-Utf8NoBom -Path $emptyStatePath -Content $emptyStateTsx
Write-Ok "Wrote src\components\wm\WingmanEmptyState.tsx"

$indexTsx = @'
export { default as WingmanPageFrame } from "./WingmanPageFrame";
export { default as WingmanSection } from "./WingmanSection";
export { default as WingmanStatStrip } from "./WingmanStatStrip";
export type { WingmanStatItem } from "./WingmanStatStrip";
export { default as WingmanEmptyState } from "./WingmanEmptyState";
'@
Save-Utf8NoBom -Path $indexPath -Content $indexTsx
Write-Ok "Wrote src\components\wm\index.ts"

Write-Info "Ensuring src\main.tsx imports the new CSS last"
Ensure-ImportsAreLast -MainTsxPath $mainTsx
Write-Ok "Updated src\main.tsx CSS import order"

Write-Info "Ensuring authority bootstrap is present"
Ensure-AuthorityBootstrap -MainTsxPath $mainTsx
Write-Ok "Updated src\main.tsx authority bootstrap"

$exampleSnippet = @'
/*
EXAMPLE USAGE

import {
  WingmanEmptyState,
  WingmanPageFrame,
  WingmanSection,
  WingmanStatStrip,
} from "@/components/wm";

export default function ExamplePage() {
  return (
    <WingmanPageFrame
      eyebrow="Quick Reference"
      title="Competitor Compare"
      subtitle="Search competitor products, review fit, and save the best mapping to a project."
      actions={
        <>
          <button className="wm-btn wm-btn--secondary">General sales mode</button>
          <button className="wm-btn wm-btn--brand">Tools</button>
        </>
      }
    >
      <WingmanSection
        eyebrow="Step 1"
        title="Competitor lookup"
        description="Start with a brand and model to build a shortlist."
      >
        <div className="wm-grid wm-grid--3">
          <label className="wm-field">
            <span className="wm-field__label">Competitor brand</span>
            <select>
              <option>Atlona</option>
            </select>
          </label>

          <label className="wm-field">
            <span className="wm-field__label">Competitor SKU or model</span>
            <input placeholder="Example: ZyPer4K or DTP3" />
          </label>

          <div className="wm-flex" style={{ alignSelf: "end" }}>
            <button className="wm-btn wm-btn--secondary">Clear</button>
            <button className="wm-btn wm-btn--primary">Look up live</button>
          </div>
        </div>
      </WingmanSection>

      <WingmanStatStrip
        items={[
          { label: "Status", value: "Idle", meta: "Waiting for competitor SKU" },
          { label: "Matches", value: "0", meta: "No shortlist yet" },
          { label: "Saved fit", value: "Not saved", meta: "Ready to link to project" },
        ]}
      />

      <WingmanSection
        eyebrow="Step 2"
        title="Comparison output"
        description="Review the selected fit, shortlist, and manual mapping."
      >
        <div className="wm-pill-group">
          <button className="wm-pill is-active">Selected fit</button>
          <button className="wm-pill">Shortlist</button>
          <button className="wm-pill">Manual mapping</button>
        </div>

        <WingmanEmptyState
          title="No comparison loaded yet"
          body="Search for a competitor SKU to populate fit analysis, shortlisted WyreStorm options, and fallback mapping."
        />
      </WingmanSection>
    </WingmanPageFrame>
  );
}
*/
'@
$examplePath = Join-Path $RepoRoot "src\components\wm\_USAGE_EXAMPLE.tsx.txt"
Save-Utf8NoBom -Path $examplePath -Content $exampleSnippet
Write-Ok "Wrote example usage file"

Write-Host ""
Write-Ok "Wingman global style authority installed."
Write-Host "Backup folder: $backupRoot" -ForegroundColor DarkGray
Write-Host ""
Write-Host "This version is designed to override normal page CSS by:" -ForegroundColor Cyan
Write-Host " - importing wm CSS last"
Write-Host " - adding html/body class: wm-force-authority"
Write-Host " - using high specificity selectors"
Write-Host " - using !important on authority rules"
Write-Host ""
Write-Host "Run next:" -ForegroundColor Cyan
Write-Host "  npm run typecheck"
Write-Host "  npm run dev"
Write-Host ""
Write-Host "If a page still refuses to conform, that page is likely using:" -ForegroundColor Yellow
Write-Host " - inline styles"
Write-Host " - custom !important rules"
Write-Host " - markup that does not use the shared wm classes"
Write-Host ""
Write-Host "Best next step after install: migrate Competitor Compare to wm components."