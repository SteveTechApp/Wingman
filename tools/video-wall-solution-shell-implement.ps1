Set-Location C:\Users\steve\wingman
$ErrorActionPreference = "Stop"

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

function Backup-File {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$BackupRoot
  )
  if (-not (Test-Path $Path)) { return }
  $full = [System.IO.Path]::GetFullPath($Path)
  $root = [System.IO.Path]::GetFullPath((Get-Location).Path)
  $relative = $full.Substring($root.Length).TrimStart('\','/')
  $dest = Join-Path $BackupRoot $relative
  $destDir = Split-Path $dest -Parent
  New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  Copy-Item $Path $dest -Force
}

function Insert-AfterFirstMatch {
  param(
    [Parameter(Mandatory = $true)][string]$Text,
    [Parameter(Mandatory = $true)][string]$Pattern,
    [Parameter(Mandatory = $true)][string]$InsertText
  )
  $m = [regex]::Match($Text, $Pattern, [System.Text.RegularExpressions.RegexOptions]::Multiline)
  if (-not $m.Success) {
    throw "Pattern not found: $Pattern"
  }
  $idx = $m.Index + $m.Length
  return $Text.Substring(0, $idx) + $InsertText + $Text.Substring($idx)
}

$root = (Get-Location).Path
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $root "_RESCUE\video-wall-solution-shell-$stamp"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

$pagePath = Join-Path $root "src\features\misc\VideoWallPlannerPage.tsx"
$shellPath = Join-Path $root "src\features\misc\videoWall\VideoWallSolutionShell.tsx"
$stepPath = Join-Path $root "src\features\misc\videoWall\VideoWallStepSection.tsx"

Backup-File -Path $pagePath -BackupRoot $backupRoot

$shellContent = @'
import React from "react";

export type VideoWallTabKey = "overview" | "bom" | "signal" | "technical";

type TabItem = {
  key: VideoWallTabKey;
  label: string;
};

type Props = {
  title: string;
  subtitle?: string;

  recommendationTitle: string;
  recommendationSummary: string;
  recommendationMeta?: React.ReactNode;
  recommendationWhy?: React.ReactNode;
  recommendationActions?: React.ReactNode;

  controls: React.ReactNode;
  preview: React.ReactNode;

  tabs: TabItem[];
  activeTab: VideoWallTabKey;
  onTabChange: (key: VideoWallTabKey) => void;
  tabContent: React.ReactNode;

  rightRail?: React.ReactNode;
};

const shellCard: React.CSSProperties = {
  border: "1px solid rgba(100,180,255,0.18)",
  background: "linear-gradient(180deg, rgba(7,20,42,0.94) 0%, rgba(5,14,31,0.96) 100%)",
  borderRadius: 16,
  boxShadow: "0 10px 28px rgba(0,0,0,0.28)",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  color: "rgba(167,201,255,0.78)",
  fontWeight: 800,
};

const tabButton = (active: boolean): React.CSSProperties => ({
  borderRadius: 999,
  padding: "10px 14px",
  border: active ? "1px solid rgba(125,197,255,0.52)" : "1px solid rgba(100,180,255,0.18)",
  background: active
    ? "linear-gradient(180deg, rgba(42,102,174,0.36) 0%, rgba(20,53,96,0.48) 100%)"
    : "rgba(10,21,41,0.86)",
  color: active ? "#ffffff" : "rgba(220,234,255,0.82)",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
  minWidth: 116,
});

export default function VideoWallSolutionShell(props: Props) {
  const {
    title,
    subtitle,
    recommendationTitle,
    recommendationSummary,
    recommendationMeta,
    recommendationWhy,
    recommendationActions,
    controls,
    preview,
    tabs,
    activeTab,
    onTabChange,
    tabContent,
    rightRail,
  } = props;

  return (
    <div className="wm-page">
      <div style={{ maxWidth: 1600, margin: "0 auto", width: "100%", display: "grid", gap: 16 }}>
        <section style={{ ...shellCard, padding: 18 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={labelStyle}>Quick video wall builder</div>
            <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#ffffff", lineHeight: 1.05 }}>
                  {title}
                </div>
                {subtitle ? (
                  <div style={{ fontSize: 14, color: "rgba(221,234,255,0.82)", maxWidth: 900, lineHeight: 1.5 }}>
                    {subtitle}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section style={{ ...shellCard, padding: 18 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={labelStyle}>Recommended solution</div>

            <div style={{ display: "grid", gridTemplateColumns: rightRail ? "minmax(0, 1.6fr) minmax(280px, 0.8fr)" : "1fr", gap: 16 }}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#ffffff", lineHeight: 1.08 }}>
                  {recommendationTitle}
                </div>

                <div style={{ fontSize: 15, color: "rgba(226,238,255,0.88)", lineHeight: 1.55 }}>
                  {recommendationSummary}
                </div>

                {recommendationWhy ? (
                  <div
                    style={{
                      border: "1px solid rgba(100,180,255,0.16)",
                      background: "rgba(9,21,42,0.62)",
                      borderRadius: 14,
                      padding: 14,
                    }}
                  >
                    {recommendationWhy}
                  </div>
                ) : null}

                {recommendationActions ? (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {recommendationActions}
                  </div>
                ) : null}
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {recommendationMeta ? (
                  <div
                    style={{
                      border: "1px solid rgba(100,180,255,0.16)",
                      background: "rgba(9,21,42,0.62)",
                      borderRadius: 14,
                      padding: 14,
                    }}
                  >
                    {recommendationMeta}
                  </div>
                ) : null}

                {rightRail ? (
                  <div
                    style={{
                      border: "1px solid rgba(100,180,255,0.16)",
                      background: "rgba(9,21,42,0.62)",
                      borderRadius: 14,
                      padding: 14,
                    }}
                  >
                    {rightRail}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "320px minmax(0, 1fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <aside style={{ ...shellCard, padding: 14, position: "sticky", top: 80 }}>
            {controls}
          </aside>

          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ ...shellCard, padding: 14, minHeight: 560 }}>
              {preview}
            </div>

            <div style={{ ...shellCard, padding: 14, display: "grid", gap: 14 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => onTabChange(tab.key)}
                    style={tabButton(activeTab === tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div
                style={{
                  border: "1px solid rgba(100,180,255,0.16)",
                  background: "rgba(7,18,37,0.72)",
                  borderRadius: 14,
                  padding: 14,
                  minHeight: 260,
                }}
              >
                {tabContent}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
'@

$stepContent = @'
import React from "react";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export default function VideoWallStepSection({
  title,
  subtitle,
  children,
  defaultOpen = true,
}: Props) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <section
      style={{
        border: "1px solid rgba(100,180,255,0.16)",
        background: "rgba(8,18,35,0.7)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "12px 14px",
          background: "rgba(12,27,52,0.88)",
          border: "none",
          color: "#fff",
          cursor: "pointer",
          display: "grid",
          gap: 4,
        }}
      >
        <span style={{ fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: "rgba(167,201,255,0.76)", fontWeight: 800 }}>
          Step
        </span>
        <span style={{ fontSize: 15, fontWeight: 800 }}>{title}</span>
        {subtitle ? (
          <span style={{ fontSize: 12, color: "rgba(220,233,255,0.74)", lineHeight: 1.4 }}>{subtitle}</span>
        ) : null}
      </button>

      {open ? (
        <div style={{ padding: 14, display: "grid", gap: 12 }}>
          {children}
        </div>
      ) : null}
    </section>
  );
}
'@

Save-Utf8NoBom -Path $shellPath -Content $shellContent
Save-Utf8NoBom -Path $stepPath -Content $stepContent

if (-not (Test-Path $pagePath)) {
  throw "Could not find $pagePath"
}

$page = Get-Content $pagePath -Raw

if ($page -notmatch 'VideoWallSolutionShell') {
  $page = Insert-AfterFirstMatch `
    -Text $page `
    -Pattern '(^import .*?;\r?\n)+' `
    -InsertText @'

import VideoWallSolutionShell, { type VideoWallTabKey } from "@/features/misc/videoWall/VideoWallSolutionShell";
import VideoWallStepSection from "@/features/misc/videoWall/VideoWallStepSection";
'@
}

if ($page -notmatch 'const \[activeTab,\s*setActiveTab\]') {
  $page = $page -replace '(function\s+VideoWallPlannerPage\s*\([^)]*\)\s*\{\r?\n)', "`$1  const [activeTab, setActiveTab] = React.useState<VideoWallTabKey>(""overview"");`r`n"
}

if ($page -notmatch 'function RecommendationPill') {
  $page += @'

function RecommendationPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid rgba(100,180,255,0.14)",
        borderRadius: 12,
        padding: "10px 12px",
        background: "rgba(255,255,255,0.02)",
        display: "grid",
        gap: 4,
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          color: "rgba(167,201,255,0.76)",
          fontWeight: 800,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{value}</div>
    </div>
  );
}

function renderWallFormatControls() {
  return <div style={{ color: "rgba(220,233,255,0.74)" }}>Move existing wall format controls here.</div>;
}

function renderContentControls() {
  return <div style={{ color: "rgba(220,233,255,0.74)" }}>Move existing content and source controls here.</div>;
}

function renderPerformanceControls() {
  return <div style={{ color: "rgba(220,233,255,0.74)" }}>Move existing performance controls here.</div>;
}

function renderAdvancedControls() {
  return <div style={{ color: "rgba(220,233,255,0.74)" }}>Move existing advanced controls here.</div>;
}

function renderOverviewTab() {
  return <div style={{ color: "rgba(220,233,255,0.74)" }}>Move overview panels here.</div>;
}

function renderBomTab() {
  return <div style={{ color: "rgba(220,233,255,0.74)" }}>Move BOM content here.</div>;
}

function renderSignalTab() {
  return <div style={{ color: "rgba(220,233,255,0.74)" }}>Move signal path content here.</div>;
}

function renderTechnicalTab() {
  return <div style={{ color: "rgba(220,233,255,0.74)" }}>Move technical detail content here.</div>;
}

function renderPreviewToggles() {
  return (
    <>
      <button type="button">Layout only</button>
      <button type="button">Signal flow</button>
      <button type="button">Labels on</button>
    </>
  );
}

function renderWallPreview() {
  return <div style={{ color: "#fff" }}>Move existing wall preview here.</div>;
}
'@
}

$todoPath = Join-Path $root "src\features\misc\videoWall\VIDEO-WALL-MIGRATION-TODO.md"
$todoContent = @'
# Video Wall Planner Migration TODO

## Imports added
- VideoWallSolutionShell
- VideoWallStepSection

## State added
- activeTab / setActiveTab

## Components created
- src/features/misc/videoWall/VideoWallSolutionShell.tsx
- src/features/misc/videoWall/VideoWallStepSection.tsx

## Next manual step in VideoWallPlannerPage.tsx
Replace the existing large page return with a VideoWallSolutionShell wrapper.

## Suggested mappings
- renderWallFormatControls(): wall type, rows, cols, bezel, display size
- renderContentControls(): source count, multiview, content type
- renderPerformanceControls(): resolution, latency, architecture preference
- renderAdvancedControls(): bandwidth mode, processor/addressed wall detail

- renderOverviewTab(): summary, fit, constraints
- renderBomTab(): starter BOM, quantities, accessories
- renderSignalTab(): routing logic, source/display relationship
- renderTechnicalTab(): engineering detail and assumptions

- renderWallPreview(): existing visual wall preview
'@
Save-Utf8NoBom -Path $todoPath -Content $todoContent
Save-Utf8NoBom -Path $pagePath -Content $page

Write-Host ""
Write-Host "Created:"
Write-Host " - $shellPath"
Write-Host " - $stepPath"
Write-Host " - $todoPath"
Write-Host ""
Write-Host "Backed up:"
Write-Host " - $backupRoot"
Write-Host ""
Write-Host "Updated:"
Write-Host " - $pagePath"
Write-Host ""
Write-Host "Next:"
Write-Host "  1. Open VideoWallPlannerPage.tsx"
Write-Host "  2. Replace the current large return with the new VideoWallSolutionShell wrapper"
Write-Host "  3. Move the existing controls, preview and panels into the placeholder helper functions"
Write-Host "  4. Run: npm run typecheck"