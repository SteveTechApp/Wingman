import { beforeEach, describe, expect, it } from "vitest";
import { roomTemplates } from "@/wingman2/lib/roomTemplates";
import { applyOrganisationDocumentDefaults, defaultPersonalisation, loadTemplateDraft, saveOrganisationDocumentSettings, saveTemplateDraft, toSolutionTemplate, validatePublishedTemplate } from "@/wingman2/lib/solutionTemplates";

describe("governed solution templates", () => {
  beforeEach(() => localStorage.clear());

  it("blocks publication when required solution-document content is incomplete", () => {
    const definition = toSolutionTemplate(roomTemplates[0]);
    expect(validatePublishedTemplate({ ...definition, purpose: "" })).toEqual(expect.arrayContaining(["purpose"]));
  });

  it("inherits organisation branding without letting document overrides mutate it", () => {
    saveOrganisationDocumentSettings({ organisationLogo: "https://cdn.example.com/logo.svg", primaryColour: "#123456", footer: "Example footer" });
    const definition = toSolutionTemplate(roomTemplates[0]);
    const document = defaultPersonalisation(definition);
    expect(document.primaryColour).toBe("#123456");
    expect(document.organisationLogo).toBe("https://cdn.example.com/logo.svg");
    // A branded default the organisation never set keeps the house value.
    expect(document.secondaryColour).toBe("#263238");
    saveTemplateDraft(definition, { ...document, primaryColour: "#abcdef" });
    expect(defaultPersonalisation(definition).primaryColour).toBe("#123456");
  });

  it("takes the brand into a draft without overruling its audience and detail", () => {
    // Settings can seed all eight into a new document; a draft already has the
    // rep's own answer for these two, so the brand pull leaves them alone.
    saveOrganisationDocumentSettings({ primaryColour: "#123456", audience: "Consultant", detail: "Executive" });
    const definition = toSolutionTemplate(roomTemplates[0]);
    const draft = { ...defaultPersonalisation(definition), audience: "Integrator" as const, detail: "Technical" as const };
    const applied = applyOrganisationDocumentDefaults(draft);
    expect(applied.primaryColour).toBe("#123456");
    expect(applied.audience).toBe("Integrator");
    expect(applied.detail).toBe("Technical");
  });

  it("reopens an edited draft, and stores the personalisation and nothing beside it", () => {
    const definition = toSolutionTemplate(roomTemplates[0]);
    const document = { ...defaultPersonalisation(definition), customerName: "Northstar", executiveSummary: "Edited summary" };
    saveTemplateDraft(definition, document);
    expect(loadTemplateDraft(definition.id)?.personalisation).toMatchObject({ customerName: "Northstar", executiveSummary: "Edited summary" });
    expect(document.objectives).not.toContain("Assumed:");
    // The record keeps only what a reader takes back: the map key names the
    // template, the assumptions a document carries are the definition's own
    // list, and nothing shows when a draft was saved.
    const stored = JSON.parse(localStorage.getItem("wingman-template-document-drafts-v1") || "{}");
    expect(Object.keys(stored[definition.id])).toEqual(["personalisation"]);
    // A draft an older build wrote still reopens, because the stored value is an
    // allow-list: the keys it no longer writes are simply not read.
    localStorage.setItem("wingman-template-document-drafts-v1", JSON.stringify({
      [definition.id]: { templateId: definition.id, personalisation: document, assumptions: ["Assumed: the void above the ceiling is open"], updatedAt: "2026-01-01T00:00:00.000Z" },
    }));
    expect(loadTemplateDraft(definition.id)?.personalisation.customerName).toBe("Northstar");
  });
});
