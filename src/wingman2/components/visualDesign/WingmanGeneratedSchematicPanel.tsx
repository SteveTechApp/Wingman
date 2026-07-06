import { useMemo, useState } from "react";
import {
  buildWingmanSchematic,
  type SchematicConnection,
  type SchematicModel,
  type SchematicProjectBrief,
} from "../../lib/schematic";

const DEFAULT_BRIEF: SchematicProjectBrief = {
  title: "Generated meeting-room schematic",
  roomType: "meeting-room",
  sources: [
    { label: "Presenter laptop" },
    { label: "Wireless presentation" },
  ],
  displays: [
    { label: "Room display" },
  ],
  cameras: [
    { label: "Room camera", sku: "APO-VX20-UC-V2" },
  ],
  speakerphones: [
    { label: "Table speakerphone", sku: "APO-VX20-UC" },
  ],
  products: [
    { sku: "SW-620L-TX-W" },
    { sku: "APO-DG2" },
  ],
  usbRequired: true,
  audioRequired: true,
  controlRequired: false,
  networkAvailable: true,
  maxSignalDistanceM: 7,
};

interface WingmanGeneratedSchematicPanelProps {
  brief?: SchematicProjectBrief;
  onUseSchematic?: (schematic: SchematicModel) => void;
}

export function WingmanGeneratedSchematicPanel({
  brief = DEFAULT_BRIEF,
  onUseSchematic,
}: WingmanGeneratedSchematicPanelProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const schematic = useMemo(() => buildWingmanSchematic(brief), [brief]);

  return (
    <section className="wm-ui-card wm-generated-schematic-panel" aria-label="Generated schematic preview">
      <div className="wm-generated-schematic-panel__header">
        <div>
          <p className="wm-ui-copy wm-eyebrow">Native schematic engine</p>
          <h2 className="wm-ui-title">First-pass schematic from Wingman</h2>
          <p className="wm-ui-copy">
            Wingman has generated a proposal-safe AV schematic model using its own WyreStorm logic.
            Review the signal paths, dependencies and warnings before using it as a drawing basis.
          </p>
        </div>

        <div className="wm-generated-schematic-panel__actions">
          <button
            type="button"
            className="wm-ui-button wm-ui-button-secondary"
            onClick={() => setDetailsOpen((current) => !current)}
          >
            {detailsOpen ? "Hide schematic evidence" : "View schematic evidence"}
          </button>

          {onUseSchematic ? (
            <button
              type="button"
              className="wm-ui-button wm-ui-button-primary"
              onClick={() => onUseSchematic(schematic)}
            >
              Use this schematic
            </button>
          ) : null}
        </div>
      </div>

      <div className="wm-generated-schematic-canvas" role="img" aria-label={`Generated schematic for ${schematic.title}`}>
        <svg
          className="wm-generated-schematic-canvas__svg"
          viewBox="0 0 980 520"
          preserveAspectRatio="xMinYMin meet"
        >
          <defs>
            <marker
              id="wm-schematic-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" />
            </marker>
          </defs>

          {schematic.connections.map((connection) => (
            <SchematicConnectionPath key={connection.id} connection={connection} />
          ))}

          {schematic.nodes.map((node) => (
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
              <rect className={`wm-generated-schematic-node wm-generated-schematic-node--${node.kind}`} width="170" height="62" rx="14" />
              <text className="wm-generated-schematic-node__label" x="14" y="26">
                {node.label}
              </text>
              <text className="wm-generated-schematic-node__meta" x="14" y="46">
                {node.sku ?? node.kind}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="wm-generated-schematic-summary">
        <div className="wm-ui-card">
          <strong>{schematic.nodes.length}</strong>
          <span>Devices / nodes</span>
        </div>
        <div className="wm-ui-card">
          <strong>{schematic.connections.length}</strong>
          <span>Signal paths</span>
        </div>
        <div className="wm-ui-card">
          <strong>{schematic.bomHints.length}</strong>
          <span>BOM dependencies</span>
        </div>
        <div className="wm-ui-card">
          <strong>{schematic.warnings.length}</strong>
          <span>Warnings</span>
        </div>
      </div>

      {detailsOpen ? (
        <div className="wm-generated-schematic-evidence">
          <section className="wm-ui-card">
            <h3 className="wm-ui-title">Signal paths</h3>
            <ul>
              {schematic.connections.map((connection) => (
                <li key={connection.id}>
                  <strong>{connection.label}</strong> — {connection.signal} via {connection.transport}
                </li>
              ))}
            </ul>
          </section>

          <section className="wm-ui-card">
            <h3 className="wm-ui-title">Dependencies</h3>
            {schematic.bomHints.length ? (
              <ul>
                {schematic.bomHints.map((hint) => (
                  <li key={hint.sku}>
                    <strong>{hint.sku}</strong> — {hint.reason}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="wm-ui-copy">No additional BOM dependencies were generated for this schematic.</p>
            )}
          </section>

          <section className="wm-ui-card">
            <h3 className="wm-ui-title">Warnings / assumptions</h3>
            {schematic.warnings.length || schematic.assumptions.length ? (
              <ul>
                {schematic.warnings.map((warning) => (
                  <li key={`${warning.severity}-${warning.title}`}>
                    <strong>{warning.title}</strong> — {warning.message}
                  </li>
                ))}
                {schematic.assumptions.map((assumption) => (
                  <li key={assumption}>{assumption}</li>
                ))}
              </ul>
            ) : (
              <p className="wm-ui-copy">No schematic warnings were generated.</p>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}

function SchematicConnectionPath({ connection }: { connection: SchematicConnection }) {
  if (connection.points.length < 2) {
    return null;
  }

  const [start, ...rest] = connection.points;
  const path = rest.reduce((currentPath, point) => `${currentPath} L ${point.x} ${point.y}`, `M ${start.x} ${start.y}`);

  const labelPoint = connection.points[Math.floor(connection.points.length / 2)];

  return (
    <g className={`wm-generated-schematic-connection wm-generated-schematic-connection--${connection.signal}`}>
      <path d={path} markerEnd="url(#wm-schematic-arrow)" />
      <text x={labelPoint.x + 8} y={labelPoint.y - 8}>
        {connection.signal}
      </text>
    </g>
  );
}

export default WingmanGeneratedSchematicPanel;