import {
  isBannedNetworkHdSku,
  mapCompetitorToNetworkHdAvoip,
  networkClassOfNetworkHdSku,
  type AvoipNetworkClass,
  type NetworkHdAvoipRecommendation,
} from "./networkHdAvoipEquivalence";
import { selectWingmanProducts } from "./productSelectorEngine";
import { getWyreStormCompareLeadBlockReason } from "./wyrestormSkuBusinessStatus";
import { buildWyrestormCompareProfile } from "./wyrestormCompareProfile";

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
  | "control-system"
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

/**
 * Recognises the competitor-side device that plays the "casting accessory"
 * role. Vendors use several names for essentially the same user-facing job:
 * dongle, button, connect adapter, wireless presentation adapter, etc.
 *
 * Keep this deliberately scoped to wireless-presentation language so a generic
 * AV/network adapter is never mistaken for a casting accessory.
 */
function isExplicitCastingAccessoryComparison(value: unknown): boolean {
  const text = normalise(value);

  if (/\b(?:dongle|clickshare\s+button|airmedia\s+connect\s+adapter)\b/i.test(text)) {
    return true;
  }

  const hasAccessoryWord = /\b(?:adapter|button|dongle)\b/i.test(text);
  const hasWirelessPresentationContext =
    /\b(?:airmedia|clickshare|wireless|casting|screen\s*share|screen\s*sharing|presentation|byod)\b/i.test(text);
  const looksLikeRoomCore =
    /\b(?:switcher|receiver|gateway|video\s*bar|conference\s*bar|room\s*system|matrix)\b/i.test(text);

  return hasAccessoryWord && hasWirelessPresentationContext && !looksLikeRoomCore;
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
    // A real compare profile (not the raw catalogue row) so the match card can
    // surface the governed data tier - sourceTier/sourceLabel are set from the
    // governed registry, never carried as bare product fields.
    wyrestorm: buildWyrestormCompareProfile(product as any),
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

function extractMatrixSizeFromText(text: string): { inputs?: number; outputs?: number } {
  const readable = text.replace(/[×]/g, "x");
  const explicit = readable.match(/(?:^|[^0-9])(\d{1,2})\s*x\s*(\d{1,2})(?:[^0-9]|$)/i);

  if (explicit) {
    return {
      inputs: Number(explicit[1]),
      outputs: Number(explicit[2]),
    };
  }

  const compact = skuKey(text);
  const blustreamKit = compact.match(/^(?:HMX|C)(\d)(\d)(?:18G|4K|KIT|CS|PRO|$)/);

  if (blustreamKit) {
    return {
      inputs: Number(blustreamKit[1]),
      outputs: Number(blustreamKit[2]),
    };
  }

  // WyreStorm splitters (SP-0104 / SP-0108) and Essentials splitters
  // (EXP-SP-0104 / EXP-SP-0102-8K) encode inputs+outputs the same way as the
  // matrix SKUs (SP-0104 = 1 input / 4 outputs). Without this the distribution
  // amplifier right-sizing (matrixFitPenalty) reads no fan-out and cannot tell a
  // 1x4 splitter from a 1x8, so a 1x4 request could match the larger 1x8.
  const prefixed = compact.match(/(?:MXV|MMX|HMX|MX|VS|C|ACMX|EXPSP|SP)(\d{2})(\d{2})/);

  if (prefixed) {
    return {
      inputs: Number(prefixed[1]),
      outputs: Number(prefixed[2]),
    };
  }

  return {};
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

function extractCandidateMatrixSize(value: unknown): { inputs?: number; outputs?: number } | undefined {
  const explicit = extractStructuredMatrixSize(value);
  if (explicit) return explicit;

  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  // WyreStorm routed capacity normally lives in the governed technical profile,
  // not in the flat catalogue record. Use the same normalised profile as the
  // compare cards so eligibility and presentation cannot disagree.
  const record = value as LooseRecord;
  const profile = buildWyrestormCompareProfile({
    ...record,
    features: Array.isArray(record.features) ? record.features : [],
    technologies: Array.isArray(record.technologies) ? record.technologies : [],
    featureTags: Array.isArray(record.featureTags) ? record.featureTags : [],
    tags: Array.isArray(record.tags) ? record.tags : [],
  } as any);
  const inputs = numberFromValue(profile.inputCount);
  const outputs = numberFromValue(profile.outputCount);
  const descriptiveText = toText(record);
  const describedInputs = numberFromValue(descriptiveText.match(/\b(\d{1,2})[ -]input\b/i)?.[1]);
  const describedOutputs = numberFromValue(descriptiveText.match(/\b(\d{1,2})[ -]output\b/i)?.[1]);
  const resolvedInputs = Math.max(inputs && inputs <= 64 ? inputs : 0, describedInputs ?? 0) || undefined;
  const resolvedOutputs = Math.max(outputs && outputs <= 64 ? outputs : 0, describedOutputs ?? 0) || undefined;
  return resolvedInputs || resolvedOutputs
    ? { inputs: resolvedInputs, outputs: resolvedOutputs }
    : undefined;
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
    (resultOrInput as LooseRecord).transport,
  ]);

  if (/\b(software|software add-on|management platform|cloud platform|platform \/ software)\b/i.test(roleText)) {
    return "control-system";
  }

  switch (domain) {
    case "AVOIP":
      if (/\b(encoder|transmitter)\b/i.test(roleText)) return "av-over-ip-encoder";
      if (/\b(decoder|receiver)\b/i.test(roleText)) return "av-over-ip-decoder";
      if (/\b(controller|director|manager|management)\b/i.test(roleText)) return "controller-accessory";
      return "av-over-ip";
    case "HDBASET":
      return /\bmatrix\b/i.test(roleText) ? "hdbaset-matrix" : "extender";
    case "MATRIX":
      return /\b(hdbaset|hdbt)\b/i.test(roleText) ? "hdbaset-matrix" : "matrix";
    case "PRESENTATION":
      return /\b(uc|video\s*bar|conference\s*bar|conferencing\s*bar|soundbar|room appliance)\b/i.test(roleText)
        ? "uc-byod"
        : "presentation-switcher";
    case "VIDEO_WALL":
      return "video-wall-processor";
    case "MULTIVIEW":
      return "multiview";
    case "USB_EXTENSION":
      return "extender";
    case "AUDIO":
      return "network-audio";
    case "CONTROL":
      return /\b(av\s*over\s*ip|avoip|networkhd|multicast\s+(?:av|video|system)|domain manager|endpoint manager)\b/i.test(roleText)
        ? "controller-accessory"
        : "control-system";
    case "UC_SOUNDBAR":
    case "UC":
      return "uc-byod";
    case "CABLE":
      return "cable";
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

/**
 * A compact presentation / UC switcher (USB-C, BYOD, auto-switching) is often
 * marketed as a "4x2 matrix switcher". Without this guard the generic matrix
 * regex below (which fires on the word "matrix" and small I/O sizes like 4x2)
 * would classify it as a routing matrix and inject an 8x8 MX candidate instead
 * of an SW- presentation switcher. A genuine routing matrix - explicit
 * routing-matrix language, or three-plus outputs - is deliberately excluded so
 * real matrices are unaffected.
 */
function isCompactPresentationSwitcher(text: string): boolean {
  const strongPresentationSignal =
    /\busb-?c\b/i.test(text) ||
    /\b(byod|byom|unified\s*communications?|teams|zoom|huddle|meeting\s*room)\b/i.test(text) ||
    /\bpresentation\s*switch(?:er|ing)?\b/i.test(text) ||
    /\bauto[\s-]*switch(?:ing)?\b/i.test(text);

  if (!strongPresentationSignal) {
    return false;
  }

  const routingMatrix =
    /\b(routing\s*matrix|matrix\s*router|cross[\s-]?point|seamless\s*matrix)\b/i.test(text) ||
    // Three or more outputs (N x >=3) is routing-matrix territory, not a
    // one/two-display presentation switcher.
    /\b\d+\s*x\s*([3-9]|\d\d)\b/.test(text);

  return !routingMatrix;
}

export function classifyCompareIntent(resultOrInput: unknown, inputText = ""): CompareIntentKind {
  // Some software-only catalogue rows resolve through the hardware family they
  // extend (for example a wireless-presentation software licence). Preserve the
  // submitted software identity before that family mapping can inject hardware.
  if (/\b(software add-on|software platform|cloud management platform|platform\s*\/\s*software(?: generation)?)\b/i.test(inputText)) {
    return "control-system";
  }

  if (resultOrInput && typeof resultOrInput === "object") {
    const record = resultOrInput as LooseRecord;
    const explicitRole = normalise([record.role, record.category, record.subcategory, record.technology]);
    const controllerContext = normalise([record.summary, record.description, record.family, inputText]);

    // Controller records frequently mention the AVoIP endpoints they manage.
    // Their explicit product role must win before descriptive AVoIP keywords,
    // otherwise a controller such as ACM210 is mistaken for an encoder.
    if (
      /\b(controller|control module|control processor|automation controller)\b/i.test(explicitRole) &&
      /\b(av\s*over\s*ip|avoip|networkhd|multicast\s+(?:av|video|system)|ip\d{2,4}[a-z0-9]*\s+system)\b/i.test(controllerContext)
    ) {
      return "controller-accessory";
    }
  }

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

  // A USB-C / BYOD / auto-switching presentation switcher takes precedence over
  // the generic matrix heuristic even when its datasheet says "matrix switcher".
  if (isCompactPresentationSwitcher(text)) {
    return /\b(byod|byom|teams|zoom|unified\s*communications?|video\s*bar|speakerphone|huddle)\b/i.test(text)
      ? "uc-byod"
      : "presentation-switcher";
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

function direct(intent: CompareIntentKind, reasons: string[], fitPenalty = 0): CompareEligibilityResult {
  return {
    eligibility: "direct",
    intent,
    reasons,
    blockers: [],
    fitPenalty,
  };
}

function alternative(intent: CompareIntentKind, reasons: string[], fitPenalty = 25): CompareEligibilityResult {
  return {
    eligibility: "architecture-alternative",
    intent,
    reasons,
    blockers: [],
    fitPenalty,
  };
}

function related(intent: CompareIntentKind, reasons: string[], fitPenalty = 75): CompareEligibilityResult {
  return {
    eligibility: "related-only",
    intent,
    reasons,
    blockers: [],
    fitPenalty,
  };
}

function productIsSupportOnly(sku: string, text: string): string | null {
  const key = skuKey(sku);
  const value = normalise(text);

  const explicitlyPrimaryHardware =
    /^NHD/.test(key) ||
    /^APO(?:100|200|210|VX20)UC/.test(key) ||
    // APO-DG2(-PRO) is the wireless-casting dongle itself, not a supporting
    // accessory for other hardware - it's the lead candidate when a
    // competitor's own product is a wireless casting dongle.
    /^APODG2/.test(key) ||
    /^SW020[46]VW$/.test(key) ||
    // SW-620/640-TX-W are the wireless presentation switchers themselves -
    // primary hardware, never support items (their box-contents copy mentions
    // an included PSU, which must not flip them into a "power accessory").
    /^SW6/.test(key) ||
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

  // Power wording is matched on the SKU identity ONLY. A primary product's
  // box-contents copy routinely mentions an included PSU ("20V 10A power
  // supply"), so matching on description text turns real hardware into
  // "power accessories" - see SW-640L-TX-W / AMP-260-DNT.
  if (/^PSU|^PWR|POWERADAPTER|POWERSUPPLY/.test(key)) {
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

/** Extract transport text from the product record's structured data. */
function candidateProductTransportText(product: unknown): string {
  if (!product || typeof product !== "object" || Array.isArray(product)) return "";
  const record = product as LooseRecord;

  // 1. Structured transport array on the governed technical profile
  const transports = record.transport ?? record.technologies;
  if (Array.isArray(transports) && transports.length > 0) {
    return transports.map((t: unknown) => String(t ?? "")).join(" ");
  }

  // 2. Product class / product type labels
  const productType = String(record.productType ?? record.productClass ?? "");
  if (productType) return productType;

  // 3. WyreStorm compare profile (if already built)
  const profile = record.wyrestorm ?? record;
  const profileTransport = profile.transport;
  if (Array.isArray(profileTransport) && profileTransport.length > 0) {
    return profileTransport.map((t: unknown) => String(t ?? "")).join(" ");
  }

  // 4. Technical profile transport
  const techProfile = record.technicalProfile;
  if (techProfile && typeof techProfile === "object") {
    const techTransports = (techProfile as LooseRecord).transport;
    if (Array.isArray(techTransports) && techTransports.length > 0) {
      return techTransports.map((t: unknown) => String(t ?? "")).join(" ");
    }
  }

  return "";
}

function matrixFitPenalty(competitorText: string, sku: string, text: string, product?: unknown): number {
  const required = extractMatrixSizeFromText(competitorText);
  const offered = extractCandidateMatrixSize(product) ?? extractMatrixSizeFromText(`${sku} ${text}`);

  let penalty = 0;

  if (required.inputs && offered.inputs) {
    if (offered.inputs < required.inputs) {
      penalty += 200;
    } else {
      penalty += Math.max(0, offered.inputs - required.inputs) * 10;
    }
  }

  if (required.outputs && offered.outputs) {
    if (offered.outputs < required.outputs) {
      penalty += 200;
    } else {
      penalty += Math.max(0, offered.outputs - required.outputs) * 10;
    }
  }

  // Matrix capacity alone is not enough to establish technical equivalence.
  // A local-HDMI matrix and an HDBaseT matrix kit can both be 4x4, but they
  // have different output transports, cabling, receiver requirements and
  // package topology. Prefer the architecture that the competitor evidence
  // actually describes, without relying on a permanent SKU-to-SKU mapping.
  const requirement = normalise(competitorText);
  const candidate = normalise(`${sku} ${text}`);
  const requiresRemoteTransport = /\b(hdbaset|hdbt|tps|category cable|cat\s*[56][a-z]?|receiver(?:s| kit)?|rx kit)\b/i.test(requirement);
  const requiresLocalHdmi = /\bhdmi\b/i.test(requirement) && !requiresRemoteTransport;

  // Determine the candidate's actual output transport. Structured transport
  // data on the product record is authoritative — the SKU regex is a fallback
  // only. The H2A family prefix appears on both HDBaseT matrices (MXV-*) and
  // pure HDMI matrices (MX-0808-H2A-MK2), so matching H2A in the SKU alone
  // falsely flags local-HDMI products as offering remote transport.
  const candidateProductTransport = candidateProductTransportText(product);
  const offersRemoteTransport =
    (candidateProductTransport && /\b(hdbaset|hdbt|receiver(?:s| kit)?|rx kit)\b/i.test(candidateProductTransport))
    || /\b(hdbaset|hdbt|receiver(?:s| kit)?|rx kit)\b/i.test(candidate)
    || /(?:HDBT)/.test(skuKey(sku));
  const offersLocalHdmiOnly = /\bhdmi\b/i.test(candidate) && !offersRemoteTransport;
  const addsUnrequestedScaling = /\b(seamless|scaling|scaler)\b/i.test(candidate) || /SCL/.test(skuKey(sku));

  if (requiresRemoteTransport && offersLocalHdmiOnly) {
    penalty += 120;
  } else if (requiresLocalHdmi && offersRemoteTransport) {
    penalty += 120;
  } else if (requiresLocalHdmi && offersLocalHdmiOnly) {
    // Pure HDMI candidate matches a local-HDMI competitor: small tiebreaker
    // so it ranks above HDBaseT / remote-transport candidates when penalties
    // are otherwise equal. Kept small enough to avoid promoting NO-MATCH
    // candidates past the viability threshold.
    penalty -= 5;
  } else if (requiresRemoteTransport && offersRemoteTransport) {
    // HDBaseT candidate matches an HDBaseT competitor: small tiebreaker.
    penalty -= 5;
  }

  if (!/\b(seamless|scaling|scaler)\b/i.test(requirement) && addsUnrequestedScaling) {
    penalty += 30;
  }

  return penalty;
}

type ExtenderStructuralFitFacts = {
  distanceMeters: number | null;
  hasUsbExtension: boolean;
  hasKvm: boolean;
  hdbasetGeneration: number | null;
  hdbasetClass: "A" | "B" | null;
  uncompressed18Gbps: boolean;
};

type ExtenderStructuralAssessment = {
  directCapable: boolean;
  fitPenalty: number;
  reasons: string[];
};

/**
 * Reads advertised extension reach from text.
 *
 * Distance is never inferred from the SKU number. It must come from structured
 * data or an explicit metres/feet statement.
 */
function deriveAdvertisedDistanceMeters(text: string): number | null {
  const metres = Array.from(
    text.matchAll(/(\d+(?:\.\d+)?)\s*m(?:eters?|etres?)?\b/gi),
  )
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value > 0 && value < 20000);

  const feet = Array.from(
    text.matchAll(/(\d+(?:\.\d+)?)\s*(?:ft|feet|foot)\b/gi),
  )
    .map((match) => Number(match[1]) * 0.3048)
    .filter((value) => Number.isFinite(value) && value > 0 && value < 20000);

  const values = [...metres, ...feet];

  return values.length > 0 ? Math.max(...values) : null;
}

function deriveExtenderStructuralFitFacts(
  value: unknown,
  extraText = "",
): ExtenderStructuralFitFacts {
  const record: LooseRecord =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as LooseRecord)
      : {};

  const specs: LooseRecord =
    record.specs && typeof record.specs === "object" && !Array.isArray(record.specs)
      ? (record.specs as LooseRecord)
      : {};

  const technicalProfile: LooseRecord =
    record.technicalProfile &&
    typeof record.technicalProfile === "object" &&
    !Array.isArray(record.technicalProfile)
      ? (record.technicalProfile as LooseRecord)
      : {};

  const technicalSpecs: LooseRecord =
    technicalProfile.specs &&
    typeof technicalProfile.specs === "object" &&
    !Array.isArray(technicalProfile.specs)
      ? (technicalProfile.specs as LooseRecord)
      : {};

  const text = normalise([value, extraText]);

  const structuredDistance = numberFromValue(
    record.hdbasetDistance ??
      record.distanceMeters ??
      specs.hdbasetDistance ??
      specs.distanceMeters ??
      technicalProfile.hdbasetDistance ??
      technicalProfile.distanceMeters ??
      technicalSpecs.hdbasetDistance ??
      technicalSpecs.distanceMeters ??
      technicalProfile.hdbaset?.distanceMeters ??
      technicalProfile.hdbaset?.distance,
  );

  const distanceMeters =
    structuredDistance ??
    deriveAdvertisedDistanceMeters(text);

  const hasKvm =
    /\bkvm\b/i.test(text) ||
    /\bkeyboard\b.{0,80}\bmouse\b/i.test(text) ||
    /\bmouse\b.{0,80}\bkeyboard\b/i.test(text);

  // A bare USB-C video input is not USB extension evidence.
  const hasUsbExtension =
    hasKvm ||
    /\busb[\s_-]*(?:2(?:\.0)?|3(?:\.\d+)?|host|device|extension|extender|over[\s_-]*ip)\b/i.test(
      text,
    );

  const generationMatch = text.match(/\bhdbaset\s*(?:tm\s*)?(?:version\s*)?(3(?:\.0)?)\b/i);
  const classMatch = text.match(/\bhdbaset[^.]{0,30}\bclass\s*([ab])\b|\bclass\s*([ab])\b[^.]{0,30}\bhdbaset\b/i);
  const hdbasetGeneration = generationMatch ? Number(generationMatch[1]) : null;
  const hdbasetClass = String(classMatch?.[1] ?? classMatch?.[2] ?? "").toUpperCase() as "A" | "B" | "";
  const uncompressed18Gbps =
    /\buncompressed\b[^.]{0,50}\b18\s*gbps\b|\b18\s*gbps\b[^.]{0,50}\buncompressed\b/i.test(text) ||
    (/\b4k\s*60(?:hz)?\b/i.test(text) && /\b4\s*:\s*4\s*:\s*4\b/i.test(text) && hdbasetGeneration === 3);

  return {
    distanceMeters: distanceMeters ?? null,
    hasUsbExtension,
    hasKvm,
    hdbasetGeneration,
    hdbasetClass: hdbasetClass || null,
    uncompressed18Gbps,
  };
}

function scoreExtenderStructuralFit(
  required: ExtenderStructuralFitFacts,
  candidate: ExtenderStructuralFitFacts,
): ExtenderStructuralAssessment {
  let directCapable = true;
  let fitPenalty = 0;
  const reasons: string[] = [];

  if (required.hdbasetGeneration !== null) {
    if (candidate.hdbasetGeneration !== required.hdbasetGeneration) {
      directCapable = false;
      fitPenalty += 220;
      reasons.push(
        candidate.hdbasetGeneration === null
          ? `HDBaseT ${required.hdbasetGeneration.toFixed(1)} is required, but the candidate's HDBaseT generation is not evidenced.`
          : `Candidate uses HDBaseT ${candidate.hdbasetGeneration.toFixed(1)}, not the required HDBaseT ${required.hdbasetGeneration.toFixed(1)}.`,
      );
    } else {
      fitPenalty -= 45;
      reasons.push(`Candidate matches the required HDBaseT ${required.hdbasetGeneration.toFixed(1)} generation.`);
    }
  } else if (required.hdbasetClass !== null) {
    if (candidate.hdbasetClass !== required.hdbasetClass) {
      directCapable = false;
      fitPenalty += 180;
      reasons.push(`HDBaseT Class ${required.hdbasetClass} is required, but the candidate does not evidence the same class.`);
    }
  }

  if (required.uncompressed18Gbps) {
    if (!candidate.uncompressed18Gbps) {
      directCapable = false;
      fitPenalty += 200;
      reasons.push("Uncompressed 18Gbps / 4K60 4:4:4 transport is required but is not evidenced on this candidate.");
    } else {
      fitPenalty -= 35;
      reasons.push("Candidate evidences the required uncompressed 18Gbps / 4K60 4:4:4 transport class.");
    }
  }

  if (required.distanceMeters !== null) {
    if (candidate.distanceMeters === null) {
      directCapable = false;
      fitPenalty += 120;
      reasons.push(
        `Required extender reach is ${Math.round(required.distanceMeters)}m, but the candidate's supported reach is not evidenced.`,
      );
    } else if (candidate.distanceMeters < required.distanceMeters) {
      directCapable = false;
      fitPenalty += 180;
      reasons.push(
        `Candidate reach (${Math.round(candidate.distanceMeters)}m) is below the required ${Math.round(required.distanceMeters)}m.`,
      );
    } else if (candidate.distanceMeters <= required.distanceMeters * 1.25) {
      fitPenalty -= 30;
      reasons.push(
        `Candidate reach (${Math.round(candidate.distanceMeters)}m) closely covers the required ${Math.round(required.distanceMeters)}m.`,
      );
    } else {
      fitPenalty += 5;
      reasons.push(
        `Candidate reach (${Math.round(candidate.distanceMeters)}m) covers the required ${Math.round(required.distanceMeters)}m with additional headroom.`,
      );
    }
  }

  if (required.hasKvm) {
    if (!candidate.hasKvm) {
      directCapable = false;
      fitPenalty += 180;
      reasons.push(
        "KVM/USB host-control transport is required, but no KVM capability is evidenced on this candidate.",
      );
    } else {
      fitPenalty -= 25;
      reasons.push("Candidate provides the required KVM/USB host-control path.");
    }
  } else if (required.hasUsbExtension) {
    if (!candidate.hasUsbExtension) {
      directCapable = false;
      fitPenalty += 150;
      reasons.push(
        "USB extension is required, but no USB extension capability is evidenced on this candidate.",
      );
    } else {
      fitPenalty -= 20;
      reasons.push("Candidate provides the required USB extension path.");
    }
  }

  return {
    directCapable,
    fitPenalty,
    reasons,
  };
}
export function evaluateProductEligibility(args: {
  intent: CompareIntentKind;
  competitorText: string;
  match: LooseMatch;
  product?: LooseRecord;
  competitorNetworkClass?: AvoipNetworkClass;
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

  // COMPARE_PRIMARY_ROLE_ISOLATION_V1
  // Do not let keyword score promote a fundamentally different primary product.
  const explicitCandidateRoleText = normalise([
    product?.category,
    product?.role,
    product?.governanceRole,
    product?.productClass,
    product?.family,
    product?.name,
    product?.title,
  ]);
  // Product descriptions and tags include downstream applications (for
  // example a splitter may mention feeding a UC room or an integrated camera).
  // Those fields must not redefine the candidate's primary hardware class.
  // Use only the curated identity fields above for the hard UC/camera gate.
  const isUcRoomHardware =
    /\b(video\s*bar|conference\s*bar|conferencing\s*bar|uc\s*room\s*(?:product|endpoint)|all-in-one.*(?:camera|conferencing)|integrated\s+camera)\b/i.test(explicitCandidateRoleText);
  const isRoleMatchedPrimaryProduct =
    ((args.intent === "ndi-camera" || args.intent === "ptz-camera") && /^CAM/.test(key)) ||
    ((args.intent === "uc-byod" || args.intent === "usb-audio") && isUcRoomHardware);
  const isCameraPrimaryHardware =
    /^CAM/.test(key) ||
    /\b(?:ptz|ndi)\s*camera\b/i.test(explicitCandidateRoleText) ||
    /\bcamera\s*(?:endpoint|source|product)\b/i.test(explicitCandidateRoleText);
  const strictFixedSignalIntent =
    args.intent === "matrix" ||
    args.intent === "hdbaset-matrix" ||
    args.intent === "distribution-amplifier" ||
    args.intent === "presentation-switcher" ||
    args.intent === "extender";

  if (strictFixedSignalIntent && (isCameraPrimaryHardware || isUcRoomHardware)) {
    return blocked(sku, args.intent, [
      "Primary product class / role mismatch: camera or UC room hardware cannot lead a matrix, presentation-switcher, distribution or extender comparison.",
    ]);
  }
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

    const penalty = matrixFitPenalty(args.competitorText, sku, combined, product);

    if (penalty >= 200) {
      return blocked(sku, args.intent, ["Matrix candidate is undersized for the confirmed routed I/O requirement."]);
    }

    const size = extractMatrixSizeFromText(args.competitorText);
    const matrixBonus = size.inputs === 4 && size.outputs === 2 && (/0402|4X2/.test(key)) ? -100 : 0;

    return direct(args.intent, ["Matrix/switching candidate with compatible routed I/O direction."], penalty + matrixBonus);
  }

  if (args.intent === "distribution-amplifier") {
    if (/^SP|^EXPSP/.test(key) || /\b(splitter|distribution amplifier|distribution amp|duplicator)\b/i.test(combined)) {
      const penalty = matrixFitPenalty(args.competitorText, sku, combined, product);
      return direct(args.intent, ["HDMI distribution amplifier candidate with a one-source, mirrored-output topology."], penalty);
    }

    if (/^MX|^NHD/.test(key) || /\b(matrix|routed|networkhd|av-over-ip)\b/i.test(combined)) {
      return alternative(args.intent, ["Architecture alternative only: routed switching is not a direct replacement for a mirrored HDMI distribution amplifier."], 100);
    }

    return blocked(sku, args.intent, ["Candidate is not an HDMI splitter or distribution amplifier."]);
  }

  if (args.intent === "presentation-switcher" || args.intent === "uc-byod") {
    const competitorNeedsUcHardware = /\b(byom|teams|zoom|unified\s*communications?|uc\s*room|video\s*bar|conference\s*(bar|room|system)|speakerphone)\b/i.test(args.competitorText);
    const wirelessPresentationSwitcher = /^SW/.test(key) && /\b(wireless|casting|miracast|airplay|chromecast|presentation|switcher|byod|byom)\b/i.test(combined);
    const capacityPenalty = matrixFitPenalty(args.competitorText, sku, combined, product);

    // Product-family similarity never compensates for insufficient confirmed
    // routed capacity. Unknown capacity remains reviewable; known undersizing
    // is a functional mismatch and must not enter the viable candidate list.
    if (capacityPenalty >= 200) {
      return blocked(sku, args.intent, [
        "Candidate is undersized for the confirmed presentation-switcher routed I/O requirement.",
      ]);
    }

    if (args.intent === "uc-byod" && competitorNeedsUcHardware && !isUcRoomHardware) {
      return blocked(sku, args.intent, [
        "Candidate does not provide the integrated camera, microphones and speakers required for an all-in-one UC video-bar comparison.",
      ]);
    }

    if (args.intent === "uc-byod" && competitorNeedsUcHardware && wirelessPresentationSwitcher) {
      return blocked(sku, args.intent, [
        "A wireless presentation transmitter does not replace an all-in-one UC video bar with an integrated camera, microphones and speakers.",
      ]);
    }

    if (wirelessPresentationSwitcher) {
      const size = extractMatrixSizeFromText(args.competitorText);
      const prefersCompactSwitcher = Boolean(size.inputs && size.inputs <= 2);
      const prefersLargerSwitcher = Boolean(size.inputs && size.inputs >= 4);
      const is620 = key === "SW620TXW" || key === "SW620LTXW";
      const is640 = key === "SW640LTXW" || key === "SW640TXW";
      const fitPenalty = (prefersCompactSwitcher && is620) || (prefersLargerSwitcher && is640) ? -110 : -90;
      return direct(args.intent, ["Wireless presentation switcher candidate."], fitPenalty + capacityPenalty);
    }

    if (args.intent === "presentation-switcher" && isUcRoomHardware && !competitorNeedsUcHardware) {
      return blocked(sku, args.intent, [
        "UC room hardware is a different primary product class and cannot replace a presentation switcher.",
      ]);
    }

    if (/^SW|^MX/.test(key) || (args.intent === "uc-byod" && isUcRoomHardware) || /\b(presentation|switcher|usb-c|byod|byom|unified communications?|video bar)\b/i.test(combined)) {
      return direct(args.intent, ["Presentation/switching candidate for meeting-room workflow."], capacityPenalty);
    }

    return related(args.intent, ["Related product, but not a direct presentation switcher lead."], 80);
  }

  if (args.intent === "extender") {
    if (/^MX|^SW/.test(key) || /\b(presentation|matrix|switcher)\b/i.test(combined)) {
      return alternative(
        args.intent,
        [
          "ARCHITECTURE ALTERNATIVE: candidate changes the room architecture rather than replacing the point-to-point HDBaseT extender path.",
        ],
        65,
      );
    }

    const requiredExtenderFit = deriveExtenderStructuralFitFacts(
      args.competitorText,
    );

    const candidateExtenderFit = deriveExtenderStructuralFitFacts(
      product,
      combined,
    );

    const structuralFit = scoreExtenderStructuralFit(
      requiredExtenderFit,
      candidateExtenderFit,
    );

    if (/^NHDUSBTRX$/.test(key) && /\busb\b/i.test(args.competitorText)) {
      if (!structuralFit.directCapable) {
        return related(
          args.intent,
          structuralFit.reasons,
          Math.max(90, structuralFit.fitPenalty),
        );
      }

      return direct(
        args.intent,
        [
          "USB extension-over-IP candidate for USB/KVM workflow.",
          ...structuralFit.reasons,
        ],
        -20 + structuralFit.fitPenalty,
      );
    }

    if (
      /^EX|^RX|^TX/.test(key) ||
      /\b(extender|extension|hdbaset|hdbt|transmitter|receiver|usb\s*(2\.0|3\.0|extension|extender))\b/i.test(
        combined,
      )
    ) {
      if (!structuralFit.directCapable) {
        return related(
          args.intent,
          [
            "Extender architecture is relevant, but the candidate does not have enough evidenced capability for a direct replacement.",
            ...structuralFit.reasons,
          ],
          Math.max(90, structuralFit.fitPenalty),
        );
      }

      return direct(
        args.intent,
        [
          "Extension candidate for point-to-point transport.",
          ...structuralFit.reasons,
        ],
        structuralFit.fitPenalty,
      );
    }

    return related(
      args.intent,
      ["Related product, but not a direct extender lead."],
      80,
    );
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
    // A competitor described specifically as a "dongle" is a simple casting
    // accessory, not a multi-input switcher or a full UC room bar - lead with
    // APO-DG2 (the WyreStorm casting dongle) instead of a switcher/video-bar
    // nudge in that specific case.
    const competitorIsDongle = isExplicitCastingAccessoryComparison(args.competitorText);

    // SW-* wireless presentation switchers are the lead answer for this lane,
    // and must be checked BEFORE the AVoIP-endpoint wording block below: their
    // catalogue copy routinely contains generic "encoder / transmitter" and
    // "receiver" words (search terms, application questions) that would
    // otherwise flip the actual wireless switcher into a blocked NetworkHD
    // impostor - see SW-640L-TX-W.
    if (/^SW/.test(key) && /\b(wireless|casting|miracast|airplay|chromecast|presentation)\b/i.test(combined)) {
      return direct(args.intent, ["Wireless presentation switcher candidate."], competitorIsDongle ? 30 : -90);
    }

    // NetworkHD endpoints are never the answer to a wireless-presentation
    // brief, regardless of what their catalogue copy says.
    if (/^NHD/.test(key)) {
      return blocked(sku, args.intent, ["This is a wireless presentation workflow, not an AVoIP endpoint comparison. Do not lead with NetworkHD here."]);
    }

    // Apollo / wireless / casting products are the wireless collaboration line
    // themselves. Check them BEFORE the generic AVoIP-word block: their
    // enriched catalogue copy routinely contains generic "endpoint / decoder /
    // transceiver"-style words (applications, search terms) that would
    // otherwise flip the actual casting dongle (APO-DG2) or UC bar into a
    // blocked NetworkHD impostor - same root cause as the SW-640L-TX-W case.
    if (/\b(apollo|wireless|casting|miracast|airplay|chromecast)\b/i.test(combined) || /^APO/.test(key)) {
      const isDg2 = /^APODG2/.test(key);
      const isVx20Uc = /^APOVX20UC/.test(key);

      // APO-DG2 is a casting dongle accessory. It is only a valid compare
      // candidate when the competitor itself is explicitly a casting dongle.
      // Generic ClickShare / wireless-presentation room-hub comparisons must
      // lead with the compatible room core or wireless switcher instead.
      if (isDg2 && !competitorIsDongle) {
        return blocked(sku, args.intent, [
          "APO-DG2 is a casting dongle accessory and may only be recommended when the competitor comparison explicitly requests a casting dongle.",
        ]);
      }

      if (isDg2 && competitorIsDongle) {
        return direct(
          args.intent,
          ["Explicit casting-dongle comparison: APO-DG2 is the matching dongle role."],
          -120,
        );
      }

      const fitPenalty = isVx20Uc ? 15 : 45;
      return direct(args.intent, ["Wireless casting or collaboration candidate."], fitPenalty);
    }

    if (/\b(avoip|networkhd|av-over-ip|encoder|decoder|transceiver)\b/i.test(combined)) {
      return blocked(sku, args.intent, ["This is a wireless presentation workflow, not an AVoIP endpoint comparison. Do not lead with NetworkHD here."]);
    }

    return related(args.intent, ["No confirmed wireless casting capability."], 75);
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
    const isControllerRoleProduct =
      /^NHDCTL/.test(key) ||
      /\b(system[\s-]*controller|controller|control processor|control hub|management appliance)\b/i.test(combined);

    if (isControllerRoleProduct) {
      return direct(args.intent, ["Controller-role comparison requested."], 0);
    }

    return blocked(sku, args.intent, ["AV endpoint hardware cannot replace a controller or management appliance."]);
  }

  if (args.intent === "control-system") {
    return blocked(sku, args.intent, ["Dedicated control or software platforms require an explicit reviewed equivalent; AV transport hardware cannot be substituted."]);
  }

  return related(args.intent, ["No strict intent gate applied."], 80);
}

function ensureEligibilityCandidatePool(
  matches: LooseMatch[],
  products: LooseRecord[],
  intent: CompareIntentKind,
  competitorText: string,
  avoipRecommendation: NetworkHdAvoipRecommendation,
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
    const size = extractMatrixSizeFromText(competitorText);
    const prefersHdBaseTMatrix = /\bhdbaset\b|\bhdbt\b|\btps\b/i.test(competitorText);

    if (size.inputs === 4 && size.outputs === 4) {
      addCandidateBySku(nextMatches, products, "MXV-0404-H2A-KIT", "Eligibility correction: correctly sized 4x4 HDBaseT matrix candidate inserted for routed matrix comparison.", 90);
      addCandidateBySku(nextMatches, products, "MX-0404-HDMI", "Eligibility correction: correctly sized 4x4 HDMI matrix candidate inserted for routed matrix comparison.", 84);
      addCandidateBySku(nextMatches, products, "MX-0404-SCL", "Eligibility correction: correctly sized 4x4 scaling matrix candidate inserted for routed matrix comparison.", 82);
    }

    if (size.inputs === 4 && size.outputs === 2) {
      addCandidateBySku(nextMatches, products, "MX-0402-MST", "Eligibility correction: correctly sized 4x2 WyreStorm matrix candidate inserted ahead of oversized 8x8 options.", 86);
      addCandidatesByPredicate(
        nextMatches,
        products,
        (product) => /0402|4X2/.test(skuKey(product.sku)) && (/^MX/.test(skuKey(product.sku)) || /\b(matrix|switcher|routed)\b/i.test(productText(product))),
        "Eligibility correction: correctly sized 4x2 matrix/switching candidate inserted ahead of oversized 8x8 options.",
        4,
        82,
      );
    }

    if (size.inputs === 8 && size.outputs === 8) {
      addCandidateBySku(nextMatches, products, "MXV-0808-H2A-KIT", "Eligibility correction: correctly sized 8x8 HDBaseT matrix candidate inserted for routed matrix comparison.", 90);
      addCandidateBySku(nextMatches, products, "MXV-0808-H2A-70-V3", "Eligibility correction: correctly sized 8x8 long-reach HDBaseT matrix candidate inserted for routed matrix comparison.", 88);
      addCandidateBySku(nextMatches, products, "MX-0808-H2A-MK2", "Eligibility correction: correctly sized 8x8 HDMI matrix candidate inserted for routed matrix comparison.", 86);
      addCandidateBySku(nextMatches, products, "MX-0808-SCL-V2", "Eligibility correction: correctly sized 8x8 scaling matrix candidate inserted for routed matrix comparison.", 84);
    }

    if (
      size.inputs &&
      size.outputs &&
      size.inputs <= 8 &&
      size.outputs <= 8 &&
      !(size.inputs === 4 && size.outputs === 2) &&
      !(size.inputs === 4 && size.outputs === 4) &&
      !(size.inputs === 8 && size.outputs === 8)
    ) {
      const overCapacityReason = `Eligibility correction: nearest larger fixed matrix candidates inserted because WyreStorm does not offer an exact ${size.inputs}x${size.outputs} routed matrix. More I/O is acceptable only if the room still stays in the same matrix architecture.`;

      if (prefersHdBaseTMatrix) {
        addCandidateBySku(nextMatches, products, "MXV-0808-H2A-KIT", overCapacityReason, 88);
        addCandidateBySku(nextMatches, products, "MXV-0808-H2A-70-V3", `${overCapacityReason} Use the longer-reach path only when distance requires it.`, 84);
        addCandidateBySku(nextMatches, products, "MX-0808-KIT-V2", `${overCapacityReason} Older kit path, so verify bandwidth and topology before quote.`, 80);
      }

      addCandidateBySku(nextMatches, products, "MX-0808-H2A-MK2", overCapacityReason, prefersHdBaseTMatrix ? 82 : 88);
      addCandidateBySku(nextMatches, products, "MX-0808-SCL-V2", `${overCapacityReason} Only keep the scaling path in play if scaling is commercially useful.`, prefersHdBaseTMatrix ? 78 : 84);
    }
  }

  if (intent === "distribution-amplifier") {
    addCandidateBySku(nextMatches, products, "SP-0104-H2", "Eligibility correction: four-output HDMI distribution amplifier inserted for mirrored distribution.", 88);
    addCandidateBySku(nextMatches, products, "SP-0108-SCL", "Eligibility correction: eight-output HDMI distribution amplifier inserted for mirrored distribution.", 90);
    addCandidatesByPredicate(
      nextMatches,
      products,
      (product) => /^SP|^EXPSP/.test(skuKey(product.sku)) || /\b(splitter|distribution amplifier)\b/i.test(productText(product)),
      "Eligibility correction: same-topology HDMI distribution candidate inserted.",
      4,
      84,
    );
  }

  if (intent === "presentation-switcher" || intent === "uc-byod") {
    addCandidateBySku(nextMatches, products, "MX-0402-MST", "Eligibility correction: presentation switcher candidate inserted for compact meeting-room switching workflow.", 86);
    addCandidateBySku(nextMatches, products, "MX-0403-H3-MST", "Eligibility correction: presentation switcher candidate inserted for presentation rooms that also need a stronger room-core output path.", 84);
    addCandidateBySku(nextMatches, products, "SW-620-TX-W", "Eligibility correction: wireless presentation switcher candidate inserted for meeting-room collaboration workflow.", 84);
    addCandidateBySku(nextMatches, products, "SW-640L-TX-W", "Eligibility correction: wireless presentation switcher candidate inserted for BYOD/BYOM workflow.", 82);
    addCandidateBySku(nextMatches, products, "APO-VX20-UC-V2", "Eligibility correction: UC room hardware candidate inserted for conferencing workflow comparison.", 78);
  }

  if (intent === "extender") {
    addCandidateBySku(nextMatches, products, "EX-70-H2", "Eligibility correction: HDBaseT extender candidate inserted for point-to-point transport comparison.", 84);
    addCandidateBySku(nextMatches, products, "EX-35-H2", "Eligibility correction: compact HDBaseT extender candidate inserted for shorter point-to-point transport comparison.", 82);
    addCandidateBySku(nextMatches, products, "EX-100-USB3", "Eligibility correction: USB 3 extension candidate inserted for USB/KVM workflow comparison.", 84);
    addCandidateBySku(nextMatches, products, "EX-100-KVM", "Eligibility correction: KVM-capable HDBaseT extender candidate inserted for point-to-point transport comparison.", 82);
    addCandidateBySku(nextMatches, products, "EX-60-USB2", "Eligibility correction: USB 2 extension candidate inserted for USB workflow comparison.", 80);
    addCandidateBySku(nextMatches, products, "NHD-USB-TRX", "Eligibility correction: USB over IP transceiver inserted for USB extension workflow comparison.", 78);
    addCandidatesByPredicate(
      nextMatches,
      products,
      (product) => /^EX/.test(skuKey(product.sku)) && /\b(hdbaset|hdbt|extender|extension)\b/i.test(productText(product)),
      "Eligibility correction: current HDBaseT extender candidate inserted for class, reach and bandwidth evaluation.",
      20,
      80,
    );
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
    const competitorIsDongle = isExplicitCastingAccessoryComparison(competitorText);

    addCandidateBySku(nextMatches, products, "SW-620-TX-W", "Eligibility correction: wireless presentation switcher candidate inserted for wireless casting comparison.", 88);
    addCandidateBySku(nextMatches, products, "SW-640L-TX-W", "Eligibility correction: wireless presentation switcher candidate inserted for multi-source wireless presentation comparison.", 86);

    // DG2 is not a generic wireless-presentation match. Add it only when the
    // compared competitor is explicitly a casting dongle. A compatible room
    // core remains in the pool so the UI can present the required paired path.
    if (competitorIsDongle) {
      addCandidateBySku(
        nextMatches,
        products,
        "APO-DG2",
        "Eligibility correction: explicit casting-dongle comparison inserts APO-DG2 alongside a compatible WyreStorm room core.",
        92,
      );
    }

    addCandidateBySku(nextMatches, products, "APO-VX20-UC-V2", "Eligibility correction: Apollo collaboration product retained as a UC-room alternative, not the default switcher match.", 70);
    addCandidatesByPredicate(
      nextMatches,
      products,
      (product) => {
        const candidateKey = skuKey(product.sku ?? product.model ?? product.partNumber);

        if (/^APODG2/.test(candidateKey)) {
          return competitorIsDongle;
        }

        return /^APO/.test(candidateKey) || /\b(apollo|wireless|casting)\b/i.test(productText(product));
      },
      "Eligibility correction: WyreStorm Apollo or wireless collaboration product inserted for wireless casting comparison.",
      4,
      76,
    );
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

  if (intent === "controller-accessory") {
    addCandidateBySku(
      nextMatches,
      products,
      "NHD-CTL-PRO-V2",
      "Eligibility correction: current NetworkHD system controller inserted as the closest ecosystem-role equivalent for AVoIP control and management.",
      90,
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

const DG2_COMPANION_REQUIREMENT =
  "APO-DG2 requires one compatible WyreStorm room core: SW-620-TX-W, SW-640L-TX-W, or APO-VX20-UC-V2.";

const DG2_COMPANION_SKUS = [
  "SW-620-TX-W",
  "SW-640L-TX-W",
  "APO-VX20-UC-V2",
] as const;

function applyCastingAccessoryCompanionRequirement(
  match: LooseMatch,
  intent: CompareIntentKind,
  competitorText: string,
): LooseMatch {
  if (
    intent !== "wireless-casting" ||
    !isExplicitCastingAccessoryComparison(competitorText) ||
    skuKey(getSku(match)) !== "APODG2"
  ) {
    return match;
  }

  const decision: LooseRecord =
    match?.decision && typeof match.decision === "object"
      ? match.decision
      : {};

  const systemRequirements = Array.from(
    new Set([
      ...(Array.isArray(decision.systemRequirements)
        ? decision.systemRequirements
        : []),
      DG2_COMPANION_REQUIREMENT,
    ]),
  );

  const verify = Array.from(
    new Set([
      ...(Array.isArray(decision.verify) ? decision.verify : []),
      "Confirm which compatible room core is required for the application before quoting APO-DG2.",
    ]),
  );

  return {
    ...match,
    requiredCompanionSkus: [...DG2_COMPANION_SKUS],
    companionRequirement: DG2_COMPANION_REQUIREMENT,
    decision: {
      ...decision,
      systemRequirements,
      verify,
      nextAction:
        "Lead with APO-DG2 for the casting accessory, then pair it with SW-620-TX-W, SW-640L-TX-W, or APO-VX20-UC-V2 as the compatible WyreStorm room core.",
    },
    nextAction:
      "Lead with APO-DG2 for the casting accessory, then pair it with SW-620-TX-W, SW-640L-TX-W, or APO-VX20-UC-V2 as the compatible WyreStorm room core.",
  };
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

  const matches = ensureEligibilityCandidatePool(rawMatches, products, intent, competitorText, avoipRecommendation);
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
    });

    // Within the allowed network class, prefer the truth-resolved series/role
    // (e.g. 500 over 100 for a visually-lossless 1G competitor) so it leads.
    const compareEligibility =
      AVOIP_ENDPOINT_INTENTS.has(intent) &&
      baseEligibility.eligibility === "direct" &&
      recommendedSkuKeys.has(skuKey(getSku(match)))
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

    const candidateKey = skuKey(getSku(match) || getSku(product));
    const explicitCastingAccessory =
      intent === "wireless-casting" &&
      isExplicitCastingAccessoryComparison(competitorText);

    // Final authoritative DG2 rule.
    //
    // 1) Generic wireless room-hub / presentation comparisons must NEVER surface
    //    APO-DG2 as a candidate.
    //
    // 2) When the competitor itself is an explicit casting accessory (dongle,
    //    ClickShare Button, AirMedia Connect Adapter, etc.), APO-DG2 is the
    //    correct role-equivalent lead. In that narrow case we are allowed to
    //    override a generic shared-selector "accessory" rejection, provided the
    //    core Compare eligibility gate did not itself block DG2 for lifecycle,
    //    business-status, or another hard safety reason.
    //
    // This is deliberately applied after the shared selector because that
    // selector cannot know whether an accessory is the thing actually being
    // compared. The Compare engine can.
    let finalEligibility = selectorGatedEligibility;

    if (intent === "wireless-casting" && candidateKey === "APODG2") {
      if (explicitCastingAccessory && compareEligibility.eligibility !== "blocked") {
        finalEligibility = {
          ...compareEligibility,
          eligibility: "direct" as const,
          fitPenalty: Math.min(compareEligibility.fitPenalty, -220),
          reasons: Array.from(new Set([
            ...compareEligibility.reasons,
            "Explicit casting-accessory role match: APO-DG2 is the correct WyreStorm dongle/button/adapter equivalent.",
          ])),
        };
      } else {
        finalEligibility = {
          ...selectorGatedEligibility,
          eligibility: "blocked" as const,
          fitPenalty: Math.max(selectorGatedEligibility.fitPenalty, 950),
          reasons: Array.from(new Set([
            ...selectorGatedEligibility.reasons,
            "APO-DG2 is not a generic wireless room-core recommendation; only surface it when the competitor itself is an explicit casting accessory.",
          ])),
        };
      }
    }

    return {
      match: {
        ...match,
        compareEligibility: finalEligibility,
        eligibility: finalEligibility,
      },
      compareEligibility: finalEligibility,
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
    .map((item) =>
      applyCastingAccessoryCompanionRequirement(
        item.match,
        intent,
        competitorText,
      ),
    );

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
