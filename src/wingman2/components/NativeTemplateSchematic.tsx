/**
 * NativeTemplateSchematic — renders the native schematic engine's SchematicModel
 * (from buildWingmanSchematic) as an interactive SVG diagram for the template
 * review page's Connectivity tab.
 *
 * Unlike the legacy TemplateSchematic (which draws sequential arrows between
 * classified BOM blocks), this component shows real topology-aware connectivity:
 * - Each source is wired to its own encoder (or the switching core)
 * - Each display is wired to its own decoder (or the switching core)
 * - Missing encoder/decoder blockers are highlighted
 * - Transport type is shown on every connection
 * - The network switch is drawn for AVoIP systems
 */

import { useMemo, useState } from "react";
import type { RoomTemplate, TemplateBomRow } from "../lib/roomTemplates";
import { templateBomToSchematicBrief } from "../lib/schematic/templateBomToSchematicBrief";
import { buildWingmanSchematic } from "../lib/schematic/wingmanSchematicEngine";
import { buildNativeCableSchedule, nativeCableToneLabel } from "../lib/schematic/nativeCableSchedule";
import type {
  SchematicConnection,
  SchematicModel,
  SchematicNode,
  SchematicNodeKind,
  SchematicTransportKind,
} from "../lib/schematic/schematicTypes";
import { SCHEMATIC_COLORS, SCHEMATIC_NODE_COLORS } from "../lib/schematic/schematicVisualPalette";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";

/* ── Layout constants ── */
const NODE_W = 160;
const NODE_H = 64;
const COL_GAP = 200;
const LANE_GAP = 80;
const ORIGIN_X = 40;
const ORIGIN_Y = 40;
const LABEL_HEIGHT = 20;

/* ── Node kind → visual column ── */
function columnForKind(kind: SchematicNodeKind): number {
  switch (kind) {
    case "source":
    case "camera":
    case "speakerphone":
      return 0;
    case "switcher":
    case "matrix":
    case "av-over-ip-encoder":
    case "av-over-ip-transceiver":
    case "av-over-ip-controller":
    case "video-wall-processor":
      return 1;
    case "network-switch":
      return 2;
    case "av-over-ip-decoder":
      return 3;
    case "display":
      return 4;
    case "usb-bridge":
      return 1;
    case "audio-device":
      return 4;
    case "touch-panel":
    case "control-device":
      return 1;
    default:
      return 2;
  }
}

/* ── Node kind → lane group (for Y positioning) ── */
function laneGroup(kind: SchematicNodeKind): number {
  switch (kind) {
    case "source":
    case "camera":
    case "speakerphone":
    case "touch-panel":
    case "control-device":
      return 0; // endpoints
    case "switcher":
    case "matrix":
    case "av-over-ip-encoder":
    case "av-over-ip-transceiver":
    case "av-over-ip-controller":
    case "video-wall-processor":
    case "usb-bridge":
      return 1; // core
    case "network-switch":
      return 2; // network
    case "av-over-ip-decoder":
    case "display":
    case "audio-device":
      return 3; // outputs
    default:
      return 2;
  }
}

/* ── Node kind → color ── */
const KIND_COLORS: Record<SchematicNodeKind, string> = SCHEMATIC_NODE_COLORS;

/* ── Transport → human label ── */
const TRANSPORT_LABELS: Record<SchematicTransportKind, string> = {
  hdmi: "HDMI",
  hdbaset: "HDBaseT",
  "av-over-ip": "AVoIP",
  usb: "USB",
  "usb-over-ip": "USB-over-IP",
  "analogue-audio": "Analogue",
  dante: "Dante",
  network: "Network",
  control: "Control",
  unknown: "Unconfirmed",
};

/* ── Signal → line style ── */
function signalStyle(signal: string): { stroke: string; dash?: string } {
  switch (signal) {
    case "video":
      return { stroke: "rgba(74,245,230,0.6)" };
    case "usb":
      return { stroke: "rgba(192,132,252,0.6)" };
    case "audio":
      return { stroke: "rgba(251,191,36,0.6)" };
    case "network":
      return { stroke: "rgba(96,165,250,0.4)", dash: "4 3" };
    case "control":
      return { stroke: "rgba(251,191,36,0.4)", dash: "6 3" };
    default:
      return { stroke: "rgba(107,114,128,0.4)" };
  }
}

/* ── Helpers ── */
function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

function nodeX(node: SchematicNode): number {
  return ORIGIN_X + node.column * COL_GAP;
}

function nodeY(node: SchematicNode): number {
  return ORIGIN_Y + node.lane * LANE_GAP;
}

/* ── Component ── */

type Props = {
  template: RoomTemplate;
  rows: TemplateBomRow[];
};

export function NativeTemplateSchematic({ template, rows }: Props) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedConnId, setSelectedConnId] = useState<string | null>(null);

  const schematic: SchematicModel = useMemo(() => {
    const brief = templateBomToSchematicBrief(template, rows);
    return buildWingmanSchematic(brief);
  }, [template, rows]);

  // Position nodes on a grid
  const positionedNodes = useMemo(() => {
    // Group by column, then sort by lane within each column
    const byColumn = new Map<number, SchematicNode[]>();
    for (const node of schematic.nodes) {
      const col = node.column;
      if (!byColumn.has(col)) byColumn.set(col, []);
      byColumn.get(col)!.push(node);
    }

    // Assign Y positions based on lane groups within each column
    const result: SchematicNode[] = [];
    const columnLanes = new Map<string, number>(); // "col-lane" → Y index

    for (const node of schematic.nodes) {
      const key = `${node.column}-${laneGroup(node.kind)}`;
      const laneIdx = columnLanes.get(key) ?? 0;
      columnLanes.set(key, laneIdx + 1);

      result.push({
        ...node,
        x: ORIGIN_X + node.column * COL_GAP,
        y: ORIGIN_Y + (node.column * 3 + laneGroup(node.kind)) * LANE_GAP + laneIdx * (NODE_H + 16),
      });
    }

    return result;
  }, [schematic]);

  const nodeMap = useMemo(
    () => new Map(positionedNodes.map((n) => [n.id, n])),
    [positionedNodes],
  );

  // Calculate SVG dimensions
  const maxX = useMemo(
    () => Math.max(...positionedNodes.map((n) => n.x + NODE_W), 600),
    [positionedNodes],
  );
  const maxY = useMemo(
    () => Math.max(...positionedNodes.map((n) => n.y + NODE_H), 400),
    [positionedNodes],
  );

  const selectedNode = selectedNodeId
    ? positionedNodes.find((n) => n.id === selectedNodeId)
    : null;

  const blockers = schematic.warnings.filter((w) => w.severity === "blocker");
  const warnings = schematic.warnings.filter((w) => w.severity !== "blocker");

  return (
    <div className="wm-native-schematic">
      {/* Warnings banner */}
      {blockers.length > 0 && (
        <div className="wm-native-schematic-blockers" role="alert">
          <AlertTriangle />
          <div>
            <strong>{blockers.length} design blocker{blockers.length > 1 ? "s" : ""}</strong>
            <ul>
              {blockers.map((b, i) => (
                <li key={i}>
                  <strong>{b.title}</strong>: {b.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="wm-native-schematic-warnings">
          <Info />
          <ul>
            {warnings.map((w, i) => (
              <li key={i}>{w.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* BOM hints */}
      {schematic.bomHints.length > 0 && (
        <div className="wm-native-schematic-hints">
          <CheckCircle />
          <div>
            <strong>Recommended additions:</strong>
            <ul>
              {schematic.bomHints.map((h, i) => (
                <li key={i}>
                  <strong>{h.sku}</strong> — {h.reason}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* SVG diagram */}
      <div className="wm-native-schematic-svg-wrap">
        <svg
          viewBox={`0 0 ${maxX + NODE_W + 40} ${maxY + NODE_H + 40}`}
          className="wm-native-schematic-svg"
          role="img"
          aria-label={`Topology-aware schematic for ${template.name}`}
        >
          <defs>
            <marker
              id="native-arrow"
              viewBox="0 0 10 6"
              refX="10"
              refY="3"
              markerWidth="8"
              markerHeight="5"
              orient="auto"
            >
              <path d="M0,0 L10,3 L0,6 Z" fill="rgba(74,245,230,0.5)" />
            </marker>
            <filter id="native-glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Column headers */}
          {["Sources", "Core / Transport", "Network", "Outputs", "Displays"].map(
            (label, i) => (
              <text
                key={label}
                x={ORIGIN_X + i * COL_GAP + NODE_W / 2}
                y={20}
                textAnchor="middle"
                className="wm-native-schematic-col-header"
              >
                {label}
              </text>
            ),
          )}

          {/* Connections */}
          {schematic.connections.map((conn) => {
            const from = nodeMap.get(conn.from);
            const to = nodeMap.get(conn.to);
            if (!from || !to) return null;

            const x1 = from.x + NODE_W;
            const y1 = from.y + NODE_H / 2;
            const x2 = to.x;
            const y2 = to.y + NODE_H / 2;
            const midX = Math.round((x1 + x2) / 2);

            const style = signalStyle(conn.signal);
            const isSelected = selectedConnId === conn.id;
            const transportLabel = TRANSPORT_LABELS[conn.transport] ?? conn.transport;

            // Orthogonal routing
            const path =
              y1 === y2
                ? `M${x1},${y1} L${x2},${y2}`
                : `M${x1},${y1} L${midX},${y1} L${midX},${y2} L${x2},${y2}`;

            return (
              <g
                key={conn.id}
                className={`wm-native-schematic-edge ${isSelected ? "is-selected" : ""}`}
                onClick={() => {
                  setSelectedConnId(conn.id);
                  setSelectedNodeId(null);
                }}
                role="button"
                tabIndex={0}
                aria-label={`${conn.label}: ${transportLabel} ${conn.signal}`}
              >
                <path
                  d={path}
                  fill="none"
                  stroke={style.stroke}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  strokeDasharray={style.dash}
                  markerEnd="url(#native-arrow)"
                />
                {/* Transport label on connection */}
                <text
                  x={midX}
                  y={Math.min(y1, y2) - 6}
                  textAnchor="middle"
                  className="wm-native-schematic-conn-label"
                >
                  {transportLabel}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {positionedNodes.map((node) => {
            const color = KIND_COLORS[node.kind] ?? SCHEMATIC_COLORS.grey;
            const isSelected = selectedNodeId === node.id;
            const hasSku = Boolean(node.sku);

            return (
              <g
                key={node.id}
                className={`wm-native-schematic-node ${isSelected ? "is-selected" : ""} ${node.required ? "" : "is-optional"}`}
                onClick={() => {
                  setSelectedNodeId(node.id);
                  setSelectedConnId(null);
                }}
                role="button"
                tabIndex={0}
                aria-label={`${node.label}${node.sku ? ` (${node.sku})` : ""}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedNodeId(node.id);
                  }
                }}
              >
                {/* Glow */}
                <rect
                  x={node.x - 2}
                  y={node.y - 2}
                  width={NODE_W + 4}
                  height={NODE_H + 4}
                  rx={8}
                  fill={`${color}15`}
                  stroke={isSelected ? color : "transparent"}
                  strokeWidth={isSelected ? 2 : 0}
                />
                {/* Background */}
                <rect
                  x={node.x}
                  y={node.y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={6}
                  fill="rgba(8,29,48,0.92)"
                  stroke={color}
                  strokeWidth={isSelected ? 2 : 1}
                />
                {/* Top accent */}
                <rect
                  x={node.x}
                  y={node.y}
                  width={NODE_W}
                  height={3}
                  rx={2}
                  fill={color}
                />
                {/* SKU or label */}
                <text
                  x={node.x + NODE_W / 2}
                  y={node.y + 24}
                  textAnchor="middle"
                  className="wm-native-schematic-sku"
                >
                  {truncate(hasSku ? (node.sku as string) : node.label, 20)}
                </text>
                {/* Subtitle */}
                <text
                  x={node.x + NODE_W / 2}
                  y={node.y + 42}
                  textAnchor="middle"
                  className="wm-native-schematic-subtitle"
                >
                  {truncate(
                    hasSku
                      ? node.kind.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                      : node.proposalSafeNote ?? "Confirm",
                    24,
                  )}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Detail panel */}
      {selectedNode && (
        <aside className="wm-native-schematic-detail" aria-live="polite">
          <div>
            <span
              className="wm-status"
              style={{
                color: KIND_COLORS[selectedNode.kind],
                borderColor: KIND_COLORS[selectedNode.kind],
              }}
            >
              {selectedNode.sku ? "In scope" : "Third-party / placeholder"}
            </span>
            <h3>{selectedNode.sku ?? selectedNode.label}</h3>
            <p>
              {selectedNode.sku
                ? selectedNode.kind.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                : selectedNode.proposalSafeNote ?? "Confirm ownership and specification."}
            </p>
          </div>
          <dl>
            <div>
              <dt>Node type</dt>
              <dd>{selectedNode.kind}</dd>
            </div>
            <div>
              <dt>Column</dt>
              <dd>{selectedNode.column}</dd>
            </div>
            {selectedNode.required !== undefined && (
              <div>
                <dt>Required</dt>
                <dd>{selectedNode.required ? "Yes" : "Optional"}</dd>
              </div>
            )}
          </dl>
        </aside>
      )}

      {selectedConnId && (
        <aside className="wm-native-schematic-detail" aria-live="polite">
          {(() => {
            const conn = schematic.connections.find((c) => c.id === selectedConnId);
            if (!conn) return null;
            const fromNode = nodeMap.get(conn.from);
            const toNode = nodeMap.get(conn.to);
            return (
              <div>
                <span className="wm-status is-assumed">Connection</span>
                <h3>{conn.label}</h3>
                <dl>
                  <div>
                    <dt>From</dt>
                    <dd>{fromNode?.sku ?? fromNode?.label ?? conn.from}</dd>
                  </div>
                  <div>
                    <dt>To</dt>
                    <dd>{toNode?.sku ?? toNode?.label ?? conn.to}</dd>
                  </div>
                  <div>
                    <dt>Signal</dt>
                    <dd>{conn.signal}</dd>
                  </div>
                  <div>
                    <dt>Transport</dt>
                    <dd>{TRANSPORT_LABELS[conn.transport] ?? conn.transport}</dd>
                  </div>
                  {conn.proposalSafeNote && (
                    <div>
                      <dt>Note</dt>
                      <dd>{conn.proposalSafeNote}</dd>
                    </div>
                  )}
                </dl>
              </div>
            );
          })()}
        </aside>
      )}

      {/* Assumptions */}
      {schematic.assumptions.length > 0 && (
        <div className="wm-native-schematic-assumptions">
          <strong>Assumptions:</strong>
          <ul>
            {schematic.assumptions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Cable schedule from native engine connections */}
      {(() => {
        const cableRows = buildNativeCableSchedule(schematic);
        if (cableRows.length === 0) return null;
        return (
          <details className="wm-native-schematic-cable-schedule">
            <summary>
              <span>Cable schedule</span>
              <small>{cableRows.length} paths · from native schematic engine</small>
            </summary>
            <div className="wm-native-schematic-cable-help">
              Cable types are derived from the native schematic engine's topology-aware connections. Confirm route length, termination, containment and installer scope before issue.
            </div>
            <div className="wm-native-schematic-cable-table-wrap">
              <table className="wm-native-schematic-cable-table">
                <thead>
                  <tr>
                    <th>Path</th>
                    <th>Cable / transport</th>
                    <th>Applies to</th>
                    <th>Validation reminder</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {cableRows.map((row, i) => (
                    <tr key={`${row.label}-${i}`}>
                      <td>{row.label}</td>
                      <td>{row.cable}</td>
                      <td>{row.appliesTo}</td>
                      <td>{row.reminder}</td>
                      <td><span className={`wm-cable-${row.type}`}>{nativeCableToneLabel(row.type)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        );
      })()}
    </div>
  );
}

export default NativeTemplateSchematic;
