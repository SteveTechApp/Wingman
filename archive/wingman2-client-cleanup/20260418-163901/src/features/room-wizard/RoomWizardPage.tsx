import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useNavigate } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  ensureActiveProject,
  getActiveProject,
  setActiveProjectId,
  subscribeProjects,
  updateProjectDiscovery,
  type DiscoveryProductFamily,
  type StoredProject,
} from "@/features/projects/projectStore";
import {
  ROOM_TEMPLATE_CATEGORY_ORDER,
  ROOM_TEMPLATE_LIBRARY,
  roomTemplateSearchBlob,
  type RoomTemplateCategory,
  type RoomTemplateScenario,
} from "@/features/templates/roomTemplateLibrary";
import "./room-wizard-page.css";

type CategoryFilter = "All Rooms" | RoomTemplateCategory;
type UsbRequirement = "Yes" | "No";

const DISCOVERY_FAMILIES = new Set<DiscoveryProductFamily>([
  "Apollo",
  "HDBaseT",
  "AVoIP",
  "Matrix",
  "USB Extension",
  "Video Wall",
]);

function isDiscoveryFamily(value: string): value is DiscoveryProductFamily {
  return DISCOVERY_FAMILIES.has(value as DiscoveryProductFamily);
}

function toolLabel(path: string): string {
  if (path === WM_ROUTES.catalog) return "Open Catalogue";
  if (path === WM_ROUTES.proposal) return "Open Proposal";
  if (path === WM_ROUTES.videowall) return "Open Video Wall Planner";
  return "Open Next Tool";
}

function scaleLabel(tier: "bronze" | "silver" | "gold"): string {
  if (tier === "bronze") return "Compact room";
  if (tier === "gold") return "Complex room";
  return "Balanced room";
}

function estimateDistance(template: RoomTemplateScenario): number {
  if (
    template.recommendedTool === WM_ROUTES.videowall ||
    template.recommendedFamilies.includes("Video Wall")
  ) {
    return 35;
  }

  if (template.recommendedFamilies.includes("AVoIP")) return 35;
  if (template.recommendedFamilies.includes("HDBaseT")) return 18;
  if (template.templateTier === "gold") return 18;
  if (template.templateTier === "silver") return 12;
  return 6;
}

function estimateUsbNeeds(template: RoomTemplateScenario): UsbRequirement {
  const haystack = [
    template.summary,
    template.designPurpose,
    template.audioProfile,
    template.controlProfile,
    ...template.sourceTypes,
  ]
    .join(" ")
    .toLowerCase();

  return /usb|camera|codec|uc|teams|zoom|peripheral/.test(haystack) ? "Yes" : "No";
}

function toCountString(value: unknown, fallback: number): string {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return String(numeric);
  }

  return String(fallback);
}

function resolveUsbNeeds(
  value: string | undefined,
  template: RoomTemplateScenario,
): UsbRequirement {
  if (value === "Yes") return "Yes";
  if (value === "No") return "No";
  return estimateUsbNeeds(template);
}

function matchTemplateToProject(project?: StoredProject): RoomTemplateScenario {
  const search = [
    project?.roomName,
    project?.discovery?.roomName,
    project?.discovery?.applicationType,
    project?.template?.application,
    project?.template?.summary,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  if (!search) return ROOM_TEMPLATE_LIBRARY[0]!;

  return (
    ROOM_TEMPLATE_LIBRARY.find((template) => {
      const name = template.roomType.toLowerCase();
      if (search.includes(name)) return true;
      return template.useCases.some((item) => search.includes(item.toLowerCase()));
    }) ?? ROOM_TEMPLATE_LIBRARY[0]!
  );
}

function buildRecommendedFamilies(
  template: RoomTemplateScenario,
  displays: number,
  sources: number,
  distance: number,
  usbNeeds: UsbRequirement,
): DiscoveryProductFamily[] {
  const families = new Set<DiscoveryProductFamily>(
    template.recommendedFamilies.filter(isDiscoveryFamily),
  );

  if (template.recommendedTool === WM_ROUTES.videowall || displays >= 6) {
    families.add("Video Wall");
  }

  if (displays >= 4 || distance > 30) families.add("AVoIP");
  if (sources > 3 || displays > 2) families.add("Matrix");
  if (distance >= 10 && !families.has("Video Wall")) families.add("HDBaseT");
  if (usbNeeds === "Yes") families.add("USB Extension");
  if (families.size === 0) families.add("Apollo");

  return Array.from(families);
}

function buildTransportBand(distance: number): string {
  if (distance > 30) return "30m+";
  if (distance >= 10) return "10-30m";
  return "0-10m";
}

function buildNextRoute(
  template: RoomTemplateScenario,
  families: DiscoveryProductFamily[],
  displays: number,
  sources: number,
  distance: number,
  usbNeeds: UsbRequirement,
): string {
  if (template.recommendedTool === WM_ROUTES.videowall || families.includes("Video Wall")) {
    return WM_ROUTES.videowall;
  }

  if (
    displays > 2 ||
    sources > 3 ||
    distance > 15 ||
    usbNeeds === "Yes" ||
    template.templateTier === "gold"
  ) {
    return WM_ROUTES.catalog;
  }

  return WM_ROUTES.proposal;
}

function buildArchitectureSummary(
  template: RoomTemplateScenario,
  families: DiscoveryProductFamily[],
): string {
  if (families.includes("Video Wall")) {
    return `${template.roomType} is behaving like a display-distribution problem first, so keep processor and wall-management decisions near the front of the workflow.`;
  }

  if (families.includes("AVoIP")) {
    return `${template.roomType} now needs scalable routing and distribution, which is pushing the design toward an AVoIP-led architecture.`;
  }

  if (families.includes("Matrix")) {
    return `${template.roomType} needs more source and display flexibility than a basic switcher can comfortably carry, so matrix-style thinking should stay in scope.`;
  }

  return `${template.roomType} still looks like a focused room workflow, so a simpler switching and transport path can stay commercially clean.`;
}

function buildTransportSummary(
  template: RoomTemplateScenario,
  families: DiscoveryProductFamily[],
  distance: number,
): string {
  if (families.includes("Video Wall")) {
    return "Treat signal management, processor placement, and display grouping as the key transport decisions before product selection.";
  }

  if (distance > 30 || families.includes("AVoIP")) {
    return "Cable runs and routing flexibility now suggest AVoIP or a similarly scalable transport layer should be treated as the baseline.";
  }

  if (distance >= 10 || families.includes("HDBaseT")) {
    return "Installed transport matters here, so lock down extender strategy and cable assumptions before finishing the hardware shortlist.";
  }

  return `${template.transportProfile} The transport layer can stay straightforward as long as the room does not grow in scope.`;
}

function buildOperatorSummary(
  template: RoomTemplateScenario,
  usbNeeds: UsbRequirement,
): string {
  if (usbNeeds === "Yes") {
    return `${template.controlProfile} Keep USB host flow and peripheral handoff visible in the design conversation.`;
  }

  return `${template.controlProfile} USB transport is not leading the decision, so the operating model can stay simpler.`;
}

function buildAlternateRoute(nextRoute: string, template: RoomTemplateScenario): string {
  if (nextRoute === WM_ROUTES.videowall) return WM_ROUTES.catalog;
  if (nextRoute === WM_ROUTES.catalog) return WM_ROUTES.proposal;
  if (template.recommendedTool === WM_ROUTES.videowall) return WM_ROUTES.videowall;
  return WM_ROUTES.catalog;
}

export default function RoomWizardPage() {
  const navigate = useNavigate();
  const project = useSyncExternalStore(subscribeProjects, getActiveProject, () => undefined);
  const projectTemplate = useMemo(() => matchTemplateToProject(project), [project]);
  const [category, setCategory] = useState<CategoryFilter>("All Rooms");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(projectTemplate.id);
  const [displayCount, setDisplayCount] = useState(() =>
    toCountString(project?.discovery?.displayCount, projectTemplate.ioProfile.displayCount),
  );
  const [sourceCount, setSourceCount] = useState(() =>
    toCountString(project?.discovery?.sourceCount, projectTemplate.ioProfile.sourceCount),
  );
  const [distance, setDistance] = useState(() =>
    toCountString(project?.discovery?.cableDistanceM, estimateDistance(projectTemplate)),
  );
  const [usbNeeds, setUsbNeeds] = useState<UsbRequirement>(
    resolveUsbNeeds(project?.discovery?.usbNeeds, projectTemplate),
  );
  const [notes, setNotes] = useState(project?.discovery?.notes ?? project?.notes ?? "");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  useEffect(() => {
    const nextTemplate = matchTemplateToProject(project);
    setSelectedId(nextTemplate.id);
    setDisplayCount(
      toCountString(project?.discovery?.displayCount, nextTemplate.ioProfile.displayCount),
    );
    setSourceCount(
      toCountString(project?.discovery?.sourceCount, nextTemplate.ioProfile.sourceCount),
    );
    setDistance(
      toCountString(project?.discovery?.cableDistanceM, estimateDistance(nextTemplate)),
    );
    setUsbNeeds(resolveUsbNeeds(project?.discovery?.usbNeeds, nextTemplate));
    setNotes(project?.discovery?.notes ?? project?.notes ?? "");
  }, [project]);

  const visibleTemplates = useMemo(() => {
    return ROOM_TEMPLATE_LIBRARY.filter((template) => {
      if (category !== "All Rooms" && template.category !== category) {
        return false;
      }

      if (!deferredQuery) return true;
      return roomTemplateSearchBlob(template).includes(deferredQuery);
    });
  }, [category, deferredQuery]);

  useEffect(() => {
    if (!selectedId) return;
    if (!visibleTemplates.some((template) => template.id === selectedId)) {
      setSelectedId("");
    }
  }, [selectedId, visibleTemplates]);

  const activeTemplate =
    visibleTemplates.find((template) => template.id === selectedId) ??
    ROOM_TEMPLATE_LIBRARY.find((template) => template.id === selectedId) ??
    null;

  function applyRoomStarter(template: RoomTemplateScenario) {
    setSelectedId(template.id);
    setDisplayCount(String(template.ioProfile.displayCount));
    setSourceCount(String(template.ioProfile.sourceCount));
    setDistance(String(estimateDistance(template)));
    setUsbNeeds(estimateUsbNeeds(template));
  }

  const recommendation = useMemo(() => {
    if (!activeTemplate) return null;

    const displays = Math.max(0, Number(displayCount) || 0);
    const sources = Math.max(0, Number(sourceCount) || 0);
    const longestRun = Math.max(0, Number(distance) || 0);
    const recommendedFamilies = buildRecommendedFamilies(
      activeTemplate,
      displays,
      sources,
      longestRun,
      usbNeeds,
    );
    const nextRoute = buildNextRoute(
      activeTemplate,
      recommendedFamilies,
      displays,
      sources,
      longestRun,
      usbNeeds,
    );

    return {
      displays,
      sources,
      longestRun,
      transportBand: buildTransportBand(longestRun),
      recommendedFamilies,
      nextRoute,
      architecture: buildArchitectureSummary(activeTemplate, recommendedFamilies),
      transport: buildTransportSummary(activeTemplate, recommendedFamilies, longestRun),
      operatorModel: buildOperatorSummary(activeTemplate, usbNeeds),
    };
  }, [activeTemplate, displayCount, distance, sourceCount, usbNeeds]);

  function saveAndOpen(route: string) {
    if (!activeTemplate || !recommendation) return;

    const existing = getActiveProject();
    const trimmedNotes = notes.trim();
    const nextName =
      existing?.name?.trim() && existing.name.trim() !== "New Project"
        ? existing.name.trim()
        : `${activeTemplate.roomType} Project`;
    const nextCustomer = existing?.customer?.trim() || "";
    const nextNotes = trimmedNotes || existing?.notes?.trim() || activeTemplate.story;

    const nextProject = ensureActiveProject({
      name: nextName,
      customer: nextCustomer,
      roomName: activeTemplate.roomType,
      stage: "Discovery",
      status: "Draft",
      notes: nextNotes,
    });

    setActiveProjectId(nextProject.id);
    updateProjectDiscovery(nextProject.id, {
      customer: nextCustomer,
      roomName: activeTemplate.roomType,
      workflowTrack: `Room Wizard / ${activeTemplate.roomType}`,
      applicationType: activeTemplate.roomType,
      displayCount: String(recommendation.displays),
      sourceCount: String(recommendation.sources),
      cableDistanceM: String(recommendation.longestRun),
      transportDistanceBand: recommendation.transportBand,
      usbNeeds,
      audioNeeds: activeTemplate.audioProfile,
      controlNeeds: activeTemplate.controlProfile,
      projectScope: recommendation.architecture,
      customerOutcome: activeTemplate.designPurpose,
      featureRequirements: recommendation.transport,
      outputBehaviour: activeTemplate.outputTypes.join("; "),
      notes: nextNotes,
      recommendedFamilies: recommendation.recommendedFamilies,
      recommendedNextTool: route,
    });

    navigate(route);
  }

  const alternateRoute =
    activeTemplate && recommendation
      ? buildAlternateRoute(recommendation.nextRoute, activeTemplate)
      : WM_ROUTES.catalog;
  const projectStatusNote = project
    ? `Saving into ${project.name || "the active project"} and carrying the room assumptions forward.`
    : "No active project yet. Saving from here will create one and keep the room assumptions attached.";

  return (
    <div className="wm-room-wizard">
      <section className="wm-room-wizard__hero">
        <div className="wm-room-wizard__hero-copy">
          <div className="wm-room-wizard__eyebrow">Room Wizard</div>
          <h1>Choose the room, tune the few variables that matter, and keep moving.</h1>
          <p>
            Start from a real room type, confirm the assumptions that change the solution, and let Wingman point to the next workspace.
          </p>
          <p className="wm-room-wizard__hero-note">{projectStatusNote}</p>
        </div>

        <div className="wm-room-wizard__hero-meta">
          <div className="wm-room-wizard__metric">
            <span>Active project</span>
            <strong>{project?.name || "No active project"}</strong>
          </div>
          <div className="wm-room-wizard__metric">
            <span>Room starter</span>
            <strong>{activeTemplate?.roomType || "Pick one"}</strong>
          </div>
          <div className="wm-room-wizard__metric">
            <span>Recommended next move</span>
            <strong>{recommendation ? toolLabel(recommendation.nextRoute) : "Select a room"}</strong>
          </div>
        </div>
      </section>

      <section className="wm-room-wizard__workspace">
        <aside className="wm-room-wizard__browser">
          <div className="wm-room-wizard__step">
            <span className="wm-room-wizard__step-number">1</span>
            <div>
              <h2>Choose the closest room starter</h2>
              <p>
                Pick the closest room pattern first so the wizard has a credible AV baseline.
              </p>
            </div>
          </div>

          <div className="wm-room-wizard__controls">
            <label className="wm-room-wizard__search">
              <span>Search room starters</span>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Boardroom, lecture theatre, pub, sports bar..."
              />
            </label>

            <div className="wm-room-wizard__filters">
              {ROOM_TEMPLATE_CATEGORY_ORDER.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={
                    option === category
                      ? "wm-room-wizard__filter wm-room-wizard__filter--active"
                      : "wm-room-wizard__filter"
                  }
                  onClick={() => setCategory(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="wm-room-wizard__list-head">
            <span>{visibleTemplates.length} matching starters</span>
            {deferredQuery ? (
              <button type="button" onClick={() => setQuery("")}>
                Clear search
              </button>
            ) : null}
          </div>

          {visibleTemplates.length > 0 ? (
            <div className="wm-room-wizard__list">
              {visibleTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={
                    template.id === activeTemplate?.id
                      ? "wm-room-wizard__list-item wm-room-wizard__list-item--active"
                      : "wm-room-wizard__list-item"
                  }
                  onClick={() => applyRoomStarter(template)}
                >
                  <div className="wm-room-wizard__list-item-top">
                    <span>{template.category}</span>
                    <span>{scaleLabel(template.templateTier)}</span>
                  </div>
                  <strong>{template.roomType}</strong>
                  <p>{template.summary}</p>
                  <div className="wm-room-wizard__list-item-meta">
                    <span>{template.ioProfile.sources}</span>
                    <span>{template.ioProfile.outputs}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="wm-room-wizard__empty">
              <h3>No room starters match that search.</h3>
              <p>Try a broader term like "meeting room", "classroom", or "sports bar".</p>
            </div>
          )}
        </aside>

        <section className="wm-room-wizard__detail">
          {activeTemplate && recommendation ? (
            <>
              <div className="wm-room-wizard__step">
                <span className="wm-room-wizard__step-number">2</span>
                <div>
                  <h2>Tune the live assumptions</h2>
                  <p>
                    Adjust only the inputs that materially change the technical direction.
                  </p>
                </div>
              </div>

              <div className="wm-room-wizard__detail-hero">
                <div className="wm-room-wizard__detail-copy">
                  <div className="wm-room-wizard__detail-kicker">
                    <span>{activeTemplate.vertical}</span>
                    <span>{scaleLabel(activeTemplate.templateTier)}</span>
                  </div>
                  <h3>{activeTemplate.roomType}</h3>
                  <p>{activeTemplate.designPurpose}</p>
                </div>

                <div className="wm-room-wizard__detail-metrics">
                  <div className="wm-room-wizard__metric">
                    <span>Inputs</span>
                    <strong>{recommendation.sources}</strong>
                  </div>
                  <div className="wm-room-wizard__metric">
                    <span>Outputs</span>
                    <strong>{recommendation.displays}</strong>
                  </div>
                  <div className="wm-room-wizard__metric">
                    <span>Distance band</span>
                    <strong>{recommendation.transportBand}</strong>
                  </div>
                  <div className="wm-room-wizard__metric">
                    <span>Next tool</span>
                    <strong>{toolLabel(recommendation.nextRoute)}</strong>
                  </div>
                </div>
              </div>

              <div className="wm-room-wizard__chip-row">
                {recommendation.recommendedFamilies.map((family) => (
                  <span key={family} className="wm-room-wizard__chip">
                    {family}
                  </span>
                ))}
              </div>

              <div className="wm-room-wizard__detail-grid">
                <section className="wm-room-wizard__panel">
                  <h4>Likely inputs</h4>
                  <ul>
                    {activeTemplate.sourceTypes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>

                <section className="wm-room-wizard__panel">
                  <h4>Likely outputs</h4>
                  <ul>
                    {activeTemplate.outputTypes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>

                <section className="wm-room-wizard__panel">
                  <h4>Baseline assumptions</h4>
                  <ul>
                    <li>{activeTemplate.transportProfile}</li>
                    <li>{activeTemplate.audioProfile}</li>
                    <li>{activeTemplate.controlProfile}</li>
                  </ul>
                </section>

                <section className="wm-room-wizard__panel">
                  <h4>Suggested system direction</h4>
                  <ul>
                    {activeTemplate.includedSystems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              </div>

              <section className="wm-room-wizard__panel wm-room-wizard__panel--wide">
                <div className="wm-room-wizard__panel-head">
                  <div>
                    <h4>Adjustment controls</h4>
                    <p>
                      Use these overrides when the real project is larger, smaller, or more collaboration-heavy than the starter.
                    </p>
                  </div>
                </div>

                <div className="wm-room-wizard__field-grid">
                  <label className="wm-room-wizard__field">
                    <span>Display count</span>
                    <input
                      type="number"
                      min="0"
                      value={displayCount}
                      onChange={(event) => setDisplayCount(event.target.value)}
                    />
                  </label>

                  <label className="wm-room-wizard__field">
                    <span>Source count</span>
                    <input
                      type="number"
                      min="0"
                      value={sourceCount}
                      onChange={(event) => setSourceCount(event.target.value)}
                    />
                  </label>

                  <label className="wm-room-wizard__field">
                    <span>Longest run (m)</span>
                    <input
                      type="number"
                      min="0"
                      value={distance}
                      onChange={(event) => setDistance(event.target.value)}
                    />
                  </label>

                  <label className="wm-room-wizard__field">
                    <span>USB in scope</span>
                    <select
                      value={usbNeeds}
                      onChange={(event) => setUsbNeeds(event.target.value as UsbRequirement)}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </label>
                </div>

                <label className="wm-room-wizard__field">
                  <span>Project notes</span>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Special control expectations, audio notes, client constraints, or installation observations."
                  />
                </label>
              </section>

              <div className="wm-room-wizard__step">
                <span className="wm-room-wizard__step-number">3</span>
                <div>
                  <h2>Follow the recommended direction</h2>
                  <p>
                    Wingman will save this room logic before opening the next workspace.
                  </p>
                </div>
              </div>

              <div className="wm-room-wizard__detail-grid">
                <section className="wm-room-wizard__panel">
                  <h4>Architecture read</h4>
                  <p>{recommendation.architecture}</p>
                </section>

                <section className="wm-room-wizard__panel">
                  <h4>Transport read</h4>
                  <p>{recommendation.transport}</p>
                </section>

                <section className="wm-room-wizard__panel">
                  <h4>Operator and USB read</h4>
                  <p>{recommendation.operatorModel}</p>
                </section>

                <section className="wm-room-wizard__panel">
                  <h4>Why this starter works</h4>
                  <p>{activeTemplate.story}</p>
                </section>
              </div>

              <div className="wm-room-wizard__actions">
                <button
                  type="button"
                  className="wm-btn-primary"
                  onClick={() => saveAndOpen(recommendation.nextRoute)}
                >
                  Save and {toolLabel(recommendation.nextRoute)}
                </button>
                <button
                  type="button"
                  className="wm-btn-secondary"
                  onClick={() => saveAndOpen(alternateRoute)}
                >
                  Save and {toolLabel(alternateRoute)}
                </button>
              </div>
            </>
          ) : (
            <div className="wm-room-wizard__empty">
              <h3>Select a room starter to continue.</h3>
              <p>
                The wizard will show the live assumptions, likely product families, and the best
                next workspace once a room type is selected.
              </p>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
