import type { RoomTemplate } from "./roomTemplates";

export type TemplateStatus = "published" | "draft" | "custom";
export type DocumentAudience = "Customer" | "Consultant" | "Integrator" | "Internal";
export type DocumentDetail = "Executive" | "Standard" | "Technical";

export type SolutionTemplateDefinition = {
  id: string; version: number; status: TemplateStatus; title: string; market: string;
  application: string; supportedRoomTypes: string[]; purpose: string; customerStory: string;
  userExperience: string; businessOutcomes: string[]; intendedAudience: string;
  discoveryPreset: Record<string, unknown>; architectureDirection: string;
  productFamilyRules: string[]; requiredDependencies: string[]; optionalUpgrades: string[];
  proposalNarrative: string; documentBlueprint: string[]; assumptions: string[]; risks: string[];
  qualificationQuestions: string[]; alternativeDesignPath: string; unsuitableWhen: string[];
  visualAssets: string[]; personalisationOptions: string[]; validationRules: string[];
  tags: string[]; createdBy: string; updatedAt: string;
};

export type DocumentPersonalisation = {
  documentTitle: string; customerName: string; site: string; projectReference: string;
  author: string; date: string; revision: string; organisationLogo: string; customerLogo: string;
  primaryColour: string; secondaryColour: string; font: string; coverImage: string;
  footer: string; disclaimer: string; purpose: string; customerStory: string;
  objectives: string; executiveSummary: string; scope: string; exclusions: string; nextSteps: string;
  audience: DocumentAudience; detail: DocumentDetail; visibleSections: string[];
  showOptionalUpgrades: boolean; showThirdPartyPlaceholders: boolean; showAssumptionsAndRisks: boolean;
  showTechnicalAppendix: boolean;
};

export type OrganisationDocumentSettings = Partial<Pick<DocumentPersonalisation, "organisationLogo" | "primaryColour" | "secondaryColour" | "font" | "footer" | "disclaimer" | "audience" | "detail">> & {
  organisationName?: string; contactInformation?: string; address?: string; defaultTone?: string;
  defaultCoverTreatment?: string; defaultDiagramTreatment?: string;
};

export const DEFAULT_DOCUMENT_SECTIONS = ["Branded cover", "Executive summary", "Customer requirement", "Market context", "Objectives", "User experience", "Recommended solution", "Architecture", "Room or application overview", "Equipment overview", "Required BOM", "Optional upgrades", "Third-party dependencies", "Assumptions", "Risks and unresolved questions", "Next steps"];

export function toSolutionTemplate(template: RoomTemplate & { customTemplate?: boolean }): SolutionTemplateDefinition {
  const dependencies = template.designNotes.map((note) => `${note.label}: ${note.description}`);
  return {
    id: template.id, version: 1, status: template.customTemplate ? "custom" : "published",
    title: template.name, market: template.vertical, application: template.application,
    supportedRoomTypes: [template.scale], purpose: template.summary,
    customerStory: template.customerNarrative,
    userExperience: `Users can operate the ${template.application.toLowerCase()} through a clear, repeatable workflow while specialist configuration remains governed.`,
    businessOutcomes: ["Consistent user experience", "Lower design and deployment risk", "A documented path for future change"],
    intendedAudience: `${template.vertical} teams planning ${template.scale.toLowerCase()} environments`,
    discoveryPreset: { opportunity: template.application, market: template.vertical },
    architectureDirection: template.architecture,
    productFamilyRules: template.bom.map((row) => row.role).filter((value, index, all) => all.indexOf(value) === index),
    requiredDependencies: dependencies,
    optionalUpgrades: template.upgradePaths, proposalNarrative: template.customerNarrative,
    documentBlueprint: DEFAULT_DOCUMENT_SECTIONS, assumptions: template.assumptions,
    risks: template.validationItems.map((item) => `Unconfirmed: ${item}`), qualificationQuestions: template.validationItems,
    alternativeDesignPath: template.upgradePaths[0] || "Re-run Discovery with a different architecture direction.",
    unsuitableWhen: ["The customer requirements conflict with the stated assumptions", "Required dependencies cannot be confirmed"],
    visualAssets: [], personalisationOptions: ["Brand", "Content", "Audience", "Section order"],
    validationRules: ["discovery-required", "recommendation-engine-required", "assumptions-not-confirmed"],
    tags: [template.vertical, template.scale, template.application], createdBy: "Wingman", updatedAt: "2026-08-05",
  };
}

export function validatePublishedTemplate(template: SolutionTemplateDefinition): string[] {
  const required: Array<[string, unknown]> = [
    ["purpose", template.purpose], ["customerStory", template.customerStory], ["userExperience", template.userExperience],
    ["businessOutcomes", template.businessOutcomes], ["discoveryPreset", Object.keys(template.discoveryPreset)],
    ["architectureDirection", template.architectureDirection], ["productFamilyRules", template.productFamilyRules],
    ["requiredDependencies", template.requiredDependencies], ["proposalNarrative", template.proposalNarrative],
    ["BOM framework", template.validationRules], ["assumptions", template.assumptions], ["risks", template.risks],
    ["alternativeDesignPath", template.alternativeDesignPath], ["unsuitableWhen", template.unsuitableWhen],
    ["documentBlueprint", template.documentBlueprint],
  ];
  return required.filter(([, value]) => !value || (Array.isArray(value) && value.length === 0)).map(([name]) => name);
}

export function defaultPersonalisation(template: SolutionTemplateDefinition): DocumentPersonalisation {
  const defaults: DocumentPersonalisation = {
    documentTitle: `${template.title} solution`, customerName: "", site: "", projectReference: "", author: "", date: new Date().toISOString().slice(0, 10), revision: "1.0",
    organisationLogo: "", customerLogo: "", primaryColour: "#e85d04", secondaryColour: "#263238", font: "Geist", coverImage: "", footer: "Prepared with Wingman", disclaimer: "Subject to validation of all unresolved requirements.",
    purpose: template.purpose, customerStory: template.customerStory, objectives: template.businessOutcomes.join("\n"), executiveSummary: template.proposalNarrative, scope: template.application,
    exclusions: "Items marked as third-party dependencies are outside the WyreStorm BOM.", nextSteps: "Confirm unresolved questions, then run the governed recommendation workflow.",
    audience: "Customer", detail: "Standard", visibleSections: [...template.documentBlueprint], showOptionalUpgrades: true, showThirdPartyPlaceholders: true, showAssumptionsAndRisks: true, showTechnicalAppendix: false,
  };
  const organisation = loadOrganisationDocumentSettings();
  return { ...defaults, ...organisation };
}

const DRAFT_KEY = "wingman-template-document-drafts-v1";
const ORGANISATION_KEY = "wingman-organisation-document-settings-v1";
export function loadOrganisationDocumentSettings(): OrganisationDocumentSettings {
  try { return JSON.parse(localStorage.getItem(ORGANISATION_KEY) || "{}"); } catch { return {}; }
}
export function saveOrganisationDocumentSettings(settings: OrganisationDocumentSettings) {
  localStorage.setItem(ORGANISATION_KEY, JSON.stringify({ ...loadOrganisationDocumentSettings(), ...settings }));
}
export function saveTemplateDraft(template: SolutionTemplateDefinition, personalisation: DocumentPersonalisation) {
  const existing = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}") as Record<string, unknown>;
  existing[template.id] = { templateId: template.id, templateVersion: template.version, personalisation, assumptions: template.assumptions, unresolvedQuestions: template.qualificationQuestions, updatedAt: new Date().toISOString() };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(existing));
}

export function loadTemplateDraft(templateId: string): { personalisation: DocumentPersonalisation } | null {
  try { return (JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}") as Record<string, { personalisation: DocumentPersonalisation }>)[templateId] || null; } catch { return null; }
}
