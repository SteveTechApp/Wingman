import { beforeEach, describe, expect, it } from "vitest";
import { roomTemplates } from "@/wingman2/lib/roomTemplates";
import { defaultPersonalisation, loadTemplateDraft, saveOrganisationDocumentSettings, saveTemplateDraft, toSolutionTemplate, validatePublishedTemplate } from "@/wingman2/lib/solutionTemplates";

describe("governed solution templates", () => {
  beforeEach(() => localStorage.clear());

  it("blocks publication when required solution-document content is incomplete", () => {
    const definition = toSolutionTemplate(roomTemplates[0]);
    expect(validatePublishedTemplate({ ...definition, purpose: "", documentBlueprint: [] })).toEqual(expect.arrayContaining(["purpose", "documentBlueprint"]));
  });

  it("inherits organisation branding without letting document overrides mutate it", () => {
    saveOrganisationDocumentSettings({ organisationName: "Example AV", primaryColour: "#123456", footer: "Example footer" });
    const definition = toSolutionTemplate(roomTemplates[0]);
    const document = defaultPersonalisation(definition);
    expect(document.primaryColour).toBe("#123456");
    saveTemplateDraft(definition, { ...document, primaryColour: "#abcdef" });
    expect(defaultPersonalisation(definition).primaryColour).toBe("#123456");
  });

  it("reopens an edited draft with assumptions kept separate from document content", () => {
    const definition = toSolutionTemplate(roomTemplates[0]);
    const document = { ...defaultPersonalisation(definition), customerName: "Northstar", executiveSummary: "Edited summary" };
    saveTemplateDraft(definition, document);
    expect(loadTemplateDraft(definition.id)?.personalisation).toMatchObject({ customerName: "Northstar", executiveSummary: "Edited summary" });
    expect(document.objectives).not.toContain("Assumed:");
  });
});
