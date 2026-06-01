export type MermaidDirection = "TD" | "LR";

export type MermaidNodeShape = "rect" | "round" | "stadium" | "diamond" | "hex" | "subroutine";

export type MermaidNode = {
  id: string;
  label: string;
  shape?: MermaidNodeShape;
  className?: string;
};

export type MermaidEdge = {
  from: string;
  to: string;
  label?: string;
  style?: "arrow" | "dotted" | "thick";
};

export type MermaidSubgraph = {
  id: string;
  title: string;
  nodeIds: string[];
};

export type MermaidFlowchartInput = {
  title?: string;
  direction?: MermaidDirection;
  nodes: MermaidNode[];
  edges: MermaidEdge[];
  subgraphs?: MermaidSubgraph[];
};

export function toMermaidId(value: string) {
  const id = value
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 42);

  return id && /^[a-zA-Z_]/.test(id) ? id : `node_${id || "item"}`;
}

export function escapeMermaidLabel(value: string) {
  return value
    .replace(/[\r\n]+/g, " ")
    .replace(/"/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function mermaidNode(id: string, label: string, shape: MermaidNodeShape = "rect", className?: string): MermaidNode {
  return {
    id: toMermaidId(id),
    label,
    shape,
    className,
  };
}

export function mermaidEdge(from: string, to: string, label?: string, style: MermaidEdge["style"] = "arrow"): MermaidEdge {
  return {
    from: toMermaidId(from),
    to: toMermaidId(to),
    label,
    style,
  };
}

function nodeSyntax(node: MermaidNode) {
  const id = toMermaidId(node.id);
  const label = `"${escapeMermaidLabel(node.label)}"`;

  switch (node.shape) {
    case "round":
      return `${id}(${label})`;
    case "stadium":
      return `${id}([${label}])`;
    case "diamond":
      return `${id}{${label}}`;
    case "hex":
      return `${id}{{${label}}}`;
    case "subroutine":
      return `${id}[[${label}]]`;
    case "rect":
    default:
      return `${id}[${label}]`;
  }
}

function edgeSyntax(edge: MermaidEdge) {
  const label = edge.label ? `|"${escapeMermaidLabel(edge.label)}"|` : "";

  if (edge.style === "dotted") {
    return label
      ? `${toMermaidId(edge.from)} -.->${label} ${toMermaidId(edge.to)}`
      : `${toMermaidId(edge.from)} -.-> ${toMermaidId(edge.to)}`;
  }

  if (edge.style === "thick") {
    return label
      ? `${toMermaidId(edge.from)} ==>${label} ${toMermaidId(edge.to)}`
      : `${toMermaidId(edge.from)} ==> ${toMermaidId(edge.to)}`;
  }

  return `${toMermaidId(edge.from)} -->${label} ${toMermaidId(edge.to)}`;
}

export function buildMermaidFlowchart(input: MermaidFlowchartInput) {
  const direction = input.direction ?? "TD";
  const nodesById = new Map(input.nodes.map((node) => [toMermaidId(node.id), { ...node, id: toMermaidId(node.id) }]));
  const subgraphNodeIds = new Set(input.subgraphs?.flatMap((subgraph) => subgraph.nodeIds.map(toMermaidId)) ?? []);
  const lines: string[] = [];

  if (input.title) {
    lines.push(`%% ${escapeMermaidLabel(input.title)}`);
  }

  lines.push(`flowchart ${direction}`);

  input.subgraphs?.forEach((subgraph) => {
    lines.push(`  subgraph ${toMermaidId(subgraph.id)}["${escapeMermaidLabel(subgraph.title)}"]`);
    subgraph.nodeIds.forEach((nodeId) => {
      const node = nodesById.get(toMermaidId(nodeId));
      if (node) {
        lines.push(`    ${nodeSyntax(node)}`);
      }
    });
    lines.push("  end");
  });

  input.nodes.forEach((node) => {
    if (!subgraphNodeIds.has(toMermaidId(node.id))) {
      lines.push(`  ${nodeSyntax(node)}`);
    }
  });

  input.edges.forEach((edge) => {
    lines.push(`  ${edgeSyntax(edge)}`);
  });

  const classLines = input.nodes
    .filter((node) => node.className)
    .map((node) => `  class ${toMermaidId(node.id)} ${node.className}`);

  if (classLines.length) {
    lines.push("  classDef blocker fill:#fff1f2,stroke:#fb7185,color:#7f1d1d");
    lines.push("  classDef option fill:#eff6ff,stroke:#60a5fa,color:#172554");
    lines.push("  classDef wyrestorm fill:#ecfdf5,stroke:#34d399,color:#064e3b");
    lines.push("  classDef customer fill:#fff7ed,stroke:#fb923c,color:#7c2d12");
    lines.push(...classLines);
  }

  return `${lines.join("\n")}\n`;
}

export function buildMermaidBlockerList(blockers: string[]) {
  if (!blockers.length) {
    return [];
  }

  return blockers.map((blocker, index) => mermaidNode(`blocker_${index + 1}`, `Quote blocker: ${blocker}`, "rect", "blocker"));
}
