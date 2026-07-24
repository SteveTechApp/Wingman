import { useMemo, useState } from "react";
import { ChevronDown, CircleHelp } from "lucide-react";
import type { RoomTemplate, TemplateBomRow } from "../lib/roomTemplates";
import { buildCableSchedule, buildSchematicNodes, cableToneLabel } from "../lib/roomSchematicEngine";

type Lane = {
  name: string;
  nodeIndexes: number[];
  tone: "video" | "usb" | "audio";
};

export function TemplateSchematic({ template, rows }: { template: RoomTemplate; rows: TemplateBomRow[] }) {
  const context = `${template.name} ${template.application} ${template.architecture}`;
  const nodes = useMemo(() => buildSchematicNodes(context, rows), [context, rows]);
  const cableRows = useMemo(() => buildCableSchedule(context, rows), [context, rows]);
  const [selectedStage, setSelectedStage] = useState(0);
  const unresolvedCount = template.validationItems.length;
  const lanes: Lane[] = [
    { name: "Video", nodeIndexes: nodes.map((_, index) => index), tone: "video" },
    { name: "USB / UC", nodeIndexes: nodes.map((_, index) => index).filter((_, index) => index !== 2 || nodes.length < 4), tone: "usb" },
    { name: "Audio / control", nodeIndexes: [0, Math.max(1, nodes.length - 2), nodes.length - 1], tone: "audio" },
  ];
  const selected = nodes[selectedStage] ?? nodes[0];

  return (
    <div className="wm-template-connectivity">
      <section className="wm-template-lanes" aria-label={`Connectivity for ${template.name}`}>
        <div className="wm-template-lanes-heading">
          <div>
            <h2>Signal paths</h2>
            <p>Select any stage to inspect the assumed connection and scope.</p>
          </div>
          <div className="wm-template-status-legend" aria-label="Status legend">
            <span className="is-confirmed">Confirmed</span>
            <span className="is-assumed">Assumed</span>
            <span className="is-validate">Validate</span>
            <span className="is-others">By others</span>
          </div>
        </div>

        {lanes.map((lane) => (
          <div className={`wm-template-lane is-${lane.tone}`} key={lane.name}>
            <strong>{lane.name}</strong>
            <div className="wm-template-lane-stages">
              {lane.nodeIndexes.map((nodeIndex, index) => {
                const node = nodes[nodeIndex];
                if (!node) return null;
                return (
                  <div className="wm-template-lane-stage-wrap" key={`${lane.name}-${node.label}`}>
                    <button
                      type="button"
                      className={selectedStage === nodeIndex ? "is-selected" : ""}
                      aria-pressed={selectedStage === nodeIndex}
                      onClick={() => setSelectedStage(nodeIndex)}
                    >
                      <small>{node.label}</small>
                      <span>{node.title}</span>
                    </button>
                    {index < lane.nodeIndexes.length - 1 ? <i aria-hidden="true" /> : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {selected ? (
        <aside className="wm-template-stage-detail" aria-live="polite">
          <div>
            <span className="wm-status is-assumed">Assumed</span>
            <h3>{selected.title}</h3>
            <p>{selected.detail}</p>
          </div>
          <dl>
            <div><dt>Stage</dt><dd>{selected.label}</dd></div>
            <div><dt>Equipment</dt><dd>{selected.count || "In scope"}</dd></div>
            <div><dt>Validation</dt><dd>{template.validationItems[selectedStage % Math.max(1, template.validationItems.length)] || "Confirm on site"}</dd></div>
          </dl>
        </aside>
      ) : null}

      <details className="wm-template-cable-schedule">
        <summary>
          <span><ChevronDown aria-hidden="true" /> Cable schedule</span>
          <small>{cableRows.length} paths · {unresolvedCount} unresolved validations</small>
        </summary>
        <div className="wm-template-cable-help">
          <CircleHelp aria-hidden="true" />
          Cable types are design guidance. Confirm route length, termination, containment and installer scope before issue.
        </div>
        <div className="wm-template-cable-table-wrap">
          <table className="wm-template-cable-table">
            <thead><tr><th>Path</th><th>Cable / transport</th><th>Applies to</th><th>Status</th><th><span className="sr-only">Help</span></th></tr></thead>
            <tbody>
              {cableRows.map((row) => (
                <tr key={`${row.label}-${row.cable}`}>
                  <td>{row.label}</td>
                  <td>{row.cable}</td>
                  <td>{row.appliesTo}</td>
                  <td><span className={`wm-cable-${row.type}`}>{cableToneLabel(row.type)}</span></td>
                  <td><button type="button" className="wm-icon-button" title={row.reminder} aria-label={`Validation reminder for ${row.label}`}><CircleHelp /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
