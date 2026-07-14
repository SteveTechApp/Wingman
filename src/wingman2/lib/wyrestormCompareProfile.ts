/**
 * WyreStorm Compare Profile mapper
 *
 * Converts a WyreStorm product-intelligence record into the structured
 * CompareDecisionProfile consumed by classifyCompetitorCompareDecision, using
 * the SAME technology-class vocabulary and canonical transport as the competitor
 * spec registry. This lets the classifier compare like-for-like structured specs.
 */

import type { CompareDecisionProfile, CompareSpecFacts } from "./competitorCompareDecision";
import type { WyrestormProduct } from "./competitorMatchEngine";
import { canonicalTransport } from "./competitorSpecRegistry";
import { resolveProductTechnicalData } from "./governedProductTechnicalData";

type TechnicalPort = {
  count?: number;
  connector?: string;
  direction?: string;
  category?: string;
  detail?: string;
  evidence?: string;
};

type WyrestormProductWithProfile = WyrestormProduct & {
  technicalProfile?: {
    sourceQuality?: {
      officialProductUrl?: string;
      officialPageStatus?: number;
      livePageUsed?: boolean;
      capturedTechnicalLineCount?: number;
    };
    transports?: string[];
    io?: {
      ports?: TechnicalPort[];
      video?: TechnicalPort[];
      audio?: TechnicalPort[];
      usb?: TechnicalPort[];
      network?: TechnicalPort[];
      control?: TechnicalPort[];
    };
  };
};

function text(product: WyrestormProduct): string {
  return [
    product.sku,
    product.name,
    product.title,
    product.family,
    product.productFamily,
    product.category,
    product.role,
    product.governanceRole,
    product.description,
    product.summary,
    ...(product.technologies ?? []),
    ...(product.features ?? []),
    ...(product.featureTags ?? []),
    ...(product.tags ?? []),
    ...(product.capabilities ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function detectDomain(product: WyrestormProduct, blob: string): string | undefined {
  const sku = String(product.sku ?? "").toUpperCase();

  if (/^NHD-/.test(sku) || blob.includes("avoip") || blob.includes("av over ip") || blob.includes("networkhd")) {
    return "AVOIP";
  }
  if (/^SP-/.test(sku) || /^EXP-SP-/.test(sku) || blob.includes("splitter") || blob.includes("distribution amplifier") || blob.includes("duplicator")) {
    return "DISTRIBUTION";
  }
  if (/^MX-/.test(sku) || blob.includes("matrix")) return "MATRIX";
  if (/^SW-/.test(sku) && (blob.includes("video wall") || blob.includes("videowall"))) return "VIDEO_WALL";
  if (blob.includes("video wall") || blob.includes("videowall")) return "VIDEO_WALL";
  if (blob.includes("multiview") || blob.includes("multi-view")) return "MULTIVIEW";
  if (/^EX-/.test(sku) || /^RX-/.test(sku) || /^TX-/.test(sku) || blob.includes("hdbaset") || blob.includes("hdbt")) {
    return "HDBASET";
  }
  if (/^APO-/.test(sku) || blob.includes("wireless presentation") || blob.includes("byod") || blob.includes("clickshare")) {
    return "WIRELESS_PRESENTATION";
  }
  if (/^SW-/.test(sku) || blob.includes("presentation") || blob.includes("switcher")) return "PRESENTATION";
  if (/^AMP-/.test(sku) || blob.includes("dante") || blob.includes("amplifier") || blob.includes("audio /")) {
    return "AUDIO";
  }
  return undefined;
}

function detectRole(product: WyrestormProduct, blob: string, domain?: string): string | undefined {
  const sku = String(product.sku ?? "").toUpperCase();

  if (/transceiver|\btrx\b/.test(blob) || /-TRX\b/.test(sku)) return "transceiver";
  if (/\bencoder\b/.test(blob) || /-TX\b/.test(sku)) return "encoder";
  if (/\bdecoder\b/.test(blob) || /-RX\b/.test(sku)) return "decoder";
  if (domain === "MATRIX" || /matrix/.test(blob)) return "matrix";
  if (domain === "DISTRIBUTION" || /splitter|distribution amplifier|duplicator/.test(blob)) return "distribution amplifier";
  if (domain === "VIDEO_WALL" || /video\s*wall/.test(blob)) return "video wall processor";
  if (domain === "MULTIVIEW" || /multiview/.test(blob)) return "multiview processor";
  if (domain === "WIRELESS_PRESENTATION") {
    if (/^SW-/.test(sku) || /\b(presentation switcher|switcher)\b/.test(blob)) return "presentation switcher";
    return "wireless presentation";
  }
  if (domain === "AUDIO" || /amplifier|dsp|audio processor/.test(blob)) return "audio processor";
  if (domain === "HDBASET") {
    if (/receiver|\brx\b/.test(blob)) return "receiver";
    if (/transmitter|\btx\b/.test(blob)) return "transmitter";
    return "transmitter";
  }
  if (domain === "PRESENTATION" || /switcher|presentation/.test(blob)) return "presentation switcher";
  return undefined;
}

function detectIo(blob: string): { inputCount?: number; outputCount?: number } {
  const match = blob.match(/(\d{1,2})\s*[x×]\s*(\d{1,2})/);
  if (match) {
    return { inputCount: Number(match[1]), outputCount: Number(match[2]) };
  }
  return {};
}

function technicalProfile(product: WyrestormProduct): WyrestormProductWithProfile["technicalProfile"] | undefined {
  return (product as WyrestormProductWithProfile).technicalProfile;
}

function safeText(value: unknown): string {
  return String(value ?? "").trim();
}

function portText(port: TechnicalPort): string {
  return [port.connector, port.detail, port.evidence, port.category, port.direction].map(safeText).join(" ").toLowerCase();
}

function wmCompareIsCapabilityOnlyUsbPort(port: TechnicalPort): boolean {
  const value = portText(port);
  if (!/\busb\b|usb-[abc]|usb[abc]\b/.test(value)) return false;

  const explicitConnector =
    /usb\s*(?:type\s*)?[- ]?[abc]\b|usb-[abc]\b|type\s*[- ]?[abc]\s+usb|\b(?:host|device|client|peripheral|upstream|downstream)\s+(?:usb\s+)?(?:port|connector|socket)|\busb\s+(?:host|device|client|peripheral|upstream|downstream)\b|\b(?:receptacle|connector|socket)\b/.test(value);

  if (explicitConnector) return false;

  return /\busb\s*(?:1\.1|2\.0|3(?:\.0|\.1|\.2)?|4(?:\.0)?)\b|\btiers?\b|\bup to\s+\d+\s+devices?\b|\bendpoints?\s*[â‰¤<]=?\s*\d+\b|\bdevice\s+limit\b|\bhub\s+limit\b|\bmax(?:imum)?\s+hubs?\b|\bbandwidth\b|\bversion\b|\bstandard\b/.test(value);
}

function wmCompareIsExplicitUsbConnector(port: TechnicalPort): boolean {
  const value = portText(port);
  return !wmCompareIsCapabilityOnlyUsbPort(port) &&
    /usb\s*(?:type\s*)?[- ]?[abc]\b|usb-[abc]\b|type\s*[- ]?[abc]\s+usb|\busb\s+(?:host|device|client|peripheral|upstream|downstream)\b|\b(?:host|device|client|peripheral|upstream|downstream)\s+usb\b/.test(value);
}

function wmComparePortFamily(port: TechnicalPort): string {
  const value = portText(port);
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
  return safeText(port.connector || port.evidence).toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function wmComparePortRole(port: TechnicalPort): string {
  const value = portText(port);
  if (isNonRoutedVideoOutputPort(port)) return "local-loop";
  if (/\bhost\b|\bupstream\b/.test(value)) return "host";
  if (/\bdevice\b|\bclient\b|\bperipheral\b|\bdownstream\b/.test(value)) return "device";
  return "";
}

function uniqueTechnicalPorts(ports: TechnicalPort[]): TechnicalPort[] {
  const byKey = new Map<string, TechnicalPort>();

  for (const port of ports) {
    if (wmCompareIsCapabilityOnlyUsbPort(port)) continue;

    const direction = safeText(port.direction).toLowerCase() || "unspecified";
    const detail = safeText(port.detail)
      .toLowerCase()
      .replace(/\b(?:official|product guide|datasheet|page|pages)\b.*$/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const key = [wmComparePortFamily(port), direction, wmComparePortRole(port), detail].join("|");
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
        safeText(current.category).toLowerCase() === "other"
          ? port.category || current.category
          : current.category,
    });
  }

  return Array.from(byKey.values());
}

function isLikelyAccessoryOrFalsePort(port: TechnicalPort): boolean {
  const value = portText(port);

  if (!value) return true;
  if (wmCompareIsCapabilityOnlyUsbPort(port)) return true;
  if (Number(port.count) > 64) return true;
  if (/\b(bracket|mount|remote|battery|psu|power supply|power cord|ac power|dc power|mains|adapter|quickstart|quick start|guide|manual|warranty|wall mount|rack mount|terminal block|cable|lens cap|unit|kit|screw|sticker|label|rubber|foot|feet)\b/.test(value)) {
    return true;
  }
  if (/\b(optical zoom|digital zoom|mems mic array|watt|camera\b.*camera|transceiver\b.*transceiver|matrix\b.*matrix)\b/.test(value)) {
    return true;
  }

  return false;
}

function isVideoTransportPort(port: TechnicalPort): boolean {
  const value = portText(port);
  if (isLikelyAccessoryOrFalsePort(port)) return false;
  if (safeText(port.category).toLowerCase() !== "video" && !/\bhdmi|hdbaset|sdi|displayport|usb-c\b/.test(value)) {
    return false;
  }
  return /\bhdmi|hdbaset|displayport|dp\b|sdi|usb-c\b/.test(value);
}

function isNonRoutedVideoOutputPort(port: TechnicalPort): boolean {
  const value = portText(port);
  return /\b(mirror|mirrored|parallel|duplicate|duplicated|loop|daisy|cascade|local monitor|monitor out|preview|aux)\b/.test(value);
}

function countCategoryPorts(ports: TechnicalPort[], matcher: (port: TechnicalPort, text: string) => boolean, direction?: "input" | "output"): number | undefined {
  const total = ports
    .filter((port) => !isLikelyAccessoryOrFalsePort(port))
    .filter((port) => !direction || safeText(port.direction).toLowerCase() === direction)
    .filter((port) => matcher(port, portText(port)))
    .reduce((sum, port) => sum + (Number.isFinite(Number(port.count)) ? Number(port.count) : 0), 0);

  return total > 0 ? total : undefined;
}

function anyPort(ports: TechnicalPort[], pattern: RegExp): boolean | undefined {
  return ports.some((port) => pattern.test(portText(port))) || undefined;
}

function countPorts(ports: TechnicalPort[], direction: "input" | "output"): number | undefined {
  const total = ports
    .filter((port) => isVideoTransportPort(port))
    .filter((port) => safeText(port.direction).toLowerCase() === direction)
    .filter((port) => direction !== "output" || !isNonRoutedVideoOutputPort(port))
    .reduce((sum, port) => sum + (Number.isFinite(Number(port.count)) ? Number(port.count) : 0), 0);

  return total > 0 ? total : undefined;
}

function structuredIo(product: WyrestormProduct, blob: string): {
  inputCount?: number;
  outputCount?: number;
  evidence: string[];
  warnings: string[];
  usedStructuredPorts: boolean;
} {
  const profile = technicalProfile(product);
  const allPorts = [
    ...(profile?.io?.video ?? []),
    ...(profile?.io?.ports ?? []),
  ];
  const videoPorts = uniqueTechnicalPorts(allPorts);
  const dropped = videoPorts.filter((port) => isLikelyAccessoryOrFalsePort(port)).length;
  let inputCount = countPorts(videoPorts, "input");
  let outputCount = countPorts(videoPorts, "output");
  const physicalOutputCount = videoPorts
    .filter((port) => isVideoTransportPort(port))
    .filter((port) => safeText(port.direction).toLowerCase() === "output")
    .reduce((sum, port) => sum + (Number.isFinite(Number(port.count)) ? Number(port.count) : 0), 0);
  const nameIo = detectIo(blob);
  const evidence: string[] = [];
  const warnings: string[] = [];
  const matrixLike = /\bmatrix\b/.test(blob);
  const hasNonRoutedOutputWording = /\b(mirror|mirrored|parallel|duplicate|duplicated|loop|daisy|cascade|local monitor|monitor out|preview|aux)\b/.test(blob);

  if (inputCount || outputCount) {
    evidence.push("Structured video I/O read from product technical profile.");
  }

  if (matrixLike && nameIo.inputCount && nameIo.outputCount) {
    const structuredConflictsWithMatrixSize =
      (inputCount !== undefined && inputCount !== nameIo.inputCount) ||
      (outputCount !== undefined && outputCount !== nameIo.outputCount) ||
      (physicalOutputCount > 0 && physicalOutputCount !== nameIo.outputCount && hasNonRoutedOutputWording);

    if (structuredConflictsWithMatrixSize || !inputCount || !outputCount) {
      inputCount = nameIo.inputCount;
      outputCount = nameIo.outputCount;
      evidence.push("Routed matrix I/O read from matrix-size evidence instead of summed physical connector count.");

      if (physicalOutputCount > 0 && physicalOutputCount !== nameIo.outputCount) {
        warnings.push(`Physical video output count (${physicalOutputCount}) differs from routed matrix output count (${nameIo.outputCount}); mirrored/loop/local outputs must not increase matrix size.`);
      }
    }
  }

  if (dropped > 0) {
    warnings.push(`${dropped} likely accessory/non-port entries were ignored while reading I/O.`);
  }

  if (!inputCount && !outputCount && (nameIo.inputCount || nameIo.outputCount)) {
    evidence.push("I/O count inferred from matrix-style product name.");
    warnings.push("I/O count is name-derived; confirm against datasheet before quoting.");
  }

  return {
    inputCount: inputCount ?? nameIo.inputCount,
    outputCount: outputCount ?? nameIo.outputCount,
    evidence,
    warnings,
    usedStructuredPorts: Boolean(inputCount || outputCount),
  };
}

function detectResolution(blob: string): string | undefined {
  if (/8k|4320/.test(blob)) return "8K";
  if (/4k\s*60|4k60|2160p\s*60/.test(blob)) return "4K60";
  if (/4k|uhd|2160/.test(blob)) return "4K30";
  if (/1080|1920/.test(blob)) return "1080p";
  return undefined;
}

function detectChroma(blob: string): string | undefined {
  if (/4:4:4/.test(blob)) return "4:4:4";
  if (/4:2:2/.test(blob)) return "4:2:2";
  if (/4:2:0/.test(blob)) return "4:2:0";
  return undefined;
}

function detectFeatures(blob: string): Record<string, boolean> {
  const features: Record<string, boolean> = {};
  if (/usb-?c/.test(blob)) features.usbC = true;
  if (/kvm|usb 2|usb 3|usb2|usb3|usb-a\/b|usb routing|usb host/.test(blob)) features.usbRouting = true;
  if (/\bdante\b/.test(blob)) features.dante = true;
  if (/aes67/.test(blob)) features.aes67 = true;
  if (/multiview|multi-view/.test(blob)) features.multiview = true;
  if (/video\s*wall|videowall/.test(blob)) features.videoWall = true;
  if (/wireless|byod/.test(blob)) features.wireless = true;
  if (/\b10g\b|sdvoe/.test(blob)) features.tenGig = true;
  if (/hdbaset|hdbt/.test(blob)) features.hdbtOutput = true;
  if (/receiver kit|rx kit|extender kit|tx\/rx kit/.test(blob)) features.receiverKit = true;
  if (/rs-?232|ir\b|cec|relay|contact closure|control/.test(blob)) features.control = true;
  if (/\bpoe\b|\bpoh\b|\bpoc\b|power over ethernet/.test(blob)) features.poe = true;
  if (/\bpoc\b/.test(blob)) features.poc = true;
  if (/\bpoh\b/.test(blob)) features.poh = true;
  if (/audio\s*de.?embed|de.?embed/.test(blob)) features.audioDeEmbed = true;
  if (/audio\s*embed/.test(blob)) features.audioEmbed = true;
  return features;
}

function buildSpecFacts(product: WyrestormProduct, blob: string, inputCount?: number, outputCount?: number): CompareSpecFacts {
  const profile = technicalProfile(product);
  const allPorts = uniqueTechnicalPorts([
    ...(profile?.io?.ports ?? []),
    ...(profile?.io?.video ?? []),
    ...(profile?.io?.audio ?? []),
    ...(profile?.io?.usb ?? []),
    ...(profile?.io?.network ?? []),
    ...(profile?.io?.control ?? []),
  ]);
  const specs: CompareSpecFacts = {};
  const usbStandardMatch = blob.match(/\busb\s*(1\.1|2\.0|3(?:\.0|\.1|\.2)?|4(?:\.0)?)\b/i);

  specs.hdmiInputs = countCategoryPorts(
    allPorts,
    (_port, value) => /\bhdmi\b/.test(value),
    "input",
  ) ?? inputCount;

  specs.hdmiOutputs = countCategoryPorts(
    allPorts,
    (port, value) => /\bhdmi\b/.test(value) && !isNonRoutedVideoOutputPort(port),
    "output",
  );

  specs.hdmiLoopOutputs = countCategoryPorts(
    allPorts,
    (port, value) => /\bhdmi\b/.test(value) && isNonRoutedVideoOutputPort(port),
    "output",
  );

  specs.usbHostPorts = countCategoryPorts(
    allPorts,
    (port, value) => wmCompareIsExplicitUsbConnector(port) && /\bhost\b|\bupstream\b/.test(value),
  );
  specs.usbDevicePorts = countCategoryPorts(
    allPorts,
    (port, value) => wmCompareIsExplicitUsbConnector(port) && /\b(device|client|peripheral|downstream)\b/.test(value),
  );
  specs.usbTotalPorts = countCategoryPorts(
    allPorts,
    (port) => wmCompareIsExplicitUsbConnector(port),
  );
  specs.usbCPorts = countCategoryPorts(
    allPorts,
    (port, value) => wmCompareIsExplicitUsbConnector(port) && /usb\s*(?:type\s*)?[- ]?c\b|usb-c\b/.test(value),
  );
  specs.usbStandard = usbStandardMatch ? `USB ${usbStandardMatch[1]}` : undefined;
  specs.audioInputs = countCategoryPorts(allPorts, (port, value) => safeText(port.category).toLowerCase() === "audio" || /audio|line|mic|dante|aes67|toslink|spdif/.test(value), "input");
  specs.audioOutputs = countCategoryPorts(allPorts, (port, value) => safeText(port.category).toLowerCase() === "audio" || /audio|line|speaker|dante|aes67|toslink|spdif/.test(value), "output");
  specs.networkPorts = countCategoryPorts(allPorts, (_port, value) => /rj-?45|ethernet|lan|network|10\/100|1000base|10gbase/.test(value));
  specs.controlPorts = countCategoryPorts(allPorts, (port, value) => safeText(port.category).toLowerCase() === "control" || /rs-?232|ir\b|cec|relay|gpio|contact closure|control/.test(value));

  specs.rs232 = anyPort(allPorts, /rs-?232/);
  specs.ir = anyPort(allPorts, /\bir\b|infrared/);
  specs.cec = /\bcec\b/.test(blob) || undefined;
  specs.relay = anyPort(allPorts, /relay|contact closure/);
  specs.gpio = anyPort(allPorts, /gpio/);
  specs.ethernetControl = /web ui|api|tcp\/ip|tcp-ip|ethernet control|lan control/.test(blob) || undefined;

  specs.audioDeEmbed = /audio\s*de.?embed|de.?embed/.test(blob) || undefined;
  specs.audioEmbed = /audio\s*embed/.test(blob) || undefined;
  specs.analogAudio = /analog audio|analogue audio|line in|line out|phoenix audio/.test(blob) || undefined;
  specs.arc = /\barc\b/.test(blob) || undefined;
  specs.earc = /\bearc\b/.test(blob) || undefined;
  specs.dante = /\bdante\b/.test(blob) || undefined;
  specs.aes67 = /aes67/.test(blob) || undefined;

  specs.poe = /\bpoe\b|poe\+|802\.3af|802\.3at|power over ethernet/.test(blob) || undefined;
  specs.poc = /\bpoc\b|power over cable/.test(blob) || undefined;
  specs.poh = /\bpoh\b|power over hdbaset/.test(blob) || undefined;
  specs.powerDelivery = /usb-c power|power delivery|\bpd\b/.test(blob) || undefined;
  specs.externalPsu = /external power|dc power|power supply|psu|adapter/.test(blob) || anyPort(allPorts, /power supply|dc power|psu/);
  specs.internalPsu = /internal power|iec|mains input/.test(blob) || undefined;

  if (specs.poh) specs.powerSupply = "PoH / HDBaseT remote power";
  else if (specs.poc) specs.powerSupply = "PoC remote power";
  else if (specs.poe) specs.powerSupply = "PoE";
  else if (specs.externalPsu) specs.powerSupply = "External PSU";
  else if (specs.internalPsu) specs.powerSupply = "Internal PSU";

  return Object.fromEntries(Object.entries(specs).filter(([, value]) => value !== undefined)) as CompareSpecFacts;
}

function detectStructuredFeatures(product: WyrestormProduct, blob: string): Record<string, boolean> {
  const profile = technicalProfile(product);
  const transportText = (profile?.transports ?? []).join(" ").toLowerCase();
  const combined = [blob, transportText].join(" ");
  const features = detectFeatures(combined);

  if (/10g ethernet|10gbe|networkhd 600/.test(combined)) features.tenGig = true;
  if (/1g ethernet|networkhd 100|networkhd 500/.test(combined)) features.tenGig = features.tenGig || false;

  return features;
}

function sourceTier(product: WyrestormProduct, usedStructuredPorts: boolean, warnings: string[]): CompareDecisionProfile["sourceTier"] {
  const profile = technicalProfile(product);
  const status = Number(profile?.sourceQuality?.officialPageStatus);

  if (status === 200 && usedStructuredPorts && warnings.length === 0) {
    return "official-structured";
  }

  if (status === 200 && (usedStructuredPorts || (profile?.sourceQuality?.capturedTechnicalLineCount ?? 0) > 0)) {
    return "official-structured";
  }

  return "text-inferred";
}

function sourceLabelFor(tier: CompareDecisionProfile["sourceTier"]): string {
  if (tier === "official-structured") return "Official-page extracted WyreStorm facts";
  if (tier === "verified-profile") return "Verified WyreStorm profile";
  if (tier === "missing") return "Missing WyreStorm facts";
  return "Text-inferred WyreStorm facts";
}

export function buildWyrestormCompareProfile(product: WyrestormProduct): CompareDecisionProfile {
  const governed = resolveProductTechnicalData(product);
  const blob = text(product);
  const fallbackDomain = detectDomain(product, blob);
  const domain = governed.compare.domain ?? fallbackDomain;
  const fallbackRole = detectRole(product, blob, domain);
  const role = governed.compare.role ?? fallbackRole;
  const io = structuredIo(product, blob);
  const fallbackSpecs = buildSpecFacts(product, blob, io.inputCount, io.outputCount);
  const specs =
    governed.sourceTier === "verified-profile"
      ? { ...governed.compare.specs }
      : {
          ...fallbackSpecs,
          ...governed.compare.specs,
        };
  const fallbackFeatures = detectStructuredFeatures(product, blob);
  const features = {
    ...fallbackFeatures,
    ...(governed.compare.features ?? {}),
  };
  const tier = governed.sourceTier;
  const fallbackTransports = [
    canonicalTransport(domain),
    technicalProfile(product)?.transports?.join(" / "),
  ].filter(Boolean).join(" / ");
  const warnings = Array.from(new Set([
    ...io.warnings,
    ...governed.warnings,
    ...governed.missingFields.map((field) => `Missing mandatory WyreStorm technical field: ${field}.`),
  ].filter(Boolean)));
  const evidence = Array.from(new Set([
    ...io.evidence,
    ...governed.evidence,
  ].filter(Boolean)));

  return {
    sku: product.sku,
    title: product.name || product.title || product.sku,
    domain,
    role,
    transport: governed.compare.transport || fallbackTransports || canonicalTransport(domain),
    inputCount: governed.compare.inputCount ?? io.inputCount,
    outputCount: governed.compare.outputCount ?? io.outputCount,
    maxResolution: governed.compare.maxResolution ?? detectResolution(blob),
    chroma: governed.compare.chroma ?? detectChroma(blob),
    latency: governed.compare.latency,
    features: Object.keys(features).length > 0 ? features : undefined,
    specs,
    sourceUrl: governed.sourceUrl ?? technicalProfile(product)?.sourceQuality?.officialProductUrl,
    sourceTier: tier,
    sourceLabel: governed.statusLabel || sourceLabelFor(tier),
    profileEvidence: evidence,
    profileWarnings: warnings,
    readiness: governed.compareReady ? "compare-ready" : "verify-only",
  };
}
