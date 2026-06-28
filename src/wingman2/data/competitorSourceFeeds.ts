import competitorCatalogRaw from "../../../data/catalog/competitor-products.generated.json";

export type CompetitorSourceProduct = {
  sourceName: string;
  sourceCollection: string;
  manufacturer: string;
  sku: string;
  title: string;
  summary: string;
  domain:
    | "AVOIP"
    | "HDBASET"
    | "PRESENTATION"
    | "MATRIX"
    | "VIDEO_WALL"
    | "MULTIVIEW"
    | "USB_EXTENSION"
    | "CONTROL"
    | "WIRELESS_COLLAB"
    | "UNKNOWN";
  role:
    | "Transceiver"
    | "Encoder"
    | "Decoder"
    | "Presentation Switcher"
    | "Matrix"
    | "Video Wall Processor"
    | "Multiview Processor"
    | "Extender"
    | "USB Extender"
    | "Controller"
    | "Wireless Collaboration"
    | "Unknown";
  transport: string;
  family: string;
  maxResolution: string;
  chroma: string;
  latency: string;
  performanceTier: string;
  inputCount?: number;
  outputCount?: number;
  features: Record<string, boolean>;
  sourceUrl?: string;
  evidence: string[];
};

function squash(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalised(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

type GeneratedCompetitor = Record<string, any>;

function generatedDomain(value: unknown): CompetitorSourceProduct["domain"] {
  const domain = String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  const allowed: CompetitorSourceProduct["domain"][] = ["AVOIP", "HDBASET", "PRESENTATION", "MATRIX", "VIDEO_WALL", "MULTIVIEW", "USB_EXTENSION", "CONTROL", "WIRELESS_COLLAB", "UNKNOWN"];
  if (allowed.includes(domain as CompetitorSourceProduct["domain"])) return domain as CompetitorSourceProduct["domain"];
  if (domain.includes("WIRELESS")) return "WIRELESS_COLLAB";
  return "UNKNOWN";
}

function generatedRole(value: unknown): CompetitorSourceProduct["role"] {
  const role = String(value ?? "").trim().toLowerCase();
  const roles: Record<string, CompetitorSourceProduct["role"]> = {
    encoder: "Encoder", decoder: "Decoder", transceiver: "Transceiver", transmitter: "Encoder", receiver: "Decoder",
    matrix: "Matrix", "matrix-switcher": "Matrix", "presentation-switcher": "Presentation Switcher",
    "video-wall-processor": "Video Wall Processor", "multiview-processor": "Multiview Processor",
    extender: "Extender", "extender-kit": "Extender", controller: "Controller",
    "wireless-presentation-hub": "Wireless Collaboration",
  };
  return roles[role] || "Unknown";
}

function generatedFeatures(value: unknown): Record<string, boolean> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, boolean>;
  if (Array.isArray(value)) return Object.fromEntries(value.map((feature) => [squash(feature), true]).filter(([key]) => key));
  return {};
}

export const competitorSourceProducts: CompetitorSourceProduct[] = (competitorCatalogRaw as GeneratedCompetitor[]).map((product) => ({
  sourceName: String(product.sourceTier || "manufacturer-source"),
  sourceCollection: String(product.sourceFile || product.sourceUrl || ""),
  manufacturer: String(product.manufacturer || product.brand || "Unknown"),
  sku: String(product.model || product.sku || ""),
  title: String(product.name || product.model || product.sku || ""),
  summary: String(product.summary || ""),
  domain: generatedDomain(product.technology || product.category),
  role: generatedRole(product.role),
  transport: String(product.transport || ""),
  family: String(product.family || ""),
  maxResolution: String(product.video?.maxResolution || ""),
  chroma: String(product.video?.chroma || ""),
  latency: "",
  performanceTier: String(product.sourceTier || product.approvalStatus || ""),
  inputCount: Number.isFinite(Number(product.routedInputCount)) ? Number(product.routedInputCount) : undefined,
  outputCount: Number.isFinite(Number(product.routedOutputCount)) ? Number(product.routedOutputCount) : undefined,
  features: generatedFeatures(product.features),
  sourceUrl: String(product.sourceUrl || ""),
  evidence: [product.notes, product.knownLimitations].map(String).filter(Boolean),
}));

export function findCompetitorSourceProduct(
  manufacturer: string,
  sku: string,
  sourceUrl = "",
): CompetitorSourceProduct | null {
  const brandKey = squash(manufacturer);
  const skuKey = squash(sku);
  const url = normalised(sourceUrl);

  if (!skuKey) return null;

  const exact = competitorSourceProducts.find((product) => {
    return squash(product.manufacturer) === brandKey && squash(product.sku) === skuKey;
  });

  if (exact) return exact;

  const sourceScoped = competitorSourceProducts.find((product) => {
    const productUrlMatch = url && product.sourceUrl && normalised(product.sourceUrl) === url;
    const collectionMatch = url && (
      normalised(product.sourceCollection) === url ||
      url.includes("avitdirect.co.uk/collections/video") ||
      url.includes("avitdirect.co.uk/collections/video-distribution")
    );

    return Boolean(productUrlMatch || collectionMatch) && squash(product.sku) === skuKey;
  });

  if (sourceScoped) return sourceScoped;

  return null;
}
