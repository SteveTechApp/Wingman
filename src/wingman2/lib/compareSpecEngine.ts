/**
 * Compare Spec Engine (spec-first, fail-closed)
 *
 * Deterministic, field-by-field comparison between a competitor product from
 * the curated catalogue (data/catalog/competitor-products.generated.json) and
 * WyreStorm products from the real intelligence index
 * (public/product-intelligence-index.json).
 *
 * No keyword scoring. A match can only be claimed from evidenced spec fields:
 *  - Hard blockers (wrong technology class, wrong role, insufficient routed
 *    capacity) reject a candidate outright.
 *  - Every remaining field gets a verdict: MATCH / EXCEEDS / GAP / UNVERIFIED.
 *  - The rating is "verified fields matched or exceeded / comparable fields",
 *    never an arbitrary heuristic number.
 *  - If the competitor SKU is not in the curated catalogue the engine returns
 *    coverage: "missing" and NOTHING is guessed (fail-closed).
 *
 * Every value carries a citation (competitor datasheet URL; WyreStorm official
 * page + Product Guide PDF page references) so the UI can render proof.
 */

import competitorCatalogRaw from "../../../data/catalog/competitor-products.generated.json";
import { loadProductIntelligenceIndex } from "./productIntelligenceIndexCache";
import { extractRawProducts } from "./productStoryEngine";

/* ------------------------------------------------------------------ types */

export type SpecClass =
  | "AVOIP"
  | "HDBASET"
  | "MATRIX"
  | "PRESENTATION"
  | "VIDEO_WALL"
  | "MULTIVIEW"
  | "EXTENDER"
  | "USB_EXTENSION"
  | "WIRELESS_PRESENTATION"
  | "AUDIO"
  | "CONTROL"
  | "CAMERA"
  | "UNKNOWN";

export type SpecRole =
  | "transmitter"
  | "receiver"
  | "transceiver"
  | "matrix"
  | "switcher"
  | "processor"
  | "extender-kit"
  | "controller"
  | "amplifier"
  | "dongle"
  | "camera"
  | "unknown";

export type SpecTransport =
  | "hdmi"
  | "hdbaset"
  | "avoip-1g"
  | "avoip-10g"
  | "usb"
  | "wireless"
  | "sdi"
  | "hybrid"
  | "unknown";

export type Citation = {
  label: string;
  url?: string;
  detail?: string;
};

export type SpecSheet = {
  sku: string;
  brand: string;
  name: string;
  family: string;
  summary: string;
  specClass: SpecClass;
  role: SpecRole;
  transport: SpecTransport;
  transportLabel: string;
  maxResolutionLabel: string;
  resolutionRank: number; // 0 = unknown
  chroma: string;
  chromaRank: number; // 0 = unknown
  hdr: boolean | null;
  bandwidthGbps: number | null;
  hdmiIn: number | null;
  hdmiOut: number | null;
  routedIn: number | null;
  routedOut: number | null;
  usbVersion: string;
  usbRank: number; // 0 unknown, 2 = USB2, 3 = USB3
  audioOptions: string[];
  controlOptions: string[];
  distanceM: number | null;
  poe: string;
  citations: Citation[];
  imageUrl?: string;
};

export type VerdictKind = "match" | "exceeds" | "gap" | "unverified";

export type FieldVerdict = {
  field: string;
  label: string;
  competitorValue: string;
  wyrestormValue: string;
  verdict: VerdictKind;
  note?: string;
};

export type ShowdownDecision =
  | "confirmed-equivalent"
  | "closest-technical-match"
  | "architecture-alternative";

export type ShowdownMatch = {
  sheet: SpecSheet;
  decision: ShowdownDecision;
  verdicts: FieldVerdict[];
  comparableFields: number;
  matchedFields: number; // match + exceeds
  exceededFields: number;
  gapFields: number;
  rating: number; // 0-100 verified rating
  advantages: string[]; // where WyreStorm EXCEEDS + architecture benefits
  cautions: string[]; // gaps + notes
};

export type ShowdownResult =
  | { coverage: "missing"; brand: string; sku: string; reason: string }
  | {
      coverage: "found";
      competitor: SpecSheet;
      matches: ShowdownMatch[];
      rejected: Array<{ sku: string; name: string; blockers: string[] }>;
      verified: boolean; // true when at least one match survived blockers
    };

/* ---------------------------------------------------------------- helpers */

function key(value: unknown): string {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function num(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function uniq(list: string[]): string[] {
  return Array.from(new Set(list.map((item) => item.trim()).filter(Boolean)));
}

/* Resolution ranking: higher = better. Parsed from free-text labels. */
export function rankResolution(label: string): number {
  const t = label.toLowerCase();
  if (!t) return 0;
  if (/8k/.test(t)) return 7;
  if (/4k\s*120|4096.*120|2160.*120/.test(t)) return 6;
  if (/4k\s*60.*(4:4:4|444)|(4:4:4|444).*4k\s*60|2160p?\s*@?\s*60.*(4:4:4|444)/.test(t)) return 5;
  if (/4k\s*60|2160p?\s*@?\s*60|4096x2160.*60/.test(t)) return 4;
  if (/4k\s*30|2160p?\s*@?\s*30|4k(?!\d)/.test(t)) return 3;
  if (/1080p?\s*@?\s*120/.test(t)) return 2.5;
  if (/1080|1920x1080|fullhd|full hd/.test(t)) return 2;
  if (/720/.test(t)) return 1;
  return 0;
}

export function rankChroma(label: string): number {
  const t = label.replace(/\s+/g, "");
  if (/4:4:4|444/.test(t)) return 3;
  if (/4:2:2|422/.test(t)) return 2;
  if (/4:2:0|420/.test(t)) return 1;
  return 0;
}

function rankUsb(label: string): number {
  const t = label.toLowerCase();
  if (/usb\s*3|3\.[012x]/.test(t)) return 3;
  if (/usb\s*2|2\.0/.test(t)) return 2;
  if (/usb/.test(t)) return 1;
  return 0;
}

function parseDistanceM(label: string): number | null {
  const m = /(\d{2,4})\s*m\b/i.exec(label);
  return m ? Number(m[1]) : null;
}

/* --------------------------------------------- competitor catalogue access */

type CompetitorEntry = Record<string, unknown> & {
  sku?: string;
  brand?: string;
  aliases?: string[];
};

const COMPETITOR_CATALOG: CompetitorEntry[] = Array.isArray(competitorCatalogRaw)
  ? (competitorCatalogRaw as CompetitorEntry[])
  : [];

export function findCompetitorCatalogEntry(brand: string, sku: string): CompetitorEntry | null {
  const skuKey = key(sku);
  const brandKey = key(brand);
  if (!skuKey) return null;

  let best: CompetitorEntry | null = null;
  for (const entry of COMPETITOR_CATALOG) {
    const entrySku = key(entry.sku);
    const aliases = Array.isArray(entry.aliases) ? entry.aliases.map(key) : [];
    const skuHit = entrySku === skuKey || aliases.includes(skuKey);
    if (!skuHit) continue;
    const entryBrand = key(entry.brand);
    if (!brandKey || entryBrand === brandKey) return entry;
    // SKU matched but brand differs — keep as fallback only.
    best = best ?? entry;
  }
  return best;
}

/* --------------------------------------------------- competitor normaliser */

function classFromText(t: string): SpecClass {
  const s = t.toLowerCase();
  if (/av.?o(ver)?.?ip|avoip|networkhd|sdvoe|nvx|zyper|mxnet|vinx|ndi/.test(s)) return "AVOIP";
  if (/video\s*wall/.test(s)) return "VIDEO_WALL";
  // Function outranks transport/capability keywords: an "8x8 HDBaseT matrix"
  // or a "matrix switching / multiview" product IS a matrix - its transport
  // (HDBaseT vs HDMI) is captured separately by transportFrom() and expressed
  // through the transport verdict, and multiview is a capability, not the
  // product class. Checking hdbaset/multiview first classified every real
  // matrix out of the MATRIX class, leaving mis-sized boxes as the only
  // candidates for matrix competitors.
  if (/matrix/.test(s)) return "MATRIX";
  if (/hdbaset|hdbt/.test(s)) return "HDBASET";
  if (/multiview|multi-view/.test(s)) return "MULTIVIEW";
  if (/presentation|switcher|collab.*switch/.test(s)) return "PRESENTATION";
  if (/usb.*ext|extender.*usb/.test(s)) return "USB_EXTENSION";
  if (/extender|extension/.test(s)) return "EXTENDER";
  if (/wireless|clickshare|airtame|casting|byod|solstice/.test(s)) return "WIRELESS_PRESENTATION";
  if (/camera|ptz/.test(s)) return "CAMERA";
  if (/audio|amplifier|amp\b|dsp|dante/.test(s)) return "AUDIO";
  if (/control|automation/.test(s)) return "CONTROL";
  return "UNKNOWN";
}

function roleFromText(t: string): SpecRole {
  const s = t.toLowerCase();
  if (/transceiver/.test(s)) return "transceiver";
  // A "matrix kit" (matrix bundled with receivers) is a matrix, not an
  // extender kit - check matrix before the kit/pair patterns.
  if (/matrix/.test(s)) return "matrix";
  if (/kit|tx\s*\/\s*rx|tx\+rx|pair/.test(s)) return "extender-kit";
  if (/encoder|transmitter|\btx\b/.test(s)) return "transmitter";
  if (/decoder|receiver|\brx\b/.test(s)) return "receiver";
  if (/switcher|switch\b/.test(s)) return "switcher";
  if (/processor/.test(s)) return "processor";
  if (/controller|control processor/.test(s)) return "controller";
  if (/amplifier|amp\b/.test(s)) return "amplifier";
  if (/dongle/.test(s)) return "dongle";
  if (/camera|ptz/.test(s)) return "camera";
  return "unknown";
}

function transportFrom(classGuess: SpecClass, sources: string[]): {
  transport: SpecTransport;
  label: string;
} {
  const s = sources.join(" ").toLowerCase();
  if (classGuess === "AVOIP" || /av.?over.?ip|avoip/.test(s)) {
    if (/10g|10\s*gbe|10gbe|sdvoe/.test(s)) return { transport: "avoip-10g", label: "AVoIP (10GbE)" };
    return { transport: "avoip-1g", label: "AVoIP (1GbE)" };
  }
  if (/hdbaset|hdbt/.test(s)) return { transport: "hdbaset", label: "HDBaseT" };
  if (/wireless|wi-?fi|casting/.test(s)) return { transport: "wireless", label: "Wireless" };
  if (/\busb\b/.test(s) && classGuess === "USB_EXTENSION") return { transport: "usb", label: "USB extension" };
  if (/sdi/.test(s)) return { transport: "sdi", label: "SDI" };
  if (/hdmi/.test(s)) return { transport: "hdmi", label: "HDMI" };
  return { transport: "unknown", label: "Unverified" };
}

type PortLike = { type?: unknown; count?: unknown };

function countPorts(list: unknown, match: RegExp): number | null {
  if (!Array.isArray(list)) return null;
  let total = 0;
  let seen = false;
  for (const port of list as PortLike[]) {
    const type = text(port?.type);
    if (match.test(type)) {
      seen = true;
      total += num(port?.count) ?? 0;
    }
  }
  return seen ? total : null;
}

export function normalizeCompetitor(entry: CompetitorEntry): SpecSheet {
  const category = text(entry.category);
  const technology = text(entry.technology);
  const subcategory = text(entry.subcategory);
  const roleText = text(entry.role);
  const summary = text(entry.summary);
  const specs = (entry.specs ?? {}) as Record<string, unknown>;
  const video = (entry.video ?? (specs.video as Record<string, unknown>) ?? {}) as Record<string, unknown>;
  const specVideo = (specs.video ?? {}) as Record<string, unknown>;

  const specClass = classFromText([category, technology, subcategory, summary].join(" "));
  const role = roleFromText([roleText, subcategory, summary].join(" "));
  const networkSpeed = text(specs.networkSpeed);
  const { transport, label: transportLabel } = transportFrom(specClass, [
    text(entry.transport),
    technology,
    category,
    networkSpeed,
    summary,
  ]);

  const resolutionLabel =
    text(video.maxResolution) || text(specVideo.maxResolution) || "";
  const chroma = text(video.chroma) || text(specVideo.chroma) || "";
  const hdrRaw = video.hdr ?? specVideo.hdr;
  const bandwidth =
    num(video.bandwidthGbps) ?? num(specVideo.bandwidthGbps) ?? null;

  const hdmiIn = countPorts(entry.inputs, /hdmi/i);
  const hdmiOut = countPorts(entry.outputs, /hdmi/i);
  const routedIn = num(entry.routedInputCount) ?? num(entry.matrixInputs) ?? hdmiIn;
  const routedOut = num(entry.routedOutputCount) ?? num(entry.matrixOutputs) ?? hdmiOut;

  const featureText = Array.isArray(entry.features) ? (entry.features as unknown[]).map(text).join(" ") : "";
  const usbSource = `${featureText} ${summary}`;
  const usbVersion = /usb\s*3[\.x]?\d?/i.exec(usbSource)?.[0]
    ?? /usb\s*2\.0|usb\s*2/i.exec(usbSource)?.[0]
    ?? (/\busb\b/i.test(usbSource) ? "USB" : "");

  const distance =
    parseDistanceM(featureText) ?? parseDistanceM(summary) ?? null;

  const poeMatch = /poe\+\+|poe\+|802\.3bt|802\.3at|802\.3af|\bpoe\b|\bpoh\b/i.exec(
    `${featureText} ${summary} ${text((specs.power as Record<string, unknown> | undefined)?.poe)}`,
  );

  const sourceUrl = text(entry.sourceUrl) || text(entry.evidenceSource);
  const citations: Citation[] = [];
  if (sourceUrl) {
    citations.push({
      label: `${text(entry.brand)} datasheet / specification`,
      url: sourceUrl,
      detail: text(entry.lastReviewed) ? `Reviewed ${text(entry.lastReviewed)}` : undefined,
    });
  }

  return {
    sku: text(entry.sku),
    brand: text(entry.brand),
    name: text(entry.name) || text(entry.sku),
    family: text(entry.family) || category,
    summary,
    specClass,
    role,
    transport,
    transportLabel,
    maxResolutionLabel: resolutionLabel,
    resolutionRank: rankResolution(`${resolutionLabel} ${chroma}`),
    chroma,
    chromaRank: rankChroma(chroma || resolutionLabel),
    hdr: typeof hdrRaw === "boolean" ? hdrRaw : null,
    bandwidthGbps: bandwidth,
    hdmiIn,
    hdmiOut,
    routedIn,
    routedOut,
    usbVersion: usbVersion || "",
    usbRank: rankUsb(usbVersion || ""),
    audioOptions: uniq(Array.isArray(entry.audio) ? (entry.audio as unknown[]).map(text) : []),
    controlOptions: uniq(Array.isArray(entry.control) ? (entry.control as unknown[]).map(text) : []),
    distanceM: distance,
    poe: poeMatch ? poeMatch[0].toUpperCase() : "",
    citations,
  };
}

/* ---------------------------------------------------- WyreStorm normaliser */

type WsEntry = Record<string, unknown> & {
  sku?: string;
  technicalProfile?: Record<string, unknown>;
};

let wsIndexPromise: Promise<WsEntry[]> | null = null;

// Reuses productIntelligenceIndexCache's shared fetch/parse of the ~11MB
// product-intelligence-index.json instead of independently re-fetching and
// re-parsing the same file (previously a second, uncached ~11MB round trip
// on any flow - e.g. Compare - that also touched the product selector).
export function loadWyrestormIndex(): Promise<WsEntry[]> {
  if (!wsIndexPromise) {
    wsIndexPromise = loadProductIntelligenceIndex()
      .then((data) => extractRawProducts(data) as WsEntry[])
      .catch((error) => {
        console.error("[wingman] compareSpecEngine: loadWyrestormIndex failed", error);
        wsIndexPromise = null;
        return [];
      });
  }
  return wsIndexPromise;
}

let mediaIndexPromise: Promise<Map<string, string>> | null = null;

export function loadWyrestormMediaIndex(): Promise<Map<string, string>> {
  if (!mediaIndexPromise) {
    mediaIndexPromise = fetch("/product-media-index.json")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data: { products?: Array<Record<string, unknown>> }) => {
        const map = new Map<string, string>();
        for (const item of data?.products ?? []) {
          const sku = text(item.sku);
          const front = item.front as Record<string, unknown> | undefined;
          const url = text(front?.url);
          if (sku && url) map.set(key(sku), url);
        }
        return map;
      })
      .catch((error) => {
        console.error("[wingman] compareSpecEngine: loadWyrestormMediaIndex failed", error);
        mediaIndexPromise = null;
        return new Map<string, string>();
      });
  }
  return mediaIndexPromise;
}

function wsIsSellable(entry: WsEntry): boolean {
  const lifecycle = text(entry.lifecycleStatus).toLowerCase();
  if (lifecycle === "discontinued" || lifecycle === "do-not-spec") return false;
  if (entry.doNotSpec === true) return false;
  const role = text(entry.productRole).toLowerCase();
  if (role === "cable" || role === "accessory" || role === "power-accessory" || role === "rack-mount") return false;
  return true;
}

function wsClass(entry: WsEntry): SpecClass {
  const path = Array.isArray(entry.classificationPath)
    ? (entry.classificationPath as unknown[]).map(text).join(" ")
    : "";
  return classFromText([path, text(entry.technologyType), text(entry.category), text(entry.primarySystemFamily), text(entry.name)].join(" "));
}

function wsRole(entry: WsEntry): SpecRole {
  const path = Array.isArray(entry.classificationPath)
    ? (entry.classificationPath as unknown[]).map(text).join(" ")
    : "";
  return roleFromText([path, text(entry.name), text(entry.hardwareType), text(entry.sku)].join(" "));
}

type WsPort = { count?: unknown; connector?: unknown; direction?: unknown; category?: unknown };

function wsCountPorts(ports: WsPort[], direction: "input" | "output", match: RegExp): number | null {
  let total = 0;
  let seen = false;
  for (const port of ports) {
    if (text(port.direction).toLowerCase() !== direction) continue;
    if (!match.test(text(port.connector))) continue;
    seen = true;
    total += num(port.count) ?? 0;
  }
  return seen ? total : null;
}

export function normalizeWyrestorm(entry: WsEntry): SpecSheet {
  const tp = (entry.technicalProfile ?? {}) as Record<string, unknown>;
  const io = (tp.io ?? {}) as { ports?: WsPort[] };
  const ports = Array.isArray(io.ports) ? io.ports : [];
  const video = (tp.video ?? {}) as Record<string, unknown>;
  const network = (tp.network ?? {}) as Record<string, unknown>;
  const usb = (tp.usb ?? {}) as Record<string, unknown>;
  const audio = (tp.audio ?? {}) as Record<string, unknown>;
  const control = (tp.control ?? {}) as Record<string, unknown>;
  const sourceQuality = (tp.sourceQuality ?? {}) as Record<string, unknown>;
  const transports = Array.isArray(tp.transports) ? (tp.transports as unknown[]).map(text) : [];
  const linkSpeeds = Array.isArray(network.linkSpeeds) ? (network.linkSpeeds as unknown[]).map(text) : [];

  const specClass = wsClass(entry);
  const role = wsRole(entry);
  const { transport, label: transportLabel } = transportFrom(specClass, [
    transports.join(" "),
    linkSpeeds.join(" "),
    text(entry.technologyType),
  ]);

  const standards = Array.isArray(video.standards) ? (video.standards as unknown[]).map(text) : [];
  const maxResolutions = Array.isArray(video.maxResolutions) ? (video.maxResolutions as unknown[]).map(text) : [];
  const resolutionCandidates = [...standards, ...maxResolutions];
  let resolutionRank = 0;
  let resolutionLabel = "";
  for (const candidate of resolutionCandidates) {
    const rank = rankResolution(candidate);
    if (rank > resolutionRank || (rank === resolutionRank && rank > 0 && candidate.length < resolutionLabel.length)) {
      resolutionRank = rank;
      resolutionLabel = candidate;
    }
  }
  // Source strings can be long spec-sheet fragments — show a clean canonical
  // label instead of truncated free text.
  if (resolutionLabel.length > 20) {
    const CANONICAL_RESOLUTION: Record<number, string> = {
      7: "8K", 6: "4K120", 5: "4K60 4:4:4", 4: "4K60", 3: "4K30", 2.5: "1080p120", 2: "1080p", 1: "720p",
    };
    resolutionLabel = CANONICAL_RESOLUTION[resolutionRank] ?? resolutionLabel.slice(0, 20).trim();
  }
  const chromaSource = resolutionCandidates.join(" ");
  const chromaRank = rankChroma(chromaSource);
  const chroma = chromaRank === 3 ? "4:4:4" : chromaRank === 2 ? "4:2:2" : chromaRank === 1 ? "4:2:0" : "";
  const hdr = /hdr|dolby vision/i.test(resolutionCandidates.join(" ")) ? true : null;

  const bandwidthText = [
    ...(Array.isArray(video.bandwidth) ? (video.bandwidth as unknown[]).map(text) : []),
    ...standards,
  ].join(" ");
  const bandwidthMatch = /(\d{1,2})\s*gbps/i.exec(bandwidthText);
  const bandwidthGbps = bandwidthMatch ? Number(bandwidthMatch[1]) : transport === "hdbaset" || /hdmi 2\.0/i.test(bandwidthText) ? 18 : null;

  const distanceList = Array.isArray(video.distance) ? (video.distance as unknown[]).map(text) : [];
  const distanceM = distanceList.map(parseDistanceM).find((value): value is number => value != null) ?? null;

  const usbVersions = Array.isArray(usb.versions) ? (usb.versions as unknown[]).map(text) : [];
  const usbVersion = usbVersions[0] ?? (usb.present === true ? "USB" : "");

  const audioOptions = uniq([
    ...(Array.isArray(audio.networkAudio) ? (audio.networkAudio as unknown[]).map(text) : []),
    ...(Array.isArray(audio.formats) ? (audio.formats as unknown[]).map(text).filter((item) => item.length <= 24) : []),
  ]).slice(0, 8);

  const controlOptions = uniq(
    Array.isArray(control.protocols) ? (control.protocols as unknown[]).map(text) : [],
  );

  const poe = /poh|poe/i.test(JSON.stringify(tp.power ?? "")) ? "PoE/PoH" : "";

  const officialUrl = text(sourceQuality.officialProductUrl);
  const guidePages = Array.isArray(sourceQuality.productGuidePages)
    ? (sourceQuality.productGuidePages as unknown[]).map(text).join(", ")
    : "";
  const citations: Citation[] = [];
  if (officialUrl) citations.push({ label: "WyreStorm official product page", url: officialUrl });
  if (guidePages) citations.push({ label: "WyreStorm Product Guide 2026 (PDF)", detail: `Pages ${guidePages}` });

  return {
    sku: text(entry.sku),
    brand: "WyreStorm",
    name: text(entry.name) || text(entry.sku),
    family: text(entry.primarySystemFamily) || text(entry.category),
    summary: text(entry.summary) || text(entry.description),
    specClass,
    role,
    transport,
    transportLabel,
    maxResolutionLabel: resolutionLabel,
    resolutionRank,
    chroma,
    chromaRank,
    hdr,
    bandwidthGbps,
    hdmiIn: wsCountPorts(ports, "input", /hdmi/i),
    hdmiOut: wsCountPorts(ports, "output", /hdmi/i),
    routedIn: num(entry.routedInputCount) ?? wsCountPorts(ports, "input", /hdmi|usb-c|displayport/i),
    routedOut: num(entry.routedOutputCount) ?? wsCountPorts(ports, "output", /hdmi|hdbaset/i),
    usbVersion,
    usbRank: rankUsb(usbVersion),
    audioOptions,
    controlOptions,
    distanceM,
    poe,
    citations,
  };
}

/* -------------------------------------------------------------- comparison */

const CLASS_COMPATIBILITY: Record<SpecClass, SpecClass[]> = {
  AVOIP: ["AVOIP"],
  HDBASET: ["HDBASET", "EXTENDER"],
  MATRIX: ["MATRIX"],
  PRESENTATION: ["PRESENTATION"],
  VIDEO_WALL: ["VIDEO_WALL", "AVOIP", "MULTIVIEW"],
  MULTIVIEW: ["MULTIVIEW", "VIDEO_WALL"],
  EXTENDER: ["EXTENDER", "HDBASET"],
  USB_EXTENSION: ["USB_EXTENSION"],
  WIRELESS_PRESENTATION: ["WIRELESS_PRESENTATION"],
  AUDIO: ["AUDIO"],
  CONTROL: ["CONTROL"],
  CAMERA: ["CAMERA"],
  UNKNOWN: [],
};

function rolesCompatible(competitor: SpecRole, ws: SpecRole): { ok: boolean; note?: string } {
  if (competitor === "unknown" || ws === "unknown") return { ok: false, note: "Role unverified" };
  if (competitor === ws) return { ok: true };
  const txSide: SpecRole[] = ["transmitter"];
  const rxSide: SpecRole[] = ["receiver"];
  if (txSide.includes(competitor) && ws === "transmitter") return { ok: true };
  if (rxSide.includes(competitor) && ws === "receiver") return { ok: true };
  if (competitor === "transceiver" && (ws === "transmitter" || ws === "receiver")) {
    return { ok: true, note: "Competitor transceiver maps to a WyreStorm TX + RX pair — quote both directions." };
  }
  if ((competitor === "transmitter" || competitor === "receiver") && ws === "transceiver") return { ok: true };
  if (competitor === "extender-kit" && (ws === "extender-kit" || ws === "transmitter")) {
    return { ok: ws === "extender-kit", note: ws === "extender-kit" ? undefined : "Kit vs single endpoint" };
  }
  if (competitor === "switcher" && ws === "matrix") return { ok: true, note: "Matrix architecture covers switcher role" };
  return { ok: false };
}

function fmt(value: string | number | null | undefined, suffix = ""): string {
  if (value === null || value === undefined || value === "") return "Unverified";
  return `${value}${suffix}`;
}

function compareNumbers(
  field: string,
  label: string,
  compValue: number | null,
  wsValue: number | null,
  suffix = "",
): FieldVerdict {
  if (compValue == null || wsValue == null) {
    return { field, label, competitorValue: fmt(compValue, suffix), wyrestormValue: fmt(wsValue, suffix), verdict: "unverified" };
  }
  const verdict: VerdictKind = wsValue > compValue ? "exceeds" : wsValue === compValue ? "match" : "gap";
  return { field, label, competitorValue: fmt(compValue, suffix), wyrestormValue: fmt(wsValue, suffix), verdict };
}

export function buildFieldVerdicts(competitor: SpecSheet, ws: SpecSheet): FieldVerdict[] {
  const verdicts: FieldVerdict[] = [];

  // Transport (architecture) — compared, never silently equalised.
  if (competitor.transport === "unknown" || ws.transport === "unknown") {
    verdicts.push({ field: "transport", label: "Transport / architecture", competitorValue: competitor.transportLabel, wyrestormValue: ws.transportLabel, verdict: "unverified" });
  } else if (competitor.transport === ws.transport) {
    verdicts.push({ field: "transport", label: "Transport / architecture", competitorValue: competitor.transportLabel, wyrestormValue: ws.transportLabel, verdict: "match" });
  } else if (
    (competitor.transport === "avoip-1g" && ws.transport === "avoip-10g")
  ) {
    verdicts.push({ field: "transport", label: "Transport / architecture", competitorValue: competitor.transportLabel, wyrestormValue: ws.transportLabel, verdict: "exceeds", note: "10GbE uncompressed architecture" });
  } else {
    verdicts.push({ field: "transport", label: "Transport / architecture", competitorValue: competitor.transportLabel, wyrestormValue: ws.transportLabel, verdict: "gap", note: "Different signal architecture — position as alternative, not equivalent." });
  }

  // Resolution
  if (competitor.resolutionRank === 0 || ws.resolutionRank === 0) {
    verdicts.push({ field: "resolution", label: "Max resolution", competitorValue: fmt(competitor.maxResolutionLabel), wyrestormValue: fmt(ws.maxResolutionLabel), verdict: "unverified" });
  } else {
    verdicts.push({
      field: "resolution",
      label: "Max resolution",
      competitorValue: competitor.maxResolutionLabel,
      wyrestormValue: ws.maxResolutionLabel,
      verdict: ws.resolutionRank > competitor.resolutionRank ? "exceeds" : ws.resolutionRank === competitor.resolutionRank ? "match" : "gap",
    });
  }

  // Chroma
  if (competitor.chromaRank > 0 || ws.chromaRank > 0) {
    verdicts.push({
      field: "chroma",
      label: "Chroma sampling",
      competitorValue: fmt(competitor.chroma),
      wyrestormValue: fmt(ws.chroma),
      verdict:
        competitor.chromaRank === 0 || ws.chromaRank === 0
          ? "unverified"
          : ws.chromaRank > competitor.chromaRank
            ? "exceeds"
            : ws.chromaRank === competitor.chromaRank
              ? "match"
              : "gap",
    });
  }

  // HDR
  if (competitor.hdr !== null || ws.hdr !== null) {
    const compHdr = competitor.hdr === true ? "Yes" : competitor.hdr === false ? "No" : "Unverified";
    const wsHdr = ws.hdr === true ? "Yes" : "Unverified";
    verdicts.push({
      field: "hdr",
      label: "HDR support",
      competitorValue: compHdr,
      wyrestormValue: wsHdr,
      verdict:
        competitor.hdr === null || ws.hdr === null
          ? "unverified"
          : ws.hdr === competitor.hdr
            ? "match"
            : ws.hdr
              ? "exceeds"
              : "gap",
    });
  }

  verdicts.push(compareNumbers("bandwidth", "Video bandwidth", competitor.bandwidthGbps, ws.bandwidthGbps, " Gbps"));
  verdicts.push(compareNumbers("hdmiIn", "HDMI inputs", competitor.hdmiIn, ws.hdmiIn));
  verdicts.push(compareNumbers("hdmiOut", "HDMI outputs", competitor.hdmiOut, ws.hdmiOut));

  if (competitor.routedIn != null && (competitor.specClass === "MATRIX" || competitor.specClass === "PRESENTATION")) {
    verdicts.push(compareNumbers("routedIn", "Routed inputs", competitor.routedIn, ws.routedIn));
    verdicts.push(compareNumbers("routedOut", "Routed outputs", competitor.routedOut, ws.routedOut));
  }

  // USB
  if (competitor.usbRank > 0 || ws.usbRank > 0) {
    verdicts.push({
      field: "usb",
      label: "USB",
      competitorValue: fmt(competitor.usbVersion),
      wyrestormValue: fmt(ws.usbVersion),
      verdict:
        competitor.usbRank === 0
          ? ws.usbRank > 0
            ? "exceeds"
            : "unverified"
          : ws.usbRank === 0
            ? "gap"
            : ws.usbRank > competitor.usbRank
              ? "exceeds"
              : ws.usbRank === competitor.usbRank
                ? "match"
                : "gap",
    });
  }

  // Audio + control option coverage
  verdicts.push(compareNumbers("audio", "Audio options", competitor.audioOptions.length || null, ws.audioOptions.length || null));
  verdicts.push(compareNumbers("control", "Control options", competitor.controlOptions.length || null, ws.controlOptions.length || null));

  // Distance / reach for extension technologies
  if (competitor.distanceM != null || ws.distanceM != null) {
    verdicts.push(compareNumbers("distance", "Max reach", competitor.distanceM, ws.distanceM, " m"));
  }

  // PoE
  if (competitor.poe || ws.poe) {
    verdicts.push({
      field: "poe",
      label: "PoE / PoH power",
      competitorValue: fmt(competitor.poe),
      wyrestormValue: fmt(ws.poe),
      verdict: competitor.poe && ws.poe ? "match" : !competitor.poe && ws.poe ? "exceeds" : competitor.poe && !ws.poe ? "gap" : "unverified",
    });
  }

  return verdicts;
}

/* -------------------------------------------------------------- showdown */

function detectBlockers(competitor: SpecSheet, ws: SpecSheet): string[] {
  const blockers: string[] = [];

  const compatible = CLASS_COMPATIBILITY[competitor.specClass] ?? [];
  const classOk =
    competitor.specClass !== "UNKNOWN" && compatible.includes(ws.specClass);
  if (!classOk) {
    blockers.push(`Technology class mismatch: ${competitor.specClass} vs ${ws.specClass}`);
  }

  const roleCheck = rolesCompatible(competitor.role, ws.role);
  if (!roleCheck.ok && !roleCheck.note) {
    blockers.push(`Role mismatch: ${competitor.role} vs ${ws.role}`);
  } else if (!roleCheck.ok && roleCheck.note === "Role unverified") {
    blockers.push("Role could not be verified from evidence");
  }

  if (
    (competitor.specClass === "MATRIX" || competitor.specClass === "PRESENTATION") &&
    competitor.routedIn != null &&
    ws.routedIn != null &&
    ws.routedIn < competitor.routedIn
  ) {
    blockers.push(`Insufficient routed inputs: needs ${competitor.routedIn}, candidate has ${ws.routedIn}`);
  }

  // Output capacity is as hard a requirement as input capacity: a candidate
  // with fewer routed outputs than the competitor physically cannot drive the
  // same displays (e.g. an 8x4 must never replace an 8x8). Mirrors the
  // routed-input gate above and the output blocker competitorCompareDecision
  // already enforces on the Overview path.
  if (
    (competitor.specClass === "MATRIX" || competitor.specClass === "PRESENTATION") &&
    competitor.routedOut != null &&
    ws.routedOut != null &&
    ws.routedOut < competitor.routedOut
  ) {
    blockers.push(`Insufficient routed outputs: needs ${competitor.routedOut}, candidate has ${ws.routedOut}`);
  }

  return blockers;
}

export async function runSpecShowdown(brand: string, sku: string): Promise<ShowdownResult> {
  const entry = findCompetitorCatalogEntry(brand, sku);
  if (!entry) {
    return {
      coverage: "missing",
      brand,
      sku,
      reason:
        "This competitor SKU is not in the verified catalogue. No match will be guessed — add datasheet evidence to enable a verified comparison.",
    };
  }

  const competitor = normalizeCompetitor(entry);
  const [wsIndex, mediaIndex] = await Promise.all([loadWyrestormIndex(), loadWyrestormMediaIndex()]);

  const matches: ShowdownMatch[] = [];
  const rejected: Array<{ sku: string; name: string; blockers: string[] }> = [];

  for (const wsEntry of wsIndex) {
    if (!wsIsSellable(wsEntry)) continue;
    const ws = normalizeWyrestorm(wsEntry);
    if (ws.specClass === "UNKNOWN") continue;

    const blockers = detectBlockers(competitor, ws);
    if (blockers.length > 0) {
      // Only surface rejects that were at least in the right technology class.
      if ((CLASS_COMPATIBILITY[competitor.specClass] ?? []).includes(ws.specClass)) {
        rejected.push({ sku: ws.sku, name: ws.name, blockers });
      }
      continue;
    }

    ws.imageUrl = mediaIndex.get(key(ws.sku));

    const verdicts = buildFieldVerdicts(competitor, ws);
    const comparable = verdicts.filter((verdict) => verdict.verdict !== "unverified");
    const matched = comparable.filter((verdict) => verdict.verdict === "match" || verdict.verdict === "exceeds");
    const exceeded = comparable.filter((verdict) => verdict.verdict === "exceeds");
    const gaps = comparable.filter((verdict) => verdict.verdict === "gap");

    if (comparable.length < 3) continue; // not enough verified evidence to claim anything

    const transportVerdict = verdicts.find((verdict) => verdict.field === "transport");
    const decision: ShowdownDecision =
      transportVerdict?.verdict === "gap"
        ? "architecture-alternative"
        : gaps.length === 0
          ? "confirmed-equivalent"
          : "closest-technical-match";

    const roleNote = rolesCompatible(competitor.role, ws.role).note;
    const advantages = exceeded.map(
      (verdict) => `${verdict.label}: ${verdict.wyrestormValue} vs ${verdict.competitorValue}${verdict.note ? ` — ${verdict.note}` : ""}`,
    );
    const cautions = [
      ...gaps.map((verdict) => `${verdict.label}: ${verdict.wyrestormValue} vs competitor ${verdict.competitorValue}`),
      ...(roleNote ? [roleNote] : []),
    ];

    matches.push({
      sheet: ws,
      decision,
      verdicts,
      comparableFields: comparable.length,
      matchedFields: matched.length,
      exceededFields: exceeded.length,
      gapFields: gaps.length,
      rating: Math.round((matched.length / comparable.length) * 100),
      advantages,
      cautions,
    });
  }

  matches.sort((a, b) => {
    const decisionOrder: Record<ShowdownDecision, number> = {
      "confirmed-equivalent": 0,
      "closest-technical-match": 1,
      "architecture-alternative": 2,
    };
    if (decisionOrder[a.decision] !== decisionOrder[b.decision]) {
      return decisionOrder[a.decision] - decisionOrder[b.decision];
    }
    if (b.rating !== a.rating) return b.rating - a.rating;
    if (a.gapFields !== b.gapFields) return a.gapFields - b.gapFields;
    return b.comparableFields - a.comparableFields;
  });

  return {
    coverage: "found",
    competitor,
    matches: matches.slice(0, 3),
    rejected: rejected.slice(0, 6),
    verified: matches.length > 0,
  };
}
