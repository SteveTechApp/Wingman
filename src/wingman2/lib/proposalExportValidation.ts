/**
 * ProposalExportValidation — Gates proposal export on reach, power budget,
 * and chain completeness checks.
 *
 * Returns a list of blockers that must be resolved before allowing DOCX/PDF
 * generation. Non-blocking warnings are also returned for informational
 * purposes.
 */
import type {
  DiscoveryConversationItem,
  StoredProductSelection,
  StoredProjectProposal,
} from "../data/projectStore";
import type { SalesBomRow } from "./salesReadiness";
import { powerBudgetSummary } from "./powerBudget";
import { resolveProductTechnicalData } from "./governedProductTechnicalData";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExportValidationBlocker = {
  id: string;
  domain: "reach" | "power" | "chain" | "lifecycle" | "discovery";
  severity: "blocker" | "warning";
  sku?: string;
  message: string;
  fix: string;
};

export type ExportValidationResult = {
  allowed: boolean;
  blockers: ExportValidationBlocker[];
  warnings: ExportValidationBlocker[];
  summary: string;
};

// ─── Reach Validation ─────────────────────────────────────────────────────────

function validateReach(
  products: StoredProductSelection[],
  topology?: { connections: Array<{ lengthMetres?: number; services?: string[] }> },
): ExportValidationBlocker[] {
  const blockers: ExportValidationBlocker[] = [];

  // Extract exact cable lengths from topology
  const videoConnections = (topology?.connections ?? []).filter(
    (c) => !c.services?.some((s) => ["usb-2", "usb-3", "usb-kvm"].includes(s)),
  );
  const usbConnections = (topology?.connections ?? []).filter(
    (c) => c.services?.some((s) => ["usb-2", "usb-3", "usb-kvm"].includes(s)),
  );

  const maxVideoDistance = videoConnections
    .filter((c) => c.lengthMetres !== undefined && c.lengthMetres > 0)
    .reduce((max, c) => Math.max(max, c.lengthMetres as number), 0);

  const maxUsbDistance = usbConnections
    .filter((c) => c.lengthMetres !== undefined && c.lengthMetres > 0)
    .reduce((max, c) => Math.max(max, c.lengthMetres as number), 0);

  for (const product of products) {
    const profile = resolveProductTechnicalData(product.sku);
    if (!profile) continue;

    const text = [
      profile.ioSummary.join(" "),
      profile.video.join(" "),
      profile.audio.join(" "),
      profile.network.join(" "),
      profile.physical.join(" "),
    ]
      .filter(Boolean)
      .join(" ");

    // Check HDBaseT reach
    if (maxVideoDistance > 0) {
      const hdbtMatch = text.match(/(\d+)\s*m\s*(?:HDBaseT|HDBaseT3|HDBaseT2|over cat)/i);
      const hdmiMatch = text.match(/HDMI.*?(\d+)\s*m/i);
      const networkHdMatch = text.match(/NHD.*?(\d+)\s*m/i);

      let maxReach = 0;
      if (hdbtMatch) maxReach = Math.max(maxReach, parseInt(hdbtMatch[1], 10));
      if (networkHdMatch) maxReach = Math.max(maxReach, parseInt(networkHdMatch[1], 10));

      // HDMI is typically 5-10m without active cable
      if (!hdbtMatch && !networkHdMatch && hdmiMatch) {
        maxReach = Math.max(maxReach, parseInt(hdmiMatch[1], 10));
      }

      // If product has no stated reach and cable run is > 10m, flag it
      if (maxReach === 0 && maxVideoDistance > 10) {
        blockers.push({
          id: `reach-${product.sku}-unknown`,
          domain: "reach",
          severity: "warning",
          sku: product.sku,
          message: `${product.sku} has no documented reach for a ${maxVideoDistance}m cable run.`,
          fix: "Verify the product's maximum cable distance against the datasheet.",
        });
      }

      // If product reach is less than cable run, flag it
      if (maxReach > 0 && maxVideoDistance > maxReach) {
        blockers.push({
          id: `reach-${product.sku}-exceeded`,
          domain: "reach",
          severity: "blocker",
          sku: product.sku,
          message: `${product.sku} supports ${maxReach}m but the topology specifies ${maxVideoDistance}m.`,
          fix: "Add an extender, use HDBaseT transport, or reduce the cable distance.",
        });
      }
    }

    // Check USB reach
    if (maxUsbDistance > 0 && product.category?.toLowerCase().includes("usb")) {
      const usbReachMatch = text.match(/USB.*?(\d+)\s*m/i);
      if (usbReachMatch) {
        const usbReach = parseInt(usbReachMatch[1], 10);
        if (maxUsbDistance > usbReach) {
          blockers.push({
            id: `reach-usb-${product.sku}`,
            domain: "reach",
            severity: "blocker",
            sku: product.sku,
            message: `${product.sku} USB reach is ${usbReach}m but topology specifies ${maxUsbDistance}m.`,
            fix: "Add a USB extender or hub, or reduce the USB cable distance.",
          });
        }
      }
    }
  }

  return blockers;
}

// ─── Power Budget Validation ──────────────────────────────────────────────────

function validatePowerBudget(products: StoredProductSelection[]): ExportValidationBlocker[] {
  const blockers: ExportValidationBlocker[] = [];
  const summaries = powerBudgetSummary(products);

  // Check if any products have unknown power
  const unknownPower = summaries.filter((s) => s.watts === null);
  if (unknownPower.length > 0) {
    blockers.push({
      id: "power-unknown",
      domain: "power",
      severity: "warning",
      message: `${unknownPower.length} product(s) have no documented power consumption: ${unknownPower.map((s) => s.sku).join(", ")}.`,
      fix: "Verify power requirements against datasheets before quoting.",
    });
  }

  // Check PoE/PoH products
  const poeProducts = summaries.filter((s) =>
    s.powerLines.some((line) => /poe|poh|power over ethernet|802\.3/i.test(line)),
  );

  if (poeProducts.length > 0) {
    const totalPoeWatts = poeProducts
      .filter((s) => s.totalWatts !== null)
      .reduce((sum, s) => sum + (s.totalWatts ?? 0), 0);

    if (totalPoeWatts > 0) {
      blockers.push({
        id: "power-poe-budget",
        domain: "power",
        severity: "warning",
        message: `${poeProducts.length} product(s) require PoE/PoH with a total budget of approximately ${Math.round(totalPoeWatts)}W. Confirm the PoE switch or injector can supply this.`,
        fix: "Verify PoE switch power budget covers all PoE-powered devices.",
      });
    }
  }

  // Check total power consumption
  const knownTotals = summaries.filter((s) => s.totalWatts !== null) as (typeof summaries[0] & { totalWatts: number })[];
  const totalWatts = knownTotals.reduce((sum, s) => sum + s.totalWatts, 0);

  if (totalWatts > 500) {
    blockers.push({
      id: "power-high-total",
      domain: "power",
      severity: "warning",
      message: `Total power consumption is approximately ${Math.round(totalWatts)}W. Confirm the rack power supply and circuit capacity.`,
      fix: "Verify the rack UPS and circuit can handle the total load.",
    });
  }

  return blockers;
}

// ─── Chain Completeness Validation ────────────────────────────────────────────

function validateChainCompleteness(
  products: StoredProductSelection[],
  bomRows: SalesBomRow[],
): ExportValidationBlocker[] {
  const blockers: ExportValidationBlocker[] = [];

  // Check for TX without RX
  const txProducts = products.filter((p) =>
    p.sku?.toUpperCase().includes("-TX") || p.sku?.toUpperCase().includes("TX"),
  );
  const rxProducts = products.filter((p) =>
    p.sku?.toUpperCase().includes("-RX") || p.sku?.toUpperCase().includes("RX"),
  );

  if (txProducts.length > 0 && rxProducts.length === 0) {
    blockers.push({
      id: "chain-tx-without-rx",
      domain: "chain",
      severity: "blocker",
      message: `${txProducts.length} transmitter(s) selected but no receiver(s). Each TX needs a matching RX.`,
      fix: "Add the matching receiver(s) for each transmitter.",
    });
  }

  // Check for matrix without outputs
  const matrixProducts = products.filter((p) =>
    p.sku?.toUpperCase().includes("MX-") || p.category?.toLowerCase().includes("matrix"),
  );
  const extenderProducts = products.filter((p) =>
    p.sku?.toUpperCase().includes("-TX") || p.sku?.toUpperCase().includes("-RX"),
  );

  if (matrixProducts.length > 0 && extenderProducts.length === 0) {
    blockers.push({
      id: "chain-matrix-no-outputs",
      domain: "chain",
      severity: "warning",
      message: "Matrix switcher selected but no extenders. Confirm displays are within direct HDMI distance.",
      fix: "Add HDBaseT or AVoIP extenders if displays are beyond 10m.",
    });
  }

  // Check for UC device without camera
  const ucProducts = products.filter((p) =>
    p.sku?.toUpperCase().includes("UC") || p.category?.toLowerCase().includes("uc"),
  );
  const cameraProducts = products.filter((p) =>
    p.sku?.toUpperCase().includes("CAM") || p.category?.toLowerCase().includes("camera"),
  );

  if (ucProducts.length > 0 && cameraProducts.length === 0) {
    blockers.push({
      id: "chain-uc-no-camera",
      domain: "chain",
      severity: "warning",
      message: "UC device selected but no camera. Confirm the UC device has a built-in camera or add one.",
      fix: "Add a WyreStorm camera or confirm the UC device has an integrated camera.",
    });
  }

  // Check for amplifier without speakers
  const ampProducts = products.filter((p) =>
    p.sku?.toUpperCase().includes("AMP") || p.category?.toLowerCase().includes("amplifier"),
  );
  const speakerProducts = products.filter((p) =>
    p.sku?.toUpperCase().includes("SPK") || p.category?.toLowerCase().includes("speaker"),
  );

  if (ampProducts.length > 0 && speakerProducts.length === 0) {
    blockers.push({
      id: "chain-amp-no-speakers",
      domain: "chain",
      severity: "warning",
      message: "Amplifier selected but no speakers. Confirm speakers are provided by others or add them.",
      fix: "Add speakers or mark them as 'by others' in the BOM.",
    });
  }

  // Check for missing dependencies — TBC SKU rows block; Validate (BY-OTHERS) rows warn.
  const tbcRows = bomRows.filter((row) => row.sku?.startsWith("TBC-"));
  if (tbcRows.length > 0) {
    blockers.push({
      id: "chain-tbc-dependencies",
      domain: "chain",
      severity: "blocker",
      message: `${tbcRows.length} BOM row(s) are still placeholders (TBC). Resolve these before export.`,
      fix: "Replace TBC placeholders with actual products or confirm they are by-others.",
    });
  }
  const byOthersRows = bomRows.filter((row) => row.type === "Validate" && !row.sku?.startsWith("TBC-"));
  if (byOthersRows.length > 0) {
    blockers.push({
      id: "chain-by-others-scope",
      domain: "chain",
      severity: "warning",
      message: `${byOthersRows.length} BY-OTHERS item(s) included in scope. Confirm supply responsibility before issuing.`,
      fix: "Confirm by-others items with the customer or their integrator.",
    });
  }

  return blockers;
}

// ─── Lifecycle Validation ─────────────────────────────────────────────────────

function validateLifecycle(products: StoredProductSelection[]): ExportValidationBlocker[] {
  const blockers: ExportValidationBlocker[] = [];

  for (const product of products) {
    const profile = resolveProductTechnicalData(product.sku);
    if (!profile) continue;

    // Check warnings for lifecycle issues
    const hasLifecycleWarning = profile.warnings.some((w) =>
      w.toLowerCase().includes("end-of-life") ||
      w.toLowerCase().includes("eol") ||
      w.toLowerCase().includes("discontinued")
    );

    if (hasLifecycleWarning) {
      blockers.push({
        id: `lifecycle-${product.sku}`,
        domain: "lifecycle",
        severity: "blocker",
        sku: product.sku,
        message: `${product.sku} may have lifecycle concerns.`,
        fix: "Verify current lifecycle status before quoting.",
      });
    }
  }

  return blockers;
}

// ─── Discovery Conversation Validation ────────────────────────────────────────

// Rows kept "as a note only" in the guided interview never map to a governed
// answer — the exact string buildDiscoveryConversation writes when no option
// was selected. Those captures cannot be presented as a settled requirement,
// so they block export until the rep records a governed answer.
const NOTE_ONLY_ANSWER = "Captured note only";

function validateDiscoveryConversation(
  conversation?: DiscoveryConversationItem[],
): ExportValidationBlocker[] {
  const blockers: ExportValidationBlocker[] = [];
  const rows = conversation ?? [];
  if (rows.length === 0) return blockers;

  // Block on note-only captures that were never confirmed to a governed
  // answer — the customer wording is captured, but the requirement itself is
  // still open and cannot be quoted against.
  for (const row of rows) {
    if (row.answer === NOTE_ONLY_ANSWER) {
      blockers.push({
        id: `discovery-note-only-${row.stepId}`,
        domain: "discovery",
        severity: "blocker",
        message: `Discovery row “${row.question}” was captured as a note only and never confirmed to a governed answer.`,
        fix: "Reopen the question in Discovery and select the closest governed option, or remove the note if it does not map to a question.",
      });
    }
  }

  // Review pass: every other open row (answered but not yet confirmed with
  // the customer) surfaces as a warning so the pre-export review sees the
  // whole open trail, not just the hard blockers.
  const openRows = rows.filter(
    (row) => row.answer !== NOTE_ONLY_ANSWER && row.confirmed !== true,
  );
  if (openRows.length > 0) {
    blockers.push({
      id: "discovery-open-rows",
      domain: "discovery",
      severity: "warning",
      message: `${openRows.length} discovery conversation row${openRows.length === 1 ? "" : "s"} ${openRows.length === 1 ? "is" : "are"} still marked “to be confirmed” with the customer.`,
      fix: "Review the open rows in Discovery and confirm each with the customer before sign-off.",
    });
  }

  // Low-confidence pass: rows captured from a partial keyword-only match are
  // recorded as "verify before quote" in the exports and surface here as a
  // warning so the pre-export review sees that an answer may have been a
  // guess, not a settled customer requirement.
  const lowRows = rows.filter(
    (row) => row.answer !== NOTE_ONLY_ANSWER && row.confidence === "low",
  );
  if (lowRows.length > 0) {
    blockers.push({
      id: "discovery-low-confidence",
      domain: "discovery",
      severity: "warning",
      message: `${lowRows.length} discovery answer${lowRows.length === 1 ? " was" : "s were"} captured from a low-confidence (partial) match — verify before quote.`,
      fix: "Re-verify the low-confidence rows with the customer in Discovery before sign-off so no guess reaches the quote.",
    });
  }

  return blockers;
}

// ─── Main Validation Function ─────────────────────────────────────────────────

export function validateProposalExport({
  products,
  bomRows,
  topology,
  discoveryConversation,
}: {
  products: StoredProductSelection[];
  bomRows: SalesBomRow[];
  topology?: { connections: Array<{ lengthMetres?: number; services?: string[] }> };
  discoveryConversation?: DiscoveryConversationItem[];
}): ExportValidationResult {
  const allBlockers: ExportValidationBlocker[] = [
    ...validateReach(products, topology),
    ...validatePowerBudget(products),
    ...validateChainCompleteness(products, bomRows),
    ...validateLifecycle(products),
    ...validateDiscoveryConversation(discoveryConversation),
  ];

  const blockers = allBlockers.filter((b) => b.severity === "blocker");
  const warnings = allBlockers.filter((b) => b.severity === "warning");

  const allowed = blockers.length === 0;

  const parts: string[] = [];
  if (blockers.length) parts.push(`${blockers.length} blocker(s)`);
  if (warnings.length) parts.push(`${warnings.length} warning(s)`);
  const summary = parts.length ? parts.join(", ") : "All checks passed";

  return {
    allowed,
    blockers,
    warnings,
    summary,
  };
}
