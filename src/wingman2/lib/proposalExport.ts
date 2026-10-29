import { proposalDiagramSvg } from "./proposalDiagram";
import { loadProductMediaIndex, type ProductMediaIndex } from "../data/productMedia";
import { proposalProductCards, proposalSolutionStory } from "./proposalSalesContent";
import { roomBriefHtml } from "./proposalRoomBrief";
import type { StoredProjectProposal, StoredProductSelection, StoredVideowallSummary } from "../data/projectStore";
import { downloadBlob } from "./downloadBlob";
import { powerBudgetSummary, type PowerBudgetSummary } from "./powerBudget";
import {
  buildCableSchedule,
  buildSchematicNodes,
  inferSchematicArchitecture,
} from "./roomSchematicEngine";
import type { SalesBomRow } from "./salesReadiness";
import {
  CAPTURE_CONFIDENCE_EXPLAINER,
  captureConfidenceCell,
} from "./discoveryConversationDisplay";
import { extractUnresolvedDiscoveryItems } from "./unresolvedDiscoveryItems";
import { buildNativeCableSchedule, nativeCableToneLabel, cableValidationStatusLabel } from "./schematic/nativeCableSchedule";
import { WALL_SURVEY_COLUMN_KEY } from "./wallSurvey";
import { buildWingmanSchematic } from "./schematic/wingmanSchematicEngine";
import { proposalSchematicBrief } from "./schematic/proposalSchematicBrief";
import { buildDesignProjectDocument, trackDesignProjectExport } from "../features/design-project";
import { buildDisplaySchedule } from "./displaySchedule";
import { pricedEquipmentHtml, pricedInstallationHtml } from "./proposalPricingHtml";
import { proposalPrintPaginationHtml } from "./proposalPrintPagination";
import { wallRequirementsFromSummary } from "./videowallOptions";
import { wallTransportRequirements } from "./videowallTransport";
import { assertWallTransportExportable } from "./proposalExportValidation";
import { wallVisualLayout } from "./videowallVisual";
import { wallElevationCaption, wallElevationOverlay, wallElevationSvg, wallMappingPreviews, wallMappingRecommendation } from "./wallElevation";
import {
  wallStartingPointDrift,
  wallStartingPointFromSummary,
  wallStartingPointRecordText,
} from "./wallStartingPointOrigin";
import { buildInstallationSchedule, installationCategoryLabel, installationTableHeaders } from "./installationSchedule";
import { CUSTOMER_COPY } from "./proposalCopy";
import { buildDocumentAppendix, documentSectionPlan } from "./documentSections";
import { HOUSE_DOCUMENT_BRAND, type DocumentDetail } from "./solutionTemplates";

export type BomRow = SalesBomRow;

// ---------------------------------------------------------------------------
// Proposal narrative structure
//
// This export follows the "Level 5 - Blended commercial and technical
// proposal" structure: plain-language explanation first (requirement,
// recommended solution, how it will work, benefits), then the technical
// substantiation (architecture, schematic, equipment schedule), then the
// governance layer (assumptions, exclusions, risks, next steps). This is the
// recommended default shape for a significant AV opportunity where both a
// commercial decision-maker and a technical reviewer may read the same
// document.
//
// Confirmed facts, assumptions, recommendations, options, dependencies,
// exclusions and risks are kept in clearly labelled sections rather than
// blended into one undifferentiated block, so nothing that is still open is
// ever presented as settled.
// ---------------------------------------------------------------------------

function proposalContextBlob(proposal: StoredProjectProposal) {
  return [proposal.title, proposal.summary, proposal.outputPurpose?.summary || ""].join(" ");
}

/**
 * A CSS string literal for the generated `<style>` block.
 *
 * `</style>` must never appear literally inside the stylesheet, so angle
 * brackets become CSS escapes; quotes and backslashes are escaped for the
 * string itself. Line breaks collapse to one space, because a margin box
 * prints on one line.
 */
function proposalCssString(value: string) {
  const cleaned = value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  return `"${cleaned
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/</g, "\\3c ")
    .replace(/>/g, "\\3e ")}"`;
}

const schematicToneClass: Record<string, string> = {
  source: "#0369a1",
  core: "#7c3aed",
  network: "#0f766e",
  display: "#b45309",
  usb: "#be123c",
  audio: "#4338ca",
  other: "#475569",
};

function buildSchematicSectionHtml(proposal: StoredProjectProposal, bomRows: BomRow[]) {
  if (!bomRows.length) {
    return `<p>${escapeHtml(CUSTOMER_COPY.noSchematic)}</p>`;
  }

  const contextBlob = proposalContextBlob(proposal);
  const nodes = buildSchematicNodes(contextBlob, bomRows);

  // Try native schematic engine first, fall back to legacy
  let cableRowsHtml = "";
  let nativeDiagram = "";
  try {
    const products = proposal.products ?? [];
    const bomRowsForSchematic = (bomRows.length ? bomRows : proposal.bomRows ?? []).map((r) => ({ sku: r.sku, description: r.description, role: r.role, qty: r.qty }));
    const brief = proposalSchematicBrief(proposal.title || "System schematic", products, bomRowsForSchematic);
    const schematicModel = buildWingmanSchematic(brief);
    nativeDiagram = proposalDiagramSvg(schematicModel) + `<p>Concept drawing: confirm physical connections and site interfaces before installation.</p><ul>${schematicModel.assumptions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}${schematicModel.warnings.map((item) => `<li>${escapeHtml(item.title)}: ${escapeHtml(item.message)}</li>`).join("")}</ul>`;
    const nativeCableRows = buildNativeCableSchedule(schematicModel);
    if (nativeCableRows.length > 0) {
      const statusColor: Record<string, string> = {
        confirmed: "#16a34a",
        "needs-site-confirmation": "#d97706",
        unknown: "#dc2626",
      };
      cableRowsHtml = nativeCableRows
        .map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(nativeCableToneLabel(row.type))}</td><td>${row.maxLengthMetres != null ? `${row.maxLengthMetres}m` : "Not confirmed"}</td><td>${escapeHtml(row.connectors || "TBC")}</td><td style="color:${statusColor[row.validationStatus] || "#475569"};font-weight:600;">${escapeHtml(cableValidationStatusLabel(row.validationStatus))}</td><td>${escapeHtml(row.reminder)}</td></tr>`)
        .join("");
    }
  } catch {
    // Fall back to legacy cable schedule
  }

  if (!cableRowsHtml) {
    const legacyRows = buildCableSchedule(contextBlob, bomRows);
    cableRowsHtml = legacyRows
      .map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(nativeCableToneLabel(row.type))}</td><td>${escapeHtml(row.cable)}</td><td>${escapeHtml(row.appliesTo)}</td><td>${escapeHtml(row.reminder)}</td></tr>`)
      .join("");
  }

  const nodesHtml = nodes
    .map((node, index) => {
      const color = schematicToneClass[node.tone] || "#475569";
      const box = `<div style="min-width:150px;max-width:190px;border:1px solid ${color};border-top:4px solid ${color};border-radius:8px;padding:10px 12px;background:var(--wm-sweep-card, #f8fafc);"><small style="display:block;color:${color};font-weight:800;font-size:11px;">STEP ${escapeHtml(node.label)}</small><strong style="display:block;font-size:13px;margin-top:2px;">${escapeHtml(node.title)}</strong><p style="margin:6px 0 0;font-size:11.5px;line-height:1.4;color:#334155;">${escapeHtml(node.detail)}</p>${node.count ? `<span style="display:block;margin-top:6px;font-size:10.5px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.04em;">${escapeHtml(node.count)}</span>` : ""}</div>`;
      const arrow = index < nodes.length - 1 ? `<div style="align-self:center;font-size:18px;color:#94a3b8;">&#8594;</div>` : "";
      return `${box}${arrow}`;
    })
    .join("");

  return `
    ${nativeDiagram || `<div style="display:flex;flex-wrap:wrap;align-items:stretch;gap:8px;margin-top:8px;">${nodesHtml}</div>`}
    <p style="margin-top:14px;font-size:12px;color:#475569;">This diagram shows the signal path we expect, from source to screen, so you and the installer are looking at the same picture. The cable schedule below gives the cable type, connectors, maximum length and what still needs checking for each connection.</p>
    <table>
      <thead><tr><th>Cable run</th><th>Transport</th><th>Max length</th><th>Connectors</th><th>Status</th><th>Validation reminder</th></tr></thead>
      <tbody>${cableRowsHtml}</tbody>
    </table>`;
}

function buildPracticalOperationHtml(proposal: StoredProjectProposal, bomRows: BomRow[]) {
  if (!bomRows.length && !proposal.applicationProposal?.userJourney.some((step) => step.trim())) {
    return `<p>${escapeHtml(CUSTOMER_COPY.noOperation)}</p>`;
  }

  const story = proposalSolutionStory(proposal, bomRows);
  return `<ol>${story.operation.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`;
}

function buildBenefitsHtml(proposal: StoredProjectProposal, bomRows: BomRow[]) {
  if (!bomRows.length) {
    return `<p>${escapeHtml(CUSTOMER_COPY.noBenefits)}</p>`;
  }

  const architecture = inferSchematicArchitecture(proposalContextBlob(proposal), bomRows);
  const items: string[] = ["A consistent, repeatable connection experience across the room(s) covered by this proposal."];

  if (architecture.isMatrix) {
    items.push("Central routing provides one place to manage the agreed source-to-display connections; confirm control and network dependencies in the final design.");
  }

  if (architecture.isNhd600 || architecture.isNhd500 || architecture.isNhd100) {
    items.push("AV-over-IP provides a potential expansion path, subject to compatible endpoints, network capacity and the final design.");
  }

  if (architecture.hasVideoWall) {
    items.push("A dedicated wall processor keeps feature-wall content management separate from day-to-day room routing.");
  }

  if (architecture.hasCamera || architecture.hasUsb || architecture.isApollo) {
    items.push("An agreed conferencing workflow helps users connect to room peripherals; the host computer and meeting platform remain part of the complete design.");
  }

  if (architecture.hasDanteAudio) {
    items.push("Networked audio distribution simplifies zoning and future audio expansion.");
  }

  if (architecture.hasByOthers) {
    items.push("Placeholder rows in the equipment schedule flag exactly which supporting equipment (displays, audio, control, network, rack) still needs to be confirmed, so nothing outside WyreStorm's scope is silently assumed to be included.");
  }

  items.push("We will tie these benefits to your own business measures before this proposal is issued.");

  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function buildDiscoveryConversationHtml(proposal: StoredProjectProposal): string {
  const items = proposal.discoveryConversation ?? [];
  if (!items.length) return "";

  const rows = items
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.question)}</td><td>${escapeHtml(item.answer)}</td><td>${escapeHtml(item.note || "—")}</td><td>${item.confirmed ? "Confirmed with customer" : "To be confirmed"}</td><td>${escapeHtml(captureConfidenceCell(item.confidence, item.confidenceScore))}</td></tr>`,
    )
    .join("");

  return `
  <h2>Discovery Conversation</h2>
  <p>Below is the conversation this proposal is based on: the question we asked, the answer we recorded, and your own words where we captured them. "Confirmed with customer" means we checked that point with you; "To be confirmed" means it is still open and will be settled before the design is signed off.</p>
  <table>
    <thead><tr><th>Question asked</th><th>Answer we recorded</th><th>Customer wording</th><th>Status</th><th>Capture confidence</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="font-size:12px;">${escapeHtml(CAPTURE_CONFIDENCE_EXPLAINER)}</p>
  <p style="font-size:12px;">If a row has a note but no clear answer, that point was still open when this was written and will be confirmed before the design is signed off.</p>`;
}

function buildUnresolvedDiscoveryHtml(proposal: StoredProjectProposal): string {
  const items = extractUnresolvedDiscoveryItems({ discoveryConversation: proposal.discoveryConversation });
  if (!items.length) return "";

  const severityLabel: Record<string, string> = { conflict: "Conflict — BLOCKER", "low-confidence": "Low confidence", inferred: "Inferred (not confirmed)", unconfirmed: "Unconfirmed" };
  const rows = items
    .map((item) => `<tr><td><strong>${escapeHtml(item.field)}</strong></td><td>${escapeHtml(item.capturedAnswer)}</td><td>${escapeHtml(severityLabel[item.reason] ?? item.reason)}</td><td>${item.reason === "conflict" ? "BLOCKER" : item.reason === "low-confidence" ? "HIGH" : "MEDIUM"}</td></tr>`)
    .join("");

  return `
  <h2>Unresolved Discovery Items</h2>
  <p>The following ${items.length} discovery item${items.length === 1 ? "" : "s"} could not be fully verified during the discovery conversation. Each must be confirmed with the customer before final design sign-off and commercial quotation. Items marked BLOCKER must be resolved before any commitment is made.</p>
  <table>
    <thead><tr><th>Requirement area</th><th>Captured answer</th><th>Status</th><th>Severity</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildCanonicalDesignHtml(proposal: StoredProjectProposal): string {
  const revision = proposal.designRevision;
  if (!revision) return "";
  const document = buildDesignProjectDocument(revision);
  const requirements = document.requirements.map((item) => `<tr><td>${escapeHtml(item.customerStatement)}</td><td>${escapeHtml(item.interpretation)}</td><td>${escapeHtml(item.designConsequence)}</td><td>${escapeHtml(item.state)}</td></tr>`).join("");
  const roles = document.requiredRoles.map((item) => `<tr><td>${escapeHtml(item.label)}</td><td>${item.covered ? "Covered" : "Missing"}</td><td>${escapeHtml(item.evidence.join("; ") || "No design evidence")}</td></tr>`).join("");
  const products = document.products.map((item) => `<tr><td>${item.quantity} × ${escapeHtml(item.sku)}</td><td>${escapeHtml(item.designRole)}</td><td>${escapeHtml(item.reason)}</td><td>${escapeHtml(item.proof.join("; ") || "Confirm product evidence")}</td></tr>`).join("");
  return `<h2>What You Asked For and How We Designed It</h2><p><strong>Design reference:</strong> ${escapeHtml(document.revisionId)}</p><p><strong>Customer said:</strong> ${escapeHtml(document.customerRequirement)}</p><p><strong>Wingman understood:</strong> ${escapeHtml(document.interpretation)}</p><p><strong>Design direction:</strong> ${escapeHtml(document.architecture)}</p><table><thead><tr><th>What you said</th><th>What we understood</th><th>What it means for the design</th><th>Status</th></tr></thead><tbody>${requirements}</tbody></table><h2>System Completeness</h2><table><thead><tr><th>Part of the system</th><th>Covered?</th><th>How we know</th></tr></thead><tbody>${roles}</tbody></table><h2>Products and Their Role</h2><table><thead><tr><th>Product</th><th>Role in this design</th><th>Requirement it serves</th><th>Evidence</th></tr></thead><tbody>${products}</tbody></table>`;
}

function buildExclusionsHtml(bomRows: BomRow[]) {
  const standardExclusions = [
    "Display, projector, LED and mounting hardware supply unless listed as a specific line item above.",
    "Electrical, structural and builder's work.",
    "Network switch procurement, VLAN/multicast configuration and IT commissioning access.",
    "Structured cabling installation and certification.",
    "Third-party control programming beyond WyreStorm-native presets.",
    "Installation, labour and commissioning, unless separately quoted.",
  ];

  const byOthersRows = bomRows.filter((row) => row.sku?.startsWith("BY-OTHERS"));
  const byOthersHtml = byOthersRows.length
    ? `<p style="margin-top:10px;"><strong>Required to complete the AV system, supplied by the named third parties (outside the WyreStorm equipment supply):</strong></p><ul>${byOthersRows
        .map((row) => {
          const source = row.sourceUrl
            ? ` <span style="font-size:11px;color:#64748b;">Product source: ${escapeHtml(row.sourceUrl)}${row.sourceCheckedOn ? ` (read ${escapeHtml(row.sourceCheckedOn)})` : ""}${row.specifications ? `; recorded specifications: ${escapeHtml(row.specifications.replace(/\n/g, "; "))}` : ""}.</span>`
            : "";
          return `<li>${escapeHtml(row.sku)} - ${escapeHtml(row.description)}${source}</li>`;
        })
        .join("")}</ul>`
    : "";

  return `<ul>${standardExclusions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>${byOthersHtml}`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function fileBaseName(title: string) {
  return String(title || "wingman-proposal")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "wingman-proposal";
}

export function buildBomRows(products: StoredProductSelection[]): BomRow[] {
  return products.map((product, index) => ({
    item: index + 1,
    sku: product.sku,
    description: product.title || product.family || product.category || "Selected WyreStorm product",
    role: product.category || product.family || "Core product",
    qty:
      Number.isFinite(Number(product.quantity)) && Number(product.quantity) > 0
        ? Math.floor(Number(product.quantity))
        : 1,
    type: "Required",
    status: product.status || "alternative",
    evidence: product.evidence?.[0] || "Selected WyreStorm product.",
    notes: "Validate accessories, receiver/transmitter pairing, firmware, power, mounting, lifecycle, and regional suitability before issue.",
  }));
}

export function buildBomCsv(rows: BomRow[]) {
  const headers = ["Item", "SKU", "Description", "Role", "Qty", "Type", "Status", "Evidence", "Notes"];
  const lines = [
    headers.map(csvCell).join(","),
    ...rows.map((row) =>
      [row.item, row.sku, row.description, row.role, row.qty, row.type, row.status, row.evidence, row.notes].map(csvCell).join(","),
    ),
  ];

  return lines.join("\r\n");
}

function buildPowerStrategyHtml(products: StoredProductSelection[]): string {
  const summaries = powerBudgetSummary(products);
  if (!summaries.length) return "<p>No products have been selected, so a power budget cannot be calculated.</p>";

  const rows = summaries
    .map((s) => {
      const wattsStr = s.watts !== null ? `${s.watts}W` : "Not proven";
      const totalStr = s.totalWatts !== null ? `${s.totalWatts}W` : "—";
      const powerDetail = s.powerLines.length ? s.powerLines.join("; ") : "No power figure published";
      return `<tr><td>${escapeHtml(s.sku)}</td><td>${s.quantity}</td><td>${escapeHtml(wattsStr)}</td><td>${escapeHtml(totalStr)}</td><td style="font-size:11px;color:#64748b;">${escapeHtml(powerDetail)}</td></tr>`;
    })
    .join("");

  const knownTotals = summaries.filter((s) => s.totalWatts !== null) as (PowerBudgetSummary & { totalWatts: number })[];
  const totalWatts = knownTotals.reduce((sum, s) => sum + s.totalWatts, 0);
  const poeProducts = summaries.filter((s) => s.powerLines.some((line) => /poe|poh|power over ethernet|power over hdbt|802\.3/i.test(line)));

  let summaryHtml = `<p style="margin-top:10px;font-size:13px;">`;
  if (knownTotals.length > 0) {
    summaryHtml += `<strong>Stated maximum consumption:</strong> approximately ${Math.round(totalWatts)}W across ${knownTotals.length} product${knownTotals.length > 1 ? "s" : ""} with proven figures.`;
  } else {
    summaryHtml += `None of the selected products has a published power figure yet. Confirm power supply requirements before quoting.`;
  }
  if (poeProducts.length) {
    summaryHtml += ` ${poeProducts.length} product${poeProducts.length > 1 ? "s" : ""} (${poeProducts.map((s) => s.sku).join(", ")}) ${poeProducts.length > 1 ? "require" : "requires"} PoE/PoH — confirm the injector or switch PoE budget covers the total.`;
  }
  summaryHtml += `</p>`;

  return `<table>
    <thead><tr><th>SKU</th><th>Qty</th><th>Per-unit max</th><th>Total max</th><th>Power data (WyreStorm)</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>${summaryHtml}`;
}

/**
 * The printed appendix a Technical document carries at the back: one row per
 * equipment line, from the evidence the line was selected on.
 */
function appendixHtml(bomRows: BomRow[]) {
  const appendix = buildDocumentAppendix(bomRows);
  const rows = appendix.rows.map((row) => `<tr><td>${row.item}</td><td>${escapeHtml(row.line)}</td><td>${escapeHtml(row.evidence)}</td><td>${escapeHtml(row.source)}</td><td>${escapeHtml(row.verification)}</td></tr>`).join("");
  return `<h2>Appendix — Equipment Evidence and Verification</h2>
  <p>${escapeHtml(appendix.headline)}</p>
  ${
    appendix.rows.length
      ? `<table>
    <thead>
      <tr><th>Item</th><th>Equipment line</th><th>Evidence for this line</th><th>Source read</th><th>Verification</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`
      : ""
  }`;
}

/**
 * The printed document, at the detail level the document's own personalisation
 * chose.
 *
 * The section a level leaves out is omitted here as well as in the Word output,
 * because both read one table (`documentSections.ts`): a draft cannot print a
 * part of the document on screen and drop it from the quote. The default is the
 * house level, so a proposal that never chose one is the whole document.
 */
export function buildProposalHtml(proposal: StoredProjectProposal, bomRows: BomRow[], products: StoredProductSelection[] = [], media: ProductMediaIndex | null = null, videoWall: StoredVideowallSummary | null = null, detail: DocumentDetail = HOUSE_DOCUMENT_BRAND.detail) {
  const sections = documentSectionPlan(detail);
  const story = proposalSolutionStory(proposal, bomRows);
  const displaySchedule = buildDisplaySchedule(proposal, bomRows, videoWall);
  // Only a saved wall carries a transport estimate, so the column appears only
  // when at least one row has a link basis to print.
  const showsTransport = displaySchedule?.rows.some((row) => row.transport) ?? false;
  const showsSize = displaySchedule?.rows.some((row) => row.size) ?? false;
  // Mass comes from the same panel size, so the column appears with the wall.
  const showsWeight = displaySchedule?.rows.some((row) => row.weight) ?? false;
  // A saved wall also owns the elevation drawing that accompanies the schedule.
  const wallRequirements = wallRequirementsFromSummary(videoWall);
  const wallLayout = wallRequirements ? wallVisualLayout(wallRequirements) : null;
  const wallElevation = wallRequirements ? wallElevationSvg(wallRequirements) : "";
  // The drawing shows the agreed fit or crop whenever the source shape differs,
  // and both mappings are shown beside each other so the customer sees the cost.
  const wallOverlay = wallRequirements ? wallElevationOverlay(wallRequirements) : null;
  const wallPreviews = wallRequirements ? wallMappingPreviews(wallRequirements) : null;
  // The survey's install detail is installation scope, so it is scheduled beside
  // the equipment rather than left as notes on the elevation.
  const installation = wallRequirements ? buildInstallationSchedule(wallRequirements) : null;
  // The pair carries a recommendation drawn from the wall's captured plan, so
  // the customer is not left to weigh two costs the rep has already judged.
  const mappingAdvice = wallRequirements ? wallMappingRecommendation(wallRequirements) : null;
  // The saved wall records the card it started on, so the drawing's section says
  // where the design began as well as what it is now: a quote that presented an
  // adjusted wall as the card the customer saw would be overstating the card.
  const startingPoint = wallRequirements
    ? wallStartingPointDrift(wallStartingPointFromSummary(videoWall?.summary), wallRequirements)
    : null;
  const cards = proposalProductCards(bomRows, media);
  const preparedBy = proposal.preparedBy || "";
  const companyName = proposal.companyName || "WyreStorm";
  const contactLine = [proposal.contactEmail, proposal.contactPhone].filter(Boolean).join(" | ");
  const footer = proposal.proposalFooter || "";
  const logoHtml = proposal.companyLogoDataUrl
    ? `<img src="${escapeHtml(proposal.companyLogoDataUrl)}" alt="${escapeHtml(companyName)} logo" style="max-height:64px;max-width:220px;object-fit:contain;" />`
    : `<div class="wm-brand-logo">
        <svg width="140" height="32" viewBox="0 0 140 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="4" width="24" height="24" rx="4" fill="#0ea5e9"/>
          <path d="M6 16l4-6h4l-4 6 4 6h-4l-4-6z" fill="white"/>
          <text x="32" y="22" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#0f172a">WyreStorm</text>
        </svg>
      </div>`;
  const visualBlocks = proposal.visualBlocks ?? [];
  const productFamilyScores = proposal.productFamilyScores ?? [];
  const leadingProductFamilyScore = productFamilyScores[0] ?? null;

  const hasCoreProducts = proposal.products.length > 0;
  const readinessNotice = hasCoreProducts
    ? "This draft includes the selected WyreStorm products. We will confirm final specifications, accessories and dependencies before it is issued."
    : "This export is a discovery/design brief only. No WyreStorm core products have been selected, so it must not be issued as a customer BOM.";

  const assumptions = proposal.assumptions.length
    ? proposal.assumptions
    : ["We will confirm final specifications, accessories, firmware notes, lifecycle and regional availability before this proposal is issued."];

  const requiredProductsLine = proposal.products.length
    ? escapeHtml(proposal.products.map((product: StoredProductSelection) => `${product.sku} - ${product.title || product.family || product.category || "Selected product"}`).join("; "))
    : "No WyreStorm product shortlist has been added yet - Recommendation: open Recommendations or a room template before this is issued as a customer proposal.";

  const optionalRows = bomRows.filter((row) => row.type === "Optional");
  const risksAndDependencies = [...(proposal.governanceWarnings ?? []), ...(proposal.validationNotes ?? [])];
  const governedDependencies = proposal.governedDependencies ?? [];

  const currentDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const proposalRef = `WYR-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  // The printed sheet identifies itself: the running header names the document,
  // the margins carry the reference, the draft state and the page number.
  const runningHeader = `${companyName} · ${proposal.title}`;
  const runningHeaderCss = proposalCssString(
    runningHeader.length > 90 ? `${runningHeader.slice(0, 89).trimEnd()}…` : runningHeader,
  );
  const referenceLineCss = proposalCssString(`Proposal Reference: ${proposalRef}`);
  const draftLineCss = proposalCssString(`Draft Proposal · ${currentDate}`);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(proposal.title)} | WyreStorm Proposal</title>
  <style>
    :root {
      --wyrestorm-primary: #0ea5e9;
      --wyrestorm-primary-dark: #0284c7;
      --wyrestorm-secondary: #0f172a;
      --wyrestorm-accent: #06b6d4;
      --wyrestorm-text: #1e293b;
      --wyrestorm-text-muted: #64748b;
      --wyrestorm-border: #e2e8f0;
      --wyrestorm-bg: #ffffff;
      --wyrestorm-card-bg: #f8fafc;
      --wyrestorm-success: #10b981;
      --wyrestorm-warning: #f59e0b;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif; 
      color: var(--wyrestorm-text); 
      line-height: 1.6; 
      background: var(--wyrestorm-bg);
    }
    .wm-proposal-container { max-width: 900px; margin: 0 auto; padding: 40px; }
    
    /* Header */
    .wm-proposal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 24px;
      border-bottom: 3px solid var(--wyrestorm-primary);
      margin-bottom: 32px;
    }
    .wm-brand-logo { display: flex; align-items: center; }
    .wm-proposal-meta {
      text-align: right;
      font-size: 12px;
      color: var(--wyrestorm-text-muted);
    }
    .wm-proposal-meta strong { display: block; color: var(--wyrestorm-text); }
    
    /* Title section */
    .wm-proposal-title-section { margin-bottom: 32px; }
    h1 { 
      font-size: 28px; 
      font-weight: 700; 
      color: var(--wyrestorm-secondary); 
      margin-bottom: 8px;
      line-height: 1.2;
    }
    .wm-proposal-subtitle {
      font-size: 14px;
      color: var(--wyrestorm-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    /* Section headings */
    h2 { 
      font-size: 18px; 
      font-weight: 700;
      color: var(--wyrestorm-secondary);
      margin-top: 36px; 
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--wyrestorm-border);
    }
    h3 { 
      font-size: 14px; 
      font-weight: 600;
      color: var(--wyrestorm-text);
      margin-top: 20px; 
      margin-bottom: 8px;
    }
    p { max-width: 820px; margin-bottom: 12px; }
    
    /* Tables */
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    th, td { border: 1px solid var(--wyrestorm-border); padding: 10px 12px; text-align: left; vertical-align: top; }
    th { 
      background: var(--wyrestorm-secondary) !important; 
      color: white !important;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    tr:nth-child(even) { background: var(--wyrestorm-card-bg); }
    
    /* Meta and labels */
    .meta { color: var(--wyrestorm-text-muted); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
    .label { font-weight: 600; color: var(--wyrestorm-secondary); }
    
    /* Notice boxes */
    .notice { 
      background: #fef3c7; 
      border: 1px solid #fcd34d; 
      border-left: 4px solid var(--wyrestorm-warning);
      padding: 16px; 
      margin-top: 24px; 
      border-radius: 4px;
    }
    .notice-success { 
      background: #d1fae5; 
      border: 1px solid #6ee7b7; 
      border-left: 4px solid var(--wyrestorm-success);
    }
    
    /* Disclaimer */
    .wm-disclaimer {
      background: var(--wyrestorm-card-bg);
      border: 1px solid var(--wyrestorm-border);
      border-radius: 8px;
      padding: 24px;
      margin-top: 40px;
      margin-bottom: 24px;
    }
    .wm-disclaimer h2 {
      font-size: 14px;
      color: var(--wyrestorm-text-muted);
      border-bottom: none;
      margin-bottom: 12px;
      margin-top: 0;
    }
    .wm-disclaimer p {
      font-size: 11px;
      line-height: 1.6;
      color: var(--wyrestorm-text-muted);
      max-width: 100%;
    }
    
    /* Footer */
    .wm-proposal-footer {
      margin-top: 40px;
      padding-top: 24px;
      border-top: 2px solid var(--wyrestorm-border);
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .wm-footer-brand {
      font-size: 11px;
      color: var(--wyrestorm-text-muted);
    }
    .wm-footer-contact {
      font-size: 11px;
      color: var(--wyrestorm-text-muted);
      text-align: right;
    }
    
    /* Visual grid */
    .visual-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 12px; }
    .visual-card { border: 1px solid var(--wyrestorm-border); padding: 12px; background: var(--wyrestorm-card-bg) !important; border-radius: 6px; }
    .visual-card strong, .visual-card span { display: block; }
    .visual-card span { margin-top: 8px; color: var(--wyrestorm-primary); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
    
    /* Page setup: an A4 sheet whose margins carry a running header, the
       proposal reference and page numbers, so every printed sheet identifies
       itself after it leaves the desk. */
    @page {
      size: A4;
      margin: 24mm 16mm 18mm;
      @top-left {
        content: ${runningHeaderCss};
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 8.5pt;
        color: #64748b;
        vertical-align: bottom;
        padding-bottom: 4mm;
      }
      @top-right {
        content: "Page " counter(page) " of " counter(pages);
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 8.5pt;
        color: #64748b;
        text-align: right;
        vertical-align: bottom;
        padding-bottom: 4mm;
      }
      @bottom-left {
        content: ${referenceLineCss};
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 8pt;
        color: #94a3b8;
        vertical-align: top;
        padding-top: 4mm;
      }
      @bottom-right {
        content: ${draftLineCss};
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 8pt;
        color: #94a3b8;
        text-align: right;
        vertical-align: top;
        padding-top: 4mm;
      }
    }

    @page :first {
      @top-left { content: none; }
      @top-right { content: none; }
    }
    .wm-proposal-cover { min-height: 230mm; }
    .wm-document-control { margin-top: 32px; }
    /* The wall elevation is inline SVG: its fill and stroke come from
       presentation attributes, so its part names carry no declarations of
       their own. Asking for exact colour keeps the drawing intact in the PDF. */
    .wall-elevation-bar, .wall-elevation-content-frame, .wall-elevation-crop,
    .wall-elevation-dimension, .wall-elevation-door, .wall-elevation-ground,
    .wall-elevation-panel, .wall-elevation-person, .wall-elevation-scale,
    .wall-elevation-scale-label, .wall-elevation-screen,
    .wall-elevation-source-frame, .wall-elevation-window {
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    /* Print styles */
    @media print {
      body { font-size: 11pt; }
      /* Page margins come from @page, so the container adds no second inset. */
      .wm-proposal-container { max-width: none; padding: 0; }
      .wm-proposal-cover { break-after: page; page-break-after: always; }
      h1 { font-size: 24pt; }
      h2 { font-size: 14pt; break-after: avoid; page-break-after: avoid; }
      h3 { break-after: avoid; page-break-after: avoid; }
      table { font-size: 10pt; break-inside: auto; page-break-inside: auto; }
      /* A schedule can run past one sheet, so its heading row repeats at the
         top of each page instead of leaving later rows unlabelled. */
      thead { display: table-header-group; break-after: avoid; page-break-after: avoid; }
      thead tr, thead th { break-after: avoid; page-break-after: avoid; }
      tbody tr:first-child { break-before: avoid; page-break-before: avoid; }
      tfoot { display: table-footer-group; }
      tr, td, th { break-inside: avoid; page-break-inside: avoid; }
      figure, .visual-card, .notice, .wm-disclaimer, .wm-proposal-footer { break-inside: avoid; page-break-inside: avoid; }
      a { color: inherit; text-decoration: none; }
    }
  </style>
</head>
<body>
  <div class="wm-proposal-container">
    <section class="wm-proposal-cover" aria-label="Proposal cover">
    <div class="wm-proposal-header">
      <div class="wm-brand-logo">${logoHtml}</div>
      <div class="wm-proposal-meta">
        <strong>Proposal Reference: ${proposalRef}</strong>
        <div>Date: ${currentDate}</div>
        ${preparedBy ? `<div>Prepared by: ${escapeHtml(preparedBy)}</div>` : ""}
        <div>Document: Draft Proposal</div>
      </div>
    </div>

    <div class="wm-proposal-title-section">
      <h1>${escapeHtml(proposal.title)}</h1>
      <div class="wm-proposal-subtitle">${escapeHtml(companyName)} | Technical Proposal</div>
    </div>

    ${contactLine ? `<p class="meta">${escapeHtml(contactLine)}</p>` : ""}
    <section class="wm-document-control" aria-label="Document control">
      <h2>Document control</h2>
      <dl>
        <dt>Reference</dt><dd>${escapeHtml(proposalRef)}</dd>
        <dt>Status</dt><dd>Draft proposal — subject to design and commercial approval</dd>
        <dt>Prepared by</dt><dd>${escapeHtml(preparedBy || companyName)}</dd>
        <dt>Issue date</dt><dd>${escapeHtml(currentDate)}</dd>
        <dt>Revision</dt><dd>${escapeHtml(proposal.updatedAt)}</dd>
      </dl>
    </section>
    </section>

  <h2>Executive Summary</h2>
  <p>${escapeHtml(proposal.summary)}</p>
  ${
    proposal.outputPurpose
      ? `<p>${escapeHtml(proposal.outputPurpose.customerOutput)}</p>`
      : "<p>This document explains what we recommend, how it will work day to day, the equipment involved, and what still needs confirming before it becomes a final proposal.</p>"
  }

  ${roomBriefHtml(proposal, bomRows)}
  <h2>Solution Overview</h2>
  <p>${escapeHtml(story.overview)}</p>
  <h3>What successful delivery looks like</h3>
  <ul>${story.acceptance.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>

  <h2>What You Asked For</h2>
  <p>${escapeHtml(proposal.salesContent?.objectives || proposal.applicationProposal?.customerNeed || proposal.summary || "Your requirement has not been confirmed yet.")}</p>  ${sections.has("discovery-conversation") ? buildDiscoveryConversationHtml(proposal) : ""}
  ${buildUnresolvedDiscoveryHtml(proposal)}

  ${sections.has("design-trace") ? buildCanonicalDesignHtml(proposal) : ""}

  <h2>Recommended Solution</h2>
  ${
    leadingProductFamilyScore
      ? `<p><strong>Recommendation:</strong> <strong>${escapeHtml(leadingProductFamilyScore.family)}</strong> is the best fit for this requirement on the evidence gathered so far. Confidence: ${escapeHtml(String(leadingProductFamilyScore.score))} out of 100.</p><p>${escapeHtml(leadingProductFamilyScore.reasons[0] || "Chosen from the requirements captured so far.")}</p>${
          leadingProductFamilyScore.cautions.length
            ? `<p><strong>Still to confirm:</strong> ${escapeHtml(leadingProductFamilyScore.cautions[0].replace(/^confirm\s+/i, ""))}</p>`
            : "<p><strong>Still to confirm:</strong> Datasheets, dependencies, firmware, product lifecycle, regional availability and accessories, before this proposal is issued.</p>"
        }`
      : "<p>We have not chosen a product family yet, so treat this as a draft until the system design is agreed.</p>"
  }
  <p><strong>Required WyreStorm products:</strong> ${requiredProductsLine}</p>

  <h2>Practical Operation</h2>
  <p>This is what the system will do for the people using the room, day to day.</p>
  ${buildPracticalOperationHtml(proposal, bomRows)}

  <h2>Commercial and Operational Benefits</h2>
  ${buildBenefitsHtml(proposal, bomRows)}

  ${
    !sections.has("technical-architecture")
      ? ""
      : `<h2>Technical Architecture</h2>
  ${proposal.salesContent?.architecture ? `<p>${escapeHtml(proposal.salesContent.architecture)}</p>` : ""}
  <p>The diagram and cable schedule below show how the system connects together. Both are built from the equipment schedule further on.</p>
  ${buildSchematicSectionHtml(proposal, bomRows)}
  ${
    visualBlocks.length
      ? `<h3>Supporting visuals</h3><div class="visual-grid">${visualBlocks.map((block) => {
          const image = block.renderSrc;
          return `<div class="visual-card">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(block.title)}" style="display:block;width:100%;height:auto;margin-bottom:12px;border:1px solid #cbd5e1;border-radius:8px;" />` : ""}<strong>${escapeHtml(block.title)}</strong><p>${escapeHtml(block.summary)}</p><p>${escapeHtml(block.proposalUse)}</p><span>${escapeHtml(block.exportLabel)}</span></div>`;
        }).join("")}</div>`
      : ""
  }`
  }

  ${
    sections.has("products-in-the-solution")
      ? `<h2>Products in the Solution</h2>
  <div class="visual-grid">${cards.map((card) => `<div class="visual-card">${card.imageUrl ? `<img src="${escapeHtml(card.imageUrl)}" alt="${escapeHtml(card.alt)}" style="width:100%;height:140px;object-fit:contain" />` : "<p>Product photograph unavailable.</p>"}<strong>${escapeHtml(card.sku)} — ${escapeHtml(card.name)}</strong><p>Role in this design: ${escapeHtml(card.role || "To be confirmed")}</p>${card.url ? `<a href="${escapeHtml(card.url)}" target="_blank" rel="noopener noreferrer">Manufacturer product page and documentation</a>` : "<p>Official product link to be confirmed.</p>"}</div>`).join("")}</div>`
      : ""
  }
  <h2>Complete System Design and Responsibilities</h2>
  <p>${escapeHtml(CUSTOMER_COPY.scopeIntro)}</p>
  <ul>${story.externalScope.split(/\r?\n/).filter(Boolean).map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>

  ${displaySchedule ? `<h2>Display Schedule</h2>
  <p>${escapeHtml(displaySchedule.headline)}</p>
  ${wallElevation && wallLayout ? `<figure style="margin:18px 0 14px;padding:14px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc;break-inside:avoid;page-break-inside:avoid;">
    ${wallElevation}
    <figcaption style="margin-top:10px;font-size:12px;line-height:1.5;color:#475569;">${escapeHtml(wallElevationCaption(wallLayout, wallOverlay))}</figcaption>
    ${wallPreviews ? `<p style="margin:16px 0 4px;font-size:12px;font-weight:600;color:#0f2534;">Source mapping options</p>
    <p style="margin:0 0 8px;font-size:11px;line-height:1.45;color:#475569;">The source and the wall have different shapes, so one of these two costs is unavoidable. Both drawings show this wall at the same size; this design uses <strong>${wallPreviews.chosen === "fit" ? "Fit" : "Fill"}</strong>.</p>
    ${mappingAdvice ? `<p data-mapping-recommendation="${mappingAdvice.value}" style="margin:0 0 10px;font-size:11.5px;line-height:1.45;color:#0f2534;"><strong>Recommendation: ${mappingAdvice.value === "fit" ? "Fit" : "Fill"}.</strong> ${escapeHtml(mappingAdvice.basis)} ${escapeHtml(mappingAdvice.cost)}</p>` : ""}
    <div data-mapping-row="fit-fill" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:start;break-inside:avoid;page-break-inside:avoid;">
      ${wallPreviews.previews.map((preview) => `<div data-mapping-option="${preview.value}" style="padding:8px;border:1px solid ${preview.value === wallPreviews.chosen ? "#16b8b0" : "#cbd5e1"};border-radius:8px;background:#fff;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#0f2534;">${preview.value === "fit" ? "Fit" : "Fill"}${[preview.value === wallPreviews.chosen ? "in this design" : "", preview.value === mappingAdvice?.value ? "recommended" : ""].filter(Boolean).map((note) => ` · ${note}`).join("")}</p>
        ${preview.svg}
        <p style="margin:6px 0 0;font-size:11px;line-height:1.45;color:#0f2534;font-weight:600;">${escapeHtml(preview.consequence)}</p>
      </div>`).join("")}
    </div>` : ""}
  </figure>` : ""}
  ${startingPoint ? `<p data-wall-starting-point="${escapeHtml(startingPoint.card.key)}" style="margin:0 0 12px;font-size:11.5px;line-height:1.5;color:#475569;">${escapeHtml(wallStartingPointRecordText(startingPoint))}</p>` : ""}
  <table>
    ${displaySchedule.size ? `<caption style="caption-side:top;text-align:left;padding:0 0 8px;font-size:12px;color:#475569;">${escapeHtml(displaySchedule.size)}</caption>` : ""}
    <thead>
      <tr><th>Screen</th>${showsSize ? "<th>Size (mm)</th>" : ""}${showsWeight ? "<th>Weight</th>" : ""}<th>Resolution</th><th>Feeds</th>${showsTransport ? "<th>Transport</th>" : ""}<th>Scaling</th><th>Notes</th></tr>
    </thead>
    <tbody>
      ${displaySchedule.rows.map((row) => `<tr><td>${escapeHtml(row.screen)}</td>${showsSize ? `<td style="white-space:nowrap">${escapeHtml(row.size)}</td>` : ""}${showsWeight ? `<td style="white-space:nowrap">${escapeHtml(row.weight)}</td>` : ""}<td>${escapeHtml(row.resolution)}</td><td>${escapeHtml(row.feeds)}</td>${showsTransport ? `<td>${escapeHtml(row.transport)}</td>` : ""}<td>${escapeHtml(row.scaling)}</td><td>${escapeHtml(row.notes)}</td></tr>`).join("")}
    </tbody>
  </table>
  ${showsTransport ? `<p data-wall-cable-key style="margin:8px 0 0;font-size:11.5px;line-height:1.5;color:#475569;">${WALL_SURVEY_COLUMN_KEY.map((entry) => `<strong>${escapeHtml(entry.label)}</strong> — ${escapeHtml(entry.text)}`).join(" ")}</p>` : ""}
  ${displaySchedule.mounting ? `<p style="margin-top:8px;font-size:12px;color:#475569;"><strong>Mounting:</strong> ${escapeHtml(displaySchedule.mounting)}</p>` : ""}
  ${displaySchedule.transportFlags.length > 0 ? `<p style="margin-top:8px;font-size:12px;color:#475569;"><strong>Transport limits:</strong></p>
  <ul>${displaySchedule.transportFlags.map((flag) => `<li>${escapeHtml(flag)}</li>`).join("")}</ul>` : ""}
  <p style="margin-top:8px;font-size:12px;color:#475569;"><strong>Basis:</strong> ${escapeHtml(displaySchedule.basis)}</p>
  ${displaySchedule.install ? `<h3>Installation Detail</h3>
  <p>${escapeHtml(displaySchedule.install.text)}</p>
  <table>
    <thead>
      <tr><th>Link</th><th>Display housing</th><th>Mount</th><th>Termination</th><th>Run entry</th></tr>
    </thead>
    <tbody>
      ${displaySchedule.install.rows.map((row) => `<tr><td>${escapeHtml(row.link)}</td><td>${escapeHtml(row.enclosure)}</td><td>${escapeHtml(row.mount)}</td><td>${escapeHtml(row.termination)}</td><td>${escapeHtml(row.entry)}</td></tr>`).join("")}
    </tbody>
  </table>` : ""}` : ""}

  <h2>Equipment Schedule</h2>
  ${proposal.pricing ? pricedEquipmentHtml(bomRows, proposal.pricing) : `<table>
    <thead>
      <tr><th>Item</th><th>SKU</th><th>Description</th><th>Role</th><th>Qty</th><th>Type</th><th>Notes</th></tr>
    </thead>
    <tbody>
      ${bomRows.length ? bomRows.map((row) => `<tr><td>${row.item}</td><td>${escapeHtml(row.sku)}</td><td>${escapeHtml(row.description)}</td><td>${escapeHtml(row.role)}</td><td>${row.qty}</td><td>${escapeHtml(row.type)}</td><td>${escapeHtml(row.notes)}</td></tr>`).join("") : '<tr><td colspan="7">No equipment schedule rows are currently selected.</td></tr>'}
    </tbody>
    <tfoot><tr><th colspan="4" scope="row">Equipment schedule totals</th><td>${bomRows.reduce((sum, row) => sum + row.qty, 0)}</td><td colspan="2">${bomRows.length} line items</td></tr></tfoot>
  </table>`}
  <p style="margin-top:8px;font-size:12px;color:#475569;"><strong>Evidence basis:</strong> ${bomRows.length ? escapeHtml(bomRows.map((row) => `${row.sku}: ${row.evidence}`).join(" | ")) : "No product evidence captured yet."}</p>
  ${installation ? `<h3>Installation and Services</h3>
  <p>${escapeHtml(installation.text)}</p>
  ${proposal.pricing ? pricedInstallationHtml(installation, proposal.pricing) : `<table>
    <thead>
      <tr>${installationTableHeaders(["service", "detail", "quantity", "links"]).map((label) => `<th>${label}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${installation.lines.map((line) => `<tr data-installation-line="${escapeHtml(line.id)}"><td>${escapeHtml(installationCategoryLabel(line.category))}</td><td>${escapeHtml(line.detail)}</td><td>${line.quantity}</td><td>${escapeHtml(line.links.join(", "))}</td></tr>`).join("")}
    </tbody>
    <tfoot><tr><th colspan="2" scope="row">Installation schedule totals</th><td>${installation.lines.reduce((sum, line) => sum + line.quantity, 0)}</td><td>${installation.lines.length} line items</td></tr></tfoot>
  </table>`}
  <p style="margin-top:8px;font-size:12px;color:#475569;">Quantities are the wall links the site survey recorded for each item.</p>` : ""}

  ${
    sections.has("power-strategy")
      ? `<h2>Power Strategy</h2>
  <p>The power figures below come from WyreStorm product data for each selected product. They are the maximum the published specification states, and should be checked against the current datasheet before ordering.</p>
  ${buildPowerStrategyHtml(products)}`
      : ""
  }

  <h2>Options</h2>
  <ul>${
    optionalRows.length
      ? optionalRows.map((row) => `<li><strong>Option:</strong> ${escapeHtml(row.sku)} - ${escapeHtml(row.description)}</li>`).join("")
      : "<li>No optional enhancements are currently selected.</li>"
  }</ul>

  <h2>Assumptions and Exclusions</h2>
  <h3>Assumptions</h3>
  <ul>${assumptions.map((assumption) => `<li><strong>Assumption:</strong> ${escapeHtml(assumption)}</li>`).join("")}</ul>
  <h3>Exclusions</h3>
  ${buildExclusionsHtml(bomRows)}

  <h2>Risks and Dependencies</h2>
  <h3>Risks and open questions</h3>
  <ul>${
    risksAndDependencies.length
      ? risksAndDependencies.map((item) => `<li><strong>Risk:</strong> ${escapeHtml(item)}</li>`).join("")
      : "<li><strong>Risk:</strong> Validate datasheets, lifecycle status, regional suitability, and dependencies before customer issue.</li>"
  }</ul>
  <h3>Dependencies</h3>
  ${
    governedDependencies.length
      ? `<ul>${governedDependencies.map((dependency) => {
          const ruleSource = dependency.ruleSource ? ` Source: ${dependency.ruleSource}` : "";
          return `<li><strong>Dependency:</strong> <strong>${escapeHtml(dependency.sku)} - ${escapeHtml(dependency.label)}</strong>: ${escapeHtml(dependency.validationQuestion)} Why: ${escapeHtml(dependency.evidence)}${escapeHtml(ruleSource)}</li>`;
        }).join("")}</ul>`
      : "<p>No dependencies have been identified yet.</p>"
  }

  <h2>Implementation and Next Steps</h2>
  <ul>${proposal.repGuidance?.length ? proposal.repGuidance.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : "<li>Confirm discovery assumptions and validate the final design before issue.</li>"}</ul>

  <div class="notice ${hasCoreProducts ? 'notice-success' : ''}">${escapeHtml(readinessNotice)}</div>
  <div class="notice">${escapeHtml(CUSTOMER_COPY.competitorExclusion)}</div>

  ${sections.has("technical-appendix") ? appendixHtml(bomRows) : ""}

  <section class="wm-disclaimer" data-wingman-best-efforts-disclaimer="true">
    <h2>Important Notice & Best-Efforts Disclaimer</h2>
    <p>This proposal has been prepared on a best-efforts basis using WyreStorm Wingman to support your sales and design process. The information contained herein is provided for planning purposes only and does not constitute a binding quotation, order confirmation, or statement of capability.</p>
    <p><strong>Product Specifications:</strong> All product specifications, features, compatibility information, lifecycle status, regional availability, pricing, and lead times are indicative and must be independently verified against the current official WyreStorm documentation, datasheets, or by contacting the WyreStorm order desk before this document is used for any commercial purpose.</p>
    <p><strong>Third-Party Products:</strong> References to competitor or third-party products are approximate and provided solely for comparative context. WyreStorm makes no claims regarding the accuracy of third-party specifications.</p>
    <p><strong>Technical Validation:</strong> System designs, power budgets, cable schedules, and equipment selections shown in this proposal are based on available product data and assumptions stated within. Final designs must be validated by a qualified AV integrator or pre-sales engineer before installation.</p>
    <p><strong>Limitation of Liability:</strong> WyreStorm Technologies Ltd provides this document "as is" without warranty of any kind, either expressed or implied. WyreStorm shall not be liable for any errors, omissions, or damages arising from the use of or reliance on the information contained in this document.</p>
    <p style="margin-top: 12px; font-style: italic;">For the most current product information, please visit <strong>wyrestorm.com</strong> or contact your regional WyreStorm sales representative.</p>
  </section>

  <div class="wm-proposal-footer">
    <div class="wm-footer-brand">
      <svg width="100" height="24" viewBox="0 0 100 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="2" width="18" height="18" rx="3" fill="#0ea5e9"/>
        <path d="M4.5 12l3-4.5h3l-3 4.5 3 4.5h-3l-3-4.5z" fill="white"/>
        <text x="24" y="16" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#0f172a">WyreStorm</text>
      </svg>
      <p style="font-size: 10px; color: #94a3b8; margin-top: 4px;">Professional AV Solutions</p>
    </div>
    <div class="wm-footer-contact">
      ${contactLine ? `<p>${escapeHtml(contactLine)}</p>` : ""}
      <p>wyrestorm.com</p>
      <p style="font-size: 10px; color: #94a3b8; margin-top: 4px;">${escapeHtml(footer || 'Prepared using WyreStorm Wingman')}</p>
    </div>
  </div>

  <section data-wingman-proposal-safety-sections="true">
    <h2>Confirmed Requirement</h2>
    <p>${escapeHtml(proposal.salesContent?.objectives || proposal.applicationProposal?.customerNeed || proposal.summary || "The customer requirement has not yet been confirmed.")}</p>

    <h2>Design Assumptions</h2>
    <ul>${
      proposal.assumptions?.length
        ? proposal.assumptions.map((assumption) => `<li>${escapeHtml(assumption)}</li>`).join("")
        : "<li>No design assumptions have been confirmed. Validate room, source, display, distance, USB, audio, control, network and power requirements before issue.</li>"
    }</ul>

    <h2>Recommended Architecture</h2>
    ${
      proposal.productFamilyScores?.[0]
        ? `<p><strong>${escapeHtml(proposal.productFamilyScores[0].family)}</strong> is our recommended product family.</p><p>${escapeHtml(proposal.productFamilyScores[0].reasons?.[0] || "The design still needs technical checks before this proposal is issued.")}</p>`
        : "<p>No recommended architecture has been confirmed. Treat this export as a discovery/design draft until the system path is validated.</p>"
    }

    <h2>Required WyreStorm Products</h2>
    <ul>${
      proposal.products?.length
        ? proposal.products.map((product) => `<li><strong>${escapeHtml(product.sku)}</strong> - ${escapeHtml(product.title || product.family || product.category || "Selected WyreStorm product")}</li>`).join("")
        : "<li>No required WyreStorm core products have been selected.</li>"
    }</ul>

    <h2>Optional Enhancements</h2>
    <ul>${
      bomRows.some((row) => row.type === "Optional")
        ? bomRows.filter((row) => row.type === "Optional").map((row) => `<li><strong>${escapeHtml(row.sku)}</strong> - ${escapeHtml(row.description)}</li>`).join("")
        : "<li>No optional enhancements are currently selected.</li>"
    }</ul>

    <h2>Risks / Needs Validation</h2>
    <ul>${
      [...(proposal.governanceWarnings ?? []), ...(proposal.validationNotes ?? [])].length
        ? [...(proposal.governanceWarnings ?? []), ...(proposal.validationNotes ?? [])].map((item) => `<li>${escapeHtml(item)}</li>`).join("")
        : "<li>Validate datasheets, lifecycle status, dependencies, accessories, firmware and regional suitability before customer issue.</li>"
    }</ul>

    <h2>Next Steps</h2>
    <ul>${
      proposal.repGuidance?.length
        ? proposal.repGuidance.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
        : "<li>Confirm discovery assumptions, validate the architecture and approve the final product list before issue.</li>"
    }</ul>
  </section>

  </div><!-- .wm-proposal-container -->
${proposalPrintPaginationHtml()}
</body>
</html>`;
}

export async function exportProposalHtml(proposal: StoredProjectProposal, bomRows: BomRow[], products: StoredProductSelection[] = [], videoWall: StoredVideowallSummary | null = null, detail: DocumentDetail = HOUSE_DOCUMENT_BRAND.detail) {
  assertWallTransportExportable(wallTransportRequirements(wallRequirementsFromSummary(videoWall)));
  downloadBlob(new Blob([buildProposalHtml(proposal, bomRows, products, await loadProductMediaIndex(), videoWall, detail)], { type: "text/html;charset=utf-8" }), `${fileBaseName(proposal.title)}.proposal.html`);
  trackDesignProjectExport(proposal.designRevision, "html");
}

export function exportBomCsv(proposal: StoredProjectProposal, bomRows: BomRow[]) {
  downloadBlob(new Blob([buildBomCsv(bomRows)], { type: "text/csv;charset=utf-8" }), `${fileBaseName(proposal.title)}.bom.csv`);
  trackDesignProjectExport(proposal.designRevision, "csv");
}

/**
 * Opens the same formatted proposal document in a new tab and triggers the
 * browser print dialog, where "Save as PDF" is a standard destination on
 * every major OS/browser. Avoids pulling in a client-side PDF-generation
 * library purely to duplicate what the HTML export already renders.
 */
export async function exportProposalPdf(proposal: StoredProjectProposal, bomRows: BomRow[], products: StoredProductSelection[] = [], videoWall: StoredVideowallSummary | null = null, detail: DocumentDetail = HOUSE_DOCUMENT_BRAND.detail) {
  if (typeof window === "undefined") return;
  // Checked before the print tab opens, so a blocked export leaves no blank tab.
  assertWallTransportExportable(wallTransportRequirements(wallRequirementsFromSummary(videoWall)));

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    throw new Error("Pop-up blocked. Allow pop-ups for this site, or use Export HTML and print to PDF from your browser instead.");
  }

  const media = await loadProductMediaIndex();
  if (printWindow.closed) return;
  printWindow.document.open();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
  printWindow.document.write(buildProposalHtml(proposal, bomRows, products, media, videoWall, detail));
  printWindow.document.close();
  trackDesignProjectExport(proposal.designRevision, "pdf");
}
