// Creates a new project from a custom room template, pre-filling the
// discovery brief and product selections so the rep can skip straight
// to validation instead of starting from scratch.

import {
  createProjectForProductSelection,
  saveDiscoveryBriefToProject,
  saveProductSelectionToProject,
  setActiveProjectId,
} from "../data/projectStore";
import type { CustomRoomTemplate } from "./customRoomTemplates";
import type { StoredProductSelection } from "../data/projectStore";

/**
 * Create a new project from a template. The new project gets:
 * - A name derived from the template
 * - Product selections from the template BOM (if available)
 * - A discovery brief pre-filled with the template's answers and notes
 *
 * Returns the new project ID.
 */
export function createProjectFromTemplate(template: CustomRoomTemplate): string {
  const projectName = `${template.name} — new opportunity`;

  // Create the project with the first BOM product (if any) to establish the record
  const firstBomProduct = template.bom?.[0];
  const initialSelection: StoredProductSelection | undefined = firstBomProduct
    ? {
        sku: firstBomProduct.sku,
        title: firstBomProduct.description || firstBomProduct.sku,
        family: template.application || template.vertical,
        category: template.vertical,
        source: "template",
        evidence: [firstBomProduct.evidence || `From template: ${template.name}`],
      }
    : undefined;

  const project = initialSelection
    ? createProjectForProductSelection(projectName, initialSelection)
    : createProjectForProductSelection(projectName, {
        sku: "template-scope",
        title: template.application || "Template-scoped project",
        family: template.application || template.vertical,
        category: template.vertical,
        source: "template",
      });

  // Add remaining BOM products
  if (template.bom && template.bom.length > 1) {
    for (const bomRow of template.bom.slice(1)) {
      saveProductSelectionToProject(project.id, {
        sku: bomRow.sku,
        title: bomRow.description || bomRow.sku,
        family: template.application || template.vertical,
        category: template.vertical,
        source: "template",
        evidence: [bomRow.evidence || `From template: ${template.name}`],
      });
    }
  }

  // Pre-fill the discovery brief with template answers and notes
  const roomModel: Record<string, unknown> = {
    roomType: template.vertical,
    application: template.application,
    applicationType: template.application,
    outcome: template.customerNarrative || template.summary,
    scale: template.scale,
    summary: template.summary,
    designDirection: template.architecture,
    sourceTemplateId: template.sourceTemplateId || template.id,
    sourceTemplateName: template.name,
    // Merge template discovery answers
    ...template.discoveryAnswers,
  };

  saveDiscoveryBriefToProject(
    {
      savedAt: new Date().toISOString(),
      roomModel,
      topology: template.topology,
      capturedPercent: 75,
      inference: {
        summary: template.summary,
        architecture: template.architecture,
      },
    },
    project.id,
  );

  // Set as active project
  setActiveProjectId(project.id);

  return project.id;
}
