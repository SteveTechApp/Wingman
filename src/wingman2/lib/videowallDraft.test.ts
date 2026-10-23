import { beforeEach, describe, expect, it, vi } from "vitest";
import { storedVideowallDraft, VIDEO_WALL_DRAFT_KEY, rememberVideowallDraft, restoreVideowallDraft } from "./videowallDraft";
import { defaultWallRequirements } from "./videowallOptions";
import { wallStartPresets } from "./videowallDecision";
import { wallStartingPointOrigin } from "./wallStartingPointOrigin";
import { wallLinkBrief, wallLinkToken } from "./wallLink";

// The builder restores from whichever of the project's saved wall and the local
// draft holds newer work; a case that needs a project sets one here.
const { projectWall } = vi.hoisted(() => ({ projectWall: { id: null as string | null, summary: null as unknown } }));
vi.mock("../features/projects", () => ({
  getCurrentWorkflowProject: () => (projectWall.id || projectWall.summary
    ? { id: projectWall.id ?? undefined, videowall: projectWall.summary ? { summary: projectWall.summary } : undefined }
    : null),
}));

const REVIEWED_AT = "2026-10-20T14:12:00.000Z";

function seed(requirements: Record<string, unknown>) {
  window.localStorage.setItem(VIDEO_WALL_DRAFT_KEY, JSON.stringify({ requirements, selectedId: "" }));
}

describe("restoreVideowallDraft photo review", () => {
  beforeEach(() => {
    window.localStorage.clear();
    projectWall.id = null;
    projectWall.summary = null;
  });

  it("brings the review saved with the design back", () => {
    const surveyReview = {
      reviewedAt: REVIEWED_AT,
      photoCount: 1,
      confidence: 0.7,
      rows: [
        { id: "source-1", label: "Source 1", metres: 4.5, confidence: 0.82, decision: "accepted" },
        { id: "display-1", label: "Panel 1", metres: 9, confidence: 0.41, decision: "rejected" },
      ],
    };
    seed({ ...defaultWallRequirements, surveyReview });

    const { requirements } = restoreVideowallDraft(null);
    expect(requirements.surveyReview).toEqual(surveyReview);
    // The runs the review left behind come back with it.
    expect(requirements.application).toBe("lcd-direct");
  });

  it("brings back the card a saved wall started on", () => {
    const preset = wallStartPresets.find((entry) => entry.key === "two-up")!;
    const startingPoint = wallStartingPointOrigin(preset);
    window.localStorage.setItem(
      VIDEO_WALL_DRAFT_KEY,
      JSON.stringify({ version: 2, requirements: defaultWallRequirements, selectedId: "", startingPoint }),
    );

    // A rep reopening the wall and changing one run must not save it without
    // the card the design began on.
    expect(restoreVideowallDraft(null).startingPoint).toEqual(startingPoint);
  });

  it("starts a shared link's design without another room's card", () => {
    const preset = wallStartPresets.find((entry) => entry.key === "two-up")!;
    window.localStorage.setItem(
      VIDEO_WALL_DRAFT_KEY,
      JSON.stringify({ version: 2, requirements: defaultWallRequirements, selectedId: "", startingPoint: wallStartingPointOrigin(preset) }),
    );

    // The address carries answers only, so the recipient's design is not claimed
    // to have come from this browser's card.
    expect(restoreVideowallDraft(null, preset.requirements).startingPoint).toBeUndefined();
  });

  it("keeps the survey when the address names the wall this browser saved", () => {
    // The builder writes `?wall=` on every edit, so a reload hands the rep their
    // own brief back. A link never carries measurements, so the stored design —
    // not the address — has to win, or the runs would vanish on reload.
    const design = {
      ...defaultWallRequirements,
      application: "projection" as const,
      projectors: 2,
      sources: 2,
      measuredRuns: { "display-1": 12 },
      linkDetails: { "display-1": { enclosure: "Back box", termination: "Cat6A", entry: "Floor" } },
    };
    seed(design);
    const ownAddress = wallLinkBrief(wallLinkToken(design))!;

    const restored = restoreVideowallDraft(null, ownAddress);

    expect(restored.fromLink).toBeFalsy();
    expect(restored.requirements.measuredRuns).toEqual({ "display-1": 12 });
    expect(restored.requirements.linkDetails).toEqual({ "display-1": { enclosure: "Back box", termination: "Cat6A", entry: "Floor" } });
  });

  it("still opens a link for another wall, leaving this room's survey behind", () => {
    seed({ ...defaultWallRequirements, measuredRuns: { "display-1": 12 } });
    const otherWall = wallLinkBrief(wallLinkToken({
      ...defaultWallRequirements,
      application: "projection",
      projectors: 2,
      sources: 2,
    }))!;

    const restored = restoreVideowallDraft(null, otherWall);

    expect(restored.fromLink).toBe(true);
    expect(restored.requirements.measuredRuns).toEqual({});
  });

  it("reopens the draft a rep edited after the wall was saved", () => {
    // The draft is written on every edit, so it is newer than the copy the save
    // made; reloading must not fall back to the saved wall and drop the edit.
    projectWall.summary = {
      version: 2,
      requirements: { ...defaultWallRequirements, measuredRuns: { "display-1": 3 } },
      updatedAt: "2026-10-20T09:00:00.000Z",
    };
    rememberVideowallDraft({ requirements: { ...defaultWallRequirements, measuredRuns: { "display-1": 12 } } });

    expect(restoreVideowallDraft(null).requirements.measuredRuns).toEqual({ "display-1": 12 });
  });

  it("leaves the saved wall in charge when the draft is older than it", () => {
    // A wall saved elsewhere since is what the project holds; a stale local copy
    // must not shadow it.
    projectWall.summary = {
      version: 2,
      requirements: { ...defaultWallRequirements, measuredRuns: { "display-1": 3 } },
      updatedAt: "2026-10-22T09:00:00.000Z",
    };
    window.localStorage.setItem(VIDEO_WALL_DRAFT_KEY, JSON.stringify({
      version: 2,
      requirements: { ...defaultWallRequirements, measuredRuns: { "display-1": 12 } },
      selectedId: "",
      updatedAt: "2026-10-21T09:00:00.000Z",
    }));

    expect(restoreVideowallDraft(null).requirements.measuredRuns).toEqual({ "display-1": 3 });
  });

  it("writes a draft a reload can read back, survey and all", () => {
    rememberVideowallDraft({
      requirements: {
        ...defaultWallRequirements,
        application: "projection",
        projectors: 2,
        sources: 2,
        measuredRuns: { "display-1": 9 },
      },
      selectedId: "mx-0404-scl",
    });

    const stored = JSON.parse(window.localStorage.getItem(VIDEO_WALL_DRAFT_KEY)!);
    expect(stored.version).toBe(2);
    expect(typeof stored.updatedAt).toBe("string");
    const restored = restoreVideowallDraft(null);
    expect(restored.requirements.measuredRuns).toEqual({ "display-1": 9 });
    expect(restored.selectedId).toBe("mx-0404-scl");
  });

  it("records the project the draft belongs to, and moves it with the wall", () => {
    projectWall.id = "project-1";
    rememberVideowallDraft({ requirements: defaultWallRequirements });

    // A project page reads this to know whether the draft is its own wall, so
    // the owner is written beside the stamp rather than inferred later.
    expect(storedVideowallDraft()).toMatchObject({ projectId: "project-1" });
    expect(Date.parse(storedVideowallDraft()!.updatedAt)).not.toBeNaN();

    projectWall.id = "project-2";
    rememberVideowallDraft({ requirements: defaultWallRequirements });
    expect(storedVideowallDraft()?.projectId).toBe("project-2");

    // A wall built before any project existed names nobody, so no project can
    // claim it as its own copy falling behind.
    projectWall.id = null;
    rememberVideowallDraft({ requirements: defaultWallRequirements });
    expect(storedVideowallDraft()?.projectId).toBeNull();
  });

  it("drops a review the draft can no longer vouch for, without losing the design", () => {
    seed({ ...defaultWallRequirements, surveyReview: { rows: [{ id: "display-1" }] } });

    const { requirements } = restoreVideowallDraft(null);
    expect(requirements.application).toBe("lcd-direct");
    expect(requirements.surveyReview).toBeUndefined();
  });
});
