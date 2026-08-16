import type { StoredProjectProposal, StoredProductSelection } from "../data/projectStore";
import {
  buildCableSchedule,
  buildSchematicNodes,
  cableToneLabel,
  inferSchematicArchitecture,
} from "./roomSchematicEngine";
import type { SalesBomRow } from "./salesReadiness";

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
  const cableRows = buildCableSchedule(contextBlob, bomRows);

  const nodesHtml = nodes
    .map((node, index) => {
      const color = schematicToneClass[node.tone] || "#475569";
      const box = `<div style="min-width:150px;max-width:190px;border:1px solid ${color};border-top:4px solid ${color};border-radius:8px;padding:10px 12px;background:var(--wm-sweep-card, #f8fafc);"><small style="display:block;color:${color};font-weight:800;font-size:11px;">STEP ${escapeHtml(node.label)}</small><strong style="display:block;font-size:13px;margin-top:2px;">${escapeHtml(node.title)}</strong><p style="margin:6px 0 0;font-size:11.5px;line-height:1.4;color:#334155;">${escapeHtml(node.detail)}</p>${node.count ? `<span style="display:block;margin-top:6px;font-size:10.5px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.04em;">${escapeHtml(node.count)}</span>` : ""}</div>`;
      const arrow = index < nodes.length - 1 ? `<div style="align-self:center;font-size:18px;color:#94a3b8;">&#8594;</div>` : "";
      return `${box}${arrow}`;
    })
    .join("");

  const cableRowsHtml = cableRows
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(row.cable)}</td><td>${escapeHtml(row.appliesTo)}</td><td>${escapeHtml(row.reminder)}</td><td>${escapeHtml(cableToneLabel(row.type))}</td></tr>`,
    )
    .join("");

  return `
    <div style="display:flex;flex-wrap:wrap;align-items:stretch;gap:8px;margin-top:8px;">${nodesHtml}</div>
    <p style="margin-top:14px;font-size:12px;color:#475569;">This diagram is derived directly from the equipment schedule below - it shows the assumed signal flow from source to display so the customer and installer share the same picture of how the room connects together. The cable schedule underneath lists the transport type and validation reminder for each connection.</p>
    <table>
      <thead><tr><th>Path</th><th>Example cable / transport</th><th>Applies to</th><th>Validation reminder</th><th>Type</th></tr></thead>
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

export function buildProposalHtml(proposal: StoredProjectProposal, bomRows: BomRow[]) {
  const preparedBy = proposal.preparedBy || "";
  const companyName = proposal.companyName || "WyreStorm Wingman";
  const contactLine = [proposal.contactEmail, proposal.contactPhone].filter(Boolean).join(" | ");
  const footer = proposal.proposalFooter || "Prepared using WyreStorm Wingman.";
  const logoHtml = proposal.companyLogoDataUrl
    ? `<img src="${escapeHtml(proposal.companyLogoDataUrl)}" alt="${escapeHtml(companyName)} logo" style="max-height:64px;max-width:220px;object-fit:contain;margin-bottom:16px;" />`
    : "";
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

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(proposal.title)} | WyreStorm Wingman Proposal</title>
  <style>
    body { font-family: Arial, sans-serif; color: var(--wm-sweep-text) !important; margin: 40px; line-height: 1.55; }
    h1 { font-size: 34px; margin: 0 0 8px; }
    h2 { font-size: 20px; margin-top: 32px; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; }
    h3 { font-size: 15px; margin-top: 18px; }
    p { max-width: 820px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }
    th { background: var(--wm-sweep-card) !important; }
    .meta { color: #475569; font-size: 13px; text-transform: uppercase; letter-spacing: .08em; }
    .notice { background: #fff7ed; border: 1px solid #fed7aa; padding: 12px; margin-top: 18px; }
    .visual-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 12px; }
    .visual-card { border: 1px solid #cbd5e1; padding: 12px; background: var(--wm-sweep-card) !important; }
    .visual-card strong, .visual-card span { display: block; }
    .visual-card span { margin-top: 8px; color: #0369a1; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
  </style>
</head>
<body>
  ${logoHtml}
  <p class="meta">${escapeHtml(companyName)} proposal draft${preparedBy ? ` | Prepared by ${escapeHtml(preparedBy)}` : ""}</p>
  <h1>${escapeHtml(proposal.title)}</h1>
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

  <div class="notice">${escapeHtml(readinessNotice)}</div>
  <div class="notice">Competitor products are excluded from this proposal and equipment schedule unless a comparison-only output is explicitly requested.</div>
  <p class="meta">${escapeHtml(footer)}</p>
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
</body>
</html>`;
}

export function exportProposalHtml(proposal: StoredProjectProposal, bomRows: BomRow[]) {
  saveTextFile(`${fileBaseName(proposal.title)}.proposal.html`, buildProposalHtml(proposal, bomRows), "text/html;charset=utf-8");
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
export function exportProposalPdf(proposal: StoredProjectProposal, bomRows: BomRow[]) {
  if (typeof window === "undefined") return;

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    throw new Error("Pop-up blocked. Allow pop-ups for this site, or use Export HTML and print to PDF from your browser instead.");
  }

  printWindow.document.open();
  printWindow.document.write(buildProposalHtml(proposal, bomRows));
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}
