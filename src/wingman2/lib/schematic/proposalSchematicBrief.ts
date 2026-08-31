/**
 * proposalSchematicBrief — Converts proposal products into a
 * SchematicProjectBrief using governed product I/O data.
 *
 * This is the proposal-export equivalent of templateBomToSchematicBrief:
 * instead of inferring source/display counts from SKU text patterns, it
 * reads the actual inputCount/outputCount from the governed product
 * technical profiles so matrices, switchers, and AVoIP transceivers
 * produce the correct number of source and display endpoints.
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
 */
export function proposalSchematicBrief(
  title: string,
  products: StoredProductSelection[],
): SchematicProjectBrief {
  const sources = inferSourcesFromProducts(products);
  const displays = inferDisplaysFromProducts(products);
  const productsBrief = buildProductsBrief(products);

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
      encoderCapacity += (tech.inputCount ?? product.quantity ?? 1);
    }
  }

  if (encoderCapacity > 0) {
    for (let i = 0; i < encoderCapacity; i++) {
      sources.push({
        label: encoderCapacity === 1 ? "Room source" : `Room source ${i + 1}`,
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
): SchematicEndpointBrief[] {
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
        decoderCapacity += (tech.outputCount ?? product.quantity ?? 1);
      }
    }
  }

  if (decoderCapacity > 0) {
    for (let i = 0; i < decoderCapacity; i++) {
      displays.push({
        label: decoderCapacity === 1 ? "Room display" : `Room display ${i + 1}`,
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
    .filter((p) => p.sku && !p.sku.startsWith("BY-OTHERS"))
    .map((p) => ({
      sku: normaliseSku(p.sku),
      label: p.title || p.sku,
      quantity: p.quantity ?? 1,
    }));
}
