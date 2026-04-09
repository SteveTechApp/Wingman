import { useMemo, useState, type CSSProperties } from "react";

type HandoffItem = {
  id: string;
  sku: string;
  name: string;
  family: string;
  series: string;
  category: string;
  score: number;
  reasons: string[];
  summary: string;
  addedAt: string;
  source: "catalogue_v2";
};

type ProjectRequirements = {
  application: string;
  roomType: string;
  sourceCount: number;
  displayCount: number;
  usbRequired: boolean;
  audioRequired: boolean;
  controlRequired: boolean;
};

type EndpointChoice = {
  encoderSku: string;
  decoderSku: string;
  transceiverSku: string;
  specialistSku: string;
  encoderQty: number;
  decoderQty: number;
  transceiverQty: number;
  specialistQty: number;
};

type ProjectHandoffPayload = {
  requirements: ProjectRequirements;
  items: HandoffItem[];
  endpointChoice: EndpointChoice;
  updatedAt: string;
};

type DiagramNode = {
  id: string;
  label: string;
  sublabel: string;
  tone: "source" | "core" | "transport" | "output";
  quantity?: number;
  role?: string;
};

type BomRow = {
  sku: string;
  name: string;
  familySeries: string;
  qty: number;
  kind: "primary" | "endpoint" | "ancillary";
};

type InfrastructureAssessment = {
  switchClass: string;
  switchPorts: string;
  poeRequired: boolean;
  fibreRecommended: boolean;
  usbImplication: string;
  audioImplication: string;
  controlImplication: string;
  notes: string[];
};

function getProjectId(): string {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get("projectId") || localStorage.getItem("wm:activeProjectId") || "global";
  } catch {
    return "global";
  }
}

function getProjectName(): string {
  return localStorage.getItem("wm:activeProjectName") || "General Opportunity";
}

function getStorageKey(projectId: string): string {
  return `wm:catalog-handoff:project:${projectId}`;
}

function defaultRequirements(): ProjectRequirements {
  return {
    application: "",
    roomType: "Meeting room",
    sourceCount: 2,
    displayCount: 1,
    usbRequired: false,
    audioRequired: false,
    controlRequired: false,
  };
}

function defaultEndpointChoice(): EndpointChoice {
  return {
    encoderSku: "",
    decoderSku: "",
    transceiverSku: "",
    specialistSku: "",
    encoderQty: 2,
    decoderQty: 1,
    transceiverQty: 0,
    specialistQty: 0,
  };
}

function readPayload(projectId: string): ProjectHandoffPayload {
  try {
    const raw = localStorage.getItem(getStorageKey(projectId));
    if (!raw) {
      return {
        requirements: defaultRequirements(),
        items: [],
        endpointChoice: defaultEndpointChoice(),
        updatedAt: new Date().toISOString(),
      };
    }

    const parsed = JSON.parse(raw);
    return {
      requirements: parsed?.requirements ?? defaultRequirements(),
      items: Array.isArray(parsed?.items) ? parsed.items : [],
      endpointChoice: parsed?.endpointChoice ?? defaultEndpointChoice(),
      updatedAt: parsed?.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return {
      requirements: defaultRequirements(),
      items: [],
      endpointChoice: defaultEndpointChoice(),
      updatedAt: new Date().toISOString(),
    };
  }
}

function clearPayload(projectId: string): void {
  localStorage.removeItem(getStorageKey(projectId));
}

function familyNarrative(item: HandoffItem): string {
  if (item.family === "NHD" && item.series === "NHD-100 Series") {
    return "Selected for value-led AV over IP, lower bandwidth distribution, IR-related workflows, or NDI / camera integration use cases.";
  }
  if (item.family === "NHD" && item.series === "NHD-500 Series") {
    return "Selected for mainstream 4K HDMI 2.0 AV over IP deployments where USB routing and Dante workflows are important.";
  }
  if (item.family === "NHD" && item.series === "NHD-600 Series") {
    return "Selected for premium 10Gb transport, highest image quality, multiview capability, and no-compromise enterprise workflows.";
  }
  if (item.family === "Presentation") {
    return "Selected to support room-based presentation switching, collaboration and day-to-day user-friendly operation.";
  }
  if (item.family === "Video Wall") {
    return "Selected to support video wall processing, wall layout control, or specialist display composition requirements.";
  }
  if (item.family === "Apollo") {
    return "Selected to support UC, conferencing and camera / collaboration-driven room applications.";
  }
  if (item.family === "Matrix") {
    return "Selected to support central switching, distribution and structured source-to-display routing.";
  }
  return "Selected because it aligns with the current technical and commercial requirement.";
}

function inferTransportType(items: HandoffItem[]): string {
  if (items.some((item) => item.family === "NHD" && item.series === "NHD-600 Series")) return "10Gb AV over IP";
  if (items.some((item) => item.family === "NHD")) return "1Gb AV over IP";
  if (items.some((item) => item.family === "Video Wall")) return "HDMI video wall processing";
  if (items.some((item) => item.family === "Presentation")) return "Room presentation switching";
  if (items.some((item) => item.family === "Matrix")) return "Central matrix switching";
  return "Signal distribution";
}

function inferInputLinkLabel(requirements: ProjectRequirements): string {
  if (requirements.application === "NDI") return "HDMI / USB / NDI";
  if (requirements.usbRequired) return "HDMI / USB-C / USB";
  return "HDMI / USB-C";
}

function inferOutputLinkLabel(items: HandoffItem[]): string {
  const transport = inferTransportType(items);
  if (transport === "10Gb AV over IP") return "10Gb network / fibre / copper";
  if (transport === "1Gb AV over IP") return "1Gb network / copper";
  if (transport === "HDMI video wall processing") return "HDMI wall feed";
  if (transport === "Room presentation switching") return "HDMI / HDBaseT output";
  if (transport === "Central matrix switching") return "HDMI / HDBaseT distribution";
  return "Signal output";
}

function inferSourceNodes(requirements: ProjectRequirements): DiagramNode[] {
  const nodes: DiagramNode[] = [
    {
      id: "src-main",
      label: requirements.sourceCount > 1 ? "User / local sources" : "Primary source",
      sublabel: `${requirements.sourceCount} active input${requirements.sourceCount === 1 ? "" : "s"}`,
      tone: "source",
      quantity: requirements.sourceCount,
      role: requirements.application || "Source input path",
    },
  ];

  if (requirements.application === "NDI") {
    nodes.push({
      id: "src-ndi",
      label: "NDI / PTZ camera",
      sublabel: "Network camera workflow",
      tone: "source",
      quantity: 1,
      role: "Camera source",
    });
  }

  if (requirements.usbRequired) {
    nodes.push({
      id: "src-usb",
      label: "USB peripherals",
      sublabel: "Camera / HID / extension path",
      tone: "source",
      quantity: 1,
      role: "USB path",
    });
  }

  return nodes;
}

function familyRole(item: HandoffItem): string {
  if (item.family === "NHD") return "AV over IP platform";
  if (item.family === "Presentation") return "Room switcher / collaboration core";
  if (item.family === "Video Wall") return "Wall processing core";
  if (item.family === "Matrix") return "Central routing core";
  if (item.family === "Apollo") return "UC / collaboration core";
  return "System core";
}

function inferCoreNodes(items: HandoffItem[], endpointChoice: EndpointChoice): DiagramNode[] {
  const nodes: DiagramNode[] = [];

  if (endpointChoice.encoderSku && endpointChoice.encoderQty > 0) {
    nodes.push({
      id: "core-encoder",
      label: endpointChoice.encoderSku,
      sublabel: "Selected encoder",
      tone: "transport",
      quantity: endpointChoice.encoderQty,
      role: "Source-side encoder",
    });
  }

  if (endpointChoice.decoderSku && endpointChoice.decoderQty > 0) {
    nodes.push({
      id: "core-decoder",
      label: endpointChoice.decoderSku,
      sublabel: "Selected decoder",
      tone: "transport",
      quantity: endpointChoice.decoderQty,
      role: "Display-side decoder",
    });
  }

  if (endpointChoice.transceiverSku && endpointChoice.transceiverQty > 0) {
    nodes.push({
      id: "core-transceiver",
      label: endpointChoice.transceiverSku,
      sublabel: "Selected transceiver",
      tone: "transport",
      quantity: endpointChoice.transceiverQty,
      role: "Mixed endpoint transceiver",
    });
  }

  if (endpointChoice.specialistSku && endpointChoice.specialistQty > 0) {
    nodes.push({
      id: "core-specialist",
      label: endpointChoice.specialistSku,
      sublabel: "Optional specialist device",
      tone: "core",
      quantity: endpointChoice.specialistQty,
      role: "Specialist / support device",
    });
  }

  const carryThrough: DiagramNode[] = items.slice(0, 2).map((item, index) => ({
    id: `carry-${index}`,
    label: item.sku,
    sublabel: `${item.family} / ${item.series}`,
    tone: item.family === "NHD" ? "transport" : "core",
    quantity: 1,
    role: familyRole(item),
  }));

  for (const node of carryThrough) {
    if (!nodes.some((existing) => existing.label === node.label)) {
      nodes.push(node);
    }
  }

  if (nodes.length === 0) {
    nodes.push({
      id: "core-generic",
      label: "Wingman Solution Core",
      sublabel: "Switching / transport / processing",
      tone: "core",
      quantity: 1,
      role: "System core",
    });
  }

  return nodes;
}

function inferOutputNodes(requirements: ProjectRequirements, items: HandoffItem[]): DiagramNode[] {
  const hasVideoWall = items.some((item) => item.family === "Video Wall");
  const hasApollo = items.some((item) => item.family === "Apollo");
  const nodes: DiagramNode[] = [];

  if (hasVideoWall) {
    nodes.push({
      id: "out-wall",
      label: "Video Wall / LED Display",
      sublabel: "Processed display canvas",
      tone: "output",
      quantity: requirements.displayCount,
      role: "Primary display system",
    });
  } else {
    nodes.push({
      id: "out-display",
      label: requirements.displayCount > 1 ? "Displays / Projectors" : "Display / Projector",
      sublabel: `${requirements.displayCount} visual output${requirements.displayCount === 1 ? "" : "s"}`,
      tone: "output",
      quantity: requirements.displayCount,
      role: "Display output",
    });
  }

  if (hasApollo || requirements.audioRequired) {
    nodes.push({
      id: "out-audio",
      label: requirements.audioRequired ? "Audio endpoint / DSP path" : "UC endpoint / peripherals",
      sublabel: requirements.audioRequired ? "Audio reinforcement / audio path" : "Camera / mic / speaker path",
      tone: "output",
      quantity: 1,
      role: requirements.audioRequired ? "Audio path" : "UC endpoint",
    });
  }

  if (requirements.controlRequired) {
    nodes.push({
      id: "out-control",
      label: "Control interface",
      sublabel: "Touchpanel / automation / API path",
      tone: "output",
      quantity: 1,
      role: "Control path",
    });
  }

  return nodes;
}

function assessInfrastructure(
  requirements: ProjectRequirements,
  endpointChoice: EndpointChoice,
  items: HandoffItem[],
): InfrastructureAssessment {
  const isNhd = items.some((item) => item.family === "NHD");
  const is10g = items.some((item) => item.series === "NHD-600 Series");
  const is1g = isNhd && !is10g;

  const endpointCount =
    (endpointChoice.encoderQty || 0) +
    (endpointChoice.decoderQty || 0) +
    (endpointChoice.transceiverQty || 0) +
    (endpointChoice.specialistQty || 0);

  const effectivePorts = Math.max(endpointCount, requirements.sourceCount + requirements.displayCount);
  const switchPorts =
    effectivePorts <= 8 ? "8-port class" :
    effectivePorts <= 16 ? "16-port class" :
    effectivePorts <= 24 ? "24-port class" :
    "24+ port class";

  const poeRequired = isNhd && (
    Boolean(endpointChoice.decoderSku) ||
    Boolean(endpointChoice.encoderSku) ||
    Boolean(endpointChoice.transceiverSku)
  );

  const fibreRecommended =
    is10g ||
    requirements.displayCount >= 4 ||
    requirements.roomType === "Control room" ||
    requirements.application === "Video wall";

  const usbImplication = requirements.usbRequired
    ? "USB-capable transport path required. Verify endpoint USB role and peripheral direction."
    : "No dedicated USB transport requirement captured.";

  const audioImplication = requirements.audioRequired
    ? "Audio workflow required. Validate de-embed, Dante, DSP or downstream audio breakout path."
    : "No dedicated audio workflow captured.";

  const controlImplication = requirements.controlRequired
    ? "Control path required. Allow for API, RS-232, IR or LAN control integration."
    : "No dedicated control integration captured.";

  const notes: string[] = [];

  if (is10g) {
    notes.push("NHD-600 Series indicates a 10Gb switching environment.");
  } else if (is1g) {
    notes.push("Selected NHD endpoints align to a 1Gb AV over IP switching environment.");
  }

  if (poeRequired) {
    notes.push("Check actual endpoint power method before finalising PoE budget.");
  }

  if (fibreRecommended) {
    notes.push("Consider fibre uplinks or backbone links for resilience, distance or bandwidth aggregation.");
  }

  if (requirements.usbRequired) {
    notes.push("USB workflows should be validated endpoint-by-endpoint, especially with mixed encoder/decoder selections.");
  }

  if (requirements.audioRequired && items.some((item) => item.series === "NHD-500 Series" || item.series === "NHD-600 Series")) {
    notes.push("Review Dante / networked audio compatibility as part of the final system design.");
  }

  return {
    switchClass: is10g ? "10Gb managed switch" : isNhd ? "1Gb managed switch" : "Standard network / local switching",
    switchPorts,
    poeRequired,
    fibreRecommended,
    usbImplication,
    audioImplication,
    controlImplication,
    notes,
  };
}

function buildBomRows(payload: ProjectHandoffPayload): BomRow[] {
  const rows: BomRow[] = [];

  for (const item of payload.items) {
    rows.push({
      sku: item.sku,
      name: item.name,
      familySeries: `${item.family} / ${item.series}`,
      qty: 1,
      kind: "primary",
    });
  }

  if (payload.endpointChoice.encoderSku && payload.endpointChoice.encoderQty > 0) {
    rows.push({
      sku: payload.endpointChoice.encoderSku,
      name: "Selected NHD encoder endpoint",
      familySeries: "NHD endpoint",
      qty: payload.endpointChoice.encoderQty,
      kind: "endpoint",
    });
  }

  if (payload.endpointChoice.decoderSku && payload.endpointChoice.decoderQty > 0) {
    rows.push({
      sku: payload.endpointChoice.decoderSku,
      name: "Selected NHD decoder endpoint",
      familySeries: "NHD endpoint",
      qty: payload.endpointChoice.decoderQty,
      kind: "endpoint",
    });
  }

  if (payload.endpointChoice.transceiverSku && payload.endpointChoice.transceiverQty > 0) {
    rows.push({
      sku: payload.endpointChoice.transceiverSku,
      name: "Selected NHD transceiver endpoint",
      familySeries: "NHD endpoint",
      qty: payload.endpointChoice.transceiverQty,
      kind: "endpoint",
    });
  }

  if (payload.endpointChoice.specialistSku && payload.endpointChoice.specialistQty > 0) {
    rows.push({
      sku: payload.endpointChoice.specialistSku,
      name: "Selected specialist / support device",
      familySeries: "NHD support",
      qty: payload.endpointChoice.specialistQty,
      kind: "endpoint",
    });
  }

  const deduped = new Map<string, BomRow>();
  for (const row of rows) {
    const existing = deduped.get(row.sku);
    if (existing) {
      existing.qty += row.qty;
    } else {
      deduped.set(row.sku, { ...row });
    }
  }

  return [...deduped.values()];
}

function buildAncillaryRows(
  requirements: ProjectRequirements,
  infrastructure: InfrastructureAssessment,
  endpointChoice: EndpointChoice,
  items: HandoffItem[],
): BomRow[] {
  const rows: BomRow[] = [];
  const hasNhd = items.some((item) => item.family === "NHD");

  if (hasNhd) {
    rows.push({
      sku: infrastructure.switchClass,
      name: `${infrastructure.switchPorts} recommended network switch class`,
      familySeries: "Network infrastructure",
      qty: 1,
      kind: "ancillary",
    });
  }

  if (infrastructure.fibreRecommended) {
    rows.push({
      sku: "FIBRE-UPLINK-REVIEW",
      name: "Fibre uplink / backbone review item",
      familySeries: "Network infrastructure",
      qty: 1,
      kind: "ancillary",
    });
  }

  if (infrastructure.poeRequired) {
    rows.push({
      sku: "POE-BUDGET-REVIEW",
      name: "PoE budget and endpoint power review",
      familySeries: "Power / network",
      qty: 1,
      kind: "ancillary",
    });
  }

  if (requirements.usbRequired) {
    rows.push({
      sku: "USB-WORKFLOW-VALIDATION",
      name: "USB routing / extension validation item",
      familySeries: "USB workflow",
      qty: 1,
      kind: "ancillary",
    });
  }

  if (requirements.audioRequired) {
    rows.push({
      sku: "AUDIO-PATH-REVIEW",
      name: "Audio breakout / DSP / Dante path review",
      familySeries: "Audio workflow",
      qty: 1,
      kind: "ancillary",
    });
  }

  if (requirements.controlRequired) {
    rows.push({
      sku: "CONTROL-INTEGRATION-REVIEW",
      name: "Control integration / API / RS-232 review",
      familySeries: "Control workflow",
      qty: 1,
      kind: "ancillary",
    });
  }

  if (endpointChoice.specialistSku && endpointChoice.specialistQty > 0) {
    rows.push({
      sku: "SPECIALIST-DEVICE-SUPPORT",
      name: "Specialist device deployment / configuration allowance",
      familySeries: "System support",
      qty: 1,
      kind: "ancillary",
    });
  }

  return rows;
}

export default function ProposalPage() {
  const projectId = getProjectId();
  const projectName = getProjectName();
  const [revision, setRevision] = useState(0);

  const payload = useMemo(() => readPayload(projectId), [projectId, revision]);
  const requirements = payload.requirements;
  const handoff = payload.items;
  const endpointChoice = payload.endpointChoice;

  const sourceNodes = useMemo(() => inferSourceNodes(requirements), [requirements]);
  const coreNodes = useMemo(() => inferCoreNodes(handoff, endpointChoice), [handoff, endpointChoice]);
  const outputNodes = useMemo(() => inferOutputNodes(requirements, handoff), [requirements, handoff]);
  const infrastructure = useMemo(
    () => assessInfrastructure(requirements, endpointChoice, handoff),
    [requirements, endpointChoice, handoff],
  );

  const bomRows = useMemo(() => buildBomRows(payload), [payload]);
  const ancillaryRows = useMemo(
    () => buildAncillaryRows(requirements, infrastructure, endpointChoice, handoff),
    [requirements, infrastructure, endpointChoice, handoff],
  );

  const transportLabel = useMemo(() => inferTransportType(handoff), [handoff]);
  const inputLinkLabel = useMemo(() => inferInputLinkLabel(requirements), [requirements]);
  const outputLinkLabel = useMemo(() => inferOutputLinkLabel(handoff), [handoff]);

  const executiveSummary = useMemo(() => {
    if (handoff.length === 0) {
      return "No catalogue selections have been passed into Proposal Builder yet. Use the Product Finder and choose Add to Project or Open in Proposal.";
    }

    const families = [...new Set(handoff.map((item) => item.family))];
    const series = [...new Set(handoff.map((item) => item.series))];

    return `This draft proposal is based on ${handoff.length} selected product${handoff.length === 1 ? "" : "s"} for ${projectName}. The recommendation set is centred around ${families.join(", ")}${series.length > 0 ? ` with emphasis on ${series.join(", ")}` : ""}, supporting ${requirements.sourceCount} source${requirements.sourceCount === 1 ? "" : "s"} and ${requirements.displayCount} display${requirements.displayCount === 1 ? "" : "s"}.`;
  }, [handoff, projectName, requirements]);

  const requirementSummary = useMemo(() => {
    const flags = [
      requirements.usbRequired ? "USB required" : "",
      requirements.audioRequired ? "Audio required" : "",
      requirements.controlRequired ? "Control required" : "",
    ].filter(Boolean);

    const base = [
      requirements.application || "General application",
      requirements.roomType || "General room type",
      `${requirements.sourceCount} source${requirements.sourceCount === 1 ? "" : "s"}`,
      `${requirements.displayCount} display${requirements.displayCount === 1 ? "" : "s"}`,
      ...flags,
    ];

    return base.join(" • ");
  }, [requirements]);

  function handleClear() {
    clearPayload(projectId);
    setRevision((v) => v + 1);
  }

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <div style={eyebrowStyle}>Proposal Builder</div>
          <h1 style={titleStyle}>Draft proposal from catalogue handoff</h1>
          <div style={subtleTextStyle}>Project: {projectName}</div>
        </div>

        <div style={actionRowStyle}>
          <button type="button" onClick={() => (window.location.href = `/app/tools/catalog?projectId=${encodeURIComponent(projectId)}`)} style={buttonStyle}>
            Back to Catalogue
          </button>
          <button type="button" onClick={handleClear} style={buttonStyle}>
            Clear Handoff
          </button>
        </div>
      </section>

      <div style={layoutStyle}>
        <main style={mainStyle}>
          <section style={summaryPanelStyle}>
            <div style={sectionEyebrowStyle}>Executive Summary</div>
            <p style={bodyStyle}>{executiveSummary}</p>
          </section>

          <section style={requirementsPanelStyle}>
            <div style={sectionEyebrowStyle}>Understanding of Requirement</div>
            <p style={bodyStyle}>{requirementSummary}</p>
            <div style={pillWrapStyle}>
              <span style={pillStyle}>{requirements.roomType}</span>
              {requirements.usbRequired ? <span style={pillStyle}>USB required</span> : null}
              {requirements.audioRequired ? <span style={pillStyle}>Audio required</span> : null}
              {requirements.controlRequired ? <span style={pillStyle}>Control required</span> : null}
            </div>
          </section>

          <section style={architecturePanelStyle}>
            <div style={sectionEyebrowStyle}>Application-Driven Architecture</div>

            {handoff.length === 0 ? (
              <div style={emptyStyle}>No selected products available for this project yet.</div>
            ) : (
              <>
                <div style={metricStripStyle}>
                  <div style={{ ...metricCardStyle, ...metricBlueStyle }}>
                    <span style={metricLabelStyle}>Application</span>
                    <strong style={metricValueStyle}>{requirements.application || "General"}</strong>
                  </div>
                  <div style={{ ...metricCardStyle, ...metricCyanStyle }}>
                    <span style={metricLabelStyle}>Sources</span>
                    <strong style={metricValueStyle}>{requirements.sourceCount}</strong>
                  </div>
                  <div style={{ ...metricCardStyle, ...metricGreenStyle }}>
                    <span style={metricLabelStyle}>Displays</span>
                    <strong style={metricValueStyle}>{requirements.displayCount}</strong>
                  </div>
                  <div style={{ ...metricCardStyle, ...metricOrangeStyle }}>
                    <span style={metricLabelStyle}>Transport</span>
                    <strong style={metricValueStyle}>{transportLabel}</strong>
                  </div>
                </div>

                <div style={pillWrapStyle}>
                  {endpointChoice.encoderSku ? <span style={pillStyle}>Encoder: {endpointChoice.encoderSku}</span> : null}
                  {endpointChoice.decoderSku ? <span style={pillStyle}>Decoder: {endpointChoice.decoderSku}</span> : null}
                  {endpointChoice.transceiverSku ? <span style={pillStyle}>Transceiver: {endpointChoice.transceiverSku}</span> : null}
                  {endpointChoice.specialistSku && endpointChoice.specialistQty > 0 ? <span style={pillStyle}>Specialist: {endpointChoice.specialistSku}</span> : null}
                </div>

                <div style={diagramShellStyle}>
                  <div style={diagramGridStyle}>
                    <div style={diagramColumnStyle}>
                      <div style={diagramColumnHeaderStyle}>Sources</div>
                      <div style={diagramNodeStackStyle}>
                        {sourceNodes.map((node) => (
                          <div key={node.id} style={{ ...diagramNodeStyle, ...toneStyle(node.tone) }}>
                            <div style={diagramNodeTopStyle}>
                              <div style={diagramNodeTitleStyle}>{node.label}</div>
                              {node.quantity ? <div style={qtyBadgeStyle}>x{node.quantity}</div> : null}
                            </div>
                            <div style={diagramNodeSubStyle}>{node.sublabel}</div>
                            {node.role ? <div style={diagramNodeRoleStyle}>{node.role}</div> : null}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={diagramArrowColumnStyle}>
                      <div style={diagramArrowStyle}>→</div>
                      <div style={diagramLineLabelStyle}>{inputLinkLabel}</div>
                    </div>

                    <div style={diagramColumnStyle}>
                      <div style={diagramColumnHeaderStyle}>Switching / Transport Core</div>
                      <div style={diagramTransportBadgeStyle}>{transportLabel}</div>
                      <div style={diagramNodeStackStyle}>
                        {coreNodes.map((node) => (
                          <div key={node.id} style={{ ...diagramNodeStyle, ...toneStyle(node.tone) }}>
                            <div style={diagramNodeTopStyle}>
                              <div style={diagramNodeTitleStyle}>{node.label}</div>
                              {node.quantity ? <div style={qtyBadgeStyle}>x{node.quantity}</div> : null}
                            </div>
                            <div style={diagramNodeSubStyle}>{node.sublabel}</div>
                            {node.role ? <div style={diagramNodeRoleStyle}>{node.role}</div> : null}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={diagramArrowColumnStyle}>
                      <div style={diagramArrowStyle}>→</div>
                      <div style={diagramLineLabelStyle}>{outputLinkLabel}</div>
                    </div>

                    <div style={diagramColumnStyle}>
                      <div style={diagramColumnHeaderStyle}>Outputs</div>
                      <div style={diagramNodeStackStyle}>
                        {outputNodes.map((node) => (
                          <div key={node.id} style={{ ...diagramNodeStyle, ...toneStyle(node.tone) }}>
                            <div style={diagramNodeTopStyle}>
                              <div style={diagramNodeTitleStyle}>{node.label}</div>
                              {node.quantity ? <div style={qtyBadgeStyle}>x{node.quantity}</div> : null}
                            </div>
                            <div style={diagramNodeSubStyle}>{node.sublabel}</div>
                            {node.role ? <div style={diagramNodeRoleStyle}>{node.role}</div> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={legendWrapStyle}>
                    <div style={legendTitleStyle}>Signal / Cable Legend</div>
                    <div style={pillWrapStyle}>
                      <span style={{ ...pillStyle, ...legendSourceStyle }}>Source input path</span>
                      <span style={{ ...pillStyle, ...legendCoreStyle }}>Switch / processing core</span>
                      <span style={{ ...pillStyle, ...legendTransportStyle }}>AV transport layer</span>
                      <span style={{ ...pillStyle, ...legendOutputStyle }}>Display / endpoint output</span>
                    </div>
                    <div style={bodyStyle}>
                      Input side uses <strong>{inputLinkLabel}</strong>. Output side uses <strong>{outputLinkLabel}</strong>.
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>

          <section style={networkPanelStyle}>
            <div style={sectionEyebrowStyle}>Network & Infrastructure Assessment</div>

            <div style={metricStripStyle}>
              <div style={{ ...metricCardStyle, ...metricPurpleStyle }}>
                <span style={metricLabelStyle}>Switch Class</span>
                <strong style={metricValueStyle}>{infrastructure.switchClass}</strong>
              </div>
              <div style={{ ...metricCardStyle, ...metricSlateStyle }}>
                <span style={metricLabelStyle}>Port Class</span>
                <strong style={metricValueStyle}>{infrastructure.switchPorts}</strong>
              </div>
              <div style={{ ...metricCardStyle, ...metricAmberStyle }}>
                <span style={metricLabelStyle}>PoE</span>
                <strong style={metricValueStyle}>{infrastructure.poeRequired ? "Review required" : "Not assumed"}</strong>
              </div>
              <div style={{ ...metricCardStyle, ...metricTealStyle }}>
                <span style={metricLabelStyle}>Fibre</span>
                <strong style={metricValueStyle}>{infrastructure.fibreRecommended ? "Recommended" : "Optional"}</strong>
              </div>
            </div>

            <div style={threeColStyle}>
              <div style={{ ...infoCardStyle, ...usbCardStyle }}>
                <div style={infoCardTitleStyle}>USB</div>
                <div style={bodyStyle}>{infrastructure.usbImplication}</div>
              </div>

              <div style={{ ...infoCardStyle, ...audioCardStyle }}>
                <div style={infoCardTitleStyle}>Audio</div>
                <div style={bodyStyle}>{infrastructure.audioImplication}</div>
              </div>

              <div style={{ ...infoCardStyle, ...controlCardStyle }}>
                <div style={infoCardTitleStyle}>Control</div>
                <div style={bodyStyle}>{infrastructure.controlImplication}</div>
              </div>
            </div>

            {infrastructure.notes.length > 0 ? (
              <div style={notePanelStyle}>
                <div style={sectionEyebrowStyle}>Design notes</div>
                {infrastructure.notes.map((note) => (
                  <div key={note} style={bodyStyle}>{note}</div>
                ))}
              </div>
            ) : null}
          </section>

          <section style={solutionPanelStyle}>
            <div style={sectionEyebrowStyle}>Recommended Solution Overview</div>

            {handoff.length === 0 ? (
              <div style={emptyStyle}>No selected products available for this project yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {handoff.map((item) => (
                  <article key={item.id} style={cardStyle}>
                    <div style={cardTopStyle}>
                      <div>
                        <div style={skuStyle}>{item.sku}</div>
                        <div style={nameStyle}>{item.name}</div>
                      </div>
                      <div style={scorePillStyle}>Score {item.score}</div>
                    </div>

                    <div style={pillWrapStyle}>
                      <span style={pillStyle}>{item.family}</span>
                      <span style={pillStyle}>{item.series}</span>
                      <span style={pillStyle}>{item.category}</span>
                    </div>

                    <div style={bodyStyle}>{item.summary || familyNarrative(item)}</div>

                    <div style={supportBlockStyle}>
                      <strong>Why selected:</strong>
                      <div style={pillWrapStyle}>
                        {item.reasons.map((reason) => (
                          <span key={reason} style={pillStyle}>{reason}</span>
                        ))}
                      </div>
                    </div>

                    <div style={supportBlockStyle}>
                      <strong>Proposal narrative:</strong>
                      <div style={bodyStyle}>{familyNarrative(item)}</div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section style={bomPanelStyle}>
            <div style={sectionEyebrowStyle}>Primary & Endpoint BOM</div>

            {bomRows.length === 0 ? (
              <div style={emptyStyle}>No BOM items available yet.</div>
            ) : (
              <div style={tableWrapStyle}>
                <div style={tableHeaderStyle}>
                  <div>SKU</div>
                  <div>Description</div>
                  <div>Family / Series</div>
                  <div>Qty</div>
                </div>

                {bomRows.map((row) => (
                  <div
                    key={row.sku}
                    style={{
                      ...tableRowStyle,
                      ...(row.kind === "primary" ? tablePrimaryStyle : tableEndpointStyle),
                    }}
                  >
                    <div>{row.sku}</div>
                    <div>{row.name}</div>
                    <div>{row.familySeries}</div>
                    <div>{row.qty}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={ancillaryPanelStyle}>
            <div style={sectionEyebrowStyle}>Ancillary / Infrastructure BOM</div>

            {ancillaryRows.length === 0 ? (
              <div style={emptyStyle}>No ancillary items generated yet.</div>
            ) : (
              <div style={tableWrapStyle}>
                <div style={tableHeaderStyle}>
                  <div>SKU / Ref</div>
                  <div>Description</div>
                  <div>Category</div>
                  <div>Qty</div>
                </div>

                {ancillaryRows.map((row) => (
                  <div key={row.sku} style={{ ...tableRowStyle, ...tableAncillaryStyle }}>
                    <div>{row.sku}</div>
                    <div>{row.name}</div>
                    <div>{row.familySeries}</div>
                    <div>{row.qty}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>

        <aside style={railStyle}>
          <section style={railPanelStyle}>
            <div style={sectionEyebrowStyle}>Proposal Helper</div>
            <div style={bodyStyle}>
              Visual separation has been increased so each block reads as a distinct tool surface rather than one continuous page.
            </div>
            <div style={checkListStyle}>
              <div>1. executive summary zone</div>
              <div>2. requirement definition zone</div>
              <div>3. architecture zone</div>
              <div>4. infrastructure zone</div>
              <div>5. solution / BOM zone</div>
            </div>
          </section>

          <section style={railPanelStyle}>
            <div style={sectionEyebrowStyle}>Handoff Status</div>
            <div style={bigMetricStyle}>{handoff.length}</div>
            <div style={subtleTextStyle}>catalogue-selected product{handoff.length === 1 ? "" : "s"} ready for proposal use</div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function toneStyle(tone: DiagramNode["tone"]): CSSProperties {
  if (tone === "source") {
    return {
      border: "1px solid rgba(56,189,248,0.32)",
      background: "linear-gradient(180deg, rgba(8,47,73,0.78), rgba(8,30,45,0.88))",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
    };
  }
  if (tone === "core") {
    return {
      border: "1px solid rgba(249,115,22,0.32)",
      background: "linear-gradient(180deg, rgba(88,34,10,0.78), rgba(58,21,6,0.88))",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
    };
  }
  if (tone === "transport") {
    return {
      border: "1px solid rgba(168,85,247,0.32)",
      background: "linear-gradient(180deg, rgba(63,28,100,0.78), rgba(34,15,56,0.88))",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
    };
  }
  return {
    border: "1px solid rgba(34,197,94,0.32)",
    background: "linear-gradient(180deg, rgba(16,68,43,0.78), rgba(10,40,26,0.88))",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
  };
}

const pageStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 12,
  maxWidth: 1720,
  margin: "0 auto",
  color: "var(--wm-text, #e5eef8)",
};

const heroStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "start",
  gap: 12,
  flexWrap: "wrap",
  border: "1px solid rgba(96,165,250,0.18)",
  borderRadius: 16,
  padding: 16,
  background: "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(30,41,59,0.86))",
  boxShadow: "0 18px 40px rgba(2,8,23,0.24)",
};

const layoutStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 320px",
  gap: 12,
  alignItems: "start",
};

const mainStyle: CSSProperties = {
  display: "grid",
  gap: 12,
};

const railStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  alignContent: "start",
};

const basePanelStyle: CSSProperties = {
  borderRadius: 16,
  padding: 14,
  display: "grid",
  gap: 10,
  boxShadow: "0 18px 36px rgba(2,8,23,0.18)",
};

const summaryPanelStyle: CSSProperties = {
  ...basePanelStyle,
  border: "1px solid rgba(96,165,250,0.24)",
  background: "linear-gradient(180deg, rgba(15,23,42,0.86), rgba(17,24,39,0.92))",
};

const requirementsPanelStyle: CSSProperties = {
  ...basePanelStyle,
  border: "1px solid rgba(20,184,166,0.24)",
  background: "linear-gradient(180deg, rgba(7,44,46,0.82), rgba(10,27,34,0.92))",
};

const architecturePanelStyle: CSSProperties = {
  ...basePanelStyle,
  border: "1px solid rgba(249,115,22,0.24)",
  background: "linear-gradient(180deg, rgba(61,29,8,0.78), rgba(28,18,10,0.92))",
};

const networkPanelStyle: CSSProperties = {
  ...basePanelStyle,
  border: "1px solid rgba(168,85,247,0.24)",
  background: "linear-gradient(180deg, rgba(45,20,75,0.78), rgba(24,14,42,0.92))",
};

const solutionPanelStyle: CSSProperties = {
  ...basePanelStyle,
  border: "1px solid rgba(14,165,233,0.24)",
  background: "linear-gradient(180deg, rgba(11,42,63,0.78), rgba(11,24,37,0.92))",
};

const bomPanelStyle: CSSProperties = {
  ...basePanelStyle,
  border: "1px solid rgba(34,197,94,0.24)",
  background: "linear-gradient(180deg, rgba(11,52,33,0.78), rgba(10,28,18,0.92))",
};

const ancillaryPanelStyle: CSSProperties = {
  ...basePanelStyle,
  border: "1px solid rgba(245,158,11,0.24)",
  background: "linear-gradient(180deg, rgba(63,43,8,0.78), rgba(35,23,8,0.92))",
};

const railPanelStyle: CSSProperties = {
  ...basePanelStyle,
  border: "1px solid rgba(148,163,184,0.16)",
  background: "linear-gradient(180deg, rgba(15,23,42,0.88), rgba(15,23,42,0.96))",
};

const panelStyle: CSSProperties = {
  ...basePanelStyle,
  border: "1px solid rgba(148,163,184,0.16)",
  background: "linear-gradient(180deg, rgba(15,23,42,0.82), rgba(15,23,42,0.94))",
};

const cardStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 14,
  padding: 12,
  background: "linear-gradient(180deg, rgba(2,6,23,0.36), rgba(2,6,23,0.58))",
  display: "grid",
  gap: 10,
};

const infoCardStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 14,
  padding: 12,
  display: "grid",
  gap: 8,
};

const usbCardStyle: CSSProperties = {
  background: "linear-gradient(180deg, rgba(10,44,73,0.70), rgba(6,24,40,0.88))",
};

const audioCardStyle: CSSProperties = {
  background: "linear-gradient(180deg, rgba(44,24,73,0.70), rgba(22,14,42,0.88))",
};

const controlCardStyle: CSSProperties = {
  background: "linear-gradient(180deg, rgba(52,40,8,0.70), rgba(31,21,8,0.88))",
};

const infoCardTitleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
};

const notePanelStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 14,
  padding: 12,
  background: "linear-gradient(180deg, rgba(19,19,46,0.72), rgba(12,12,28,0.92))",
  display: "grid",
  gap: 6,
};

const threeColStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10,
};

const cardTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "start",
};

const buttonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,0.16)",
  background: "rgba(30,41,59,0.78)",
  color: "inherit",
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: 12,
};

const actionRowStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const pillWrapStyle: CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
  alignItems: "center",
};

const pillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 8px",
  borderRadius: 999,
  fontSize: 11,
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.10)",
};

const scorePillStyle: CSSProperties = {
  ...pillStyle,
  background: "rgba(249,115,22,0.18)",
  border: "1px solid rgba(249,115,22,0.30)",
};

const tableWrapStyle: CSSProperties = {
  display: "grid",
  gap: 4,
};

const tableHeaderStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "180px 1.5fr 1fr 80px",
  gap: 8,
  padding: "6px 8px",
  fontSize: 12,
  opacity: 0.8,
};

const tableRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "180px 1.5fr 1fr 80px",
  gap: 8,
  padding: "10px 8px",
  borderRadius: 10,
  fontSize: 13,
  border: "1px solid rgba(255,255,255,0.08)",
};

const tablePrimaryStyle: CSSProperties = {
  background: "linear-gradient(180deg, rgba(14,58,40,0.72), rgba(9,31,22,0.86))",
};

const tableEndpointStyle: CSSProperties = {
  background: "linear-gradient(180deg, rgba(19,49,83,0.72), rgba(8,24,42,0.86))",
};

const tableAncillaryStyle: CSSProperties = {
  background: "linear-gradient(180deg, rgba(70,49,11,0.72), rgba(38,27,10,0.88))",
};

const titleStyle: CSSProperties = {
  margin: "4px 0 0",
  fontSize: 28,
  lineHeight: 1.05,
};

const eyebrowStyle: CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 1.4,
  opacity: 0.72,
};

const sectionEyebrowStyle: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 1,
  opacity: 0.76,
  fontWeight: 800,
};

const skuStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 800,
};

const nameStyle: CSSProperties = {
  fontSize: 14,
  opacity: 0.92,
};

const bodyStyle: CSSProperties = {
  fontSize: 13,
  lineHeight: 1.5,
  opacity: 0.9,
};

const subtleTextStyle: CSSProperties = {
  fontSize: 12,
  lineHeight: 1.45,
  opacity: 0.74,
};

const supportBlockStyle: CSSProperties = {
  display: "grid",
  gap: 6,
};

const emptyStyle: CSSProperties = {
  fontSize: 13,
  opacity: 0.72,
};

const bigMetricStyle: CSSProperties = {
  fontSize: 34,
  fontWeight: 800,
  lineHeight: 1,
};

const checkListStyle: CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 13,
  opacity: 0.88,
};

const metricStripStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 8,
};

const metricCardStyle: CSSProperties = {
  borderRadius: 14,
  padding: 12,
  border: "1px solid rgba(255,255,255,0.10)",
  display: "grid",
  gap: 6,
};

const metricBlueStyle: CSSProperties = {
  background: "linear-gradient(180deg, rgba(29,78,216,0.34), rgba(15,23,42,0.76))",
};

const metricCyanStyle: CSSProperties = {
  background: "linear-gradient(180deg, rgba(8,145,178,0.34), rgba(15,23,42,0.76))",
};

const metricGreenStyle: CSSProperties = {
  background: "linear-gradient(180deg, rgba(22,163,74,0.34), rgba(15,23,42,0.76))",
};

const metricOrangeStyle: CSSProperties = {
  background: "linear-gradient(180deg, rgba(234,88,12,0.34), rgba(15,23,42,0.76))",
};

const metricPurpleStyle: CSSProperties = {
  background: "linear-gradient(180deg, rgba(147,51,234,0.34), rgba(15,23,42,0.76))",
};

const metricSlateStyle: CSSProperties = {
  background: "linear-gradient(180deg, rgba(71,85,105,0.38), rgba(15,23,42,0.76))",
};

const metricAmberStyle: CSSProperties = {
  background: "linear-gradient(180deg, rgba(245,158,11,0.34), rgba(15,23,42,0.76))",
};

const metricTealStyle: CSSProperties = {
  background: "linear-gradient(180deg, rgba(13,148,136,0.34), rgba(15,23,42,0.76))",
};

const metricLabelStyle: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 0.9,
  opacity: 0.78,
};

const metricValueStyle: CSSProperties = {
  fontSize: 18,
  lineHeight: 1.2,
};

const diagramShellStyle: CSSProperties = {
  display: "grid",
  gap: 12,
};

const diagramGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 86px 1.15fr 86px 1fr",
  gap: 10,
  alignItems: "stretch",
};

const diagramColumnStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  alignContent: "start",
};

const diagramColumnHeaderStyle: CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 1,
  opacity: 0.8,
  fontWeight: 800,
};

const diagramNodeStackStyle: CSSProperties = {
  display: "grid",
  gap: 8,
};

const diagramNodeStyle: CSSProperties = {
  borderRadius: 14,
  padding: 10,
  display: "grid",
  gap: 4,
  minHeight: 78,
};

const diagramNodeTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  alignItems: "start",
};

const diagramNodeTitleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
};

const diagramNodeSubStyle: CSSProperties = {
  fontSize: 12,
  lineHeight: 1.4,
  opacity: 0.86,
};

const diagramNodeRoleStyle: CSSProperties = {
  fontSize: 11,
  opacity: 0.76,
};

const qtyBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 28,
  height: 22,
  borderRadius: 999,
  fontSize: 11,
  background: "rgba(255,255,255,0.10)",
  border: "1px solid rgba(255,255,255,0.12)",
};

const diagramArrowColumnStyle: CSSProperties = {
  display: "grid",
  alignContent: "center",
  justifyItems: "center",
  gap: 8,
};

const diagramArrowStyle: CSSProperties = {
  fontSize: 28,
  opacity: 0.78,
  lineHeight: 1,
};

const diagramLineLabelStyle: CSSProperties = {
  fontSize: 11,
  opacity: 0.74,
  textAlign: "center",
  lineHeight: 1.35,
};

const diagramTransportBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  background: "rgba(249,115,22,0.20)",
  border: "1px solid rgba(249,115,22,0.30)",
  width: "fit-content",
};

const legendWrapStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  borderTop: "1px solid rgba(255,255,255,0.10)",
  paddingTop: 10,
};

const legendTitleStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  opacity: 0.86,
};

const legendSourceStyle: CSSProperties = {
  background: "rgba(56,189,248,0.14)",
  border: "1px solid rgba(56,189,248,0.28)",
};

const legendCoreStyle: CSSProperties = {
  background: "rgba(249,115,22,0.14)",
  border: "1px solid rgba(249,115,22,0.28)",
};

const legendTransportStyle: CSSProperties = {
  background: "rgba(168,85,247,0.14)",
  border: "1px solid rgba(168,85,247,0.28)",
};

const legendOutputStyle: CSSProperties = {
  background: "rgba(34,197,94,0.14)",
  border: "1px solid rgba(34,197,94,0.28)",
};