import type { VisualDiagramEdge, VisualDiagramModel, VisualDiagramNode } from "./visualStudioTypes";

type UnknownRecord = Record<string, unknown>;

interface ProductConnectionFacts {
  sku: string;
  name: string;
  category: string;
  summary: string;
  matrixSize: string;
  matrixSizeEvidence: string;
  quoteSafety: string;
  officialProductUrl: string;
  transports: string[];
  connectors: string[];
  videoProcessing: string[];
  controlProtocols: string[];
  networkInterfaces: string[];
  audioSignals: string[];
}

function asRecord(value: unknown): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as UnknownRecord;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asString(item))
    .filter((item) => item.length > 0);
}

function summarize(values: string[], fallback: string): string {
  if (values.length === 0) {
    return fallback;
  }

  return values.slice(0, 3).join(" | ");
}

function factText(facts: ProductConnectionFacts): string {
  return [
    facts.sku,
    facts.name,
    facts.category,
    facts.summary,
    facts.matrixSize,
    facts.transports.join(" "),
    facts.connectors.join(" "),
    facts.videoProcessing.join(" "),
    facts.networkInterfaces.join(" "),
    facts.audioSignals.join(" "),
  ].join(" ").toLowerCase();
}

function hasAvoipTransport(facts: ProductConnectionFacts): boolean {
  return /^NHD-/i.test(facts.sku) || /\b(networkhd|av-?over-?ip|avoip|multicast|10g av|sdvoe)\b/i.test(factText(facts));
}

function hasNetworkAudio(facts: ProductConnectionFacts): boolean {
  return /\b(dante|aes67|network audio|audio network)\b/i.test(factText(facts));
}

function hasUsbTransport(facts: ProductConnectionFacts): boolean {
  return /\b(usb|uc|byom|byod|camera|ptz|video bar|webcam)\b/i.test(factText(facts));
}

function hasCameraUsbEndpoint(facts: ProductConnectionFacts): boolean {
  return /\b(camera|ptz|video bar|webcam)\b/i.test(factText(facts));
}

function sentenceCaseQuoteSafety(value: string): string {
  if (!value) {
    return "Verify before quote";
  }

  return value
    .split("-")
    .filter(Boolean)
    .map((part, index) => (index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}

export function findProductIntelligenceEntry(index: unknown, sku: string): UnknownRecord | null {
  const normalizedSku = sku.trim().toUpperCase();
  const root = asRecord(index);
  const products = Array.isArray(root.products) ? root.products : [];

  for (const product of products) {
    const record = asRecord(product);

    if (asString(record.sku).toUpperCase() === normalizedSku) {
      return record;
    }
  }

  return null;
}

function collectFacts(seedSku: string, product: UnknownRecord | null): ProductConnectionFacts {
  const technicalProfile = asRecord(product?.technicalProfile);
  const sourceQuality = asRecord(technicalProfile.sourceQuality);
  const video = asRecord(technicalProfile.video);
  const control = asRecord(technicalProfile.control);
  const network = asRecord(technicalProfile.network);
  const audio = asRecord(technicalProfile.audio);

  return {
    sku: asString(product?.sku) || seedSku,
    name: asString(product?.name) || seedSku,
    category: asString(product?.category) || "Selected WyreStorm product",
    summary:
      asString(product?.summary) ||
      asString(product?.description) ||
      "Product intelligence is not yet loaded, so this view stays in verify-before-quote mode.",
    matrixSize: asString(product?.matrixSize),
    matrixSizeEvidence: asString(product?.matrixSizeEvidence),
    quoteSafety: asString(product?.quoteSafety) || "verify-before-quote",
    officialProductUrl: asString(sourceQuality.officialProductUrl),
    transports: asStringList(technicalProfile.transports),
    connectors: asStringList(product?.connectors),
    videoProcessing: asStringList(video.processing),
    controlProtocols: asStringList(control.protocols),
    networkInterfaces: asStringList(network.interfaces),
    audioSignals: [
      ...asStringList(audio.formats),
      ...asStringList(audio.processing),
      ...asStringList(audio.networkAudio),
    ],
  };
}

function buildGeneratedEndpointNodes(facts: ProductConnectionFacts): VisualDiagramNode[] {
  const nodes: VisualDiagramNode[] = [];

  if (hasAvoipTransport(facts)) {
    nodes.push({
      id: "generic-avoip-network",
      label: "AVoIP Network",
      subtitle: "NetworkHD / multicast transport path. Confirm switch, VLAN and bandwidth before quote.",
      kind: "network",
      status: "recommended",
      emphasis: "support",
      column: 2.1,
      row: 0.18,
    });
  }

  if (hasNetworkAudio(facts)) {
    nodes.push({
      id: "generic-audio-network",
      label: "Audio Network",
      subtitle: "Dante / network-audio path. Confirm clocking, routing and DSP ownership.",
      kind: "audio",
      status: "optional",
      emphasis: "compact",
      column: 1.25,
      row: 3.82,
    });
  }

  if (hasUsbTransport(facts)) {
    nodes.push({
      id: "generic-usb-host",
      label: "USB Host",
      subtitle: "Room PC, BYOM laptop or UC platform that owns the USB session.",
      kind: "usb",
      status: "missing",
      emphasis: "compact",
      column: 0.2,
      row: 3.82,
    });
  }

  if (hasCameraUsbEndpoint(facts)) {
    nodes.push({
      id: "generic-usb-camera-endpoint",
      label: "Camera USB Endpoint",
      subtitle: "Camera / video-bar USB device side. Confirm host path and bandwidth.",
      kind: "camera",
      status: "missing",
      emphasis: "compact",
      column: 2.3,
      row: 3.82,
    });
  }

  return nodes;
}

function buildNodes(facts: ProductConnectionFacts): VisualDiagramNode[] {
  const hasMatrixEvidence = Boolean(facts.matrixSize);
  const hasVideoProcessing = facts.videoProcessing.length > 0;
  const hasAudio = facts.audioSignals.length > 0;
  const hasControl = facts.controlProtocols.length > 0;
  const hasNetwork = facts.networkInterfaces.length > 0;

  return [
    {
      id: "inputs",
      label: "Sources / Inputs",
      subtitle: hasMatrixEvidence
        ? `${facts.matrixSize} source-side direction shown from product evidence. Verify exact port count against datasheet.`
        : "Confirm source count and connector mix before quote.",
      kind: "source",
      status: "normal",
      emphasis: "support",
      column: 0.18,
      row: 1.08,
    },
    {
      id: "input-check",
      label: "Input ownership",
      subtitle: "Confirm which sources must switch seamlessly and which can be static.",
      kind: "warning",
      status: "missing",
      emphasis: "compact",
      column: 0.26,
      row: 0.08,
    },
    {
      id: "device",
      label: facts.sku,
      subtitle: hasMatrixEvidence
        ? `${facts.category} | ${facts.matrixSizeEvidence || `${facts.matrixSize} path needs verification against datasheet.`}`.trim()
        : `${facts.category} | confirm front/rear port map before quote.`,
      kind: "switching",
      status: "recommended",
      emphasis: "primary",
      column: 2.12,
      row: 0.92,
    },
    {
      id: "outputs",
      label: "Displays / Outputs",
      subtitle: hasVideoProcessing
        ? `${summarize(facts.videoProcessing, "Output behaviour")} | verify against datasheet.`
        : "Confirm display count, sink formats and output behaviour before quote.",
      kind: "display",
      status: "normal",
      emphasis: "support",
      column: 4.18,
      row: 1.08,
    },
    {
      id: "output-check",
      label: "Display behaviour",
      subtitle: "Confirm whether the project needs scaling, multiview, video wall or simple matrix routing.",
      kind: "output",
      status: hasVideoProcessing ? "optional" : "missing",
      emphasis: "compact",
      column: 4.26,
      row: 0.08,
    },
    {
      id: "audio",
      label: "Audio",
      subtitle: hasAudio
        ? `${summarize(facts.audioSignals, "Audio path available")} | confirm analogue / S/PDIF needs before quote.`
        : "Confirm whether audio breakaway, de-embed or local amplification is required.",
      kind: "audio",
      status: hasAudio ? "optional" : "missing",
      emphasis: "compact",
      column: 0.88,
      row: 2.56,
    },
    {
      id: "control",
      label: "Control",
      subtitle: hasControl
        ? `${summarize(facts.controlProtocols, "Control protocols present")} | confirm customer control path.`
        : "Confirm RS-232, API, CEC, IR or third-party control needs before quote.",
      kind: "controller",
      status: hasControl ? "optional" : "missing",
      emphasis: "compact",
      column: 2.08,
      row: 2.56,
    },
    {
      id: "network",
      label: "Network",
      subtitle: hasNetwork
        ? `${summarize(facts.networkInterfaces, "IP control / LAN path present")} | not the lead architecture.`
        : "Only show network ownership if the project actually needs IP control or firmware access.",
      kind: "network",
      status: hasNetwork ? "optional" : "missing",
      emphasis: "compact",
      column: 3.18,
      row: 2.56,
    },
    {
      id: "accessories",
      label: "Accessories",
      subtitle:
        facts.connectors.length > 0
          ? `${summarize(facts.connectors, "Likely supporting items")} | confirm included accessories before quote.`
          : "Confirm power supply, mounting hardware, remote accessories and cable dependencies.",
      kind: "usb",
      status: "optional",
      emphasis: "compact",
      column: 4.28,
      row: 2.56,
    },
    {
      id: "quote-checks",
      label: "Quote checks",
      subtitle: `${sentenceCaseQuoteSafety(facts.quoteSafety)} | verify against datasheet before final quote.`,
      kind: "warning",
      status: "risk",
      emphasis: "compact",
      column: 5.38,
      row: 2.56,
    },
    ...buildGeneratedEndpointNodes(facts),
  ];
}

function buildGeneratedEndpointEdges(facts: ProductConnectionFacts): VisualDiagramEdge[] {
  const edges: VisualDiagramEdge[] = [];

  if (hasAvoipTransport(facts)) {
    edges.push({
      id: "e-avoip-network",
      source: "device",
      target: "generic-avoip-network",
      label: "AVoIP transport / multicast network",
      status: "recommended",
    });
  }

  if (hasNetworkAudio(facts)) {
    edges.push({
      id: "e-audio-network",
      source: "device",
      target: "generic-audio-network",
      label: "Dante / network audio",
      status: "optional",
    });
  }

  if (hasUsbTransport(facts)) {
    edges.push({
      id: "e-usb-host",
      source: "generic-usb-host",
      target: "device",
      label: "USB host / device ownership",
      status: "missing",
    });
  }

  if (hasCameraUsbEndpoint(facts)) {
    edges.push({
      id: "e-usb-camera-endpoint",
      source: "device",
      target: "generic-usb-camera-endpoint",
      label: "Camera USB endpoint",
      status: "missing",
    });
  }

  return edges;
}

export function buildProductConnectionDiagram(
  fallbackModel: VisualDiagramModel,
  seedSku: string,
  product: UnknownRecord | null,
): VisualDiagramModel {
  if (!seedSku || fallbackModel.id !== "product-port-view") {
    return fallbackModel;
  }

  const facts = collectFacts(seedSku, product);
  const sourceLine = facts.officialProductUrl
    ? `Official product evidence is available for ${facts.sku}.`
    : `Official product URL is not yet attached for ${facts.sku}.`;

  return {
    ...fallbackModel,
    title: `${facts.sku} Product Connection / Port Ownership View`,
    subtitle: "Product-led canvas showing likely signal ownership, dependencies and quote checks.",
    customerSummary: `${facts.sku} is shown as the central device so the rep can explain what feeds it, what it serves, and what still needs validating before quote.`,
    technicalSummary: `${facts.name} is treated as the dominant system node. Inputs stay on the left, display/output paths stay on the right, and support lanes remain secondary so the diagram does not imply the wrong architecture.`,
    assumptions: [
      sourceLine,
      facts.matrixSizeEvidence || "Port count still needs validating against the product page or datasheet.",
      "Support lanes such as audio, network, control and accessories are shown as dependencies, not as the primary architecture.",
    ],
    missingInformation: [
      "Exact front and rear connector orientation.",
      "Real source inventory and required simultaneous output behaviour.",
      "Any project-specific cable, receiver, rack or accessory dependencies that must appear on the quote.",
    ],
    quoteRisks: [
      `${sentenceCaseQuoteSafety(facts.quoteSafety)} until the datasheet and project needs are confirmed.`,
      "Do not treat support connectors or accessories as the lead recommendation.",
      "Confirm whether display scaling, multiview or video wall behaviour is required before presenting the final system shape.",
    ],
    nextActions: [
      "Validate the front/rear port map against the product page or datasheet.",
      "Confirm source count, display count and any advanced output behaviour.",
      "Carry the quote checks and dependencies into Product Pitch or Proposal handoff.",
    ],
    nodes: buildNodes(facts),
    edges: [
      { id: "e1", source: "inputs", target: "device", label: "Source-side routing" },
      { id: "e2", source: "input-check", target: "inputs", label: "Validate ownership", status: "missing" },
      { id: "e3", source: "device", target: "outputs", label: "Display-side outputs" },
      { id: "e4", source: "output-check", target: "outputs", label: "Output behaviour", status: "optional" },
      { id: "e5", source: "device", target: "audio", label: "Audio dependency", status: "optional" },
      { id: "e6", source: "device", target: "control", label: "Control path", status: "optional" },
      { id: "e7", source: "device", target: "network", label: "IP / service lane", status: "optional" },
      { id: "e8", source: "device", target: "accessories", label: "Supporting items", status: "optional" },
      { id: "e9", source: "device", target: "quote-checks", label: "Confirm before quote", status: "risk" },
      ...buildGeneratedEndpointEdges(facts),
    ],
  };
}
