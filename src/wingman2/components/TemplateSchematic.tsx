import { Fragment, useMemo } from "react";
import type { RoomTemplate, TemplateBomRow } from "../lib/roomTemplates";
import { buildCableSchedule, buildSchematicNodes, cableToneLabel } from "../lib/roomSchematicEngine";

function templateContextBlob(template: RoomTemplate) {
  return `${template.name} ${template.application} ${template.architecture}`;
}

export function TemplateSchematic({ template, rows }: { template: RoomTemplate; rows: TemplateBomRow[] }) {
  const contextBlob = useMemo(() => templateContextBlob(template), [template]);
  const nodes = useMemo(() => buildSchematicNodes(contextBlob, rows), [contextBlob, rows]);
  const cableRows = useMemo(() => buildCableSchedule(contextBlob, rows), [contextBlob, rows]);

  return (
    <section data-wingman-template-detail-page="true" className="wm-template-schematic mt-5 wm-template-detail-no-horizontal-scroll">
      <div className="wm-template-schematic-header wm-template-detail-no-horizontal-scroll">
        <div>
          <p className="wingman-kicker">Room schematic</p>
          <h3>Example connectivity view</h3>
          <span>
      Use this as a sales design aid. It shows the assumed signal flow, then the cable schedule shows what still needs validating.
          </span>
        </div>
      </div>

      <div className="wm-template-schematic-flow wm-template-detail-no-horizontal-scroll" aria-label={`Example schematic for ${template.name}`}>
        {nodes.map((node, index) => (
          <Fragment key={node.label}>
            <article className={`wm-template-schematic-node wm-template-schematic-node-${node.tone}`}>
              <small>{node.label}</small>
              <strong>{node.title}</strong>
              <p>{node.detail}</p>
              {node.count ? <span>{node.count}</span> : null}
            </article>

            {index < nodes.length - 1 ? (
              <div className="wm-template-schematic-connector wm-template-detail-no-horizontal-scroll" aria-hidden="true">
                <span />
              </div>
            ) : null}
          </Fragment>
        ))}
      </div>

      <div className="wm-template-cable-legend">
        <span className="wm-cable-video">Video</span>
        <span className="wm-cable-network">Network / AVoIP</span>
        <span className="wm-cable-usb">USB / camera</span>
        <span className="wm-cable-audio">Audio</span>
        <span className="wm-cable-control">Control</span>
        <span className="wm-cable-other">By others</span>
      </div>

      <div className="wm-template-cable-table-wrap">
        <table className="wm-template-cable-table">
          <thead>
            <tr>
              <th>Path</th>
              <th>Example cable / transport</th>
              <th>Applies to</th>
              <th>Sales validation reminder</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {cableRows.map((row) => (
              <tr key={`${row.label}-${row.cable}`}>
                <td>{row.label}</td>
                <td>{row.cable}</td>
                <td>{row.appliesTo}</td>
                <td>{row.reminder}</td>
                <td>
                  <span className={`wm-cable-${row.type}`}>{cableToneLabel(row.type)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
