/**
 * Competitor Spec Registry
 *
 * Resolves a competitor SKU/name to a STRUCTURED specification profile drawn
 * from real datasheets, rather than parsing whatever free text the user typed.
 *
 * Resolution order:
 *   1. Curated fingerprint (exact or family) with verified datasheet specs.
 *   2. Family-rule evidence (domain/role/transport) from competitorProductIntelligence.
 *   3. Generic parsing of the input (I/O counts, resolution) as a last resort.
 *
 * The output matches the CompareDecisionProfile shape consumed by
 * classifyCompetitorCompareDecision, so the live page can compare like-for-like
 * structured specs instead of keyword guesses. Fields we are NOT confident about
 * are left undefined so the classifier returns VERIFY rather than a false blocker.
 */

import type { CompareDecisionProfile, CompareSpecFacts } from "./competitorCompareDecision";
import {
  buildCompetitorDecisionEvidence,
  normalizeCompetitorSku,
  type CompetitorTechnologyClass,
} from "./competitorProductIntelligence";
import { findCompetitorSourceProduct, type CompetitorSourceProduct } from "../data/competitorSourceFeeds";
import competitorCompareCatalogRaw from "../../../data/catalog/competitor-products.generated.json";

export type CompetitorSpecTier = "verified-profile" | "family-rule" | "sku-only";

export type ResolvedCompetitorProfile = CompareDecisionProfile & {
  brand: string;
  specTier: CompetitorSpecTier;
  readiness: "approved" | "usable-with-review" | "needs-evidence" | "sku-only";
  assumptions: string[];
  whyNotDirectEquivalent: string[];
  missingFacts: string[];
  confidencePenalty: number;
  source: "fingerprint" | "family-rule" | "typed-text" | "user-saved";
  datasheetUrl?: string;
};

export type Fingerprint = {
  brand: string;
  /** Canonical example SKU used for display. */
  sku: string;
  /** Normalised keys (lowercase alphanumeric) that map to this fingerprint. */
  keys: string[];
  domain: CompetitorTechnologyClass;
  role: string;
  maxResolution?: string;
  chroma?: string;
  inputCount?: number;
  outputCount?: number;
  features?: Record<string, boolean>;
  specs?: CompareSpecFacts;
  datasheetUrl?: string;
  approvalStatus?: "approved" | "review" | "draft" | "needs-evidence";
  sourceTier?: string;
};

/** Canonical transport derived from the technology class. Keeping transport a
 * function of domain prevents brand-specific wording (DTP, DXLink, NAV…) from
 * producing false transport-mismatch blockers in the classifier. */
export function canonicalTransport(domain?: string): string | undefined {
  switch ((domain || "").toUpperCase()) {
    case "AVOIP":
      return "AVoIP";
    case "HDBASET":
      return "HDBaseT";
    case "MATRIX":
      return "HDMI matrix";
    case "DISTRIBUTION":
      return "HDMI distribution";
    case "PRESENTATION":
      return "HDMI";
    case "VIDEO_WALL":
      return "HDMI";
    case "MULTIVIEW":
      return "HDMI";
    case "USB_EXTENSION":
      return "USB";
    case "WIRELESS_PRESENTATION":
      return "Wireless";
    case "WIRELESS_CASTING":
      return "Wireless";
    case "AUDIO":
      return "Audio";
    case "CONTROL":
      return "Control";
    case "NDI_CAMERA":
      return "NDI / HDMI";
    case "PTZ_CAMERA":
      return "HDMI / SDI / IP";
    case "UC_SOUNDBAR":
      return "USB / HDMI";
    default:
      return undefined;
  }
}

function normKey(value: unknown): string {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function textFromSourceUrl(rawUrl: unknown): string {
  const value = String(rawUrl ?? "").trim();
  if (!value) return "";

  try {
    const parsed = new URL(value);
    return decodeURIComponent([
      parsed.hostname,
      parsed.pathname,
      parsed.search,
    ].join(" "));
  } catch {
    return value;
  }
}

function skuCandidatesFromSourceUrl(rawUrl: unknown): string[] {
  const value = textFromSourceUrl(rawUrl);
  const candidates = value
    .split(/[/?#=&_.+\s]+/g)
    .map((item) => item.trim())
    .filter((item) => /[a-z]/i.test(item) && /\d/.test(item) && item.length >= 5 && item.length <= 48);

  return Array.from(new Set(candidates));
}

// Endpoint feature defaults shared across AVoIP transceivers.
const _AVOIP_ENDPOINT_IO = { inputCount: 1, outputCount: 1 } as const;

/**
 * Curated fingerprints for the most commonly compared competitor SKUs. Specs
 * reflect public datasheet headline figures. Where a precise value is uncertain
 * it is intentionally omitted so the classifier asks the user to verify rather
 * than asserting a wrong figure.
 */
// Runtime fingerprints are compiled from the authoritative manufacturer CSV sources.
let FINGERPRINTS: Fingerprint[] = [];

// Exported for the integrity test. The curated list is the high-trust tier a rep
// quotes against, so its internal consistency is guarded automatically.
export let CURATED_FINGERPRINTS: ReadonlyArray<Fingerprint> = FINGERPRINTS;

export function normaliseFingerprintKey(value: string): string {
  return normKey(value);
}

export type FingerprintIntegrityIssue = {
  sku: string;
  key?: string;
  issue: string;
};

// Pull the first N×M token out of an alias key (e.g. "mmx6x2ht200" -> 6×2). Used
// to catch overloaded alias keys whose encoded I/O contradicts the fingerprint's
// declared I/O — the exact defect behind the Lightware and Crestron fixes.
function ioFromKey(key: string): { inputs: number; outputs: number } | null {
  // Strip resolution tokens first (4k / 8k / 1080p): they can abut the matrix
  // size and corrupt the parse, e.g. "hdmd4x2-4kze" must read 4x2, not 4x24.
  const cleaned = key.replace(/\d{3,4}p/g, "").replace(/[48]k/g, "");
  // Require the size token to end at a non-digit / string end so "8x8hdmi" still
  // reads 8x8 but a longer run is not silently truncated.
  const match = cleaned.match(/(\d{1,2})x(\d{1,2})(?!\d)/);
  if (!match) return null;
  return { inputs: Number(match[1]), outputs: Number(match[2]) };
}

// Order matters: /wireless/ is checked before /presentation/ so a
// "Wireless Presentation" role is not captured by the presentation rule.
const ROLE_DOMAIN_RULES: Array<{ role: RegExp; domains: CompetitorTechnologyClass[] }> = [
  { role: /matrix/i, domains: ["MATRIX", "VIDEO_WALL"] },
  { role: /encoder|decoder|transceiver/i, domains: ["AVOIP"] },
  { role: /transmitter|receiver/i, domains: ["AVOIP", "HDBASET", "USB_EXTENSION"] },
  { role: /wireless/i, domains: ["WIRELESS_PRESENTATION"] },
  { role: /presentation/i, domains: ["PRESENTATION"] },
  { role: /controller/i, domains: ["CONTROL"] },
];

/**
 * Validate the curated fingerprint list for internal consistency. Returns every
 * issue found so a test can fail with an actionable list. These invariants would
 * have caught the overloaded-alias bugs that previously shipped (a 6×2/4×2 matrix
 * keyed onto an 8×8 profile, a 4×4 alias on a 4×2 profile).
 */
export function validateCuratedFingerprints(
  fingerprints: ReadonlyArray<Fingerprint> = FINGERPRINTS,
): FingerprintIntegrityIssue[] {
  const issues: FingerprintIntegrityIssue[] = [];
  const seenKeys = new Map<string, string>();

  for (const fp of fingerprints) {
    if (!fp.keys.length) {
      issues.push({ sku: fp.sku, issue: "fingerprint has no lookup keys" });
    }

    for (const key of fp.keys) {
      // Keys must already be in normalised form, or lookupFingerprint silently
      // never matches them (input is normalised before comparison).
      if (normKey(key) !== key) {
        issues.push({ sku: fp.sku, key, issue: `key is not normalised (expected "${normKey(key)}")` });
      }

      // Duplicate key across fingerprints -> first one silently wins the match.
      const owner = seenKeys.get(key);
      if (owner && owner !== fp.sku) {
        issues.push({ sku: fp.sku, key, issue: `duplicate key also used by "${owner}"` });
      } else {
        seenKeys.set(key, fp.sku);
      }

      // Overloaded alias: the I/O encoded in the key must match the declared I/O.
      const keyIo = ioFromKey(key);
      if (
        keyIo &&
        fp.inputCount !== undefined &&
        fp.outputCount !== undefined &&
        (keyIo.inputs !== fp.inputCount || keyIo.outputs !== fp.outputCount)
      ) {
        issues.push({
          sku: fp.sku,
          key,
          issue: `key encodes ${keyIo.inputs}x${keyIo.outputs} but fingerprint declares ${fp.inputCount}x${fp.outputCount}`,
        });
      }
    }

    // Role/domain coherence: a "Matrix" role must not sit on an AVoIP domain, etc.
    const rule = ROLE_DOMAIN_RULES.find((entry) => entry.role.test(fp.role));
    if (rule && !rule.domains.includes(fp.domain)) {
      issues.push({
        sku: fp.sku,
        issue: `role "${fp.role}" is incompatible with domain "${fp.domain}"`,
      });
    }

    // A chroma claim without a resolution is meaningless and over-specific.
    if (fp.chroma && !fp.maxResolution) {
      issues.push({ sku: fp.sku, issue: "chroma is set without a maxResolution" });
    }

    // 10G / SDVoE only exists on AV-over-IP transports.
    if (fp.features?.tenGig && fp.domain !== "AVOIP") {
      issues.push({ sku: fp.sku, issue: `tenGig feature on non-AVoIP domain "${fp.domain}"` });
    }
  }

  return issues;
}

function lookupFingerprint(rawSku: string): Fingerprint | null {
  const candidate = normKey(rawSku);
  if (!candidate) return null;

  for (const fp of FINGERPRINTS) {
    for (const key of fp.keys) {
      const isExact = candidate === key;
      const inputContainsKnownSku = key.length >= 5 && candidate.includes(key);
      const missingPrefixMatch = candidate.length >= 5 && key.endsWith(candidate);

      if (isExact || inputContainsKnownSku || missingPrefixMatch) {
        return fp;
      }
    }
  }

  return null;
}

function parseIoCounts(text: string): { inputCount?: number; outputCount?: number } {
  const match = text.match(/(\d{1,2})\s*[x×]\s*(\d{1,2})/);
  if (match) {
    return { inputCount: Number(match[1]), outputCount: Number(match[2]) };
  }
  return {};
}

function quantityFromLabel(text: string, labels: string[]): number | undefined {
  for (const label of labels) {
    const labelPattern = label.replace(/\s+/g, "\\s+");
    const after = text.match(new RegExp(`\\b${labelPattern}\\b\\D{0,24}(\\d{1,2})\\b`, "i"));
    if (after) return Number(after[1]);

    const before = text.match(new RegExp(`\\b(\\d{1,2})\\s*(?:x\\s*)?${labelPattern}\\b`, "i"));
    if (before) return Number(before[1]);
  }

  return undefined;
}

export function parseResolution(text: string): string | undefined {
  const value = text.toLowerCase();
  if (/8k|4320/.test(value)) return "8K";
  if (/4k\s*60|4k60|2160p\s*60|60\s*hz.*4k|4k.*60\s*hz/.test(value)) return "4K60";
  if (/4k|uhd|2160/.test(value)) return "4K30"; // conservative: ranks below 4K60, never over-claims
  if (/1080|fhd|1920/.test(value)) return "1080p";
  return undefined;
}

function parseFirstMatch(text: string, patterns: RegExp[], formatter?: (value: string) => string): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const captured = match?.[1];
    if (captured) {
      return formatter ? formatter(captured) : captured;
    }
  }

  return undefined;
}

export function parseFeatures(text: string): Record<string, boolean> {
  const value = text.toLowerCase();
  const features: Record<string, boolean> = {};
  if (/usb-?c/.test(value)) features.usbC = true;
  if (/kvm|usb routing|usb host|usb 2|usb 3|usb2|usb3/.test(value)) features.usbRouting = true;
  if (/\bdante\b/.test(value)) features.dante = true;
  if (/aes67/.test(value)) features.aes67 = true;
  if (/multiview|multi-view/.test(value)) features.multiview = true;
  if (/video\s*wall|videowall/.test(value)) features.videoWall = true;
  if (/wireless|clickshare|airmedia/.test(value)) features.wireless = true;
  if (/dongle|clickshare button|apo-dg2|apo-dg1/.test(value)) features.castingDongle = true;
  if (/\b10g\b|sdvoe/.test(value)) features.tenGig = true;
  if (/hdbaset|hdbt/.test(value)) features.hdbtOutput = true;
  if (/rs-?232|ir\b|cec|relay|contact closure|control/.test(value)) features.control = true;
  if (/\bpoe\b|\bpoh\b|\bpoc\b|power over ethernet/.test(value)) features.poe = true;
  if (/\bpoc\b/.test(value)) features.poc = true;
  if (/\bpoh\b/.test(value)) features.poh = true;
  if (/audio\s*de.?embed|de.?embed/.test(value)) features.audioDeEmbed = true;
  if (/audio\s*embed/.test(value)) features.audioEmbed = true;
  return features;
}

export function parseSpecFacts(text: string, inputCount?: number, outputCount?: number, features: Record<string, boolean> = {}): CompareSpecFacts {
  const value = text.toLowerCase();
  const specs: CompareSpecFacts = {};

  if (inputCount) specs.hdmiInputs = inputCount;
  if (outputCount) specs.hdmiOutputs = outputCount;

  specs.hdmiInputs = quantityFromLabel(value, ["hdmi inputs", "video inputs", "input count"]) ?? specs.hdmiInputs;
  specs.hdmiOutputs = quantityFromLabel(value, ["hdmi outputs", "video outputs", "output count"]) ?? specs.hdmiOutputs;
  specs.hdmiVersion = parseFirstMatch(value, [/\bhdmi\s*(2\.1|2\.0|1\.4|1\.3|1\.2)\b/i], (version) => `HDMI ${version}`);
  specs.hdcpVersion = parseFirstMatch(value, [/\bhdcp\s*(2\.3|2\.2|2\.1|2\.0|1\.4)\b/i], (version) => `HDCP ${version}`);
  specs.displayPortInputs = quantityFromLabel(value, ["displayport inputs", "dp inputs"]);
  specs.displayPortOutputs = quantityFromLabel(value, ["displayport outputs", "dp outputs"]);
  specs.dviInputs = quantityFromLabel(value, ["dvi inputs"]);
  specs.dviOutputs = quantityFromLabel(value, ["dvi outputs"]);
  specs.vgaInputs = quantityFromLabel(value, ["vga inputs"]);
  specs.vgaOutputs = quantityFromLabel(value, ["vga outputs"]);
  specs.sdiInputs = quantityFromLabel(value, ["sdi inputs"]);
  specs.sdiOutputs = quantityFromLabel(value, ["sdi outputs"]);
  specs.compositeInputs = quantityFromLabel(value, ["composite inputs", "cvbs inputs"]);
  specs.compositeOutputs = quantityFromLabel(value, ["composite outputs", "cvbs outputs"]);
  specs.componentInputs = quantityFromLabel(value, ["component inputs", "ypbpr inputs"]);
  specs.componentOutputs = quantityFromLabel(value, ["component outputs", "ypbpr outputs"]);
  if (/\bdisplayport\b|\bdp\b/.test(value)) specs.displayPortInputs = specs.displayPortInputs ?? 1;
  if (/\bdvi\b/.test(value)) specs.dviInputs = specs.dviInputs ?? 1;
  if (/\bvga\b/.test(value)) specs.vgaInputs = specs.vgaInputs ?? 1;
  if (/\bsdi\b/.test(value)) specs.sdiInputs = specs.sdiInputs ?? 1;
  if (/composite|cvbs/.test(value)) specs.compositeInputs = specs.compositeInputs ?? 1;
  if (/component|ypbpr/.test(value)) specs.componentInputs = specs.componentInputs ?? 1;

  specs.usbHostPorts = quantityFromLabel(value, ["usb host ports", "usb hosts", "host ports"]);
  specs.usbDevicePorts = quantityFromLabel(value, ["usb device ports", "usb client ports", "usb peripheral ports", "device ports"]);
  specs.usbTotalPorts = quantityFromLabel(value, ["usb total ports", "usb ports"]);
  specs.usbCPorts = quantityFromLabel(value, ["usb-c ports", "usbc ports", "type-c ports"]);
  specs.usbStandard = parseFirstMatch(
    value,
    [/\busb\s*(3\.2|3\.1|3\.0|2\.0)\b/i, /\b(super ?speed usb|high ?speed usb)\b/i],
    (standard) => {
      const normalized = standard.toUpperCase().replace(/\s+/g, " ").trim();
      return normalized.startsWith("USB") ? normalized : normalized === "SUPER SPEED USB" ? "USB 3.x" : "USB 2.0";
    },
  );
  if (/usb\s*host/.test(value)) specs.usbHostPorts = specs.usbHostPorts ?? 1;
  if (/usb\s*(device|client|peripheral)/.test(value)) specs.usbDevicePorts = specs.usbDevicePorts ?? 1;
  if (/usb|kvm/.test(value) || features.usbRouting) specs.usbTotalPorts = specs.usbTotalPorts ?? 1;
  if (/usb-?c|type-?c/.test(value)) specs.usbCPorts = specs.usbCPorts ?? 1;
  if (/usb\s*3|usb3|super ?speed/.test(value)) specs.usbStandard = specs.usbStandard ?? "USB 3.x";
  else if (/usb\s*2|usb2|high ?speed/.test(value)) specs.usbStandard = specs.usbStandard ?? "USB 2.0";

  specs.audioInputs = quantityFromLabel(value, ["audio inputs", "audio in ports", "mic inputs", "line inputs"]);
  specs.audioOutputs = quantityFromLabel(value, ["audio outputs", "audio out ports", "line outputs"]);
  specs.networkPorts = quantityFromLabel(value, ["network ports", "lan ports", "ethernet ports", "rj45 ports"]);
  specs.controlPorts = quantityFromLabel(value, ["control ports", "control connections"]);
  if (/audio\s*in|mic|microphone|line\s*in/.test(value)) specs.audioInputs = specs.audioInputs ?? 1;
  if (/audio\s*out|line\s*out|speaker|toslink|spdif/.test(value)) specs.audioOutputs = specs.audioOutputs ?? 1;
  if (/ethernet|lan|rj45|network/.test(value)) specs.networkPorts = specs.networkPorts ?? 1;
  if (/rs-?232|ir\b|cec|relay|gpio|contact closure|control/.test(value) || features.control) specs.controlPorts = specs.controlPorts ?? 1;

  specs.rs232 = /rs-?232/.test(value) ? true : undefined;
  specs.ir = /\bir\b|infrared/.test(value) ? true : undefined;
  specs.cec = /\bcec\b/.test(value) ? true : undefined;
  specs.relay = /relay|contact closure/.test(value) ? true : undefined;
  specs.gpio = /gpio/.test(value) ? true : undefined;
  specs.ethernetControl = /ethernet|lan|web ui|api|tcp\/ip|tcp-ip/.test(value) ? true : undefined;

  specs.audioDeEmbed = Boolean(features.audioDeEmbed || /audio\s*de.?embed|de.?embed/.test(value));
  specs.audioEmbed = Boolean(features.audioEmbed || /audio\s*embed/.test(value));
  specs.analogAudio = /analog audio|analogue audio|line in|line out|phoenix audio/.test(value) ? true : undefined;
  specs.arc = /\barc\b/.test(value) ? true : undefined;
  specs.earc = /\bearc\b/.test(value) ? true : undefined;
  specs.dante = Boolean(features.dante || /\bdante\b/.test(value));
  specs.dedicatedDantePort = /dedicated dante port|separate dante|independent dante port/.test(value) ? true : undefined;
  specs.aes67 = Boolean(features.aes67 || /aes67/.test(value));
  specs.wirelessCasting = Boolean(features.wireless || /wireless (casting|presentation|screensharing|screen sharing)|airplay|miracast|clickshare/.test(value));
  specs.castingDongleSupport = parseFirstMatch(
    value,
    [
      /\b(apo-dg2|apo-dg1|clickshare button)\b/i,
      /\b(apo-dg1|dongle|clickshare button)\b/i,
    ],
    (support) => support.toUpperCase().replace(/\s+/g, "") === "APO-DG2-PRO" ? "APO-DG2" : support.toUpperCase().replace(/\s+/g, ""),
  );

  specs.poe = Boolean(features.poe || /\bpoe\b|power over ethernet/.test(value));
  specs.poc = Boolean(features.poc || /\bpoc\b|power over cable/.test(value));
  specs.poh = Boolean(features.poh || /\bpoh\b|power over hdbaset/.test(value));
  specs.powerDelivery = /usb-c power|power delivery|\bpd\b/.test(value) ? true : undefined;
  specs.externalPsu = /external power|dc power|power supply|psu|adapter/.test(value) ? true : undefined;
  specs.internalPsu = /internal power|iec|mains input/.test(value) ? true : undefined;
  specs.hdbasetVersion = parseFirstMatch(value, [/\bhdbaset\s*(3\.0|2\.0|1\.0)\b/i], (version) => `HDBaseT ${version}`);
  specs.hdbasetClass = parseFirstMatch(
    value,
    [/\bhdbaset[^.]{0,24}\bclass\s*([abc])\b/i, /\bclass\s*([abc])\b[^.]{0,24}\bhdbaset\b/i],
    (klass) => `Class ${klass.toUpperCase()}`,
  ) ?? specs.hdbasetClass;

  if (specs.poh) specs.powerSupply = "PoH / HDBaseT remote power";
  else if (specs.poc) specs.powerSupply = "PoC remote power";
  else if (specs.poe) specs.powerSupply = "PoE";
  else if (specs.externalPsu) specs.powerSupply = "External PSU";
  else if (specs.internalPsu) specs.powerSupply = "Internal PSU";

  return Object.fromEntries(Object.entries(specs).filter(([, item]) => item !== undefined)) as CompareSpecFacts;
}

const SPEC_FACT_INPUT_FIELDS: Array<keyof CompareSpecFacts> = [
  "hdmiInputs", "displayPortInputs", "dviInputs", "vgaInputs", "sdiInputs", "compositeInputs", "componentInputs",
];
const SPEC_FACT_OUTPUT_FIELDS: Array<keyof CompareSpecFacts> = [
  "hdmiOutputs", "displayPortOutputs", "dviOutputs", "sdiOutputs", "compositeOutputs", "componentOutputs",
];

function sumSpecFactPorts(specs: CompareSpecFacts, fields: Array<keyof CompareSpecFacts>): number | undefined {
  const total = fields.reduce((sum, field) => {
    const value = specs[field];
    return typeof value === "number" ? sum + value : sum;
  }, 0);
  return total > 0 ? total : undefined;
}

/**
 * Best-effort pre-fill for the Compare "add product data" form from free text
 * (e.g. a competitor PDF datasheet extracted client-side). Deliberately does
 * NOT infer domain/role - those use a different vocabulary than this parser's
 * feature/spec keywords and stay rep-picked from the existing dropdowns. Only
 * suggests values a human should still confirm before saving.
 */
export function inferSpecFormFieldsFromText(text: string): {
  maxResolution?: string;
  chroma?: string;
  inputCount?: number;
  outputCount?: number;
  notesExcerpt?: string;
} {
  const trimmed = text.trim();
  if (!trimmed) return {};

  const features = parseFeatures(trimmed);
  const specs = parseSpecFacts(trimmed, undefined, undefined, features);

  return {
    maxResolution: parseResolution(trimmed),
    chroma: /4:4:4/.test(trimmed) ? "4:4:4" : /4:2:2/.test(trimmed) ? "4:2:2" : /4:2:0/.test(trimmed) ? "4:2:0" : undefined,
    inputCount: sumSpecFactPorts(specs, SPEC_FACT_INPUT_FIELDS),
    outputCount: sumSpecFactPorts(specs, SPEC_FACT_OUTPUT_FIELDS),
    notesExcerpt: trimmed.length > 500 ? `${trimmed.slice(0, 500)}…` : trimmed,
  };
}

function sourceProductDomain(product: CompetitorSourceProduct): CompetitorTechnologyClass | undefined {
  if (product.domain === "UNKNOWN") return undefined;
  return product.domain === "WIRELESS_COLLAB" ? "WIRELESS_PRESENTATION" : product.domain;
}

function specsFromSourceProduct(product: CompetitorSourceProduct): CompareSpecFacts {
  return {
    ...parseSpecFacts([product.summary, ...product.evidence].join(" "), product.inputCount, product.outputCount, product.features),
    hdmiInputs: product.inputCount,
    hdmiOutputs: product.outputCount,
    dante: product.features.dante,
    aes67: product.features.aes67,
    audioDeEmbed: product.features.audioDeEmbed,
    audioEmbed: product.features.audioEmbed,
    poc: product.features.poc,
    poe: product.features.poe,
    poh: product.features.poh,
    rs232: product.features.irRs232,
    controlPorts: product.features.control ? 1 : undefined,
  };
}

/* ------------------------------------------------------------------------- *
 * Structured competitor compare catalog (data/catalog/competitor-products.generated.json)
 *
 * This 79-product structured catalog was previously unused. Each entry is mapped
 * into the same Fingerprint shape the curated list uses, so any catalogued
 * competitor SKU resolves to a verified-profile with real I/O, resolution and
 * feature facts. Hand-curated fingerprints still take priority; the catalog
 * fills the long tail.
 * ------------------------------------------------------------------------- */

type CatalogPort = { type?: string; count?: number };
type CatalogEntry = {
  sku?: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  technology?: string;
  role?: string;
  directionality?: string;
  transport?: string;
  summary?: string;
  sourceUrl?: string;
  inputs?: CatalogPort[];
  outputs?: CatalogPort[];
  control?: string[];
  audio?: string[];
  features?: string[] | Record<string, boolean>;
  video?: { maxResolution?: string; hdmi?: string; hdr?: boolean };
  matrixInputs?: number;
  matrixOutputs?: number;
  routedInputCount?: number;
  routedOutputCount?: number;
  approvalStatus?: "approved" | "review" | "draft" | "needs-evidence";
  sourceTier?: string;
  aliases?: string[];
  specs?: CompareSpecFacts & { video?: unknown };
};

const COMPETITOR_COMPARE_CATALOG = competitorCompareCatalogRaw as unknown as CatalogEntry[];

const CATALOG_VIDEO_PORT = /(hdmi|hdbaset|displayport|\bdp\b|dtp\d?|\bdm\b|tpx|modular|analog video|av input)/i;

function catalogDomain(entry: CatalogEntry): CompetitorTechnologyClass | undefined {
  const tech = String(entry.technology ?? "").toLowerCase();
  const category = String(entry.category ?? "").toLowerCase();

  if (tech.includes("usb extension")) return "USB_EXTENSION";
  if (tech.includes("avoip") || category === "avoip") return "AVOIP";
  if (tech.includes("hdbaset") || category === "extender") return "HDBASET";
  if (tech.includes("video wall") || category === "video wall") return "VIDEO_WALL";
  if (tech.includes("matrix") || category === "matrix") return "MATRIX";
  if (tech.includes("wireless") || category === "wireless presentation") return "WIRELESS_PRESENTATION";
  if (tech.includes("control") || category === "control") return "CONTROL";
  if (tech.includes("distribution") || category === "distribution") return "DISTRIBUTION";
  if (tech.includes("presentation") || tech.includes("unified communications") || category === "switcher" || category === "uc") {
    return "PRESENTATION";
  }
  return undefined;
}

function catalogRole(entry: CatalogEntry): string | undefined {
  const role = String(entry.role ?? "").toLowerCase().replace(/[-_]+/g, " ").trim();
  const direction = String(entry.directionality ?? "").toLowerCase();

  if (!role || role === "accessory") return undefined;
  if (role === "endpoint") {
    if (direction === "tx") return "encoder";
    if (direction === "rx") return "decoder";
    return "transceiver";
  }
  if (role === "tx") return "transmitter";
  if (role === "rx") return "receiver";
  if (role === "extender" || role === "extender kit") return "transmitter";
  if (role === "matrix switcher") return "matrix";
  if (role === "distribution amplifier") return "distribution amplifier";
  if (role.startsWith("wireless")) return "wireless presentation";
  if (role === "video bar") return "presentation switcher";
  return role;
}

function catalogChroma(resolution?: string): string | undefined {
  const value = String(resolution ?? "");
  if (/4:4:4/.test(value)) return "4:4:4";
  if (/4:2:2/.test(value)) return "4:2:2";
  if (/4:2:0/.test(value)) return "4:2:0";
  return undefined;
}

function countCatalogPorts(ports: CatalogPort[] | undefined, matcher: RegExp): number | undefined {
  if (!Array.isArray(ports)) return undefined;
  const total = ports
    .filter((port) => matcher.test(String(port.type ?? "")))
    .reduce((sum, port) => sum + (Number.isFinite(Number(port.count)) ? Number(port.count) : 0), 0);
  return total > 0 ? total : undefined;
}

function catalogEntryToFingerprint(entry: CatalogEntry): Fingerprint | null {
  const sku = String(entry.sku ?? "").trim();
  const brand = String(entry.brand ?? "").trim();
  if (!sku || !brand) return null;

  const domain = catalogDomain(entry);
  if (!domain) return null; // skip accessories / unmapped categories

  const role = catalogRole(entry);

  // I/O counts: matrices use routed/matrix size; AVoIP endpoints are single-stream
  // (left undefined so they are never penalised); others count physical video ports.
  let inputCount: number | undefined;
  let outputCount: number | undefined;
  if (domain === "MATRIX" || domain === "VIDEO_WALL") {
    inputCount = entry.matrixInputs ?? entry.routedInputCount ?? countCatalogPorts(entry.inputs, CATALOG_VIDEO_PORT);
    outputCount = entry.matrixOutputs ?? entry.routedOutputCount ?? countCatalogPorts(entry.outputs, CATALOG_VIDEO_PORT);
  } else if (domain !== "AVOIP") {
    inputCount = countCatalogPorts(entry.inputs, CATALOG_VIDEO_PORT);
    outputCount = countCatalogPorts(entry.outputs, CATALOG_VIDEO_PORT);
  }

  const portTypes = [
    ...(entry.inputs ?? []).map((p) => p.type ?? ""),
    ...(entry.outputs ?? []).map((p) => p.type ?? ""),
  ].join(" ");
  const featureText = Array.isArray(entry.features)
    ? entry.features.join(" ")
    : entry.features && typeof entry.features === "object"
      ? Object.entries(entry.features).filter(([, enabled]) => enabled === true).map(([name]) => name).join(" ")
      : "";
  const blob = [
    entry.summary,
    entry.transport,
    entry.technology,
    featureText,
    (entry.control ?? []).join(" "),
    (entry.audio ?? []).join(" "),
    portTypes,
    entry.video?.maxResolution,
  ].filter(Boolean).join(" ");

  const features = parseFeatures(blob);
  if (/usb-?c/i.test(portTypes)) features.usbC = true;
  if (/usb (host|device)/i.test(portTypes)) features.usbRouting = true;

  const specs: CompareSpecFacts = {
    ...parseSpecFacts(blob, inputCount, outputCount, features),
    ...(entry.specs && typeof entry.specs === "object" ? entry.specs : {}),
  };
  const hdmiIn = countCatalogPorts(entry.inputs, /hdmi/i);
  const hdmiOut = countCatalogPorts(entry.outputs, /hdmi/i);
  if (hdmiIn) specs.hdmiInputs = hdmiIn;
  if (hdmiOut) specs.hdmiOutputs = hdmiOut;
  const displayPortIn = countCatalogPorts(entry.inputs, /displayport|\bdp\b/i);
  const displayPortOut = countCatalogPorts(entry.outputs, /displayport|\bdp\b/i);
  const dviIn = countCatalogPorts(entry.inputs, /\bdvi\b/i);
  const dviOut = countCatalogPorts(entry.outputs, /\bdvi\b/i);
  const vgaIn = countCatalogPorts(entry.inputs, /\bvga\b/i);
  const vgaOut = countCatalogPorts(entry.outputs, /\bvga\b/i);
  const sdiIn = countCatalogPorts(entry.inputs, /\bsdi\b/i);
  const sdiOut = countCatalogPorts(entry.outputs, /\bsdi\b/i);
  const compositeIn = countCatalogPorts(entry.inputs, /composite|cvbs/i);
  const compositeOut = countCatalogPorts(entry.outputs, /composite|cvbs/i);
  const componentIn = countCatalogPorts(entry.inputs, /component|ypbpr/i);
  const componentOut = countCatalogPorts(entry.outputs, /component|ypbpr/i);
  if (displayPortIn) specs.displayPortInputs = displayPortIn;
  if (displayPortOut) specs.displayPortOutputs = displayPortOut;
  if (dviIn) specs.dviInputs = dviIn;
  if (dviOut) specs.dviOutputs = dviOut;
  if (vgaIn) specs.vgaInputs = vgaIn;
  if (vgaOut) specs.vgaOutputs = vgaOut;
  if (sdiIn) specs.sdiInputs = sdiIn;
  if (sdiOut) specs.sdiOutputs = sdiOut;
  if (compositeIn) specs.compositeInputs = compositeIn;
  if (compositeOut) specs.compositeOutputs = compositeOut;
  if (componentIn) specs.componentInputs = componentIn;
  if (componentOut) specs.componentOutputs = componentOut;
  const lanPorts = countCatalogPorts(entry.outputs, /lan|ethernet|network/i) ?? countCatalogPorts(entry.inputs, /lan|ethernet|network/i);
  if (lanPorts) specs.networkPorts = lanPorts;

  return {
    brand,
    sku,
    keys: Array.from(new Set([normKey(sku), ...(entry.aliases ?? []).map(normKey).filter(Boolean)])),
    domain,
    role: role ?? "",
    maxResolution: parseResolution([entry.video?.maxResolution, entry.summary].filter(Boolean).join(" ")),
    chroma: catalogChroma(entry.video?.maxResolution),
    inputCount,
    outputCount,
    features: Object.keys(features).length ? features : undefined,
    specs: Object.keys(specs).length ? specs : undefined,
    datasheetUrl: entry.sourceUrl,
    approvalStatus: entry.approvalStatus,
    sourceTier: entry.sourceTier,
  };
}

const CATALOG_FINGERPRINTS: Fingerprint[] = COMPETITOR_COMPARE_CATALOG
  .map(catalogEntryToFingerprint)
  .filter((fp): fp is Fingerprint => Boolean(fp));
FINGERPRINTS = CATALOG_FINGERPRINTS.filter((fingerprint) => fingerprint.approvalStatus === "approved");
CURATED_FINGERPRINTS = FINGERPRINTS;

const CATALOG_FINGERPRINT_BY_KEY = new Map<string, Fingerprint>();
for (const fp of CATALOG_FINGERPRINTS) {
  for (const key of fp.keys) {
    if (key && !CATALOG_FINGERPRINT_BY_KEY.has(key)) CATALOG_FINGERPRINT_BY_KEY.set(key, fp);
  }
}

function lookupCatalogFingerprint(rawSku: string): Fingerprint | null {
  const candidate = normKey(rawSku);
  if (!candidate || candidate.length < 4) return null;

  const direct = CATALOG_FINGERPRINT_BY_KEY.get(candidate);
  if (direct) return direct;

  for (const fp of CATALOG_FINGERPRINTS) {
    const key = fp.keys[0];
    // candidate.includes(key): the typed SKU contains a known catalogue key (safe).
    // key.includes(candidate): a long catalogue key contains the typed SKU - only
    // trust this when the typed SKU is itself substantial, so a short cross-brand
    // token (e.g. BirdDog "P200") can't match inside an unrelated SKU ("IP200UHD-TX").
    if (key && key.length >= 6 && (candidate.includes(key) || (candidate.length >= 6 && key.includes(candidate)))) {
      return fp;
    }
  }
  return null;
}

/**
 * Resolve a competitor SKU/name to a structured spec profile.
 */
export function resolveCompetitorSpecProfile(
  rawInput: string,
  providedBrand?: string,
  sourceUrl?: string,
  /**
   * A rep-confirmed record from savedCompetitorSpecs.ts (manual entry, or a
   * live-lookup result the rep reviewed and saved). Trusted at the same tier
   * as a curated fingerprint since it's specific, human-confirmed data for
   * this exact SKU - callers look this up and pass it in explicitly so this
   * module stays free of any localStorage/browser dependency.
   */
  userSavedProduct?: CompetitorSourceProduct | null,
): ResolvedCompetitorProfile {
  const input = String(rawInput ?? "").trim();
  const normalised = normalizeCompetitorSku(input, providedBrand);
  const canonicalInput = normalised?.sku || input;
  const canonicalBrand = normalised?.brand || providedBrand;
  const evidence = buildCompetitorDecisionEvidence({
    brand: canonicalBrand,
    sku: canonicalInput,
    title: input,
  });

  const sourceUrlText = textFromSourceUrl(sourceUrl);
  const sourceSkuCandidates = skuCandidatesFromSourceUrl(sourceUrl);
  const fingerprint =
    lookupCatalogFingerprint(evidence.sku) ||
    lookupCatalogFingerprint(canonicalInput) ||
    lookupCatalogFingerprint(input) ||
    lookupCatalogFingerprint(sourceUrlText) ||
    lookupFingerprint(evidence.sku) ||
    lookupFingerprint(canonicalInput) ||
    lookupFingerprint(input) ||
    lookupFingerprint(sourceUrlText);
  // Separate catalogue lookup used only to backfill a real datasheet URL when a
  // hand-curated fingerprint wins but has no URL of its own.
  const catalogFingerprint =
    lookupCatalogFingerprint(evidence.sku) ||
    lookupCatalogFingerprint(canonicalInput) ||
    lookupCatalogFingerprint(input) ||
    lookupCatalogFingerprint(sourceUrlText);
  const sourceProduct = userSavedProduct || findCompetitorSourceProduct(
    canonicalBrand || evidence.brand,
    evidence.sku || canonicalInput,
    sourceUrl || input,
  ) || sourceSkuCandidates
    .map((candidate) => findCompetitorSourceProduct(canonicalBrand || evidence.brand, candidate, sourceUrl || input))
    .find(Boolean);

  // Domain: prefer fingerprint, fall back to family-rule evidence (UNKNOWN -> undefined).
  const domain =
    fingerprint?.domain ||
    (sourceProduct ? sourceProductDomain(sourceProduct) : undefined) ||
    (evidence.domain && evidence.domain !== "UNKNOWN" ? evidence.domain : undefined);

  const role =
    fingerprint?.role ||
    (sourceProduct?.role && sourceProduct.role !== "Unknown" ? sourceProduct.role : undefined) ||
    (evidence.role && evidence.role !== "Unknown" ? evidence.role : undefined);

  const parsedIo = parseIoCounts(canonicalInput);
  const parseBasis = [canonicalInput, input, sourceUrlText].filter(Boolean).join(" ");
  const parsedFeatures = parseFeatures(parseBasis);
  const features = {
    ...(sourceProduct?.features ?? {}),
    ...parsedFeatures,
    ...(fingerprint?.features ?? {}),
  };
  const hasFeatures = Object.keys(features).length > 0;

  function competitorSpecFamilyGuardKey(value: unknown): string {
    return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, "");
  }

  function isFamilyLevelCompetitorSpecInput(rawInput: unknown, evidenceSku: unknown, providedBrand?: unknown): boolean {
    const rawKey = competitorSpecFamilyGuardKey(rawInput);
    const evidenceKey = competitorSpecFamilyGuardKey(evidenceSku);
    const brandKey = competitorSpecFamilyGuardKey(providedBrand);

    const candidates = [rawKey, evidenceKey]
      .map((value) => brandKey && value.startsWith(brandKey) ? value.slice(brandKey.length) : value)
      .filter(Boolean);

    const familyOnlyKeys = new Set([
      "DMNVX",
      "NAV",
      "DTP",
      "KDS",
      "NMX",
      "MXNET",
      "ZYPER",
      "UBEX",
      "VINX",
      "ATOMNI",
      "B900MOIP",
      "IPUHD"
    ]);

    for (const candidate of candidates) {
      if (familyOnlyKeys.has(candidate)) {
        return true;
      }

      if (!/\d/.test(candidate) && /^DMNVX[A-Z]*$/.test(candidate)) {
        return true;
      }

      if (!/\d/.test(candidate) && /^NAV[A-Z]*$/.test(candidate)) {
        return true;
      }
    }

    return false;
  }
  const familyLevelInput = isFamilyLevelCompetitorSpecInput(canonicalInput, evidence.sku, canonicalBrand || normalised?.brand || evidence.brand);
  const hasVerifiedFingerprint = Boolean(fingerprint) && fingerprint?.approvalStatus === "approved" && !familyLevelInput;
  // Only a rep-confirmed saved spec is trusted at verified tier here - a plain
  // sourceProduct match from the generated competitor catalogue is evidence,
  // not a human-confirmed fact, so it stays at whatever tier evidence.tier gives it.
  const hasVerifiedSourceProduct = Boolean(userSavedProduct);

  const specTier: CompetitorSpecTier = hasVerifiedFingerprint
    ? "verified-profile"
    : hasVerifiedSourceProduct
      ? "verified-profile"
      : evidence.tier === "family-rule" || familyLevelInput
      ? "family-rule"
      : "sku-only";
  const evidenceSkuKey = normKey(evidence.sku);
  const displaySku = fingerprint && !fingerprint.keys.includes(evidenceSkuKey)
    ? fingerprint.sku
    : evidence.sku || canonicalInput;

  return {
    sku: sourceProduct?.sku || displaySku,
    title: sourceProduct?.title || canonicalInput,
    domain,
    role,
    transport: sourceProduct?.transport || canonicalTransport(domain),
    inputCount: fingerprint?.inputCount ?? sourceProduct?.inputCount ?? parsedIo.inputCount,
    outputCount: fingerprint?.outputCount ?? sourceProduct?.outputCount ?? parsedIo.outputCount,
    maxResolution: fingerprint?.maxResolution ?? sourceProduct?.maxResolution ?? parseResolution(parseBasis),
    chroma: fingerprint?.chroma ?? sourceProduct?.chroma,
    features: hasFeatures ? features : undefined,
    specs: {
      ...parseSpecFacts(parseBasis, fingerprint?.inputCount ?? sourceProduct?.inputCount ?? parsedIo.inputCount, fingerprint?.outputCount ?? sourceProduct?.outputCount ?? parsedIo.outputCount, features),
      ...(sourceProduct ? specsFromSourceProduct(sourceProduct) : {}),
      ...(fingerprint?.specs ?? {}),
    },
    sourceUrl: fingerprint?.datasheetUrl || catalogFingerprint?.datasheetUrl || sourceProduct?.sourceUrl || sourceUrl,
    // metadata
    brand: sourceProduct?.manufacturer || normalised?.brand || fingerprint?.brand || evidence.brand,
    specTier,
    readiness: hasVerifiedFingerprint || hasVerifiedSourceProduct
      ? "approved"
      : fingerprint?.approvalStatus === "review"
        ? "usable-with-review"
        : fingerprint
          ? "needs-evidence"
          : familyLevelInput
            ? "needs-evidence"
            : evidence.readiness,
    assumptions: hasVerifiedFingerprint || hasVerifiedSourceProduct ? [] : evidence.assumptions,
    whyNotDirectEquivalent: hasVerifiedFingerprint || hasVerifiedSourceProduct ? [] : evidence.whyNotDirectEquivalent,
    missingFacts: hasVerifiedFingerprint || hasVerifiedSourceProduct ? [] : familyLevelInput ? Array.from(new Set([...evidence.missingFacts, "Exact competitor model/SKU", "Datasheet or product page evidence"])) : evidence.missingFacts,
    confidencePenalty: hasVerifiedFingerprint || hasVerifiedSourceProduct ? 0 : familyLevelInput ? Math.max(evidence.confidencePenalty, 12) : evidence.confidencePenalty,
    source: userSavedProduct ? "user-saved" : hasVerifiedFingerprint ? "fingerprint" : evidence.tier === "family-rule" || familyLevelInput ? "family-rule" : "typed-text",
    datasheetUrl: fingerprint?.datasheetUrl || catalogFingerprint?.datasheetUrl || sourceProduct?.sourceUrl,
    sourceLabel: sourceProduct ? `${sourceProduct.sourceName}: ${sourceProduct.sourceCollection}` : undefined,
  };
}
