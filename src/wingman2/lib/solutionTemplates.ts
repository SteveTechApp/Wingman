import type { RoomTemplate, TemplateBomRow } from "./roomTemplates";
import { getTemplateApplicationProfile, type TemplateApplicationProfile } from "./templateApplicationProfiles";

export type TemplateStatus = "published" | "draft" | "custom";
export type DocumentAudience = "Customer" | "Consultant" | "Integrator" | "Internal";
export type DocumentDetail = "Executive" | "Standard" | "Technical";

/**
 * A template as a solution document sees it.
 *
 * Two kinds of field belong here: the ones a surface prints or a document is
 * built from, and the governed profile and BOM the publication gate inspects.
 * Nothing else, which is what one sweep established. `version`, `userExperience`,
 * `discoveryPreset`, `productFamilyRules`, `requiredDependencies`,
 * `optionalUpgrades`, `risks`, `qualificationQuestions`, `alternativeDesignPath`,
 * `unsuitableWhen`, `visualAssets`, `validationRules`, `tags`, `createdBy` and
 * `updatedAt` all went: each was declared, most were required non-empty, and none
 * was rendered, edited or read by anything. `toSolutionTemplate` filled them
 * mechanically (design notes into dependencies, the first upgrade path into an
 * alternative path, three fixed rule ids, a literal date) and the gate then
 * demanded they not be empty — a rule about a value no page would ever show. Two
 * had one reader each, writing a draft's `templateVersion` and
 * `unresolvedQuestions`, and no surface reads those back, so the writes went with
 * them.
 */
export type SolutionTemplateDefinition = {
  id: string; status: TemplateStatus; title: string; market: string;
  application: string; purpose: string; customerStory: string;
  businessOutcomes: string[]; architectureDirection: string;
  proposalNarrative: string; assumptions: string[];
  applicationProfile?: TemplateApplicationProfile; bom?: TemplateBomRow[];
};

export type DocumentPersonalisation = {
  documentTitle: string; customerName: string; site: string; projectReference: string;
  author: string; date: string; revision: string; organisationLogo: string; customerLogo: string;
  primaryColour: string; secondaryColour: string; font: string; coverImage: string;
  footer: string; disclaimer: string; purpose: string; customerStory: string;
  objectives: string; executiveSummary: string; scope: string; exclusions: string; nextSteps: string;
  audience: DocumentAudience; detail: DocumentDetail;
};
// How much document a draft prints is `detail`'s decision alone. The per-section
// switches this type used to carry (an optional-upgrades section, third-party
// placeholders, assumptions and risks) named shapes the document deliberately
// does not offer: there is no upgrades section, the third-party lines are scope
// the customer supplies rather than rows a quote may quietly drop, and the
// assumptions and open risks print at every level because a document that hides
// what is still open presents it as settled. A control for any of them would be
// a switch that changes nothing, so they are gone rather than wired to a section
// each of them would have had to invent.

// Only fields a document actually takes: an organisation's defaults seed the
// personalisation below, so a setting with no document counterpart (an
// organisation name, say) would be stored and never printed.
export type OrganisationDocumentSettings = Partial<Pick<DocumentPersonalisation, "organisationLogo" | "primaryColour" | "secondaryColour" | "font" | "footer" | "disclaimer" | "audience" | "detail">>;

// The brand a solution document starts from when an organisation has set
// nothing. One table, because the settings surface shows the same values it
// saves: a second copy would let the form claim a document will look one way
// while `defaultPersonalisation` builds another.
export const HOUSE_DOCUMENT_BRAND: Required<OrganisationDocumentSettings> = {
  organisationLogo: "",
  primaryColour: "#e85d04",
  secondaryColour: "#263238",
  font: "Geist",
  footer: "Prepared with Wingman",
  disclaimer: "Subject to validation of all unresolved requirements.",
  audience: "Customer",
  detail: "Standard",
};

// The sections a document prints are `DOCUMENT_SECTIONS` in `documentSections.ts`,
// which both builders read against the draft's detail level. This module used to
// carry a second list of display headings (`DEFAULT_DOCUMENT_SECTIONS`) on every
// template as `documentBlueprint`; no builder read it, and it described a
// document that is not the one built — it named an optional-upgrades section and
// a branded cover, neither of which the document offers. A template's shape is
// not a document's shape, so the field went with the list rather than leaving two
// answers to one question.

export function toSolutionTemplate(template: RoomTemplate & { customTemplate?: boolean }): SolutionTemplateDefinition {
  return {
    id: template.id, status: template.customTemplate ? "custom" : "published",
    title: template.name, market: template.vertical, application: template.application,
    purpose: template.summary,
    customerStory: template.customerNarrative,
    businessOutcomes: ["Consistent user experience", "Lower design and deployment risk", "A documented path for future change"],
    architectureDirection: template.architecture,
    proposalNarrative: template.customerNarrative,
    assumptions: template.assumptions,
    applicationProfile: getTemplateApplicationProfile(template), bom: template.bom,
  };
}

export function validatePublishedTemplate(template: SolutionTemplateDefinition, governedSkus?: ReadonlySet<string>): string[] {
  if (template.status !== "published") return [];
  // Only fields a document is built from: a field the definition must carry and
  // no page would ever show is a gate on nothing, so it does not belong here.
  const required: Array<[string, unknown]> = [
    ["purpose", template.purpose], ["customerStory", template.customerStory],
    ["businessOutcomes", template.businessOutcomes], ["architectureDirection", template.architectureDirection],
    ["proposalNarrative", template.proposalNarrative], ["assumptions", template.assumptions],
  ];
  const issues = required.filter(([, value]) => !value || (Array.isArray(value) && value.length === 0)).map(([name]) => name);
  if (!template.applicationProfile) issues.push("governed application profile");
  else {
    if (template.applicationProfile.reviewStatus !== "reviewed") issues.push("reviewed application profile");
    if (!template.applicationProfile.sizingBasis.length) issues.push("sizing basis");
    if (!template.applicationProfile.imageKey) issues.push("application image key");
  }
  const governed = (template.bom ?? []).filter((row) => !row.sku.startsWith("BY-OTHERS") && !row.sku.startsWith("CUSTOM"));
  if (!governed.some((row) => row.type === "Required")) issues.push("required governed WyreStorm row");
  if (governedSkus) {
    const unresolved = governed.filter((row) => !governedSkus.has(row.sku.toUpperCase())).map((row) => row.sku);
    if (unresolved.length) issues.push(`unresolved governed SKU(s): ${[...new Set(unresolved)].join(", ")}`);
  }
  return issues;
}

export function defaultPersonalisation(template: SolutionTemplateDefinition): DocumentPersonalisation {
  const defaults: DocumentPersonalisation = {
    documentTitle: `${template.title} solution`, customerName: "", site: "", projectReference: "", author: "", date: new Date().toISOString().slice(0, 10), revision: "1.0",
    organisationLogo: HOUSE_DOCUMENT_BRAND.organisationLogo, customerLogo: "", primaryColour: HOUSE_DOCUMENT_BRAND.primaryColour, secondaryColour: HOUSE_DOCUMENT_BRAND.secondaryColour, font: HOUSE_DOCUMENT_BRAND.font, coverImage: "", footer: HOUSE_DOCUMENT_BRAND.footer, disclaimer: HOUSE_DOCUMENT_BRAND.disclaimer,
    purpose: template.purpose, customerStory: template.customerStory, objectives: template.businessOutcomes.join("\n"), executiveSummary: template.proposalNarrative, scope: template.application,
    exclusions: "Items marked as third-party dependencies are outside the WyreStorm BOM.", nextSteps: "Confirm unresolved questions, then run the governed recommendation workflow.",
    audience: HOUSE_DOCUMENT_BRAND.audience, detail: HOUSE_DOCUMENT_BRAND.detail,
  };
  const brand = organisationDocumentBrand();
  // Read each branded default through the document field that takes it rather
  // than spreading the stored object: a spread carries a key nothing reads, and
  // then nobody can tell which defaults are actually honoured.
  return {
    ...defaults,
    organisationLogo: brand.organisationLogo,
    primaryColour: brand.primaryColour,
    secondaryColour: brand.secondaryColour,
    font: brand.font,
    footer: brand.footer,
    disclaimer: brand.disclaimer,
    audience: brand.audience,
    detail: brand.detail,
  };
}

/**
 * The brand a solution document takes: what this organisation stored, over the
 * house table.
 *
 * One reader, because a draft already being personalised can ask for the same
 * eight values a new document starts with — see
 * `applyOrganisationDocumentDefaults`. A setting left unset falls back to the
 * house value rather than to nothing, so a document never loses a font or colour
 * because only one of the eight was stored.
 */
export function organisationDocumentBrand(): Required<OrganisationDocumentSettings> {
  const organisation = loadOrganisationDocumentSettings();
  return {
    organisationLogo: organisation.organisationLogo ?? HOUSE_DOCUMENT_BRAND.organisationLogo,
    primaryColour: organisation.primaryColour ?? HOUSE_DOCUMENT_BRAND.primaryColour,
    secondaryColour: organisation.secondaryColour ?? HOUSE_DOCUMENT_BRAND.secondaryColour,
    font: organisation.font ?? HOUSE_DOCUMENT_BRAND.font,
    footer: organisation.footer ?? HOUSE_DOCUMENT_BRAND.footer,
    disclaimer: organisation.disclaimer ?? HOUSE_DOCUMENT_BRAND.disclaimer,
    audience: organisation.audience ?? HOUSE_DOCUMENT_BRAND.audience,
    detail: organisation.detail ?? HOUSE_DOCUMENT_BRAND.detail,
  };
}

/**
 * Pull the organisation's saved brand into a document already being personalised.
 *
 * The six brand values move: logo, both colours, font, footer and disclaimer.
 * The draft's title, customer, scope and summary text are what the rep wrote for
 * this room, and its audience and detail are who they wrote it for and how deep
 * it goes — a choice made for this customer, in their own fieldset, beside the
 * content rather than the brand. A rep who only wants the new colours and font
 * keeps them.
 *
 * Settings still seeds all eight into a *new* document (`defaultPersonalisation`),
 * where there is no earlier choice to overrule.
 */
export function applyOrganisationDocumentDefaults(
  personalisation: DocumentPersonalisation,
  brand: Required<OrganisationDocumentSettings> = organisationDocumentBrand(),
): DocumentPersonalisation {
  return {
    ...personalisation,
    organisationLogo: brand.organisationLogo,
    primaryColour: brand.primaryColour,
    secondaryColour: brand.secondaryColour,
    font: brand.font,
    footer: brand.footer,
    disclaimer: brand.disclaimer,
  };
}

const DRAFT_KEY = "wingman-template-document-drafts-v1";
const ORGANISATION_KEY = "wingman-organisation-document-settings-v1";
export function loadOrganisationDocumentSettings(): OrganisationDocumentSettings {
  try { return JSON.parse(localStorage.getItem(ORGANISATION_KEY) || "{}"); } catch { return {}; }
}
export function saveOrganisationDocumentSettings(settings: OrganisationDocumentSettings) {
  localStorage.setItem(ORGANISATION_KEY, JSON.stringify({ ...loadOrganisationDocumentSettings(), ...settings }));
}
/** Drop the organisation's brand, so the next document uses the house values. */
export function clearOrganisationDocumentSettings() {
  localStorage.removeItem(ORGANISATION_KEY);
}
/**
 * What a stored document draft holds, which is the personalisation and nothing
 * beside it.
 *
 * The record used to carry `templateId`, `assumptions` and `updatedAt` as well,
 * and no reader took any of the three back: the map key already names the
 * template, the assumptions a document carries are the definition's own list
 * (`template.assumptions`, which the drawer prints and the proposal is built
 * from), and no surface says when a draft was saved — the drawer offers "Draft
 * saved", never a time. The stored value is an allow-list, so a draft an older
 * build wrote keeps those keys in the browser and simply has them ignored: the
 * next save writes this shape.
 */
export type StoredTemplateDocumentDraft = { personalisation: DocumentPersonalisation };

export function saveTemplateDraft(template: SolutionTemplateDefinition, personalisation: DocumentPersonalisation) {
  const existing = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}") as Record<string, StoredTemplateDocumentDraft>;
  existing[template.id] = { personalisation };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(existing));
}

export function loadTemplateDraft(templateId: string): StoredTemplateDocumentDraft | null {
  try { return (JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}") as Record<string, StoredTemplateDocumentDraft>)[templateId] || null; } catch { return null; }
}

const DOCUMENT_DETAIL_LEVELS = new Set<string>(["Executive", "Standard", "Technical"]);

/**
 * The depth the stored document draft for this template prints at.
 *
 * The detail level is the document's own setting, so it is read as an export
 * leaves rather than when a page opened: a rep who changes Detail in the
 * personalisation drawer and then issues the document gets the document they
 * asked for. A draft that has never chosen a level prints at the house level,
 * and a value that names no level at all is ignored rather than read as one.
 */
export function templateDocumentDetail(templateId: string): DocumentDetail {
  const stored = loadTemplateDraft(templateId)?.personalisation.detail;
  return stored && DOCUMENT_DETAIL_LEVELS.has(stored) ? stored : HOUSE_DOCUMENT_BRAND.detail;
}
