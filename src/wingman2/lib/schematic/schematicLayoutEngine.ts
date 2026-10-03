import type { SchematicConnection, SchematicModel, SchematicNode } from "./schematicTypes";

export interface SchematicLayoutOptions {
  columnWidth?: number;
  laneHeight?: number;
  originX?: number;
  originY?: number;
}

const DEFAULT_OPTIONS: Required<SchematicLayoutOptions> = {
  columnWidth: 260,
  laneHeight: 120,
  originX: 80,
  originY: 80,
};

export function applySchematicLayout(
  model: Omit<SchematicModel, "connections"> & { connections: Omit<SchematicConnection, "points">[] },
  options: SchematicLayoutOptions = {},
): SchematicModel {
  const resolved = { ...DEFAULT_OPTIONS, ...options };

  const nodes = model.nodes.map((node) => ({
    ...node,
    x: resolved.originX + node.column * resolved.columnWidth,
    y: resolved.originY + node.lane * resolved.laneHeight,
  }));

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  const connections = model.connections.map((connection) => {
    const from = nodeMap.get(connection.from);
    const to = nodeMap.get(connection.to);

    return {
      ...connection,
      points: routeOrthogonal(from, to),
    };
  });

  return {
    ...model,
    nodes,
    connections,
  };
}

function routeOrthogonal(from: SchematicNode | undefined, to: SchematicNode | undefined) {
  if (!from || !to) {
    return [];
  }

  const start = { x: from.x + 140, y: from.y + 28 };
  const end = { x: to.x, y: to.y + 28 };
  const midX = Math.round((start.x + end.x) / 2);

  return [
    start,
    { x: midX, y: start.y },
    { x: midX, y: end.y },
    end,
  ];
}