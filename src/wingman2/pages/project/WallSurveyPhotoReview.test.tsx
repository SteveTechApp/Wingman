import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { StoredProject } from "../../features/projects";
import type { WallSurveyReview } from "../../lib/wallSurveyReview";
import { WallSurveyPhotoReview } from "./WallSurveyPhotoReview";

const review: WallSurveyReview = {
  reviewedAt: "2026-10-20T14:12:00.000Z",
  photoCount: 2,
  confidence: 0.63,
  rows: [
    { id: "source-1", label: "Source 1", metres: 4.5, confidence: 0.82, decision: "accepted" },
    // Cleared: the design keeps whatever its own run was.
    { id: "display-1", label: "Panel 1", metres: 9, confidence: 0.41, decision: "rejected" },
    // Corrected before applying: both numbers stay in the record.
    { id: "display-2", label: "Panel 2", metres: 7, readMetres: 6, confidence: 0.74, decision: "accepted" },
    // Typed by the rep: no photograph offered this row.
    { id: "display-3", label: "Panel 3", metres: 5, confidence: 0, typed: true, decision: "rejected" },
  ],
};

function project(withReview: WallSurveyReview | null = review): StoredProject {
  return {
    id: "project-1",
    name: "Boardroom wall",
    owner: "Northbridge",
    stage: "Proposal",
    status: "recommended",
    updated: "Today",
    createdAt: "2026-10-20T09:00:00.000Z",
    updatedAt: "2026-10-20T14:12:00.000Z",
    resumeTo: "/wingman/projects",
    videowall: {
      savedAt: "2026-10-20T14:12:00.000Z",
      wallType: "lcd",
      summary: {
        version: 2,
        requirements: {
          application: "lcd-direct",
          ...(withReview ? { surveyReview: withReview } : {}),
        },
      },
    },
  } as unknown as StoredProject;
}

function renderPanel(value: StoredProject) {
  return render(
    <MemoryRouter>
      <WallSurveyPhotoReview project={value} />
    </MemoryRouter>,
  );
}

describe("WallSurveyPhotoReview", () => {
  it("names the review and every row with the decision the design kept", () => {
    renderPanel(project());

    expect(screen.getByText("Site survey photo review")).not.toBeNull();
    expect(screen.getByTestId("wall-survey-photo-review-summary").textContent).toContain(
      "2 rows accepted (1 typed), 2 rejected, 2 photos, 63% confidence",
    );

    const cleared = document.querySelector('[data-survey-review-row="display-1"]');
    expect(cleared?.getAttribute("data-decision")).toBe("rejected");
    expect(cleared?.textContent).toContain("Panel 1");
    expect(cleared?.textContent).toContain("9 m");
    expect(cleared?.textContent).toContain("41%");
    expect(cleared?.textContent).toContain("Cleared");

    const accepted = document.querySelector('[data-survey-review-row="source-1"]');
    expect(accepted?.textContent).toContain("4.5 m");
    expect(accepted?.textContent).toContain("Accepted");
  });

  it("shows a corrected row beside the number the photo read", () => {
    renderPanel(project());

    const corrected = document.querySelector('[data-survey-review-row="display-2"]');
    expect(corrected?.textContent).toContain("7 m");
    expect(corrected?.textContent).toContain("read 6 m");
  });

  it("marks a typed row as a person's number rather than a reading", () => {
    renderPanel(project());

    const typed = document.querySelector('[data-survey-review-row="display-3"]');
    expect(typed?.textContent).toContain("Typed");
    expect(typed?.textContent).toContain("Cleared");
    expect(typed?.textContent).not.toContain("0%");
  });

  it("marks a hand-typed run that was far from its link's printed allowance", () => {
    renderPanel(
      project({
        ...review,
        flags: [{ id: "display-2", label: "Panel 2", metres: 7, allowanceMetres: 2 }],
      }),
    );

    // The doubt sits on the run it concerned, in the numbers the trail keeps.
    const flagged = document.querySelector('[data-survey-review-row="display-2"]');
    expect(flagged?.getAttribute("data-flagged-run")).toBe("true");
    expect(flagged?.querySelector("[data-flagged-run-note]")?.textContent).toContain(
      "Outside the printed allowance — 7 m against ≈2 m",
    );
    // Every other row is left alone, so the mark means something.
    expect(document.querySelector('[data-survey-review-row="source-1"]')?.getAttribute("data-flagged-run")).toBeNull();
  });

  it("says how many rows were cleared and how they were handled", () => {
    renderPanel(project());

    expect(screen.getByTestId("wall-survey-photo-review").textContent).toContain(
      "2 rows were cleared, so those links keep the run and install detail already recorded on the design.",
    );
  });

  it("renders nothing when the design carries no usable review", () => {
    const { container } = renderPanel(project(null));

    expect(container.textContent).toBe("");
  });
});
