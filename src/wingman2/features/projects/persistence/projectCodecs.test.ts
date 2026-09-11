import { describe, expect, it } from "vitest";
import { decodeProjectStore, decodeStoredProject } from "./projectCodecs";

const BASE_PROJECT = {
  id: "legacy-project",
  name: "Legacy project",
  owner: "Sales",
  stage: "Finder",
  status: "ready",
  updated: "Today",
  resumeTo: "/wingman/finder",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

describe("project persistence codecs", () => {
  it("accepts projects saved before omittedProductSkus existed", () => {
    const decoded = decodeStoredProject(BASE_PROJECT);

    expect(decoded).not.toBeNull();
    expect(decoded).not.toHaveProperty("omittedProductSkus");
  });

  it("migrates the legacy Finder stage and route to Recommendations", () => {
    const decoded = decodeStoredProject({
      ...BASE_PROJECT,
      workflow: { source: "Finder", lastStep: "Selected", nextRoute: "/wingman/finder", updatedAt: BASE_PROJECT.updatedAt },
    });

    expect(decoded).toMatchObject({
      stage: "Recommendations",
      resumeTo: "/wingman/recommendations",
      workflow: { nextRoute: "/wingman/recommendations" },
    });
  });

  it("drops malformed array containers and malformed array members", () => {
    const decoded = decodeProjectStore({
      projects: [null, "bad", {
        ...BASE_PROJECT,
        productSelections: [null, { title: "missing sku" }, { sku: " valid-sku ", tags: "not-an-array" }],
        compareRuns: [null, "bad", { id: "run-1", warnings: "not-an-array" }],
      }],
      proposalDrafts: { id: "not-an-array" },
      activeProjectId: "missing",
    });

    expect(decoded.projects).toHaveLength(1);
    expect(decoded.projects[0].productSelections).toEqual([
      expect.objectContaining({ sku: "valid-sku", tags: [] }),
    ]);
    expect(decoded.projects[0].compareRuns).toEqual([
      expect.objectContaining({ id: "run-1", warnings: [] }),
    ]);
    expect(decoded.proposalDrafts).toEqual([]);
    expect(decoded.activeProjectId).toBeNull();

    const malformedContainers = decodeStoredProject({
      ...BASE_PROJECT,
      productSelections: { sku: "NOPE" },
      compareRuns: "NOPE",
      requirements: { id: "NOPE" },
    });
    expect(malformedContainers).not.toHaveProperty("productSelections");
    expect(malformedContainers).not.toHaveProperty("compareRuns");
    expect(malformedContainers).not.toHaveProperty("requirements");
  });

  it("preserves versioned proposal and design revision payloads", () => {
    const designRevision = {
      schemaVersion: 1,
      revisionId: "revision-7",
      contentHash: "hash-7",
      extensionOwnedByCompiler: { retained: true },
    };
    const proposalVersions = [{ id: "proposal-v7", versionNumber: 7, opaqueLegacyField: "retained" }];
    const decoded = decodeStoredProject({
      ...BASE_PROJECT,
      proposal: { title: "Proposal", summary: "Summary", updatedAt: BASE_PROJECT.updatedAt, designRevision },
      proposalVersions,
    });

    expect(decoded?.proposal?.designRevision).toBe(designRevision);
    expect(decoded?.proposalVersions).toBe(proposalVersions);
  });

  it("normalizes valid sync conflicts and removes malformed or empty conflicts", () => {
    const valid = decodeStoredProject({
      ...BASE_PROJECT,
      syncConflict: {
        fields: ["proposal", "", "proposal", "requirements"],
        detectedAt: "2026-01-03T00:00:00.000Z",
      },
    });
    expect(valid?.syncConflict).toEqual({
      fields: ["proposal", "requirements"],
      detectedAt: "2026-01-03T00:00:00.000Z",
    });

    expect(decodeStoredProject({ ...BASE_PROJECT, syncConflict: "invalid" })).not.toHaveProperty("syncConflict");
    expect(decodeStoredProject({
      ...BASE_PROJECT,
      syncConflict: { fields: [], detectedAt: "2026-01-03T00:00:00.000Z" },
    })).not.toHaveProperty("syncConflict");
  });
});
