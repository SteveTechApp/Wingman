[CmdletBinding()]
param(
    [switch]$Apply,
    [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

if (-not $Apply) {
    throw "Run with -Apply"
}

function Ensure-Directory {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Force -Path $Path | Out-Null
    }
}

function Save-Utf8NoBom {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Content
    )
    $parent = Split-Path $Path -Parent
    if ($parent) { Ensure-Directory $parent }
    $enc = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($Path, $Content, $enc)
}

function Backup-IfExists {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$BackupRoot,
        [Parameter(Mandatory)][string]$RepoRoot
    )
    if (-not (Test-Path $Path)) { return }
    $resolved = (Resolve-Path $Path).Path
    $rel = $resolved.Substring($RepoRoot.Length).TrimStart("\")
    $dest = Join-Path $BackupRoot $rel
    Ensure-Directory (Split-Path $dest -Parent)
    Copy-Item $resolved $dest -Force
}

$RepoRoot = (Resolve-Path $RepoRoot).Path
Set-Location $RepoRoot

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$rescue = Join-Path $RepoRoot "_RESCUE_MissionControlIntelligence_$stamp"
Ensure-Directory $rescue

$filesToBackup = @(
    "src\features\mission-control\MissionControlPage.tsx",
    "src\design\system\layout.css",
    "src\design\system\components.css"
) | ForEach-Object { Join-Path $RepoRoot $_ }

$filesToBackup | ForEach-Object {
    Backup-IfExists -Path $_ -BackupRoot $rescue -RepoRoot $RepoRoot
}

# ---------------------------------------------------------------------
# Intelligence model
# ---------------------------------------------------------------------

$intelligencePath = Join-Path $RepoRoot "src\workflow\projectIntelligence.ts"

$intelligenceTs = @'
import { getActiveWorkflowProject } from "./workflowStore";
import { buildArchitectureRecommendation } from "./architectureRecommendations";
import { buildSolutionRecommendation } from "./solutionRecommendations";

export type ProjectIntelligence = {
  activeProjectName: string;
  stage: string;
  discoveryScore: number;
  proposalScore: number;
  architecturePrimary: string;
  solutionPlatform: string;
  nextBestAction: string;
  gaps: string[];
  strengths: string[];
};

function hasText(value: unknown): boolean {
  return String(value ?? "").trim().length > 0;
}

export function buildProjectIntelligence() : ProjectIntelligence {
  const active = getActiveWorkflowProject();
  const architecture = buildArchitectureRecommendation(active);
  const solution = buildSolutionRecommendation(active);

  if (!active) {
    return {
      activeProjectName: "No active project",
      stage: "Not set",
      discoveryScore: 0,
      proposalScore: 0,
      architecturePrimary: "Not available",
      solutionPlatform: "Not available",
      nextBestAction: "Create or select an active project in Mission Control.",
      gaps: [
        "No active project selected.",
        "No discovery data available.",
      ],
      strengths: [],
    };
  }

  let discoveryScore = 0;
  const gaps: string[] = [];
  const strengths: string[] = [];

  if (hasText(active.customer)) { discoveryScore += 10 } else { gaps.push("Customer not confirmed.") }
  if (hasText(active.roomType)) { discoveryScore += 10 } else { gaps.push("Application / room type not confirmed.") }
  if ((active.sources ?? 0) > 0) { discoveryScore += 15 } else { gaps.push("Source count missing.") }
  if ((active.displays ?? 0) > 0) { discoveryScore += 15 } else { gaps.push("Display count missing.") }
  if ((active.distanceM ?? 0) > 0) { discoveryScore += 15 } else { gaps.push("Signal distance missing.") }
  if (active.usb) { discoveryScore += 10; strengths.push("USB requirements captured.") }
  if (active.control) { discoveryScore += 10; strengths.push("Control requirements captured.") }
  if (active.audio) { discoveryScore += 10; strengths.push("Audio requirements captured.") }
  if (active.discovery?.recommendedFamilies && active.discovery.recommendedFamilies.length > 0) {
    discoveryScore += 5
    strengths.push("Discovery recommendation families stored.")
  }

  discoveryScore = Math.min(discoveryScore, 100)

  let proposalScore = 0
  proposalScore += discoveryScore >= 60 ? 35 : 10
  proposalScore += architecture.primary ? 25 : 0
  proposalScore += solution.platform && solution.platform !== "No recommendation yet" ? 25 : 0
  proposalScore += active.stage === "proposal" ? 15 : active.stage === "products" ? 8 : 0
  proposalScore = Math.min(proposalScore, 100)

  if (architecture.primary) {
    strengths.push(`Architecture path identified: ${architecture.primary}.`)
  } else {
    gaps.push("Architecture path not yet identified.")
  }

  if (solution.platform && solution.platform !== "No recommendation yet") {
    strengths.push(`Solution path identified: ${solution.platform}.`)
  } else {
    gaps.push("Solution platform not yet identified.")
  }

  let nextBestAction = "Continue project workflow."
  switch (active.stage) {
    case "discovery":
      nextBestAction = discoveryScore < 60
        ? "Complete discovery details and save them to the active project."
        : "Move into architecture selection and confirm transport model."
      break
    case "architecture":
      nextBestAction = "Confirm architecture, then move into product family selection."
      break
    case "products":
      nextBestAction = "Map the solution to starter BOM items and prepare commercial output."
      break
    case "proposal":
      nextBestAction = "Build customer-facing proposal output and final BOM structure."
      break
    case "closed":
      nextBestAction = "Review and reuse this completed project as a future template if suitable."
      break
  }

  return {
    activeProjectName: active.name,
    stage: active.stage,
    discoveryScore,
    proposalScore,
    architecturePrimary: architecture.primary ?? "Not available",
    solutionPlatform: solution.platform,
    nextBestAction,
    gaps,
    strengths,
  };
}
'@

Save-Utf8NoBom -Path $intelligencePath -Content $intelligenceTs

# ---------------------------------------------------------------------
# Intelligence panel
# ---------------------------------------------------------------------

$panelPath = Join-Path $RepoRoot "src\features\mission-control\ProjectIntelligencePanel.tsx"

$panelTsx = @'
import * as React from "react";
import { buildProjectIntelligence } from "@/workflow/projectIntelligence";

export default function ProjectIntelligencePanel() {
  const [tick, setTick] = React.useState(0)

  React.useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 800)
    return () => window.clearInterval(id)
  }, [])

  const intelligence = React.useMemo(() => buildProjectIntelligence(), [tick])

  return (
    <section className="wm-mc-intelligence wm-card">
      <div className="wm-mc-intelligence-head">
        <div>
          <div className="wm-mc-kicker">Project intelligence</div>
          <h2 className="wm-subtitle wm-mc-intelligence-title">{intelligence.activeProjectName}</h2>
          <p className="wm-muted wm-mc-intelligence-copy">{intelligence.nextBestAction}</p>
        </div>
        <div className="wm-mc-stage-pill">{intelligence.stage}</div>
      </div>

      <div className="wm-mc-intelligence-grid">
        <div className="wm-kpi-card">
          <div className="wm-kpi-label">Discovery completeness</div>
          <div className="wm-kpi-value">{intelligence.discoveryScore}%</div>
        </div>
        <div className="wm-kpi-card">
          <div className="wm-kpi-label">Proposal readiness</div>
          <div className="wm-kpi-value">{intelligence.proposalScore}%</div>
        </div>
        <div className="wm-kpi-card">
          <div className="wm-kpi-label">Architecture path</div>
          <div className="wm-mc-summary-value">{intelligence.architecturePrimary}</div>
        </div>
        <div className="wm-kpi-card">
          <div className="wm-kpi-label">Solution path</div>
          <div className="wm-mc-summary-value">{intelligence.solutionPlatform}</div>
        </div>
      </div>

      <div className="wm-mc-intelligence-columns">
        <div className="wm-mc-intelligence-block">
          <div className="wm-kpi-label">Strengths</div>
          <ul className="wm-mc-architecture-list">
            {intelligence.strengths.length > 0 ? (
              intelligence.strengths.map((item) => <li key={item}>{item}</li>)
            ) : (
              <li>No strengths recorded yet.</li>
            )}
          </ul>
        </div>

        <div className="wm-mc-intelligence-block">
          <div className="wm-kpi-label">Gaps to resolve</div>
          <ul className="wm-mc-architecture-list">
            {intelligence.gaps.length > 0 ? (
              intelligence.gaps.map((item) => <li key={item}>{item}</li>)
            ) : (
              <li>No material gaps currently flagged.</li>
            )}
          </ul>
        </div>
      </div>
    </section>
  )
}
'@

Save-Utf8NoBom -Path $panelPath -Content $panelTsx

# ---------------------------------------------------------------------
# Patch MissionControlPage
# ---------------------------------------------------------------------

$missionControlPath = Join-Path $RepoRoot "src\features\mission-control\MissionControlPage.tsx"
$missionRaw = Get-Content $missionControlPath -Raw
$missionPatched = $missionRaw

if ($missionPatched -notmatch 'ProjectIntelligencePanel') {
    $imports = [regex]::Matches($missionPatched, 'import\s+[^;]+;')
    if ($imports.Count -gt 0) {
        $last = $imports[$imports.Count - 1]
        $missionPatched = $missionPatched.Insert(
            $last.Index + $last.Length,
            "`r`nimport ProjectIntelligencePanel from `"./ProjectIntelligencePanel`";"
        )
    }
}

if ($missionPatched -notmatch '<ProjectIntelligencePanel\s*/>') {
    $missionPatched = $missionPatched.Replace(
        '<WorkflowActionBar />',
        '<ProjectIntelligencePanel />' + "`r`n          <WorkflowActionBar />"
    )
}

if ($missionPatched -ne $missionRaw) {
    Save-Utf8NoBom -Path $missionControlPath -Content $missionPatched
}

# ---------------------------------------------------------------------
# CSS
# ---------------------------------------------------------------------

$layoutCssPath = Join-Path $RepoRoot "src\design\system\layout.css"
$componentsCssPath = Join-Path $RepoRoot "src\design\system\components.css"

$layoutRaw = if (Test-Path $layoutCssPath) { Get-Content $layoutCssPath -Raw } else { "" }
$componentsRaw = if (Test-Path $componentsCssPath) { Get-Content $componentsCssPath -Raw } else { "" }

$layoutAdditions = @'

/* ===== Wingman mission control intelligence phase 9 ===== */

.wm-mc-intelligence{
  padding: 18px;
  display:flex;
  flex-direction:column;
  gap: 14px;
}

.wm-mc-intelligence-head{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap: 12px;
}

.wm-mc-intelligence-title{
  margin: 6px 0 0;
}

.wm-mc-intelligence-copy{
  margin: 8px 0 0;
}

.wm-mc-intelligence-grid{
  display:grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.wm-mc-intelligence-columns{
  display:grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.wm-mc-intelligence-block{
  display:flex;
  flex-direction:column;
  gap: 8px;
}

@media (max-width: 1100px){
  .wm-mc-intelligence-grid{
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .wm-mc-intelligence-columns{
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px){
  .wm-mc-intelligence-grid{
    grid-template-columns: 1fr;
  }
}
'@

if ($layoutRaw -notmatch 'Wingman mission control intelligence phase 9') {
    $layoutRaw = $layoutRaw.TrimEnd() + "`r`n`r`n" + $layoutAdditions.Trim() + "`r`n"
    Save-Utf8NoBom -Path $layoutCssPath -Content $layoutRaw
}

$componentAdditions = @'

.wm-mc-stage-pill{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  text-transform: capitalize;
  background: rgba(75,141,255,0.12);
  border: 1px solid rgba(75,141,255,0.20);
  color: #d2ecff;
}
'@

if ($componentsRaw -notmatch '\.wm-mc-stage-pill') {
    $componentsRaw = $componentsRaw.TrimEnd() + "`r`n`r`n" + $componentAdditions.Trim() + "`r`n"
    Save-Utf8NoBom -Path $componentsCssPath -Content $componentsRaw
}

Write-Host ""
Write-Host "Wingman mission control intelligence phase 9 applied." -ForegroundColor Green
Write-Host ("Backup folder: {0}" -f $rescue) -ForegroundColor Yellow
Write-Host ""
Write-Host "Run next:" -ForegroundColor Cyan
Write-Host "  npm run typecheck" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White