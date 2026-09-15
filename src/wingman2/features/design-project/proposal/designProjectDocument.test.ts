import { describe, expect, it } from "vitest";
import type { StoredDesignProposalRevision } from "../../projects";
import { buildDesignProjectDocument } from "./designProjectDocument";

describe("Design Project document", () => {
  it("projects every publication fact without reinterpreting it", () => {
    const revision = { schemaVersion: 1, revisionId: "dp1-a", contentHash: "dp1-a", projectId: "p", projectName: "Room", compiledAt: "2026-09-14", customerRequirement: "Two displays", interpretedRequirement: "Independent destinations", architecture: "Matrix", requirements: [], roleCoverage: [{ role: "destination", label: "Displays", required: true, covered: true, evidence: ["2 outputs"], requirementIds: [] }], productOverviews: [], assumptions: ["Displays by others"], blockers: [], warnings: ["Confirm cable route"], canIssue: true } satisfies StoredDesignProposalRevision;
    expect(buildDesignProjectDocument(revision)).toEqual(expect.objectContaining({ revisionId: "dp1-a", interpretation: "Independent destinations", architecture: "Matrix", requiredRoles: revision.roleCoverage, assumptions: revision.assumptions, warnings: revision.warnings, canIssue: true }));
  });
});
