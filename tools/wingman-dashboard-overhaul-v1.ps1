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

function Get-DashboardPath([string]$RepoRoot){
  $candidates = @(
    (Join-Path $RepoRoot "src\features\dashboard\DashboardPage.tsx"),
    (Join-Path $RepoRoot "src\app\pages\DashboardPage.tsx"),
    (Join-Path $RepoRoot "src\pages\DashboardPage.tsx")
  ) | Where-Object { Test-Path $_ }

  if($candidates.Count -gt 0){ return $candidates[0] }

  $found = Get-ChildItem -Path (Join-Path $RepoRoot "src") -Recurse -File -Filter *Dashboard*.tsx |
    Sort-Object FullName |
    Select-Object -First 1 -ExpandProperty FullName

  return $found
}

$repo = Find-RepoRoot -Start $Root
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$rescue = Join-Path $repo "_RESCUE\DashboardOverhaul_$stamp"
New-Item -ItemType Directory -Force -Path $rescue | Out-Null

$dashboardPath = Get-DashboardPath -RepoRoot $repo
if(-not $dashboardPath){
  throw "DashboardPage.tsx not found."
}

$newDashboard = @'
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Card({
  title,
  subtitle,
  children,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="wm-card wm-animate-in" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: "-0.01em" }}>{title}</div>
          {subtitle ? (
            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.72, lineHeight: 1.35 }}>{subtitle}</div>
          ) : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      {children ? <div style={{ marginTop: 14 }}>{children}</div> : null}
    </section>
  );
}

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
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        padding: "12px 14px",
        cursor: "pointer",
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 13 }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 11, opacity: 0.72, lineHeight: 1.35 }}>{hint}</div>
    </button>
  );
}

function LaunchCard({
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
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        padding: 14,
      }}
    >
      <div style={{ fontWeight: 900 }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.72, lineHeight: 1.4 }}>{text}</div>
      <button
        type="button"
        className="wm-btn wm-btn-primary"
        style={{ marginTop: 12, height: 34 }}
        onClick={onClick}
      >
        {cta}
      </button>
    </div>
  );
}

function SlimLink({
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
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        width: "100%",
        textAlign: "left",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.02)",
        padding: "12px 14px",
        cursor: "pointer",
      }}
    >
      <div>
        <div style={{ fontWeight: 900, fontSize: 13 }}>{label}</div>
        <div style={{ marginTop: 3, fontSize: 11, opacity: 0.70 }}>{hint}</div>
      </div>
      <span style={{ opacity: 0.6 }}>→</span>
    </button>
  );
}

function Metric({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.12)",
        padding: 12,
        minHeight: 66,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: "0.14em", opacity: 0.62, textTransform: "uppercase" }}>{k}</div>
      <div style={{ marginTop: 6, fontSize: 18, fontWeight: 950, letterSpacing: "-0.01em" }}>{v}</div>
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
    <div
      className="wm-page wm-animate-in"
      style={{
        width: "100%",
        maxWidth: "none",
        margin: 0,
        minWidth: 0,
      }}
    >
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div className="wm-page-eyebrow">WORKSPACE</div>
          <h1 className="wm-page-title" style={{ marginBottom: 8 }}>
            Dashboard
          </h1>
          <div style={{ maxWidth: 920, fontSize: 14, opacity: 0.78, lineHeight: 1.45 }}>
            A shorter, sales-first workspace: start with the customer outcome, then move into design, quote, or guidance.
          </div>
        </div>

        <Card
          title="Quick actions"
          subtitle="Best starting points for sales and pre-sales."
          right={
            <span className="wm-btn" style={{ height: 30, display: "inline-flex", alignItems: "center", opacity: 0.86 }}>
              Compact
            </span>
          }
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 10,
            }}
          >
            <ActionChip label="New Opportunity" hint="Capture the customer need" onClick={() => nav("/app/survey-import")} />
            <ActionChip label="Match Competitor" hint="Like-for-like starting point" onClick={() => nav("/app/tools/competitor")} />
            <ActionChip label="Build Room" hint="Start from a known template" onClick={() => nav("/app/templates")} />
            <ActionChip label="Create Quote" hint="Move into proposal / BOM" onClick={() => nav("/app/tools/proposal")} />
            <ActionChip label="Ask Wingman" hint="Get guided product direction" onClick={() => nav("/app/tools/guru")} />
          </div>
        </Card>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          <Metric k="Active project" v="None selected" />
          <Metric k="Next action" v="Start a design" />
          <Metric k="Default market" v="UK-first" />
          <Metric k="Mode" v="Install-realistic" />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: stacked ? "1fr" : "minmax(0, 1.5fr) minmax(300px, 0.9fr)",
            gap: 14,
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
            <Card title="Sales launcher" subtitle="Three fast ways to begin without overthinking the workflow.">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                }}
              >
                <LaunchCard
                  title="Start from brief"
                  text="Use intake first when the customer need is still forming."
                  cta="Open Survey Import"
                  onClick={() => nav("/app/survey-import")}
                />
                <LaunchCard
                  title="Start from template"
                  text="Use a proven room pattern when the use case is already clear."
                  cta="Open Templates"
                  onClick={() => nav("/app/templates")}
                />
                <LaunchCard
                  title="Start from competitor"
                  text="Use this when the customer is referencing another brand or part code."
                  cta="Open Competitor Compare"
                  onClick={() => nav("/app/tools/competitor")}
                />
              </div>
            </Card>

            <Card title="Recommended paths" subtitle="Most common next steps from the dashboard.">
              <div style={{ display: "grid", gap: 10 }}>
                <SlimLink
                  label="Room Wizard"
                  hint="Validate design constraints and refine topology"
                  onClick={() => nav("/app/tools/room")}
                />
                <SlimLink
                  label="Proposal Builder"
                  hint="Turn the BOM into a commercial summary"
                  onClick={() => nav("/app/tools/proposal")}
                />
                <SlimLink
                  label="Product Catalog"
                  hint="Browse WyreStorm families and boundaries"
                  onClick={() => nav("/app/tools/catalog")}
                />
                <SlimLink
                  label="Video Wall Planner"
                  hint="Open specialist planning tools when needed"
                  onClick={() => nav("/app/tools/videowall")}
                />
              </div>
            </Card>
          </div>

          <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
            <Card
              title="Guru"
              subtitle="Use Wingman when you need a guided answer rather than a manual search."
              right={
                <span className="wm-btn wm-glow" style={{ height: 30, display: "inline-flex", alignItems: "center" }}>
                  Live
                </span>
              }
            >
              <div style={{ display: "grid", gap: 10 }}>
                <button
                  type="button"
                  className="wm-btn wm-hover-lift"
                  style={{ height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}
                  onClick={() => nav("/app/tools/guru")}
                >
                  Open Guru
                </button>
                <div style={{ fontSize: 12, opacity: 0.70, lineHeight: 1.45 }}>
                  Example: “Small meeting room, 2 displays, 4 sources, 20m — suggest Bronze/Silver/Gold and explain the trade-offs.”
                </div>
              </div>
            </Card>

            <Card title="Reference tools" subtitle="Keep specialist tools available without making the page long.">
              <div style={{ display: "grid", gap: 10 }}>
                <button
                  type="button"
                  className="wm-btn wm-hover-lift"
                  style={{ height: 36 }}
                  onClick={() => nav("/app/tools/training")}
                >
                  Open Training Hub
                </button>
                <button
                  type="button"
                  className="wm-btn wm-hover-lift"
                  style={{ height: 36 }}
                  onClick={() => nav("/app/tools/videowall")}
                >
                  Open Video Wall Planner
                </button>
              </div>
            </Card>
          </div>
        </div>

        <div style={{ height: 4 }} />
      </div>
    </div>
  );
}
'@

$current = Read-Text $dashboardPath
if($current -ne $newDashboard){
  Backup-File -Path $dashboardPath -RescueRoot $rescue -RepoRoot $repo
  Write-Text -Path $dashboardPath -Text $newDashboard
}

Write-Host ""
Write-Host "== Dashboard Overhaul Applied ==" -ForegroundColor Cyan
Write-Host "Repo:      $repo"
Write-Host "Dashboard: $dashboardPath"
Write-Host "Backup:    $rescue"
Write-Host ""
Write-Host "What changed:"
Write-Host " - Replaced the dashboard with a shorter sales-first layout"
Write-Host " - Removed the long Recent activity section"
Write-Host " - Replaced the long-form layout with compact launcher cards"
Write-Host ""
Write-Host "Next:"
Write-Host "1. npm run typecheck"
Write-Host "2. npm run dev"
Write-Host "3. Refresh /app/dashboard"
Write-Host ""
Write-Host "Note: Pinned and Recent in the left sidebar are in MissionControlNav.tsx and need a separate nav patch."