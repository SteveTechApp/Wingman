import type { SchematicModel, SchematicNode } from "./schematicTypes";
export function technicalDeviceLabelLines(label: string): string[] {
  const lines: string[] = []; let line = "";
  for (const word of label.split(/\s+/)) {
    if (line && `${line} ${word}`.length > 30) { lines.push(line); line = word; } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

export function technicalDevicePortOffset(node: SchematicNode) {
  return 95 + Math.max(0, technicalDeviceLabelLines(node.sku ?? node.label.replace(/ by others$/i, "")).length-2)*16;
}
export const DRAWING_NODE_WIDTH = 250;
export const DRAWING_COLUMN_GAP = 390;
export const DRAWING_ROW_GAP = 190;
export const DRAWING_ORIGIN_Y = 140;
export function technicalDevicePorts(model: SchematicModel, node: SchematicNode) {
  return {
    inputs: [...new Set(model.connections.filter(c => c.to === node.id).map(c => c.toPort ?? "INPUT TBD"))],
    outputs: [...new Set(model.connections.filter(c => c.from === node.id).map(c => c.fromPort ?? "OUTPUT TBD"))],
  };
}
export function technicalDevicePosition(model: SchematicModel, node: SchematicNode) {
  const columnNodes = model.nodes.filter(n => !n.metadata?.unresolvedScope && n.column === node.column);
  const index = columnNodes.findIndex(n => n.id === node.id);
  const ports = technicalDevicePorts(model, node);
  return { x: 50 + node.column * DRAWING_COLUMN_GAP, y: DRAWING_ORIGIN_Y + columnNodes.slice(0,Math.max(0,index)).reduce((sum,previous) => { const p = technicalDevicePorts(model,previous); return sum + Math.max(DRAWING_ROW_GAP, technicalDevicePortOffset(previous)+40 + Math.max(p.inputs.length,p.outputs.length) * 30); },0), height: Math.max(140, technicalDevicePortOffset(node)-5 + Math.max(ports.inputs.length, ports.outputs.length) * 30) };
}
export function technicalConnectionRoute(model: SchematicModel, connection: SchematicModel["connections"][number], _index: number) {
  const from = model.nodes.find(n => n.id === connection.from)!;
  const to = model.nodes.find(n => n.id === connection.to)!;
  const source = technicalDevicePosition(model,from), destination = technicalDevicePosition(model,to);
  const fromPorts = technicalDevicePorts(model,from).outputs, toPorts = technicalDevicePorts(model,to).inputs;
  const start = { x: source.x + DRAWING_NODE_WIDTH, y: source.y + technicalDevicePortOffset(from) + Math.max(0,fromPorts.indexOf(connection.fromPort ?? "OUTPUT TBD")) * 30 };
  const end = { x: destination.x, y: destination.y + technicalDevicePortOffset(to) + Math.max(0,toPorts.indexOf(connection.toPort ?? "INPUT TBD")) * 30 };
  const parallel = model.connections.filter(c => model.nodes.find(n => n.id === c.from)?.column === from.column && model.nodes.find(n => n.id === c.to)?.column === to.column);
  const rank = Math.max(0,parallel.findIndex(c => c.id === connection.id));
  const clearance = Math.max(40, end.x-start.x-30);
  const channel = start.x + 15 + (rank+1)*Math.min(20,clearance/(parallel.length+1));
  return [start,{x:channel,y:start.y},{x:channel,y:end.y},end];
}
