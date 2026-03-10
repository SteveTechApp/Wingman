# wingman-dashboard-about-page-refresh.ps1
# Purpose:
# - Remove the "How Wingman Works" explainer from the dashboard landing page
# - Ensure the dashboard copy refers to sales tools and building projects
# - Rename "Open Projects" to "Build Projects"
# - Add "About Wingman" to quick-access utility cards
# - Create/update a separate About Wingman page
# - Add the About Wingman route if missing
#
# Usage:
#   pwsh -NoProfile -ExecutionPolicy Bypass -File .\tools\wingman-dashboard-about-page-refresh.ps1
#
# Optional:
#   pwsh -NoProfile -ExecutionPolicy Bypass -File .\tools\wingman-dashboard-about-page-refresh.ps1 -RepoRoot C:\Users\steve\wingman

param(
    [string]$RepoRoot = "C:\Users\steve\wingman"
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "== $Message ==" -ForegroundColor Cyan
}

function Save-Utf8NoBom {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Content
    )
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
    [System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($false))
}

function Backup-File {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$BackupRoot
    )
    if (Test-Path $Path) {
        $dest = Join-Path $BackupRoot ([IO.Path]::GetFileName($Path))
        Copy-Item $Path $dest -Force
    }
}

function Ensure-Replacement {
    param(
        [Parameter(Mandatory = $true)][string]$Content,
        [Parameter(Mandatory = $true)][string]$Find,
        [Parameter(Mandatory = $true)][string]$Replace,
        [Parameter(Mandatory = $true)][string]$Label
    )

    if ($Content.Contains($Find)) {
        return $Content.Replace($Find, $Replace)
    }

    Write-Warning "Pattern not found for: $Label"
    return $Content
}

function Ensure-RegexReplace {
    param(
        [Parameter(Mandatory = $true)][string]$Content,
        [Parameter(Mandatory = $true)][string]$Pattern,
        [Parameter(Mandatory = $true)][string]$Replacement,
        [Parameter(Mandatory = $true)][string]$Label
    )

    $updated = [regex]::Replace($Content, $Pattern, $Replacement)
    if ($updated -eq $Content) {
        Write-Warning "Regex pattern not matched for: $Label"
    }
    return $updated
}

if (-not (Test-Path $RepoRoot)) {
    throw "Repo root not found: $RepoRoot"
}

Set-Location $RepoRoot

$backupRoot = Join-Path $RepoRoot ("_RESCUE_DashboardAboutRefresh_" + (Get-Date -Format "yyyyMMdd_HHmmss"))
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

$dashboardPath = Join-Path $RepoRoot "src\features\dashboard\DashboardPage.tsx"
$appRoutesPath = Join-Path $RepoRoot "src\AppRoutes.tsx"
$aboutPagePath = Join-Path $RepoRoot "src\pages\AboutWingmanPage.tsx"

Write-Step "Backing up target files"
Backup-File -Path $dashboardPath -BackupRoot $backupRoot
Backup-File -Path $appRoutesPath -BackupRoot $backupRoot
Backup-File -Path $aboutPagePath -BackupRoot $backupRoot

Write-Step "Updating DashboardPage.tsx"

if (-not (Test-Path $dashboardPath)) {
    throw "DashboardPage.tsx not found: $dashboardPath"
}

$dashboard = Get-Content $dashboardPath -Raw

# Hero supporting text
$dashboard = Ensure-Replacement `
    -Content $dashboard `
    -Find 'Wingman helps sales and pre-sales teams use guided sales tools, capture room requirements, build projects, select the right WyreStorm architecture, and move opportunities toward proposal-ready output.' `
    -Replace 'Wingman helps sales and pre-sales teams use guided sales tools, capture room requirements, build projects, select the right WyreStorm architecture, and move opportunities toward proposal-ready output.' `
    -Label 'Hero body text'

# Catch older phrasing too
$dashboard = Ensure-Replacement `
    -Content $dashboard `
    -Find 'Wingman helps sales and pre-sales teams capture room requirements, select the right WyreStorm architecture, structure a BOM, and move projects through a consistent workflow.' `
    -Replace 'Wingman helps sales and pre-sales teams use guided sales tools, capture room requirements, build projects, select the right WyreStorm architecture, and move opportunities toward proposal-ready output.' `
    -Label 'Older hero body text'

# Button label
$dashboard = $dashboard.Replace('Open Projects', 'Build Projects')

# Section heading/copy
$dashboard = $dashboard.Replace(
    '<h2>Core workflow tools</h2>',
    '<h2>Core sales tools and project-building workflow</h2>'
)

$dashboard = $dashboard.Replace(
    '<p>Use this sequence to keep discovery, architecture, products, and proposal output in sync.</p>',
    '<p>Use these tools to support sales activity, build projects, and move from discovery through to proposal-ready output.</p>'
)

$dashboard = $dashboard.Replace(
    '<p>Use these tools to support sales activity, structure projects, and move from discovery through to proposal output.</p>',
    '<p>Use these tools to support sales activity, build projects, and move from discovery through to proposal-ready output.</p>'
)

# Add About Wingman quick chip if missing
if ($dashboard -notmatch '<Link to="/app/about-wingman" className="wm-chip">About Wingman</Link>') {
    $dashboard = Ensure-RegexReplace `
        -Content $dashboard `
        -Pattern '(<Link to="/app/tools/templates\?market=retail" className="wm-chip">Retail</Link>)' `
        -Replacement ('$1' + "`r`n" + '            <Link to="/app/about-wingman" className="wm-chip">About Wingman</Link>') `
        -Label 'Add About Wingman hero chip'
}

# Add utility card if missing
if ($dashboard -notmatch 'title:\s*"About Wingman"') {
    $dashboard = Ensure-RegexReplace `
        -Content $dashboard `
        -Pattern 'const utilityCards: UtilityCard\[] = \[' `
        -Replacement @'
const utilityCards: UtilityCard[] = [
  {
    title: "About Wingman",
    description: "Learn how Wingman supports sales tools, project building, and guided solution workflows.",
    to: "/app/about-wingman",
    Icon: FolderOpen,
  },
'@ `
        -Label 'Add About Wingman utility card'
}

# Remove "How Wingman Works" block if present in this file
$dashboard = Ensure-RegexReplace `
    -Content $dashboard `
    -Pattern '(?s)\r?\n\s*<section className="wm-section">\s*<div className="wm-kicker">How Wingman Works</div>.*?</section>\s*' `
    -Replacement "`r`n" `
    -Label 'Remove old How Wingman Works section'

Save-Utf8NoBom -Path $dashboardPath -Content $dashboard

Write-Step "Creating or updating AboutWingmanPage.tsx"

$aboutContent = @'
import * as React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ClipboardList,
  LayoutTemplate,
  Boxes,
  FileText,
  Briefcase,
  FolderOpen,
  MonitorSmartphone,
} from "lucide-react";

const workflow = [
  {
    step: "01",
    title: "Discovery",
    description:
      "Capture application, display count, source requirements, cable distance, USB, control, and commercial priorities before solution building begins.",
    Icon: ClipboardList,
  },
  {
    step: "02",
    title: "Architecture",
    description:
      "Guide users toward the right WyreStorm approach, including HDBaseT, AVoIP, matrix workflows, USB extension, and video wall direction.",
    Icon: LayoutTemplate,
  },
  {
    step: "03",
    title: "Products",
    description:
      "Turn the chosen architecture into recommended WyreStorm platforms, building blocks, and practical product selections.",
    Icon: Boxes,
  },
  {
    step: "04",
    title: "Proposal",
    description:
      "Move from system logic into proposal-ready output with commercial consistency and clearer sales support.",
    Icon: FileText,
  },
];

const capabilities = [
  {
    title: "Sales tools",
    description:
      "Support less technical sales users with guided workflows, structured toolsets, and clearer starting points for conversations and proposals.",
    Icon: Briefcase,
  },
  {
    title: "Build projects",
    description:
      "Create and structure projects from blank starts, customer requirements, room templates, and guided workflow steps.",
    Icon: FolderOpen,
  },
  {
    title: "System design guidance",
    description:
      "Help users move from requirements into architecture, product direction, and BOM thinking with more consistency.",
    Icon: MonitorSmartphone,
  },
];

export default function AboutWingmanPage() {
  return (
    <div className="wm-page">
      <section className="wm-section">
        <div className="wm-grid" style={{ gap: 16 }}>
          <div className="wm-kicker">About Wingman</div>

          <div className="wm-title-xl" style={{ maxWidth: 900 }}>
            Wingman is WyreStorm’s guided sales and project-building workspace.
          </div>

          <div className="wm-body" style={{ maxWidth: 940 }}>
            It is designed to help sales and pre-sales users capture requirements, choose the right solution path,
            build projects more consistently, and move opportunities toward proposal-ready output using practical
            WyreStorm sales tools and guided workflows.
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
            <Link to="/app/projects/new" className="wm-btn wm-btn-primary">
              Build a New Project
            </Link>
            <Link to="/app/tools/discovery" className="wm-btn">
              Open Sales Tools
            </Link>
            <Link to="/app/dashboard" className="wm-btn">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="wm-section">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>What Wingman helps you do</h2>
            <p>Wingman supports both practical sales activity and structured project development.</p>
          </div>
        </div>

        <div className="wm-grid-cards">
          {capabilities.map(({ title, description, Icon }) => (
            <article key={title} className="wm-dashboard-card">
              <div className="wm-dashboard-card__top">
                <div className="wm-dashboard-card__icon">
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <div className="wm-title-lg" style={{ fontSize: 20 }}>{title}</div>
              <div className="wm-body">{description}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="wm-section">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>How Wingman works</h2>
            <p>Use the workflow in sequence so sales logic, design logic, and project output stay aligned.</p>
          </div>
        </div>

        <div className="wm-grid-cards">
          {workflow.map(({ step, title, description, Icon }) => (
            <article key={step} className="wm-dashboard-card">
              <div className="wm-dashboard-card__top">
                <div className="wm-dashboard-card__icon">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="wm-kicker">Step {step}</div>
              </div>

              <div className="wm-title-lg" style={{ fontSize: 20 }}>{title}</div>
              <div className="wm-body">{description}</div>
            </article>
          ))}
        </div>

        <div className="wm-body" style={{ marginTop: 18, maxWidth: 980 }}>
          Start with the application, move into architecture, then product selection, and only then move toward
          proposal output. This makes Wingman useful both as a sales support platform and as a practical project-building tool.
        </div>
      </section>

      <section className="wm-section">
        <Link to="/app/dashboard" className="wm-btn">
          Return to Dashboard
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
'@

Save-Utf8NoBom -Path $aboutPagePath -Content $aboutContent

Write-Step "Updating AppRoutes.tsx"

if (-not (Test-Path $appRoutesPath)) {
    throw "AppRoutes.tsx not found: $appRoutesPath"
}

$appRoutes = Get-Content $appRoutesPath -Raw

if ($appRoutes -notmatch 'AboutWingmanPage') {
    $appRoutes = Ensure-RegexReplace `
        -Content $appRoutes `
        -Pattern 'const DashboardPage = React\.lazy\(\(\) => import\("@/features/dashboard/DashboardPage"\)\);' `
        -Replacement @'
const DashboardPage = React.lazy(() => import("@/features/dashboard/DashboardPage"));
const AboutWingmanPage = React.lazy(() => import("@/pages/AboutWingmanPage"));
'@ `
        -Label 'Add AboutWingmanPage import'
}

if ($appRoutes -notmatch 'path="/app/about-wingman"') {
    $appRoutes = Ensure-RegexReplace `
        -Content $appRoutes `
        -Pattern '(<Route\s+path="/app/dashboard"\s+element={<DashboardPage\s*/>}\s*/>)' `
        -Replacement @'
$1
          <Route path="/app/about-wingman" element={<AboutWingmanPage />} />
'@ `
        -Label 'Add About Wingman route after dashboard route'
}

Save-Utf8NoBom -Path $appRoutesPath -Content $appRoutes

Write-Step "Completed"
Write-Host "Backup folder: $backupRoot" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next commands:" -ForegroundColor Green
Write-Host "  Set-Location $RepoRoot"
Write-Host "  npm run typecheck"
Write-Host "  npm run dev"