[CmdletBinding()]
param(
    [switch]$Apply,
    [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"
if (-not $Apply) { throw "Run with -Apply" }

function Ensure-Directory {
    param([string]$Path)
    if ($Path -and -not (Test-Path $Path)) {
        New-Item -ItemType Directory -Force -Path $Path | Out-Null
    }
}

function Save-Utf8NoBom {
    param([string]$Path,[string]$Content)
    $parent = Split-Path $Path -Parent
    Ensure-Directory $parent
    [System.IO.File]::WriteAllText($Path,$Content,[System.Text.UTF8Encoding]::new($false))
}

function Backup-IfExists {
    param([string]$Path,[string]$BackupRoot,[string]$RepoRoot)
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
$rescue = Join-Path $RepoRoot "_RESCUE_CollapsibleSidebarRail_$stamp"
Ensure-Directory $rescue

$appShellPath = Join-Path $RepoRoot "src\app\shell\AppShell.tsx"
$navPath = Join-Path $RepoRoot "src\ui2\nav\MissionControlNav.tsx"
$layoutPath = Join-Path $RepoRoot "src\design\system\layout.css"

@($appShellPath,$navPath,$layoutPath) | ForEach-Object {
    Backup-IfExists -Path $_ -BackupRoot $rescue -RepoRoot $RepoRoot
}

# -------------------------------------------------------------------
# AppShell
# -------------------------------------------------------------------

$appShellTsx = @'
import * as React from "react";
import { Outlet } from "react-router-dom";

import TopBar from "@/app/navigation/TopBar";
import MissionControlNav from "@/ui2/nav/MissionControlNav";
import AppFooter from "@/app/layout/AppFooter";

export default function AppShell() {
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem("wm_nav_collapsed") === "1";
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem("wm_nav_collapsed", collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

  return (
    <div className="wm-shell-root">
      <TopBar />

      <div className="wm-shell-body">
        <aside className={`wm-shell-nav${collapsed ? " is-collapsed" : ""}`}>
          <MissionControlNav
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((v) => !v)}
          />
        </aside>

        <main className="wm-shell-main">
          <div className="wm-page">
            <Outlet />
          </div>
        </main>
      </div>

      <AppFooter />
    </div>
  );
}
'@

Save-Utf8NoBom -Path $appShellPath -Content $appShellTsx

# -------------------------------------------------------------------
# MissionControlNav
# -------------------------------------------------------------------

$navTsx = @'
import * as React from "react";
import { NavLink } from "react-router-dom";
import { brand } from "@/branding/brand";
import { getActiveWorkflowProject } from "@/workflow/workflowStore";

type MissionControlNavProps = {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

type NavItem = {
  section: string;
  title: string;
  desc: string;
  short: string;
  to: string;
};

const NAV_ITEMS: NavItem[] = [
  { section: "Mission Control", title: "Mission Control", desc: "Pipeline and project flow", short: "MC", to: "/app/dashboard" },
  { section: "Mission Control", title: "Projects", desc: "All active opportunities", short: "PR", to: "/app/projects" },
  { section: "Mission Control", title: "Active Project Workflow", desc: "Discovery and solution logic", short: "AW", to: "/app/dashboard" },

  { section: "Workflow", title: "Discovery", desc: "Capture requirements", short: "D", to: "/app/tools/discovery" },
  { section: "Workflow", title: "Architecture", desc: "Advance to solution logic", short: "A", to: "/app/dashboard" },
  { section: "Workflow", title: "Products", desc: "Select core products", short: "P", to: "/app/tools/catalog" },
  { section: "Workflow", title: "Proposal", desc: "Build customer output", short: "PB", to: "/app/tools/proposal-builder" },

  { section: "Tools & Reference", title: "Tool Hub", desc: "Browse all tools", short: "TH", to: "/app/tools" },
  { section: "Tools & Reference", title: "Product Catalogue", desc: "Reference products", short: "PC", to: "/app/tools/catalog" },
  { section: "Tools & Reference", title: "Competitor Comparison", desc: "Position WyreStorm", short: "CC", to: "/app/tools/competitors" },
  { section: "Tools & Reference", title: "Video Wall Designer", desc: "Display planning", short: "VW", to: "/app/tools/video-wall" },
];

function groupedItems(items: NavItem[]): Array<{ section: string; items: NavItem[] }> {
  const map = new Map<string, NavItem[]>();
  for (const item of items) {
    const current = map.get(item.section) ?? [];
    current.push(item);
    map.set(item.section, current);
  }
  return Array.from(map.entries()).map(([section, sectionItems]) => ({ section, items: sectionItems }));
}

export default function MissionControlNav({ collapsed = false, onToggleCollapse }: MissionControlNavProps) {
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 1200);
    return () => window.clearInterval(id);
  }, []);

  const activeProject = React.useMemo(() => getActiveWorkflowProject(), [tick]);
  const sections = React.useMemo(() => groupedItems(NAV_ITEMS), []);

  return (
    <aside className={`wm-nav${collapsed ? " is-collapsed" : ""}`}>
      <div className="wm-nav__top">
        <div className="wm-nav__brand">
          <img src={brand.logo} alt={brand.fullName} className="wm-nav__logo" />
          {!collapsed ? (
            <div className="wm-nav__brand-copy">
              <div className="wm-nav__brand-title">Wingman</div>
              <div className="wm-nav__brand-subtitle">Workflow platform</div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="wm-nav__collapse"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          title={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <div className="wm-nav__active-card">
        <div className="wm-nav__active-label">Active Project</div>
        <div className="wm-nav__active-name">
          {collapsed ? (activeProject?.name?.slice(0, 2) ?? "—") : (activeProject?.name ?? "No active project")}
        </div>
        {!collapsed ? (
          <div className="wm-nav__active-copy">
            {activeProject
              ? `${activeProject.customer} · ${activeProject.roomType}`
              : "Create or select a project from Mission Control"}
          </div>
        ) : null}
      </div>

      <div className="wm-nav__sections">
        {sections.map((section) => (
          <section key={section.section} className="wm-nav__section">
            {!collapsed ? (
              <div className="wm-nav__section-title">{section.section}</div>
            ) : null}

            <div className="wm-nav__list">
              {section.items.map((item) => (
                <NavLink
                  key={`${section.section}-${item.title}`}
                  to={item.to}
                  className={({ isActive }) =>
                    `wm-nav__item${isActive ? " is-active" : ""}${collapsed ? " is-collapsed" : ""}`
                  }
                  title={collapsed ? item.title : undefined}
                >
                  <span className="wm-nav__item-badge">{collapsed ? item.short : item.short}</span>
                  {!collapsed ? (
                    <span className="wm-nav__item-copy">
                      <span className="wm-nav__item-title">{item.title}</span>
                      <span className="wm-nav__item-desc">{item.desc}</span>
                    </span>
                  ) : null}
                </NavLink>
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}
'@

Save-Utf8NoBom -Path $navPath -Content $navTsx

# -------------------------------------------------------------------
# CSS
# -------------------------------------------------------------------

$layoutRaw = if (Test-Path $layoutPath) { Get-Content $layoutPath -Raw } else { "" }

$layoutBlock = @'

/* ===== Wingman collapsible sidebar rail ===== */

:root{
  --wm-sidebar-w: 240px;
  --wm-sidebar-collapsed: 72px;
}

.wm-shell-body{
  grid-template-columns: var(--wm-sidebar-w) 1fr;
}

.wm-shell-nav{
  width: var(--wm-sidebar-w);
  transition: width 180ms ease;
  overflow: hidden;
}

.wm-shell-nav.is-collapsed{
  width: var(--wm-sidebar-collapsed);
}

.wm-nav{
  display:flex;
  flex-direction:column;
  gap:18px;
  padding:18px 10px 20px;
  min-height:100%;
  transition: all 180ms ease;
}

.wm-nav.is-collapsed{
  align-items:center;
  padding-left:8px;
  padding-right:8px;
}

.wm-nav__top{
  display:flex;
  flex-direction:column;
  gap:12px;
}

.wm-nav.is-collapsed .wm-nav__top{
  align-items:center;
}

.wm-nav__brand{
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  gap:12px;
}

.wm-nav.is-collapsed .wm-nav__brand{
  align-items:center;
}

.wm-nav__logo{
  width:auto;
  max-width:200px;
  max-height:72px;
  height:auto;
  object-fit:contain;
  transition: all 180ms ease;
}

.wm-nav.is-collapsed .wm-nav__logo{
  max-width:48px;
  max-height:48px;
}

.wm-nav__brand-copy{
  display:flex;
  flex-direction:column;
  gap:2px;
}

.wm-nav__brand-title{
  font-size:16px;
  font-weight:800;
  line-height:1.1;
}

.wm-nav__brand-subtitle{
  font-size:13px;
  color:rgba(236,244,255,0.68);
}

.wm-nav__collapse{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  width:36px;
  height:36px;
  border-radius:12px;
  border:1px solid rgba(119,166,230,0.14);
  background:rgba(255,255,255,0.03);
  color:#eef4ff;
  cursor:pointer;
}

.wm-nav.is-collapsed .wm-nav__collapse{
  width:40px;
  height:40px;
}

.wm-nav__active-card{
  display:flex;
  flex-direction:column;
  gap:8px;
  padding:14px;
  border-radius:16px;
  border:1px solid rgba(119,166,230,0.14);
  background:rgba(255,255,255,0.03);
  transition: all 180ms ease;
}

.wm-nav.is-collapsed .wm-nav__active-card{
  width:100%;
  align-items:center;
  padding:12px 8px;
}

.wm-nav__active-label{
  font-size:11px;
  font-weight:700;
  letter-spacing:0.06em;
  text-transform:uppercase;
  color:rgba(236,244,255,0.58);
}

.wm-nav__active-name{
  font-size:16px;
  font-weight:800;
  line-height:1.2;
}

.wm-nav.is-collapsed .wm-nav__active-name{
  font-size:14px;
}

.wm-nav__active-copy{
  font-size:13px;
  line-height:1.45;
  color:rgba(236,244,255,0.70);
}

.wm-nav__sections{
  display:flex;
  flex-direction:column;
  gap:20px;
  min-width:0;
}

.wm-nav.is-collapsed .wm-nav__sections{
  width:100%;
  gap:12px;
}

.wm-nav__section{
  display:flex;
  flex-direction:column;
  gap:8px;
}

.wm-nav__section-title{
  font-size:12px;
  font-weight:800;
  letter-spacing:0.08em;
  text-transform:uppercase;
  color:rgba(236,244,255,0.54);
}

.wm-nav__list{
  display:flex;
  flex-direction:column;
  gap:8px;
}

.wm-nav__item{
  display:flex;
  align-items:flex-start;
  gap:10px;
  padding:12px 14px;
  border-radius:14px;
  border:1px solid rgba(119,166,230,0.10);
  background:rgba(255,255,255,0.02);
  color:#eef4ff;
  text-decoration:none;
  min-width:0;
}

.wm-nav__item:hover{
  border-color:rgba(119,166,230,0.18);
  background:rgba(255,255,255,0.04);
}

.wm-nav__item.is-active{
  background:rgba(40,205,210,0.14);
  border-color:rgba(40,205,210,0.32);
}

.wm-nav__item.is-collapsed{
  justify-content:center;
  padding:10px 8px;
}

.wm-nav__item-badge{
  flex:0 0 auto;
  min-width:30px;
  height:30px;
  border-radius:999px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  font-size:11px;
  font-weight:800;
  color:#eefcff;
  background:rgba(75,141,255,0.14);
  border:1px solid rgba(75,141,255,0.20);
}

.wm-nav__item-copy{
  display:flex;
  flex-direction:column;
  gap:3px;
  min-width:0;
}

.wm-nav__item-title{
  font-size:14px;
  font-weight:700;
  line-height:1.2;
}

.wm-nav__item-desc{
  font-size:12px;
  line-height:1.4;
  color:rgba(236,244,255,0.66);
}

@media (max-width: 980px){
  .wm-shell-body{
    grid-template-columns: var(--wm-sidebar-collapsed) 1fr;
  }

  .wm-shell-nav{
    width: var(--wm-sidebar-collapsed);
  }
}
'@

$layoutPatched = $layoutRaw
$layoutPatched = [regex]::Replace($layoutPatched,'(?s)/\* ===== Wingman collapsible sidebar rail ===== \*/.*?(?=(/\* =====)|\z)','')
$layoutPatched = $layoutPatched.TrimEnd() + "`r`n`r`n" + $layoutBlock.Trim() + "`r`n"

Save-Utf8NoBom -Path $layoutPath -Content $layoutPatched

Write-Host ""
Write-Host "Wingman collapsible sidebar rail applied." -ForegroundColor Green
Write-Host ("Backup folder: {0}" -f $rescue) -ForegroundColor Yellow
Write-Host ""
Write-Host "Run next:" -ForegroundColor Cyan
Write-Host "  npm run typecheck" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White