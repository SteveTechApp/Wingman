param(
    [switch]$Apply
)

$ErrorActionPreference = "Stop"

$repo = (Get-Location).Path
$src  = Join-Path $repo "src"

function Find-FirstFile([string]$root, [string]$filter) {
    Get-ChildItem -Path $root -Recurse -File -Filter $filter | Select-Object -First 1
}

function Write-Utf8NoBom([string]$path, [string]$content) {
    [System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))
}

function Backup-File([string]$file, [string]$rescueDir) {
    if(Test-Path $file){
        Copy-Item $file (Join-Path $rescueDir ([System.IO.Path]::GetFileName($file))) -Force
    }
}

Write-Host ""
Write-Host "== Wingman Mission Control Refresh ==" -ForegroundColor Cyan
Write-Host "Repo: $repo" -ForegroundColor DarkGray

$topbar    = Find-FirstFile $src "TopBar.tsx"
$nav       = Find-FirstFile $src "MissionControlNav.tsx"
$dashboard = Find-FirstFile $src "DashboardPage.tsx"
$cssTarget = Get-ChildItem -Path $src -Recurse -File -Include *.css,*.scss |
    Where-Object { $_.Name -match '^index\.(css|scss)$|^app\.(css|scss)$|^globals\.(css|scss)$' } |
    Select-Object -First 1

if(-not $cssTarget){
    $cssTarget = Get-ChildItem -Path $src -Recurse -File -Include *.css,*.scss | Select-Object -First 1
}

Write-Host ""
Write-Host "TopBar:        $($topbar.FullName)"
Write-Host "Mission Nav:   $($nav.FullName)"
Write-Host "Dashboard:     $($dashboard.FullName)"
Write-Host "CSS Target:    $($cssTarget.FullName)"

if(-not $topbar -or -not $nav -or -not $dashboard -or -not $cssTarget){
    throw "Could not find one or more required files."
}

if(-not $Apply){
    Write-Host ""
    Write-Host "Audit only. No files changed." -ForegroundColor Yellow
    Write-Host "Run with -Apply to patch the files." -ForegroundColor Yellow
    exit 0
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$rescueDir = Join-Path $repo "_RESCUE\MissionControlRefresh_$timestamp"
New-Item -ItemType Directory -Force -Path $rescueDir | Out-Null

Backup-File $topbar.FullName $rescueDir
Backup-File $nav.FullName $rescueDir
Backup-File $dashboard.FullName $rescueDir
Backup-File $cssTarget.FullName $rescueDir

Write-Host ""
Write-Host "Backup: $rescueDir" -ForegroundColor Green

# ------------------------------------------------------------
# TopBar.tsx
# ------------------------------------------------------------
$topbarCode = @'
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import heroLogo from "@/assets/branding/hero-logo.png";

type Props = {
  collapsed?: boolean;
  onToggleNav?: () => void;
};

function tabClass(active: boolean): string {
  return active ? "wm-topbar__tab is-active" : "wm-topbar__tab";
}

export default function TopBar({ collapsed = false, onToggleNav }: Props) {
  const nav = useNavigate();
  const loc = useLocation();

  return (
    <header className="wm-topbar">
      <div className="wm-topbar__left">
        <button
          type="button"
          className="wm-topbar__navtoggle"
          onClick={onToggleNav}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          title={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {collapsed ? "»" : "«"}
        </button>

        <button
          type="button"
          className="wm-topbar__brand"
          onClick={() => nav("/app/dashboard")}
          title="Go to Dashboard"
        >
          <img
            src={heroLogo}
            alt="WyreStorm Wingman"
            className="wm-topbar__logo"
          />
          <div className="wm-topbar__brandtext">
            <strong>Wingman</strong>
            <span>WyreStorm Sales Assistant</span>
          </div>
        </button>
      </div>

      <nav className="wm-topbar__center" aria-label="Primary">
        <button
          type="button"
          className={tabClass(loc.pathname.startsWith("/app/dashboard"))}
          onClick={() => nav("/app/dashboard")}
        >
          Dashboard
        </button>
        <button
          type="button"
          className={tabClass(loc.pathname.startsWith("/app/projects"))}
          onClick={() => nav("/app/projects")}
        >
          Projects
        </button>
        <button
          type="button"
          className={tabClass(loc.pathname.startsWith("/app/tools"))}
          onClick={() => nav("/app/tools")}
        >
          Tools
        </button>
      </nav>

      <div className="wm-topbar__right">
        <button
          type="button"
          className="wm-topbar__ghost"
          onClick={() => nav("/")}
        >
          Home
        </button>
        <button
          type="button"
          className="wm-topbar__ghost"
          onClick={() => nav(-1)}
        >
          Back
        </button>
      </div>
    </header>
  );
}
'@
Write-Utf8NoBom $topbar.FullName $topbarCode

# ------------------------------------------------------------
# MissionControlNav.tsx
# ------------------------------------------------------------
$navCode = @'
import React from "react";
import { NavLink } from "react-router-dom";

type NavItem = {
  label: string;
  to: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    title: "Workspace",
    items: [
      { label: "Dashboard", to: "/app/dashboard" },
      { label: "Projects", to: "/app/projects" },
    ],
  },
  {
    title: "Core Tools",
    items: [
      { label: "Discovery", to: "/app/tools/discovery" },
      { label: "Room Wizard", to: "/app/tools/room-wizard" },
      { label: "Product Catalog", to: "/app/tools/catalog" },
      { label: "Proposal Builder", to: "/app/tools/proposal" },
    ],
  },
  {
    title: "More",
    items: [
      { label: "Tool Hub", to: "/app/tools" },
      { label: "Import Intake", to: "/app/import" },
    ],
  },
];

function itemClass(active: boolean): string {
  return active ? "wm-mission-nav__item is-active" : "wm-mission-nav__item";
}

export default function MissionControlNav() {
  return (
    <aside className="wm-mission-nav" aria-label="Workspace navigation">
      {sections.map((section) => (
        <section className="wm-mission-nav__section" key={section.title}>
          <div className="wm-mission-nav__heading">{section.title}</div>
          <div className="wm-mission-nav__list">
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => itemClass(isActive)}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </section>
      ))}
    </aside>
  );
}
'@
Write-Utf8NoBom $nav.FullName $navCode

# ------------------------------------------------------------
# DashboardPage.tsx
# ------------------------------------------------------------
$dashboardCode = @'
import React from "react";
import { useNavigate } from "react-router-dom";

type ProjectRow = {
  id: string;
  name: string;
  customer: string;
  stage: string;
  updated: string;
};

const RECENT_PROJECTS: ProjectRow[] = [
  { id: "p1", name: "Boardroom Refresh", customer: "Sample customer", stage: "Discovery", updated: "Today" },
  { id: "p2", name: "Training Suite Upgrade", customer: "Sample customer", stage: "Specify", updated: "Yesterday" },
];

const WORKSPACE_TOOLS = [
  {
    title: "Discovery",
    desc: "Capture rooms, sources, displays, cable distances, and customer constraints.",
    cta: "Open Discovery",
    to: "/app/tools/discovery",
  },
  {
    title: "Room Wizard",
    desc: "Shape the system design and translate needs into a practical AV approach.",
    cta: "Open Room Wizard",
    to: "/app/tools/room-wizard",
  },
  {
    title: "Product Catalog",
    desc: "Review WyreStorm products and move into a solution shortlist quickly.",
    cta: "Browse Catalog",
    to: "/app/tools/catalog",
  },
  {
    title: "Proposal Builder",
    desc: "Convert the design and product decisions into proposal-ready output.",
    cta: "Build Proposal",
    to: "/app/tools/proposal",
  },
];

function StageRow(props: {
  index: number;
  title: string;
  desc: string;
  state: "Current" | "Pending";
}) {
  const { index, title, desc, state } = props;
  return (
    <div className="wm-stage-row">
      <div className="wm-stage-row__dot" />
      <div className="wm-stage-row__body">
        <div className="wm-stage-row__title">
          {index}. {title}
        </div>
        <div className="wm-stage-row__desc">{desc}</div>
      </div>
      <div className={state === "Current" ? "wm-stage-row__state is-current" : "wm-stage-row__state"}>
        {state}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const nav = useNavigate();

  const openProject = (id: string) => {
    nav("/app/projects");
  };

  const deleteProject = (id: string) => {
    window.alert(`Delete action placeholder for ${id}`);
  };

  return (
    <div className="wm-dashboard">
      <section className="wm-dashboard__hero">
        <div>
          <div className="wm-dashboard__eyebrow">Mission Control</div>
          <h1 className="wm-dashboard__title">Keep the opportunity moving</h1>
          <p className="wm-dashboard__subtitle">
            Start with discovery, move into design and specification, then finish with a clear exportable proposal.
          </p>

          <div className="wm-dashboard__meta">
            <span className="wm-chip">Stage: Discovery</span>
            <span className="wm-chip">Status: Draft</span>
            <span className="wm-chip">Updated: Mar 06, 2026</span>
          </div>
        </div>

        <div className="wm-dashboard__heroactions">
          <button type="button" className="wm-btn wm-btn--ghost" onClick={() => nav("/app/projects")}>
            Projects
          </button>
          <button type="button" className="wm-btn wm-btn--ghost" onClick={() => nav("/app/tools")}>
            Tool Hub
          </button>
          <button type="button" className="wm-btn wm-btn--primary" onClick={() => nav("/app/projects/new")}>
            Start New Project
          </button>
        </div>
      </section>

      <section className="wm-dashboard__grid">
        <div className="wm-card">
          <div className="wm-card__title">Recommended next action</div>
          <div className="wm-card__subtitle">
            Begin by capturing the discovery information so every later tool has the right project context.
          </div>

          <div className="wm-nextstep">
            <div className="wm-nextstep__project">
              <div className="wm-nextstep__label">Active Project</div>
              <h3>No active project</h3>
              <p>Create a project first or jump straight into discovery to capture the first set of requirements.</p>

              <div className="wm-inline-actions">
                <button
                  type="button"
                  className="wm-btn wm-btn--primary"
                  onClick={() => nav("/app/tools/discovery")}
                >
                  Capture Discovery
                </button>
                <button
                  type="button"
                  className="wm-btn wm-btn--secondary"
                  onClick={() => nav("/app/projects/new")}
                >
                  Start Blank Project
                </button>
              </div>
            </div>

            <div className="wm-nextstep__stages">
              <StageRow
                index={1}
                title="Discovery"
                desc="Capture application, rooms, distances, displays, sources and constraints."
                state="Current"
              />
              <StageRow
                index={2}
                title="Design"
                desc="Map the signal path, USB needs, audio handling and control approach."
                state="Pending"
              />
              <StageRow
                index={3}
                title="Specify"
                desc="Select WyreStorm products, alternates and accessories."
                state="Pending"
              />
              <StageRow
                index={4}
                title="Quote"
                desc="Export the proposal snapshot and prepare customer-facing output."
                state="Pending"
              />
            </div>
          </div>
        </div>

        <div className="wm-card">
          <div className="wm-card__title">Recent projects</div>
          <div className="wm-card__subtitle">
            Re-open a live opportunity or start a new working draft.
          </div>

          <div className="wm-project-list">
            {RECENT_PROJECTS.map((project) => (
              <div className="wm-project-row" key={project.id}>
                <div className="wm-project-row__main">
                  <div className="wm-project-row__name">{project.name}</div>
                  <div className="wm-project-row__customer">{project.customer}</div>
                </div>
                <div className="wm-project-row__stage">{project.stage}</div>
                <div className="wm-project-row__updated">{project.updated}</div>
                <div className="wm-project-row__actions">
                  <button
                    type="button"
                    className="wm-btn wm-btn--small wm-btn--ghost"
                    onClick={() => openProject(project.id)}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className="wm-icon-btn"
                    onClick={() => deleteProject(project.id)}
                    title="Delete project"
                    aria-label={`Delete ${project.name}`}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="wm-inline-actions">
            <button
              type="button"
              className="wm-btn wm-btn--ghost"
              onClick={() => nav("/app/projects")}
            >
              Open Projects
            </button>
            <button
              type="button"
              className="wm-btn wm-btn--primary"
              onClick={() => nav("/app/projects/new")}
            >
              Start New Project
            </button>
          </div>
        </div>
      </section>

      <section className="wm-card">
        <div className="wm-card__title">Workspace tools</div>
        <div className="wm-card__subtitle">
          Use only the next tool you need. Everything else is available from Tool Hub.
        </div>

        <div className="wm-tool-grid">
          {WORKSPACE_TOOLS.map((tool) => (
            <div className="wm-tool-card" key={tool.title}>
              <div className="wm-tool-card__title">{tool.title}</div>
              <div className="wm-tool-card__desc">{tool.desc}</div>
              <button
                type="button"
                className="wm-btn wm-btn--secondary"
                onClick={() => nav(tool.to)}
              >
                {tool.cta}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
'@
Write-Utf8NoBom $dashboard.FullName $dashboardCode

# ------------------------------------------------------------
# CSS append / replace block
# ------------------------------------------------------------
$css = Get-Content $cssTarget.FullName -Raw

$cssBlock = @'

/* __WM_MISSION_CONTROL_REFRESH__ */

.wm-topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  height: 74px;
  display: grid;
  grid-template-columns: minmax(280px, 420px) 1fr auto;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  background:
    linear-gradient(90deg, rgba(10,25,40,0.96) 0%, rgba(18,31,58,0.96) 100%);
  backdrop-filter: blur(12px);
}

.wm-topbar__left,
.wm-topbar__right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.wm-topbar__center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.wm-topbar__navtoggle,
.wm-topbar__ghost,
.wm-topbar__tab {
  height: 38px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.04);
  color: #e8f1fb;
  padding: 0 14px;
  cursor: pointer;
}

.wm-topbar__tab.is-active {
  background: rgba(10,189,167,0.18);
  border-color: rgba(10,189,167,0.35);
}

.wm-topbar__brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 0;
}

.wm-topbar__logo {
  height: 46px;
  width: auto;
  display: block;
  object-fit: contain;
}

.wm-topbar__brandtext {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  line-height: 1.1;
}

.wm-topbar__brandtext strong {
  font-size: 1.55rem;
  color: #f3f7fb;
}

.wm-topbar__brandtext span {
  font-size: 0.88rem;
  color: rgba(226,236,248,0.78);
}

.wm-mission-nav {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px 14px 22px;
}

.wm-mission-nav__section {
  padding: 14px 12px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.06);
  background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015));
}

.wm-mission-nav__heading {
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  color: rgba(197,213,229,0.72);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.74rem;
  font-weight: 700;
}

.wm-mission-nav__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.wm-mission-nav__item {
  display: block;
  padding: 12px 12px;
  border-radius: 12px;
  color: #e7f0fa;
  text-decoration: none;
  font-weight: 600;
  transition: background .15s ease, border-color .15s ease, transform .15s ease;
  border: 1px solid transparent;
}

.wm-mission-nav__item:hover {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.08);
}

.wm-mission-nav__item.is-active {
  background: linear-gradient(90deg, rgba(12,170,154,0.18), rgba(34,197,94,0.08));
  border-color: rgba(12,170,154,0.30);
}

.wm-dashboard {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.wm-dashboard__hero {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 20px;
  align-items: start;
  padding: 20px 22px;
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,0.06);
  background:
    radial-gradient(circle at top right, rgba(16,185,129,0.18), transparent 32%),
    linear-gradient(180deg, rgba(6,20,38,0.94), rgba(3,10,24,0.94));
}

.wm-dashboard__eyebrow {
  color: #60d5c7;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.82rem;
  font-weight: 800;
  margin-bottom: 8px;
}

.wm-dashboard__title {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3.4rem);
  line-height: 1;
  color: #f8fbff;
}

.wm-dashboard__subtitle {
  margin: 12px 0 0;
  max-width: 840px;
  color: rgba(223,233,244,0.84);
  font-size: 1rem;
}

.wm-dashboard__meta {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.wm-dashboard__heroactions {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.wm-chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  color: #eaf2fb;
  font-size: 0.86rem;
  font-weight: 700;
}

.wm-dashboard__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(360px, 0.95fr);
  gap: 18px;
}

.wm-card {
  padding: 18px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.06);
  background: linear-gradient(180deg, rgba(4,14,28,0.92), rgba(2,8,20,0.92));
  box-shadow: 0 10px 30px rgba(0,0,0,0.20);
}

.wm-card__title {
  font-size: 1.55rem;
  font-weight: 800;
  color: #f5f9fd;
}

.wm-card__subtitle {
  margin-top: 4px;
  color: rgba(220,230,242,0.76);
}

.wm-nextstep {
  margin-top: 16px;
  display: grid;
  grid-template-columns: minmax(260px, 0.9fr) minmax(320px, 1.2fr);
  gap: 14px;
}

.wm-nextstep__project {
  padding: 18px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(10,120,102,0.28), rgba(10,120,102,0.12));
  border: 1px solid rgba(72,187,160,0.24);
}

.wm-nextstep__project h3 {
  margin: 8px 0 10px;
  font-size: 1.2rem;
  color: #f5fbff;
}

.wm-nextstep__project p {
  color: rgba(231,240,250,0.82);
}

.wm-nextstep__label {
  color: #59d0c0;
  text-transform: uppercase;
  letter-spacing: 0.10em;
  font-size: 0.76rem;
  font-weight: 800;
}

.wm-nextstep__stages {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.wm-stage-row {
  display: grid;
  grid-template-columns: 18px 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
}

.wm-stage-row__dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.22);
}

.wm-stage-row__title {
  color: #f4f8fd;
  font-weight: 800;
}

.wm-stage-row__desc {
  color: rgba(219,228,239,0.74);
  font-size: 0.92rem;
}

.wm-stage-row__state {
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 800;
  color: #dce6f2;
  background: rgba(255,255,255,0.06);
}

.wm-stage-row__state.is-current {
  color: #eafffb;
  background: rgba(16,185,129,0.18);
  border: 1px solid rgba(16,185,129,0.25);
}

.wm-project-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.wm-project-row {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 110px 90px auto;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.06);
}

.wm-project-row__name {
  color: #f5f9fd;
  font-weight: 800;
}

.wm-project-row__customer,
.wm-project-row__stage,
.wm-project-row__updated {
  color: rgba(218,228,239,0.76);
  font-size: 0.92rem;
}

.wm-project-row__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.wm-inline-actions {
  margin-top: 14px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.wm-tool-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.wm-tool-card {
  padding: 16px;
  border-radius: 18px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
}

.wm-tool-card__title {
  color: #f4f8fd;
  font-size: 1.2rem;
  font-weight: 800;
}

.wm-tool-card__desc {
  margin: 8px 0 14px;
  color: rgba(218,228,239,0.75);
  min-height: 66px;
}

.wm-btn {
  height: 42px;
  padding: 0 16px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.10);
  cursor: pointer;
  font-weight: 800;
}

.wm-btn--primary {
  color: #f4fffd;
  background: linear-gradient(90deg, rgba(10,174,155,0.95), rgba(22,163,74,0.85));
  border-color: rgba(52,211,153,0.32);
}

.wm-btn--secondary {
  color: #eaf4fd;
  background: rgba(255,255,255,0.05);
}

.wm-btn--ghost {
  color: #eaf4fd;
  background: rgba(255,255,255,0.04);
}

.wm-btn--small {
  height: 34px;
  padding: 0 12px;
  border-radius: 10px;
}

.wm-icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.04);
  color: #f4f8fd;
  cursor: pointer;
}

@media (max-width: 1200px) {
  .wm-dashboard__grid,
  .wm-nextstep,
  .wm-tool-grid,
  .wm-dashboard__hero {
    grid-template-columns: 1fr;
  }

  .wm-dashboard__heroactions {
    justify-content: flex-start;
  }
}

@media (max-width: 860px) {
  .wm-topbar {
    grid-template-columns: 1fr;
    height: auto;
    padding: 12px;
  }

  .wm-topbar__center,
  .wm-topbar__right {
    justify-content: flex-start;
  }

  .wm-project-row {
    grid-template-columns: 1fr;
  }
}
'@

if($css -match '(?s)/\* __WM_MISSION_CONTROL_REFRESH__ \*/.*?(?=(/\* __)|\Z)'){
    $css = [regex]::Replace(
        $css,
        '(?s)/\* __WM_MISSION_CONTROL_REFRESH__ \*/.*?(?=(/\* __)|\Z)',
        $cssBlock
    )
} else {
    $css += "`r`n" + $cssBlock
}

Write-Utf8NoBom $cssTarget.FullName $css

Write-Host ""
Write-Host "Mission Control refresh applied." -ForegroundColor Green
Write-Host "Refresh the browser. If Vite is already running, a normal refresh should be enough." -ForegroundColor DarkGray
Write-Host "Backups are in: $rescueDir" -ForegroundColor DarkGray