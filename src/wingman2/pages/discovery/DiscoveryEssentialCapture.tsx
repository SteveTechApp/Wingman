import { appendTranscriptNote, VoiceRequestCapture } from "../../components/VoiceRequestCapture";
import { DiscoverySiteConditions } from "./DiscoverySiteConditions";
import { DISCOVERY_SECTIONS, discoverySectionFor } from "./discoverySections";
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
  // The market/environment choice above this capture is the room-type input.
  // Keep the opportunity answer in the model to shape follow-up questions, but
  // do not ask the rep to choose the same room type a second time here.
  const rows = props.questions
    .filter((question) => question.id !== "opportunity")
    .map((canonical) => ({ canonical, question: operationalQuestion(canonical) }));
  const answered = rows.filter(({ question }) => {
    const value = props.answers[question.id];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  }).length;
  const sections = DISCOVERY_SECTIONS.filter(section => !["brief", "site", "equipment", "review"].includes(section.id));

  const renderQuestion = ({ canonical, question }: typeof rows[number]) => {
    const selected = [props.answers[question.id]].flat().filter(Boolean);
    if (question.selectionMode !== "multiple") {
      return <div className="wm-room-wizard-fields" key={question.id}>
        <label>{question.question}
          <select value={selected[0] || ""} onChange={event => {
            const value = event.target.value;
            props.onAnswersChange(previous => updateOperationalAnswer(previous, canonical, value)); props.onChanged(question.id);
          }}>
            <option value="">Not yet known</option>
            {question.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        {renderDetails(question)}
      </div>;
    }

    const titleId = `brief-${question.id}-title`;
    const change = (value: string) => {
      props.onAnswersChange(previous => updateOperationalAnswer(previous, canonical, value)); props.onChanged(question.id);
    };
    return <div key={question.id}>
      <section className="wm-brief-question" aria-labelledby={titleId} data-testid={`discovery-brief-question-${question.id}`}>
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
      </section>
      {renderDetails(question)}
    </div>;
  };

  const renderDetails = (question: DiscoveryQuestion) => {
    const labels: Record<string, string> = {
      "locations-connections": "Where are the connections and screens, and how far apart are they?",
      "signal-standard": "Do you know the screen models or the picture quality they need?",
      usb: "Which room devices should a laptop connect to, and how far are they from the computer?",
      commissioning: "What exact tests, handover documents or training are expected?",
    };
    const label = labels[question.id];
    if (!label) return null;
    return <label className="wm-room-wizard-field-wide" key={`${question.id}-details`}>{label}
      <textarea value={props.notes[question.id] || ""} placeholder={question.capturePlaceholder} onChange={event => props.onNotesChange(previous => ({ ...previous, [question.id]: event.target.value }))} />
    </label>;
  };

  return <section className="wm-room-wizard" aria-label="Essential room details" data-testid="discovery-essential-capture">
    <header className="wm-room-wizard-heading">
      <div>
        <p className="wm-room-wizard-eyebrow">Room briefing · Essential details</p>
        <h2>Tell us about the room</h2>
        <p className="wm-room-wizard-intro">Start with what you know. Pre-filled suggestions are starting points to review, not confirmed customer requirements. Mark building or installation work as not known or by others when needed.</p>
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
    {/* The brief is the one question a rep answers in the customer's own words,
        so it is the one that can be spoken: a voice note lands under whatever
        has been typed rather than replacing it. */}
    <div className="wm-room-wizard-field-wide"><VoiceRequestCapture compact onTranscript={text => {
      props.onNotesChange(previous => ({ ...previous, opportunity: appendTranscriptNote(previous.opportunity || "", text) }));
      props.onChanged("opportunity");
    }} /></div>

    <div className="wm-room-wizard-fields">
      <label>Number of people<input type="number" min="1" value={String(props.answers["room-occupancy"] || "")} onChange={event => { const value = event.target.value; props.onAnswersChange(previous => ({ ...previous, "room-occupancy": value })); }} /></label>
      <label>Room dimensions and seating<input value={String(props.answers["room-dimensions"] || "")} onChange={event => { const value = event.target.value; props.onAnswersChange(previous => ({ ...previous, "room-dimensions": value })); }} /></label>
    </div>

    <DiscoverySiteConditions answers={props.answers} onChange={props.onAnswersChange} plainLanguage area="environment" />
    {sections.map(section => {
      const sectionRows = rows.filter(row => discoverySectionFor(row.canonical) === section.id);
      if (!sectionRows.length && section.id !== "lighting") return null;
      return <section className="wm-site-conditions" key={section.id} aria-label={section.title}>
        <header><h3>{section.title}</h3><p>{section.description}</p></header>
        {sectionRows.map(renderQuestion)}
        {section.id === "lighting" && <DiscoverySiteConditions answers={props.answers} onChange={props.onAnswersChange} plainLanguage area="lighting" hideHeader />}
      </section>;
    })}
    <div className="wm-room-wizard-actions">
      <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={props.onSave}>Save room brief</button>
      <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={props.onDetails}>Add technical details or equipment</button>
      <button type="button" className="wm-ui-button wm-ui-button-primary" onClick={props.onContinue}>Find WyreStorm products</button>
    </div>
  </section>;
}
