
import type { ExtractedRequirements } from "@/import/extractRequirements";
import catalog from "@/data/wyrestormSkuCatalog.2026";

type CatalogItem = { sku: string; description?: string; tier?: unknown };
const _catalogAny: any = catalog as any;
const catalogItems: CatalogItem[] =
  (_catalogAny?.items as CatalogItem[] | undefined) ??
  (_catalogAny?.default?.items as CatalogItem[] | undefined) ??
  (_catalogAny?.default as CatalogItem[] | undefined) ??
  ([] as CatalogItem[]);

export type RecommendedSku = { sku: string; description: string; score: number; tier: string; family: string };

export type RoomTierRecommendation = {
  tier: "Bronze" | "Silver" | "Gold";
  skus: RecommendedSku[];
  rationale: string[];
  cautions: string[];
};

export type ProductMatchRecommendation = {
  mode: "product";
  best: RecommendedSku[];
  other: RecommendedSku[];
  rationale: string[];
  cautions: string[];
};

export type RoomRecommendation = {
  mode: "room";
  tiers: RoomTierRecommendation[];
};

export type ImportRecommendation = RoomRecommendation | ProductMatchRecommendation;

function norm(s: string) {
  return (s || "").toLowerCase();
}

function tokenScore(hay: string, tokens: string[], weight: number) {
  const h = norm(hay);
  let score = 0;
  for (const t of tokens) {
    if (!t) continue;
    if (h.indexOf(norm(t)) >= 0) score += weight;
  }
  return score;
}

function scoreItem(req: ExtractedRequirements, rawText: string, sku: string, desc: string) {
  const text = norm(rawText);
  const hay = sku + " " + desc;
  let score = 0;

  // General signals
  score += tokenScore(hay, ["encoder", "decoder", "transmitter", "receiver", "av over ip", "av-over-ip", "hdbaset"], 2);

  // BYOD / USB-C / UC
  if (req.byodUsbC) {
    score += tokenScore(hay, ["usb", "usb-c", "usbc", "uc", "byod", "byom", "switcher", "presentation"], 6);
  }

  // Switching
  if (req.switchingNeeded) {
    score += tokenScore(hay, ["matrix", "switch", "switcher", "mx", "sw", "presentation"], 6);
  }

  // Resolution sensitivity
  if (req.resolution === "4K60") {
    score += tokenScore(hay, ["4k60", "60", "uhd", "4k"], 5);
  } else if (req.resolution === "4K") {
    score += tokenScore(hay, ["uhd", "4k"], 3);
  }

  // Distance / backbone hints
  if (req.distanceHint === "long") {
    score += tokenScore(hay, ["fiber", "optical", "sfp", "10g", "10gbe", "uplink"], 6);
  } else if (req.distanceHint === "medium") {
    score += tokenScore(hay, ["hdbaset", "cat6", "extender"], 3);
  }

  // Endpoint scale hints
  const ep = req.endpoints ?? 0;
  if (ep >= 12) score += tokenScore(hay, ["600", "10g", "enterprise", "controller"], 4);
  if (ep > 0 && ep <= 6) score += tokenScore(hay, ["120", "basic", "compact"], 2);

  // UC hints from pasted text
  if (text.indexOf("teams") >= 0 || text.indexOf("zoom") >= 0 || text.indexOf("meet") >= 0) {
    score += tokenScore(hay, ["teams", "zoom", "uc", "usb"], 2);
  }

  // Penalise obviously irrelevant items
  score -= tokenScore(hay, ["spare", "replacement", "mount", "bracket"], 3);

  return score;
}

function toSku(i: any, score: number): RecommendedSku {
  return { sku: i.sku, description: i.description, score, tier: i.tier, family: i.family };
}

function topByTier(req: ExtractedRequirements, rawText: string, tier: "Bronze" | "Silver" | "Gold", limit: number): RecommendedSku[] {
  const items = catalogItems.filter((i: any) => (i.tier as any) === tier);
  const scored = items.map((i: any) => toSku(i, scoreItem(req, rawText, i.sku, i.description)));
  scored.sort((a: any, b: any) => (b.score - a.score) || a.sku.localeCompare(b.sku));
  return scored.slice(0, limit);
}

function topFlat(req: ExtractedRequirements, rawText: string, limit: number): RecommendedSku[] {
  const items = catalogItems;
  const scored = items.map((i: any) => toSku(i, scoreItem(req, rawText, i.sku, i.description)));

  // In product mode, bias toward not-unclassified items slightly
  for (const s of scored) {
    if (s.tier && s.tier !== "Unclassified") s.score += 2;
  }

  scored.sort((a: any, b: any) => (b.score - a.score) || a.sku.localeCompare(b.sku));
  return scored.slice(0, limit);
}

export function recommendWyrestorm(req: ExtractedRequirements, rawText: string): ImportRecommendation {
  const commonCautions: string[] = [
    "Ranked suggestions from the 2026 catalog. Validate I/O counts, role (encoder/decoder), and control expectations.",
    "EoL filtering depends on your denylist + explicit family exclusions. Maintain it as products change.",
  ];

  if (req.intent === "room") {
    const tiers: RoomTierRecommendation[] = [
      {
        tier: "Bronze",
        skus: topByTier(req, rawText, "Bronze", 10),
        rationale: ["Functional, cost-driven starting point for a room solution.", "Use when requirements are modest and scale is small."],
        cautions: commonCautions.concat(["Avoid Bronze for high endpoint counts or strict 4K60/resilience requirements."]),
      },
      {
        tier: "Silver",
        skus: topByTier(req, rawText, "Silver", 10),
        rationale: ["Recommended default tier in most commercial installs.", "Balanced performance and scalability."],
        cautions: commonCautions,
      },
      {
        tier: "Gold",
        skus: topByTier(req, rawText, "Gold", 10),
        rationale: ["Performance and future-proofing tier.", "Use when 4K60, scale, long distance, or resilience dominates."],
        cautions: commonCautions.concat(["Gold typically requires deliberate network design (IGMP/QoS/uplinks)."]),
      },
    ];

    return { mode: "room", tiers };
  }

  const flat = topFlat(req, rawText, 20);
  return {
    mode: "product",
    best: flat.slice(0, 10),
    other: flat.slice(10, 20),
    rationale: [
      "Individual product mode: tiering is suppressed.",
      "Results are ranked matches based on extracted requirements and SKU descriptions.",
    ],
    cautions: commonCautions,
  };
}




