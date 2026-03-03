<# 
Wingman UI: Full Hero Redesign + Global UI Polish (Uniformity Enforcer)
- Writes a unified design system CSS (tokens + utilities) to src/styles/wingman-ui.css
- Ensures src/main.tsx imports it after globals.css
- Creates a reusable brand lockup component (LogoLockup)
- Auto-finds the Landing/PublicLanding page by searching for "AV Sales. Simplified." (or Wingman hero markers)
  and replaces it with a polished, uniform hero + sections
- Light-touch patches PageShell (if found) to enforce consistent padding/max-width/background

USAGE:
  Save as: C:\Users\steve\wingman\tools\polish-wingman-ui.ps1
  Run:
    pwsh -NoProfile -ExecutionPolicy Bypass -File tools\polish-wingman-ui.ps1

NOTES:
- This script is safe-ish: it backs up any file it modifies.
- If it can't find a landing page to replace, it will still install the global UI CSS + LogoLockup.
#>

$ErrorActionPreference = "Stop"
$Root = "C:\Users\steve\wingman"
Set-Location $Root

function Stamp { Get-Date -Format "yyyyMMdd_HHmmss" }

function Ensure-Dir([string]$p) {
  if (!(Test-Path $p)) { New-Item -ItemType Directory -Path $p -Force | Out-Null }
}

function Backup-File([string]$path, [string]$backupRoot) {
  if (!(Test-Path $path)) { return }
  $fullRoot = (Resolve-Path $Root).Path
  $fullPath = (Resolve-Path $path).Path
  $rel = $fullPath.Substring($fullRoot.Length).TrimStart("\")
  $dest = Join-Path $backupRoot $rel
  Ensure-Dir (Split-Path $dest -Parent)
  Copy-Item $path $dest -Force
}

function Read-Utf8([string]$path) { Get-Content $path -Raw -Encoding UTF8 }

function Write-Utf8NoBom([string]$path, [string]$content) {
  Ensure-Dir (Split-Path $path -Parent)
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $utf8)
}

function Find-FirstFileByContent([string[]]$patterns, [string[]]$globs) {
  $files = Get-ChildItem "$Root\src" -Recurse -File -Include $globs |
    Where-Object { $_.FullName -notmatch "\\node_modules\\" }
  foreach ($f in $files) {
    $t = Read-Utf8 $f.FullName
    foreach ($p in $patterns) {
      if ($t -match $p) { return $f.FullName }
    }
  }
  return $null
}

$backupRoot = "$Root\tools\_backups\ui_polish_$(Stamp)"
Ensure-Dir $backupRoot

Write-Host "== Wingman UI Polish =="
Write-Host "Backups: $backupRoot"
Write-Host ""

# 1) Write unified design system CSS
$cssPath = "$Root\src\styles\wingman-ui.css"
Backup-File $cssPath $backupRoot

$css = @"
@tailwind base;
@tailwind components;
@tailwind utilities;

/* =========================
   Wingman UI (Uniform v1)
   - tokens + base layout
   - consistent cards/buttons/sections
   ========================= */

:root{
  --wm-bg0: #070a10;
  --wm-bg1: #0a1020;
  --wm-surface: rgba(255,255,255,0.06);
  --wm-surface2: rgba(255,255,255,0.04);
  --wm-border: rgba(255,255,255,0.14);
  --wm-border2: rgba(255,255,255,0.10);

  --wm-text: rgba(255,255,255,0.92);
  --wm-muted: rgba(255,255,255,0.70);
  --wm-dim: rgba(255,255,255,0.56);

  --wm-accent: #00d6d6; /* teal-ish */
  --wm-accent2: #3aa0ff; /* cool blue */
  --wm-danger: #ff3b3b;

  --wm-radius-lg: 18px;
  --wm-radius-md: 14px;
  --wm-shadow: 0 16px 40px rgba(0,0,0,0.35);

  --wm-max: 1180px;
  --wm-pad: 18px;
}

html, body, #root { height: 100%; }
body{
  margin:0;
  color: var(--wm-text);
  background:
    radial-gradient(1200px 600px at 50% -10%, rgba(0,214,214,0.18), transparent 60%),
    radial-gradient(900px 480px at 90% 20%, rgba(58,160,255,0.12), transparent 60%),
    radial-gradient(900px 520px at 10% 30%, rgba(255,59,59,0.08), transparent 60%),
    linear-gradient(180deg, var(--wm-bg0), var(--wm-bg1));
}

/* ---------- App Shell ---------- */
.wm-app{
  min-height: 100%;
  display:flex;
  flex-direction:column;
}

.wm-topbar{
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(10px);
  background: linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.15));
  border-bottom: 1px solid var(--wm-border2);
}

.wm-body{
  flex: 1;
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 0;
}

@media (max-width: 1024px){
  .wm-body{ grid-template-columns: 1fr; }
}

.wm-sidenav{
  border-right: 1px solid var(--wm-border2);
  background: rgba(0,0,0,0.22);
}

.wm-main{
  padding: var(--wm-pad);
}

.wm-container{
  max-width: var(--wm-max);
  margin: 0 auto;
}

/* ---------- Cards / Sections ---------- */
.wm-card{
  border: 1px solid var(--wm-border);
  background: var(--wm-surface);
  border-radius: var(--wm-radius-lg);
  box-shadow: var(--wm-shadow);
}

.wm-card2{
  border: 1px solid var(--wm-border2);
  background: var(--wm-surface2);
  border-radius: var(--wm-radius-md);
}

.wm-section{
  border-radius: var(--wm-radius-lg);
  border: 1px solid var(--wm-border2);
  background: rgba(0,0,0,0.18);
}

.wm-divider{
  height: 1px;
  background: var(--wm-border2);
}

/* ---------- Typography ---------- */
.wm-h1{
  font-size: clamp(36px, 6vw, 64px);
  line-height: 1.02;
  letter-spacing: -0.02em;
  font-weight: 900;
}

.wm-subtitle{
  font-size: clamp(14px, 1.6vw, 18px);
  line-height: 1.4;
  color: var(--wm-muted);
}

.wm-kicker{
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--wm-dim);
}

/* ---------- Buttons ---------- */
.wm-btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap: 10px;
  height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid var(--wm-border);
  background: rgba(255,255,255,0.06);
  color: inherit;
  cursor:pointer;
  font-weight: 800;
  font-size: 12px;
  text-decoration: none;
  user-select:none;
}

.wm-btn:hover{
  background: rgba(255,255,255,0.09);
}

.wm-btn-primary{
  border-color: rgba(0,214,214,0.45);
  background: linear-gradient(180deg, rgba(0,214,214,0.18), rgba(0,214,214,0.08));
}

.wm-btn-primary:hover{
  background: linear-gradient(180deg, rgba(0,214,214,0.22), rgba(0,214,214,0.10));
}

.wm-chip{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--wm-border2);
  background: rgba(255,255,255,0.04);
  font-size: 12px;
  color: var(--wm-muted);
}

/* ---------- Hero ---------- */
.wm-hero{
  position: relative;
  padding: 44px 18px 22px;
  border-radius: 26px;
  border: 1px solid rgba(255,255,255,0.12);
  background:
    radial-gradient(900px 420px at 50% 0%, rgba(0,214,214,0.22), transparent 62%),
    radial-gradient(760px 360px at 80% 20%, rgba(58,160,255,0.14), transparent 62%),
    rgba(0,0,0,0.22);
  overflow:hidden;
}

.wm-hero::after{
  content:"";
  position:absolute;
  inset:-2px;
  background:
    radial-gradient(700px 220px at 50% -40px, rgba(255,255,255,0.06), transparent 65%);
  pointer-events:none;
}

/* ---------- Brand Lockup ---------- */
.wm-brand{
  display:flex;
  align-items:center;
  justify-content:center;
  gap: 14px;
  margin-bottom: 18px;
  position: relative;
  z-index: 1;
}

.wm-brand-logo{
  height: 46px;
  width: auto;
  filter: drop-shadow(0 8px 20px rgba(0,0,0,0.45));
}

.wm-brand-text{
  display:flex;
  flex-direction:column;
  line-height: 1.05;
  text-align:left;
}

.wm-brand-name{
  font-weight: 900;
  letter-spacing: -0.01em;
  font-size: 18px;
}

.wm-brand-tag{
  font-size: 12px;
  color: var(--wm-muted);
}

/* ---------- Feature Grid ---------- */
.wm-grid{
  display:grid;
  gap: 12px;
}

@media (min-width: 900px){
  .wm-grid-3{ grid-template-columns: repeat(3, 1fr); }
}

.wm-tile{
  padding: 14px;
  border-radius: var(--wm-radius-md);
  border: 1px solid var(--wm-border2);
  background: rgba(255,255,255,0.04);
}

.wm-tile-title{
  font-weight: 900;
  font-size: 13px;
}

.wm-tile-sub{
  margin-top: 6px;
  font-size: 12px;
  color: var(--wm-muted);
  line-height: 1.35;
}
"@

Write-Utf8NoBom $cssPath $css
Write-Host "✔ Wrote: src/styles/wingman-ui.css"

# 2) Ensure main.tsx imports wingman-ui.css after globals.css (SAFE: no regex quoting)
$main = "$Root\src\main.tsx"
if (Test-Path $main) {
  $t = Read-Utf8 $main
  if ($t -notmatch "wingman-ui\.css") {
    Backup-File $main $backupRoot

    $needle1 = 'import "./styles/globals.css";'
    $needle2 = "import './styles/globals.css';"

    if ($t.Contains($needle1)) {
      $t2 = $t.Replace($needle1, $needle1 + "`r`n" + 'import "./styles/wingman-ui.css";')
      Write-Utf8NoBom $main $t2
      Write-Host "✔ Patched: src/main.tsx (imports wingman-ui.css)"
    }
    elseif ($t.Contains($needle2)) {
      $t2 = $t.Replace($needle2, $needle2 + "`r`n" + 'import "./styles/wingman-ui.css";')
      Write-Utf8NoBom $main $t2
      Write-Host "✔ Patched: src/main.tsx (imports wingman-ui.css)"
    }
    else {
      # Fallback: insert after last import line
      $lines = $t -split "`r?`n"
      $lastImport = -1
      for ($i = 0; $i -lt $lines.Length; $i++) {
        if ($lines[$i] -match "^\s*import\s+") { $lastImport = $i }
      }

      if ($lastImport -ge 0) {
        $out = New-Object System.Collections.Generic.List[string]
        for ($i = 0; $i -lt $lines.Length; $i++) {
          $out.Add($lines[$i]) | Out-Null
          if ($i -eq $lastImport) { $out.Add('import "./styles/wingman-ui.css";') | Out-Null }
        }
        Write-Utf8NoBom $main ($out -join "`r`n")
        Write-Host "✔ Patched: src/main.tsx (fallback insert wingman-ui.css)"
      } else {
        throw "Could not find an import block in src/main.tsx to patch."
      }
    }
  } else {
    Write-Host "ℹ main.tsx already imports wingman-ui.css"
  }
} else {
  Write-Host "Not found: src/main.tsx (skipped import patch)"
}

# 3) Create LogoLockup component
$brandDir = "$Root\src\components\brand"
Ensure-Dir $brandDir
$logoLockup = "$brandDir\LogoLockup.tsx"
Backup-File $logoLockup $backupRoot

$logoLockupCode = @"
import React from "react";

type Props = {
  /** Path to the WyreStorm logo asset (svg/png). Default is /wyrestorm-logo.svg (change if needed). */
  logoSrc?: string;
  productName?: string;
  tagline?: string;
  className?: string;
};

export default function LogoLockup({
  logoSrc = "/wyrestorm-logo.svg",
  productName = "Wingman",
  tagline = "AV Sales Assistant",
  className = ""
}: Props) {
  return (
    <div className={"wm-brand " + className}>
      <img className="wm-brand-logo" src={logoSrc} alt="WyreStorm" />
      <div className="wm-brand-text">
        <div className="wm-brand-name">{productName}</div>
        <div className="wm-brand-tag">{tagline}</div>
      </div>
    </div>
  );
}
"@

Write-Utf8NoBom $logoLockup $logoLockupCode
Write-Host "✔ Wrote: src/components/brand/LogoLockup.tsx"

# 4) Replace Landing/Public Landing hero (auto-detect)
$landingPath = Find-FirstFileByContent @(
  "AV Sales\.\s*Simplified\.",
  "WyreStorm\s*Wingman",
  "Wingman Sales Assistant",
  "from one intelligent workspace"
) @("*.tsx","*.ts")

if ($landingPath) {
  Backup-File $landingPath $backupRoot
  Write-Host "✔ Found landing page candidate:"
  Write-Host "  $landingPath"

  $landingCode = @"
import React from "react";
import { Link } from "react-router-dom";
import PageShell from "@/components/layout/PageShell";
import LogoLockup from "@/components/brand/LogoLockup";

function FeatureTile(props: { title: string; desc: string }) {
  return (
    <div className="wm-tile">
      <div className="wm-tile-title">{props.title}</div>
      <div className="wm-tile-sub">{props.desc}</div>
    </div>
  );
}

export default function PublicLandingPage() {
  return (
    <PageShell>
      <div className="wm-container" style={{ display: "grid", gap: 14 }}>
        <div className="wm-hero">
          <LogoLockup />

          <div style={{ position: "relative", zIndex: 1, textAlign: "center", display: "grid", gap: 10 }}>
            <div className="wm-kicker">Design • Compare • Propose • Win</div>

            <div className="wm-h1">AV Sales. Simplified.</div>

            <div className="wm-subtitle">
              Design systems, compare competitors, generate proposals and win projects faster — all from one intelligent workspace.
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 6 }}>
              <Link className="wm-btn wm-btn-primary" to="/login">Log in</Link>
              <Link className="wm-btn" to="/signup">Create account</Link>
              <Link className="wm-btn" to="/app/toolhub">Open ToolHub</Link>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
              <span className="wm-chip">Fast product selection</span>
              <span className="wm-chip">Proposal tiers</span>
              <span className="wm-chip">Competitor matching</span>
              <span className="wm-chip">Guided wizards</span>
            </div>
          </div>
        </div>

        <div className="wm-grid wm-grid-3">
          <FeatureTile title="ToolHub" desc="One place to launch every Wingman workflow, from room design to videowalls." />
          <FeatureTile title="Projects" desc="Centralised project context so tools stay consistent and proposals stay accurate." />
          <FeatureTile title="Competitor Compare" desc="Quick matching and position guidance to help you win more bids." />
        </div>

        <div className="wm-section" style={{ padding: 14 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 900, fontSize: 14 }}>Uniform UI, everywhere</div>
            <div style={{ color: "var(--wm-muted)", fontSize: 12, lineHeight: 1.35 }}>
              This UI uses the Wingman design system so every page shares the same spacing, surfaces, borders and typography.
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
"@

  # Replace entire file content (clean, uniform)
  Write-Utf8NoBom $landingPath $landingCode
  Write-Host "✔ Replaced landing content with polished hero + sections"
} else {
  Write-Host "⚠ Could not auto-find a landing page containing the hero text."
  Write-Host "  Global UI CSS + LogoLockup were still installed."
}

# 5) Optional: patch PageShell to enforce container/padding (best-effort)
$pageShellPath = Find-FirstFileByContent @("function\s+PageShell","export\s+default\s+function\s+PageShell") @("PageShell.tsx","*PageShell*.tsx")
if ($pageShellPath) {
  $psTxt = Read-Utf8 $pageShellPath
  if ($psTxt -notmatch "wm-container") {
    Backup-File $pageShellPath $backupRoot

    # Minimal safe patch: wrap children in wm-main + wm-container if a direct {children} render exists
    if ($psTxt -match "\{\s*children\s*\}") {
      $psTxt2 = $psTxt -replace "\{\s*children\s*\}", '<div className="wm-main"><div className="wm-container">{children}</div></div>'
      Write-Utf8NoBom $pageShellPath $psTxt2
      Write-Host "✔ Patched PageShell to enforce wm-main + wm-container"
    } else {
      Write-Host "ℹ PageShell found but did not match simple {children} pattern; left unchanged."
    }
  } else {
    Write-Host "ℹ PageShell already appears to use wm-container; skipped."
  }
} else {
  Write-Host "ℹ PageShell not found via search; skipped."
}

Write-Host ""
Write-Host "DONE."
Write-Host "Next commands:"
Write-Host "  npm run build"
Write-Host "  npm run dev"
Write-Host ""
Write-Host "If the logo image path is wrong, place an SVG at public/wyrestorm-logo.svg or edit LogoLockup.tsx default."
