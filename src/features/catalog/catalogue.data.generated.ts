import { getCatalogProducts, type CatalogProduct } from "@/catalog";
import type { CatalogueProduct, CatalogueStatus, CatalogueTechnology } from "./catalogue.types";

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function firstNonEmpty(values: unknown[]): string {
  for (const value of values) {
    const text = tidy(value);
    if (text) return text;
  }
  return "";
}

function includesOne(blob: string, needles: string[]): boolean {
  const haystack = blob.toLowerCase();
  return needles.some((needle) => haystack.includes(needle.toLowerCase()));
}

function mapStatus(status: CatalogProduct["status"]): CatalogueStatus {
  if (status === "legacy") return "Legacy";
  if (status === "draft") return "Coming Soon";
  return "Current";
}

function mapTechnology(product: CatalogProduct): CatalogueTechnology {
  const blob = [
    product.family,
    product.category,
    product.subcategory,
    product.summary,
    ...(product.features || []),
  ]
    .map(tidy)
    .join(" ");

  if (product.transport === "AVoIP" || includesOne(blob, ["networkhd", "avoip", "sdvoe", "multiview"])) {
    return "AV over IP";
  }

  if (product.transport === "HDBaseT" || includesOne(blob, ["hdbaset"])) {
    return "HDBaseT";
  }

  if (includesOne(blob, ["matrix"])) {
    return "Matrix Switching";
  }

  if (product.transport === "USB Extension" || includesOne(blob, ["usb extension", "kvm"])) {
    return "USB / KVM";
  }

  if (includesOne(blob, ["apollo", "presentation", "wireless", "conference", "conferencing", "videobar", "speakerphone", "uc"])) {
    return "Presentation / UC";
  }

  if (includesOne(blob, ["camera", "ptz", "video bar", "videobar"])) {
    return "Cameras / Video Bars";
  }

  if (includesOne(blob, ["audio", "amplifier", "dsp", "speaker", "mic", "microphone", "dante"])) {
    return "Audio";
  }

  if (includesOne(blob, ["control", "touch", "panel", "controller"])) {
    return "Control";
  }

  return "Accessories";
}

function mapApplications(technology: CatalogueTechnology): string[] {
  switch (technology) {
    case "AV over IP":
      return ["Corporate", "Education", "Video Walls"];
    case "HDBaseT":
      return ["Meeting Rooms", "Education", "Digital Signage"];
    case "Matrix Switching":
      return ["Boardrooms", "Control Rooms", "Education"];
    case "Presentation / UC":
      return ["Meeting Rooms", "Hybrid UC", "Education"];
    case "USB / KVM":
      return ["Meeting Rooms", "Control Rooms", "Collaboration"];
    case "Cameras / Video Bars":
      return ["Meeting Rooms", "Hybrid UC", "Education"];
    case "Audio":
      return ["Meeting Rooms", "Education", "Hospitality"];
    case "Control":
      return ["Boardrooms", "Education", "Hospitality"];
    case "Accessories":
    default:
      return ["Boardrooms", "Racks", "Digital Signage"];
  }
}

function mapFeatureTags(product: CatalogProduct): string[] {
  const values = [
    ...(product.features || []),
    ...(product.control || []),
    ...(product.audio || []),
    ...(product.inputs || []).map((item) => item.type),
    ...(product.outputs || []).map((item) => item.type),
    product.video?.maxResolution,
    product.transport,
  ]
    .map(tidy)
    .filter(Boolean);

  return Array.from(new Set(values)).slice(0, 8);
}

function toCatalogueProduct(product: CatalogProduct): CatalogueProduct {
  const technology = mapTechnology(product);

  return {
    sku: product.sku,
    name: firstNonEmpty([product.name, product.summary, product.sku]),
    technology,
    category: firstNonEmpty([product.subcategory, product.category, product.family, "Product"]),
    summary: firstNonEmpty([product.summary, product.name, product.sku]),
    status: mapStatus(product.status),
    applications: mapApplications(technology),
    featureTags: mapFeatureTags(product),
    resolution: tidy(product.video?.maxResolution) || undefined,
    distance: typeof product.distance?.meters === "number" ? `${product.distance.meters}m` : tidy(product.distance?.notes) || undefined,
    transport: tidy(product.transport) || undefined,
  };
}

export const realCatalogueProducts: CatalogueProduct[] = getCatalogProducts().map(toCatalogueProduct);
