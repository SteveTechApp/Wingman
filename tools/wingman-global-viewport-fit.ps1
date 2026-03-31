$ErrorActionPreference = "Stop"
Set-Location "C:\Users\steve\wingman"

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )
  $dir = Split-Path $Path -Parent
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Backup-IfExists {
  param([string]$Path)
  if (Test-Path $Path) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    Copy-Item $Path "$Path.bak.$stamp" -Force
  }
}

$cssPath      = "C:\Users\steve\wingman\src\styles\wingman-viewport-fit.css"
$mainPath     = "C:\Users\steve\wingman\src\main.tsx"
$appShellPath = "C:\Users\steve\wingman\src\app\shell\AppShell.tsx"

Backup-IfExists $cssPath
Backup-IfExists $mainPath
Backup-IfExists $appShellPath

# -------------------------------------------------------------------
# 1) Global CSS system
# -------------------------------------------------------------------
$css = @'
:root {
  --wm-bg-0: #071224;
  --wm-bg-1: #0b1730;
  --wm-bg-2: #10203f;
  --wm-surface: rgba(15, 23, 42, 0.72);
  --wm-surface-2: rgba(15, 23, 42, 0.56);
  --wm-surface-soft: rgba(255, 255, 255, 0.06);
  --wm-surface-light: rgba(255, 255, 255, 0.08);
  --wm-border: rgba(148, 163, 184, 0.18);
  --wm-border-strong: rgba(148, 163, 184, 0.24);
  --wm-text: #e5edf7;
  --wm-text-soft: #a8bbd5;
  --wm-text-muted: #89a0bf;
  --wm-accent: #38bdf8;
  --wm-accent-2: #2563eb;
  --wm-shadow: 0 20px 60px rgba(2, 8, 23, 0.34);
  --wm-radius-xl: 24px;
  --wm-radius-lg: 18px;
  --wm-radius-md: 14px;
  --wm-page-pad: clamp(10px, 1.35vw, 18px);
  --wm-gap-xl: clamp(12px, 1.2vw, 18px);
  --wm-gap-lg: clamp(10px, 1vw, 14px);
  --wm-gap-md: clamp(8px, 0.8vw, 12px);
  --wm-gap-sm: 8px;
  --wm-topbar-h: 76px;
  --wm-nav-w: clamp(240px, 17vw, 292px);
  --wm-panel-pad: clamp(12px, 1vw, 18px);
  --wm-font-title: clamp(1.35rem, 1.8vw, 2.1rem);
  --wm-font-h2: clamp(1.05rem, 1.15vw, 1.2rem);
  --wm-font-body: clamp(0.9rem, 0.95vw, 1rem);
  --wm-font-small: clamp(0.76rem, 0.82vw, 0.88rem);
}

html, body, #root {
  width: 100%;
  height: 100%;
  min-height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(56, 189, 248, 0.12), transparent 24%),
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.12), transparent 24%),
    linear-gradient(180deg, var(--wm-bg-0) 0%, var(--wm-bg-1) 52%, var(--wm-bg-2) 100%);
  color: var(--wm-text);
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body,
button,
input,
select,
textarea {
  font-family: Inter, "Segoe UI", Arial, sans-serif;
}

a {
  color: inherit;
}

#root {
  isolation: isolate;
}

.wm-shell-root,
[data-shell="wingman"] {
  width: 100%;
  height: 100vh;
  max-height: 100vh;
  min-height: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(56, 189, 248, 0.10), transparent 24%),
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.10), transparent 22%),
    linear-gradient(180deg, var(--wm-bg-0) 0%, var(--wm-bg-1) 52%, var(--wm-bg-2) 100%) !important;
  color: var(--wm-text);
}

.wm-shell-content {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  width: 100%;
}

/* top bar */
.wm-topbar,
[class*="TopBar"],
header[class*="top"],
header[class*="Top"] {
  flex: 0 0 auto;
  min-height: var(--wm-topbar-h);
  height: var(--wm-topbar-h);
  overflow: hidden;
  background: linear-gradient(180deg, rgba(8, 21, 47, 0.94), rgba(8, 21, 47, 0.76)) !important;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14) !important;
  backdrop-filter: blur(14px);
}

/* nav */
.wm-shell-content > nav,
.wm-shell-content > aside:first-child,
.wm-nav,
[class*="MissionControlNav"],
[class*="mission-control"],
[class*="wm-nav"] {
  flex: 0 0 var(--wm-nav-w);
  width: var(--wm-nav-w);
  min-width: var(--wm-nav-w);
  max-width: var(--wm-nav-w);
  min-height: 0;
  overflow: auto;
  background: linear-gradient(180deg, rgba(7, 18, 36, 0.92), rgba(10, 23, 46, 0.82)) !important;
  border-right: 1px solid rgba(148, 163, 184, 0.12) !important;
}

/* main workspace */
.wm-shell-content > main,
.wm-shell-content > div:last-child,
.wm-app-main,
.wm-page-host {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: var(--wm-page-pad);
  background: transparent !important;
}

/* common page containers */
.wm-page,
[class*="Page"],
[class*="HubPage"],
[class*="PlannerPage"] {
  min-width: 0;
  min-height: 0;
}

/* generic surface language */
.wm-panel,
.wm-card,
.wm-section,
.wm-surface,
.wm-module,
.wm-tile,
.wm-block,
.wm-glass,
[class*="panel"],
[class*="Panel"],
[class*="card"],
[class*="Card"],
[class*="tile"],
[class*="Tile"],
[class*="section"],
[class*="Section"] {
  border-radius: var(--wm-radius-lg);
  border: 1px solid var(--wm-border);
  background: linear-gradient(180deg, var(--wm-surface), rgba(15, 23, 42, 0.58)) !important;
  color: var(--wm-text);
  box-shadow: var(--wm-shadow);
  backdrop-filter: blur(12px);
}

/* eliminate giant white slabs */
div[style*="background: rgb(255, 255, 255)"],
div[style*="background:#fff"],
div[style*="background: #fff"],
div[style*="background:white"],
div[style*="background: white"],
section[style*="background: rgb(255, 255, 255)"],
section[style*="background:#fff"],
section[style*="background: #fff"],
section[style*="background:white"],
section[style*="background: white"] {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.74), rgba(15, 23, 42, 0.60)) !important;
  color: var(--wm-text) !important;
  border: 1px solid var(--wm-border) !important;
  box-shadow: var(--wm-shadow) !important;
}

/* tables / grids / forms */
table {
  width: 100%;
  border-collapse: collapse;
  background: transparent;
  color: var(--wm-text);
}

th, td {
  border-color: rgba(148, 163, 184, 0.12);
}

input,
select,
textarea {
  width: 100%;
  min-height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(2, 6, 23, 0.42) !important;
  color: var(--wm-text) !important;
  padding: 10px 12px;
}

input::placeholder,
textarea::placeholder {
  color: var(--wm-text-muted);
}

button,
.wm-btn,
a.wm-btn {
  border-radius: 12px;
}

/* generic action buttons */
button:not(.unstyled),
.wm-btn,
a.wm-btn,
[class*="btn"],
[class*="Button"] {
  border: 1px solid rgba(148, 163, 184, 0.16);
}

button[class*="primary"],
.wm-btn--primary,
a.wm-btn--primary {
  background: linear-gradient(135deg, var(--wm-accent-2), var(--wm-accent)) !important;
  color: white !important;
  box-shadow: 0 12px 28px rgba(37, 99, 235, 0.28);
}

button[class*="secondary"],
.wm-btn--secondary,
a.wm-btn--secondary {
  background: rgba(255, 255, 255, 0.06) !important;
  color: var(--wm-text) !important;
}

/* typography */
h1, h2, h3, h4, h5, h6 {
  color: var(--wm-text);
  line-height: 1.08;
  letter-spacing: -0.03em;
  margin-top: 0;
}

p, span, label, small, li, td, th {
  color: inherit;
}

h1 {
  font-size: var(--wm-font-title);
}

h2, h3 {
  font-size: var(--wm-font-h2);
}

p, li, button, input, select, textarea {
  font-size: var(--wm-font-body);
}

small {
  font-size: var(--wm-font-small);
}

/* viewport-fit behaviour */
[data-shell="wingman"] .wm-page,
[data-shell="wingman"] [class*="Page"] {
  min-height: 0;
}

[data-shell="wingman"] .wm-page > *,
[data-shell="wingman"] [class*="Page"] > * {
  min-width: 0;
}

/* auth/public pages should not use giant light cards */
.wm-login,
.wm-signup,
.wm-landing,
[class*="LoginPage"],
[class*="SignupPage"],
[class*="PublicLandingPage"] {
  background:
    radial-gradient(circle at top left, rgba(56, 189, 248, 0.12), transparent 24%),
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.12), transparent 22%),
    linear-gradient(180deg, var(--wm-bg-0) 0%, var(--wm-bg-1) 52%, var(--wm-bg-2) 100%) !important;
  color: var(--wm-text);
}

/* tighter laptop mode */
@media (max-height: 860px) {
  :root {
    --wm-topbar-h: 70px;
    --wm-page-pad: 12px;
    --wm-gap-xl: 12px;
    --wm-gap-lg: 10px;
    --wm-gap-md: 8px;
    --wm-panel-pad: 12px;
    --wm-font-title: clamp(1.2rem, 1.55vw, 1.7rem);
    --wm-font-h2: clamp(0.98rem, 1.02vw, 1.1rem);
    --wm-font-body: 0.88rem;
    --wm-font-small: 0.76rem;
  }
}

/* narrow width fallback */
@media (max-width: 1080px) {
  html, body, #root {
    overflow: auto;
  }

  .wm-shell-root,
  [data-shell="wingman"] {
    height: auto;
    max-height: none;
    min-height: 100vh;
    overflow: visible;
  }

  .wm-shell-content {
    flex-direction: column;
    overflow: visible;
  }

  .wm-shell-content > nav,
  .wm-shell-content > aside:first-child,
  .wm-nav,
  [class*="MissionControlNav"],
  [class*="mission-control"],
  [class*="wm-nav"] {
    width: 100%;
    min-width: 100%;
    max-width: 100%;
    flex-basis: auto;
    max-height: none;
    border-right: none !important;
    border-bottom: 1px solid rgba(148, 163, 184, 0.12) !important;
  }

  .wm-shell-content > main,
  .wm-shell-content > div:last-child,
  .wm-app-main,
  .wm-page-host {
    overflow: visible;
  }
}
'@

Save-Utf8NoBom -Path $cssPath -Content $css
Write-Host "Created wingman-viewport-fit.css"

# -------------------------------------------------------------------
# 2) Import CSS once in main.tsx
# -------------------------------------------------------------------
if (Test-Path $mainPath) {
  $main = Get-Content $mainPath -Raw

  if ($main -notmatch 'wingman-viewport-fit\.css') {
    if ($main -match 'import\s+["''][^"'']+\.css["''];') {
      $main = [regex]::Replace(
        $main,
        '(import\s+["''][^"'']+\.css["''];\s*)',
        '$1' + 'import "@/styles/wingman-viewport-fit.css";' + [Environment]::NewLine,
        1
      )
    }
    else {
      $main = 'import "@/styles/wingman-viewport-fit.css";' + [Environment]::NewLine + $main
    }

    Save-Utf8NoBom -Path $mainPath -Content $main
    Write-Host "Updated main.tsx import"
  }
  else {
    Write-Host "main.tsx already imports viewport-fit CSS"
  }
}
else {
  Write-Warning "main.tsx not found"
}

# -------------------------------------------------------------------
# 3) Replace AppShell with safe viewport-fit version
# -------------------------------------------------------------------
$appShell = @'
import { Outlet, useLocation } from "react-router-dom";
import TopBar from "@/app/navigation/TopBar";
import MissionControlNav from "@/ui2/nav/MissionControlNav";

export default function AppShell() {
  const location = useLocation();
  const isDashboardRoute = location.pathname === "/app/dashboard";

  return (
    <div
      className="wm-shell-root"
      data-shell="wingman"
      data-route={location.pathname}
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100vh",
        maxHeight: "100vh",
        minHeight: 0,
        overflow: "hidden",
        background: "transparent",
        color: "white",
      }}
    >
      <TopBar />

      <div
        className="wm-shell-content"
        style={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          overflow: "hidden",
          display: "flex",
          width: "100%",
        }}
      >
        <MissionControlNav />

        <main
          className="wm-app-main"
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            overflowY: isDashboardRoute ? "auto" : "auto",
            overflowX: "hidden",
            width: "100%",
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
'@

Save-Utf8NoBom -Path $appShellPath -Content $appShell
Write-Host "Replaced AppShell.tsx"

Write-Host ""
Write-Host "Done."
Write-Host "Run:"
Write-Host "  npm run typecheck"
Write-Host "  npm run dev"
Write-Host ""
Write-Host "If a specific page still shows hard-coded white blocks, send that page file and I will give you an exact replacement."