import type { SchematicModel } from "./schematic/schematicTypes";

const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

/** Print-safe vector drawing using the same connections as the cable schedule. */
export function proposalDiagramSvg(input: SchematicModel) {
  const lanes = new Map<number, number>();
  const nodesWithLayout = input.nodes.map((node) => {
    const column = node.kind === "display" || node.kind === "audio-device" ? 4 : node.kind === "av-over-ip-decoder" ? 3 : node.kind === "network-switch" ? 2 : node.column;
    const lane = lanes.get(column) || 0;
    lanes.set(column, lane + 1);
    return { ...node, x: 30 + column * 220, y: 30 + lane * 110 };
  });
  const byId = new Map(nodesWithLayout.map((node) => [node.id, node]));
  const model = { ...input, nodes: nodesWithLayout, connections: input.connections.map((connection) => {
    const from = byId.get(connection.from)!; const to = byId.get(connection.to)!;
    const x1 = from.x + 140; const x2 = to.x; const midX = (x1 + x2) / 2;
    return { ...connection, points: [{ x: x1, y: from.y + 28 }, { x: midX, y: from.y + 28 }, { x: midX, y: to.y + 28 }, { x: x2, y: to.y + 28 }] };
  }) };
  const width = Math.max(600, ...model.nodes.map((node) => node.x + 200));
  const height = Math.max(180, ...model.nodes.map((node) => node.y + 110));
  const lines = model.connections.map((connection) => {
    const mid = connection.points[1];
    return `<polyline points="${connection.points.map((point) => `${point.x},${point.y}`).join(" ")}" fill="none" stroke="#347486" stroke-width="2" marker-end="url(#proposal-arrow)"/>${mid ? `<text x="${mid.x + 3}" y="${mid.y - 8}" font-size="10" fill="#334155">${escape(connection.transport)}</text>` : ""}`;
  }).join("");
  const nodes = model.nodes.map((node) => {
    const label = (node.sku || node.label).match(/.{1,20}/g) || [];
    return `<g><title>${escape(node.label)}</title><rect x="${node.x}" y="${node.y}" width="140" height="64" rx="6" fill="#f0f7fa" stroke="#347486"/><text x="${node.x + 7}" y="${node.y + 18}" fill="#08223a" font-size="12">${label.map((line, index) => `<tspan x="${node.x + 7}" dy="${index ? 14 : 0}">${escape(line)}</tspan>`).join("")}</text><text x="${node.x + 7}" y="${node.y + 55}" fill="#475569" font-size="9">${escape(node.kind)}</text></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Concept signal-flow diagram" viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;background:white"><defs><marker id="proposal-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="#347486"/></marker></defs>${lines}${nodes}</svg>`;
}
