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
  // Add BOM-only equipment here, while retaining proposal products as the
  // authority for rows represented in both collections so quantities are not
  // counted twice.
  const schematicProducts = mergeProductsWithBomRows(products, bomRows ?? []);
  const sources = inferSourcesFromProducts(schematicProducts, bomBySku);
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
  const merged = [...products];

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
  bomBySku: Map<string, { description: string; role: string }>,
): SchematicEndpointBrief[] {
  const sources: SchematicEndpointBrief[] = [];
  let encoderCapacity = 0;
  let lastEncoderSku = "";

  for (const product of products) {
    const kind = productNodeKind({ sku: product.sku });

    if (kind === "av-over-ip-encoder") {
      encoderCapacity += product.quantity ?? 1;
      lastEncoderSku = normaliseSku(product.sku);
    } else if (kind === "av-over-ip-transceiver") {
      encoderCapacity += product.quantity ?? 1;
      lastEncoderSku = normaliseSku(product.sku);
    } else if (kind === "switcher" || kind === "matrix") {
      // Use governed I/O port count — an 8×8 matrix has 8 inputs
      const tech = resolveProductTechnicalData({ sku: product.sku });
      encoderCapacity += (tech.inputCount ?? product.quantity ?? 1);
      lastEncoderSku = normaliseSku(product.sku);
    }
  }

  // Use BOM description for a more descriptive label when available
  const bomEntry = lastEncoderSku ? bomBySku.get(lastEncoderSku) : undefined;
  const baseLabel = bomEntry?.description || lastEncoderSku || "source";

  if (encoderCapacity > 0) {
    for (let i = 0; i < encoderCapacity; i++) {
      sources.push({
        label: encoderCapacity === 1
          ? baseLabel
          : `${baseLabel} ${i + 1}`,
        sku: lastEncoderSku || undefined,
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
  const displays: SchematicEndpointBrief[] = [];
  let decoderCapacity = 0;
  let lastDecoderSku = "";

  // First pass: count AVoIP decoders and transceivers
  for (const product of products) {
    const kind = productNodeKind({ sku: product.sku });

    if (kind === "av-over-ip-decoder") {
      decoderCapacity += product.quantity ?? 1;
      lastDecoderSku = normaliseSku(product.sku);
    } else if (kind === "av-over-ip-transceiver") {
      decoderCapacity += product.quantity ?? 1;
      lastDecoderSku = normaliseSku(product.sku);
    } else if (kind === "display") {
      decoderCapacity += product.quantity ?? 1;
      lastDecoderSku = normaliseSku(product.sku);
    }
  }

  // Second pass: for matrix/switcher without AVoIP, outputs drive displays
  if (decoderCapacity === 0) {
    for (const product of products) {
      const kind = productNodeKind({ sku: product.sku });
      if (kind === "matrix" || kind === "switcher") {
        const tech = resolveProductTechnicalData({ sku: product.sku });
        decoderCapacity += (tech.outputCount ?? product.quantity ?? 1);
        lastDecoderSku = normaliseSku(product.sku);
      }
    }
  }

  const bomEntry = lastDecoderSku ? bomBySku.get(lastDecoderSku) : undefined;
  const baseLabel = bomEntry?.description || lastDecoderSku || "display";

  if (decoderCapacity > 0) {
    for (let i = 0; i < decoderCapacity; i++) {
      displays.push({
        label: decoderCapacity === 1
          ? baseLabel
          : `${baseLabel} ${i + 1}`,
        sku: lastDecoderSku || undefined,
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
