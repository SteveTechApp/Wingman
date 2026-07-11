import competitorCatalogRaw from "../../../data/catalog/competitor-products.generated.json";
import { classifyWingmanProduct, type WingmanProductClass, type WingmanProductLike } from "./productClassification";

type RawCompetitorRow = {
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
  sourceUrl?: string;
};

const catalog = competitorCatalogRaw as RawCompetitorRow[];

export type CompetitorLandscapeEntry = {
  brand: string;
  sku: string;
  name: string;
  category: string;
  summary: string;
  confidence: string;
  knownLimitations: string;
  wingmanEquivalent: string;
  sourceUrl: string;
};

export type CompetitorLandscape = {
  productClass: WingmanProductClass;
  entries: CompetitorLandscapeEntry[];
  brandCount: number;
  note: string;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function tag(row: RawCompetitorRow) {
  return `${row.role ?? ""} ${row.technology ?? ""} ${row.category ?? ""} ${row.subcategory ?? ""}`.toLowerCase();
}

function classMatches(row: RawCompetitorRow, productClass: WingmanProductClass): boolean {
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

const confidenceRank: Record<string, number> = { high: 0, medium: 1, low: 2 };

export function getCompetitorLandscape(product: WingmanProductLike): CompetitorLandscape {
  const profile = classifyWingmanProduct(product);
  const productClass = profile.productClass;

  const entries: CompetitorLandscapeEntry[] = catalog
    .filter((row) => classMatches(row, productClass))
    .map((row) => ({
      brand: clean(row.brand || row.manufacturer),
      sku: clean(row.sku || row.model),
      name: clean(row.name || row.model || row.sku),
      category: clean(row.subcategory || row.category),
      summary: clean(row.summary),
      confidence: clean(row.confidence).toLowerCase() || "unverified",
      knownLimitations: clean(row.knownLimitations),
      wingmanEquivalent: clean(row.closestWyrestormSkuOrFamily),
      sourceUrl: clean(row.sourceUrl),
    }))
    .filter((entry) => entry.brand && entry.sku)
    .sort((a, b) => {
      const rankA = confidenceRank[a.confidence] ?? 3;
      const rankB = confidenceRank[b.confidence] ?? 3;
      if (rankA !== rankB) return rankA - rankB;
      return a.brand.localeCompare(b.brand) || a.sku.localeCompare(b.sku);
    });

  const brandCount = new Set(entries.map((entry) => entry.brand)).size;

  const note = entries.length
    ? `${entries.length} SKU${entries.length === 1 ? "" : "s"} across ${brandCount} brand${brandCount === 1 ? "" : "s"} logged against this product class in the shared competitor registry. Specifications are reviewed against public datasheets but can date - confirm the current spec before quoting a comparison, and use the Compare workflow for a full like-for-like breakdown.`
    : "No verified competitor SKUs are logged against this product class yet. Capture the competitor SKU through the Compare workflow the next time one comes up in a deal so this tab builds real coverage instead of a guess.";

  return {
    productClass,
    entries: entries.slice(0, 8),
    brandCount,
    note,
  };
}

export default getCompetitorLandscape;
