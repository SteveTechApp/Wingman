import { loadCatalogItems, type CatalogItem } from "@/catalog/workflowCatalog";
import { buildSolutionRecommendation } from "./solutionRecommendations";
import { getActiveWorkflowProject } from "./workflowStore";

export type BomRecommendation = {
  sku: string;
  name: string;
  family: string;
  category: string;
  quantityHint: string;
  reason: string;
};

export type RealBomResult = {
  available: boolean;
  sourcePath: string | null;
  summary: string;
  recommendations: BomRecommendation[];
  notes: string[];
};

function textOf(item: CatalogItem): string {
  return [
    item.sku,
    item.name,
    item.family,
    item.category,
    ...item.tags,
  ].join(" ").toLowerCase();
}

function scoreItem(item: CatalogItem, tokens: string[]): number {
  const hay = textOf(item);
  let score = 0;
  for (const token of tokens) {
    if (hay.includes(token)) score += 10;
  }
  return score;
}

function topMatches(
  items: CatalogItem[],
  tokens: string[],
  quantityHint: string,
  reason: string,
  max = 4
): BomRecommendation[] {
  return items
    .map((item) => ({
      item,
      score: scoreItem(item, tokens),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((r) => ({
      sku: r.item.sku,
      name: r.item.name,
      family: r.item.family,
      category: r.item.category,
      quantityHint,
      reason,
    }));
}

export async function buildRealBomRecommendation(): Promise<RealBomResult> {
  const active = getActiveWorkflowProject();
  const solution = buildSolutionRecommendation(active);
  const { items, sourcePath } = await loadCatalogItems();

  if (!sourcePath || items.length === 0) {
    return {
      available: false,
      sourcePath: null,
      summary: "No compatible local catalogue JSON was found. Catalogue mapping is ready, but no product source could be loaded.",
      recommendations: [],
      notes: [
        "Place a real product array in one of the supported JSON paths.",
        "Supported fields include sku, model, name, title, family, category, and tags.",
      ],
    };
  }

  const sources = active?.sources ?? 1;
  const displays = active?.displays ?? 1;
  const recommendations: BomRecommendation[] = [];
  const notes: string[] = [];

  const families = solution.families.map((f) => f.toLowerCase());

  if (families.includes("hdbaset")) {
    recommendations.push(
      ...topMatches(
        items,
        ["hdbaset", "tx", "transmitter", "presentation"],
        `${Math.max(sources, 1)} suggested`,
        "Source-side HDBaseT or presentation transmitter candidate"
      )
    );
    recommendations.push(
      ...topMatches(
        items,
        ["hdbaset", "rx", "receiver"],
        `${Math.max(displays, 1)} suggested`,
        "Display-side HDBaseT receiver candidate"
      )
    );
  }

  if (families.includes("avoip")) {
    recommendations.push(
      ...topMatches(
        items,
        ["avoip", "networkhd", "encoder", "enc"],
        `${Math.max(sources, 1)} suggested`,
        "Network-distributed source encoder candidate"
      )
    );
    recommendations.push(
      ...topMatches(
        items,
        ["avoip", "networkhd", "decoder", "dec"],
        `${Math.max(displays, 1)} suggested`,
        "Network-distributed display decoder candidate"
      )
    );
  }

  if (families.includes("matrix switching")) {
    recommendations.push(
      ...topMatches(
        items,
        ["matrix", "switch", "switcher"],
        "1 suggested",
        "Central switching candidate"
      )
    );
  }

  if (families.includes("usb extension")) {
    recommendations.push(
      ...topMatches(
        items,
        ["usb", "extension", "extender"],
        "As required",
        "USB extension candidate"
      )
    );
  }

  if (families.includes("video wall")) {
    recommendations.push(
      ...topMatches(
        items,
        ["video wall", "processor", "multiview", "wall"],
        "1 suggested",
        "Video wall or presentation processor candidate"
      )
    );
  }

  if (active?.control) {
    recommendations.push(
      ...topMatches(
        items,
        ["control", "controller", "api"],
        "1 suggested",
        "Control integration candidate"
      )
    );
  }

  if (recommendations.length === 0) {
    notes.push("No strong SKU matches were found using the current catalogue schema.");
    notes.push("Review product family names and tags in the local product JSON.");
  }

  const deduped = recommendations.filter(
    (r, index, arr) => arr.findIndex((x) => x.sku === r.sku) === index
  );

  return {
    available: true,
    sourcePath,
    summary: `Starter BOM mapped from local catalogue source ${sourcePath}.`,
    recommendations: deduped.slice(0, 12),
    notes: notes.length > 0 ? notes : [
      "These are starter candidates only; final BOM sizing still depends on topology and endpoint count.",
      "Use real room topology and cable path decisions before final commercial release.",
    ],
  };
}
