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
  const rows = props.questions.map((canonical) => ({ canonical, question: operationalQuestion(canonical) }));
  const answered = rows.filter(({ question }) => {
    const value = props.answers[question.id];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  }).length;
  const singles = rows.filter(({ question }) => question.selectionMode !== "multiple");
  const multiples = rows.filter(({ question }) => question.selectionMode === "multiple");

  return <section className="wm-room-wizard" aria-label="Essential room details" data-testid="discovery-essential-capture">
    <header className="wm-room-wizard-heading">
      <div>
        <p className="wm-room-wizard-eyebrow">Room briefing · Essential details</p>
        <h2>Tell us about the room</h2>
        <p className="wm-room-wizard-intro">Start with what you know. Saved template details are already filled in. Leave unknown details open and add technical information when needed.</p>
      </div>
      <div className="wm-expert-capture-count" data-testid="discovery-brief-progress">
        <strong>{answered}</strong>
        <span>of {rows.length} questions answered</span>
      </div>
    </header>

    <label className="wm-room-wizard-field-wide">Room brief or customer notes<textarea value={props.notes.opportunity || ""} placeholder="Paste the customer brief or describe what people need to do in the space." onChange={event => {
      const value = event.target.value;
      props.onNotesChange(previous => ({ ...previous, opportunity: value })); props.onChanged("opportunity");
    }} /></label>

    {singles.length > 0 && <div className="wm-room-wizard-fields">{singles.map(({ canonical, question }) => {
      const selected = [props.answers[question.id]].flat().filter(Boolean);
      return <label key={question.id}>{question.question}
        <select value={selected[0] || ""} onChange={event => {
          const value = event.target.value;
          props.onAnswersChange(previous => updateOperationalAnswer(previous, canonical, value)); props.onChanged(question.id);
        }}>
          <option value="">Not yet known</option>
          {question.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>;
    })}</div>}

    {multiples.length > 0 && <div className="wm-brief-questions">{multiples.map(({ canonical, question }) => {
      const selected = [props.answers[question.id]].flat().filter(Boolean);
      const titleId = `brief-${question.id}-title`;
      const change = (value: string) => {
        props.onAnswersChange(previous => updateOperationalAnswer(previous, canonical, value)); props.onChanged(question.id);
      };
      return <section className="wm-brief-question" key={question.id} aria-labelledby={titleId} data-testid={`discovery-brief-question-${question.id}`}>
        <header className="wm-brief-question-head">
          <div>
            <h3 id={titleId}>{question.question}</h3>
            <p>{question.prompt}</p>
          </div>
          <span className={selected.length ? "wm-brief-count is-selected" : "wm-brief-count"}>
            {selected.length ? `${selected.length} selected` : "Not yet known"}
          </span>
        </header>
        <div className="wm-brief-options" role="group" aria-labelledby={titleId}>
          {question.options.map(option => {
            const isSelected = selected.includes(option.value);
            return <label className={isSelected ? "wm-room-wizard-check wm-brief-option is-selected" : "wm-room-wizard-check wm-brief-option"} key={option.value}>
              <input type="checkbox" checked={isSelected} onChange={() => change(option.value)} />
              <span className="wm-brief-option-tick" aria-hidden="true">✓</span>
              <span className="wm-brief-option-label">{option.label}</span>
            </label>;
          })}
        </div>
      </section>;
    })}</div>}

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
