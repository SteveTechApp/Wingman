import type {
  VisualDiagramEdge,
  VisualDiagramModel,
  VisualDiagramNode,
  VisualNodeKind,
  VisualNodeStatus,
} from "./visualStudioTypes";

/**
 * Wingman product-connection engine
 * ----------------------------------
 * Turns a single governed WyreStorm product record into a schematic-accurate
 * "how would this actually be wired" view: which generic third-party boxes
 * sit either side of it, how many of each, and whether the signal path is
 * independently routed, duplicated/mirrored, or carried over a network.
 *
 * Real product records (public/product-intelligence-index.json) carry a rich
 * `technicalProfile` written by the product-intelligence pipeline:
 *   technicalProfile.io.ports / .video / .audio / .usb / .network / .control
 *     -> itemised physical connectors with {count, connector, direction, category, evidence}
 *   technicalProfile.video / .audio / .usb / .network / .control / .power
 *     -> pre-summarised capability groups (present, protocols, formats, etc.)
 *   productClassification.{primaryCategory,category,subCategory,productType,
 *     systemRole,applicationRole,transportClass,signalDomains}
 *     -> already-computed topology/role facts (e.g. "Duplicate one source to
 *        multiple displays" vs "Central video routing")
 *
 * This module reads that real shape (with graceful fallback to summary/tag
 * text when a field is missing) instead of guessing from the top-level
 * `connectors` string list alone, and uses the classification facts to avoid
 * the single most consequential mistake a generic engine can make: showing a
 * splitter/distribution amplifier's mirrored outputs as if they were
 * independently routed matrix zones.
 */

type UnknownRecord = Record<string, unknown>;

type SignalFamily =
  | "video"
  | "usb"
  | "audio"
  | "network"
  | "control"
  | "unknown";

type DeploymentArchetype =
  | "matrix"
  | "distribution"
  | "avoip-encoder"
  | "avoip-decoder"
  | "avoip-transceiver"
  | "avoip-endpoint"
  | "video-wall"
  | "multiview"
  | "camera"
  | "hdbaset-extender"
  | "presentation-switcher"
  | "audio-processor"
  | "control-processor"
  | "extension"
  | "generic";

interface MatrixDimensions {
  inputs: number;
  outputs: number;
}

interface TechnicalPort {
  count?: number;
  connector: string;
  direction: string;
  category: string;
  evidence: string;
}

interface ProductClassificationFacts {
  primaryCategory: string;
  category: string;
  subCategory: string;
  productType: string;
  systemRole: string;
  applicationRole: string;
  transportClass: string[];
  signalDomains: string[];
}

interface ProductConnectionFacts {
  sku: string;
  name: string;
  category: string;
  summary: string;
  matrixSize: string;
  matrixSizeEvidence: string;
  quoteSafety: string;
  officialProductUrl: string;
  classification: ProductClassificationFacts;
  archetype: DeploymentArchetype;
  connectorChips: string[];
  ports: TechnicalPort[];
  video: {
    present: boolean;
    standards: string[];
    processing: string[];
    inputPorts: TechnicalPort[];
    outputPorts: TechnicalPort[];
    mirroredOutputPorts: TechnicalPort[];
  };
  audio: {
    present: boolean;
    formats: string[];
    processing: string[];
    networkAudio: string[];
    microphone: string[];
    speaker: string[];
    deEmbed: boolean;
    embed: boolean;
    arc: boolean;
  };
  usb: {
    present: boolean;
    versions: string[];
    roles: string[];
    powerDelivery: boolean;
    hostPorts: TechnicalPort[];
    devicePorts: TechnicalPort[];
    unclassifiedPorts: TechnicalPort[];
  };
  network: {
    present: boolean;
    interfaces: string[];
    protocols: string[];
    powerOverNetwork: string[];
    carriesAvSignal: boolean;
  };
  control: {
    present: boolean;
    protocols: string[];
  };
  power: {
    poe: boolean;
    powerDelivery: boolean;
  };
  matrixDimensions: MatrixDimensions | null;
  videoRouting: {
    inputCount?: number;
    outputCount?: number;
    independentlyRouted: boolean;
    reconciliationNote?: string;
  };
}

interface GenericEndpointDefinition {
  id: string;
  label: string;
  subtitle: string;
  kind: VisualNodeKind;
  status: VisualNodeStatus;
  column: number;
  row: number;
  edgeDirection: "to-product" | "from-product";
  edgeLabel: string;
  edgeStatus?: VisualNodeStatus;
}

// ---------------------------------------------------------------------------
// Generic value helpers
// ---------------------------------------------------------------------------

function asRecord(value: unknown): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as UnknownRecord;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asNumber(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asString(item))
    .filter((item) => item.length > 0);
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function summarize(values: string[], fallback: string, limit = 3): string {
  const cleaned = unique(values);

  if (cleaned.length === 0) {
    return fallback;
  }

  return cleaned.slice(0, limit).join(" | ");
}

function sentenceCaseQuoteSafety(value: string): string {
  if (!value) {
    return "Verify before quote";
  }

  return value
    .split("-")
    .filter(Boolean)
    .map((part, index) => {
      if (index > 0) {
        return part;
      }

      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function parseMatrixDimensions(value: string): MatrixDimensions | null {
  const match = value.match(/(\d+)\s*[x×]\s*(\d+)/i);

  if (!match) {
    return null;
  }

  const inputs = Number.parseInt(match[1], 10);
  const outputs = Number.parseInt(match[2], 10);

  if (!Number.isFinite(inputs) || !Number.isFinite(outputs)) {
    return null;
  }

  if (inputs < 1 || outputs < 1) {
    return null;
  }

  return { inputs, outputs };
}

function includesAny(values: string[], pattern: RegExp): boolean {
  return values.some((value) => pattern.test(value));
}

// ---------------------------------------------------------------------------
// Physical port parsing (technicalProfile.io.*)
// ---------------------------------------------------------------------------

function asTechnicalPort(value: unknown): TechnicalPort | null {
  const record = asRecord(value);
  const connector = asString(record.connector);

  if (!connector) {
    return null;
  }

  return {
    count: asNumber(record.count),
    connector,
    direction: asString(record.direction).toLowerCase(),
    category: asString(record.category).toLowerCase(),
    evidence: asString(record.evidence),
  };
}

function asTechnicalPortList(value: unknown): TechnicalPort[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asTechnicalPort(item))
    .filter((port): port is TechnicalPort => port !== null);
}

function portText(port: TechnicalPort): string {
  return `${port.connector} ${port.evidence} ${port.category} ${port.direction}`.toLowerCase();
}

// Ports the product-intelligence scraper captured from "In the box" lists -
// brackets, remotes, quickstart guides, power leads - are not signal
// connectors and must never be counted as routable I/O or shown as a
// connector chip.
const ACCESSORY_PORT_PATTERN =
  /\b(bracket|mount|remote|battery|psu|power supply|power cord|power lead|ac power|dc power|mains|adapter|quickstart|quick start|guide|manual|warranty|rack|terminal block|cable\b|lens cap|privacy cover|unit\b|kit\b|screw|sticker|label|rubber foot|feet\b)\b/;

// Some connector rows describe the product itself (e.g. "CAM-420-PTZ Camera
// 1x CAM-420-PTZ Camera") or an optical zoom spec mislabelled as SFP/fibre by
// the scraper. These are dropped from routable port counts.
const SELF_REFERENCE_PORT_PATTERN = /\b(camera|matrix|transceiver|receiver|encoder|decoder)\b.*\b\1\b/;

function isAccessoryPort(port: TechnicalPort): boolean {
  const text = portText(port);

  if (!text.trim()) {
    return true;
  }

  if (ACCESSORY_PORT_PATTERN.test(text)) {
    return true;
  }

  if (SELF_REFERENCE_PORT_PATTERN.test(text)) {
    return true;
  }

  if ((port.count ?? 0) > 64) {
    // Values like "12x optical and 4x digital zoom" get mis-parsed as a
    // connector count; no real product ships 64+ of one physical connector.
    return true;
  }

  return false;
}

function routablePorts(ports: TechnicalPort[]): TechnicalPort[] {
  return ports.filter((port) => !isAccessoryPort(port));
}

function portsOfCategory(ports: TechnicalPort[], category: string): TechnicalPort[] {
  return routablePorts(ports).filter((port) => port.category === category);
}

function sumPortCount(ports: TechnicalPort[]): number {
  return ports.reduce((total, port) => total + (port.count ?? 1), 0);
}

const NON_ROUTED_OUTPUT_PATTERN =
  /\b(mirror|mirrored|parallel|duplicate|duplicated|loop|loop-out|loop out|daisy|cascade|local monitor|monitor out|preview|aux)\b/;

function isNonRoutedOutputPort(port: TechnicalPort): boolean {
  return NON_ROUTED_OUTPUT_PATTERN.test(portText(port));
}

// ---------------------------------------------------------------------------
// Connector-name family classifier (fallback for records that only carry the
// flat top-level `connectors` string list, e.g. cables or thin fixtures)
// ---------------------------------------------------------------------------

function connectorFamily(value: string): SignalFamily {
  const normalized = value.toLowerCase();

  if (/usb|host|device|type-c|type c/.test(normalized)) {
    return "usb";
  }

  if (/audio|dante|aes67|speaker|microphone|mic\b|s\/pdif|spdif|analogue|analog|70v|100v|line[- ]?level/.test(normalized)) {
    return "audio";
  }

  if (/lan|ethernet|network|rj45|ip\b|ndi|sdvoe|networkhd|sfp|fibre|fiber/.test(normalized)) {
    return "network";
  }

  if (/rs-232|rs232|cec|ir\b|gpio|relay|control|api|telnet/.test(normalized)) {
    return "control";
  }

  if (/hdmi|displayport|dp\b|hdbaset|hdbt|video|sdi|vga|dvi/.test(normalized)) {
    return "video";
  }

  return "unknown";
}

function familyConnectors(connectors: string[], family: SignalFamily): string[] {
  return unique(connectors.filter((connector) => connectorFamily(connector) === family));
}

// ---------------------------------------------------------------------------
// Deployment archetype classification
//
// IMPORTANT: productClassification.{primaryCategory,category,subCategory,
// productType} is a governed, controlled-vocabulary taxonomy computed
// upstream by the product-intelligence pipeline (confidence-scored against
// the datasheet/PDF corpus). It must be checked BEFORE any free-text
// marketing-copy matching, not after: real catalog data shows that words
// like "distribute"/"duplicate" appear in the sales prose of the vast
// majority of matrix and AVoIP products ("distribute 4K video across your
// network", "duplicate content to every zone" etc.), and "multiview" is a
// common feature callout even on single-source endpoints. Checking the full
// free-text blob first previously misrouted the large majority of NetworkHD
// AV-over-IP products and a meaningful share of matrix products into the
// "distribution" (dumb splitter) archetype - a severe, catalog-wide
// misclassification.
//
// The narrow `structured` text below is built ONLY from the governed
// classification fields (short, controlled-vocabulary phrases such as
// "Splitter / distribution amplifier" or "AVoIP endpoint"), never from the
// summary/description marketing prose, so keyword matching against it does
// not suffer the same false-positive collisions.
//
// The free-text `blob` (SKU + summary/description/connectors/technologies)
// is only consulted as a last-resort fallback for older/thinner records that
// have no productClassification at all.
// ---------------------------------------------------------------------------

function classifyArchetype(
  sku: string,
  classification: ProductClassificationFacts,
  blob: string,
): DeploymentArchetype {
  const primary = classification.primaryCategory;
  const structured = [
    classification.primaryCategory,
    classification.category,
    classification.subCategory,
    classification.productType,
    classification.systemRole,
    classification.applicationRole,
  ]
    .join(" ")
    .toLowerCase();

  if (primary) {
    if (primary === "Distribution" || /distribution amplifier|\bsplitter\b/.test(structured)) {
      return "distribution";
    }

    const isAvoip = primary === "NetworkHD AV over IP" || /\bav over ip\b/.test(structured);

    if (isAvoip) {
      if (/\btransceiver\b/.test(structured) || /-TRX/i.test(sku)) {
        return "avoip-transceiver";
      }

      if (/\bencoder\b/.test(structured)) {
        return "avoip-encoder";
      }

      if (/\bdecoder\b/.test(structured)) {
        return "avoip-decoder";
      }

      if (/multiview/.test(structured)) {
        return "multiview";
      }

      if (/controller|control interface|control application/.test(structured)) {
        return "control-processor";
      }

      if (/network switch/.test(structured)) {
        // Pre-configured AV-over-IP network infrastructure, not itself a
        // video/USB/audio signal endpoint - fall through to a generic
        // connectivity view rather than an AVoIP source/destination shape.
        return "generic";
      }

      return "avoip-endpoint";
    }

    if (primary === "Matrix / Routing" || /matrix switching|\bhdmi matrix\b/.test(structured)) {
      return "matrix";
    }

    if (primary === "Camera / Capture" || /camera\s*\/\s*capture/.test(structured)) {
      return "camera";
    }

    if (primary === "Video Processing" || /video\s*wall/.test(structured)) {
      return "video-wall";
    }

    if (/multiview|multi-view/.test(structured)) {
      return "multiview";
    }

    if (primary === "Audio" || /amplification|dsp amplifier/.test(structured)) {
      return "audio-processor";
    }

    if (primary === "Control" || /control interface|software control|signal management/.test(structured)) {
      return "control-processor";
    }

    if (primary === "Extension" || /hdbaset extender|usb\s*\/\s*kvm extender|\bkvm extender\b/.test(structured)) {
      return "hdbaset-extender";
    }

    if (
      primary === "Presentation / Room Core" ||
      primary === "Unified Communications" ||
      /presentation switcher|room switcher|room source switcher|speakerphone switcher/.test(structured)
    ) {
      return "presentation-switcher";
    }
  }

  // Fallback: legacy/thin records without a governed productClassification -
  // guess from the SKU and free-text marketing blob, same as before.
  const text = [structured, blob].join(" ").toLowerCase();

  if (/distribut|splitter|duplicat/.test(text)) {
    return "distribution";
  }

  if (/\bmatrix\b/.test(text)) {
    return "matrix";
  }

  const isAvoipFallback = /avoip|networkhd|av[- ]over[- ]ip/.test(text);

  if (isAvoipFallback) {
    if (/transceiver|\btrx\b/.test(text) || /-TRX/i.test(sku)) {
      return "avoip-transceiver";
    }

    if (/\bencoder\b/.test(text) || /-TX\d*$/i.test(sku)) {
      return "avoip-encoder";
    }

    if (/\bdecoder\b/.test(text) || /-RX\d*$/i.test(sku)) {
      return "avoip-decoder";
    }

    return "avoip-endpoint";
  }

  if (/video\s*wall/.test(text)) {
    return "video-wall";
  }

  if (/multiview|multi-view/.test(text)) {
    return "multiview";
  }

  if (/\bcamera\b|\bptz\b/.test(text)) {
    return "camera";
  }

  if (/hdbaset|hdbt/.test(text)) {
    return "hdbaset-extender";
  }

  if (/presentation|switcher/.test(text)) {
    return "presentation-switcher";
  }

  if (/amplifier|dsp\b|audio processor/.test(text)) {
    return "audio-processor";
  }

  return "generic";
}

// ---------------------------------------------------------------------------
// Control-protocol description
// ---------------------------------------------------------------------------

function describeControlProtocols(protocols: string[]): string[] {
  const described = new Set<string>();

  for (const protocol of protocols) {
    const value = protocol.toLowerCase();

    if (/rs-?232/.test(value)) {
      described.add("RS-232 serial control");
    } else if (/\bir\b|infrared/.test(value)) {
      described.add("IR control (emitter/receiver)");
    } else if (/\bcec\b/.test(value)) {
      described.add("HDMI-CEC display power control");
    } else if (/relay|contact closure|gpio/.test(value)) {
      described.add("Relay / GPIO contact closure");
    } else if (/telnet|api|web ui|tcp|rest|ip control/.test(value)) {
      described.add("IP / API control (LAN)");
    } else if (protocol.trim().length > 0) {
      described.add(protocol.trim());
    }
  }

  return [...described];
}

// ---------------------------------------------------------------------------
// Fact collection
// ---------------------------------------------------------------------------

function collectFacts(seedSku: string, product: UnknownRecord | null): ProductConnectionFacts {
  const technicalProfile = asRecord(product?.technicalProfile);
  const sourceQuality = asRecord(technicalProfile.sourceQuality);
  const videoProfile = asRecord(technicalProfile.video);
  const audioProfile = asRecord(technicalProfile.audio);
  const usbProfile = asRecord(technicalProfile.usb);
  const networkProfile = asRecord(technicalProfile.network);
  const controlProfile = asRecord(technicalProfile.control);
  const powerProfile = asRecord(technicalProfile.power);
  const io = asRecord(technicalProfile.io);
  const productClassificationRecord = asRecord(product?.productClassification);

  const classification: ProductClassificationFacts = {
    primaryCategory: asString(productClassificationRecord.primaryCategory),
    category: asString(productClassificationRecord.category),
    subCategory: asString(productClassificationRecord.subCategory),
    productType: asString(productClassificationRecord.productType),
    systemRole: asString(productClassificationRecord.systemRole),
    applicationRole: asString(productClassificationRecord.applicationRole),
    transportClass: asStringList(productClassificationRecord.transportClass),
    signalDomains: asStringList(productClassificationRecord.signalDomains),
  };

  const matrixSize = asString(product?.matrixSize);
  const matrixDimensions = parseMatrixDimensions(matrixSize);

  const topLevelConnectors = asStringList(product?.connectors);
  const technologies = asStringList(product?.technologies);
  const blob = [
    asString(product?.category),
    asString(product?.summary),
    asString(product?.description),
    ...topLevelConnectors,
    ...technologies,
  ]
    .join(" ")
    .toLowerCase();

  const sku = asString(product?.sku) || seedSku;
  const archetype = classifyArchetype(sku, classification, blob);

  // Prefer itemised physical ports; every category array also independently
  // appears in technicalProfile.io.ports, so read the per-category arrays
  // first and only fall back to filtering the flat `ports` list.
  const allPorts = asTechnicalPortList(io.ports);
  const videoPorts = asTechnicalPortList(io.video).length > 0 ? asTechnicalPortList(io.video) : portsOfCategory(allPorts, "video");
  const audioPorts = asTechnicalPortList(io.audio).length > 0 ? asTechnicalPortList(io.audio) : portsOfCategory(allPorts, "audio");
  const usbPorts = asTechnicalPortList(io.usb).length > 0 ? asTechnicalPortList(io.usb) : portsOfCategory(allPorts, "usb");
  const networkPorts = asTechnicalPortList(io.network).length > 0 ? asTechnicalPortList(io.network) : portsOfCategory(allPorts, "network");
  const controlPorts = asTechnicalPortList(io.control).length > 0 ? asTechnicalPortList(io.control) : portsOfCategory(allPorts, "control");

  const cleanVideoPorts = routablePorts(videoPorts);
  const videoInputPorts = cleanVideoPorts.filter((port) => port.direction === "input");
  const videoOutputPortsAll = cleanVideoPorts.filter((port) => port.direction === "output");
  const videoOutputPorts = videoOutputPortsAll.filter((port) => !isNonRoutedOutputPort(port));
  const mirroredOutputPorts = videoOutputPortsAll.filter((port) => isNonRoutedOutputPort(port));

  const cleanUsbPorts = routablePorts(usbPorts);
  const usbRoles = asStringList(usbProfile.roles);
  const usbHostPorts = cleanUsbPorts.filter((port) => port.direction === "input" || /\bhost\b/.test(portText(port)));
  const usbDevicePorts = cleanUsbPorts.filter(
    (port) => port.direction === "output" && !/\bhost\b/.test(portText(port)),
  );
  const usbUnclassifiedPorts = cleanUsbPorts.filter(
    (port) => port.direction !== "input" && port.direction !== "output",
  );

  const networkProtocols = unique(asStringList(networkProfile.protocols));
  const carriesAvSignal =
    archetype === "avoip-encoder" ||
    archetype === "avoip-decoder" ||
    archetype === "avoip-transceiver" ||
    archetype === "avoip-endpoint" ||
    includesAny(networkProtocols, /networkhd|ndi|sdvoe/i);

  const audioNetworkFormats = unique(asStringList(audioProfile.networkAudio));
  const audioFormatsBlob = [...asStringList(audioProfile.formats), ...audioNetworkFormats].join(" ").toLowerCase();

  // Video routing quantity: independently routed for a real matrix, but a
  // splitter/distribution amplifier duplicates one input to N outputs - that
  // must never be represented as N independently switchable zones.
  const physicalOutputCount = sumPortCount(videoOutputPorts);
  const physicalInputCount = sumPortCount(videoInputPorts);
  let routedInputCount: number | undefined = physicalInputCount > 0 ? physicalInputCount : undefined;
  let routedOutputCount: number | undefined = physicalOutputCount > 0 ? physicalOutputCount : undefined;
  let reconciliationNote: string | undefined;
  const independentlyRouted = archetype !== "distribution";

  if (matrixDimensions) {
    if (archetype === "distribution") {
      routedInputCount = matrixDimensions.inputs;
      routedOutputCount = matrixDimensions.outputs;
    } else {
      const conflicts =
        (routedInputCount !== undefined && routedInputCount !== matrixDimensions.inputs) ||
        (routedOutputCount !== undefined && routedOutputCount !== matrixDimensions.outputs);

      routedInputCount = matrixDimensions.inputs;
      routedOutputCount = matrixDimensions.outputs;

      if (conflicts && mirroredOutputPorts.length > 0) {
        reconciliationNote = `Physical HDMI output count also includes ${sumPortCount(mirroredOutputPorts)} mirrored/local-monitor output(s) that are not independently routable matrix zones.`;
      } else if (conflicts) {
        reconciliationNote = `${matrixSize} routed size is read from governed matrix-size data; physical connector count differs and should be checked against the datasheet.`;
      }
    }
  } else if (mirroredOutputPorts.length > 0) {
    reconciliationNote = `${sumPortCount(mirroredOutputPorts)} additional mirrored/local-monitor output(s) documented; not counted as independently routable outputs.`;
  }

  return {
    sku,
    name: asString(product?.name) || seedSku,
    category: asString(product?.category) || classification.primaryCategory || "Selected WyreStorm product",
    summary:
      asString(product?.summary) ||
      asString(product?.description) ||
      "Product intelligence is not yet loaded. Confirm the official product data before quote.",
    matrixSize,
    matrixSizeEvidence: asString(product?.matrixSizeEvidence),
    quoteSafety: asString(product?.quoteSafety) || "verify-before-quote",
    officialProductUrl: asString(sourceQuality.officialProductUrl),
    classification,
    archetype,
    connectorChips: topLevelConnectors.filter((connector) => !isAccessoryPort({ connector, direction: "", category: "", evidence: "" })),
    ports: allPorts,
    video: {
      present: asBoolean(videoProfile.present) || cleanVideoPorts.length > 0,
      standards: asStringList(videoProfile.standards),
      processing: asStringList(videoProfile.processing),
      inputPorts: videoInputPorts,
      outputPorts: videoOutputPorts,
      mirroredOutputPorts,
    },
    audio: {
      present: asBoolean(audioProfile.present) || routablePorts(audioPorts).length > 0,
      formats: asStringList(audioProfile.formats),
      processing: asStringList(audioProfile.processing),
      networkAudio: audioNetworkFormats,
      microphone: asStringList(audioProfile.microphone).filter((entry) => entry.length < 60),
      speaker: asStringList(audioProfile.speaker).filter((entry) => entry.length < 60),
      deEmbed: /de-?embed/.test(audioFormatsBlob) || /de-?embed/.test(blob),
      embed: /\baudio embed\b/.test(blob),
      arc: /\bearc\b|\barc\b/.test(audioFormatsBlob) || /\bearc\b|\barc\b/.test(blob),
    },
    usb: {
      present: asBoolean(usbProfile.present) || routablePorts(usbPorts).length > 0,
      versions: asStringList(usbProfile.versions),
      roles: usbRoles,
      powerDelivery: asBoolean(usbProfile.powerDelivery),
      hostPorts: usbHostPorts,
      devicePorts: usbDevicePorts,
      unclassifiedPorts: usbUnclassifiedPorts,
    },
    network: {
      present: asBoolean(networkProfile.present) || routablePorts(networkPorts).length > 0,
      interfaces: asStringList(networkProfile.interfaces).filter((entry) => entry.length < 80),
      protocols: networkProtocols,
      powerOverNetwork: asStringList(networkProfile.powerOverNetwork),
      carriesAvSignal,
    },
    control: {
      present: asBoolean(controlProfile.present) || routablePorts(controlPorts).length > 0,
      protocols: unique(asStringList(controlProfile.protocols)),
    },
    power: {
      poe: asBoolean(powerProfile.poe),
      powerDelivery: asBoolean(powerProfile.powerDelivery),
    },
    matrixDimensions,
    videoRouting: {
      inputCount: routedInputCount,
      outputCount: routedOutputCount,
      independentlyRouted,
      reconciliationNote,
    },
  };
}

// ---------------------------------------------------------------------------
// Product (center) node
// ---------------------------------------------------------------------------

function archetypeLabel(archetype: DeploymentArchetype): string {
  const labels: Record<DeploymentArchetype, string> = {
    matrix: "Matrix switching - independently routed I/O",
    distribution: "Distribution amplifier / splitter - duplicated output, not independently routed",
    "avoip-encoder": "NetworkHD / AV-over-IP encoder",
    "avoip-decoder": "NetworkHD / AV-over-IP decoder",
    "avoip-transceiver": "NetworkHD / AV-over-IP transceiver (TX or RX per configuration)",
    "avoip-endpoint": "NetworkHD / AV-over-IP endpoint",
    "video-wall": "Video wall processor - tiled canvas output, not independent full-frame zones",
    multiview: "Multiview processor - composited canvas output",
    camera: "Camera / capture endpoint",
    "hdbaset-extender": "HDBaseT extension - point-to-point",
    "presentation-switcher": "Presentation / UC switcher",
    "audio-processor": "Audio processing / amplification",
    "control-processor": "Control system component",
    extension: "Signal extension",
    generic: "Selected WyreStorm product",
  };

  return labels[archetype];
}

function buildProductNode(facts: ProductConnectionFacts): VisualDiagramNode {
  const videoConnectors = familyConnectors(facts.connectorChips, "video");
  const usbConnectors = familyConnectors(facts.connectorChips, "usb");
  const audioConnectors = familyConnectors(facts.connectorChips, "audio");
  const networkConnectors = familyConnectors(facts.connectorChips, "network");
  const controlConnectors = familyConnectors(facts.connectorChips, "control");

  const connectionSummary = [
    videoConnectors.length > 0 ? `Video: ${summarize(videoConnectors, "documented")}` : "",
    usbConnectors.length > 0 ? `USB: ${summarize(usbConnectors, "documented")}` : "",
    audioConnectors.length > 0 ? `Audio: ${summarize(audioConnectors, "documented")}` : "",
    networkConnectors.length > 0 ? `Network: ${summarize(networkConnectors, "documented")}` : "",
    controlConnectors.length > 0 ? `Control: ${summarize(controlConnectors, "documented")}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const subtitleParts = [
    archetypeLabel(facts.archetype),
    facts.matrixSize ? `${facts.matrixSize} documented routing profile` : "Port quantities require validation",
    connectionSummary || "Physical connector map requires validation",
  ];

  return {
    id: "wyrestorm-product",
    label: facts.sku,
    subtitle: subtitleParts.join(" | "),
    kind: facts.archetype === "camera" ? "camera" : "switching",
    status: "recommended",
    emphasis: "primary",
    column: 2.25,
    row: 1.15,
  };
}

// ---------------------------------------------------------------------------
// Video endpoints - archetype and direction aware
// ---------------------------------------------------------------------------

function videoConnectorText(facts: ProductConnectionFacts): string {
  const fromPorts = unique([...facts.video.inputPorts, ...facts.video.outputPorts].map((port) => port.connector));
  const fromChips = familyConnectors(facts.connectorChips, "video");
  return summarize([...fromPorts, ...fromChips], "Video connector type TBC", 4);
}

function quantityLabel(count: number | undefined, noun: string): string {
  if (!count) {
    return "Quantity TBC";
  }

  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function buildVideoEndpoints(facts: ProductConnectionFacts): GenericEndpointDefinition[] {
  const { archetype, videoRouting } = facts;
  const connectorText = videoConnectorText(facts);
  const endpoints: GenericEndpointDefinition[] = [];

  // Most camera archetype products are pure single-output source devices (a
  // PTZ or USB camera has no video inputs at all), so the source endpoint is
  // suppressed by default. Some cameras are actually camera bridges/mixers
  // (e.g. CAM-0402-BRG: 2x HDMI in, 1x HDMI out) with real documented input
  // ports - those must still show their upstream camera/source feeds.
  const isCameraWithRealInputs = archetype === "camera" && facts.video.inputPorts.length > 0;

  const showSource =
    archetype !== "avoip-decoder" &&
    (archetype !== "camera" || isCameraWithRealInputs) &&
    (facts.video.inputPorts.length > 0 ||
      facts.matrixDimensions !== null ||
      (facts.video.present &&
        archetype !== "avoip-encoder" &&
        archetype !== "avoip-transceiver"));

  const showDestination =
    archetype !== "avoip-encoder" &&
    (
      facts.video.outputPorts.length > 0 ||
      (
        archetype !== "camera" &&
        (
          facts.matrixDimensions !== null ||
          facts.video.present
        )
      )
    );

  if (showSource) {
    const routingNote = isCameraWithRealInputs
      ? "Upstream camera or source feeds into this camera bridge/mixer before its single combined output."
      : archetype === "distribution"
        ? "This is the single upstream source that will be duplicated to every output."
        : "Independently switchable source input.";

    endpoints.push({
      id: "generic-video-sources",
      label: videoRouting.inputCount
        ? `${videoRouting.inputCount} × Generic source device${videoRouting.inputCount === 1 ? "" : "s"}`
        : "Generic source device(s)",
      subtitle: isCameraWithRealInputs
        ? `Third-party cameras, document cameras or other video sources feeding this camera bridge/mixer. ${quantityLabel(videoRouting.inputCount, "source input")} · ${connectorText}. ${routingNote}`
        : `Third-party laptops, media players, cameras or source equipment. ${quantityLabel(videoRouting.inputCount, "source input")} · ${connectorText}. ${routingNote}`,
      kind: "source",
      status: "normal",
      column: 0,
      row: 0.7,
      edgeDirection: "to-product",
      edgeLabel: `VIDEO · Source device to WyreStorm input · ${connectorText}`,
    });
  }

  if (showDestination) {
    const isDistribution = archetype === "distribution";
    const label =
      archetype === "camera"
        ? "Video destination / capture input"
        : videoRouting.outputCount
          ? `${videoRouting.outputCount} × Generic display destination${videoRouting.outputCount === 1 ? "" : "s"}`
          : "Generic display destination(s)";

    const routingNote = isDistribution
      ? "All outputs show an identical duplicated copy of the single source - they are not independently routable displays or zones."
      : archetype === "camera"
        ? "Receives the camera's evidenced local HDMI/video output (capture device, switcher input, UC appliance or local monitor)."
        : "Verify independent, mirrored and loop-output behaviour per output.";

    endpoints.push({
      id: "generic-video-destinations",
      label,
      subtitle:
        archetype === "camera"
          ? `Third-party UC appliance, capture device, switcher input or local monitor receiving the camera video output. ${connectorText}. ${routingNote}`
          : `Third-party displays, projectors, LED processors or downstream video equipment. ${quantityLabel(videoRouting.outputCount, "display output")} · ${connectorText}. ${routingNote}`,
      kind: "display",
      status: isDistribution ? "risk" : "normal",
      column: 4.5,
      row: 0.7,
      edgeDirection: "from-product",
      edgeLabel:
        archetype === "camera"
          ? `VIDEO · Camera output to capture / display destination · ${connectorText}`
          : `VIDEO · WyreStorm output to display destination · ${connectorText}${isDistribution ? " (duplicated)" : ""}`,
      edgeStatus: isDistribution ? "risk" : undefined,
    });
  }

  return endpoints;
}

// ---------------------------------------------------------------------------
// USB endpoints
// ---------------------------------------------------------------------------

function buildUsbEndpoints(facts: ProductConnectionFacts): GenericEndpointDefinition[] {
  const { usb } = facts;
  const usbChips = familyConnectors(facts.connectorChips, "usb");
  const hasUsbEvidence = usb.present || usbChips.length > 0;

  if (!hasUsbEvidence) {
    return [];
  }

  const versionNote =
    usb.versions.length > 0
      ? ` (${summarize(usb.versions, "", 2)})`
      : "";
  const connectorText = summarize(
    [
      ...usbChips,
      ...usb.hostPorts.map((port) => port.connector),
      ...usb.devicePorts.map((port) => port.connector),
    ],
    "USB connector and host/device role TBC",
    4,
  );
  const roleNote =
    usb.roles.length > 0
      ? ` Role: ${summarize(usb.roles, "", 2)}.`
      : "";
  const powerNote = usb.powerDelivery
    ? " Supports USB-C power delivery to the connected endpoint."
    : "";

  if (facts.archetype === "camera") {
    const cameraEndpoints: GenericEndpointDefinition[] = [
      {
        id: "camera-usb-host",
        label: "UC host / room computer",
        subtitle:
          `Third-party PC, room computer or conferencing appliance receiving USB video from the camera. ${connectorText}${versionNote}.${roleNote} Confirm the host port, USB bandwidth and cable distance.`,
        kind: "usb",
        status: "normal",
        column: 4.15,
        row: 2.5,
        edgeDirection: "from-product",
        edgeLabel: `USB · Camera device connection to host · ${connectorText}`,
      },
    ];

    // A plain PTZ/USB camera only sends USB video out to a host. A camera
    // bridge/mixer (e.g. CAM-0402-BRG) also has real documented USB input
    // ports for other camera/source feeds - that inbound direction must
    // still be shown when the port evidence says so.
    if (facts.usb.hostPorts.length > 0) {
      cameraEndpoints.push({
        id: "generic-usb-device",
        label: "Generic USB camera / source",
        subtitle:
          `Third-party USB camera or video source feeding this camera bridge/mixer. ${connectorText}${versionNote}.${roleNote} Confirm USB version and cable distance.`,
        kind: "usb",
        status: "normal",
        column: 0.35,
        row: 2.5,
        edgeDirection: "to-product",
        edgeLabel: `USB · USB camera/source to camera bridge · ${connectorText}`,
      });
    }

    return cameraEndpoints;
  }

  return [
    {
      id: "generic-usb-host",
      label: "Generic USB host",
      subtitle:
        `Third-party PC, laptop or room computer providing the USB host connection. ${connectorText}${versionNote}.${roleNote} Confirm which WyreStorm port owns the host connection.`,
      kind: "source",
      status: "normal",
      column: 0.35,
      row: 2.5,
      edgeDirection: "to-product",
      edgeLabel: `USB · Host connection to WyreStorm product · ${connectorText}`,
    },
    {
      id: "generic-usb-device",
      label: "Generic USB peripheral",
      subtitle:
        "Third-party camera, speakerphone, touch display, keyboard, mouse or USB device. " +
        `Confirm USB version, direction and bandwidth.${powerNote}`,
      kind: "usb",
      status: "normal",
      column: 4.15,
      row: 2.5,
      edgeDirection: "from-product",
      edgeLabel: "USB · WyreStorm product to generic USB peripheral",
    },
  ];
}

// ---------------------------------------------------------------------------
// Audio endpoints - analog/line/mic/speaker split out from Dante/AES67
// network audio, since they land on physically different infrastructure.
// ---------------------------------------------------------------------------

function buildAudioEndpoints(facts: ProductConnectionFacts): GenericEndpointDefinition[] {
  const { audio } = facts;
  const audioChips = familyConnectors(facts.connectorChips, "audio");
  const endpoints: GenericEndpointDefinition[] = [];

  // Embedded microphone/audio capability on a camera is not evidence of a
  // separately routable output to a generic DSP, amplifier or loudspeaker.
  if (facts.archetype === "camera") {
    return [];
  }

  const hasNetworkAudio = audio.networkAudio.length > 0;
  const hasAnalogAudio = audio.present || audioChips.length > 0;

  if (hasAnalogAudio) {
    const signalText = summarize(
      [...audioChips, ...audio.formats],
      "Audio format and connector TBC",
      4,
    );
    const micNote =
      audio.microphone.length > 0
        ? " Includes microphone/mic-array input."
        : "";
    const embedNote = audio.deEmbed
      ? " Audio de-embed: extracts audio from the video signal for local amplification."
      : audio.embed
        ? " Audio embed: inserts local audio into the outgoing video signal."
        : "";
    const arcNote = audio.arc
      ? " Supports ARC/eARC return audio from a display."
      : "";

    endpoints.push({
      id: "generic-audio-system",
      label: "Generic audio system",
      subtitle:
        `Third-party amplifier, DSP, mixer, active loudspeaker or line/70V-100V audio destination. ${signalText}.${micNote}${embedNote}${arcNote}`,
      kind: "audio",
      status: "normal",
      column: 4.15,
      row: 3.35,
      edgeDirection: "from-product",
      edgeLabel: `AUDIO · WyreStorm product to third-party audio equipment · ${signalText}`,
    });
  }

  if (hasNetworkAudio) {
    const protocolText = summarize(audio.networkAudio, "Dante/AES67", 2);

    endpoints.push({
      id: "generic-audio-network",
      label: "Dante / AES67 audio network",
      subtitle:
        `Third-party Dante- or AES67-capable DSP, amplifier or audio matrix reached over a dedicated, QoS-managed audio network - not a generic office LAN. Protocol: ${protocolText}.`,
      kind: "audio",
      status: "normal",
      column: 3.6,
      row: 4.05,
      edgeDirection: "from-product",
      edgeLabel: `AUDIO (${protocolText}) · WyreStorm product to networked audio infrastructure`,
    });
  }

  return endpoints;
}

// ---------------------------------------------------------------------------
// Network endpoint - distinguishes an AV-carrying NetworkHD/NDI/SDVoE
// transport from a plain control/service LAN, since they carry very
// different design and commissioning risk.
// ---------------------------------------------------------------------------

function buildNetworkEndpoint(facts: ProductConnectionFacts): GenericEndpointDefinition[] {
  const { network, archetype } = facts;
  const networkChips = familyConnectors(facts.connectorChips, "network");
  // Dante/AES67 is represented by the dedicated audio-network endpoint above;
  // don't double-count it here unless there is other network evidence too.
  const relevantProtocols = network.protocols.filter((protocol) => !/dante|aes67/i.test(protocol));
  const hasNetworkEvidence = network.interfaces.length > 0 || networkChips.length > 0 || relevantProtocols.length > 0 || network.carriesAvSignal;

  if (!hasNetworkEvidence) {
    return [];
  }

  const networkText = summarize([...networkChips, ...network.interfaces], "LAN interface TBC", 4);

  if (network.carriesAvSignal) {
    const protocolText = summarize(
      relevantProtocols,
      archetype === "camera" ? "NDI / IP video" : "NetworkHD",
      3,
    );

    return [
      {
        id: "generic-avoip-network",
        label:
          archetype === "camera"
            ? "NDI / IP video network"
            : "NetworkHD / AV-over-IP network",
        subtitle:
          archetype === "camera"
            ? `Managed network carrying NDI/IP video from the camera. Protocol: ${protocolText}. ${networkText}. Confirm switch bandwidth, multicast/QoS requirements and the receiving NDI/IP endpoint before quoting.`
            : `Dedicated (or VLAN-isolated) managed network switch carrying live AV traffic between NetworkHD/AVoIP endpoints. Protocol: ${protocolText}. ${networkText}. ` +
              "Do not treat this as a general office/guest LAN - confirm bandwidth, multicast/IGMP snooping and switch model before quoting.",
        kind: "network",
        status: "normal",
        column: 2.65,
        row: 0.7,
        edgeDirection: archetype === "avoip-decoder" ? "to-product" : "from-product",
        edgeLabel: `NETWORK (${protocolText}) · AV-over-IP transport · ${networkText}`,
      },
    ];
  }

  return [
    {
      id: "generic-network",
      label: "Generic network infrastructure",
      subtitle:
        `Third-party network switch, router or service LAN used for control/management. ${networkText}. ` +
        (relevantProtocols.length > 0 ? `Protocols: ${summarize(relevantProtocols, "", 3)}. ` : "") +
        "Do not imply AV-over-IP transport unless a NetworkHD/NDI/SDVoE protocol is confirmed.",
      kind: "network",
      status: "normal",
      column: 2.65,
      row: 3.75,
      edgeDirection: "from-product",
      edgeLabel: `NETWORK · WyreStorm LAN/service connection · ${networkText}`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Control endpoint
// ---------------------------------------------------------------------------

function buildControlEndpoint(facts: ProductConnectionFacts): GenericEndpointDefinition[] {
  const { control, archetype } = facts;
  const controlChips = familyConnectors(facts.connectorChips, "control");
  const hasControlEvidence = control.present || control.protocols.length > 0 || controlChips.length > 0;

  if (!hasControlEvidence) {
    return [];
  }

  const describedProtocols = describeControlProtocols(control.protocols);
  const controlText = summarize([...describedProtocols, ...controlChips], "Control interface TBC", 4);
  const directionNote =
    archetype === "camera"
      ? " Cameras typically receive control commands (e.g. PTZ presets over IP/IR) rather than originating them."
      : "";

  return [
    {
      id: "generic-control-system",
      label: "Generic control system",
      subtitle: `Third-party control processor, touch panel or automation system. ${controlText}.${directionNote}`,
      kind: "controller",
      status: "normal",
      column: 1.15,
      row: 3.75,
      edgeDirection: "to-product",
      edgeLabel: `CONTROL · Third-party control system to WyreStorm product · ${controlText}`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Fallback when nothing at all is known
// ---------------------------------------------------------------------------

function buildFallbackEndpoints(facts: ProductConnectionFacts): GenericEndpointDefinition[] {
  const hasKnownConnectivity =
    facts.connectorChips.length > 0 ||
    facts.ports.length > 0 ||
    facts.matrixDimensions !== null ||
    facts.video.present ||
    facts.audio.present ||
    facts.usb.present ||
    facts.network.present ||
    facts.control.present;

  if (hasKnownConnectivity) {
    return [];
  }

  return [
    {
      id: "generic-source-tbc",
      label: "Generic source equipment",
      subtitle: "Third-party source equipment. Exact signal type, connector and quantity are not yet governed.",
      kind: "source",
      status: "missing",
      column: 0,
      row: 1,
      edgeDirection: "to-product",
      edgeLabel: "CONNECTION TBC · Generic source to WyreStorm product",
      edgeStatus: "missing",
    },
    {
      id: "generic-destination-tbc",
      label: "Generic destination equipment",
      subtitle: "Third-party destination equipment. Exact signal type, connector and quantity are not yet governed.",
      kind: "output",
      status: "missing",
      column: 4.5,
      row: 1,
      edgeDirection: "from-product",
      edgeLabel: "CONNECTION TBC · WyreStorm product to generic destination",
      edgeStatus: "missing",
    },
  ];
}

function buildEndpointDefinitions(facts: ProductConnectionFacts): GenericEndpointDefinition[] {
  return [
    ...buildVideoEndpoints(facts),
    ...buildUsbEndpoints(facts),
    ...buildAudioEndpoints(facts),
    ...buildNetworkEndpoint(facts),
    ...buildControlEndpoint(facts),
    ...buildFallbackEndpoints(facts),
  ];
}

function endpointToNode(endpoint: GenericEndpointDefinition): VisualDiagramNode {
  return {
    id: endpoint.id,
    label: endpoint.label,
    subtitle: endpoint.subtitle,
    kind: endpoint.kind,
    status: endpoint.status,
    emphasis: endpoint.status === "missing" ? "compact" : "support",
    column: endpoint.column,
    row: endpoint.row,
  };
}

function endpointToEdge(endpoint: GenericEndpointDefinition, index: number): VisualDiagramEdge {
  const source = endpoint.edgeDirection === "to-product" ? endpoint.id : "wyrestorm-product";
  const target = endpoint.edgeDirection === "to-product" ? "wyrestorm-product" : endpoint.id;

  return {
    id: `connection-${index + 1}`,
    source,
    target,
    label: endpoint.edgeLabel,
    status: endpoint.edgeStatus,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

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

export function buildProductConnectionDiagram(
  fallbackModel: VisualDiagramModel,
  seedSku: string,
  product: UnknownRecord | null,
): VisualDiagramModel {
  if (!seedSku || fallbackModel.id !== "product-port-view") {
    return fallbackModel;
  }

  const facts = collectFacts(seedSku, product);
  const endpoints = buildEndpointDefinitions(facts);
  const productNode = buildProductNode(facts);

  const sourceEvidence = facts.officialProductUrl
    ? `Official product evidence is available for ${facts.sku}.`
    : `Official product URL is not yet attached for ${facts.sku}.`;

  const isDistribution = facts.archetype === "distribution";
  const isCamera = facts.archetype === "camera";

  const matrixEvidence = facts.matrixSizeEvidence
    ? facts.matrixSizeEvidence
    : facts.matrixSize
      ? isDistribution
        ? `${facts.matrixSize} is a duplication ratio (1 source shown on every output), not independently routed matrix I/O.`
        : `${facts.matrixSize} is present in governed product data. Confirm routed, mirrored and loop-output behaviour.`
      : "Input and output quantities remain TBC until governed port data is available.";

  const connectorEvidence =
    facts.connectorChips.length > 0
      ? `Documented connector families: ${summarize(facts.connectorChips, "None documented", 6)}.`
      : "No governed physical connector inventory is currently available.";

  const powerEvidence = facts.power.poe
    ? "This product is PoE/PoH/PoC powered - confirm the upstream port class and budget before install."
    : facts.network.powerOverNetwork.length > 0
      ? `Remote power over cable documented: ${summarize(facts.network.powerOverNetwork, "", 2)}. Confirm the supplying device before install.`
      : "";

  const assumptions = [
    sourceEvidence,
    matrixEvidence,
    connectorEvidence,
    "Generic endpoint boxes represent third-party equipment and are not part of the WyreStorm BOM.",
  ];

  if (facts.videoRouting.reconciliationNote) {
    assumptions.push(facts.videoRouting.reconciliationNote);
  }

  if (powerEvidence) {
    assumptions.push(powerEvidence);
  }

  if (facts.network.carriesAvSignal) {
    assumptions.push(
      "This product's network connection carries live AV/USB payload (NetworkHD/NDI/SDVoE) and must be designed as an AV transport network, not a generic data LAN.",
    );
  }

  const quoteRisks = [
    `${sentenceCaseQuoteSafety(facts.quoteSafety)} until the product data and project requirements are confirmed.`,
    "Do not count mirrored or loop outputs as independently routed matrix outputs.",
    "Do not include generic third-party endpoint boxes in the WyreStorm BOM.",
    "Do not infer AV-over-IP, USB host ownership, audio breakaway or control capability from connector names alone.",
  ];

  if (isDistribution) {
    quoteRisks.unshift(
      `${facts.sku} is a distribution amplifier/splitter: every output carries an identical duplicated copy of the single source. Do not price or design it as independently routable zones.`,
    );
  }

  const missingInformation = [
    "Exact physical port names, direction and quantities where governed port data is absent.",
    "Which outputs are independently routed, mirrored, loop-through, monitor or auxiliary outputs.",
    "Actual third-party source and destination models selected for the project.",
    "Project-specific cable types, lengths, receivers, adapters and infrastructure.",
  ];

  const nextActions = [
    "Validate the selected SKU against its current official product page or datasheet.",
    "Confirm source count, display count and independent routing requirements.",
    "Confirm USB host/device ownership, audio destination, LAN and control requirements.",
    "Replace TBC signal labels with governed port-level data when available.",
  ];

  return {
    ...fallbackModel,
    title: isCamera
      ? `${facts.sku} Connection Options`
      : `${facts.sku} Connectivity Flow`,
    subtitle: isCamera
      ? "Camera-source view showing evidenced video, USB, network and inbound PTZ control paths."
      : "Generic third-party equipment connected to the governed WyreStorm product and its documented signal families.",
    customerSummary: isCamera
      ? `${facts.sku} is shown as a WyreStorm PTZ camera source. Connected host, capture, network and control boxes represent third-party equipment outside WyreStorm supply.`
      : `${facts.sku} is shown as the central WyreStorm product. ` +
        "Generic source, display, audio, USB, network and control boxes represent third-party equipment outside WyreStorm supply.",
    technicalSummary: isCamera
      ? `${facts.name} is treated as a camera/source endpoint, not a switching or central-processing device. USB, HDMI and IP video leave the camera; PTZ control enters the camera. Only evidenced connection families are drawn.`
      : `${facts.name} is the governed central device (${archetypeLabel(facts.archetype)}). ` +
        "External boxes are deliberately generic and do not imply a particular third-party manufacturer or model. " +
        "Every visible cable represents a documented or explicitly TBC signal family.",
    assumptions,
    missingInformation,
    quoteRisks,
    nextActions,
    nodes: [...endpoints.map(endpointToNode), productNode],
    edges: endpoints.map(endpointToEdge),
  };
}
