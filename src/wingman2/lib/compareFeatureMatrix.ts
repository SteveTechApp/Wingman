import type { CompareDecisionProfile, CompareSpecFacts } from "./competitorCompareDecision";

export type CompareFeatureMatrixStatus = "match" | "miss" | "partial" | "extra";
export type CompareFeatureValueKind = "boolean" | "quantity" | "categorical";

export type CompareFeatureMatrixRow = {
  id: string;
  group: "Core" | "I/O" | "USB" | "Audio" | "Control" | "Signal" | "Power" | "Special" | "Data";
  label: string;
  kind: CompareFeatureValueKind;
  competitorValue: string;
  wyrestormValue: string;
  status: CompareFeatureMatrixStatus;
  note: string;
};

type FeatureDefinition = {
  key: string;
  label: string;
  group: CompareFeatureMatrixRow["group"];
};

const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  { key: "usbRouting", label: "USB / KVM routing", group: "USB" },
  { key: "usbC", label: "USB-C", group: "USB" },
  { key: "dante", label: "Dante audio", group: "Audio" },
  { key: "aes67", label: "AES67 audio", group: "Audio" },
  { key: "audioDeEmbed", label: "Audio de-embed", group: "Audio" },
  { key: "audioEmbed", label: "Audio embed", group: "Audio" },
  { key: "control", label: "Control connections", group: "Control" },
  { key: "wireless", label: "Wireless presentation", group: "Special" },
  { key: "multiview", label: "Multiview", group: "Special" },
  { key: "videoWall", label: "Video wall", group: "Special" },
  { key: "hdbtOutput", label: "HDBaseT output", group: "Special" },
  { key: "receiverKit", label: "Receiver kit", group: "Special" },
  { key: "tenGig", label: "10G network class", group: "Special" },
  { key: "zeroLatency", label: "Zero latency", group: "Special" },
  { key: "lossless", label: "Lossless transport", group: "Special" },
];

const ROLE_EQUIVALENTS: Record<string, string[]> = {
  encoder: ["transmitter", "source endpoint", "tx"],
  decoder: ["receiver", "display endpoint", "rx"],
  transmitter: ["encoder", "source endpoint", "tx"],
  receiver: ["decoder", "display endpoint", "rx"],
  transceiver: ["encoder", "decoder", "transmitter", "receiver", "encoder/decoder", "trx"],
  matrix: ["matrix switcher"],
  switcher: ["presentation switcher", "presentation scaler", "room switcher"],
  controller: ["control processor", "control module"],
  "presentation switcher": ["presentation scaler", "room switcher", "collaboration switcher", "switcher"],
  "video wall processor": ["wall processor", "videowall processor"],
  "multiview processor": ["windowing processor", "multi-view processor"],
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function lower(value: unknown): string {
  return clean(value).toLowerCase();
}

function display(value: unknown): string {
  const text = clean(value);
  return text || "Unknown";
}

function yesNo(value: boolean | undefined): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "Unknown";
}

function hasOwnFeature(profile: CompareDecisionProfile, key: string): boolean {
  return Boolean(profile.features && Object.prototype.hasOwnProperty.call(profile.features, key));
}

function featureValue(profile: CompareDecisionProfile, key: string): boolean | undefined {
  const specValue = specBoolean(profile.specs, key);
  if (specValue !== undefined) return specValue;
  if (!hasOwnFeature(profile, key)) return undefined;
  return profile.features?.[key] === true;
}

function specBoolean(specs: CompareSpecFacts | undefined, key: string): boolean | undefined {
  if (!specs) return undefined;

  const map: Record<string, keyof CompareSpecFacts> = {
    dante: "dante",
    aes67: "aes67",
    audioDeEmbed: "audioDeEmbed",
    audioEmbed: "audioEmbed",
    control: "controlPorts",
    poe: "poe",
    poc: "poc",
    poh: "poh",
  };
  const specKey = map[key] ?? key;
  const value = specs[specKey as keyof CompareSpecFacts];

  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return undefined;
}

function numberValue(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function specQuantity(profile: CompareDecisionProfile, key: keyof CompareSpecFacts): number | null {
  return numberValue(profile.specs?.[key]);
}

function normaliseRole(value: unknown): string {
  const role = lower(value);

  for (const [canonical, equivalents] of Object.entries(ROLE_EQUIVALENTS)) {
    if (role === canonical || equivalents.includes(role)) return canonical;
  }

  return role;
}

function rolesMatch(competitorRole: unknown, wyrestormRole: unknown): boolean {
  const competitor = normaliseRole(competitorRole);
  const wyrestorm = normaliseRole(wyrestormRole);

  if (!competitor || !wyrestorm) return false;
  if (competitor === wyrestorm) return true;

  const competitorEquivalents = ROLE_EQUIVALENTS[competitor] ?? [];
  const wyrestormEquivalents = ROLE_EQUIVALENTS[wyrestorm] ?? [];

  return competitorEquivalents.includes(wyrestorm) || wyrestormEquivalents.includes(competitor);
}

function transportTokens(value: unknown): string[] {
  return lower(value)
    .replace(/av over ip/g, "avoip")
    .replace(/av-over-ip/g, "avoip")
    .replace(/hdbaset/g, "hdbt")
    .replace(/hdbase t/g, "hdbt")
    .replace(/usb-c/g, "usbc")
    .replace(/usb c/g, "usbc")
    .split(/[^a-z0-9]+/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 1 && !["and", "with", "plus", "output", "outputs", "input", "inputs"].includes(item));
}

function transportsMatch(competitorTransport: unknown, wyrestormTransport: unknown): boolean {
  const competitor = transportTokens(competitorTransport);
  const wyrestorm = new Set(transportTokens(wyrestormTransport));

  if (!competitor.length || !wyrestorm.size) return false;

  return competitor.every((token) => wyrestorm.has(token));
}

function resolutionRank(value: unknown): number {
  const text = lower(value);

  if (/8k|4320/.test(text)) return 5;
  if (/4k60|2160p60|uhd.*60/.test(text)) return 4;
  if (/4k30|2160p30|uhd|4k/.test(text)) return 3;
  if (/1080p|1920/.test(text)) return 2;
  if (/720p/.test(text)) return 1;

  return 0;
}

function chromaRank(value: unknown): number {
  const text = lower(value);

  if (/4:4:4/.test(text)) return 3;
  if (/4:2:2/.test(text)) return 2;
  if (/4:2:0/.test(text)) return 1;

  return 0;
}

function compareCategoricalRow(
  id: string,
  group: CompareFeatureMatrixRow["group"],
  label: string,
  competitorValue: unknown,
  wyrestormValue: unknown,
  matches: (competitor: unknown, wyrestorm: unknown) => boolean,
): CompareFeatureMatrixRow {
  const competitorText = clean(competitorValue);
  const wyrestormText = clean(wyrestormValue);

  if (!competitorText || !wyrestormText) {
    return {
      id,
      group,
      label,
      kind: "categorical",
      competitorValue: display(competitorValue),
      wyrestormValue: display(wyrestormValue),
      status: "partial",
      note: "Needs confirmed source data.",
    };
  }

  const status: CompareFeatureMatrixStatus = matches(competitorValue, wyrestormValue) ? "match" : "miss";

  return {
    id,
    group,
    label,
    kind: "categorical",
    competitorValue: display(competitorValue),
    wyrestormValue: display(wyrestormValue),
    status,
    note: status === "match" ? "Aligned." : "Different requirement.",
  };
}

function compareQuantityRow(
  id: string,
  group: CompareFeatureMatrixRow["group"],
  label: string,
  competitorValue: unknown,
  wyrestormValue: unknown,
): CompareFeatureMatrixRow {
  const competitorCount = numberValue(competitorValue);
  const wyrestormCount = numberValue(wyrestormValue);

  if (competitorCount === null || wyrestormCount === null) {
    return {
      id,
      group,
      label,
      kind: "quantity",
      competitorValue: competitorCount === null ? "Unknown" : String(competitorCount),
      wyrestormValue: wyrestormCount === null ? "Unknown" : String(wyrestormCount),
      status: "partial",
      note: "Count needs datasheet confirmation.",
    };
  }

  const status: CompareFeatureMatrixStatus = wyrestormCount >= competitorCount ? "match" : "miss";

  return {
    id,
    group,
    label,
    kind: "quantity",
    competitorValue: String(competitorCount),
    wyrestormValue: String(wyrestormCount),
    status,
    note: status === "match" ? "WyreStorm meets/exceeds count." : "WyreStorm count is lower.",
  };
}

function compareRankedRow(
  id: string,
  label: string,
  competitorValue: unknown,
  wyrestormValue: unknown,
  rank: (value: unknown) => number,
): CompareFeatureMatrixRow {
  const competitorRank = rank(competitorValue);
  const wyrestormRank = rank(wyrestormValue);

  if (competitorRank === 0 || wyrestormRank === 0) {
    return {
      id,
      group: "Signal",
      label,
      kind: "categorical",
      competitorValue: display(competitorValue),
      wyrestormValue: display(wyrestormValue),
      status: "partial",
      note: "Capability needs source confirmation.",
    };
  }

  const status: CompareFeatureMatrixStatus = wyrestormRank >= competitorRank ? "match" : "miss";

  return {
    id,
    group: "Signal",
    label,
    kind: "categorical",
    competitorValue: display(competitorValue),
    wyrestormValue: display(wyrestormValue),
    status,
    note: status === "match" ? "WyreStorm meets/exceeds capability." : "WyreStorm is below competitor capability.",
  };
}

function compareBooleanRow(
  id: string,
  group: CompareFeatureMatrixRow["group"],
  label: string,
  competitorHas: boolean | undefined,
  wyrestormHas: boolean | undefined,
): CompareFeatureMatrixRow {
  if (competitorHas === true && wyrestormHas === true) {
    return {
      id,
      group,
      label,
      kind: "boolean",
      competitorValue: "Yes",
      wyrestormValue: "Yes",
      status: "match",
      note: "Present on both.",
    };
  }

  if (competitorHas === true && wyrestormHas === false) {
    return {
      id,
      group,
      label,
      kind: "boolean",
      competitorValue: "Yes",
      wyrestormValue: "No",
      status: "miss",
      note: "Competitor has this; WyreStorm profile does not.",
    };
  }

  if (competitorHas === true && wyrestormHas === undefined) {
    return {
      id,
      group,
      label,
      kind: "boolean",
      competitorValue: "Yes",
      wyrestormValue: "Unknown",
      status: "partial",
      note: "Confirm WyreStorm datasheet.",
    };
  }

  if (competitorHas === false && wyrestormHas === false) {
    return {
      id,
      group,
      label,
      kind: "boolean",
      competitorValue: "No",
      wyrestormValue: "No",
      status: "match",
      note: "Not required on either profile.",
    };
  }

  if (wyrestormHas === true) {
    return {
      id,
      group,
      label,
      kind: "boolean",
      competitorValue: yesNo(competitorHas),
      wyrestormValue: "Yes",
      status: "extra",
      note: "WyreStorm includes this additional capability.",
    };
  }

  return {
    id,
    group,
    label,
    kind: "boolean",
    competitorValue: yesNo(competitorHas),
    wyrestormValue: yesNo(wyrestormHas),
    status: "partial",
    note: "Needs source confirmation.",
  };
}

function compareFeatureRow(
  definition: FeatureDefinition,
  competitor: CompareDecisionProfile,
  wyrestorm: CompareDecisionProfile,
): CompareFeatureMatrixRow | null {
  const competitorKnown = hasOwnFeature(competitor, definition.key) || specBoolean(competitor.specs, definition.key) !== undefined;
  const wyrestormKnown = hasOwnFeature(wyrestorm, definition.key) || specBoolean(wyrestorm.specs, definition.key) !== undefined;

  if (!competitorKnown && !wyrestormKnown) return null;

  return compareBooleanRow(
    `feature-${definition.key}`,
    definition.group,
    definition.label,
    featureValue(competitor, definition.key),
    featureValue(wyrestorm, definition.key),
  );
}

function sourceValue(profile: CompareDecisionProfile): string {
  return profile.sourceLabel || profile.specTier || profile.sourceTier || "Unknown";
}

function groupOrder(group: CompareFeatureMatrixRow["group"]): number {
  return {
    Core: 0,
    "I/O": 1,
    USB: 2,
    Audio: 3,
    Control: 4,
    Signal: 5,
    Power: 6,
    Special: 7,
    Data: 8,
  }[group];
}

export function buildCompareFeatureMatrixRows(
  competitor: CompareDecisionProfile,
  wyrestorm: CompareDecisionProfile,
): CompareFeatureMatrixRow[] {
  const rows: CompareFeatureMatrixRow[] = [
    compareCategoricalRow("productClass", "Core", "Product class", competitor.domain, wyrestorm.domain, (left, right) => lower(left) === lower(right)),
    compareCategoricalRow("role", "Core", "Product role", competitor.role, wyrestorm.role, rolesMatch),
    compareCategoricalRow("transport", "Core", "Transport", competitor.transport, wyrestorm.transport, transportsMatch),
    compareQuantityRow("hdmiInputs", "I/O", "HDMI inputs", specQuantity(competitor, "hdmiInputs") ?? competitor.inputCount, specQuantity(wyrestorm, "hdmiInputs") ?? wyrestorm.inputCount),
    compareQuantityRow("hdmiOutputs", "I/O", "HDMI outputs", specQuantity(competitor, "hdmiOutputs") ?? competitor.outputCount, specQuantity(wyrestorm, "hdmiOutputs") ?? wyrestorm.outputCount),
    compareQuantityRow("usbHostPorts", "USB", "USB host ports", specQuantity(competitor, "usbHostPorts"), specQuantity(wyrestorm, "usbHostPorts")),
    compareQuantityRow("usbDevicePorts", "USB", "USB device ports", specQuantity(competitor, "usbDevicePorts"), specQuantity(wyrestorm, "usbDevicePorts")),
    compareQuantityRow("usbTotalPorts", "USB", "USB total ports", specQuantity(competitor, "usbTotalPorts"), specQuantity(wyrestorm, "usbTotalPorts")),
    compareQuantityRow("audioInputs", "Audio", "Audio inputs", specQuantity(competitor, "audioInputs"), specQuantity(wyrestorm, "audioInputs")),
    compareQuantityRow("audioOutputs", "Audio", "Audio outputs", specQuantity(competitor, "audioOutputs"), specQuantity(wyrestorm, "audioOutputs")),
    compareQuantityRow("networkPorts", "Control", "Network / LAN ports", specQuantity(competitor, "networkPorts"), specQuantity(wyrestorm, "networkPorts")),
    compareQuantityRow("controlPorts", "Control", "Control ports", specQuantity(competitor, "controlPorts"), specQuantity(wyrestorm, "controlPorts")),
    compareBooleanRow("rs232", "Control", "RS-232", competitor.specs?.rs232, wyrestorm.specs?.rs232),
    compareBooleanRow("ir", "Control", "IR", competitor.specs?.ir, wyrestorm.specs?.ir),
    compareBooleanRow("cec", "Control", "CEC", competitor.specs?.cec, wyrestorm.specs?.cec),
    compareBooleanRow("relay", "Control", "Relay / GPIO", competitor.specs?.relay || competitor.specs?.gpio, wyrestorm.specs?.relay || wyrestorm.specs?.gpio),
    compareBooleanRow("arc", "Audio", "ARC / eARC", competitor.specs?.arc || competitor.specs?.earc, wyrestorm.specs?.arc || wyrestorm.specs?.earc),
    compareRankedRow("resolution", "Resolution", competitor.maxResolution, wyrestorm.maxResolution, resolutionRank),
    compareRankedRow("chroma", "Chroma", competitor.chroma, wyrestorm.chroma, chromaRank),
    compareBooleanRow("powerPoe", "Power", "PoE", competitor.specs?.poe ?? featureValue(competitor, "poe"), wyrestorm.specs?.poe ?? featureValue(wyrestorm, "poe")),
    compareBooleanRow("powerPoc", "Power", "PoC", competitor.specs?.poc ?? featureValue(competitor, "poc"), wyrestorm.specs?.poc ?? featureValue(wyrestorm, "poc")),
    compareBooleanRow("powerPoh", "Power", "PoH", competitor.specs?.poh ?? featureValue(competitor, "poh"), wyrestorm.specs?.poh ?? featureValue(wyrestorm, "poh")),
    compareBooleanRow("externalPsu", "Power", "External PSU", competitor.specs?.externalPsu, wyrestorm.specs?.externalPsu),
    compareCategoricalRow("powerSupply", "Power", "Power supply", competitor.specs?.powerSupply, wyrestorm.specs?.powerSupply, (left, right) => lower(left) === lower(right)),
    ...FEATURE_DEFINITIONS
      .map((definition) => compareFeatureRow(definition, competitor, wyrestorm))
      .filter((row): row is CompareFeatureMatrixRow => Boolean(row)),
    compareCategoricalRow("dataSource", "Data", "Spec source tier", sourceValue(competitor), sourceValue(wyrestorm), () => true),
  ];

  return rows
    .filter((row, index, list) => list.findIndex((candidate) => candidate.id === row.id) === index)
    .sort((a, b) => groupOrder(a.group) - groupOrder(b.group));
}
