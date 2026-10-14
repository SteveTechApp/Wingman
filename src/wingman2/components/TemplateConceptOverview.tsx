
import type { TemplateBomRow } from "../lib/roomTemplates";
import { WorkflowPages } from "./WorkflowPages";
import type { RoomConcept, ScheduleItem } from "../lib/roomTemplateDeployment";

function Schedule({ title, items }: { title: string; items: ScheduleItem[] }) {
  return <section><h3>{title}</h3><table className="w-full text-left text-sm">
    <thead><tr><th className="p-2">Qty</th><th className="p-2">Equipment / connection</th><th className="p-2">Position</th></tr></thead>
    <tbody>{items.map(([description, qty, location], index) => <tr key={`${description}-${index}`}><td className="p-2 align-top">{qty}</td><td className="p-2 align-top">{description}</td><td className="p-2 align-top">{location}</td></tr>)}</tbody>
  </table></section>;
}

export function TemplateConceptOverview({ concept, rows = [] }: { concept: RoomConcept; rows?: TemplateBomRow[] }) {
  const story = concept.story;
  const pages = [
    ...(story ? [{
      id: "requirement", label: "Requirement", content: <div className="wm-template-overview-notes">
        <div className="col-span-full"><span>What we heard · customer requirement</span><h2>Requirement</h2><p>{story.requirement}</p></div>
        <div className="col-span-full"><span>Situation today · project trigger</span><h3>Why this project, why now</h3><p>{story.situation}</p></div>
        <div className="col-span-full"><span>Decisions only the customer can make</span><h3>Decisions before order</h3><ul>{story.customerDecisions.map((decision) => <li key={decision}>{decision}</li>)}</ul></div>
      </div>,
    }] : []),
    {
      id: "room", label: "Room concept", content: <><div className="wm-template-overview-notes"><div className="col-span-full"><span>Concept statement · assumed design basis</span><h2>Room concept</h2><p>{concept.statement}</p></div></div>
        <section><h3>Why this hardware fits</h3><p>{concept.rationale}</p></section>
        <section><h3>When another approach fits better</h3><p>{concept.alternative}</p></section>
      </>,
    },
    ...(story ? [{
      id: "day", label: "Room in use", content: <div className="wm-template-brief-grid">
        <section><h3>A normal day in this room</h3><ol>{story.roomInUse.map((moment) => <li key={moment}>{moment}</li>)}</ol></section>
        <section><h3>What success looks like</h3><ul>{story.successLooksLike.map((outcome) => <li key={outcome}>{outcome}</li>)}</ul></section>
      </div>,
    }] : []),
    {
      id: "connections", label: "Sources & outputs", content: <div className="wm-template-brief-grid">
        <Schedule title={`Sources — ${concept.sourceCount} positions`} items={concept.sources} />
        <Schedule title={`Outputs — ${concept.outputCount} destinations`} items={concept.outputs} />
      </div>,
    },
    {
      id: "audio", label: "Audio & acoustics", content: <div className="wm-template-brief-grid">      {concept.audio && <section><h3>Audio experience</h3><p>{concept.audio.experience}</p>
        {concept.audio.zones.length > 0 && <ul>{concept.audio.zones.map((zone) => <li key={zone.name}>{zone.name}: {zone.speakers} speakers · {zone.topology === "100V" ? `${zone.tapWatts}W taps, ${zone.speakers * (zone.tapWatts ?? 0)}W load / ${zone.amplifierWatts}W channel` : `8 ohms, ${zone.amplifierWatts}W per channel`}</li>)}</ul>}
        {concept.audio.specialistSystems?.map((system) => <div key={system.name}><h4>{system.qty} × {system.name} · by others</h4><p>{system.reason}</p><p>{system.scope}</p></div>)}
        <p>{concept.audio.microphones}</p></section>}
      {concept.audio && <section><h3>Audio processing and connections</h3><p>{concept.audio.routing}</p><p>{concept.audio.processing}</p><p>{concept.audio.connectivity}</p></section>}
      {concept.audio?.acousticTreatment && <section><h3>Room acoustics and treatment · by others</h3><p>{concept.audio.acousticTreatment.reason}</p><p>{concept.audio.acousticTreatment.scope}</p><p>The BOM includes a measured allowance; confirm panel types, area, fixings and installation before pricing.</p></section>}
      </div>,
    },
    {
      id: "scope", label: "Supplier scope", content: <>
        <h2>Supplier equipment and delivery</h2>
        <table className="wm-supplier-scope"><thead><tr><th>Qty</th><th>Equipment / allowance</th><th>Supplier / model</th></tr></thead><tbody>{rows.filter(row => row.qty > 0 && row.status !== "excluded" && row.sku.startsWith("BY-OTHERS")).map(row => <tr key={row.sku}><td>{row.qty}</td><td><strong>{row.role}</strong><p>{row.description}</p></td><td>{[row.manufacturer, row.model].filter(Boolean).join(" · ") || "To confirm"}</td></tr>)}</tbody></table>
        <p>Third-party equipment and delivery allowances are required parts of this system. Enter supplier, model and confirmed quantities in Equipment. These dimensions and quantities describe the starting concept; revise the design basis when the room or equipment changes.</p>
      </>,
    },
  ];
  return <section aria-label="Room concept statement" className="space-y-4">
    <WorkflowPages label="Room design pages" parameter="concept" pages={pages} />
  </section>;
}
