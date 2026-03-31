$ErrorActionPreference = "Stop"

$root = Get-Location

function Backup-File {
  param([string]$Path)
  if (Test-Path $Path) {
    Copy-Item $Path "$Path.bak" -Force
  }
}

function Write-Utf8NoBom {
  param(
    [string]$Path,
    [string]$Content
  )
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

$publicDir = Join-Path $root "public"
if (-not (Test-Path $publicDir)) {
  New-Item -ItemType Directory -Force -Path $publicDir | Out-Null
}

$workflowShellPath = Join-Path $root "src/features/wingmanUx/WingmanWorkflowShell.tsx"
$cssPath = Join-Path $root "src/features/wingmanUx/wingman-ux.css"

# ------------------------------------------------------------
# 1) Find a likely existing logo asset
# ------------------------------------------------------------

$logoCandidates = Get-ChildItem -Path $root -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object {
    $_.Extension -match "^\.(png|svg|webp|jpg|jpeg)$" -and (
      $_.Name -match "wyre|wingman|logo|brand"
    )
  } |
  Sort-Object FullName

$selectedLogo = $null

if ($logoCandidates.Count -gt 0) {
  $selectedLogo = $logoCandidates |
    Sort-Object {
      $score = 100
      if ($_.FullName -match "\\public\\") { $score -= 30 }
      if ($_.Name -match "wyrestorm") { $score -= 20 }
      if ($_.Name -match "wingman") { $score -= 20 }
      if ($_.Name -match "logo") { $score -= 10 }
      if ($_.Extension -eq ".svg") { $score -= 5 }
      $score
    } |
    Select-Object -First 1
}

$publicLogoPath = $null
$publicLogoUrl = "/wingman-brand-logo.png"

if ($selectedLogo) {
  $ext = $selectedLogo.Extension.ToLowerInvariant()
  $publicLogoPath = Join-Path $publicDir ("wingman-brand-logo" + $ext)
  Copy-Item $selectedLogo.FullName $publicLogoPath -Force
  $publicLogoUrl = "/wingman-brand-logo$ext"
  Write-Host "Logo found and copied:"
  Write-Host "  Source: $($selectedLogo.FullName)"
  Write-Host "  Public: $publicLogoPath"
}
else {
  Write-Warning "No existing logo asset found. The shell will still render text fallback."
}

# ------------------------------------------------------------
# 2) Replace WingmanWorkflowShell.tsx with logo-enabled version
# ------------------------------------------------------------

Backup-File $workflowShellPath

$workflowShellContent = @"
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import "./wingman-ux.css";

export type WingmanWorkflowStage =
  | "discovery"
  | "room-definition"
  | "technology"
  | "product-selection"
  | "architecture"
  | "bom"
  | "proposal";

const STAGES: Array<{
  id: WingmanWorkflowStage;
  label: string;
  route?: string;
}> = [
  { id: "discovery", label: "Discovery", route: WM_ROUTES.discovery },
  { id: "room-definition", label: "Room Definition" },
  { id: "technology", label: "Tech Selection" },
  { id: "product-selection", label: "Product Selection", route: WM_ROUTES.catalog },
  { id: "architecture", label: "System Architecture", route: WM_ROUTES.proposal },
  { id: "bom", label: "Bill of Materials", route: WM_ROUTES.proposal },
  { id: "proposal", label: "Proposal Output", route: WM_ROUTES.proposal },
];

export function WingmanWorkflowShell(props: {
  activeStage: WingmanWorkflowStage;
  projectName?: string;
  sourceCount?: number;
  displayCount?: number;
  distanceM?: number;
  systemType?: string;
  rightRail?: React.ReactNode;
  children: React.ReactNode;
}) {
  const {
    activeStage,
    projectName,
    sourceCount,
    displayCount,
    distanceM,
    systemType,
    rightRail,
    children,
  } = props;

  const navigate = useNavigate();

  return (
    <div className="wmx-app">
      <header className="wmx-topbar">
        <div className="wmx-brand">
          <div className="wmx-brand-logoWrap">
            <img
              src="$publicLogoUrl"
              alt="WyreStorm Wingman"
              className="wmx-brand-logo"
              onError={(event) => {
                const img = event.currentTarget;
                img.style.display = "none";
                const fallback = img.parentElement?.querySelector(".wmx-brand-mark") as HTMLElement | null;
                if (fallback) fallback.style.display = "grid";
              }}
            />
            <div className="wmx-brand-mark" style={{ display: "none" }}>
              ◈
            </div>
          </div>

          <div className="wmx-brand-copy">
            <div className="wmx-brand-kicker">WYRESTORM</div>
            <div className="wmx-brand-name">Wingman</div>
            <div className="wmx-brand-subtitle">Guided AV design and sales support</div>
          </div>
        </div>

        <div className="wmx-topbar-meta">
          <div className="wmx-topbar-pill">
            <span className="wmx-topbar-label">Project:</span>
            <strong>{projectName || "Untitled Project"}</strong>
          </div>
          <div className="wmx-topbar-pill">
            <strong>
              {sourceCount ?? 0} Sources → {displayCount ?? 0} Displays → {distanceM ?? 0}m
            </strong>
          </div>
          <div className="wmx-topbar-pill">
            <span className="wmx-topbar-label">System Type:</span>
            <strong>{systemType || "In qualification"}</strong>
          </div>
        </div>

        <div className="wmx-topbar-tools">
          <button type="button" className="wmx-icon-btn" aria-label="Notifications">
            ⊙
          </button>
          <button type="button" className="wmx-icon-btn" aria-label="History">
            ◷
          </button>
          <button type="button" className="wmx-icon-btn" aria-label="Settings">
            ⚙
          </button>
        </div>
      </header>

      <div className="wmx-layout">
        <aside className="wmx-sidebar">
          {STAGES.map((item) => {
            const active = item.id === activeStage;
            const clickable = Boolean(item.route);

            return (
              <button
                key={item.id}
                type="button"
                className={\`wmx-nav-item\${active ? " is-active" : ""}\${clickable ? "" : " is-disabled"}\`}
                onClick={() => {
                  if (item.route) navigate(item.route);
                }}
                disabled={!item.route}
              >
                <span className="wmx-nav-icon" />
                <span className="wmx-nav-text">{item.label}</span>
              </button>
            );
          })}
        </aside>

        <main className="wmx-main">{children}</main>

        <aside className="wmx-rightbar">{rightRail ?? <div />}</aside>
      </div>
    </div>
  );
}
"@

Write-Utf8NoBom -Path $workflowShellPath -Content $workflowShellContent
Write-Host "Updated: $workflowShellPath"

# ------------------------------------------------------------
# 3) Append CSS for logo display
# ------------------------------------------------------------

Backup-File $cssPath

$cssAppend = @"

.wmx-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.wmx-brand-logoWrap {
  width: 128px;
  min-width: 128px;
  height: 52px;
  display: grid;
  place-items: center;
}

.wmx-brand-logo {
  max-width: 128px;
  max-height: 52px;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
}

.wmx-brand-copy {
  display: grid;
  align-content: center;
  gap: 2px;
  min-width: 0;
}

.wmx-brand-kicker {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--wmx-blue-2);
}

.wmx-brand-subtitle {
  font-size: 0.82rem;
  color: var(--wmx-subtle);
}

@media (max-width: 1180px) {
  .wmx-brand-logoWrap {
    width: 104px;
    min-width: 104px;
    height: 42px;
  }

  .wmx-brand-logo {
    max-width: 104px;
    max-height: 42px;
  }
}
"@

Add-Content -Path $cssPath -Value $cssAppend
Write-Host "Updated: $cssPath"

Write-Host ""
Write-Host "Done."
if ($selectedLogo) {
  Write-Host "Logo URL now used by shell: $publicLogoUrl"
} else {
  Write-Host "No logo asset was auto-found. Text fallback will show until you add one."
}
Write-Host ""
Write-Host "Next:"
Write-Host "  npm run typecheck"
Write-Host "  npm run dev"