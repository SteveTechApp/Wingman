import { loadProductMediaIndex, type ProductMediaIndex } from "../data/productMedia";
import { proposalProductCards, proposalSolutionStory } from "./proposalSalesContent";
import { proposalRoomBrief } from "./proposalRoomBrief";
import {
  AlignmentType, BorderStyle, Document, ExternalHyperlink, Footer, Header, HeadingLevel,
  ImageRun, PageBreak, PageNumber, Packer, Paragraph, ShadingType, Table, TableCell,
  TableLayoutType, TableRow, TextRun, WidthType,
} from "docx";
import type { StoredProjectProposal, StoredProductSelection, StoredVideowallSummary } from "../data/projectStore";
import { downloadBlob } from "./downloadBlob";
import { powerBudgetSummary } from "./powerBudget";
import type { SalesBomRow } from "./salesReadiness";
import { getProposalDocumentTypeConfig, linesFromText, type ProposalWizardDraft } from "./proposalWizard";
import { extractUnresolvedDiscoveryItems } from "./unresolvedDiscoveryItems";
import {
  CAPTURE_CONFIDENCE_EXPLAINER,
  captureConfidenceCell,
} from "./discoveryConversationDisplay";
import { buildWingmanSchematic } from "./schematic/wingmanSchematicEngine";
import type { SchematicModel } from "./schematic/schematicTypes";
import { SCHEMATIC_COLORS, SCHEMATIC_NODE_COLORS } from "./schematic/schematicVisualPalette";
import { buildNativeCableSchedule, nativeCableToneLabel, cableValidationStatusLabel } from "./schematic/nativeCableSchedule";
import { proposalSchematicBrief } from "./schematic/proposalSchematicBrief";
import { buildDesignProjectDocument, trackDesignProjectExport } from "../features/design-project";
import { productDataRevision } from "./productDataRevision";
import { buildDisplaySchedule } from "./displaySchedule";
import {
  buildInstallationSchedule,
  installationCategoryLabel,
  installationTableHeaders,
  installationTotals,
  INSTALLATION_TABLE_COLUMN_LABELS,
  type InstallationSchedule,
} from "./installationSchedule";
import { wallRequirementsFromSummary } from "./videowallOptions";
import { wallTransportRequirements } from "./videowallTransport";
import { assertWallTransportExportable } from "./proposalExportValidation";
import { wallVisualLayout } from "./videowallVisual";
import { wallElevationCaption, wallElevationOverlay, wallElevationPng, wallMappingPreviews, wallMappingRecommendation, type WallMappingRecommendation } from "./wallElevation";
import {
  wallStartingPointDrift,
  wallStartingPointFromSummary,
  wallStartingPointRecordText,
} from "./wallStartingPointOrigin";
import { CUSTOMER_COPY, customerCopyText } from "./proposalCopy";
import { WALL_SURVEY_COLUMN_KEY } from "./wallSurvey";
import {
  buildDocumentAppendix,
  documentSectionPlan,
  type DocumentAppendix,
  type DocumentSectionId,
} from "./documentSections";
import { HOUSE_DOCUMENT_BRAND, type DocumentDetail } from "./solutionTemplates";

export const NAVY = "08223A";
export const AQUA = "16B8B0";
export const BLUE = "2E74B5";
export const TEXT = "172B3A";
export const MUTED = "5E7280";
export const PALE = "F4F6F9";
export const BORDER = "CBD5E1";
export const TABLE_WIDTH = 9360;

type ProposalImageAsset = { data: Uint8Array; type: "jpg" | "png"; title: string; width?: number; height?: number };
type WallPreview = { value: "fit" | "fill"; consequence: string; image?: ProposalImageAsset };
type ProposalDocxAssets = {
  logo?: ProposalImageAsset;
  room?: ProposalImageAsset;
  schematic?: ProposalImageAsset;
  wallElevation?: ProposalImageAsset;
  /** Both mappings, shown side by side when the source shape differs. */
  wallPreviews?: { chosen: "fit" | "fill"; options: WallPreview[] };
  products?: Record<string, ProposalImageAsset>;
  media?: ProductMediaIndex | null;
};

export function fileBaseName(title: string, fallback = "wingman-proposal") {
  return String(title || fallback).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || fallback;
}

export function paragraph(text: string, options: { bold?: boolean; size?: number; colour?: string; alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number; justified?: boolean } = {}) {
  return new Paragraph({
    alignment: options.justified ? AlignmentType.JUSTIFIED : options.alignment,
    spacing: { after: options.after ?? 160, line: 320 },
    children: [new TextRun({ text, bold: options.bold, size: options.size ?? 22, color: options.colour ?? TEXT, font: "Calibri" })],
  });
}

/**
 * The cable key under the display schedule.
 *
 * The schedule's transport column prints the design's allowance, the cable's
 * limit and the run the design already holds; the printed proposal explains the
 * three under the table in the survey sheet's own words, so Word has to print
 * the same key or the customer meets three numbers with no legend. The entries
 * come from `WALL_SURVEY_COLUMN_KEY`, and the labels stay bold as the HTML's
 * `<strong>`, so the two documents cannot describe the column differently.
 */
function cableKeyParagraph() {
  const children = WALL_SURVEY_COLUMN_KEY.flatMap((entry, index) => [
    new TextRun({ text: `${index ? " " : ""}${entry.label}`, bold: true, size: 18, color: MUTED, font: "Calibri" }),
    new TextRun({ text: ` — ${entry.text}`, size: 18, color: MUTED, font: "Calibri" }),
  ]);
  return new Paragraph({ spacing: { after: 160, line: 320 }, children });
}

export function heading(text: string, level: 1 | 2 = 1) {
  return new Paragraph({
    heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
    keepNext: true,
    spacing: { before: level === 1 ? 360 : 240, after: level === 1 ? 200 : 120 },
    children: [new TextRun({ text, bold: true, color: level === 1 ? BLUE : NAVY, size: level === 1 ? 32 : 26, font: "Calibri" })],
  });
}

export function bullet(text: string) {
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

export function cell(text: string, width: number, options: { bold?: boolean; fill?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    shading: options.fill ? { fill: options.fill, type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({
      alignment: options.align,
      // Header cells stay with the first data row; body rows remain free to paginate.
      keepNext: Boolean(options.bold && options.fill === PALE),
      spacing: { after: 0, line: 260 },
      children: [new TextRun({ text, bold: options.bold, size: 18, color: options.bold ? NAVY : TEXT, font: "Calibri" })],
    })],
  });
}

export const borders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: BORDER }, bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  left: { style: BorderStyle.SINGLE, size: 4, color: BORDER }, right: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 3, color: BORDER }, insideVertical: { style: BorderStyle.SINGLE, size: 3, color: BORDER },
};

/**
 * One row Word must keep on a single page: `cantSplit` stops a page break
 * cutting a cell in half. Every proposal schedule row is built with this, so a
 * new table cannot quietly reintroduce a split row.
 */
export function tableRow(options: ConstructorParameters<typeof TableRow>[0]) {
  return new TableRow({ cantSplit: true, ...options });
}

export function fixedTable(widths: number[], rows: TableRow[]) {
  return new Table({ width: { size: TABLE_WIDTH, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: widths, borders, rows });
}

/**
 * Share the fixed table width across the columns that are actually printed, so
 * a schedule that gains a column (size, weight, transport) keeps the same
 * overall width instead of running past the page margin.
 */
function fittedWidths(headers: string[], baseWidths: Record<string, number>) {
  const raw = headers.map((header) => baseWidths[header] ?? 1200);
  const total = raw.reduce((sum, width) => sum + width, 0) || 1;
  const widths = raw.map((width) => Math.max(1, Math.round((width / total) * TABLE_WIDTH)));
  // Rounding can drift a unit or two; the last column absorbs it.
  widths[widths.length - 1] += TABLE_WIDTH - widths.reduce((sum, width) => sum + width, 0);
  return widths;
}

export function addSection(children: Array<Paragraph | Table>, title: string, content: Array<Paragraph | Table>) {
  children.push(heading(title), ...content);
}

function money(value: number, currency: ProposalWizardDraft["currency"]) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value);
}

function equipmentTable(rows: SalesBomRow[], wizard: ProposalWizardDraft) {
  const widths = [1500, 2700, 650, 1350, 1450, 1710];
  const header = tableRow({ tableHeader: true, children: ["SKU", "Description", "Qty", "Unit price", "Line total", "Status"].map((value, index) => cell(value, widths[index], { bold: true, fill: PALE })) });
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
    return tableRow({ children: values.map((value, index) => cell(value, widths[index], { align: index >= 2 && index <= 4 ? AlignmentType.RIGHT : undefined })) });
  });
  if (!rows.length) body.push(tableRow({ children: [new TableCell({ columnSpan: 6, width: { size: TABLE_WIDTH, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 120, right: 120 }, children: [paragraph("No final equipment schedule is attached. This document is not an equipment quotation.", { colour: MUTED })] })] }));
  if (rows.length) body.push(tableRow({ children: [cell("Equipment total", widths[0] + widths[1] + widths[2], { bold: true, fill: PALE }), cell(complete ? money(total, wizard.currency) : "TBC — pricing incomplete", widths[3] + widths[4], { bold: true, fill: PALE, align: AlignmentType.RIGHT }), cell(wizard.pricesExcludeTax ? "Excl. tax" : "Tax status TBC", widths[5], { bold: true, fill: PALE })] }));
  return { table: fixedTable(widths, [header, ...body]), complete, total };
}

/**
 * The priced installation schedule: one line per thing the survey recorded, at
 * the quantity of links that need it. Rates are the rep's, filed by line id, so
 * a saved draft keeps them when the survey is edited elsewhere. An unpriced line
 * prints TBC and holds the total, exactly as an unpriced equipment row does.
 */
function installationTable(schedule: InstallationSchedule, wizard: ProposalWizardDraft) {
  // The headings are the shared list's, and the widths are keyed by the column
  // rather than by a label typed here, so a renamed heading cannot quietly fall
  // back to the default column width.
  const columns = ["service", "detail", "quantity", "unitRate", "lineTotal", "links"] as const;
  const headers = installationTableHeaders(columns);
  const baseWidths: Record<(typeof columns)[number], number> = { service: 1500, detail: 2400, quantity: 650, unitRate: 1350, lineTotal: 1450, links: 2010 };
  const widths = fittedWidths(headers, Object.fromEntries(columns.map((column) => [INSTALLATION_TABLE_COLUMN_LABELS[column], baseWidths[column]])));
  const header = tableRow({ tableHeader: true, children: headers.map((value, index) => cell(value, widths[index], { bold: true, fill: PALE })) });
  const { lines, complete, total } = installationTotals(schedule, wizard.installationUnitPrices);
  const body = lines.map((line) => {
    const values = [
      installationCategoryLabel(line.category),
      line.detail,
      String(line.quantity),
      line.unit === null ? "TBC" : money(line.unit, wizard.currency),
      line.total === null ? "TBC" : money(line.total, wizard.currency),
      line.links.join(", "),
    ];
    return tableRow({ children: values.map((value, index) => cell(value, widths[index], { align: index === 2 || index === 3 || index === 4 ? AlignmentType.RIGHT : undefined })) });
  });
  body.push(tableRow({ children: [
    cell("Installation and services total", widths[0] + widths[1] + widths[2], { bold: true, fill: PALE }),
    cell(complete ? money(total, wizard.currency) : "TBC — pricing incomplete", widths[3] + widths[4], { bold: true, fill: PALE, align: AlignmentType.RIGHT }),
    cell(wizard.pricesExcludeTax ? "Excl. tax" : "Tax status TBC", widths[5], { bold: true, fill: PALE }),
  ] }));
  return { table: fixedTable(widths, [header, ...body]), complete, total };
}

function pipeTable(value: string, headers: string[], widths: number[]) {
  const rows = linesFromText(value).map((line) => line.split("|").map((part) => part.trim()));
  return fixedTable(widths, [
    tableRow({ tableHeader: true, children: headers.map((title, index) => cell(title, widths[index], { bold: true, fill: PALE })) }),
    ...(rows.length ? rows : [["To be confirmed"]]).map((parts) => tableRow({ children: widths.map((width, index) => cell(parts[index] || "TBC", width)) })),
  ]);
}

const noneBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

/**
 * Both mappings side by side, so the document shows the choice, not only its
 * result. Each option states the share it costs, which is what the customer is
 * actually choosing between, with the chosen one marked.
 */
function mappingOptions(
  previews: NonNullable<ProposalDocxAssets["wallPreviews"]>,
  advice: WallMappingRecommendation | null = null,
) {
  const width = 4680;
  const cells = previews.options.map((option) => new TableCell({
    width: { size: width, type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({
          text: `${option.value === "fit" ? "Fit" : "Fill"}${[option.value === previews.chosen ? "in this design" : "", option.value === advice?.value ? "recommended" : ""].filter(Boolean).map((note) => ` · ${note}`).join("")}`,
          bold: true, size: 18, color: NAVY, font: "Calibri",
        })],
      }),
      ...(option.image ? [imageParagraph(option.image, 240, 150)] : []),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [new TextRun({ text: option.consequence, size: 16, color: NAVY, font: "Calibri" })],
      }),
    ],
  }));
  return [
    paragraph("Source mapping options", { bold: true, size: 18, colour: NAVY }),
    paragraph(
      `The source and the wall have different shapes, so one of these two costs is unavoidable. Both drawings show this wall at the same size; this design uses ${previews.chosen === "fit" ? "Fit" : "Fill"}.`,
      { size: 17, colour: MUTED },
    ),
    ...(advice ? [
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: `Recommendation: ${advice.value === "fit" ? "Fit" : "Fill"}. `, bold: true, size: 17, color: NAVY, font: "Calibri" }),
          new TextRun({ text: `${advice.basis} ${advice.cost}`, size: 17, color: NAVY, font: "Calibri" }),
        ],
      }),
    ] : []),
    new Table({
      width: { size: TABLE_WIDTH, type: WidthType.DXA },
      columnWidths: [width, width],
      borders: noneBorders,
      // The two drawings are one choice, so Word must not page-break between
      // them. Every row is pinned (`cantSplit`); `keepNext` or a page break
      // here would drag the display schedule that follows onto the next page.
      rows: [tableRow({ cantSplit: true, children: cells })],
    }),
  ];
}

function imageParagraph(asset: ProposalImageAsset, width: number, height: number) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 180 },
    children: [new ImageRun({
      data: asset.data,
      type: asset.type,
      transformation: asset.width && asset.height ? { width: Math.min(width, height * asset.width / asset.height), height: Math.min(height, width * asset.height / asset.width) } : { width, height },
      altText: { title: asset.title, description: asset.title, name: asset.title },
    })],
  });
}

function scopeTable(proposal: StoredProjectProposal) {
  const widths = [1550, 3370, 850, 2090, 1500];
  const items = proposal.applicationProposal?.thirdPartyScope ?? [];
  return fixedTable(widths, [
    tableRow({ tableHeader: true, children: ["Discipline", "Scope / allowance", "Qty", "Responsibility", "Price / allowance"].map((title, index) => cell(title, widths[index], { bold: true, fill: PALE })) }),
    ...(items.length ? items : [{ category: "Third-party scope", description: "Confirm all non-WyreStorm equipment and delivery services.", quantity: 1, responsibility: "Integrator / customer", status: "validate" as const, notes: "" }]).map((item) => tableRow({ children: [
      cell(item.category, widths[0]), cell(`${item.description}${item.notes ? ` — ${item.notes}` : ""} — Scope status: ${item.status}`, widths[1]),
      cell(String(item.quantity), widths[2], { align: AlignmentType.RIGHT }), cell(item.responsibility, widths[3]), cell("TBC", widths[4]),
    ] })),
  ]);
}

function architectureTable(diagram: string) {
  const stages = diagram.split(/\s*→\s*/).filter(Boolean);
  const widths = [1250, 8110];
  return fixedTable(widths, [
    tableRow({ tableHeader: true, children: [cell("Stage", widths[0], { bold: true, fill: PALE }), cell("System function", widths[1], { bold: true, fill: PALE })] }),
    ...(stages.length ? stages : ["Architecture to be confirmed"]).map((stage, index) => tableRow({ children: [cell(String(index + 1), widths[0], { bold: true, align: AlignmentType.CENTER }), cell(stage, widths[1]) ] })),
  ]);
}

function powerStrategyTable(products: StoredProductSelection[]): { table: Table; totalWatts: number; poeSkus: string[] } {
  const summaries = powerBudgetSummary(products);
  const widths = [2200, 900, 1600, 1600, 3060];
  const header = tableRow({ tableHeader: true, children: ["SKU", "Qty", "Per-unit max", "Total max", "Power data (WyreStorm)"].map((title, index) => cell(title, widths[index], { bold: true, fill: PALE })) });
  const rows = summaries.map((s) => tableRow({ children: [
    cell(s.sku, widths[0]),
    cell(String(s.quantity), widths[1], { align: AlignmentType.RIGHT }),
    cell(s.watts !== null ? `${s.watts}W` : "Not proven", widths[2], { align: AlignmentType.RIGHT }),
    cell(s.totalWatts !== null ? `${s.totalWatts}W` : "—", widths[3], { align: AlignmentType.RIGHT }),
    cell(s.powerLines.length ? s.powerLines.join("; ") : "No power figure published", widths[4]),
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
    paragraph("The power figures below come from WyreStorm product data for each selected product. They are the maximum the published specification states, and should be checked against the current datasheet before ordering.", { justified: true }),
    table,
  ];
  if (totalWatts > 0) {
    lines.push(paragraph(`Stated maximum consumption: approximately ${Math.round(totalWatts)}W across the products with proven figures. Confirm the local power strategy (circuits, rack PSUs, PoE/PoH injector budgets) covers the full BOM before quoting.`, { colour: NAVY }));
  } else {
    lines.push(paragraph("None of the selected products has a published power figure yet. Confirm power supply requirements before quoting.", { colour: MUTED }));
  }
  if (poeSkus.length) {
    lines.push(paragraph(`PoE/PoH requirement: ${poeSkus.join(", ")} — confirm the injector or switch PoE budget covers the total before order.`, { colour: NAVY }));
  }
  return lines;
}

function discoveryConversationContent(proposal: StoredProjectProposal): Array<Paragraph | Table> {
  const items = proposal.discoveryConversation ?? [];
  if (!items.length) {
    return [paragraph("The discovery conversation behind this requirement has not been captured yet. Confirm the room, source, display, distance, USB, audio and control answers with the customer before issue.", { colour: MUTED })];
  }
  const widths = [2300, 2300, 2700, 1400, 1260];
  const table = fixedTable(widths, [
    tableRow({ tableHeader: true, children: ["Question asked", "Answer we recorded", "Customer wording", "Status", "Capture confidence"].map((title, index) => cell(title, widths[index], { bold: true, fill: PALE })) }),
    ...items.map((item) => tableRow({ children: [
      cell(item.question, widths[0]),
      cell(item.answer, widths[1]),
      cell(item.note || "—", widths[2]),
      cell(item.confirmed ? "Confirmed with customer" : "To be confirmed", widths[3]),
      cell(captureConfidenceCell(item.confidence, item.confidenceScore), widths[4]),
    ] })),
  ]);
  return [
    paragraph("Below is the conversation this proposal is based on: the question we asked, the answer we recorded, and your own words where we captured them. \"Confirmed with customer\" means we checked that point with you; \"To be confirmed\" means it is still open and will be settled before the design is signed off.", { justified: true }),
    paragraph(CAPTURE_CONFIDENCE_EXPLAINER, { size: 18, colour: MUTED, justified: true }),
    table,
    paragraph("If a row has a note but no clear answer, that point was still open when this was written and will be confirmed before the design is signed off.", { size: 18, colour: MUTED }),
  ];
}

function unresolvedDiscoveryContent(proposal: StoredProjectProposal): Array<Paragraph | Table> {
  const items = extractUnresolvedDiscoveryItems({ discoveryConversation: proposal.discoveryConversation });
  if (!items.length) {
    return [paragraph("All discovery items have been confirmed with the customer. No outstanding items require verification before final design sign-off.", { colour: MUTED })];
  }
  const widths = [1800, 3000, 1500, 1360];
  const severityLabel: Record<string, string> = { conflict: "Conflict — BLOCKER", "low-confidence": "Low confidence", inferred: "Inferred (not confirmed)", unconfirmed: "Unconfirmed" };
  const table = fixedTable(widths, [
    tableRow({ tableHeader: true, children: ["Requirement area", "Captured answer", "Status", "Severity"].map((title, index) => cell(title, widths[index], { bold: true, fill: PALE })) }),
    ...items.map((item) => tableRow({ children: [
      cell(item.field, widths[0], { bold: true }),
      cell(item.capturedAnswer, widths[1]),
      cell(severityLabel[item.reason] ?? item.reason, widths[2]),
      cell(item.reason === "conflict" ? "BLOCKER" : item.reason === "low-confidence" ? "HIGH" : "MEDIUM", widths[3]),
    ] })),
  ]);
  return [
    paragraph(`The following ${items.length} discovery item${items.length === 1 ? "" : "s"} could not be fully verified during the discovery conversation. Each must be confirmed with the customer before final design sign-off and commercial quotation. Items marked BLOCKER must be resolved before any commitment is made.`, { justified: true }),
    table,
  ];
}

function cableScheduleContent(proposal: StoredProjectProposal, bomRows: SalesBomRow[]): Array<Paragraph | Table> {
  if (!bomRows.length) return [];
  try {
    const products = proposal.products ?? [];
    const bomRowsForSchematic = (bomRows.length ? bomRows : proposal.bomRows ?? []).map((r) => ({ sku: r.sku, description: r.description, role: r.role, qty: r.qty }));
    const brief = proposalSchematicBrief(proposal.title || "System schematic", products, bomRowsForSchematic);
    const schematicModel = buildWingmanSchematic(brief);
    const cableRows = buildNativeCableSchedule(schematicModel);
    if (!cableRows.length) return [];
    const widths = [2000, 1500, 900, 1200, 900, 2560];
    const table = fixedTable(widths, [
      tableRow({ tableHeader: true, children: ["Cable run", "Transport type", "Max length", "Connectors", "Status", "Validation reminder"].map((title, index) => cell(title, widths[index], { bold: true, fill: PALE })) }),
      ...cableRows.map((row) => tableRow({ children: [
        cell(row.label, widths[0], { bold: true }),
        cell(nativeCableToneLabel(row.type), widths[1]),
        cell(row.maxLengthMetres !== null && row.maxLengthMetres !== undefined ? `${row.maxLengthMetres}m` : "Not confirmed", widths[2]),
        cell(row.connectors || "TBC", widths[3]),
        cell(cableValidationStatusLabel(row.validationStatus), widths[4]),
        cell(row.reminder, widths[5]),
      ] })),
    ]);
    const confirmedCount = cableRows.filter((r) => r.validationStatus === "confirmed").length;
    const pendingCount = cableRows.filter((r) => r.validationStatus === "needs-site-confirmation").length;
    const unknownCount = cableRows.filter((r) => r.validationStatus === "unknown").length;
    return [
      paragraph(`The cable schedule below lists every connection in the system, built from the equipment schedule. Each row gives the cable type, maximum length, connectors and what still needs checking. ${confirmedCount} of ${cableRows.length} runs are confirmed from WyreStorm product data; ${pendingCount} need checking on site; ${unknownCount} are not confirmed yet.`, { justified: true }),
      table,
    ];
  } catch {
    return [paragraph("The cable schedule could not be generated from the schematic engine. Validate cable routes on site.", { colour: MUTED })];
  }
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

function canonicalDesignContent(proposal: StoredProjectProposal): Array<Paragraph | Table> {
  const revision = proposal.designRevision;
  if (!revision) return [paragraph("This proposal does not include a design trace. It was prepared before Wingman recorded one, so the design described above remains the basis of this proposal.", { colour: MUTED })];
  const document = buildDesignProjectDocument(revision);
  return [
    paragraph(`Design reference: ${document.revisionId}`, { bold: true, colour: NAVY }),
    heading("Customer said", 2), paragraph(document.customerRequirement),
    heading("Wingman understood", 2), paragraph(document.interpretation),
    heading("Design direction", 2), paragraph(document.architecture),
    heading("Requirement trace", 2),
    ...document.requirements.flatMap((item) => [paragraph(item.customerStatement, { bold: true }), paragraph(`${item.interpretation} What this means for the design: ${item.designConsequence} Status: ${item.state}.`, { colour: MUTED })]),
    heading("System completeness", 2),
    ...document.requiredRoles.map((item) => bullet(`${item.label}: ${item.covered ? "Covered" : "Missing"}${item.evidence.length ? ` — ${item.evidence.join("; ")}` : ""}`)),
    heading("Product overview in this design", 2),
    ...document.products.flatMap((item) => [paragraph(`${item.quantity} × ${item.sku} — ${item.name}`, { bold: true }), paragraph(`${item.designRole}. ${item.reason}${item.proof.length ? ` Proof: ${item.proof.join("; ")}` : ""}`, { colour: MUTED })]),
  ];
}

async function fetchImageAsset(url: string | undefined, title: string): Promise<ProposalImageAsset | undefined> {
  if (!url || typeof fetch === "undefined") return undefined;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return undefined;
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) return undefined;
    const bitmap = await createImageBitmap(blob);
    try {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const context = canvas.getContext("2d");
      if (!context) return undefined;
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!png) return undefined;
      return { data: new Uint8Array(await png.arrayBuffer()), type: "png", title, width: canvas.width, height: canvas.height };
    } finally { bitmap.close(); }
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

// ─── Native Schematic Renderer for DOCX ──────────────────────────────────────

/**
 * Renders a native SchematicModel (from buildWingmanSchematic) onto a canvas
 * for embedding in DOCX exports. Unlike the legacy createSchematicDataUrl
 * which draws sequential boxes from a text string, this renders real
 * topology-aware connectivity with proper node types, transport labels,
 * and orthogonal routing.
 *
 * The two colour tables below are built here rather than at module scope, and
 * that is not a style preference: this module and `schematicVisualPalette` are
 * in a cycle across chunks (`wm-room-design` → `wm-room-catalogue` →
 * `wm-project-workflow` → `wm-proposal-generation` → `wm-room-design`), and read
 * the way a bundler orders those chunks, the palette can be read before it has
 * been initialized. A module-scope table read `SCHEMATIC_COLORS.aqua` and the
 * whole template review page died on `Cannot read properties of undefined
 * (reading 'aqua')` in the built app while the dev server, which loads one
 * module at a time, never showed it. Reading the palette inside the render that
 * needs it asks the question when the answer exists.
 */
export function createNativeSchematicDataUrl(schematic: SchematicModel): string | undefined {
  if (typeof document === "undefined") return undefined;

  const transportColours: Record<string, string> = {
    hdmi: SCHEMATIC_COLORS.aqua,
    hdbaset: SCHEMATIC_COLORS.blue,
    "av-over-ip": SCHEMATIC_COLORS.blue,
    usb: SCHEMATIC_COLORS.violet,
    network: SCHEMATIC_COLORS.blue,
    control: SCHEMATIC_COLORS.amber,
    unknown: SCHEMATIC_COLORS.slate,
  };
  const nodeColours: Record<string, string> = SCHEMATIC_NODE_COLORS;

  const NODE_W = 150;
  const NODE_H = 50;
  const COL_GAP = 180;
  const LANE_GAP = 70;
  const ORIGIN_X = 40;
  const ORIGIN_Y = 80;

  // Assign column positions based on node kind
  function columnForKind(kind: string): number {
    switch (kind) {
      case "source": case "camera": case "speakerphone": return 0;
      case "switcher": case "matrix": case "av-over-ip-encoder":
      case "av-over-ip-transceiver": case "av-over-ip-controller":
      case "video-wall-processor": case "usb-bridge": return 1;
      case "network-switch": return 2;
      case "av-over-ip-decoder": return 3;
      case "display": case "audio-device": return 4;
      default: return 2;
    }
  }

  // Position nodes on a grid
  const columnLanes = new Map<string, number>();
  const nodes = schematic.nodes.map((node) => {
    const col = columnForKind(node.kind);
    const key = String(col);
    const laneIdx = columnLanes.get(key) ?? 0;
    columnLanes.set(key, laneIdx + 1);
    return {
      ...node,
      x: ORIGIN_X + col * COL_GAP,
      y: ORIGIN_Y + laneIdx * (NODE_H + LANE_GAP),
    };
  });

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const maxX = Math.max(...nodes.map((n) => n.x + NODE_W), 600);
  const maxY = Math.max(...nodes.map((n) => n.y + NODE_H), 300);

  const canvas = document.createElement("canvas");
  canvas.width = maxX + NODE_W + 60;
  canvas.height = maxY + NODE_H + 60;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;

  // Background
  ctx.fillStyle = "#F4F8FB";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  ctx.font = "bold 26px Calibri, Arial, sans-serif";
  ctx.fillStyle = "#08223A";
  ctx.fillText("System connectivity schematic", 40, 40);
  ctx.font = "16px Calibri, Arial, sans-serif";
  ctx.fillStyle = "#5E7280";
  ctx.fillText(schematic.title || "Topology-aware signal flow", 40, 62);

  // Column headers
  const colHeaders = ["Sources", "Core / Transport", "Network", "Decoders", "Outputs"];
  colHeaders.forEach((label, i) => {
    ctx.font = "bold 11px Calibri, Arial, sans-serif";
    ctx.fillStyle = "rgba(83,224,255,0.6)";
    ctx.textAlign = "center";
    ctx.fillText(label.toUpperCase(), ORIGIN_X + i * COL_GAP + NODE_W / 2, ORIGIN_Y - 12);
  });
  ctx.textAlign = "left";

  // Draw connections
  for (const conn of schematic.connections) {
    const from = nodeMap.get(conn.from);
    const to = nodeMap.get(conn.to);
    if (!from || !to) continue;

    const x1 = from.x + NODE_W;
    const y1 = from.y + NODE_H / 2;
    const x2 = to.x;
    const y2 = to.y + NODE_H / 2;
    const midX = Math.round((x1 + x2) / 2);

    const color = transportColours[conn.transport] || "#94a3b8";

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    if (y1 === y2) {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    } else {
      ctx.moveTo(x1, y1);
      ctx.lineTo(midX, y1);
      ctx.lineTo(midX, y2);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Transport label
    const label = conn.transport === "unknown" ? "?" : conn.transport.toUpperCase();
    ctx.font = "9px Calibri, Arial, sans-serif";
    ctx.fillStyle = "#5E7280";
    ctx.textAlign = "center";
    ctx.fillText(label, midX, Math.min(y1, y2) - 4);
    ctx.textAlign = "left";
  }

  // Draw nodes
  for (const node of nodes) {
    const color = nodeColours[node.kind] || "#6b7280";

    // Background
    ctx.fillStyle = "rgba(8,29,48,0.92)";
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(node.x, node.y, NODE_W, NODE_H, 6);
    ctx.fill();
    ctx.stroke();

    // Top accent
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(node.x, node.y, NODE_W, 3, [2, 2, 0, 0]);
    ctx.fill();

    // SKU or label
    const label = node.sku || node.label;
    ctx.font = "bold 10px Calibri, Arial, sans-serif";
    ctx.fillStyle = "#E2E8F0";
    ctx.textAlign = "center";
    const truncated = label.length > 20 ? label.slice(0, 19) + "..." : label;
    ctx.fillText(truncated, node.x + NODE_W / 2, node.y + 22);

    // Subtitle
    ctx.font = "9px Calibri, Arial, sans-serif";
    ctx.fillStyle = "rgba(148,163,184,0.85)";
    const sub = node.sku ? node.kind.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) : (node.proposalSafeNote || "Confirm");
    const truncSub = sub.length > 24 ? sub.slice(0, 23) + "..." : sub;
    ctx.fillText(truncSub, node.x + NODE_W / 2, node.y + 38);
    ctx.textAlign = "left";
  }

  // Warnings footer
  const blockers = schematic.warnings.filter((w) => w.severity === "blocker");
  if (blockers.length > 0) {
    const footerY = maxY + NODE_H + 30;
    ctx.font = "bold 11px Calibri, Arial, sans-serif";
    ctx.fillStyle = "#EF4444";
    ctx.fillText(`${blockers.length} design blocker(s) — resolve before quoting:`, 40, footerY);
    ctx.font = "10px Calibri, Arial, sans-serif";
    ctx.fillStyle = "#9B1C1C";
    blockers.slice(0, 3).forEach((b, i) => {
      ctx.fillText(`• ${b.title}: ${b.message.slice(0, 100)}`, 50, footerY + 16 + i * 14);
    });
  }

  return canvas.toDataURL("image/png");
}

/**
 * The evidence appendix a Technical document carries: one row per equipment
 * line, at the widths the reference table is built with.
 */
function appendixTable(appendix: DocumentAppendix) {
  const widths = [600, 2400, 3200, 1600, 1560];
  const headers = ["Item", "Equipment line", "Evidence for this line", "Source read", "Verification"];
  return fixedTable(widths, [
    tableRow({ tableHeader: true, children: headers.map((value, index) => cell(value, widths[index], { bold: true, fill: PALE })) }),
    ...appendix.rows.map((row) => tableRow({ children: [String(row.item), row.line, row.evidence, row.source, row.verification].map((value, index) => cell(value, widths[index])) })),
  ]);
}

/**
 * The Word document, printed at the detail level the document's own
 * personalisation chose.
 *
 * Every section prints through the level's plan (`documentSections.ts`), so
 * which parts of the document appear is one decision rather than a rule each
 * call site keeps: a section is printed because of the level it is filed under
 * there, and moving it between levels is a change in that table alone. The
 * default is the house level, so a proposal that never chose one — every
 * document issued before the level reached print — is the whole document.
 */
export function buildProposalDocx(proposal: StoredProjectProposal, bomRows: SalesBomRow[], wizard: ProposalWizardDraft, assets: ProposalDocxAssets = {}, videoWall: StoredVideowallSummary | null = null, detail: DocumentDetail = HOUSE_DOCUMENT_BRAND.detail) {
  const config = getProposalDocumentTypeConfig(wizard.documentType);
  const displaySchedule = buildDisplaySchedule(proposal, bomRows, videoWall);
  const company = proposal.companyName || "WyreStorm";
  const equipment = equipmentTable(bomRows, wizard);
  // Installation comes from the same saved wall the display schedule quotes, so
  // the priced lines and the install detail table cannot list different scope.
  const installationSchedule = buildInstallationSchedule(wallRequirementsFromSummary(videoWall));
  const installation = installationSchedule ? installationTable(installationSchedule, wizard) : null;
  const risks = [...(proposal.governanceWarnings ?? []), ...(proposal.validationNotes ?? [])];
  const application = proposal.applicationProposal;
  const story = proposalSolutionStory(proposal, bomRows);
  const children: Array<Paragraph | Table> = [
    ...(assets.logo ? [imageParagraph(assets.logo, 190, 64)] : []),
    paragraph(company, { bold: true, size: 32, colour: AQUA, alignment: AlignmentType.CENTER, after: 120 }),
    paragraph(config.label.toUpperCase(), { bold: true, size: 20, colour: MUTED, alignment: AlignmentType.CENTER, after: 520 }),
    paragraph(wizard.projectName || proposal.title, { bold: true, size: 48, colour: NAVY, alignment: AlignmentType.CENTER, after: 200 }),
    paragraph(wizard.customerName ? `Prepared for ${wizard.customerName}` : "Customer proposal", { size: 26, colour: BLUE, alignment: AlignmentType.CENTER }),
    paragraph([wizard.proposalReference && `Reference: ${wizard.proposalReference}`, wizard.proposalDate && `Date: ${wizard.proposalDate}`, wizard.preparedBy && `Prepared by: ${wizard.preparedBy}`].filter(Boolean).join("  |  "), { size: 18, colour: MUTED, alignment: AlignmentType.CENTER }),
    heading("Document control", 2),
    fixedTable([3000, 6360], [
      tableRow({ children: [cell("Reference", 3000, { bold: true }), cell(wizard.proposalReference || "Not assigned", 6360)] }),
      tableRow({ children: [cell("Status", 3000, { bold: true }), cell("Draft proposal — subject to design and commercial approval", 6360)] }),
      tableRow({ children: [cell("Prepared by", 3000, { bold: true }), cell(wizard.preparedBy || company, 6360)] }),
      tableRow({ children: [cell("Issue date", 3000, { bold: true }), cell(wizard.proposalDate || "Not recorded", 6360)] }),
      tableRow({ children: [cell("Revision", 3000, { bold: true }), cell(wizard.updatedAt || proposal.updatedAt, 6360)] }),
    ]),
    ...(assets.room ? [imageParagraph(assets.room, 560, 315), paragraph(`${application?.application || "Room"} concept image — final room design and finishes are subject to approval.`, { size: 17, colour: MUTED, alignment: AlignmentType.CENTER })] : []),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  const sections = documentSectionPlan(detail);
  const addPlannedSection = (id: DocumentSectionId, title: string, content: Array<Paragraph | Table>) => {
    if (sections.has(id)) addSection(children, title, content);
  };

  addPlannedSection("executive-summary", "Executive Summary", [paragraph(wizard.executiveSummary || proposal.summary || "Executive summary to be confirmed.", { justified: true })]);
  const brief = proposalRoomBrief(proposal, bomRows);
  addPlannedSection("room-at-a-glance", "Room at a glance", [
    paragraph(brief.application, { bold: true }), paragraph(wizard.customerObjectives || brief.purpose),
    heading("Room and design details", 2),
    ...(brief.facts.length ? brief.facts.map(bullet) : [paragraph("Room dimensions, capacity and site conditions require confirmation.")]),
    ...(brief.highlights.length ? [heading("What this space delivers", 2), ...brief.highlights.map((item) => bullet(`${item.title}: ${item.detail}`))] : []),
    heading("In this room", 2),
    paragraph("Items are grouped by the job each one does in the room, and the number matches the equipment schedule further on. Anything marked optional is still your decision, and work by others is listed under Complete System Design and Responsibilities."),
    ...brief.groups.flatMap((group) => [heading(group.role, 2), fixedTable([600, 1800, 4260, 600, 2100], [
      tableRow({ tableHeader: true, children: ["Item", "Model", "Description", "Qty", "Status"].map((value, i) => cell(value, [600, 1800, 4260, 600, 2100][i], { bold: true, fill: PALE })) }),
      ...group.equipment.map((row) => tableRow({ children: [String(row.item), row.sku, row.description, String(row.qty), row.type].map((value, i) => cell(value, [600, 1800, 4260, 600, 2100][i])) })),
    ])]),
    ...(!brief.groups.length ? [paragraph(CUSTOMER_COPY.noEquipment)] : []),
  ]);
  addPlannedSection("solution-overview", "Solution Overview", [
    paragraph(wizard.proposedSolution || story.overview, { justified: true }),
    heading("How the solution will work", 2), ...story.operation.map((item, index) => paragraph(`${index + 1}. ${item}`)),
    heading("What successful delivery looks like", 2), ...story.acceptance.map(bullet),
  ]);
  if (application) addPlannedSection("market-and-application-story", "Market and Application Story", [
    paragraph(application.marketStory || application.customerNeed, { justified: true }),
    heading("Intended room experience", 2),
    ...application.userJourney.map(bullet),
    heading("Business outcomes", 2),
    ...application.benefits.map((benefit) => bullet(`${benefit.title}: ${benefit.detail}`)),
  ]);
  addPlannedSection("client-objectives", "Client Objectives and Current Challenge", [paragraph(wizard.customerObjectives || proposal.summary || "The client objectives require confirmation.", { justified: true })]);
  addPlannedSection("discovery-conversation", "Discovery Conversation", discoveryConversationContent(proposal));
  addPlannedSection("unresolved-discovery-items", "Unresolved Discovery Items", unresolvedDiscoveryContent(proposal));
  addPlannedSection("design-trace", "What You Asked For and How We Designed It", canonicalDesignContent(proposal));
  addPlannedSection("proposed-solution-and-business-value", "Proposed Solution and Business Value", [paragraph(wizard.proposedSolution || "The proposed solution requires confirmation.", { justified: true }), bullet("A supportable architecture aligned to the stated operational requirement."), bullet("A controlled route from design approval to quotation, delivery and acceptance."), bullet("Clear ownership of equipment, services, dependencies and by-others scope.")]);
  addPlannedSection("scope-of-work", "Scope of Work", [heading("Included scope", 2), ...bulletLines(wizard.inclusions, "Supply of the WyreStorm equipment listed in this proposal."), heading("Delivery activities", 2), ...["Validate the final design and interfaces against site conditions.", "Supply and configure the listed WyreStorm hardware where expressly included.", "Complete functional testing and record acceptance results where commissioning is quoted."].map(bullet), heading("Not included / by others", 2), ...bulletLines(wizard.exclusions, "No exclusions have been recorded.")]);
  if (displaySchedule) {
    // The transport column only exists when a saved wall supplied the link
    // estimate; catalogue schedules keep their five-column table.
    const showsTransport = displaySchedule.rows.some((row) => row.transport);
    // The millimetre column appears only when the saved wall knows its size, so
    // a catalogue schedule keeps its five-column table.
    const showsSize = displaySchedule.rows.some((row) => row.size);
    // Mass follows the panel size, so this column appears with the wall too.
    const showsWeight = displaySchedule.rows.some((row) => row.weight);
    const headers = [
      "Screen",
      ...(showsSize ? ["Size (mm)"] : []),
      ...(showsWeight ? ["Weight"] : []),
      "Resolution",
      "Feeds",
      ...(showsTransport ? ["Transport"] : []),
      "Scaling",
      "Notes",
    ];
    const widths = fittedWidths(headers, {
      Screen: 1500,
      "Size (mm)": 1250,
      Weight: 900,
      Resolution: 1250,
      Feeds: 1050,
      Transport: 2200,
      Scaling: 1550,
      Notes: 1600,
    });
    const values = (row: (typeof displaySchedule.rows)[number]) => [
      row.screen,
      ...(showsSize ? [row.size] : []),
      ...(showsWeight ? [row.weight] : []),
      row.resolution,
      row.feeds,
      ...(showsTransport ? [row.transport] : []),
      row.scaling,
      row.notes,
    ];
    // The elevation is only present when a saved wall supplied the drawing and
    // the browser could rasterise it; the caption still names the wall.
    const wallRequirements = wallRequirementsFromSummary(videoWall);
    // The recommendation comes from the wall's captured plan, not from the asset
    // list, so Word and the screen export judge the same conditions.
    const mappingAdvice = wallRequirements ? wallMappingRecommendation(wallRequirements) : null;
    const wallLayout = wallRequirements ? wallVisualLayout(wallRequirements) : null;
    const wallOverlay = wallRequirements ? wallElevationOverlay(wallRequirements) : null;
    // The card the wall started on prints beside the drawing, because the same
    // sentence is on the project record and an adjusted wall has to read as one
    // in both places.
    const startingPoint = wallRequirements
      ? wallStartingPointDrift(wallStartingPointFromSummary(videoWall?.summary), wallRequirements)
      : null;
    // Five install columns share the table width the four used: the run-entry
    // cell is its own question, so it gets its own column.
    const installWidths = [2600, 1900, 1600, 1900, 1360];
    addPlannedSection("display-schedule", "Display Schedule", [
      paragraph(displaySchedule.headline, { justified: true }),
      ...(assets.wallElevation ? [imageParagraph(assets.wallElevation, 560, 315)] : []),
      ...(assets.wallElevation && wallLayout
        ? [paragraph(wallElevationCaption(wallLayout, wallOverlay), { size: 17, colour: MUTED, alignment: AlignmentType.CENTER })]
        : []),
      ...(startingPoint ? [paragraph(wallStartingPointRecordText(startingPoint), { size: 17, colour: MUTED })] : []),
      ...(assets.wallPreviews ? mappingOptions(assets.wallPreviews, mappingAdvice) : []),
      // Same wall and panel millimetres the HTML table caption and the elevation
      // caption print, so the three outputs quote one size.
      ...(displaySchedule.size ? [paragraph(displaySchedule.size, { size: 17, colour: MUTED })] : []),
      fixedTable(widths, [
        tableRow({ tableHeader: true, children: headers.map((value, index) => cell(value, widths[index], { bold: true, fill: PALE })) }),
        ...displaySchedule.rows.map((row) => tableRow({ children: values(row).map((value, index) => cell(value, widths[index])) })),
      ]),
      // The key for the transport column prints under the table it explains, as
      // the printed proposal puts it, and only when that column exists.
      ...(showsTransport ? [cableKeyParagraph()] : []),
      // Mass and clearance are derived from the size above, so they print with
      // the table they were measured from.
      ...(displaySchedule.mounting ? [paragraph(`Mounting: ${displaySchedule.mounting}`, { size: 18, colour: MUTED })] : []),
      ...(displaySchedule.transportFlags.length > 0
        ? [paragraph("Transport limits:", { bold: true, size: 18 }), ...displaySchedule.transportFlags.map(bullet)]
        : []),
      paragraph(`Basis: ${displaySchedule.basis}`, { size: 18, colour: MUTED }),
      // The survey's installation detail prints with the schedule it describes,
      // so the quote and the wall table cannot disagree about what is installed.
      ...(displaySchedule.install
        ? [
            heading("Installation Detail", 2),
            paragraph(displaySchedule.install.text, { size: 18, colour: MUTED }),
            fixedTable(installWidths, [
              tableRow({ tableHeader: true, children: ["Link", "Display housing", "Mount", "Termination", "Run entry"].map((value, index) => cell(value, installWidths[index], { bold: true, fill: PALE })) }),
              ...displaySchedule.install.rows.map((row) => tableRow({ children: [row.link, row.enclosure, row.mount, row.termination, row.entry].map((value, index) => cell(value, installWidths[index])) })),
            ]),
          ]
        : []),
    ]);
  }
  addPlannedSection("equipment-and-pricing", "Equipment and Pricing", [
    paragraph(equipment.complete ? `The equipment total is ${money(equipment.total, wizard.currency)} ${wizard.pricesExcludeTax ? "excluding VAT / sales tax" : "with tax treatment to be confirmed"}.` : "COMMERCIAL HOLD: one or more equipment prices are missing. This draft must not be issued as an exact quotation until every TBC value is resolved.", { bold: true, colour: equipment.complete ? NAVY : "9B1C1C" }),
    equipment.table,
    paragraph("Pricing covers only the listed equipment. Services, third-party equipment, freight, taxes and by-others work are excluded unless expressly priced below.", { size: 18, colour: MUTED }),
    ...(installation && installationSchedule ? [
      paragraph("Installation and services", { bold: true, size: 26, colour: NAVY, after: 100 }),
      paragraph(installationSchedule.text, { size: 18, colour: MUTED }),
      installation.table,
      paragraph(
        installation.complete
          ? `The installation and services total is ${money(installation.total, wizard.currency)} ${wizard.pricesExcludeTax ? "excluding VAT / sales tax" : "with tax treatment to be confirmed"}.`
          : "COMMERCIAL HOLD: one or more installation rates are missing. The installation lines above print TBC until every one is priced.",
        { bold: true, colour: installation.complete ? NAVY : "9B1C1C" },
      ),
    ] : []),
  ]);
  addPlannedSection("services-and-commercial-allowances", "Services and Commercial Allowances", [pipeTable(wizard.servicesAndAllowances, ["Service / discipline", "Responsibility", "Commercial status"], [3900, 2460, 3000])]);
  addPlannedSection("complete-system-design", "Complete System Design and Responsibilities", [
    paragraph(CUSTOMER_COPY.scopeIntro),
    // The story is already customer copy; a draft field can still hold the
    // rep prompts the wizard seeded it with, so it goes through the same gate.
    ...bulletLines(
      customerCopyText(wizard.externalScope, story.externalScope),
      CUSTOMER_COPY.scopePending,
    ),
  ]);
  addPlannedSection("third-party-system-scope", "Third-Party System Scope", [
    paragraph("WyreStorm is one part of the complete AV solution. The equipment and delivery tasks below still need an owner and a price before we can issue a final quotation. A TBC in this table is an allowance to be agreed, not a price included in the total.", { justified: true }),
    scopeTable(proposal),
  ]);
  addPlannedSection("technical-architecture", "Technical Architecture", [
    paragraph(wizard.architectureNarrative || application?.solutionOverview || "The technical architecture requires confirmation.", { justified: true }),
    ...(assets.schematic ? [imageParagraph(assets.schematic, 560, 620)] : []),
    paragraph("Concept signal-flow diagram: confirm physical connections, cable routes, third-party interfaces and operating modes before installation.", { colour: MUTED }),
    ...(!assets.schematic ? [architectureTable(application?.architectureDiagram || "")] : []),
  ]);
  addPlannedSection("cable-schedule", "Cable Schedule", cableScheduleContent(proposal, bomRows));
  addPlannedSection("products-in-the-solution", "Products in the Solution", proposalProductCards(bomRows, assets.media).flatMap((card) => [
    heading(`${card.sku} — ${card.name}`, 2),
    ...(assets.products?.[card.sku] ? [imageParagraph(assets.products[card.sku], 460, 170)] : [paragraph("Product photograph unavailable.", { colour: MUTED })]),
    paragraph(`Role in this design: ${card.role || "To be confirmed"}`),
    ...(card.url ? [new Paragraph({ children: [new ExternalHyperlink({ link: card.url, children: [new TextRun({ text: "Manufacturer product page and documentation", style: "Hyperlink" })] })] })] : [paragraph("Official product link to be confirmed.", { colour: MUTED })]),
  ]));
  addPlannedSection("product-specifications", "WyreStorm Product Specifications", productSpecificationContent(proposal));
  addPlannedSection("power-strategy", "Power Strategy", powerStrategyContent(proposal.products));
  if (application?.acceptanceCriteria.length) addPlannedSection("testing-and-acceptance", "Testing and Acceptance Criteria", application.acceptanceCriteria.map(bullet));
  addPlannedSection("timeline-and-phases", "Timeline and Phases", [paragraph("The programme below is indicative and begins only after design approval, commercial acceptance, stock confirmation and site readiness.", { colour: MUTED }), pipeTable(wizard.implementationTimeline, ["Phase", "Activity", "Indicative timing", "Dependency / output"], [1250, 2500, 1500, 4110])]);
  addPlannedSection("responsibilities-and-dependencies", "Responsibilities and Dependencies", [heading("Responsibilities", 2), ...bulletLines(wizard.responsibilities, "Responsibilities are to be agreed."), heading("Dependencies", 2), ...bulletLines(wizard.dependencies, "Dependencies are to be confirmed.")]);
  addPlannedSection("assumptions-risks-and-exclusions", "Assumptions, Risks and Exclusions", [heading("Assumptions", 2), ...bulletLines(wizard.assumptions, "Final assumptions are to be confirmed."), heading("Open risks and validation", 2), ...(risks.length ? risks : ["Validate datasheets, lifecycle, accessories, firmware, regional suitability and site dependencies before order."]).map(bullet)]);
  addPlannedSection("next-steps", "Next Steps", [...bulletLines(wizard.nextSteps, "Confirm the final design, equipment schedule, responsibilities and commercial quotation."), paragraph(`Quotation validity: ${wizard.validityDays} days from the proposal date, subject to stock and written confirmation.`, { colour: MUTED })]);
  // The appendix is the document's last content section and its own level's
  // only addition, so the legal notice below still closes every document.
  const appendix = buildDocumentAppendix(bomRows);
  addPlannedSection("technical-appendix", "Appendix — Equipment Evidence and Verification", [
    paragraph(appendix.headline, { justified: true }),
    ...(appendix.rows.length ? [appendixTable(appendix)] : []),
  ]);
  addPlannedSection("best-efforts-disclaimer", "Best-Efforts Disclaimer", [
    paragraph("This document has been prepared on a best-efforts basis to support your sales and design process. Product specifications, compatibility, lifecycle status, regional availability, pricing and lead times must be verified against the current WyreStorm documentation, datasheet or order desk before this document is used as a quotation, order or statement of capability. Competitor information is approximate and provided only to start a comparison conversation. Wingman provides no warranty and accepts no liability for any errors, omissions or reliance on the content of this document.", { justified: true, colour: MUTED }),
  ]);

  return new Document({
    creator: wizard.preparedBy || company, title: `${wizard.projectName || proposal.title} - ${config.label}`, subject: "WyreStorm audio visual proposal",
    styles: { default: { document: { run: { font: "Calibri", size: 22, color: TEXT }, paragraph: { spacing: { after: 160, line: 320 } } } } },
    numbering: { config: [{ reference: "proposal-bullets", levels: [{ level: 0, format: "bullet", text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 280 }, spacing: { after: 80, line: 290 } } } }] }] },
    sections: [{
      properties: { titlePage: true, page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440, header: 708, footer: 708 } } },
      headers: { first: new Header({ children: [] }), default: new Header({ children: [paragraph(`${company}  |  ${wizard.proposalReference}`, { alignment: AlignmentType.RIGHT, size: 17, colour: MUTED })] }) },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: `${proposal.proposalFooter || "Prepared using WyreStorm Wingman."}  |  Page `,
                  color: MUTED,
                  size: 16,
                  font: "Calibri",
                }),
                new TextRun({ children: [PageNumber.CURRENT], color: MUTED, size: 16, font: "Calibri" }),
              ],
            }),
            // The printed sheet has to name the data behind it, and a Word
            // document's footer is the one place that repeats on every page.
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: productDataRevision().line, color: MUTED, size: 14, font: "Calibri" })],
            }),
          ],
        }),
      },
      children,
    }],
  });
}

export async function exportProposalDocx(proposal: StoredProjectProposal, bomRows: SalesBomRow[], wizard: ProposalWizardDraft, videoWall: StoredVideowallSummary | null = null, detail: DocumentDetail = HOUSE_DOCUMENT_BRAND.detail) {
  if (typeof window === "undefined") return;
  // A wall whose own schedule lists an over-limit run cannot be issued: the
  // exporter refuses before it packs a document that contradicts itself.
  assertWallTransportExportable(wallTransportRequirements(wallRequirementsFromSummary(videoWall)));

  // Build the native schematic from the proposal's products and BOM rows.
  // Use BOM row roles to infer source/display/encoder/decoder for a richer
  // topology than SKU names alone.
  let nativeSchematicDataUrl: string | undefined;
  try {
    const products = proposal.products ?? [];
    const bomRowsForSchematic = (bomRows.length ? bomRows : proposal.bomRows ?? []).map((r) => ({ sku: r.sku, description: r.description, role: r.role, qty: r.qty }));
    const brief = proposalSchematicBrief(wizard.projectName || proposal.title || "System schematic", products, bomRowsForSchematic);
    const schematicModel = buildWingmanSchematic(brief);
    nativeSchematicDataUrl = createNativeSchematicDataUrl(schematicModel);
  } catch {
    // Fall back to the legacy text-based schematic if the native engine fails
  }

  const media = await loadProductMediaIndex();
  const productAssets: Record<string, ProposalImageAsset> = {};
  const cards = proposalProductCards(bomRows, media);
  for (let index = 0; index < cards.length; index += 4) {
    await Promise.all(cards.slice(index, index + 4).map(async (card) => {
      const asset = await fetchImageAsset(card.imageUrl, `${card.sku}: ${card.alt}`);
      if (asset) productAssets[card.sku] = asset;
    }));
  }
  const [logo, room, schematic] = await Promise.all([
    fetchImageAsset(proposal.companyLogoDataUrl, `${proposal.companyName || "WyreStorm"} logo`),
    fetchImageAsset(proposal.applicationProposal?.roomVisualUrl, `${proposal.applicationProposal?.application || "Room"} concept`),
    fetchImageAsset(
      nativeSchematicDataUrl || createSchematicDataUrl(proposal.applicationProposal?.architectureDiagram || ""),
      "Room signal-flow schematic",
    ),
  ]);
  // The wall elevation is drawn from the saved design before the DOCX is packed.
  const wallRequirements = wallRequirementsFromSummary(videoWall);
  const wallPng = wallRequirements ? await wallElevationPng(wallRequirements) : undefined;
  const wallElevation: ProposalImageAsset | undefined = wallPng
    ? { ...wallPng, type: "png", title: "Wall elevation" }
    : undefined;
  // A wall whose source shape differs also prints both mappings, so the
  // customer sees what fitting or filling costs before agreeing.
  const previews = wallRequirements ? wallMappingPreviews(wallRequirements) : null;
  const previewOptions: WallPreview[] = previews && wallRequirements
    ? await Promise.all(previews.previews.map(async (preview) => {
      const png = await wallElevationPng(
        { ...wallRequirements, mapping: preview.value },
        { dimensions: false, overlayLabels: false },
      );
      return {
        value: preview.value,
        consequence: preview.consequence,
        ...(png ? { image: { ...png, type: "png" as const, title: `Wall elevation, ${preview.value}` } } : {}),
      };
    }))
    : [];
  const wallPreviews = previews ? { chosen: previews.chosen, options: previewOptions } : undefined;
  const blob = await Packer.toBlob(buildProposalDocx(proposal, bomRows, wizard, { logo, room, schematic, wallElevation, wallPreviews, products: productAssets, media }, videoWall, detail));
  downloadBlob(blob, `${fileBaseName(wizard.projectName || proposal.title)}.proposal.docx`);
  trackDesignProjectExport(proposal.designRevision, "docx");
}
