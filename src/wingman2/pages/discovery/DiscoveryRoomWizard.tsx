import { useEffect, useRef, useState } from "react";
import { EquipmentLibraryPanel } from "../../components/EquipmentLibraryPanel";
import { addEquipmentToRoom } from "../../lib/equipmentLibrary";
import type { ProjectTopology } from "../../lib/projectTopology";
import { operationalQuestion, roomEquipmentSchedule, supportingRoomScope, updateOperationalAnswer } from "./operationalDiscovery";
import { DiscoveryRoomLocations } from "./DiscoveryRoomLocations";
import { DiscoverySiteConditions } from "./DiscoverySiteConditions";
import { DiscoveryCaptureSuggestion } from "./DiscoveryCaptureSuggestion";
import { getQuestionView } from "./discoveryAnswerUtils";
import type { DiscoveryAnswers, DiscoveryNotes, DiscoveryQuestion } from "./discoveryTypes";

const journey = [
  { id: "room", label: "Room & people", matches: (id: string) => ["opportunity", "scale"].includes(id) },
  { id: "sources", label: "Sources", matches: (id: string) => id.startsWith("source-") || id === "sources" || id.startsWith("wireless-presentation") },
  { id: "screens", label: "Screens", matches: (id: string) => /^(display|signal-standard|video-wall|multiview)/.test(id) },
  { id: "sound", label: "Sound & calls", matches: (id: string) => /^(audio|room-acoustics|uc-|usb)/.test(id) },
  { id: "routing", label: "Routing & connections", matches: (id: string) => ["network-path", "avoip-profile", "locations-connections"].includes(id) },
  { id: "operation", label: "Room operation", matches: (id: string) => id === "control" },
] as const;

type Props = {
  questions: DiscoveryQuestion[]; answers: DiscoveryAnswers; notes: DiscoveryNotes;
  activeIndex: number; onActiveIndexChange: (index: number) => void;
  onAnswersChange: (updater: DiscoveryAnswers | ((previous: DiscoveryAnswers) => DiscoveryAnswers)) => void;
  onNotesChange: (updater: DiscoveryNotes | ((previous: DiscoveryNotes) => DiscoveryNotes)) => void;
  onConfirm: (id: string, confirmed: boolean) => void;
  topology: ProjectTopology; onTopologyChange: (next: ProjectTopology) => void;
  onBuildLayout?: () => void;
  onSave: () => void; onExport: () => void; onComplete: () => void;
  savedMessage: string; designDirection: string; reviewRequested?: boolean;
  confirmed?: Record<string, boolean>;
  onConfirmCaptureSuggestion: (questionId: string, values: string[], confidence?: "high" | "matched" | "low") => void;
};
export function DiscoveryRoomWizard(props: Props) {
  const { questions, answers, notes, activeIndex, onActiveIndexChange, topology } = props;
  const [stage, setStage] = useState<"questions" | "equipment" | "review">("questions");
  const heading = useRef<HTMLHeadingElement>(null);
  const canonical = questions[Math.min(activeIndex, questions.length - 1)];
  const question = canonical && operationalQuestion(canonical);
  useEffect(() => { heading.current?.focus(); }, [activeIndex, stage]);
  useEffect(() => { if (props.reviewRequested) setStage("review"); }, [props.reviewRequested]);
  if (!question) return <p>Select a room activity to begin.</p>;
  const selected = [answers[question.id]].flat();
  const scope = supportingRoomScope(answers, topology);
  const journeySteps = journey.map(step => ({ ...step, firstIndex: questions.findIndex(row => step.matches(row.id)) })).filter(step => step.firstIndex >= 0);
  const activeJourney = journeySteps.findIndex(step => step.matches(question.id));
  const choose = (value: string) => {
    props.onAnswersChange(previous => updateOperationalAnswer(previous, canonical, value));
    props.onConfirm(question.id, false);
  };
  return <section className="wm-room-wizard" aria-label="Guided room discovery" data-room-wizard-stage={stage}>
    <div className="wm-room-wizard-heading"><div><p className="wm-room-wizard-eyebrow">Build your room · {stage === "questions" ? question.section : stage === "equipment" ? "Complete the equipment" : "Your room brief"}</p>
      <h2 ref={heading} tabIndex={-1} data-discovery-question-id={stage === "questions" ? question.id : undefined}>{stage === "questions" ? question.question : stage === "equipment" ? "What equipment do you already use?" : "Here is the room we are building"}</h2></div>
      <span>{stage === "questions" ? `${activeIndex + 1} of ${questions.length}` : stage === "equipment" ? "Equipment" : "Review"}</span></div>
    {stage === "questions" && <nav className="wm-room-journey-nav" aria-label="Room building steps">{journeySteps.map((step, index) => <button type="button" key={step.id}
      aria-current={index === activeJourney ? "step" : undefined} className={index === activeJourney ? "is-active" : ""}
      onClick={() => onActiveIndexChange(step.firstIndex)}>{step.label}</button>)}</nav>}
    <div className="wm-room-wizard-layout"><div>
      {stage === "questions" ? <>
        <p>{question.prompt}</p>
        {["sources", "displays"].includes(question.id) && <label>Exact number, if known (up to 256)<input type="number" min="1" max="256" step="1" value={String(answers[question.id === "sources" ? "source-count-exact" : "display-count-exact"] || "")} onChange={event => {
          const count = Number(event.target.value);
          if (event.target.value && (!Number.isInteger(count) || count < 1 || count > 256)) return;
          props.onAnswersChange(previous => ({ ...previous, [question.id === "sources" ? "source-count-exact" : "display-count-exact"]: event.target.value,
            ...(count > 0 ? { [question.id]: question.id === "sources" ? count === 1 ? "one-source" : count <= 4 ? "two-four-sources" : count <= 8 ? "five-eight-sources" : "nine-plus-sources" : count === 1 ? "one-display" : count === 2 ? "two-displays" : count <= 8 ? "three-eight-displays" : "nine-plus-displays" } : {}) }));
          props.onConfirm(question.id, false);
        }} /></label>}
        {question.id === "scale" && <><div className="wm-room-wizard-fields"><label>Number of people<input type="number" min="1" value={String(answers["room-occupancy"] || "")} onChange={event => props.onAnswersChange(previous => ({ ...previous, "room-occupancy": event.target.value }))} /></label><label>Room dimensions and seating<textarea value={String(answers["room-dimensions"] || "")} onChange={event => props.onAnswersChange(previous => ({ ...previous, "room-dimensions": event.target.value }))} placeholder="12 × 8 metres, rows facing the lectern" /></label></div><DiscoverySiteConditions answers={answers} onChange={props.onAnswersChange} compact /></>}
        {question.id === "locations-connections" ? <DiscoveryRoomLocations topology={topology} onChange={props.onTopologyChange} /> : <div className="wm-room-wizard-options">{question.options.map(option => <button className="wm-room-wizard-option" type="button" key={option.value} aria-pressed={selected.includes(option.value)} onClick={() => choose(option.value)}>{option.label}</button>)}</div>}
        <label>Tell Wingman how people will use this<textarea value={notes[question.id] || ""} onChange={event => { props.onNotesChange(previous => ({ ...previous, [question.id]: event.target.value })); props.onConfirm(question.id, false); }} placeholder={question.capturePlaceholder} /></label>
        <DiscoveryCaptureSuggestion step={canonical} view={getQuestionView(canonical, String(answers.opportunity || ""))} note={notes[question.id] || ""}
          onConfirm={(values, confidence) => props.onConfirmCaptureSuggestion(question.id, values, confidence)} />
        <details><summary>How this shapes the design</summary><p>{question.why}</p></details>
        <label className="wm-room-wizard-check"><input type="checkbox" checked={Boolean(props.confirmed?.[question.id])} onChange={event => props.onConfirm(question.id, event.target.checked)} />Confirmed with the customer</label>
        <div className="wm-room-wizard-actions"><button type="button" className="wm-ui-button wm-ui-button-secondary" disabled={activeIndex === 0} onClick={() => onActiveIndexChange(activeIndex - 1)}>Back</button>
          <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={() => { const unknown = canonical.options.find(option => /unknown|not-sure|not-confirmed/.test(option.value)); props.onAnswersChange(previous => { const next = { ...previous }; if (unknown) next[question.id] = unknown.value; else delete next[question.id]; return next; }); props.onConfirm(question.id, false); props.onNotesChange(previous => ({ ...previous, [question.id]: [previous[question.id], "To confirm with customer or installer."].filter(Boolean).join("\n") })); if (activeIndex < questions.length - 1) onActiveIndexChange(activeIndex + 1); else setStage("equipment"); }}>I'm not sure—keep this open</button>
          <button type="button" className="wm-ui-button wm-ui-button-primary" onClick={() => { if (activeIndex < questions.length - 1) onActiveIndexChange(activeIndex + 1); else setStage("equipment"); }}>Continue</button></div>
      </> : stage === "equipment" ? <>{props.onBuildLayout && <><p>Build or refresh the room positions from your latest answers. Saved equipment selections are retained; connections still need review.</p><button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={props.onBuildLayout}>Build room layout from answers</button></>}<DiscoveryRoomLocations topology={topology} onChange={props.onTopologyChange} /><EquipmentLibraryPanel locations={topology.locations} onSelect={(item, location, quantity) => props.onTopologyChange(addEquipmentToRoom(topology, item, location, quantity))} /><div className="wm-room-wizard-actions"><button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={() => setStage("questions")}>Back to questions</button><button type="button" className="wm-ui-button wm-ui-button-primary" onClick={() => setStage("review")}>Review room brief</button></div></> : <>
        <p>{props.designDirection || "Wingman will use your answers to identify a suitable routing direction. Equipment selection follows the room brief."}</p>
      <h3>Equipment and locations</h3><ul>{roomEquipmentSchedule(topology).map((row, index) => <li key={index}>{row}</li>)}</ul>
        <h3>Room and site conditions</h3><ul>{Object.entries(answers).filter(([id, value]) => id.startsWith("site-") && Boolean(value)).map(([id, value]) => <li key={id}><strong>{id.replace("site-", "").replaceAll("-", " ")}</strong>: {String(value)}</li>)}</ul>
        <h3>Complete these items before design sign-off</h3><ul>{scope.map(row => <li key={row}>{row}</li>)}</ul>
        <p>Saved products are proposed selections. Check specifications, quantities, cable paths and compatibility before issue.</p>
        <div className="wm-room-wizard-actions"><button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={() => setStage("equipment")}>Edit equipment</button><button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={() => { onActiveIndexChange(0); setStage("questions"); }}>Review answers</button><button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={props.onSave}>Save room brief</button><button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={props.onExport}>Export completion brief</button><button type="button" className="wm-ui-button wm-ui-button-primary" onClick={props.onComplete}>Find WyreStorm products</button></div>
      </>}
      {props.savedMessage && <p role="status">{props.savedMessage}</p>}
    </div><aside className="wm-room-wizard-summary" aria-label="Your room so far"><h3>Your room so far</h3>
      {props.designDirection && <p>{props.designDirection}</p>}
      {answers["room-occupancy"] && <p>{String(answers["room-occupancy"])} people · {String(answers["room-dimensions"] || "Room dimensions to confirm")}</p>}
      {questions.filter(row => answers[row.id]).map(row => <p key={row.id}><strong>{operationalQuestion(row).shortLabel}</strong><br />{[answers[row.id]].flat().map(value => operationalQuestion(row).options.find(option => option.value === value)?.label || value).join(", ")}</p>)}
      <h4>Positions</h4>{topology.locations.map(location => <p key={location.id}>{location.name}</p>)}
      <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={() => setStage("equipment")}>Equipment and room positions</button>
    </aside></div>
  </section>;
}
