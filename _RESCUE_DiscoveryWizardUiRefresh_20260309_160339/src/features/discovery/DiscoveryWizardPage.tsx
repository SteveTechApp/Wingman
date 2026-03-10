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
  { id: "context", title: "Basic context", subtitle: "Customer, site and room profile." },
  { id: "layout", title: "Physical layout", subtitle: "Room dimensions, cable path and equipment locations." },
  { id: "qualifiers", title: "Technical qualifiers", subtitle: "Commercial and technical signals that shape the design." },
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
  } catch {
  }
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
    reasons.push("Collaboration and BYOD workflow likely");
  }

  if (distance > 15 || displays > 1 || sources > 2) {
    families.add("HDBaseT");
    reasons.push("Point-to-point extension or longer cable path");
  }

  if (distance > 70 || displays > 4 || sources > 4 || audio.includes("dante")) {
    families.add("AVoIP");
    reasons.push("Networked distribution is a better fit at this scale");
  }

  if (displays > 1 || app.includes("control room")) {
    families.add("Video Wall");
    reasons.push("Multiple displays suggest video wall or multiview needs");
  }

  if (control.includes("matrix") || control.includes("multi") || sources > 3) {
    families.add("Matrix");
    reasons.push("Source switching density points toward matrix logic");
  }

  if ((usb.includes("usb 3") || usb.includes("camera") || usb.includes("peripheral")) && distance > 5) {
    families.add("USB Extension");
    reasons.push("USB transport likely needs dedicated extension");
  }

  if (families.size === 0) {
    families.add("Apollo");
    reasons.push("Safe starting point for a compact meeting-space design");
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
.wm-dw3{
  padding: 12px 16px 16px;
}

.wm-dw3__hero{
  display: grid;
  grid-template-columns: minmax(0,1fr) auto;
  gap: 12px;
  align-items: start;
}

.wm-dw3__heroActions{
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.wm-dw3__eyebrow{
  margin: 0 0 4px;
  color: #66eadb;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.wm-dw3__stepTabs{
  margin-top: 12px;
}

.wm-dw3__stepBadge{
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(34,199,184,0.12);
  border: 1px solid rgba(34,199,184,0.18);
  color: #dffcf9;
  font-size: 0.84rem;
  font-weight: 650;
}

.wm-dw3__nav{
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  margin-top: 12px;
}

.wm-dw3__navLeft,
.wm-dw3__navRight{
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

@media (max-width: 900px){
  .wm-dw3__hero{
    grid-template-columns: 1fr;
  }

  .wm-dw3__heroActions{
    justify-content: flex-start;
  }

  .wm-dw3__nav{
    flex-direction: column;
    align-items: stretch;
  }

  .wm-dw3__navLeft,
  .wm-dw3__navRight{
    width: 100%;
    justify-content: space-between;
  }
}
`;

export default function DiscoveryWizardPage() {
  const navigate = useNavigate();
  const [record, setRecord] = React.useState<DiscoveryRecord>(() => readDiscovery());
  const [savedAt, setSavedAt] = React.useState("");
  const [activeStep, setActiveStep] = React.useState(0);

  const recommendation = React.useMemo(() => pickTopFamilies(record), [record]);

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
    <div className="wm-dw3 wm-ui">
      <style>{pageStyles}</style>

      <div className="wm-ui__stack">
        <section className="wm-ui__card wm-ui__card--hero">
          <div className="wm-dw3__hero">
            <div>
              <p className="wm-dw3__eyebrow">Discovery</p>
              <h1 className="wm-ui__title">Discovery Wizard</h1>
              <p className="wm-ui__subtitle">
                Guide the user step by step, reduce clutter, and keep the workflow focused.
              </p>

              <div className="wm-ui__chips wm-dw3__stepTabs">
                {STEP_DEFS.map((step, index) => {
                  const progress = stepCompletion(record, index);
                  return (
                    <button
                      key={step.id}
                      type="button"
                      className={`wm-ui__chip ${index === activeStep ? "wm-ui__chip--active" : ""}`}
                      onClick={() => setActiveStep(index)}
                    >
                      Step {index + 1}: {step.title} ({progress.done}/{progress.total})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="wm-dw3__heroActions">
              <button className="wm-ui__btn wm-ui__btn--ghost" onClick={startBlank}>Start blank</button>
              <button className="wm-ui__btn" onClick={() => navigate("/app/tools")}>Tool Hub</button>
              <button className="wm-ui__btn wm-ui__btn--primary" onClick={saveNow}>Save discovery</button>
              <button className="wm-ui__btn wm-ui__btn--primary" onClick={goCatalog}>Open Catalog</button>
            </div>
          </div>
        </section>

        <section className="wm-ui__card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "start", marginBottom: "12px", flexWrap: "wrap" }}>
            <div>
              <h2 className="wm-ui__sectionTitle">Step {activeStep + 1} - {currentStepMeta.title}</h2>
              <p className="wm-ui__sectionText">{currentStepMeta.subtitle}</p>
            </div>
            <div className="wm-dw3__stepBadge">{currentProgress.done}/{currentProgress.total} complete</div>
          </div>

          {renderStep()}

          <div className="wm-dw3__nav">
            <div className="wm-dw3__navLeft">
              <span className="wm-ui__helper" style={{ marginTop: 0 }}>
                {savedAt ? `Last saved at ${savedAt}` : `Progress ${totalComplete}/${totalFields}`}
              </span>
            </div>

            <div className="wm-dw3__navRight">
              <button className="wm-ui__btn" onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))} disabled={activeStep === 0}>
                Previous
              </button>

              {activeStep < STEP_DEFS.length - 1 ? (
                <button className="wm-ui__btn wm-ui__btn--primary" onClick={() => setActiveStep((prev) => Math.min(STEP_DEFS.length - 1, prev + 1))}>
                  Next
                </button>
              ) : (
                <button className="wm-ui__btn wm-ui__btn--primary" onClick={saveNow}>
                  Save discovery
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="wm-ui__card">
          <h3 className="wm-ui__sectionTitle">Recommended product families</h3>
          <p className="wm-ui__sectionText">Use this as the next-step guide rather than as a final product decision.</p>

          <div className="wm-ui__chips" style={{ marginTop: "12px" }}>
            {recommendation.families.map((family) => (
              <span key={family} className="wm-ui__chip wm-ui__chip--active">{family}</span>
            ))}
          </div>

          <div className="wm-ui__miniGrid" style={{ marginTop: "12px" }}>
            {recommendation.reasons.map((reason) => (
              <div key={reason} className="wm-ui__miniItem">
                <strong>Reason</strong>
                <span>{reason}</span>
              </div>
            ))}
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
        </section>
      </div>
      <DiscoveryWorkflowBridge />
</div>
  );
}