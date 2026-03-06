param(
  [switch]$Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location C:\Users\steve\wingman

function Ensure-Dir([string]$Path){
  if(-not (Test-Path -LiteralPath $Path)){
    New-Item -ItemType Directory -Force -Path $Path | Out-Null
  }
}

function Write-Utf8NoBom([string]$Path,[string]$Content){
  $enc = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText($Path,$Content,$enc)
}

function Backup-IfExists([string]$Root,[string]$RelativePath){
  $full = Join-Path $PWD $RelativePath
  if(Test-Path -LiteralPath $full){
    $dest = Join-Path $Root $RelativePath
    Ensure-Dir (Split-Path $dest -Parent)
    Copy-Item -LiteralPath $full -Destination $dest -Force
  }
}

$stamp  = Get-Date -Format "yyyyMMdd_HHmmss"
$rescue = "_RESCUE\UiRefineShellTopbarCards_$stamp"
$audit  = "_AUDITS\UiRefineShellTopbarCards_$stamp"

Ensure-Dir $rescue
Ensure-Dir $audit

Write-Host "`n== Wingman UI Refine: Shell + TopBar + Cards ==" -ForegroundColor Cyan
Write-Host "Mode  :" $(if($Apply){"APPLY"}else{"DRY RUN"})
Write-Host "Rescue:" $rescue
Write-Host "Audit :" $audit

$appShell = @'
import * as React from "react";
import { Outlet } from "react-router-dom";

import TopBar from "@/app/navigation/TopBar";
import MissionControlNav from "@/ui2/nav/MissionControlNav";

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
    <div
      className="wm-shell"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(7,51,79,0.34), transparent 28%), linear-gradient(180deg, #05111d 0%, #071523 56%, #06111b 100%)",
        color: "rgba(255,255,255,0.94)",
        overflowX: "hidden",
      }}
    >
      <TopBar collapsed={collapsed} onToggleNav={() => setCollapsed((v) => !v)} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: collapsed ? "76px minmax(0,1fr)" : "240px minmax(0,1fr)",
          minHeight: "calc(100vh - 74px)",
          transition: "grid-template-columns 180ms ease",
        }}
      >
        <aside
          style={{
            borderRight: "1px solid rgba(255,255,255,0.06)",
            background: "linear-gradient(180deg, rgba(7,17,29,0.96), rgba(6,14,24,0.98))",
            minWidth: 0,
          }}
        >
          <MissionControlNav
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((v) => !v)}
          />
        </aside>

        <main
          style={{
            minWidth: 0,
            padding: "18px 22px 26px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "1560px",
              margin: "0 auto",
            }}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
'@

$topBar = @'
import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";

type Props = {
  collapsed?: boolean;
  onToggleNav?: () => void;
};

function topBtnStyle(active?: boolean): React.CSSProperties {
  return {
    minHeight: 38,
    padding: "0 14px",
    borderRadius: 12,
    border: active
      ? "1px solid rgba(15,154,126,0.34)"
      : "1px solid rgba(255,255,255,0.08)",
    background: active
      ? "rgba(15,154,126,0.14)"
      : "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

export default function TopBar({ onToggleNav }: Props) {
  const nav = useNavigate();
  const loc = useLocation();

  const inApp = loc.pathname.startsWith("/app");
  const canGoBack = window.history.length > 1;

  return (
    <header
      className="wm-topbar"
      style={{
        height: 74,
        display: "grid",
        gridTemplateColumns: "auto minmax(0,1fr) auto",
        gap: 16,
        alignItems: "center",
        padding: "0 18px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background:
          "linear-gradient(90deg, rgba(6,18,31,0.98) 0%, rgba(8,22,38,0.98) 52%, rgba(9,31,40,0.96) 100%)",
        backdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <button
          type="button"
          aria-label="Toggle navigation"
          title="Toggle navigation"
          onClick={onToggleNav}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)",
            color: "rgba(255,255,255,0.92)",
            fontSize: 18,
            fontWeight: 900,
            cursor: "pointer",
            flex: "0 0 auto",
          }}
        >
          ☰
        </button>

        <button
          type="button"
          onClick={() => nav("/app/dashboard")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "transparent",
            border: 0,
            padding: 0,
            cursor: "pointer",
            minWidth: 0,
          }}
          title="Go to dashboard"
        >
          <div
            style={{
              width: 128,
              height: 50,
              borderRadius: 10,
              background: "rgba(255,255,255,0.96)",
              color: "#082133",
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
              fontSize: 15,
              lineHeight: 1.05,
              boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
              padding: "0 10px",
              textAlign: "center",
            }}
          >
            WyreStorm
            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.82 }}>
              Wingman
            </div>
          </div>

          <div style={{ minWidth: 0, textAlign: "left" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: "rgba(255,255,255,0.96)" }}>
              Wingman
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.64)" }}>
              Pre-sales workflow and proposal platform
            </div>
          </div>
        </button>
      </div>

      <div style={{ minWidth: 0 }}>
        {inApp ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button type="button" style={topBtnStyle(loc.pathname.startsWith("/app/dashboard"))} onClick={() => nav("/app/dashboard")}>
              Dashboard
            </button>
            <button type="button" style={topBtnStyle(loc.pathname.startsWith("/app/projects"))} onClick={() => nav("/app/projects")}>
              Projects
            </button>
            <button type="button" style={topBtnStyle(loc.pathname.startsWith("/app/tools"))} onClick={() => nav("/app/tools")}>
              Tools
            </button>
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
        <button type="button" style={topBtnStyle()} onClick={() => nav("/")}>
          Home
        </button>
        <button
          type="button"
          style={topBtnStyle()}
          onClick={() => {
            if (canGoBack) nav(-1);
            else nav("/app/dashboard");
          }}
        >
          Back
        </button>
      </div>
    </header>
  );
}
'@

$themeCss = @'
/* __WM_UI_REFINEMENT_V1__ */

.wm-page {
  width: 100%;
  max-width: none;
  min-width: 0;
}

.wm-card,
.wm-panel,
.wm-surface {
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(9,16,28,0.94), rgba(6,11,20,0.92));
  box-shadow: 0 18px 48px rgba(0,0,0,0.22);
}

.wm-card-pad {
  padding: 18px;
}

.wm-page-title {
  margin: 0;
  font-size: 34px;
  line-height: 1.04;
  letter-spacing: -0.04em;
  font-weight: 900;
  color: rgba(255,255,255,0.98);
}

.wm-page-eyebrow,
.wm-kicker {
  font-size: 12px;
  line-height: 1;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 800;
  color: rgba(120,208,189,0.82);
}

.wm-h1 {
  margin: 0;
  font-size: 34px;
  line-height: 1.04;
  letter-spacing: -0.04em;
  font-weight: 900;
  color: rgba(255,255,255,0.98);
}

.wm-h2 {
  margin: 0;
  font-size: 22px;
  line-height: 1.15;
  letter-spacing: -0.02em;
  font-weight: 800;
  color: rgba(255,255,255,0.96);
}

.wm-p {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  color: rgba(255,255,255,0.72);
}

.wm-btn,
.wm-btn-primary {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.wm-btn {
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.94);
}

.wm-btn-primary {
  border: 1px solid rgba(15,154,126,0.42);
  background: linear-gradient(135deg, rgba(7,98,81,0.96), rgba(12,129,104,0.96));
  color: rgba(255,255,255,0.98);
}

.wm-mc {
  padding: 14px 12px 18px;
  display: grid;
  gap: 14px;
}

.wm-mc__top {
  display: flex;
  justify-content: flex-end;
}

.wm-mc__collapse {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.92);
  cursor: pointer;
  font-weight: 900;
}

.wm-mc__section {
  display: grid;
  gap: 8px;
}

.wm-mc__label {
  padding: 0 8px;
  font-size: 11px;
  line-height: 1;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 800;
  color: rgba(255,255,255,0.44);
}

.wm-mc__item {
  display: flex;
  align-items: center;
  min-height: 42px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid transparent;
  color: rgba(255,255,255,0.84);
  text-decoration: none;
  background: transparent;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}

.wm-mc__item:hover {
  background: rgba(255,255,255,0.04);
  border-color: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.96);
}

.wm-mc__item.is-active {
  background: rgba(15,154,126,0.12);
  border-color: rgba(15,154,126,0.24);
  color: rgba(255,255,255,0.98);
  box-shadow: inset 0 0 0 1px rgba(15,154,126,0.08);
}

.wm-mc__text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 700;
}

.wm-mc.is-collapsed .wm-mc__item {
  justify-content: center;
  padding: 0 8px;
}

.wm-mc.is-collapsed .wm-mc__text {
  font-size: 12px;
}

@media (max-width: 1180px) {
  .wm-page-title,
  .wm-h1 {
    font-size: 28px;
  }
}

@media (max-width: 900px) {
  .wm-topbar {
    grid-template-columns: 1fr;
    height: auto !important;
    padding-top: 12px !important;
    padding-bottom: 12px !important;
  }
}
'@

$targets = @(
  "src\app\shell\AppShell.tsx",
  "src\app\navigation\TopBar.tsx",
  "src\styles\wingman-theme.css"
)

$files = @{
  "src\app\shell\AppShell.tsx"   = $appShell
  "src\app\navigation\TopBar.tsx" = $topBar
  "src\styles\wingman-theme.css" = $themeCss
}

foreach($rel in $targets){
  Backup-IfExists $rescue $rel
}

foreach($rel in $files.Keys){
  if($Apply){
    $full = Join-Path $PWD $rel
    Ensure-Dir (Split-Path $full -Parent)
    Write-Utf8NoBom $full $files[$rel]
    Write-Host "Wrote: $rel" -ForegroundColor Green
  } else {
    Write-Host "Would write: $rel" -ForegroundColor Yellow
  }
}

@"
Shell/topbar/card refinement complete.

Updated:
- src\app\shell\AppShell.tsx
- src\app\navigation\TopBar.tsx
- src\styles\wingman-theme.css

Changes:
- cleaner shell spacing
- simplified top bar with centered app-level navigation
- better sidebar collapse handling
- consistent card styling tokens
- calmer typography and button styling

Next:
- npm run typecheck
- launch app and review /app/dashboard and /app/tools
- after this, next pass should normalize page headers and form layouts
"@ | Out-File (Join-Path $audit "SUMMARY.txt") -Encoding utf8

Write-Host "`nNext:" -ForegroundColor Cyan
Write-Host "npm run typecheck"
Write-Host "git status --short"