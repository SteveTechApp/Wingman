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
  param([string]$Css,[string]$StartMarker,[string]$EndMarker,[string]$Block)
  $has = $Css.Contains($StartMarker) -and $Css.Contains($EndMarker)
  if($has){
    $pattern = [regex]::Escape($StartMarker) + '.*?' + [regex]::Escape($EndMarker)
    return [regex]::Replace($Css, $pattern, $Block, [System.Text.RegularExpressions.RegexOptions]::Singleline)
  }
  return $Css.TrimEnd() + "`r`n`r`n" + $Block + "`r`n"
}

$repo = Find-RepoRoot -Start $Root
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$rescue = Join-Path $repo "_RESCUE\AppWideWorkspaceLayout_$stamp"
New-Item -ItemType Directory -Force -Path $rescue | Out-Null

$topBarPath = Join-Path $repo "src\app\navigation\TopBar.tsx"
$appShellPath = Join-Path $repo "src\app\shell\AppShell.tsx"
$pageFramePath = Join-Path $repo "src\app\layout\AppPageFrame.tsx"
$cssPath = Join-Path $repo "src\styles\wingman-ui.css"

foreach($p in @($topBarPath,$appShellPath,$cssPath)){
  if(!(Test-Path $p)){ throw "Missing: $p" }
  Backup-File -Path $p -RescueRoot $rescue -RepoRoot $repo
}

$pageFrame = @'
import React from "react";

export default function AppPageFrame({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <div className="wm-route-frame">
      <div className="wm-route-frame__inner">
        {children}
      </div>
    </div>
  );
}
'@

$topBar = @'
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import UiScaleControl from "@/ui2/controls/UiScaleControl";

type Props = {
  collapsed?: boolean;
  onToggleNav?: () => void;
};

function Btn({
  children,
  onClick,
  subtle,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  subtle?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={subtle ? "wm-topbar-btn wm-topbar-btn--subtle" : "wm-topbar-btn"}
      style={{
        minHeight: 40,
        padding: "0 12px",
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {children}
    </button>
  );
}

export default function TopBar({ onToggleNav }: Props) {
  const nav = useNavigate();
  const loc = useLocation();

  const isDashboard =
    loc.pathname === "/app" ||
    loc.pathname === "/app/" ||
    loc.pathname.startsWith("/app/dashboard");

  const canGoBack = !isDashboard;

  return (
    <header
      className="wm-topbar wm-topbar--engineering"
      style={{
        minHeight: 72,
        padding: "10px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div
        className="wm-topbar-cluster wm-topbar-cluster--left"
        style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}
      >
        <Btn subtle title="Toggle navigation" onClick={onToggleNav}>
          <span className="wm-topbar-icon" style={{ fontSize: 18, lineHeight: 1 }}>☰</span>
        </Btn>

        <button
          type="button"
          onClick={() => nav("/app/dashboard")}
          title="Go to Dashboard"
          className="wm-topbar-brandlink"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            minHeight: 52,
            padding: "0 4px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <img
            src="/heroLogo.png"
            alt="WyreStorm Wingman"
            className="wm-topbar-brandlogo"
            style={{
              maxHeight: 46,
              width: "auto",
              height: "auto",
              display: "block",
            }}
          />
          <div className="wm-topbar-brandtext" style={{ lineHeight: 1.05 }}>
            <div className="wm-topbar-brandtitle" style={{ fontSize: 18, fontWeight: 800 }}>
              Wingman
            </div>
            <div className="wm-topbar-brandsub" style={{ fontSize: 13, opacity: 0.84 }}>
              Sales &amp; Pre-Sales Toolkit
            </div>
          </div>
        </button>

        {canGoBack ? (
          <div className="wm-topbar-backwrap">
            <Btn subtle title="Back" onClick={() => nav(-1)}>
              <span className="wm-topbar-icon" style={{ fontSize: 16, lineHeight: 1 }}>←</span>
              Back
            </Btn>
          </div>
        ) : null}
      </div>

      <div
        className="wm-topbar-cluster wm-topbar-cluster--right"
        style={{ display: "flex", alignItems: "center", gap: 10 }}
      >
        <UiScaleControl />
      </div>
    </header>
  );
}
'@

$appShell = @'
// src/app/shell/AppShell.tsx
import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import TopBar from "@/app/navigation/TopBar";
import MissionControlNav from "@/ui2/nav/MissionControlNav";
import AppPageFrame from "@/app/layout/AppPageFrame";

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

$css = Read-Text $cssPath
$cssStart = "/* __WM_APP_WIDE_WORKSPACE_LAYOUT_V1__ */"
$cssEnd   = "/* __WM_APP_WIDE_WORKSPACE_LAYOUT_V1_END__ */"
$cssBlock = @'
/* __WM_APP_WIDE_WORKSPACE_LAYOUT_V1__ */
.wm-route-frame{
  width: 100%;
  min-width: 0;
}

.wm-route-frame__inner{
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  min-width: 0;
}

.wm-route-frame__inner > .wm-page{
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
}

.wm-shell main{
  background: transparent;
}

.wm-page{
  min-width: 0;
}

.wm-scale-control{
  position: static !important;
  top: auto !important;
  right: auto !important;
  z-index: auto !important;
  display: inline-flex !important;
  gap: 6px !important;
  padding: 0 !important;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
}

.wm-mc{
  padding-top: 12px !important;
  padding-bottom: 12px !important;
}

.wm-topbar{
  border-bottom: 1px solid rgba(255,255,255,0.06) !important;
}

@media (max-width: 1100px){
  .wm-route-frame__inner{
    max-width: none;
  }
}
/* __WM_APP_WIDE_WORKSPACE_LAYOUT_V1_END__ */
'@

$cssNew = Upsert-CssBlock -Css $css -StartMarker $cssStart -EndMarker $cssEnd -Block $cssBlock

Write-Text -Path $pageFramePath -Text $pageFrame
Write-Text -Path $topBarPath -Text $topBar
Write-Text -Path $appShellPath -Text $appShell
if($cssNew -ne $css){
  Write-Text -Path $cssPath -Text $cssNew
}

Write-Host ""
Write-Host "== App-wide workspace layout applied ==" -ForegroundColor Cyan
Write-Host "Repo:   $repo"
Write-Host "Backup: $rescue"
Write-Host ""
Write-Host "Created:"
Write-Host " - $pageFramePath"
Write-Host "Updated:"
Write-Host " - $topBarPath"
Write-Host " - $appShellPath"
Write-Host " - $cssPath"
Write-Host ""
Write-Host "What changed:"
Write-Host " - Removed redundant topbar shortcuts (use left nav instead)"
Write-Host " - Keeps topbar clean: brand + scale control"
Write-Host " - Applies a shared page frame to all app routes"
Write-Host " - Keeps the workspace area clear for actual page activity"
Write-Host " - Preserves the left menu as the main navigation tool"
Write-Host ""
Write-Host "Next:"
Write-Host "1. npm run typecheck"
Write-Host "2. npm run dev"
Write-Host "3. Check Dashboard, Templates, Competitors, Proposal, Room Wizard, Guru"
