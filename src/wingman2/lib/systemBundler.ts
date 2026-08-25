// Detects missing complementary products in a BOM and suggests additions
// to complete the system design. Used by the "Complete this system" panel
// on the Recommendations page.

import type { StoredProductSelection } from "../data/projectStore";

export type BundleSuggestion = {
  /** SKU to suggest adding. */
  sku: string;
  /** Human-readable product name. */
  name: string;
  /** Why this product is needed. */
  reason: string;
  /** Severity: blocker = system won't work without it, warning = may be needed. */
  severity: "blocker" | "warning";
  /** The SKU this suggestion is paired with. */
  pairedWith?: string;
  /** Category for grouping suggestions. */
  category: "signal-path" | "uc-completeness" | "audio" | "control" | "cable";
};

// ── SKU pattern helpers ──────────────────────────────────────────────

function skuUpper(product: StoredProductSelection): string {
  return String(product.sku || "").toUpperCase().trim();
}

/** NetworkHD TX encoder (not TRX transceiver). */
function isNhdTx(sku: string): boolean {
  return /^NHD-\d+-TX(?:-\w+)?$/.test(sku) && !/TRX|TXRX/.test(sku);
}

/** NetworkHD RX decoder. */
function isNhdRx(sku: string): boolean {
  return /^NHD-\d+-RX/.test(sku);
}

/** HDBaseT extender TX (not NetworkHD). */
function isHdbtTx(sku: string): boolean {
  return /^(?:EX|TX)-\d+/.test(sku) && !/^NHD-/.test(sku);
}

/** HDBaseT extender RX (not NetworkHD). */
function isHdbtRx(sku: string): string | null {
  const match = sku.match(/^(?:EX|RX)-(\d+)/);
  return match ? match[0] : null;
}

/** Matrix switcher SKU. */
function isMatrix(sku: string): boolean {
  return /^MX[V]?-\d{4}/.test(sku);
}

/** UC product (soundbar, speakerphone, UC peripheral). */
function isUcProduct(sku: string): boolean {
  return /^APO-(?:\d+-UC|VX\d+|DG)/.test(sku) || /^HALO-VX/.test(sku);
}

/** Amplifier. */
function isAmplifier(sku: string): boolean {
  return /^AMP-/.test(sku);
}

/** Camera. */
function isCamera(sku: string): boolean {
  return /^CAM-/.test(sku);
}

// ── Family matching for TX/RX pairing ────────────────────────────────

/**
 * Extract the family number from an NHD SKU for pairing.
 * NHD-120-TX pairs with NHD-120-RX, NHD-500-TX pairs with NHD-500-RX, etc.
 */
function nhdFamilyNumber(sku: string): string | null {
  const match = sku.match(/^NHD-(\d+)/);
  return match ? match[1] : null;
}

// ── Main bundler ─────────────────────────────────────────────────────

export function suggestComplementaryProducts(
  products: StoredProductSelection[],
  requirementText?: string,
): BundleSuggestion[] {
  const suggestions: BundleSuggestion[] = [];
  const skus = products.map(skuUpper);
  const skusSet = new Set(skus);

  // ── 1. NetworkHD TX without matching RX ────────────────────────────
  for (const product of products) {
    const sku = skuUpper(product);
    if (!isNhdTx(sku)) continue;

    const family = nhdFamilyNumber(sku);
    const hasMatchingRx = skus.some((s) => isNhdRx(s) && nhdFamilyNumber(s) === family);
    const hasAnyRx = skus.some((s) => isNhdRx(s));

    if (!hasMatchingRx) {
      const suggestedRx = family ? `NHD-${family}-RX` : "NHD-120-RX";
      suggestions.push({
        sku: suggestedRx,
        name: `NetworkHD ${family || "100"} decoder`,
        reason: `${sku} is an encoder with no decoder in the BOM. Add the matching ${suggestedRx} to terminate the signal path to a display.`,
        severity: "blocker",
        pairedWith: sku,
        category: "signal-path",
      });
    }
  }

  // ── 2. HDBaseT TX without matching RX ──────────────────────────────
  for (const product of products) {
    const sku = skuUpper(product);
    if (!isHdbtTx(sku)) continue;

    // Check if there's a matching RX in the BOM
    const hasMatchingRx = skus.some((s) => {
      const rxBase = s.replace(/-KIT$/, "").replace(/-TX$/, "");
      return s.startsWith(rxBase.replace(/TX/, "RX")) || s === sku.replace(/-TX$/, "-RX");
    });

    if (!hasMatchingRx) {
      // Check if it's a KIT (already includes RX)
      if (sku.includes("-KIT")) continue;

      const suggestedRx = sku.replace(/-TX$/, "-RX").replace(/^TX-/, "RX-");
      suggestions.push({
        sku: suggestedRx,
        name: `Matching receiver for ${sku}`,
        reason: `${sku} is a transmitter with no receiver in the BOM. Add the paired receiver to complete the signal path.`,
        severity: "blocker",
        pairedWith: sku,
        category: "signal-path",
      });
    }
  }

  // ── 3. UC product without camera (when room needs one) ─────────────
  const ucProducts = skus.filter(isUcProduct);
  const cameraProducts = skus.filter(isCamera);
  const needsCamera = /camera|ptz|video|conferenc|teams|zoom|byod|byom/i.test(requirementText ?? "");

  if (ucProducts.length > 0 && cameraProducts.length === 0 && needsCamera) {
    // UC soundbars like APO-VX20 have built-in cameras; APO-210-UC doesn't
    const needsExternalCamera = ucProducts.some((sku) =>
      /^APO-210/.test(sku) || /^APO-DG/.test(sku),
    );
    if (needsExternalCamera) {
      suggestions.push({
        sku: "CAM-210-PTZ",
        name: "WyreStorm PTZ camera",
        reason: "The UC product in the BOM does not include a built-in camera. Add a camera so remote participants can see the room.",
        severity: "blocker",
        pairedWith: ucProducts[0],
        category: "uc-completeness",
      });
    }
  }

  // ── 4. Amplifier without any audio destination ─────────────────────
  const ampProducts = skus.filter(isAmplifier);
  if (ampProducts.length > 0) {
    const hasSpeakers = skus.some((s) => /SPEAKER|SPK|LS-/i.test(s));
    const hasDante = skus.some((s) => /DNT|DANTE/i.test(s));
    if (!hasSpeakers && !hasDante) {
      suggestions.push({
        sku: "speakers",
        name: "Confirm speaker load and type",
        reason: `${ampProducts[0]} is in the BOM but no speakers or Dante destination are selected. Confirm speaker type (Low Z, 70V/100V), quantity and zones before quoting.`,
        severity: "warning",
        pairedWith: ampProducts[0],
        category: "audio",
      });
    }
  }

  // ── 5. Matrix without HDBaseT receivers for long runs ──────────────
  const matrixProducts = skus.filter(isMatrix);
  const extenderKits = skus.filter((s) => s.includes("-KIT"));
  if (matrixProducts.length > 0 && extenderKits.length === 0) {
    const needsReceivers = /hdbaset|long run|remote display|cable run/i.test(requirementText ?? "");
    if (needsReceivers) {
      suggestions.push({
        sku: "receivers",
        name: "Add HDBaseT receivers for remote displays",
        reason: "The matrix is selected but no extender kits or receivers are in the BOM. If displays are more than 10m from the rack, add HDBaseT receivers.",
        severity: "warning",
        pairedWith: matrixProducts[0],
        category: "signal-path",
      });
    }
  }

  // ── 6. UC without control/touch panel ──────────────────────────────
  const hasControl = skus.some((s) => /^SYN-/.test(s));
  if (ucProducts.length > 0 && !hasControl) {
    suggestions.push({
      sku: "SYN-KEY10",
      name: "Room control keypad",
      reason: "The UC system has no room control selected. A touch panel or keypad gives users a simple way to start calls, select sources and adjust volume.",
      severity: "warning",
      pairedWith: ucProducts[0],
      category: "control",
    });
  }

  return suggestions;
}
