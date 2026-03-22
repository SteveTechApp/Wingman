import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  createProject,
  getActiveProject,
  subscribeProjects,
  updateProject,
  updateProjectDiscovery,
  type DiscoveryProductFamily,
  type ProjectDiscovery,
  type StoredProject,
} from "@/features/projects/projectStore";
import { designRoom, type RoomDesignerResponse } from "@/services/roomDesignerService";

const BOOTSTRAP_KEY = "wm_room_designer_bootstrap_v1";
const FAMILY_OPTIONS: DiscoveryProductFamily[] = [
  "Apollo",
  "HDBaseT",
  "AVoIP",
  "Matrix",
  "USB Extension",
  "Video Wall",
];

type Draft = {
  projectName: string;
  customer: string;
  site: string;
  roomName: string;
  applicationType: string;
  roomLengthM: string;
  roomWidthM: string;
  roomHeightM: string;
  installationPath: string;
  displayLocation: string;
  sourceLocation: string;
  rackLocation: string;
  displayCount: string;
  sourceCount: string;
  sourceTypes: string;
  outputBehaviour: string;
  sourcePlacement: string;
  sourceToRackDistanceM: string;
  rackToDisplayDistanceM: string;
  cableDistanceM: string;
  transportDistanceBand: string;
  transportCableType: string;
  sourceConnectionPath: string;
  sourceConnectionType: string;
  sourceCableType: string;
  displayConnectionPath: string;
  displayConnectionType: string;
  displayCableType: string;
  networkEnvironment: string;
  usbNeeds: string;
  audioNeeds: string;
  controlNeeds: string;
  notes: string;
};

type Field = {
  key: keyof Draft;
  label: string;
  type?: "text" | "number" | "textarea" | "select";
  placeholder?: string;
  options?: string[];
  hint?: string;
  full?: boolean;
};

function text(value: string) {
  return value.trim();
}

function num(value: string | undefined) {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function metric(value: number, suffix: string) {
  if (!Number.isFinite(value) || value <= 0) return "Not set";
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}${suffix}`;
}

function getToolLabel(path?: string) {
  if (!path) return "Guided Project";
  if (path === WM_ROUTES.roomDesigner) return "Room Designer";
  if (path === WM_ROUTES.proposals) return "Proposal Builder";
  if (path === WM_ROUTES.catalogue) return "Product Catalogue";
  if (path === WM_ROUTES.videowall) return "Video Wall Planner";
  return path.replace("/app/tools/", "").replace(/-/g, " ");
}

function makeDraft(project?: StoredProject | null): Draft {
  const discovery = project?.discovery;
  return {
    projectName: project?.name ?? "",
    customer: discovery?.customer ?? project?.customer ?? "",
    site: discovery?.site ?? project?.site ?? "",
    roomName: discovery?.roomName ?? project?.roomName ?? "",
    applicationType: discovery?.applicationType ?? "",
    roomLengthM: discovery?.roomLengthM ?? "",
    roomWidthM: discovery?.roomWidthM ?? "",
    roomHeightM: discovery?.roomHeightM ?? "",
    installationPath: discovery?.installationPath ?? "",
    displayLocation: discovery?.displayLocation ?? "",
    sourceLocation: discovery?.sourceLocation ?? "",
    rackLocation: discovery?.rackLocation ?? "",
    displayCount: discovery?.displayCount ?? "",
    sourceCount: discovery?.sourceCount ?? "",
    sourceTypes: discovery?.sourceTypes ?? "",
    outputBehaviour: discovery?.outputBehaviour ?? "",
    sourcePlacement: discovery?.sourcePlacement ?? "",
    sourceToRackDistanceM: discovery?.sourceToRackDistanceM ?? "",
    rackToDisplayDistanceM: discovery?.rackToDisplayDistanceM ?? "",
    cableDistanceM: discovery?.cableDistanceM ?? "",
    transportDistanceBand: discovery?.transportDistanceBand ?? "",
    transportCableType: discovery?.transportCableType ?? "",
    sourceConnectionPath: discovery?.sourceConnectionPath ?? "",
    sourceConnectionType: discovery?.sourceConnectionType ?? "",
    sourceCableType: discovery?.sourceCableType ?? "",
    displayConnectionPath: discovery?.displayConnectionPath ?? "",
    displayConnectionType: discovery?.displayConnectionType ?? "",
    displayCableType: discovery?.displayCableType ?? "",
    networkEnvironment: discovery?.networkEnvironment ?? "",
    usbNeeds: discovery?.usbNeeds ?? "",
    audioNeeds: discovery?.audioNeeds ?? "",
    controlNeeds: discovery?.controlNeeds ?? "",
    notes: discovery?.notes ?? project?.notes ?? "",
  };
}

function toDiscovery(draft: Draft, activeProject?: StoredProject | null): Partial<ProjectDiscovery> {
  const projectName = text(draft.projectName) || activeProject?.name || "Blank Project";
  return {
    customer: text(draft.customer),
    site: text(draft.site),
    roomName: text(draft.roomName) || projectName,
    applicationType: text(draft.applicationType),
    roomLengthM: text(draft.roomLengthM),
    roomWidthM: text(draft.roomWidthM),
    roomHeightM: text(draft.roomHeightM),
    installationPath: text(draft.installationPath),
    displayLocation: text(draft.displayLocation),
    sourceLocation: text(draft.sourceLocation),
    rackLocation: text(draft.rackLocation),
    displayCount: text(draft.displayCount),
    sourceCount: text(draft.sourceCount),
    sourceTypes: text(draft.sourceTypes),
    outputBehaviour: text(draft.outputBehaviour),
    sourcePlacement: text(draft.sourcePlacement),
    sourceToRackDistanceM: text(draft.sourceToRackDistanceM),
    rackToDisplayDistanceM: text(draft.rackToDisplayDistanceM),
    cableDistanceM: text(draft.cableDistanceM),
    transportDistanceBand: text(draft.transportDistanceBand),
    transportCableType: text(draft.transportCableType),
    sourceConnectionPath: text(draft.sourceConnectionPath),
    sourceConnectionType: text(draft.sourceConnectionType),
    sourceCableType: text(draft.sourceCableType),
    displayConnectionPath: text(draft.displayConnectionPath),
    displayConnectionType: text(draft.displayConnectionType),
    displayCableType: text(draft.displayCableType),
    networkEnvironment: text(draft.networkEnvironment),
    usbNeeds: text(draft.usbNeeds),
    audioNeeds: text(draft.audioNeeds),
    controlNeeds: text(draft.controlNeeds),
    notes: text(draft.notes),
    createdAt: activeProject?.discovery?.createdAt ?? activeProject?.createdAt ?? new Date().toISOString(),
  };
}

function normalizeFamilies(values: string[]): DiscoveryProductFamily[] {
  return values.filter((value): value is DiscoveryProductFamily =>
    FAMILY_OPTIONS.includes(value as DiscoveryProductFamily),
  );
}

function signals(draft: Draft) {
  const displayCount = Number.parseInt(draft.displayCount, 10) || 0;
  const sourceCount = Number.parseInt(draft.sourceCount, 10) || 0;
  const sourceLeg = num(draft.sourceToRackDistanceM);
  const displayLeg = num(draft.rackToDisplayDistanceM);
  const longest = Math.max(sourceLeg, displayLeg, num(draft.cableDistanceM));
  const combinedTransport = [
    draft.sourceConnectionType,
    draft.displayConnectionType,
    draft.sourceCableType,
    draft.displayCableType,
  ].join(" ").toLowerCase();
  const notes: string[] = [];

  if (longest > 30 && combinedTransport.includes("hdmi")) {
    notes.push("Direct HDMI is unlikely to stay reliable over the furthest planned run. Prefer HDBaseT, fiber, or network transport.");
  }
  if (displayLeg > 70) {
    notes.push("Rack-to-display distance is already long-haul. Lock the receiver and pathway strategy early.");
  }
  if (sourceLeg > 7 && draft.sourcePlacement.toLowerCase().includes("guest")) {
    notes.push("Guest source positions sit far from the core. A table-box or wallplate handoff is safer than loose flyleads.");
  }
  if (longest > 5 && draft.usbNeeds.toLowerCase().includes("usb")) {
    notes.push("USB reach is beyond a local patch. Include a dedicated USB extension path and host-switching plan.");
  }
  if (displayCount >= 4 && (sourceCount >= 3 || draft.outputBehaviour.toLowerCase().includes("independent"))) {
    notes.push("The endpoint count points toward matrix or AVoIP-class routing rather than simple split distribution.");
  }
  if (displayCount >= 4 && draft.networkEnvironment.toLowerCase().includes("managed")) {
    notes.push("Managed switching is available on site, which keeps AVoIP in play if flexibility matters.");
  }
  if (notes.length === 0) {
    notes.push("Capture the route distances and endpoint count, then run technology fit to narrow the transport family.");
  }

  return { displayCount, sourceCount, sourceLeg, displayLeg, longest, notes };
}

const SECTIONS: Array<{ title: string; copy: string; fields: Field[] }> = [
  {
    title: "Opportunity context",
    copy: "Set the project identity and describe the kind of room you are designing.",
    fields: [
      { key: "projectName", label: "Project name", placeholder: "e.g. Executive boardroom refresh" },
      { key: "customer", label: "Customer", placeholder: "e.g. Acme Ltd" },
      { key: "site", label: "Site", placeholder: "e.g. London HQ" },
      { key: "roomName", label: "Room or zone name", placeholder: "e.g. Main boardroom" },
      { key: "applicationType", label: "Application type", type: "select", options: ["Meeting room", "Boardroom", "Training room", "Classroom", "Control room", "Signage zone", "Video wall", "Mixed-use room"] },
    ],
  },
  {
    title: "Room envelope and device positions",
    copy: "Describe the physical space so the transport path is grounded in actual geometry.",
    fields: [
      { key: "roomLengthM", label: "Room length (m)", type: "number", placeholder: "e.g. 8.5" },
      { key: "roomWidthM", label: "Room width (m)", type: "number", placeholder: "e.g. 5.8" },
      { key: "roomHeightM", label: "Room height (m)", type: "number", placeholder: "e.g. 3.2" },
      { key: "installationPath", label: "Installation path", type: "select", options: ["Rack to display and table positions", "Rack to display only", "Local behind display", "Distributed around the room", "Mixed routed pathways"] },
      { key: "displayLocation", label: "Display location", type: "select", options: ["Front wall", "Rear wall", "Side wall", "Ceiling mounted", "Multiple walls or zones", "Central canvas"] },
      { key: "sourceLocation", label: "Source location", type: "select", options: ["Table or BYOD position", "Lectern or presenter position", "Rack or fixed cabinet", "Wallplate handoff", "Mixed user positions"] },
      { key: "rackLocation", label: "Rack or core location", type: "select", options: ["Same-room rack", "Adjacent comms room", "Remote central rack", "No central rack"] },
    ],
  },
  {
    title: "Sources, displays, and room behavior",
    copy: "Capture how many endpoints are in play and what the room actually needs to do.",
    fields: [
      { key: "displayCount", label: "Display count", type: "number", placeholder: "e.g. 2" },
      { key: "sourceCount", label: "Source count", type: "number", placeholder: "e.g. 4" },
      { key: "sourceTypes", label: "Source types", placeholder: "e.g. BYOD laptop, room PC, codec", hint: "List the actual source mix instead of only a quantity." },
      { key: "outputBehaviour", label: "Output behavior", type: "select", options: ["One source to one destination", "Mirrored outputs", "Independent switching per display", "Video wall canvas", "Network distribution"] },
      { key: "sourcePlacement", label: "Source placement", type: "select", options: ["Fixed in-room sources", "Mobile guest sources", "Mixed fixed and guest sources", "Operator-managed sources"] },
      { key: "networkEnvironment", label: "Network environment", type: "select", options: ["Dedicated AV switch required", "Managed network available", "Managed AV VLAN available", "Standalone point-to-point only", "Not confirmed yet"] },
      { key: "usbNeeds", label: "USB requirements", type: "select", options: ["None", "BYOD camera and audio", "USB host switching", "KVM or HID extension", "Mixed USB requirements"] },
      { key: "audioNeeds", label: "Audio requirements", type: "select", options: ["Display audio only", "Line out to DSP", "Microphones and DSP", "Dante or network audio", "Mixed room audio"] },
      { key: "controlNeeds", label: "Control requirements", type: "select", options: ["None", "Front-panel or app control", "Simple API or automation", "Touch panel control", "Third-party control integration"] },
    ],
  },
  {
    title: "Routing and point-to-point distances",
    copy: "Describe how signals move between source, core, and display so the transport choice matches the real route.",
    fields: [
      { key: "sourceToRackDistanceM", label: "Source to rack/core distance (m)", type: "number", placeholder: "e.g. 12", hint: "Use the practical routed distance, not the straight-line room dimension." },
      { key: "rackToDisplayDistanceM", label: "Rack/core to furthest display distance (m)", type: "number", placeholder: "e.g. 38" },
      { key: "cableDistanceM", label: "Longest point-to-point run (m)", type: "number", placeholder: "e.g. 42", hint: "Use this if another route leg is longer than the normal source/core/display path." },
      { key: "transportDistanceBand", label: "Transport distance band", type: "select", options: ["Under 10m", "10m to 30m", "30m to 70m", "70m to 100m", "100m+", "Mixed distances"] },
      { key: "transportCableType", label: "Available cabling or pathway", type: "select", options: ["Existing Cat6/Cat6A", "New Cat6A planned", "Fiber available", "HDMI-only pathway", "Mixed or not yet surveyed"] },
      { key: "sourceConnectionPath", label: "Source connection path", type: "select", options: ["Direct to rack/core", "Via table box", "Via wallplate", "Via floorbox", "Mixed paths"] },
      { key: "sourceConnectionType", label: "Source connection type", type: "select", options: ["HDMI", "USB-C", "HDMI plus USB", "HDBaseT handoff", "AVoIP or network encoder", "Fiber handoff", "Mixed transport"] },
      { key: "sourceCableType", label: "Source cable type", type: "select", options: ["Passive HDMI", "Active HDMI", "USB-C", "Cat6A", "Fiber", "Mixed cable types"] },
      { key: "displayConnectionPath", label: "Display connection path", type: "select", options: ["Direct to rack/core", "Via local receiver", "Through conduit route", "Mixed paths"] },
      { key: "displayConnectionType", label: "Display connection type", type: "select", options: ["HDMI", "HDBaseT", "AV over IP", "Fiber", "Mixed transport"] },
      { key: "displayCableType", label: "Display cable type", type: "select", options: ["Passive HDMI", "Active HDMI", "Cat6A", "Fiber", "Mixed cable types"] },
    ],
  },
  {
    title: "Assumptions and engineering notes",
    copy: "Store anything survey-driven that should shape the technology choice.",
    fields: [
      { key: "notes", label: "Engineering notes", type: "textarea", full: true, placeholder: "Include conduit constraints, risers, patch locations, display mounting notes, power limits, workflow issues, or anything else that changes the transport choice." },
    ],
  },
];

export default function RoomWizardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeProject = React.useSyncExternalStore(
    subscribeProjects,
    () => getActiveProject() ?? null,
    () => null,
  );
  const [draft, setDraft] = React.useState<Draft>(() => makeDraft(getActiveProject()));
  const [status, setStatus] = React.useState("Ready to capture the room.");
  const [error, setError] = React.useState("");
  const [designResult, setDesignResult] = React.useState<RoomDesignerResponse | null>(null);
  const [stale, setStale] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [bootstrapping, setBootstrapping] = React.useState(location.pathname === WM_ROUTES.newProject);
  const [pending, startTransition] = React.useTransition();
  const delayedDraft = React.useDeferredValue(draft);

  React.useEffect(() => {
    const bootstrap = location.pathname === WM_ROUTES.newProject;
    if (!bootstrap) {
      setBootstrapping(false);
      try {
        sessionStorage.removeItem(BOOTSTRAP_KEY);
      } catch {}
      return;
    }
    const key = location.key || "room-designer-new";
    try {
      const seen = sessionStorage.getItem(BOOTSTRAP_KEY);
      if (seen === key) {
        setBootstrapping(false);
        navigate(WM_ROUTES.roomDesigner, { replace: true });
        return;
      }
      sessionStorage.setItem(BOOTSTRAP_KEY, key);
    } catch {}
    const project = createProject({
      name: "Blank Project",
      stage: "Discovery",
      status: "Draft",
      discovery: { customer: "", site: "", roomName: "", notes: "", createdAt: new Date().toISOString() },
    });
    setDraft(makeDraft(project));
    setStatus("Blank project created. Capture the room before narrowing technology.");
    setBootstrapping(false);
    navigate(WM_ROUTES.roomDesigner, { replace: true });
  }, [location.key, location.pathname, navigate]);

  React.useEffect(() => {
    if (!activeProject?.id) return;
    setDraft(makeDraft(activeProject));
    setDesignResult(null);
    setStale(false);
    setError("");
    setStatus("Ready to capture the room.");
  }, [activeProject?.id]);

  const live = React.useMemo(() => signals(delayedDraft), [delayedDraft]);
  const roomArea = num(delayedDraft.roomLengthM) * num(delayedDraft.roomWidthM);
  const roomVolume = roomArea * num(delayedDraft.roomHeightM);
  const families = designResult?.recommendedFamilies ?? activeProject?.discovery?.recommendedFamilies ?? [];
  const skus = designResult?.suggestedSkus ?? [];
  const nextTool = designResult?.nextTool ?? activeProject?.discovery?.recommendedNextTool;
  const coreDone = [
    draft.projectName,
    draft.applicationType,
    draft.roomLengthM,
    draft.roomWidthM,
    draft.displayCount,
    draft.sourceCount,
    draft.sourceConnectionType,
    draft.displayConnectionType,
    draft.cableDistanceM,
  ].filter((value) => text(value)).length;

  function change<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setStale(Boolean(designResult || families.length > 0));
    setStatus("Unsaved changes.");
    setError("");
  }

  function renderField(field: Field) {
    const value = draft[field.key];
    const className = `wm-form-field${field.full ? " wm-form-field--full" : ""}`;

    if (field.type === "textarea") {
      return (
        <label key={String(field.key)} className={className}>
          <span className="wm-form-label">{field.label}</span>
          <textarea
            className="wm-form-textarea"
            rows={5}
            value={value}
            placeholder={field.placeholder}
            onChange={(event) => change(field.key, event.target.value)}
          />
        </label>
      );
    }

    if (field.type === "select") {
      return (
        <label key={String(field.key)} className={className}>
          <span className="wm-form-label">{field.label}</span>
          <select
            className="wm-form-input"
            value={value}
            onChange={(event) => change(field.key, event.target.value)}
          >
            <option value="">Select an option</option>
            {(field.options ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {field.hint ? <span className="wm-body-sm" style={{ opacity: 0.72 }}>{field.hint}</span> : null}
        </label>
      );
    }

    return (
      <label key={String(field.key)} className={className}>
        <span className="wm-form-label">{field.label}</span>
        <input
          className="wm-form-input"
          type={field.type === "number" ? "number" : "text"}
          inputMode={field.type === "number" ? "decimal" : undefined}
          value={value}
          placeholder={field.placeholder}
          onChange={(event) => change(field.key, event.target.value)}
        />
        {field.hint ? <span className="wm-body-sm" style={{ opacity: 0.72 }}>{field.hint}</span> : null}
      </label>
    );
  }

  async function save(runFit: boolean) {
    if (!activeProject?.id) return;
    const name = text(draft.projectName) || text(draft.roomName) || activeProject.name || "Blank Project";
    const discovery = toDiscovery({ ...draft, projectName: name, roomName: text(draft.roomName) || name }, activeProject);

    updateProject(activeProject.id, {
      name,
      customer: discovery.customer ?? "",
      site: discovery.site ?? "",
      roomName: discovery.roomName ?? name,
      notes: discovery.notes ?? "",
      status: "In Progress",
    });
    updateProjectDiscovery(activeProject.id, discovery);

    const savedAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (!runFit) {
      setStatus(`Project saved ${savedAt}.`);
      return;
    }

    setRunning(true);
    setError("");
    try {
      const result = await designRoom({
        roomId: activeProject.id,
        projectName: name,
        discovery,
      });
      updateProjectDiscovery(activeProject.id, {
        recommendedFamilies: normalizeFamilies(result.recommendedFamilies),
        recommendedNextTool: result.nextTool,
      });
      updateProject(activeProject.id, { stage: "Specify", status: "In Progress" });
      startTransition(() => setDesignResult(result));
      setStale(false);
      setStatus(`Technology fit refreshed ${savedAt}.`);
    } catch {
      setError("Technology fit could not be generated right now.");
    } finally {
      setRunning(false);
    }
  }

  if (bootstrapping) {
    return <div className="wm-page"><section className="wm-section"><h2>Preparing blank project designer</h2><p>Setting up a fresh project shell so you can capture the room from scratch.</p></section></div>;
  }

  if (!activeProject) {
    return (
      <div className="wm-page">
        <section className="wm-section">
          <h2>No active project</h2>
          <p>Start a blank designer or open the project launcher.</p>
          <div className="wm-actions-row">
            <button type="button" className="wm-btn wm-btn-primary" onClick={() => navigate(WM_ROUTES.newProject)}>
              Start Blank Designer
            </button>
            <button type="button" className="wm-btn" onClick={() => navigate(WM_ROUTES.projectLauncher)}>
              Open Project Launcher
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="wm-page wm-room-designer-page">
      <section className="wm-hero">
        <div className="wm-project-new-page__hero" style={{ display: "grid", gap: 18, padding: 18, borderRadius: 24, border: "1px solid rgba(115,231,255,0.14)", background: "radial-gradient(circle at top left, rgba(115,231,255,0.14), transparent 34%), linear-gradient(135deg, rgba(8,24,41,0.98), rgba(6,16,31,0.98))" }}>
          <div className="wm-kicker">Blank Project Designer</div>
          <div className="wm-title-xl">Capture the room before choosing the transport.</div>
          <div className="wm-page-lead" style={{ maxWidth: 900 }}>
            Build the project from physical reality: room size, device positions, I/O demand, route paths, and point-to-point distances. Wingman narrows the right technology family from those constraints.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["01 Project shell", "02 Room envelope", "03 I/O and routing", "04 Technology fit"].map((item) => (
              <span key={item} className="wm-chip">{item}</span>
            ))}
          </div>
          <div className="wm-actions-row">
            <button type="button" className="wm-btn wm-btn-primary" onClick={() => void save(true)} disabled={running}>
              <Sparkles size={16} />
              <span>{running ? "Specifying technology..." : "Specify Suitable Technology"}</span>
            </button>
            <button type="button" className="wm-btn" onClick={() => void save(false)}>Save Intake</button>
            <button type="button" className="wm-btn" onClick={() => navigate(WM_ROUTES.projectLauncher)}>Open Project Launcher</button>
          </div>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.45fr) minmax(320px, 0.75fr)", gap: 16, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 16 }}>
          {SECTIONS.map((section, index) => (
            <section key={section.title} className="wm-section">
              <div className="wm-section__head">
                <div className="wm-section__titles">
                  <div className="wm-kicker">0{index + 1} / Manual intake</div>
                  <h2>{section.title}</h2>
                  <p>{section.copy}</p>
                </div>
              </div>
              <div className="wm-form-grid">{section.fields.map(renderField)}</div>
            </section>
          ))}
        </div>

        <aside style={{ display: "grid", gap: 16, position: "sticky", top: 18 }}>
          <section className="wm-section">
            <div className="wm-section__head">
              <div className="wm-section__titles">
                <div className="wm-kicker">Live snapshot</div>
                <h2>Route-aware design status</h2>
                <p>{status}</p>
              </div>
            </div>
            {error ? <div className="wm-body-sm" style={{ color: "#ff9da5" }}>{error}</div> : null}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
              <div className="wm-work-card"><strong>{coreDone}/9</strong><div className="wm-body-sm">Core prompts</div></div>
              <div className="wm-work-card"><strong>{metric(live.longest, "m")}</strong><div className="wm-body-sm">Longest run</div></div>
              <div className="wm-work-card"><strong>{roomArea > 0 ? `${roomArea.toFixed(roomArea % 1 === 0 ? 0 : 1)}m²` : "Not set"}</strong><div className="wm-body-sm">Room area</div></div>
              <div className="wm-work-card"><strong>{roomVolume > 0 ? `${roomVolume.toFixed(roomVolume % 1 === 0 ? 0 : 1)}m³` : "Not set"}</strong><div className="wm-body-sm">Room volume</div></div>
            </div>
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {live.notes.map((note) => (
                <div key={note} className="wm-work-card" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <CheckCircle2 size={16} style={{ marginTop: 2 }} />
                  <span className="wm-body-sm">{note}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="wm-section">
            <div className="wm-section__head">
              <div className="wm-section__titles">
                <div className="wm-kicker">Technology fit</div>
                <h2>Recommended family</h2>
                <p>{stale ? "Inputs changed since the last fit. Refresh the recommendation." : "Use the latest room data to narrow the transport family."}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {families.length > 0 ? families.map((family) => <span key={family} className="wm-chip">{family}</span>) : <span className="wm-body-sm">Run technology fit to populate the recommendation.</span>}
            </div>
            {skus.length > 0 ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                {skus.map((sku) => <span key={sku} className="wm-chip">{sku}</span>)}
              </div>
            ) : null}
            {designResult ? (
              <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                <div className="wm-work-card"><strong>Cable view</strong><div className="wm-body-sm">{designResult.summary.cableSummary}</div></div>
                <div className="wm-work-card"><strong>Diagram view</strong><div className="wm-body-sm">{designResult.summary.diagramSummary}</div></div>
                <div className="wm-work-card"><strong>Commercial handoff</strong><div className="wm-body-sm">{designResult.summary.proposalSummary}</div></div>
              </div>
            ) : null}
            <div className="wm-actions-row" style={{ marginTop: 14 }}>
              <button type="button" className="wm-btn wm-btn-primary" onClick={() => void save(true)} disabled={running}>Refresh Fit</button>
              {nextTool && nextTool !== WM_ROUTES.roomDesigner ? (
                <button type="button" className="wm-btn" onClick={() => navigate(nextTool)}>
                  <span>Open {getToolLabel(nextTool)}</span>
                  <ArrowRight size={16} />
                </button>
              ) : null}
            </div>
          </section>
        </aside>
      </div>

      {(pending || running) ? <div className="wm-body-sm" style={{ marginTop: 12, opacity: 0.78 }}>Wingman is refreshing the transport recommendation from your latest room data.</div> : null}
    </div>
  );
}
