import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SplitWorkspaceFrame from "@/components/workspace/SplitWorkspaceFrame";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  ensureActiveProject,
  getActiveProject,
  setActiveProjectId,
  updateProjectDiscovery,
  type DiscoveryProductFamily,
} from "@/features/projects/projectStore";
import "./room-wizard-page.css";

type RoomType =
  | "Meeting Room"
  | "Boardroom"
  | "Classroom"
  | "Huddle Space"
  | "Training Space"
  | "Control Room";

type InsightPanel = "guidance" | "next";

const ROOM_TYPES: RoomType[] = [
  "Meeting Room",
  "Boardroom",
  "Classroom",
  "Huddle Space",
  "Training Space",
  "Control Room",
];

function buildRecommendedFamilies(
  displays: number,
  sources: number,
  distance: number,
  usbNeeds: string,
): DiscoveryProductFamily[] {
  const families = new Set<DiscoveryProductFamily>();

  if (displays >= 4 || distance > 30) families.add("AVoIP");
  if (sources > 2 || displays > 2) families.add("Matrix");
  if (distance >= 10) families.add("HDBaseT");
  if (usbNeeds === "Yes") families.add("USB Extension");
  if (families.size === 0) families.add("Apollo");

  return Array.from(families);
}

function buildTransportBand(distance: number): string {
  if (distance > 30) return "30m+";
  if (distance >= 10) return "10-30m";
  return "0-10m";
}

function getRouteLabel(route: string): string {
  if (route === WM_ROUTES.catalog) return "Product Catalogue";
  if (route === WM_ROUTES.proposal) return "Proposal";
  return "Next Tool";
}

export default function RoomWizardPage() {
  const navigate = useNavigate();
  const [roomType, setRoomType] = useState<RoomType>("Meeting Room");
  const [displayCount, setDisplayCount] = useState("2");
  const [sourceCount, setSourceCount] = useState("3");
  const [distance, setDistance] = useState("15");
  const [usbNeeds, setUsbNeeds] = useState("Yes");
  const [notes, setNotes] = useState("");
  const [panel, setPanel] = useState<InsightPanel>("guidance");

  const recommendation = useMemo(() => {
    const displays = Number(displayCount) || 0;
    const sources = Number(sourceCount) || 0;
    const longestRun = Number(distance) || 0;
    const recommendedFamilies = buildRecommendedFamilies(displays, sources, longestRun, usbNeeds);
    const nextRoute =
      displays > 2 || sources > 2 || longestRun > 15 || usbNeeds === "Yes"
        ? WM_ROUTES.catalog
        : WM_ROUTES.proposal;

    const architecture =
      displays >= 4
        ? "A multi-display room is pointing toward a scalable AV over IP or matrix-led design."
        : sources > 2
          ? "The room likely needs a compact matrix or presentation switching workflow."
          : "A simpler presentation flow may be enough if the commercial brief stays tight.";

    const transport =
      longestRun > 30
        ? "The cable distance suggests HDBaseT or AV over IP should be treated as the transport baseline."
        : longestRun >= 10
          ? "The distance is long enough that transport planning should be confirmed before final product selection."
          : "The distance looks short enough for a straightforward room workflow, subject to final signal format.";

    const usb =
      usbNeeds === "Yes"
        ? "USB extension should stay in scope, especially if cameras or UC peripherals need to cross the room."
        : "USB transport is not a major constraint, so the proposal can stay simpler.";

    return {
      displays,
      sources,
      longestRun,
      transportBand: buildTransportBand(longestRun),
      recommendedFamilies,
      nextRoute,
      architecture,
      transport,
      usb,
    };
  }, [displayCount, sourceCount, distance, usbNeeds]);

  function persistAndNavigate(route: string) {
    const existing = getActiveProject();
    const trimmedNotes = notes.trim();
    const nextName =
      existing?.name?.trim() && existing.name.trim() !== "New Project"
        ? existing.name.trim()
        : `${roomType} Project`;
    const nextCustomer = existing?.customer?.trim() || "";
    const nextRoomName = roomType;
    const nextNotes = trimmedNotes || existing?.notes?.trim() || "";

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
      workflowTrack: "Room Wizard",
      applicationType: roomType,
      displayCount,
      sourceCount,
      cableDistanceM: distance,
      transportDistanceBand: recommendation.transportBand,
      usbNeeds,
      projectScope: recommendation.architecture,
      customerOutcome: recommendation.transport,
      featureRequirements: recommendation.usb,
      notes: nextNotes,
      recommendedFamilies: recommendation.recommendedFamilies,
      recommendedNextTool: route,
    });

    navigate(route);
  }

  const alternateRoute =
    recommendation.nextRoute === WM_ROUTES.catalog
      ? WM_ROUTES.proposal
      : WM_ROUTES.catalog;

  const left = (
    <div className="wm-room-wizard-page__pane wm-workspace-stack">
      <div className="wm-start-step">
        Define the room once on the left, then keep the technical guidance in the right pane so the user always sees the next design move.
      </div>

      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">Room profile</h3>
          <p className="wm-workspace-card__copy">Set the application context and the core signal counts before moving into products.</p>
        </div>

        <div className="wm-workspace-form">
          <div className="wm-workspace-field">
            <label htmlFor="room-type" className="wm-workspace-label">
              Room type
            </label>
            <select
              id="room-type"
              className="wm-select-dark"
              value={roomType}
              onChange={(event) => setRoomType(event.target.value as RoomType)}
            >
              {ROOM_TYPES.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="wm-workspace-grid-3">
            <div className="wm-workspace-field">
              <label htmlFor="room-displays" className="wm-workspace-label">
                Display count
              </label>
              <input
                id="room-displays"
                className="wm-input-dark"
                type="number"
                min="0"
                value={displayCount}
                onChange={(event) => setDisplayCount(event.target.value)}
              />
            </div>

            <div className="wm-workspace-field">
              <label htmlFor="room-sources" className="wm-workspace-label">
                Source count
              </label>
              <input
                id="room-sources"
                className="wm-input-dark"
                type="number"
                min="0"
                value={sourceCount}
                onChange={(event) => setSourceCount(event.target.value)}
              />
            </div>

            <div className="wm-workspace-field">
              <label htmlFor="room-distance" className="wm-workspace-label">
                Longest run (m)
              </label>
              <input
                id="room-distance"
                className="wm-input-dark"
                type="number"
                min="0"
                value={distance}
                onChange={(event) => setDistance(event.target.value)}
              />
            </div>
          </div>

          <div className="wm-workspace-grid-2">
            <div className="wm-workspace-field">
              <label htmlFor="room-usb" className="wm-workspace-label">
                USB requirement
              </label>
              <select
                id="room-usb"
                className="wm-select-dark"
                value={usbNeeds}
                onChange={(event) => setUsbNeeds(event.target.value)}
              >
                <option>Yes</option>
                <option>No</option>
              </select>
            </div>

            <div className="wm-workspace-field">
              <label htmlFor="room-notes" className="wm-workspace-label">
                Room notes
              </label>
              <textarea
                id="room-notes"
                className="wm-textarea-dark"
                placeholder="Collaboration goals, control needs, audio observations, or installation constraints."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
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
            <strong>{recommendation.transportBand}</strong>
          </div>
        </div>

        <div className="wm-next-step">
          Save the room definition before leaving the wizard so the product and proposal tools inherit the same baseline.
        </div>
      </section>
    </div>
  );

  const right = (
    <div className="wm-room-wizard-page__pane wm-workspace-stack">
      <section className="wm-workspace-card">
        <div className="wm-workspace-tab-row">
          <button
            type="button"
            className={`wm-workspace-tab${panel === "guidance" ? " wm-workspace-tab--active" : ""}`}
            onClick={() => setPanel("guidance")}
          >
            Guidance
          </button>
          <button
            type="button"
            className={`wm-workspace-tab${panel === "next" ? " wm-workspace-tab--active" : ""}`}
            onClick={() => setPanel("next")}
          >
            Next steps
          </button>
        </div>

        {panel === "guidance" ? (
          <div className="wm-workspace-tabpanel">
            <div className="wm-room-wizard-page__insight-grid">
              <article className="wm-room-wizard-page__insight">
                <span className="wm-room-wizard-page__insight-kicker">Architecture</span>
                <h3>System direction</h3>
                <p>{recommendation.architecture}</p>
              </article>
              <article className="wm-room-wizard-page__insight">
                <span className="wm-room-wizard-page__insight-kicker">Transport</span>
                <h3>Cable strategy</h3>
                <p>{recommendation.transport}</p>
              </article>
              <article className="wm-room-wizard-page__insight">
                <span className="wm-room-wizard-page__insight-kicker">USB</span>
                <h3>Peripheral scope</h3>
                <p>{recommendation.usb}</p>
              </article>
            </div>

            <div className="wm-room-wizard-page__family-card">
              <div className="wm-workspace-card__header">
                <h3 className="wm-workspace-card__title">Suggested product families</h3>
                <p className="wm-workspace-card__copy">Keep the support layer here, and let the left side remain the clean input surface.</p>
              </div>

              <div className="wm-workspace-tag-row">
                {recommendation.recommendedFamilies.map((family) => (
                  <span key={family} className="wm-workspace-tag">
                    {family}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="wm-workspace-tabpanel">
            <div className="wm-room-wizard-page__next-card">
              <div className="wm-workspace-card__header">
                <h3 className="wm-workspace-card__title">Recommended next tool</h3>
                <p className="wm-workspace-card__copy">
                  {getRouteLabel(recommendation.nextRoute)} is the best next move for the current room complexity.
                </p>
              </div>

              <div className="wm-workspace-action-row">
                <button type="button" className="wm-btn-primary" onClick={() => persistAndNavigate(recommendation.nextRoute)}>
                  Save and open {getRouteLabel(recommendation.nextRoute)}
                </button>
                <button type="button" className="wm-btn-secondary" onClick={() => persistAndNavigate(alternateRoute)}>
                  Save and open {getRouteLabel(alternateRoute)}
                </button>
              </div>
            </div>

            <div className="wm-workspace-list">
              <div className="wm-workspace-list-item">
                <span className="wm-workspace-list-item__title">What gets saved</span>
                <span className="wm-workspace-list-item__copy">Room type, source count, display count, distance band, USB needs, notes, and recommended families.</span>
              </div>
              <div className="wm-workspace-list-item">
                <span className="wm-workspace-list-item__title">Why this split matters</span>
                <span className="wm-workspace-list-item__copy">The user can keep shaping the room on the left without losing sight of the technical guidance on the right.</span>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );

  return (
    <SplitWorkspaceFrame
      title="Room Wizard"
      subtitle="Keep the room inputs on the left and the interpretation on the right so the page stays readable while the next tool remains obvious."
      leftTitle="Room Input"
      rightTitle="Technical Support"
      left={left}
      right={right}
      top={
        <div className="wm-workspace-action-row">
          <button type="button" className="wm-btn-secondary" onClick={() => persistAndNavigate(alternateRoute)}>
            Save and open {getRouteLabel(alternateRoute)}
          </button>
          <button type="button" className="wm-btn-primary" onClick={() => persistAndNavigate(recommendation.nextRoute)}>
            Save and open {getRouteLabel(recommendation.nextRoute)}
          </button>
        </div>
      }
    />
  );
}
