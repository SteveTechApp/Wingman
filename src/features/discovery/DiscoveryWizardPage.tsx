import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import SplitWorkspaceFrame from "@/components/workspace/SplitWorkspaceFrame";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  ensureActiveProject,
  getActiveProject,
  setActiveProjectId,
  subscribeProjects,
  updateProjectDiscovery,
  type DiscoveryProductFamily,
} from "@/features/projects/projectStore";
import "./discovery-wizard-page.css";

type OutcomePath =
  | "Extender / point-to-point"
  | "Splitter / one-to-many"
  | "Matrix / presentation switching"
  | "AV over IP distribution"
  | "Video wall design";

type DiscoveryPanel = "direction" | "next";

type OutcomeOption = {
  label: OutcomePath;
  summary: string;
  hints: string[];
};

const OUTCOME_OPTIONS: OutcomeOption[] = [
  {
    label: "Extender / point-to-point",
    summary: "Use when one source needs to reach one destination cleanly over distance.",
    hints: ["Distance-led", "Single route", "Simple transport"],
  },
  {
    label: "Splitter / one-to-many",
    summary: "Use when one source needs to mirror to multiple displays without flexible switching.",
    hints: ["Mirrored outputs", "Simple distribution", "Fixed source"],
  },
  {
    label: "Matrix / presentation switching",
    summary: "Use when multiple sources need to switch between one or more displays.",
    hints: ["Multiple sources", "Routing control", "Room switching"],
  },
  {
    label: "AV over IP distribution",
    summary: "Use when the site needs scalable routing over a managed network.",
    hints: ["Network transport", "Scalable", "Multi-zone"],
  },
  {
    label: "Video wall design",
    summary: "Use when the display canvas and processor strategy are the main design driver.",
    hints: ["Display canvas", "Processor strategy", "Wall planning"],
  },
];

function normalizeOutcome(value?: string | null): OutcomePath {
  const text = String(value ?? "").trim().toLowerCase();
  if (text.includes("video wall") || text.includes("videowall") || text.includes("wall")) {
    return "Video wall design";
  }
  if (text.includes("av over ip") || text.includes("avoip") || text.includes("network")) {
    return "AV over IP distribution";
  }
  if (text.includes("extender") || text.includes("point-to-point") || text.includes("extend")) {
    return "Extender / point-to-point";
  }
  if (text.includes("splitter") || text.includes("one-to-many") || text.includes("duplicate")) {
    return "Splitter / one-to-many";
  }
  return "Matrix / presentation switching";
}

function yesNoFromValue(value?: string | null): "Yes" | "No" {
  const text = String(value ?? "").trim().toLowerCase();
  return text === "yes" || text.includes("ready") || text.includes("managed") || text.includes("future")
    ? "Yes"
    : "No";
}

function getRouteLabel(route: string): string {
  if (route === WM_ROUTES.videoWall) return "Video Wall";
  if (route === WM_ROUTES.proposal) return "Proposal";
  if (route === WM_ROUTES.catalog) return "Product Catalogue";
  if (route === WM_ROUTES.roomWizard) return "Room Wizard";
  return "Next Tool";
}

function getTransportDistanceBand(distance: number): string {
  if (distance > 100) return "More than 100m";
  if (distance > 70) return "Up to 100m";
  if (distance > 40) return "Up to 70m";
  if (distance > 0) return "Up to 40m";
  return "";
}

function buildRecommendedFamilies(
  outcome: OutcomePath,
  displays: number,
  sources: number,
  distance: number,
  usbNeeds: string,
  networkReady: boolean,
  futureExpansion: boolean,
): DiscoveryProductFamily[] {
  const families = new Set<DiscoveryProductFamily>();

  if (outcome === "Video wall design") {
    families.add("Video Wall");
    if (networkReady || displays >= 4) families.add("AVoIP");
  } else if (outcome === "AV over IP distribution") {
    families.add("AVoIP");
    families.add("Matrix");
  } else if (outcome === "Matrix / presentation switching") {
    families.add("Apollo");
    families.add("Matrix");
  } else if (outcome === "Splitter / one-to-many") {
    families.add("HDBaseT");
    families.add("Apollo");
  } else {
    families.add(distance > 30 ? "HDBaseT" : "Apollo");
  }

  if (usbNeeds === "Yes") families.add("USB Extension");
  if ((networkReady || futureExpansion) && outcome !== "Video wall design") families.add("AVoIP");
  if (sources >= 4 || displays >= 4) families.add("Matrix");
  if (families.size === 0) families.add("Apollo");

  return Array.from(families);
}

function getPrimaryRoute(outcome: OutcomePath): string {
  if (outcome === "Video wall design") return WM_ROUTES.videoWall;
  if (outcome === "Matrix / presentation switching") return WM_ROUTES.proposal;
  return WM_ROUTES.catalog;
}

function getSecondaryRoute(primaryRoute: string): string {
  if (primaryRoute === WM_ROUTES.videoWall) return WM_ROUTES.proposal;
  if (primaryRoute === WM_ROUTES.proposal) return WM_ROUTES.catalog;
  return WM_ROUTES.roomWizard;
}

export default function DiscoveryWizardPage() {
  const navigate = useNavigate();
  const activeProject = useSyncExternalStore(subscribeProjects, getActiveProject, () => undefined);
  const [panel, setPanel] = useState<DiscoveryPanel>("direction");
  const [outcome, setOutcome] = useState<OutcomePath>(() =>
    normalizeOutcome(activeProject?.discovery?.workflowTrack ?? activeProject?.discovery?.applicationType),
  );
  const [displayCount, setDisplayCount] = useState(() => activeProject?.discovery?.displayCount || "2");
  const [sourceCount, setSourceCount] = useState(() => activeProject?.discovery?.sourceCount || "3");
  const [distance, setDistance] = useState(() => activeProject?.discovery?.cableDistanceM || "15");
  const [usbNeeds, setUsbNeeds] = useState<"Yes" | "No">(() =>
    yesNoFromValue(activeProject?.discovery?.usbNeeds),
  );
  const [networkReady, setNetworkReady] = useState<"Yes" | "No">(() =>
    yesNoFromValue(activeProject?.discovery?.networkEnvironment),
  );
  const [futureExpansion, setFutureExpansion] = useState<"Yes" | "No">(() =>
    yesNoFromValue(activeProject?.discovery?.controlNeeds),
  );
  const [notes, setNotes] = useState(() => activeProject?.discovery?.notes ?? activeProject?.notes ?? "");

  useEffect(() => {
    const discovery = activeProject?.discovery;
    setOutcome(normalizeOutcome(discovery?.workflowTrack ?? discovery?.applicationType));
    setDisplayCount(discovery?.displayCount || "2");
    setSourceCount(discovery?.sourceCount || "3");
    setDistance(discovery?.cableDistanceM || "15");
    setUsbNeeds(yesNoFromValue(discovery?.usbNeeds));
    setNetworkReady(yesNoFromValue(discovery?.networkEnvironment));
    setFutureExpansion(yesNoFromValue(discovery?.controlNeeds));
    setNotes(discovery?.notes ?? activeProject?.notes ?? "");
  }, [activeProject?.id]);

  const recommendation = useMemo(() => {
    const displays = Number(displayCount) || 0;
    const sources = Number(sourceCount) || 0;
    const distanceM = Number(distance) || 0;
    const networkIsReady = networkReady === "Yes";
    const expansionExpected = futureExpansion === "Yes";
    const nextRoute = getPrimaryRoute(outcome);
    const alternateRoute = getSecondaryRoute(nextRoute);
    const recommendedFamilies = buildRecommendedFamilies(
      outcome,
      displays,
      sources,
      distanceM,
      usbNeeds,
      networkIsReady,
      expansionExpected,
    );

    const architecture =
      outcome === "Video wall design"
        ? "The display canvas is driving this project, so the processor and wall topology should stay in focus."
        : outcome === "AV over IP distribution" || ((sources >= 3 || displays >= 3) && networkIsReady)
          ? "A scalable network-routed architecture is likely justified for this opportunity."
          : outcome === "Extender / point-to-point"
            ? "A direct transport path is the cleanest starting point for this brief."
            : outcome === "Splitter / one-to-many"
              ? "A fixed distribution workflow is the likely starting point."
              : "A switching-led room architecture is the most likely starting point.";

    const transport =
      outcome === "AV over IP distribution" || ((sources >= 3 || displays >= 3) && networkIsReady)
        ? "AV over IP is credible here because routing flexibility, scale, or network readiness are already present."
        : distanceM > 30
          ? "The transport distance is long enough that HDBaseT or AV over IP should be treated as the baseline."
          : "The cable distance looks manageable for a compact room workflow, subject to final signal and USB needs.";

    const complexity =
      displays >= 4 || sources >= 4 || outcome === "Video wall design"
        ? "Medium-to-higher complexity opportunity."
        : "Compact-to-medium opportunity.";

    return {
      displays,
      sources,
      distanceM,
      nextRoute,
      alternateRoute,
      architecture,
      transport,
      complexity,
      transportBand: getTransportDistanceBand(distanceM),
      recommendedFamilies,
    };
  }, [displayCount, distance, futureExpansion, networkReady, outcome, sourceCount, usbNeeds]);

  function persistAndNavigate(route: string) {
    const nextNotes = notes.trim() || activeProject?.notes?.trim() || "";
    const nextName =
      activeProject?.name?.trim() && activeProject.name.trim() !== "New Project"
        ? activeProject.name.trim()
        : `${outcome} Project`;
    const nextCustomer = activeProject?.customer?.trim() || "";
    const nextRoomName = activeProject?.roomName?.trim() || outcome;

    const project = ensureActiveProject({
      name: nextName,
      customer: nextCustomer,
      roomName: nextRoomName,
      stage: "Discovery",
      status: "Draft",
      notes: nextNotes,
    });

    setActiveProjectId(project.id);
    updateProjectDiscovery(project.id, {
      customer: nextCustomer,
      roomName: nextRoomName,
      workflowTrack: outcome,
      projectScope: recommendation.complexity,
      customerOutcome: recommendation.architecture,
      switchSolutionType: outcome,
      matrixIoPreset: `${recommendation.sources}x${recommendation.displays}`,
      featureRequirements: [
        usbNeeds === "Yes" ? "USB / BYOD required" : "",
        recommendation.transport,
      ].filter(Boolean).join(" | "),
      applicationType: outcome,
      displayCount,
      sourceCount,
      cableDistanceM: distance,
      transportDistanceBand: recommendation.transportBand,
      usbNeeds,
      networkEnvironment:
        networkReady === "Yes" ? "Managed AV network available" : "Network not confirmed",
      controlNeeds:
        futureExpansion === "Yes" ? "Future expansion expected" : "Current scope only",
      notes: nextNotes,
      recommendedFamilies: recommendation.recommendedFamilies,
      recommendedNextTool: route,
      createdAt: project.discovery?.createdAt ?? new Date().toISOString(),
    });

    navigate(route);
  }

  const left = (
    <div className="wm-discovery-page__pane wm-workspace-stack">
      <div className="wm-start-step">
        Capture the system intent on the left, then keep the architectural readout and next move visible on the right.
      </div>

      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">System intent</h3>
          <p className="wm-workspace-card__copy">Choose the dominant workflow first so the rest of discovery stays focused.</p>
        </div>

        <div className="wm-workspace-list">
          {OUTCOME_OPTIONS.map((item) => (
            <button
              key={item.label}
              type="button"
              aria-pressed={item.label === outcome}
              className={`wm-workspace-list-item${item.label === outcome ? " wm-workspace-list-item--active" : ""}`}
              onClick={() => setOutcome(item.label)}
            >
              <span className="wm-workspace-list-item__title">{item.label}</span>
              <span className="wm-workspace-list-item__copy">{item.summary}</span>
              <span className="wm-workspace-tag-row">
                {item.hints.map((hint) => (
                  <span key={hint} className="wm-workspace-tag">
                    {hint}
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">Discovery inputs</h3>
          <p className="wm-workspace-card__copy">Keep the counts and constraints compact so the next step stays obvious.</p>
        </div>

        <div className="wm-workspace-form">
          <div className="wm-workspace-grid-3">
            <div className="wm-workspace-field">
              <label htmlFor="discovery-displays" className="wm-workspace-label">
                Displays
              </label>
              <input
                id="discovery-displays"
                className="wm-input-dark"
                type="number"
                min="0"
                value={displayCount}
                onChange={(event) => setDisplayCount(event.target.value)}
              />
            </div>

            <div className="wm-workspace-field">
              <label htmlFor="discovery-sources" className="wm-workspace-label">
                Sources
              </label>
              <input
                id="discovery-sources"
                className="wm-input-dark"
                type="number"
                min="0"
                value={sourceCount}
                onChange={(event) => setSourceCount(event.target.value)}
              />
            </div>

            <div className="wm-workspace-field">
              <label htmlFor="discovery-distance" className="wm-workspace-label">
                Longest run (m)
              </label>
              <input
                id="discovery-distance"
                className="wm-input-dark"
                type="number"
                min="0"
                value={distance}
                onChange={(event) => setDistance(event.target.value)}
              />
            </div>
          </div>

          <div className="wm-workspace-grid-3">
            <div className="wm-workspace-field">
              <label htmlFor="discovery-usb" className="wm-workspace-label">
                USB
              </label>
              <select
                id="discovery-usb"
                className="wm-select-dark"
                value={usbNeeds}
                onChange={(event) => setUsbNeeds(event.target.value as "Yes" | "No")}
              >
                <option>Yes</option>
                <option>No</option>
              </select>
            </div>

            <div className="wm-workspace-field">
              <label htmlFor="discovery-network" className="wm-workspace-label">
                Network ready
              </label>
              <select
                id="discovery-network"
                className="wm-select-dark"
                value={networkReady}
                onChange={(event) => setNetworkReady(event.target.value as "Yes" | "No")}
              >
                <option>Yes</option>
                <option>No</option>
              </select>
            </div>

            <div className="wm-workspace-field">
              <label htmlFor="discovery-expansion" className="wm-workspace-label">
                Future expansion
              </label>
              <select
                id="discovery-expansion"
                className="wm-select-dark"
                value={futureExpansion}
                onChange={(event) => setFutureExpansion(event.target.value as "Yes" | "No")}
              >
                <option>Yes</option>
                <option>No</option>
              </select>
            </div>
          </div>

          <div className="wm-workspace-field">
            <label htmlFor="discovery-notes" className="wm-workspace-label">
              Notes
            </label>
            <textarea
              id="discovery-notes"
              className="wm-textarea-dark"
              placeholder="Capture the project signals, user outcome, and any design constraints that change the recommendation."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="wm-workspace-card">
        <div className="wm-workspace-grid-3">
          <div className="wm-workspace-metric">
            <span>Displays</span>
            <strong>{recommendation.displays}</strong>
          </div>
          <div className="wm-workspace-metric">
            <span>Sources</span>
            <strong>{recommendation.sources}</strong>
          </div>
          <div className="wm-workspace-metric">
            <span>Distance band</span>
            <strong>{recommendation.transportBand || "Not set"}</strong>
          </div>
        </div>

        <div className="wm-next-step">
          Save discovery before leaving the page so the next tool opens with the same design direction already attached to the active project.
        </div>
      </section>
    </div>
  );

  const right = (
    <div className="wm-discovery-page__pane wm-workspace-stack">
      <section className="wm-workspace-card">
        <div className="wm-workspace-tab-row">
          <button
            type="button"
            className={`wm-workspace-tab${panel === "direction" ? " wm-workspace-tab--active" : ""}`}
            onClick={() => setPanel("direction")}
          >
            Design direction
          </button>
          <button
            type="button"
            className={`wm-workspace-tab${panel === "next" ? " wm-workspace-tab--active" : ""}`}
            onClick={() => setPanel("next")}
          >
            Next steps
          </button>
        </div>

        {panel === "direction" ? (
          <div className="wm-workspace-tabpanel">
            <div className="wm-discovery-page__direction-summary">
              <div className="wm-workspace-card__header">
                <span className="wm-discovery-page__direction-kicker">{outcome}</span>
                <h3 className="wm-workspace-card__title">Current direction</h3>
                <p className="wm-workspace-card__copy">
                  Keep the interpretation on the right so the left side can stay focused on the brief.
                </p>
              </div>

              <div className="wm-workspace-grid-3">
                <div className="wm-workspace-metric">
                  <span>Primary next tool</span>
                  <strong>{getRouteLabel(recommendation.nextRoute)}</strong>
                </div>
                <div className="wm-workspace-metric">
                  <span>Complexity</span>
                  <strong>{recommendation.complexity}</strong>
                </div>
                <div className="wm-workspace-metric">
                  <span>USB</span>
                  <strong>{usbNeeds}</strong>
                </div>
              </div>

              <div className="wm-workspace-tag-row">
                {recommendation.recommendedFamilies.map((family) => (
                  <span key={family} className="wm-workspace-tag">
                    {family}
                  </span>
                ))}
              </div>
            </div>

            <div className="wm-discovery-page__support-list">
              <div className="wm-discovery-page__support-item">
                <span className="wm-workspace-list-item__title">Architecture</span>
                <span className="wm-workspace-list-item__copy">{recommendation.architecture}</span>
              </div>
              <div className="wm-discovery-page__support-item">
                <span className="wm-workspace-list-item__title">Transport</span>
                <span className="wm-workspace-list-item__copy">{recommendation.transport}</span>
              </div>
              <div className="wm-discovery-page__support-item">
                <span className="wm-workspace-list-item__title">Active project</span>
                <span className="wm-workspace-list-item__copy">
                  {activeProject ? activeProject.name : "A project shell will be created when you continue."}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="wm-workspace-tabpanel">
            <div className="wm-discovery-page__next-summary">
              <div className="wm-workspace-card__header">
                <h3 className="wm-workspace-card__title">Recommended next move</h3>
                <p className="wm-workspace-card__copy">
                  {getRouteLabel(recommendation.nextRoute)} is the cleanest next step for the current discovery pattern.
                </p>
              </div>

              <div className="wm-workspace-action-row">
                <button
                  type="button"
                  className="wm-btn-primary"
                  onClick={() => persistAndNavigate(recommendation.nextRoute)}
                >
                  Save and open {getRouteLabel(recommendation.nextRoute)}
                </button>
                <button
                  type="button"
                  className="wm-btn-secondary"
                  onClick={() => persistAndNavigate(recommendation.alternateRoute)}
                >
                  Save and open {getRouteLabel(recommendation.alternateRoute)}
                </button>
              </div>
            </div>

            <div className="wm-discovery-page__support-list">
              <div className="wm-discovery-page__support-item">
                <span className="wm-workspace-list-item__title">What gets saved</span>
                <span className="wm-workspace-list-item__copy">
                  Outcome path, source and display counts, distance band, USB, network readiness, future expansion, notes, and the recommended next tool.
                </span>
              </div>
              <div className="wm-discovery-page__support-item">
                <span className="wm-workspace-list-item__title">Why the layout changed</span>
                <span className="wm-workspace-list-item__copy">
                  The discovery questions stay visible on the left while the user reviews the recommendation and next action on the right.
                </span>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );

  return (
    <SplitWorkspaceFrame
      title="Discovery"
      subtitle="Lead with the project intent on the left and keep the design readout on the right so the next workflow step is always visible."
      leftTitle="Discovery Input"
      rightTitle="Direction"
      left={left}
      right={right}
      top={
        <div className="wm-workspace-action-row">
          <button
            type="button"
            className="wm-btn-secondary"
            onClick={() => persistAndNavigate(recommendation.alternateRoute)}
          >
            Save and open {getRouteLabel(recommendation.alternateRoute)}
          </button>
          <button
            type="button"
            className="wm-btn-primary"
            onClick={() => persistAndNavigate(recommendation.nextRoute)}
          >
            Save and open {getRouteLabel(recommendation.nextRoute)}
          </button>
        </div>
      }
    />
  );
}
