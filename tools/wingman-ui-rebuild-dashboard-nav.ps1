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
$rescue = "_RESCUE\DashboardNavRebuild_$stamp"
$audit  = "_AUDITS\DashboardNavRebuild_$stamp"

Ensure-Dir $rescue
Ensure-Dir $audit

Write-Host "`n== Wingman Dashboard + Navigation Rebuild ==" -ForegroundColor Cyan
Write-Host "Mode  :" $(if($Apply){"APPLY"}else{"DRY RUN"})
Write-Host "Rescue:" $rescue
Write-Host "Audit :" $audit

$dashboardPage = @'
import * as React from "react";
import { useNavigate } from "react-router-dom";

type ProgressStep = {
  key: string;
  title: string;
  desc: string;
  done?: boolean;
  active?: boolean;
};

type RecentProject = {
  id: string;
  name: string;
  customer: string;
  updated: string;
  stage: string;
};

function shellCard(): React.CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    background: "linear-gradient(180deg, rgba(9,16,28,0.94), rgba(6,11,20,0.92))",
    boxShadow: "0 18px 48px rgba(0,0,0,0.22)",
    overflow: "hidden",
  };
}

function sectionPad(): React.CSSProperties {
  return {
    padding: 18,
  };
}

function sectionTitleStyle(): React.CSSProperties {
  return {
    fontSize: 18,
    fontWeight: 800,
    color: "rgba(255,255,255,0.96)",
    letterSpacing: "-0.02em",
  };
}

function sectionTextStyle(): React.CSSProperties {
  return {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 1.5,
    color: "rgba(255,255,255,0.72)",
  };
}

function buttonStyle(primary?: boolean): React.CSSProperties {
  return {
    borderRadius: 12,
    border: primary
      ? "1px solid rgba(15,154,126,0.44)"
      : "1px solid rgba(255,255,255,0.10)",
    background: primary
      ? "linear-gradient(135deg, rgba(7,98,81,0.96), rgba(12,129,104,0.96))"
      : "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.96)",
    padding: "10px 14px",
    minHeight: 40,
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

function pillStyle(emphasis?: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    padding: "7px 12px",
    background: emphasis ? "rgba(15,154,126,0.14)" : "rgba(255,255,255,0.05)",
    border: emphasis
      ? "1px solid rgba(15,154,126,0.28)"
      : "1px solid rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.88)",
    fontSize: 12,
    fontWeight: 700,
  };
}

function ProgressRail({ steps }: { steps: ProgressStep[] }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {steps.map((step, index) => (
        <div
          key={step.key}
          style={{
            display: "grid",
            gridTemplateColumns: "24px minmax(0,1fr) auto",
            gap: 12,
            alignItems: "center",
            padding: "12px 14px",
            borderRadius: 14,
            border: step.active
              ? "1px solid rgba(15,154,126,0.24)"
              : "1px solid rgba(255,255,255,0.08)",
            background: step.active
              ? "linear-gradient(90deg, rgba(9,44,39,0.92), rgba(7,18,30,0.92))"
              : "rgba(255,255,255,0.03)",
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              marginLeft: 4,
              background: step.done
                ? "rgba(54,211,153,0.95)"
                : step.active
                ? "rgba(15,154,126,0.95)"
                : "rgba(255,255,255,0.20)",
              boxShadow: step.active ? "0 0 0 4px rgba(15,154,126,0.14)" : "none",
            }}
          />

          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "rgba(255,255,255,0.94)" }}>
              {index + 1}. {step.title}
            </div>
            <div style={{ marginTop: 3, fontSize: 13, color: "rgba(255,255,255,0.68)" }}>
              {step.desc}
            </div>
          </div>

          <div style={{ ...pillStyle(step.active), minWidth: 96, justifyContent: "center" }}>
            {step.done ? "Done" : step.active ? "Current" : "Pending"}
          </div>
        </div>
      ))}
    </div>
  );
}

function ToolCard({
  title,
  desc,
  action,
  onClick,
}: {
  title: string;
  desc: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        padding: 16,
        display: "grid",
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "rgba(255,255,255,0.94)" }}>
          {title}
        </div>
        <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.68)" }}>
          {desc}
        </div>
      </div>

      <div>
        <button type="button" style={buttonStyle()} onClick={onClick}>
          {action}
        </button>
      </div>
    </div>
  );
}

function RecentProjectRow({
  project,
  onOpen,
}: {
  project: RecentProject;
  onOpen: () => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr) auto auto",
        gap: 12,
        alignItems: "center",
        padding: "12px 14px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "rgba(255,255,255,0.94)" }}>
          {project.name}
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.64)" }}>
          {project.customer}
        </div>
      </div>

      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.74)" }}>
        {project.stage}
      </div>

      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.58)", whiteSpace: "nowrap" }}>
        {project.updated}
      </div>

      <button type="button" style={buttonStyle()} onClick={onOpen}>
        Open
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const nav = useNavigate();

  const steps = React.useMemo<ProgressStep[]>(() => [
    {
      key: "discovery",
      title: "Discovery",
      desc: "Capture application, rooms, distances, displays, sources and constraints.",
      active: true,
    },
    {
      key: "design",
      title: "Design",
      desc: "Map the signal path, USB needs, audio handling and control approach.",
    },
    {
      key: "specify",
      title: "Specify",
      desc: "Select WyreStorm products, alternates and accessories.",
    },
    {
      key: "quote",
      title: "Quote",
      desc: "Export the proposal snapshot and prepare customer-facing output.",
    },
  ], []);

  const recentProjects = React.useMemo<RecentProject[]>(() => [
    {
      id: "sample-1",
      name: "Boardroom Refresh",
      customer: "Sample customer",
      updated: "Today",
      stage: "Discovery",
    },
    {
      id: "sample-2",
      name: "Training Suite Upgrade",
      customer: "Sample customer",
      updated: "Yesterday",
      stage: "Specify",
    },
  ], []);

  return (
    <div
      className="wm-page wm-animate-in"
      style={{ width: "100%", maxWidth: "none", margin: 0, minWidth: 0 }}
    >
      <div style={{ display: "grid", gap: 18 }}>
        <section
          style={{
            ...shellCard(),
            background:
              "linear-gradient(135deg, rgba(7,31,49,0.98) 0%, rgba(4,17,31,0.98) 56%, rgba(8,62,54,0.92) 100%)",
          }}
        >
          <div style={{ ...sectionPad(), paddingBottom: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "start",
                flexWrap: "wrap",
              }}
            >
              <div style={{ maxWidth: 920 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "rgba(120,208,189,0.82)",
                  }}
                >
                  Mission Control
                </div>

                <h1
                  style={{
                    margin: "8px 0 0",
                    fontSize: 44,
                    lineHeight: 1.02,
                    letterSpacing: "-0.04em",
                    fontWeight: 900,
                    color: "rgba(255,255,255,0.98)",
                  }}
                >
                  Keep the opportunity moving
                </h1>

                <div
                  style={{
                    marginTop: 12,
                    fontSize: 15,
                    lineHeight: 1.55,
                    color: "rgba(255,255,255,0.74)",
                    maxWidth: 840,
                  }}
                >
                  Start with discovery, move into design and specification, then finish with a clear exportable proposal.
                </div>

                <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span style={pillStyle(true)}>Stage: Discovery</span>
                  <span style={pillStyle()}>Status: Draft</span>
                  <span style={pillStyle()}>Updated: Mar 06, 2026</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button type="button" style={buttonStyle()} onClick={() => nav("/app/projects")}>
                  Projects
                </button>
                <button type="button" style={buttonStyle()} onClick={() => nav("/app/tools")}>
                  Tool Hub
                </button>
                <button
                  type="button"
                  style={buttonStyle(true)}
                  onClick={() => nav("/app/projects/new")}
                >
                  Start New Project
                </button>
              </div>
            </div>
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gap: 18,
            gridTemplateColumns: "minmax(420px, 1.35fr) minmax(320px, 0.95fr)",
            alignItems: "start",
          }}
        >
          <section style={shellCard()}>
            <div style={sectionPad()}>
              <div style={sectionTitleStyle()}>Recommended next action</div>
              <div style={sectionTextStyle()}>
                Begin by capturing the discovery information so every later tool has the right project context.
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gap: 16,
                  gridTemplateColumns: "minmax(260px, 0.95fr) minmax(300px, 1.25fr)",
                  alignItems: "start",
                }}
              >
                <div
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(15,154,126,0.22)",
                    background: "linear-gradient(135deg, rgba(5,47,39,0.98), rgba(6,22,28,0.96))",
                    padding: 18,
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(120,208,189,0.82)" }}>
                    Active project
                  </div>

                  <div style={{ fontSize: 26, fontWeight: 900, color: "rgba(255,255,255,0.98)" }}>
                    No active project
                  </div>

                  <div style={{ fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.74)" }}>
                    Create a project first or jump straight into discovery to capture the first set of requirements.
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      style={buttonStyle(true)}
                      onClick={() => nav("/app/tools/discovery")}
                    >
                      Capture Discovery
                    </button>
                    <button
                      type="button"
                      style={buttonStyle()}
                      onClick={() => nav("/app/projects/new")}
                    >
                      Start Blank Project
                    </button>
                  </div>
                </div>

                <ProgressRail steps={steps} />
              </div>
            </div>
          </section>

          <section style={shellCard()}>
            <div style={sectionPad()}>
              <div style={sectionTitleStyle()}>Recent projects</div>
              <div style={sectionTextStyle()}>
                Re-open a live opportunity or start a new working draft.
              </div>

              <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                {recentProjects.map((project) => (
                  <RecentProjectRow
                    key={project.id}
                    project={project}
                    onOpen={() => nav("/app/projects")}
                  />
                ))}
              </div>

              <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" style={buttonStyle()} onClick={() => nav("/app/projects")}>
                  Open Projects
                </button>
                <button
                  type="button"
                  style={buttonStyle(true)}
                  onClick={() => nav("/app/projects/new")}
                >
                  Start New Project
                </button>
              </div>
            </div>
          </section>
        </div>

        <section style={shellCard()}>
          <div style={sectionPad()}>
            <div style={sectionTitleStyle()}>Workspace tools</div>
            <div style={sectionTextStyle()}>
              Use only the next tool you need. Everything else is available from Tool Hub.
            </div>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gap: 14,
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              }}
            >
              <ToolCard
                title="Discovery"
                desc="Capture rooms, sources, displays, cable distances and constraints."
                action="Open Discovery"
                onClick={() => nav("/app/tools/discovery")}
              />
              <ToolCard
                title="Room Wizard"
                desc="Shape the system design and translate needs into practical AV architecture."
                action="Open Room Wizard"
                onClick={() => nav("/app/tools/room-wizard")}
              />
              <ToolCard
                title="Product Catalog"
                desc="Review WyreStorm products and move into product-level selection."
                action="Open Catalog"
                onClick={() => nav("/app/tools/catalog")}
              />
              <ToolCard
                title="Proposal Builder"
                desc="Convert the design and product decisions into a customer-facing output."
                action="Open Proposal Builder"
                onClick={() => nav("/app/tools/proposal-builder")}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
'@

$missionControlNav = @'
import * as React from "react";
import { NavLink } from "react-router-dom";

type Props = {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

function itemClass(isActive: boolean) {
  return [
    "wm-mc__item",
    isActive ? "is-active" : "",
  ].filter(Boolean).join(" ");
}

function SectionLabel({
  text,
  collapsed,
}: {
  text: string;
  collapsed?: boolean;
}) {
  if (collapsed) return null;
  return <div className="wm-mc__label">{text}</div>;
}

export default function MissionControlNav({ collapsed, onToggleCollapse }: Props) {
  return (
    <div className={["wm-mc", collapsed ? "is-collapsed" : ""].filter(Boolean).join(" ")}>
      <div className="wm-mc__top">
        <button
          type="button"
          className="wm-mc__collapse"
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <div className="wm-mc__section">
        <SectionLabel text="Workspace" collapsed={collapsed} />
        <NavLink to="/app/dashboard" className={({ isActive }) => itemClass(isActive)}>
          <span className="wm-mc__text">{collapsed ? "Dash" : "Dashboard"}</span>
        </NavLink>
        <NavLink to="/app/projects" className={({ isActive }) => itemClass(isActive)}>
          <span className="wm-mc__text">{collapsed ? "Proj" : "Projects"}</span>
        </NavLink>
      </div>

      <div className="wm-mc__section">
        <SectionLabel text="Core Tools" collapsed={collapsed} />
        <NavLink to="/app/tools/discovery" className={({ isActive }) => itemClass(isActive)}>
          <span className="wm-mc__text">{collapsed ? "Disc" : "Discovery"}</span>
        </NavLink>
        <NavLink to="/app/tools/room-wizard" className={({ isActive }) => itemClass(isActive)}>
          <span className="wm-mc__text">{collapsed ? "Design" : "Room Wizard"}</span>
        </NavLink>
        <NavLink to="/app/tools/catalog" className={({ isActive }) => itemClass(isActive)}>
          <span className="wm-mc__text">{collapsed ? "Prod" : "Product Catalog"}</span>
        </NavLink>
        <NavLink to="/app/tools/proposal-builder" className={({ isActive }) => itemClass(isActive)}>
          <span className="wm-mc__text">{collapsed ? "Quote" : "Proposal Builder"}</span>
        </NavLink>
      </div>

      <div className="wm-mc__section">
        <SectionLabel text="More" collapsed={collapsed} />
        <NavLink to="/app/tools" className={({ isActive }) => itemClass(isActive)}>
          <span className="wm-mc__text">{collapsed ? "Hub" : "Tool Hub"}</span>
        </NavLink>
        <NavLink to="/app/tools/import" className={({ isActive }) => itemClass(isActive)}>
          <span className="wm-mc__text">{collapsed ? "Import" : "Import Intake"}</span>
        </NavLink>
        <NavLink to="/app/tools/video-wall" className={({ isActive }) => itemClass(isActive)}>
          <span className="wm-mc__text">{collapsed ? "VW" : "Video Wall"}</span>
        </NavLink>
      </div>
    </div>
  );
}
'@

$files = @{
  "src\features\dashboard\DashboardPage.tsx" = $dashboardPage
  "src\ui2\nav\MissionControlNav.tsx"        = $missionControlNav
}

foreach($rel in $files.Keys){
  Backup-IfExists $rescue $rel
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
Dashboard and navigation rebuild complete.

Updated:
- src\features\dashboard\DashboardPage.tsx
- src\ui2\nav\MissionControlNav.tsx

Changes:
- removed visual clutter
- reduced duplicate actions
- simplified left navigation
- focused dashboard on next action, progress, tools, and recent projects
- removed corrupted copied glyphs from rebuilt files

Next:
- npm run typecheck
- launch app and review /app/dashboard
- if desired, next pass can unify top bar, shell spacing, and card styling
"@ | Out-File (Join-Path $audit "SUMMARY.txt") -Encoding utf8

Write-Host "`nNext:" -ForegroundColor Cyan
Write-Host "npm run typecheck"
Write-Host "git status --short"