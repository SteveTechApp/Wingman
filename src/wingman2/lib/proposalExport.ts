import type { StoredProductSelection, StoredProjectProposal } from "../data/projectStore";
import type { SalesBomRow } from "./salesReadiness";

export type BomRow = SalesBomRow;

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
    qty: 1,
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
  const productFamilyDecisionHtml = leadingProductFamilyScore
    ? `<section><h2>Recommended Architecture</h2><p><strong>${escapeHtml(leadingProductFamilyScore.family)}</strong> was the leading product-family path before final SKU selection. Family confidence: ${escapeHtml(String(leadingProductFamilyScore.score))}/100.</p><p>${escapeHtml(leadingProductFamilyScore.reasons[0] || "Family path selected from recommendation evidence.")}</p>${
        leadingProductFamilyScore.cautions.length
          ? `<p><strong>Validation:</strong> ${escapeHtml(leadingProductFamilyScore.cautions[0])}</p>`
          : "<p><strong>Validation:</strong> Validate datasheet, dependencies, firmware, lifecycle, regional suitability and accessories before customer issue.</p>"
      }</section>`
    : "<section><h2>Recommended Architecture</h2><p>No product-family decision has been stored yet. Treat this as a draft until the architecture and family path are confirmed.</p></section>";

  const hasCoreProducts = proposal.products.length > 0;
  const readinessNotice = hasCoreProducts
    ? "This proposal draft includes selected WyreStorm products. Validate final product specifications, accessories and dependencies before issue."
    : "This export is a discovery/design brief only. No WyreStorm core products have been selected, so it must not be issued as a customer BOM.";

  const assumptions = proposal.assumptions.length
    ? proposal.assumptions
    : ["Validate final product specifications, accessories, firmware notes, lifecycle, and regional suitability before issue."];

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
  <p>${escapeHtml(proposal.summary)}</p>
  ${contactLine ? `<p class="meta">${escapeHtml(contactLine)}</p>` : ""}

  <h2>Output Purpose</h2>
  ${
    proposal.outputPurpose
      ? `<p><strong>${escapeHtml(proposal.outputPurpose.motion)}</strong></p><p>${escapeHtml(proposal.outputPurpose.summary)}</p><p>${escapeHtml(proposal.outputPurpose.customerOutput)}</p>`
      : "<p>WyreStorm SKU or BOM recommendation for customer presentation.</p>"
  }

  <h2>Confirmed Requirement</h2>
  <p>${escapeHtml(proposal.summary || "The customer requirement has not yet been confirmed.")}</p>

  <h2>Design Assumptions</h2>
  <ul>${assumptions.map((assumption) => `<li>${escapeHtml(assumption)}</li>`).join("")}</ul>

  ${productFamilyDecisionHtml}

  <h2>Required WyreStorm Products</h2>
  <p>${proposal.products.length ? escapeHtml(proposal.products.map((product) => `${product.sku} - ${product.title || product.family || product.category || "Selected product"}`).join("; ")) : "No WyreStorm product shortlist has been added yet."}</p>

  <h2>Optional Enhancements</h2>
  <ul>${
    bomRows.some((row) => row.type === "Optional")
      ? bomRows.filter((row) => row.type === "Optional").map((row) => `<li>${escapeHtml(row.sku)} - ${escapeHtml(row.description)}</li>`).join("")
      : "<li>No optional enhancements are currently selected.</li>"
  }</ul>

  <h2>Visual Support</h2>
  ${
    visualBlocks.length
      ? `<div class="visual-grid">${visualBlocks.map((block) => `<div class="visual-card"><strong>${escapeHtml(block.title)}</strong><p>${escapeHtml(block.summary)}</p><p>${escapeHtml(block.proposalUse)}</p><span>${escapeHtml(block.exportLabel)}</span></div>`).join("")}</div>`
      : "<p>No proposal visuals have been generated yet.</p>"
  }

  <h2>Bill Of Materials</h2>
  <table>
    <thead>
      <tr><th>Item</th><th>SKU</th><th>Description</th><th>Role</th><th>Qty</th><th>Type</th><th>Notes</th></tr>
    </thead>
    <tbody>
      ${bomRows.length ? bomRows.map((row) => `<tr><td>${row.item}</td><td>${escapeHtml(row.sku)}</td><td>${escapeHtml(row.description)}</td><td>${escapeHtml(row.role)}</td><td>${row.qty}</td><td>${escapeHtml(row.type)}</td><td>${escapeHtml(row.notes)}</td></tr>`).join("") : '<tr><td colspan="7">No BOM items are currently selected.</td></tr>'}
    </tbody>
  </table>

  <h2>Dependency Governance</h2>
  ${
    proposal.governedDependencies?.length
      ? `<ul>${proposal.governedDependencies.map((dependency) => {
          const governanceKind = dependency.governanceKind ?? (dependency.sku.startsWith("TBC-") ? "Prompt" : "Exact");
          const ruleSource = dependency.ruleSource ? ` Source: ${dependency.ruleSource}` : "";
          return `<li><strong>${escapeHtml(dependency.sku)} - ${escapeHtml(dependency.label)}</strong> (${escapeHtml(governanceKind)}): ${escapeHtml(dependency.validationQuestion)} Basis: ${escapeHtml(dependency.evidence)}${escapeHtml(ruleSource)}</li>`;
        }).join("")}</ul>`
      : "<p>No governed dependencies have been triggered yet.</p>"
  }

  <h2>Evidence Basis</h2>
  <ul>${bomRows.length ? bomRows.map((row) => `<li>${escapeHtml(row.sku)}: ${escapeHtml(row.evidence)}</li>`).join("") : "<li>No product evidence captured yet.</li>"}</ul>

  <h2>Risks / Needs Validation</h2>
  <ul>${[...(proposal.governanceWarnings ?? []), ...(proposal.validationNotes ?? [])].length ? [...(proposal.governanceWarnings ?? []), ...(proposal.validationNotes ?? [])].map((item) => `<li>${escapeHtml(item)}</li>`).join("") : "<li>Validate datasheets, lifecycle status, regional suitability, and dependencies before customer issue.</li>"}</ul>

  <h2>Next Steps</h2>
  <ul>${proposal.repGuidance?.length ? proposal.repGuidance.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : "<li>Confirm discovery assumptions and validate the final design before issue.</li>"}</ul>

  <div class="notice">${escapeHtml(readinessNotice)}</div>
  <div class="notice">Competitor products are excluded from this proposal and BOM unless a comparison-only output is explicitly requested.</div>
  <p class="meta">${escapeHtml(footer)}</p>
</body>
</html>`;
}

export function exportProposalHtml(proposal: StoredProjectProposal, bomRows: BomRow[]) {
  saveTextFile(`${fileBaseName(proposal.title)}.proposal.html`, buildProposalHtml(proposal, bomRows), "text/html;charset=utf-8");
}

export function exportBomCsv(proposal: StoredProjectProposal, bomRows: BomRow[]) {
  saveTextFile(`${fileBaseName(proposal.title)}.bom.csv`, buildBomCsv(bomRows), "text/csv;charset=utf-8");
}
