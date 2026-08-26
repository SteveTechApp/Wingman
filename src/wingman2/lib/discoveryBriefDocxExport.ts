import {
  AlignmentType, Document, Footer, Header, PageNumber, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType,
} from "docx";
import type { StoredDiscoveryBrief, StoredProjectProposal } from "../data/projectStore";
import {
  NAVY, AQUA, BLUE, MUTED, PALE, TEXT, TABLE_WIDTH, addSection, bullet, cell, fileBaseName, fixedTable, paragraph,
} from "./proposalDocxExport";
import { briefFromProposal, briefMetaFromProposal, roomModelValue, type DiscoveryBriefExportMeta } from "./discoveryBriefExport";
import {
  CAPTURE_CONFIDENCE_EXPLAINER,
  captureConfidenceCell,
} from "./discoveryConversationDisplay";

/**
 * Discovery Brief DOCX export — the formal twin of the print-friendly HTML
 * brief in `discoveryBriefExport.ts`. Only imported where the `docx` package
 * is already bundled (the proposal wizard chunk), never by the Discovery page,
 * so the lazy discovery chunk does not grow by the whole library. Reuses the
 * proposal DOCX helpers so the two documents share one implementation.
 */

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

function conversationTable(brief: StoredDiscoveryBrief): Table {
  const items = brief.discoveryConversation ?? [];
  const widths = [2300, 2300, 2700, 1400, 1260];
  return fixedTable(widths, [
    new TableRow({ tableHeader: true, children: ["Question asked", "Governed answer", "Customer wording", "Status", "Capture confidence"].map((title, index) => cell(title, widths[index], { bold: true, fill: PALE })) }),
    ...(items.length
      ? items.map((item) => new TableRow({ children: [
          cell(item.question, widths[0]),
          cell(item.answer, widths[1]),
          cell(item.note || "—", widths[2]),
          cell(item.confirmed ? "Confirmed with customer" : "To be confirmed", widths[3]),
          cell(captureConfidenceCell(item.confidence, item.confidenceScore), widths[4]),
        ] }))
      : [new TableRow({ children: [new TableCell({ columnSpan: 5, width: { size: TABLE_WIDTH, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 120, right: 120 }, children: [paragraph("No discovery conversation has been captured yet — run Discovery for this room before hand-off.", { colour: MUTED })] })] })]),
  ]);
}

function requirementTable(brief: StoredDiscoveryBrief): Table {
  const roomModel = (brief.roomModel ?? {}) as Record<string, unknown>;
  const rows = ROOM_MODEL_ROWS.flatMap(({ key, label }) => {
    const value = roomModelValue(roomModel, key);
    return value ? [{ label, value }] : [];
  });
  const widths = [3600, 5760];
  return fixedTable(widths, [
    new TableRow({ tableHeader: true, children: [cell("Requirement", widths[0], { bold: true, fill: PALE }), cell("Captured answer", widths[1], { bold: true, fill: PALE })] }),
    ...(rows.length
      ? rows.map((row) => new TableRow({ children: [cell(row.label, widths[0], { bold: true }), cell(row.value, widths[1])] }))
      : [new TableRow({ children: [new TableCell({ columnSpan: 2, width: { size: TABLE_WIDTH, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 120, right: 120 }, children: [paragraph("No structured room model was captured in this brief — the conversation trail below is the record of what was asked and answered.", { colour: MUTED })] })] })]),
  ]);
}

export function buildDiscoveryBriefDocx(
  brief: StoredDiscoveryBrief,
  meta: DiscoveryBriefExportMeta = {},
): Document {
  const company = meta.companyName || "WyreStorm";
  const projectName = meta.projectName || "Unnamed discovery";
  const preparedBy = meta.preparedBy || "";
  const reference = meta.reference || `DBR-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const date = meta.date || new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const conversation = brief.discoveryConversation ?? [];
  const confirmedCount = conversation.filter((item) => item.confirmed).length;
  const openCount = conversation.length - confirmedCount;
  const missingItems = brief.missingInformation ?? [];

  const children: Array<Paragraph | Table> = [
    paragraph(company, { bold: true, size: 32, colour: AQUA, alignment: AlignmentType.CENTER, after: 120 }),
    paragraph("DISCOVERY BRIEF", { bold: true, size: 20, colour: MUTED, alignment: AlignmentType.CENTER, after: 520 }),
    paragraph(projectName, { bold: true, size: 48, colour: NAVY, alignment: AlignmentType.CENTER, after: 200 }),
    paragraph("Pre-design hand-off document", { size: 26, colour: BLUE, alignment: AlignmentType.CENTER }),
    paragraph([`Reference: ${reference}`, `Date: ${date}`, preparedBy && `Prepared by: ${preparedBy}`].filter(Boolean).join("  |  "), { size: 18, colour: MUTED, alignment: AlignmentType.CENTER }),
  ];

  addSection(children, "Purpose of this Brief", [
    paragraph("This brief records the discovery conversation behind the proposed design: the question asked, the closest governed answer, and the customer's own wording where captured. It is intended for hand-off to a colleague or the customer before design sign-off, so the reasoning behind the design is visible and nothing is presented as a settled fact that was not said during discovery.", { justified: true }),
    paragraph(`Rows marked "Confirmed with customer" were verified with the customer during discovery; rows marked "To be confirmed" are still open and must be verified before the design is signed off and quoted.`, { justified: true, colour: NAVY }),
  ]);

  addSection(children, "Captured Requirement", [requirementTable(brief)]);

  addSection(children, "Discovery Conversation", [
    paragraph("Each row records one discovery exchange exactly as it was captured. The governed answer is the closest structured option; the customer wording column keeps the customer's own phrasing where it was recorded.", { justified: true }),
    paragraph(CAPTURE_CONFIDENCE_EXPLAINER, { size: 18, colour: MUTED, justified: true }),
    conversationTable(brief),
    ...(conversation.length
      ? [paragraph(`Status summary: ${confirmedCount} confirmed with customer, ${openCount} to be confirmed.`, { size: 18, colour: MUTED })]
      : []),
  ]);

  addSection(children, "Still to Confirm", [
    ...(missingItems.length ? missingItems.map(bullet) : [bullet("Nothing is flagged as missing in the current brief.")]),
    ...(brief.nextBestQuestion ? [bullet(`Next question to ask: ${brief.nextBestQuestion}`)] : []),
  ]);

  addSection(children, "Hand-off Notes", [
    bullet("Verify every row still marked \"To be confirmed\" with the customer before design sign-off."),
    bullet("Confirm cable distances, equipment positions and network/IT policy on site before quoting."),
    bullet("Confirm accessories, power (including PoE/PoH budgets), mounting, lifecycle and regional suitability for every selected product before order."),
  ]);

  addSection(children, "Best-Efforts Disclaimer", [
    paragraph("This discovery brief has been prepared on a best-efforts basis to support your sales and design process. It is a planning record only and does not constitute a binding quotation, order confirmation, or statement of capability. Product specifications, compatibility, lifecycle status, regional availability, pricing and lead times must be verified against the current WyreStorm documentation, datasheet or order desk before this document is used for any commercial purpose. Design decisions, power budgets, cable schedules and equipment selections derived from this brief must be validated by a qualified AV integrator or pre-sales engineer before installation. Wingman provides no warranty and accepts no liability for any errors, omissions or reliance on the content of this document.", { justified: true, colour: MUTED }),
  ]);

  return new Document({
    creator: preparedBy || company, title: `${projectName} - Discovery Brief`, subject: "WyreStorm discovery brief",
    styles: { default: { document: { run: { font: "Calibri", size: 22, color: TEXT }, paragraph: { spacing: { after: 160, line: 320 } } } } },
    numbering: { config: [{ reference: "proposal-bullets", levels: [{ level: 0, format: "bullet", text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 280 }, spacing: { after: 80, line: 290 } } } }] }] },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440, header: 708, footer: 708 } } },
      headers: { default: new Header({ children: [paragraph(`${company}  |  ${reference}`, { alignment: AlignmentType.RIGHT, size: 17, colour: MUTED })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Prepared using WyreStorm Wingman.  |  Page ", color: MUTED, size: 16, font: "Calibri" }), new TextRun({ children: [PageNumber.CURRENT], color: MUTED, size: 16, font: "Calibri" })] })] }) },
      children,
    }],
  });
}

export async function exportDiscoveryBriefDocx(brief: StoredDiscoveryBrief, meta: DiscoveryBriefExportMeta = {}) {
  if (typeof window === "undefined") return;
  const blob = await Packer.toBlob(buildDiscoveryBriefDocx(brief, meta));
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = `${fileBaseName(meta.projectName || "discovery", "wingman-discovery-brief")}.discovery-brief.docx`;
  link.rel = "noopener";
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export { briefFromProposal, briefMetaFromProposal };

/** Convenience: export the DOCX brief directly from a stored proposal. */
export async function exportProposalDiscoveryBriefDocx(proposal: StoredProjectProposal) {
  await exportDiscoveryBriefDocx(briefFromProposal(proposal), briefMetaFromProposal(proposal));
}
