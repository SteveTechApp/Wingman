/**
 * proposalSchematicBrief — Converts proposal products into a
 * SchematicProjectBrief using governed product I/O data.
 *
 * This is the proposal-export equivalent of templateBomToSchematicBrief:
 * instead of inferring source/display counts from SKU text patterns, it
 * reads the actual inputCount/outputCount from the governed product
 * technical profiles so matrices, switchers, and AVoIP transceivers
 * produce the correct number of source and display endpoints.
 *
 * Updated to include BY-OTHERS equipment and use descriptive labels
 * so the DOCX schematic proves real connectivity, not generic placeholders.
 */

import type { StoredProductSelection } from "../../data/projectStore";
import type {
  SchematicEndpointBrief,
  SchematicProductBrief,
  SchematicProjectBrief,
} from "./schematicTypes";
import { normaliseSku, productNodeKind } from "./schematicProductRules";
import { resolveProductTechnicalData } from "../governedProductTechnicalData";

/**
 * Build a SchematicProjectBrief from proposal products using governed
 * I/O data. This ensures matrices show N inputs and M outputs instead
 * of just chassis quantity.
 *
 * @param title Project / room name
 * @param products Product selections stored on the proposal
 * @param bomRows Optional BOM rows, including equipment supplied by others
 */
export function proposalSchematicBrief(
  title: string,
  products: StoredProductSelection[],
  bomRows?: Array<{ sku: string; description: string; role: string; qty: number }>,
): SchematicProjectBrief {
  // Build a lookup from BOM rows for richer labels
  const bomBySku = new Map<string, { description: string; role: string }>();
  for (const row of bomRows ?? []) {
    const key = normaliseSku(row.sku);
    if (!bomBySku.has(key)) bomBySku.set(key, { description: row.description, role: row.role });
  }

  // Template proposals deliberately omit BY-OTHERS rows from proposal.products.
  // Add BOM-only equipment here and use the current equipment schedule for
  // quantities represented in both collections.
  const schematicProducts = mergeProductsWithBomRows(products, bomRows ?? []);
  const sources = inferSourcesFromProducts(schematicProducts);
  const displays = inferDisplaysFromProducts(schematicProducts, bomBySku);
  const productsBrief = buildProductsBrief(schematicProducts);

  return {
    title,
    sources,
    displays,
    products: productsBrief,
    usbRequired: productsBrief.some((p) =>
      /usb|camera/i.test(`${p.sku} ${p.label}`),
    ),
    audioRequired: productsBrief.some((p) =>
      /audio|dante|dsp|amplifier|speaker/i.test(`${p.sku} ${p.label}`),
    ),
    controlRequired: productsBrief.some((p) =>
      /control|touch|keypad|crestron|amx/i.test(`${p.sku} ${p.label}`),
    ),
    networkAvailable: productsBrief.some((p) =>
      /switch|network|avoi|nhd|nvx/i.test(`${p.sku} ${p.label}`),
    ),
  };
}

function mergeProductsWithBomRows(
  products: StoredProductSelection[],
  bomRows: Array<{ sku: string; description: string; role: string; qty: number }>,
): StoredProductSelection[] {
  const representedSkus = new Set(products.map((product) => normaliseSku(product.sku)));
  const merged = products.map((product) => {
    const row = bomRows.find((item) => normaliseSku(item.sku) === normaliseSku(product.sku));
    return row ? { ...product, quantity: row.qty } : product;
  }).filter((product) => (product.quantity ?? 1) > 0);

  for (const row of bomRows) {
    const sku = normaliseSku(row.sku);
    if (!sku || row.qty <= 0 || representedSkus.has(sku)) continue;
    merged.push({
      sku,
      title: row.description || row.role || row.sku,
      quantity: row.qty,
    });
    representedSkus.add(sku);
  }

  return merged;
}

// ─── Source inference ────────────────────────────────────────────────────────

function inferSourcesFromProducts(
  products: StoredProductSelection[],
): SchematicEndpointBrief[] {
  const sources: SchematicEndpointBrief[] = [];
  let encoderCapacity = 0;

  for (const product of products) {
    const kind = productNodeKind({ sku: product.sku });

    if (kind === "av-over-ip-encoder") {
      encoderCapacity += product.quantity ?? 1;
    } else if (kind === "av-over-ip-transceiver") {
      encoderCapacity += product.quantity ?? 1;
    } else if (kind === "switcher" || kind === "matrix") {
      // Use governed I/O port count — an 8×8 matrix has 8 inputs
      const tech = resolveProductTechnicalData({ sku: product.sku });
      encoderCapacity += (tech.inputCount ?? 1) * (product.quantity ?? 1);
    }
  }

  // Device identities are not established by encoder input capacity.

  if (encoderCapacity > 0) {
    for (let i = 0; i < encoderCapacity; i++) {
      sources.push({
        label: `Source ${i + 1} (confirm)`,
      });
    }
  }

  if (sources.length === 0) {
    sources.push({ label: "Room source" });
  }

  return sources;
}

// ─── Display inference ───────────────────────────────────────────────────────

function inferDisplaysFromProducts(
  products: StoredProductSelection[],
  bomBySku: Map<string, { description: string; role: string }>,
): SchematicEndpointBrief[] {
  const explicitDisplays = products.filter((product) => productNodeKind({ sku: product.sku }) === "display" || (product.sku.startsWith("BY-OTHERS") && /display|projector|screen/i.test(`${product.sku} ${product.title} ${bomBySku.get(normaliseSku(product.sku))?.role || ""}`)));
  if (explicitDisplays.length) return explicitDisplays.map((product) => ({ label: bomBySku.get(normaliseSku(product.sku))?.description || product.title || "Display", quantity: product.quantity ?? 1 }));
  const displays: SchematicEndpointBrief[] = [];
  let decoderCapacity = 0;

  // First pass: count AVoIP decoders and transceivers
  for (const product of products) {
    const kind = productNodeKind({ sku: product.sku });

    if (kind === "av-over-ip-decoder") {
      decoderCapacity += product.quantity ?? 1;
    } else if (kind === "av-over-ip-transceiver") {
      decoderCapacity += product.quantity ?? 1;
    } else if (kind === "display") {
      decoderCapacity += product.quantity ?? 1;
    }
  }

  // Second pass: for matrix/switcher without AVoIP, outputs drive displays
  if (decoderCapacity === 0) {
    for (const product of products) {
      const kind = productNodeKind({ sku: product.sku });
      if (kind === "matrix" || kind === "switcher") {
        const tech = resolveProductTechnicalData({ sku: product.sku });
        decoderCapacity += (tech.outputCount ?? 1) * (product.quantity ?? 1);
      }
    }
  }

  if (decoderCapacity > 0) {
    for (let i = 0; i < decoderCapacity; i++) {
      displays.push({
        label: `Display ${i + 1} (confirm)`,
      });
    }
  }

  if (displays.length === 0) {
    displays.push({ label: "Room display" });
  }

  return displays;
}

// ─── Product briefs ──────────────────────────────────────────────────────────

function buildProductsBrief(
  products: StoredProductSelection[],
): SchematicProductBrief[] {
  return products
    .filter((p) => p.sku)
    .map((p) => ({
      sku: normaliseSku(p.sku),
      label: p.title || p.sku,
      quantity: p.quantity ?? 1,
    }));
}
