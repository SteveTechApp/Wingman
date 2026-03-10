[CmdletBinding()]
param(
    [switch]$Apply,
    [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"
if (-not $Apply) { throw "Run with -Apply" }

function Ensure-Directory {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Force -Path $Path | Out-Null
    }
}

function Save-Utf8NoBom {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Content
    )
    $parent = Split-Path $Path -Parent
    if ($parent) { Ensure-Directory $parent }
    [System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($false))
}

function Backup-IfExists {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$BackupRoot,
        [Parameter(Mandatory)][string]$RepoRoot
    )
    if (-not (Test-Path $Path)) { return }
    $resolved = (Resolve-Path $Path).Path
    $rel = $resolved.Substring($RepoRoot.Length).TrimStart("\")
    $dest = Join-Path $BackupRoot $rel
    Ensure-Directory (Split-Path $dest -Parent)
    Copy-Item $resolved $dest -Force
}

$RepoRoot = (Resolve-Path $RepoRoot).Path
Set-Location $RepoRoot

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$rescue = Join-Path $RepoRoot "_RESCUE_DiscoveryWizardUiRefresh_$stamp"
Ensure-Directory $rescue

$pagePath = Join-Path $RepoRoot "src\features\discovery\DiscoveryWizardPage.tsx"
$layoutPath = Join-Path $RepoRoot "src\design\system\layout.css"
$componentsPath = Join-Path $RepoRoot "src\design\system\components.css"

@($pagePath, $layoutPath, $componentsPath) | ForEach-Object {
    Backup-IfExists -Path $_ -BackupRoot $rescue -RepoRoot $RepoRoot
}

$pageTsx = @'
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
.wm-dw4{
  padding: 12px 16px 16px;
}

.wm-dw4__hero{
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  gap:12px;
  align-items:start;
}

.wm-dw4__heroActions{
  display:flex;
  flex-wrap:wrap;
  justify-content:flex-end;
  gap:8px;
}

.wm-dw4__content{
  display:flex;
  flex-direction:column;
  gap:16px;
}

.wm-dw4__sectionTop{
  display:flex;
  justify-content:space-between;
  gap:12px;
  align-items:start;
  margin-bottom:12px;
  flex-wrap:wrap;
}

.wm-dw4__stepBadge{
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

.wm-dw4__wizardShell{
  display:flex;
  flex-direction:column;
  gap:16px;
}

.wm-dw4__formWrap{
  max-width:920px;
}

.wm-dw4__nav{
  display:flex;
  justify-content:space-between;
  gap:10px;
  align-items:center;
  margin-top:4px;
}

.wm-dw4__navLeft,
.wm-dw4__navRight{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  align-items:center;
}

.wm-dw4__insights{
  display:flex;
  flex-direction:column;
  gap:12px;
}

.wm-dw4__insightStack{
  display:flex;
  flex-direction:column;
  gap:12px;
}

@media (max-width: 980px){
  .wm-dw4__hero{
    grid-template-columns:1fr;
  }

  .wm-dw4__heroActions{
    justify-content:flex-start;
  }

  .wm-dw4__nav{
    flex-direction:column;
    align-items:stretch;
  }

  .wm-dw4__navLeft,
  .wm-dw4__navRight{
    width:100%;
    justify-content:space-between;
  }

  .wm-dw4__formWrap{
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
    <div className="wm-dw4 wm-ui">
      <style>{pageStyles}</style>

      <div className="wm-ui__stack">
        <section className="wm-ui__card wm-ui__card--hero">
          <div className="wm-dw4__hero">
            <div>
              <p className="wm-ui__eyebrow">Discovery</p>
              <h1 className="wm-ui__title">Discovery Wizard</h1>
              <p className="wm-ui__subtitle">
                Guide the user step by step, reduce clutter, and keep the workflow focused.
              </p>
            </div>

            <div className="wm-dw4__heroActions">
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

          <div className="wm-dw4__content">
            <div className="wm-dw4__sectionTop">
              <div>
                <h2 className="wm-ui__sectionTitle">Step {activeStep + 1} - {currentStepMeta.title}</h2>
                <p className="wm-ui__sectionText">{currentStepMeta.subtitle}</p>
              </div>
              <div className="wm-dw4__stepBadge">{currentProgress.done}/{currentProgress.total} complete</div>
            </div>

            <div className="wm-dw4__wizardShell">
              <div className="wm-dw4__formWrap">
                {renderStep()}
              </div>

              <div className="wm-dw4__nav">
                <div className="wm-dw4__navLeft">
                  <span className="wm-ui__helper" style={{ marginTop: 0 }}>
                    {savedAt ? `Last saved at ${savedAt}` : `Progress ${totalComplete}/${totalFields}`}
                  </span>
                </div>

                <div className="wm-dw4__navRight">
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
          <div className="wm-dw4__insights">
            <div>
              <h3 className="wm-ui__sectionTitle">Recommended product families</h3>
              <p className="wm-ui__sectionText">Use this as the next-step guide rather than as a final product decision.</p>
            </div>

            <div className="wm-ui__chips">
              {recommendation.families.map((family) => (
                <span key={family} className="wm-ui__chip wm-ui__chip--active">{family}</span>
              ))}
            </div>

            <div className="wm-dw4__insightStack">
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

        <DiscoveryWorkflowBridge />
      </div>
    </div>
  );
}
'@

Save-Utf8NoBom -Path $pagePath -Content $pageTsx

$layoutRaw = if (Test-Path $layoutPath) { Get-Content $layoutPath -Raw } else { "" }
$layoutBlock = @'

/* ===== Wingman discovery wizard UI refresh ===== */

.wm-dw4 .wm-ui__stack{
  display:flex;
  flex-direction:column;
  gap:16px;
}

.wm-dw4 .wm-ui__card{
  padding:18px;
}

.wm-dw4 .wm-ui__title{
  margin:0;
  font-size:clamp(42px,4vw,56px);
  line-height:1.02;
  font-weight:800;
}

.wm-dw4 .wm-ui__subtitle{
  margin:10px 0 0;
  max-width:860px;
  color:rgba(236,244,255,0.76);
}

.wm-dw4 .wm-ui__sectionTitle{
  margin:0;
}

.wm-dw4 .wm-ui__sectionText{
  margin:6px 0 0;
  color:rgba(236,244,255,0.72);
}

.wm-dw4 .wm-ui__miniGrid{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:12px;
}

.wm-dw4 .wm-ui__miniItem{
  display:flex;
  flex-direction:column;
  gap:6px;
  padding:12px;
  border-radius:12px;
  border:1px solid rgba(119,166,230,0.10);
  background:rgba(255,255,255,0.03);
}

@media (max-width: 820px){
  .wm-dw4 .wm-ui__miniGrid{
    grid-template-columns:1fr;
  }

  .wm-dw4 .wm-ui__title{
    font-size:clamp(32px,8vw,42px);
  }
}
'@

if ($layoutRaw -notmatch 'Wingman discovery wizard UI refresh') {
  $layoutRaw = $layoutRaw.TrimEnd() + "`r`n`r`n" + $layoutBlock.Trim() + "`r`n"
  Save-Utf8NoBom -Path $layoutPath -Content $layoutRaw
}

$componentsRaw = if (Test-Path $componentsPath) { Get-Content $componentsPath -Raw } else { "" }
$componentBlock = @'

/* ===== Wingman discovery wizard UI refresh ===== */

.wm-wizard-progress{
  display:flex;
  align-items:center;
  gap:10px;
  margin-bottom:16px;
}

.wm-wizard-step{
  display:flex;
  align-items:center;
  gap:8px;
  min-height:40px;
  padding:0 12px;
  border-radius:999px;
  border:1px solid rgba(119,166,230,0.14);
  background:rgba(255,255,255,0.03);
  color:rgba(236,244,255,0.72);
  font-size:13px;
  font-weight:700;
  cursor:pointer;
  white-space:nowrap;
}

.wm-wizard-step.active{
  color:#eefcff;
  border-color:rgba(40,205,210,0.24);
  background:rgba(40,205,210,0.10);
}

.wm-wizard-index{
  width:24px;
  height:24px;
  border-radius:999px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  font-size:12px;
  font-weight:800;
  background:rgba(255,255,255,0.05);
  border:1px solid rgba(119,166,230,0.15);
}

.wm-wizard-step.active .wm-wizard-index{
  background:var(--wm-accent);
  color:#052424;
  border-color:transparent;
}

.wm-wizard-meta{
  color:rgba(236,244,255,0.56);
  font-size:12px;
  font-weight:600;
}

.wm-wizard-divider{
  flex:1;
  min-width:18px;
  height:1px;
  background:rgba(255,255,255,0.08);
}

.wm-ui__eyebrow{
  margin:0 0 6px;
  color:#66eadb;
  font-size:12px;
  font-weight:700;
  letter-spacing:0.08em;
  text-transform:uppercase;
}

.wm-ui__helper{
  color:rgba(236,244,255,0.64);
  font-size:13px;
}

.wm-ui__chips{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
}

.wm-ui__chip{
  display:inline-flex;
  align-items:center;
  min-height:32px;
  padding:0 12px;
  border-radius:999px;
  border:1px solid rgba(119,166,230,0.14);
  background:rgba(255,255,255,0.03);
  color:rgba(236,244,255,0.72);
  font-size:13px;
  font-weight:700;
}

.wm-ui__chip--active{
  color:#eefcff;
  border-color:rgba(40,205,210,0.24);
  background:rgba(40,205,210,0.10);
}

.wm-ui__btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-height:40px;
  padding:0 14px;
  border-radius:10px;
  border:1px solid rgba(119,166,230,0.14);
  background:rgba(255,255,255,0.03);
  color:#eef4ff;
  font-size:14px;
  font-weight:700;
  cursor:pointer;
  white-space:nowrap;
}

.wm-ui__btn:disabled{
  opacity:0.45;
  cursor:not-allowed;
}

.wm-ui__btn--ghost{
  background:rgba(255,255,255,0.02);
}

.wm-ui__btn--primary{
  background:linear-gradient(180deg, rgba(60,223,216,0.98), rgba(34,199,184,0.98));
  color:#052424;
  border-color:transparent;
}

@media (max-width: 980px){
  .wm-wizard-progress{
    flex-wrap:wrap;
  }

  .wm-wizard-divider{
    display:none;
  }
}
'@

if ($componentsRaw -notmatch 'Wingman discovery wizard UI refresh') {
  $componentsRaw = $componentsRaw.TrimEnd() + "`r`n`r`n" + $componentBlock.Trim() + "`r`n"
  Save-Utf8NoBom -Path $componentsPath -Content $componentsRaw
}

Write-Host ""
Write-Host "Wingman discovery wizard UI refresh applied." -ForegroundColor Green
Write-Host ("Backup folder: {0}" -f $rescue) -ForegroundColor Yellow
Write-Host ""
Write-Host "Run next:" -ForegroundColor Cyan
Write-Host "  npm run typecheck" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White