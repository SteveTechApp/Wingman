import * as React from "react";
import { ArrowRight, Search } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  buildReadinessLabel,
  buildRoomWorkflowGuidance,
  findIntakeStartPath,
  getRouteLabel,
  INTAKE_START_PATHS,
  recommendImportRoutes,
  type IntakeStartPath,
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
import "./import-intake-page.css";

type RoomCategoryFilter = "All Rooms" | RoomTemplateCategory;

const PRIORITY_OPTIONS = ["Standard", "High priority", "Urgent"] as const;

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const text = tidy(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }

  return out;
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

function PathCard(props: {
  active: boolean;
  path: IntakeStartPath;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className={`wm-import-page__path-card${props.active ? " is-active" : ""}`}
      onClick={() => props.onSelect(props.path.id)}
    >
      <span className="wm-import-page__path-meta">{props.path.bias}</span>
      <strong>{props.path.label}</strong>
      <span>{props.path.summary}</span>
      <div className="wm-import-page__chip-row">
        {props.path.families.map((family) => (
          <span key={`${props.path.id}-${family}`} className="wm-import-page__chip">
            {family}
          </span>
        ))}
      </div>
    </button>
  );
}

function RoomCard(props: {
  active: boolean;
  room: RoomTemplateScenario;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className={`wm-import-page__room-card${props.active ? " is-active" : ""}`}
      onClick={() => props.onSelect(props.room.id)}
    >
      <span className="wm-import-page__room-meta">
        {props.room.category} | {props.room.vertical}
      </span>
      <strong>{props.room.roomType}</strong>
      <span>{props.room.summary}</span>
    </button>
  );
}

export default function ImportIntakePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeProject = React.useSyncExternalStore(subscribeProjects, getActiveProject, () => undefined);
  const inferredRoom = React.useMemo(
    () => findBestRoomTemplateForProject(activeProject) ?? findRoomTemplateById(DEFAULT_ROOM_TEMPLATE_ID),
    [activeProject],
  );
  const [roomCategory, setRoomCategory] = React.useState<RoomCategoryFilter>("All Rooms");
  const [roomSearch, setRoomSearch] = React.useState("");
  const deferredRoomSearch = React.useDeferredValue(roomSearch);
  const [selectedRoomId, setSelectedRoomId] = React.useState(inferredRoom?.id ?? DEFAULT_ROOM_TEMPLATE_ID);
  const [customerName, setCustomerName] = React.useState("");
  const [projectName, setProjectName] = React.useState("");
  const [site, setSite] = React.useState("");
  const [inputText, setInputText] = React.useState("");
  const [priority, setPriority] = React.useState<(typeof PRIORITY_OPTIONS)[number]>("Standard");

  React.useEffect(() => {
    setCustomerName(activeProject?.customer ?? "");
    setProjectName(activeProject?.name && activeProject.name !== "New Project" ? activeProject.name : "");
    setSite(activeProject?.site ?? "");
    setInputText(activeProject?.discovery?.notes ?? activeProject?.notes ?? "");
    setSelectedRoomId((findBestRoomTemplateForProject(activeProject) ?? inferredRoom)?.id ?? DEFAULT_ROOM_TEMPLATE_ID);
  }, [activeProject, inferredRoom]);

  const selectedPath = React.useMemo(
    () => findIntakeStartPath(searchParams.get("path")) ?? INTAKE_START_PATHS[0],
    [searchParams],
  );
  const selectedRoom = React.useMemo(
    () => findRoomTemplateById(selectedRoomId) ?? inferredRoom ?? ROOM_TEMPLATE_LIBRARY[0],
    [inferredRoom, selectedRoomId],
  );
  const readiness = buildReadinessLabel(inputText.trim().length);
  const guidance = React.useMemo(() => buildRoomWorkflowGuidance({
    room: selectedRoom,
    sourceCount: selectedRoom.ioProfile.sourceCount,
    displayCount: selectedRoom.ioProfile.displayCount,
    distanceM: 15,
    usbNeeds: /usb|byod|byom|uc/i.test([
      selectedRoom.summary,
      selectedRoom.story,
      selectedRoom.roomType,
      selectedRoom.sourceTypes.join(" "),
      selectedRoom.controlProfile,
    ].join(" ")),
    networkReady: selectedPath.bias === "validation" || selectedRoom.recommendedFamilies.includes("AVoIP"),
    futureExpansion: selectedRoom.ioProfile.displayCount >= 4 || selectedPath.bias === "guided",
  }), [selectedPath.bias, selectedRoom]);
  const routeRecommendation = React.useMemo(
    () => recommendImportRoutes({ path: selectedPath, readiness, guidance }),
    [guidance, readiness, selectedPath],
  );
  const linkedFamilies = React.useMemo(
    () => dedupe([
      ...deriveRoomTemplateFamilies(activeProject, selectedRoom),
      ...selectedPath.families,
      ...guidance.recommendedFamilies,
    ]),
    [activeProject, guidance.recommendedFamilies, selectedPath.families, selectedRoom],
  );
  const saveStatusNote = activeProject
    ? `Saving into ${activeProject.name || "the active project"} with ${priority.toLowerCase()} priority.`
    : "No active project yet. The first save will create one and attach the imported brief.";

  const roomMatches = React.useMemo(() => {
    const query = deferredRoomSearch.trim().toLowerCase();
    return ROOM_TEMPLATE_LIBRARY.filter((template) => {
      const matchesCategory = roomCategory === "All Rooms" || template.category === roomCategory;
      const matchesQuery = !query || roomSearchBlob(template).includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [deferredRoomSearch, roomCategory]);

  function handleSelectPath(id: string) {
    setSearchParams({ path: id });
  }

  function persistAndNavigate(route: string) {
    const nextProject = ensureActiveProject({
      name:
        tidy(projectName) ||
        (tidy(activeProject?.name) && tidy(activeProject?.name) !== "New Project"
          ? activeProject?.name
          : `${selectedRoom.roomType} Opportunity`),
      customer: tidy(customerName) || activeProject?.customer || "",
      site: tidy(site) || activeProject?.site || "",
      roomName: selectedRoom.roomType,
      stage: "Discovery",
      status: activeProject?.status || "Draft",
      notes: tidy(inputText) || activeProject?.notes || "",
    });

    setActiveProjectId(nextProject.id);

    updateProjectDiscovery(nextProject.id, {
      customer: tidy(customerName) || nextProject.customer,
      site: tidy(site) || nextProject.site,
      roomName: selectedRoom.roomType,
      workflowTrack: `Import intake / ${selectedPath.label}`,
      projectScope: readiness,
      customerOutcome: routeRecommendation.reasoning,
      sourceTypes: selectedPath.sourceLabel,
      applicationType: selectedRoom.roomType,
      sourceCount: String(selectedRoom.ioProfile.sourceCount),
      displayCount: String(selectedRoom.ioProfile.displayCount),
      outputBehaviour: selectedRoom.ioProfile.outputs,
      featureRequirements: guidance.signalSummary.join(" | "),
      urgency: priority,
      notes: tidy(inputText) || nextProject.notes || selectedRoom.summary,
      recommendedFamilies: guidance.recommendedFamilies,
      recommendedNextTool: route,
      createdAt: nextProject.discovery?.createdAt ?? new Date().toISOString(),
    });

    navigate(route);
  }

  return (
    <div className="wm-import-page">
      <section className="wm-import-page__hero">
        <div className="wm-import-page__hero-copy">
          <div className="wm-import-page__eyebrow">Import Intake</div>
          <h1>Drop in the brief, anchor it to the right room, and route it forward quickly.</h1>
          <p>
            Import stays lean so the brief, room choice, and next step do the talking.
          </p>

          <div className="wm-import-page__hero-actions">
            <button
              type="button"
              className="wm-btn-primary"
              onClick={() => persistAndNavigate(routeRecommendation.primaryRoute)}
            >
              Save and open {getRouteLabel(routeRecommendation.primaryRoute)}
              <ArrowRight size={16} />
            </button>
            <Link to={WM_ROUTES.discovery} className="wm-btn-secondary">
              Open Discovery
            </Link>
          </div>

          <p className="wm-import-page__hero-note">{saveStatusNote}</p>
        </div>

        <div className="wm-import-page__hero-metrics">
          <div className="wm-import-page__metric">
            <span>Readiness</span>
            <strong>{readiness}</strong>
          </div>
          <div className="wm-import-page__metric">
            <span>Selected room</span>
            <strong>{selectedRoom.roomType}</strong>
          </div>
          <div className="wm-import-page__metric">
            <span>Next tool</span>
            <strong>{getRouteLabel(routeRecommendation.primaryRoute)}</strong>
          </div>
          <div className="wm-import-page__metric">
            <span>Current project</span>
            <strong>{activeProject?.name || "Not attached"}</strong>
          </div>
        </div>
      </section>

      <div className="wm-import-page__layout">
        <aside className="wm-import-page__sidebar">
          <section className="wm-import-page__panel wm-import-page__panel--sidebar">
            <div className="wm-import-page__section-head">
              <div>
                <div className="wm-import-page__section-eyebrow">Step 1</div>
                <h2>Choose how the opportunity is arriving</h2>
                <p>Pick the clearest starting material.</p>
              </div>
            </div>

            <div className="wm-import-page__path-list">
              {INTAKE_START_PATHS.map((path) => (
                <PathCard
                  key={path.id}
                  active={path.id === selectedPath.id}
                  path={path}
                  onSelect={handleSelectPath}
                />
              ))}
            </div>
          </section>
        </aside>

        <main className="wm-import-page__main">
          <section className="wm-import-page__panel wm-import-page__panel--feature">
            <div className="wm-import-page__section-head">
              <div>
                <div className="wm-import-page__section-eyebrow">Selected intake path</div>
                <h2>{selectedPath.label}</h2>
                <p>{selectedPath.summary}</p>
              </div>
            </div>

            <div className="wm-import-page__chip-row">
              {linkedFamilies.map((family) => (
                <span key={`linked-family-${family}`} className="wm-import-page__chip wm-import-page__chip--accent">
                  {family}
                </span>
              ))}
            </div>
          </section>

          <section className="wm-import-page__panel">
            <div className="wm-import-page__section-head">
              <div>
                <div className="wm-import-page__section-eyebrow">Step 2</div>
                <h2>Choose the likely room type</h2>
                <p>Keep the brief tied to a real AV application.</p>
              </div>
            </div>

            <div className="wm-import-page__chip-row">
              {ROOM_TEMPLATE_CATEGORY_ORDER.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`wm-import-page__filter-chip${roomCategory === category ? " is-active" : ""}`}
                  onClick={() => setRoomCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <label className="wm-import-page__search">
              <Search size={16} />
              <input
                type="search"
                value={roomSearch}
                onChange={(event) => setRoomSearch(event.target.value)}
                placeholder="Search room type or venue"
              />
            </label>

            <div className="wm-import-page__room-grid">
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

          <section className="wm-import-page__panel wm-import-page__panel--form">
            <div className="wm-import-page__section-head">
              <div>
                <div className="wm-import-page__section-eyebrow">Step 3</div>
                <h2>Capture only the context you need</h2>
                <p>Once this is attached properly, Discovery and the room tools can take over.</p>
              </div>
            </div>

            <div className="wm-import-page__form-grid">
              <label className="wm-import-page__field">
                <span>Customer</span>
                <input
                  type="text"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Customer or end user"
                />
              </label>

              <label className="wm-import-page__field">
                <span>Project name</span>
                <input
                  type="text"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder={`${selectedRoom.roomType} Opportunity`}
                />
              </label>

              <label className="wm-import-page__field">
                <span>Site</span>
                <input
                  type="text"
                  value={site}
                  onChange={(event) => setSite(event.target.value)}
                  placeholder="Site or location"
                />
              </label>

              <label className="wm-import-page__field wm-import-page__field--wide">
                <span>Priority</span>
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as (typeof PRIORITY_OPTIONS)[number])}
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="wm-import-page__field">
              <span>Brief, notes, or pasted summary</span>
              <textarea
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                placeholder="Paste the customer email, consultant brief summary, survey notes, or opportunity description here."
              />
            </label>
          </section>
        </main>

        <aside className="wm-import-page__detail-rail">
          <section className="wm-import-page__panel wm-import-page__detail-panel">
            <div className="wm-import-page__section-head">
              <div>
                <div className="wm-import-page__section-eyebrow">Save preview</div>
                <h2>Current intake readout</h2>
                <p>{routeRecommendation.reasoning}</p>
              </div>
            </div>

            <div className="wm-import-page__detail-grid">
              <div className="wm-import-page__detail-card">
                <span>Primary next tool</span>
                <strong>{getRouteLabel(routeRecommendation.primaryRoute)}</strong>
              </div>
              <div className="wm-import-page__detail-card">
                <span>Alternate path</span>
                <strong>{getRouteLabel(routeRecommendation.secondaryRoute)}</strong>
              </div>
              <div className="wm-import-page__detail-card">
                <span>Readiness</span>
                <strong>{readiness}</strong>
              </div>
              <div className="wm-import-page__detail-card">
                <span>Characters</span>
                <strong>{inputText.trim().length}</strong>
              </div>
            </div>

            <div className="wm-import-page__detail-block">
              <span>Attached room assumptions</span>
              <div className="wm-import-page__chip-row">
                {guidance.signalSummary.map((item) => (
                  <span key={`signal-${item}`} className="wm-import-page__chip">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="wm-import-page__detail-block">
              <span>What is saved</span>
              <p>
                Customer, site, selected room type, intake notes, source path, priority, recommended families,
                and the next suggested tool will all be saved into the active project.
              </p>
            </div>

            <div className="wm-import-page__detail-actions">
              <button
                type="button"
                className="wm-btn-primary"
                onClick={() => persistAndNavigate(routeRecommendation.primaryRoute)}
              >
                Save and open {getRouteLabel(routeRecommendation.primaryRoute)}
              </button>
              <button
                type="button"
                className="wm-btn-secondary"
                onClick={() => persistAndNavigate(routeRecommendation.secondaryRoute)}
              >
                Save and open {getRouteLabel(routeRecommendation.secondaryRoute)}
              </button>
              <Link to={WM_ROUTES.guru} className="wm-btn-secondary">
                Ask Guru
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
