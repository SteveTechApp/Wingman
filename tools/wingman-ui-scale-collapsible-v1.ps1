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
    if([string]::IsNullOrWhiteSpace($p) -or $p -eq $d){ throw "Could not locate repo root." }
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
  if(!(Test-Path $dir)){ New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  Copy-Item -Force -Path $Path -Destination $dest
}

function Insert-AfterLastImport {
  param([string]$Text,[string]$LineToInsert)
  if($Text -match [regex]::Escape($LineToInsert)){ return $Text }
  $rx = [regex]::new('^import .+?;\s*$', [System.Text.RegularExpressions.RegexOptions]::Multiline)
  $m = $rx.Matches($Text)
  if($m.Count -gt 0){
    $last = $m[$m.Count-1]
    return $Text.Insert($last.Index + $last.Length, "`r`n$LineToInsert")
  }
  return "$LineToInsert`r`n$Text"
}

function Insert-AfterTopBar {
  param([string]$Text,[string]$Snippet)
  if($Text -match [regex]::Escape($Snippet.Trim())){ return $Text }

  $rx = [regex]::new('(<TopBar\b[^>]*\/>)', [System.Text.RegularExpressions.RegexOptions]::Singleline)
  $m = $rx.Match($Text)
  if($m.Success){
    $rep = $m.Groups[1].Value + "`r`n      " + $Snippet
    return $Text.Remove($m.Index, $m.Length).Insert($m.Index, $rep)
  }

  # Fallback: add before final closing of root wrapper
  $rx2 = [regex]::new('\r?\n\s*</div>\s*\)\s*;\s*\r?\n\s*}\s*$', [System.Text.RegularExpressions.RegexOptions]::Singleline)
  $m2 = $rx2.Match($Text)
  if($m2.Success){
    $idx = $m2.Index
    return $Text.Insert($idx, "`r`n      $Snippet`r`n")
  }

  return $Text
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
$rescue = Join-Path $repo "_RESCUE\UiScaleAndCollapsible_$stamp"
New-Item -ItemType Directory -Force -Path $rescue | Out-Null

# --- Files we will touch/create ---
$cssPath = Join-Path $repo "src\styles\wingman-ui.css"
$dashboardPath = Join-Path $repo "src\features\dashboard\DashboardPage.tsx"
$appShellPath = Join-Path $repo "src\app\shell\AppShell.tsx"

if(!(Test-Path $cssPath)){ throw "Missing: $cssPath" }
if(!(Test-Path $dashboardPath)){ throw "Missing: $dashboardPath" }

if(!(Test-Path $appShellPath)){
  $appShellPath = @(Get-ChildItem -Path (Join-Path $repo "src") -Recurse -File -Filter AppShell.tsx | Select-Object -First 1 -ExpandProperty FullName)
  if(!$appShellPath){ throw "AppShell.tsx not found." }
}

$collapsibleCardPath = Join-Path $repo "src\ui2\components\CollapsibleCard.tsx"
$uiScaleControlPath  = Join-Path $repo "src\ui2\controls\UiScaleControl.tsx"

# --- Create CollapsibleCard ---
$collapsibleCard = @'
import React from "react";

type Props = {
  id: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  defaultCollapsed?: boolean;
  children?: React.ReactNode;
};

function readBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === "1";
  } catch {
    return fallback;
  }
}

function writeBool(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {}
}

export default function CollapsibleCard({
  id,
  title,
  subtitle,
  right,
  defaultCollapsed,
  children,
}: Props) {
  const storageKey = `wm_collapsible_${id}`;
  const [collapsed, setCollapsed] = React.useState<boolean>(() =>
    readBool(storageKey, !!defaultCollapsed)
  );

  React.useEffect(() => {
    writeBool(storageKey, collapsed);
  }, [storageKey, collapsed]);

  return (
    <section className="wm-card wm-animate-in wm-collapsible" style={{ padding: 14 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <button
          type="button"
          className="wm-collapse-toggle"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
          aria-controls={`wm-collapsible-body-${id}`}
          title={collapsed ? "Expand" : "Collapse"}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: "inherit",
            textAlign: "left",
            flex: 1,
            minWidth: 0,
          }}
        >
          <span className={collapsed ? "wm-chevron is-collapsed" : "wm-chevron"} aria-hidden="true">
            ▾
          </span>
          <span style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: "-0.01em" }}>{title}</div>
            {subtitle ? (
              <div style={{ marginTop: 4, fontSize: 12, opacity: 0.86, lineHeight: 1.35 }}>
                {subtitle}
              </div>
            ) : null}
          </span>
        </button>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          {right ? <div>{right}</div> : null}
          <button
            type="button"
            className="wm-btn"
            onClick={() => setCollapsed((v) => !v)}
            style={{ height: 28, padding: "0 10px" }}
            aria-label={collapsed ? "Expand section" : "Collapse section"}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
        </div>
      </div>

      <div id={`wm-collapsible-body-${id}`} style={{ marginTop: 12, display: collapsed ? "none" : "block" }}>
        {children}
      </div>
    </section>
  );
}
'@
Write-Text -Path $collapsibleCardPath -Text $collapsibleCard

# --- Create UiScaleControl ---
$uiScaleControl = @'
import React from "react";

const KEY = "wm_ui_scale";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function readScale(): number {
  try {
    const v = localStorage.getItem(KEY);
    if (!v) return 1;
    const n = Number(v);
    if (!Number.isFinite(n)) return 1;
    return clamp(n, 0.85, 1.25);
  } catch {
    return 1;
  }
}

function writeScale(n: number) {
  try {
    localStorage.setItem(KEY, String(n));
  } catch {}
}

function applyScale(n: number) {
  try {
    document.documentElement.style.setProperty("--wm-ui-scale", String(n));
  } catch {}
}

export default function UiScaleControl() {
  const [scale, setScale] = React.useState<number>(() => readScale());

  React.useEffect(() => {
    applyScale(scale);
    writeScale(scale);
  }, [scale]);

  const dec = () => setScale((s) => clamp(Math.round((s - 0.05) * 100) / 100, 0.85, 1.25));
  const inc = () => setScale((s) => clamp(Math.round((s + 0.05) * 100) / 100, 0.85, 1.25));
  const reset = () => setScale(1);

  return (
    <div className="wm-scale-control" role="group" aria-label="UI scale">
      <button type="button" className="wm-btn" onClick={dec} style={{ height: 28, padding: "0 10px" }} title="Smaller">
        A-
      </button>
      <button type="button" className="wm-btn" onClick={reset} style={{ height: 28, padding: "0 10px" }} title="Reset scale">
        {Math.round(scale * 100)}%
      </button>
      <button type="button" className="wm-btn" onClick={inc} style={{ height: 28, padding: "0 10px" }} title="Bigger">
        A+
      </button>
    </div>
  );
}
'@
Write-Text -Path $uiScaleControlPath -Text $uiScaleControl

# --- Patch AppShell to mount UiScaleControl ---
$appShellText = Read-Text $appShellPath
$appShellNew = $appShellText

$appShellNew = Insert-AfterLastImport -Text $appShellNew -LineToInsert 'import UiScaleControl from "@/ui2/controls/UiScaleControl";'
$appShellNew = Insert-AfterTopBar -Text $appShellNew -Snippet '<UiScaleControl />'

if($appShellNew -ne $appShellText){
  Backup-File -Path $appShellPath -RescueRoot $rescue -RepoRoot $repo
  Write-Text -Path $appShellPath -Text $appShellNew
}

# --- Overwrite DashboardPage to use CollapsibleCard windows ---
$dashboard = @'
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CollapsibleCard from "@/ui2/components/CollapsibleCard";

function ActionChip({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="wm-hover-lift"
      style={{
        width: "100%",
        textAlign: "left",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.16)",
        background: "rgba(255,255,255,0.06)",
        padding: "10px 12px",
        cursor: "pointer",
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 13, color: "rgba(255,255,255,0.94)" }}>{label}</div>
      <div style={{ marginTop: 3, fontSize: 11, opacity: 0.88, lineHeight: 1.3 }}>{hint}</div>
    </button>
  );
}

function StartCard({
  title,
  text,
  cta,
  onClick,
}: {
  title: string;
  text: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div
      className="wm-hover-lift"
      style={{
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.05)",
        padding: 12,
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 14 }}>{title}</div>
      <div style={{ marginTop: 5, fontSize: 12, opacity: 0.84, lineHeight: 1.35 }}>{text}</div>
      <button
        type="button"
        className="wm-btn wm-btn-primary"
        style={{ marginTop: 10, height: 32 }}
        onClick={onClick}
      >
        {cta}
      </button>
    </div>
  );
}

function Metric({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.035)",
        padding: 10,
        minHeight: 58,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div style={{ fontSize: 10, letterSpacing: "0.14em", opacity: 0.74, textTransform: "uppercase" }}>{k}</div>
      <div style={{ marginTop: 5, fontSize: 16, fontWeight: 900, letterSpacing: "-0.01em" }}>{v}</div>
    </div>
  );
}

export default function DashboardPage() {
  const nav = useNavigate();
  const [stacked, setStacked] = useState(false);

  useEffect(() => {
    const onResize = () => setStacked(window.innerWidth < 1180);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="wm-page wm-animate-in" style={{ width: "100%", maxWidth: "none", margin: 0, minWidth: 0 }}>
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <div className="wm-page-eyebrow">WORKSPACE</div>
          <h1 className="wm-page-title" style={{ marginBottom: 8 }}>Dashboard</h1>
          <div style={{ maxWidth: 920, fontSize: 14, opacity: 0.88, lineHeight: 1.4 }}>
            A shorter, sales-first workspace: start with the customer outcome, then move into design, quote, or guidance.
          </div>
        </div>

        <CollapsibleCard
          id="dash_quick_actions"
          title="Quick actions"
          subtitle="Best starting points for sales and pre-sales."
          right={<span className="wm-btn" style={{ height: 28, display: "inline-flex", alignItems: "center", opacity: 0.95 }}>Compact</span>}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
            <ActionChip label="New Opportunity" hint="Capture the customer need" onClick={() => nav("/app/survey-import")} />
            <ActionChip label="Match Competitor" hint="Like-for-like starting point" onClick={() => nav("/app/tools/competitor")} />
            <ActionChip label="Build Room" hint="Start from a known template" onClick={() => nav("/app/templates")} />
            <ActionChip label="Create Quote" hint="Move into proposal / BOM" onClick={() => nav("/app/tools/proposal")} />
            <ActionChip label="Ask Wingman" hint="Get guided product direction" onClick={() => nav("/app/tools/guru")} />
          </div>
        </CollapsibleCard>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <Metric k="Active project" v="None selected" />
          <Metric k="Next action" v="Start a design" />
          <Metric k="Default market" v="UK-first" />
          <Metric k="Mode" v="Install-realistic" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: stacked ? "1fr" : "minmax(0, 1.45fr) minmax(300px, 0.85fr)", gap: 12, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
            <CollapsibleCard
              id="dash_start_here"
              title="Start here"
              subtitle="Three practical ways to begin, without repeating the whole workflow."
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                <StartCard title="Start from brief" text="Use intake first when the customer need is still forming." cta="Open Survey Import" onClick={() => nav("/app/survey-import")} />
                <StartCard title="Start from template" text="Use a proven room pattern when the use case is already clear." cta="Open Templates" onClick={() => nav("/app/templates")} />
                <StartCard title="Start from competitor" text="Use this when the customer is referencing another brand or part code." cta="Open Competitor Compare" onClick={() => nav("/app/tools/competitor")} />
              </div>
            </CollapsibleCard>
          </div>

          <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
            <CollapsibleCard
              id="dash_guru"
              title="Guru"
              subtitle="Use Wingman when you need a guided answer rather than a manual search."
              right={<span className="wm-btn wm-glow" style={{ height: 28, display: "inline-flex", alignItems: "center" }}>Live</span>}
            >
              <div style={{ display: "grid", gap: 10 }}>
                <button type="button" className="wm-btn wm-hover-lift" style={{ height: 34, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => nav("/app/tools/guru")}>
                  Open Guru
                </button>
                <div style={{ fontSize: 12, opacity: 0.84, lineHeight: 1.4 }}>
                  Example: "Small meeting room, 2 displays, 4 sources, 20m - suggest Bronze/Silver/Gold and explain the trade-offs."
                </div>
              </div>
            </CollapsibleCard>

            <CollapsibleCard
              id="dash_reference"
              title="Reference tools"
              subtitle="Keep specialist tools available without making the page long."
              defaultCollapsed={false}
            >
              <div style={{ display: "grid", gap: 8 }}>
                <button type="button" className="wm-btn wm-hover-lift" style={{ height: 34 }} onClick={() => nav("/app/tools/training")}>
                  Open Training Hub
                </button>
                <button type="button" className="wm-btn wm-hover-lift" style={{ height: 34 }} onClick={() => nav("/app/tools/videowall")}>
                  Open Video Wall Planner
                </button>
              </div>
            </CollapsibleCard>
          </div>
        </div>

        <div style={{ height: 2 }} />
      </div>
    </div>
  );
}
'@
Backup-File -Path $dashboardPath -RescueRoot $rescue -RepoRoot $repo
Write-Text -Path $dashboardPath -Text $dashboard

# --- Append CSS for UI scale + collapsible affordances ---
$css = Read-Text $cssPath
$cssStart = "/* __WM_UI_SCALE_AND_COLLAPSIBLE_V1__ */"
$cssEnd   = "/* __WM_UI_SCALE_AND_COLLAPSIBLE_V1_END__ */"
$cssBlock = @'
/* __WM_UI_SCALE_AND_COLLAPSIBLE_V1__ */
:root{
  --wm-ui-scale: 1;
}

/* Dynamic scale (Chromium/Edge) */
.wm-shell{
  zoom: var(--wm-ui-scale, 1);
}

/* Scale control (fixed, non-intrusive) */
.wm-scale-control{
  position: fixed;
  top: 74px;
  right: 14px;
  z-index: 9999;
  display: inline-flex;
  gap: 8px;
  padding: 8px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(0,0,0,0.28);
  backdrop-filter: blur(10px);
}

/* Collapsible chevron */
.wm-chevron{
  width: 18px;
  min-width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.85;
  transform: rotate(0deg);
  transition: transform 160ms ease, opacity 160ms ease;
  margin-top: 2px;
}
.wm-chevron.is-collapsed{
  transform: rotate(-90deg);
  opacity: 0.75;
}
/* __WM_UI_SCALE_AND_COLLAPSIBLE_V1_END__ */
'@

$cssNew = Upsert-CssBlock -Css $css -StartMarker $cssStart -EndMarker $cssEnd -Block $cssBlock
if($cssNew -ne $css){
  Backup-File -Path $cssPath -RescueRoot $rescue -RepoRoot $repo
  Write-Text -Path $cssPath -Text $cssNew
}

Write-Host ""
Write-Host "== UI Scale + Collapsible windows implemented ==" -ForegroundColor Cyan
Write-Host "Backup: $rescue"
Write-Host "Created:"
Write-Host " - $collapsibleCardPath"
Write-Host " - $uiScaleControlPath"
Write-Host "Updated:"
Write-Host " - $appShellPath"
Write-Host " - $dashboardPath"
Write-Host " - $cssPath"
Write-Host ""
Write-Host "Next:"
Write-Host "1. npm run typecheck"
Write-Host "2. npm run dev"
Write-Host "3. Hard refresh (Ctrl+F5)"
Write-Host ""
Write-Host "Use the A-/100%/A+ control (top-right) to scale the UI."
Write-Host "Each dashboard panel can now be collapsed/expanded."