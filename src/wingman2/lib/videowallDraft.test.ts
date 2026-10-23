import { beforeEach, describe, expect, it, vi } from "vitest";
import { VIDEO_WALL_DRAFT_KEY, restoreVideowallDraft } from "./videowallDraft";
import { defaultWallRequirements } from "./videowallOptions";
import { wallStartPresets } from "./videowallDecision";
import { wallStartingPointOrigin } from "./wallStartingPointOrigin";

// The builder restores from the active project before its local draft; these
// cases are about the stored draft, so no project is active.
vi.mock("../features/projects", () => ({ getCurrentWorkflowProject: () => null }));

const REVIEWED_AT = "2026-10-20T14:12:00.000Z";

function seed(requirements: Record<string, unknown>) {
  window.localStorage.setItem(VIDEO_WALL_DRAFT_KEY, JSON.stringify({ requirements, selectedId: "" }));
}

describe("restoreVideowallDraft photo review", () => {
  beforeEach(() => window.localStorage.clear());

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

  it("drops a review the draft can no longer vouch for, without losing the design", () => {
    seed({ ...defaultWallRequirements, surveyReview: { rows: [{ id: "display-1" }] } });

    const { requirements } = restoreVideowallDraft(null);
    expect(requirements.application).toBe("lcd-direct");
    expect(requirements.surveyReview).toBeUndefined();
  });
});
