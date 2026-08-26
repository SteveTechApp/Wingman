import type { StoredDiscoveryBrief, StoredProjectProposal } from "../data/projectStore";
import {
  CAPTURE_CONFIDENCE_EXPLAINER,
  captureConfidenceCell,
  captureConfidenceTone,
} from "./discoveryConversationDisplay";

/**
 * Discovery Brief export — a print-friendly, standalone HTML document that
 * reproduces the full discovery Q&A trail (question, governed answer,
 * customer wording, confirmed/open status) plus the captured room model and
 * anything still to confirm, for hand-off to a colleague or the customer
 * before design sign-off.
 *
 * Deliberately has no dependency on the `docx` package so the Discovery page
 * (a lazy chunk that does not already bundle `docx`) can offer this without
 * pulling the whole library in. The DOCX twin lives in
 * `discoveryBriefDocxExport.ts` and is only imported where `docx` is already
 * bundled (the proposal wizard chunk).
 */

export type DiscoveryBriefExportMeta = {
  projectName?: string;
  preparedBy?: string;
  companyName?: string;
  date?: string;
  reference?: string;
};

/** Human-readable room-model fields, in a stable, curated order. */
const ROOM_MODEL_ROWS: ReadonlyArray<{ key: string; label: string }> = [
  { key: "applicationType", label: "Application / customer outcome" },
  { key: "roomType", label: "Room type" },
  { key: "sourceCount", label: "Sources" },
  { key: "sourceTypes", label: "Source types" },
  { key: "displayCount", label: "Displays" },
  { key: "displays", label: "Display behaviour" },
  { key: "resolutionRequirement", label: "Signal resolution" },
  { key: "longestRun", label: "Longest cable run" },
  { key: "usbNeeds", label: "USB needs" },
  { key: "usbTransport", label: "USB transport" },
  { key: "audioNeeds", label: "Audio" },
  { key: "controlNeeds", label: "Control" },
  { key: "networkAvailability", label: "Network availability" },
  { key: "videoWallRequirement", label: "Video wall requirement" },
  { key: "designDirection", label: "Design direction" },
  { key: "nextBestQuestion", label: "Next question to ask" },
];

const EMPTY_VALUES = new Set(["", "unknown", "not confirmed", "not indicated", "tbc", "n/a", "none"]);

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

/** Readable single-line value for one room-model field; "" when empty. */
export function roomModelValue(roomModel: Record<string, unknown>, key: string): string {
  const raw = roomModel[key];
  if (raw === undefined || raw === null) return "";
  const values = Array.isArray(raw) ? raw.map(String) : [String(raw)];
  const readable = values
    .map((value) => value.trim())
    .filter((value) => value && !EMPTY_VALUES.has(value.toLowerCase()));
  return readable.join(", ");
}

function roomModelRows(brief: StoredDiscoveryBrief): Array<{ label: string; value: string }> {
  const roomModel = asRecord(brief.roomModel);
  return ROOM_MODEL_ROWS.flatMap(({ key, label }) => {
    const value = roomModelValue(roomModel, key);
    return value ? [{ label, value }] : [];
  });
}

const QUOTE_SAFETY_LABELS: Record<string, string> = {
  "quote-ready": "Ready to quote after standard validation",
  "validate-before-quote": "Validate before quoting",
  "do-not-quote-yet": "Do not quote yet — capture the missing information",
};

function quoteSafetyLine(brief: StoredDiscoveryBrief): string {
  const status = brief.quoteSafetyStatus;
  if (!status) return "";
  return QUOTE_SAFETY_LABELS[status] || status;
}

export function buildDiscoveryBriefHtml(
  brief: StoredDiscoveryBrief,
  meta: DiscoveryBriefExportMeta = {},
): string {
  const companyName = meta.companyName || "WyreStorm";
  const projectName = meta.projectName || "Unnamed discovery";
  const date = meta.date || new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const reference = meta.reference || `DBR-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const preparedBy = meta.preparedBy || "";

  const conversation = brief.discoveryConversation ?? [];
  const trailRows = conversation.length
    ? conversation
        .map(
          (item) =>
            `<tr><td>${escapeHtml(item.question)}</td><td>${escapeHtml(item.answer)}</td><td>${escapeHtml(item.note || "—")}</td><td class="status ${item.confirmed ? "is-confirmed" : "is-open"}">${item.confirmed ? "Confirmed with customer" : "To be confirmed"}</td><td class="confidence is-${captureConfidenceTone(item.confidence)}">${escapeHtml(captureConfidenceCell(item.confidence, item.confidenceScore))}</td></tr>`,
        )
        .join("")
    : '<tr><td colspan="5">No discovery conversation has been captured yet — run Discovery for this room before hand-off.</td></tr>';

  const confirmedCount = conversation.filter((item) => item.confirmed).length;
  const openCount = conversation.length - confirmedCount;

  const requirementRows = roomModelRows(brief);
  const requirementHtml = requirementRows.length
    ? `<table><tbody>${requirementRows.map((row) => `<tr><th>${escapeHtml(row.label)}</th><td>${escapeHtml(row.value)}</td></tr>`).join("")}</tbody></table>`
    : "<p>No structured room model was captured in this brief — the conversation trail below is the record of what was asked and answered.</p>";

  const missingItems = brief.missingInformation ?? [];
  const missingHtml = missingItems.length
    ? `<ul>${missingItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "<p>Nothing is flagged as missing in the current brief.</p>";

  const capturedPercent = typeof brief.capturedPercent === "number" ? brief.capturedPercent : null;
  const safetyLine = quoteSafetyLine(brief);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(projectName)} | WyreStorm Discovery Brief</title>
  <style>
    :root {
      --primary: #0ea5e9;
      --primary-dark: #0284c7;
      --secondary: #0f172a;
      --text: #1e293b;
      --muted: #64748b;
      --border: #e2e8f0;
      --card: #f8fafc;
      --success: #10b981;
      --warning: #f59e0b;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif; color: var(--text); line-height: 1.6; }
    .container { max-width: 900px; margin: 0 auto; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 3px solid var(--primary); margin-bottom: 28px; }
    .meta { text-align: right; font-size: 12px; color: var(--muted); }
    .meta strong { display: block; color: var(--text); }
    h1 { font-size: 28px; font-weight: 700; color: var(--secondary); margin-bottom: 6px; line-height: 1.2; }
    .subtitle { font-size: 14px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 24px; }
    h2 { font-size: 18px; font-weight: 700; color: var(--secondary); margin-top: 32px; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 2px solid var(--border); }
    p { max-width: 820px; margin-bottom: 12px; font-size: 13.5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
    th, td { border: 1px solid var(--border); padding: 9px 12px; text-align: left; vertical-align: top; }
    th { background: var(--secondary); color: white; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.03em; }
    tr:nth-child(even) { background: var(--card); }
    .status { font-weight: 700; font-size: 12px; white-space: nowrap; }
    .status.is-confirmed { color: var(--success); }
    .status.is-open { color: var(--warning); }
    .confidence { font-weight: 700; font-size: 12px; white-space: nowrap; }
    .confidence.is-high { color: var(--success); }
    .confidence.is-matched { color: var(--primary); }
    .confidence.is-low { color: var(--warning); }
    .notice { background: #fef3c7; border: 1px solid #fcd34d; border-left: 4px solid var(--warning); padding: 14px 16px; margin: 18px 0; border-radius: 4px; font-size: 13px; }
    .notice strong { color: var(--secondary); }
    .toolbar { margin: 18px 0 8px; }
    .toolbar button { background: var(--primary); color: white; border: none; border-radius: 6px; padding: 9px 18px; font-size: 13px; font-weight: 600; cursor: pointer; margin-right: 8px; }
    .toolbar button:hover { background: var(--primary-dark); }
    .disclaimer { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 22px; margin-top: 36px; }
    .disclaimer h2 { border-bottom: none; margin-bottom: 10px; margin-top: 0; font-size: 14px; color: var(--muted); }
    .disclaimer p { font-size: 11px; line-height: 1.6; color: var(--muted); max-width: 100%; }
    .footer { margin-top: 28px; padding-top: 18px; border-top: 2px solid var(--border); display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: var(--muted); }
    @media print {
      body { font-size: 11pt; }
      .container { padding: 18px; }
      .toolbar { display: none; }
      h1 { font-size: 22pt; }
      h2 { font-size: 13pt; }
      table { font-size: 9.5pt; }
      th, td { padding: 6px 8px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <svg width="140" height="32" viewBox="0 0 140 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="4" width="24" height="24" rx="4" fill="#0ea5e9"/>
          <path d="M6 16l4-6h4l-4 6 4 6h-4l-4-6z" fill="white"/>
          <text x="32" y="22" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#0f172a">WyreStorm</text>
        </svg>
      </div>
      <div class="meta">
        <strong>Discovery Brief Reference: ${escapeHtml(reference)}</strong>
        <div>Date: ${escapeHtml(date)}</div>
        ${preparedBy ? `<div>Prepared by: ${escapeHtml(preparedBy)}</div>` : ""}
        <div>Document: Pre-design hand-off</div>
      </div>
    </div>

    <h1>Discovery Brief</h1>
    <div class="subtitle">${escapeHtml(companyName)} | ${escapeHtml(projectName)}</div>

    <div class="toolbar">
      <button type="button" onclick="window.print()">Print / Save as PDF</button>
    </div>

    <div class="notice">
      <strong>Before design sign-off:</strong> this brief records the discovery conversation behind the design — the question
      asked, the closest governed answer, and the customer's own wording where captured.
      Rows marked <strong>Confirmed with customer</strong> were verified during discovery; rows marked <strong>To be
      confirmed</strong> are still open and must be verified before the design is signed off and quoted.
      ${capturedPercent !== null ? ` ${capturedPercent}% of the discovery questions were answered.` : ""}
      ${openCount > 0 ? ` ${openCount} of ${conversation.length} conversation row${conversation.length === 1 ? "" : "s"} ${openCount === 1 ? "is" : "are"} still to be confirmed.` : ""}
    </div>

    <h2>Captured Requirement</h2>
    ${requirementHtml}
    ${safetyLine ? `<p><strong>Quote safety:</strong> ${escapeHtml(safetyLine)}</p>` : ""}

    <h2>Discovery Conversation</h2>
    <p>Each row records one discovery exchange exactly as it was captured. The governed answer is the closest structured
    option; the customer wording column keeps the customer's own phrasing where it was recorded.</p>
    <p>${escapeHtml(CAPTURE_CONFIDENCE_EXPLAINER)}</p>
    <table>
      <thead><tr><th>Question asked</th><th>Governed answer</th><th>Customer wording</th><th>Status</th><th>Capture confidence</th></tr></thead>
      <tbody>${trailRows}</tbody>
    </table>

    <h2>Still to Confirm</h2>
    ${missingHtml}
    ${brief.nextBestQuestion ? `<p><strong>Next question to ask:</strong> ${escapeHtml(brief.nextBestQuestion)}</p>` : ""}

    <h2>Hand-off Notes</h2>
    <ul>
      <li>Verify every row still marked <strong>To be confirmed</strong> with the customer before design sign-off.</li>
      <li>Confirm cable distances, equipment positions and network/IT policy on site before quoting.</li>
      <li>Confirm accessories, power (including PoE/PoH budgets), mounting, lifecycle and regional suitability for every selected product before order.</li>
    </ul>

    <section class="disclaimer">
      <h2>Important Notice &amp; Best-Efforts Disclaimer</h2>
      <p>This discovery brief has been prepared on a best-efforts basis using WyreStorm Wingman to support your sales and design process. It is a planning record only and does not constitute a binding quotation, order confirmation, or statement of capability.</p>
      <p><strong>Product Specifications:</strong> Any product specifications, features, compatibility information, lifecycle status, regional availability, pricing, and lead times referenced from this brief are indicative and must be independently verified against the current official WyreStorm documentation, datasheets, or by contacting the WyreStorm order desk before commercial use.</p>
      <p><strong>Technical Validation:</strong> Design decisions, power budgets, cable schedules and equipment selections derived from this brief are based on available product data and the assumptions recorded above. Final designs must be validated by a qualified AV integrator or pre-sales engineer before installation.</p>
      <p><strong>Limitation of Liability:</strong> WyreStorm Technologies Ltd provides this document "as is" without warranty of any kind, either expressed or implied. WyreStorm shall not be liable for any errors, omissions, or damages arising from the use of or reliance on the information contained in this document.</p>
    </section>

    <div class="footer">
      <div>Prepared using WyreStorm Wingman</div>
      <div>wyrestorm.com | For the most current product information, contact your regional WyreStorm sales representative.</div>
    </div>
  </div>
</body>
</html>`;
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

function fileBaseName(title: string) {
  return String(title || "wingman-discovery-brief")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "wingman-discovery-brief";
}

export function exportDiscoveryBriefHtml(brief: StoredDiscoveryBrief, meta: DiscoveryBriefExportMeta = {}) {
  saveTextFile(
    `${fileBaseName(meta.projectName || "discovery")}.discovery-brief.html`,
    buildDiscoveryBriefHtml(brief, meta),
    "text/html;charset=utf-8",
  );
}

/**
 * Builds a minimal brief from a stored proposal so the proposal wizard can
 * offer the same pre-design hand-off export without re-running Discovery.
 * The conversation trail flows through unchanged; the room model carries only
 * what the proposal already knows.
 */
export function briefFromProposal(proposal: StoredProjectProposal): StoredDiscoveryBrief {
  const roomModel: Record<string, unknown> = {};
  if (proposal.productFamilyScores?.[0]?.family) {
    roomModel.designDirection = proposal.productFamilyScores[0].family;
  }
  if (proposal.summary) {
    roomModel.summary = proposal.summary;
  }
  return {
    savedAt: proposal.updatedAt,
    roomModel,
    discoveryConversation: proposal.discoveryConversation ?? [],
  };
}

export function briefMetaFromProposal(proposal: StoredProjectProposal): DiscoveryBriefExportMeta {
  return {
    projectName: proposal.title,
    preparedBy: proposal.preparedBy,
    companyName: proposal.companyName,
  };
}
