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
  return (
    String(title || "wingman-proposal")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "wingman-proposal"
  );
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

function htmlList(items: string[], fallback: string): string {
  return `<ul>${
    items.length
      ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
      : `<li>${escapeHtml(fallback)}</li>`
  }</ul>`;
}

export function buildBomRows(products: StoredProductSelection[]): BomRow[] {
  return products.map((product, index) => ({
    item: index + 1,
    sku: product.sku,
    description:
      product.title ||
      product.family ||
      product.category ||
      "Selected WyreStorm product",
    role: product.category || product.family || "Core product",
    qty: 1,
    type: "Required",
    status: product.status || "alternative",
    evidence: product.evidence?.[0] || "Selected WyreStorm product.",
    notes:
      "Check current datasheet, lifecycle, firmware, power, mounting and regional availability during project delivery.",
  }));
}

export function buildBomCsv(rows: BomRow[]) {
  const headers = [
    "Item",
    "SKU",
    "Description",
    "Role",
    "Qty",
    "Type",
    "Status",
    "Evidence",
    "Notes",
  ];
  const lines = [
    headers.map(csvCell).join(","),
    ...rows.map((row) =>
      [
        row.item,
        row.sku,
        row.description,
        row.role,
        row.qty,
        row.type,
        row.status,
        row.evidence,
        row.notes,
      ]
        .map(csvCell)
        .join(","),
    ),
  ];

  return lines.join("\r\n");
}

export function buildProposalHtml(
  proposal: StoredProjectProposal,
  bomRows: BomRow[],
) {
  const preparedBy = proposal.preparedBy || "";
  const companyName = proposal.companyName || "WyreStorm Wingman";
  const contactLine = [proposal.contactEmail, proposal.contactPhone]
    .filter(Boolean)
    .join(" | ");
  const footer =
    proposal.proposalFooter || "Prepared using WyreStorm Wingman.";
  const logoHtml = proposal.companyLogoDataUrl
    ? `<img src="${escapeHtml(proposal.companyLogoDataUrl)}" alt="${escapeHtml(companyName)} logo" style="max-height:64px;max-width:220px;object-fit:contain;margin-bottom:16px;" />`
    : "";

  const verification = proposal.verification;
  const application = proposal.applicationProposal;
  const isVerified = verification?.status === "VERIFIED";
  const isNotVerified = verification?.status === "NOT VERIFIED";
  const verificationTitle = isVerified
    ? "VERIFIED ROOM SOLUTION"
    : isNotVerified
      ? "NOT VERIFIED â€” NOT APPROVED FOR REAL-WORLD DEPLOYMENT"
      : "PROPOSAL DRAFT";
  const verificationText = verification?.summary
    ? verification.summary
    : "This proposal has not been generated from a governed room-template baseline.";
  const verificationClass = isVerified
    ? "verified"
    : isNotVerified
      ? "not-verified"
      : "draft";

  const visualBlocks = proposal.visualBlocks ?? [];
  const productFamilyScores = proposal.productFamilyScores ?? [];
  const leadingProductFamilyScore = productFamilyScores[0] ?? null;
  const hasCoreProducts = proposal.products.length > 0;

  const productFamilyDecisionHtml = leadingProductFamilyScore
    ? `<section><h2>Recommended Architecture</h2><p><strong>${escapeHtml(
        leadingProductFamilyScore.family,
      )}</strong> was the leading product-family path. Family confidence: ${escapeHtml(
        String(leadingProductFamilyScore.score),
      )}/100.</p><p>${escapeHtml(
        leadingProductFamilyScore.reasons[0] ||
          "Family path selected from recommendation evidence.",
      )}</p></section>`
    : application
      ? ""
      : "<section><h2>Recommended Architecture</h2><p>No product-family decision has been stored yet.</p></section>";

  const parameters = application?.verifiedDesignParameters?.length
    ? application.verifiedDesignParameters
    : proposal.assumptions;
  const deploymentConditions =
    application?.deploymentConditions ?? proposal.validationNotes ?? [];
  const integrityIssues =
    verification?.issues?.length
      ? verification.issues
      : proposal.governanceWarnings ?? [];

  const applicationHtml = application
    ? `
  <section>
    <h2>Executive Summary</h2>
    <p>${escapeHtml(application.executiveSummary)}</p>
  </section>

  <section>
    <h2>Our Understanding of the Customer Requirement</h2>
    <p>${escapeHtml(application.customerNeed)}</p>
  </section>

  <section>
    <h2>Proposed Solution</h2>
    <p>${escapeHtml(application.solutionOverview)}</p>
  </section>

  <section>
    <h2>Expected Customer Benefits</h2>
    <table>
      <thead><tr><th>Benefit</th><th>Application outcome</th></tr></thead>
      <tbody>
        ${application.benefits
          .map(
            (benefit) =>
              `<tr><td><strong>${escapeHtml(benefit.title)}</strong></td><td>${escapeHtml(benefit.detail)}</td></tr>`,
          )
          .join("")}
      </tbody>
    </table>
  </section>

  <section>
    <h2>User Journey</h2>
    <ol>${application.userJourney
      .map((step) => `<li>${escapeHtml(step)}</li>`)
      .join("")}</ol>
  </section>

  <section class="diagram-section">
    <h2>System Architecture</h2>
    <pre>${escapeHtml(application.architectureDiagram)}</pre>
  </section>

  <section>
    <h2>Technical System Facts</h2>
    ${htmlList(
      application.technicalFacts,
      "No technical facts have been stored.",
    )}
  </section>

  <section>
    <h2>Acceptance Criteria</h2>
    ${htmlList(
      application.acceptanceCriteria,
      "Acceptance criteria have not been stored.",
    )}
  </section>
`
    : `
  <section>
    <h2>Confirmed Requirement</h2>
    <p>${escapeHtml(
      proposal.summary || "The customer requirement has not yet been confirmed.",
    )}</p>
  </section>
`;

  const readinessNotice = isVerified
    ? "This proposal matches the governed room-template baseline. VERIFIED applies only while the BOM, quantities and stated design envelope remain unchanged."
    : isNotVerified
      ? "The user has edited the governed room solution. This document must remain marked NOT VERIFIED and must not be used for real-world deployment until every integrity issue has been corrected or approved."
      : hasCoreProducts
        ? "This proposal includes selected WyreStorm products but is not a governed verified room template."
        : "This export is a discovery/design brief only. No WyreStorm core products have been selected.";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(proposal.title)} | WyreStorm Wingman Proposal</title>
  <style>
    :root { --navy:#071522; --panel:#10263a; --aqua:#67e8f9; --line:#cbd5e1; --text:#0f172a; }
    * { box-sizing:border-box; }
    body { font-family: Arial, sans-serif; color:var(--text); margin:40px; line-height:1.55; }
    h1 { font-size:34px; margin:0 0 8px; }
    h2 { font-size:21px; margin-top:32px; border-bottom:1px solid var(--line); padding-bottom:8px; }
    p { max-width:920px; }
    table { width:100%; border-collapse:collapse; margin-top:12px; font-size:13px; }
    th, td { border:1px solid var(--line); padding:9px; text-align:left; vertical-align:top; }
    th { background:#eef6fa; }
    .meta { color:#475569; font-size:13px; text-transform:uppercase; letter-spacing:.08em; }
    .status { padding:16px 18px; margin:20px 0; border:2px solid; font-weight:700; }
    .status strong { display:block; font-size:18px; margin-bottom:4px; }
    .verified { background:#ecfdf5; border-color:#10b981; color:#064e3b; }
    .not-verified { background:#fff1f2; border-color:#e11d48; color:#881337; }
    .draft { background:#fff7ed; border-color:#f59e0b; color:#7c2d12; }
    .visual-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; margin-top:12px; }
    .visual-card { border:1px solid var(--line); padding:12px; background:#f8fafc; }
    .visual-card strong,.visual-card span { display:block; }
    .visual-card span { margin-top:8px; color:#0369a1; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; }
    .diagram-section pre { white-space:pre-wrap; background:var(--navy); color:white; padding:20px; border-radius:8px; overflow:auto; font-family:Consolas,monospace; }
    .notice { padding:14px; margin-top:18px; border:1px solid var(--line); background:#f8fafc; }
    @media print { body { margin:18mm; } .status { break-inside:avoid; } section { break-inside:auto; } }
  </style>
</head>
<body>
  ${logoHtml}
  <p class="meta">${escapeHtml(companyName)} proposal${preparedBy ? ` | Prepared by ${escapeHtml(preparedBy)}` : ""}</p>
  <h1>${escapeHtml(proposal.title)}</h1>
  <p>${escapeHtml(proposal.summary)}</p>
  ${contactLine ? `<p class="meta">${escapeHtml(contactLine)}</p>` : ""}

  <div class="status ${verificationClass}">
    <strong>${escapeHtml(verificationTitle)}</strong>
    ${escapeHtml(verificationText)}
  </div>

  ${applicationHtml}

  <section>
    <h2>Design Assumptions</h2>
    ${htmlList(
      parameters,
      isVerified
        ? "The verified template parameters are embedded in the governed design."
        : "No design assumptions have been recorded.",
    )}
  </section>

  ${productFamilyDecisionHtml}

  <section>
    <h2>Required WyreStorm Products</h2>
    <p>${
      proposal.products.length
        ? escapeHtml(
            proposal.products
              .filter((product) => product.status !== "alternative")
              .map(
                (product) =>
                  `${product.sku} - ${
                    product.title ||
                    product.family ||
                    product.category ||
                    "Selected product"
                  }`,
              )
              .join("; "),
          )
        : "No WyreStorm product shortlist has been added."
    }</p>
  </section>

  <section>
    <h2>Optional Enhancements</h2>
    <ul>${
      bomRows.some((row) => row.type === "Optional")
        ? bomRows
            .filter((row) => row.type === "Optional")
            .map(
              (row) =>
                `<li>${escapeHtml(row.sku)} - ${escapeHtml(row.description)}</li>`,
            )
            .join("")
        : "<li>No optional enhancements are selected.</li>"
    }</ul>
  </section>

  <section>
    <h2>Proposal Visuals</h2>
    ${
      visualBlocks.length
        ? `<div class="visual-grid">${visualBlocks
            .map(
              (block) =>
                `<div class="visual-card"><strong>${escapeHtml(block.title)}</strong><p>${escapeHtml(block.summary)}</p><p>${escapeHtml(block.proposalUse)}</p><span>${escapeHtml(block.exportLabel)}</span></div>`,
            )
            .join("")}</div>`
        : "<p>No proposal visuals have been generated.</p>"
    }
  </section>

  <section>
    <h2>Bill of Materials</h2>
    <table>
      <thead>
        <tr><th>Item</th><th>SKU</th><th>Description</th><th>Role</th><th>Qty</th><th>Type</th><th>Notes</th></tr>
      </thead>
      <tbody>
        ${
          bomRows.length
            ? bomRows
                .map(
                  (row) =>
                    `<tr><td>${row.item}</td><td>${escapeHtml(row.sku)}</td><td>${escapeHtml(row.description)}</td><td>${escapeHtml(row.role)}</td><td>${row.qty}</td><td>${escapeHtml(row.type)}</td><td>${escapeHtml(row.notes)}</td></tr>`,
                )
                .join("")
            : '<tr><td colspan="7">No BOM items are selected.</td></tr>'
        }
      </tbody>
    </table>
  </section>

  <section>
    <h2>Risks / Needs Validation</h2>
    <h3>Technical integrity status</h3>
    ${
      isVerified
        ? "<p><strong>No integrity exceptions detected.</strong> The active BOM and quantities match the governed baseline.</p>"
        : htmlList(
            integrityIssues,
            "No governed verification result has been stored.",
          )
    }
    <h3>Deployment conditions</h3>
    ${htmlList(
      deploymentConditions,
      "Apply standard installation, commissioning and handover procedures.",
    )}
  </section>

  <section>
    <h2>Evidence Basis</h2>
    <ul>${
      bomRows.length
        ? bomRows
            .map(
              (row) =>
                `<li>${escapeHtml(row.sku)}: ${escapeHtml(row.evidence)}</li>`,
            )
            .join("")
        : "<li>No product evidence captured.</li>"
    }</ul>
  </section>

  <section>
    <h2>Next Steps</h2>
    ${htmlList(
      proposal.repGuidance ?? [],
      isVerified
        ? "Issue the verified design within its stated envelope and complete normal installation coordination."
        : "Correct the integrity issues or obtain a complete technical review before deployment.",
    )}
  </section>

  <div class="notice">${escapeHtml(readinessNotice)}</div>
  <div class="notice">Competitor products are excluded from this proposal and BOM unless a comparison-only output is explicitly requested.</div>
  <p class="meta">${escapeHtml(footer)}</p>
</body>
</html>`;
}

export function exportProposalHtml(
  proposal: StoredProjectProposal,
  bomRows: BomRow[],
) {
  saveTextFile(
    `${fileBaseName(proposal.title)}.proposal.html`,
    buildProposalHtml(proposal, bomRows),
    "text/html;charset=utf-8",
  );
}

export function exportBomCsv(
  proposal: StoredProjectProposal,
  bomRows: BomRow[],
) {
  const status = proposal.verification?.status ?? "DRAFT";
  const summary =
    proposal.verification?.summary ??
    "No governed room-template verification status is stored.";
  const prefix = [
    ["Verification Status", status].map(csvCell).join(","),
    ["Verification Summary", summary].map(csvCell).join(","),
    "",
  ].join("\r\n");

  saveTextFile(
    `${fileBaseName(proposal.title)}.bom.csv`,
    `${prefix}${buildBomCsv(bomRows)}`,
    "text/csv;charset=utf-8",
  );
}
