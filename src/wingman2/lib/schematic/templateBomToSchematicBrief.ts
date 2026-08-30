/**
 * Converts a RoomTemplate's BOM rows + metadata into a SchematicProjectBrief
 * so the native schematic engine (buildWingmanSchematic) can produce a
 * topology-aware connectivity diagram for the template page.
 *
 * This is the missing link between template data and the native engine:
 * the engine expects sources, displays, products, and requirements —
 * the template only has BOM rows. This adapter infers the brief from the
 * BOM classification, SKU patterns, and template metadata.
 */

import type { RoomTemplate, TemplateBomRow } from "../roomTemplates";
import type {
  SchematicEndpointBrief,
  SchematicProductBrief,
  SchematicProjectBrief,
} from "./schematicTypes";
import { normaliseSku, productNodeKind } from "./schematicProductRules";

const includedStatuses = new Set(["included", "optional", "validate"]);

function activeRows(rows: TemplateBomRow[]): TemplateBomRow[] {
  return rows.filter(
    (row) => includedStatuses.has(row.status) && row.qty > 0,
  );
}

function wyrestormRows(rows: TemplateBomRow[]): TemplateBomRow[] {
  return activeRows(rows).filter(
    (row) => !row.sku.startsWith("BY-OTHERS"),
  );
}

/**
 * Infer source count from BOM rows that look like inputs/transmitters,
 * or from the template's application text if no explicit source rows exist.
 */
function inferSources(
  template: RoomTemplate,
  rows: TemplateBomRow[],
): SchematicEndpointBrief[] {
  const sources: SchematicEndpointBrief[] = [];

  // Count encoder/switcher capacity: each encoder or switcher input is a
  // source slot. The native engine wires source endpoints → encoders, so
  // we need one source endpoint per encoder input.
  let encoderCapacity = 0;
  for (const row of activeRows(rows)) {
    if (row.sku.startsWith("BY-OTHERS")) continue;
    const kind = productNodeKind({ sku: row.sku });
    if (kind === "av-over-ip-encoder") {
      encoderCapacity += row.qty; // each encoder = 1 source slot
    } else if (kind === "av-over-ip-transceiver") {
      encoderCapacity += row.qty; // each TRX = 1 source slot
    } else if (kind === "switcher" || kind === "matrix") {
      encoderCapacity += row.qty; // each switcher input = 1 source slot
    }
  }

  if (encoderCapacity > 0) {
    // Create one source endpoint per encoder slot
    for (let i = 0; i < encoderCapacity; i++) {
      sources.push({
        label: encoderCapacity === 1 ? "Room source" : `Room source ${i + 1}`,
      });
    }
  }

  // Fallback: infer from application text when no encoder-based count exists
  if (sources.length === 0) {
    const text = `${template.application} ${template.customerNarrative}`.toLowerCase();
    if (text.includes("laptop") || text.includes("byod") || text.includes("byom")) {
      sources.push({ label: "Presenter laptop" });
    }
    if (text.includes("wireless")) {
      sources.push({ label: "Wireless presentation" });
    }
    if (text.includes("media player") || text.includes("signage")) {
      sources.push({ label: "Media player / signage" });
    }
    if (text.includes("camera") || text.includes("ptz")) {
      sources.push({ label: "Room camera" });
    }
    if (sources.length === 0) {
      sources.push({ label: "Room source" });
    }
  }

  return sources;
}

/**
 * Infer display count from BOM rows that look like outputs/receivers,
 * or from the template's application text.
 */
function inferDisplays(
  template: RoomTemplate,
  rows: TemplateBomRow[],
): SchematicEndpointBrief[] {
  const displays: SchematicEndpointBrief[] = [];

  // Count decoder/switcher capacity: each decoder output is a display slot.
  let decoderCapacity = 0;
  for (const row of activeRows(rows)) {
    if (row.sku.startsWith("BY-OTHERS")) continue;
    const kind = productNodeKind({ sku: row.sku });
    if (kind === "av-over-ip-decoder") {
      decoderCapacity += row.qty; // each decoder = 1 display slot
    } else if (kind === "av-over-ip-transceiver") {
      decoderCapacity += row.qty; // each TRX = 1 display slot
    } else if (kind === "display") {
      decoderCapacity += row.qty; // explicit display row
    }
  }

  // For matrix/switcher without AVoIP, the outputs drive displays directly
  if (decoderCapacity === 0) {
    for (const row of activeRows(rows)) {
      if (row.sku.startsWith("BY-OTHERS")) continue;
      const kind = productNodeKind({ sku: row.sku });
      if (kind === "matrix" || kind === "switcher") {
        decoderCapacity += row.qty;
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
    const text = `${template.application} ${template.customerNarrative}`.toLowerCase();
    if (text.includes("video wall") || text.includes("led wall")) {
      displays.push({ label: "Video wall canvas" });
    } else if (text.includes("dual") || text.includes("two display")) {
      displays.push({ label: "Room display", quantity: 2 });
    } else {
      displays.push({ label: "Room display" });
    }
  }

  return displays;
}

/**
 * Extract camera endpoints from BOM rows with camera-like SKUs or roles.
 */
function inferCameras(rows: TemplateBomRow[]): SchematicEndpointBrief[] {
  return activeRows(rows)
    .filter((row) => {
      const kind = productNodeKind({ sku: row.sku });
      return kind === "camera";
    })
    .map((row) => ({
      label: row.description,
      sku: row.sku,
      quantity: row.qty,
    }));
}

/**
 * Extract speakerphone endpoints from BOM rows.
 */
function inferSpeakerphones(rows: TemplateBomRow[]): SchematicEndpointBrief[] {
  return activeRows(rows)
    .filter((row) => {
      const kind = productNodeKind({ sku: row.sku });
      return kind === "speakerphone";
    })
    .map((row) => ({
      label: row.description,
      sku: row.sku,
      quantity: row.qty,
    }));
}

/**
 * Extract touch panel endpoints from BOM rows.
 */
function inferTouchPanels(rows: TemplateBomRow[]): SchematicEndpointBrief[] {
  return activeRows(rows)
    .filter((row) => {
      const kind = productNodeKind({ sku: row.sku });
      return kind === "touch-panel";
    })
    .map((row) => ({
      label: row.description,
      sku: row.sku,
      quantity: row.qty,
    }));
}

/**
 * Build product briefs from all active WyreStorm BOM rows.
 */
function buildProducts(rows: TemplateBomRow[]): SchematicProductBrief[] {
  const bySku = new Map<string, SchematicProductBrief>();

  for (const row of wyrestormRows(rows)) {
    const sku = normaliseSku(row.sku);
    const existing = bySku.get(sku);
    if (existing) {
      existing.quantity = (existing.quantity ?? 1) + row.qty;
    } else {
      bySku.set(sku, {
        sku,
        label: row.description,
        quantity: row.qty,
      });
    }
  }

  return Array.from(bySku.values());
}

/**
 * Infer whether USB, audio, control, and network are required from
 * the template's BOM rows and metadata text.
 */
function inferRequirements(
  template: RoomTemplate,
  rows: TemplateBomRow[],
): {
  usbRequired: boolean;
  audioRequired: boolean;
  controlRequired: boolean;
  networkAvailable: boolean;
} {
  const blob = `${template.application} ${template.customerNarrative} ${template.architecture}`;
  const skuBlob = activeRows(rows)
    .map((r) => `${r.sku} ${r.role} ${r.description}`)
    .join(" ")
    .toLowerCase();
  const fullText = `${blob} ${skuBlob}`.toLowerCase();

  const usbRequired =
    fullText.includes("usb") ||
    fullText.includes("byod") ||
    fullText.includes("byom") ||
    fullText.includes("teams") ||
    fullText.includes("zoom") ||
    inferCameras(rows).length > 0 ||
    inferSpeakerphones(rows).length > 0;

  const audioRequired =
    fullText.includes("audio") ||
    fullText.includes("dante") ||
    fullText.includes("speaker") ||
    fullText.includes("microphone") ||
    fullText.includes("dsp") ||
    inferSpeakerphones(rows).length > 0;

  const controlRequired =
    fullText.includes("control") ||
    fullText.includes("rs-232") ||
    fullText.includes("cec") ||
    fullText.includes("touch panel") ||
    inferTouchPanels(rows).length > 0;

  const networkAvailable = !fullText.includes("no network");

  return { usbRequired, audioRequired, controlRequired, networkAvailable };
}

/**
 * Main adapter: converts a RoomTemplate + its current BOM row state
 * into a SchematicProjectBrief that the native schematic engine can consume.
 */
export function templateBomToSchematicBrief(
  template: RoomTemplate,
  rows: TemplateBomRow[],
): SchematicProjectBrief {
  const products = buildProducts(rows);
  const sources = inferSources(template, rows);
  const displays = inferDisplays(template, rows);
  const cameras = inferCameras(rows);
  const speakerphones = inferSpeakerphones(rows);
  const touchPanels = inferTouchPanels(rows);
  const reqs = inferRequirements(template, rows);

  return {
    id: `template-${template.id}`,
    title: template.name,
    roomType: template.application,
    sources,
    displays,
    cameras,
    speakerphones,
    touchPanels,
    products,
    ...reqs,
    networkAvailable: reqs.networkAvailable,
  };
}
