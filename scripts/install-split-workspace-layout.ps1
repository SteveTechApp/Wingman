Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location C:\Users\steve\wingman
$root = (Get-Location).Path

function Save-Utf8NoBom {
  param([string]$Path,[string]$Content)
  $full = Join-Path $root $Path
  $dir = Split-Path $full -Parent
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($full,$Content,$utf8)
}

function Backup-IfExists {
  param([string]$RelativePath)
  $full = Join-Path $root $RelativePath
  if (Test-Path $full) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $rescue = Join-Path $root "_RESCUE"
    if (-not (Test-Path $rescue)) {
      New-Item -ItemType Directory -Force -Path $rescue | Out-Null
    }
    $leaf = Split-Path $full -Leaf
    Copy-Item -Force $full (Join-Path $rescue "$leaf.$stamp.bak")
  }
}

foreach ($dir in @(
  "_RESCUE",
  "src\components\workspace",
  "src\styles"
)) {
  $fullDir = Join-Path $root $dir
  if (-not (Test-Path $fullDir)) {
    New-Item -ItemType Directory -Force -Path $fullDir | Out-Null
  }
}

Backup-IfExists "src\components\workspace\SplitWorkspaceFrame.tsx"
Backup-IfExists "src\styles\wm-split-workspace.css"
Backup-IfExists "src\main.tsx"

$frameTsx = @'
import type { ReactNode } from "react";

type SplitWorkspaceFrameProps = {
  title: string;
  subtitle?: string;
  leftTitle?: string;
  rightTitle?: string;
  left: ReactNode;
  right: ReactNode;
  top?: ReactNode;
  bottom?: ReactNode;
};

export default function SplitWorkspaceFrame({
  title,
  subtitle,
  leftTitle = "Inputs",
  rightTitle = "Output",
  left,
  right,
  top,
  bottom,
}: SplitWorkspaceFrameProps) {
  return (
    <div className="wm-split-page">
      <div className="wm-split-page__header">
        <div>
          <div className="wm-split-page__eyebrow">Workspace</div>
          <h1 className="wm-split-page__title">{title}</h1>
          {subtitle ? <p className="wm-split-page__subtitle">{subtitle}</p> : null}
        </div>
        {top ? <div className="wm-split-page__top">{top}</div> : null}
      </div>

      <div className="wm-split-workspace">
        <section className="wm-split-column wm-split-column--left">
          <div className="wm-split-column__header">
            <h2>{leftTitle}</h2>
          </div>
          <div className="wm-split-column__body">{left}</div>
        </section>

        <section className="wm-split-column wm-split-column--right">
          <div className="wm-split-column__header">
            <h2>{rightTitle}</h2>
          </div>
          <div className="wm-split-column__body">{right}</div>
        </section>
      </div>

      {bottom ? <div className="wm-split-page__bottom">{bottom}</div> : null}
    </div>
  );
}
'@
Save-Utf8NoBom "src\components\workspace\SplitWorkspaceFrame.tsx" $frameTsx

$css = @'
.wm-split-page {
  display: grid;
  gap: 14px;
  min-height: 100%;
  padding: 14px;
}

.wm-split-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.wm-split-page__eyebrow {
  color: #93c5fd;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.wm-split-page__title {
  margin: 4px 0 0;
  color: #f8fafc;
  font-size: 1.2rem;
  line-height: 1.05;
  font-weight: 650;
  letter-spacing: -0.03em;
}

.wm-split-page__subtitle {
  margin: 6px 0 0;
  color: rgba(191,219,254,0.78);
  font-size: 0.82rem;
  line-height: 1.35;
  max-width: 72ch;
}

.wm-split-page__top,
.wm-split-page__bottom {
  display: grid;
  gap: 10px;
}

.wm-split-workspace {
  display: grid;
  grid-template-columns: minmax(340px, 0.82fr) minmax(520px, 1.18fr);
  gap: 14px;
  align-items: start;
  min-height: calc(100vh - 170px);
}

.wm-split-column {
  min-height: 0;
  border-radius: 18px;
  border: 1px solid rgba(148,163,184,0.14);
  background:
    radial-gradient(circle at top, rgba(37,99,235,0.08), transparent 24%),
    linear-gradient(180deg, rgba(15,23,42,0.94), rgba(2,6,23,0.94));
  box-shadow:
    0 18px 48px rgba(2,6,23,0.42),
    0 0 0 1px rgba(51,65,85,0.28);
  overflow: hidden;
}

.wm-split-column--left {
  position: sticky;
  top: 84px;
}

.wm-split-column__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 54px;
  padding: 0 14px;
  border-bottom: 1px solid rgba(51,65,85,0.38);
  background: linear-gradient(180deg, rgba(15,23,42,0.88), rgba(2,6,23,0.88));
}

.wm-split-column__header h2 {
  margin: 0;
  color: #f8fafc;
  font-size: 0.94rem;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.wm-split-column__body {
  display: grid;
  gap: 12px;
  padding: 14px;
}

.wm-split-column__body > * {
  min-width: 0;
}

.wm-split-column__body textarea,
.wm-split-column__body input,
.wm-split-column__body select,
.wm-split-column__body button {
  font-size: 0.84rem !important;
}

.wm-split-column__body textarea,
.wm-split-column__body input,
.wm-split-column__body select {
  min-height: 36px;
  border-radius: 12px;
}

.wm-split-column__body textarea {
  min-height: 160px;
}

.wm-split-column__body table {
  font-size: 0.8rem;
}

.wm-split-column__body .wm-next-step,
.wm-split-column__body .wm-start-step {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(96,165,250,0.24);
  background: linear-gradient(180deg, rgba(30,41,59,0.92), rgba(15,23,42,0.92));
  color: #eff6ff;
}

.wm-split-column__body .wm-next-step::before,
.wm-split-column__body .wm-start-step::before {
  content: "Next";
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 46px;
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(37,99,235,0.22);
  color: #bfdbfe;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.wm-workspace-grid,
.wm-builder-grid,
.wm-tool-grid,
[class*="workspace-grid"],
[class*="builder-grid"],
[class*="tool-grid"] {
  display: grid !important;
  grid-template-columns: minmax(340px, 0.82fr) minmax(520px, 1.18fr) !important;
  gap: 14px !important;
  align-items: start !important;
}

.wm-input-column,
.wm-controls-column,
[class*="input-column"],
[class*="controls-column"] {
  position: sticky;
  top: 84px;
  display: grid !important;
  gap: 12px !important;
  align-self: start !important;
}

.wm-output-column,
.wm-results-column,
.wm-preview-column,
[class*="output-column"],
[class*="results-column"],
[class*="preview-column"] {
  display: grid !important;
  gap: 12px !important;
  align-self: start !important;
}

.wm-visual-stage,
.wm-diagram-stage,
[class*="visual-stage"],
[class*="diagram-stage"],
[class*="visualization"] {
  min-height: clamp(420px, 56vh, 760px) !important;
}

.wm-panel,
.wm-card,
.wm-surface,
[class*="panel"],
[class*="card"],
[class*="surface"] {
  border-radius: 18px !important;
}

.wm-compact-controls button,
.wm-compact-controls select,
.wm-compact-controls input {
  min-height: 34px !important;
  font-size: 0.82rem !important;
}

@media (max-width: 1180px) {
  .wm-split-workspace,
  .wm-workspace-grid,
  .wm-builder-grid,
  .wm-tool-grid,
  [class*="workspace-grid"],
  [class*="builder-grid"],
  [class*="tool-grid"] {
    grid-template-columns: 1fr !important;
    min-height: auto;
  }

  .wm-split-column--left,
  .wm-input-column,
  .wm-controls-column,
  [class*="input-column"],
  [class*="controls-column"] {
    position: static;
  }
}
'@
Save-Utf8NoBom "src\styles\wm-split-workspace.css" $css

$mainPath = Join-Path $root "src\main.tsx"
if (Test-Path $mainPath) {
  $main = Get-Content $mainPath -Raw
  if ($main -notmatch 'wm-split-workspace\.css') {
    if ($main.Contains('import "./styles/app.css";')) {
      $main = $main.Replace(
        'import "./styles/app.css";',
        'import "./styles/app.css";' + [Environment]::NewLine + 'import "./styles/wm-split-workspace.css";'
      )
    }
    else {
      $main = 'import "./styles/wm-split-workspace.css";' + [Environment]::NewLine + $main
    }
    Save-Utf8NoBom "src\main.tsx" $main
  }
}

Write-Host ""
Write-Host "Installed split workspace layout." -ForegroundColor Green
Write-Host ""
Write-Host "Use this wrapper in tool pages:"
Write-Host 'import SplitWorkspaceFrame from "@/components/workspace/SplitWorkspaceFrame";'
Write-Host ""
Write-Host "Example:"
Write-Host '<SplitWorkspaceFrame'
Write-Host '  title="Discovery"'
Write-Host '  subtitle="Inputs left. Results right."'
Write-Host '  leftTitle="Question"'
Write-Host '  rightTitle="Answer"'
Write-Host '  left={<YourInput />}'
Write-Host '  right={<YourOutput />}'
Write-Host '/>'
Write-Host ""
Write-Host "Next:"
Write-Host "npm run repo:health"