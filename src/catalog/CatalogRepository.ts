import { findCatalogProductBySku, getCatalogProducts } from "./repository";
import type { Product, ProductCategory, ProductRole } from "./model";

function inferRole(sku: string, name: string): ProductRole {
  const text = `${sku} ${name}`.toUpperCase();
  if (/\bTRX\b/.test(text)) return "TRX";
  if (/\bTX\b|TRANSMITTER|ENCODER/.test(text)) return "TX";
  if (/\bRX\b|RECEIVER|DECODER/.test(text)) return "RX";
  return "N/A";
}

function mapCategory(value: string): ProductCategory | string {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized.includes("matrix")) return "Matrix";
  if (normalized.includes("switch")) return "Switcher";
  if (normalized.includes("extender")) return "Extender";
  if (normalized.includes("video")) return "VideoWall";
  if (normalized.includes("kvm") || normalized.includes("usb")) return "KVM";
  if (normalized.includes("control") || normalized.includes("touch")) return "Control";
  if (normalized.includes("audio") || normalized.includes("camera") || normalized.includes("amplifier")) return "Audio";
  if (normalized.includes("accessor") || normalized.includes("cabling")) return "Accessories";
  if (normalized.includes("avoip") || normalized.includes("networkhd")) return "AVoIP";
  return value || "Other";
}

function mapProduct(sku: string): Product | undefined {
  const row = findCatalogProductBySku(sku);
  if (!row) return undefined;

  return {
    sku: row.sku,
    name: row.name,
    family: row.family,
    category: mapCategory(row.category),
    role: inferRole(row.sku, row.name),
    lifecycle: row.status === "legacy" ? "legacy" : "current",
    tags: row.normalizedTags || row.features || [],
    features: row.features || [],
    video: row.video
      ? {
          maxResolution: row.video.maxResolution,
          hdr: row.video.hdr,
        }
      : undefined,
    io: {
      inputs: Array.isArray(row.inputs) ? row.inputs.reduce((sum, port) => sum + (Number(port.count) || 0), 0) : 0,
      outputs: Array.isArray(row.outputs) ? row.outputs.reduce((sum, port) => sum + (Number(port.count) || 0), 0) : 0,
    },
    notes: row.notes,
  };
}

export function listAll(): Product[] {
  return getCatalogProducts()
    .map((item) => mapProduct(item.sku))
    .filter((item): item is Product => item != null);
}

export function bySku(sku: string): Product | undefined {
  return mapProduct(sku);
}

export function isSelectable(product: Product): boolean {
  return (product.lifecycle || "current") !== "eol";
}
