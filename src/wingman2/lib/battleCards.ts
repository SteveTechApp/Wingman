// Battle card engine: enriches the competitor catalog with WyreStorm-specific
// differentiators, objection handling, and talk tracks so reps can confidently
// handle competitive conversations.

import competitorCatalogRaw from "../../../data/catalog/competitor-products.generated.json";
import {
  classifyWingmanProduct,
  type WingmanProductClass,
  type WingmanProductLike,
} from "./productClassification";
import { loadProductIntelligenceIndex } from "./productIntelligenceIndexCache";
import { collectCompetitorBrandLosses, type CompetitorBrandLoss } from "./feedbackInformedGuidance";

// ── Types ────────────────────────────────────────────────────────────

export type BattleCardEntry = {
  competitorSku: string;
  competitorName: string;
  brand: string;
  category: string;
  summary: string;
  confidence: string;
  knownLimitations: string;
  sourceUrl: string;
  /** WyreStorm SKU or family that competes directly. */
  wyrestormEquivalent: string;
  /** Key differentiators: why WyreStorm wins. */
  differentiators: string[];
  /** Objection handling: responses to common competitor claims. */
  objectionHandling: Array<{ objection: string; response: string }>;
  /** Talk track: one-liner for opening the conversation. */
  talkTrack: string;
};

export type BattleCardGroup = {
  brand: string;
  entries: BattleCardEntry[];
  /** Number of lost deals mentioning this brand — boosts priority when > 0. */
  lostDealCount: number;
  /** Number of won deals mentioning this brand. */
  wonDealCount: number;
  /** Win-rate text for the group (e.g. "3 won vs 2 lost"). */
  dealSummary: string;
  /** True when 3+ losses recorded — surfaces escalation badge and migration talking points. */
  escalated: boolean;
  /** Auto-generated migration talking points for high-loss brands. */
  migrationTalkingPoints: string[];
};

export type BattleCardResult = {
  productClass: WingmanProductClass;
  groups: BattleCardGroup[];
  totalEntries: number;
  wyrestormProducts: string[];
};

// ── Raw catalog types ────────────────────────────────────────────────

type RawRow = {
  sku?: string;
  model?: string;
  name?: string;
  brand?: string;
  manufacturer?: string;
  category?: string;
  subcategory?: string;
  technology?: string;
  role?: string;
  summary?: string;
  confidence?: string;
  knownLimitations?: string;
  closestWyrestormSkuOrFamily?: string;
  closestWyrestormArchitecture?: string;
  sourceUrl?: string;
  features?: string[];
  video?: { maxResolution?: string; hdmi?: string };
  inputs?: Array<{ type?: string; count?: number }>;
  outputs?: Array<{ type?: string; count?: number }>;
};

const catalog = competitorCatalogRaw as RawRow[];

// ── WyreStorm product knowledge ──────────────────────────────────────

const WYRESTORM_FAMILY_STRENGTHS: Record<string, string[]> = {
  "presentation-switcher": [
    "Native USB-C input with power delivery — no dongle needed",
    "Built-in wireless casting (AirPlay, Miracast) on select models",
    "Seamless switching with minimal output black",
  ],
  "matrix-switch": [
    "HDBaseT output built into the matrix — no separate extender needed",
    "PoH/PoE power to receivers — no local power supplies at displays",
    "Audio de-embed on every output for flexible audio routing",
  ],
  "signal-extender-kit": [
    "HDBaseT 3.0 with USB 3.x, Ethernet and control pass-through",
    "PoH power delivery — receiver powered from transmitter",
    "Single Cat6 cable for video, audio, data, control and power",
  ],
  "avoip-encoder": [
    "NetworkHD 600: 10GbE with visually lossless JPEG2000",
    "NetworkHD 500: 1GbE 4K60 4:4:4 — lower network cost",
    "Built-in audio de-embed and control pass-through",
  ],
  "uc-room-core": [
    "BYOD/BYOM — no room PC license cost",
    "USB-C single-cable connection for video, data and charging",
    "Works with any UC platform — not locked to Teams or Zoom",
  ],
  "wireless-presentation": [
    "No dongle required on AirPlay/Miracast devices",
    "Dual-network: corporate and guest on separate SSIDs",
    "Hardware decoding — no reliance on PC performance",
  ],
  "camera": [
    "NDI|HX output — no USB cable distance limit",
    "PTZ with presets, tracking and auto-framing",
    "PoE powered — single cable to the camera",
  ],
  "audio-amplifier": [
    "Dante/AES67 network audio input on select models",
    "Flexible zone routing with DSP processing",
    "High-efficiency Class D with low idle consumption",
  ],
  "video-wall-processor": [
    "Dedicated hardware — no PC or software licence",
    "Bezel compensation and rotation built in",
    "Preset layouts with front-panel or IP recall",
  ],
  "multiview-processor": [
    "Hardware scaling on every input",
    "Custom window layout with drag-and-drop",
    "HDMI and HDBaseT input options",
  ],
  "distribution-amplifier": [
    "EDID management on every output",
    "Compact form factor for rack or under-table mounting",
    "HDMI 2.0 with 4K60 4:4:4 passthrough",
  ],
  "control-interface": [
    "No ongoing software licence fees",
    "RS-232, IR, IP and GPIO on every unit",
    "Pre-loaded WyreStorm device drivers",
  ],
};

// ── Class matching (same logic as competitorLandscape.ts) ────────────

function tag(row: RawRow): string {
  return `${row.role ?? ""} ${row.technology ?? ""} ${row.category ?? ""} ${row.subcategory ?? ""}`.toLowerCase();
}

function classMatches(row: RawRow, productClass: WingmanProductClass): boolean {
  const t = tag(row);
  switch (productClass) {
    case "presentation-switcher":
      return /presentation switcher|presentation router|universal switcher|dual-screen/.test(t);
    case "hdmi-switcher":
      return /hdmi switcher/.test(t) && !/presentation/.test(t);
    case "matrix-switch":
      return /matrix/.test(t);
    case "signal-extender-kit":
      return /(extender|transmitter|hdbaset)/.test(t) && !/matrix/.test(t);
    case "transmitter":
      return /transmitter/.test(t) && !/matrix/.test(t);
    case "receiver":
      return /(receiver|decoder)/.test(t) && !/matrix/.test(t);
    case "distribution-amplifier":
      return /distribution amplifier|splitter/.test(t);
    case "avoip-encoder":
      return /encoder/.test(t) && !/decoder/.test(t);
    case "avoip-decoder":
      return /decoder/.test(t) && !/encoder/.test(t);
    case "avoip-transceiver":
      return /(encoder\/decoder|transceiver)/.test(t);
    case "video-wall-processor":
      return /video wall/.test(t);
    case "multiview-processor":
      return /multiview|multi-view/.test(t);
    case "uc-room-core":
      return /conferencing hub|unified communications/.test(t);
    case "wireless-presentation":
      return /(wireless presentation|wireless hdmi receiver|wireless casting|casting)/.test(t);
    case "camera":
    case "camera-bridge":
      return /(camera|ptz|ndi)/.test(t);
    case "audio-amplifier":
      return /audio amplifier/.test(t) && !/distribution/.test(t);
    case "audio-dsp":
      return /(dsp|audio processor)/.test(t);
    case "control-interface":
      return /(controller|control |automation programming|device management)/.test(t);
    default:
      return false;
  }
}

// ── Differentiator generation ────────────────────────────────────────

function generateDifferentiators(entry: RawRow, productClass: WingmanProductClass): string[] {
  const diffs: string[] = [];
  const familyStrengths = WYRESTORM_FAMILY_STRENGTHS[productClass] ?? [];

  // Add family-level strengths
  for (const strength of familyStrengths.slice(0, 3)) {
    diffs.push(strength);
  }

  // Add spec-based differentiators
  const features = entry.features ?? [];
  const resolution = entry.video?.maxResolution ?? "";

  if (/1080p/.test(resolution) && !/4k/i.test(resolution)) {
    diffs.push("WyreStorm offers 4K60 models — significant headroom over 1080p-only competitors");
  }

  if (features.some((f) => /poe|poh/i.test(f))) {
    diffs.push("PoH/PoE power — single cable for video, data and power");
  }

  if (features.some((f) => /usb-c/i.test(f))) {
    diffs.push("USB-C connectivity with power delivery for BYOD workflows");
  }

  if (features.some((f) => /airplay|miracast|chromecast/i.test(f))) {
    diffs.push("Multi-platform wireless casting without additional hardware");
  }

  // Add limitation-based differentiators
  const limitations = (entry.knownLimitations ?? "").toLowerCase();
  if (/1080p|1080/.test(limitations)) {
    diffs.push("Competitor limited to 1080p — WyreStorm supports 4K60");
  }
  if (/licence|license|subscription|cloud/i.test(limitations)) {
    diffs.push("No ongoing licence or subscription fees — hardware-only model");
  }
  if (/pc|windows|software/i.test(limitations)) {
    diffs.push("Dedicated hardware — no PC or software dependency");
  }

  return [...new Set(diffs)].slice(0, 4);
}

// ── Objection handling generation ────────────────────────────────────

function generateObjectionHandling(
  entry: RawRow,
  productClass: WingmanProductClass,
): Array<{ objection: string; response: string }> {
  const brand = entry.brand ?? "the competitor";
  const name = entry.name ?? entry.sku ?? "their product";
  const objections: Array<{ objection: string; response: string }> = [];

  // Universal objections
  objections.push({
    objection: `Why not use ${brand}?`,
    response: `${name} is a solid product, but WyreStorm's ${productClass.replace(/-/g, " ")} range offers ${WYRESTORM_FAMILY_STRENGTHS[productClass]?.[0]?.toLowerCase() ?? "better integration and lower total cost"}. Confirm the specific requirements and let's compare spec-for-spec.`,
  });

  objections.push({
    objection: `We've always used ${brand}.`,
    response: "Familiarity is valuable. WyreStorm offers the same or better spec at a competitive price, with no licence fees and direct technical support. Happy to arrange a demo so you can see the difference hands-on.",
  });

  // Feature-based objections
  const features = entry.features ?? [];
  if (features.some((f) => /wireless|casting/i.test(f))) {
    objections.push({
      objection: `${brand} has wireless built in.`,
      response: "WyreStorm presentation switchers also support AirPlay, Miracast and Chromecast on select models — and the hardware decoding means performance isn't dependent on the presenter's laptop.",
    });
  }

  if (features.some((f) => /usb-c/i.test(f))) {
    objections.push({
      objection: `${brand} has USB-C too.`,
      response: "WyreStorm USB-C includes power delivery, so the presenter's laptop charges while presenting. We also support BYOD and BYOM workflows without a room PC licence.",
    });
  }

  // Limitation-based objections
  const limitations = (entry.knownLimitations ?? "").toLowerCase();
  if (/price|expensive|cost/i.test(limitations)) {
    objections.push({
      objection: `${brand} is cheaper.`,
      response: "Price per unit is only part of the story. WyreStorm includes PoH, audio de-embed and control pass-through as standard — features that are often optional extras on competing brands. The total installed cost is often lower.",
    });
  }

  return objections.slice(0, 3);
}

// ── Talk track generation ────────────────────────────────────────────

function generateTalkTrack(
  entry: RawRow,
  productClass: WingmanProductClass,
): string {
  const brand = entry.brand ?? "the competitor";
  const strengths = WYRESTORM_FAMILY_STRENGTHS[productClass] ?? [];
  const primaryStrength = strengths[0]?.replace(/ — .*$/, "") ?? "better integration";

  return `If the customer mentions ${brand}, acknowledge it's a known brand, then pivot to WyreStorm's ${primaryStrength}. Ask what specific requirements they have — this lets you shift from brand preference to spec comparison where WyreStorm wins.`;
}

// ── Migration talking points for high-loss brands ──────────────────

function generateMigrationTalkingPoints(
  brand: string,
  lostCount: number,
  wonCount: number,
): string[] {
  const winRate = wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;
  const points: string[] = [];

  points.push(
    `We've tracked ${lostCount} lost deal${lostCount !== 1 ? "s" : ""} where ${brand} was the preferred competitor — a ${winRate}% win rate against them. WyreStorm has closed the gap in every category where ${brand} previously dominated.`,
  );

  points.push(
    `Migration path: map each ${brand} SKU to its WyreStorm equivalent. The product guide and Battle Cards page list direct equivalents for ${brand}'s top sellers — use the Compare workflow to verify spec-for-spec.`,
  );

  if (lostCount >= 5) {
    points.push(
      `At ${lostCount} losses, this brand is a pattern — not a one-off. Consider a proactive outreach to the reps who lost these deals to capture what the customer actually said. The "why" text in the project store holds the real objection data.`,
    );
  }

  points.push(
    `Key objection: "We've always used ${brand}." Response: WyreStorm includes PoH, audio de-embed and control pass-through as standard — features that are optional extras on ${brand}. The total installed cost is often lower, and there are no ongoing licence fees.`,
  );

  return points;
}

// ── Main API ─────────────────────────────────────────────────────────

export function getBattleCards(
  product: WingmanProductLike,
): BattleCardResult {
  const profile = classifyWingmanProduct(product);
  const productClass = profile.productClass;

  const entries: BattleCardEntry[] = catalog
    .filter((row) => classMatches(row, productClass))
    .map((row) => ({
      competitorSku: String(row.sku || row.model || ""),
      competitorName: String(row.name || row.model || row.sku || ""),
      brand: String(row.brand || row.manufacturer || ""),
      category: String(row.subcategory || row.category || ""),
      summary: String(row.summary || ""),
      confidence: String(row.confidence || "unverified").toLowerCase(),
      knownLimitations: String(row.knownLimitations || ""),
      sourceUrl: String(row.sourceUrl || ""),
      wyrestormEquivalent: String(row.closestWyrestormSkuOrFamily || ""),
      differentiators: generateDifferentiators(row, productClass),
      objectionHandling: generateObjectionHandling(row, productClass),
      talkTrack: generateTalkTrack(row, productClass),
    }))
    .filter((entry) => entry.brand && entry.competitorSku);

  // Collect deal-outcome brand losses for priority boosting
  const brandLosses = new Map<string, CompetitorBrandLoss>();
  for (const bl of collectCompetitorBrandLosses()) {
    brandLosses.set(bl.brand, bl);
  }

  // Group by brand
  const brandMap = new Map<string, BattleCardEntry[]>();
  for (const entry of entries) {
    const existing = brandMap.get(entry.brand) ?? [];
    existing.push(entry);
    brandMap.set(entry.brand, existing);
  }

  // Build groups — sort brands with most losses first
  const groups: BattleCardGroup[] = [...brandMap.entries()]
    .map(([brand, brandEntries]) => {
      const dealInfo = brandLosses.get(brand);
      const lostDealCount = dealInfo?.lossCount ?? 0;
      const wonDealCount = dealInfo?.winCount ?? 0;
      const dealSummary = lostDealCount > 0 || wonDealCount > 0
        ? `${wonDealCount} won vs ${lostDealCount} lost`
        : "";
      const escalated = lostDealCount >= 3;
      const migrationTalkingPoints = escalated ? generateMigrationTalkingPoints(brand, lostDealCount, wonDealCount) : [];
      return {
        brand,
        entries: brandEntries.sort((a, b) => {
          const rankA = a.confidence === "high" ? 0 : a.confidence === "medium" ? 1 : 2;
          const rankB = b.confidence === "high" ? 0 : b.confidence === "medium" ? 1 : 2;
          return rankA - rankB || a.competitorSku.localeCompare(b.competitorSku);
        }),
        lostDealCount,
        wonDealCount,
        dealSummary,
        escalated,
        migrationTalkingPoints,
      };
    })
    .sort((a, b) => b.lostDealCount - a.lostDealCount || a.brand.localeCompare(b.brand));

  return {
    productClass,
    groups,
    totalEntries: entries.length,
    wyrestormProducts: [], // Populated by the page from the project BOM
  };
}

/** Get all battle cards across all product classes (for the full battle cards page). */
export async function getAllBattleCards(): Promise<BattleCardGroup[]> {
  let intelligenceProducts: WingmanProductLike[] = [];
  try {
    const payload = await loadProductIntelligenceIndex() as { products?: unknown[] };
    intelligenceProducts = (payload.products ?? []) as WingmanProductLike[];
  } catch {
    // Fall through with empty products.
  }

  // Collect all unique product classes from the catalog
  const classCounts = new Map<WingmanProductClass, number>();
  for (const row of catalog) {
    const t = tag(row);
    for (const productClass of Object.keys(WYRESTORM_FAMILY_STRENGTHS) as WingmanProductClass[]) {
      if (classMatches(row, productClass)) {
        classCounts.set(productClass, (classCounts.get(productClass) ?? 0) + 1);
      }
    }
  }

  // For each product class with entries, find a representative WyreStorm product
  const allEntries: BattleCardEntry[] = [];
  for (const [productClass] of classCounts) {
    // Find a representative WyreStorm product for this class
    const representative = intelligenceProducts.find((p) => {
      const profile = classifyWingmanProduct(p);
      return profile.productClass === productClass;
    });

    if (!representative) continue;

    const result = getBattleCards(representative);
    for (const group of result.groups) {
      for (const entry of group.entries) {
        allEntries.push(entry);
      }
    }
  }

  // Re-group all entries by brand, with deal-outcome priority
  const brandLosses = new Map<string, CompetitorBrandLoss>();
  for (const bl of collectCompetitorBrandLosses()) {
    brandLosses.set(bl.brand, bl);
  }

  const brandMap = new Map<string, BattleCardEntry[]>();
  for (const entry of allEntries) {
    const existing = brandMap.get(entry.brand) ?? [];
    existing.push(entry);
    brandMap.set(entry.brand, existing);
  }

  return [...brandMap.entries()]
    .map(([brand, brandEntries]) => {
      const dealInfo = brandLosses.get(brand);
      const lostDealCount = dealInfo?.lossCount ?? 0;
      const wonDealCount = dealInfo?.winCount ?? 0;
      const dealSummary = lostDealCount > 0 || wonDealCount > 0
        ? `${wonDealCount} won vs ${lostDealCount} lost`
        : "";
      const escalated = lostDealCount >= 3;
      const migrationTalkingPoints = escalated ? generateMigrationTalkingPoints(brand, lostDealCount, wonDealCount) : [];
      return {
        brand,
        entries: brandEntries.sort((a, b) => a.competitorSku.localeCompare(b.competitorSku)),
        lostDealCount,
        wonDealCount,
        dealSummary,
        escalated,
        migrationTalkingPoints,
      };
    })
    .sort((a, b) => b.lostDealCount - a.lostDealCount || a.brand.localeCompare(b.brand));
}
