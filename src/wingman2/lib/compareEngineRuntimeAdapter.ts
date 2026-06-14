import {
  buildCompareResult,
  compareProfiles,
} from "./compareEngineScoring";
import {
  GAP_SEVERITY_LABELS,
  type CandidateMatch,
  type CompareReadinessTier,
  type CompareResult,
  type GapItem,
  type ProductDomainTag,
  type ProductProfile,
  type ProductSubTag,
} from "./compareEngineModel";
import {
  buildWyreStormCompareShortlist,
  explainWyreStormCompareShortlist,
  type CompareShortlistProduct,
  type CompareShortlistResult,
} from "./wyrestormCompareShortlist";

/**
 * Runtime adapter for existing Wingman Compare data.
 *
 * This adapter is now shortlist-first:
 *
 * 1. Coerce competitor into a governed profile.
 * 2. Detect competitor intent from SKU/product text.
 * 3. Build a small deterministic WyreStorm candidate shortlist.
 * 4. Score only the shortlisted products.
 *
 * Do not import React, CSS, Guru, voice, route or page-shell code here.
 */

export type LooseCompareProduct = Record<string, unknown>;

export interface RuntimeCompareInput {
  competitor: LooseCompareProduct;
  candidates: LooseCompareProduct[];
}

export interface RuntimeGapSummary {
  attribute: string;
  severity: GapItem["severity"];
  severityLabel: string;
  description: string;
  competitorValue: string;
  candidateValue: string;
}

export interface RuntimeShortlistSummary {
  intent: CompareShortlistResult["intent"];
  confidence: number;
  reason: string;
  candidateSkus: string[];
  explanation: string;
  debug: string[];
}

export interface RuntimeCompareSummary {
  topOutcome: CompareResult["topOutcome"];
  recommendation: string;
  bestSku?: string;
  bestName?: string;
  confidence?: number;
  matches: CandidateMatch[];
  rejected: CandidateMatch[];
  gapSummary: RuntimeGapSummary[];
  architectureAlternative?: CompareResult["architectureAlternative"];
  networkNote?: string;
  videowallNote?: string;
  powerNote?: string;
  controlNote?: string;
  verify: string[];
  blockers: string[];
  customerSafeSummary: string;
  shortlist: RuntimeShortlistSummary;
}

const DOMAIN_FALLBACK: ProductDomainTag = "hdmi_matrix";

function readString(source: LooseCompareProduct, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return undefined;
}

function readNumber(source: LooseCompareProduct, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const numeric = Number(value.replace(/[^\d.]/g, ""));

      if (Number.isFinite(numeric)) {
        return numeric;
      }
    }
  }

  return undefined;
}

function readBoolean(source: LooseCompareProduct, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      const text = value.trim().toLowerCase();

      if (["yes", "true", "supported", "support", "included", "1"].includes(text)) {
        return true;
      }

      if (["no", "false", "not supported", "unsupported", "0"].includes(text)) {
        return false;
      }
    }
  }

  return undefined;
}

function readArray(source: LooseCompareProduct, keys: string[]): string[] | undefined {
  for (const key of keys) {
    const value = source[key];

    if (Array.isArray(value)) {
      const cleaned = value.map((item) => String(item).trim()).filter(Boolean);

      if (cleaned.length > 0) {
        return cleaned;
      }
    }

    if (typeof value === "string" && value.trim()) {
      const cleaned = value
        .split(/[,/|;]/)
        .map((item) => item.trim())
        .filter(Boolean);

      if (cleaned.length > 0) {
        return cleaned;
      }
    }
  }

  return undefined;
}

function compactText(...values: Array<unknown>): string {
  return values
    .map((value) => {
      if (Array.isArray(value)) {
        return value.join(" ");
      }

      if (value && typeof value === "object") {
        return Object.values(value as Record<string, unknown>).join(" ");
      }

      return String(value ?? "");
    })
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

function buildCompetitorTextForShortlist(source: LooseCompareProduct): string {
  return compactText(
    source.brand,
    source.manufacturer,
    source.sku,
    source.SKU,
    source.partNumber,
    source.model,
    source.name,
    source.title,
    source.productName,
    source.productClass,
    source.class,
    source.category,
    source.type,
    source.technology,
    source.transport,
    source.role,
    source.description,
    source.features,
    source.network,
    source.networkInterface,
    source.networkSpeed,
    source.inputs,
    source.outputs,
    source.inputTypes,
    source.outputTypes,
    source.resolution,
    source.maxResolution,
  );
}

function inferDomainTag(source: LooseCompareProduct): ProductDomainTag {
  const text = compactText(
    source.domainTag,
    source.domain,
    source.productClass,
    source.class,
    source.category,
    source.type,
    source.technology,
    source.transport,
    source.role,
    source.sku,
    source.name,
    source.description,
  );

  if (includesAny(text, ["ndi"]) && includesAny(text, ["camera", "ptz"])) return "ndi_camera";
  if (includesAny(text, ["ptz", "camera"])) return "ptz_camera";
  if (includesAny(text, ["wireless", "airplay", "miracast", "chromecast", "casting"])) return "wireless_casting";
  if (includesAny(text, ["usb audio", "microphone", "speakerphone"])) return "usb_audio";
  if (includesAny(text, ["relay", "gpio", "contact closure"])) return "relay_gpio";
  if (includesAny(text, ["control processor", "control system", "cp4", "netlinx"])) return "control_system";
  if (includesAny(text, ["video wall", "videowall", "wall processor", "sw-0206-vw", "sw-0204-vw"])) return "videowall_processor";
  if (includesAny(text, ["presentation", "usb-c", "usbc", "auto switch", "switcher", "apollo"])) return "presentation_switcher";
  if (includesAny(text, ["splitter", "distribution amplifier"])) return "hdmi_splitter";
  if (includesAny(text, ["extender", "hdbaset kit", "hdbaset extender"])) return "hdbaset_extender";

  if (includesAny(text, ["hdbaset matrix", "hdbt matrix"]) || (includesAny(text, ["matrix"]) && includesAny(text, ["hdbaset", "hdbt"]))) {
    return "hdbaset_matrix";
  }

  if (includesAny(text, ["scaling matrix", "scl", "multiview matrix"])) return "matrix_switcher_scaling";
  if (includesAny(text, ["matrix"])) return "hdmi_matrix";

  if (includesAny(text, ["avoip", "av over ip", "av-over-ip", "networkhd", "sdvoe", "jpeg-xs", "jpeg xs", "h.264", "h.265"])) {
    if (includesAny(text, ["decoder", "receiver", " rx", "-rx"])) return "avoip_decoder";
    if (includesAny(text, ["encoder", "transmitter", " tx", "-tx"])) return "avoip_encoder";
    if (includesAny(text, ["controller", "control", "ctl", "dir"])) return "avoip_controller";
    return "avoip_decoder";
  }

  if (includesAny(text, ["cat6", "cat6a", "cat5e", "cat7", "cat8"])) return "copper_cable";
  if (includesAny(text, ["fiber", "fibre", "om3", "om4", "os2", "sfp", "aoc"])) return "fiber_cable";
  if (includesAny(text, ["hdmi cable", "premium high speed"])) return "hdmi_cable";

  return DOMAIN_FALLBACK;
}

function inferSubTags(source: LooseCompareProduct): ProductSubTag[] {
  const text = compactText(
    source.subTags,
    source.features,
    source.productClass,
    source.category,
    source.type,
    source.technology,
    source.transport,
    source.role,
    source.sku,
    source.name,
    source.description,
  );

  const tags = new Set<ProductSubTag>();

  if (includesAny(text, ["poe"])) tags.add("poe_powered");
  if (includesAny(text, ["poh"])) tags.add("poh_powered");
  if (includesAny(text, ["usb-c", "usbc"])) tags.add("usb_c_input");
  if (includesAny(text, ["mst"])) tags.add("mst_capable");
  if (includesAny(text, ["multiview", "multi-view"])) tags.add("multiview_capable");
  if (includesAny(text, ["video wall", "videowall"])) tags.add("videowall_output");
  if (includesAny(text, ["ndi"])) tags.add("ndi_output");
  if (includesAny(text, ["dante"])) tags.add("dante_audio");
  if (includesAny(text, ["hdbaset 2", "hdbaset2", "hdbt 2"])) tags.add("hdbaset_2");
  if (includesAny(text, ["hdbaset 3", "hdbaset3", "hdbt 3"])) tags.add("hdbaset_3");
  if (includesAny(text, ["rs-232", "rs232", "serial"])) tags.add("serial_control");
  if (includesAny(text, [" ir ", "infrared"])) tags.add("ir_control");
  if (includesAny(text, ["lan", "ip control", "telnet", "api", "rest"])) tags.add("lan_control");
  if (includesAny(text, ["gpio", "relay"])) tags.add("gpio_relay");
  if (includesAny(text, ["internal psu", "iec"])) tags.add("psu_internal");
  if (includesAny(text, ["external psu", "power brick"])) tags.add("psu_external");
  if (includesAny(text, ["rack", "1u", "2u"])) tags.add("rack_mount");
  if (includesAny(text, ["4k60", "4k 60"])) tags.add("4k60");
  if (includesAny(text, ["8k"])) tags.add("8k");
  if (includesAny(text, ["hdr10"])) tags.add("hdr10");
  if (includesAny(text, ["dolby vision"])) tags.add("dolby_vision");
  if (includesAny(text, ["earc"])) tags.add("earc");
  if (includesAny(text, ["arc"])) tags.add("arc");
  if (includesAny(text, ["fiber", "fibre", "sfp"])) tags.add("fiber_input");
  if (includesAny(text, ["copper", "cat6", "cat6a", "rj45"])) tags.add("copper_input");

  return Array.from(tags);
}

function inferReadiness(source: LooseCompareProduct): CompareReadinessTier {
  const text = compactText(source.readiness, source.evidenceTier, source.status, source.approvalStatus);

  if (includesAny(text, ["approved", "verified-profile", "verified profile", "safe"])) return "approved";
  if (includesAny(text, ["usable", "review", "partial"])) return "usable-with-review";
  if (includesAny(text, ["sku-only", "sku only", "no spec", "unknown"])) return "sku-only";

  return "needs-evidence";
}

function inferPowerSupply(source: LooseCompareProduct): ProductProfile["powerSupply"] {
  const text = compactText(source.powerSupply, source.power, source.poeClass, source.features, source.description);

  if (includesAny(text, ["poh"])) return "PoH";
  if (includesAny(text, ["poe"])) return "PoE";
  if (includesAny(text, ["internal", "iec"])) return "internal";
  if (includesAny(text, ["external", "psu", "brick"])) return "external";

  return undefined;
}

function inferNetworkInterface(source: LooseCompareProduct): string[] | undefined {
  const direct = readArray(source, ["networkInterface", "networkInterfaces", "network", "ethernet", "lan", "networkSpeed"]);

  if (direct) return direct;

  const text = compactText(source.sku, source.name, source.description, source.technology, source.transport);

  if (includesAny(text, ["nhd-600", "10gbe", "10gb", "10g", "sfp+"])) return ["10GbE"];
  if (includesAny(text, ["nhd-100", "nhd-120", "nhd-124", "nhd-128", "nhd-150", "nhd-500", "1gbe", "1gb", "gigabit"])) return ["1GbE"];

  return undefined;
}

function inferLatency(source: LooseCompareProduct): string | undefined {
  const direct = readString(source, ["compressionLatency", "latency", "latencyClass"]);

  if (direct) return direct;

  const text = compactText(source.sku, source.name, source.description, source.technology);

  if (includesAny(text, ["nhd-600", "sdvoe", "zero latency", "zero-frame", "zero frame"])) return "zero-frame";
  if (includesAny(text, ["nhd-500", "jpeg-xs", "jpeg xs", "ultra-low", "ultra low"])) return "ultra-low";
  if (includesAny(text, ["h.264", "h264", "h.265", "h265"])) return "standard";

  return undefined;
}

function inferInputTypes(source: LooseCompareProduct): string[] | undefined {
  const direct = readArray(source, ["inputTypes", "inputsTypes", "inputType", "inputs"]);

  if (direct) return direct;

  const text = compactText(source.sku, source.name, source.description, source.technology, source.transport);
  const result: string[] = [];

  if (includesAny(text, ["hdmi"])) result.push("HDMI 2.0");
  if (includesAny(text, ["hdbaset", "hdbt"])) result.push("HDBaseT");
  if (includesAny(text, ["usb-c", "usbc"])) result.push("USB-C DP Alt");
  if (includesAny(text, ["avoip", "networkhd", "sdvoe"])) result.push("AVoIP");
  if (includesAny(text, ["ndi"])) result.push("NDI");

  return result.length > 0 ? result : undefined;
}

function inferOutputTypes(source: LooseCompareProduct): string[] | undefined {
  const direct = readArray(source, ["outputTypes", "outputsTypes", "outputType", "outputs"]);

  if (direct) return direct;

  const text = compactText(source.sku, source.name, source.description, source.technology, source.transport);
  const result: string[] = [];

  if (includesAny(text, ["hdmi"])) result.push("HDMI 2.0");
  if (includesAny(text, ["hdbaset", "hdbt"])) result.push("HDBaseT");
  if (includesAny(text, ["avoip", "networkhd", "sdvoe"])) result.push("AVoIP");
  if (includesAny(text, ["ndi"])) result.push("NDI");

  return result.length > 0 ? result : undefined;
}

function inferResolution(source: LooseCompareProduct): string | undefined {
  const direct = readString(source, ["maxResolution", "resolution", "videoResolution"]);

  if (direct) return direct;

  const text = compactText(source.sku, source.name, source.description, source.features);

  if (includesAny(text, ["8k"])) return "8K";
  if (includesAny(text, ["4k60", "4k 60", "2160p60"])) return "4K60";
  if (includesAny(text, ["4k30", "4k 30", "2160p30"])) return "4K30";
  if (includesAny(text, ["4k", "uhd"])) return "4K";
  if (includesAny(text, ["1080p", "full hd"])) return "1080p";

  return undefined;
}

function inferHdbasetClass(source: LooseCompareProduct): string | undefined {
  const direct = readString(source, ["hdbasetClass", "hdbasetDeviceClass"]);

  if (direct) return direct;

  const text = compactText(source.sku, source.name, source.description, source.features, source.hdbasetVersion);

  if (includesAny(text, ["hdbaset 3", "hdbt 3"])) return "HDBaseT 3.0";
  if (includesAny(text, ["class a"])) return "Class A";
  if (includesAny(text, ["class b"])) return "Class B";
  if (includesAny(text, ["lite", "class c"])) return "Class C";

  return undefined;
}

function inferPoeClass(source: LooseCompareProduct): string | undefined {
  const direct = readString(source, ["poeClass", "pohClass", "powerClass"]);

  if (direct) return direct;

  const text = compactText(source.powerSupply, source.power, source.features, source.description);

  if (includesAny(text, ["802.3bt", "poh"])) return "PoH 802.3bt";
  if (includesAny(text, ["poe+", "802.3at"])) return "PoE+ 802.3at";
  if (includesAny(text, ["poe", "802.3af"])) return "PoE 802.3af";

  return undefined;
}

export function coerceCompareProductToProfile(
  source: LooseCompareProduct,
  fallback: Partial<ProductProfile> = {},
): ProductProfile {
  const domainTag = fallback.domainTag ?? inferDomainTag(source);
  const subTags = Array.from(new Set([...(fallback.subTags ?? []), ...inferSubTags(source)]));
  const sku = fallback.sku ?? readString(source, ["sku", "SKU", "partNumber", "model", "id"]) ?? "UNKNOWN-SKU";
  const brand = fallback.brand ?? readString(source, ["brand", "manufacturer", "make", "vendor"]) ?? "Unknown";
  const name = fallback.name ?? readString(source, ["name", "title", "modelName", "productName"]) ?? sku;
  const productClass =
    fallback.productClass ??
    readString(source, ["productClass", "class", "category", "type"]) ??
    domainTag.replace(/_/g, " ");

  return {
    brand,
    sku,
    name,
    productClass,
    domainTag,
    subTags,
    readiness: fallback.readiness ?? inferReadiness(source),

    aliases: readArray(source, ["aliases", "alias", "regionalSkus"]),
    inputTypes: fallback.inputTypes ?? inferInputTypes(source),
    outputTypes: fallback.outputTypes ?? inferOutputTypes(source),

    inputCount: fallback.inputCount ?? readNumber(source, ["inputCount", "inputsCount", "inputs", "inputQty"]),
    outputCount: fallback.outputCount ?? readNumber(source, ["outputCount", "outputsCount", "outputs", "outputQty"]),
    routedInputCount: fallback.routedInputCount ?? readNumber(source, ["routedInputCount", "routedInputs"]),
    routedOutputCount: fallback.routedOutputCount ?? readNumber(source, ["routedOutputCount", "routedOutputs"]),
    mirroredOutputCount: fallback.mirroredOutputCount ?? readNumber(source, ["mirroredOutputCount", "mirrorOutputs", "mirroredOutputs"]),
    loopOutputCount: fallback.loopOutputCount ?? readNumber(source, ["loopOutputCount", "loopOutputs"]),

    maxResolution: fallback.maxResolution ?? inferResolution(source),
    hdrSupport: readArray(source, ["hdrSupport", "hdr"]),
    chromaSubsampling: readString(source, ["chromaSubsampling", "chroma"]),
    colorDepth: readString(source, ["colorDepth", "colourDepth"]),
    hdcpVersion: readString(source, ["hdcpVersion", "hdcp"]),
    hdmiVersion: readString(source, ["hdmiVersion", "hdmi"]),

    scalingOutput: fallback.scalingOutput ?? readBoolean(source, ["scalingOutput", "scaling", "perOutputScaling"]),
    multiviewOutput: fallback.multiviewOutput ?? readBoolean(source, ["multiviewOutput", "multiview", "multiView"]),
    videowallOutput: fallback.videowallOutput ?? readBoolean(source, ["videowallOutput", "videoWallOutput", "videoWall"]),
    videowallMaxCols: readNumber(source, ["videowallMaxCols", "videoWallMaxCols"]),
    videowallMaxRows: readNumber(source, ["videowallMaxRows", "videoWallMaxRows"]),
    matrixSize: readString(source, ["matrixSize"]),

    audioInputTypes: readArray(source, ["audioInputTypes", "audioInputs"]),
    audioOutputTypes: readArray(source, ["audioOutputTypes", "audioOutputs"]),
    audioDeEmbed: fallback.audioDeEmbed ?? readBoolean(source, ["audioDeEmbed", "audioDeembedding", "deEmbed"]),
    audioEmbed: fallback.audioEmbed ?? readBoolean(source, ["audioEmbed", "audioEmbedding", "embed"]),
    arcSupport: fallback.arcSupport ?? readBoolean(source, ["arcSupport", "arc"]),
    earcSupport: fallback.earcSupport ?? readBoolean(source, ["earcSupport", "earc"]),
    danteNetwork: fallback.danteNetwork ?? readBoolean(source, ["danteNetwork", "dante"]),
    avbNetwork: readBoolean(source, ["avbNetwork", "avb"]),
    dolbyAtmos: readBoolean(source, ["dolbyAtmos"]),

    networkInterface: fallback.networkInterface ?? inferNetworkInterface(source),
    networkProtocol: fallback.networkProtocol ?? readArray(source, ["networkProtocol", "codec", "compression", "protocol"]),
    compressionLatency: fallback.compressionLatency ?? inferLatency(source),
    multicastSupport: fallback.multicastSupport ?? readBoolean(source, ["multicastSupport", "multicast", "igmp"]),
    unicastSupport: fallback.unicastSupport ?? readBoolean(source, ["unicastSupport", "unicast"]),
    vlanTagging: readBoolean(source, ["vlanTagging", "vlan"]),
    qosSupport: readBoolean(source, ["qosSupport", "qos"]),
    igmpVersion: readString(source, ["igmpVersion", "igmp"]),
    switchRecommended: readString(source, ["switchRecommended", "recommendedSwitch"]),
    poeClass: fallback.poeClass ?? inferPoeClass(source),

    hdbasetClass: fallback.hdbasetClass ?? inferHdbasetClass(source),
    hdbasetVersion: fallback.hdbasetVersion ?? readString(source, ["hdbasetVersion", "hdbtVersion"]),
    hdbasetDistance: fallback.hdbasetDistance ?? readNumber(source, ["hdbasetDistance", "distance", "maxDistance"]),
    pohSupport: fallback.pohSupport ?? readBoolean(source, ["pohSupport", "poh"]),
    pohWatts: readNumber(source, ["pohWatts"]),

    usbcInput: fallback.usbcInput ?? readBoolean(source, ["usbcInput", "usbCInput", "usb-c"]),
    usbcAltMode: readArray(source, ["usbcAltMode", "usbCAltMode"]),
    mstSupport: fallback.mstSupport ?? readBoolean(source, ["mstSupport", "mst"]),
    usbcDataPassthrough: readBoolean(source, ["usbcDataPassthrough", "usbCDataPassthrough"]),
    usbcPowerDelivery: readBoolean(source, ["usbcPowerDelivery", "usbCPowerDelivery", "pd"]),
    usbcPdWatts: readNumber(source, ["usbcPdWatts", "pdWatts"]),

    usbHostPorts: readNumber(source, ["usbHostPorts"]),
    usbDevicePorts: readNumber(source, ["usbDevicePorts"]),
    usbOverIP: readBoolean(source, ["usbOverIP"]),
    usbKVM: readBoolean(source, ["usbKVM", "kvm"]),

    serialControl: fallback.serialControl ?? readBoolean(source, ["serialControl", "rs232", "rs-232"]),
    serialBaud: readString(source, ["serialBaud"]),
    irControl: fallback.irControl ?? readBoolean(source, ["irControl", "ir"]),
    lanControl: fallback.lanControl ?? readArray(source, ["lanControl", "ipControl", "controlProtocols"]),
    crestronControl: readBoolean(source, ["crestronControl"]),
    amxControl: readBoolean(source, ["amxControl"]),
    savantControl: readBoolean(source, ["savantControl"]),
    controlFourControl: readBoolean(source, ["controlFourControl", "control4Control"]),
    buttonPanel: readBoolean(source, ["buttonPanel"]),
    apiSdk: readBoolean(source, ["apiSdk", "api"]),

    gpioPortCount: fallback.gpioPortCount ?? readNumber(source, ["gpioPortCount", "gpio"]),
    gpioVoltage: readString(source, ["gpioVoltage"]),
    relayPortCount: fallback.relayPortCount ?? readNumber(source, ["relayPortCount", "relay"]),
    relayType: readString(source, ["relayType"]),
    relayMaxAmps: readNumber(source, ["relayMaxAmps"]),

    powerSupply: fallback.powerSupply ?? inferPowerSupply(source),
    psuWatts: readNumber(source, ["psuWatts", "powerConsumption"]),
    formFactor: readString(source, ["formFactor"]),
    rackUnits: readNumber(source, ["rackUnits"]),
    dimensions: readString(source, ["dimensions"]),
    weightKg: readNumber(source, ["weightKg"]),
    operatingTempC: readString(source, ["operatingTempC"]),

    ndiVersion: readString(source, ["ndiVersion", "ndi"]),
    ndiHX: readBoolean(source, ["ndiHX"]),
    panRange: readNumber(source, ["panRange"]),
    tiltRange: readNumber(source, ["tiltRange"]),
    zoomOptical: readNumber(source, ["zoomOptical", "opticalZoom"]),
    sensorSize: readString(source, ["sensorSize"]),
    sensorResolution: readString(source, ["sensorResolution"]),
    frameRate: readString(source, ["frameRate"]),
    ptzProtocol: readArray(source, ["ptzProtocol", "controlProtocol"]),

    wirelessStandard: readArray(source, ["wirelessStandard", "wifi"]),
    screenMirroring: readArray(source, ["screenMirroring", "mirroring"]),
    simultaneousUsers: readNumber(source, ["simultaneousUsers"]),
    moderatorControl: readBoolean(source, ["moderatorControl"]),
    wireless4k: readBoolean(source, ["wireless4k", "4kWireless"]),

    cableCategory: readString(source, ["cableCategory"]),
    cableShielding: readString(source, ["cableShielding"]),
    fiberType: readString(source, ["fiberType", "fibreType"]),
    fiberConnector: readArray(source, ["fiberConnector", "fibreConnector"]),
    cableMaxLength: readNumber(source, ["cableMaxLength"]),
    plenum: readBoolean(source, ["plenum"]),
  };
}

function buildShortlist(input: RuntimeCompareInput): CompareShortlistResult {
  return buildWyreStormCompareShortlist({
    competitorText: buildCompetitorTextForShortlist(input.competitor),
    wyrestormProducts: input.candidates as CompareShortlistProduct[],
    maxCandidates: 12,
  });
}

export function buildRuntimeCompareResult(input: RuntimeCompareInput): CompareResult {
  const competitor = coerceCompareProductToProfile(input.competitor, {
    brand: readString(input.competitor, ["brand", "manufacturer"]) ?? "Competitor",
  });

  const shortlist = buildShortlist(input);
  const candidateSources: LooseCompareProduct[] =
    shortlist.candidates.length > 0
      ? shortlist.candidates
      : input.candidates;

  const candidates = candidateSources.map((candidate) =>
    coerceCompareProductToProfile(candidate, {
      brand: readString(candidate, ["brand", "manufacturer"]) ?? "WyreStorm",
    }),
  );

  return buildCompareResult(competitor, candidates);
}

function severityLabel(gap: GapItem): string {
  return GAP_SEVERITY_LABELS[gap.severity] ?? "UNKNOWN";
}

function flattenVerify(matches: CandidateMatch[]): string[] {
  return Array.from(new Set(matches.flatMap((match) => match.decision.verify)));
}

function flattenBlockers(matches: CandidateMatch[]): string[] {
  return Array.from(new Set(matches.flatMap((match) => match.decision.blockers)));
}

function makeCustomerSafeSummary(result: CompareResult): string {
  const top = result.matches[0];

  if (top) {
    return `${top.sku} is the strongest WyreStorm candidate currently identified. Result: ${top.decision.outcome}, confidence ${top.decision.confidence}%. Review the listed gaps and verify against the current datasheet before customer issue.`;
  }

  if (result.architectureAlternative) {
    return "No safe direct WyreStorm replacement is confirmed from the current data. Review the suggested architecture alternative and validate the trade-offs before customer positioning.";
  }

  return "No suitable WyreStorm match is confirmed from the current data. Search wider, add product evidence, or ask pre-sales to review.";
}

export function buildRuntimeCompareSummary(input: RuntimeCompareInput): RuntimeCompareSummary {
  const shortlist = buildShortlist(input);
  const result = buildRuntimeCompareResult(input);
  const top = result.matches[0];
  const allMatches = [...result.matches, ...result.rejected];

  return {
    topOutcome: result.topOutcome,
    recommendation: result.recommendation,
    bestSku: top?.sku,
    bestName: top?.name,
    confidence: top?.decision.confidence,
    matches: result.matches,
    rejected: result.rejected,
    gapSummary: result.gapSummary.map((gap) => ({
      attribute: gap.attribute,
      severity: gap.severity,
      severityLabel: severityLabel(gap),
      description: gap.description,
      competitorValue: gap.competitorValue,
      candidateValue: gap.candidateValue,
    })),
    architectureAlternative: result.architectureAlternative,
    networkNote: result.networkNote,
    videowallNote: result.videowallNote,
    powerNote: result.powerNote,
    controlNote: result.controlNote,
    verify: flattenVerify(allMatches),
    blockers: flattenBlockers(allMatches),
    customerSafeSummary: makeCustomerSafeSummary(result),
    shortlist: {
      intent: shortlist.intent,
      confidence: shortlist.confidence,
      reason: shortlist.reason,
      candidateSkus: shortlist.candidateSkus,
      explanation: explainWyreStormCompareShortlist(shortlist),
      debug: shortlist.debug,
    },
  };
}

export function compareLooseProfiles(
  competitor: LooseCompareProduct,
  candidate: LooseCompareProduct,
): CandidateMatch {
  return compareProfiles(
    coerceCompareProductToProfile(competitor, {
      brand: readString(competitor, ["brand", "manufacturer"]) ?? "Competitor",
    }),
    coerceCompareProductToProfile(candidate, {
      brand: readString(candidate, ["brand", "manufacturer"]) ?? "WyreStorm",
    }),
  );
}