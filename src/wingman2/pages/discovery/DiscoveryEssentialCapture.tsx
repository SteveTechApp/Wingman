import { useState } from "react";
import { appendTranscriptNote, VoiceRequestCapture } from "../../components/VoiceRequestCapture";
import { RoomDimensionsFields } from "./RoomDimensionsFields";
import { DiscoverySiteConditions } from "./DiscoverySiteConditions";
import { operationalQuestion, updateOperationalAnswer } from "./operationalDiscovery";
import type { DiscoveryAnswers, DiscoveryNotes, DiscoveryQuestion } from "./discoveryTypes";

const ESSENTIAL_SECTION_DEFINITIONS = [
  { id: "room", title: "Room & site", description: "Purpose, people, size and infrastructure", includes: (id: string) => !["sources", "displays", "display-behaviour", "signal-standard", "uc-purpose", "audio", "audio-route", "audio-zones", "audio-programme", "room-acoustics"].includes(id) },
  { id: "screens", title: "Sources & displays", description: "What connects and what people see", includes: (id: string) => ["sources", "primary-display", "displays", "repeater-displays", "display-behaviour", "signal-standard"].includes(id) },
  { id: "audio", title: "Audio & calls", description: "Sound, calls and listening areas", includes: (id: string) => ["uc-purpose", "audio", "audio-route", "audio-zones", "audio-programme", "room-acoustics"].includes(id) },
] as const;

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
  const sections = ESSENTIAL_SECTION_DEFINITIONS.map(section => ({
    ...section,
    rows: rows.filter(({ canonical }) => section.includes(canonical.id)),
  })).filter(section => section.rows.length > 0);
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? "room");
  const activeSectionIndex = Math.max(0, sections.findIndex(section => section.id === activeSectionId));
  const activeSection = sections[activeSectionIndex];
  const sectionRows = activeSection?.rows ?? rows;
  const answered = rows.filter(({ question }) => {
    const value = props.answers[question.id];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  }).length;
  const answeredInSection = sectionRows.filter(({ question }) => {
    const value = props.answers[question.id];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  }).length;
  const singles = sectionRows.filter(({ question }) => question.selectionMode !== "multiple");
  const multiples = sectionRows.filter(({ question }) => question.selectionMode === "multiple");

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

    {sections.length > 1 && <nav className="wm-essential-section-nav" aria-label="Room brief sections" data-testid="discovery-essential-sections">
      {sections.map(section => {
        const sectionAnswered = section.rows.filter(({ question }) => {
          const value = props.answers[question.id];
          return Array.isArray(value) ? value.length > 0 : Boolean(value);
        }).length;
        const isActive = section.id === activeSection?.id;
        return <button type="button" key={section.id} aria-current={isActive ? "step" : undefined}
          className={isActive ? "is-active" : ""} onClick={() => setActiveSectionId(section.id)}>
          <span><strong>{section.title}</strong><small>{section.description}</small></span>
          <em>{sectionAnswered}/{section.rows.length}</em>
        </button>;
      })}
    </nav>}

    <section className="wm-essential-section" aria-labelledby="discovery-essential-section-title" data-essential-section={activeSection?.id}>
      {sections.length > 1 && <header className="wm-essential-section-heading">
        <div><p className="wm-room-wizard-eyebrow">Section {activeSectionIndex + 1} of {sections.length}</p>
          <h3 id="discovery-essential-section-title">{activeSection?.title}</h3></div>
        <span>{answeredInSection} of {sectionRows.length} answered</span>
      </header>}

    {activeSection?.id === "room" && <>
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
    </>}

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

    {activeSection?.id === "room" && <div className="wm-room-wizard-fields">
      <label>{props.notes["room-occupancy"]?.startsWith("Starting estimate") ? "Expected number of people (starting estimate)" : "Expected number of people"}<input type="number" min="1" value={String(props.answers["room-occupancy"] || "")} onChange={event => { const value = event.target.value; props.onAnswersChange(previous => ({ ...previous, "room-occupancy": value })); }} />{props.notes["room-occupancy"] && <small>{props.notes["room-occupancy"]}</small>}</label>
      <RoomDimensionsFields idPrefix="essential" answers={props.answers} onChange={props.onAnswersChange} />
    </div>}
    {activeSection?.id === "room" && <details className="wm-essential-site-details">
      <summary>Building and installation conditions (optional)</summary>
      <p>Record construction, floor, ceiling, fixing support and containment when known. Leave anything else for the site survey.</p>
      <DiscoverySiteConditions answers={props.answers} onChange={props.onAnswersChange} compact />
    </details>}
    {sections.length > 1 && <div className="wm-essential-section-controls">
      <button type="button" className="wm-ui-button wm-ui-button-secondary" disabled={activeSectionIndex === 0}
        onClick={() => setActiveSectionId(sections[activeSectionIndex - 1]?.id ?? sections[0]?.id ?? "room")}>Back</button>
      {activeSectionIndex < sections.length - 1 && <button type="button" className="wm-ui-button wm-ui-button-secondary"
        onClick={() => setActiveSectionId(sections[activeSectionIndex + 1]?.id ?? activeSection?.id ?? "room")}>
        Next: {sections[activeSectionIndex + 1]?.title}
      </button>}
    </div>}
    <div className="wm-room-wizard-actions">
      <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={props.onSave}>Save room brief</button>
      <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={props.onDetails}>Add technical details or equipment</button>
      <button type="button" className="wm-ui-button wm-ui-button-primary" onClick={props.onContinue}>Find WyreStorm products</button>
    </div>
    </section>
  </section>;
}
