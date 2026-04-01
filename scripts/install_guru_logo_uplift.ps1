Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location C:\Users\steve\wingman
$root = (Get-Location).Path

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  $fullPath = if ([System.IO.Path]::IsPathRooted($Path)) { $Path } else { Join-Path $root $Path }
  $dir = Split-Path $fullPath -Parent

  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($fullPath, $Content, $utf8)
}

function Backup-IfExists {
  param([string]$RelativePath)

  $full = Join-Path $root $RelativePath
  if (Test-Path $full) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupDir = Join-Path $root "_RESCUE"
    if (-not (Test-Path $backupDir)) {
      New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    }
    $leaf = Split-Path $full -Leaf
    Copy-Item -Force $full (Join-Path $backupDir "$leaf.$stamp.bak")
  }
}

foreach ($dir in @(
  "public\branding",
  "src\app\branding",
  "src\app\navigation",
  "src\features\ai\guru",
  "src\styles",
  "_RESCUE"
)) {
  $fullDir = Join-Path $root $dir
  if (-not (Test-Path $fullDir)) {
    New-Item -ItemType Directory -Force -Path $fullDir | Out-Null
  }
}

# Optional logo drop-in.
# If you save the attached logo as _WORK\wingman-bot.png, this installer will copy it into public\branding.
$logoSource = Join-Path $root "_WORK\wingman-bot.png"
$logoTarget = Join-Path $root "public\branding\wingman-bot.png"
if (Test-Path $logoSource) {
  Copy-Item -Force $logoSource $logoTarget
}

Backup-IfExists "src\app\branding\WingmanBrand.tsx"
Backup-IfExists "src\app\branding\wingman-brand.css"
Backup-IfExists "src\features\ai\guru\GuruFab.tsx"
Backup-IfExists "src\features\ai\guru\guru-fab.css"
Backup-IfExists "src\app\navigation\TopBar.tsx"
Backup-IfExists "src\styles\wm-graphical-uplift.css"
Backup-IfExists "src\main.tsx"

$brandTsx = @'
import "./wingman-brand.css";

type WingmanBrandProps = {
  compact?: boolean;
  subtitle?: string;
};

export default function WingmanBrand({
  compact = false,
  subtitle = "Visual AV design guidance",
}: WingmanBrandProps) {
  return (
    <div className={`wm-brand ${compact ? "wm-brand--compact" : ""}`}>
      <img
        className="wm-brand__logo"
        src="/branding/wingman-bot.png"
        alt="Wingman"
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = "/wingman-logo-compact.png";
        }}
      />
      <div className="wm-brand__copy">
        <div className="wm-brand__title">Wingman</div>
        {!compact ? <div className="wm-brand__subtitle">{subtitle}</div> : null}
      </div>
    </div>
  );
}
'@
Save-Utf8NoBom -Path "src\app\branding\WingmanBrand.tsx" -Content $brandTsx

$brandCss = @'
.wm-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.8rem;
  min-width: 0;
}

.wm-brand__logo {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  object-fit: contain;
  box-shadow:
    0 10px 30px rgba(6, 64, 182, 0.35),
    0 0 0 1px rgba(148, 163, 184, 0.18);
}

.wm-brand--compact .wm-brand__logo {
  width: 34px;
  height: 34px;
  border-radius: 10px;
}

.wm-brand__copy {
  min-width: 0;
  display: grid;
  gap: 0.1rem;
}

.wm-brand__title {
  color: #f8fafc;
  font-size: 1.45rem;
  line-height: 1;
  font-weight: 650;
  letter-spacing: -0.025em;
}

.wm-brand--compact .wm-brand__title {
  font-size: 1.18rem;
}

.wm-brand__subtitle {
  color: rgba(191, 219, 254, 0.82);
  font-size: 0.74rem;
  line-height: 1.1;
  letter-spacing: 0.015em;
}
'@
Save-Utf8NoBom -Path "src\app\branding\wingman-brand.css" -Content $brandCss

$guruFabTsx = @'
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import "./guru-fab.css";

export default function GuruFab() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="guru-fab"
      aria-label="Open Guru"
      title="Open Guru"
      onClick={() => navigate(WM_ROUTES.GURU)}
    >
      <span className="guru-fab__icon-wrap">
        <Sparkles size={18} />
      </span>
      <span className="guru-fab__copy">
        <strong>Guru</strong>
        <span>Open assistant</span>
      </span>
    </button>
  );
}
'@
Save-Utf8NoBom -Path "src\features\ai\guru\GuruFab.tsx" -Content $guruFabTsx

$guruFabCss = @'
.guru-fab {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 70;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 10px 14px;
  border: 1px solid rgba(96, 165, 250, 0.28);
  border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.96));
  color: #eff6ff;
  box-shadow:
    0 18px 48px rgba(2, 6, 23, 0.48),
    0 0 0 1px rgba(59, 130, 246, 0.15);
  cursor: pointer;
  transition:
    transform 120ms ease,
    box-shadow 120ms ease,
    border-color 120ms ease;
}

.guru-fab:hover {
  transform: translateY(-1px);
  border-color: rgba(96, 165, 250, 0.5);
  box-shadow:
    0 22px 56px rgba(2, 6, 23, 0.56),
    0 0 0 1px rgba(96, 165, 250, 0.22);
}

.guru-fab__icon-wrap {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(56, 189, 248, 0.35), rgba(37, 99, 235, 0.38));
  color: #dbeafe;
}

.guru-fab__copy {
  display: grid;
  text-align: left;
  line-height: 1.05;
}

.guru-fab__copy strong {
  font-size: 0.9rem;
  font-weight: 650;
}

.guru-fab__copy span {
  font-size: 0.72rem;
  color: rgba(191, 219, 254, 0.82);
}

@media (max-width: 840px) {
  .guru-fab {
    right: 14px;
    bottom: 14px;
    min-height: 44px;
    padding: 9px 12px;
  }

  .guru-fab__copy span {
    display: none;
  }
}
'@
Save-Utf8NoBom -Path "src\features\ai\guru\guru-fab.css" -Content $guruFabCss

$topBarTsx = @'
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import WingmanBrand from "@/app/branding/WingmanBrand";

const titleMap: Record<string, { title: string; subtitle: string }> = {
  "/app/dashboard": {
    title: "Mission Control",
    subtitle: "Start fast. See outcomes clearly. Adjust without scrolling.",
  },
  "/app/projects": {
    title: "Projects",
    subtitle: "Active work, recent proposals, and next actions.",
  },
  "/app/tools": {
    title: "Tools",
    subtitle: "Compact workspace with visible input, output, and guidance.",
  },
};

export default function TopBar() {
  const location = useLocation();

  const meta = useMemo(() => {
    return (
      titleMap[location.pathname] ?? {
        title: "Wingman Workspace",
        subtitle: "Clear inputs, live outputs, and visual decision support.",
      }
    );
  }, [location.pathname]);

  return (
    <header className="wm-topbar wm-topbar--compact">
      <div className="wm-topbar__brand-slot">
        <WingmanBrand compact={false} subtitle={meta.subtitle} />
      </div>

      <div className="wm-topbar__heading">
        <div className="wm-topbar__kicker">Workspace</div>
        <h1 className="wm-topbar__title">{meta.title}</h1>
      </div>
    </header>
  );
}
'@
Save-Utf8NoBom -Path "src\app\navigation\TopBar.tsx" -Content $topBarTsx

$upliftCss = @'
:root {
  --wm-shell-max: 1680px;
  --wm-density-gap: 12px;
  --wm-panel-radius: 18px;
  --wm-panel-border: rgba(148, 163, 184, 0.16);
  --wm-panel-bg:
    linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.92));
  --wm-panel-shadow:
    0 18px 48px rgba(2, 6, 23, 0.42),
    0 0 0 1px rgba(51, 65, 85, 0.35);
  --wm-input-h: 34px;
  --wm-font-ui: Inter, Segoe UI, Arial, sans-serif;
}

html,
body,
#root {
  background:
    radial-gradient(circle at top, rgba(37, 99, 235, 0.12), transparent 32%),
    #020617;
}

body {
  font-family: var(--wm-font-ui);
  color: #e5eefc;
}

.wm-shell-root,
.wm-app-shell {
  background:
    radial-gradient(circle at top, rgba(29, 78, 216, 0.08), transparent 28%),
    linear-gradient(180deg, rgba(2, 6, 23, 1), rgba(2, 6, 23, 0.98));
}

.wm-topbar,
.wm-topbar--compact {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 72px;
  padding: 12px 18px;
  border-bottom: 1px solid rgba(51, 65, 85, 0.55);
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.94), rgba(2, 6, 23, 0.94));
  backdrop-filter: blur(12px);
}

.wm-topbar__brand-slot {
  display: flex;
  align-items: center;
  min-width: 0;
}

.wm-topbar__heading {
  flex: 1;
  min-width: 0;
  display: grid;
  justify-items: end;
  gap: 2px;
}

.wm-topbar__kicker {
  color: rgba(147, 197, 253, 0.84);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.wm-topbar__title {
  margin: 0;
  color: #f8fafc;
  font-size: 1.08rem;
  line-height: 1;
  font-weight: 620;
  letter-spacing: -0.02em;
}

.wm-main,
.wm-canvas,
.wm-canvas-inner,
.wm-page-frame,
.wm-page-shell {
  max-width: var(--wm-shell-max);
}

.wm-page-frame,
.wm-canvas-inner,
.wm-main > * {
  padding-inline: 14px;
}

.wm-page-header,
[class*="page-header"] {
  margin-bottom: 12px !important;
  gap: 10px !important;
}

.wm-page-title,
[class*="page-title"] {
  font-size: 1.2rem !important;
  font-weight: 640 !important;
  line-height: 1.08 !important;
  letter-spacing: -0.025em !important;
}

.wm-page-subtitle,
[class*="page-subtitle"] {
  font-size: 0.8rem !important;
  color: rgba(191, 219, 254, 0.78) !important;
}

.wm-card,
.wm-panel,
.wm-surface,
[class*="card"],
[class*="panel"],
[class*="surface"] {
  border-radius: var(--wm-panel-radius) !important;
  border: 1px solid var(--wm-panel-border) !important;
  background: var(--wm-panel-bg) !important;
  box-shadow: var(--wm-panel-shadow) !important;
}

button,
select,
input,
textarea {
  min-height: var(--wm-input-h) !important;
  font-size: 0.82rem !important;
  border-radius: 10px !important;
}

label,
th,
td,
li,
p,
span,
small {
  font-size: 0.82rem;
}

table {
  font-size: 0.8rem !important;
}

button {
  font-weight: 560 !important;
}

.wm-button-primary,
button[type="submit"],
button[data-variant="primary"],
[class*="primaryButton"],
[class*="cta"] {
  box-shadow:
    0 10px 24px rgba(37, 99, 235, 0.28),
    0 0 0 1px rgba(96, 165, 250, 0.22);
}

.wm-next-step,
.wm-start-step,
.wm-guidance-callout {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(96, 165, 250, 0.25);
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.92), rgba(15, 23, 42, 0.92));
  color: #eff6ff;
}

.wm-next-step::before,
.wm-start-step::before {
  content: "Next";
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 46px;
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.22);
  color: #bfdbfe;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.wm-workspace-grid,
[class*="workspace-grid"],
[class*="builder-grid"] {
  display: grid !important;
  grid-template-columns: minmax(340px, 0.92fr) minmax(520px, 1.28fr);
  gap: 14px !important;
  align-items: start;
}

.wm-input-stack,
[class*="input-column"],
[class*="controls-column"] {
  display: grid;
  gap: 12px;
  position: sticky;
  top: 88px;
}

.wm-output-stage,
[class*="results-column"],
[class*="preview-column"],
[class*="diagram-column"] {
  display: grid;
  gap: 12px;
}

.wm-output-stage > *,
[class*="preview-column"] > *,
[class*="diagram-column"] > * {
  min-height: 0;
}

.wm-visual-stage,
[class*="visualization"],
[class*="diagramStage"],
[class*="graphicalStage"] {
  min-height: clamp(420px, 56vh, 760px);
}

.wm-kpi-row,
[class*="summary-row"],
[class*="status-row"] {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px !important;
}

.wm-kpi,
[class*="summary-card"],
[class*="metric-card"] {
  padding: 12px !important;
}

.wm-validation,
[class*="validation"],
[class*="warning"],
[class*="errorPanel"] {
  border-color: rgba(248, 113, 113, 0.28) !important;
}

@media (max-width: 1180px) {
  .wm-workspace-grid,
  [class*="workspace-grid"],
  [class*="builder-grid"] {
    grid-template-columns: 1fr !important;
  }

  .wm-input-stack,
  [class*="input-column"],
  [class*="controls-column"] {
    position: static;
  }

  .wm-topbar,
  .wm-topbar--compact {
    min-height: 64px;
    padding: 10px 14px;
  }

  .wm-topbar__heading {
    justify-items: start;
  }
}
'@
Save-Utf8NoBom -Path "src\styles\wm-graphical-uplift.css" -Content $upliftCss

$mainPath = Join-Path $root "src\main.tsx"
if (Test-Path $mainPath) {
  $main = Get-Content $mainPath -Raw

  if ($main -notmatch 'wm-graphical-uplift\.css') {
    $insertAfter = 'import "./styles/app.css";'
    if ($main.Contains($insertAfter)) {
      $main = $main.Replace($insertAfter, $insertAfter + [Environment]::NewLine + 'import "./styles/wm-graphical-uplift.css";')
    } else {
      $main = 'import "./styles/wm-graphical-uplift.css";' + [Environment]::NewLine + $main
    }
  }

  Save-Utf8NoBom -Path "src\main.tsx" -Content $main
}

Write-Host ""
Write-Host "Installed:" -ForegroundColor Green
Write-Host "  - Guru click opens directly to Guru"
Write-Host "  - New Wingman brand component and compact top bar"
Write-Host "  - Global graphical uplift and compact density pass"
Write-Host ""
Write-Host "If you want the new attached logo rendered, save it here first and run this again:"
Write-Host "  C:\Users\steve\wingman\_WORK\wingman-bot.png"
Write-Host ""
Write-Host "Next:"
Write-Host "  npm run repo:health"
