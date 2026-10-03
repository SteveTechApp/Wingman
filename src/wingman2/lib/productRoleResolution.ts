// Product role resolution.
//
// The product intelligence index already carries a governed classification for
// every catalogue SKU (`productClassification`): a controlled taxonomy with a
// classification path, controlled `subClassifications` tokens, declared signal
// domains, transport classes and a confidence score. That is authored and
// reconciled upstream, and it is the accurate answer.
//
// The previous implementation ignored all of it and inferred the role by
// substring-matching a blob of concatenated marketing prose - product name,
// description, applications, key features and every spec line. That failed in
// two structural ways:
//
//   1. An application mention was indistinguishable from a capability. A
//      matrix whose datasheet says "ideal for video wall applications" matched
//      "video wall"; an encoder whose spec line mentions a Dante option
//      matched "dante" and was classified as an audio product.
//   2. The rules were ordered by accident rather than specificity, so the
//      loosest test (audio) ran before the precise ones (AVoIP, camera,
//      matrix, extension) and captured everything they should have claimed.
//
// The result was that 13 of the 16 products it called "audio" were not audio
// products at all - among them a PTZ camera, four NetworkHD encoders, two
// matrices and an HDBaseT extender.
//
// This module resolves the role from the governed taxonomy instead, and falls
// back to text only when the taxonomy is absent - reporting which happened, so
// a guessed role is visible rather than silent.

import type { ProductRole, ProductSpec } from "./productStoryEngine";

export type ProductClassificationFacts = {
  primaryCategory?: string;
  category?: string;
  systemRole?: string;
  subClassifications?: string[];
  classificationPath?: string[];
  signalDomains?: string[];
  transportClass?: string[];
  confidence?: number;
};

export type ProductRoleSource =
  // Resolved from a controlled `subClassifications` token - the precise case.
  | "taxonomy-classification"
  // Resolved from `systemRole` or `primaryCategory` when no token matched.
  | "taxonomy-category"
  // No usable taxonomy: inferred from product text and NOT trustworthy.
  | "text-fallback"
  // Nothing resolved it.
  | "default";

export type ProductRoleResolution = {
  role: ProductRole;
  source: ProductRoleSource;
  /** Taxonomy confidence where it drove the answer; 0 for a text fallback. */
  confidence: number;
  /** The specific value the decision was made on, for audit and display. */
  evidence: string;
  /** True when the role was guessed from prose and should be treated as soft. */
  needsReview: boolean;
};

// Controlled `subClassifications` tokens mapped to a narrative role, in
// priority order: the most specific FUNCTION wins over the broader product
// family it belongs to. A NetworkHD multiview processor carries both a
// "networkhd-500" family token and a "multiview-processor" function token, and
// its story should be about multiview, not about AVoIP in general.
//
// Deliberately absent: "audio-deembed", "audio-conversion", "dante", "arc" and
// similar. Those describe an audio CAPABILITY on a product whose job is
// something else, and treating them as a role is the exact bug this replaces.
// Only devices whose primary purpose is audio appear under "audio".
const ROLE_TOKEN_PRIORITY: Array<{ role: ProductRole; tokens: string[] }> = [
  { role: "videoWall", tokens: ["video-wall", "videowall", "video-wall-processor"] },
  { role: "multiview", tokens: ["multiview", "multiview-processor"] },
  // "video-bar" is deliberately NOT a camera signal. Add-on microphones
  // (APO-COM-MIC, APO-SKY-MIC, HALO-COM-MIC) carry it to mean "pairs with a
  // video bar", so treating it as a camera claim turns a microphone into a
  // camera. Devices that really do capture image carry "camera" or "ptz".
  { role: "camera", tokens: ["camera", "ptz"] },
  { role: "audio", tokens: ["amplifier", "dsp", "microphone", "speakerphone"] },
  { role: "matrix", tokens: ["matrix"] },
  { role: "presentation", tokens: ["presentation-switcher", "source-switcher", "switcher"] },
  { role: "wireless", tokens: ["wireless-dongle", "wireless"] },
  { role: "extension", tokens: ["extender", "transmitter", "receiver", "hdbaset"] },
  {
    role: "avoip",
    tokens: [
      "avoip",
      "encoder",
      "decoder",
      "transceiver",
      "sdvoe",
      "ndi",
      "networkhd-100",
      "networkhd-500",
      "networkhd-600",
      "networkhd-control",
      "avoip-infrastructure",
    ],
  },
];

// Controlled `systemRole` values. Only exact members are trusted: 10 catalogue
// records leak a raw product name into this field (all at 0.84 confidence), so
// confidence alone cannot guard it - membership of the vocabulary can.
const SYSTEM_ROLE_TO_ROLE = new Map<string, ProductRole>([
  ["Multiview processor", "multiview"],
  ["Video wall layout processing", "videoWall"],
  ["Image capture endpoint", "camera"],
  ["NDI source/display workflow bridge", "camera"],
  ["Audio DSP and speaker amplification", "audio"],
  ["Advanced 2 or 4 Channel Amplifier", "audio"],
  ["UC audio capture component", "audio"],
  ["Central video routing", "matrix"],
  ["Point-to-point extension", "extension"],
  ["Encoder", "avoip"],
  ["Decoder", "avoip"],
  ["Transceiver", "avoip"],
  ["AVoIP system control", "avoip"],
  ["Network infrastructure for AV over IP", "avoip"],
  ["Room presentation and source switching core", "presentation"],
  ["Source switching", "presentation"],
  ["UC room endpoint", "presentation"],
  ["UC room audio and source switching hub", "presentation"],
  ["Optional collaboration endpoint", "presentation"],
]);

const PRIMARY_CATEGORY_TO_ROLE = new Map<string, ProductRole>([
  ["Extension", "extension"],
  ["Matrix / Routing", "matrix"],
  ["NetworkHD AV over IP", "avoip"],
  ["Camera / Capture", "camera"],
  ["Audio", "audio"],
  ["Unified Communications", "presentation"],
  ["Presentation / Room Core", "presentation"],
  ["Video Processing", "videoWall"],
]);

// `category` (the second level of the classification path) resolves the small
// "Video" bucket, where the generator left a product name in `systemRole` but
// still recorded a clean category - "Matrix switching", "AV over IP" and so on.
const CATEGORY_TO_ROLE = new Map<string, ProductRole>([
  ["Matrix switching", "matrix"],
  ["AV over IP", "avoip"],
  ["Extension", "extension"],
  ["Multiview", "multiview"],
  ["Video wall", "videoWall"],
  ["Camera", "camera"],
  ["Audio", "audio"],
]);

function normaliseToken(value: string) {
  return value.trim().toLowerCase();
}

export function resolveRoleFromClassification(
  classification: ProductClassificationFacts | undefined,
): ProductRoleResolution | null {
  if (!classification) return null;

  const confidence = typeof classification.confidence === "number" ? classification.confidence : 0;
  const tokens = new Set((classification.subClassifications ?? []).map(normaliseToken));

  for (const entry of ROLE_TOKEN_PRIORITY) {
    const hit = entry.tokens.find((token) => tokens.has(token));
    if (hit) {
      return {
        role: entry.role,
        source: "taxonomy-classification",
        confidence,
        evidence: `subClassifications: ${hit}`,
        needsReview: false,
      };
    }
  }

  const systemRole = classification.systemRole?.trim() ?? "";
  const bySystemRole = SYSTEM_ROLE_TO_ROLE.get(systemRole);
  if (bySystemRole) {
    return {
      role: bySystemRole,
      source: "taxonomy-category",
      confidence,
      evidence: `systemRole: ${systemRole}`,
      needsReview: false,
    };
  }

  const category = classification.category?.trim() ?? "";
  const byCategory = CATEGORY_TO_ROLE.get(category);
  if (byCategory) {
    return {
      role: byCategory,
      source: "taxonomy-category",
      confidence,
      evidence: `category: ${category}`,
      needsReview: false,
    };
  }

  const primary = classification.primaryCategory?.trim() ?? "";
  const byPrimary = PRIMARY_CATEGORY_TO_ROLE.get(primary);
  if (byPrimary) {
    return {
      role: byPrimary,
      source: "taxonomy-category",
      confidence,
      evidence: `primaryCategory: ${primary}`,
      needsReview: false,
    };
  }

  // Cables, accessories, control interfaces, splitters and network switches all
  // land here deliberately. They are real classifications with no narrative
  // role of their own, and inventing one for them is how a cable ends up being
  // pitched as a presentation product.
  if (primary || category || systemRole) {
    return {
      role: "general",
      source: "taxonomy-category",
      confidence,
      evidence: `no narrative role for ${primary || category || systemRole}`,
      needsReview: false,
    };
  }

  return null;
}

// Text fallback. Reached only when a product carries no governed
// classification at all - a live-lookup record, or a catalogue entry added
// before the taxonomy was reconciled.
//
// Two things differ from the implementation this replaces. The tests are
// ordered most-specific-first so a broad rule cannot pre-empt a precise one,
// and the audio test demands evidence that audio is the product's PURPOSE
// rather than one of its connections.
export function resolveRoleFromText(text: string, sku: string): ProductRole {
  const haystack = text.toLowerCase();
  const has = (needle: string) => haystack.includes(needle);

  if (has("video wall processor") || has("videowall processor") || has("video wall controller")) return "videoWall";
  if (has("multiview") || has("multi-view")) return "multiview";
  if (/^cam-/i.test(sku) || has("ptz camera") || has("camera bridge") || has("video bar")) return "camera";

  // Audio only when the product IS an audio device. "dante", "speaker" or
  // "audio" appearing anywhere used to be enough, which is what swept up
  // encoders, matrices and a camera.
  if (has("amplifier") || has("audio dsp") || has("dsp amplifier") || has("speakerphone") || has("microphone array")) {
    return "audio";
  }

  if (/^nhd-/i.test(sku) || has("networkhd") || has("av over ip") || has("avoip") || has("sdvoe")) return "avoip";
  if (has("matrix")) return "matrix";
  if (has("extender") || has("hdbaset") || has("transmitter") || has("receiver")) return "extension";
  if (has("presentation switcher") || has("byod") || has("byom")) return "presentation";
  if (has("wireless") || has("airplay") || has("miracast")) return "wireless";

  return "general";
}

export function resolveProductRole(
  product: ProductSpec,
  productTextValue: string,
  options: { isUcRoomProduct: boolean },
): ProductRoleResolution {
  // Exact UC room identity still takes precedence. A UC room device is sold and
  // narrated as the room's presentation core regardless of how the taxonomy
  // files its microphone or speaker components.
  if (options.isUcRoomProduct) {
    return {
      role: "presentation",
      source: "taxonomy-classification",
      confidence: 1,
      evidence: "UC room product identity",
      needsReview: false,
    };
  }

  const fromTaxonomy = resolveRoleFromClassification(product.classification);
  if (fromTaxonomy) return fromTaxonomy;

  const role = resolveRoleFromText(productTextValue, product.sku);
  return {
    role,
    source: role === "general" ? "default" : "text-fallback",
    confidence: 0,
    evidence: "no governed classification on this product; role inferred from product text",
    needsReview: true,
  };
}
