import { describe, expect, it } from "vitest";
import { wallSurveyReviewAuditNote } from "../../../lib/wallSurveyReview";
import { wallTransportPlan, wallTransportRequirements } from "../../../lib/videowallTransport";
import type { ProjectStoreSnapshot, StoredProject } from "../model/projectTypes";
import { createProjectLifecycleCommands, type ProjectCommandContext } from "./projectLifecycle";
import { createDiscoveryCommands } from "./discoveryCommands";
import { createRecommendationCommands } from "./recommendationCommands";
import { createCompareCommands } from "./compareCommands";
import { createProposalCommands } from "./proposalCommands";

const NOW = "2026-09-12T09:00:00.000Z";

function project(overrides: Partial<StoredProject> = {}): StoredProject {
  return { id: "project-1", name: "Project one", owner: "Owner", stage: "Discovery", status: "alternative", updated: "Now", resumeTo: "/wingman/discovery", createdAt: NOW, updatedAt: NOW, ...overrides };
}

function harness(initial: StoredProject[] = []) {
  let snapshot: ProjectStoreSnapshot = { projects: initial, proposalDrafts: [], activeProjectId: initial[0]?.id ?? null };
  let sequence = 0;
  const context: ProjectCommandContext = { read: () => snapshot, write: (next) => { snapshot = next; }, now: () => NOW, createId: (prefix) => `${prefix}-${++sequence}` };
  const lifecycle = createProjectLifecycleCommands(context);
  return { context, lifecycle, discovery: createDiscoveryCommands(context, lifecycle), recommendations: createRecommendationCommands(context, lifecycle), compare: createCompareCommands(context, lifecycle), proposals: createProposalCommands(context, lifecycle), snapshot: () => snapshot };
}

describe("project domain commands", () => {
  it("creates, copies and deletes projects while preserving active-project behavior", () => {
    const commands = harness();
    const created = commands.lifecycle.upsertStoredProject(commands.lifecycle.createWorkflowProject({ name: "Created", stage: "Discovery", resumeTo: "/wingman/discovery", workflow: { source: "Discovery", lastStep: "Saved", nextRoute: "/wingman/recommendations", updatedAt: NOW } }));
    commands.lifecycle.copyStoredProject(created.id);
    expect(commands.snapshot().projects.map((item) => item.name)).toEqual(["Created", "Created Copy"]);
    expect(commands.snapshot().activeProjectId).toBe(commands.snapshot().projects[1].id);
    commands.lifecycle.deleteStoredProject(commands.snapshot().projects[1].id);
    expect(commands.snapshot().activeProjectId).toBeNull();
  });

  it("replaces a project where it sits and leaves the rep on their own project", () => {
    const commands = harness([
      project({ id: "project-1", name: "Project one" }),
      project({ id: "project-2", name: "Project two" }),
      project({ id: "project-3", name: "Project three" }),
    ]);
    commands.lifecycle.setActiveProjectId("project-2");

    // An approval decision is about the proposal, not about opening the project:
    // the row is rewritten where it is, and the gallery keeps its order.
    const replaced = commands.lifecycle.replaceStoredProject({
      ...project({ id: "project-1" }),
      name: "Project one (approved)",
      status: "recommended",
    });

    expect(replaced.name).toBe("Project one (approved)");
    expect(commands.snapshot().projects.map((item) => item.id)).toEqual(["project-1", "project-2", "project-3"]);
    expect(commands.snapshot().projects[0]).toMatchObject({ name: "Project one (approved)", status: "recommended" });
    expect(commands.snapshot().activeProjectId).toBe("project-2");
  });

  it("promotes a saved project to the front and makes it active, unlike a replace", () => {
    const commands = harness([
      project({ id: "project-1", name: "Project one" }),
      project({ id: "project-2", name: "Project two" }),
      project({ id: "project-3", name: "Project three" }),
    ]);
    commands.lifecycle.setActiveProjectId("project-2");

    // A save from the project itself is the rep choosing it, so the same row
    // moves to the front and becomes the active project.
    commands.lifecycle.upsertStoredProject({ ...project({ id: "project-3" }), name: "Project three (saved)" });

    expect(commands.snapshot().projects.map((item) => item.id)).toEqual(["project-3", "project-1", "project-2"]);
    expect(commands.snapshot().projects[0].name).toBe("Project three (saved)");
    expect(commands.snapshot().activeProjectId).toBe("project-3");
  });

  it("appends a project the store has never seen instead of promoting it", () => {
    const commands = harness([
      project({ id: "project-1", name: "Project one" }),
      project({ id: "project-2", name: "Project two" }),
    ]);

    // A replace can name a project this browser has not stored yet (a decision
    // that landed from another device). It joins the list at the end and the
    // reading stays where it was; promoting it is an upsert's job.
    commands.lifecycle.replaceStoredProject(project({ id: "project-9", name: "Project nine" }));

    expect(commands.snapshot().projects.map((item) => item.id)).toEqual(["project-1", "project-2", "project-9"]);
    expect(commands.snapshot().activeProjectId).toBe("project-1");
  });

  it("updates a project where it sits and makes it the one being read", () => {
    const commands = harness([
      project({ id: "project-1", name: "Project one" }),
      project({ id: "project-2", name: "Project two" }),
      project({ id: "project-3", name: "Project three" }),
    ]);
    commands.lifecycle.setActiveProjectId("project-1");

    // An edit is about the project the rep is working on, not a save that
    // re-ranks the gallery: the row stays in its slot and becomes the reading.
    commands.lifecycle.updateStoredProject("project-2", (current) => ({ ...current, name: "Project two (edited)" }));

    expect(commands.snapshot().projects.map((item) => item.id)).toEqual(["project-1", "project-2", "project-3"]);
    expect(commands.snapshot().projects[1].name).toBe("Project two (edited)");
    expect(commands.snapshot().activeProjectId).toBe("project-2");
  });

  it("deletes a project, keeping the order and only clearing the reading it removed", () => {
    const commands = harness([
      project({ id: "project-1", name: "Project one" }),
      project({ id: "project-2", name: "Project two" }),
      project({ id: "project-3", name: "Project three" }),
    ]);
    commands.lifecycle.setActiveProjectId("project-1");

    // Deleting someone else's row closes a gap rather than re-ordering what is
    // left, and the rep keeps reading the project they were on.
    commands.lifecycle.deleteStoredProject("project-2");
    expect(commands.snapshot().projects.map((item) => item.id)).toEqual(["project-1", "project-3"]);
    expect(commands.snapshot().activeProjectId).toBe("project-1");

    // The row the rep was reading is the only one that can take the reading with it.
    commands.lifecycle.setActiveProjectId("project-3");
    commands.lifecycle.deleteStoredProject("project-3");
    expect(commands.snapshot().projects.map((item) => item.id)).toEqual(["project-1"]);
    expect(commands.snapshot().activeProjectId).toBeNull();
  });

  it("saves discovery and videowall data with workflow handoffs", () => {
    const commands = harness();
    commands.discovery.saveDiscoveryBriefToProject({ roomModel: { roomType: "Boardroom" }, savedAt: NOW, capturedPercent: 50 }, null);
    expect(commands.snapshot().projects[0]).toMatchObject({ name: "Boardroom Project", stage: "Discovery", resumeTo: "/wingman/recommendations" });
    commands.discovery.saveVideowallToProject({ wallType: "lcd", summary: { recommendation: { products: ["MX-1007-HYB"] } } });
    expect(commands.snapshot().projects[0].productSelections?.[0].sku).toBe("MX-1007-HYB");
  });

  it("records the project and template a saved wall belongs to", () => {
    const commands = harness();
    commands.discovery.saveDiscoveryBriefToProject({ roomModel: { roomType: "Boardroom", sourceTemplateId: "tpl-boardroom" }, savedAt: NOW, capturedPercent: 50 }, null);
    const projectId = commands.snapshot().projects[0].id;

    commands.discovery.saveVideowallToProject({ wallType: "lcd", summary: {} });
    expect(commands.snapshot().projects[0].videowall).toMatchObject({ projectId, templateId: "tpl-boardroom" });

    // Re-saving from the builder keeps the link recorded on the existing wall,
    // even when this visit did not arrive through a template handoff.
    commands.discovery.saveVideowallToProject({ wallType: "lcd", summary: {} });
    expect(commands.snapshot().projects[0].videowall?.templateId).toBe("tpl-boardroom");
  });

  it("takes the wall's template from the handoff and moves the link onto a copied project", () => {
    const commands = harness([project()]);
    commands.discovery.saveVideowallToProject({ wallType: "led", summary: {}, templateId: "tpl-huddle" });
    expect(commands.snapshot().projects[0].videowall).toMatchObject({ projectId: "project-1", templateId: "tpl-huddle" });

    commands.lifecycle.copyStoredProject("project-1");
    const copy = commands.snapshot().projects[1];
    // The copy owns its wall: the recorded project moves with it, the template stays.
    expect(copy.videowall?.projectId).toBe(copy.id);
    expect(copy.videowall?.templateId).toBe("tpl-huddle");
  });

  it("records install cells from the proposal without losing the survey's other detail", () => {
    const commands = harness([project()]);
    commands.discovery.saveVideowallToProject({
      wallType: "lcd",
      summary: {
        requirements: {
          application: "lcd-direct",
          linkDetails: {
            "display-1": { enclosure: "Back box" },
            "display-2": { enclosure: "Back box", termination: "HDMI faceplate" },
          },
        },
      },
    });

    // Only the missing termination is typed on the proposal; the enclosure the
    // survey recorded on that link stays as it was.
    const saved = commands.discovery.recordWallInstallDetail({
      projectId: "project-1",
      linkDetails: { "display-1": { termination: "Cat6A outlet" } },
    });

    const requirements = saved?.videowall?.summary.requirements as {
      linkDetails?: Record<string, { enclosure?: string; termination?: string }>;
    };
    expect(requirements.linkDetails?.["display-1"]).toEqual({ enclosure: "Back box", termination: "Cat6A outlet" });
    expect(requirements.linkDetails?.["display-2"]).toEqual({ enclosure: "Back box", termination: "HDMI faceplate" });
    expect(saved?.auditTrail?.[0]).toMatchObject({ action: "wall-survey-detail", scope: "videowall" });
    // The entry names the link it filled, so the trail can open that row
    // instead of only counting it.
    expect(saved?.auditTrail?.[0].detail).toContain("1 link (display-1)");
  });

  it("names the links an install detail entry filled, by their wall labels", () => {
    const commands = harness([project()]);
    commands.discovery.saveVideowallToProject({
      wallType: "lcd",
      summary: {
        requirements: {
          application: "lcd-direct",
          columns: 2,
          rows: 1,
          sources: 1,
          sourceLocation: "local",
          sourceResolution: "4k60",
        },
      },
    });

    // The page hands over the plan it is already drawing, so the entry can name
    // the link the way the rep reads it on the wall.
    const requirements = wallTransportRequirements(commands.snapshot().projects[0].videowall?.summary.requirements);
    const saved = commands.discovery.recordWallInstallDetail({
      projectId: "project-1",
      linkDetails: { "display-2": { enclosure: "Back box" } },
      transport: requirements ? wallTransportPlan(requirements) : null,
    });

    expect(saved?.auditTrail?.[0].detail).toContain("1 link (Panel 2)");
  });

  it("re-confirms a survey date without moving the wall or losing its rows", () => {
    const reviewedAt = "2025-01-01T09:00:00.000Z";
    const review = {
      reviewedAt,
      photoCount: 1,
      confidence: 0.9,
      rows: [{ id: "source-1", label: "Source 1", metres: 4, confidence: 0.9, decision: "accepted" }],
    };
    const commands = harness([
      project({
        videowall: { savedAt: reviewedAt, wallType: "lcd", summary: { requirements: { surveyReview: review } } },
      }),
    ]);

    const renewed = commands.discovery.reconfirmWallSurveyReview({ projectId: "project-1" });

    // The room was checked again, so the reading is stamped today — the rows it
    // kept and the wall they were applied to are untouched.
    const wall = renewed?.videowall;
    expect(wall?.summary.requirements).toMatchObject({ surveyReview: { ...review, reviewedAt: NOW } });
    expect(wall?.savedAt).toBe(reviewedAt);
    expect(renewed?.auditTrail?.[0]).toMatchObject({ action: "wall-survey-reconfirm", scope: "videowall" });
    expect(renewed?.auditTrail?.[0].detail).toContain("1 row kept");

    // A second press at the same stamp is not a second save.
    expect(commands.discovery.reconfirmWallSurveyReview({ projectId: "project-1" })).toBeNull();
    // A project with no applied review has nothing to re-confirm.
    expect(commands.discovery.reconfirmWallSurveyReview({ projectId: "missing" })).toBeNull();
  });

  it("re-confirms a survey without reordering the gallery or taking the active project", () => {
    const reviewedAt = "2025-01-01T09:00:00.000Z";
    const review = {
      reviewedAt,
      rows: [{ id: "source-1", label: "Source 1", metres: 4, decision: "accepted" }],
    };
    const commands = harness([
      project({
        id: "project-1",
        name: "Project one",
        updated: "Last week",
        updatedAt: "2025-06-01T09:00:00.000Z",
        videowall: { savedAt: reviewedAt, wallType: "lcd", summary: { requirements: { surveyReview: review } } },
      }),
      project({ id: "project-2", name: "Project two" }),
    ]);
    // The rep is working on the other project while tidying this survey.
    commands.lifecycle.setActiveProjectId("project-2");

    expect(commands.discovery.reconfirmWallSurveyReview({ projectId: "project-1" })).not.toBeNull();

    // The card stays where it was: the list is store order, and a renewed date
    // is not a design change that earns the top slot.
    expect(commands.snapshot().projects.map((item) => item.id)).toEqual(["project-1", "project-2"]);
    expect(commands.snapshot().activeProjectId).toBe("project-2");
    expect(commands.snapshot().projects[0]).toMatchObject({ updated: "Last week", updatedAt: "2025-06-01T09:00:00.000Z" });
  });

  it("does not rewrite a wall when the typed cells change nothing", () => {
    const commands = harness([project()]);
    commands.discovery.saveVideowallToProject({
      wallType: "lcd",
      summary: { requirements: { linkDetails: { "display-1": { termination: "HDMI faceplate" } } } },
    });
    const before = commands.snapshot().projects[0];

    // Typing the value the survey already carries is not an edit.
    expect(commands.discovery.recordWallInstallDetail({
      projectId: "project-1",
      linkDetails: { "display-1": { termination: "HDMI faceplate" } },
    })).toBeNull();
    expect(commands.discovery.recordWallInstallDetail({
      projectId: "project-1",
      linkDetails: { "display-1": { termination: "  " } },
    })).toBeNull();
    // A project with no saved wall has nowhere to record it.
    expect(commands.discovery.recordWallInstallDetail({ projectId: "missing", linkDetails: { "display-1": { enclosure: "Back box" } } })).toBeNull();
    expect(commands.snapshot().projects[0].videowall?.savedAt).toBe(before.videowall?.savedAt);
  });

  it("records a worksheet photo review on the project's audit trail once per review", () => {
    const commands = harness([project()]);
    const surveyReview = {
      reviewedAt: NOW,
      photoCount: 1,
      confidence: 0.7,
      rows: [
        { id: "display-1", label: "Panel 1", metres: 6, confidence: 0.8, decision: "accepted" as const },
        { id: "display-2", label: "Panel 2", metres: 9, confidence: 0.4, decision: "rejected" as const },
      ],
      // The hand-typed run the apply bar flagged, kept with the review so the
      // saved trail can quote the number rather than only the row count.
      flags: [{ id: "display-1", label: "Panel 1", metres: 20, allowanceMetres: 5 }],
    };
    const reviewNote = wallSurveyReviewAuditNote(surveyReview);

    commands.discovery.saveVideowallToProject({ wallType: "lcd", summary: { requirements: { surveyReview } }, reviewNote });
    const entry = commands.snapshot().projects[0].auditTrail?.[0];
    expect(entry).toMatchObject({ action: "wall-survey-review", scope: "videowall" });
    expect(entry?.detail).toContain("Worksheet photo review — 1 row accepted, 1 rejected, 1 photo, 70% confidence");
    expect(entry?.detail).toContain("1 typed run outside the printed allowance (Panel 1: 20 m against ≈5 m)");

    // Saving the same wall again is not a second review event.
    commands.discovery.saveVideowallToProject({ wallType: "lcd", summary: { requirements: { surveyReview } }, reviewNote });
    expect(
      commands.snapshot().projects[0].auditTrail?.filter((item) => item.action === "wall-survey-review"),
    ).toHaveLength(1);

    // A later review is, even when it decides the same count of rows.
    commands.discovery.saveVideowallToProject({
      wallType: "lcd",
      summary: { requirements: { surveyReview: { ...surveyReview, reviewedAt: "2026-09-13T09:00:00.000Z" } } },
      reviewNote: wallSurveyReviewAuditNote({ ...surveyReview, reviewedAt: "2026-09-13T09:00:00.000Z" }),
    });
    expect(
      commands.snapshot().projects[0].auditTrail?.filter((item) => item.action === "wall-survey-review"),
    ).toHaveLength(2);
  });

  it("records each imported survey sheet on the trail, naming the runs it carried", () => {
    const commands = harness([project()]);
    const first = "Survey sheet imported — 2 runs (Source 1: 3 m; Panel 1: 4.5 m); recorded 21 Oct 2026, 20:30";

    commands.discovery.saveVideowallToProject({ wallType: "lcd", summary: {}, sheetNotes: [first] });
    const entry = commands.snapshot().projects[0].auditTrail?.[0];
    expect(entry).toMatchObject({ action: "wall-survey-sheet", scope: "videowall", severity: "info" });
    // The entry carries the runs, so the project can say which came from paper.
    expect(entry?.detail).toBe(first);

    // Re-saving passes the same note again; that is not a second import.
    commands.discovery.saveVideowallToProject({ wallType: "lcd", summary: {}, sheetNotes: [first, first] });
    expect(
      commands.snapshot().projects[0].auditTrail?.filter((item) => item.action === "wall-survey-sheet"),
    ).toHaveLength(1);

    // A later sheet is its own event, even on the same wall.
    const second = "Survey sheet imported — 1 run (Panel 2: 6 m); recorded 21 Oct 2026, 20:40";
    commands.discovery.saveVideowallToProject({ wallType: "lcd", summary: {}, sheetNotes: [first, second] });
    const sheets = commands.snapshot().projects[0].auditTrail?.filter((item) => item.action === "wall-survey-sheet");
    expect(sheets).toHaveLength(2);
    expect(sheets?.[0].detail).toBe(second);
    // A blank note is no event at all.
    commands.discovery.saveVideowallToProject({ wallType: "lcd", summary: {}, sheetNotes: ["  "] });
    expect(
      commands.snapshot().projects[0].auditTrail?.filter((item) => item.action === "wall-survey-sheet"),
    ).toHaveLength(2);
  });

  it("adds, removes and records recommendation evidence without losing omission history", () => {
    const commands = harness([project()]);
    commands.recommendations.saveProductSelectionToProject("project-1", { sku: "RX-70-4K", title: "Receiver", addedAt: NOW });
    commands.recommendations.removeProductSelectionFromProject("project-1", "rx-70-4k");
    expect(commands.snapshot().projects[0].omittedProductSkus).toEqual(["RX-70-4K"]);
    commands.recommendations.saveRecommendationEvidenceToProject({ customerRequirement: "Route video", productDirection: "Matrix", systemShape: "One source to one display", whyThisFits: [], evidenceUsed: [], quoteChecks: [], missingInformation: [], requiredDependencies: [], optionalUpgrades: [], alternatives: [], customerSafeWording: [], internalGuidance: [], quoteSafetyStatus: "quote-ready", quoteSafetyMessage: "Ready", confidence: "high", updatedAt: NOW, source: "Test" });
    expect(commands.snapshot().projects[0].recommendationEvidence?.productDirection).toBe("Matrix");
  });

  it("versions compare history for the same competitor product", () => {
    const commands = harness([project()]);
    const run = { competitorBrand: "Acme", competitorSku: "A-1", wyrestormSku: "W-1", mode: "manual" as const, summary: "Match" };
    commands.compare.saveCompareRunToProject(run);
    commands.compare.saveCompareRunToProject(run);
    expect(commands.snapshot().projects[0].compareRuns?.map((item) => item.version)).toEqual([2, 1]);
  });

  it("versions and restores proposals", () => {
    const commands = harness([project({ proposal: { title: "Old", summary: "Summary", assumptions: [], sections: [], products: [], updatedAt: NOW } })]);
    commands.proposals.saveProjectProposalToProject({ title: "New", summary: "Summary", assumptions: [], sections: [], products: [], updatedAt: NOW });
    const version = commands.snapshot().projects[0].proposalVersions?.[0];
    expect(version?.proposal.title).toBe("Old");
    expect(commands.proposals.restoreProposalVersion(version!.id)).toBe(true);
    expect(commands.snapshot().projects[0].proposal?.title).toBe("Old");
  });

  it("saves requirements and deal outcomes through lifecycle updates", () => {
    const commands = harness([project()]);
    commands.proposals.saveProjectRequirementsToProject("project-1", [{ id: "r-1", label: "HDMI input", value: "1", category: "video", source: "Discovery", status: "confirmed", whyItMatters: "Signal input", updatedAt: "old" }]);
    commands.proposals.saveDealOutcome("project-1", "won", "Approved");
    expect(commands.snapshot().projects[0]).toMatchObject({ dealOutcome: "won", dealOutcomeWhy: "Approved", requirements: [{ id: "r-1", updatedAt: NOW }] });
  });
});
