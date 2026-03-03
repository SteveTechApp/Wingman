[CmdletBinding()]
param(
  [string]$Root = "C:\Users\steve\wingman",
  [switch]$Apply
)

$ErrorActionPreference = "Stop"
if(-not $Apply){ throw "Run with -Apply" }

function Find-RepoRoot {
  param([string]$Start)
  $d = if($Start -and (Test-Path $Start)){ (Resolve-Path $Start).Path } else { (Get-Location).Path }
  while($true){
    if(Test-Path (Join-Path $d "package.json")){ return $d }
    $p = Split-Path $d -Parent
    if([string]::IsNullOrWhiteSpace($p) -or $p -eq $d){
      throw "Could not locate repo root."
    }
    $d = $p
  }
}

function Read-Text([string]$Path){
  try { return [System.IO.File]::ReadAllText($Path) } catch { return "" }
}

function Write-Text([string]$Path,[string]$Text){
  $dir = Split-Path $Path -Parent
  if($dir -and !(Test-Path $dir)){
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  [System.IO.File]::WriteAllText($Path,$Text,[System.Text.UTF8Encoding]::new($false))
}

function Backup-File([string]$Path,[string]$RescueRoot,[string]$RepoRoot){
  if(!(Test-Path $Path)){ return }
  $rel = $Path.Substring($RepoRoot.Length).TrimStart("\","/")
  $dest = Join-Path $RescueRoot $rel
  $dir = Split-Path $dest -Parent
  if(!(Test-Path $dir)){
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  Copy-Item -Force -Path $Path -Destination $dest
}

$repo = Find-RepoRoot -Start $Root
$navPath = Join-Path $repo "src\ui2\nav\MissionControlNav.tsx"
if(!(Test-Path $navPath)){
  throw "MissionControlNav.tsx not found at $navPath"
}

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$rescue = Join-Path $repo "_RESCUE\TrimNavPinnedRecent_$stamp"
New-Item -ItemType Directory -Force -Path $rescue | Out-Null

$newText = @'
/* __WM_MISSION_CONTROL_NAV_V4_TRIMMED__
   Trimmed workspace rail: removes Pinned and Recent to reduce vertical length.
*/
import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  IconGrid,
  IconFolder,
  IconUpload,
  IconBoxes,
  IconCompare,
  IconDoc,
  IconWand,
  IconWall,
  IconBook,
  IconSpark,
} from "../icons/navIcons";
import {
  getStage,
  setStage,
  SALES_STAGES,
  type SalesStage,
} from "./workspaceNavModel";

function cls(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

const TOOL_LINKS = [
  { id: "catalog", label: "Product Catalog", path: "/app/tools/catalog", icon: "boxes" },
  { id: "competitor", label: "Competitor Compare", path: "/app/tools/competitor", icon: "compare" },
  { id: "proposal", label: "Proposal Builder", path: "/app/tools/proposal", icon: "doc" },
  { id: "room", label: "Room Wizard", path: "/app/tools/room", icon: "wand" },
  { id: "videowall", label: "Video Wall Planner", path: "/app/tools/videowall", icon: "wall" },
  { id: "training", label: "Training Hub", path: "/app/tools/training", icon: "book" },
  { id: "guru", label: "Guru", path: "/app/tools/guru", icon: "spark" },
];

function iconFor(key: string) {
  const common = { size: 14, opacity: 0.9 } as const;
  switch (key) {
    case "grid": return <IconGrid {...common} />;
    case "folder": return <IconFolder {...common} />;
    case "upload": return <IconUpload {...common} />;
    case "boxes": return <IconBoxes {...common} />;
    case "compare": return <IconCompare {...common} />;
    case "doc": return <IconDoc {...common} />;
    case "wand": return <IconWand {...common} />;
    case "wall": return <IconWall {...common} />;
    case "book": return <IconBook {...common} />;
    case "spark": return <IconSpark {...common} />;
    default: return null;
  }
}

type NavItemProps = {
  to: string;
  label: string;
  active: boolean;
  iconKey: string;
};

function CompactNavItem({ to, label, active, iconKey }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={cls("wm-mc__navitem", active && "is-active")}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        minHeight: 38,
        padding: "8px 10px",
        borderRadius: 12,
        color: "rgba(255,255,255,0.86)",
        textDecoration: "none",
        border: active ? "1px solid rgba(77,183,255,0.34)" : "1px solid rgba(255,255,255,0.06)",
        background: active ? "rgba(38,136,212,0.14)" : "rgba(255,255,255,0.025)",
        boxShadow: active ? "inset 0 0 0 1px rgba(77,183,255,0.08)" : "none",
        fontSize: 13,
        fontWeight: active ? 700 : 600,
        lineHeight: 1.1,
      }}
    >
      <span
        className="wm-mc__icon"
        style={{
          width: 16,
          minWidth: 16,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.95,
        }}
      >
        {iconFor(iconKey)}
      </span>
      <span style={{ minWidth: 0 }}>{label}</span>
    </NavLink>
  );
}

export default function MissionControlNav() {
  const loc = useLocation();
  const [stage, setStageState] = React.useState<SalesStage>(() => getStage());

  function onStageClick(s: SalesStage) {
    setStageState(s);
    setStage(s);
  }

  const activePath = loc.pathname;

  const sectionTitle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.42)",
    marginBottom: 8,
  };

  const panelStyle: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.055)",
    borderRadius: 14,
    background: "rgba(255,255,255,0.02)",
    padding: 10,
    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
  };

  return (
    <div
      className="wm-mc wm-mc-premium"
      style={{
        height: "100%",
        padding: 10,
        display: "grid",
        gap: 10,
        alignContent: "start",
        overflowY: "auto",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div className="wm-mc__section" style={panelStyle}>
        <div className="wm-mc__subtitle" style={sectionTitle}>Workspace</div>
        <nav className="wm-mc__nav" style={{ display: "grid", gap: 8 }}>
          <CompactNavItem
            to="/app/dashboard"
            label="Dashboard"
            active={activePath.startsWith("/app/dashboard")}
            iconKey="grid"
          />
          <CompactNavItem
            to="/app/projects"
            label="Projects"
            active={activePath.startsWith("/app/projects")}
            iconKey="folder"
          />
          <CompactNavItem
            to="/app/survey-import"
            label="Survey Import"
            active={activePath.startsWith("/app/survey-import")}
            iconKey="upload"
          />
        </nav>
      </div>

      <div className="wm-mc__section" style={panelStyle}>
        <div className="wm-mc__subtitle" style={sectionTitle}>Tools</div>
        <nav className="wm-mc__nav" style={{ display: "grid", gap: 8 }}>
          {TOOL_LINKS.map((t) => (
            <CompactNavItem
              key={t.id}
              to={t.path}
              label={t.label}
              active={activePath.startsWith(t.path)}
              iconKey={t.icon}
            />
          ))}
        </nav>
      </div>

      <div className="wm-mc__section" style={panelStyle}>
        <div className="wm-mc__subtitle" style={sectionTitle}>Active Opportunity</div>
        <div
          className="wm-mc__card"
          style={{
            display: "grid",
            gap: 8,
            padding: 10,
            borderRadius: 12,
            background: "rgba(255,255,255,0.018)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div
            className="wm-mc__row"
            style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12 }}
          >
            <span className="wm-mc__muted" style={{ color: "rgba(255,255,255,0.50)" }}>Selection</span>
            <span className="wm-mc__value" style={{ color: "rgba(255,255,255,0.84)", fontWeight: 600 }}>None selected</span>
          </div>
          <div
            className="wm-mc__row"
            style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12 }}
          >
            <span className="wm-mc__muted" style={{ color: "rgba(255,255,255,0.50)" }}>Next action</span>
            <span className="wm-mc__value" style={{ color: "rgba(255,255,255,0.84)", fontWeight: 600 }}>Open Projects</span>
          </div>
        </div>

        <div className="wm-mc__subtitle" style={{ ...sectionTitle, marginTop: 10 }}>Sales Lifecycle</div>
        <div className="wm-mc__chips" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {SALES_STAGES.map((s) => (
            <button
              key={s}
              type="button"
              className={cls("wm-mc__chip", s === stage && "is-active")}
              onClick={() => onStageClick(s)}
              style={{
                minHeight: 26,
                padding: "4px 8px",
                borderRadius: 999,
                border: s === stage ? "1px solid rgba(77,183,255,0.30)" : "1px solid rgba(255,255,255,0.07)",
                background: s === stage ? "rgba(38,136,212,0.12)" : "rgba(255,255,255,0.025)",
                color: s === stage ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.70)",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
'@

$current = Read-Text $navPath
if($current -ne $newText){
  Backup-File -Path $navPath -RescueRoot $rescue -RepoRoot $repo
  Write-Text -Path $navPath -Text $newText
}

Write-Host ""
Write-Host "== MissionControlNav trimmed ==" -ForegroundColor Cyan
Write-Host "Repo:   $repo"
Write-Host "File:   $navPath"
Write-Host "Backup: $rescue"
Write-Host ""
Write-Host "Removed:"
Write-Host " - Pinned section"
Write-Host " - Recent section"
Write-Host " - Recent tracking state/effect"
Write-Host ""
Write-Host "Next:"
Write-Host "1. npm run typecheck"
Write-Host "2. npm run dev"
Write-Host "3. Refresh /app/dashboard"