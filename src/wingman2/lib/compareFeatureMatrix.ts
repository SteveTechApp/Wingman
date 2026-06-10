import type { CompareDecisionProfile } from "./competitorCompareDecision";

export type CompareFeatureMatrixStatus = "match" | "miss" | "partial" | "extra";
export type CompareFeatureValueKind = "boolean" | "quantity" | "categorical";

export type CompareFeatureMatrixRow = {
  id: string;
  group: "Core" | "I/O" | "USB" | "Audio" | "Control" | "Signal" | "Power" | "Special";
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
  { key: "usbRouting", label: "USB ports / hosts / devices", group: "USB" },
  { key: "usbC", label: "USB-C", group: "USB" },
  { key: "dante", label: "Dante audio", group: "Audio" },
  { key: "aes67", label: "AES67 audio", group: "Audio" },
  { key: "control", label: "Control connections", group: "Control" },
  { key: "poe", label: "PoE / remote power", group: "Power" },
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
  controller: ["control processor", "control module"],
  "presentation switcher": ["presentation scaler", "room switcher", "collaboration switcher"],
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
  if (!hasOwnFeature(profile, key)) return undefined;
  return profile.features?.[key] === true;
}

function numberValue(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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
      note: "One side is not confirmed in the available product profile.",
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
    note: status === "match" ? "Same functional requirement." : "Different product requirement.",
  };
}

function compareQuantityRow(
  id: string,
  label: string,
  competitorValue: unknown,
  wyrestormValue: unknown,
): CompareFeatureMatrixRow {
  const competitorCount = numberValue(competitorValue);
  const wyrestormCount = numberValue(wyrestormValue);

  if (competitorCount === null || wyrestormCount === null) {
    return {
      id,
      group: "I/O",
      label,
      kind: "quantity",
      competitorValue: competitorCount === null ? "Unknown" : String(competitorCount),
      wyrestormValue: wyrestormCount === null ? "Unknown" : String(wyrestormCount),
      status: "partial",
      note: "Count must be confirmed before this can be treated as equivalent.",
    };
  }

  const status: CompareFeatureMatrixStatus = wyrestormCount >= competitorCount ? "match" : "miss";

  return {
    id,
    group: "I/O",
    label,
    kind: "quantity",
    competitorValue: String(competitorCount),
    wyrestormValue: String(wyrestormCount),
    status,
    note: status === "match" ? "WyreStorm meets or exceeds the competitor count." : "WyreStorm has fewer confirmed ports.",
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
      note: "Signal capability is not fully confirmed in the available data.",
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
    note: status === "match" ? "WyreStorm meets or exceeds the competitor capability." : "WyreStorm is below the competitor capability.",
  };
}

function compareFeatureRow(
  definition: FeatureDefinition,
  competitor: CompareDecisionProfile,
  wyrestorm: CompareDecisionProfile,
): CompareFeatureMatrixRow | null {
  const competitorKnown = hasOwnFeature(competitor, definition.key);
  const wyrestormKnown = hasOwnFeature(wyrestorm, definition.key);
  const competitorHas = featureValue(competitor, definition.key);
  const wyrestormHas = featureValue(wyrestorm, definition.key);

  if (!competitorKnown && !wyrestormKnown) return null;

  if (competitorHas === true && wyrestormHas === true) {
    return {
      id: `feature-${definition.key}`,
      group: definition.group,
      label: definition.label,
      kind: "boolean",
      competitorValue: "Yes",
      wyrestormValue: "Yes",
      status: "match",
      note: "Required feature is confirmed on both products.",
    };
  }

  if (competitorHas === true && wyrestormHas === false) {
    return {
      id: `feature-${definition.key}`,
      group: definition.group,
      label: definition.label,
      kind: "boolean",
      competitorValue: "Yes",
      wyrestormValue: "No",
      status: "miss",
      note: "Competitor has this feature and the WyreStorm candidate is marked without it.",
    };
  }

  if (competitorHas === true && wyrestormHas === undefined) {
    return {
      id: `feature-${definition.key}`,
      group: definition.group,
      label: definition.label,
      kind: "boolean",
      competitorValue: "Yes",
      wyrestormValue: "Unknown",
      status: "partial",
      note: "Competitor requires this feature; WyreStorm data needs confirmation.",
    };
  }

  if (competitorKnown && competitorHas === false && wyrestormHas === false) {
    return {
      id: `feature-${definition.key}`,
      group: definition.group,
      label: definition.label,
      kind: "boolean",
      competitorValue: "No",
      wyrestormValue: "No",
      status: "match",
      note: "Neither profile lists this as a requirement.",
    };
  }

  if (wyrestormHas === true) {
    return {
      id: `feature-${definition.key}`,
      group: definition.group,
      label: definition.label,
      kind: "boolean",
      competitorValue: yesNo(competitorHas),
      wyrestormValue: "Yes",
      status: "extra",
      note: "WyreStorm includes this, but it is not confirmed as a competitor requirement.",
    };
  }

  return {
    id: `feature-${definition.key}`,
    group: definition.group,
    label: definition.label,
    kind: "boolean",
    competitorValue: yesNo(competitorHas),
    wyrestormValue: yesNo(wyrestormHas),
    status: "partial",
    note: "Feature presence should be checked against datasheets.",
  };
}

export function buildCompareFeatureMatrixRows(
  competitor: CompareDecisionProfile,
  wyrestorm: CompareDecisionProfile,
): CompareFeatureMatrixRow[] {
  return [
    compareCategoricalRow("productClass", "Core", "Product class", competitor.domain, wyrestorm.domain, (left, right) => lower(left) === lower(right)),
    compareCategoricalRow("role", "Core", "Product role", competitor.role, wyrestorm.role, rolesMatch),
    compareCategoricalRow("transport", "Core", "Transport", competitor.transport, wyrestorm.transport, transportsMatch),
    compareQuantityRow("hdmiInputs", "HDMI inputs", competitor.inputCount, wyrestorm.inputCount),
    compareQuantityRow("hdmiOutputs", "HDMI outputs", competitor.outputCount, wyrestorm.outputCount),
    compareRankedRow("resolution", "Resolution", competitor.maxResolution, wyrestorm.maxResolution, resolutionRank),
    compareRankedRow("chroma", "Chroma", competitor.chroma, wyrestorm.chroma, chromaRank),
    ...FEATURE_DEFINITIONS
      .map((definition) => compareFeatureRow(definition, competitor, wyrestorm))
      .filter((row): row is CompareFeatureMatrixRow => Boolean(row)),
  ];
}
