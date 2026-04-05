import * as React from "react";
import { ArrowRight, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  buildRoomWorkflowGuidance,
  getRouteLabel,
} from "@/features/import/intakeExperience";
import {
  ensureActiveProject,
  getActiveProject,
  setActiveProjectId,
  subscribeProjects,
  updateProjectDiscovery,
} from "@/features/projects/projectStore";
import {
  ROOM_TEMPLATE_CATEGORY_ORDER,
  ROOM_TEMPLATE_LIBRARY,
  type RoomTemplateCategory,
  type RoomTemplateScenario,
} from "@/features/templates/roomTemplateLibrary";
import {
  DEFAULT_ROOM_TEMPLATE_ID,
  deriveRoomTemplateFamilies,
  findBestRoomTemplateForProject,
  findRoomTemplateById,
} from "@/features/templates/roomWorkflowContext";
import "./discovery-wizard-page.css";

type RoomCategoryFilter = "All Rooms" | RoomTemplateCategory;

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function roomSearchBlob(template: RoomTemplateScenario): string {
  return [
    template.category,
    template.vertical,
    template.roomType,
    template.summary,
    template.story,
    template.designPurpose,
    ...template.useCases,
    ...template.sourceTypes,
    ...template.outputTypes,
    ...template.recommendedFamilies,
  ]
    .join(" ")
    .toLowerCase();
}

function formatDateTime(value?: string | null): string {
  if (!value) return "Not captured";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

function distanceBand(distanceM: number): string {
  if (distanceM > 100) return "More than 100m";
  if (distanceM > 70) return "Up to 100m";
  if (distanceM > 40) return "Up to 70m";
  if (distanceM > 20) return "Up to 40m";
  if (distanceM > 0) return "Up to 20m";
  return "Not set";
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

function numberText(value: string, fallback: string): string {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) && numeric > 0 ? String(numeric) : fallback;
}

function RoomCard(props: {
  active: boolean;
  room: RoomTemplateScenario;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className={`wm-discovery-page__room-card${props.active ? " is-active" : ""}`}
      onClick={() => props.onSelect(props.room.id)}
    >
      <span className="wm-discovery-page__room-meta">
        {props.room.category} | {props.room.vertical}
      </span>
      <strong>{props.room.roomType}</strong>
      <span>{props.room.summary}</span>
      <div className="wm-discovery-page__chip-row">
        {props.room.recommendedFamilies.map((family) => (
          <span key={`${props.room.id}-${family}`} className="wm-discovery-page__chip">
            {family}
          </span>
        ))}
      </div>
    </button>
  );
}

function ToggleRow(props: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="wm-discovery-page__toggle-row">
      <span>{props.label}</span>
      <div className="wm-discovery-page__toggle-actions">
        <button
          type="button"
          className={`wm-discovery-page__toggle-chip${props.value ? " is-active" : ""}`}
          onClick={() => props.onChange(true)}
        >
          Yes
        </button>
        <button
          type="button"
          className={`wm-discovery-page__toggle-chip${!props.value ? " is-active" : ""}`}
          onClick={() => props.onChange(false)}
        >
          No
        </button>
      </div>
    </div>
  );
}

export default function DiscoveryWizardPage() {
  const navigate = useNavigate();
  const activeProject = React.useSyncExternalStore(subscribeProjects, getActiveProject, () => undefined);
  const inferredRoom = React.useMemo(
    () => findBestRoomTemplateForProject(activeProject) ?? findRoomTemplateById(DEFAULT_ROOM_TEMPLATE_ID),
    [activeProject],
  );
  const [roomCategory, setRoomCategory] = React.useState<RoomCategoryFilter>("All Rooms");
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);
  const [selectedRoomId, setSelectedRoomId] = React.useState(inferredRoom?.id ?? DEFAULT_ROOM_TEMPLATE_ID);
  const [customer, setCustomer] = React.useState("");
  const [site, setSite] = React.useState("");
  const [roomName, setRoomName] = React.useState("");
  const [sourceCount, setSourceCount] = React.useState("3");
  const [displayCount, setDisplayCount] = React.useState("2");
  const [distance, setDistance] = React.useState("15");
  const [usbNeeds, setUsbNeeds] = React.useState(true);
  const [networkReady, setNetworkReady] = React.useState(false);
  const [futureExpansion, setFutureExpansion] = React.useState(false);
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    const discovery = activeProject?.discovery;
    const nextRoom = findBestRoomTemplateForProject(activeProject) ?? inferredRoom;

    setSelectedRoomId(nextRoom?.id ?? DEFAULT_ROOM_TEMPLATE_ID);
    setCustomer(discovery?.customer ?? activeProject?.customer ?? "");
    setSite(discovery?.site ?? activeProject?.site ?? "");
    setRoomName(discovery?.roomName ?? activeProject?.roomName ?? nextRoom?.roomType ?? "");
    setSourceCount(discovery?.sourceCount ?? String(nextRoom?.ioProfile.sourceCount ?? 3));
    setDisplayCount(discovery?.displayCount ?? String(nextRoom?.ioProfile.displayCount ?? 2));
    setDistance(discovery?.cableDistanceM ?? "15");
    setUsbNeeds(/yes|usb|byod|byom|ready/i.test(discovery?.usbNeeds ?? ""));
    setNetworkReady(/managed|ready|yes/i.test(discovery?.networkEnvironment ?? ""));
    setFutureExpansion(/future|expand|yes/i.test(discovery?.controlNeeds ?? ""));
    setNotes(discovery?.notes ?? activeProject?.notes ?? "");
  }, [activeProject?.id, inferredRoom]);

  const selectedRoom = React.useMemo(
    () => findRoomTemplateById(selectedRoomId) ?? inferredRoom ?? ROOM_TEMPLATE_LIBRARY[0],
    [inferredRoom, selectedRoomId],
  );

  const roomMatches = React.useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return ROOM_TEMPLATE_LIBRARY.filter((template) => {
      const matchesCategory = roomCategory === "All Rooms" || template.category === roomCategory;
      const matchesQuery = !query || roomSearchBlob(template).includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [deferredSearch, roomCategory]);

  const guidance = React.useMemo(() => buildRoomWorkflowGuidance({
    room: selectedRoom,
    sourceCount: Number(sourceCount) || selectedRoom.ioProfile.sourceCount,
    displayCount: Number(displayCount) || selectedRoom.ioProfile.displayCount,
    distanceM: Number(distance) || 0,
    usbNeeds,
    networkReady,
    futureExpansion,
  }), [displayCount, distance, futureExpansion, networkReady, selectedRoom, sourceCount, usbNeeds]);

  const linkedFamilies = React.useMemo(
    () => deriveRoomTemplateFamilies(activeProject, selectedRoom),
    [activeProject, selectedRoom],
  );
  const highlightedFamilySet = React.useMemo(
    () => new Set(guidance.recommendedFamilies.map((family) => family.toLowerCase())),
    [guidance.recommendedFamilies],
  );
  const projectStatusNote = activeProject
    ? `Saving to ${activeProject.name || "active project"}${activeProject.updatedAt ? ` • Updated ${formatDateTime(activeProject.updatedAt)}` : ""}`
    : "No active project yet. The first save will create one and keep the discovery assumptions attached.";

  function persistAndNavigate(route: string) {
    const nextProject = ensureActiveProject({
      name:
        tidy(activeProject?.name) && tidy(activeProject?.name) !== "New Project"
          ? activeProject?.name
          : `${selectedRoom.roomType} Project`,
      customer: tidy(customer) || activeProject?.customer || "",
      site: tidy(site) || activeProject?.site || "",
      roomName: tidy(roomName) || selectedRoom.roomType,
      stage: "Discovery",
      status: activeProject?.status || "Draft",
      notes: tidy(notes) || activeProject?.notes || "",
    });

    setActiveProjectId(nextProject.id);

    updateProjectDiscovery(nextProject.id, {
      customer: tidy(customer) || nextProject.customer,
      site: tidy(site) || nextProject.site,
      roomName: tidy(roomName) || selectedRoom.roomType,
      workflowTrack: selectedRoom.roomType,
      projectScope: guidance.complexityLabel,
      customerOutcome: guidance.architectureSummary,
      switchSolutionType: selectedRoom.roomType,
      matrixIoPreset: `${numberText(sourceCount, String(selectedRoom.ioProfile.sourceCount))}x${numberText(displayCount, String(selectedRoom.ioProfile.displayCount))}`,
      featureRequirements: guidance.signalSummary.join(" | "),
      applicationType: selectedRoom.roomType,
      displayCount: numberText(displayCount, String(selectedRoom.ioProfile.displayCount)),
      sourceCount: numberText(sourceCount, String(selectedRoom.ioProfile.sourceCount)),
      sourceTypes: selectedRoom.sourceTypes.join(", "),
      outputBehaviour: selectedRoom.ioProfile.outputs,
      cableDistanceM: tidy(distance),
      transportDistanceBand: distanceBand(Number(distance) || 0),
      transportCableType: guidance.transportSummary,
      usbNeeds: yesNo(usbNeeds),
      networkEnvironment: networkReady ? "Managed AV network available" : "Network not confirmed",
      controlNeeds: futureExpansion ? "Future expansion expected" : "Current scope only",
      notes: tidy(notes) || nextProject.notes || selectedRoom.summary,
      recommendedFamilies: guidance.recommendedFamilies,
      recommendedNextTool: route,
      createdAt: nextProject.discovery?.createdAt ?? new Date().toISOString(),
    });

    navigate(route);
  }

  return (
    <div className="wm-discovery-page">
      <section className="wm-discovery-page__hero">
        <div className="wm-discovery-page__hero-copy">
          <div className="wm-discovery-page__eyebrow">Discovery</div>
          <h1>Capture the room, confirm the few inputs that change the design, and move on.</h1>
          <p>
            Discovery stays lean so the form and the recommended next workspace stay in focus.
          </p>

          <div className="wm-discovery-page__hero-actions">
            <button
              type="button"
              className="wm-btn-primary"
              onClick={() => persistAndNavigate(guidance.primaryRoute)}
            >
              Save and open {getRouteLabel(guidance.primaryRoute)}
              <ArrowRight size={16} />
            </button>
            <Link to={WM_ROUTES.templates} className="wm-btn-secondary">
              Open Templates
            </Link>
          </div>

          <p className="wm-discovery-page__hero-note">{projectStatusNote}</p>
        </div>

        <div className="wm-discovery-page__hero-metrics">
          <div className="wm-discovery-page__metric">
            <span>Room</span>
            <strong>{selectedRoom.roomType}</strong>
          </div>
          <div className="wm-discovery-page__metric">
            <span>Next tool</span>
            <strong>{getRouteLabel(guidance.primaryRoute)}</strong>
          </div>
          <div className="wm-discovery-page__metric">
            <span>Families</span>
            <strong>{guidance.recommendedFamilies.length}</strong>
          </div>
          <div className="wm-discovery-page__metric">
            <span>Complexity</span>
            <strong>{guidance.complexityLabel}</strong>
          </div>
        </div>
      </section>

      <div className="wm-discovery-page__layout">
        <aside className="wm-discovery-page__sidebar">
          <section className="wm-discovery-page__panel wm-discovery-page__panel--sidebar">
            <div className="wm-discovery-page__section-head">
              <div>
                <div className="wm-discovery-page__section-eyebrow">Step 1</div>
                <h2>Choose room type</h2>
                <p>Start from the closest room baseline.</p>
              </div>
            </div>

            <div className="wm-discovery-page__chip-row">
              {ROOM_TEMPLATE_CATEGORY_ORDER.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`wm-discovery-page__filter-chip${roomCategory === category ? " is-active" : ""}`}
                  onClick={() => setRoomCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <label className="wm-discovery-page__search">
              <Search size={16} />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search room type or venue"
              />
            </label>

            <div className="wm-discovery-page__room-list">
              {roomMatches.map((room) => (
                <RoomCard
                  key={room.id}
                  active={room.id === selectedRoom.id}
                  room={room}
                  onSelect={setSelectedRoomId}
                />
              ))}
            </div>
          </section>
        </aside>

        <main className="wm-discovery-page__main">
          <section className="wm-discovery-page__panel wm-discovery-page__panel--feature">
            <div className="wm-discovery-page__section-head">
              <div>
                <div className="wm-discovery-page__section-eyebrow">Selected room</div>
                <h2>{selectedRoom.roomType}</h2>
                <p>{selectedRoom.summary}</p>
              </div>
            </div>

            <div className="wm-discovery-page__assumption-grid">
              <div className="wm-discovery-page__assumption-card">
                <span>Inputs</span>
                <strong>{selectedRoom.ioProfile.sources}</strong>
              </div>
              <div className="wm-discovery-page__assumption-card">
                <span>Outputs</span>
                <strong>{selectedRoom.ioProfile.outputs}</strong>
              </div>
              <div className="wm-discovery-page__assumption-card">
                <span>Transport</span>
                <strong>{selectedRoom.transportProfile}</strong>
              </div>
              <div className="wm-discovery-page__assumption-card">
                <span>Operators</span>
                <strong>{selectedRoom.ioProfile.operators}</strong>
              </div>
            </div>
          </section>

          <section className="wm-discovery-page__panel wm-discovery-page__panel--form">
            <div className="wm-discovery-page__section-head">
              <div>
                <div className="wm-discovery-page__section-eyebrow">Step 2</div>
                <h2>Capture the few assumptions that change the design</h2>
                <p>These inputs materially affect architecture, families, and the next tool.</p>
              </div>
            </div>

            <div className="wm-discovery-page__form-grid">
              <label className="wm-discovery-page__field">
                <span>Customer</span>
                <input
                  type="text"
                  value={customer}
                  onChange={(event) => setCustomer(event.target.value)}
                  placeholder="Customer or end user"
                />
              </label>

              <label className="wm-discovery-page__field">
                <span>Site</span>
                <input
                  type="text"
                  value={site}
                  onChange={(event) => setSite(event.target.value)}
                  placeholder="Site or location"
                />
              </label>

              <label className="wm-discovery-page__field">
                <span>Room label</span>
                <input
                  type="text"
                  value={roomName}
                  onChange={(event) => setRoomName(event.target.value)}
                  placeholder={selectedRoom.roomType}
                />
              </label>

              <label className="wm-discovery-page__field">
                <span>Presentation sources</span>
                <input
                  type="number"
                  min="1"
                  value={sourceCount}
                  onChange={(event) => setSourceCount(event.target.value)}
                />
              </label>

              <label className="wm-discovery-page__field">
                <span>Displays or output zones</span>
                <input
                  type="number"
                  min="1"
                  value={displayCount}
                  onChange={(event) => setDisplayCount(event.target.value)}
                />
              </label>

              <label className="wm-discovery-page__field">
                <span>Longest run (m)</span>
                <input
                  type="number"
                  min="0"
                  value={distance}
                  onChange={(event) => setDistance(event.target.value)}
                />
              </label>
            </div>

            <div className="wm-discovery-page__toggle-grid">
              <ToggleRow label="USB or BYOD workflow matters" value={usbNeeds} onChange={setUsbNeeds} />
              <ToggleRow label="Managed network is available" value={networkReady} onChange={setNetworkReady} />
              <ToggleRow label="Future expansion is likely" value={futureExpansion} onChange={setFutureExpansion} />
            </div>

            <label className="wm-discovery-page__field">
              <span>Discovery notes</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Capture what the client is trying to achieve, what is unclear, and what must not be missed."
              />
            </label>
          </section>
        </main>

        <aside className="wm-discovery-page__detail-rail">
          <section className="wm-discovery-page__panel wm-discovery-page__detail-panel">
            <div className="wm-discovery-page__section-head">
              <div>
                <div className="wm-discovery-page__section-eyebrow">Step 3</div>
                <h2>Current fit</h2>
                <p>{guidance.architectureSummary}</p>
              </div>
            </div>

            <div className="wm-discovery-page__detail-grid">
              <div className="wm-discovery-page__detail-card">
                <span>Primary next tool</span>
                <strong>{getRouteLabel(guidance.primaryRoute)}</strong>
              </div>
              <div className="wm-discovery-page__detail-card">
                <span>Alternate path</span>
                <strong>{getRouteLabel(guidance.secondaryRoute)}</strong>
              </div>
              <div className="wm-discovery-page__detail-card">
                <span>Complexity</span>
                <strong>{guidance.complexityLabel}</strong>
              </div>
              <div className="wm-discovery-page__detail-card">
                <span>Distance band</span>
                <strong>{distanceBand(Number(distance) || 0)}</strong>
              </div>
            </div>

            <div className="wm-discovery-page__detail-block">
              <span>Recommended families</span>
              <div className="wm-discovery-page__chip-row">
                {guidance.recommendedFamilies.map((family) => (
                  <span key={`family-${family}`} className="wm-discovery-page__chip wm-discovery-page__chip--accent">
                    {family}
                  </span>
                ))}
                {linkedFamilies
                  .filter((family) => !highlightedFamilySet.has(family.toLowerCase()))
                  .map((family) => (
                    <span key={`linked-${family}`} className="wm-discovery-page__chip">
                      {family}
                    </span>
                  ))}
              </div>
            </div>

            <div className="wm-discovery-page__detail-block">
              <span>Why</span>
              <p>{guidance.transportSummary}</p>
              <div className="wm-discovery-page__chip-row">
                {guidance.signalSummary.map((item) => (
                  <span key={`signal-${item}`} className="wm-discovery-page__chip">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="wm-discovery-page__detail-actions">
              <button
                type="button"
                className="wm-btn-primary"
                onClick={() => persistAndNavigate(guidance.primaryRoute)}
              >
                Save and open {getRouteLabel(guidance.primaryRoute)}
              </button>
              <button
                type="button"
                className="wm-btn-secondary"
                onClick={() => persistAndNavigate(guidance.secondaryRoute)}
              >
                Save and open {getRouteLabel(guidance.secondaryRoute)}
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
