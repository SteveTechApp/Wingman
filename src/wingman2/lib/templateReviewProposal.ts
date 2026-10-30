import { routeCatalogByKey } from "../app/routeCatalog";
import { templateReviewDesignNotes } from "./templateReviewDesignNotes";
import type { StoredProductSelection, StoredProject, StoredProjectProposal, StoredVideowallSummary } from "../data/projectStore";
import type { RoomTemplate, TemplateBomRow } from "./roomTemplates";
import type { SalesBomRow } from "./salesReadiness";
import { buildWingmanCoachState } from "./wingmanCoach";
import { compileTemplateApplicationProposal } from "./proposalCompiler";
import { loadTemplateDraft } from "./solutionTemplates";
import { proposalReadiness } from "./proposalReadiness";
import { orderedProjectScopeRows, projectScopeSection, PROJECT_SCOPE_SECTIONS } from "./projectScope";
import type { WallRequirements } from "./videowallOptions";
const includedStatuses = new Set(["included", "optional", "validate"]);

/** The newest wall by its own save time, which is the fact a rep can check. */
function newestWall(walls: StoredVideowallSummary[]): StoredVideowallSummary | null {
  return [...walls].sort((a, b) => b.savedAt.localeCompare(a.savedAt))[0] ?? null;
}

/**
 * The wall saved against this template, if the rep has already designed one.
 * A saved wall records the template it started from, so this reads that fact
 * only: the newest wall naming this template wins, whatever project it
 * currently sits in. Walls saved before the link existed are filled in by the
 * project codec on load (which is why there is no room-model fallback here),
 * so no export has to guess which project's model to trust. Without a matching
 * wall the proposal falls back to a catalogue schedule with no transport
 * column.
 */
export function savedTemplateWall(projects: StoredProject[], templateId: string): StoredVideowallSummary | null {
  if (!templateId) return null;
  const recorded = projects
    .map((project) => project.videowall)
    .filter((wall): wall is StoredVideowallSummary => Boolean(wall) && wall!.templateId === templateId);
  return newestWall(recorded);
}

export function templateBomRows(template: RoomTemplate, rows: TemplateBomRow[]): SalesBomRow[] {
  return orderedProjectScopeRows(rows).filter((row) => includedStatuses.has(row.status) && row.qty > 0).map((row, index) => ({
    item: index + 1, sku: row.sku, description: [row.description, row.manufacturer, row.model].filter(Boolean).join(" · "), role: row.role, qty: row.qty,
    type: row.type, status: row.status, evidence: row.evidence,
    notes: `Section: ${PROJECT_SCOPE_SECTIONS.find(section => section.id === projectScopeSection(row))!.title}. Unit: ${row.unit || "each"}. ${row.notes} Supplier: ${row.owner || "confirm"}. Template: ${template.name}.${row.sourceUrl ? ` Product source: ${row.sourceUrl}${row.sourceCheckedOn ? ` (read ${row.sourceCheckedOn})` : ""}.` : ""}`,
    manufacturer: row.manufacturer, model: row.model, sourceUrl: row.sourceUrl, sourceCheckedOn: row.sourceCheckedOn, specifications: row.specifications,
  }));
}
export function templateProducts(rows: TemplateBomRow[]): StoredProductSelection[] {
  return rows.filter((row) => includedStatuses.has(row.status) && row.qty > 0 && !row.sku.startsWith("BY-OTHERS")).map((row) => ({
    sku: row.sku, quantity: row.qty, title: row.description, category: row.role,
    status: row.type === "Required" ? "recommended" : "alternative",
    source: "Room Template", evidence: [row.evidence], cautions: [row.notes], addedAt: new Date().toISOString(),
  }));
}
export function buildTemplateProposal(
  template: RoomTemplate,
  rows: TemplateBomRow[],
  /** Saved wall, so the readiness score inside the proposal sees its cable runs. */
  wallRequirements?: WallRequirements | null,
): StoredProjectProposal {
  const bomRows = templateBomRows(template, rows);
  const products = templateProducts(rows);
  // Use the unified readiness scorer — no hard-coded fallback.
  const readiness = proposalReadiness({
    products, bomRows,
    assumptions: [...template.assumptions, ...template.validationItems.map((item) => `Unverified: ${item}`)],
    validationItems: template.validationItems,
    wallRequirements,
  });
  const readinessScore = readiness.score;
  const coach = buildWingmanCoachState({
    source: "proposal-template", audience: "dealer",
    discovery: { projectTitle: template.name, summary: template.customerNarrative, roomSize: template.application, displays: template.vertical },
    selectedProducts: products, bomRows, assumptions: [...template.assumptions, ...template.validationItems.map((item) => `Unverified: ${item}`)], readinessScore,
  });
  const personalisation = loadTemplateDraft(template.id)?.personalisation;
  return {
    title: personalisation?.documentTitle || template.name,
    summary: personalisation?.executiveSummary || template.customerNarrative,
    sections: ["Cover", "Application", "Architecture", "WyreStorm BOM", "Design Scope", "Assumptions", "Validation", "Upgrade Paths"],
    products, assumptions: [...template.assumptions, ...template.validationItems.map((item) => `Unverified: ${item}`)],
    outputPurpose: {
      motion: "Room/tender BOM", summary: `Use this as a ${template.vertical} ${template.application.toLowerCase()} boilerplate.`,
      customerOutput: "A pre-populated WyreStorm BOM with supporting AV design notes, assumptions, and validation points.",
      nextAction: "Adjust quantities and optional rows, then validate site-specific dependencies before customer issue.",
    },
    governedDependencies: [], bomRows, evidence: bomRows.map((row) => `${row.sku}: ${row.evidence}`),
    repGuidance: ["Use the template as a real-room starting point rather than a discovery questionnaire.", "Adjust only quantities and optional rows that differ from the known room.", "Escalate when room behaviour departs from the template architecture."],
    governanceWarnings: template.validationItems, validationNotes: [...(template.concept ? [`Room dimensions and layout: ${template.concept.environment}`, `Construction and site conditions: ${template.concept.construction}`, `Users and capacity: ${template.scale}`] : []), ...templateReviewDesignNotes(template, rows).map((item) => `${item.label}: ${item.description}`)],
    visualBlocks: coach.visualBlocks,
    applicationProposal: compileTemplateApplicationProposal(template, rows),
    proposalFooter: personalisation?.footer,
    readinessScore, updatedAt: new Date().toISOString(),
  };
}
export function buildTemplateProject(template: RoomTemplate, rows: TemplateBomRow[]): StoredProject {
  const timestamp = new Date().toISOString();
  const proposal = buildTemplateProposal(template, rows);
  // The surveyed run is the fact the display receiver was chosen on, so the
  // saved project records the distance in the shape Discovery writes it. The
  // schematic distance, the completion model and a rebuilt design all read it
  // from here rather than from the quotation the run produced.
  const surveyedRun = template.surveyedRunMetres;
  // A run carried in spans keeps the measurement and records the span the quoted
  // receiver serves beside it, so a project rebuilt from this template is not
  // blocked for a run the design already answered.
  const servedRun = surveyedRun ? template.servedRunMetres : undefined;
  return {
    id: `template-${template.id}-${Date.now()}`, name: template.name, owner: "Wingman user", stage: "Templates",
    status: "recommended", updated: "Just now", resumeTo: `${routeCatalogByKey.templates.path}/${template.id}`,
    createdAt: timestamp, updatedAt: timestamp, productSelections: proposal.products, proposal,
    discoveryBrief: {
      savedAt: timestamp,
      capturedPercent: 72,
      roomModel: {
        clientName: loadTemplateDraft(template.id)?.personalisation.customerName || "",
        siteName: loadTemplateDraft(template.id)?.personalisation.site || "",
        application: template.application,
        vertical: template.vertical,
        roomType: template.name,
        scale: template.scale,
        summary: template.customerNarrative,
        inferredArchitectureDirection: template.architecture,
        ...(surveyedRun ? { cableRun: `${surveyedRun} m`, longestRun: `${surveyedRun} m` } : {}),
        ...(servedRun ? { servedRun: `${servedRun} m` } : {}),
        sourceTemplateId: template.id,
        sourceTemplateName: template.name,
      },
      inference: { summary: template.customerNarrative, architecture: template.architecture },
      missingInformation: template.validationItems,
      nextBestQuestion: template.validationItems[0] || "Confirm the final room scope.",
    },
    workflow: { source: "Room Templates", lastStep: "Template review page", nextRoute: routeCatalogByKey.proposal.path, updatedAt: timestamp },
  };
}
