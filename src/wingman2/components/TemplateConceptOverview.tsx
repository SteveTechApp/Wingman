import { WorkflowPages } from "./WorkflowPages";
import type { RoomConcept, ScheduleItem } from "../lib/roomTemplateDeployment";

function Schedule({ title, items }: { title: string; items: ScheduleItem[] }) {
  return <section><h3>{title}</h3><table className="w-full text-left text-sm">
    <thead><tr><th className="p-2">Qty</th><th className="p-2">Equipment / connection</th><th className="p-2">Position</th></tr></thead>
    <tbody>{items.map(([description, qty, location], index) => <tr key={`${description}-${index}`}><td className="p-2 align-top">{qty}</td><td className="p-2 align-top">{description}</td><td className="p-2 align-top">{location}</td></tr>)}</tbody>
  </table></section>;
}

export function TemplateConceptOverview({ concept }: { concept: RoomConcept }) {
  return <section aria-label="Room concept statement" className="space-y-4">
    <WorkflowPages label="Room design pages" parameter="concept" pages={[
{ id: "room", label: "Room concept", content: <>    <div className="wm-template-overview-notes"><div className="col-span-full"><span>Concept statement · assumed design basis</span><h2>Room concept</h2><p>{concept.statement}</p></div></div>
      <section><h3>Why this hardware fits</h3><p>{concept.rationale}</p></section>
      <section><h3>When another approach fits better</h3><p>{concept.alternative}</p></section>
</> },
{ id: "connections", label: "Sources & outputs", content: <div className="wm-template-brief-grid">
      <Schedule title={`Sources — ${concept.sourceCount} positions`} items={concept.sources} />
      <Schedule title={`Outputs — ${concept.outputCount} destinations`} items={concept.outputs} />
</div> },
{ id: "audio", label: "Audio & acoustics", content: <div className="wm-template-brief-grid">      {concept.audio && <section><h3>Audio experience</h3><p>{concept.audio.experience}</p>
        {concept.audio.zones.length > 0 && <ul>{concept.audio.zones.map((zone) => <li key={zone.name}>{zone.name}: {zone.speakers} speakers · {zone.topology === "100V" ? `${zone.tapWatts}W taps, ${zone.speakers * (zone.tapWatts ?? 0)}W load / ${zone.amplifierWatts}W channel` : `8 ohms, ${zone.amplifierWatts}W per channel`}</li>)}</ul>}
        {concept.audio.specialistSystems?.map((system) => <div key={system.name}><h4>{system.qty} × {system.name} · by others</h4><p>{system.reason}</p><p>{system.scope}</p></div>)}
        <p>{concept.audio.microphones}</p></section>}
      {concept.audio && <section><h3>Audio processing and connections</h3><p>{concept.audio.routing}</p><p>{concept.audio.processing}</p><p>{concept.audio.connectivity}</p></section>}
      {concept.audio?.acousticTreatment && <section><h3>Room acoustics and treatment · by others</h3><p>{concept.audio.acousticTreatment.reason}</p><p>{concept.audio.acousticTreatment.scope}</p><p>The BOM includes a measured allowance; confirm panel types, area, fixings and installation before pricing.</p></section>}
</div> },
{ id: "scope", label: "Supplier scope", content: <>
    <p>Third-party equipment and delivery allowances are required parts of this system. Enter supplier, model and confirmed quantities in Equipment. These dimensions and quantities describe the starting concept; revise the design basis when the room or equipment changes.</p>
</> },
    ]} />
  </section>;
}
