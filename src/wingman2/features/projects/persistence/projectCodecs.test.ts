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

  it("keeps dependency prompts answered as documented dependencies across a reload", () => {
    const decoded = decodeStoredProject({
      ...BASE_PROJECT,
      unquotedDependencySkus: [" tbc-cable-path ", "TBC-HDBASET-PAIR", ""],
    });

    // The decision is what stops the BOM carrying an unpriced line, so a reload
    // has to read it back the way the gate wrote it.
    expect(decoded?.unquotedDependencySkus).toEqual(["TBC-CABLE-PATH", "TBC-HDBASET-PAIR"]);
    // A project saved before the field existed simply has none.
    expect(decodeStoredProject(BASE_PROJECT)).not.toHaveProperty("unquotedDependencySkus");
  });

  it("keeps the photo review stored on a saved wall", () => {
    const surveyReview = {
      reviewedAt: "2026-10-20T14:12:00.000Z",
      photoCount: 1,
      confidence: 0.7,
      rows: [
        { id: "display-1", label: "Panel 1", metres: 6, confidence: 0.8, decision: "accepted" },
        { id: "display-2", label: "Panel 2", metres: 9, confidence: 0.4, decision: "rejected" },
      ],
    };
    const decoded = decodeStoredProject({
      ...BASE_PROJECT,
      videowall: {
        savedAt: "2026-10-20T14:13:00.000Z",
        wallType: "lcd",
        summary: { version: 2, requirements: { application: "lcd-direct", surveyReview } },
      },
    });

    // The review is part of the design record, so a load cannot quietly drop it.
    expect(
      (decoded?.videowall?.summary as { requirements?: { surveyReview?: unknown } } | undefined)?.requirements?.surveyReview,
    ).toEqual(surveyReview);
  });

  it("keeps the project and template a saved wall records", () => {
    const decoded = decodeStoredProject({
      ...BASE_PROJECT,
      videowall: {
        savedAt: "2026-02-01T00:00:00.000Z",
        wallType: "lcd",
        summary: {},
        projectId: "project-9",
        templateId: "tpl-boardroom",
      },
    });
    expect(decoded?.videowall).toMatchObject({ projectId: "project-9", templateId: "tpl-boardroom" });

    // A wall saved before the links existed is filled from the record it sits in.
    const legacy = decodeStoredProject({
      ...BASE_PROJECT,
      videowall: { savedAt: "2026-02-01T00:00:00.000Z", wallType: "lcd", summary: {} },
    });
    expect(legacy?.videowall?.projectId).toBe("legacy-project");
    expect(legacy?.videowall).not.toHaveProperty("templateId");
  });

  it("backfills a legacy wall's template from its project's room model", () => {
    const decoded = decodeStoredProject({
      ...BASE_PROJECT,
      discoveryBrief: { savedAt: BASE_PROJECT.updatedAt, roomModel: { sourceTemplateId: "tpl-boardroom" } },
      videowall: { savedAt: "2026-02-01T00:00:00.000Z", wallType: "lcd", summary: {} },
    });
    expect(decoded?.videowall).toMatchObject({ projectId: "legacy-project", templateId: "tpl-boardroom" });

    // A wall that already names its template keeps it, even if the room model moved on.
    const recorded = decodeStoredProject({
      ...BASE_PROJECT,
      discoveryBrief: { savedAt: BASE_PROJECT.updatedAt, roomModel: { sourceTemplateId: "tpl-huddle" } },
      videowall: { savedAt: "2026-02-01T00:00:00.000Z", wallType: "lcd", summary: {}, templateId: "tpl-boardroom" },
    });
    expect(recorded?.videowall?.templateId).toBe("tpl-boardroom");
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

  it("preserves a versioned design-project graph", () => {
    const decision = { schemaVersion: 1, revisionId: "revision-8", contentHash: "decision-8" };
    const designProject = { schemaVersion: 1, projectId: BASE_PROJECT.id, projectName: BASE_PROJECT.name, compiledAt: BASE_PROJECT.updatedAt, contentHash: "dpg1-12345678", stages: [], decision, publication: { canIssue: false, blockers: ["Confirm source"], warnings: [] } };
    expect(decodeStoredProject({ ...BASE_PROJECT, designProject })?.designProject).toEqual(designProject);
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

it("records a legacy wall migration once and honours deliberate cleared ownership", () => {
  const project = decodeStoredProject({ ...BASE_PROJECT, videowall: { wallType: "lcd", savedAt: BASE_PROJECT.updatedAt, summary: {} } })!;
  expect(project.videowall?.projectId).toBe(BASE_PROJECT.id);
  expect(project.videowall?.ownershipMigratedAt).toBeTruthy();
  expect(decodeStoredProject(project)?.videowall?.ownershipMigratedAt).toBe(project.videowall?.ownershipMigratedAt);
  const cleared = decodeStoredProject({ ...project, videowall: { ...project.videowall, projectId: undefined, ownershipCleared: true } });
  expect(cleared?.videowall?.projectId).toBeUndefined();
});
