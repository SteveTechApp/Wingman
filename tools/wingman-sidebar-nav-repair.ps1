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
$rescue = Join-Path $RepoRoot "_RESCUE_SidebarNavRepair_$stamp"
Ensure-Directory $rescue

$navPath = Join-Path $RepoRoot "src\ui2\nav\MissionControlNav.tsx"
$layoutPath = Join-Path $RepoRoot "src\design\system\layout.css"
$componentsPath = Join-Path $RepoRoot "src\design\system\components.css"

@($navPath,$layoutPath,$componentsPath) | ForEach-Object {
    Backup-IfExists -Path $_ -BackupRoot $rescue -RepoRoot $RepoRoot
}

$navTsx = @'
import * as React from "react";
import { NavLink } from "react-router-dom";
import { brand } from "@/branding/brand";
import {
  getActiveWorkflowProject,
} from "@/workflow/workflowStore";

type NavItem = {
  section: string;
  title: string;
  desc: string;
  to: string;
};

const NAV_ITEMS: NavItem[] = [
  {
    section: "Mission Control",
    title: "Mission Control",
    desc: "Pipeline and project flow",
    to: "/app/dashboard",
  },
  {
    section: "Mission Control",
    title: "Projects",
    desc: "All active opportunities",
    to: "/app/projects",
  },
  {
    section: "Mission Control",
    title: "Active Project Workflow",
    desc: "Discovery and solution logic",
    to: "/app/dashboard",
  },
  {
    section: "Workflow",
    title: "Discovery",
    desc: "Capture requirements",
    to: "/app/tools/discovery",
  },
  {
    section: "Workflow",
    title: "Architecture",
    desc: "Advance to solution logic",
    to: "/app/dashboard",
  },
  {
    section: "Workflow",
    title: "Products",
    desc: "Select core products",
    to: "/app/tools/catalog",
  },
  {
    section: "Workflow",
    title: "Proposal",
    desc: "Build customer output",
    to: "/app/tools/proposal-builder",
  },
  {
    section: "Tools & Reference",
    title: "Tool Hub",
    desc: "Browse all tools",
    to: "/app/tools",
  },
  {
    section: "Tools & Reference",
    title: "Product Catalogue",
    desc: "Reference products",
    to: "/app/tools/catalog",
  },
  {
    section: "Tools & Reference",
    title: "Competitor Comparison",
    desc: "Position WyreStorm",
    to: "/app/tools/competitors",
  },
  {
    section: "Tools & Reference",
    title: "Video Wall Designer",
    desc: "Display planning",
    to: "/app/tools/video-wall",
  },
];

function groupedItems(items: NavItem[]): Array<{ section: string; items: NavItem[] }> {
  const map = new Map<string, NavItem[]>();
  for (const item of items) {
    const current = map.get(item.section) ?? [];
    current.push(item);
    map.set(item.section, current);
  }
  return Array.from(map.entries()).map(([section, groupItems]) => ({ section, items: groupItems }));
}

export default function MissionControlNav() {
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 1200);
    return () => window.clearInterval(id);
  }, []);

  const activeProject = React.useMemo(() => getActiveWorkflowProject(), [tick]);
  const sections = React.useMemo(() => groupedItems(NAV_ITEMS), []);

  return (
    <aside className="wm-nav">
      <div className="wm-nav__brand">
        <img src={brand.logo} alt={brand.fullName} className="wm-nav__logo" />
        <div className="wm-nav__brand-copy">
          <div className="wm-nav__brand-title">Wingman</div>
          <div className="wm-nav__brand-subtitle">Workflow platform</div>
        </div>
      </div>

      <div className="wm-nav__active-card">
        <div className="wm-nav__active-label">Active Project</div>
        <div className="wm-nav__active-name">
          {activeProject?.name ?? "No active project"}
        </div>
        <div className="wm-nav__active-copy">
          {activeProject
            ? `${activeProject.customer} · ${activeProject.roomType}`
            : "Create or select a project from Mission Control"}
        </div>
      </div>

      <div className="wm-nav__sections">
        {sections.map((section) => (
          <section key={section.section} className="wm-nav__section">
            <div className="wm-nav__section-title">{section.section}</div>

            <div className="wm-nav__list">
              {section.items.map((item) => (
                <NavLink
                  key={`${section.section}-${item.title}`}
                  to={item.to}
                  className={({ isActive }) =>
                    `wm-nav__item${isActive ? " is-active" : ""}`
                  }
                >
                  <span className="wm-nav__item-title">{item.title}</span>
                  <span className="wm-nav__item-desc">{item.desc}</span>
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

$layoutRaw = if (Test-Path $layoutPath) { Get-Content $layoutPath -Raw } else { "" }

$layoutBlock = @'

/* ===== Wingman sidebar nav repair ===== */

.wm-nav{
  display:flex;
  flex-direction:column;
  gap:18px;
  padding:14px 12px 16px;
  min-height:100%;
}

.wm-nav__brand{
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  gap:10px;
}

.wm-nav__logo{
  width:auto;
  max-width:180px;
  height:auto;
  max-height:64px;
  object-fit:contain;
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

.wm-nav__active-card{
  display:flex;
  flex-direction:column;
  gap:8px;
  padding:14px;
  border-radius:16px;
  border:1px solid rgba(119,166,230,0.14);
  background:rgba(255,255,255,0.03);
}

.wm-nav__active-label{
  font-size:12px;
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

.wm-nav__active-copy{
  font-size:13px;
  line-height:1.45;
  color:rgba(236,244,255,0.70);
}

.wm-nav__sections{
  display:flex;
  flex-direction:column;
  gap:18px;
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
  flex-direction:column;
  gap:3px;
  padding:10px 12px;
  border-radius:12px;
  border:1px solid rgba(119,166,230,0.10);
  background:rgba(255,255,255,0.02);
  color:#eef4ff;
  text-decoration:none;
}

.wm-nav__item:hover{
  border-color:rgba(119,166,230,0.18);
  background:rgba(255,255,255,0.04);
}

.wm-nav__item.is-active{
  border-color:rgba(40,205,210,0.24);
  background:rgba(40,205,210,0.10);
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
'@

if ($layoutRaw -notmatch 'Wingman sidebar nav repair') {
    $layoutRaw = $layoutRaw.TrimEnd() + "`r`n`r`n" + $layoutBlock.Trim() + "`r`n"
    Save-Utf8NoBom -Path $layoutPath -Content $layoutRaw
}

Write-Host ""
Write-Host "Wingman sidebar nav repair applied." -ForegroundColor Green
Write-Host ("Backup folder: {0}" -f $rescue) -ForegroundColor Yellow
Write-Host ""
Write-Host "Run next:" -ForegroundColor Cyan
Write-Host "  npm run typecheck" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White