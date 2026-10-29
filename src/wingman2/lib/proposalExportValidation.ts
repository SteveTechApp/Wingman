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
} from "../data/projectStore";
import type { SalesBomRow } from "./salesReadiness";
import { powerBudgetSummary } from "./powerBudget";
import { resolveProductTechnicalData } from "./governedProductTechnicalData";
import { resolveProductLifecycle } from "./wyrestormProductLifecycle";
import { wallSurveyDisplayCount, wallSurveyGapText, wallSurveyGaps } from "./wallSurvey";
import { WALL_ENTRY_SENTENCE_NAME } from "./wallEntry";
import { wallTransportPlan, wallTransportRequirements, type WallTransportLink } from "./videowallTransport";
import {
  HDBT_DISPLAY_RUN_LIMIT_METRES,
  quotedHdbtDisplayReceiverRow,
  type DisplayReceiverRow,
} from "./hdbtDisplayReceiver";
import type { WallRequirements } from "./videowallOptions";
import { buildInstallationSchedule, installationLineLabel, type InstallationUnitPrices } from "./installationSchedule";
import {
  installationRateCardCurrencyMismatches,
  type InstallationRateCard,
  type InstallationRateCardCurrency,
} from "./installationRateCard";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Every kind of check this gate can raise, as a runtime list as well as a type.
 *
 * The list exists at runtime so `npm run check:export-validation-domains` can
 * ask each domain for the test that proves it, which a type alone cannot be
 * read back from. Adding a check therefore means adding its domain here, where
 * the guard from the module's own test file — and its own registry — meet.
 */
export const EXPORT_VALIDATION_DOMAINS = [
  "reach",
  "power",
  "chain",
  "lifecycle",
  "discovery",
  "transport",
  "display-run",
  "survey",
  "currency",
] as const;

export type ExportValidationDomain = (typeof EXPORT_VALIDATION_DOMAINS)[number];

/**
 * The one blocker a dependency prompt raises.
 *
 * Named here so every surface that can clear one — the wizard's gate, the
 * project record and a template's own schedule — looks for the row it offers
 * the answer for rather than matching its own copy of the string.
 */
export const DEPENDENCY_PROMPT_BLOCKER_ID = "chain-tbc-dependencies";

export type ExportValidationBlocker = {
  id: string;
  domain: ExportValidationDomain;
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
      id: DEPENDENCY_PROMPT_BLOCKER_ID,
      domain: "chain",
      severity: "blocker",
      message: `${tbcRows.length} BOM row(s) are still placeholders (TBC). Resolve these before export.`,
      fix: "Replace TBC placeholders with actual products or confirm they are by-others.",
    });
  }
  const byOthersRows = bomRows.filter((row) => (row.sku?.startsWith("BY-OTHERS") || row.type === "Validate") && !row.sku?.startsWith("TBC-"));
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

/*
 * A selected product the governed lifecycle record says must not be quoted.
 *
 * Lifecycle is a property of the product record (the business list entry: its
 * status, the successor that replaced it, an admin block), not something the
 * technical spec carries, so the check reads `resolveProductLifecycle` — the
 * one record that answers "may this SKU be quoted today?". Asking the
 * technical-data resolver instead read a bare SKU string as an empty product,
 * so its warnings were never lifecycle warnings and this check could not fire.
 *
 * A cable or an unlisted SKU is not a lifecycle failure: cables are quoted, and
 * a by-others or not-yet-governed line is the chain check's business. Only a
 * discontinued, do-not-spec or admin-blocked SKU, or one a current product
 * replaced, stops the document.
 */
function validateLifecycle(products: StoredProductSelection[]): ExportValidationBlocker[] {
  const blockers: ExportValidationBlocker[] = [];

  for (const product of products) {
    const lifecycle = resolveProductLifecycle(product.sku);
    const supersededBy = lifecycle.supersededBy?.trim() || "";
    const cannotBeQuoted =
      lifecycle.status === "discontinued" ||
      lifecycle.status === "do-not-spec" ||
      lifecycle.adminBlocked ||
      Boolean(supersededBy);

    if (!cannotBeQuoted) continue;

    blockers.push({
      id: `lifecycle-${product.sku}`,
      domain: "lifecycle",
      severity: "blocker",
      sku: product.sku,
      message: lifecycle.note,
      fix: supersededBy
        ? `Quote ${supersededBy} instead, or confirm with WyreStorm that ${product.sku} is still supplied.`
        : `Replace ${product.sku} with a current product, or confirm with WyreStorm that it can still be supplied, before issuing.`,
    });
  }

  return blockers;
}

// ─── Discovery Conversation Validation ────────────────────────────────────────

// Rows kept "as a note only" in the guided interview never map to a governed
// answer — the exact string buildDiscoveryConversation writes when no option
// was selected. Those captures cannot be presented as a settled requirement,
// so they remain explicit open details in the document.
const NOTE_ONLY_ANSWER = "Captured note only";

function validateDiscoveryConversation(
  conversation?: DiscoveryConversationItem[],
): ExportValidationBlocker[] {
  const blockers: ExportValidationBlocker[] = [];
  const rows = conversation ?? [];
  if (rows.length === 0) return blockers;

  // Keep note-only captures visible when they have not mapped to a governed
  // answer — the customer wording is captured, but the requirement itself is
  // still open; it does not require a separate approval step.
  for (const row of rows) {
    if (row.answer === NOTE_ONLY_ANSWER) {
      blockers.push({
        id: `discovery-note-only-${row.stepId}`,
        domain: "discovery",
        severity: "warning",
        message: `Discovery row “${row.question}” is captured as a note only and remains an open design detail.`,
        fix: "Keep the customer's wording in the brief; add a structured answer when the detail is known.",
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
      fix: "These details remain labelled as unconfirmed in the document; update them when more information is available.",
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

// ─── Wall Transport Validation ────────────────────────────────────────────────

/**
 * The cable path an over-limit link has to be rebuilt on, in the words an
 * installer can act on. Every fix states the limit the run has to meet, so a
 * rep can see whether shortening, an active cable or another hop is enough.
 */
function transportFix(link: WallTransportLink): string {
  const limit = `${link.limitMetres} m`;
  if (link.cable.includes("loop-through")) {
    return `Shorten this panel-to-panel hop to ${limit}, or insert a fibre extender between these two panels.`;
  }
  if (link.cable.includes("fibre extender")) {
    return `Add a second fibre extender hop so each span is ${limit} or less.`;
  }
  if (link.cable.startsWith("Cat6A")) {
    return `Add a fibre segment or an intermediate switch so this drop is ${limit} or less.`;
  }
  return `Use an active or fibre HDMI cable on this link, or bring the run to ${limit} or less.`;
}

/**
 * Over-limit wall runs as named blockers. A link measured on site names its own
 * run and cable, so the rep knows which end to rebuild; a link sitting exactly
 * on its limit is a warning, because it still fits but leaves no headroom.
 */
export function wallTransportBlockers(
  requirements: WallRequirements | null | undefined,
): ExportValidationBlocker[] {
  // A summary saved before the layout answers existed has no costable run, so
  // it cannot be blocked for one either.
  const usable = wallTransportRequirements(requirements);
  if (!usable) return [];
  const blockers: ExportValidationBlocker[] = [];
  for (const link of wallTransportPlan(usable).allLinks) {
    if (link.status === "ok") continue;
    // A measured run is what the survey found; an allowance is only the design's
    // assumption, and the sentence has to say which one broke the limit.
    const run = link.basis === "measured"
      ? `measured ${link.runMetres} m run`
      : `design allowance of ${link.runMetres} m`;
    if (link.status === "limit") {
      blockers.push({
        id: `transport-${link.id}`,
        domain: "transport",
        severity: "blocker",
        message: `${link.label} cannot carry its run: the ${run} on ${link.cable} at ${link.resolution} exceeds the ${link.limitMetres} m limit.`,
        fix: transportFix(link),
      });
      continue;
    }
    blockers.push({
      id: `transport-watch-${link.id}`,
      domain: "transport",
      severity: "warning",
      message: `${link.label} sits on its transport limit: the ${run} on ${link.cable} at ${link.resolution} is at the ${link.limitMetres} m limit.`,
      fix: `${transportFix(link)} Confirm the specified cable before issue.`,
    });
  }
  return blockers;
}

/**
 * A display link measured beyond the longest HDBaseT receiver's rating.
 *
 * The receiver is the part the document quotes, so a room measured past its
 * rating cannot issue: the receiver alone does not close the link, and the
 * schedule would present a part that cannot do the job as though it could. The
 * reason on the receiver row says the same thing, but a sentence a rep can read
 * past is not a stop — this is what holds the document.
 *
 * The clearing change is a measured span (a mid-span repeater or a fibre
 * extender pair, so the receiver serves the run it is rated for) or a shorter
 * run, and the template page applies the span change from the blocker itself
 * (`DisplayRunSpanFix` over `displayRunSpanFix`). A room that quotes no HDBaseT
 * receiver — it went to fibre, or dropped the line — has nothing for the rating
 * to block, so nothing is raised.
 */
export function displayRunBlockers({
  runMetres,
  rows,
}: {
  /** The longest display run the survey measured, when one is recorded. */
  runMetres?: number | null;
  /** The rows the document prints, where the quoted display receiver is found. */
  rows: readonly DisplayReceiverRow[];
}): ExportValidationBlocker[] {
  if (typeof runMetres !== "number" || !Number.isFinite(runMetres)) return [];
  const run = Math.round(runMetres);
  if (run <= HDBT_DISPLAY_RUN_LIMIT_METRES) return [];
  const receiver = quotedHdbtDisplayReceiverRow(rows);
  if (!receiver) return [];
  return [{
    id: "display-run-over-limit",
    domain: "display-run",
    severity: "blocker",
    sku: receiver.sku,
    message: `The ${run} m display run is beyond the ${HDBT_DISPLAY_RUN_LIMIT_METRES} m rating of the longest HDBaseT receiver in the range, so the quoted ${receiver.sku} cannot carry this link on its own.`,
    fix: `Carry the link in spans — a mid-span repeater or a fibre extender pair — and record the run the receiver then serves, or shorten the run to ${HDBT_DISPLAY_RUN_LIMIT_METRES} m or less, so the quotation and the survey agree before the document issues.`,
  }];
}

/**
 * Wall links the survey has not finished: the display housing, run entry or
 * termination is missing.
 *
 * This is a completeness warning, not a blocker — the document prints only the
 * links that carry install detail, so an unfinished survey is still a document
 * the rep can issue, but it is one they should see first. The sentence names the
 * short links and cells the same way the builder's handoff check does, so the
 * two screens cannot disagree about which links are short.
 */
export function wallSurveyCompletenessWarnings(
  requirements: WallRequirements | null | undefined,
): ExportValidationBlocker[] {
  // A summary saved before the layout answers existed has no link list, so it
  // cannot be short of install detail either.
  const usable = wallTransportRequirements(requirements);
  if (!usable) return [];
  const plan = wallTransportPlan(usable);
  const gaps = wallSurveyGaps(plan, usable.linkDetails);
  if (gaps.length === 0) return [];
  return [{
    id: "survey-install-detail",
    domain: "survey",
    severity: "warning",
    message: wallSurveyGapText(gaps, wallSurveyDisplayCount(plan)),
    fix: `Record the display housing, run entry and termination for those links in ${WALL_ENTRY_SENTENCE_NAME}'s transport table or on the survey sheet, so the proposal prints the install detail it has.`,
  }];
}

/**
 * Installation lines still carrying a rate card number written in another
 * currency than the proposal's.
 *
 * The card quotes one currency; a quote stated in another that keeps the card's
 * numbers is quoting real numbers as the wrong money, and the printed total
 * cannot say so. A rate typed for this proposal is its own number, so it is not
 * named; a seeded or restored one is. This is a warning, not a blocker: the rep
 * may deliberately hold the card's figure for this job, but the document must
 * not leave without that being visible first.
 */
export function installationRateCurrencyWarnings({
  requirements,
  rateCard,
  currency,
  rates,
}: {
  /** Saved wall design, whose survey produced the priced lines. */
  requirements?: WallRequirements | null;
  /** The rep's workspace card these rates started from. */
  rateCard?: InstallationRateCard | null;
  /** The currency the document prints. */
  currency?: InstallationRateCardCurrency;
  /** The draft's installation rates, as typed. */
  rates?: InstallationUnitPrices;
}): ExportValidationBlocker[] {
  if (!rateCard || !currency || rateCard.currency === currency) return [];
  const schedule = buildInstallationSchedule(wallTransportRequirements(requirements));
  if (!schedule) return [];
  const mismatched = new Set(
    installationRateCardCurrencyMismatches(
      rateCard,
      schedule.lines.map((line) => line.id),
      rates,
      currency,
    ),
  );
  if (mismatched.size === 0) return [];
  const labels = schedule.lines
    .filter((line) => mismatched.has(line.id))
    .map(installationLineLabel);
  const shown = labels.slice(0, 3);
  const rest = labels.length - shown.length;
  const named = rest ? `${shown.join(", ")} and ${rest} more` : shown.join(", ");
  const count = labels.length;
  return [{
    id: "currency-installation-rates",
    domain: "currency",
    severity: "warning",
    message: `${count} installation line${count === 1 ? " still holds" : "s still hold"} your ${rateCard.currency} rate card's ${count === 1 ? "number" : "numbers"} on a ${currency} proposal: ${named}.`,
    fix: `Type ${count === 1 ? "that rate" : "those rates"} in ${currency}, or save the card in ${currency} before issuing, so the printed total is quoted in the currency it is priced in.`,
  }];
}

/**
 * Refuses a document export whose own schedule would print an over-limit wall
 * run. The wrapper calls it before building, so the check cannot be bypassed by
 * a caller that skips the readiness panel.
 */
export function assertWallTransportExportable(requirements: WallRequirements | null | undefined) {
  // Only a run that is over its limit stops the export; a link sitting exactly
  // on the limit is a warning the rep can still issue through.
  const blockers = wallTransportBlockers(requirements).filter((entry) => entry.severity === "blocker");
  if (blockers.length > 0) throw new Error(exportBlockerMessage(blockers));
}

/** One message an export can throw: every named blocker with the fix that clears it. */
export function exportBlockerMessage(blockers: ExportValidationBlocker[]): string {
  const count = blockers.length;
  const details = blockers.map((blocker) => `${blocker.message} Fix: ${blocker.fix}`);
  return `Proposal export blocked — ${count} issue${count === 1 ? "" : "s"} to resolve first. ${details.join(" ")}`;
}

// ─── Main Validation Function ─────────────────────────────────────────────────

export function validateProposalExport({
  products,
  bomRows,
  topology,
  discoveryConversation,
  wallRequirements,
  displayRunMetres,
  pricing,
}: {
  products: StoredProductSelection[];
  bomRows: SalesBomRow[];
  topology?: { connections: Array<{ lengthMetres?: number; services?: string[] }> };
  discoveryConversation?: DiscoveryConversationItem[];
  /** Saved wall design, when the proposal carries one. */
  wallRequirements?: WallRequirements | null;
  /**
   * The run the quoted display receiver serves, when the room records one: a
   * run past the longest receiver's rating holds a document that quotes that
   * receiver. A room that carried the link in spans records the span, which is
   * the figure the rating is measured against.
   */
  displayRunMetres?: number | null;
  /**
   * What the document is priced with, when the caller prices the survey's
   * installation lines: a rate still holding a card number from another
   * currency is named before the quote leaves.
   */
  pricing?: {
    currency: InstallationRateCardCurrency;
    rateCard: InstallationRateCard;
    installationUnitPrices?: InstallationUnitPrices;
  } | null;
}): ExportValidationResult {
  const allBlockers: ExportValidationBlocker[] = [
    ...validateReach(products, topology),
    ...validatePowerBudget(products),
    ...validateChainCompleteness(products, bomRows),
    ...validateLifecycle(products),
    ...validateDiscoveryConversation(discoveryConversation),
    ...wallTransportBlockers(wallRequirements),
    ...displayRunBlockers({ runMetres: displayRunMetres, rows: bomRows }),
    ...wallSurveyCompletenessWarnings(wallRequirements),
    ...installationRateCurrencyWarnings({
      requirements: wallRequirements,
      rateCard: pricing?.rateCard,
      currency: pricing?.currency,
      rates: pricing?.installationUnitPrices,
    }),
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
