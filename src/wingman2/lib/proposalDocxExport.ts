import {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel,
  PageBreak, PageNumber, Packer, Paragraph, ShadingType, Table, TableCell,
  TableLayoutType, TableRow, TextRun, WidthType,
} from "docx";
import type { StoredProjectProposal } from "../data/projectStore";
import type { SalesBomRow } from "./salesReadiness";
import { getProposalDocumentTypeConfig, linesFromText, type ProposalWizardDraft } from "./proposalWizard";

const NAVY = "08223A";
const AQUA = "16B8B0";
const BLUE = "2E74B5";
const TEXT = "172B3A";
const MUTED = "5E7280";
const PALE = "F4F6F9";
const BORDER = "CBD5E1";
const TABLE_WIDTH = 9360;

function fileBaseName(title: string) {
  return String(title || "wingman-proposal").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "wingman-proposal";
}

function paragraph(text: string, options: { bold?: boolean; size?: number; colour?: string; alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number; justified?: boolean } = {}) {
  return new Paragraph({
    alignment: options.justified ? AlignmentType.JUSTIFIED : options.alignment,
    spacing: { after: options.after ?? 160, line: 320 },
    children: [new TextRun({ text, bold: options.bold, size: options.size ?? 22, color: options.colour ?? TEXT, font: "Calibri" })],
  });
}

function heading(text: string, level: 1 | 2 = 1) {
  return new Paragraph({
    heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
    keepNext: true,
    spacing: { before: level === 1 ? 360 : 240, after: level === 1 ? 200 : 120 },
    children: [new TextRun({ text, bold: true, color: level === 1 ? BLUE : NAVY, size: level === 1 ? 32 : 26, font: "Calibri" })],
  });
}

function bullet(text: string) {
  return new Paragraph({
    numbering: { reference: "proposal-bullets", level: 0 },
    spacing: { after: 80, line: 290 },
    children: [new TextRun({ text, size: 22, color: TEXT, font: "Calibri" })],
  });
}

function bulletLines(value: string, fallback: string) {
  const values = linesFromText(value);
  return (values.length ? values : [fallback]).map(bullet);
}

function cell(text: string, width: number, options: { bold?: boolean; fill?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    shading: options.fill ? { fill: options.fill, type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({
      alignment: options.align,
      spacing: { after: 0, line: 260 },
      children: [new TextRun({ text, bold: options.bold, size: 18, color: options.bold ? NAVY : TEXT, font: "Calibri" })],
    })],
  });
}

const borders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: BORDER }, bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  left: { style: BorderStyle.SINGLE, size: 4, color: BORDER }, right: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 3, color: BORDER }, insideVertical: { style: BorderStyle.SINGLE, size: 3, color: BORDER },
};

function fixedTable(widths: number[], rows: TableRow[]) {
  return new Table({ width: { size: TABLE_WIDTH, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: widths, borders, rows });
}

function money(value: number, currency: ProposalWizardDraft["currency"]) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value);
}

function equipmentTable(rows: SalesBomRow[], wizard: ProposalWizardDraft) {
  const widths = [1500, 2700, 650, 1350, 1450, 1710];
  const header = new TableRow({ tableHeader: true, children: ["SKU", "Description", "Qty", "Unit price", "Line total", "Status"].map((value, index) => cell(value, widths[index], { bold: true, fill: PALE })) });
  let total = 0;
  let complete = rows.length > 0;
  const body = rows.map((row) => {
    const raw = wizard.bomUnitPrices[row.sku];
    const unit = raw !== undefined && raw !== "" ? Number(raw) : Number.NaN;
    const valid = Number.isFinite(unit) && unit >= 0;
    complete &&= valid;
    const line = valid ? unit * row.qty : Number.NaN;
    if (valid) total += line;
    const values = [row.sku || "TBC", row.description || "Selected equipment", String(row.qty), valid ? money(unit, wizard.currency) : "TBC", valid ? money(line, wizard.currency) : "TBC", row.type || "Required"];
    return new TableRow({ children: values.map((value, index) => cell(value, widths[index], { align: index >= 2 && index <= 4 ? AlignmentType.RIGHT : undefined })) });
  });
  if (!rows.length) body.push(new TableRow({ children: [new TableCell({ columnSpan: 6, width: { size: TABLE_WIDTH, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 120, right: 120 }, children: [paragraph("No final equipment schedule is attached. This document is not an equipment quotation.", { colour: MUTED })] })] }));
  if (rows.length) body.push(new TableRow({ children: [cell("Equipment total", widths[0] + widths[1] + widths[2], { bold: true, fill: PALE }), cell(complete ? money(total, wizard.currency) : "TBC — pricing incomplete", widths[3] + widths[4], { bold: true, fill: PALE, align: AlignmentType.RIGHT }), cell(wizard.pricesExcludeTax ? "Excl. tax" : "Tax status TBC", widths[5], { bold: true, fill: PALE })] }));
  return { table: fixedTable(widths, [header, ...body]), complete, total };
}

function pipeTable(value: string, headers: string[], widths: number[]) {
  const rows = linesFromText(value).map((line) => line.split("|").map((part) => part.trim()));
  return fixedTable(widths, [
    new TableRow({ tableHeader: true, children: headers.map((title, index) => cell(title, widths[index], { bold: true, fill: PALE })) }),
    ...(rows.length ? rows : [["To be confirmed"]]).map((parts) => new TableRow({ children: widths.map((width, index) => cell(parts[index] || "TBC", width)) })),
  ]);
}

function addSection(children: Array<Paragraph | Table>, title: string, content: Array<Paragraph | Table>) {
  children.push(heading(title), ...content);
}

export function buildProposalDocx(proposal: StoredProjectProposal, bomRows: SalesBomRow[], wizard: ProposalWizardDraft) {
  const config = getProposalDocumentTypeConfig(wizard.documentType);
  const company = proposal.companyName || "WyreStorm";
  const equipment = equipmentTable(bomRows, wizard);
  const risks = [...(proposal.governanceWarnings ?? []), ...(proposal.validationNotes ?? [])];
  const children: Array<Paragraph | Table> = [
    paragraph(company, { bold: true, size: 32, colour: AQUA, alignment: AlignmentType.CENTER, after: 120 }),
    paragraph(config.label.toUpperCase(), { bold: true, size: 20, colour: MUTED, alignment: AlignmentType.CENTER, after: 520 }),
    paragraph(wizard.projectName || proposal.title, { bold: true, size: 48, colour: NAVY, alignment: AlignmentType.CENTER, after: 200 }),
    paragraph(wizard.customerName ? `Prepared for ${wizard.customerName}` : "Customer proposal", { size: 26, colour: BLUE, alignment: AlignmentType.CENTER }),
    paragraph([wizard.proposalReference && `Reference: ${wizard.proposalReference}`, wizard.proposalDate && `Date: ${wizard.proposalDate}`, wizard.preparedBy && `Prepared by: ${wizard.preparedBy}`].filter(Boolean).join("  |  "), { size: 18, colour: MUTED, alignment: AlignmentType.CENTER }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  addSection(children, "Executive Summary", [paragraph(wizard.executiveSummary || proposal.summary || "Executive summary to be confirmed.", { justified: true })]);
  addSection(children, "Client Objectives and Current Challenge", [paragraph(wizard.customerObjectives || proposal.summary || "The client objectives require confirmation.", { justified: true })]);
  addSection(children, "Proposed Solution and Business Value", [paragraph(wizard.proposedSolution || "The proposed solution requires confirmation.", { justified: true }), bullet("A supportable architecture aligned to the stated operational requirement."), bullet("A controlled route from design approval to quotation, delivery and acceptance."), bullet("Clear ownership of equipment, services, dependencies and by-others scope.")]);
  addSection(children, "Scope of Work", [heading("Included scope", 2), ...bulletLines(wizard.inclusions, "Supply of the WyreStorm equipment listed in this proposal."), heading("Delivery activities", 2), ...["Validate the final design and interfaces against site conditions.", "Supply and configure the listed WyreStorm hardware where expressly included.", "Complete functional testing and record acceptance results where commissioning is quoted."].map(bullet), heading("Not included / by others", 2), ...bulletLines(wizard.exclusions, "No exclusions have been recorded.")]);
  addSection(children, "Equipment and Pricing", [paragraph(equipment.complete ? `The equipment total is ${money(equipment.total, wizard.currency)} ${wizard.pricesExcludeTax ? "excluding VAT / sales tax" : "with tax treatment to be confirmed"}.` : "COMMERCIAL HOLD: one or more equipment prices are missing. This draft must not be issued as an exact quotation until every TBC value is resolved.", { bold: true, colour: equipment.complete ? NAVY : "9B1C1C" }), equipment.table, paragraph("Pricing covers only the listed equipment. Services, third-party equipment, freight, taxes and by-others work are excluded unless expressly priced below.", { size: 18, colour: MUTED })]);
  addSection(children, "Services and Commercial Allowances", [pipeTable(wizard.servicesAndAllowances, ["Service / discipline", "Responsibility", "Commercial status"], [3900, 2460, 3000])]);
  addSection(children, "Technical Architecture", [paragraph(wizard.architectureNarrative || "The technical architecture requires confirmation.", { justified: true })]);
  addSection(children, "Timeline and Phases", [paragraph("The programme below is indicative and begins only after design approval, commercial acceptance, stock confirmation and site readiness.", { colour: MUTED }), pipeTable(wizard.implementationTimeline, ["Phase", "Activity", "Indicative timing", "Dependency / output"], [1250, 2500, 1500, 4110])]);
  addSection(children, "Responsibilities and Dependencies", [heading("Responsibilities", 2), ...bulletLines(wizard.responsibilities, "Responsibilities are to be agreed."), heading("Dependencies", 2), ...bulletLines(wizard.dependencies, "Dependencies are to be confirmed.")]);
  addSection(children, "Assumptions, Risks and Exclusions", [heading("Assumptions", 2), ...bulletLines(wizard.assumptions, "Final assumptions are to be confirmed."), heading("Open risks and validation", 2), ...(risks.length ? risks : ["Validate datasheets, lifecycle, accessories, firmware, regional suitability and site dependencies before order."]).map(bullet)]);
  addSection(children, "Next Steps", [...bulletLines(wizard.nextSteps, "Confirm the final design, equipment schedule, responsibilities and commercial quotation."), paragraph(`Quotation validity: ${wizard.validityDays} days from the proposal date, subject to stock and written confirmation.`, { colour: MUTED })]);

  return new Document({
    creator: wizard.preparedBy || company, title: `${wizard.projectName || proposal.title} - ${config.label}`, subject: "WyreStorm audio visual proposal",
    styles: { default: { document: { run: { font: "Calibri", size: 22, color: TEXT }, paragraph: { spacing: { after: 160, line: 320 } } } } },
    numbering: { config: [{ reference: "proposal-bullets", levels: [{ level: 0, format: "bullet", text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 280 }, spacing: { after: 80, line: 290 } } } }] }] },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440, header: 708, footer: 708 } } },
      headers: { default: new Header({ children: [paragraph(`${company}  |  ${wizard.proposalReference}`, { alignment: AlignmentType.RIGHT, size: 17, colour: MUTED })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${proposal.proposalFooter || "Prepared using WyreStorm Wingman."}  |  Page `, color: MUTED, size: 16, font: "Calibri" }), new TextRun({ children: [PageNumber.CURRENT], color: MUTED, size: 16, font: "Calibri" })] })] }) },
      children,
    }],
  });
}

export async function exportProposalDocx(proposal: StoredProjectProposal, bomRows: SalesBomRow[], wizard: ProposalWizardDraft) {
  if (typeof window === "undefined") return;
  const blob = await Packer.toBlob(buildProposalDocx(proposal, bomRows, wizard));
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = `${fileBaseName(wizard.projectName || proposal.title)}.proposal.docx`;
  link.rel = "noopener";
  window.document.body.appendChild(link);
  link.click(); link.remove(); window.URL.revokeObjectURL(url);
}
