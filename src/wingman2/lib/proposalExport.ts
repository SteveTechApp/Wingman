import type { StoredProjectProposal, StoredProductSelection } from "../data/projectStore";
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
import { buildWingmanSchematic } from "./schematic/wingmanSchematicEngine";
import { proposalSchematicBrief } from "./schematic/proposalSchematicBrief";

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
    return "<p>Add BOM rows to this proposal to generate a system schematic and cable schedule.</p>";
  }

  const contextBlob = proposalContextBlob(proposal);
  const nodes = buildSchematicNodes(contextBlob, bomRows);

  // Try native schematic engine first, fall back to legacy
  let cableRowsHtml = "";
  try {
    const products = proposal.products ?? [];
    const bomRowsForSchematic = (proposal.bomRows ?? []).map((r) => ({ sku: r.sku, description: r.description, role: r.role, qty: r.qty }));
    const brief = proposalSchematicBrief(proposal.title || "System schematic", products, bomRowsForSchematic);
    const schematicModel = buildWingmanSchematic(brief);
    const nativeCableRows = buildNativeCableSchedule(schematicModel);
    if (nativeCableRows.length > 0) {
      const statusColor: Record<string, string> = {
        confirmed: "#16a34a",
        "needs-site-confirmation": "#d97706",
        unknown: "#dc2626",
      };
      cableRowsHtml = nativeCableRows
        .map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(nativeCableToneLabel(row.type))}</td><td>${row.maxLengthMetres != null ? `${row.maxLengthMetres}m` : "Unlimited"}</td><td>${escapeHtml(row.connectors || "TBC")}</td><td style="color:${statusColor[row.validationStatus] || "#475569"};font-weight:600;">${escapeHtml(cableValidationStatusLabel(row.validationStatus))}</td><td>${escapeHtml(row.reminder)}</td></tr>`)
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
    <div style="display:flex;flex-wrap:wrap;align-items:stretch;gap:8px;margin-top:8px;">${nodesHtml}</div>
    <p style="margin-top:14px;font-size:12px;color:#475569;">This diagram is derived directly from the equipment schedule below - it shows the assumed signal flow from source to display so the customer and installer share the same picture of how the room connects together. The cable schedule underneath lists the transport type, connectors, maximum length, and validation status for each connection.</p>
    <table>
      <thead><tr><th>Cable run</th><th>Transport</th><th>Max length</th><th>Connectors</th><th>Status</th><th>Validation reminder</th></tr></thead>
      <tbody>${cableRowsHtml}</tbody>
    </table>`;
}

function buildPracticalOperationHtml(proposal: StoredProjectProposal, bomRows: BomRow[]) {
  if (!bomRows.length) {
    return "<p>Add equipment schedule rows to describe how this system will operate day to day.</p>";
  }

  const architecture = inferSchematicArchitecture(proposalContextBlob(proposal), bomRows);
  const items: string[] = [
    "Users will select the source they need and it will appear on the assigned display(s) without reconnecting any equipment.",
  ];

  if (architecture.isMatrix) {
    items.push("Routing runs through a fixed central matrix, so day-to-day source changes happen instantly and do not depend on the network team.");
  }

  if (architecture.isNhd600 || architecture.isNhd500 || architecture.isNhd100) {
    items.push("Routing runs over the AV-over-IP network, so additional displays, sources or rooms can be added later within the same architecture.");
  }

  if (architecture.hasVideoWall) {
    items.push("Where the video wall processor is used, content can be shown as one combined canvas or split back to independent displays.");
  }

  if (architecture.hasCamera || architecture.hasUsb || architecture.isApollo) {
    items.push("Camera, microphone and USB conferencing access will be available to the connected laptop or room PC once the USB host path is confirmed.");
  }

  if (architecture.hasDanteAudio) {
    items.push("Room audio will follow the selected source by default, unless a separate audio zone or DSP configuration is agreed.");
  }

  items.push("Day-to-day operation is intended to use simple named presets or a control interface rather than requiring the user to understand the underlying signal path.");

  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function buildBenefitsHtml(proposal: StoredProjectProposal, bomRows: BomRow[]) {
  if (!bomRows.length) {
    return "<p>Add equipment schedule rows to generate the benefit summary for this design.</p>";
  }

  const architecture = inferSchematicArchitecture(proposalContextBlob(proposal), bomRows);
  const items: string[] = ["A consistent, repeatable connection experience across the room(s) covered by this proposal."];

  if (architecture.isMatrix) {
    items.push("Fixed, predictable routing keeps the system simple to support without an ongoing network dependency.");
  }

  if (architecture.isNhd600 || architecture.isNhd500 || architecture.isNhd100) {
    items.push("An AV-over-IP architecture gives a clear, supported path to add displays, sources or rooms later without redesigning the system.");
  }

  if (architecture.hasVideoWall) {
    items.push("A dedicated wall processor keeps feature-wall content management separate from day-to-day room routing.");
  }

  if (architecture.hasCamera || architecture.hasUsb || architecture.isApollo) {
    items.push("Built-in conferencing support reduces the need for a separate room PC or standalone UC appliance.");
  }

  if (architecture.hasDanteAudio) {
    items.push("Networked audio distribution simplifies zoning and future audio expansion.");
  }

  if (architecture.hasByOthers) {
    items.push("Placeholder rows in the equipment schedule flag exactly which supporting equipment (displays, audio, control, network, rack) still needs to be confirmed, so nothing outside WyreStorm's scope is silently assumed to be included.");
  }

  items.push("Final commercial and operational benefit statements should be confirmed against the customer's specific business or KPI outcome before proposal issue.");

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
  <p>The recommendation in this document is based on the discovery conversation captured below: the question asked, the closest governed answer, and the customer's own wording where recorded. Rows marked "Confirmed with customer" were verified with the customer during discovery; rows marked "To be confirmed" are still open and must be verified before final design sign-off. Nothing here is presented as a settled fact that was not said during discovery.</p>
  <table>
    <thead><tr><th>Question asked</th><th>Governed answer</th><th>Customer wording</th><th>Status</th><th>Capture confidence</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="font-size:12px;">${escapeHtml(CAPTURE_CONFIDENCE_EXPLAINER)}</p>
  <p style="font-size:12px;">Where a row is a note-only capture, the answer was still open at the time of writing and must be confirmed before final design sign-off.</p>`;
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
    ? `<p style="margin-top:10px;"><strong>Specifically excluded from this WyreStorm equipment schedule, provided by others:</strong></p><ul>${byOthersRows
        .map((row) => `<li>${escapeHtml(row.sku)} - ${escapeHtml(row.description)}</li>`)
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

function saveTextFile(fileName: string, text: string, type: string) {
  if (typeof window === "undefined") return;

  const blob = new Blob([text], { type });
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
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
      const powerDetail = s.powerLines.length ? s.powerLines.join("; ") : "No power data in governed profile";
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
    summaryHtml += `No products in the current BOM have a proven power-consumption figure in their governed profile. Confirm PSU / power-source requirements before quoting.`;
  }
  if (poeProducts.length) {
    summaryHtml += ` ${poeProducts.length} product${poeProducts.length > 1 ? "s" : ""} (${poeProducts.map((s) => s.sku).join(", ")}) ${poeProducts.length > 1 ? "require" : "requires"} PoE/PoH — confirm the injector or switch PoE budget covers the total.`;
  }
  summaryHtml += `</p>`;

  return `<table>
    <thead><tr><th>SKU</th><th>Qty</th><th>Per-unit max</th><th>Total max</th><th>Power data (governed profile)</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>${summaryHtml}`;
}

export function buildProposalHtml(proposal: StoredProjectProposal, bomRows: BomRow[], products: StoredProductSelection[] = []) {
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
    ? "This proposal draft includes selected WyreStorm products. Validate final product specifications, accessories and dependencies before issue."
    : "This export is a discovery/design brief only. No WyreStorm core products have been selected, so it must not be issued as a customer BOM.";

  const assumptions = proposal.assumptions.length
    ? proposal.assumptions
    : ["Validate final product specifications, accessories, firmware notes, lifecycle, and regional suitability before issue."];

  const requiredProductsLine = proposal.products.length
    ? escapeHtml(proposal.products.map((product: StoredProductSelection) => `${product.sku} - ${product.title || product.family || product.category || "Selected product"}`).join("; "))
    : "No WyreStorm product shortlist has been added yet - Recommendation: open Recommendations or a room template before this is issued as a customer proposal.";

  const optionalRows = bomRows.filter((row) => row.type === "Optional");
  const risksAndDependencies = [...(proposal.governanceWarnings ?? []), ...(proposal.validationNotes ?? [])];
  const governedDependencies = proposal.governedDependencies ?? [];

  const currentDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const proposalRef = `WYR-${Date.now().toString(36).toUpperCase().slice(-6)}`;

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
    
    /* Print styles */
    @media print {
      body { font-size: 11pt; }
      .wm-proposal-container { padding: 20px; }
      h1 { font-size: 24pt; }
      h2 { font-size: 14pt; }
      table { font-size: 10pt; }
    }
  </style>
</head>
<body>
  <div class="wm-proposal-container">
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

  <h2>Executive Summary</h2>
  <p>${escapeHtml(proposal.summary)}</p>
  ${
    proposal.outputPurpose
      ? `<p>${escapeHtml(proposal.outputPurpose.customerOutput)}</p>`
      : "<p>This document sets out the WyreStorm recommendation for this requirement, how it will work in use, the equipment involved, and what remains to be confirmed before it is issued as a final customer proposal.</p>"
  }

  <h2>Customer Requirement</h2>
  <p><strong>Confirmed requirement:</strong> ${escapeHtml(proposal.summary || "The customer requirement has not yet been confirmed.")}</p>
  ${proposal.outputPurpose ? `<p><strong>Sales motion:</strong> ${escapeHtml(proposal.outputPurpose.motion)}</p>` : ""}
  ${buildDiscoveryConversationHtml(proposal)}
  ${buildUnresolvedDiscoveryHtml(proposal)}

  <h2>Recommended Solution</h2>
  ${
    leadingProductFamilyScore
      ? `<p><strong>Recommendation:</strong> <strong>${escapeHtml(leadingProductFamilyScore.family)}</strong> is the leading product-family path for this requirement, based on the recommendation evidence gathered so far (family confidence ${escapeHtml(String(leadingProductFamilyScore.score))}/100).</p><p>${escapeHtml(leadingProductFamilyScore.reasons[0] || "Family path selected from recommendation evidence.")}</p>${
          leadingProductFamilyScore.cautions.length
            ? `<p><strong>Information required:</strong> ${escapeHtml(leadingProductFamilyScore.cautions[0])}</p>`
            : "<p><strong>Information required:</strong> Validate datasheet, dependencies, firmware, lifecycle, regional suitability and accessories before customer issue.</p>"
        }`
      : "<p>No product-family decision has been stored yet. Treat this as a draft until the architecture and family path are confirmed.</p>"
  }
  <p><strong>Required WyreStorm products:</strong> ${requiredProductsLine}</p>

  <h2>Practical Operation</h2>
  <p>This is what the system will do for the people using the room, day to day.</p>
  ${buildPracticalOperationHtml(proposal, bomRows)}

  <h2>Commercial and Operational Benefits</h2>
  ${buildBenefitsHtml(proposal, bomRows)}

  <h2>Technical Architecture</h2>
  <p>The following diagram and cable schedule explain how the recommended solution connects together, derived directly from the equipment schedule below.</p>
  ${buildSchematicSectionHtml(proposal, bomRows)}
  ${
    visualBlocks.length
      ? `<h3>Supporting visuals</h3><div class="visual-grid">${visualBlocks.map((block) => {
          const image = block.renderSrc;
          return `<div class="visual-card">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(block.title)}" style="display:block;width:100%;height:auto;margin-bottom:12px;border:1px solid #cbd5e1;border-radius:8px;" />` : ""}<strong>${escapeHtml(block.title)}</strong><p>${escapeHtml(block.summary)}</p><p>${escapeHtml(block.proposalUse)}</p><span>${escapeHtml(block.exportLabel)}</span></div>`;
        }).join("")}</div>`
      : ""
  }

  <h2>Equipment Schedule</h2>
  <table>
    <thead>
      <tr><th>Item</th><th>SKU</th><th>Description</th><th>Role</th><th>Qty</th><th>Type</th><th>Notes</th></tr>
    </thead>
    <tbody>
      ${bomRows.length ? bomRows.map((row) => `<tr><td>${row.item}</td><td>${escapeHtml(row.sku)}</td><td>${escapeHtml(row.description)}</td><td>${escapeHtml(row.role)}</td><td>${row.qty}</td><td>${escapeHtml(row.type)}</td><td>${escapeHtml(row.notes)}</td></tr>`).join("") : '<tr><td colspan="7">No equipment schedule rows are currently selected.</td></tr>'}
    </tbody>
  </table>
  <p style="margin-top:8px;font-size:12px;color:#475569;"><strong>Evidence basis:</strong> ${bomRows.length ? escapeHtml(bomRows.map((row) => `${row.sku}: ${row.evidence}`).join(" | ")) : "No product evidence captured yet."}</p>

  <h2>Power Strategy</h2>
  <p>The power budget below is derived from the governed technical profiles for each selected product. Figures are stated-maximum consumption per the published profile and must be verified against the current datasheet before order.</p>
  ${buildPowerStrategyHtml(products)}

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
  <h3>Risks / information required</h3>
  <ul>${
    risksAndDependencies.length
      ? risksAndDependencies.map((item) => `<li><strong>Risk:</strong> ${escapeHtml(item)}</li>`).join("")
      : "<li><strong>Risk:</strong> Validate datasheets, lifecycle status, regional suitability, and dependencies before customer issue.</li>"
  }</ul>
  <h3>Governed dependencies</h3>
  ${
    governedDependencies.length
      ? `<ul>${governedDependencies.map((dependency) => {
          const governanceKind = dependency.governanceKind ?? (dependency.sku.startsWith("TBC-") ? "Prompt" : "Exact");
          const ruleSource = dependency.ruleSource ? ` Source: ${dependency.ruleSource}` : "";
          return `<li><strong>Dependency:</strong> <strong>${escapeHtml(dependency.sku)} - ${escapeHtml(dependency.label)}</strong> (${escapeHtml(governanceKind)}): ${escapeHtml(dependency.validationQuestion)} Basis: ${escapeHtml(dependency.evidence)}${escapeHtml(ruleSource)}</li>`;
        }).join("")}</ul>`
      : "<p>No governed dependencies have been triggered yet.</p>"
  }

  <h2>Implementation and Next Steps</h2>
  <ul>${proposal.repGuidance?.length ? proposal.repGuidance.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : "<li>Confirm discovery assumptions and validate the final design before issue.</li>"}</ul>

  <div class="notice ${hasCoreProducts ? 'notice-success' : ''}">${escapeHtml(readinessNotice)}</div>
  <div class="notice">Competitor products are excluded from this proposal and equipment schedule unless a comparison-only output is explicitly requested.</div>

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
    <p>${escapeHtml(proposal.summary || "The customer requirement has not yet been confirmed.")}</p>

    <h2>Design Assumptions</h2>
    <ul>${
      proposal.assumptions?.length
        ? proposal.assumptions.map((assumption) => `<li>${escapeHtml(assumption)}</li>`).join("")
        : "<li>No design assumptions have been confirmed. Validate room, source, display, distance, USB, audio, control, network and power requirements before issue.</li>"
    }</ul>

    <h2>Recommended Architecture</h2>
    ${
      proposal.productFamilyScores?.[0]
        ? `<p><strong>${escapeHtml(proposal.productFamilyScores[0].family)}</strong> is the current leading product-family direction.</p><p>${escapeHtml(proposal.productFamilyScores[0].reasons?.[0] || "The architecture still requires technical validation before customer issue.")}</p>`
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
</body>
</html>`;
}

export function exportProposalHtml(proposal: StoredProjectProposal, bomRows: BomRow[], products: StoredProductSelection[] = []) {
  saveTextFile(`${fileBaseName(proposal.title)}.proposal.html`, buildProposalHtml(proposal, bomRows, products), "text/html;charset=utf-8");
}

export function exportBomCsv(proposal: StoredProjectProposal, bomRows: BomRow[]) {
  saveTextFile(`${fileBaseName(proposal.title)}.bom.csv`, buildBomCsv(bomRows), "text/csv;charset=utf-8");
}

/**
 * Opens the same formatted proposal document in a new tab and triggers the
 * browser print dialog, where "Save as PDF" is a standard destination on
 * every major OS/browser. Avoids pulling in a client-side PDF-generation
 * library purely to duplicate what the HTML export already renders.
 */
export function exportProposalPdf(proposal: StoredProjectProposal, bomRows: BomRow[], products: StoredProductSelection[] = []) {
  if (typeof window === "undefined") return;

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    throw new Error("Pop-up blocked. Allow pop-ups for this site, or use Export HTML and print to PDF from your browser instead.");
  }

  printWindow.document.open();
  printWindow.document.write(buildProposalHtml(proposal, bomRows, products));
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}
