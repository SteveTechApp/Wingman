// Pins the proposal-template default tables so drift fails CI. The proposal
// wizard and DOCX exports derive their section list from
// DEFAULT_DOCUMENT_SECTIONS and convert every room template to a published
// SolutionTemplateDefinition; a section removed or renamed, a template id
// duplicated, a blueprint diverging from the pinned list, or a template that
// would convert to an INVALID published solution (missing required field)
// all fail here.

import { describe, expect, it } from "vitest";
import { roomTemplates } from "./roomTemplates";
import {
  DEFAULT_DOCUMENT_SECTIONS,
  toSolutionTemplate,
  validatePublishedTemplate,
} from "./solutionTemplates";

const PINNED_DOCUMENT_SECTIONS = [
  "Branded cover",
  "Executive summary",
  "Customer requirement",
  "Market context",
  "Objectives",
  "User experience",
  "Recommended solution",
  "Architecture",
  "Room or application overview",
  "Equipment overview",
  "Required BOM",
  "Optional upgrades",
  "Third-party dependencies",
  "Assumptions",
  "Risks and unresolved questions",
  "Next steps",
];

describe("proposal template defaults", () => {
  it("pins DEFAULT_DOCUMENT_SECTIONS exactly (no removals, additions, renames or resequencing)", () => {
    expect(DEFAULT_DOCUMENT_SECTIONS).toEqual(PINNED_DOCUMENT_SECTIONS);
  });

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

  it("gives every template a documentBlueprint equal to the pinned section list", () => {
    const problems: string[] = [];
    for (const template of roomTemplates) {
      const blueprint = toSolutionTemplate(template).documentBlueprint;
      if (JSON.stringify(blueprint) !== JSON.stringify(PINNED_DOCUMENT_SECTIONS)) {
        problems.push(
          `template "${template.id}" blueprint diverges: ${JSON.stringify(blueprint)} vs pinned sections`,
        );
      }
    }
    expect(problems).toEqual([]);
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
});