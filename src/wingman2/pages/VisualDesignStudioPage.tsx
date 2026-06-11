import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, Clipboard, Database, Monitor, Network, Radio, Server, Usb, Workflow, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { readProductWorkspaceHandoff, type ProductWorkspaceHandoff } from "../data/productWorkspaceHandoff";
import { writeSchematicWorkspaceHandoff } from "../data/schematicWorkspaceHandoff";
import { useProjectStore, type StoredProject } from "../data/projectStore";
import {
  DIAGRAM_TEMPLATES,
  diagramTemplateFor,
  generateDiagram,
  type DiagramGenerationResult,
  type DiagramTypeId,
} from "../lib/diagramTemplates";

type SchematicSourceId = "active" | "product-workspace" | "tbc" | string;
type SchematicNodeKind = "source" | "wyrestorm" | "network" | "display" | "usb" | "audio" | "control" | "validation" | "other";

type SchematicNode = {
  id: string;
  label: string;
  kind: SchematicNodeKind;
  x: number;
  y: number;
};

type SchematicEdge = {
  from: string;
  to: string;
  label: string;
  style: "solid" | "dotted" | "thick";
};

type SchematicModel = {
  nodes: SchematicNode[];
  edges: SchematicEdge[];
  lanes: Array<{ label: string; x: number }>;
};

const NODE_WIDTH = 154;
const NODE_HEIGHT = 66;

const KIND_LABELS: Record<SchematicNodeKind, string> = {
  source: "Source",
  wyrestorm: "WyreStorm",
  network: "Network",
  display: "Display",
  usb: "USB",
  audio: "Audio",
  control: "Control",
  validation: "Validate",
  other: "System",
};

function projectCoverage(project?: StoredProject | null) {
  return [
    { label: "Discovery", ready: Boolean(project?.discoveryBrief || project?.requirements?.length || project?.ingest) },
    { label: "Products", ready: Boolean(project?.productSelections?.length || project?.proposal?.products?.length) },
    { label: "Compare", ready: Boolean(project?.compareRuns?.length) },
    { label: "Response pack", ready: Boolean(project?.proposal) },
  ];
}

function productCoverage(productHandoff: ProductWorkspaceHandoff | null) {
  return [
    { label: "Product", ready: Boolean(productHandoff?.sku) },
    { label: "Connection view", ready: Boolean(productHandoff?.diagramSource && productHandoff?.diagramOutput) },
    { label: "Room visual", ready: Boolean(productHandoff?.visualPrompt) },
    { label: "Checks", ready: Boolean(productHandoff?.checks?.length) },
  ];
}

function projectLabel(project: StoredProject) {
  const pieces = [project.name, project.stage, project.updated].filter(Boolean);
  return pieces.join(" - ");
}

function escapeMermaidLabel(value: string) {
  return value
    .replace(/"/g, "'")
    .replace(/\[/g, "(")
    .replace(/\]/g, ")")
    .replace(/\{/g, "(")
    .replace(/\}/g, ")")
    .replace(/\|/g, "-")
    .trim();
}

function tbcNode(label: string) {
  return `${label} TBC`;
}

function cleanSchematicLabel(value: string) {
  return value
    .replace(/^"+|"+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function classifySchematicNode(id: string, label: string): SchematicNodeKind {
  const text = `${id} ${label}`.toLowerCase();

  if (/blocker|check|validate|validation|quote/.test(text)) return "validation";
  if (/display|screen|projector|monitor|wall|decoder|destination/.test(text)) return "display";
  if (/wyrestorm|product|matrix|switcher|transmitter|receiver|encoder|decoder|mx|sw|ex|exp|hdbt|networkhd|nhd/.test(text)) return "wyrestorm";
  if (/network|lan|switch|vlan|ctl|ip|poe/.test(text)) return "network";
  if (/usb|camera|speakerphone|touch|host|byod|byom/.test(text)) return "usb";
  if (/audio|dante|mic|speaker|amp|line/.test(text)) return "audio";
  if (/control|rs-?232|cec|api|relay|ir/.test(text)) return "control";
  if (/source|input|laptop|player|pc|room source|presenter/.test(text)) return "source";

  return "other";
}

function parseMermaidToSchematic(result: DiagramGenerationResult): SchematicModel {
  const nodesById = new Map<string, Omit<SchematicNode, "x" | "y">>();
  const edges: SchematicEdge[] = [];

  result.mermaid.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("%%") || line.startsWith("flowchart") || line.startsWith("class") || line.startsWith("subgraph") || line === "end") {
      return;
    }

    const edgeMatch = line.match(/^([A-Za-z_][\w]*)\s*(-\.->|-->|==>)\s*(?:\|"([^"]+)"\|\s*)?([A-Za-z_][\w]*)/);
    if (edgeMatch) {
      const [, from, arrow, label = "", to] = edgeMatch;
      edges.push({
        from,
        to,
        label: cleanSchematicLabel(label),
        style: arrow === "-.->" ? "dotted" : arrow === "==>" ? "thick" : "solid",
      });

      [from, to].forEach((nodeId) => {
        if (!nodesById.has(nodeId)) {
          nodesById.set(nodeId, {
            id: nodeId,
            label: nodeId.replace(/_/g, " "),
            kind: classifySchematicNode(nodeId, nodeId),
          });
        }
      });
      return;
    }

    const nodeMatch = line.match(/^([A-Za-z_][\w]*)\s*(?:\[\[|\[\(|\[|\(\[|\(|\{\{|\{)\s*"?([^"\]\)\}]+)"?/);
    if (nodeMatch) {
      const [, id, rawLabel] = nodeMatch;
      const label = cleanSchematicLabel(rawLabel);
      nodesById.set(id, {
        id,
        label,
        kind: classifySchematicNode(id, label),
      });
    }
  });

  if (!nodesById.size) {
    nodesById.set("source", { id: "source", label: "Source / input", kind: "source" });
    nodesById.set("wyrestorm", { id: "wyrestorm", label: "WyreStorm product path", kind: "wyrestorm" });
    nodesById.set("destination", { id: "destination", label: "Display / destination", kind: "display" });
    edges.push({ from: "source", to: "wyrestorm", label: "", style: "solid" });
    edges.push({ from: "wyrestorm", to: "destination", label: "", style: "solid" });
  }

  const allNodes = Array.from(nodesById.values()).slice(0, 14);
  const laneConfig: Array<{ label: string; x: number; kinds: SchematicNodeKind[]; yMin: number; yMax: number }> = [
    { label: "Inputs", x: 112, kinds: ["source"], yMin: 190, yMax: 350 },
    { label: "WyreStorm path", x: 340, kinds: ["wyrestorm"], yMin: 150, yMax: 360 },
    { label: "Services", x: 568, kinds: ["network", "usb", "audio", "control", "other"], yMin: 112, yMax: 382 },
    { label: "Room outputs", x: 798, kinds: ["display"], yMin: 185, yMax: 355 },
    { label: "Checks", x: 568, kinds: ["validation"], yMin: 438, yMax: 438 },
  ];

  const laidOut: SchematicNode[] = [];
  laneConfig.forEach((lane) => {
    const laneNodes = allNodes.filter((node) => lane.kinds.includes(node.kind));
    const span = Math.max(0, lane.yMax - lane.yMin);
    const gap = laneNodes.length > 1 ? span / (laneNodes.length - 1) : 0;

    laneNodes.forEach((node, index) => {
      laidOut.push({
        ...node,
        x: lane.x,
        y: laneNodes.length === 1 ? lane.yMin + span / 2 : lane.yMin + gap * index,
      });
    });
  });

  return {
    nodes: laidOut,
    edges: edges.filter((edge) => laidOut.some((node) => node.id === edge.from) && laidOut.some((node) => node.id === edge.to)),
    lanes: laneConfig.map(({ label, x }) => ({ label, x })),
  };
}

function labelLines(label: string) {
  const words = cleanSchematicLabel(label).split(" ");
  const lines: string[] = [];

  words.forEach((word) => {
    const current = lines[lines.length - 1] ?? "";
    if (!current) {
      lines.push(word);
      return;
    }

    if (`${current} ${word}`.length <= 24) {
      lines[lines.length - 1] = `${current} ${word}`;
    } else if (lines.length < 3) {
      lines.push(word);
    }
  });

  if (lines.length > 3) {
    return [`${lines.slice(0, 2).join(" ")}`, `${lines[2]}...`];
  }

  return lines.slice(0, 3);
}

function sceneDetails(
  result: DiagramGenerationResult,
  productHandoff: ProductWorkspaceHandoff | null,
  project: StoredProject | null
) {
  const productStat = result.stats.find((stat) => /product/i.test(stat.label))?.value;
  const productLabel = productHandoff?.sku || (productStat && !/^(0|tbc)$/i.test(productStat) ? productStat : "WyreStorm path");
  const sourceText = `${result.diagramType} ${result.title} ${result.summary}`.toLowerCase();

  if (sourceText.includes("video wall")) {
    return {
      label: "Generated retail / lobby deployment",
      display: "Video wall canvas",
      product: productLabel,
      transport: "AV distribution path",
      environment: project?.name || "Reception display zone",
      accent: "multi-display",
    };
  }

  if (sourceText.includes("networkhd") || sourceText.includes("network")) {
    return {
      label: "Generated NetworkHD deployment",
      display: "Routed room display",
      product: productLabel,
      transport: "Managed network AV",
      environment: project?.name || "Networked meeting space",
      accent: "network",
    };
  }

  if (sourceText.includes("usb") || sourceText.includes("conferencing")) {
    return {
      label: "Generated hybrid meeting deployment",
      display: "UC display and camera",
      product: productLabel,
      transport: "HDMI, USB and control",
      environment: project?.name || "Hybrid meeting room",
      accent: "usb",
    };
  }

  return {
    label: "Generated AV deployment visual",
    display: "Presentation display",
    product: productLabel,
    transport: "Signal, control and power paths",
    environment: project?.name || productHandoff?.productType || "Customer room",
    accent: "signal",
  };
}

function schematicProductLabel(result: DiagramGenerationResult, productHandoff: ProductWorkspaceHandoff | null) {
  const productStat = result.stats.find((stat) => /product/i.test(stat.label))?.value;
  return productHandoff?.sku || (productStat && !/^(0|tbc)$/i.test(productStat) ? productStat : "WyreStorm device / path TBC");
}

function PortSchematicPanel({
  result,
  productHandoff,
}: {
  result: DiagramGenerationResult;
  productHandoff: ProductWorkspaceHandoff | null;
}) {
  const productLabel = schematicProductLabel(result, productHandoff);
  const sourceLabel = productHandoff?.diagramSource || "Laptop / room source TBC";
  const destinationLabel = productHandoff?.diagramOutput || "Display / projector TBC";
  const isUsb = /usb|conference|byod|byom/i.test(`${result.diagramType} ${result.title} ${result.summary}`);
  const isNetwork = /network|ip|nhd|avoip/i.test(`${result.diagramType} ${result.title} ${result.summary}`);

  return (
    <section className="wm-port-schematic-panel" data-wingman-av-schematic="true">
      <header className="wm-native-output-head">
        <div>
          <span>AV schematic diagram</span>
          <h2>{result.title}</h2>
        </div>
        <strong>Ports and paths</strong>
      </header>

      <div className="wm-port-schematic-board">
        <svg className="wm-port-schematic-lines" viewBox="0 0 1000 560" preserveAspectRatio="none" aria-hidden="true">
          <path className="wm-line-signal" d="M155 150 C250 150 270 150 365 150" />
          <path className="wm-line-signal" d="M635 150 C730 150 750 150 845 150" />
          <path className="wm-line-usb" d="M155 252 C280 252 280 205 365 205" />
          <path className="wm-line-usb" d="M635 205 C720 205 724 252 845 252" />
          <path className="wm-line-network" d="M500 292 C500 398 500 398 500 482" />
          <path className="wm-line-audio" d="M635 246 C720 246 724 324 845 324" />
          <text x="250" y="137">HDMI / AV input</text>
          <text x="704" y="137">{isNetwork ? "IP / decoder output" : "HDMI / HDBaseT output"}</text>
          <text x="235" y="242">USB host / device</text>
          <text x="704" y="242">{isUsb ? "USB camera / touch" : "USB / control TBC"}</text>
          <text x="515" y="442">LAN / control / PoE</text>
          <text x="706" y="312">Audio path</text>
        </svg>

        <div className="wm-schematic-column wm-schematic-source-stack">
          <div className="wm-schematic-endpoint" data-kind="source">
            <span>Source</span>
            <strong>{sourceLabel}</strong>
            <small>HDMI / USB / audio as required</small>
          </div>
          <div className="wm-schematic-endpoint" data-kind="host">
            <span>Host / BYOD</span>
            <strong>{isUsb ? "Laptop or room PC" : "Optional host TBC"}</strong>
            <small>USB-C, USB-B, HDMI or network input</small>
          </div>
        </div>

        <div className="wm-schematic-device-block">
          <span>WyreStorm device</span>
          <strong>{productLabel}</strong>
          <div className="wm-schematic-port-grid">
            <div data-port="input">HDMI IN</div>
            <div data-port="output">HDMI / HDBT OUT</div>
            <div data-port="usb">USB HOST / DEV</div>
            <div data-port="network">LAN / PoE</div>
            <div data-port="audio">AUDIO</div>
            <div data-port="control">RS-232 / IR / CEC</div>
            <div data-port="power">PSU / PoC / PoH</div>
          </div>
        </div>

        <div className="wm-schematic-column wm-schematic-output-stack">
          <div className="wm-schematic-endpoint" data-kind="display">
            <span>Destination</span>
            <strong>{destinationLabel}</strong>
            <small>Display, projector, decoder or video wall</small>
          </div>
          <div className="wm-schematic-endpoint" data-kind="usb">
            <span>USB devices</span>
            <strong>{isUsb ? "Camera, speakerphone, touch" : "USB devices TBC"}</strong>
            <small>Host/device direction must be confirmed</small>
          </div>
          <div className="wm-schematic-endpoint" data-kind="audio">
            <span>Audio</span>
            <strong>DSP, amplifier or display audio</strong>
            <small>Embed, de-embed or analogue path</small>
          </div>
        </div>

        <div className="wm-schematic-network-strip">
          <Network aria-hidden="true" />
          <div>
            <span>Control / network / power</span>
            <strong>{isNetwork ? "Managed AV network, PoE and controller path" : "LAN, RS-232/IR/CEC, external PSU, PoC or PoH as specified"}</strong>
          </div>
        </div>
      </div>

      <div className="wm-port-schematic-legend">
        <span data-kind="signal">HDMI / AV</span>
        <span data-kind="usb">USB</span>
        <span data-kind="network">Network / control</span>
        <span data-kind="audio">Audio</span>
        <span data-kind="power">Power / PoC / PoH</span>
      </div>
    </section>
  );
}

function nodeIcon(kind: SchematicNodeKind) {
  switch (kind) {
    case "source":
      return <Monitor aria-hidden="true" />;
    case "wyrestorm":
      return <Server aria-hidden="true" />;
    case "network":
      return <Network aria-hidden="true" />;
    case "usb":
      return <Usb aria-hidden="true" />;
    case "audio":
      return <Radio aria-hidden="true" />;
    case "control":
      return <Zap aria-hidden="true" />;
    case "display":
      return <Monitor aria-hidden="true" />;
    case "validation":
      return <AlertTriangle aria-hidden="true" />;
    default:
      return <Workflow aria-hidden="true" />;
  }
}

function NativeSchematicCanvas({ result }: { result: DiagramGenerationResult }) {
  const model = useMemo(() => parseMermaidToSchematic(result), [result]);
  const nodeMap = useMemo(() => new Map(model.nodes.map((node) => [node.id, node])), [model.nodes]);

  return (
    <section className="wm-native-schematic-panel" data-wingman-native-schematic="true">
      <header className="wm-native-output-head">
        <div>
          <span>Actual schematic</span>
          <h2>{result.title}</h2>
        </div>
        <strong>{result.sourceLabel}</strong>
      </header>

      <div className="wm-native-schematic-canvas" role="img" aria-label={`${result.title} schematic`}>
        <svg viewBox="0 0 940 540" preserveAspectRatio="xMidYMid meet">
          <defs>
            <marker id="wm-schematic-arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L7,3 z" />
            </marker>
            <pattern id="wm-schematic-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" />
            </pattern>
          </defs>
          <rect className="wm-schematic-grid-fill" x="0" y="0" width="940" height="540" />

          {model.lanes.map((lane) => (
            <g key={lane.label} className="wm-schematic-lane">
              <line x1={lane.x} y1="74" x2={lane.x} y2="476" />
              <text x={lane.x} y="50" textAnchor="middle">
                {lane.label}
              </text>
            </g>
          ))}

          {model.edges.map((edge, index) => {
            const from = nodeMap.get(edge.from);
            const to = nodeMap.get(edge.to);
            if (!from || !to) return null;
            const fromX = from.x + NODE_WIDTH / 2;
            const fromY = from.y;
            const toX = to.x - NODE_WIDTH / 2;
            const toY = to.y;
            const midX = (fromX + toX) / 2;
            const midY = (fromY + toY) / 2 - 8;
            const path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;

            return (
              <g key={`${edge.from}-${edge.to}-${index}`} className="wm-schematic-edge" data-style={edge.style}>
                <path d={path} markerEnd="url(#wm-schematic-arrow)" />
                {edge.label ? (
                  <text x={midX} y={midY} textAnchor="middle">
                    {edge.label}
                  </text>
                ) : null}
              </g>
            );
          })}

          {model.nodes.map((node) => {
            const lines = labelLines(node.label);

            return (
              <g key={node.id} className="wm-schematic-svg-node" data-kind={node.kind} transform={`translate(${node.x - NODE_WIDTH / 2} ${node.y - NODE_HEIGHT / 2})`}>
                <rect width={NODE_WIDTH} height={NODE_HEIGHT} rx="12" />
                <text className="wm-schematic-node-kind" x="16" y="18">
                  {KIND_LABELS[node.kind]}
                </text>
                {lines.map((line, index) => (
                  <text key={line} className="wm-schematic-node-label" x="16" y={38 + index * 14}>
                    {line}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="wm-schematic-node-legend">
        {(["source", "wyrestorm", "network", "usb", "audio", "control", "display", "validation"] as SchematicNodeKind[]).map((kind) => (
          <span key={kind} data-kind={kind}>
            {nodeIcon(kind)}
            {KIND_LABELS[kind]}
          </span>
        ))}
      </div>
    </section>
  );
}

function DeploymentVisualPanel({
  result,
  productHandoff,
  project,
}: {
  result: DiagramGenerationResult;
  productHandoff: ProductWorkspaceHandoff | null;
  project: StoredProject | null;
}) {
  const scene = sceneDetails(result, productHandoff, project);

  return (
    <section className="wm-deployment-visual-panel" data-wingman-generated-deployment-visual="true">
      <header className="wm-native-output-head">
        <div>
          <span>Deployment concept visual</span>
          <h2>{scene.label}</h2>
        </div>
        <strong>Generated in Wingman</strong>
      </header>

      <div className="wm-deployment-stage" data-accent={scene.accent}>
        <div className="wm-render-wall">
          <div className="wm-render-display">
            <span>{scene.display}</span>
            <small>{scene.environment}</small>
          </div>
          <div className="wm-render-camera">
            <Camera aria-hidden="true" />
          </div>
        </div>
        <div className="wm-render-cable wm-render-cable-a" />
        <div className="wm-render-cable wm-render-cable-b" />
        <div className="wm-render-cable wm-render-cable-c" />
        <div className="wm-render-table">
          <div className="wm-render-laptop">
            <Monitor aria-hidden="true" />
          </div>
          <span>Presenter source</span>
        </div>
        <div className="wm-render-rack">
          <span>WyreStorm</span>
          <strong>{scene.product}</strong>
          <small>{scene.transport}</small>
        </div>
      </div>

      <div className="wm-deployment-brief">
        <span>{scene.transport}</span>
        <span>{result.summary}</span>
      </div>
    </section>
  );
}

function SchematicReviewPanel({ result }: { result: DiagramGenerationResult }) {
  return (
    <section className="wm-schematic-review-panel">
      <div className="wm-schematic-stat-strip">
        {result.stats.map((stat) => (
          <div key={`${stat.label}-${stat.value}`}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>

      <div className="wm-schematic-review-grid">
        <section data-state={result.blockers.length ? "warning" : "ready"}>
          <h3>
            <AlertTriangle className="h-4 w-4" />
            Checks before customer issue
          </h3>
          <ul>
            {(result.blockers.length ? result.blockers : ["No open blockers captured for this view."]).slice(0, 5).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h3>
            <CheckCircle2 className="h-4 w-4" />
            Design assumptions
          </h3>
          <ul>
            {(result.assumptions.length ? result.assumptions : ["Confirm final cable routes, power and control ownership before issue."]).slice(0, 5).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <details className="wm-schematic-source-details">
        <summary>View source diagram text</summary>
        <textarea value={result.mermaid} readOnly aria-label="Generated source diagram text" />
      </details>
    </section>
  );
}

function buildProductHandoffDiagram(
  productHandoff: ProductWorkspaceHandoff,
  diagramType: DiagramTypeId
): DiagramGenerationResult {
  const sourceLabel = escapeMermaidLabel(productHandoff.diagramSource || tbcNode("Source / input"));
  const productLabel = escapeMermaidLabel(`${productHandoff.sku} - ${productHandoff.productType || productHandoff.name}`);
  const destinationLabel = escapeMermaidLabel(productHandoff.diagramOutput || tbcNode("Destination / output"));
  const checks = productHandoff.checks?.length
    ? productHandoff.checks.slice(0, 5)
    : ["Confirm source, destination, cable path, control and wider system requirements before customer issue."];

  const checkLines = checks
    .map((check, index) => `  product --> check_${index + 1}["${escapeMermaidLabel(check)}"]`)
    .join("\n");

  const mermaid = [
    "flowchart LR",
    `  source["${sourceLabel}"]`,
    `  product["${productLabel}"]`,
    `  destination["${destinationLabel}"]`,
    '  tbc_audio["Audio path TBC"]',
    '  tbc_control["Control path TBC"]',
    '  tbc_network["Network path TBC"]',
    "  source --> product",
    "  product --> destination",
    "  product -.-> tbc_audio",
    "  product -.-> tbc_control",
    "  product -.-> tbc_network",
    checkLines,
  ].filter(Boolean).join("\n");

  return {
    diagramType,
    title: `${productHandoff.sku} product schematic`,
    summary: productHandoff.headline || productHandoff.summary || "Product connection view from Product Workspace handoff.",
    sourceLabel: "Product Workspace",
    mermaid,
    blockers: checks,
    assumptions: [
      "This schematic is product-led. Use Discovery or Projects to add full room context.",
      "TBC blocks should remain visible until the source, destination, audio, network and control paths are confirmed.",
      productHandoff.purpose || "Confirm product purpose before customer issue.",
    ].filter(Boolean),
    stats: [
      { label: "Product", value: productHandoff.sku },
      { label: "Context", value: "Product handoff" },
      { label: "Open checks", value: String(checks.length) },
    ],
  };
}

function buildTbcDiagram(diagramType: DiagramTypeId): DiagramGenerationResult {
  return {
    diagramType,
    title: "TBC schematic scaffold",
    summary: "Start here when no active project or product handoff exists. Replace TBC blocks as Discovery, Product Finder and Product Workspace add real context.",
    sourceLabel: "TBC scaffold",
    mermaid: [
      "flowchart LR",
      '  source["Source / input TBC"]',
      '  wyrestorm["WyreStorm product path TBC"]',
      '  destination["Display / destination TBC"]',
      '  usb["USB devices / host TBC"]',
      '  audio["Audio path TBC"]',
      '  network["Network / control TBC"]',
      "  source --> wyrestorm",
      "  wyrestorm --> destination",
      "  usb -.-> wyrestorm",
      "  audio -.-> wyrestorm",
      "  network -.-> wyrestorm",
    ].join("\n"),
    blockers: [
      "No project or product handoff selected.",
      "Confirm source count, display count, USB, audio, control, network and distance.",
    ],
    assumptions: [
      "Use this scaffold only as a starting point.",
      "Do not issue as a final design until real products and room context are added.",
    ],
    stats: [
      { label: "Products", value: "TBC" },
      { label: "Sources", value: "TBC" },
      { label: "Blockers", value: "2" },
    ],
  };
}

export function VisualDesignStudioPage() {
  const { projects, activeProjectId, activeProject } = useProjectStore();
  const [productHandoff, setProductHandoff] = useState<ProductWorkspaceHandoff | null>(() => readProductWorkspaceHandoff());
  const [diagramType, setDiagramType] = useState<DiagramTypeId>("signal-flow");
  const [selectedSourceId, setSelectedSourceId] = useState<SchematicSourceId>(() => {
    if (activeProjectId) return "active";
    if (readProductWorkspaceHandoff()) return "product-workspace";
    if (projects[0]?.id) return projects[0].id;
    return "tbc";
  });

  useEffect(() => {
    const syncProductHandoff = () => {
      const next = readProductWorkspaceHandoff();
      setProductHandoff(next);

      if (next && selectedSourceId === "tbc") {
        setSelectedSourceId("product-workspace");
      }
    };

    window.addEventListener("storage", syncProductHandoff);
    window.addEventListener("wingman:product-workspace-handoff-updated", syncProductHandoff);

    return () => {
      window.removeEventListener("storage", syncProductHandoff);
      window.removeEventListener("wingman:product-workspace-handoff-updated", syncProductHandoff);
    };
  }, [selectedSourceId]);

  const selectedProject = useMemo(() => {
    if (selectedSourceId === "active") return activeProject;
    if (selectedSourceId === "product-workspace" || selectedSourceId === "tbc") return null;
    return projects.find((project) => project.id === selectedSourceId) ?? null;
  }, [activeProject, projects, selectedSourceId]);

  const generated = useMemo(() => {
    if (selectedSourceId === "product-workspace" && productHandoff) {
      return buildProductHandoffDiagram(productHandoff, diagramType);
    }

    if (selectedSourceId === "tbc") {
      return buildTbcDiagram(diagramType);
    }

    return generateDiagram({ diagramType, project: selectedProject });
  }, [diagramType, productHandoff, selectedProject, selectedSourceId]);

  useEffect(() => {
    writeSchematicWorkspaceHandoff({
      title: generated.title,
      summary: generated.summary,
      sourceLabel: generated.sourceLabel,
      mermaid: generated.mermaid,
      blockers: generated.blockers,
      assumptions: generated.assumptions,
      stats: generated.stats,
      productSku: productHandoff?.sku,
      visualPrompt: productHandoff?.visualPrompt,
    });
  }, [generated, productHandoff]);
  const activeTemplate = diagramTemplateFor(diagramType);
  const coverage = selectedSourceId === "product-workspace" ? productCoverage(productHandoff) : projectCoverage(selectedProject);

  return (
    <main className="wm-visual-design-page" data-wingman-schematic-builder="true">
      <PageHero
        eyebrow="Schematic Builder"
        title="Create an end-to-end AV schematic with WyreStorm devices and TBC products."
        purpose="Use this to visualise how the complete system connects: customer sources, WyreStorm products, displays, USB devices, audio, control, network and any unknown products that still need specifying."
        nextMove="Choose the source data, pick a schematic purpose, then use the blockers as the next customer questions before the response pack is issued."
        actions={[
          { label: "Open Product Workspace", to: routeCatalogByKey.productPitch.path },
          { label: "Open Response Pack", to: routeCatalogByKey.responsePack.path, variant: "secondary" },
        ]}
      />

      <section className="wm-diagram-studio-shell">
        <aside className="wm-diagram-control-panel">
          <section className="wm-diagram-card">
            <div className="wm-diagram-card-head">
              <Database className="h-4 w-4" />
              <div>
                <p>1. Choose source data</p>
                <span>Use an active project, product handoff or TBC scaffold.</span>
              </div>
            </div>

            <label className="wm-diagram-select-label">
              Schematic source
              <select value={selectedSourceId} onChange={(event) => setSelectedSourceId(event.target.value)}>
                {activeProject ? <option value="active">Active project - {activeProject.name}</option> : null}
                {productHandoff ? <option value="product-workspace">Product Workspace - {productHandoff.sku}</option> : null}
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {projectLabel(project)}
                  </option>
                ))}
                <option value="tbc">TBC scaffold - build from missing information</option>
              </select>
            </label>

            <div className="wm-diagram-coverage-grid">
              {coverage.map((item) => (
                <div key={item.label} data-ready={item.ready ? "true" : "false"}>
                  {item.ready ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="wm-diagram-card">
            <div className="wm-diagram-card-head">
              <Workflow className="h-4 w-4" />
              <div>
                <p>2. Choose schematic purpose</p>
                <span>Start from what the salesperson needs to explain.</span>
              </div>
            </div>

            <div className="wm-diagram-template-list">
              {DIAGRAM_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={diagramType === template.id ? "is-active" : ""}
                  onClick={() => setDiagramType(template.id)}
                >
                  <strong>{template.shortTitle}</strong>
                  <span>{template.description}</span>
                </button>
              ))}
            </div>
          </section>

          {productHandoff ? (
            <section className="wm-diagram-card">
              <div className="wm-diagram-card-head">
                <Clipboard className="h-4 w-4" />
                <div>
                  <p>Product visual context</p>
                  <span>Stored from Product Workspace.</span>
                </div>
              </div>

              <div>
                <strong>{productHandoff.sku}</strong>
                <p>{productHandoff.headline}</p>
              </div>

              <div className="wm-visual-context-pill">
                <Camera className="h-4 w-4" />
                <span>{productHandoff.visualPrompt ? "Room visual brief loaded" : "Product context loaded"}</span>
              </div>
            </section>
          ) : null}

          <section className="wm-diagram-card wm-diagram-next-action">
            <div className="wm-diagram-card-head">
                <Clipboard className="h-4 w-4" />
                <div>
                  <p>3. Output</p>
                  <span>Generate the schematic and deployment visual directly on this page.</span>
                </div>
              </div>

            <div>
              <strong>{activeTemplate.title}</strong>
              <p>{activeTemplate.bestFor}</p>
            </div>

            <Link className="wm-button-secondary" to={routeCatalogByKey.responsePack.path}>
              Add schematic to response pack
            </Link>
          </section>
        </aside>

        <section className="wm-generated-output-stack">
          <PortSchematicPanel result={generated} productHandoff={productHandoff} />
          <NativeSchematicCanvas result={generated} />
          <DeploymentVisualPanel result={generated} productHandoff={productHandoff} project={selectedProject} />
          <SchematicReviewPanel result={generated} />
        </section>
      </section>
    </main>
  );
}

export default VisualDesignStudioPage;
