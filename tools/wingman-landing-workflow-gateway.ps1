[CmdletBinding()]
param(
    [switch]$Apply,
    [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

if (-not $Apply) {
    throw "Run with -Apply"
}

function Ensure-Directory {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Force -Path $Path | Out-Null
    }
}

function Save-Utf8NoBom {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Content
    )
    $parent = Split-Path $Path -Parent
    if ($parent) { Ensure-Directory $parent }
    $enc = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($Path, $Content, $enc)
}

function Backup-IfExists {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$BackupRoot,
        [Parameter(Mandatory)][string]$RepoRoot
    )
    if (-not (Test-Path $Path)) { return }
    $resolved = (Resolve-Path $Path).Path
    $rel = $resolved.Substring($RepoRoot.Length).TrimStart("\")
    $dest = Join-Path $BackupRoot $rel
    Ensure-Directory (Split-Path $dest -Parent)
    Copy-Item $resolved $dest -Force
}

$RepoRoot = (Resolve-Path $RepoRoot).Path
Set-Location $RepoRoot

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$rescue = Join-Path $RepoRoot "_RESCUE_LandingWorkflowGateway_$stamp"
Ensure-Directory $rescue

$pagePath = Join-Path $RepoRoot "src\pages\PublicLandingPage.tsx"
$layoutCssPath = Join-Path $RepoRoot "src\design\system\layout.css"
$componentsCssPath = Join-Path $RepoRoot "src\design\system\components.css"

@($pagePath, $layoutCssPath, $componentsCssPath) | ForEach-Object {
    Backup-IfExists -Path $_ -BackupRoot $rescue -RepoRoot $RepoRoot
}

$pageTsx = @'
import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { brand } from "@/branding/brand";

const capabilityPills = [
  "Discovery",
  "Architecture",
  "Products",
  "Proposal",
  "Video Wall",
  "USB",
  "Control",
];

const featureCards = [
  {
    eyebrow: "Discovery",
    title: "Capture requirements",
    body: "Structure room conditions, displays, source counts, cable distance, USB, control, and audio needs before product selection begins.",
  },
  {
    eyebrow: "Architecture",
    title: "Choose the right signal path",
    body: "Guide users toward HDBaseT, AVoIP, matrix switching, USB extension, or video wall workflows based on the application.",
  },
  {
    eyebrow: "Products",
    title: "Build the solution",
    body: "Turn the selected architecture into recommended WyreStorm platforms, building blocks, and a starter BOM direction.",
  },
  {
    eyebrow: "Proposal",
    title: "Move toward output",
    body: "Keep commercial logic, documentation, and proposal readiness aligned to the actual project workflow.",
  },
];

const workflowSteps = [
  "Discovery",
  "Architecture",
  "Products",
  "Proposal",
];

export default function PublicLandingPage() {
  const navigate = useNavigate();

  const startNewProject = () => {
    try {
      localStorage.setItem("wm_force_create_project", "1");
    } catch {}
    navigate("/app/dashboard");
  };

  return (
    <div className="wm-landing-page">
      <section className="wm-landing-hero">
        <div className="wm-landing-hero-inner">
          <div className="wm-landing-hero-panel">
            <div className="wm-landing-brand">
              <img
                src={brand.logo}
                alt={brand.fullName}
                className="wm-landing-logo"
              />

              <div className="wm-landing-brand-copy">
                <div className="wm-landing-kicker">WyreStorm Sales Assistant</div>
                <h1 className="wm-landing-title">
                  Turn AV requirements into proposal-ready system designs.
                </h1>
                <p className="wm-landing-subtitle">
                  Wingman helps sales and pre-sales teams capture room requirements,
                  choose the right WyreStorm architecture, structure a BOM, and move
                  opportunities through a consistent workflow.
                </p>
              </div>
            </div>

            <div className="wm-landing-actions">
              <button type="button" className="wm-btn wm-btn-primary" onClick={startNewProject}>
                Start New Project
              </button>
              <Link to="/app/tools/discovery" className="wm-btn wm-btn-secondary">
                Run Discovery Wizard
              </Link>
              <Link to="/app/dashboard" className="wm-btn wm-btn-secondary">
                Open Mission Control
              </Link>
            </div>

            <div className="wm-landing-pill-row">
              {capabilityPills.map((pill) => (
                <span key={pill} className="wm-badge">
                  {pill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="wm-landing-section">
        <div className="wm-landing-workflow-strip wm-card">
          <div className="wm-landing-section-kicker">How Wingman works</div>
          <div className="wm-landing-workflow-row">
            {workflowSteps.map((step, index) => (
              <React.Fragment key={step}>
                <div className="wm-landing-workflow-step">
                  <span className="wm-landing-workflow-index">0{index + 1}</span>
                  <span>{step}</span>
                </div>
                {index < workflowSteps.length - 1 ? (
                  <div className="wm-landing-workflow-arrow">→</div>
                ) : null}
              </React.Fragment>
            ))}
          </div>
          <p className="wm-muted wm-landing-workflow-copy">
            Start with the application, move into architecture, then product selection,
            and only then build the commercial output.
          </p>
        </div>
      </section>

      <section className="wm-landing-section">
        <div className="wm-landing-section-head">
          <div>
            <div className="wm-landing-section-kicker">What Wingman helps you do</div>
            <h2 className="wm-subtitle wm-landing-section-title">
              Core workflow tools for AV sales and design
            </h2>
          </div>
          <p className="wm-muted wm-landing-section-copy">
            Built to guide less technical sales users while still supporting structured
            system design, solution logic, and proposal consistency.
          </p>
        </div>

        <div className="wm-landing-feature-grid">
          {featureCards.map((card) => (
            <article key={card.title} className="wm-card wm-landing-feature-card">
              <div className="wm-landing-card-kicker">{card.eyebrow}</div>
              <h3 className="wm-landing-card-title">{card.title}</h3>
              <p className="wm-muted wm-landing-card-copy">{card.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
'@

Save-Utf8NoBom -Path $pagePath -Content $pageTsx

$layoutRaw = if (Test-Path $layoutCssPath) { Get-Content $layoutCssPath -Raw } else { "" }

$layoutAdditions = @'

/* ===== Wingman landing workflow gateway ===== */

.wm-landing-workflow-strip{
  padding: 18px;
  display:flex;
  flex-direction:column;
  gap: 14px;
}

.wm-landing-workflow-row{
  display:flex;
  align-items:center;
  justify-content:center;
  gap: 12px;
  flex-wrap:wrap;
}

.wm-landing-workflow-step{
  display:inline-flex;
  align-items:center;
  gap: 10px;
  min-height: 42px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(119,166,230,0.14);
  font-weight: 700;
}

.wm-landing-workflow-index{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: rgba(40,205,210,0.12);
  border: 1px solid rgba(40,205,210,0.20);
  font-size: 11px;
  font-weight: 800;
}

.wm-landing-workflow-arrow{
  color: rgba(236,244,255,0.56);
  font-size: 18px;
  font-weight: 700;
}

.wm-landing-workflow-copy{
  margin: 0;
  text-align: center;
}

@media (max-width: 760px){
  .wm-landing-workflow-row{
    justify-content:flex-start;
  }

  .wm-landing-workflow-copy{
    text-align:left;
  }
}
'@

if ($layoutRaw -notmatch 'Wingman landing workflow gateway') {
    $layoutRaw = $layoutRaw.TrimEnd() + "`r`n`r`n" + $layoutAdditions.Trim() + "`r`n"
    Save-Utf8NoBom -Path $layoutCssPath -Content $layoutRaw
}

$componentsRaw = if (Test-Path $componentsCssPath) { Get-Content $componentsCssPath -Raw } else { "" }

$componentAdditions = @'

.wm-landing-workflow-strip .wm-badge{
  background: rgba(40,205,210,0.10);
  border: 1px solid rgba(40,205,210,0.18);
}
'@

if ($componentsRaw -notmatch '\.wm-landing-workflow-strip \.wm-badge') {
    $componentsRaw = $componentsRaw.TrimEnd() + "`r`n`r`n" + $componentAdditions.Trim() + "`r`n"
    Save-Utf8NoBom -Path $componentsCssPath -Content $componentsRaw
}

Write-Host ""
Write-Host "Wingman landing workflow gateway applied." -ForegroundColor Green
Write-Host ("Backup folder: {0}" -f $rescue) -ForegroundColor Yellow
Write-Host ""
Write-Host "Run next:" -ForegroundColor Cyan
Write-Host "  npm run typecheck" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White