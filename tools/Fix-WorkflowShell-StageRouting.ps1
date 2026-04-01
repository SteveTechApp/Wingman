Set-Location C:\Users\steve\wingman
$ErrorActionPreference = "Stop"

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$RelativePath,
    [Parameter(Mandatory = $true)][string]$Content
  )

  $fullPath = Join-Path (Get-Location).Path $RelativePath
  $dir = Split-Path $fullPath -Parent

  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  $rescueRoot = Join-Path (Get-Location).Path "_RESCUE"
  if (-not (Test-Path $rescueRoot)) {
    New-Item -ItemType Directory -Force -Path $rescueRoot | Out-Null
  }

  if (Test-Path $fullPath) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $safeName = $RelativePath -replace '[\\/:*?"<>|]', '_'
    Copy-Item $fullPath (Join-Path $rescueRoot "$safeName.$stamp.bak") -Force
  }

  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($fullPath, $Content, $utf8)
  Write-Host "Written: $fullPath" -ForegroundColor Green
}

$content = @'
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";

type WorkflowStage = {
  id:
    | "discovery"
    | "room-definition"
    | "product-selection"
    | "system-architecture"
    | "bom"
    | "proposal";
  label: string;
  route: string;
  description: string;
};

const STAGES: WorkflowStage[] = [
  {
    id: "discovery",
    label: "Discovery",
    route: WM_ROUTES.discovery,
    description: "Capture project goals, sources, displays, and constraints.",
  },
  {
    id: "room-definition",
    label: "Room Definition",
    route: WM_ROUTES.roomWizard,
    description: "Define the space, display arrangement, and physical layout.",
  },
  {
    id: "product-selection",
    label: "Product Selection",
    route: WM_ROUTES.catalog,
    description: "Review the recommended product path and compare options.",
  },
  {
    id: "system-architecture",
    label: "System Architecture",
    route: WM_ROUTES.dashboard,
    description: "Validate the signal flow, topology, and overall architecture.",
  },
  {
    id: "bom",
    label: "Bill of Materials",
    route: WM_ROUTES.proposal,
    description: "Review the commercial equipment breakdown and quantities.",
  },
  {
    id: "proposal",
    label: "Proposal Output",
    route: WM_ROUTES.proposal,
    description: "Prepare the client-facing proposal and export content.",
  },
];

function getActiveStageIndex(pathname: string): number {
  const matchIndex = STAGES.findIndex((stage) => pathname.startsWith(stage.route));
  if (matchIndex >= 0) return matchIndex;

  if (pathname.startsWith(WM_ROUTES.roomWizard)) return 1;
  if (pathname.startsWith(WM_ROUTES.catalog) || pathname.startsWith(WM_ROUTES.catalogue)) return 2;
  if (pathname.startsWith(WM_ROUTES.dashboard)) return 3;
  if (pathname.startsWith(WM_ROUTES.proposal) || pathname.startsWith(WM_ROUTES.proposals)) return 4;

  return 0;
}

export default function WingmanWorkflowShell() {
  const navigate = useNavigate();
  const location = useLocation();

  const activeStageIndex = useMemo(
    () => getActiveStageIndex(location.pathname),
    [location.pathname],
  );

  return (
    <section className="wmx-workflow-shell">
      <header className="wmx-workflow-shell__header">
        <div>
          <div className="wmx-workflow-shell__eyebrow">Guided Workflow</div>
          <h2 className="wmx-workflow-shell__title">Project Progression</h2>
        </div>
        <div className="wmx-workflow-shell__summary">
          Step {activeStageIndex + 1} of {STAGES.length}
        </div>
      </header>

      <div className="wmx-workflow-shell__rail">
        {STAGES.map((stage, index) => {
          const isActive = index === activeStageIndex;
          const isComplete = index < activeStageIndex;

          return (
            <button
              key={stage.id}
              type="button"
              className={[
                "wmx-workflow-shell__stage",
                isActive ? "is-active" : "",
                isComplete ? "is-complete" : "",
              ].join(" ").trim()}
              onClick={() => navigate(stage.route)}
            >
              <span className="wmx-workflow-shell__stage-index">
                {index + 1}
              </span>

              <span className="wmx-workflow-shell__stage-copy">
                <strong>{stage.label}</strong>
                <small>{stage.description}</small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
'@

Save-Utf8NoBom -RelativePath "src\features\wingmanUx\WingmanWorkflowShell.tsx" -Content $content

npm run typecheck