import { useMemo, useState } from "react";
import { ChevronDown, CircleHelp } from "lucide-react";
import type { RoomTemplate, TemplateBomRow } from "../lib/roomTemplates";
import { buildCableSchedule, cableToneLabel } from "../lib/roomSchematicEngine";

// ── Block diagram layout constants ──
const STAGE_LEFT = 30;
const STAGE_WIDTH = 120;
const STAGE_GAP = 44;
const ROW_HEIGHT = 72;
const HEADER_HEIGHT = 28;
const ROW_GAP = 12;
const CALLOUT_W = 200;
const CALLOUT_PAD = 10;

type LaneDef = { name: string; y: number; items: SchematicItem[] };
type SchematicItem = {
  sku: string;
  label: string;
  subtitle: string;
  tone: "source" | "core" | "network" | "display" | "usb" | "audio" | "other";
  skuCount?: string;
};

function classifyRow(row: TemplateBomRow): SchematicItem["tone"] {
  if (row.sku.startsWith("BY-OTHERS")) return "other";
  const s = `${row.sku} ${row.role} ${row.description}`.toLowerCase();
  if (/camera|ptz|cam-|ndi/i.test(s)) return "usb";
  if (/mic|speaker|amp|dsp|dante|audio|sound|hearing/i.test(s)) return "audio";
  if (/rx|display|decoder|screen|monitor|wall|projector/i.test(s)) return "display";
  if (/nhd|avoip|av-over-ip|networkhd|10g/i.test(s)) return "network";
  if (/tx|trx|source|input|player|switcher|matrix|wall.?plate/i.test(s)) return "core";
  return "core";
}

function itemsToSchematicItems(rows: TemplateBomRow[]): SchematicItem[] {
  const seen = new Map<string, SchematicItem>();
  for (const row of rows) {
    if (row.qty <= 0 || row.status === "excluded") continue;
    const tone = classifyRow(row);
    const sku = row.sku.startsWith("BY-OTHERS") ? row.role : row.sku;
    const existing = seen.get(sku);
    if (existing) {
      if (existing.skuCount) {
        const n = parseInt(existing.skuCount, 10);
        existing.skuCount = `${n + row.qty}`;
      }
    } else {
      seen.set(sku, {
        sku,
        label: row.sku.startsWith("BY-OTHERS") ? row.role : row.sku,
        subtitle: row.description,
        tone,
        skuCount: row.qty > 1 ? `${row.qty}` : undefined,
      });
    }
  }
  return Array.from(seen.values());
}

function buildLanes(items: SchematicItem[]): LaneDef[] {
  const sources = items.filter((i) => i.tone === "core" && /tx|input|switcher|wall.?plate/i.test(i.sku));
  const core = items.filter((i) => i.tone === "core" && !sources.includes(i));
  const network = items.filter((i) => i.tone === "network");
  const displays = items.filter((i) => i.tone === "display");
  const usb = items.filter((i) => i.tone === "usb");
  const audio = items.filter((i) => i.tone === "audio");
  const other = items.filter((i) => i.tone === "other");

  // If no explicit sources, use core items as the input stage
  const srcLane = sources.length > 0 ? sources : core;
  const coreLane = sources.length > 0 ? core : [];

  const lanes: LaneDef[] = [];
  let y = 0;

  const mainItems = [...srcLane, ...coreLane, ...network, ...displays];
  if (mainItems.length > 0) {
    lanes.push({ name: "Primary signal path", y, items: mainItems });
    y += ROW_HEIGHT + ROW_GAP;
  }
  if (usb.length > 0) {
    lanes.push({ name: "USB / camera / UC", y, items: usb });
    y += ROW_HEIGHT + ROW_GAP;
  }
  if (audio.length > 0) {
    lanes.push({ name: "Audio", y, items: audio });
    y += ROW_HEIGHT + ROW_GAP;
  }
  if (other.length > 0) {
    lanes.push({ name: "By others", y, items: other });
    y += ROW_HEIGHT + ROW_GAP;
  }
  return lanes;
}

function blockX(stageIndex: number): number {
  return STAGE_LEFT + stageIndex * (STAGE_WIDTH + STAGE_GAP);
}

const toneColors: Record<SchematicItem["tone"], string> = {
  source: "#4af5e6",
  core: "#4af5e6",
  network: "#60a5fa",
  display: "#34d399",
  usb: "#c084fc",
  audio: "#fbbf24",
  other: "#6b7280",
};

const toneGlows: Record<SchematicItem["tone"], string> = {
  source: "rgba(74,245,230,.15)",
  core: "rgba(74,245,230,.12)",
  network: "rgba(96,165,250,.12)",
  display: "rgba(52,211,153,.12)",
  usb: "rgba(192,132,252,.12)",
  audio: "rgba(251,191,36,.12)",
  other: "rgba(107,114,128,.08)",
};

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

export function TemplateSchematic({ template, rows }: { template: RoomTemplate; rows: TemplateBomRow[] }) {
  const items = useMemo(() => itemsToSchematicItems(rows), [rows]);
  const lanes = useMemo(() => buildLanes(items), [items]);
  const cableRows = useMemo(() => buildCableSchedule(template.name, rows), [template.name, rows]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const unresolvedCount = template.validationItems.length;
  const maxStages = Math.max(1, ...lanes.map((l) => l.items.length));
  const svgWidth = STAGE_LEFT + maxStages * (STAGE_WIDTH + STAGE_GAP) + CALLOUT_W + CALLOUT_PAD * 2 + 20;
  const svgHeight = HEADER_HEIGHT + lanes.reduce((h, l) => Math.max(h, l.y + ROW_HEIGHT), 0) + 30;

  const selectedItem = selectedIdx !== null ? items[selectedIdx] : null;

  return (
    <div className="wm-template-connectivity">
      <section className="wm-template-lanes" aria-label={`Block schematic for ${template.name}`}>
        <div className="wm-template-lanes-heading">
          <div>
            <h2>Block Schematic</h2>
            <p>Select any block to inspect the assumed connection and scope.</p>
          </div>
          <div className="wm-template-status-legend" aria-label="Signal type legend">
            <span style={{ color: toneColors.core }}>■ Sources / Core</span>
            <span style={{ color: toneColors.network }}>■ AVoIP / Network</span>
            <span style={{ color: toneColors.display }}>■ Displays</span>
            <span style={{ color: toneColors.usb }}>■ USB / Camera</span>
            <span style={{ color: toneColors.audio }}>■ Audio</span>
            <span style={{ color: toneColors.other }}>■ By others</span>
          </div>
        </div>

        <div className="wm-schematic-svg-wrap">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="wm-schematic-svg"
            role="img"
            aria-label={`Block schematic diagram for ${template.name}`}
          >
            <defs>
              <marker id="arrow" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="5" orient="auto">
                <path d="M0,0 L10,3 L0,6 Z" fill="rgba(74,245,230,.5)" />
              </marker>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Stage number labels along top */}
            {Array.from({ length: maxStages }, (_, i) => (
              <g key={`stage-${i}`}>
                <text
                  x={blockX(i) + STAGE_WIDTH / 2}
                  y={14}
                  textAnchor="middle"
                  className="wm-schematic-stage-num"
                >
                  {String.fromCharCode(65 + i)}
                </text>
                <line
                  x1={blockX(i) + STAGE_WIDTH / 2}
                  y1={18}
                  x2={blockX(i) + STAGE_WIDTH / 2}
                  y2={svgHeight - 10}
                  stroke="rgba(76,153,174,.08)"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                />
              </g>
            ))}

            {/* Lanes */}
            {lanes.map((lane) => (
              <g key={lane.name}>
                {/* Lane label */}
                <text x={8} y={HEADER_HEIGHT + lane.y + ROW_HEIGHT / 2 + 4} className="wm-schematic-lane-label">
                  {lane.name}
                </text>

                {/* Signal flow arrows between blocks */}
                {lane.items.length > 1 &&
                  lane.items.slice(0, -1).map((_, i) => {
                    const x1 = blockX(i) + STAGE_WIDTH + 2;
                    const x2 = blockX(i + 1) - 2;
                    const y = HEADER_HEIGHT + lane.y + ROW_HEIGHT / 2;
                    return (
                      <line
                        key={`arrow-${lane.name}-${i}`}
                        x1={x1}
                        y1={y}
                        x2={x2}
                        y2={y}
                        stroke="rgba(74,245,230,.3)"
                        strokeWidth="1.5"
                        markerEnd="url(#arrow)"
                      />
                    );
                  })}

                {/* Equipment blocks */}
                {lane.items.map((item, i) => {
                  const x = blockX(i);
                  const y = HEADER_HEIGHT + lane.y;
                  const color = toneColors[item.tone];
                  const glow = toneGlows[item.tone];
                  const isSelected = selectedIdx === items.indexOf(item);
                  return (
                    <g
                      key={`${lane.name}-${item.sku}`}
                      className={`wm-schematic-block ${isSelected ? "is-selected" : ""}`}
                      onClick={() => setSelectedIdx(items.indexOf(item))}
                      role="button"
                      tabIndex={0}
                      aria-label={`${item.label}: ${item.subtitle}`}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedIdx(items.indexOf(item)); } }}
                    >
                      {/* Block glow */}
                      <rect
                        x={x - 2}
                        y={y - 2}
                        width={STAGE_WIDTH + 4}
                        height={ROW_HEIGHT + 4}
                        rx={8}
                        fill={glow}
                        stroke={isSelected ? color : "transparent"}
                        strokeWidth={isSelected ? 2 : 0}
                      />
                      {/* Block background */}
                      <rect
                        x={x}
                        y={y}
                        width={STAGE_WIDTH}
                        height={ROW_HEIGHT}
                        rx={6}
                        fill="rgba(8,29,48,.9)"
                        stroke={color}
                        strokeWidth={isSelected ? 2 : 1}
                      />
                      {/* Top accent line */}
                      <rect
                        x={x}
                        y={y}
                        width={STAGE_WIDTH}
                        height={3}
                        rx={2}
                        fill={color}
                      />
                      {/* SKU label */}
                      <text x={x + STAGE_WIDTH / 2} y={y + 22} textAnchor="middle" className="wm-schematic-block-sku">
                        {truncate(item.label, 18)}
                      </text>
                      {/* Description */}
                      <text x={x + STAGE_WIDTH / 2} y={y + 38} textAnchor="middle" className="wm-schematic-block-desc">
                        {truncate(item.subtitle, 22)}
                      </text>
                      {/* Quantity badge */}
                      {item.skuCount && (
                        <g>
                          <rect x={x + STAGE_WIDTH - 22} y={y + 46} width={18} height={14} rx={7} fill={color} />
                          <text x={x + STAGE_WIDTH - 13} y={y + 56} textAnchor="middle" className="wm-schematic-block-qty">
                            ×{item.skuCount}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            ))}
          </svg>
        </div>
      </section>

      {/* Detail panel for selected block */}
      {selectedItem ? (
        <aside className="wm-template-stage-detail" aria-live="polite">
          <div>
            <span className="wm-status" style={{ color: toneColors[selectedItem.tone], borderColor: toneColors[selectedItem.tone] }}>
              {selectedItem.tone === "other" ? "By others" : "In scope"}
            </span>
            <h3>{selectedItem.label}</h3>
            <p>{selectedItem.subtitle}</p>
          </div>
          <dl>
            <div><dt>Signal type</dt><dd style={{ color: toneColors[selectedItem.tone] }}>{selectedItem.tone.charAt(0).toUpperCase() + selectedItem.tone.slice(1)}</dd></div>
            {selectedItem.skuCount && <div><dt>Quantity</dt><dd>{selectedItem.skuCount} units in BOM</dd></div>}
            <div><dt>Validation</dt><dd>{template.validationItems[items.indexOf(selectedItem) % Math.max(1, template.validationItems.length)] || "Confirm on site"}</dd></div>
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
