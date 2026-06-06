import type {
  StoredCompareRun,
  StoredProductSelection,
  StoredProject,
  StoredProposalBomRow,
  StoredGovernedDependency,
} from "../data/projectStore";
import {
  buildMermaidBlockerList,
  buildMermaidFlowchart,
  mermaidEdge,
  mermaidNode,
  toMermaidId,
  type MermaidEdge,
  type MermaidNode,
} from "./diagramMermaid";

export type DiagramTypeId =
  | "signal-flow"
  | "networkhd-topology"
  | "usb-conferencing"
  | "video-wall-decision"
  | "competitor-map"
  | "product-family-tree"
  | "proposal-overview"
  | "room-wiring-schematic"
  | "product-connection-view";

export type DiagramTemplate = {
  id: DiagramTypeId;
  title: string;
  shortTitle: string;
  description: string;
  bestFor: string;
};

export type DiagramGenerationInput = {
  diagramType: DiagramTypeId;
  project?: StoredProject | null;
};

export type DiagramGenerationResult = {
  diagramType: DiagramTypeId;
  title: string;
  summary: string;
  sourceLabel: string;
  mermaid: string;
  blockers: string[];
  assumptions: string[];
  stats: Array<{ label: string; value: string }>;
};

type DiagramProduct = {
  sku: string;
  title: string;
  family: string;
  role: string;
  source: string;
};

const DEFAULT_SOURCES = ["Laptop", "Room source", "Media player"];
const DEFAULT_DISPLAYS = ["Primary display", "Secondary display"];

export const DIAGRAM_TEMPLATES: DiagramTemplate[] = [
  {
    id: "signal-flow",
    title: "AV signal flow",
    shortTitle: "Signal flow",
    description: "Show sources, switching or transport, WyreStorm products, displays and quote blockers.",
    bestFor: "Early customer explanation, internal handoff and proposal visuals.",
  },
  {
    id: "networkhd-topology",
    title: "NetworkHD topology",
    shortTitle: "NetworkHD",
    description: "Show encoder, network switch, NHD-CTL-PRO control and decoder/display structure.",
    bestFor: "AV-over-IP opportunities where topology and network ownership need to be clear.",
  },
  {
    id: "usb-conferencing",
    title: "USB / conferencing ownership",
    shortTitle: "USB / UC",
    description: "Show who owns USB devices, host switching, room PC/BYOD paths and validation blockers.",
    bestFor: "BYOD, BYOM, Teams, Zoom, camera, speakerphone and touch-display discussions.",
  },
  {
    id: "video-wall-decision",
    title: "Video wall decision path",
    shortTitle: "Video wall",
    description: "Compare fixed wall processors with NetworkHD / AVoIP routes and show missing sizing data.",
    bestFor: "LED, LCD, signage, lobby, command-space and hospitality wall conversations.",
  },
  {
    id: "competitor-map",
    title: "Competitor comparison map",
    shortTitle: "Competitor map",
    description: "Map the competitor request to the customer requirement, WyreStorm candidate, evidence and cautions.",
    bestFor: "Tender equivalence, replacement and quote comparison conversations.",
  },
  {
    id: "product-family-tree",
    title: "Product family decision tree",
    shortTitle: "Family tree",
    description: "Guide the sales user toward extender, matrix, NetworkHD, USB/UC or video wall families.",
    bestFor: "Explaining product direction before a specific SKU is safe to quote.",
  },
  {
    id: "proposal-overview",
    title: "Proposal system overview",
    shortTitle: "Proposal overview",
    description: "Summarise the proposed system, selected WyreStorm products, dependencies and validation notes.",
    bestFor: "Customer-safe proposal diagrams and internal review before issue.",
  },
  {
    id: "room-wiring-schematic",
    title: "Room wiring schematic",
    shortTitle: "Room wiring",
    description: "Show table, lectern, rack, display wall, network and WyreStorm device locations with signal types.",
    bestFor: "Helping sales users explain what sits where in a real room before engineering review.",
  },
  {
    id: "product-connection-view",
    title: "Product connection / port view",
    shortTitle: "Product ports",
    description: "Show the selected SKU as a device block with likely input, output, USB, network, audio and control paths.",
    bestFor: "Product education, call coaching, and making front/back device imagery more useful once assets are ingested.",
  },
];

function asText(value: unknown) {
  return String(value ?? "").trim();
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value.map(asText).filter(Boolean) : [];
}

function uniq(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function firstNonEmpty(values: unknown[], fallback = "") {
  for (const value of values) {
    const text = asText(value);
    if (text) return text;
  }

  return fallback;
}

function recordValue(record: Record<string, unknown> | undefined, keys: string[], fallback = "") {
  if (!record) return fallback;
  return firstNonEmpty(keys.map((key) => record[key]), fallback);
}

function stringifyProject(project?: StoredProject | null) {
  if (!project) return "";

  return [
    project.name,
    project.stage,
    JSON.stringify(project.discoveryBrief ?? {}),
    JSON.stringify(project.requirements ?? []),
    JSON.stringify(project.productSelections ?? []),
    JSON.stringify(project.compareRuns ?? []),
    JSON.stringify(project.proposal ?? {}),
    JSON.stringify(project.ingest ?? {}),
  ].join(" ").toLowerCase();
}

function projectRoomLabel(project?: StoredProject | null) {
  const roomModel = project?.discoveryBrief?.roomModel;
  const customer = recordValue(roomModel, ["customer", "customerName", "companyName"]);
  const room = recordValue(roomModel, ["roomType", "room", "spaceType"], project?.name ?? "Customer system");

  return customer ? `${customer} ${room}` : room;
}

function projectSummary(project?: StoredProject | null) {
  return firstNonEmpty(
    [
      project?.proposal?.summary,
      project?.discoveryBrief?.inference?.summary,
      project?.workflow?.lastStep,
      project?.ingest?.requirements?.[0],
      project?.name,
    ],
    "No active project data selected yet.",
  );
}

function collectRequirements(project?: StoredProject | null) {
  if (!project) return [];

  return uniq([
    ...(project.requirements ?? []).map((requirement) => `${requirement.label}: ${requirement.value}`),
    ...asArray(project.ingest?.requirements),
    ...asArray(project.proposal?.sections),
    ...asArray(project.proposal?.validationNotes),
    ...asArray(project.proposal?.assumptions),
  ]).slice(0, 10);
}

function productFromSelection(selection: StoredProductSelection, source: string): DiagramProduct | null {
  if (!selection.sku) return null;

  return {
    sku: selection.sku,
    title: selection.title || selection.sku,
    family: selection.family || selection.category || "WyreStorm",
    role: selection.category || selection.family || "Selected product",
    source,
  };
}

function productFromBom(row: StoredProposalBomRow): DiagramProduct | null {
  if (!row.sku || row.sku === "TBC") return null;

  return {
    sku: row.sku,
    title: row.description || row.sku,
    family: row.type || "Proposal BOM",
    role: row.role || "BOM item",
    source: "Proposal BOM",
  };
}

function productFromDependency(dependency: StoredGovernedDependency): DiagramProduct | null {
  if (!dependency.sku || dependency.sku === "TBC") return null;

  return {
    sku: dependency.sku,
    title: dependency.label || dependency.sku,
    family: dependency.type || "Dependency",
    role: dependency.role || "Dependency",
    source: "Governed dependency",
  };
}

function collectProducts(project?: StoredProject | null) {
  const products: DiagramProduct[] = [];

  project?.productSelections?.forEach((selection) => {
    const product = productFromSelection(selection, "Product Finder");
    if (product) products.push(product);
  });

  project?.proposal?.products?.forEach((selection) => {
    const product = productFromSelection(selection, "Proposal");
    if (product) products.push(product);
  });

  project?.proposal?.bomRows?.forEach((row) => {
    const product = productFromBom(row);
    if (product) products.push(product);
  });

  project?.proposal?.governedDependencies?.forEach((dependency) => {
    const product = productFromDependency(dependency);
    if (product) products.push(product);
  });

  const bySku = new Map<string, DiagramProduct>();
  products.forEach((product) => {
    if (!bySku.has(product.sku)) {
      bySku.set(product.sku, product);
    }
  });

  return Array.from(bySku.values()).slice(0, 12);
}

function collectCompareRuns(project?: StoredProject | null) {
  return (project?.compareRuns ?? []).slice(0, 5);
}

function projectHas(project: StoredProject | null | undefined, terms: string[]) {
  const text = stringifyProject(project);
  return terms.some((term) => text.includes(term.toLowerCase()));
}

function hasNetworkHd(project?: StoredProject | null, products = collectProducts(project)) {
  return (
    products.some((product) => product.sku.toUpperCase().startsWith("NHD") || /networkhd|av over ip|avoip/i.test(`${product.family} ${product.title} ${product.role}`)) ||
    projectHas(project, ["networkhd", "av over ip", "avoip", "encoder", "decoder"])
  );
}

function hasUsbNeed(project?: StoredProject | null, products = collectProducts(project)) {
  return (
    products.some((product) => /usb|uc|byod|byom|conference|camera|kvm/i.test(`${product.sku} ${product.title} ${product.family} ${product.role}`)) ||
    projectHas(project, ["usb", "usb-c", "byod", "byom", "teams", "zoom", "camera", "speakerphone", "microphone", "touch", "kvm"])
  );
}

function hasVideoWallNeed(project?: StoredProject | null, products = collectProducts(project)) {
  return (
    products.some((product) => /video wall|videowall|multiview|sw-0206-vw|sw-0204-vw|nhd-0401-mv/i.test(`${product.sku} ${product.title} ${product.family} ${product.role}`)) ||
    projectHas(project, ["video wall", "videowall", "led wall", "lcd wall", "multiview", "signage wall"])
  );
}

function sourcesFromProject(project?: StoredProject | null) {
  const roomModel = project?.discoveryBrief?.roomModel;
  const sourceText = recordValue(roomModel, ["sources", "sourceCount", "inputCount", "inputs"]);
  if (sourceText) return [sourceText];

  const text = stringifyProject(project);
  const sources = [
    text.includes("laptop") ? "Laptop" : "",
    text.includes("media player") || text.includes("signage") ? "Media player / signage source" : "",
    text.includes("camera") ? "Camera source" : "",
    text.includes("room pc") || text.includes("teams") ? "Room PC / UC host" : "",
  ];

  return uniq(sources).slice(0, 4);
}

function displaysFromProject(project?: StoredProject | null) {
  const roomModel = project?.discoveryBrief?.roomModel;
  const displayText = recordValue(roomModel, ["displayCount", "displays", "outputs", "outputCount"]);
  if (displayText) return [displayText];

  const text = stringifyProject(project);
  const displays = [
    text.includes("video wall") || text.includes("led wall") ? "Video wall / display canvas" : "",
    text.includes("dual") || text.includes("two display") ? "Dual displays" : "",
    text.includes("projector") ? "Projector" : "",
    "Primary display",
  ];

  return uniq(displays).slice(0, 4);
}

function validationBlockers(project: StoredProject | null | undefined, diagramType: DiagramTypeId, products = collectProducts(project)) {
  const blockers: string[] = [];
  const requirements = collectRequirements(project);

  if (!project) {
    blockers.push("Select or create a project to replace sample assumptions with real discovery data.");
  }

  if (!requirements.length && !project?.discoveryBrief && !project?.ingest) {
    blockers.push("Discovery requirements are not confirmed.");
  }

  if ((diagramType === "signal-flow" || diagramType === "proposal-overview") && !products.length) {
    blockers.push("No WyreStorm products have been selected yet.");
  }

  if (diagramType === "networkhd-topology" && !hasNetworkHd(project, products)) {
    blockers.push("NetworkHD / AVoIP has not been confirmed as the selected architecture.");
  }

  if (diagramType === "usb-conferencing" && !hasUsbNeed(project, products)) {
    blockers.push("USB, camera, room PC, BYOD or conferencing ownership is not confirmed.");
  }

  if (diagramType === "video-wall-decision" && !hasVideoWallNeed(project, products)) {
    blockers.push("Video wall size, behaviour or processor path is not confirmed.");
  }

  if (diagramType === "competitor-map" && !collectCompareRuns(project).length) {
    blockers.push("No competitor comparison run is saved to this project.");
  }

  project?.proposal?.validationNotes?.forEach((note) => blockers.push(note));
  project?.proposal?.governanceWarnings?.forEach((warning) => blockers.push(warning));
  project?.productSelections?.flatMap((selection) => selection.cautions ?? []).forEach((caution) => blockers.push(caution));

  return uniq(blockers).slice(0, 8);
}

function assumptionsFor(project: StoredProject | null | undefined, diagramType: DiagramTypeId) {
  const assumptions = [
    "Diagram is for sales explanation and review, not an installation drawing.",
    "Product capability must be validated before quote or customer issue.",
  ];

  if (!project) {
    assumptions.push("Sample source and display labels are placeholders.");
  }

  if (diagramType === "networkhd-topology") {
    assumptions.push("NHD-CTL-PRO is shown as the NetworkHD control layer when NetworkHD is selected.");
  }

  if (diagramType === "video-wall-decision") {
    assumptions.push("SW-0206-VW and SW-0204-VW are considered alongside NetworkHD / AVoIP options before product selection.");
  }

  if (diagramType === "usb-conferencing") {
    assumptions.push("USB ownership is shown separately from the video path so conferencing devices are not treated as simple display transport.");
  }

  if (diagramType === "room-wiring-schematic") {
    assumptions.push("Room wiring is a concept schematic; final cable routes, distances and installation details need technical review.");
  }

  if (diagramType === "product-connection-view") {
    assumptions.push("Port labels are inferred from Wingman product intelligence until verified front/back product imagery is attached.");
  }

  return assumptions;
}

function blockerNodes(blockers: string[]) {
  return buildMermaidBlockerList(blockers);
}

function productNodes(products: DiagramProduct[], fallbackLabel: string) {
  if (!products.length) {
    return [mermaidNode("product_tbc", fallbackLabel, "rect", "blocker")];
  }

  return products.slice(0, 6).map((product) => mermaidNode(product.sku, `${product.sku} - ${product.role}`, "rect", "wyrestorm"));
}

function buildSignalFlow(project?: StoredProject | null): DiagramGenerationResult {
  const products = collectProducts(project);
  const blockers = validationBlockers(project, "signal-flow", products);
  const sources = sourcesFromProject(project);
  const displays = displaysFromProject(project);
  const sourceLabels = sources.length ? sources : DEFAULT_SOURCES.slice(0, 2);
  const displayLabels = displays.length ? displays : DEFAULT_DISPLAYS;
  const sourceNodes = sourceLabels.map((source, index) =>
    mermaidNode(`source_${index + 1}`, source || DEFAULT_SOURCES[index] || "Source", "rect", sources.length ? undefined : "blocker"),
  );
  const displayNodes = displayLabels.map((display, index) =>
    mermaidNode(`display_${index + 1}`, display || DEFAULT_DISPLAYS[index] || "Display", "rect", displays.length ? undefined : "blocker"),
  );
  const selectedProductNodes = productNodes(products, "WyreStorm product path not selected");
  const nodes: MermaidNode[] = [
    mermaidNode("customer_need", projectRoomLabel(project), "round", "customer"),
    ...sourceNodes,
    mermaidNode("signal_path", "Switching / transport path to validate", "diamond", products.length ? "option" : "blocker"),
    ...selectedProductNodes,
    ...displayNodes,
    ...blockerNodes(blockers),
  ];
  const edges: MermaidEdge[] = [
    ...sourceLabels.map((_, index) => mermaidEdge(`source_${index + 1}`, "signal_path", "source")),
    ...selectedProductNodes.map((node) => mermaidEdge("signal_path", node.id, "WyreStorm path")),
    ...selectedProductNodes.flatMap((node) =>
      displayLabels.slice(0, 3).map((_, index) => mermaidEdge(node.id, `display_${index + 1}`, "output")),
    ),
    ...blockers.map((_, index) => mermaidEdge("signal_path", `blocker_${index + 1}`, "validate", "dotted")),
  ];

  return {
    diagramType: "signal-flow",
    title: "AV signal flow",
    summary: "Source-to-display view with WyreStorm path and visible blockers.",
    sourceLabel: project?.name ?? "Sample opportunity",
    mermaid: buildMermaidFlowchart({ title: "AV signal flow", direction: "LR", nodes, edges }),
    blockers,
    assumptions: assumptionsFor(project, "signal-flow"),
    stats: [
      { label: "Products", value: String(products.length) },
      { label: "Sources", value: String(sources.length || DEFAULT_SOURCES.length) },
      { label: "Blockers", value: String(blockers.length) },
    ],
  };
}

function buildNetworkHd(project?: StoredProject | null): DiagramGenerationResult {
  const products = collectProducts(project);
  const blockers = validationBlockers(project, "networkhd-topology", products);
  const networkProducts = products.filter((product) => product.sku.toUpperCase().startsWith("NHD") || /networkhd|av over ip|avoip/i.test(`${product.title} ${product.family} ${product.role}`));
  const encoders = networkProducts.filter((product) => /tx|encoder/i.test(`${product.sku} ${product.title} ${product.role}`));
  const decoders = networkProducts.filter((product) => /rx|decoder|mv/i.test(`${product.sku} ${product.title} ${product.role}`));
  const nodes: MermaidNode[] = [
    mermaidNode("sources", "Sources / inputs", "rect", "customer"),
    ...(encoders.length ? encoders : [{ sku: "NHD-TX-TBC", role: "NetworkHD encoder to validate", title: "Encoder", family: "NetworkHD", source: "Assumption" }]).slice(0, 4).map((product) => mermaidNode(product.sku, `${product.sku} - encoder path`, "rect", product.sku.includes("TBC") ? "blocker" : "wyrestorm")),
    mermaidNode("av_network", "Managed AV network switch", "subroutine", "option"),
    mermaidNode("nhd_ctl_pro", "NHD-CTL-PRO - NetworkHD control layer", "rect", "wyrestorm"),
    ...(decoders.length ? decoders : [{ sku: "NHD-RX-TBC", role: "NetworkHD decoder to validate", title: "Decoder", family: "NetworkHD", source: "Assumption" }]).slice(0, 4).map((product) => mermaidNode(product.sku, `${product.sku} - decoder / display path`, "rect", product.sku.includes("TBC") ? "blocker" : "wyrestorm")),
    mermaidNode("displays", "Displays / video wall / destinations", "rect", "customer"),
    ...blockerNodes(blockers),
  ];
  const encoderIds = (encoders.length ? encoders : [{ sku: "NHD-TX-TBC" }]).slice(0, 4).map((product) => product.sku);
  const decoderIds = (decoders.length ? decoders : [{ sku: "NHD-RX-TBC" }]).slice(0, 4).map((product) => product.sku);
  const edges: MermaidEdge[] = [
    ...encoderIds.map((sku) => mermaidEdge("sources", sku, "HDMI / source feed")),
    ...encoderIds.map((sku) => mermaidEdge(sku, "av_network", "AV stream")),
    mermaidEdge("nhd_ctl_pro", "av_network", "routing control", "dotted"),
    ...decoderIds.map((sku) => mermaidEdge("av_network", sku, "AV stream")),
    ...decoderIds.map((sku) => mermaidEdge(sku, "displays", "HDMI output")),
    ...blockers.map((_, index) => mermaidEdge("av_network", `blocker_${index + 1}`, "network validation", "dotted")),
  ];

  return {
    diagramType: "networkhd-topology",
    title: "NetworkHD topology",
    summary: "NetworkHD encoder, AV network, NHD-CTL-PRO and decoder/display structure.",
    sourceLabel: project?.name ?? "Sample NetworkHD topology",
    mermaid: buildMermaidFlowchart({ title: "NetworkHD topology", direction: "LR", nodes, edges }),
    blockers,
    assumptions: assumptionsFor(project, "networkhd-topology"),
    stats: [
      { label: "NHD products", value: String(networkProducts.length) },
      { label: "Control", value: "NHD-CTL-PRO" },
      { label: "Blockers", value: String(blockers.length) },
    ],
  };
}

function buildUsbConferencing(project?: StoredProject | null): DiagramGenerationResult {
  const products = collectProducts(project);
  const blockers = validationBlockers(project, "usb-conferencing", products);
  const usbProducts = products.filter((product) => /usb|uc|byod|byom|kvm|camera|conference/i.test(`${product.sku} ${product.title} ${product.family} ${product.role}`));
  const selectedUsbPath = usbProducts[0];
  const nodes: MermaidNode[] = [
    mermaidNode("user_laptop", "BYOD laptop / user host", "rect", "customer"),
    mermaidNode("room_pc", "Room PC / fixed UC host if present", "rect", "customer"),
    mermaidNode("usb_owner", selectedUsbPath ? `${selectedUsbPath.sku} - USB-aware switching / extension` : "USB ownership to validate", "diamond", selectedUsbPath ? "wyrestorm" : "blocker"),
    mermaidNode("room_devices", "Camera / microphone / speakerphone / touch devices", "rect", "customer"),
    mermaidNode("video_path", "Video transport path: HDMI, HDBaseT or AVoIP as qualified", "rect", "option"),
    mermaidNode("display", "Room display(s)", "rect", "customer"),
    ...blockerNodes(blockers),
  ];
  const edges: MermaidEdge[] = [
    mermaidEdge("user_laptop", "usb_owner", "USB host when BYOD"),
    mermaidEdge("room_pc", "usb_owner", "USB host when fixed room"),
    mermaidEdge("usb_owner", "room_devices", "USB devices follow active host"),
    mermaidEdge("user_laptop", "video_path", "presentation / meeting video"),
    mermaidEdge("room_pc", "video_path", "room meeting video"),
    mermaidEdge("video_path", "display", "display output"),
    ...blockers.map((_, index) => mermaidEdge("usb_owner", `blocker_${index + 1}`, "do not quote until clear", "dotted")),
  ];

  return {
    diagramType: "usb-conferencing",
    title: "USB / conferencing ownership",
    summary: "Separates USB ownership from video transport so conferencing paths stay honest.",
    sourceLabel: project?.name ?? "Sample USB / UC workflow",
    mermaid: buildMermaidFlowchart({ title: "USB conferencing ownership", direction: "LR", nodes, edges }),
    blockers,
    assumptions: assumptionsFor(project, "usb-conferencing"),
    stats: [
      { label: "USB products", value: String(usbProducts.length) },
      { label: "USB owner", value: selectedUsbPath?.sku ?? "TBC" },
      { label: "Blockers", value: String(blockers.length) },
    ],
  };
}

function buildVideoWallDecision(project?: StoredProject | null): DiagramGenerationResult {
  const products = collectProducts(project);
  const blockers = validationBlockers(project, "video-wall-decision", products);
  const hasNetwork = hasNetworkHd(project, products);
  const nodes: MermaidNode[] = [
    mermaidNode("wall_need", "Video wall / signage requirement", "round", "customer"),
    mermaidNode("fixed_or_flexible", "Fixed wall behaviour or flexible routing?", "diamond", "option"),
    mermaidNode("sw_0204_vw", "SW-0204-VW - compact fixed video wall option to consider", "rect", "wyrestorm"),
    mermaidNode("sw_0206_vw", "SW-0206-VW - larger fixed video wall option to consider", "rect", "wyrestorm"),
    mermaidNode("networkhd_option", hasNetwork ? "NetworkHD / AVoIP option selected or indicated" : "NetworkHD / AVoIP option to compare", "rect", hasNetwork ? "wyrestorm" : "option"),
    mermaidNode("wall_output", "Wall layout / displays / canvas", "rect", "customer"),
    ...blockerNodes(blockers),
  ];
  const edges: MermaidEdge[] = [
    mermaidEdge("wall_need", "fixed_or_flexible", "qualify behaviour"),
    mermaidEdge("fixed_or_flexible", "sw_0204_vw", "fixed smaller wall"),
    mermaidEdge("fixed_or_flexible", "sw_0206_vw", "fixed larger wall"),
    mermaidEdge("fixed_or_flexible", "networkhd_option", "routed / expandable / multi-room"),
    mermaidEdge("sw_0204_vw", "wall_output", "processor output"),
    mermaidEdge("sw_0206_vw", "wall_output", "processor output"),
    mermaidEdge("networkhd_option", "wall_output", "AVoIP endpoints / processing"),
    ...blockers.map((_, index) => mermaidEdge("fixed_or_flexible", `blocker_${index + 1}`, "validate before choosing", "dotted")),
  ];

  return {
    diagramType: "video-wall-decision",
    title: "Video wall decision path",
    summary: "Compares SW-0206-VW, SW-0204-VW and NetworkHD / AVoIP before locking a wall architecture.",
    sourceLabel: project?.name ?? "Sample wall opportunity",
    mermaid: buildMermaidFlowchart({ title: "Video wall decision path", direction: "TD", nodes, edges }),
    blockers,
    assumptions: assumptionsFor(project, "video-wall-decision"),
    stats: [
      { label: "Wall signal", value: hasVideoWallNeed(project, products) ? "Indicated" : "TBC" },
      { label: "AVoIP option", value: hasNetwork ? "Included" : "Compare" },
      { label: "Blockers", value: String(blockers.length) },
    ],
  };
}

function compareLabel(run: StoredCompareRun | undefined) {
  if (!run) return "Competitor product not selected";
  return [run.competitorBrand, run.competitorSku || run.competitorName].filter(Boolean).join(" ") || "Competitor product";
}

function buildCompetitorMap(project?: StoredProject | null): DiagramGenerationResult {
  const products = collectProducts(project);
  const compareRuns = collectCompareRuns(project);
  const run = compareRuns[0];
  const blockers = validationBlockers(project, "competitor-map", products);
  const wyrestormLabel = run?.wyrestormSku
    ? `${run.wyrestormSku} - ${run.wyrestormTitle || "WyreStorm candidate"}`
    : products[0]
      ? `${products[0].sku} - ${products[0].title}`
      : "WyreStorm candidate not confirmed";
  const nodes: MermaidNode[] = [
    mermaidNode("competitor", compareLabel(run), "rect", run ? "customer" : "blocker"),
    mermaidNode("requirement", run?.summary || projectSummary(project), "rect", "option"),
    mermaidNode("wyrestorm", wyrestormLabel, "rect", run?.wyrestormSku || products.length ? "wyrestorm" : "blocker"),
    mermaidNode("evidence", (run?.evidence ?? products[0]?.source ? [products[0]?.source] : []).filter(Boolean).slice(0, 3).join(" | ") || "Evidence to validate", "rect", "option"),
    mermaidNode("risk", (run?.warnings ?? []).slice(0, 3).join(" | ") || "Risks and assumptions visible before quote", "rect", blockers.length ? "blocker" : "option"),
    ...blockerNodes(blockers),
  ];
  const edges: MermaidEdge[] = [
    mermaidEdge("competitor", "requirement", "translate into need"),
    mermaidEdge("requirement", "wyrestorm", "candidate"),
    mermaidEdge("wyrestorm", "evidence", "fit evidence"),
    mermaidEdge("wyrestorm", "risk", "cautions"),
    ...blockers.map((_, index) => mermaidEdge("risk", `blocker_${index + 1}`, "quote blocker", "dotted")),
  ];

  return {
    diagramType: "competitor-map",
    title: "Competitor comparison map",
    summary: "Maps competitor request to requirement, WyreStorm candidate, evidence and risk.",
    sourceLabel: project?.name ?? "Sample competitor comparison",
    mermaid: buildMermaidFlowchart({ title: "Competitor comparison map", direction: "LR", nodes, edges }),
    blockers,
    assumptions: assumptionsFor(project, "competitor-map"),
    stats: [
      { label: "Compare runs", value: String(compareRuns.length) },
      { label: "WyreStorm candidate", value: run?.wyrestormSku || products[0]?.sku || "TBC" },
      { label: "Blockers", value: String(blockers.length) },
    ],
  };
}

function buildFamilyTree(project?: StoredProject | null): DiagramGenerationResult {
  const products = collectProducts(project);
  const blockers = validationBlockers(project, "product-family-tree", products);
  const nodes: MermaidNode[] = [
    mermaidNode("start", "What is the customer trying to achieve?", "round", "customer"),
    mermaidNode("one_to_one", "One source to one display over distance?", "diamond", "option"),
    mermaidNode("multi_io", "Multiple sources or displays?", "diamond", "option"),
    mermaidNode("network_scale", "Flexible routing or expansion?", "diamond", "option"),
    mermaidNode("usb_uc", "USB / BYOD / conferencing devices?", "diamond", hasUsbNeed(project, products) ? "wyrestorm" : "option"),
    mermaidNode("wall", "Video wall / multiview?", "diamond", hasVideoWallNeed(project, products) ? "wyrestorm" : "option"),
    mermaidNode("extender", "Extender / HDBaseT family", "rect", "wyrestorm"),
    mermaidNode("matrix", "Matrix / presentation switcher family", "rect", "wyrestorm"),
    mermaidNode("networkhd", "NetworkHD AV-over-IP family", "rect", hasNetworkHd(project, products) ? "wyrestorm" : "option"),
    mermaidNode("uc_family", "USB / UC / Apollo / presentation room path", "rect", "wyrestorm"),
    mermaidNode("wall_family", "SW-0206-VW / SW-0204-VW / NetworkHD wall path", "rect", "wyrestorm"),
    ...blockerNodes(blockers),
  ];
  const edges: MermaidEdge[] = [
    mermaidEdge("start", "one_to_one"),
    mermaidEdge("one_to_one", "extender", "yes"),
    mermaidEdge("one_to_one", "multi_io", "no / more complex"),
    mermaidEdge("multi_io", "matrix", "fixed I/O"),
    mermaidEdge("multi_io", "network_scale", "may expand"),
    mermaidEdge("network_scale", "networkhd", "yes"),
    mermaidEdge("network_scale", "usb_uc", "room workflow"),
    mermaidEdge("usb_uc", "uc_family", "yes"),
    mermaidEdge("usb_uc", "wall", "no / visual feature"),
    mermaidEdge("wall", "wall_family", "yes"),
    ...blockers.map((_, index) => mermaidEdge("start", `blocker_${index + 1}`, "missing info", "dotted")),
  ];

  return {
    diagramType: "product-family-tree",
    title: "Product family decision tree",
    summary: "Sales-friendly family routing before a SKU is safe to quote.",
    sourceLabel: project?.name ?? "General product family guidance",
    mermaid: buildMermaidFlowchart({ title: "Product family decision tree", direction: "TD", nodes, edges }),
    blockers,
    assumptions: assumptionsFor(project, "product-family-tree"),
    stats: [
      { label: "Selected products", value: String(products.length) },
      { label: "USB indicated", value: hasUsbNeed(project, products) ? "Yes" : "TBC" },
      { label: "Video wall", value: hasVideoWallNeed(project, products) ? "Yes" : "TBC" },
    ],
  };
}

function buildProposalOverview(project?: StoredProject | null): DiagramGenerationResult {
  const products = collectProducts(project);
  const blockers = validationBlockers(project, "proposal-overview", products);
  const proposal = project?.proposal;
  const productDiagramNodes = productNodes(products, "WyreStorm BOM path not selected");
  const dependencyNodes = (proposal?.governedDependencies ?? []).slice(0, 5).map((dependency) =>
    mermaidNode(`dep_${dependency.sku}_${dependency.id}`, `${dependency.sku} - ${dependency.role}: ${dependency.status}`, "rect", dependency.status === "required" ? "wyrestorm" : "option"),
  );
  const nodes: MermaidNode[] = [
    mermaidNode("project", projectRoomLabel(project), "round", "customer"),
    mermaidNode("outcome", proposal?.outputPurpose?.customerOutput || projectSummary(project), "rect", "customer"),
    mermaidNode("wyrestorm_core", "WyreStorm core recommendation", "subroutine", products.length ? "wyrestorm" : "blocker"),
    ...productDiagramNodes,
    ...dependencyNodes,
    mermaidNode("proposal", proposal?.title || "Proposal output to validate", "rect", proposal ? "option" : "blocker"),
    ...blockerNodes(blockers),
  ];
  const edges: MermaidEdge[] = [
    mermaidEdge("project", "outcome", "customer outcome"),
    mermaidEdge("outcome", "wyrestorm_core", "system direction"),
    ...productDiagramNodes.map((node) => mermaidEdge("wyrestorm_core", node.id, "selected")),
    ...dependencyNodes.map((node) => mermaidEdge("wyrestorm_core", node.id, "dependency")),
    mermaidEdge("wyrestorm_core", "proposal", "customer-safe output"),
    ...blockers.map((_, index) => mermaidEdge("proposal", `blocker_${index + 1}`, "hold / validate", "dotted")),
  ];

  return {
    diagramType: "proposal-overview",
    title: "Proposal system overview",
    summary: "Customer-safe system overview with products, dependencies and blockers visible.",
    sourceLabel: project?.name ?? "Sample proposal overview",
    mermaid: buildMermaidFlowchart({ title: "Proposal system overview", direction: "LR", nodes, edges }),
    blockers,
    assumptions: assumptionsFor(project, "proposal-overview"),
    stats: [
      { label: "Products", value: String(products.length) },
      { label: "Dependencies", value: String(proposal?.governedDependencies?.length ?? 0) },
      { label: "Blockers", value: String(blockers.length) },
    ],
  };
}

function buildRoomWiringSchematic(project?: StoredProject | null): DiagramGenerationResult {
  const products = collectProducts(project);
  const blockers = validationBlockers(project, "room-wiring-schematic", products);
  const sources = sourcesFromProject(project);
  const displays = displaysFromProject(project);
  const primaryProducts = products.slice(0, 4);
  const sourceLabel = sources.length ? sources.join(" / ") : "Table, lectern or room sources";
  const displayLabel = displays.length ? displays.join(" / ") : "Room display outputs";
  const hasNetwork = hasNetworkHd(project, products);
  const hasUsb = hasUsbNeed(project, products);
  const nodes: MermaidNode[] = [
    mermaidNode("users", "Room users / presenter", "round", "customer"),
    mermaidNode("table", sourceLabel, "rect", "customer"),
    mermaidNode("rack", "Rack / equipment location", "subroutine", primaryProducts.length ? "wyrestorm" : "blocker"),
    ...productNodes(primaryProducts, "WyreStorm devices to select"),
    mermaidNode("network", hasNetwork ? "AV network / managed switch" : "Network / LAN if required", "rect", hasNetwork ? "option" : undefined),
    mermaidNode("usb", hasUsb ? "USB devices and host ownership" : "USB path if required", "rect", hasUsb ? "option" : undefined),
    mermaidNode("control", "Control path / presets / third-party control", "rect", "option"),
    mermaidNode("display_wall", displayLabel, "rect", "customer"),
    ...blockerNodes(blockers),
  ];
  const productIds = primaryProducts.length ? primaryProducts.map((product) => product.sku) : ["product_tbc"];
  const edges: MermaidEdge[] = [
    mermaidEdge("users", "table", "connect / operate"),
    mermaidEdge("table", "rack", "HDMI / USB-C / USB / audio as qualified"),
    ...productIds.map((id) => mermaidEdge("rack", id, "installed device")),
    ...productIds.map((id) => mermaidEdge(id, "display_wall", "display output")),
    mermaidEdge("rack", "control", "control / API / RS-232 / IR"),
    mermaidEdge("rack", "network", hasNetwork ? "AV-over-IP / LAN" : "optional LAN"),
    mermaidEdge("table", "usb", hasUsb ? "USB host path" : "optional USB"),
    mermaidEdge("usb", "rack", "USB switching / extension", hasUsb ? "arrow" : "dotted"),
    ...blockers.map((_, index) => mermaidEdge("rack", `blocker_${index + 1}`, "validate", "dotted")),
  ];

  return {
    diagramType: "room-wiring-schematic",
    title: "Room wiring schematic",
    summary: "Location-based view of the room, device positions and signal types.",
    sourceLabel: project?.name ?? "Sample room wiring",
    mermaid: buildMermaidFlowchart({ title: "Room wiring schematic", direction: "LR", nodes, edges }),
    blockers,
    assumptions: assumptionsFor(project, "room-wiring-schematic"),
    stats: [
      { label: "Products", value: String(products.length) },
      { label: "Network path", value: hasNetwork ? "Shown" : "Optional" },
      { label: "USB path", value: hasUsb ? "Shown" : "Optional" },
    ],
  };
}

function buildProductConnectionView(project?: StoredProject | null): DiagramGenerationResult {
  const products = collectProducts(project);
  const product = products[0];
  const blockers = validationBlockers(project, "product-connection-view", products);
  const productText = `${product?.sku ?? ""} ${product?.title ?? ""} ${product?.family ?? ""} ${product?.role ?? ""}`.toLowerCase();
  const hasNetwork = /nhd|networkhd|avoip|av over ip|lan|network/.test(productText) || hasNetworkHd(project, products);
  const hasUsb = /usb|uc|byod|byom|kvm|camera/.test(productText) || hasUsbNeed(project, products);
  const hasAudio = /audio|dante|aes67|speaker|microphone|arc|earc/.test(productText) || projectHas(project, ["audio", "dante", "speaker", "microphone"]);
  const hasControl = /control|rs-232|rs232|ir|cec|api/.test(productText) || projectHas(project, ["control", "rs-232", "ir", "cec", "api"]);
  const productNode = product ? `${product.sku} - ${product.title}` : "Selected SKU / device front and rear view";
  const nodes: MermaidNode[] = [
    mermaidNode("input_side", "Input side: sources / hosts", "rect", "customer"),
    mermaidNode("device", productNode, "subroutine", product ? "wyrestorm" : "blocker"),
    mermaidNode("output_side", "Output side: display / receiver / downstream device", "rect", "customer"),
    mermaidNode("network_port", hasNetwork ? "LAN / AVoIP / control network" : "Network port if present", "rect", hasNetwork ? "option" : undefined),
    mermaidNode("usb_port", hasUsb ? "USB host / device ownership" : "USB ports if present", "rect", hasUsb ? "option" : undefined),
    mermaidNode("audio_port", hasAudio ? "Audio embed / de-embed / DSP path" : "Audio ports if present", "rect", hasAudio ? "option" : undefined),
    mermaidNode("control_port", hasControl ? "RS-232 / IR / CEC / API control" : "Control path if present", "rect", hasControl ? "option" : undefined),
    mermaidNode("image_need", "Attach front and rear product image when asset is available", "rect", "blocker"),
    ...blockerNodes(blockers),
  ];
  const edges: MermaidEdge[] = [
    mermaidEdge("input_side", "device", "input connection"),
    mermaidEdge("device", "output_side", "output connection"),
    mermaidEdge("device", "network_port", hasNetwork ? "RJ45 / fibre / LAN" : "verify"),
    mermaidEdge("device", "usb_port", hasUsb ? "USB" : "verify", hasUsb ? "arrow" : "dotted"),
    mermaidEdge("device", "audio_port", hasAudio ? "audio" : "verify", hasAudio ? "arrow" : "dotted"),
    mermaidEdge("device", "control_port", hasControl ? "control" : "verify", hasControl ? "arrow" : "dotted"),
    mermaidEdge("device", "image_need", "visual asset"),
    ...blockers.map((_, index) => mermaidEdge("device", `blocker_${index + 1}`, "quote check", "dotted")),
  ];

  return {
    diagramType: "product-connection-view",
    title: "Product connection / port view",
    summary: "Device-centred view that prepares Wingman for front/back product imagery and port-level coaching.",
    sourceLabel: product?.sku ?? project?.name ?? "Sample product connection",
    mermaid: buildMermaidFlowchart({ title: "Product connection view", direction: "LR", nodes, edges }),
    blockers,
    assumptions: assumptionsFor(project, "product-connection-view"),
    stats: [
      { label: "Product", value: product?.sku ?? "TBC" },
      { label: "USB", value: hasUsb ? "Likely" : "Verify" },
      { label: "Network", value: hasNetwork ? "Likely" : "Verify" },
    ],
  };
}

export function generateDiagram(input: DiagramGenerationInput): DiagramGenerationResult {
  switch (input.diagramType) {
    case "networkhd-topology":
      return buildNetworkHd(input.project);
    case "usb-conferencing":
      return buildUsbConferencing(input.project);
    case "video-wall-decision":
      return buildVideoWallDecision(input.project);
    case "competitor-map":
      return buildCompetitorMap(input.project);
    case "product-family-tree":
      return buildFamilyTree(input.project);
    case "proposal-overview":
      return buildProposalOverview(input.project);
    case "room-wiring-schematic":
      return buildRoomWiringSchematic(input.project);
    case "product-connection-view":
      return buildProductConnectionView(input.project);
    case "signal-flow":
    default:
      return buildSignalFlow(input.project);
  }
}

export function diagramTemplateFor(id: DiagramTypeId) {
  return DIAGRAM_TEMPLATES.find((template) => template.id === id) ?? DIAGRAM_TEMPLATES[0];
}

export function diagramTypeFromValue(value: string): DiagramTypeId {
  return DIAGRAM_TEMPLATES.some((template) => template.id === value)
    ? (value as DiagramTypeId)
    : "signal-flow";
}

export function mermaidFileName(result: DiagramGenerationResult) {
  return `${toMermaidId(result.sourceLabel).toLowerCase()}-${result.diagramType}.mmd`;
}
