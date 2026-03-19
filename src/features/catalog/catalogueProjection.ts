import type { CatalogProduct } from "@/catalog";

import type { CatalogueProduct, CatalogueStatus, CatalogueTechnology } from "./catalogue.types";

const GENERIC_NORMALIZED_TAGS = new Set([
  "audio",
  "audio-device",
  "avoip",
  "camera",
  "control",
  "distribution",
  "extender",
  "extender-endpoint",
  "matrix",
  "other",
  "switcher",
  "uc",
]);

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function tidyLower(value: unknown): string {
  return tidy(value).toLowerCase();
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

function buildProductBlob(product: CatalogProduct): string {
  return [
    product.sku,
    product.name,
    product.family,
    product.category,
    product.subcategory,
    product.summary,
    product.transport,
    ...(product.features || []),
    ...(product.audio || []),
    ...(product.control || []),
    ...(product.normalizedTags || []),
    ...(product.inputs || []).map((item) => item.type),
    ...(product.outputs || []).map((item) => item.type),
  ]
    .map(tidy)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getNormalizedTagSet(product: CatalogProduct): Set<string> {
  return new Set((product.normalizedTags || []).map(tidyLower).filter(Boolean));
}

function hasNormalizedTag(tagSet: Set<string>, ...needles: string[]): boolean {
  return needles.some((needle) => tagSet.has(needle));
}

function isAccessoryLikeProduct(product: CatalogProduct, blob: string): boolean {
  const family = tidyLower(product.family);
  const category = tidyLower(product.category);

  if (family === "accessories" || family === "cables") {
    return true;
  }

  if (category === "accessories" || category === "cables") {
    return true;
  }

  return /\bmount(?:ing)?\b|\bbracket\b|\badapt(?:or|er)\b|\bcable\b|\bhub\b/.test(blob);
}

function isAvoipProduct(product: CatalogProduct, blob: string, tagSet: Set<string>): boolean {
  return (
    product.transport === "AVoIP" ||
    hasNormalizedTag(tagSet, "avoip", "avoip-encoder", "avoip-decoder", "avoip-endpoint", "sdvoe") ||
    includesOne(blob, ["networkhd", "av over ip", "avoip", "sdvoe", "dante av-a"])
  );
}

function isHdbasetProduct(product: CatalogProduct, blob: string): boolean {
  return product.transport === "HDBaseT" || /\bhdbaset\b|\bhdbt\b/.test(blob);
}

function isMatrixProduct(blob: string, tagSet: Set<string>): boolean {
  return hasNormalizedTag(tagSet, "matrix-switch", "matrix-kit", "splitter") || /\bmatrix(?: switch| switcher| kit| chassis)?\b/.test(blob);
}

function isUsbCapableProduct(product: CatalogProduct, blob: string, tagSet: Set<string>): boolean {
  return (
    product.transport === "USB Extension" ||
    hasNormalizedTag(tagSet, "usb-microphone", "usb-casting-dongle", "webcam") ||
    /\busb(?:[- ]?c|[- ]?a|[- ]?b|[- ]?2\.0|[- ]?3\.0|[- ]?3\.2|\b)|\bkvm\b|\bhid\b/.test(blob)
  );
}

function isUsbCentricProduct(product: CatalogProduct, blob: string): boolean {
  return (
    product.transport === "USB Extension" ||
    /\bkvm\b|\busb hub\b|\busb extension\b|\busb extender\b|\bhid\b/.test(blob)
  );
}

function isCameraVideoBarProduct(product: CatalogProduct, blob: string, tagSet: Set<string>): boolean {
  if (hasNormalizedTag(tagSet, "camera", "webcam", "ptz-camera", "ndi-camera", "streaming-camera")) {
    return true;
  }

  if (isAccessoryLikeProduct(product, blob)) {
    return false;
  }

  return /\bvideo bar\b|\bvideobar\b|\bweb ?cam\b|\bcamera\b|\bptz\b/.test(blob);
}

function isUcProduct(product: CatalogProduct, blob: string): boolean {
  if (isAccessoryLikeProduct(product, blob)) {
    return false;
  }

  return includesOne(blob, [
    "apollo",
    "presentation",
    "conference",
    "conferencing",
    "wireless",
    "speakerphone",
    "airplay",
    "miracast",
    "byod",
    "byom",
    "video bar",
    "videobar",
    "zoom certified",
    "teams",
    "uc",
  ]);
}

function isAudioProduct(tagSet: Set<string>, blob: string): boolean {
  return (
    hasNormalizedTag(tagSet, "audio", "audio-device", "speakerphone", "usb-microphone", "microphone-hub", "dante-amplifier") ||
    /\bdsp\b|\bamplifier\b|\bmicrophone\b|\bspeakerphone\b/.test(blob)
  );
}

function isControlProduct(tagSet: Set<string>, blob: string): boolean {
  return hasNormalizedTag(tagSet, "controller", "touch-controller", "avoip-controller") || /\bcontroller\b|\btouch(?:screen|pad)?\b/.test(blob);
}

function derivePrimaryTechnology(product: CatalogProduct, blob: string, tagSet: Set<string>): CatalogueTechnology {
  if (isCameraVideoBarProduct(product, blob, tagSet)) {
    return "Cameras / Video Bars";
  }

  if (isUcProduct(product, blob)) {
    return "Presentation / UC";
  }

  if (isMatrixProduct(blob, tagSet)) {
    return "Matrix Switching";
  }

  if (isUsbCentricProduct(product, blob)) {
    return "USB / KVM";
  }

  if (isAvoipProduct(product, blob, tagSet)) {
    return "AV over IP";
  }

  if (isHdbasetProduct(product, blob)) {
    return "HDBaseT";
  }

  if (isAudioProduct(tagSet, blob)) {
    return "Audio";
  }

  if (isControlProduct(tagSet, blob)) {
    return "Control";
  }

  return "Accessories";
}

export function deriveTechnologyTags(product: CatalogProduct): CatalogueTechnology[] {
  const blob = buildProductBlob(product);
  const tagSet = getNormalizedTagSet(product);
  const tags = new Set<CatalogueTechnology>();
  const primary = derivePrimaryTechnology(product, blob, tagSet);

  tags.add(primary);

  if (isAvoipProduct(product, blob, tagSet)) tags.add("AV over IP");
  if (isHdbasetProduct(product, blob)) tags.add("HDBaseT");
  if (isMatrixProduct(blob, tagSet)) tags.add("Matrix Switching");
  if (isUsbCapableProduct(product, blob, tagSet)) tags.add("USB / KVM");
  if (isCameraVideoBarProduct(product, blob, tagSet)) tags.add("Cameras / Video Bars");
  if (isUcProduct(product, blob)) tags.add("Presentation / UC");
  if (isAudioProduct(tagSet, blob)) tags.add("Audio");
  if (isControlProduct(tagSet, blob)) tags.add("Control");

  if (tags.size === 0) {
    tags.add("Accessories");
  }

  return [primary, ...Array.from(tags).filter((item) => item !== primary)];
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
    ...((product.normalizedTags || []).filter((tag) => !GENERIC_NORMALIZED_TAGS.has(tidyLower(tag)))),
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

  return Array.from(new Set(values)).slice(0, 12);
}

export function toCatalogueProduct(product: CatalogProduct): CatalogueProduct {
  const technologyTags = deriveTechnologyTags(product);
  const technology = technologyTags[0] ?? "Accessories";

  return {
    sku: product.sku,
    name: firstNonEmpty([product.name, product.summary, product.sku]),
    technology,
    technologyTags,
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
