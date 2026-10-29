import { describe, expect, it } from "vitest";
import type { StoredProject } from "../data/projectStore";
import { canonicalDiscoveryQuestions } from "../pages/discovery/discoveryQuestions";
import { buildRequirementRecordsFromProject, requirementQuestionId } from "./projectRequirements";

/**
 * A question id is only a destination if the interview renders that question, so
 * the table in `projectRequirements.ts` is held against the shipped question set
 * here. That table is plain ids rather than an import of `discoveryQuestions`
 * because the project record is eager and the question set is the lazy Discovery
 * chunk; this spec is where the shortcut that buys is checked.
 */
const project: StoredProject = {
  id: "project-1",
  name: "Northbridge Meeting Room Refresh",
  owner: "Steve",
  stage: "Discovery",
  status: "recommended",
  updated: "Today",
  resumeTo: "/wingman/discovery",
  createdAt: "2026-10-26T09:00:00.000Z",
  updatedAt: "2026-10-26T09:00:00.000Z",
};

describe("requirementQuestionId", () => {
  it("gives every row sourced from Discovery the question that owns it", () => {
    const discoveryRows = buildRequirementRecordsFromProject(project)
      .filter((row) => row.source === "Discovery");

    expect(discoveryRows.length).toBeGreaterThan(0);
    expect(discoveryRows.filter((row) => !requirementQuestionId(row.id)).map((row) => row.id)).toEqual([]);
  });

  it("names a question the interview actually renders", () => {
    const questionIds = new Set(canonicalDiscoveryQuestions.map((question) => question.id));

    for (const row of buildRequirementRecordsFromProject(project)) {
      const questionId = requirementQuestionId(row.id);
      if (!questionId) continue;
      expect(questionIds.has(questionId), `${row.id} points at ${questionId}`).toBe(true);
    }
  });

  it("leaves the rows no question owns without a destination", () => {
    const unowned = buildRequirementRecordsFromProject(project)
      .filter((row) => row.source !== "Discovery")
      .map((row) => row.id);

    // The inferred architecture and the imported document rows: Wingman's own
    // reading of the answers, and rows Document Ingest recorded.
    expect(unowned.length).toBeGreaterThan(0);
    for (const id of unowned) expect(requirementQuestionId(id)).toBe("");

    // Neither is a question id a later build invents nor a hand-edited row.
    expect(requirementQuestionId("signal-standard")).toBe("");
    expect(requirementQuestionId("document-requirement-7")).toBe("");
  });
});
