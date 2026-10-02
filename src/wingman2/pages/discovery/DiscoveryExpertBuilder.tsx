import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { EquipmentLibraryPanel } from "../../components/EquipmentLibraryPanel";
import { addEquipmentToRoom } from "../../lib/equipmentLibrary";
import type { ProjectTopology } from "../../lib/projectTopology";
import { DiscoveryRoomLocations } from "./DiscoveryRoomLocations";
import { DiscoverySiteConditions } from "./DiscoverySiteConditions";
import type { DiscoveryAnswers, DiscoveryNotes, DiscoveryQuestion } from "./discoveryTypes";
import { getQuestionView, wmDiscoveryAnswerToText, wmDiscoveryHasAnswer } from "./discoveryAnswerUtils";
import { updateOperationalAnswer } from "./operationalDiscovery";
import { changeDiscoveryApplication } from "./discoveryMarketContext";
import { DiscoveryCaptureSuggestion } from "./DiscoveryCaptureSuggestion";

const sections = [
  { id: "brief", title: "Room brief", description: "Purpose, people and scale" },
  { id: "site", title: "Site & construction", description: "Room dimensions, surfaces and infrastructure" },
  { id: "sources", title: "Sources", description: "Devices, user connections and source positions" },
  { id: "outputs", title: "Displays & outputs", description: "Screens, projectors, walls and viewing needs" },
  { id: "routing", title: "Video routing", description: "Distribution, switching and picture requirements" },
  { id: "audio", title: "Audio", description: "Microphones, speakers, zones and processing" },
  { id: "conferencing", title: "Conferencing & USB", description: "Meeting host, cameras, capture and USB paths" },
  { id: "control", title: "Control", description: "How people operate the room" },
  { id: "locations", title: "Locations & cabling", description: "Device positions, routes and cable lengths" },
  { id: "equipment", title: "Equipment schedule", description: "Selected products, placeholders and quantities" },
  { id: "review", title: "Review & validation", description: "Assumptions and items to confirm" },
] as const;

type SectionId = (typeof sections)[number]["id"];

function sectionFor(question: DiscoveryQuestion): SectionId {
  const id = question.id;
  if (id === "opportunity" || id === "scale") return "brief";
  if (/^source|wireless-presentation/.test(id)) return "sources";
  if (/^(display|signal-standard|video-wall|multiview)/.test(id)) return "outputs";
  if (["network-path", "avoip-profile"].includes(id)) return "routing";
  if (/^(audio|room-acoustics|uc-microphone|uc-audio)/.test(id)) return "audio";
  if (["uc-purpose", "uc-platform", "mtr-av-integration", "uc-camera", "uc-camera-count", "uc-multi-camera-path", "uc-camera-routing", "usb"].includes(id)) return "conferencing";
  if (id === "control") return "control";
  if (id === "locations-connections") return "locations";
  return "site";
}

type Props = {
  questions: DiscoveryQuestion[];
  answers: DiscoveryAnswers;
  notes: DiscoveryNotes;
  confirmed: Record<string, boolean>;
  topology: ProjectTopology;
  issues: string[];
  onAnswersChange: Dispatch<SetStateAction<DiscoveryAnswers>>;
  onNotesChange: Dispatch<SetStateAction<DiscoveryNotes>>;
  onConfirm: (id: string, confirmed: boolean) => void;
  onTopologyChange: (next: ProjectTopology) => void;
  onSave: () => void;
  onExport: () => void;
  onContinue: () => void;
  savedMessage: string;
  initialQuestionId?: string;
  onConfirmCaptureSuggestion: (questionId: string, values: string[], confidence?: "high" | "matched" | "low") => void;
};

export function DiscoveryExpertBuilder(props: Props) {
  const { questions, answers, notes, confirmed, topology } = props;
  const [activeSection, setActiveSection] = useState<SectionId>("brief");
  const application = wmDiscoveryAnswerToText(answers.opportunity);
  const questionsBySection = useMemo(() => {
    const grouped = new Map<SectionId, DiscoveryQuestion[]>();
    for (const section of sections) grouped.set(section.id, []);
    for (const question of questions) grouped.get(sectionFor(question))?.push(question);
    return grouped;
  }, [questions]);
  const active = sections.find(section => section.id === activeSection) ?? sections[0];
  const sectionQuestions = questionsBySection.get(activeSection) ?? [];
  useEffect(() => {
    const target = questions.find(question => question.id === props.initialQuestionId);
    if (target) setActiveSection(sectionFor(target));
  }, [props.initialQuestionId, questions]);
  const captured = questions.filter(question => wmDiscoveryHasAnswer(answers[question.id])).length;
  const roomSummary = [
    application && `Use: ${application}`,
    answers.scale && `Scale: ${wmDiscoveryAnswerToText(answers.scale)}`,
    answers["room-occupancy"] && `${String(answers["room-occupancy"])} people`,
    answers["room-dimensions"] && `Room: ${String(answers["room-dimensions"])}`,
  ].filter(Boolean) as string[];

  const selectOption = (question: DiscoveryQuestion, value: string) => {
    props.onAnswersChange(previous => question.id === "opportunity"
      ? changeDiscoveryApplication(previous, value)
      : updateOperationalAnswer(previous, question, value));
    props.onConfirm(question.id, false);
  };

  return <section className="wm-room-wizard wm-discovery-expert" aria-label="Expert room design" data-expert-section={activeSection}>
    <header className="wm-expert-builder-heading">
      <div><p className="wm-room-wizard-eyebrow">Room design workspace · Expert view</p><h2>Build the room section by section</h2>
        <p>Capture confirmed details, working assumptions, and items still to survey. You can save and continue while information is open.</p></div>
      <div className="wm-expert-capture-count"><strong>{captured}</strong><span>of {questions.length} design questions captured</span></div>
    </header>
    <div className="wm-expert-builder-layout">
      <nav className="wm-expert-section-nav" aria-label="Room design sections">
        {sections.map(section => {
          const rows = questionsBySection.get(section.id) ?? [];
          const done = rows.filter(question => wmDiscoveryHasAnswer(answers[question.id])).length;
          const isActive = activeSection === section.id;
          return <button type="button" key={section.id} className={isActive ? "is-active" : ""}
            aria-current={isActive ? "step" : undefined} onClick={() => setActiveSection(section.id)}>
            <span><strong>{section.title}</strong><small>{section.description}</small></span>
            <em>{section.id === "equipment" ? topology.devices.length : section.id === "site" ? "6 fields" : `${done}/${rows.length}`}</em>
          </button>;
        })}
      </nav>
      <div className="wm-expert-section-content">
        <header><p className="wm-room-wizard-eyebrow">{active.title}</p><h3>{active.description}</h3></header>
        {activeSection === "brief" && <>
          {sectionQuestions.map(question => <ExpertQuestion key={question.id} question={question} application={application}
            answer={answers[question.id]} note={notes[question.id] ?? ""} confirmed={Boolean(confirmed[question.id])}
            onSelect={value => selectOption(question, value)} onNoteChange={value => props.onNotesChange(previous => ({ ...previous, [question.id]: value }))}
            onConfirm={value => props.onConfirm(question.id, value)} onConfirmCapture={(values, confidence) => props.onConfirmCaptureSuggestion(question.id, values, confidence)} />)}
          <div className="wm-room-wizard-fields"><label htmlFor="expert-room-occupancy">Expected number of people
            <input id="expert-room-occupancy" type="number" min="1" value={String(answers["room-occupancy"] || "")} onChange={event => props.onAnswersChange(previous => ({ ...previous, "room-occupancy": event.target.value }))} /></label>
            <label htmlFor="expert-room-dimensions">Room size and seating
              <textarea id="expert-room-dimensions" value={String(answers["room-dimensions"] || "")} placeholder="e.g. 12 × 8 metres, 24 seats around a table" onChange={event => props.onAnswersChange(previous => ({ ...previous, "room-dimensions": event.target.value }))} /></label></div>
        </>}
        {activeSection === "site" && <DiscoverySiteConditions answers={answers} onChange={props.onAnswersChange} />}
        {activeSection !== "brief" && activeSection !== "site" && activeSection !== "equipment" && activeSection !== "locations" && activeSection !== "review" && sectionQuestions.map(question =>
          <ExpertQuestion key={question.id} question={question} application={application} answer={answers[question.id]} note={notes[question.id] ?? ""}
            confirmed={Boolean(confirmed[question.id])} onSelect={value => selectOption(question, value)}
            onNoteChange={value => props.onNotesChange(previous => ({ ...previous, [question.id]: value }))}
            onConfirm={value => props.onConfirm(question.id, value)} onConfirmCapture={(values, confidence) => props.onConfirmCaptureSuggestion(question.id, values, confidence)} />)}
        {activeSection === "locations" && <><DiscoverySiteConditions answers={answers} onChange={props.onAnswersChange} compact />
          {sectionQuestions.map(question => <ExpertQuestion key={question.id} question={question} application={application} answer={answers[question.id]} note={notes[question.id] ?? ""}
            confirmed={Boolean(confirmed[question.id])} onSelect={value => selectOption(question, value)} onNoteChange={value => props.onNotesChange(previous => ({ ...previous, [question.id]: value }))}
            onConfirm={value => props.onConfirm(question.id, value)} onConfirmCapture={(values, confidence) => props.onConfirmCaptureSuggestion(question.id, values, confidence)} />)}
          <DiscoveryRoomLocations topology={topology} onChange={props.onTopologyChange} /></>}
        {activeSection === "equipment" && <>
          <p>Keep an item as a role placeholder until the manufacturer and model are confirmed. WyreStorm equipment, competitor alternatives, and complementary products retain separate identities.</p>
          <details className="wm-expert-equipment-library"><summary>Add from saved equipment</summary><EquipmentLibraryPanel locations={topology.locations} onSelect={(item, location, quantity) => props.onTopologyChange(addEquipmentToRoom(topology, item, location, quantity))} /></details>
          <DiscoveryRoomLocations topology={topology} onChange={props.onTopologyChange} />
          <h4>Current equipment</h4>
          {topology.devices.length ? <ul>{topology.devices.map(device => <li key={device.id}><strong>{device.quantity} × {device.manufacturer || "Manufacturer to select"} {device.sku || device.name}</strong> — {device.category}; {topology.locations.find(location => location.id === device.locationId)?.name || "location to confirm"}; {device.productRelationship === "competitor" ? "competitor alternative" : device.thirdParty ? "complementary third-party" : "WyreStorm"} · {device.status}</li>)}</ul> : <p>No equipment has been added yet. The room brief can still be saved.</p>}
        </>}
        {activeSection === "review" && <>
          <h4>Room so far</h4><ul>{roomSummary.length ? roomSummary.map(item => <li key={item}>{item}</li>) : <li>Room purpose and size still need to be confirmed.</li>}</ul>
          <h4>Open checks</h4>{props.issues.length ? <ul>{props.issues.map(issue => <li key={issue}>{issue}</li>)}</ul> : <p>No discovery checks are currently flagged.</p>}
          <p>{topology.devices.length} equipment items, {topology.locations.length} locations, and {topology.connections.length} signal or infrastructure routes are in the room design. Unknowns remain marked for follow-up; they do not prevent saving or continuing.</p>
        </>}
        <div className="wm-room-wizard-actions">
          <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={props.onSave}>Save room brief</button>
          <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={props.onExport}>Export room brief</button>
          <button type="button" className="wm-ui-button wm-ui-button-primary" onClick={props.onContinue}>Continue to WyreStorm recommendations</button>
        </div>
        {props.savedMessage && <p role="status">{props.savedMessage}</p>}
      </div>
    </div>
  </section>;
}

function ExpertQuestion({ question, application, answer, note, confirmed, onSelect, onNoteChange, onConfirm, onConfirmCapture }: {
  question: DiscoveryQuestion; application: string; answer: string | string[] | undefined; note: string; confirmed: boolean;
  onSelect: (value: string) => void; onNoteChange: (value: string) => void; onConfirm: (value: boolean) => void;
  onConfirmCapture: (values: string[], confidence?: "high" | "matched" | "low") => void;
}) {
  const view = getQuestionView(question, application);
  const selected = Array.isArray(answer) ? answer : answer ? [answer] : [];
  return <article className="wm-expert-question" id={`expert-question-${question.id}`}>
    <header><div><h4>{view.question}</h4><p>{view.prompt}</p></div><span className={selected.length ? "is-captured" : ""}>{selected.length ? "Captured" : question.optional ? "Optional" : "Open"}</span></header>
    <div className="wm-room-wizard-options">{view.options.map(option => <button type="button" className="wm-room-wizard-option" key={option.value}
      aria-pressed={selected.includes(option.value)} onClick={() => onSelect(option.value)}>
      <strong>{option.label}</strong>{option.help && <small>{option.help}</small>}
    </button>)}</div>
    <label>Design notes and exact details<textarea value={note} placeholder={question.capturePlaceholder} onChange={event => onNoteChange(event.target.value)} /></label>
    <DiscoveryCaptureSuggestion step={question} view={view} note={note} onConfirm={onConfirmCapture} />
    <label className="wm-room-wizard-check"><input type="checkbox" checked={confirmed} onChange={event => onConfirm(event.target.checked)} />Confirmed with the customer or site team</label>
    <details><summary>Technical design impact</summary><p>{view.why}</p></details>
  </article>;
}
