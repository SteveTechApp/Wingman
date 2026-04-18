import { getCatalogProducts } from "./repository";
import { getRecommendationCatalogItems, type RecommendationCatalogItem } from "./recommendationCatalog";
import type { CatalogPortCount, CatalogProduct } from "./types";

export type GuruCatalogItem = {
  sku: string;
  name: string;
  family: string;
  category: string;
  role?: string;
  status: "current" | "discontinued" | "unknown";
  summary: string;
  io: string[];
  connectivity: string[];
  control: string[];
  features: string[];
  bestFor: string[];
  sourceUrl: string;
};

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function dedupe(values: unknown[], limit = 12): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const text = tidy(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }

  return out;
}

function formatPorts(ports: CatalogPortCount[] | undefined, label: "input" | "output"): string[] {
  return (ports || [])
    .map((port) => {
      const type = tidy(port.type);
      const count = Math.max(0, Number(port.count) || 0);
      if (!type || count <= 0) return "";
      return `${count}x ${type} ${label}`;
    })
    .filter(Boolean);
}

function mapStatus(status: CatalogProduct["status"]): GuruCatalogItem["status"] {
  if (status === "legacy") return "discontinued";
  if (status === "active") return "current";
  return "unknown";
}

function inferRole(product: CatalogProduct): string {
  const blob = [
    product.sku,
    product.name,
    product.family,
    product.category,
    product.subcategory,
    product.summary,
    ...(product.normalizedTags || []),
  ]
    .map(tidy)
    .join(" ")
    .toLowerCase();

  if (blob.includes("matrix")) return "Matrix";
  if (blob.includes("dongle")) return "Dongle";
  if (blob.includes("controller")) return "Controller";
  if (blob.includes("encoder") || blob.includes("transmitter") || /\btx\b/.test(blob)) return "TX";
  if (blob.includes("decoder") || blob.includes("receiver") || /\brx\b/.test(blob)) return "RX";
  if (blob.includes("endpoint")) return "Endpoint";
  return "";
}

function buildConnectivity(product: CatalogProduct): string[] {
  return dedupe([
    product.transport !== "Unknown" ? product.transport : "",
    product.video?.maxResolution,
    product.video?.hdr ? "HDR" : "",
    ...(product.inputs || []).map((port) => port.type),
    ...(product.outputs || []).map((port) => port.type),
  ]);
}

function buildBestFor(product: CatalogProduct): string[] {
  const blob = [
    product.transport,
    product.category,
    product.subcategory,
    ...(product.normalizedTags || []),
    ...(product.features || []),
  ]
    .map(tidy)
    .join(" ")
    .toLowerCase();

  if (blob.includes("video wall") || blob.includes("videowall")) {
    return ["Control rooms", "Video walls", "Large-format display canvases"];
  }

  if (product.transport === "AVoIP") {
    return ["Corporate AV", "Education", "Distributed AV systems"];
  }

  if (product.transport === "HDBaseT") {
    return ["Meeting rooms", "Classrooms", "Digital signage"];
  }

  if (blob.includes("camera") || blob.includes("ptz") || blob.includes("videobar")) {
    return ["Hybrid UC", "Meeting rooms", "Lecture capture"];
  }

  if (blob.includes("audio") || blob.includes("microphone") || blob.includes("dante")) {
    return ["Boardrooms", "Training rooms", "Audio collaboration spaces"];
  }

  if (blob.includes("matrix") || blob.includes("switcher")) {
    return ["Boardrooms", "Presentation spaces", "Mixed-source rooms"];
  }

  return ["Commercial AV", "Room refresh projects", "System upgrades"];
}

function toGuruCatalogItem(product: CatalogProduct): GuruCatalogItem {
  return {
    sku: product.sku,
    name: tidy(product.name) || product.sku,
    family: tidy(product.family) || "WyreStorm",
    category: tidy(product.subcategory) || tidy(product.category) || "Product",
    role: inferRole(product),
    status: mapStatus(product.status),
    summary: tidy(product.summary) || tidy(product.notes) || tidy(product.name) || `${product.sku} reference product.`,
    io: dedupe([...formatPorts(product.inputs, "input"), ...formatPorts(product.outputs, "output")]),
    connectivity: buildConnectivity(product),
    control: dedupe(product.control || []),
    features: dedupe([...(product.features || []), ...(product.normalizedTags || [])], 16),
    bestFor: buildBestFor(product),
    sourceUrl: tidy(product.sourceUrl) || "https://www.wyrestorm.com/",
  };
}

function toFallbackGuruCatalogItem(item: RecommendationCatalogItem): GuruCatalogItem {
  const blob = `${item.family} ${item.category} ${item.description}`.toLowerCase();

  return {
    sku: item.sku,
    name: item.description,
    family: item.family,
    category: item.category,
    role: blob.includes("controller") ? "Controller" : blob.includes("matrix") ? "Matrix" : "",
    status: "unknown",
    summary: item.description,
    io: [],
    connectivity: dedupe([item.family, item.category]),
    control: blob.includes("control") || blob.includes("controller") ? ["Control"] : [],
    features: dedupe(item.searchText.split("|").map((value) => tidy(value)), 10),
    bestFor: ["Commercial AV", "System refresh projects"],
    sourceUrl: item.sourceUrl || "https://www.wyrestorm.com/",
  };
}

export function getGuruCatalogItems(): GuruCatalogItem[] {
  const products = getCatalogProducts();
  if (products.length > 0) {
    return products
      .map(toGuruCatalogItem)
      .sort((left, right) => left.sku.localeCompare(right.sku));
  }

  return getRecommendationCatalogItems()
    .map(toFallbackGuruCatalogItem)
    .sort((left, right) => left.sku.localeCompare(right.sku));
}

export const guruCatalogItems: GuruCatalogItem[] = getGuruCatalogItems();
export const WYRESTORM_GURU_CATALOG: GuruCatalogItem[] = guruCatalogItems;

export default guruCatalogItems;
