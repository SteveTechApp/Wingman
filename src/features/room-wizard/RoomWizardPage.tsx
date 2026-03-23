import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  createProject,
  getActiveProject,
  subscribeProjects,
  updateProject,
  updateProjectDiscovery,
  type DiscoveryProductFamily,
  type ProjectDiscovery,
  type ProjectDiscoveryInputDetail,
  type ProjectDiscoveryOutputDetail,
  type StoredProject,
} from "@/features/projects/projectStore";
import { buildDesignTemplateSeedFromProject } from "@/features/templates/templateProjectBuilder";
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
type CompactOption = {
  value: string;
  label: string;
};

const FLOOR_TYPE_OPTIONS = ["Fixed", "Raised"];
const CEILING_TYPE_OPTIONS = ["False", "Solid"];
const SOURCE_LOCATION_OPTIONS: CompactOption[] = [
  { value: "Central rack", label: "Central" },
  { value: "Local rack", label: "Local" },
  { value: "Desk", label: "Desk" },
  { value: "Wall", label: "Wall" },
];
const SOURCE_CONNECTION_OPTIONS: CompactOption[] = [
  { value: "HDMI", label: "HDMI" },
  { value: "USB-C", label: "USB-C" },
  { value: "HDMI plus USB", label: "HDMI+USB" },
  { value: "HDBaseT handoff", label: "HDBT" },
  { value: "AVoIP or network encoder", label: "IP" },
  { value: "Fiber handoff", label: "Fiber" },
  { value: "Mixed transport", label: "Mixed" },
];
const SOURCE_CABLE_OPTIONS: CompactOption[] = [
  { value: "Passive HDMI", label: "Passive" },
  { value: "Active HDMI", label: "Active" },
  { value: "USB-C", label: "USB-C" },
  { value: "Cat6A", label: "Cat6A" },
  { value: "Fiber", label: "Fiber" },
  { value: "Mixed cable types", label: "Mixed" },
];
const SOURCE_ROUTE_OPTIONS: CompactOption[] = [
  { value: "Direct to central rack", label: "Central" },
  { value: "Direct to local rack", label: "Local" },
  { value: "Via table box", label: "Table" },
  { value: "Via wallplate", label: "Wall" },
  { value: "Via floorbox", label: "Floor" },
  { value: "Mixed paths", label: "Mixed" },
];
const OUTPUT_TYPE_OPTIONS: CompactOption[] = [
  { value: "HDMI", label: "HDMI" },
  { value: "HDBaseT", label: "HDBT" },
  { value: "AV over IP", label: "IP" },
  { value: "Fiber", label: "Fiber" },
  { value: "USB-C", label: "USB-C" },
  { value: "Mixed transport", label: "Mixed" },
];
const DISPLAY_LOCATION_OPTIONS: CompactOption[] = [
  { value: "Front wall", label: "Front" },
  { value: "Rear wall", label: "Rear" },
  { value: "Side wall", label: "Side" },
  { value: "Ceiling mounted", label: "Ceiling" },
  { value: "Multiple walls or zones", label: "Multi" },
  { value: "Central canvas", label: "Central" },
];
const OUTPUT_ROUTE_OPTIONS: CompactOption[] = [
  { value: "Direct to display", label: "Direct" },
  { value: "Via local receiver", label: "Receiver" },
  { value: "Via local rack", label: "Local" },
  { value: "Via central rack", label: "Central" },
  { value: "Wall route", label: "Wall" },
  { value: "Ceiling route", label: "Ceiling" },
  { value: "Mixed paths", label: "Mixed" },
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
  floorType: string;
  ceilingType: string;
  rackLocation: string;
  sourceCount: string;
  displayCount: string;
  outputBehaviour: string;
  sourceToRackDistanceM: string;
  rackToDisplayDistanceM: string;
  cableDistanceM: string;
  transportDistanceBand: string;
  transportCableType: string;
  networkEnvironment: string;
  usbNeeds: string;
  audioNeeds: string;
  controlNeeds: string;
  inputDetails: ProjectDiscoveryInputDetail[];
  outputDetails: ProjectDiscoveryOutputDetail[];
  notes: string;
};

type DraftScalarKey = {
  [K in keyof Draft]: Draft[K] extends string ? K : never;
}[keyof Draft];

type Field = {
  key: DraftScalarKey;
  label: string;
  type?: "text" | "number" | "textarea" | "select";
  placeholder?: string;
  options?: string[];
  hint?: string;
  full?: boolean;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function getToolLabel(path?: string) {
  if (!path) return "Guided Project";
  if (path === WM_ROUTES.roomDesigner) return "Room Designer";
  if (path === WM_ROUTES.proposals) return "Proposal Builder";
  if (path === WM_ROUTES.catalogue) return "Product Catalogue";
  if (path === WM_ROUTES.videowall) return "Video Wall Planner";
  return path.replace("/app/tools/", "").replace(/-/g, " ");
}

function parseCount(value: string | undefined): number | null {
  const trimmed = text(value);
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
}

function emptyInputDetail(): ProjectDiscoveryInputDetail {
  return {
    sourceType: "",
    connectionType: "",
    cableType: "",
    route: "",
    sourceLocation: "",
  };
}

function emptyOutputDetail(): ProjectDiscoveryOutputDetail {
  return {
    outputType: "",
    route: "",
  };
}

function syncInputDetails(count: number, current: ProjectDiscoveryInputDetail[]): ProjectDiscoveryInputDetail[] {
  const next = current.slice(0, count);
  while (next.length < count) {
    next.push(emptyInputDetail());
  }
  return next;
}

function syncOutputDetails(count: number, current: ProjectDiscoveryOutputDetail[]): ProjectDiscoveryOutputDetail[] {
  const next = current.slice(0, count);
  while (next.length < count) {
    next.push(emptyOutputDetail());
  }
  return next;
}

function hasInputValue(detail?: ProjectDiscoveryInputDetail) {
  return Boolean(
    text(detail?.sourceType) ||
      text(detail?.connectionType) ||
      text(detail?.cableType) ||
      text(detail?.route) ||
      text(detail?.sourceLocation),
  );
}

function hasOutputValue(detail?: ProjectDiscoveryOutputDetail) {
  return Boolean(text(detail?.outputType) || text(detail?.route));
}

function uniqueTexts(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.map((value) => text(value)).filter(Boolean)));
}

function summarizeUnique(values: Array<string | undefined>, mixedLabel: string): string {
  const items = uniqueTexts(values);
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return mixedLabel;
}

function summarizeList(values: Array<string | undefined>): string {
  return uniqueTexts(values).join(", ");
}

function summarizeInstallationPath(floorType: string, ceilingType: string): string {
  const parts = [
    text(floorType) ? `${text(floorType)} floor` : "",
    text(ceilingType) ? `${text(ceilingType)} ceiling` : "",
  ].filter(Boolean);
  return parts.join(" / ");
}

function inferOutputCableType(outputType: string | undefined): string {
  const normalized = text(outputType).toLowerCase();
  if (!normalized) return "";
  if (normalized.includes("fiber")) return "Fiber";
  if (normalized.includes("usb-c")) return "USB-C";
  if (normalized.includes("hdbaset") || normalized.includes("ip") || normalized.includes("network")) return "Cat6A";
  if (normalized.includes("hdmi")) return "Passive HDMI";
  return "";
}

function summarizeOutputCableType(details: ProjectDiscoveryOutputDetail[]): string {
  const items = uniqueTexts(details.map((detail) => inferOutputCableType(detail.outputType)));
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return "Mixed cable types";
}

function normalizeSourceLocationValue(value: string | undefined): string {
  const normalized = text(value).toLowerCase();
  if (!normalized) return "";
  if (normalized.includes("central rack")) return "Central rack";
  if (normalized.includes("local rack") || normalized.includes("fixed cabinet") || normalized.includes("rack")) return "Local rack";
  if (normalized.includes("wall")) return "Wall";
  if (normalized.includes("table") || normalized.includes("byod") || normalized.includes("lectern") || normalized.includes("presenter")) return "Desk";
  return text(value);
}

function normalizeInputDetails(details: ProjectDiscoveryInputDetail[]): ProjectDiscoveryInputDetail[] {
  return details.map((detail) => ({
    sourceType: text(detail.sourceType),
    connectionType: text(detail.connectionType),
    cableType: text(detail.cableType),
    route: text(detail.route),
    sourceLocation: normalizeSourceLocationValue(detail.sourceLocation),
  }));
}

function normalizeOutputDetails(details: ProjectDiscoveryOutputDetail[]): ProjectDiscoveryOutputDetail[] {
  return details.map((detail) => ({
    outputType: text(detail.outputType),
    route: text(detail.route),
    displayLocation: text(detail.displayLocation),
  }));
}

function hydrateInputDetails(discovery?: ProjectDiscovery | null): ProjectDiscoveryInputDetail[] {
  const stored = Array.isArray(discovery?.inputDetails)
      ? discovery.inputDetails.map((detail) => ({
        sourceType: text(detail?.sourceType),
        connectionType: text(detail?.connectionType),
        cableType: text(detail?.cableType),
        route: text(detail?.route),
        sourceLocation: normalizeSourceLocationValue(detail?.sourceLocation),
      }))
    : [];

  const count = parseCount(discovery?.sourceCount);
  if (stored.length > 0) {
    return syncInputDetails(count ?? stored.length, stored);
  }

  const legacy = {
    sourceType: text(discovery?.sourceTypes),
    connectionType: text(discovery?.sourceConnectionType),
    cableType: text(discovery?.sourceCableType),
    route: text(discovery?.sourceConnectionPath),
    sourceLocation: normalizeSourceLocationValue(discovery?.sourceLocation),
  };
  const seed = hasInputValue(legacy) ? [legacy] : [];
  return syncInputDetails(count ?? seed.length, seed);
}

function hydrateOutputDetails(discovery?: ProjectDiscovery | null): ProjectDiscoveryOutputDetail[] {
  const stored = Array.isArray(discovery?.outputDetails)
    ? discovery.outputDetails.map((detail) => ({
        outputType: text(detail?.outputType),
        route: text(detail?.route),
        displayLocation: text(detail?.displayLocation),
      }))
    : [];

  const count = parseCount(discovery?.displayCount);
  if (stored.length > 0) {
    return syncOutputDetails(count ?? stored.length, stored);
  }

  const legacy = {
    outputType: text(discovery?.displayConnectionType),
    route: text(discovery?.displayConnectionPath),
    displayLocation: text(discovery?.displayLocation),
  };
  const seed = hasOutputValue(legacy) ? [legacy] : [];
  return syncOutputDetails(count ?? seed.length, seed);
}

function makeDraft(project?: StoredProject | null): Draft {
  const discovery = project?.discovery;
  const inputDetails = hydrateInputDetails(discovery);
  const outputDetails = hydrateOutputDetails(discovery);
  return {
    projectName: project?.name ?? "",
    customer: discovery?.customer ?? project?.customer ?? "",
    site: discovery?.site ?? project?.site ?? "",
    roomName: discovery?.roomName ?? project?.roomName ?? "",
    applicationType: discovery?.applicationType ?? "",
    roomLengthM: discovery?.roomLengthM ?? "",
    roomWidthM: discovery?.roomWidthM ?? "",
    roomHeightM: discovery?.roomHeightM ?? "",
    floorType: discovery?.floorType ?? "",
    ceilingType: discovery?.ceilingType ?? "",
    rackLocation: discovery?.rackLocation ?? "",
    sourceCount: discovery?.sourceCount ?? (inputDetails.length > 0 ? String(inputDetails.length) : ""),
    displayCount: discovery?.displayCount ?? (outputDetails.length > 0 ? String(outputDetails.length) : ""),
    outputBehaviour: discovery?.outputBehaviour ?? "",
    sourceToRackDistanceM: discovery?.sourceToRackDistanceM ?? "",
    rackToDisplayDistanceM: discovery?.rackToDisplayDistanceM ?? "",
    cableDistanceM: discovery?.cableDistanceM ?? "",
    transportDistanceBand: discovery?.transportDistanceBand ?? "",
    transportCableType: discovery?.transportCableType ?? "",
    networkEnvironment: discovery?.networkEnvironment ?? "",
    usbNeeds: discovery?.usbNeeds ?? "",
    audioNeeds: discovery?.audioNeeds ?? "",
    controlNeeds: discovery?.controlNeeds ?? "",
    inputDetails,
    outputDetails,
    notes: discovery?.notes ?? project?.notes ?? "",
  };
}

function toDiscovery(draft: Draft, activeProject?: StoredProject | null): Partial<ProjectDiscovery> {
  const projectName = text(draft.projectName) || activeProject?.name || "Blank Project";
  const inputDetails = normalizeInputDetails(draft.inputDetails);
  const outputDetails = normalizeOutputDetails(draft.outputDetails);
  const sourceCount = text(draft.sourceCount) || (inputDetails.length > 0 ? String(inputDetails.length) : "");
  const displayCount = text(draft.displayCount) || (outputDetails.length > 0 ? String(outputDetails.length) : "");
  const sourceLocation = summarizeUnique(inputDetails.map((detail) => detail.sourceLocation), "Mixed user positions");
  const sourceConnectionType = summarizeUnique(inputDetails.map((detail) => detail.connectionType), "Mixed transport");
  const sourceCableType = summarizeUnique(inputDetails.map((detail) => detail.cableType), "Mixed cable types");
  const sourceConnectionPath = summarizeUnique(inputDetails.map((detail) => detail.route), "Mixed paths");
  const displayLocation = summarizeUnique(outputDetails.map((detail) => detail.displayLocation), "Multiple walls or zones");
  const displayConnectionType = summarizeUnique(outputDetails.map((detail) => detail.outputType), "Mixed transport");
  const displayConnectionPath = summarizeUnique(outputDetails.map((detail) => detail.route), "Mixed paths");
  return {
    customer: text(draft.customer),
    site: text(draft.site),
    roomName: text(draft.roomName) || projectName,
    applicationType: text(draft.applicationType),
    roomLengthM: text(draft.roomLengthM),
    roomWidthM: text(draft.roomWidthM),
    roomHeightM: text(draft.roomHeightM),
    floorType: text(draft.floorType),
    ceilingType: text(draft.ceilingType),
    installationPath: summarizeInstallationPath(draft.floorType, draft.ceilingType),
    displayLocation,
    sourceLocation,
    rackLocation: text(draft.rackLocation),
    sourceCount,
    displayCount,
    sourceTypes: summarizeList(inputDetails.map((detail) => detail.sourceType)),
    outputBehaviour: text(draft.outputBehaviour),
    sourcePlacement: summarizeUnique(inputDetails.map((detail) => detail.sourceLocation), "Mixed source positions"),
    sourceToRackDistanceM: text(draft.sourceToRackDistanceM),
    rackToDisplayDistanceM: text(draft.rackToDisplayDistanceM),
    cableDistanceM: text(draft.cableDistanceM),
    transportDistanceBand: text(draft.transportDistanceBand),
    transportCableType: text(draft.transportCableType),
    sourceConnectionPath,
    sourceConnectionType,
    sourceCableType,
    displayConnectionPath,
    displayConnectionType,
    displayCableType: summarizeOutputCableType(outputDetails),
    networkEnvironment: text(draft.networkEnvironment),
    usbNeeds: text(draft.usbNeeds),
    audioNeeds: text(draft.audioNeeds),
    controlNeeds: text(draft.controlNeeds),
    inputDetails,
    outputDetails,
    notes: text(draft.notes),
    createdAt: activeProject?.discovery?.createdAt ?? activeProject?.createdAt ?? new Date().toISOString(),
  };
}

function normalizeFamilies(values: string[]): DiscoveryProductFamily[] {
  return values.filter((value): value is DiscoveryProductFamily =>
    FAMILY_OPTIONS.includes(value as DiscoveryProductFamily),
  );
}

const PROJECT_FIELDS: Field[] = [
  { key: "projectName", label: "Project name", placeholder: "e.g. Executive boardroom refresh" },
  { key: "customer", label: "Customer", placeholder: "e.g. Acme Ltd" },
  { key: "site", label: "Site", placeholder: "e.g. London HQ" },
  { key: "roomName", label: "Room or zone name", placeholder: "e.g. Main boardroom" },
  {
    key: "applicationType",
    label: "Application type",
    type: "select",
    options: ["Meeting room", "Boardroom", "Training room", "Classroom", "Control room", "Signage zone", "Video wall", "Mixed-use room"],
  },
];

const ENVELOPE_FIELDS: Field[] = [
  { key: "roomLengthM", label: "Room length (m)", type: "number", placeholder: "e.g. 8.5" },
  { key: "roomWidthM", label: "Room width (m)", type: "number", placeholder: "e.g. 5.8" },
  { key: "roomHeightM", label: "Room height (m)", type: "number", placeholder: "e.g. 3.2" },
  { key: "floorType", label: "Floor type", type: "select", options: FLOOR_TYPE_OPTIONS },
  { key: "ceilingType", label: "Ceiling", type: "select", options: CEILING_TYPE_OPTIONS },
  { key: "rackLocation", label: "Rack or core location", type: "select", options: ["Same-room rack", "Adjacent comms room", "Remote central rack", "No central rack"] },
];

const OUTPUT_BEHAVIOUR_FIELDS: Field[] = [
  { key: "displayCount", label: "Output count", type: "number", placeholder: "e.g. 2" },
  { key: "outputBehaviour", label: "Output behavior", type: "select", options: ["One source to one destination", "Mirrored outputs", "Independent switching per display", "Video wall canvas", "Network distribution"] },
  { key: "networkEnvironment", label: "Network environment", type: "select", options: ["Dedicated AV switch required", "Managed network available", "Managed AV VLAN available", "Standalone point-to-point only", "Not confirmed yet"] },
  { key: "usbNeeds", label: "USB requirements", type: "select", options: ["None", "BYOD camera and audio", "USB host switching", "KVM or HID extension", "Mixed USB requirements"] },
  { key: "audioNeeds", label: "Audio requirements", type: "select", options: ["Display audio only", "Line out to DSP", "Microphones and DSP", "Dante or network audio", "Mixed room audio"] },
  { key: "controlNeeds", label: "Control requirements", type: "select", options: ["None", "Front-panel or app control", "Simple API or automation", "Touch panel control", "Third-party control integration"] },
];

const ROUTING_FIELDS: Field[] = [
  { key: "sourceToRackDistanceM", label: "Source to rack/core distance (m)", type: "number", placeholder: "e.g. 12", hint: "Use the practical routed distance, not the straight-line room dimension." },
  { key: "rackToDisplayDistanceM", label: "Rack/core to furthest display distance (m)", type: "number", placeholder: "e.g. 38" },
  { key: "cableDistanceM", label: "Longest point-to-point run (m)", type: "number", placeholder: "e.g. 42", hint: "Use this if another route leg is longer than the normal source/core/display path." },
  { key: "transportDistanceBand", label: "Transport distance band", type: "select", options: ["Under 10m", "10m to 30m", "30m to 70m", "70m to 100m", "100m+", "Mixed distances"] },
  { key: "transportCableType", label: "Available cabling or pathway", type: "select", options: ["Existing Cat6/Cat6A", "New Cat6A planned", "Fiber available", "HDMI-only pathway", "Mixed or not yet surveyed"] },
];

const NOTES_FIELDS: Field[] = [
  {
    key: "notes",
    label: "Engineering notes",
    type: "textarea",
    full: true,
    placeholder: "Include conduit constraints, risers, patch locations, display mounting notes, power limits, workflow issues, or anything else that changes the transport choice.",
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
    const project = getActiveProject();
    if (!project?.id) return;
    setDraft(makeDraft(project));
    setDesignResult(null);
    setStale(false);
    setError("");
    setStatus("Ready to capture the room.");
  }, [activeProject?.id]);

  const families = designResult?.recommendedFamilies ?? activeProject?.discovery?.recommendedFamilies ?? [];
  const skus = designResult?.suggestedSkus ?? activeProject?.catalog?.skus ?? [];
  const nextTool = designResult?.nextTool ?? activeProject?.discovery?.recommendedNextTool;
  const hasRecommendation = Boolean(designResult || families.length > 0);

  function updateDraft(recipe: (current: Draft) => Draft) {
    setDraft((current) => recipe(current));
    setStale(hasRecommendation);
    setStatus("Unsaved changes.");
    setError("");
  }

  function change<K extends DraftScalarKey>(key: K, value: Draft[K]) {
    updateDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === "sourceCount") {
        const parsed = parseCount(String(value));
        if (parsed != null) {
          next.inputDetails = syncInputDetails(parsed, current.inputDetails);
        }
      }
      if (key === "displayCount") {
        const parsed = parseCount(String(value));
        if (parsed != null) {
          next.outputDetails = syncOutputDetails(parsed, current.outputDetails);
        }
      }
      return next;
    });
  }

  function changeInputDetail<K extends keyof ProjectDiscoveryInputDetail>(
    index: number,
    key: K,
    value: ProjectDiscoveryInputDetail[K],
  ) {
    updateDraft((current) => ({
      ...current,
      inputDetails: current.inputDetails.map((detail, detailIndex) =>
        detailIndex === index ? { ...detail, [key]: value } : detail,
      ),
    }));
  }

  function changeOutputDetail<K extends keyof ProjectDiscoveryOutputDetail>(
    index: number,
    key: K,
    value: ProjectDiscoveryOutputDetail[K],
  ) {
    updateDraft((current) => ({
      ...current,
      outputDetails: current.outputDetails.map((detail, detailIndex) =>
        detailIndex === index ? { ...detail, [key]: value } : detail,
      ),
    }));
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

  function renderSection(index: number, title: string, copy: string, body: React.ReactNode) {
    return (
      <section className="wm-section wm-section--compact wm-room-designer-page__section">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <div className="wm-kicker">{String(index).padStart(2, "0")} / Manual intake</div>
            <h2>{title}</h2>
            <p>{copy}</p>
          </div>
        </div>
        <div className="wm-section__body">{body}</div>
      </section>
    );
  }

  function renderCompactSelect(props: {
    label: string;
    value: string | undefined;
    options: CompactOption[];
    onChange: (value: string) => void;
    wide?: boolean;
  }) {
    return (
      <label className={`wm-form-field wm-room-designer-page__compact-field${props.wide ? " wm-room-designer-page__compact-field--wide" : ""}`}>
        <span className="wm-form-label">{props.label}</span>
        <select
          className="wm-form-input wm-room-designer-page__compact-input"
          value={props.value ?? ""}
          onChange={(event) => props.onChange(event.target.value)}
        >
          <option value="">Select</option>
          {props.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  function renderRadioGroup(props: {
    legend: string;
    name: string;
    value: string | undefined;
    options: CompactOption[];
    onChange: (value: string) => void;
    wide?: boolean;
  }) {
    return (
      <fieldset className={`wm-room-designer-page__radio-group${props.wide ? " wm-room-designer-page__radio-group--wide" : ""}`}>
        <legend className="wm-form-label">{props.legend}</legend>
        <div className="wm-room-designer-page__radio-options">
          {props.options.map((option) => (
            <label key={option.value} className="wm-room-designer-page__radio-chip">
              <input
                className="wm-room-designer-page__radio-input"
                type="radio"
                name={props.name}
                checked={props.value === option.value}
                onChange={() => props.onChange(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  function renderInputCard(detail: ProjectDiscoveryInputDetail, index: number) {
    return (
      <div
        key={`input-${index}`}
        className="wm-work-card wm-room-designer-page__detail-card"
        style={{ display: "grid", gap: 8, border: "1px solid rgba(115,231,255,0.1)" }}
      >
        <div className="wm-room-designer-page__detail-card-head">
          <div className="wm-kicker">Input {index + 1}</div>
        </div>
        <div className="wm-room-designer-page__detail-card-grid">
          <label className="wm-form-field wm-room-designer-page__compact-field wm-room-designer-page__compact-field--wide">
            <span className="wm-form-label">Source</span>
            <input
              className="wm-form-input wm-room-designer-page__compact-input"
              type="text"
              value={detail.sourceType ?? ""}
              placeholder="BYOD laptop, room PC..."
              onChange={(event) => changeInputDetail(index, "sourceType", event.target.value)}
            />
          </label>
          {renderCompactSelect({
            label: "Cable",
            value: detail.cableType,
            options: SOURCE_CABLE_OPTIONS,
            onChange: (value) => changeInputDetail(index, "cableType", value),
          })}
          {renderCompactSelect({
            label: "Route",
            value: detail.route,
            options: SOURCE_ROUTE_OPTIONS,
            onChange: (value) => changeInputDetail(index, "route", value),
          })}
          {renderRadioGroup({
            legend: "Location",
            name: `source-location-${index}`,
            value: detail.sourceLocation,
            options: SOURCE_LOCATION_OPTIONS,
            onChange: (value) => changeInputDetail(index, "sourceLocation", value),
          })}
          {renderRadioGroup({
            legend: "Connection",
            name: `source-connection-${index}`,
            value: detail.connectionType,
            options: SOURCE_CONNECTION_OPTIONS,
            onChange: (value) => changeInputDetail(index, "connectionType", value),
            wide: true,
          })}
        </div>
      </div>
    );
  }

  function renderOutputCard(detail: ProjectDiscoveryOutputDetail, index: number) {
    return (
      <div
        key={`output-${index}`}
        className="wm-work-card wm-room-designer-page__detail-card"
        style={{ display: "grid", gap: 8, border: "1px solid rgba(115,231,255,0.1)" }}
      >
        <div className="wm-room-designer-page__detail-card-head">
          <div className="wm-kicker">Output {index + 1}</div>
        </div>
          <div className="wm-room-designer-page__detail-card-grid">
          {renderCompactSelect({
            label: "Route",
            value: detail.route,
            options: OUTPUT_ROUTE_OPTIONS,
            onChange: (value) => changeOutputDetail(index, "route", value),
            wide: true,
          })}
          {renderRadioGroup({
            legend: "Display",
            name: `display-location-${index}`,
            value: detail.displayLocation,
            options: DISPLAY_LOCATION_OPTIONS,
            onChange: (value) => changeOutputDetail(index, "displayLocation", value),
            wide: true,
          })}
          {renderRadioGroup({
            legend: "Output type",
            name: `output-type-${index}`,
            value: detail.outputType,
            options: OUTPUT_TYPE_OPTIONS,
            onChange: (value) => changeOutputDetail(index, "outputType", value),
            wide: true,
          })}
        </div>
      </div>
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
      const templateSeed = buildDesignTemplateSeedFromProject(activeProject);
      const result = await designRoom({
        roomId: activeProject.id,
        projectName: name,
        discovery,
        template: templateSeed,
      });
      updateProjectDiscovery(activeProject.id, {
        recommendedFamilies: normalizeFamilies(result.recommendedFamilies),
        recommendedNextTool: result.nextTool,
      });
      updateProject(activeProject.id, {
        stage: "Specify",
        status: "In Progress",
        catalog: {
          ...(activeProject.catalog ?? {}),
          skus: result.suggestedSkus,
          bomItems: result.suggestedBom,
          notes: [
            activeProject.catalog?.notes?.trim(),
            `Technology fit refresh saved ${result.suggestedBom.length} BOM line${result.suggestedBom.length === 1 ? "" : "s"}.`,
          ].filter(Boolean).join("\n"),
        },
      });
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
            Build the project from physical reality: room size, room construction, per-input source paths, per-output routes, and point-to-point distances. Wingman narrows the right technology family from those constraints.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["01 Project shell", "02 Room envelope", "03 Inputs", "04 Outputs", "05 Routing", "06 Recommendation"].map((item) => (
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
          <div className="wm-body-sm" style={{ opacity: 0.82 }}>
            {stale
              ? "Inputs changed since the last recommendation. Save or refresh the fit when you are ready."
              : status}
          </div>
          {error ? <div className="wm-body-sm" style={{ color: "#ff9da5" }}>{error}</div> : null}
        </div>
      </section>

      <div style={{ display: "grid", gap: 16 }}>
        {renderSection(1, "Opportunity context", "Set the project identity and describe the kind of room you are designing.", <div className="wm-form-grid">{PROJECT_FIELDS.map(renderField)}</div>)}

        {renderSection(2, "Room envelope and device positions", "Describe the physical space and its construction so the transport path is grounded in actual geometry.", <div className="wm-form-grid">{ENVELOPE_FIELDS.map(renderField)}</div>)}

        {renderSection(
          3,
          "Source inputs",
          "Set the source input count, then capture the source, connection type, cable type, route, and source location for each input.",
          <div style={{ display: "grid", gap: 16 }}>
            <div className="wm-form-grid">
              {renderField({ key: "sourceCount", label: "Source input count", type: "number", placeholder: "e.g. 4" })}
            </div>
            <div className="wm-room-designer-page__detail-grid">
              {draft.inputDetails.length > 0 ? (
                draft.inputDetails.map(renderInputCard)
              ) : (
                <div className="wm-work-card" style={{ padding: 16 }}>
                  <span className="wm-body-sm">Set the source input count to open per-input capture.</span>
                </div>
              )}
            </div>
          </div>,
        )}

        {renderSection(
          4,
          "Outputs and room behavior",
          "Capture the room behavior, then use a separate process to define the display location, output type, and route for each destination.",
          <div style={{ display: "grid", gap: 16 }}>
            <div className="wm-form-grid">{OUTPUT_BEHAVIOUR_FIELDS.map(renderField)}</div>
            <div className="wm-room-designer-page__detail-grid">
              {draft.outputDetails.length > 0 ? (
                draft.outputDetails.map(renderOutputCard)
              ) : (
                <div className="wm-work-card" style={{ padding: 16 }}>
                  <span className="wm-body-sm">Set the output count to open per-output routing.</span>
                </div>
              )}
            </div>
          </div>,
        )}

        {renderSection(5, "Routing and point-to-point distances", "Capture the practical route lengths so the technology choice matches the real installed path.", <div className="wm-form-grid">{ROUTING_FIELDS.map(renderField)}</div>)}

        {renderSection(6, "Assumptions and engineering notes", "Store anything survey-driven that should shape the technology choice.", <div className="wm-form-grid">{NOTES_FIELDS.map(renderField)}</div>)}

        {renderSection(
          7,
          "Technology recommendation",
          stale
            ? "Inputs changed since the last fit. Refresh the recommendation when you are ready."
            : "Run technology fit to narrow the transport family from the latest intake.",
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {families.length > 0 ? families.map((family) => <span key={family} className="wm-chip">{family}</span>) : <span className="wm-body-sm">Run technology fit to populate the recommendation.</span>}
            </div>
            {skus.length > 0 ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {skus.map((sku) => <span key={sku} className="wm-chip">{sku}</span>)}
              </div>
            ) : null}
            {designResult ? (
              <div style={{ display: "grid", gap: 10 }}>
                <div className="wm-work-card"><strong>Cable view</strong><div className="wm-body-sm">{designResult.summary.cableSummary}</div></div>
                <div className="wm-work-card"><strong>Diagram view</strong><div className="wm-body-sm">{designResult.summary.diagramSummary}</div></div>
                <div className="wm-work-card"><strong>Commercial handoff</strong><div className="wm-body-sm">{designResult.summary.proposalSummary}</div></div>
              </div>
            ) : null}
            <div className="wm-actions-row">
              <button type="button" className="wm-btn wm-btn-primary" onClick={() => void save(true)} disabled={running}>Refresh Fit</button>
              {nextTool && nextTool !== WM_ROUTES.roomDesigner ? (
                <button type="button" className="wm-btn" onClick={() => navigate(nextTool)}>
                  <span>Open {getToolLabel(nextTool)}</span>
                  <ArrowRight size={16} />
                </button>
              ) : null}
            </div>
          </div>,
        )}
      </div>

      {(pending || running) ? <div className="wm-body-sm" style={{ marginTop: 12, opacity: 0.78 }}>Wingman is refreshing the transport recommendation from your latest room data.</div> : null}
    </div>
  );
}
