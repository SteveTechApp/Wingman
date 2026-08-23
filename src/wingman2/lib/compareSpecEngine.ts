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
import governedTechnicalProfilesRaw from "../../../data/governance/wyrestorm-technical-profiles.json";
import { loadProductIntelligenceIndex } from "./productIntelligenceIndexCache";
import { extractRawProducts } from "./productStoryEngine";
import { resolutionRank as rankResolution, chromaRank as rankChroma } from "./compareResolution";

// Re-exported for backwards compatibility: the resolution/chroma ranking now
// lives in the shared compareResolution module so competitorCompareDecision and
// compareSpecEngine rank a capability identically.
export { rankResolution, rankChroma };

/* ------------------------------------------------------------------ types */

export type SpecClass =
  | "AVOIP"
  | "HDBASET"
  | "MATRIX"
  | "DISTRIBUTION"
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

/**
 * The human reviewer trail behind a `verified` WyreStorm sheet: who confirmed
 * the spec-critical fields, when, and the official source they confirmed
 * against. Only present when the governed profile is human-verified
 * (`status: "verified"` + an evidence entry with a source URL).
 */
export type ReviewerEvidence = {
  url: string;
  reviewer: string;
  reviewedOn: string;
};

export type ConnectionItem = {
  type: string;
  count: number;
  detail?: string;
};

export type SpecConnections = {
  videoInputs: ConnectionItem[];
  videoOutputs: ConnectionItem[];
  usb: ConnectionItem[];
  network: ConnectionItem[];
  audioInputs: ConnectionItem[];
  audioOutputs: ConnectionItem[];
  control: ConnectionItem[];
};

/** null = not verified; false = explicitly unsupported; string = irrelevant to this product. */
export type CapabilityState = true | false | null | "not-applicable";

export type SpecCapabilities = {
  wirelessCasting: CapabilityState;
  byom: CapabilityState;
  multiview: CapabilityState;
  scaling: CapabilityState;
  videoWall: CapabilityState;
  kvm: CapabilityState;
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
  connections?: SpecConnections;
  capabilities?: SpecCapabilities;
  inputSummary?: string;
  routedOutputSummary?: string;
  mirroredOutputSummary?: string;
  loopOutputSummary?: string;
  audioSummary?: string;
  controlSummary?: string;
  matrixSize?: string;
  verificationStatus?: "verified" | "verified-with-warning" | "inferred" | "missing" | "conflicting";
  citations: Citation[];
  /** Reviewer trail when this sheet is backed by a human-verified governed profile. */
  reviewerEvidence?: ReviewerEvidence;
  imageUrl?: string;
};

export type VerdictKind = "match" | "exceeds" | "gap" | "unverified";

/**
 * Per-side data provenance for one comparison field. Weakest to strongest:
 * unverified (no value) < inferred (from text) < official (structured source,
 * not human-reviewed) < verified (human-reviewed governed data).
 */
export type FieldProvenance = "unverified" | "inferred" | "official" | "verified";

const PROVENANCE_RANK: Record<FieldProvenance, number> = {
  unverified: 0,
  inferred: 1,
  official: 2,
  verified: 3,
};

/** Weakest-link combine: the least trustworthy of the given provenances. */
export function weakestFieldProvenance(...tiers: FieldProvenance[]): FieldProvenance {
  return tiers.reduce<FieldProvenance>(
    (weakest, tier) => (PROVENANCE_RANK[tier] < PROVENANCE_RANK[weakest] ? tier : weakest),
    "verified",
  );
}

/** Provenance a value inherits from its source sheet when the value is present. */
function sheetFieldProvenance(sheet: Pick<SpecSheet, "verificationStatus">): FieldProvenance {
  switch (sheet.verificationStatus) {
    case "verified":
      return "verified";
    case "verified-with-warning":
      return "official";
    case "inferred":
      return "inferred";
    default:
      // Sheets without an explicit status (index-derived or competitor rows
      // without a curated tier) are structured official-page data at best.
      return "official";
  }
}

function fieldProvenance(
  side: Pick<SpecSheet, "verificationStatus">,
  valuePresent: boolean,
): FieldProvenance {
  return valuePresent ? sheetFieldProvenance(side) : "unverified";
}

export type FieldVerdict = {
  field: string;
  label: string;
  competitorValue: string;
  wyrestormValue: string;
  verdict: VerdictKind;
  note?: string;
  /** Provenance of the competitor side's value for this field. */
  competitorProvenance: FieldProvenance;
  /** Provenance of the WyreStorm side's value for this field. */
  wyrestormProvenance: FieldProvenance;
  /** Weakest-link summary across both sides. */
  provenance: FieldProvenance;
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
  /** Weakest-link provenance across every compared field (both sides). */
  provenance: FieldProvenance;
};

export type ShowdownResult =
  | { coverage: "missing"; brand: string; sku: string; reason: string }
  | {
      coverage: "found";
      competitor: SpecSheet;
      matches: ShowdownMatch[];
      rejected: Array<{ sku: string; name: string; blockers: string[] }>;
      verified: boolean; // true only when at least one fully verified equivalent exists
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

/* Resolution / chroma ranking now lives in ./compareResolution (imported and
   re-exported above) so both Compare engines rank a capability identically. */

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
  // Splitter / distribution amplifier - after matrix, before the generic
  // audio/switcher rules so a "1x4 HDMI splitter with audio breakout" is
  // distribution, not audio.
  if (/splitter|distribution\s*amp|distribution\b|duplicator/.test(s)) return "DISTRIBUTION";
  // Product purpose outranks transport. A presentation switcher with an
  // HDBaseT input/output remains a PRESENTATION product, not an extender.
  if (/presentation|collab.*switch|room.*switch/.test(s)) return "PRESENTATION";
  if (/hdbaset|hdbt/.test(s)) return "HDBASET";
  if (/multiview|multi-view/.test(s)) return "MULTIVIEW";
  if (/switcher|switch\b/.test(s)) return "PRESENTATION";
  if (/usb.*ext|extender.*usb/.test(s)) return "USB_EXTENSION";
  if (/extender|extension/.test(s)) return "EXTENDER";
  if (/wireless|clickshare|airtame|casting|byod|solstice/.test(s)) return "WIRELESS_PRESENTATION";
  if (/camera|ptz/.test(s)) return "CAMERA";
  if (/audio|amplifier|amp\b|dsp|dante/.test(s)) return "AUDIO";
  if (/control|automation/.test(s)) return "CONTROL";
  return "UNKNOWN";
}

function classFromDeclaredCategory(category: string): SpecClass {
  switch (category.trim().toLowerCase()) {
    case "avoip":
      return "AVOIP";
    case "hdbaset":
      return "HDBASET";
    case "matrix":
      return "MATRIX";
    case "distribution":
      return "DISTRIBUTION";
    case "switcher":
    case "uc":
      return "PRESENTATION";
    case "video wall":
      return "VIDEO_WALL";
    case "extender":
      return "EXTENDER";
    case "wireless presentation":
      return "WIRELESS_PRESENTATION";
    case "audio":
      return "AUDIO";
    case "control":
      return "CONTROL";
    case "camera":
      return "CAMERA";
    default:
      return "UNKNOWN";
  }
}

function roleFromText(t: string): SpecRole {
  const s = t.toLowerCase();
  if (/transceiver/.test(s)) return "transceiver";
  // A "matrix kit" (matrix bundled with receivers) is a matrix, not an
  // extender kit - check matrix before the kit/pair patterns.
  if (/matrix/.test(s)) return "matrix";
  if (/kit|tx\s*\/\s*rx|tx\+rx|pair/.test(s)) return "extender-kit";
  // A wireless conferencing / presentation hub is the room-side receiving unit
  // of the casting system (ClickShare hub vs the laptop-side button/dongle),
  // mirroring the base catalogue rows that label the same products
  // "receiver / hub". Without this, the CLICKSHARE-* prefixed SKUs reps type
  // classify as role "unknown" and can never produce a verified decision.
  if (/\bhub\b/.test(s) && /wireless|conferencing|presentation/.test(s) && !/peripheral/.test(s)) return "receiver";
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

const emptyConnections = (): SpecConnections => ({
  videoInputs: [], videoOutputs: [], usb: [], network: [],
  audioInputs: [], audioOutputs: [], control: [],
});

const emptyCapabilities = (): SpecCapabilities => ({
  wirelessCasting: null, byom: null, multiview: null,
  scaling: null, videoWall: null, kvm: null,
});

function connectionItems(list: unknown): ConnectionItem[] {
  if (!Array.isArray(list)) return [];
  return (list as Array<Record<string, unknown>>)
    .map((port) => ({
      type: text(port.type || port.connector),
      count: num(port.count) ?? 0,
      detail: text(port.detail) || undefined,
    }))
    .filter((port) => port.type && port.count > 0);
}

function explicitCapability(source: string, positive: RegExp, negative: RegExp): CapabilityState {
  if (negative.test(source)) return false;
  if (positive.test(source)) return true;
  return null;
}

function capabilitiesFromEvidence(values: unknown[]): SpecCapabilities {
  const source = values.map(text).filter(Boolean).join(" ");
  return {
    wirelessCasting: explicitCapability(source, /wireless (?:screen )?(?:casting|presentation)|airplay|miracast|google cast/i, /no (?:wireless )?(?:casting|presentation)|without wireless/i),
    byom: explicitCapability(source, /\bbyom\b|bring your own meeting/i, /no \bbyom\b|without \bbyom\b/i),
    multiview: explicitCapability(source, /multi[- ]?view|multiple (?:sources|windows).*(?:screen|display)/i, /no multi[- ]?view|without multi[- ]?view/i),
    scaling: explicitCapability(source, /\bscal(?:er|ing)\b/i, /no (?:video )?scal(?:er|ing)|without (?:video )?scal(?:er|ing)/i),
    videoWall: explicitCapability(source, /video wall/i, /no video wall|without video wall/i),
    kvm: explicitCapability(source, /\bkvm\b|keyboard.*mouse/i, /no \bkvm\b|without \bkvm\b/i),
  };
}

function capabilitiesFromFeatureRecord(record: Record<string, unknown>): SpecCapabilities {
  const result = emptyCapabilities();
  const aliases: Record<keyof SpecCapabilities, string[]> = {
    wirelessCasting: ["wirelessCasting", "wirelessPresentation"], byom: ["byom"],
    multiview: ["multiview", "multiView"], scaling: ["scaling", "scaler"],
    videoWall: ["videoWall", "videoWallProcessing"], kvm: ["kvm", "usbKvm"],
  };
  for (const [capability, names] of Object.entries(aliases) as Array<[keyof SpecCapabilities, string[]]>) {
    const value = names.map((name) => record[name]).find((candidate) => typeof candidate === "boolean");
    if (typeof value === "boolean") result[capability] = value;
  }
  return result;
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

  // The curated category is a governed product-purpose field. Capability
  // prose can mention NDI, HDBaseT, a matrix, a paired receiver, or a control
  // processor without changing what the product itself is. Only fall back to
  // broad text inference when the catalogue category is not governed.
  const declaredClass = classFromDeclaredCategory(category);
  const specClass = declaredClass !== "UNKNOWN"
    ? declaredClass
    : classFromText([technology, subcategory, summary].join(" "));
  // Product identity must come from structured identity fields. Descriptive
  // prose routinely mentions the *other* endpoint ("pairs with a receiver")
  // and previously let that incidental word turn a TX-only product into a
  // complete extender kit. Use prose only when the catalogue has no usable
  // role/SKU/name evidence at all.
  const identityRole = roleFromText([
    roleText,
    text(entry.sku),
    text(entry.name),
    subcategory,
  ].join(" "));
  const role = identityRole !== "unknown" ? identityRole : roleFromText(summary);
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
  const usbVersion = /usb\s*3[.x]?\d?/i.exec(usbSource)?.[0]
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

  // Provenance for the competitor side: a human-approved curated fingerprint
  // or official-page source is verified; a bare SKU seed / raw feed row is at
  // best inferred. Values missing on a field are stamped unverified later.
  const competitorStatus = text(entry.status).toLowerCase();
  const sourceTier = text(entry.sourceTier).toLowerCase();
  const verificationStatus: SpecSheet["verificationStatus"] =
    competitorStatus === "approved" &&
    /curated-fingerprint|official-structured|official-product-page|official-manufacturer|reviewed-import|official-product-guide|official-product-library|official-product-brochure/.test(sourceTier)
      ? "verified"
      : competitorStatus === "approved"
        ? "verified-with-warning"
        : competitorStatus === "review" || competitorStatus === "draft"
          ? "inferred"
          : undefined;

  const connections = emptyConnections();
  connections.videoInputs = connectionItems(entry.inputs);
  connections.videoOutputs = connectionItems(entry.outputs);
  const structuredConnectionItems = [...connections.videoInputs, ...connections.videoOutputs];
  connections.usb = structuredConnectionItems.filter((item) => /usb/i.test(item.type));
  connections.network = structuredConnectionItems.filter((item) => /ethernet|rj-?45|\blan\b|\bgbe\b/i.test(item.type));
  connections.videoInputs = connections.videoInputs.filter((item) => !/usb(?!-c)|ethernet|rj-?45|\blan\b/i.test(item.type));
  connections.videoOutputs = connections.videoOutputs.filter((item) => !/usb(?!-c)|ethernet|rj-?45|\blan\b/i.test(item.type));
  const capabilities = capabilitiesFromEvidence([
    ...(Array.isArray(entry.features) ? entry.features as unknown[] : []),
    specs.capabilities,
  ]);

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
    connections,
    capabilities,
    verificationStatus,
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

export function resolveWyrestormMediaIndexUrl(
  path = "/product-media-index.json",
  configuredBase?: string,
): string | null {
  try {
    return new URL(path).toString();
  } catch {
    // Site-relative assets need an origin outside the browser.
  }

  const environmentBase = typeof process !== "undefined"
    ? process.env.TEST_BASE_URL || process.env.BASE_URL
    : undefined;
  const browserBase = typeof window !== "undefined" && window.location?.origin !== "null"
    ? window.location.origin
    : undefined;
  const base = configuredBase || environmentBase || browserBase;

  if (!base) return null;

  try {
    return new URL(path, base).toString();
  } catch {
    return null;
  }
}

export function loadWyrestormMediaIndex(): Promise<Map<string, string>> {
  if (!mediaIndexPromise) {
    const isUnconfiguredTestRuntime = typeof process !== "undefined"
      && process.env.NODE_ENV === "test"
      && !process.env.TEST_BASE_URL
      && !process.env.BASE_URL;
    const mediaIndexUrl = isUnconfiguredTestRuntime ? null : resolveWyrestormMediaIndexUrl();

    if (!mediaIndexUrl) {
      return Promise.resolve(new Map<string, string>());
    }

    mediaIndexPromise = fetch(mediaIndexUrl)
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

function connectionsFromPorts(ports: Array<WsPort & { detail?: unknown }>): SpecConnections {
  const result = emptyConnections();
  for (const port of ports) {
    const item = connectionItems([port])[0];
    if (!item) continue;
    const direction = text(port.direction).toLowerCase();
    const category = text(port.category).toLowerCase();
    if (category === "video" && direction === "input") result.videoInputs.push(item);
    else if (category === "video" && direction === "output") result.videoOutputs.push(item);
    else if (category === "usb") result.usb.push(item);
    else if (category === "network") result.network.push(item);
    else if (category === "audio" && direction === "input") result.audioInputs.push(item);
    else if (category === "audio" && direction === "output") result.audioOutputs.push(item);
    else if (category === "control") result.control.push(item);
  }
  return result;
}

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

// WINGMAN_GOVERNED_BATTLE_CARD_NORMALISER_START
type GovernedBattlePort = {
  count?: unknown;
  connector?: unknown;
  direction?: unknown;
  category?: unknown;
  detail?: unknown;
};

type GovernedBattleProfile = {
  sku?: unknown;
  status?: unknown;
  productClass?: unknown;
  role?: unknown;
  productType?: unknown;
  transport?: unknown;
  maxResolution?: unknown;
  chroma?: unknown;
  inputCount?: unknown;
  outputCount?: unknown;
  ports?: unknown;
  audio?: unknown;
  control?: unknown;
  power?: unknown;
  features?: unknown;
  specs?: unknown;
  evidence?: unknown;
};

const GOVERNED_BATTLE_PROFILES: GovernedBattleProfile[] = Array.isArray(
  (governedTechnicalProfilesRaw as { profiles?: unknown }).profiles,
)
  ? ((governedTechnicalProfilesRaw as { profiles: GovernedBattleProfile[] }).profiles)
  : [];

function governedValue(record: Record<string, unknown>, name: string): unknown {
  return record[name];
}

/** Latest evidence entry's reviewer trail (source URL, reviewer, date) if one exists. */
function reviewerEvidenceFromProfile(profile: GovernedBattleProfile | undefined): ReviewerEvidence | undefined {
  const evidence = Array.isArray(profile?.evidence) ? (profile.evidence as Array<Record<string, unknown>>) : [];
  const latest = evidence[evidence.length - 1] ?? {};
  const url = text(latest.sourceUrl);
  if (!url) return undefined;
  return {
    url,
    reviewer: text(latest.reviewer) || "Human reviewer",
    reviewedOn: text(latest.reviewedOn),
  };
}

function governedPortCount(
  ports: GovernedBattlePort[],
  direction: "input" | "output",
  category: string,
  connectorPattern?: RegExp,
): number {
  return ports.reduce((total, port) => {
    if (text(port.direction).toLowerCase() !== direction) return total;
    if (text(port.category).toLowerCase() !== category) return total;
    if (connectorPattern && !connectorPattern.test(text(port.connector))) return total;
    return total + (num(port.count) ?? 0);
  }, 0);
}

function governedPortSummary(
  ports: GovernedBattlePort[],
  direction: "input" | "output",
  category: string,
): string {
  const grouped = new Map<string, number>();

  for (const port of ports) {
    if (text(port.direction).toLowerCase() !== direction) continue;
    if (text(port.category).toLowerCase() !== category) continue;

    const connector = text(port.connector)
      .replace(/\s+Type\s+A$/i, "")
      .replace(/^3-pin Phoenix$/i, "analogue")
      .trim();

    if (!connector) continue;
    grouped.set(connector, (grouped.get(connector) ?? 0) + (num(port.count) ?? 0));
  }

  return Array.from(grouped.entries())
    .map(([connector, count]) => `${count} x ${connector}`)
    .join(" · ");
}

function normalizeGovernedBattleCard(entry: WsEntry): SpecSheet | null {
  const sku = text(entry.sku);
  const profile = GOVERNED_BATTLE_PROFILES.find((candidate) => key(candidate.sku) === key(sku));
  if (!profile) return null;

  const features = (
    profile.features && typeof profile.features === "object" && !Array.isArray(profile.features)
      ? profile.features
      : {}
  ) as Record<string, unknown>;

  if (governedValue(features, "battleCardApproved") !== true) return null;

  const ports = Array.isArray(profile.ports)
    ? (profile.ports as GovernedBattlePort[])
    : [];

  const evidence = Array.isArray(profile.evidence)
    ? (profile.evidence as Array<Record<string, unknown>>)
    : [];

  const citations: Citation[] = evidence
    .map((item) => ({
      label: text(item.sourceType) || "WyreStorm governed technical source",
      url: text(item.sourceUrl) || undefined,
      detail: [
        text(item.reviewedOn) ? `Reviewed ${text(item.reviewedOn)}` : "",
        text(item.reviewer),
        text(item.note),
      ].filter(Boolean).join(" · ") || undefined,
    }))
    .filter((item) => item.url || item.detail);

  const transportValues = Array.isArray(profile.transport)
    ? (profile.transport as unknown[]).map(text).filter(Boolean)
    : [];

  const maxResolutionLabel = text(profile.maxResolution);
  const chroma = text(profile.chroma);
  const audioOptions = Array.isArray(profile.audio)
    ? (profile.audio as unknown[]).map(text).filter(Boolean)
    : [];
  const controlOptions = Array.isArray(profile.control)
    ? (profile.control as unknown[]).map(text).filter(Boolean)
    : [];
  const powerText = Array.isArray(profile.power)
    ? (profile.power as unknown[]).map(text).join(" ")
    : "";

  const routedIn = num(governedValue(features, "routedInputCount"))
    ?? num(profile.inputCount)
    ?? governedPortCount(ports, "input", "video");

  const routedOut = num(governedValue(features, "routedOutputCount"))
    ?? num(profile.outputCount)
    ?? governedPortCount(ports, "output", "video");

  const mirroredOutputCount = num(governedValue(features, "mirroredOutputCount")) ?? 0;
  const loopOutputCount = num(governedValue(features, "loopOutputCount")) ?? 0;
  const status = text(profile.status).toLowerCase();
  const capabilities = capabilitiesFromFeatureRecord(features);

  return {
    sku,
    brand: "WyreStorm",
    name: text(profile.productType) || text(entry.name) || sku,
    family: text(entry.primarySystemFamily) || text(entry.category) || "WyreStorm",
    summary: text(entry.summary) || text(entry.description) || text(profile.productType),
    specClass: classFromText(text(profile.productClass) || text(profile.productType)),
    role: roleFromText(text(profile.role) || text(profile.productType)),
    transport: transportFrom(
      classFromText(text(profile.productClass) || text(profile.productType)),
      transportValues,
    ).transport,
    transportLabel: transportValues.join(" · ") || "Verified governed profile",
    maxResolutionLabel,
    resolutionRank: rankResolution(`${maxResolutionLabel} ${chroma}`),
    chroma,
    chromaRank: rankChroma(chroma || maxResolutionLabel),
    hdr: /hdr|dolby vision|hlg/i.test(
      Array.isArray(profile.transport)
        ? JSON.stringify(profile)
        : text(profile.productType),
    ) ? true : null,
    bandwidthGbps: num(
      profile.specs && typeof profile.specs === "object"
        ? (profile.specs as Record<string, unknown>).bandwidthGbps
        : null,
    ),
    hdmiIn: governedPortCount(ports, "input", "video", /hdmi/i) || null,
    hdmiOut: governedPortCount(ports, "output", "video", /hdmi/i) || null,
    routedIn,
    routedOut,
    usbVersion: "",
    usbRank: 0,
    audioOptions,
    controlOptions,
    distanceM: null,
    poe: /\bpoe\b|\bpoh\b/i.test(powerText) && !/\bno\s+(?:poe|poh)\b/i.test(powerText)
      ? "PoE/PoH"
      : "",
    connections: connectionsFromPorts(ports),
    capabilities,
    inputSummary: governedPortSummary(ports, "input", "video"),
    routedOutputSummary: governedPortSummary(ports, "output", "video"),
    mirroredOutputSummary: mirroredOutputCount > 0
      ? `${mirroredOutputCount} x HDMI mirrored`
      : "",
    loopOutputSummary: loopOutputCount > 0
      ? `${loopOutputCount} x local loop output`
      : "",
    audioSummary: governedPortSummary(ports, "output", "audio"),
    controlSummary: controlOptions
      .filter((item) => !/front[- ]panel/i.test(item))
      .map((item) => item.replace(/\s+API$/i, ""))
      .join(" · "),
    matrixSize: text(governedValue(features, "matrixSize"))
      || (routedIn && routedOut ? `${routedIn}x${routedOut}` : ""),
    verificationStatus:
      status === "verified"
        ? "verified"
        : status === "verified-with-warning"
          ? "verified-with-warning"
          : "inferred",
    citations,
    reviewerEvidence: reviewerEvidenceFromProfile(profile),
  };
}
// WINGMAN_GOVERNED_BATTLE_CARD_NORMALISER_END

export function normalizeWyrestorm(entry: WsEntry): SpecSheet {
  const governed = normalizeGovernedBattleCard(entry);
  if (governed) return governed;
  // The governed battle-card path requires an explicit approval flag that the
  // current profiles do not carry, so stamp provenance directly from the
  // governed profile's status when one exists for this SKU.
  const governedProfile = GOVERNED_BATTLE_PROFILES.find((candidate) => key(candidate.sku) === key(text(entry.sku)));
  const governedStatus = text(governedProfile?.status).toLowerCase();
  const verificationStatus: SpecSheet["verificationStatus"] =
    governedStatus === "verified"
      ? "verified"
      : governedStatus === "verified-with-warning"
        ? "verified-with-warning"
        : governedStatus === "review-required"
          ? "inferred"
          : undefined;
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
  // Structured transport evidence (technicalProfile.transports / link speeds)
  // outranks the loose technologyType label: e.g. MX-0808-H2A-MK2 lists
  // transports ["HDMI"] and 8x HDMI in / 8x HDMI out ports, but carries the
  // family label "HDBaseT / HDMI matrix" - matching the label first tagged a
  // pure HDMI matrix as HDBaseT, demoting it to an architecture-alternative
  // against HDMI-matrix competitors. Fall back to the label only when no
  // structured transport is recorded.
  const structuredTransport = transportFrom(specClass, [transports.join(" "), linkSpeeds.join(" ")]);
  const { transport, label: transportLabel } =
    structuredTransport.transport !== "unknown"
      ? structuredTransport
      : transportFrom(specClass, [
          transports.join(" "),
          linkSpeeds.join(" "),
          text(entry.technologyType),
        ]);

  const standards = Array.isArray(video.standards) ? (video.standards as unknown[]).map(text) : [];
  const maxResolutions = Array.isArray(video.maxResolutions) ? (video.maxResolutions as unknown[]).map(text) : [];
  // A dedicated max-resolution field outranks broad standards/feature text.
  // Mixing both arrays allowed unrelated power or refresh-rate numbers later in
  // a long standards fragment to promote a 4K60 product to 4K120.
  const resolutionCandidates = maxResolutions.length > 0 ? maxResolutions : standards;
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
  const connections = connectionsFromPorts(ports);
  const inferredCapabilities = capabilitiesFromEvidence([
    ...(Array.isArray(tp.features) ? tp.features as unknown[] : []),
    ...standards,
    text(entry.summary),
  ]);
  const explicitCapabilities = tp.features && typeof tp.features === "object" && !Array.isArray(tp.features)
    ? capabilitiesFromFeatureRecord(tp.features as Record<string, unknown>)
    : emptyCapabilities();
  const capabilities = Object.fromEntries(
    (Object.keys(inferredCapabilities) as Array<keyof SpecCapabilities>).map((name) => [
      name, explicitCapabilities[name] ?? inferredCapabilities[name],
    ]),
  ) as SpecCapabilities;

  const officialUrl = text(sourceQuality.officialProductUrl);
  const guidePages = Array.isArray(sourceQuality.productGuidePages)
    ? (sourceQuality.productGuidePages as unknown[]).map(text).join(", ")
    : "";
  const citations: Citation[] = [];
  if (officialUrl) citations.push({ label: "WyreStorm official product page", url: officialUrl });
  if (guidePages) citations.push({ label: "WyreStorm Product Guide 2026 (PDF)", detail: `Pages ${guidePages}` });
  const reviewerEvidence = governedStatus === "verified" ? reviewerEvidenceFromProfile(governedProfile) : undefined;
  if (reviewerEvidence) {
    citations.push({
      label: "WyreStorm human-reviewed source",
      url: reviewerEvidence.url,
      detail:
        [reviewerEvidence.reviewedOn ? `Reviewed ${reviewerEvidence.reviewedOn}` : "", reviewerEvidence.reviewer].filter(Boolean).join(" · ") ||
        undefined,
    });
  }

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
    connections,
    capabilities,
    verificationStatus,
    citations,
    reviewerEvidence,
  };
}

/* -------------------------------------------------------------- comparison */

const CLASS_COMPATIBILITY: Record<SpecClass, SpecClass[]> = {
  AVOIP: ["AVOIP"],
  HDBASET: ["HDBASET", "EXTENDER"],
  MATRIX: ["MATRIX"],
  DISTRIBUTION: ["DISTRIBUTION"],
  // The WyreStorm wireless range (SW-* switchers, APO-* dongles) is classified
  // PRESENTATION, while wireless competitors (ClickShare, VIA, Solstice...) are
  // WIRELESS_PRESENTATION - the two must meet or the headline wireless lead
  // class can never produce a verified spec-engine decision. The compare page
  // already recommends SW-* for wireless competitors, so this mirrors the
  // product reality in both directions.
  WIRELESS_PRESENTATION: ["WIRELESS_PRESENTATION", "PRESENTATION"],
  PRESENTATION: ["PRESENTATION", "WIRELESS_PRESENTATION"],
  VIDEO_WALL: ["VIDEO_WALL", "AVOIP", "MULTIVIEW"],
  MULTIVIEW: ["MULTIVIEW", "VIDEO_WALL"],
  EXTENDER: ["EXTENDER", "HDBASET"],
  USB_EXTENSION: ["USB_EXTENSION"],
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

type UnstampedVerdict = Omit<FieldVerdict, "competitorProvenance" | "wyrestormProvenance" | "provenance">;

function compareNumbers(
  field: string,
  label: string,
  compValue: number | null,
  wsValue: number | null,
  suffix = "",
): UnstampedVerdict {
  if (compValue == null || wsValue == null) {
    return { field, label, competitorValue: fmt(compValue, suffix), wyrestormValue: fmt(wsValue, suffix), verdict: "unverified" };
  }
  const verdict: VerdictKind = wsValue > compValue ? "exceeds" : wsValue === compValue ? "match" : "gap";
  return { field, label, competitorValue: fmt(compValue, suffix), wyrestormValue: fmt(wsValue, suffix), verdict };
}

function normaliseCapability(value: string): string {
  return value
    .toLowerCase()
    .replace(/\bapi\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compareCapabilityLists(
  field: string,
  label: string,
  competitorValues: string[],
  wyrestormValues: string[],
): UnstampedVerdict {
  const competitorList = uniq(competitorValues);
  const wyrestormList = uniq(wyrestormValues);
  const competitorValue = competitorList.length ? competitorList.join(" · ") : "None verified";
  const wyrestormValue = wyrestormList.length ? wyrestormList.join(" · ") : "None verified";

  if (competitorList.length === 0 && wyrestormList.length === 0) {
    return { field, label, competitorValue, wyrestormValue, verdict: "unverified" };
  }

  if (competitorList.length > 0 && wyrestormList.length === 0) {
    return { field, label, competitorValue, wyrestormValue, verdict: "gap" };
  }

  if (competitorList.length === 0 && wyrestormList.length > 0) {
    return { field, label, competitorValue, wyrestormValue, verdict: "exceeds" };
  }

  const competitorKeys = competitorList.map(normaliseCapability).filter(Boolean);
  const wyrestormKeys = new Set(wyrestormList.map(normaliseCapability).filter(Boolean));
  const exactCoverage = competitorKeys.every((item) => wyrestormKeys.has(item));

  if (exactCoverage) {
    return {
      field,
      label,
      competitorValue,
      wyrestormValue,
      verdict: wyrestormKeys.size > competitorKeys.length ? "exceeds" : "match",
    };
  }

  return {
    field,
    label,
    competitorValue,
    wyrestormValue,
    verdict: "unverified",
    note: "Capabilities differ in wording or implementation; compare the listed functions during design review.",
  };
}

function isUnverifiedDisplayValue(value: string): boolean {
  return !value || value === "Unverified" || value === "None verified";
}

function stampVerdictProvenance(verdict: UnstampedVerdict, competitor: SpecSheet, ws: SpecSheet): FieldVerdict {
  const competitorProvenance = fieldProvenance(competitor, !isUnverifiedDisplayValue(verdict.competitorValue));
  const wyrestormProvenance = fieldProvenance(ws, !isUnverifiedDisplayValue(verdict.wyrestormValue));
  return {
    ...verdict,
    competitorProvenance,
    wyrestormProvenance,
    provenance: weakestFieldProvenance(competitorProvenance, wyrestormProvenance),
  };
}

export function buildFieldVerdicts(competitor: SpecSheet, ws: SpecSheet): FieldVerdict[] {
  const verdicts: UnstampedVerdict[] = [];

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

  // Compare the actual capability descriptions. Counting list entries produced
  // misleading ratings because five unrelated control methods could appear to
  // "beat" five different control methods.
  verdicts.push(compareCapabilityLists("audio", "Audio", competitor.audioOptions, ws.audioOptions));
  verdicts.push(compareCapabilityLists("control", "Control", competitor.controlOptions, ws.controlOptions));

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

  return verdicts.map((verdict) => stampVerdictProvenance(verdict, competitor, ws));
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
  // Wireless casting is a TX/RX pair system: the room-side unit is named "TX"
  // by some manufacturers (WyreStorm SW-* base units) and "receiver" by others
  // (ClickShare hubs), so TX/RX labels are SKU-naming conventions there, not a
  // hard direction. Relax the role gate only for the wireless pair - HDBaseT /
  // HDMI TX vs RX directions stay strict, and a laptop-side dongle never
  // replaces a room-side unit.
  const wirelessPair =
    competitor.transport === "wireless" &&
    ws.transport === "wireless" &&
    competitor.role !== "dongle" &&
    ws.role !== "dongle";
  if (!roleCheck.ok && !roleCheck.note && !wirelessPair) {
    blockers.push(`Role mismatch: ${competitor.role} vs ${ws.role}`);
  } else if (!roleCheck.ok && roleCheck.note === "Role unverified") {
    blockers.push("Role could not be verified from evidence");
  }

  if (
    (competitor.specClass === "MATRIX" || competitor.specClass === "PRESENTATION") &&
    competitor.routedIn != null
  ) {
    if (ws.routedIn == null) {
      blockers.push(`Routed input capacity unverified: needs ${competitor.routedIn}`);
    } else if (ws.routedIn < competitor.routedIn) {
      blockers.push(`Insufficient routed inputs: needs ${competitor.routedIn}, candidate has ${ws.routedIn}`);
    }
  }

  // Output capacity is as hard a requirement as input capacity: a candidate
  // with fewer routed outputs than the competitor physically cannot drive the
  // same displays (e.g. an 8x4 must never replace an 8x8). Mirrors the
  // routed-input gate above and the output blocker competitorCompareDecision
  // already enforces on the Overview path.
  if (
    (competitor.specClass === "MATRIX" || competitor.specClass === "PRESENTATION") &&
    competitor.routedOut != null
  ) {
    if (ws.routedOut == null) {
      blockers.push(`Routed output capacity unverified: needs ${competitor.routedOut}`);
    } else if (ws.routedOut < competitor.routedOut) {
      blockers.push(`Insufficient routed outputs: needs ${competitor.routedOut}, candidate has ${ws.routedOut}`);
    }
  }

  // A distribution amplifier must preserve fan-out. A 1x2 cannot replace a
  // 1x4/1x8, and an unknown output count is not evidence that it can. Treat
  // this as physical incompatibility rather than a soft scoring gap.
  if (competitor.specClass === "DISTRIBUTION" && competitor.hdmiOut != null) {
    if (ws.hdmiOut == null) {
      blockers.push(`Distribution output capacity unverified: needs ${competitor.hdmiOut}`);
    } else if (ws.hdmiOut < competitor.hdmiOut) {
      blockers.push(`Insufficient distribution outputs: needs ${competitor.hdmiOut}, candidate has ${ws.hdmiOut}`);
    }
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
    const unverified = verdicts.filter((verdict) => verdict.verdict === "unverified");

    if (comparable.length < 3) continue; // not enough verified evidence to claim anything

    const transportVerdict = verdicts.find((verdict) => verdict.field === "transport");
    const roleNote = rolesCompatible(competitor.role, ws.role).note;
    const fullyVerifiedEquivalent =
      gaps.length === 0
      && unverified.length === 0
      && ws.verificationStatus === "verified"
      && !roleNote;
    const decision: ShowdownDecision =
      transportVerdict?.verdict === "gap"
        ? "architecture-alternative"
        : fullyVerifiedEquivalent
          ? "confirmed-equivalent"
          : "closest-technical-match";

    const advantages = exceeded.map(
      (verdict) => `${verdict.label}: ${verdict.wyrestormValue} vs ${verdict.competitorValue}${verdict.note ? ` — ${verdict.note}` : ""}`,
    );
    const cautions = [
      ...gaps.map((verdict) => `${verdict.label}: ${verdict.wyrestormValue} vs competitor ${verdict.competitorValue}`),
      ...(roleNote ? [roleNote] : []),
      ...(unverified.length > 0 ? [`${unverified.length} comparison field${unverified.length === 1 ? " is" : "s are"} not verified.`] : []),
      ...(ws.verificationStatus !== "verified" ? ["WyreStorm candidate profile is not yet fully verified."] : []),
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
      provenance: verdicts.reduce<FieldProvenance>(
        (weakest, verdict) => weakestFieldProvenance(weakest, verdict.provenance),
        "verified",
      ),
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
    verified: matches.some((match) => match.decision === "confirmed-equivalent"),
  };
}
