import {
  isBannedNetworkHdSku,
  mapCompetitorToNetworkHdAvoip,
  networkClassOfNetworkHdSku,
  type AvoipNetworkClass,
  type NetworkHdAvoipRecommendation,
} from "./networkHdAvoipEquivalence";
import { selectWingmanProducts } from "./productSelectorEngine";
import {
  derivePresentationSwitcherFitProfile,
  findDynamicPresentationSwitcherCandidates,
  scorePresentationSwitcherFit,
} from "./dynamicPresentationSwitcherFit";
import {
  deriveMatrixFitProfile,
  findDynamicMatrixCandidates,
  scoreMatrixFit,
} from "./dynamicMatrixFit";
import {
  deriveDistributionAmpFitProfile,
  findDynamicDistributionAmpCandidates,
  scoreDistributionAmpFit,
} from "./dynamicDistributionAmpFit";
import {
  deriveExtenderFitProfile,
  findDynamicExtenderCandidates,
  scoreExtenderFit,
} from "./dynamicExtenderFit";
import { getWyreStormCompareLeadBlockReason } from "./wyrestormSkuBusinessStatus";
import type { ComparisonRow } from "./structuredFitCommon";

const AVOIP_ENDPOINT_INTENTS = new Set<CompareIntentKind>([
  "av-over-ip",
  "av-over-ip-encoder",
  "av-over-ip-decoder",
]);

/**
 * Enforce the "never mix 10G and 1G" rule: a 1G competitor must not be offered a
 * 10G NetworkHD 600 endpoint, and a 10G/SDVoE competitor must not be offered a 1G
 * (100/500) endpoint. Returns a blocker reason, or null when the pairing is allowed.
 */
function avoipNetworkMismatch(competitorNetworkClass: AvoipNetworkClass, candidateSku: string): string | null {
  if (competitorNetworkClass === "unknown") {
    return null;
  }

  const candidateClass = networkClassOfNetworkHdSku(candidateSku);

  if (candidateClass === "unknown" || candidateClass === competitorNetworkClass) {
    return null;
  }

  if (competitorNetworkClass === "10g") {
    return "1G NetworkHD endpoint cannot replace a 10G/SDVoE competitor. Use the NetworkHD 600 series; do not mix 10G and 1G.";
  }

  return "NetworkHD 600 is 10G SDVoE and must not be mixed with a 1G competitor. Use the NetworkHD 100/500 series.";
}

type LooseRecord = Record<string, any>;
type LooseMatch = LooseRecord;

const SUPPORT_ONLY_LEAD_BLOCKER = "Accessory, controller, rack, cable or support item cannot be a lead replacement candidate.";
const MULTIVIEW_CANVAS_BLOCKER = "Multiview requires multi-source single-output canvas evidence; multiple outputs alone do not qualify as multiview.";

export type CompareIntentKind =
  | "matrix"
  | "hdbaset-matrix"
  | "distribution-amplifier"
  | "av-over-ip"
  | "av-over-ip-encoder"
  | "av-over-ip-decoder"
  | "network-audio"
  | "video-wall-processor"
  | "multiview"
  | "presentation-switcher"
  | "uc-byod"
  | "extender"
  | "ndi-camera"
  | "ptz-camera"
  | "wireless-casting"
  | "usb-audio"
  | "cable"
  | "gpio-relay"
  | "controller-accessory"
  | "unknown";

export type CompareEligibilityClass =
  | "direct"
  | "architecture-alternative"
  | "related-only"
  | "blocked";

export type CompareEligibilityResult = {
  eligibility: CompareEligibilityClass;
  intent: CompareIntentKind;
  reasons: string[];
  blockers: string[];
  fitPenalty: number;
  /** Side-by-side "features and I/O" comparison chart rows, when the intent's scorer computes them. */
  comparisonRows?: ComparisonRow[];
};

function toText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(toText).join(" ");
  }

  if (value && typeof value === "object") {
    return Object.values(value as LooseRecord).map(toText).join(" ");
  }

  return String(value ?? "");
}

function normalise(value: unknown): string {
  return toText(value).toLowerCase();
}

function skuKey(value: unknown): string {
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

const DISPLAY_SKU_LOOKUP_ALIASES: Record<string, readonly string[]> = {
  SW620LTXW: ["SW620TXW"],
  SW620TXW: ["SW620LTXW"],
  SW640TXW: ["SW640LTXW"],
  SW640LTXW: ["SW640TXW"],
};

function skuLookupKeys(value: unknown): string[] {
  const key = skuKey(value);
  return key ? Array.from(new Set([key, ...(DISPLAY_SKU_LOOKUP_ALIASES[key] ?? [])])) : [];
}

function getSku(value: LooseRecord): string {
  return String(value?.sku ?? value?.wyrestorm?.sku ?? value?.model ?? value?.partNumber ?? value?.title ?? "");
}

function getProduct(match: LooseMatch, products: LooseRecord[]): LooseRecord {
  if (match?.wyrestorm && typeof match.wyrestorm === "object") {
    return match.wyrestorm;
  }

  return findProductBySku(products, getSku(match)) ?? match;
}

function productText(product: LooseRecord): string {
  return [
    product.sku,
    product.model,
    product.partNumber,
    product.name,
    product.title,
    product.family,
    product.productFamily,
    product.category,
    product.role,
    product.governanceRole,
    product.description,
    product.summary,
    product.technology,
    product.technologies,
    product.features,
    product.featureTags,
    product.tags,
    product.applications,
    product.searchTerms,
  ].map(toText).join(" ");
}

function productNameFromRecord(product: LooseRecord): string {
  return String(product.name ?? product.title ?? product.sku ?? product.model ?? product.partNumber ?? "").trim();
}

function findProductBySku(products: LooseRecord[], sku: string): LooseRecord | undefined {
  const wanted = skuLookupKeys(sku);

  if (wanted.length === 0) {
    return undefined;
  }

  return products.find((product) => wanted.includes(skuKey(product?.sku ?? product?.model ?? product?.partNumber)));
}

function _hasSku(products: LooseRecord[], sku: string): boolean {
  return Boolean(findProductBySku(products, sku));
}

function _productLooksLike(product: LooseRecord, pattern: RegExp): boolean {
  return pattern.test(`${getSku(product)} ${productText(product)}`);
}

function makeEligibilityCandidateFromProduct(product: LooseRecord, reason: string, confidence = 72, displaySku?: string): LooseMatch {
  const sku = String(displaySku || product.sku || product.model || product.partNumber || "");
  const name = productNameFromRecord(product) || sku;

  return {
    sku,
    name,
    family: product.family ?? product.productFamily ?? product.category ?? "WyreStorm",
    wyrestorm: product,
    summary: reason,
    matches: [reason],
    gaps: [],
    verify: ["Verify datasheet-level requirements before external quote positioning."],
    nextAction: "Use eligibility-injected candidate as the corrected comparison path.",
    decision: {
      outcome: "VERIFY",
      confidence,
      relationship: "eligibility_injected_candidate",
      blockers: [],
      gaps: [],
      matches: [reason],
      verify: ["Verify datasheet-level requirements before external quote positioning."],
      summary: reason,
      nextAction: "Use eligibility-injected candidate as the corrected comparison path.",
    },
  };
}

function addCandidateBySku(matches: LooseMatch[], products: LooseRecord[], sku: string, reason: string, confidence = 72): void {
  const wanted = skuKey(sku);
  const wantedKeys = skuLookupKeys(sku);

  if (!wanted) {
    return;
  }

  const existingMatch = matches.find((match) => wantedKeys.includes(skuKey(getSku(match))));
  if (existingMatch) {
    existingMatch.sku = sku;
    return;
  }

  const product = findProductBySku(products, sku);

  if (!product) {
    return;
  }

  matches.push(makeEligibilityCandidateFromProduct(product, reason, confidence, sku));
}

function addCandidatesByPredicate(
  matches: LooseMatch[],
  products: LooseRecord[],
  predicate: (product: LooseRecord) => boolean,
  reason: string,
  limit = 4,
  confidence = 66,
): void {
  let added = 0;
  const present = new Set(matches.map((match) => skuKey(getSku(match))));

  for (const product of products) {
    const sku = skuKey(product?.sku ?? product?.model ?? product?.partNumber);

    if (!sku || present.has(sku)) {
      continue;
    }

    if (!predicate(product)) {
      continue;
    }

    matches.push(makeEligibilityCandidateFromProduct(product, reason, confidence));
    present.add(sku);
    added += 1;

    if (added >= limit) {
      return;
    }
  }
}

function numberFromValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const match = String(value ?? "").match(/\d+/);
  return match ? Number(match[0]) : undefined;
}

function extractStructuredMatrixSize(value: unknown): { inputs: number; outputs: number } | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as LooseRecord;
  const specs = record.specs && typeof record.specs === "object" && !Array.isArray(record.specs)
    ? record.specs as LooseRecord
    : {};
  const candidates: Array<[unknown, unknown]> = [
    [record.inputCount, record.outputCount],
    [record.routedInputCount, record.routedOutputCount],
    [record.routedInputs, record.routedOutputs],
    [record.matrixInputs, record.matrixOutputs],
    [specs.hdmiInputs, specs.hdmiOutputs],
    [specs.routedInputs, specs.routedOutputs],
  ];

  for (const [rawInputs, rawOutputs] of candidates) {
    const inputs = numberFromValue(rawInputs);
    const outputs = numberFromValue(rawOutputs);

    if (inputs && outputs && inputs > 0 && outputs > 0 && inputs <= 64 && outputs <= 64) {
      return { inputs, outputs };
    }
  }

  return undefined;
}

function structuredMatrixText(value: unknown): string {
  const size = extractStructuredMatrixSize(value);
  return size ? `${size.inputs}x${size.outputs} routed matrix` : "";
}

function extractCompetitorText(resultOrInput: unknown, inputText = ""): string {
  return [inputText, toText(resultOrInput)].join(" ");
}

function intentFromResolvedDomain(resultOrInput: unknown): CompareIntentKind | null {
  if (!resultOrInput || typeof resultOrInput !== "object") {
    return null;
  }

  const domain = String((resultOrInput as LooseRecord).domain ?? "").toUpperCase();
  const roleText = normalise([
    (resultOrInput as LooseRecord).role,
    (resultOrInput as LooseRecord).title,
    (resultOrInput as LooseRecord).summary,
    (resultOrInput as LooseRecord).technology,
  ]);

  switch (domain) {
    case "NDI_CAMERA":
      return "ndi-camera";
    case "PTZ_CAMERA":
      return "ptz-camera";
    case "WIRELESS_PRESENTATION":
      return /\b(switcher|collaboration appliance|room switch)\b/i.test(roleText)
        ? "presentation-switcher"
        : "wireless-casting";
    case "WIRELESS_CASTING":
      return "wireless-casting";
    case "DISTRIBUTION":
      return "distribution-amplifier";
    default:
      return null;
  }
}

export function classifyCompareIntent(resultOrInput: unknown, inputText = ""): CompareIntentKind {
  const resolvedDomainIntent = intentFromResolvedDomain(resultOrInput);

  if (resolvedDomainIntent) {
    return resolvedDomainIntent;
  }

  const text = normalise(extractCompetitorText(resultOrInput, inputText));
  const compact = skuKey(extractCompetitorText(resultOrInput, inputText));
  if (/ATOMEEXKIT/.test(compact)) {
    return "extender";
  }

  const avoipContext = /\b(dm\s*nvx|dmnvx|mxnet|kds(?!\s*usb)|nmx|zyper|av\s*over\s*ip|avoip|networked\s*av|networkhd|nav\s*[de]|nave|navd|sdvoe)\b/i.test(text) ||
    /(?:DMNVX|MXNET|KDS(?!USB)|NMX|ZYPER|NETWORKHD|NAV[DE]|SDVOE)/.test(compact);

  if (/\b(video\s*wall\s*processor|wall\s*processor|lcd\s*video\s*wall|dedicated\s*video\s*wall)\b/i.test(text)) {
    return "video-wall-processor";
  }

  if (/\b(multiview|multi-view|single\s*output\s*canvas|quad\s*view|picture\s*by\s*picture|pip|pbp)\b/i.test(text)) {
    return "multiview";
  }

  if (/\b(ndi(?:\s*(?:5|hx|hx2|hx3))?[\s|-]?(camera|cam|ptz)|birddog|marshall\s*cv|vs-ptc|ndi\s*source|ndi\s*encoder\s*camera)\b/i.test(text)) {
    return "ndi-camera";
  }

  if (/\b(ptz|pan[\s-]tilt[\s-]zoom|visca|pelco[\s-]?d|sony\s*ev[ic]|sony\s*brc|aver\s*cam|huddly|logitech\s*(rally|meetup|brio)|vaddio)\b/i.test(text)) {
    return "ptz-camera";
  }

  if (/\b(hdmi\s*)?(splitter|distribution\s+amplifier|distribution\s+amp|duplicator)\b/i.test(text) || /^SP\d+/.test(compact)) {
    return "distribution-amplifier";
  }

  if (/\b(dante|aes67|audio\s*dsp|network\s*audio|q-sys|qsys|tesira|devio|audio processor|amplifier|avio)\b/i.test(text)) {
    return "network-audio";
  }

  if (/\b(wireless\s*(casting|presentation|sharing|collaboration)|clickshare|solstice|mersive|airtame|barco\s*c[sx]|miracast|airplay|chromecast|wifidisplay)\b/i.test(text)) {
    return "wireless-casting";
  }

  if (/\b(usb\s*(microphone|mic|speakerphone|audio|conference\s*speaker)|shure\s*mv|rode\s*(nt|pod|streamer)|jabra\s*(evolve|speak)|jabra\s*phs|yeti|snowball)\b/i.test(text)) {
    return "usb-audio";
  }

  if (/\b(usb[\s_-]*(extension|extender)|kds[\s_-]*usb|usb\s*over\s*ip|usb\s*2\.?0\s*extender|usb\s*3\.?0\s*extender)\b/i.test(text) || /KDSUSB|USBEXTENDER|USBEXTENSION/.test(compact)) {
    return "extender";
  }

  if (/\b(hdbaset\s*matrix|hdbt\s*matrix|c88cs|ac-mx|acmx)\b/i.test(text) || /HMX\d{2}/.test(compact)) {
    return "hdbaset-matrix";
  }

  if (/\b(matrix|mtrx|mmx|vs-|4\s*x\s*2|4x2|4\s*x\s*4|4x4|8\s*x\s*8|8x8)\b/i.test(text)) {
    return "matrix";
  }

  if (/\b(presentation|switcher|usb-c|byod|byom|teams|zoom|uc|wireless\s*(presentation|collaboration|sharing)|clickshare)\b/i.test(text)) {
    return /\b(byod|byom|teams|zoom|unified\s*communications?|video\s*bar|speakerphone)\b/i.test(text) ? "uc-byod" : "presentation-switcher";
  }

  if (/\b(extender|extension|hdbaset|hdbt|dtp\d?|tx\s*rx|transmitter\s*receiver)\b/i.test(text)) {
    return "extender";
  }

  if ((/\b(nav\s*d|navd)\b/i.test(text) || /NAVD/.test(compact)) || (avoipContext && /\b(decoder|receiver)\b/i.test(text))) {
    return "av-over-ip-decoder";
  }

  if ((/\b(nav\s*e|nave)\b/i.test(text) || /NAVE/.test(compact)) || (avoipContext && /\b(encoder|transmitter)\b/i.test(text))) {
    return "av-over-ip-encoder";
  }

  if (avoipContext) {
    return "av-over-ip";
  }

  if (/\b(gpio|relay|contact\s*closure|dry\s*contact|i\/o\s*(module|port)|general[\s-]purpose\s*i\/o)\b/i.test(text)) {
    return "gpio-relay";
  }

  if (/\b(cat\s*5e?|cat\s*6a?|cat\s*7|cat\s*8|om\d|os\d|single[\s-]mode|multimode|fiber|fibre|optical\s*cable|aoc|hdmi\s*cable|copper\s*cable|plenum\s*cable)\b/i.test(text)) {
    return "cable";
  }

  if (/\b(controller|control processor|rack|mount|psu|power supply)\b/i.test(text)) {
    return "controller-accessory";
  }

  return "unknown";
}

function blocked(sku: string, intent: CompareIntentKind, reasons: string[]): CompareEligibilityResult {
  return {
    eligibility: "blocked",
    intent,
    reasons,
    blockers: reasons,
    fitPenalty: 9999,
  };
}

function direct(intent: CompareIntentKind, reasons: string[], fitPenalty = 0, comparisonRows?: ComparisonRow[]): CompareEligibilityResult {
  return {
    eligibility: "direct",
    intent,
    reasons,
    blockers: [],
    fitPenalty,
    comparisonRows,
  };
}

function alternative(intent: CompareIntentKind, reasons: string[], fitPenalty = 25, comparisonRows?: ComparisonRow[]): CompareEligibilityResult {
  return {
    eligibility: "architecture-alternative",
    intent,
    reasons,
    blockers: [],
    fitPenalty,
    comparisonRows,
  };
}

function related(intent: CompareIntentKind, reasons: string[], fitPenalty = 75, comparisonRows?: ComparisonRow[]): CompareEligibilityResult {
  return {
    eligibility: "related-only",
    intent,
    reasons,
    blockers: [],
    fitPenalty,
    comparisonRows,
  };
}

function productIsSupportOnly(sku: string, text: string): string | null {
  const key = skuKey(sku);
  const value = normalise(text);

  const explicitlyPrimaryHardware =
    /^NHD/.test(key) ||
    /^APO(?:100|200|210|VX20)UC/.test(key) ||
    /^SW020[46]VW$/.test(key) ||
    /^MX/.test(key) ||
    /^MV0401PRO$/.test(key) ||
    /^EX/.test(key);

  if (explicitlyPrimaryHardware && !/^NHD000CTL$/.test(key) && !/^NHD000RACK/.test(key)) {
    return null;
  }

  if (/^CAB/.test(key)) {
    return "Cable/accessory cannot be a lead replacement candidate.";
  }

  if (/RACK|MOUNT|BRACKET|SHELF|RMK/.test(key) || /\b(rack mount|mounting bracket|mounting shelf)\b/i.test(value)) {
    return "Rack/mount/support item cannot be a lead replacement candidate.";
  }

  if (/CTL|CONTROLLER/.test(key) || /\b(system controller|control processor|controller only)\b/i.test(value)) {
    return "Controller cannot be a lead replacement for signal transport hardware.";
  }

  if (/^PSU|^PWR|POWERADAPTER|POWERSUPPLY/.test(key) || /\b(power supply|psu|power accessory)\b/i.test(value)) {
    return "Power accessory cannot be a lead replacement candidate.";
  }

  if (/^CAM/.test(key)) {
    return "Camera cannot be a lead replacement for signal-management hardware.";
  }

  if (/^APO/.test(key)) {
    return "UC/audio endpoint cannot be a lead replacement for signal-management hardware.";
  }

  return null;
}

function invalidLeadReasonForIntent(supportOnlyReason: string | null, intent: CompareIntentKind): string | null {
  if (!supportOnlyReason || intent === "controller-accessory") {
    return null;
  }

  if ((intent === "ndi-camera" || intent === "ptz-camera") && supportOnlyReason.startsWith("Camera")) {
    return null;
  }

  if ((intent === "uc-byod" || intent === "usb-audio") && supportOnlyReason.startsWith("UC/audio")) {
    return null;
  }

  return `${SUPPORT_ONLY_LEAD_BLOCKER} ${supportOnlyReason}`;
}

function networkHdEndpointRoleFromSku(sku: string): "tx" | "rx" | "trx" | null {
  const key = skuKey(sku);

  if (!/^NHD/.test(key) || /^NHDUSB/.test(key) || /CTL|RACK|0401MV/.test(key)) {
    return null;
  }

  if (/TRX$/.test(key)) return "trx";
  if (/RX$/.test(key)) return "rx";
  if (/TX$/.test(key)) return "tx";
  return null;
}

function productHasNetworkHdEndpointRole(sku: string, text: string): boolean {
  const key = skuKey(sku);
  const value = normalise(text);

  if (!/^NHD/.test(key)) {
    return false;
  }

  if (/CTL|RACK|0401MV/.test(key)) {
    return false;
  }

  if (/\b(controller|rack|mount|multiview processor)\b/i.test(value)) {
    return false;
  }

  return Boolean(networkHdEndpointRoleFromSku(key)) ||
    /\b(tx|rx|trx|encoder|decoder|transceiver|transmitter|receiver)\b/i.test(value);
}

export function evaluateProductEligibility(args: {
  intent: CompareIntentKind;
  competitorText: string;
  match: LooseMatch;
  product?: LooseRecord;
  competitorNetworkClass?: AvoipNetworkClass;
  competitorRecord?: LooseRecord;
}): CompareEligibilityResult {
  const product = args.product || args.match;
  const sku = getSku(product || args.match);
  const key = skuKey(sku);
  const text = productText(product || args.match);
  const combined = `${sku} ${text}`;

  // Retired NetworkHD platforms (NHD-100/110/220/300/400) must never be specified.
  if (isBannedNetworkHdSku(sku)) {
    return blocked(sku, args.intent, [
      `${sku} is a retired NetworkHD platform and must never be specified in a comparison. Use a current 100/500/600 series SKU.`,
    ]);
  }

  const businessStatusBlockReason = getWyreStormCompareLeadBlockReason(sku);

  if (businessStatusBlockReason) {
    return blocked(sku, args.intent, [businessStatusBlockReason]);
  }

  // Never mix 10G and 1G NetworkHD families against an AVoIP endpoint competitor.
  if (AVOIP_ENDPOINT_INTENTS.has(args.intent)) {
    const networkMismatch = avoipNetworkMismatch(args.competitorNetworkClass ?? "unknown", sku);

    if (networkMismatch) {
      return blocked(sku, args.intent, [networkMismatch]);
    }
  }

  const supportOnlyReason = productIsSupportOnly(sku, combined);
  const isApolloUcHardware = /^APO(?:100|200|210|VX20)UC/.test(key);
  const isRoleMatchedPrimaryProduct =
    ((args.intent === "ndi-camera" || args.intent === "ptz-camera") && /^CAM/.test(key)) ||
    ((args.intent === "uc-byod" || args.intent === "usb-audio") && isApolloUcHardware);
  const invalidLeadReason = isRoleMatchedPrimaryProduct
    ? null
    : invalidLeadReasonForIntent(supportOnlyReason, args.intent);

  if (invalidLeadReason) {
    return blocked(sku, args.intent, [invalidLeadReason]);
  }

  if (args.intent === "av-over-ip") {
    if (/^NHD600TRX$/.test(key)) {
      return direct(args.intent, ["NetworkHD 600 transceiver candidate for high-performance AVoIP endpoint comparison."], -120);
    }

    if (productHasNetworkHdEndpointRole(sku, combined)) {
      const priority = /600TRX|TRX/.test(key) ? -30 : /^NHD/.test(key) ? -15 : 0;
      return direct(args.intent, ["NetworkHD endpoint/transceiver candidate for AVoIP comparison."], priority);
    }

    if (/^NHD/.test(key)) {
      return related(args.intent, ["NetworkHD product is related, but not confirmed as an endpoint replacement."], 60);
    }

    return blocked(sku, args.intent, ["Non-NetworkHD product cannot lead a direct AVoIP endpoint replacement."]);
  }

  if (args.intent === "av-over-ip-decoder") {
    const endpointRole = networkHdEndpointRoleFromSku(key);

    if (/^NHD/.test(key) && (endpointRole === "rx" || endpointRole === "trx" || (!endpointRole && /\b(receiver|decoder|rx|trx)\b/i.test(combined)))) {
      return direct(args.intent, ["Decoder/receiver/transceiver candidate for AVoIP display-side requirement."], /TRX/.test(key) ? -25 : -10);
    }

    if (/^NHD/.test(key) && endpointRole === "tx") {
      return blocked(sku, args.intent, ["Transmitter/encoder-only product cannot lead a decoder comparison."]);
    }

    return blocked(sku, args.intent, ["Candidate is not a decoder, receiver or transceiver."]);
  }

  if (args.intent === "av-over-ip-encoder") {
    const endpointRole = networkHdEndpointRoleFromSku(key);

    if (/^NHD/.test(key) && (endpointRole === "tx" || endpointRole === "trx" || (!endpointRole && /\b(transmitter|encoder|tx|trx)\b/i.test(combined)))) {
      return direct(args.intent, ["Encoder/transmitter/transceiver candidate for AVoIP source-side requirement."], /TRX/.test(key) ? -25 : -10);
    }

    if (/^NHD/.test(key) && endpointRole === "rx") {
      return blocked(sku, args.intent, ["Receiver/decoder-only product cannot lead an encoder comparison."]);
    }

    return blocked(sku, args.intent, ["Candidate is not an encoder, transmitter or transceiver."]);
  }

  if (args.intent === "video-wall-processor") {
    if (/^SW0206VW$|^SW0204VW$/.test(key)) {
      return direct(args.intent, ["Dedicated WyreStorm video wall processor candidate."], key === "SW0206VW" ? -100 : -90);
    }

    if (/^NHD/.test(key) || /\b(av-over-ip|networkhd|multiview)\b/i.test(combined) || /MV/.test(key)) {
      return alternative(args.intent, ["AV-over-IP or multiview product may be an architecture alternative, not the dedicated processor lead."], 40);
    }

    return related(args.intent, ["Not a dedicated video wall processor."], 90);
  }

  if (args.intent === "multiview") {
    if (/^NHD0401MV$/.test(key)) {
      return direct(args.intent, ["Dedicated four-source multiview processor for a single-output canvas."], -100);
    }

    if (/^NHD150RX$/.test(key)) {
      return direct(args.intent, ["NetworkHD 100-series multiview receiver path for AVoIP multiview workflows."], -90);
    }

    if (/\b(multiview|multi-view|single output canvas|pip|pbp)\b/i.test(combined) || /MV/.test(key)) {
      return direct(args.intent, ["Multiview-capable candidate; confirm it provides a multi-source single-output canvas."], 20);
    }

    return blocked(sku, args.intent, [MULTIVIEW_CANVAS_BLOCKER]);
  }

  if (args.intent === "matrix" || args.intent === "hdbaset-matrix") {
    const matrixLike = /^MX/.test(key) ||
      /\b(matrix|routed|switching matrix)\b/i.test(combined) ||
      /0402|4X2|0808|8X8|0404|4X4/.test(key);

    if (!matrixLike) {
      if (/^NHD/.test(key)) {
        return alternative(args.intent, ["NetworkHD may be an architecture alternative to a fixed matrix."], 55);
      }

      return blocked(sku, args.intent, ["Candidate is not a matrix/switching product."]);
    }

    // Fit is computed fresh from live structured I/O data every time (see
    // dynamicMatrixFit.ts) -- no fixed per-size SKU table, so a room that needs a size
    // WyreStorm didn't previously have a hardcoded rule for still gets scored properly.
    const competitorProfile = deriveMatrixFitProfile(args.competitorRecord ?? {}, args.competitorText);
    const candidateProfile = deriveMatrixFitProfile(product || args.match, combined);
    const fit = scoreMatrixFit(competitorProfile, candidateProfile);

    if (fit.eligibility === "direct") {
      return direct(args.intent, fit.reasons, fit.fitPenalty, fit.rows);
    }

    if (fit.eligibility === "alternative") {
      return alternative(args.intent, fit.reasons, Math.max(fit.fitPenalty, 30), fit.rows);
    }

    return related(args.intent, fit.reasons, Math.max(fit.fitPenalty, 60), fit.rows);
  }

  if (args.intent === "distribution-amplifier") {
    if (/^SP|^EXPSP/.test(key) || /\b(splitter|distribution amplifier|distribution amp|duplicator)\b/i.test(combined)) {
      const competitorProfile = deriveDistributionAmpFitProfile(args.competitorRecord ?? {});
      const candidateProfile = deriveDistributionAmpFitProfile(product || args.match);
      const fit = scoreDistributionAmpFit(competitorProfile, candidateProfile);

      if (fit.eligibility === "direct") {
        return direct(args.intent, fit.reasons, fit.fitPenalty, fit.rows);
      }

      if (fit.eligibility === "alternative") {
        return alternative(args.intent, fit.reasons, Math.max(fit.fitPenalty, 30), fit.rows);
      }

      return related(args.intent, fit.reasons, Math.max(fit.fitPenalty, 60), fit.rows);
    }

    if (/^MX|^NHD/.test(key) || /\b(matrix|routed|networkhd|av-over-ip)\b/i.test(combined)) {
      return alternative(args.intent, ["Architecture alternative only: routed switching is not a direct replacement for a mirrored HDMI distribution amplifier."], 100);
    }

    return blocked(sku, args.intent, ["Candidate is not an HDMI splitter or distribution amplifier."]);
  }

  if (args.intent === "presentation-switcher" || args.intent === "uc-byod") {
    // Candidate pool + fit score are both computed fresh from live structured data
    // (see dynamicPresentationSwitcherFit.ts) -- no fixed per-SKU judgement calls here,
    // so a catalog change (new SKU, re-classified SKU, discontinued SKU) is reflected the
    // next time this runs, instead of requiring someone to edit this file.
    const looksLikeFamilyCandidate =
      /^SW|^MX|^APO/.test(key) ||
      (args.intent === "uc-byod" && isApolloUcHardware) ||
      /\b(presentation|switcher|usb-c|byod|byom|unified communications?|video bar|matrix)\b/i.test(combined);

    if (!looksLikeFamilyCandidate) {
      return related(args.intent, ["Related product, but not a direct presentation switcher lead."], 80);
    }

    const competitorProfile = derivePresentationSwitcherFitProfile(args.competitorRecord ?? {}, args.competitorText);
    const candidateProfile = derivePresentationSwitcherFitProfile(product || args.match, combined);
    const fit = scorePresentationSwitcherFit(competitorProfile, candidateProfile);

    if (fit.eligibility === "direct") {
      return direct(args.intent, fit.reasons, fit.fitPenalty, fit.rows);
    }

    if (fit.eligibility === "alternative") {
      return alternative(args.intent, fit.reasons, Math.max(fit.fitPenalty, 30), fit.rows);
    }

    return related(args.intent, fit.reasons, Math.max(fit.fitPenalty, 60), fit.rows);
  }

  if (args.intent === "extender") {
    if (/^MX|^SW/.test(key) || /\b(presentation|matrix|switcher)\b/i.test(combined)) {
      return alternative(args.intent, ["ARCHITECTURE ALTERNATIVE: candidate changes the room architecture rather than replacing the point-to-point HDBaseT extender path."], 65);
    }

    if (/^EX|^RX|^TX|^NHDUSBTRX/.test(key) || /\b(extender|extension|hdbaset|hdbt|transmitter|receiver|usb\s*(2\.0|3\.0|extension|extender))\b/i.test(combined)) {
      // Fit is computed from the competitor's actual distance/USB/KVM requirement (see
      // dynamicExtenderFit.ts), not a fixed short-list offered regardless of reach.
      const competitorProfile = deriveExtenderFitProfile(args.competitorRecord ?? {}, args.competitorText);
      const candidateProfile = deriveExtenderFitProfile(product || args.match, combined);
      const fit = scoreExtenderFit(competitorProfile, candidateProfile);

      if (fit.eligibility === "direct") {
        return direct(args.intent, fit.reasons, fit.fitPenalty, fit.rows);
      }

      return related(args.intent, fit.reasons, Math.max(fit.fitPenalty, 60), fit.rows);
    }

    return related(args.intent, ["Related product, but not a direct extender lead."], 80);
  }

  if (args.intent === "ndi-camera") {
    if (/^CAM/.test(key) && /NDI/.test(key)) {
      return direct(args.intent, ["WyreStorm NDI camera candidate for a camera-role comparison."], -120);
    }

    if (/\b(ndi|birddog|networkhd\s*cam)\b/i.test(combined)) {
      return direct(args.intent, ["NDI-capable camera or NDI workflow candidate."], 20);
    }

    return blocked(sku, args.intent, ["Candidate is not an NDI camera or NDI-capable endpoint."]);
  }

  if (args.intent === "ptz-camera") {
    if (/^CAM/.test(key) && /\b(ptz|pan[\s-]tilt|visca)\b/i.test(combined)) {
      return direct(args.intent, ["WyreStorm PTZ camera candidate for a camera-role comparison."], -120);
    }

    if (/\b(ptz|pan[\s-]tilt|visca|pelco|cam)\b/i.test(combined)) {
      return direct(args.intent, ["PTZ or controllable camera candidate."], 20);
    }

    return blocked(sku, args.intent, ["Candidate is not a PTZ or controllable camera."]);
  }

  if (args.intent === "wireless-casting") {
    if (/^NHD/.test(key) || /\b(avoip|networkhd|encoder|decoder|transceiver|transmitter|receiver)\b/i.test(combined)) {
      return blocked(sku, args.intent, ["This is a wireless presentation workflow, not an AVoIP endpoint comparison. Do not lead with NetworkHD here."]);
    }

    const looksLikeCastingCandidate = /^SW|^APO/.test(key) || /\b(apollo|wireless|casting|miracast|airplay|chromecast|presentation)\b/i.test(combined);

    if (!looksLikeCastingCandidate) {
      return related(args.intent, ["No confirmed wireless casting capability."], 75);
    }

    // Same product family and scoring model as presentation-switcher (see
    // dynamicPresentationSwitcherFit.ts) -- wireless-casting is that same intent with the
    // competitor already known to be wireless-capable, so there is no separate hardcoded
    // SW-620/SW-640/APO-DG2 list to keep in sync with it.
    const competitorProfile = derivePresentationSwitcherFitProfile(args.competitorRecord ?? {}, args.competitorText);
    const candidateProfile = derivePresentationSwitcherFitProfile(product || args.match, combined);
    const fit = scorePresentationSwitcherFit(competitorProfile, candidateProfile);

    if (fit.eligibility === "direct") {
      return direct(args.intent, fit.reasons, fit.fitPenalty, fit.rows);
    }

    if (fit.eligibility === "alternative") {
      return alternative(args.intent, fit.reasons, Math.max(fit.fitPenalty, 30), fit.rows);
    }

    return related(args.intent, fit.reasons, Math.max(fit.fitPenalty, 60), fit.rows);
  }

  if (args.intent === "network-audio") {
    if (/^NHD/.test(key) || /\b(avoip|networkhd|encoder|decoder|transceiver|transmitter|receiver)\b/i.test(combined)) {
      return blocked(sku, args.intent, ["This is network audio, not network video. Do not lead with an AVoIP endpoint for an audio DSP / Dante comparison."]);
    }

    if (/^AMP/.test(key) || /\b(dante|aes67|audio|dsp|amplifier|speakerphone|conference)\b/i.test(combined)) {
      return direct(args.intent, ["Audio / DSP / network-audio candidate."], 0);
    }

    return related(args.intent, ["No confirmed audio / DSP / network-audio capability noted."], 75);
  }

  if (args.intent === "usb-audio") {
    if (/\b(usb|audio|mic|speakerphone|conference)\b/i.test(combined) || /^APO/.test(key)) {
      return direct(args.intent, ["USB audio or conferencing audio candidate."], 0);
    }

    return blocked(sku, args.intent, ["Candidate is not a USB audio or conferencing audio product."]);
  }

  if (args.intent === "gpio-relay") {
    if (/\b(gpio|relay|contact\s*closure|i\/o)\b/i.test(combined)) {
      return direct(args.intent, ["GPIO or relay candidate."], 0);
    }

    return related(args.intent, ["No confirmed GPIO or relay capability noted."], 70);
  }

  if (args.intent === "cable") {
    if (/^CAB/.test(key) || /\b(cable|cat\s*\d|fiber|fibre|optical|aoc)\b/i.test(combined)) {
      return direct(args.intent, ["Cable or passive cabling accessory candidate."], 0);
    }

    return blocked(sku, args.intent, ["Candidate is not a cable or passive cabling product."]);
  }

  if (args.intent === "controller-accessory") {
    return direct(args.intent, ["Accessory/controller comparison requested."], 0);
  }

  return related(args.intent, ["No strict intent gate applied."], 80);
}

function ensureEligibilityCandidatePool(
  matches: LooseMatch[],
  products: LooseRecord[],
  intent: CompareIntentKind,
  competitorText: string,
  avoipRecommendation: NetworkHdAvoipRecommendation,
  competitorRecord: LooseRecord = {},
): LooseMatch[] {
  const nextMatches = [...matches];

  // AVoIP endpoints: inject only the truth-resolved series (correct network class
  // + codec + role, banned SKUs already removed). This never mixes 10G and 1G.
  if (AVOIP_ENDPOINT_INTENTS.has(intent) && avoipRecommendation.applies) {
    let added = 0;

    for (const sku of avoipRecommendation.candidateSkus) {
      addCandidateBySku(
        nextMatches,
        products,
        sku,
        `Eligibility correction: NetworkHD ${avoipRecommendation.series} (${avoipRecommendation.networkClass.toUpperCase()}) candidate inserted for AVoIP comparison.`,
        80,
      );

      added += 1;

      if (added >= 6) {
        break;
      }
    }
  }

  if (intent === "matrix" || intent === "hdbaset-matrix") {
    // Dynamic search over the live matrix catalog, scored on routed I/O size fit and
    // HDBaseT-vs-local-HDMI transport match (see dynamicMatrixFit.ts) -- not a fixed
    // per-size SKU table that only covers a few hand-picked sizes.
    const competitorFitProfile = deriveMatrixFitProfile(competitorRecord, competitorText);
    const dynamicCandidates = findDynamicMatrixCandidates(products, competitorFitProfile, 6);

    for (const candidate of dynamicCandidates) {
      addCandidateBySku(
        nextMatches,
        products,
        candidate.sku,
        `Dynamic fit match: ${candidate.fit.reasons.join(" ")}`,
        Math.max(10, 90 - Math.round(candidate.fit.fitPenalty / 2)),
      );
    }
  }

  if (intent === "distribution-amplifier") {
    // Dynamic search scored on the competitor's actual required output count (see
    // dynamicDistributionAmpFit.ts) instead of always leading with the same two SKUs.
    const competitorFitProfile = deriveDistributionAmpFitProfile(competitorRecord);
    const dynamicCandidates = findDynamicDistributionAmpCandidates(products, competitorFitProfile, 4);

    for (const candidate of dynamicCandidates) {
      addCandidateBySku(
        nextMatches,
        products,
        candidate.sku,
        `Dynamic fit match: ${candidate.fit.reasons.join(" ")}`,
        Math.max(10, 90 - Math.round(candidate.fit.fitPenalty / 2)),
      );
    }
  }

  if (intent === "presentation-switcher" || intent === "uc-byod") {
    // Dynamic search over the live catalog (matrix + presentation-switcher + UC families),
    // scored against the competitor's own structured spec -- not a fixed SKU allowlist.
    // See dynamicPresentationSwitcherFit.ts for the scoring model.
    const competitorFitProfile = derivePresentationSwitcherFitProfile(competitorRecord, competitorText);
    const dynamicCandidates = findDynamicPresentationSwitcherCandidates(products, competitorFitProfile, 6);

    for (const candidate of dynamicCandidates) {
      addCandidateBySku(
        nextMatches,
        products,
        candidate.sku,
        `Dynamic fit match: ${candidate.fit.reasons.join(" ")}`,
        Math.max(10, 90 - Math.round(candidate.fit.fitPenalty / 2)),
      );
    }
  }

  if (intent === "extender") {
    // Dynamic search scored on the competitor's actual distance/USB/KVM requirement (see
    // dynamicExtenderFit.ts) instead of always offering the same six SKUs regardless of reach.
    const competitorFitProfile = deriveExtenderFitProfile(competitorRecord, competitorText);
    const dynamicCandidates = findDynamicExtenderCandidates(products, competitorFitProfile, 6);

    for (const candidate of dynamicCandidates) {
      addCandidateBySku(
        nextMatches,
        products,
        candidate.sku,
        `Dynamic fit match: ${candidate.fit.reasons.join(" ")}`,
        Math.max(10, 90 - Math.round(candidate.fit.fitPenalty / 2)),
      );
    }
  }

  if (intent === "video-wall-processor") {
    addCandidateBySku(nextMatches, products, "SW-0206-VW", "Eligibility correction: dedicated video wall processor inserted ahead of generic AVoIP or multiview alternatives.", 88);
    addCandidateBySku(nextMatches, products, "SW-0204-VW", "Eligibility correction: simpler preset-layout video wall processor inserted for basic wall requirements.", 84);
  }

  if (intent === "multiview") {
    addCandidateBySku(nextMatches, products, "NHD-0401-MV", "Eligibility correction: dedicated multiview processor inserted for a multi-source single-output canvas.", 88);
    addCandidateBySku(nextMatches, products, "NHD-150-RX", "Eligibility correction: NetworkHD multiview receiver inserted for AVoIP multiview workflow.", 84);
  }

  if (intent === "ndi-camera") {
    addCandidateBySku(nextMatches, products, "CAM-210-NDI-PTZ", "Eligibility correction: WyreStorm NDI PTZ camera inserted for an NDI camera comparison.", 90);
    addCandidateBySku(nextMatches, products, "CAM-0402-NDI-BRG", "Eligibility correction: NDI camera bridge inserted as an architecture alternative where several cameras must become one feed.", 78);
    addCandidatesByPredicate(
      nextMatches,
      products,
      (product) => /^CAM/.test(skuKey(product.sku)) && /\bndi\b/i.test(productText(product)),
      "Eligibility correction: current WyreStorm NDI camera candidate inserted for camera-role comparison.",
      4,
      86,
    );
  }

  if (intent === "ptz-camera") {
    addCandidateBySku(nextMatches, products, "CAM-420-PTZ", "Eligibility correction: current WyreStorm PTZ camera inserted for camera-role comparison.", 90);
    addCandidateBySku(nextMatches, products, "CAM-210-PTZ", "Eligibility correction: WyreStorm PTZ camera inserted for camera-role comparison.", 86);
    addCandidatesByPredicate(
      nextMatches,
      products,
      (product) => /^CAM/.test(skuKey(product.sku)) && /\bptz\b/i.test(productText(product)),
      "Eligibility correction: current WyreStorm PTZ camera candidate inserted for camera-role comparison.",
      4,
      84,
    );
  }

  if (intent === "wireless-casting") {
    // Same family + scorer as presentation-switcher (see dynamicPresentationSwitcherFit.ts)
    // -- no separate fixed SW-620/SW-640/APO-DG2 list to maintain in parallel.
    const competitorFitProfile = derivePresentationSwitcherFitProfile(competitorRecord, competitorText);
    const dynamicCandidates = findDynamicPresentationSwitcherCandidates(products, competitorFitProfile, 6);

    for (const candidate of dynamicCandidates) {
      addCandidateBySku(
        nextMatches,
        products,
        candidate.sku,
        `Dynamic fit match: ${candidate.fit.reasons.join(" ")}`,
        Math.max(10, 90 - Math.round(candidate.fit.fitPenalty / 2)),
      );
    }
  }

  if (intent === "usb-audio") {
    addCandidatesByPredicate(
      nextMatches,
      products,
      (product) => /^APO/.test(String(product.sku ?? "")) || /\b(usb|audio|mic|conferenc)\b/i.test(productText(product)),
      "Eligibility correction: WyreStorm USB audio or conferencing candidate inserted for USB audio comparison.",
      4,
      72,
    );
  }

  return nextMatches;
}

function eligibilityRank(value: CompareEligibilityClass): number {
  if (value === "direct") return 0;
  if (value === "architecture-alternative") return 1;
  if (value === "related-only") return 2;
  return 3;
}

function decisionConfidence(match: LooseMatch): number {
  const value = Number(match?.decision?.confidence ?? match?.confidence ?? match?.score ?? 0);
  return Number.isFinite(value) ? value : 0;
}

export function applyCompareEligibilityRanking<T extends { matches?: LooseMatch[]; rejected?: LooseMatch[]; competitor?: LooseRecord; topOutcome?: string; recommendation?: string; nextSteps?: string[] }>(
  result: T,
  products: LooseRecord[],
  inputText = "",
): T {
  const rawMatches = Array.isArray(result.matches) ? result.matches : [];
  const intent = classifyCompareIntent(result.competitor || result, inputText);
  const competitorText = [
    structuredMatrixText(result.competitor || result),
    extractCompetitorText(result.competitor || result, inputText),
  ].filter(Boolean).join(" ");

  // Resolve the competitor's AVoIP network class + correct NetworkHD series once,
  // so the eligibility layer obeys the same "never mix 10G and 1G" + ban rules.
  const { classification: avoipClassification, recommendation: avoipRecommendation } =
    mapCompetitorToNetworkHdAvoip(competitorText);
  const competitorNetworkClass: AvoipNetworkClass = avoipClassification.isAvoip
    ? avoipClassification.networkClass
    : "unknown";
  const recommendedSkuKeys = new Set(avoipRecommendation.candidateSkus.map((sku) => skuKey(sku)));

  const competitorRecord = (result.competitor || result) as LooseRecord;
  const matches = ensureEligibilityCandidatePool(rawMatches, products, intent, competitorText, avoipRecommendation, competitorRecord);
  const selectorDecisions = selectWingmanProducts(products, {
    mode: "compare",
    query: competitorText,
    technicalRequirement: competitorText,
    includeArchitectureAlternatives: true,
  });
  const selectorDecisionBySku = new Map(selectorDecisions.map((decision) => [skuKey(decision.sku), decision]));

  const evaluated = matches.map((match, index) => {
    const product = getProduct(match, products);
    const baseEligibility = evaluateProductEligibility({
      intent,
      competitorText,
      match,
      product,
      competitorNetworkClass,
      competitorRecord,
    });

    // Within the allowed network class, prefer the truth-resolved series/role
    // (e.g. 500 over 100 for a visually-lossless 1G competitor) so it leads.
    const compareEligibility =
      baseEligibility.eligibility === "direct" && recommendedSkuKeys.has(skuKey(getSku(match)))
        ? { ...baseEligibility, fitPenalty: baseEligibility.fitPenalty - 40 }
        : baseEligibility;
    const selectorDecision = selectorDecisionBySku.get(skuKey(getSku(match))) || selectorDecisionBySku.get(skuKey(getSku(product)));
    const selectorGatedEligibility = selectorDecision && !selectorDecision.eligible
      ? {
          ...compareEligibility,
          eligibility: "blocked" as const,
          fitPenalty: Math.max(compareEligibility.fitPenalty, 900),
          reasons: [
            ...compareEligibility.reasons,
            ...selectorDecision.rejectionReasons.map((reason) => `Shared selector gate: ${reason}`),
          ],
        }
      : compareEligibility;

    return {
      match: {
        ...match,
        compareEligibility: selectorGatedEligibility,
        eligibility: selectorGatedEligibility,
      },
      compareEligibility: selectorGatedEligibility,
      index,
    };
  });

  const accepted = evaluated
    .filter((item) => item.compareEligibility.eligibility !== "blocked")
    .sort((a, b) => {
      const rankDelta = eligibilityRank(a.compareEligibility.eligibility) - eligibilityRank(b.compareEligibility.eligibility);
      if (rankDelta !== 0) return rankDelta;

      const fitDelta = a.compareEligibility.fitPenalty - b.compareEligibility.fitPenalty;
      if (fitDelta !== 0) return fitDelta;

      const confidenceDelta = decisionConfidence(b.match) - decisionConfidence(a.match);
      if (confidenceDelta !== 0) return confidenceDelta;

      return a.index - b.index;
    })
    .map((item) => item.match);

  const blockedMatches = evaluated
    .filter((item) => item.compareEligibility.eligibility === "blocked")
    .map((item) => ({
      ...item.match,
      rejectedReason: item.compareEligibility.reasons.join(" "),
    }));

  const existingRejected = Array.isArray(result.rejected) ? result.rejected : [];
  const nextRejected = [...existingRejected, ...blockedMatches];

  const leadEligibility = accepted[0]?.compareEligibility as CompareEligibilityResult | undefined;
  const nextRecommendationPrefix = leadEligibility
    ? `Eligibility gate: ${String(leadEligibility.eligibility).replace("-", " ")} candidate for ${intent}.`
    : `Eligibility gate: no direct candidate confirmed for ${intent}.`;

  const nextTopOutcome = accepted.length > 0 && result.topOutcome === "NONE"
    ? "VERIFY"
    : result.topOutcome;
  const lead = accepted[0] as LooseMatch | undefined;
  const leadSku = lead ? getSku(lead) : "";
  const leadNextAction = String(lead?.decision?.nextAction ?? lead?.nextAction ?? "").trim();
  const nextRecommendation = leadSku
    ? `${nextRecommendationPrefix} ${leadSku} is the current WyreStorm direction.${leadNextAction ? ` ${leadNextAction}` : ""}`
    : [nextRecommendationPrefix, result.recommendation].filter(Boolean).join(" ");

  return {
    ...result,
    compareIntent: intent,
    matches: accepted,
    rejected: nextRejected,
    topOutcome: nextTopOutcome,
    recommendation: nextRecommendation,
  } as T;
}
