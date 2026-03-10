import * as React from "react";
import { useNavigate } from "react-router-dom";

import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  getActiveProject,
  subscribeProjects,
  updateProjectDiscovery,
} from "@/features/projects/projectStore";

type Family = "Apollo" | "HDBaseT" | "AVoIP" | "Matrix" | "USB Extension" | "Video Wall";
type Confidence = "Low" | "Medium" | "High";
type RecordState = {
  customer: string;
  site: string;
  roomName: string;
  applicationType: string;
  roomLengthM: string;
  roomWidthM: string;
  roomHeightM: string;
  cableDistanceM: string;
  displayCount: string;
  sourceCount: string;
  sourceTypes: string;
  sourcePlacement: string;
  sourceConnectionPath: string;
  displayConnectionPath: string;
  usbNeeds: string;
  audioNeeds: string;
  controlNeeds: string;
  budgetBand: string;
  urgency: string;
  notes: string;
  recommendedFamilies: Family[];
  recommendedNextTool: string;
  createdAt: string;
};

type Advice = {
  primary: Family;
  confidence: Confidence;
  families: Family[];
  summary: string;
  cues: string[];
  reasons: string[];
  nextActions: string[];
  nextToolPath: string;
};

const STORAGE_KEY = "wm_discovery_seed";
const STEP_DEFS = [
  ["Customer Brief", "Start with the basic customer and room context."],
  ["Space and Distance", "Capture the physical envelope and longest likely route."],
  ["Physical Dynamics", "Understand where sources live and how the signal moves."],
  ["User Experience", "Capture USB, audio, control, and commercial caveats."],
] as const;
const STEP_FIELDS: Array<Array<keyof RecordState>> = [
  ["customer", "site", "roomName", "applicationType"],
  ["roomLengthM", "roomWidthM", "roomHeightM", "displayCount", "cableDistanceM"],
  ["sourceCount", "sourceTypes", "sourcePlacement", "sourceConnectionPath", "displayConnectionPath"],
  ["usbNeeds", "audioNeeds", "controlNeeds", "budgetBand", "urgency", "notes"],
];
const APPLICATIONS = ["Meeting Space", "Boardroom", "Huddle Space", "Training Room", "Classroom", "Control Room", "Reception", "Retail", "Flexible Space", "Custom"];
const SOURCE_PLACEMENT = ["Mostly BYOD at the table", "Fixed devices in the room", "Central rack", "Local rack / credenza", "Mixed local and central", "Not sure yet"];
const SOURCE_PATH = ["Direct cable to the next device", "Via floor box or wall plate", "Via local rack", "Via central rack", "Via network drop", "Mixed path", "Not sure yet"];
const DISPLAY_PATH = ["Direct to the display", "Via receiver or decoder", "Via switcher then display", "Via video wall processor", "Mixed display path", "Not sure yet"];
const USB = ["None", "Basic USB only", "USB-C BYOD", "Camera + audio peripherals", "Mixed peripherals"];
const AUDIO = ["None", "Display audio only", "Microphones + speakers", "DSP / Dante ready", "USB audio bridge"];
const CONTROL = ["None", "Simple room control", "IP control", "Touch panel / automation", "Matrix / multi-zone control"];
const BUDGET = ["Entry", "Mid", "Performance", "Premium", "Open"];
const URGENCY = ["Immediate", "This month", "This quarter", "Planning stage"];

function emptyRecord(): RecordState {
  return {
    customer: "",
    site: "",
    roomName: "",
    applicationType: "",
    roomLengthM: "",
    roomWidthM: "",
    roomHeightM: "",
    cableDistanceM: "",
    displayCount: "",
    sourceCount: "",
    sourceTypes: "",
    sourcePlacement: "",
    sourceConnectionPath: "",
    displayConnectionPath: "",
    usbNeeds: "",
    audioNeeds: "",
    controlNeeds: "",
    budgetBand: "",
    urgency: "",
    notes: "",
    recommendedFamilies: [],
    recommendedNextTool: WM_ROUTES.catalogue,
    createdAt: new Date().toISOString(),
  };
}

function readRecord(): RecordState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...emptyRecord(), ...(JSON.parse(raw) as Partial<RecordState>) } : emptyRecord();
  } catch {
    return emptyRecord();
  }
}

function writeRecord(record: RecordState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {}
}

function num(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function filled(value: string | undefined) {
  return Boolean(value && value.trim());
}

function mergeFirst(...values: Array<string | undefined>) {
  return values.find((value) => filled(value)) ?? "";
}

function mergeProject(record: RecordState, project: ReturnType<typeof getActiveProject>): RecordState {
  if (!project) return record;
  const d = project.discovery;
  return {
    ...record,
    customer: mergeFirst(record.customer, d?.customer, project.customer),
    site: mergeFirst(record.site, d?.site, project.site),
    roomName: mergeFirst(record.roomName, d?.roomName, project.roomName, project.name),
    applicationType: mergeFirst(record.applicationType, d?.applicationType),
    roomLengthM: mergeFirst(record.roomLengthM, d?.roomLengthM),
    roomWidthM: mergeFirst(record.roomWidthM, d?.roomWidthM),
    roomHeightM: mergeFirst(record.roomHeightM, d?.roomHeightM),
    cableDistanceM: mergeFirst(record.cableDistanceM, d?.cableDistanceM),
    displayCount: mergeFirst(record.displayCount, d?.displayCount),
    sourceCount: mergeFirst(record.sourceCount, d?.sourceCount),
    sourceTypes: mergeFirst(record.sourceTypes, d?.sourceTypes),
    sourcePlacement: mergeFirst(record.sourcePlacement, d?.sourcePlacement),
    sourceConnectionPath: mergeFirst(record.sourceConnectionPath, d?.sourceConnectionPath),
    displayConnectionPath: mergeFirst(record.displayConnectionPath, d?.displayConnectionPath),
    usbNeeds: mergeFirst(record.usbNeeds, d?.usbNeeds),
    audioNeeds: mergeFirst(record.audioNeeds, d?.audioNeeds),
    controlNeeds: mergeFirst(record.controlNeeds, d?.controlNeeds),
    budgetBand: mergeFirst(record.budgetBand, d?.budgetBand),
    urgency: mergeFirst(record.urgency, d?.urgency),
    notes: mergeFirst(record.notes, d?.notes),
  };
}

function uniq(items: string[]) {
  return Array.from(new Set(items.filter((item) => item.trim())));
}

function buildAdvice(record: RecordState): Advice {
  const app = record.applicationType.toLowerCase();
  const sourceTypes = record.sourceTypes.toLowerCase();
  const sourcePlacement = record.sourcePlacement.toLowerCase();
  const sourcePath = record.sourceConnectionPath.toLowerCase();
  const displayPath = record.displayConnectionPath.toLowerCase();
  const usb = record.usbNeeds.toLowerCase();
  const audio = record.audioNeeds.toLowerCase();
  const control = record.controlNeeds.toLowerCase();
  const distance = num(record.cableDistanceM);
  const displays = num(record.displayCount);
  const sources = num(record.sourceCount);
  const families = new Set<Family>();
  const cues: string[] = [];
  const reasons: string[] = [];
  const nextActions: string[] = [];

  if (app.includes("boardroom") || app.includes("meeting") || app.includes("huddle") || usb.includes("byod")) {
    families.add("Apollo");
    reasons.push("The user workflow points to collaboration and BYOD handling.");
  }
  if (distance >= 15 || sourcePath.includes("floor box") || sourcePath.includes("wall plate") || sourcePath.includes("central rack") || displayPath.includes("receiver")) {
    families.add("HDBaseT");
    reasons.push("The physical path suggests structured extension rather than only short local cabling.");
  }
  if (distance >= 60 || sourcePlacement.includes("mixed") || sourcePath.includes("network") || displayPath.includes("decoder") || (sources >= 4 && displays >= 3)) {
    families.add("AVoIP");
    reasons.push("Longer or mixed transport paths suggest a network backbone may be the cleaner answer.");
  }
  if (sources >= 3 || displays >= 2 || control.includes("matrix")) {
    families.add("Matrix");
    reasons.push("The I/O density and routing requirement suggest switching flexibility matters.");
  }
  if ((usb.includes("camera") || usb.includes("peripheral") || sourceTypes.includes("camera")) && (distance >= 5 || sourcePath.includes("rack"))) {
    families.add("USB Extension");
    reasons.push("USB devices and room cameras imply a separate USB transport decision.");
  }
  if (app.includes("control room") || displays >= 4 || displayPath.includes("video wall")) {
    families.add("Video Wall");
    reasons.push("The endpoint model looks more like a processor-led multi-display problem.");
  }
  if (families.size === 0) {
    families.add("Apollo");
    reasons.push("With limited detail, a collaboration-led baseline is the safest start.");
  }

  cues.push(filled(record.sourcePlacement) ? `Sources are expected to live ${record.sourcePlacement.toLowerCase()}.` : "Source placement is still unclear.");
  cues.push(filled(record.sourceConnectionPath) ? `Sources likely join the system ${record.sourceConnectionPath.toLowerCase()}.` : "The first hop into the system is still unclear.");
  cues.push(filled(record.displayConnectionPath) ? `Displays are likely reached ${record.displayConnectionPath.toLowerCase()}.` : "The final hop to the display is still unclear.");
  if (distance > 0) cues.push(`The longest likely installed route is about ${distance} m.`);

  if (!filled(record.sourceTypes)) nextActions.push("Confirm the real source mix: laptops, cameras, PCs, players, or a mix.");
  if (!filled(record.sourcePlacement)) nextActions.push("Confirm where sources physically live: table, local rack, central rack, or fixed around the room.");
  if (!filled(record.sourceConnectionPath) || !filled(record.displayConnectionPath)) nextActions.push("Map the first hop and the last hop before finalising technology.");
  if (!filled(record.usbNeeds) || !filled(record.controlNeeds)) nextActions.push("Confirm USB and control expectations so the user experience is not under-scoped.");
  if (audio.includes("dsp") || audio.includes("dante")) nextActions.push("Validate the audio network and DSP boundary early because it changes transport choices.");

  const order: Family[] = ["Apollo", "HDBaseT", "AVoIP", "Matrix", "USB Extension", "Video Wall"];
  const ordered = order.filter((family) => families.has(family));
  const primaryOrder: Family[] = ["Video Wall", "AVoIP", "Matrix", "Apollo", "HDBaseT", "USB Extension"];
  const primary = primaryOrder.find((family) => ordered.includes(family)) ?? "Apollo";
  const known = [record.applicationType, record.displayCount, record.sourceCount, record.sourcePlacement, record.sourceConnectionPath, record.displayConnectionPath, record.cableDistanceM].filter(filled).length;
  const confidence: Confidence = known >= 6 ? "High" : known >= 4 ? "Medium" : "Low";
  const nextToolPath = primary === "Video Wall" ? WM_ROUTES.videowall : WM_ROUTES.catalogue;
  const summary =
    primary === "AVoIP" ? "Wingman currently sees a distributed transport problem, so a network backbone is the leading fit."
    : primary === "Matrix" ? "Wingman currently sees a switching and routing problem, so central matrix logic is the leading fit."
    : primary === "Video Wall" ? "Wingman currently sees a multi-display endpoint problem, so a processor-led path is the leading fit."
    : primary === "Apollo" ? "Wingman currently sees a collaboration-led room where user workflow matters as much as transport."
    : primary === "USB Extension" ? "Wingman currently sees a USB transport risk that should be solved explicitly."
    : "Wingman currently sees a structured extension problem, where HDBaseT is the leading fit.";

  return { primary, confidence, families: ordered, summary, cues: uniq(cues).slice(0, 4), reasons: uniq(reasons).slice(0, 4), nextActions: uniq(nextActions).slice(0, 4), nextToolPath };
}

function nextToolLabel(path: string) {
  return path === WM_ROUTES.videowall ? "Video Wall Designer" : "Product Catalog";
}

function notesFrom(record: RecordState, advice: Advice) {
  return [
    record.notes.trim(),
    "Guided Project summary:",
    `Primary fit: ${advice.primary} (${advice.confidence})`,
    `Source placement: ${record.sourcePlacement || "Not confirmed"}`,
    `Source ingress: ${record.sourceConnectionPath || "Not confirmed"}`,
    `Display path: ${record.displayConnectionPath || "Not confirmed"}`,
    `Source types: ${record.sourceTypes || "Not confirmed"}`,
  ].filter(Boolean).join("\n");
}

function countStep(record: RecordState, step: number) {
  return STEP_FIELDS[step].filter((field) => filled(record[field] as string)).length;
}

function Field(props: { label: string; helper: string; children: React.ReactNode }) {
  return (
    <label className="wm-ui__field">
      <span className="wm-ui__label">{props.label}</span>
      {props.children}
      <span className="wm-gp__field-help">{props.helper}</span>
    </label>
  );
}

export default function DiscoveryWizardPage() {
  const navigate = useNavigate();
  const activeProject = React.useSyncExternalStore(subscribeProjects, () => getActiveProject() ?? null, () => null);
  const [record, setRecord] = React.useState<RecordState>(() => readRecord());
  const [savedAt, setSavedAt] = React.useState("");
  const [activeStep, setActiveStep] = React.useState(0);
  const advice = React.useMemo(() => buildAdvice(record), [record]);
  const progress = STEP_DEFS.map((_, index) => countStep(record, index));
  const totalDone = progress.reduce((sum, value) => sum + value, 0);
  const totalFields = STEP_FIELDS.reduce((sum, value) => sum + value.length, 0);

  React.useEffect(() => {
    if (!activeProject) return;
    setRecord((prev) => {
      const next = mergeProject(prev, activeProject);
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
  }, [activeProject]);

  function update(field: keyof RecordState, value: string) {
    setRecord((prev) => ({ ...prev, [field]: value }));
  }

  function save() {
    const payload = { ...record, recommendedFamilies: advice.families, recommendedNextTool: advice.nextToolPath };
    writeRecord(payload);
    if (activeProject?.id) {
      updateProjectDiscovery(activeProject.id, {
        customer: payload.customer || activeProject.customer,
        site: payload.site || activeProject.site,
        roomName: payload.roomName || activeProject.roomName || activeProject.name,
        applicationType: payload.applicationType,
        roomLengthM: payload.roomLengthM,
        roomWidthM: payload.roomWidthM,
        roomHeightM: payload.roomHeightM,
        cableDistanceM: payload.cableDistanceM,
        displayCount: payload.displayCount,
        sourceCount: payload.sourceCount,
        sourceTypes: payload.sourceTypes,
        sourcePlacement: payload.sourcePlacement,
        sourceConnectionPath: payload.sourceConnectionPath,
        displayConnectionPath: payload.displayConnectionPath,
        usbNeeds: payload.usbNeeds,
        audioNeeds: payload.audioNeeds,
        controlNeeds: payload.controlNeeds,
        budgetBand: payload.budgetBand,
        urgency: payload.urgency,
        notes: notesFrom(payload, advice),
        recommendedFamilies: payload.recommendedFamilies,
        recommendedNextTool: payload.recommendedNextTool,
      });
    }
    setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  }

  function reset() {
    const fresh = emptyRecord();
    setRecord(fresh);
    writeRecord(fresh);
    setSavedAt("");
    setActiveStep(0);
  }

  function next() {
    if (activeStep < STEP_DEFS.length - 1) return setActiveStep((value) => value + 1);
    save();
    navigate(advice.nextToolPath);
  }

  return (
    <div className="wm-page wm-dw6 wm-ui wm-guided-project-page">
      <div className="wm-ui__stack">
        <section className="wm-hero">
          <div className="wm-page-hero-row wm-dw6__hero">
            <div>
              <p className="wm-ui__eyebrow">GUIDED PROJECT</p>
              <h1 className="wm-ui__title">Guided Project</h1>
              <p className="wm-ui__subtitle">Keep the questions simple, but make the physical dynamics explicit. Wingman should understand the room, the source path, and the endpoint path before it recommends technology.</p>
            </div>
            <div className="wm-actions-row wm-dw6__heroActions">
              <button className="wm-ui__btn wm-ui__btn--ghost" onClick={reset}>Start blank</button>
              <button className="wm-ui__btn" onClick={() => navigate(WM_ROUTES.newProject)}>Project launcher</button>
            </div>
          </div>
        </section>

        <section className="wm-section">
          <div className="wm-wizard-progress">
            {STEP_DEFS.map(([title], index) => (
              <React.Fragment key={title}>
                <button type="button" className={`wm-wizard-step ${index === activeStep ? "active" : ""}`} onClick={() => setActiveStep(index)}>
                  <span className="wm-wizard-index">{index + 1}</span>
                  <span>{title}</span>
                  <span className="wm-wizard-meta">({progress[index]}/{STEP_FIELDS[index].length})</span>
                </button>
                {index < STEP_DEFS.length - 1 ? <div className="wm-wizard-divider" /> : null}
              </React.Fragment>
            ))}
          </div>

          <div className="wm-gp__layout">
            <div className="wm-dw6__content">
              <div className="wm-dw6__sectionTop">
                <div>
                  <h2 className="wm-ui__sectionTitle">Step {activeStep + 1} - {STEP_DEFS[activeStep][0]}</h2>
                  <p className="wm-ui__sectionText">{STEP_DEFS[activeStep][1]}</p>
                </div>
                <div className="wm-dw6__stepBadge">{progress[activeStep]}/{STEP_FIELDS[activeStep].length} complete</div>
              </div>

              <div className="wm-dw6__wizardShell">
                <div className="wm-dw6__formWrap">
                  <div className="wm-ui__grid wm-ui__grid--2">
                    {activeStep === 0 ? (
                      <>
                        <Field label="Customer" helper="Who is the end customer or internal stakeholder?"><input className="wm-ui__input" value={record.customer} onChange={(e) => update("customer", e.target.value)} placeholder="e.g. Acme Ltd" /></Field>
                        <Field label="Site" helper="Where is the space physically located?"><input className="wm-ui__input" value={record.site} onChange={(e) => update("site", e.target.value)} placeholder="e.g. London HQ" /></Field>
                        <Field label="Room or project name" helper="Keep this plain and customer-friendly."><input className="wm-ui__input" value={record.roomName} onChange={(e) => update("roomName", e.target.value)} placeholder="e.g. Boardroom Refresh" /></Field>
                        <Field label="Application type" helper="What kind of environment are we designing for?"><select className="wm-ui__select" value={record.applicationType} onChange={(e) => update("applicationType", e.target.value)}><option value="">Select an option</option>{APPLICATIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
                      </>
                    ) : null}

                    {activeStep === 1 ? (
                      <>
                        <Field label="Room length (m)" helper="Approximate is fine at this stage."><input className="wm-ui__input" type="number" value={record.roomLengthM} onChange={(e) => update("roomLengthM", e.target.value)} placeholder="10" /></Field>
                        <Field label="Room width (m)" helper="Enough to understand cable and viewing constraints."><input className="wm-ui__input" type="number" value={record.roomWidthM} onChange={(e) => update("roomWidthM", e.target.value)} placeholder="5" /></Field>
                        <Field label="Room height (m)" helper="Helpful for cameras, ceiling equipment, and coverage."><input className="wm-ui__input" type="number" value={record.roomHeightM} onChange={(e) => update("roomHeightM", e.target.value)} placeholder="2.8" /></Field>
                        <Field label="Display count" helper="How many primary displays need feeding?"><input className="wm-ui__input" type="number" value={record.displayCount} onChange={(e) => update("displayCount", e.target.value)} placeholder="1" /></Field>
                        <Field label="Longest likely installed route (m)" helper="Think installed route, not just line-of-sight distance."><input className="wm-ui__input" type="number" value={record.cableDistanceM} onChange={(e) => update("cableDistanceM", e.target.value)} placeholder="15" /></Field>
                      </>
                    ) : null}

                    {activeStep === 2 ? (
                      <>
                        <Field label="Source count" helper="How many sources need to enter the system?"><input className="wm-ui__input" type="number" value={record.sourceCount} onChange={(e) => update("sourceCount", e.target.value)} placeholder="3" /></Field>
                        <Field label="Typical source types" helper="Keep this simple: laptops, cameras, PCs, players, or a mix."><input className="wm-ui__input" value={record.sourceTypes} onChange={(e) => update("sourceTypes", e.target.value)} placeholder="Laptops, cameras, PC, signage player" /></Field>
                        <Field label="Where are sources located?" helper="This is one of the most important technology signals."><select className="wm-ui__select" value={record.sourcePlacement} onChange={(e) => update("sourcePlacement", e.target.value)}><option value="">Select an option</option>{SOURCE_PLACEMENT.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
                        <Field label="How do sources enter the system?" helper="Think first hop: direct cable, floor box, wall plate, rack, or network."><select className="wm-ui__select" value={record.sourceConnectionPath} onChange={(e) => update("sourceConnectionPath", e.target.value)}><option value="">Select an option</option>{SOURCE_PATH.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
                        <Field label="How do displays receive the signal?" helper="Think final hop: direct, receiver, decoder, processor, or mixed."><select className="wm-ui__select" value={record.displayConnectionPath} onChange={(e) => update("displayConnectionPath", e.target.value)}><option value="">Select an option</option>{DISPLAY_PATH.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
                      </>
                    ) : null}

                    {activeStep === 3 ? (
                      <>
                        <Field label="USB needs" helper="Only ask what the user workflow really demands."><select className="wm-ui__select" value={record.usbNeeds} onChange={(e) => update("usbNeeds", e.target.value)}><option value="">Select an option</option>{USB.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
                        <Field label="Audio needs" helper="Enough to decide whether audio transport changes the design."><select className="wm-ui__select" value={record.audioNeeds} onChange={(e) => update("audioNeeds", e.target.value)}><option value="">Select an option</option>{AUDIO.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
                        <Field label="Control needs" helper="Simple control vs automation materially changes the path."><select className="wm-ui__select" value={record.controlNeeds} onChange={(e) => update("controlNeeds", e.target.value)}><option value="">Select an option</option>{CONTROL.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
                        <Field label="Budget band" helper="Useful for early tiering, not just pricing."><select className="wm-ui__select" value={record.budgetBand} onChange={(e) => update("budgetBand", e.target.value)}><option value="">Select an option</option>{BUDGET.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
                        <Field label="Urgency" helper="Helps shape how much detail we need immediately."><select className="wm-ui__select" value={record.urgency} onChange={(e) => update("urgency", e.target.value)}><option value="">Select an option</option>{URGENCY.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
                        <label className="wm-ui__field wm-dw6__field--full">
                          <span className="wm-ui__label">Notes, caveats, or unknowns</span>
                          <textarea className="wm-ui__textarea wm-ui__textarea--sm" value={record.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Capture anything that changes the physical design: floor boxes, local racks, consultant preference, BYOD expectations, existing cabling, or open questions." />
                          <span className="wm-gp__field-help">If something is uncertain, note it. Wingman should treat unknown physical dynamics as a design risk, not ignore them.</span>
                        </label>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="wm-dw6__nav">
                  <div className="wm-dw6__navLeft">
                    <span className="wm-ui__helper wm-dw6__save-meta">{savedAt ? `Last saved at ${savedAt}` : `Progress ${totalDone}/${totalFields}`}</span>
                  </div>
                  <div className="wm-dw6__navRight">
                    <button className="wm-ui__btn wm-ui__btn--ghost" onClick={() => setActiveStep((value) => Math.max(0, value - 1))} disabled={activeStep === 0}>Previous</button>
                    <button className="wm-ui__btn" onClick={save}>Save Guided Project</button>
                    <button className="wm-ui__btn wm-ui__btn--primary" onClick={next}>{activeStep < STEP_DEFS.length - 1 ? "Next" : `Save and Open ${nextToolLabel(advice.nextToolPath)}`}</button>
                  </div>
                </div>
              </div>
            </div>

            <aside className="wm-gp__sidebar">
              <section className="wm-gp__summaryCard">
                <div className="wm-gp__summaryEyebrow">Active project</div>
                <div className="wm-gp__summaryTitle">{activeProject?.name || record.roomName || "Current guided project"}</div>
                <div className="wm-gp__summaryCopy">{activeProject ? `${activeProject.customer || "Customer not set"} · ${activeProject.stage || "Discovery"}` : "Save this input into an active project as you go."}</div>
              </section>
              <section className="wm-gp__summaryCard">
                <div className="wm-gp__summaryEyebrow">Wingman is hearing</div>
                <div className="wm-gp__summaryTitle">{advice.primary} is the current lead fit</div>
                <div className="wm-gp__confidence">Confidence: {advice.confidence}</div>
                <p className="wm-gp__summaryCopy">{advice.summary}</p>
                <div className="wm-ui__chips">{advice.families.map((family) => <span key={family} className="wm-ui__chip wm-ui__chip--active">{family}</span>)}</div>
              </section>
              <section className="wm-gp__summaryCard">
                <div className="wm-gp__summaryEyebrow">Physical dynamics</div>
                <ul className="wm-gp__list">{advice.cues.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
              <section className="wm-gp__summaryCard">
                <div className="wm-gp__summaryEyebrow">Why Wingman is leaning this way</div>
                <ul className="wm-gp__list">{advice.reasons.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
              <section className="wm-gp__summaryCard">
                <div className="wm-gp__summaryEyebrow">Next actions</div>
                <ul className="wm-gp__list">{advice.nextActions.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
            </aside>
          </div>
        </section>

        <section className="wm-section">
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <h2>How Wingman should reason about the room</h2>
              <p>Keep the logic decision-tree based so the questioning stays light while the technology reasoning stays deep.</p>
            </div>
          </div>
          <div className="wm-gp__decisionTree">
            <article className="wm-gp__decisionCard"><div className="wm-gp__summaryEyebrow">1. Source origin</div><div className="wm-gp__summaryTitle">Where do signals start?</div><div className="wm-gp__summaryCopy">Separate table BYOD, fixed cameras, local racks, and central racks because each one changes the first technology decision.</div></article>
            <article className="wm-gp__decisionCard"><div className="wm-gp__summaryEyebrow">2. First hop</div><div className="wm-gp__summaryTitle">How do they enter the system?</div><div className="wm-gp__summaryCopy">Floor boxes, wall plates, direct patching, network drops, and rack ingress imply different transport and cable assumptions.</div></article>
            <article className="wm-gp__decisionCard"><div className="wm-gp__summaryEyebrow">3. Backbone</div><div className="wm-gp__summaryTitle">What carries the signal between nodes?</div><div className="wm-gp__summaryCopy">This is where Wingman should decide between direct cable, HDBaseT, matrix switching, AVoIP, USB extension, or processor-led paths.</div></article>
            <article className="wm-gp__decisionCard"><div className="wm-gp__summaryEyebrow">4. Endpoint delivery</div><div className="wm-gp__summaryTitle">How does the signal finally reach the display?</div><div className="wm-gp__summaryCopy">Direct display feed, receiver, decoder, or processor output should be explicit because the last hop often exposes the real system shape.</div></article>
          </div>
        </section>
      </div>
    </div>
  );
}
