import {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel,
  ImageRun, PageBreak, PageNumber, Packer, Paragraph, ShadingType, Table, TableCell,
  TableLayoutType, TableRow, TextRun, WidthType,
} from "docx";
import type { StoredProjectProposal, StoredProductSelection } from "../data/projectStore";
import { powerBudgetSummary } from "./powerBudget";
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

type ProposalImageAsset = { data: Uint8Array; type: "jpg" | "png"; title: string };
type ProposalDocxAssets = { logo?: ProposalImageAsset; room?: ProposalImageAsset; schematic?: ProposalImageAsset };

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

function imageParagraph(asset: ProposalImageAsset, width: number, height: number) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 180 },
    children: [new ImageRun({
      data: asset.data,
      type: asset.type,
      transformation: { width, height },
      altText: { title: asset.title, description: asset.title, name: asset.title },
    })],
  });
}

function scopeTable(proposal: StoredProjectProposal) {
  const widths = [1550, 3370, 850, 2090, 1500];
  const items = proposal.applicationProposal?.thirdPartyScope ?? [];
  return fixedTable(widths, [
    new TableRow({ tableHeader: true, children: ["Discipline", "Scope / allowance", "Qty", "Responsibility", "Price / allowance"].map((title, index) => cell(title, widths[index], { bold: true, fill: PALE })) }),
    ...(items.length ? items : [{ category: "Third-party scope", description: "Confirm all non-WyreStorm equipment and delivery services.", quantity: 1, responsibility: "Integrator / customer", status: "validate" as const, notes: "" }]).map((item) => new TableRow({ children: [
      cell(item.category, widths[0]), cell(`${item.description}${item.notes ? ` — ${item.notes}` : ""}`, widths[1]),
      cell(String(item.quantity), widths[2], { align: AlignmentType.RIGHT }), cell(item.responsibility, widths[3]), cell("TBC", widths[4]),
    ] })),
  ]);
}

function architectureTable(diagram: string) {
  const stages = diagram.split(/\s*→\s*/).filter(Boolean);
  const widths = [1250, 8110];
  return fixedTable(widths, [
    new TableRow({ tableHeader: true, children: [cell("Stage", widths[0], { bold: true, fill: PALE }), cell("System function", widths[1], { bold: true, fill: PALE })] }),
    ...(stages.length ? stages : ["Architecture to be confirmed"]).map((stage, index) => new TableRow({ children: [cell(String(index + 1), widths[0], { bold: true, align: AlignmentType.CENTER }), cell(stage, widths[1]) ] })),
  ]);
}

function powerStrategyTable(products: StoredProductSelection[]): { table: Table; totalWatts: number; poeSkus: string[] } {
  const summaries = powerBudgetSummary(products);
  const widths = [2200, 900, 1600, 1600, 3060];
  const header = new TableRow({ tableHeader: true, children: ["SKU", "Qty", "Per-unit max", "Total max", "Power data (governed profile)"].map((title, index) => cell(title, widths[index], { bold: true, fill: PALE })) });
  const rows = summaries.map((s) => new TableRow({ children: [
    cell(s.sku, widths[0]),
    cell(String(s.quantity), widths[1], { align: AlignmentType.RIGHT }),
    cell(s.watts !== null ? `${s.watts}W` : "Not proven", widths[2], { align: AlignmentType.RIGHT }),
    cell(s.totalWatts !== null ? `${s.totalWatts}W` : "—", widths[3], { align: AlignmentType.RIGHT }),
    cell(s.powerLines.length ? s.powerLines.join("; ") : "No power data in governed profile", widths[4]),
  ] }));
  const knownTotals = summaries.filter((s) => s.totalWatts !== null) as Array<import("./powerBudget").PowerBudgetSummary & { totalWatts: number }>;
  const totalWatts = knownTotals.reduce((sum, s) => sum + s.totalWatts, 0);
  const poeSkus = summaries.filter((s) => s.powerLines.some((line) => /poe|poh|power over ethernet|power over hdbt|802\.3/i.test(line))).map((s) => s.sku);
  return { table: fixedTable(widths, [header, ...rows]), totalWatts, poeSkus };
}

function powerStrategyContent(products: StoredProductSelection[]): Array<Paragraph | Table> {
  if (!products.length) return [paragraph("No products have been selected, so a power budget cannot be calculated.", { colour: MUTED })];
  const { table, totalWatts, poeSkus } = powerStrategyTable(products);
  const lines: Array<Paragraph | Table> = [
    paragraph("The power budget below is derived from the governed technical profiles for each selected product. Figures are stated-maximum consumption per the published profile and must be verified against the current datasheet before order.", { justified: true }),
    table,
  ];
  if (totalWatts > 0) {
    lines.push(paragraph(`Stated maximum consumption: approximately ${Math.round(totalWatts)}W across the products with proven figures. Confirm the local power strategy (circuits, rack PSUs, PoE/PoH injector budgets) covers the full BOM before quoting.`, { colour: NAVY }));
  } else {
    lines.push(paragraph("No products in the current BOM have a proven power-consumption figure in their governed profile. Confirm PSU / power-source requirements before quoting.", { colour: MUTED }));
  }
  if (poeSkus.length) {
    lines.push(paragraph(`PoE/PoH requirement: ${poeSkus.join(", ")} — confirm the injector or switch PoE budget covers the total before order.`, { colour: NAVY }));
  }
  return lines;
}

function productSpecificationContent(proposal: StoredProjectProposal): Array<Paragraph | Table> {
  const specifications = proposal.applicationProposal?.productSpecifications ?? [];
  if (!specifications.length) return [paragraph("Product specifications will be added after the final WyreStorm equipment selection is approved.", { colour: MUTED })];
  return specifications.flatMap((specification) => [
    heading(`${specification.sku} — ${specification.name}`, 2),
    paragraph(`${specification.quantity} × ${specification.role}. ${specification.summary}`, { justified: true }),
    ...specification.keyFeatures.map(bullet),
    paragraph(`Confirm before order: ${specification.validation.join("; ")}`, { size: 18, colour: MUTED }),
  ]);
}

async function fetchImageAsset(url: string | undefined, title: string): Promise<ProposalImageAsset | undefined> {
  if (!url || typeof fetch === "undefined") return undefined;
  try {
    const response = await fetch(url);
    if (!response.ok) return undefined;
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const type = contentType.includes("png") || url.toLowerCase().includes(".png") ? "png" : "jpg";
    return { data: new Uint8Array(await response.arrayBuffer()), type, title };
  } catch {
    return undefined;
  }
}

function createSchematicDataUrl(diagram: string) {
  if (typeof document === "undefined") return undefined;
  const stages = diagram.split(/\s*→\s*/).filter(Boolean).slice(0, 8);
  if (!stages.length) return undefined;
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = Math.max(360, 120 + Math.ceil(stages.length / 4) * 210);
  const context = canvas.getContext("2d");
  if (!context) return undefined;
  context.fillStyle = "#F4F8FB";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.font = "bold 30px Calibri, Arial, sans-serif";
  context.fillStyle = "#08223A";
  context.fillText("Room signal-flow schematic", 58, 58);
  const columns = Math.min(4, stages.length);
  const boxWidth = 320;
  const boxHeight = 112;
  const xGap = 56;
  const yGap = 96;
  stages.forEach((stage, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = 58 + column * (boxWidth + xGap);
    const y = 96 + row * (boxHeight + yGap);
    context.fillStyle = "#E8F5F5";
    context.strokeStyle = "#16B8B0";
    context.lineWidth = 4;
    context.beginPath();
    context.roundRect(x, y, boxWidth, boxHeight, 18);
    context.fill();
    context.stroke();
    context.fillStyle = "#172B3A";
    context.font = "bold 22px Calibri, Arial, sans-serif";
    const words = stage.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width > boxWidth - 34 && line) { lines.push(line); line = word; } else line = candidate;
    }
    if (line) lines.push(line);
    lines.slice(0, 3).forEach((value, lineIndex) => context.fillText(value, x + 18, y + 36 + lineIndex * 28));
    if (index < stages.length - 1 && column < columns - 1) {
      const arrowX = x + boxWidth + 10;
      const arrowY = y + boxHeight / 2;
      context.strokeStyle = "#2E74B5";
      context.lineWidth = 5;
      context.beginPath(); context.moveTo(arrowX, arrowY); context.lineTo(arrowX + xGap - 20, arrowY); context.stroke();
      context.fillStyle = "#2E74B5";
      context.beginPath(); context.moveTo(arrowX + xGap - 20, arrowY); context.lineTo(arrowX + xGap - 35, arrowY - 10); context.lineTo(arrowX + xGap - 35, arrowY + 10); context.closePath(); context.fill();
    }
  });
  return canvas.toDataURL("image/png");
}

export function buildProposalDocx(proposal: StoredProjectProposal, bomRows: SalesBomRow[], wizard: ProposalWizardDraft, assets: ProposalDocxAssets = {}) {
  const config = getProposalDocumentTypeConfig(wizard.documentType);
  const company = proposal.companyName || "WyreStorm";
  const equipment = equipmentTable(bomRows, wizard);
  const risks = [...(proposal.governanceWarnings ?? []), ...(proposal.validationNotes ?? [])];
  const application = proposal.applicationProposal;
  const children: Array<Paragraph | Table> = [
    ...(assets.logo ? [imageParagraph(assets.logo, 190, 64)] : []),
    paragraph(company, { bold: true, size: 32, colour: AQUA, alignment: AlignmentType.CENTER, after: 120 }),
    paragraph(config.label.toUpperCase(), { bold: true, size: 20, colour: MUTED, alignment: AlignmentType.CENTER, after: 520 }),
    paragraph(wizard.projectName || proposal.title, { bold: true, size: 48, colour: NAVY, alignment: AlignmentType.CENTER, after: 200 }),
    paragraph(wizard.customerName ? `Prepared for ${wizard.customerName}` : "Customer proposal", { size: 26, colour: BLUE, alignment: AlignmentType.CENTER }),
    paragraph([wizard.proposalReference && `Reference: ${wizard.proposalReference}`, wizard.proposalDate && `Date: ${wizard.proposalDate}`, wizard.preparedBy && `Prepared by: ${wizard.preparedBy}`].filter(Boolean).join("  |  "), { size: 18, colour: MUTED, alignment: AlignmentType.CENTER }),
    ...(assets.room ? [imageParagraph(assets.room, 560, 315), paragraph(`${application?.application || "Room"} concept image — final room design and finishes are subject to approval.`, { size: 17, colour: MUTED, alignment: AlignmentType.CENTER })] : []),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  addSection(children, "Executive Summary", [paragraph(wizard.executiveSummary || proposal.summary || "Executive summary to be confirmed.", { justified: true })]);
  if (application) addSection(children, "Market and Application Story", [
    paragraph(application.marketStory || application.customerNeed, { justified: true }),
    heading("Intended room experience", 2),
    ...application.userJourney.map(bullet),
    heading("Business outcomes", 2),
    ...application.benefits.map((benefit) => bullet(`${benefit.title}: ${benefit.detail}`)),
  ]);
  addSection(children, "Client Objectives and Current Challenge", [paragraph(wizard.customerObjectives || proposal.summary || "The client objectives require confirmation.", { justified: true })]);
  addSection(children, "Proposed Solution and Business Value", [paragraph(wizard.proposedSolution || "The proposed solution requires confirmation.", { justified: true }), bullet("A supportable architecture aligned to the stated operational requirement."), bullet("A controlled route from design approval to quotation, delivery and acceptance."), bullet("Clear ownership of equipment, services, dependencies and by-others scope.")]);
  addSection(children, "Scope of Work", [heading("Included scope", 2), ...bulletLines(wizard.inclusions, "Supply of the WyreStorm equipment listed in this proposal."), heading("Delivery activities", 2), ...["Validate the final design and interfaces against site conditions.", "Supply and configure the listed WyreStorm hardware where expressly included.", "Complete functional testing and record acceptance results where commissioning is quoted."].map(bullet), heading("Not included / by others", 2), ...bulletLines(wizard.exclusions, "No exclusions have been recorded.")]);
  addSection(children, "Equipment and Pricing", [paragraph(equipment.complete ? `The equipment total is ${money(equipment.total, wizard.currency)} ${wizard.pricesExcludeTax ? "excluding VAT / sales tax" : "with tax treatment to be confirmed"}.` : "COMMERCIAL HOLD: one or more equipment prices are missing. This draft must not be issued as an exact quotation until every TBC value is resolved.", { bold: true, colour: equipment.complete ? NAVY : "9B1C1C" }), equipment.table, paragraph("Pricing covers only the listed equipment. Services, third-party equipment, freight, taxes and by-others work are excluded unless expressly priced below.", { size: 18, colour: MUTED })]);
  addSection(children, "Services and Commercial Allowances", [pipeTable(wizard.servicesAndAllowances, ["Service / discipline", "Responsibility", "Commercial status"], [3900, 2460, 3000])]);
  addSection(children, "Third-Party System Scope", [
    paragraph("WyreStorm forms part of the complete AV solution. The following equipment and delivery disciplines must be designed, owned and commercially completed before customer issue. TBC cells are deliberately editable allowances, not included prices.", { justified: true }),
    scopeTable(proposal),
  ]);
  addSection(children, "Technical Architecture", [
    paragraph(wizard.architectureNarrative || application?.solutionOverview || "The technical architecture requires confirmation.", { justified: true }),
    ...(assets.schematic ? [imageParagraph(assets.schematic, 620, Math.min(310, Math.max(175, Math.round(620 * 0.32))))] : []),
    architectureTable(application?.architectureDiagram || ""),
  ]);
  addSection(children, "WyreStorm Product Specifications", productSpecificationContent(proposal));
  addSection(children, "Power Strategy", powerStrategyContent(proposal.products));
  if (application?.acceptanceCriteria.length) addSection(children, "Testing and Acceptance Criteria", application.acceptanceCriteria.map(bullet));
  addSection(children, "Timeline and Phases", [paragraph("The programme below is indicative and begins only after design approval, commercial acceptance, stock confirmation and site readiness.", { colour: MUTED }), pipeTable(wizard.implementationTimeline, ["Phase", "Activity", "Indicative timing", "Dependency / output"], [1250, 2500, 1500, 4110])]);
  addSection(children, "Responsibilities and Dependencies", [heading("Responsibilities", 2), ...bulletLines(wizard.responsibilities, "Responsibilities are to be agreed."), heading("Dependencies", 2), ...bulletLines(wizard.dependencies, "Dependencies are to be confirmed.")]);
  addSection(children, "Assumptions, Risks and Exclusions", [heading("Assumptions", 2), ...bulletLines(wizard.assumptions, "Final assumptions are to be confirmed."), heading("Open risks and validation", 2), ...(risks.length ? risks : ["Validate datasheets, lifecycle, accessories, firmware, regional suitability and site dependencies before order."]).map(bullet)]);
  addSection(children, "Next Steps", [...bulletLines(wizard.nextSteps, "Confirm the final design, equipment schedule, responsibilities and commercial quotation."), paragraph(`Quotation validity: ${wizard.validityDays} days from the proposal date, subject to stock and written confirmation.`, { colour: MUTED })]);
  addSection(children, "Best-Efforts Disclaimer", [
    paragraph("This document has been prepared on a best-efforts basis to support your sales and design process. Product specifications, compatibility, lifecycle status, regional availability, pricing and lead times must be verified against the current WyreStorm documentation, datasheet or order desk before this document is used as a quotation, order or statement of capability. Competitor information is approximate and provided only to start a comparison conversation. Wingman provides no warranty and accepts no liability for any errors, omissions or reliance on the content of this document.", { justified: true, colour: MUTED }),
  ]);

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
  const [logo, room, schematic] = await Promise.all([
    fetchImageAsset(proposal.companyLogoDataUrl, `${proposal.companyName || "WyreStorm"} logo`),
    fetchImageAsset(proposal.applicationProposal?.roomVisualUrl, `${proposal.applicationProposal?.application || "Room"} concept`),
    fetchImageAsset(createSchematicDataUrl(proposal.applicationProposal?.architectureDiagram || ""), "Room signal-flow schematic"),
  ]);
  const blob = await Packer.toBlob(buildProposalDocx(proposal, bomRows, wizard, { logo, room, schematic }));
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = `${fileBaseName(wizard.projectName || proposal.title)}.proposal.docx`;
  link.rel = "noopener";
  window.document.body.appendChild(link);
  link.click(); link.remove(); window.URL.revokeObjectURL(url);
}
