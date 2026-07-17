import governedTechnicalProfiles from "../../../data/governance/wyrestorm-technical-profiles.json";
import type {
  ProductSpec,
  ProductTechnicalDataSummary,
} from "./productStoryEngine";
import type {
  CompareDecisionProfile,
  CompareSpecFacts,
} from "./competitorCompareDecision";

type UnknownRecord = Record<string, unknown>;

type TechnicalPort = {
  count?: number;
  connector?: string;
  direction?: string;
  category?: string;
  detail?: string;
  evidence?: string;
};

type TechnicalEvidence = {
  sourceType?: string;
  sourceUrl?: string;
  reviewedOn?: string;
  reviewer?: string;
  note?: string;
};

type GovernedProfileRecord = {
  sku: string;
  status: "verified" | "verified-with-warning" | "review-required";
  productClass: string;
  role: string;
  productType: string;
  transport: string[];
  maxResolution?: string;
  chroma?: string;
  latency?: string;
  inputCount?: number;
  outputCount?: number;
  ports: TechnicalPort[];
  video?: string[];
  audio?: string[];
  usb?: string[];
  network?: string[];
  control?: string[];
  power?: string[];
  physical?: string[];
  dependencies: string[];
  compatibleFamilies?: string[];
  features?: Record<string, boolean | string | number>;
  specs?: CompareSpecFacts;
  checks: string[];
  warnings: string[];
  evidence: TechnicalEvidence[];
};

export type ResolvedProductTechnicalData = {
  sku: string;
  productType: string;
  productClass?: string;
  role?: string;
  transport: string[];
  maxResolution?: string;
  chroma?: string;
  latency?: string;
  inputCount?: number;
  outputCount?: number;
  ioSummary: string[];
  video: string[];
  audio: string[];
  usb: string[];
  network: string[];
  control: string[];
  power: string[];
  physical: string[];
  dependencies: string[];
  compatibleFamilies: string[];
  checks: string[];
  evidence: string[];
  warnings: string[];
  missingFields: string[];
  completeness: number;
  compareReady: boolean;
  sourceTier: NonNullable<CompareDecisionProfile["sourceTier"]>;
  sourceUrl?: string;
  statusLabel: string;
  compare: {
    domain?: string;
    role?: string;
    transport?: string;
    inputCount?: number;
    outputCount?: number;
    maxResolution?: string;
    chroma?: string;
    latency?: string;
    features?: Record<string, boolean | undefined>;
    specs: CompareSpecFacts;
  };
};

const PLACEHOLDER_PATTERNS = [
  /not yet confirmed/i,
  /not yet fully confirmed/i,
  /must be confirmed/i,
  /not applicable/i,
  /product description not yet available/i,
  /application fit not yet classified/i,
  /confirm source count, display count/i,
];

const exactProfiles = new Map(
  (governedTechnicalProfiles.profiles as unknown as GovernedProfileRecord[]).map((profile) => [
    normaliseSku(profile.sku),
    profile,
  ]),
);

function asRecord(value: unknown): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as UnknownRecord;
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(asList).map((item) => item.trim()).filter(Boolean);
  }

  const text = asText(value);
  if (!text) return [];

  return text
    .split(/\r?\n|;|\|/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(values: Array<string | undefined | null>, limit = 30): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const text = asText(value).replace(/\s+/g, " ");
    if (!text || PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text))) continue;

    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(text);

    if (output.length >= limit) break;
  }

  return output;
}

function normaliseSku(value: unknown): string {
  return asText(value).toUpperCase().replace(/\s+/g, "");
}

function allText(raw: UnknownRecord, base?: ProductSpec): string {
  const technicalProfile = asRecord(raw.technicalProfile);
  const sourceCatalog = asRecord(raw.sourceCatalog);

  return [
    base?.sku,
    base?.name,
    base?.family,
    base?.category,
    base?.productType,
    base?.description,
    base?.summary,
    raw.sku,
    raw.name,
    raw.title,
    raw.description,
    raw.summary,
    raw.category,
    raw.family,
    sourceCatalog.transportType,
    sourceCatalog.resolutionBandwidth,
    technicalProfile.transports,
    technicalProfile.signalDomains,
    technicalProfile.features,
  ]
    .flatMap((value) => {
      if (Array.isArray(value)) {
        return value.flatMap((item) => {
          if (typeof item === "object" && item) {
            return Object.values(item as UnknownRecord).map(asText);
          }
          return asText(item);
        });
      }
      if (typeof value === "object" && value) return Object.values(value as UnknownRecord).map(asText);
      return asText(value);
    })
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function inferDomain(sku: string, text: string): string | undefined {
  const hasUcHardwareIdentity =
    /^APO-(?:VX20|210)-UC(?:-|$)/.test(sku) ||
    /^HALO-/.test(sku) ||
    /\bvideo bar\b|\bconference bar\b|\bspeakerphone\b|\busb conferencing\b|\ball-in-one uc\b|\bbyom\b/.test(text);

  if (
    /^APO-DG2(?:-|$)/.test(sku) ||
    (!hasUcHardwareIdentity &&
      /\bwireless casting\b|\bwireless presentation\b|\bcasting dongle\b|\bwireless dongle\b/.test(text))
  ) {
    return "WIRELESS_PRESENTATION";
  }

  if (hasUcHardwareIdentity) return "UC";

  if (/^NHD-/.test(sku) || /\bnetworkhd\b|av[\s-]?over[\s-]?ip|\bavoip\b|\bsdvoe\b/.test(text)) return "AVOIP";
  if (/^MX-/.test(sku) || /\bmatrix\b/.test(text)) return "MATRIX";
  if (/\bvideo\s*wall\b|\bvideowall\b/.test(text)) return "VIDEO_WALL";
  if (/\bmultiview\b|\bmulti-view\b/.test(text)) return "MULTIVIEW";
  if (/^EX-|^RX-|^TX-/.test(sku) || /\bhdbaset\b|\bhdbt\b|\bextender\b/.test(text)) return "HDBASET";
  if (/^SW-/.test(sku) || /\bpresentation switcher\b|\broom switcher\b/.test(text)) return "PRESENTATION";
  if (/^APO-|^HALO-/.test(sku) || /\buc\b|\bconferencing\b|\bspeakerphone\b|\bvideo bar\b/.test(text)) return "UC";
  if (/^AMP-/.test(sku) || /\bamplifier\b|\bdante\b|\bdsp\b/.test(text)) return "AUDIO";
  if (/^CAM-/.test(sku) || /\bcamera\b|\bptz\b/.test(text)) return "CAMERA";
  return undefined;
}

function inferRole(sku: string, text: string, domain?: string): string | undefined {
  if (/\bmultiview decoder\b/.test(text)) return "multiview decoder";
  // WyreStorm's -TX/-RX/-TRX SKU suffix convention is shared by NetworkHD
  // AVoIP encoders/decoders AND wireless presentation switcher/transmitter
  // pairs (e.g. SW-620-TX-W). Only treat the suffix as encoder/decoder
  // evidence outside the presentation domains, so a wireless presentation
  // switcher doesn't get misread as an AVoIP encoder.
  const isPresentationDomain = domain === "PRESENTATION" || domain === "WIRELESS_PRESENTATION";

  if (!isPresentationDomain && (/\btransceiver\b|\btrx\b/.test(text) || /-TRX\b/.test(sku))) return "transceiver";
  if (!isPresentationDomain && (/\bencoder\b/.test(text) || /-TX(?:-|$)/.test(sku))) return "encoder";
  if (!isPresentationDomain && (/\bdecoder\b/.test(text) || /-RX(?:-|$)/.test(sku))) return "decoder";
  if (domain === "MATRIX") return "matrix";
  if (domain === "VIDEO_WALL") return "video wall processor";
  if (domain === "MULTIVIEW") return "multiview processor";
  if (domain === "PRESENTATION") return "presentation switcher";
  if (domain === "WIRELESS_PRESENTATION") {
    if (/dongle|apo-dg2/.test(text)) return "wireless casting dongle";
    // A -SW prefixed switcher that also supports wireless casting is still a
    // presentation switcher, not a bare casting accessory - matches the same
    // distinction wyrestormCompareProfile.ts's detectRole() makes.
    if (/^SW-/.test(sku) || /\b(presentation switcher|switcher)\b/.test(text)) return "presentation switcher";
    return "wireless presentation";
  }
  if (domain === "UC") return "UC room product";
  if (domain === "AUDIO") return "audio processor";
  if (domain === "CAMERA") return "camera";
  if (domain === "HDBASET") {
    if (/receiver|\brx\b/.test(text)) return "receiver";
    if (/transmitter|\btx\b/.test(text)) return "transmitter";
  }
  return undefined;
}

function inferResolution(text: string): string | undefined {
  const direct = text.match(/\b(?:3840x2160|4096x2160)[^.;,\n]{0,35}(?:60|30)\s*hz\b/i)?.[0];
  if (direct) return direct.replace(/\s+/g, " ");

  if (/8k|4320/.test(text)) return "8K";
  if (/4k\s*@?\s*60|4k60|2160p\s*@?\s*60/.test(text)) return "4K60";
  if (/4k\s*@?\s*30|4k30|2160p\s*@?\s*30/.test(text)) return "4K30";
  if (/4k|uhd|2160/.test(text)) return "4K";
  if (/1080p|1920x1080/.test(text)) return "1080p";
  return undefined;
}

function inferChroma(text: string): string | undefined {
  if (/4:4:4/.test(text)) return "4:4:4";
  if (/4:2:2/.test(text)) return "4:2:2";
  if (/4:2:0/.test(text)) return "4:2:0";
  return undefined;
}

function sourceCatalog(raw: UnknownRecord): UnknownRecord {
  return asRecord(raw.sourceCatalog);
}

function technicalProfile(raw: UnknownRecord): UnknownRecord {
  return asRecord(raw.technicalProfile);
}

function technicalFeatures(raw: UnknownRecord): Array<{ label: string; group: string; evidence: string }> {
  const profile = technicalProfile(raw);
  const features = Array.isArray(profile.features) ? profile.features : [];

  return features
    .map((feature) => {
      if (typeof feature === "string") return { label: feature, group: "", evidence: "" };
      const record = asRecord(feature);
      return {
        label: asText(record.label || record.name),
        group: asText(record.group),
        evidence: asText(record.evidence),
      };
    })
    .filter((feature) => feature.label);
}

// WINGMAN_PORT_COUNT_GOVERNANCE_START
function wmPortText(port: TechnicalPort): string {
  return [port.connector, port.detail, port.evidence, port.category, port.direction]
    .map(asText)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function wmIsCapabilityOnlyUsbPort(port: TechnicalPort): boolean {
  const value = wmPortText(port);
  if (!/\busb\b|usb-[abc]|usb[abc]\b/.test(value)) return false;

  const explicitConnector =
    /usb\s*(?:type\s*)?[- ]?[abc]\b|usb-[abc]\b|type\s*[- ]?[abc]\s+usb|\b(?:host|device|client|peripheral|upstream|downstream)\s+(?:usb\s+)?(?:port|connector|socket)|\busb\s+(?:host|device|client|peripheral|upstream|downstream)\b|\b(?:receptacle|connector|socket)\b/.test(value);

  if (explicitConnector) return false;

  return /\busb\s*(?:1\.1|2\.0|3(?:\.0|\.1|\.2)?|4(?:\.0)?)\b|\btiers?\b|\bup to\s+\d+\s+devices?\b|\bendpoints?\s*[â‰¤<]=?\s*\d+\b|\bdevice\s+limit\b|\bhub\s+limit\b|\bmax(?:imum)?\s+hubs?\b|\bbandwidth\b|\bversion\b|\bstandard\b/.test(value);
}

function wmIsExplicitUsbConnector(port: TechnicalPort): boolean {
  const value = wmPortText(port);
  return !wmIsCapabilityOnlyUsbPort(port) &&
    /usb\s*(?:type\s*)?[- ]?[abc]\b|usb-[abc]\b|type\s*[- ]?[abc]\s+usb|\busb\s+(?:host|device|client|peripheral|upstream|downstream)\b|\b(?:host|device|client|peripheral|upstream|downstream)\s+usb\b/.test(value);
}

function wmIsNonRoutedVideoOutput(port: TechnicalPort): boolean {
  return /\b(loop|loop-through|loop through|mirrored|mirror|parallel|duplicate|duplicated|local monitor|monitor out|preview|aux)\b/.test(
    wmPortText(port),
  );
}

function wmPortFamily(port: TechnicalPort): string {
  const value = wmPortText(port);
  if (/\bhdmi\b/.test(value)) return "hdmi";
  if (/displayport|\bdp\b/.test(value)) return "displayport";
  if (/\bhdbaset\b|\bhdbt\b/.test(value)) return "hdbaset";
  if (/\bsdi\b/.test(value)) return "sdi";
  if (/usb\s*(?:type\s*)?[- ]?c\b|usb-c\b/.test(value)) return "usb-c";
  if (/usb\s*(?:type\s*)?[- ]?b\b|usb-b\b/.test(value)) return "usb-b";
  if (/usb\s*(?:type\s*)?[- ]?a\b|usb-a\b/.test(value)) return "usb-a";
  if (/\busb\b/.test(value)) return "usb";
  if (/\brj-?45\b|ethernet|\blan\b|network/.test(value)) return "rj45";
  if (/\bsfp\b|fibre|fiber/.test(value)) return "sfp";
  if (/rs-?232/.test(value)) return "rs232";
  if (/\bir\b|infrared/.test(value)) return "ir";
  return asText(port.connector || port.evidence).toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function wmPortRole(port: TechnicalPort): string {
  const value = wmPortText(port);
  if (wmIsNonRoutedVideoOutput(port)) return "local-loop";
  if (/\bhost\b|\bupstream\b/.test(value)) return "host";
  if (/\bdevice\b|\bclient\b|\bperipheral\b|\bdownstream\b/.test(value)) return "device";
  return "";
}

function wmDedupeTechnicalPorts(ports: TechnicalPort[]): TechnicalPort[] {
  const byKey = new Map<string, TechnicalPort>();

  for (const port of ports) {
    if (wmIsCapabilityOnlyUsbPort(port)) continue;

    const direction = asText(port.direction).toLowerCase() || "unspecified";
    const detail = asText(port.detail)
      .toLowerCase()
      .replace(/\b(?:official|product guide|datasheet|page|pages)\b.*$/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const key = [wmPortFamily(port), direction, wmPortRole(port), detail].join("|");
    const current = byKey.get(key);

    if (!current) {
      byKey.set(key, { ...port, count: Number(port.count) || 1 });
      continue;
    }

    byKey.set(key, {
      ...current,
      count: Math.max(Number(current.count) || 1, Number(port.count) || 1),
      connector: current.connector || port.connector,
      detail: current.detail || port.detail,
      evidence: current.evidence || port.evidence,
      category:
        asText(current.category).toLowerCase() === "other"
          ? port.category || current.category
          : current.category,
    });
  }

  return Array.from(byKey.values());
}
// WINGMAN_PORT_COUNT_GOVERNANCE_END

function technicalPorts(raw: UnknownRecord): TechnicalPort[] {
  const profile = technicalProfile(raw);
  const io = asRecord(profile.io);
  const buckets = ["ports", "video", "audio", "usb", "network", "control", "power"] as const;
  const output: TechnicalPort[] = [];

  for (const bucket of buckets) {
    const entries = Array.isArray(io[bucket]) ? (io[bucket] as unknown[]) : [];

    for (const entry of entries) {
      if (typeof entry === "string") {
        const port: TechnicalPort = {
          count: 1,
          connector: entry,
          direction: "unspecified",
          category: bucket === "ports" ? "other" : bucket,
          evidence: entry,
        };

        if (!wmIsCapabilityOnlyUsbPort(port)) output.push(port);
        continue;
      }

      const record = asRecord(entry);
      const port: TechnicalPort = {
        count: Number(record.count) || 1,
        connector: asText(record.connector || record.name || record.label),
        direction: asText(record.direction) || "unspecified",
        category: asText(record.category) || (bucket === "ports" ? "other" : bucket),
        detail: asText(record.detail),
        evidence: asText(record.evidence),
      };

      if (!wmIsCapabilityOnlyUsbPort(port)) output.push(port);
    }
  }

  return wmDedupeTechnicalPorts(
    output.filter((port) => port.connector || port.evidence),
  );
}

function classifyPort(port: TechnicalPort): "video" | "audio" | "usb" | "network" | "control" | "power" | "other" {
  const category = asText(port.category).toLowerCase();
  if (["video", "audio", "usb", "network", "control", "power"].includes(category)) {
    return category as "video" | "audio" | "usb" | "network" | "control" | "power";
  }

  const text = [port.connector, port.detail, port.evidence].map(asText).join(" ").toLowerCase();
  if (/hdmi|displayport|hdbaset|\bsdi\b|video/.test(text)) return "video";
  if (/audio|line|mic|speaker|dante|aes67|phoenix/.test(text)) return "audio";
  if (/usb|host|device|peripheral/.test(text)) return "usb";
  if (/rj-?45|ethernet|lan|network|sfp|fiber|fibre/.test(text)) return "network";
  if (/rs-?232|\bir\b|cec|relay|gpio|control|trigger/.test(text)) return "control";
  if (/power|poe|poh|poc|12v|24v|dc|mains|iec/.test(text)) return "power";
  return "other";
}

function portLabel(port: TechnicalPort): string {
  const count = Number(port.count) > 0 ? Number(port.count) : 1;
  const connector = asText(port.connector || port.evidence || "Connection");
  const direction = asText(port.direction);
  const detail = asText(port.detail);
  const directionText = direction && direction !== "unspecified" ? ` ${direction}` : "";
  return `${count} x ${connector}${directionText}${detail ? ` - ${detail}` : ""}`;
}

function evidenceFromRaw(raw: UnknownRecord): { labels: string[]; sourceUrl?: string; official: boolean } {
  const profile = technicalProfile(raw);
  const quality = asRecord(profile.sourceQuality);
  const catalog = sourceCatalog(raw);

  const url = asText(
    quality.officialProductUrl ||
      quality.officialUrl ||
      quality.url ||
      raw.officialUrl ||
      raw.sourceUrl ||
      raw.url ||
      catalog.evidenceSource,
  );

  const sourcePdfs = Array.isArray(quality.sourcePdfs)
    ? quality.sourcePdfs.map((entry) => {
        const record = asRecord(entry);
        const title = asText(record.title || record.fileName);
        const pages = asList(record.pageReferences).join(", ");
        return title ? `${title}${pages ? `, pages ${pages}` : ""}` : "";
      })
    : [];

  const labels = unique([
    url ? `Official source: ${url}` : "",
    asText(quality.productGuidePdf) ? `Product guide: ${asText(quality.productGuidePdf)}` : "",
    ...sourcePdfs,
    asText(catalog.evidenceSource) ? `Catalogue evidence: ${asText(catalog.evidenceSource)}` : "",
    asText(catalog.lastReviewed) ? `Last reviewed: ${asText(catalog.lastReviewed)}` : "",
    asText(catalog.reviewer) ? `Reviewer: ${asText(catalog.reviewer)}` : "",
  ]);

  const official = Boolean(
    url.startsWith("https://www.wyrestorm.com/") ||
      asText(quality.productGuidePdf) ||
      sourcePdfs.length,
  );

  return { labels, sourceUrl: url || undefined, official };
}

function exactEvidence(profile: GovernedProfileRecord): string[] {
  return unique(
    profile.evidence.map((item) => {
      const source = asText(item.sourceUrl);
      const reviewed = asText(item.reviewedOn);
      const reviewer = asText(item.reviewer);
      return [
        item.sourceType || "source",
        source,
        reviewed ? `reviewed ${reviewed}` : "",
        reviewer ? `by ${reviewer}` : "",
      ]
        .filter(Boolean)
        .join(" - ");
    }),
  );
}

function exactProfileData(profile: GovernedProfileRecord): ResolvedProductTechnicalData {
  const ioSummary = unique(profile.ports.map(portLabel));
  const missingFields: string[] = [];
  const sourceTier: NonNullable<CompareDecisionProfile["sourceTier"]> =
    profile.status === "review-required" ? "official-structured" : "verified-profile";
  const evidence = exactEvidence(profile);
  const compareReady =
    profile.status !== "review-required" &&
    Boolean(profile.productClass && profile.role && profile.transport.length && profile.maxResolution && evidence.length);

  return {
    sku: normaliseSku(profile.sku),
    productType: profile.productType,
    productClass: profile.productClass,
    role: profile.role,
    transport: unique(profile.transport),
    maxResolution: profile.maxResolution,
    chroma: profile.chroma,
    latency: profile.latency,
    inputCount: profile.inputCount,
    outputCount: profile.outputCount,
    ioSummary,
    video: unique(profile.video ?? []),
    audio: unique(profile.audio ?? []),
    usb: unique(profile.usb ?? []),
    network: unique(profile.network ?? []),
    control: unique(profile.control ?? []),
    power: unique(profile.power ?? []),
    physical: unique(profile.physical ?? []),
    dependencies: unique(profile.dependencies),
    compatibleFamilies: unique(profile.compatibleFamilies ?? []),
    checks: unique(profile.checks),
    evidence,
    warnings: unique(profile.warnings),
    missingFields,
    completeness: compareReady ? 100 : 82,
    compareReady,
    sourceTier,
    sourceUrl: profile.evidence[0]?.sourceUrl,
    statusLabel:
      profile.status === "verified"
        ? "Verified governed profile"
        : profile.status === "verified-with-warning"
          ? "Verified profile with warning"
          : "Official profile requiring review",
    compare: {
      domain: profile.productClass,
      role: profile.role,
      transport: profile.transport.join(" / "),
      inputCount: profile.inputCount,
      outputCount: profile.outputCount,
      maxResolution: profile.maxResolution,
      chroma: profile.chroma,
      latency: profile.latency,
      features: Object.fromEntries(
        Object.entries(profile.features ?? {}).map(([key, value]) => [key, Boolean(value)]),
      ),
      specs: profile.specs ?? {},
    },
  };
}

function requiredCoverage(input: {
  domain?: string;
  role?: string;
  transport: string[];
  maxResolution?: string;
  ioSummary: string[];
  network: string[];
  video: string[];
  audio: string[];
  usb: string[];
  dependencies: string[];
  evidence: string[];
}): string[] {
  const required: Array<[string, boolean]> = [
    ["product class", Boolean(input.domain)],
    ["product role", Boolean(input.role)],
    ["transport", input.transport.length > 0],
    ["evidence", input.evidence.length > 0],
  ];

  if (["AVOIP", "MATRIX", "VIDEO_WALL", "MULTIVIEW", "HDBASET", "PRESENTATION"].includes(input.domain ?? "")) {
    required.push(["maximum resolution", Boolean(input.maxResolution)]);
    required.push(["video connection", input.video.length > 0 || input.ioSummary.some((item) => /hdmi|video|hdbaset/i.test(item))]);
  }

  if (input.domain === "AVOIP") {
    required.push(["network connection", input.network.length > 0 || input.ioSummary.some((item) => /rj-?45|ethernet|network/i.test(item))]);
    required.push(["system dependencies", input.dependencies.length > 0]);
  }

  if (input.domain === "AUDIO") {
    required.push(["audio connection", input.audio.length > 0]);
  }

  if (input.domain === "UC") {
    required.push(["USB or conferencing connection", input.usb.length > 0 || input.video.length > 0 || input.audio.length > 0]);
  }

  return required.filter(([, present]) => !present).map(([label]) => label);
}

function deriveSpecs(ports: TechnicalPort[], text: string): CompareSpecFacts {
  const physicalPorts = wmDedupeTechnicalPorts(ports);

  const count = (
    category: ReturnType<typeof classifyPort>,
    direction?: "input" | "output",
    matcher?: RegExp,
    reject?: (port: TechnicalPort) => boolean,
  ): number | undefined => {
    const total = physicalPorts
      .filter((port) => classifyPort(port) === category)
      .filter((port) => category !== "usb" || wmIsExplicitUsbConnector(port))
      .filter((port) => !direction || asText(port.direction).toLowerCase() === direction)
      .filter((port) => !matcher || matcher.test(wmPortText(port)))
      .filter((port) => !reject || !reject(port))
      .reduce((sum, port) => sum + (Number(port.count) || 1), 0);

    return total > 0 ? total : undefined;
  };

  const usbStandardMatch = text.match(/\busb\s*(1\.1|2\.0|3(?:\.0|\.1|\.2)?|4(?:\.0)?)\b/i);
  const specs: CompareSpecFacts = {
    hdmiInputs: count("video", "input", /\bhdmi\b/),
    hdmiOutputs: count("video", "output", /\bhdmi\b/, wmIsNonRoutedVideoOutput),
    hdmiLoopOutputs: count("video", "output", /\bhdmi\b/, (port) => !wmIsNonRoutedVideoOutput(port)),
    usbHostPorts: count("usb", undefined, /\bhost\b|\bupstream\b/),
    usbDevicePorts: count("usb", undefined, /\bdevice\b|\bperipheral\b|\bclient\b|\bdownstream\b/),
    usbTotalPorts: count("usb"),
    usbCPorts: count("usb", undefined, /usb\s*(?:type\s*)?[- ]?c\b|usb-c\b/),
    usbStandard: usbStandardMatch ? `USB ${usbStandardMatch[1]}` : undefined,
    audioInputs: count("audio", "input"),
    audioOutputs: count("audio", "output"),
    networkPorts: count("network"),
    controlPorts: count("control"),
    rs232: /\brs-?232\b/.test(text) || undefined,
    ir: /\bir\b|infrared/.test(text) || undefined,
    cec: /\bcec\b/.test(text) || undefined,
    relay: /\brelay\b|contact closure/.test(text) || undefined,
    gpio: /\bgpio\b/.test(text) || undefined,
    ethernetControl: /web ui|web gui|api|tcp\/ip|ethernet control|lan control/.test(text) || undefined,
    audioEmbed: /audio embed/.test(text) || undefined,
    audioDeEmbed: /audio de.?embed|de.?embed/.test(text) || undefined,
    analogAudio: /analog audio|analogue audio|line in|line out|phoenix/.test(text) || undefined,
    dante: /\bdante\b/.test(text) || undefined,
    aes67: /\baes67\b/.test(text) || undefined,
    poe: /\bpoe\b|802\.3af|802\.3at|power over ethernet/.test(text) || undefined,
    poc: /\bpoc\b|power over cable/.test(text) || undefined,
    poh: /\bpoh\b|power over hdbaset/.test(text) || undefined,
    powerDelivery: /power delivery|usb-c charging|\bpd\b/.test(text) || undefined,
    externalPsu: /external power|dc power|power supply|adapter|\b12v\b|\b24v\b/.test(text) || undefined,
    internalPsu: /internal power|iec|mains input/.test(text) || undefined,
    networkSpeed: /\b10\s*g(?:be|bps)?\b|sdvoe/.test(text)
      ? "10GbE"
      : /\b1\s*g(?:be|bps)?\b|gigabit|1000base|networkhd 100|networkhd 500/.test(text)
        ? "1GbE"
        : undefined,
    hdmiVersion: text.match(/\bhdmi\s*(\d(?:\.\d)?)\b/)?.[1],
    hdcpVersion: text.match(/\bhdcp\s*(\d(?:\.\d)?)\b/)?.[1],
  };

  return Object.fromEntries(
    Object.entries(specs).filter(([, value]) => value !== undefined),
  ) as CompareSpecFacts;
}

function deriveFeatures(text: string): Record<string, boolean | undefined> {
  return Object.fromEntries(
    Object.entries({
      usbRouting: /kvm|usb routing|usb switching|usb host/.test(text) || undefined,
      usbC: /usb-?c/.test(text) || undefined,
      wireless: /wireless|airplay|miracast|byod/.test(text) || undefined,
      dante: /\bdante\b/.test(text) || undefined,
      aes67: /\baes67\b/.test(text) || undefined,
      multiview: /multiview|multi-view/.test(text) || undefined,
      videoWall: /video\s*wall|videowall|mosaic/.test(text) || undefined,
      hdbtOutput: /hdbaset|hdbt/.test(text) || undefined,
      receiverKit: /receiver kit|rx kit|tx\/rx kit/.test(text) || undefined,
      tenGig: /\b10g\b|10gbe|sdvoe/.test(text) || undefined,
      zeroLatency: /zero latency/.test(text) || undefined,
      lossless: /lossless|uncompressed/.test(text) || undefined,
      control: /rs-?232|\bir\b|cec|relay|gpio|control/.test(text) || undefined,
      poe: /\bpoe\b|802\.3af|802\.3at/.test(text) || undefined,
      poc: /\bpoc\b/.test(text) || undefined,
      poh: /\bpoh\b/.test(text) || undefined,
      audioDeEmbed: /audio de.?embed|de.?embed/.test(text) || undefined,
      audioEmbed: /audio embed/.test(text) || undefined,
    }).filter(([, value]) => value !== undefined),
  );
}

export function resolveProductTechnicalData(
  rawValue: unknown,
  base?: ProductSpec,
): ResolvedProductTechnicalData {
  const raw = asRecord(rawValue);
  const sku = normaliseSku(base?.sku || raw.sku || raw.id || raw.model);
  const exact = exactProfiles.get(sku);

  if (exact) return exactProfileData(exact);

  const catalog = sourceCatalog(raw);
  const profile = technicalProfile(raw);
  const ports = technicalPorts(raw);
  const features = technicalFeatures(raw);
  const text = allText(raw, base);
  const domain = inferDomain(sku, text);
  const role = inferRole(sku, text, domain);
  const evidenceState = evidenceFromRaw(raw);

  const transport = unique([
    ...asList(profile.transports),
    asText(catalog.transportType),
    ...(base?.network ?? []),
  ]);

  const portGroups = {
    video: ports.filter((port) => classifyPort(port) === "video").map(portLabel),
    audio: ports.filter((port) => classifyPort(port) === "audio").map(portLabel),
    usb: ports.filter((port) => classifyPort(port) === "usb").map(portLabel),
    network: ports.filter((port) => classifyPort(port) === "network").map(portLabel),
    control: ports.filter((port) => classifyPort(port) === "control").map(portLabel),
    power: ports.filter((port) => classifyPort(port) === "power").map(portLabel),
  };

  const featureGroup = (group: string) =>
    features
      .filter((feature) => feature.group.toLowerCase().includes(group.toLowerCase()))
      .map((feature) => feature.label);

  const ioSummary = unique([
    ...ports.map(portLabel),
    asText(catalog.inputs) ? `Inputs: ${asText(catalog.inputs)}` : "",
    asText(catalog.outputs) ? `Outputs: ${asText(catalog.outputs)}` : "",
    ...(base?.ioSummary ?? []),
  ]);

  const maxResolution =
    asText(catalog.resolutionBandwidth) ||
    inferResolution(text);

  const video = unique([
    ...portGroups.video,
    ...featureGroup("video"),
    ...featureGroup("processing"),
    maxResolution ? `Maximum stated format: ${maxResolution}` : "",
    ...(base?.video ?? []),
  ]);
  const audio = unique([
    ...portGroups.audio,
    ...featureGroup("audio"),
    asText(catalog.audio),
    ...(base?.audio ?? []),
  ]);
  const usb = unique([
    ...portGroups.usb,
    ...featureGroup("usb"),
    asText(catalog.usb),
    ...(base?.usb ?? []),
  ]);
  const network = unique([
    ...portGroups.network,
    ...featureGroup("network"),
    asText(catalog.networkRequirement),
    ...transport,
    ...(base?.network ?? []),
  ]);
  const control = unique([
    ...portGroups.control,
    ...featureGroup("control"),
    asText(catalog.control),
    ...(base?.control ?? []),
  ]);
  const power = unique([
    ...portGroups.power,
    ...featureGroup("power"),
    ...(base?.power ?? []),
  ]);
  const physical = unique([
    ...featureGroup("mechanical"),
    ...(base?.physical ?? []),
  ]);
  const dependencies = unique([
    ...asList(catalog.dependencies),
  ]);
  const compatibleFamilies = unique([
    ...asList(catalog.compatibleFamilies),
  ]);
  const warnings = unique([
    asText(catalog.quoteWarnings),
    asText(catalog.disqualifiers),
  ]);

  const missingFields = requiredCoverage({
    domain,
    role,
    transport,
    maxResolution,
    ioSummary,
    network,
    video,
    audio,
    usb,
    dependencies,
    evidence: evidenceState.labels,
  });

  const requiredCount = missingFields.length + 4 + (
    ["AVOIP", "MATRIX", "VIDEO_WALL", "MULTIVIEW", "HDBASET", "PRESENTATION"].includes(domain ?? "")
      ? 2
      : 0
  ) + (domain === "AVOIP" ? 2 : 0);
  const completeness = Math.max(
    0,
    Math.min(100, Math.round(((requiredCount - missingFields.length) / Math.max(1, requiredCount)) * 100)),
  );

  const hasStructuredProfile = Boolean(
    Object.keys(profile).length &&
      (ports.length > 0 || features.length > 0) &&
      evidenceState.official,
  );
  const sourceTier: NonNullable<CompareDecisionProfile["sourceTier"]> = hasStructuredProfile
    ? "official-structured"
    : evidenceState.labels.length
      ? "text-inferred"
      : "missing";
  const compareReady =
    sourceTier === "official-structured" &&
    missingFields.length === 0 &&
    completeness >= 75;

  const compareSpecs = deriveSpecs(ports, text);
  const inputCount = Number(catalog.inputCount) || undefined;
  const outputCount = Number(catalog.outputCount) || undefined;

  return {
    sku,
    productType: base?.productType || asText(raw.productType || raw.hardwareType || raw.category) || "Product",
    productClass: domain,
    role,
    transport,
    maxResolution,
    chroma: inferChroma(text),
    inputCount,
    outputCount,
    ioSummary,
    video,
    audio,
    usb,
    network,
    control,
    power,
    physical,
    dependencies,
    compatibleFamilies,
    checks: unique([
      ...missingFields.map((field) => `Confirm ${field} from an official product source before quotation.`),
      ...(base?.checks ?? []),
    ]),
    evidence: evidenceState.labels,
    warnings,
    missingFields,
    completeness,
    compareReady,
    sourceTier,
    sourceUrl: evidenceState.sourceUrl,
    statusLabel: compareReady
      ? "Official structured profile"
      : sourceTier === "official-structured"
        ? "Official data - incomplete"
        : sourceTier === "text-inferred"
          ? "Text-inferred - review only"
          : "Technical data missing",
    compare: {
      domain,
      role,
      transport: transport.join(" / ") || undefined,
      inputCount,
      outputCount,
      maxResolution,
      chroma: inferChroma(text),
      features: deriveFeatures(text),
      specs: compareSpecs,
    },
  };
}

function technicalSummary(
  resolved: ResolvedProductTechnicalData,
): ProductTechnicalDataSummary {
  return {
    status:
      resolved.sourceTier === "verified-profile"
        ? "verified"
        : resolved.sourceTier === "official-structured"
          ? "official-structured"
          : resolved.sourceTier === "text-inferred"
            ? "inferred"
            : "missing",
    statusLabel: resolved.statusLabel,
    completeness: resolved.completeness,
    compareReady: resolved.compareReady,
    sourceTier: resolved.sourceTier,
    productClass: resolved.productClass,
    role: resolved.role,
    transport: resolved.transport,
    maxResolution: resolved.maxResolution,
    chroma: resolved.chroma,
    dependencies: resolved.dependencies,
    compatibleFamilies: resolved.compatibleFamilies,
    evidence: resolved.evidence,
    missingFields: resolved.missingFields,
    warnings: resolved.warnings,
  };
}

export function hydrateProductSpecWithTechnicalData(
  product: ProductSpec,
  rawValue: unknown,
): ProductSpec {
  const resolved = resolveProductTechnicalData(rawValue, product);

  return {
    ...product,
    productType: resolved.productType || product.productType,
    ioSummary: resolved.ioSummary,
    video: resolved.video,
    audio: resolved.audio,
    usb: resolved.usb,
    network: resolved.network,
    control: resolved.control,
    power: resolved.power,
    physical: resolved.physical,
    checks: unique([...resolved.checks, ...product.checks], 12),
    related: unique(
      [...resolved.dependencies, ...resolved.compatibleFamilies, ...product.related],
      16,
    ),
    technicalData: technicalSummary(resolved),
  };
}

export function getGovernedTechnicalProfileSkus(): string[] {
  return [...exactProfiles.keys()].sort();
}
