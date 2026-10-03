import type { StoredProject, StoredRequirementRecord, StoredRequirementStatus } from "../data/projectStore";

type RequirementSeed = {
  id: string;
  label: string;
  value: string;
  category: string;
  source: string;
  whyItMatters: string;
};

function nowIso() {
  return new Date().toISOString();
}

function textValue(value: unknown, fallback = "Not confirmed") {
  if (Array.isArray(value)) {
    const text = value.map((item) => String(item ?? "").trim()).filter(Boolean).join(", ");
    return text || fallback;
  }

  const text = String(value ?? "").trim();
  return text || fallback;
}

function statusForValue(value: string): StoredRequirementStatus {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "not confirmed" || normalized === "unknown" || normalized === "not sure") {
    return "unknown";
  }

  if (normalized.includes("unknown") || normalized.includes("not confirmed") || normalized.includes("not sure")) {
    return "unknown";
  }

  return "confirmed";
}

function record(seed: RequirementSeed, updatedAt: string): StoredRequirementRecord {
  return {
    ...seed,
    status: statusForValue(seed.value),
    updatedAt,
  };
}

export function buildRequirementRecordsFromProject(project: StoredProject): StoredRequirementRecord[] {
  const timestamp = nowIso();
  const roomModel = project.discoveryBrief?.roomModel ?? {};
  const inference = project.discoveryBrief?.inference ?? {};
  const seeds: RequirementSeed[] = [
    {
      id: "application",
      label: "Application / room type",
      value: textValue(roomModel.roomType, project.name),
      category: "Application",
      source: "Discovery",
      whyItMatters: "Application narrows the architecture before product selection starts.",
    },
    {
      id: "room-size",
      label: "Room or venue size",
      value: textValue(roomModel.roomSize),
      category: "Application",
      source: "Discovery",
      whyItMatters: "Room scale influences distance, transport, display count, and complexity.",
    },
    {
      id: "source-count",
      label: "Source count",
      value: textValue(roomModel.sourceCount),
      category: "Sources",
      source: "Discovery",
      whyItMatters: "Source count drives switcher, encoder, matrix, and input requirements.",
    },
    {
      id: "source-connections",
      label: "Source connections",
      value: textValue(roomModel.sourceConnections),
      category: "Sources",
      source: "Discovery",
      whyItMatters: "Connector type determines whether HDMI, USB-C, network, wireless, or USB transport is needed.",
    },
    {
      id: "display-count",
      label: "Display/output count",
      value: textValue(roomModel.displayCount),
      category: "Displays",
      source: "Discovery",
      whyItMatters: "Display count drives receiver, decoder, output, and wall processing requirements.",
    },
    {
      id: "display-behaviour",
      label: "Display behaviour",
      value: textValue(roomModel.displayBehaviour || roomModel.displayArrangement),
      category: "Displays",
      source: "Discovery",
      whyItMatters: "Display behaviour separates simple distribution from matrix, multiview, wall, or AVoIP designs.",
    },
    {
      id: "usb-transport",
      label: "USB / conferencing transport",
      value: textValue(roomModel.usbTransport),
      category: "USB",
      source: "Discovery",
      whyItMatters: "USB host/device direction and bandwidth often change the correct product family.",
    },
    {
      id: "signal-distance",
      label: "Longest signal run",
      value: textValue(roomModel.longestRun),
      category: "Infrastructure",
      source: "Discovery",
      whyItMatters: "Distance decides whether HDMI is enough or extension, fibre, or AV-over-IP is needed.",
    },
    {
      id: "network",
      label: "Network path",
      value: textValue(roomModel.networkAvailability),
      category: "Infrastructure",
      source: "Discovery",
      whyItMatters: "Network availability affects NetworkHD, NDI, control, streaming, and multi-zone viability.",
    },
    {
      id: "audio",
      label: "Audio requirements",
      value: textValue(roomModel.audioNeeds),
      category: "Audio",
      source: "Discovery",
      whyItMatters: "Audio can add DSP, amplifier, Dante/AES67, de-embed, or conferencing dependencies.",
    },
    {
      id: "control",
      label: "Control requirements",
      value: textValue(roomModel.controlNeeds),
      category: "Control",
      source: "Discovery",
      whyItMatters: "Control ownership affects APIs, RS-232, presets, display power, and commissioning.",
    },
    {
      id: "architecture",
      label: "Inferred architecture",
      value: textValue(inference.architecture),
      category: "Architecture",
      source: "Wingman inference",
      whyItMatters: "The inferred architecture is the bridge between requirements and SKU/BOM selection.",
    },
  ];

  const ingestRequirements = project.ingest?.requirements?.slice(0, 10).map((item, index): RequirementSeed => ({
    id: `document-requirement-${index + 1}`,
    label: `Document requirement ${index + 1}`,
    value: item,
    category: "Imported",
    source: "Document Ingest",
    whyItMatters: "Imported customer requirements should be reviewed before they drive product selection.",
  })) ?? [];

  const ingestUnknowns = project.ingest?.unknowns?.slice(0, 10).map((item, index): RequirementSeed => ({
    id: `document-unknown-${index + 1}`,
    label: `Document unknown ${index + 1}`,
    value: item,
    category: "Validation",
    source: "Document Ingest",
    whyItMatters: "Unknowns should stay visible so Wingman does not overstate recommendation confidence.",
  })) ?? [];

  return [...seeds, ...ingestRequirements, ...ingestUnknowns].map((seed) => record(seed, timestamp));
}

export function getProjectRequirementRecords(project: StoredProject) {
  return project.requirements?.length ? project.requirements : buildRequirementRecordsFromProject(project);
}

export function requirementReadiness(requirements: StoredRequirementRecord[]) {
  const confirmed = requirements.filter((item) => item.status === "confirmed").length;
  const review = requirements.filter((item) => item.status === "review").length;
  const unknown = requirements.filter((item) => item.status === "unknown").length;
  const total = Math.max(1, requirements.length);
  const score = Math.round((confirmed / total) * 100);

  return {
    confirmed,
    review,
    unknown,
    score,
    total: requirements.length,
  };
}
