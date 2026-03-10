import * as React from "react";
import { useNavigate } from "react-router-dom";
import DiscoveryWorkflowBridge from "@/features/discovery/DiscoveryWorkflowBridge";

type DiscoveryProductFamily =
  | "Apollo"
  | "HDBaseT"
  | "AVoIP"
  | "Matrix"
  | "USB Extension"
  | "Video Wall";

type DiscoveryRecord = {
  customer: string;
  site: string;
  roomName: string;
  applicationType: string;
  roomLengthM: string;
  roomWidthM: string;
  roomHeightM: string;
  displayLocation: string;
  sourceLocation: string;
  rackLocation: string;
  cableDistanceM: string;
  displayCount: string;
  sourceCount: string;
  usbNeeds: string;
  audioNeeds: string;
  controlNeeds: string;
  budgetBand: string;
  urgency: string;
  notes: string;
  recommendedFamilies: DiscoveryProductFamily[];
  recommendedNextTool: string;
  createdAt: string;
};

type ArchitecturePreview = {
  primary: string;
  confidence: "Low" | "Medium" | "High";
  summary: string;
  reasons: string[];
  nextActions: string[];
  bomDirection: string[];
};

const STORAGE_KEY = "wm_discovery_seed";

const APPLICATION_OPTIONS = [
  "Meeting Space",
  "Boardroom",
  "Huddle Space",
  "Training Room",
  "Classroom",
  "Control Room",
  "Reception",
  "Retail",
  "Custom",
];

const POSITION_OPTIONS = [
  "Front wall",
  "Rear wall",
  "Side wall",
  "Table",
  "Lectern",
  "Ceiling",
  "Rack room",
  "Under display",
  "Other",
];

const USB_OPTIONS = [
  "None",
  "USB 2.0",
  "USB 3.x",
  "USB-C BYOD",
  "Camera + audio peripherals",
  "Mixed peripherals",
];

const AUDIO_OPTIONS = [
  "None",
  "Display audio only",
  "Microphones + speakers",
  "DSP / Dante ready",
  "USB audio bridge",
];

const CONTROL_OPTIONS = [
  "None",
  "IR",
  "RS-232",
  "IP control",
  "Simple room control",
  "Matrix / multi-zone",
];

const BUDGET_OPTIONS = [
  "Entry",
  "Mid",
  "Performance",
  "Premium",
  "Open",
];

const URGENCY_OPTIONS = [
  "Immediate",
  "This month",
  "This quarter",
  "Planning stage",
];

const STEP_DEFS = [
  { id: "context", title: "Context", subtitle: "Customer, site and room profile." },
  { id: "layout", title: "Layout", subtitle: "Room dimensions, cable path and equipment locations." },
  { id: "qualifiers", title: "Technical", subtitle: "Commercial and technical signals that shape the design." },
] as const;

function emptyDiscoveryRecord(): DiscoveryRecord {
  return {
    customer: "",
    site: "",
    roomName: "",
    applicationType: "",
    roomLengthM: "",
    roomWidthM: "",
    roomHeightM: "",
    displayLocation: "",
    sourceLocation: "",
    rackLocation: "",
    cableDistanceM: "",
    displayCount: "",
    sourceCount: "",
    usbNeeds: "",
    audioNeeds: "",
    controlNeeds: "",
    budgetBand: "",
    urgency: "",
    notes: "",
    recommendedFamilies: [],
    recommendedNextTool: "Product Catalog",
    createdAt: new Date().toISOString(),
  };
}

function readDiscovery(): DiscoveryRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDiscoveryRecord();
    const parsed = JSON.parse(raw) as Partial<DiscoveryRecord>;
    return { ...emptyDiscoveryRecord(), ...parsed };
  } catch {
    return emptyDiscoveryRecord();
  }
}

function writeDiscovery(record: DiscoveryRecord) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {}
}

function asNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function pickTopFamilies(record: DiscoveryRecord): {
  families: DiscoveryProductFamily[];
  reasons: string[];
  nextTool: string;
} {
  const families = new Set<DiscoveryProductFamily>();
  const reasons: string[] = [];

  const distance = asNumber(record.cableDistanceM);
  const displays = asNumber(record.displayCount);
  const sources = asNumber(record.sourceCount);

  const usb = record.usbNeeds.toLowerCase();
  const audio = record.audioNeeds.toLowerCase();
  const control = record.controlNeeds.toLowerCase();
  const app = record.applicationType.toLowerCase();

  if (
    usb.includes("usb-c") ||
    usb.includes("camera") ||
    usb.includes("peripheral") ||
    app.includes("meeting") ||
    app.includes("boardroom") ||
    app.includes("huddle")
  ) {
    families.add("Apollo");
    reasons.push("Collaboration and BYOD workflow likely.");
  }

  if (distance > 15 || displays > 1 || sources > 2) {
    families.add("HDBaseT");
    reasons.push("Point-to-point extension or longer cable path.");
  }

  if (distance > 70 || displays > 4 || sources > 4 || audio.includes("dante")) {
    families.add("AVoIP");
    reasons.push("Networked distribution is a better fit at this scale.");
  }

  if (displays > 1 || app.includes("control room")) {
    families.add("Video Wall");
    reasons.push("Multiple displays suggest video wall or multiview needs.");
  }

  if (control.includes("matrix") || control.includes("multi") || sources > 3) {
    families.add("Matrix");
    reasons.push("Source switching density points toward matrix logic.");
  }

  if ((usb.includes("usb 3") || usb.includes("camera") || usb.includes("peripheral")) && distance > 5) {
    families.add("USB Extension");
    reasons.push("USB transport likely needs dedicated extension.");
  }

  if (families.size === 0) {
    families.add("Apollo");
    reasons.push("Safe starting point for a compact meeting-space design.");
  }

  const familyOrder: DiscoveryProductFamily[] = [
    "Apollo",
    "HDBaseT",
    "AVoIP",
    "Matrix",
    "USB Extension",
    "Video Wall",
  ];

  const ordered = familyOrder.filter((item) => families.has(item));

  let nextTool = "Product Catalog";
  if (ordered.includes("Video Wall")) nextTool = "Video Wall Wizard";
  else if (ordered.includes("Matrix")) nextTool = "Product Catalog";
  else if (ordered.includes("Apollo")) nextTool = "Product Catalog";

  return {
    families: ordered.slice(0, 3),
    reasons: reasons.slice(0, 4),
    nextTool,
  };
}

function buildArchitecturePreview(record: DiscoveryRecord): ArchitecturePreview {
  const distance = asNumber(record.cableDistanceM);
  const displays = asNumber(record.displayCount);
  const sources = asNumber(record.sourceCount);
  const app = record.applicationType.toLowerCase();
  const usb = record.usbNeeds.toLowerCase();
  const audio = record.audioNeeds.toLowerCase();
  const control = record.controlNeeds.toLowerCase();

  const reasons: string[] = [];
  const nextActions: string[] = [];
  const bomDirection: string[] = [];

  let primary = "HDBaseT";
  let confidence: "Low" | "Medium" | "High" = "Medium";
  let summary = "The project currently leans toward an HDBaseT-led room architecture.";

  if (app.includes("control room") || displays >= 4) {
    primary = "Video Wall";
    summary = "The project currently leans toward a processor-led multi-display architecture.";
    reasons.push("Multiple displays indicate processing or wall-style presentation logic.");
    bomDirection.push("Processor or video wall engine");
    bomDirection.push("Input switching layer");
    bomDirection.push("Display feed outputs");
  }

  if (distance >= 70 || (sources >= 4 && displays >= 4) || audio.includes("dante")) {
    primary = "AVoIP";
    summary = "The project currently leans toward a network-distributed AV architecture.";
    reasons.push("Scale, signal distance, or audio networking suggest distributed transport.");
    bomDirection.push("AVoIP encoders");
    bomDirection.push("AVoIP decoders");
    bomDirection.push("Managed network switching");
  }

  if (sources >= 2 && displays >= 2 && displays < 4 && distance < 70) {
    if (primary !== "AVoIP" && primary !== "Video Wall") {
      primary = "Matrix";
      summary = "The project currently leans toward a matrix-led switching architecture.";
      reasons.push("Moderate I/O counts suggest central switching and routing flexibility.");
      bomDirection.push("Matrix switch");
      bomDirection.push("TX/RX or local endpoints");
    }
  }

  if (usb.includes("usb-c") || usb.includes("camera") || usb.includes("peripheral")) {
    reasons.push("USB collaboration needs must be preserved in the architecture.");
    nextActions.push("Confirm USB host/device roles and BYOD or camera workflows.");
    bomDirection.push("USB extension support");
  }

  if (control.includes("ip") || control.includes("room") || control.includes("matrix")) {
    reasons.push("Control requirements should be included early in the system logic.");
    nextActions.push("Confirm control interfaces and user operation workflow.");
    bomDirection.push("Control layer");
  }

  if (audio.includes("microphones") || audio.includes("dsp") || audio.includes("dante") || audio.includes("usb audio")) {
    reasons.push("Audio requirements will affect signal breakout, DSP, or audio transport.");
    nextActions.push("Confirm microphone, speaker, DSP, and local audio path requirements.");
    bomDirection.push("Audio integration path");
  }

  if (primary === "HDBaseT") {
    reasons.push("The current room scope looks suited to extension-led distribution.");
    nextActions.push("Confirm cable route lengths and final TX/RX endpoint count.");
    bomDirection.push("HDBaseT transmitters");
    bomDirection.push("HDBaseT receivers");
    bomDirection.push("Switcher or presentation input layer");
  }

  if (primary === "Matrix") {
    nextActions.push("Confirm final source and display counts for switch sizing.");
    bomDirection.push("Room routing interface");
  }

  if (primary === "AVoIP") {
    nextActions.push("Confirm network boundaries, endpoint count, and switching assumptions.");
    bomDirection.push("AV routing/control layer");
  }

  if (primary === "Video Wall") {
    nextActions.push("Confirm wall layout, presets, and content presentation scenarios.");
    bomDirection.push("Control/preset recall");
  }

  if (sources > 0 && displays > 0 && distance > 0) {
    confidence = "High";
  } else if (sources === 0 || displays === 0 || distance === 0) {
    confidence = "Low";
  }

  if (reasons.length === 0) {
    reasons.push("More technical qualifiers are needed before the architecture can be confirmed.");
  }

  if (nextActions.length === 0) {
    nextActions.push("Continue Discovery and confirm remaining technical qualifiers.");
  }

  if (bomDirection.length === 0) {
    bomDirection.push("Core transport layer");
    bomDirection.push("Display endpoints");
  }

  return {
    primary,
    confidence,
    summary,
    reasons: Array.from(new Set(reasons)).slice(0, 4),
    nextActions: Array.from(new Set(nextActions)).slice(0, 4),
    bomDirection: Array.from(new Set(bomDirection)).slice(0, 5),
  };
}

function show(value: string): string {
  return value.trim() ? value : "-";
}

function showSize(record: DiscoveryRecord): string {
  const l = show(record.roomLengthM);
  const w = show(record.roomWidthM);
  const h = show(record.roomHeightM);
  if (l === "-" && w === "-" && h === "-") return "-";
  return `${l} x ${w} x ${h} m`;
}

function countFilled(values: string[]): number {
  return values.filter((value) => value.trim().length > 0).length;
}

function stepCompletion(record: DiscoveryRecord, index: number): { done: number; total: number } {
  if (index === 0) {
    return { done: countFilled([record.customer, record.site, record.roomName, record.applicationType]), total: 4 };
  }
  if (index === 1) {
    return {
      done: countFilled([
        record.roomLengthM,
        record.roomWidthM,
        record.roomHeightM,
        record.cableDistanceM,
        record.displayLocation,
        record.sourceLocation,
        record.rackLocation,
      ]),
      total: 7,
    };
  }
  return {
    done: countFilled([
      record.displayCount,
      record.sourceCount,
      record.usbNeeds,
      record.audioNeeds,
      record.controlNeeds,
      record.budgetBand,
      record.urgency,
      record.notes,
    ]),
    total: 8,
  };
}

function TextField(props: {
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="wm-ui__field">
      <span className="wm-ui__label">{props.label}</span>
      <input
        className="wm-ui__input"
        type={props.type ?? "text"}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </label>
  );
}

function SelectField(props: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="wm-ui__field">
      <span className="wm-ui__label">{props.label}</span>
      <select className="wm-ui__select" value={props.value} onChange={(e) => props.onChange(e.target.value)}>
        <option value="">Select an option</option>
        {props.options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

const pageStyles = `
.wm-dw5{
  padding: 12px 16px 16px;
}

.wm-dw5__hero{
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  gap:12px;
  align-items:start;
}

.wm-dw5__heroActions{
  display:flex;
  flex-wrap:wrap;
  justify-content:flex-end;
  gap:8px;
}

.wm-dw5__content{
  display:flex;
  flex-direction:column;
  gap:16px;
}

.wm-dw5__sectionTop{
  display:flex;
  justify-content:space-between;
  gap:12px;
  align-items:start;
  margin-bottom:12px;
  flex-wrap:wrap;
}

.wm-dw5__stepBadge{
  display:inline-flex;
  align-items:center;
  min-height:32px;
  padding:0 12px;
  border-radius:999px;
  background:rgba(34,199,184,0.12);
  border:1px solid rgba(34,199,184,0.18);
  color:#dffcf9;
  font-size:0.84rem;
  font-weight:650;
}

.wm-dw5__wizardShell{
  display:flex;
  flex-direction:column;
  gap:16px;
}

.wm-dw5__formWrap{
  max-width:920px;
}

.wm-dw5__nav{
  display:flex;
  justify-content:space-between;
  gap:10px;
  align-items:center;
  margin-top:4px;
}

.wm-dw5__navLeft,
.wm-dw5__navRight{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  align-items:center;
}

.wm-dw5__insights{
  display:flex;
  flex-direction:column;
  gap:12px;
}

.wm-dw5__insightStack{
  display:flex;
  flex-direction:column;
  gap:12px;
}

@media (max-width: 980px){
  .wm-dw5__hero{
    grid-template-columns:1fr;
  }

  .wm-dw5__heroActions{
    justify-content:flex-start;
  }

  .wm-dw5__nav{
    flex-direction:column;
    align-items:stretch;
  }

  .wm-dw5__navLeft,
  .wm-dw5__navRight{
    width:100%;
    justify-content:space-between;
  }

  .wm-dw5__formWrap{
    max-width:none;
  }
}
`;

export default function DiscoveryWizardPage() {
  const navigate = useNavigate();
  const [record, setRecord] = React.useState<DiscoveryRecord>(() => readDiscovery());
  const [savedAt, setSavedAt] = React.useState("");
  const [activeStep, setActiveStep] = React.useState(0);

  const recommendation = React.useMemo(() => pickTopFamilies(record), [record]);
  const architecturePreview = React.useMemo(() => buildArchitecturePreview(record), [record]);

  const update = <K extends keyof DiscoveryRecord>(key: K, value: DiscoveryRecord[K]) => {
    setRecord((prev) => ({ ...prev, [key]: value }));
  };

  const saveNow = () => {
    const payload: DiscoveryRecord = {
      ...record,
      recommendedFamilies: recommendation.families,
      recommendedNextTool: recommendation.nextTool,
    };
    writeDiscovery(payload);
    setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  };

  const startBlank = () => {
    const fresh = emptyDiscoveryRecord();
    setRecord(fresh);
    writeDiscovery(fresh);
    setSavedAt("");
    setActiveStep(0);
  };

  const goCatalog = () => {
    saveNow();
    navigate("/app/tools/catalog");
  };

  const currentStepMeta = STEP_DEFS[activeStep];
  const currentProgress = stepCompletion(record, activeStep);
  const totalComplete =
    stepCompletion(record, 0).done +
    stepCompletion(record, 1).done +
    stepCompletion(record, 2).done;
  const totalFields =
    stepCompletion(record, 0).total +
    stepCompletion(record, 1).total +
    stepCompletion(record, 2).total;

  function renderStep() {
    if (activeStep === 0) {
      return (
        <div className="wm-ui__grid wm-ui__grid--2">
          <TextField label="Customer" value={record.customer} placeholder="Sample customer" onChange={(v) => update("customer", v)} />
          <TextField label="Site" value={record.site} placeholder="Banbury HQ" onChange={(v) => update("site", v)} />
          <TextField label="Room name" value={record.roomName} placeholder="Boardroom" onChange={(v) => update("roomName", v)} />
          <SelectField label="Application type" value={record.applicationType} options={APPLICATION_OPTIONS} onChange={(v) => update("applicationType", v)} />
        </div>
      );
    }

    if (activeStep === 1) {
      return (
        <div className="wm-ui__grid wm-ui__grid--2">
          <TextField label="Room length (m)" type="number" value={record.roomLengthM} placeholder="10" onChange={(v) => update("roomLengthM", v)} />
          <TextField label="Room width (m)" type="number" value={record.roomWidthM} placeholder="5" onChange={(v) => update("roomWidthM", v)} />
          <TextField label="Room height (m)" type="number" value={record.roomHeightM} placeholder="2.8" onChange={(v) => update("roomHeightM", v)} />
          <TextField label="Expected longest route (m)" type="number" value={record.cableDistanceM} placeholder="Installed route length" onChange={(v) => update("cableDistanceM", v)} />
          <SelectField label="Display location" value={record.displayLocation} options={POSITION_OPTIONS} onChange={(v) => update("displayLocation", v)} />
          <SelectField label="Source position" value={record.sourceLocation} options={POSITION_OPTIONS} onChange={(v) => update("sourceLocation", v)} />
          <SelectField label="Rack / comms location" value={record.rackLocation} options={POSITION_OPTIONS} onChange={(v) => update("rackLocation", v)} />
        </div>
      );
    }

    return (
      <div className="wm-ui__grid wm-ui__grid--2">
        <TextField label="Display count" type="number" value={record.displayCount} placeholder="2" onChange={(v) => update("displayCount", v)} />
        <TextField label="Source count" type="number" value={record.sourceCount} placeholder="4" onChange={(v) => update("sourceCount", v)} />
        <SelectField label="USB needs" value={record.usbNeeds} options={USB_OPTIONS} onChange={(v) => update("usbNeeds", v)} />
        <SelectField label="Audio needs" value={record.audioNeeds} options={AUDIO_OPTIONS} onChange={(v) => update("audioNeeds", v)} />
        <SelectField label="Control needs" value={record.controlNeeds} options={CONTROL_OPTIONS} onChange={(v) => update("controlNeeds", v)} />
        <SelectField label="Budget band" value={record.budgetBand} options={BUDGET_OPTIONS} onChange={(v) => update("budgetBand", v)} />
        <SelectField label="Urgency / timeline" value={record.urgency} options={URGENCY_OPTIONS} onChange={(v) => update("urgency", v)} />

        <label className="wm-ui__field" style={{ gridColumn: "1 / -1" }}>
          <span className="wm-ui__label">Call notes / constraints</span>
          <textarea
            className="wm-ui__textarea wm-ui__textarea--sm"
            value={record.notes}
            placeholder="Known constraints, preferred platforms, cable routes, existing room tech, Teams / BYOD requirements, consultant preferences."
            onChange={(e) => update("notes", e.target.value)}
          />
        </label>
      </div>
    );
  }

  return (
    <div className="wm-dw5 wm-ui">
      <style>{pageStyles}</style>

      <div className="wm-ui__stack">
        <section className="wm-ui__card wm-ui__card--hero">
          <div className="wm-dw5__hero">
            <div>
              <p className="wm-ui__eyebrow">Discovery</p>
              <h1 className="wm-ui__title">Discovery Wizard</h1>
              <p className="wm-ui__subtitle">
                Guide the user step by step, reduce clutter, and keep the workflow focused.
              </p>
            </div>

            <div className="wm-dw5__heroActions">
              <button className="wm-ui__btn wm-ui__btn--ghost" onClick={startBlank}>Start blank</button>
              <button className="wm-ui__btn" onClick={() => navigate("/app/tools")}>Tool Hub</button>
            </div>
          </div>
        </section>

        <section className="wm-ui__card">
          <div className="wm-wizard-progress">
            {STEP_DEFS.map((step, index) => {
              const progress = stepCompletion(record, index);
              const isActive = index === activeStep;
              return (
                <React.Fragment key={step.id}>
                  <button
                    type="button"
                    className={`wm-wizard-step ${isActive ? "active" : ""}`}
                    onClick={() => setActiveStep(index)}
                  >
                    <span className="wm-wizard-index">{index + 1}</span>
                    <span>{step.title}</span>
                    <span className="wm-wizard-meta">({progress.done}/{progress.total})</span>
                  </button>
                  {index < STEP_DEFS.length - 1 ? <div className="wm-wizard-divider" /> : null}
                </React.Fragment>
              );
            })}
          </div>

          <div className="wm-dw5__content">
            <div className="wm-dw5__sectionTop">
              <div>
                <h2 className="wm-ui__sectionTitle">Step {activeStep + 1} - {currentStepMeta.title}</h2>
                <p className="wm-ui__sectionText">{currentStepMeta.subtitle}</p>
              </div>
              <div className="wm-dw5__stepBadge">{currentProgress.done}/{currentProgress.total} complete</div>
            </div>

            <div className="wm-dw5__wizardShell">
              <div className="wm-dw5__formWrap">
                {renderStep()}
              </div>

              <div className="wm-dw5__nav">
                <div className="wm-dw5__navLeft">
                  <span className="wm-ui__helper" style={{ marginTop: 0 }}>
                    {savedAt ? `Last saved at ${savedAt}` : `Progress ${totalComplete}/${totalFields}`}
                  </span>
                </div>

                <div className="wm-dw5__navRight">
                  <button className="wm-ui__btn wm-ui__btn--ghost" onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))} disabled={activeStep === 0}>
                    Previous
                  </button>

                  <button className="wm-ui__btn" onClick={saveNow}>
                    Save discovery
                  </button>

                  {activeStep < STEP_DEFS.length - 1 ? (
                    <button className="wm-ui__btn wm-ui__btn--primary" onClick={() => setActiveStep((prev) => Math.min(STEP_DEFS.length - 1, prev + 1))}>
                      Next
                    </button>
                  ) : (
                    <button className="wm-ui__btn wm-ui__btn--primary" onClick={goCatalog}>
                      Open Catalog
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="wm-ui__card">
          <div className="wm-dw5__insights">
            <div>
              <h3 className="wm-ui__sectionTitle">Recommended product families</h3>
              <p className="wm-ui__sectionText">Use this as the next-step guide rather than as a final product decision.</p>
            </div>

            <div className="wm-ui__chips">
              {recommendation.families.map((family) => (
                <span key={family} className="wm-ui__chip wm-ui__chip--active">{family}</span>
              ))}
            </div>

            <div className="wm-dw5__insightStack">
              <div className="wm-ui__miniGrid">
                {recommendation.reasons.map((reason) => (
                  <div key={reason} className="wm-ui__miniItem">
                    <strong>Reason</strong>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>

              <div className="wm-ui__miniGrid">
                <div className="wm-ui__miniItem">
                  <strong>Next tool</strong>
                  <span>{recommendation.nextTool}</span>
                </div>
                <div className="wm-ui__miniItem">
                  <strong>Room size</strong>
                  <span>{showSize(record)}</span>
                </div>
                <div className="wm-ui__miniItem">
                  <strong>Displays / sources</strong>
                  <span>{record.displayCount || "-"} / {record.sourceCount || "-"}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {activeStep === 2 ? (
          <section className="wm-ui__card">
            <div className="wm-dw5__insights">
              <div className="wm-dw5__architectureHead">
                <div>
                  <h3 className="wm-ui__sectionTitle">Suggested architecture</h3>
                  <p className="wm-ui__sectionText">{architecturePreview.summary}</p>
                </div>
                <div className={`wm-mc-confidence is-${architecturePreview.confidence.toLowerCase()}`}>
                  {architecturePreview.confidence}
                </div>
              </div>

              <div className="wm-ui__chips">
                <span className="wm-ui__chip wm-ui__chip--active">{architecturePreview.primary}</span>
              </div>

              <div className="wm-ui__miniGrid">
                <div className="wm-ui__miniItem">
                  <strong>Primary path</strong>
                  <span>{architecturePreview.primary}</span>
                </div>
                <div className="wm-ui__miniItem">
                  <strong>Confidence</strong>
                  <span>{architecturePreview.confidence}</span>
                </div>
              </div>

              <div className="wm-ui__miniGrid">
                <div className="wm-ui__miniItem">
                  <strong>Why Wingman chose this</strong>
                  <ul className="wm-dw5__list">
                    {architecturePreview.reasons.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>

                <div className="wm-ui__miniItem">
                  <strong>Next design actions</strong>
                  <ul className="wm-dw5__list">
                    {architecturePreview.nextActions.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              </div>

              <div className="wm-ui__miniItem">
                <strong>Initial BOM direction</strong>
                <ul className="wm-dw5__list">
                  {architecturePreview.bomDirection.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>
          </section>
        ) : null}

        <DiscoveryWorkflowBridge />
      </div>
    </div>
  );
}