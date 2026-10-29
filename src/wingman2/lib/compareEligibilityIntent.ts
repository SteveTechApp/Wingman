/**
 * What the competitor's product actually is, as one intent kind.
 *
 * Every eligibility rule is a question about intent — a matrix comparison, an extender
 * comparison, a casting accessory — so this classification is the input the rest of the
 * engine turns on. It reads the competitor's resolved domain first and falls back to
 * keyword evidence, with two deliberate precedences: a software identity survives the
 * hardware family it extends, and a compact presentation switcher is never read as a
 * routing matrix just because its datasheet says matrix switcher.
 */
import { extractCompetitorText, normalise, skuKey } from "./compareEligibilityText";
import type { CompareIntentKind, LooseRecord } from "./compareEligibilityTypes";

export const AVOIP_ENDPOINT_INTENTS = new Set<CompareIntentKind>([
  "av-over-ip",
  "av-over-ip-encoder",
  "av-over-ip-decoder",
]);

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

