import { useState } from "react";
import type { RoomTemplate, TemplateBomRow } from "../lib/roomTemplates";
import { hasHdbtDisplayReceiver, hdbtDisplayReceiverForTemplate, quotesHdbtDisplayReceiver } from "../lib/hdbtDisplayReceiver";

/** A cleared field is no measurement, not zero metres. */
function readRunMetres(value: string): number | undefined {
  const metres = Number(value);
  return value.trim() === "" || !Number.isFinite(metres) || metres <= 0 ? undefined : Math.round(metres);
}

export function TemplateRoomBrief({ template, onChange, rows }: { template: RoomTemplate; onChange: (patch: Partial<RoomTemplate>) => void; rows?: TemplateBomRow[] }) {
  const [editing, setEditing] = useState(false);
  // The run chooses a display receiver, so the field belongs to the rooms that
  // schedule one — a design rebuilt from a project carries the figure even when
  // its concept was never re-read. Without a schedule to look at, the transport
  // is what says so; every other far end is fixed by the architecture.
  const hdbt = rows ? hasHdbtDisplayReceiver(rows) : (template.concept?.transport === "hdbt" || template.concept?.transport === "pods");
  const receiver = hdbt ? hdbtDisplayReceiverForTemplate(template) : null;
  const receiverNote = receiver && (!rows || quotesHdbtDisplayReceiver(rows)) ? receiver.reason : null;
  const updateConcept = (field: "environment" | "construction", value: string) => {
    if (template.concept) onChange({ concept: { ...template.concept, [field]: value } });
  };
  return <section className="wm-review-task">
    <header><div><h2>Room brief</h2><p>Start with the template's suggested room.</p></div><button type="button" onClick={() => setEditing(!editing)}>{editing ? "Done editing brief" : "Edit room brief"}</button></header>
    {editing ? <div className="wm-review-form">
      <label>Room name<input value={template.name} onChange={e => onChange({ name: e.target.value })} /></label>
      <label>Room summary<input value={template.summary} onChange={e => onChange({ summary: e.target.value })} /></label>
      <label>Users and capacity<input value={template.concept?.occupancy || template.scale} onChange={e => onChange({ scale: e.target.value, concept: template.concept ? { ...template.concept, occupancy: e.target.value } : undefined })} /></label>
      <label>Customer requirement and room use<textarea value={template.story?.requirement || template.customerNarrative} onChange={e => onChange({ customerNarrative: e.target.value, story: template.story ? { ...template.story, requirement: e.target.value } : undefined, concept: template.concept ? { ...template.concept, statement: e.target.value } : undefined })} /></label>
      {template.concept ? <><label>Room dimensions and layout<textarea value={template.concept.environment} onChange={e => updateConcept("environment", e.target.value)} /></label><label>Construction and site conditions<textarea value={template.concept.construction} onChange={e => updateConcept("construction", e.target.value)} /></label></> : null}
      {hdbt ? <label>Longest surveyed display run (m)<input type="number" min="1" max="200" step="1" value={template.surveyedRunMetres ?? ""} onChange={e => onChange({ surveyedRunMetres: readRunMetres(e.target.value) })} /></label> : null}
      {receiverNote ? <p>{receiverNote}</p> : null}
      <label>System design and operation<textarea value={template.architecture} onChange={e => onChange({ architecture: e.target.value })} /></label>
      <p>These edits update the saved design and proposal narrative. Change equipment in the next step; a narrative edit does not change routing or product compatibility.</p>
    </div> : <div>
      <h3>What the room needs to do</h3><p>{template.story?.requirement || template.customerNarrative}</p>
      <h3>People and physical room</h3><p>{template.concept?.occupancy || template.scale}{template.concept ? ` · ${template.concept.environment}` : ""}</p>{template.concept ? <p>{template.concept.construction}</p> : null}
      <h3>How the system works</h3><p>{template.architecture}</p>
      {receiverNote ? <><h3>Display receiver</h3><p>{receiverNote}</p></> : null}
    </div>}
  </section>;
}

export function TemplateDesignReview({ template, onChange }: { template: RoomTemplate; onChange: (patch: Partial<RoomTemplate>) => void }) {
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  return <section className="wm-review-task">
    <header><div><h2>Review before proposal</h2><p>Template suggestions are a starting point. Confirm checks with evidence and keep any remaining uncertainty visible in the output.</p></div></header>
    <div className="wm-review-form"><label>Design assumptions — one per line<textarea value={template.assumptions.join("\n")} onChange={e => onChange({ assumptions: e.target.value.split("\n") })} /></label></div>
    <h3>{template.validationItems.filter(Boolean).length} checks remaining</h3>
    {template.validationItems.map((item, index) => <div className="wm-review-check" key={index}>
      <label>Check {index + 1}<textarea value={item} onChange={e => onChange({ validationItems: template.validationItems.map((current, i) => i === index ? e.target.value : current) })} /></label>
      <label>Confirmation evidence<input placeholder="Survey result, test record, supplier confirmation or agreed exclusion" value={evidence[index] || ""} onChange={e => setEvidence({ ...evidence, [index]: e.target.value })} /></label>
      <button type="button" disabled={!evidence[index]?.trim() || !item.trim()} onClick={() => { onChange({ validationItems: template.validationItems.filter((_, i) => i !== index), designNotes: [...template.designNotes, { label: "Confirmed room check", description: `${item.trim()} — ${evidence[index].trim()}` }] }); setEvidence({}); }}>Record confirmation</button>
    </div>)}
    <button type="button" onClick={() => onChange({ validationItems: [...template.validationItems, "New site check"] })}>Add a check</button>
    {template.designNotes.some(note => note.label === "Confirmed room check") ? <div><h3>Recorded confirmations</h3><ul>{template.designNotes.filter(note => note.label === "Confirmed room check").map((note, index) => <li key={index}>{note.description} <button type="button" onClick={() => onChange({ validationItems: [...template.validationItems, note.description], designNotes: template.designNotes.filter(item => item !== note) })}>Reopen check</button></li>)}</ul></div> : null}
  </section>;
}
