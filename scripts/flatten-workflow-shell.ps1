$ErrorActionPreference = "Stop"

$root = Get-Location

function Backup-File {
  param([string]$Path)
  if (Test-Path $Path) {
    Copy-Item $Path "$Path.bak" -Force
  }
}

function Write-Utf8NoBom {
  param(
    [string]$Path,
    [string]$Content
  )
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

# ------------------------------------------------------------
# Paths
# ------------------------------------------------------------

$appShellPath = Join-Path $root "src/app/shell/AppShell.tsx"
$dashboardPath = Join-Path $root "src/features/dashboard/DashboardPage.tsx"
$discoveryPath = Join-Path $root "src/features/discovery/DiscoveryWizardPage.tsx"
$proposalPath = Join-Path $root "src/features/proposal/ProposalPage.tsx"

# ------------------------------------------------------------
# 1) Replace AppShell with minimal outlet shell
# ------------------------------------------------------------

Backup-File $appShellPath

$appShellContent = @'
import { Outlet } from "react-router-dom";

export default function AppShell() {
  return <Outlet />;
}
'@

Write-Utf8NoBom -Path $appShellPath -Content $appShellContent
Write-Host "Updated: $appShellPath"

# ------------------------------------------------------------
# 2) Replace DashboardPage with shell-only version
# ------------------------------------------------------------

Backup-File $dashboardPath

$dashboardContent = @'
import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/context/ProjectContext";
import { WingmanWorkflowShell } from "@/features/wingmanUx/WingmanWorkflowShell";
import { WM_ROUTES } from "@/core/wingman/routeMap";

function toNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { projectData } = useProjectContext();
  const project = projectData.activeProject;

  const sourceCount = toNumber(
    project?.discovery?.sources ?? project?.discovery?.sourceCount ?? 0,
  );
  const displayCount = toNumber(
    project?.discovery?.displays ?? project?.discovery?.displayCount ?? 0,
  );
  const distanceM = toNumber(
    project?.discovery?.distanceM ?? project?.discovery?.distance ?? project?.distanceM ?? 0,
  );

  const hasProject = Boolean(project);
  const hasDiscovery = hasProject && (sourceCount > 0 || displayCount > 0 || distanceM > 0);
  const isVideoWall = Boolean(project?.discovery?.videoWall);
  const isNetworkReady = Boolean(project?.discovery?.networkReady);
  const hasUsb = Boolean(project?.discovery?.usbRequired);

  const recommendedNextAction = !hasProject
    ? "Create or open a project"
    : !hasDiscovery
      ? "Complete discovery first"
      : isVideoWall
        ? "Open Video Wall planning"
        : "Move into proposal and architecture review";

  const systemType = !hasProject
    ? "No active project"
    : isVideoWall
      ? "Video Wall"
      : isNetworkReady
        ? "Network-capable design"
        : "In qualification";

  const qualificationGaps: string[] = [];
  if (!hasProject) qualificationGaps.push("No active project is selected.");
  if (hasProject && sourceCount <= 0) qualificationGaps.push("Source count is not defined.");
  if (hasProject && displayCount <= 0) qualificationGaps.push("Display count is not defined.");
  if (hasProject && distanceM <= 0) qualificationGaps.push("Distance is not defined.");
  if (hasProject && !project?.discovery?.networkReady && !project?.discovery?.videoWall) {
    qualificationGaps.push("Managed AV network readiness is not confirmed.");
  }

  const deliverables = [
    hasDiscovery ? "Discovery data captured" : "Discovery not yet captured",
    hasProject ? "Project active" : "No active project",
    hasUsb ? "USB/BYOD requirement present" : "No USB requirement captured",
  ];

  const rightRail = (
    <>
      <section className="wmx-right-panel">
        <div className="wmx-right-title">Recommended Action</div>
        <div className="wmx-summary-metric">
          <span>Current next step</span>
          <strong>{recommendedNextAction}</strong>
        </div>
      </section>

      <section className="wmx-right-panel">
        <div className="wmx-right-title">Qualification Gaps</div>
        <div className="wmx-alert-list">
          {qualificationGaps.length > 0 ? (
            qualificationGaps.map((item, index) => (
              <div key={`${item}-${index}`} className="wmx-alert-item">
                <div className="wmx-alert-dot wmx-alert-dot--warn" />
                <div className="wmx-alert-copy">
                  <strong>Needs confirmation</strong>
                  <span>{item}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="wmx-alert-item">
              <div className="wmx-alert-dot wmx-alert-dot--good" />
              <div className="wmx-alert-copy">
                <strong>Qualified</strong>
                <span>Discovery data is sufficient for the next workflow step.</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="wmx-right-panel">
        <div className="wmx-right-title">Current Deliverables</div>
        {deliverables.map((item, index) => (
          <div key={`${item}-${index}`} className="wmx-summary-metric">
            <span>Status</span>
            <strong>{item}</strong>
          </div>
        ))}
      </section>
    </>
  );

  return (
    <WingmanWorkflowShell
      activeStage="discovery"
      projectName={project?.name ?? "No active project"}
      sourceCount={sourceCount}
      displayCount={displayCount}
      distanceM={distanceM}
      systemType={systemType}
      rightRail={rightRail}
    >
      <section className="wmx-section">
        <div className="wmx-section-header">
          <h1>Structured AV workflow for sales and pre-sales</h1>
          <p>
            Move from opportunity discovery to system design and proposal using one
            continuous workflow language across the app.
          </p>
        </div>

        <div className="wmx-panel-action" style={{ justifyContent: "flex-start", padding: 0 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              className="wmx-primary-btn"
              style={{ minWidth: 220 }}
              onClick={() => navigate(WM_ROUTES.discovery)}
            >
              Continue Discovery
            </button>

            <button
              type="button"
              className="wmx-primary-btn"
              style={{
                minWidth: 220,
                background: "linear-gradient(180deg, #1b2434 0%, #121a28 100%)",
                borderColor: "rgba(125, 156, 210, 0.28)",
                boxShadow: "none",
              }}
              onClick={() => navigate(WM_ROUTES.projects)}
            >
              Open Projects
            </button>
          </div>
        </div>
      </section>

      <section className="wmx-section">
        <div className="wmx-card-row">
          <article className="wmx-config-card">
            <div className="wmx-config-title">Active Project</div>
            <div className="wmx-config-copy">
              {project?.name ?? "No active project"}
            </div>
            <div className="wmx-config-stats">
              <span>{project?.customer || "No customer set"}</span>
              <span>{project?.application || "No application set"}</span>
            </div>
          </article>

          <article className="wmx-config-card">
            <div className="wmx-config-title">Workflow</div>
            <div className="wmx-config-copy">
              Discovery → Design → Proposal
            </div>
            <div className="wmx-config-stats">
              <span>{hasDiscovery ? "Discovery ready" : "Discovery pending"}</span>
              <span>{isNetworkReady ? "Network aware" : "Local qualification"}</span>
            </div>
          </article>

          <article className="wmx-config-card">
            <div className="wmx-config-title">Current Focus</div>
            <div className="wmx-config-copy">
              {recommendedNextAction}
            </div>
            <div className="wmx-config-stats">
              <span>{sourceCount} sources</span>
              <span>{displayCount} displays</span>
              <span>{distanceM}m</span>
            </div>
          </article>
        </div>
      </section>

      <section className="wmx-section">
        <div className="wmx-section-header">
          <h2>Opportunity Path</h2>
          <p>Resume the correct workflow stage from one shared mission-control layout</p>
        </div>

        <div className="wmx-card-row">
          <article className="wmx-config-card">
            <div className="wmx-config-title">Step 01</div>
            <div className="wmx-config-subtitle">Discovery</div>
            <div className="wmx-config-copy">
              Capture room type, sources, displays, distance, USB, and network readiness.
            </div>
            <div className="wmx-panel-action" style={{ padding: 0, justifyContent: "flex-start" }}>
              <button
                type="button"
                className="wmx-primary-btn"
                style={{ minWidth: 180 }}
                onClick={() => navigate(WM_ROUTES.discovery)}
              >
                Open Discovery
              </button>
            </div>
          </article>

          <article className="wmx-config-card">
            <div className="wmx-config-title">Step 02</div>
            <div className="wmx-config-subtitle">System Design</div>
            <div className="wmx-config-copy">
              Shape switching method, transport architecture, and design direction.
            </div>
            <div className="wmx-panel-action" style={{ padding: 0, justifyContent: "flex-start" }}>
              <button
                type="button"
                className="wmx-primary-btn"
                style={{ minWidth: 180 }}
                onClick={() =>
                  navigate(isVideoWall ? WM_ROUTES.videoWall : WM_ROUTES.catalog)
                }
              >
                {isVideoWall ? "Open Video Wall" : "Build Design"}
              </button>
            </div>
          </article>

          <article className="wmx-config-card">
            <div className="wmx-config-title">Step 03</div>
            <div className="wmx-config-subtitle">Proposal</div>
            <div className="wmx-config-copy">
              Review architecture, BOM, and customer-facing proposal output.
            </div>
            <div className="wmx-panel-action" style={{ padding: 0, justifyContent: "flex-start" }}>
              <button
                type="button"
                className="wmx-primary-btn"
                style={{ minWidth: 180 }}
                onClick={() => navigate(WM_ROUTES.proposal)}
              >
                Create Proposal
              </button>
            </div>
          </article>
        </div>
      </section>
    </WingmanWorkflowShell>
  );
}
'@

Write-Utf8NoBom -Path $dashboardPath -Content $dashboardContent
Write-Host "Updated: $dashboardPath"

# ------------------------------------------------------------
# 3) Replace DiscoveryWizardPage with shell-only version
# ------------------------------------------------------------

Backup-File $discoveryPath

$discoveryContent = @'
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import { saveActiveProject } from "@/app/logic/wingmanProjectState";
import {
  buildDiscoveryPersistedProject,
  upsertPersistedProject,
} from "@/app/logic/wingmanProjectPersistence";
import { WingmanWorkflowShell } from "@/features/wingmanUx/WingmanWorkflowShell";

type OutcomePath =
  | "Extender / point-to-point"
  | "Splitter / one-to-many"
  | "Matrix / presentation switching"
  | "AV over IP distribution"
  | "Video wall design";

const outcomeOptions: { label: OutcomePath; summary: string; hints: string[] }[] = [
  {
    label: "Extender / point-to-point",
    summary: "Use when a single source needs to reach a single destination over distance.",
    hints: ["Distance-led", "Single route", "Simple transport"],
  },
  {
    label: "Splitter / one-to-many",
    summary: "Use when one source needs to be mirrored to multiple displays.",
    hints: ["Mirrored outputs", "Simple distribution", "Fixed source"],
  },
  {
    label: "Matrix / presentation switching",
    summary: "Use when multiple sources must be switched between one or more displays.",
    hints: ["Multiple sources", "Routing control", "Room switching"],
  },
  {
    label: "AV over IP distribution",
    summary: "Use when the site needs flexible routing over managed network infrastructure.",
    hints: ["Network transport", "Scalable", "Multi-zone"],
  },
  {
    label: "Video wall design",
    summary: "Use when the display canvas and processing strategy are the primary design driver.",
    hints: ["Display canvas", "Processor strategy", "Wall planning"],
  },
];

export default function DiscoveryWizardPage() {
  const navigate = useNavigate();

  const [outcome, setOutcome] = useState<OutcomePath>("Matrix / presentation switching");
  const [displayCount, setDisplayCount] = useState("2");
  const [sourceCount, setSourceCount] = useState("3");
  const [distance, setDistance] = useState("15");
  const [usbNeeds, setUsbNeeds] = useState("No");
  const [networkReady, setNetworkReady] = useState("No");
  const [futureExpansion, setFutureExpansion] = useState("No");
  const [notes, setNotes] = useState("");

  const recommendation = useMemo(() => {
    const displays = Number(displayCount) || 0;
    const sources = Number(sourceCount) || 0;
    const dist = Number(distance) || 0;
    const networkIsReady = networkReady === "Yes";
    const expansionExpected = futureExpansion === "Yes";

    const avoipScore =
      (sources >= 3 ? 2 : 0) +
      (displays >= 3 ? 2 : 0) +
      (outcome === "Video wall design" ? 3 : 0) +
      (dist > 30 ? 1 : 0) +
      (networkIsReady ? 2 : 0) +
      (expansionExpected ? 2 : 0);

    let nextTool = "Catalogue";
    if (outcome === "Video wall design") nextTool = "Video Wall";
    if (outcome === "Matrix / presentation switching") nextTool = "Proposal";
    if (outcome === "AV over IP distribution") nextTool = "Catalogue";

    const architecture =
      outcome === "AV over IP distribution" || (avoipScore >= 5 && networkIsReady)
        ? "An AV over IP architecture is likely justified for this opportunity."
        : outcome === "Extender / point-to-point"
          ? "A direct transport path is the likely starting point."
          : outcome === "Splitter / one-to-many"
            ? "Simple mirrored distribution is the likely starting point."
            : outcome === "Matrix / presentation switching"
              ? "A switching-led architecture is the likely starting point."
              : "A display-canvas-led design flow is the likely starting point.";

    const transport =
      avoipScore >= 5 && networkIsReady
        ? "AVoIP should be considered because routing flexibility, scalability, and network readiness are present."
        : dist > 30
          ? "Distance suggests HDBaseT or AV over IP should be considered."
          : "Distance appears suitable for standard room-scale transport, depending on signal requirements.";

    const complexity =
      displays >= 4 || sources >= 4
        ? "This looks like a medium-to-higher complexity opportunity."
        : "This looks like a compact to medium opportunity.";

    return { nextTool, architecture, transport, complexity };
  }, [outcome, displayCount, sourceCount, distance, networkReady, futureExpansion]);

  const handleOpenNextTool = () => {
    const numericSources = Number(sourceCount || 0);
    const numericDisplays = Number(displayCount || 0);
    const numericDistance = Number(distance || 0);

    const isUsbRequired = usbNeeds === "Yes";
    const isNetworkReady = networkReady === "Yes";
    const isFutureExpansion = futureExpansion === "Yes";
    const isVideoWall = outcome === "Video wall design";
    const isWireless = outcome === "AV over IP distribution";

    const discoveryPayload = {
      name: "New Wingman Project",
      customer: "",
      application: outcome,
      roomType: outcome,
      notes,
      avGuide: {
        usb: isUsbRequired ? "USB / BYOD required" : "No USB requirement",
        audio: "",
        control:
          outcome === "Matrix / presentation switching"
            ? "Room switching control required"
            : outcome === "AV over IP distribution"
              ? "Network-routed control likely required"
              : "",
      },
      videoWall: {
        wallType: isVideoWall ? "Video Wall" : "",
      },
      discovery: {
        sources: numericSources,
        sourceCount: numericSources,
        displays: numericDisplays,
        displayCount: numericDisplays,
        distanceM: numericDistance,
        distance: numericDistance,
        resolution: "",
        notes,
        usbRequired: isUsbRequired,
        wireless: isWireless,
        videoWall: isVideoWall,
        advancedMultiview: isVideoWall && numericDisplays >= 4,
        hybridMeeting: isUsbRequired && outcome === "Matrix / presentation switching",
        networkReady: isNetworkReady,
        futureExpansion: isFutureExpansion,
      },
    };

    saveActiveProject({
      name: discoveryPayload.name,
      customer: discoveryPayload.customer,
      application: discoveryPayload.application,
      roomType: discoveryPayload.roomType,
      discovery: discoveryPayload.discovery,
      updatedAt: new Date().toISOString(),
    });

    const persisted = buildDiscoveryPersistedProject(discoveryPayload);
    upsertPersistedProject(persisted);

    navigate(
      recommendation.nextTool === "Video Wall"
        ? WM_ROUTES.videoWall
        : recommendation.nextTool === "Proposal"
          ? WM_ROUTES.proposal
          : WM_ROUTES.catalog,
    );
  };

  const rightRail = (
    <>
      <section className="wmx-right-panel">
        <div className="wmx-right-title">Design Direction</div>
        <div className="wmx-alert-list">
          <div className="wmx-alert-item">
            <div className="wmx-alert-dot wmx-alert-dot--info" />
            <div className="wmx-alert-copy">
              <strong>Architecture</strong>
              <span>{recommendation.architecture}</span>
            </div>
          </div>
          <div className="wmx-alert-item">
            <div className="wmx-alert-dot wmx-alert-dot--info" />
            <div className="wmx-alert-copy">
              <strong>Transport</strong>
              <span>{recommendation.transport}</span>
            </div>
          </div>
          <div className="wmx-alert-item">
            <div className="wmx-alert-dot wmx-alert-dot--good" />
            <div className="wmx-alert-copy">
              <strong>Complexity</strong>
              <span>{recommendation.complexity}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="wmx-right-panel">
        <div className="wmx-right-title">Next Tool</div>
        <div className="wmx-summary-metric">
          <span>Recommended handoff</span>
          <strong>{recommendation.nextTool}</strong>
        </div>
      </section>
    </>
  );

  return (
    <WingmanWorkflowShell
      activeStage="discovery"
      projectName="New Wingman Project"
      sourceCount={Number(sourceCount || 0)}
      displayCount={Number(displayCount || 0)}
      distanceM={Number(distance || 0)}
      systemType={recommendation.nextTool}
      rightRail={rightRail}
    >
      <section className="wmx-section">
        <div className="wmx-section-header">
          <h1>System Intent</h1>
          <p>Select the primary design outcome</p>
        </div>

        <div className="wmx-card-row">
          {outcomeOptions.map((item) => {
            const active = item.label === outcome;
            return (
              <article
                key={item.label}
                className={`wmx-config-card${active ? " is-selected" : ""}`}
                onClick={() => setOutcome(item.label)}
                style={{ cursor: "pointer" }}
              >
                <div className="wmx-config-title">{item.label}</div>
                <div className="wmx-config-copy">{item.summary}</div>
                <div className="wmx-config-stats">
                  {item.hints.map((h) => (
                    <span key={h}>{h}</span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="wmx-section">
        <div className="wmx-section-header">
          <h2>System Signals</h2>
          <p>Define scale, distance, and constraints</p>
        </div>

        <div className="wmx-card-row">
          <div className="wmx-config-card">
            <div className="wmx-config-title">Displays</div>
            <input
              className="wm-input-dark"
              type="number"
              value={displayCount}
              onChange={(e) => setDisplayCount(e.target.value)}
            />
          </div>

          <div className="wmx-config-card">
            <div className="wmx-config-title">Sources</div>
            <input
              className="wm-input-dark"
              type="number"
              value={sourceCount}
              onChange={(e) => setSourceCount(e.target.value)}
            />
          </div>

          <div className="wmx-config-card">
            <div className="wmx-config-title">Distance (m)</div>
            <input
              className="wm-input-dark"
              type="number"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
            />
          </div>
        </div>

        <div className="wmx-card-row">
          <div className="wmx-config-card">
            <div className="wmx-config-title">USB</div>
            <select
              className="wm-select-dark"
              value={usbNeeds}
              onChange={(e) => setUsbNeeds(e.target.value)}
            >
              <option>Yes</option>
              <option>No</option>
            </select>
          </div>

          <div className="wmx-config-card">
            <div className="wmx-config-title">Network Ready</div>
            <select
              className="wm-select-dark"
              value={networkReady}
              onChange={(e) => setNetworkReady(e.target.value)}
            >
              <option>Yes</option>
              <option>No</option>
            </select>
          </div>

          <div className="wmx-config-card">
            <div className="wmx-config-title">Future Expansion</div>
            <select
              className="wm-select-dark"
              value={futureExpansion}
              onChange={(e) => setFutureExpansion(e.target.value)}
            >
              <option>Yes</option>
              <option>No</option>
            </select>
          </div>
        </div>

        <div className="wmx-data-panel">
          <div className="wmx-panel-title">Notes</div>
          <textarea
            className="wm-textarea-dark"
            placeholder="Capture room notes, application detail, or priorities."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </section>

      <section className="wmx-section">
        <div className="wmx-panel-action">
          <button
            type="button"
            className="wmx-primary-btn"
            onClick={handleOpenNextTool}
          >
            Continue to {recommendation.nextTool}
          </button>
        </div>
      </section>
    </WingmanWorkflowShell>
  );
}
'@

Write-Utf8NoBom -Path $discoveryPath -Content $discoveryContent
Write-Host "Updated: $discoveryPath"

# ------------------------------------------------------------
# 4) Replace ProposalPage with shell-only version
# ------------------------------------------------------------

Backup-File $proposalPath

$proposalContent = @'
import { useProjectContext } from "@/context/ProjectContext";
import { WingmanUxShell } from "@/features/wingmanUx/WingmanUxShell";

export default function ProposalPage() {
  const { projectData } = useProjectContext();
  const project = projectData.activeProject;

  if (!project) {
    return (
      <div className="wmx-loading-card">
        <div className="wmx-loading-title">No active project</div>
        <div className="wmx-loading-copy">
          Select or create a project before opening proposal output.
        </div>
      </div>
    );
  }

  const projectState = {
    projectName: project.name ?? "New Wingman Project",
    customer: project.customer ?? "",
    roomType: project.roomType ?? "",
    application: project.application ?? "",

    sourceCount:
      Number(
        project.discovery?.sources ??
          project.discovery?.sourceCount ??
          0,
      ) || 0,

    displayCount:
      Number(
        project.discovery?.displays ??
          project.discovery?.displayCount ??
          0,
      ) || 0,

    distanceM:
      Number(
        project.discovery?.distance ??
          project.discovery?.distanceM ??
          project.distanceM ??
          0,
      ) || 0,

    resolution: project.discovery?.resolution ?? project.resolution ?? "",
    notes: project.discovery?.notes ?? project.notes ?? "",

    avGuide: {
      usb:
        project.avGuide?.usb ||
        (project.discovery?.usbRequired
          ? "USB / BYOD required"
          : "No USB requirement"),
      audio: project.avGuide?.audio ?? "",
      control:
        project.avGuide?.control ||
        (project.discovery?.networkReady
          ? "Network-routed control likely required"
          : ""),
    },

    videoWall: {
      wallType:
        project.videoWall?.wallType ||
        (project.discovery?.videoWall ? "Video Wall" : ""),
    },
  };

  return <WingmanUxShell projectState={projectState} />;
}
'@

Write-Utf8NoBom -Path $proposalPath -Content $proposalContent
Write-Host "Updated: $proposalPath"

Write-Host ""
Write-Host "Done."
Write-Host "Backups created as .bak files beside each updated file."
Write-Host ""
Write-Host "Next:"
Write-Host "  npm run typecheck"
Write-Host "  npm run dev"