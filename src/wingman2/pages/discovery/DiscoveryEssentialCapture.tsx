import { operationalQuestion, updateOperationalAnswer } from "./operationalDiscovery";
import type { DiscoveryAnswers, DiscoveryNotes, DiscoveryQuestion } from "./discoveryTypes";

type Props = {
  questions: DiscoveryQuestion[];
  answers: DiscoveryAnswers;
  notes: DiscoveryNotes;
  onAnswersChange: (update: (previous: DiscoveryAnswers) => DiscoveryAnswers) => void;
  onNotesChange: (update: (previous: DiscoveryNotes) => DiscoveryNotes) => void;
  onChanged: (id: string) => void;
  onSave: () => void;
  onContinue: () => void;
  onDetails: () => void;
};

export function DiscoveryEssentialCapture(props: Props) {
  return <section className="wm-room-wizard" aria-label="Essential room details" data-testid="discovery-essential-capture">
    <h2>Tell us about the room</h2>
    <p>Start with what you know. Saved template details are already filled in. Leave unknown details open and add technical information when needed.</p>
    <label>Room brief or customer notes<textarea value={props.notes.opportunity || ""} placeholder="Paste the customer brief or describe what people need to do in the space." onChange={event => {
      const value = event.target.value;
      props.onNotesChange(previous => ({ ...previous, opportunity: value })); props.onChanged("opportunity");
    }} /></label>
    <div className="wm-room-wizard-fields">{props.questions.map(canonical => {
      const question = operationalQuestion(canonical);
      const selected = [props.answers[question.id]].flat().filter(Boolean);
      const change = (value: string) => { props.onAnswersChange(previous => updateOperationalAnswer(previous, canonical, value)); props.onChanged(question.id); };
      return <div key={question.id}>
        {question.selectionMode === "multiple" ? <details><summary>{question.question} · {selected.length ? `${selected.length} selected` : "Not yet known"}</summary><fieldset><legend>{question.shortLabel}</legend>{question.options.map(option => <label className="wm-room-wizard-check" key={option.value}><input type="checkbox" checked={selected.includes(option.value)} onChange={() => change(option.value)} />{option.label}</label>)}</fieldset></details>
          : <label>{question.question}<select value={selected[0] || ""} onChange={event => change(event.target.value)}><option value="">Not yet known</option>{question.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}
      </div>;
    })}</div>
    <div className="wm-room-wizard-fields">
      <label>Number of people<input type="number" min="1" value={String(props.answers["room-occupancy"] || "")} onChange={event => { const value = event.target.value; props.onAnswersChange(previous => ({ ...previous, "room-occupancy": value })); }} /></label>
      <label>Room dimensions and seating<input value={String(props.answers["room-dimensions"] || "")} onChange={event => { const value = event.target.value; props.onAnswersChange(previous => ({ ...previous, "room-dimensions": value })); }} /></label>
    </div>
    <div className="wm-room-wizard-actions">
      <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={props.onSave}>Save room brief</button>
      <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={props.onDetails}>Add technical details or equipment</button>
      <button type="button" className="wm-ui-button wm-ui-button-primary" onClick={props.onContinue}>Find WyreStorm products</button>
    </div>
  </section>;
}
