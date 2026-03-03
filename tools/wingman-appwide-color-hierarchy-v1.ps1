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

function Upsert-CssBlock {
  param(
    [string]$Css,
    [string]$StartMarker,
    [string]$EndMarker,
    [string]$Block
  )
  $has = $Css.Contains($StartMarker) -and $Css.Contains($EndMarker)
  if($has){
    $pattern = [regex]::Escape($StartMarker) + '.*?' + [regex]::Escape($EndMarker)
    return [regex]::Replace($Css, $pattern, $Block, [System.Text.RegularExpressions.RegexOptions]::Singleline)
  }
  return $Css.TrimEnd() + "`r`n`r`n" + $Block + "`r`n"
}

$repo = Find-RepoRoot -Start $Root
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$rescue = Join-Path $repo "_RESCUE\AppWideColorHierarchy_$stamp"
New-Item -ItemType Directory -Force -Path $rescue | Out-Null

$appShellPath = Join-Path $repo "src\app\shell\AppShell.tsx"
$cssPath = Join-Path $repo "src\styles\wingman-ui.css"

if(!(Test-Path $appShellPath)){ throw "Missing: $appShellPath" }
if(!(Test-Path $cssPath)){ throw "Missing: $cssPath" }

Backup-File -Path $appShellPath -RescueRoot $rescue -RepoRoot $repo
Backup-File -Path $cssPath -RescueRoot $rescue -RepoRoot $repo

$appShell = @'
// src/app/shell/AppShell.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import TopBar from "@/app/navigation/TopBar";
import MissionControlNav from "@/ui2/nav/MissionControlNav";
import AppPageFrame from "@/app/layout/AppPageFrame";

function getRouteGroup(pathname: string): string {
  if (pathname === "/app" || pathname === "/app/" || pathname.startsWith("/app/dashboard")) return "dashboard";
  if (pathname.startsWith("/app/templates") || pathname.startsWith("/app/tools/catalog")) return "templates";
  if (pathname.startsWith("/app/projects")) return "projects";
  if (pathname.startsWith("/app/survey-import")) return "survey";
  if (pathname.startsWith("/app/tools/competitor")) return "competitor";
  if (pathname.startsWith("/app/tools/proposal")) return "proposal";
  if (pathname.startsWith("/app/tools/room")) return "room";
  if (pathname.startsWith("/app/tools/videowall")) return "videowall";
  if (pathname.startsWith("/app/tools/training")) return "training";
  if (pathname.startsWith("/app/tools/guru")) return "guru";
  return "default";
}

function AppFooter() {
  const nav = useNavigate();

  const linkStyle: React.CSSProperties = {
    color: "rgba(255,255,255,0.82)",
    textDecoration: "none",
    whiteSpace: "nowrap",
    fontSize: 13,
    lineHeight: 1,
  };

  const btnStyle: React.CSSProperties = {
    height: 34,
    padding: "0 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.90)",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
    lineHeight: 1,
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
  };

  return (
    <footer
      style={{
        height: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "0 16px",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(8,10,16,0.92)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 13,
          minWidth: 0,
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ opacity: 0.82, fontWeight: 700 }}>WyreStorm Wingman</span>
        <span style={{ opacity: 0.38 }}>•</span>
        <a href="https://wyrestorm.com" style={linkStyle} target="_blank" rel="noreferrer">wyrestorm.com</a>
        <a href="https://wyrestorm.com/support/" style={linkStyle} target="_blank" rel="noreferrer">Support</a>
        <a href="https://wyrestorm.com/contact/" style={linkStyle} target="_blank" rel="noreferrer">Contact</a>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "nowrap",
          alignItems: "center",
          marginLeft: 12,
        }}
      >
        <button type="button" style={btnStyle} onClick={() => nav("/app/dashboard")}>Dashboard</button>
        <button type="button" style={btnStyle} onClick={() => nav("/app/templates")}>Templates</button>
        <button type="button" style={btnStyle} onClick={() => nav("/app/tools/catalog")}>Catalog</button>
        <button type="button" style={btnStyle} onClick={() => nav("/app/tools/competitor")}>Competitors</button>
        <button type="button" style={btnStyle} onClick={() => nav("/app/tools/guru")}>Guru</button>
      </div>
    </footer>
  );
}

export default function AppShell() {
  const loc = useLocation();

  const routeGroup = useMemo(() => getRouteGroup(loc.pathname), [loc.pathname]);

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("wm_nav_collapsed") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("wm_nav_collapsed", collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

  return (
    <div
      className="wm-shell"
      data-wm-route={routeGroup}
      style={{
        minHeight: "100vh",
        background: "var(--wm-bg)",
        display: "grid",
        gridTemplateRows: "72px 1fr 48px",
        overflow: "hidden",
      }}
    >
      <TopBar collapsed={collapsed} onToggleNav={() => setCollapsed((v) => !v)} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: collapsed ? "78px 1fr" : "230px 1fr",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <aside
          style={{
            minHeight: 0,
            overflow: "hidden",
            borderRight: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(255,255,255,0.015)",
          }}
        >
          <div
            style={{
              height: "100%",
              overflow: "hidden",
            }}
          >
            <MissionControlNav />
          </div>
        </aside>

        <main
          style={{
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "18px 22px 22px",
          }}
        >
          <AppPageFrame>
            <Outlet />
          </AppPageFrame>
        </main>
      </div>

      <AppFooter />
    </div>
  );
}
'@

Write-Text -Path $appShellPath -Text $appShell

$css = Read-Text $cssPath

$cssBlock = @'
/* __WM_APP_WIDE_COLOR_HIERARCHY_V1__ */
.wm-shell{
  --wm-route-rgb: 77,183,255;
}

.wm-shell[data-wm-route="dashboard"]{ --wm-route-rgb: 77,183,255; }
.wm-shell[data-wm-route="templates"]{ --wm-route-rgb: 94,234,212; }
.wm-shell[data-wm-route="projects"]{ --wm-route-rgb: 129,140,248; }
.wm-shell[data-wm-route="survey"]{ --wm-route-rgb: 56,189,248; }
.wm-shell[data-wm-route="competitor"]{ --wm-route-rgb: 244,114,182; }
.wm-shell[data-wm-route="proposal"]{ --wm-route-rgb: 251,191,36; }
.wm-shell[data-wm-route="room"]{ --wm-route-rgb: 34,197,94; }
.wm-shell[data-wm-route="videowall"]{ --wm-route-rgb: 248,113,113; }
.wm-shell[data-wm-route="training"]{ --wm-route-rgb: 125,211,252; }
.wm-shell[data-wm-route="guru"]{ --wm-route-rgb: 168,85,247; }

/* top accent rail for every app page */
.wm-shell .wm-route-frame__inner::before{
  content: "";
  display: block;
  height: 4px;
  width: min(420px, 100%);
  margin: 0 0 14px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(var(--wm-route-rgb),0.96) 0%,
    rgba(var(--wm-route-rgb),0.35) 45%,
    rgba(var(--wm-route-rgb),0.00) 100%
  );
  box-shadow: 0 0 18px rgba(var(--wm-route-rgb),0.14);
}

/* page labels / headings */
.wm-shell .wm-route-frame__inner > .wm-page .wm-page-eyebrow{
  color: rgba(var(--wm-route-rgb),0.88) !important;
}

.wm-shell .wm-route-frame__inner > .wm-page .wm-page-title{
  text-shadow: 0 0 18px rgba(var(--wm-route-rgb),0.04);
}

/* shared cards pick up page accent */
.wm-shell .wm-route-frame__inner > .wm-page .wm-card,
.wm-shell .wm-route-frame__inner > .wm-page .wm-panel{
  border-color: rgba(var(--wm-route-rgb),0.14) !important;
  box-shadow:
    inset 3px 0 0 rgba(var(--wm-route-rgb),0.28),
    0 10px 22px rgba(0,0,0,0.16) !important;
}

/* primary actions become clearly active / important */
.wm-shell .wm-route-frame__inner > .wm-page .wm-btn-primary,
.wm-shell .wm-route-frame__inner > .wm-page button.wm-btn-primary{
  border-color: rgba(var(--wm-route-rgb),0.36) !important;
  background: linear-gradient(
    180deg,
    rgba(var(--wm-route-rgb),0.24) 0%,
    rgba(var(--wm-route-rgb),0.14) 100%
  ) !important;
  color: rgba(255,255,255,0.98) !important;
  box-shadow: 0 10px 20px rgba(var(--wm-route-rgb),0.10) !important;
}

.wm-shell .wm-route-frame__inner > .wm-page .wm-btn-primary:hover,
.wm-shell .wm-route-frame__inner > .wm-page button.wm-btn-primary:hover{
  border-color: rgba(var(--wm-route-rgb),0.44) !important;
  background: linear-gradient(
    180deg,
    rgba(var(--wm-route-rgb),0.30) 0%,
    rgba(var(--wm-route-rgb),0.18) 100%
  ) !important;
}

/* generic active controls */
.wm-shell .wm-route-frame__inner > .wm-page .wm-btn.is-active,
.wm-shell .wm-route-frame__inner > .wm-page button.is-active,
.wm-shell .wm-route-frame__inner > .wm-page [aria-pressed="true"],
.wm-shell .wm-route-frame__inner > .wm-page [aria-current="page"]{
  border-color: rgba(var(--wm-route-rgb),0.32) !important;
  background: rgba(var(--wm-route-rgb),0.14) !important;
  color: rgba(255,255,255,0.98) !important;
  box-shadow: inset 0 0 0 1px rgba(var(--wm-route-rgb),0.08) !important;
}

/* make ordinary buttons react to page context */
.wm-shell .wm-route-frame__inner > .wm-page .wm-btn:hover,
.wm-shell .wm-route-frame__inner > .wm-page button.wm-btn:hover{
  border-color: rgba(var(--wm-route-rgb),0.22) !important;
}

/* inputs / filters become more obvious when focused */
.wm-shell .wm-route-frame__inner > .wm-page input:focus,
.wm-shell .wm-route-frame__inner > .wm-page select:focus,
.wm-shell .wm-route-frame__inner > .wm-page textarea:focus{
  outline: none !important;
  border-color: rgba(var(--wm-route-rgb),0.34) !important;
  box-shadow: 0 0 0 3px rgba(var(--wm-route-rgb),0.12) !important;
}

/* table headers / section labels get better page identity */
.wm-shell .wm-route-frame__inner > .wm-page table thead th{
  color: rgba(var(--wm-route-rgb),0.88) !important;
}

/* nav stays clearly active */
.wm-mc__navitem.is-active{
  border-color: rgba(77,183,255,0.42) !important;
  background: linear-gradient(180deg, rgba(77,183,255,0.24) 0%, rgba(77,183,255,0.12) 100%) !important;
  color: rgba(255,255,255,0.98) !important;
  box-shadow:
    inset 0 0 0 1px rgba(77,183,255,0.10),
    0 8px 18px rgba(77,183,255,0.14) !important;
}
/* __WM_APP_WIDE_COLOR_HIERARCHY_V1_END__ */
'@

$cssNew = Upsert-CssBlock `
  -Css $css `
  -StartMarker "/* __WM_APP_WIDE_COLOR_HIERARCHY_V1__ */" `
  -EndMarker "/* __WM_APP_WIDE_COLOR_HIERARCHY_V1_END__ */" `
  -Block $cssBlock

Write-Text -Path $cssPath -Text $cssNew

Write-Host ""
Write-Host "== App-wide color hierarchy applied ==" -ForegroundColor Cyan
Write-Host "Repo:   $repo"
Write-Host "Backup: $rescue"
Write-Host ""
Write-Host "Updated:"
Write-Host " - $appShellPath"
Write-Host " - $cssPath"
Write-Host ""
Write-Host "What changed:"
Write-Host " - Every app route now carries a page-specific accent color"
Write-Host " - Cards, headings, and primary actions inherit that page accent"
Write-Host " - Active controls are more obvious across pages"
Write-Host " - Shared visual hierarchy now extends beyond Dashboard"
Write-Host ""
Write-Host "Check next:"
Write-Host " - Templates"
Write-Host " - Catalog"
Write-Host " - Competitor Compare"
Write-Host " - Proposal Builder"
Write-Host " - Room Wizard"
Write-Host " - Guru"