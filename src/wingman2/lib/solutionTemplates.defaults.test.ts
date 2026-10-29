// Pins the proposal-template default tables so drift fails CI: every room
// template converts to a published SolutionTemplateDefinition, a template id
// duplicated or a template that would convert to an INVALID published solution
// (missing required field) fails here, and so does a document draft that stops
// printing at the depth it stored. The sections a document prints are pinned
// where they are built — `DOCUMENT_SECTIONS` in `documentSections.test.ts` — not
// here, because a template's shape is not a document's shape.

import { beforeEach, describe, expect, it } from "vitest";
import { roomTemplates } from "./roomTemplates";
import {
  defaultPersonalisation,
  templateDocumentDetail,
  toSolutionTemplate,
  validatePublishedTemplate,
} from "./solutionTemplates";

describe("proposal template defaults", () => {
  beforeEach(() => window.localStorage.clear());

  it("keeps every template id unique and non-empty across the catalogue", () => {
    const seen = new Map<string, number>();
    for (const template of roomTemplates) {
      if (!template.id.trim()) {
        throw new Error(`a room template in ${template.name ?? "unknown"} has an empty id`);
      }
      seen.set(template.id, (seen.get(template.id) ?? 0) + 1);
    }
    const duplicates = [...seen.entries()].filter(([, count]) => count > 1);
    expect(duplicates).toEqual([]);
  });

  it("converts every room template to a valid published solution template", () => {
    const problems: string[] = [];
    for (const template of roomTemplates) {
      const missing = validatePublishedTemplate(toSolutionTemplate(template));
      if (missing.length > 0) {
        problems.push(`template "${template.id}" is missing required field(s): ${missing.join(", ")}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("prints at the depth the stored document draft chose, and the house depth otherwise", () => {
    const template = roomTemplates[0];
    expect(templateDocumentDetail(template.id)).toBe("Standard");
    window.localStorage.setItem("wingman-template-document-drafts-v1", JSON.stringify({
      [template.id]: { personalisation: { ...defaultPersonalisation(toSolutionTemplate(template)), detail: "Technical" } },
    }));
    expect(templateDocumentDetail(template.id)).toBe("Technical");
    // A value that names no level is ignored rather than read as one, so a
    // hand-edited draft cannot decide the document prints nothing.
    window.localStorage.setItem("wingman-template-document-drafts-v1", JSON.stringify({
      [template.id]: { personalisation: { ...defaultPersonalisation(toSolutionTemplate(template)), detail: "Deep" } },
    }));
    expect(templateDocumentDetail(template.id)).toBe("Standard");
  });

  it("keeps custom templates draft-safe and rejects incomplete published governance", () => {
    const custom = { ...toSolutionTemplate({ ...roomTemplates[0], customTemplate: true }), status: "custom" as const };
    expect(validatePublishedTemplate({ ...custom, applicationProfile: undefined, bom: [] })).toEqual([]);
    const published = toSolutionTemplate(roomTemplates[0]);
    expect(validatePublishedTemplate({ ...published, applicationProfile: { ...published.applicationProfile!, sizingBasis: [] } })).toContain("sizing basis");
    expect(validatePublishedTemplate({ ...published, bom: [] })).toContain("required governed WyreStorm row");
    expect(validatePublishedTemplate(published, new Set())).toEqual(expect.arrayContaining([expect.stringContaining("unresolved governed SKU(s)")]));
  });
});
