import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { StoredProject } from "../../features/projects";
import { wallSurveyReviewStamp } from "../../lib/wallSurveyReview";
import { WallSurveySheetImports } from "./WallSurveySheetImports";

const IMPORTED_AT = "2026-10-21T20:30:00.000Z";

function project(detail?: string): StoredProject {
  return {
    id: "project-1",
    name: "Boardroom wall",
    owner: "Northbridge",
    stage: "Proposal",
    status: "recommended",
    updated: "Today",
    createdAt: "2026-10-20T09:00:00.000Z",
    updatedAt: "2026-10-21T20:30:00.000Z",
    resumeTo: "/wingman/projects",
    auditTrail: detail
      ? [{
          id: "audit-sheet-1",
          action: "wall-survey-sheet",
          detail,
          scope: "videowall",
          severity: "info",
          actorName: "Wingman user",
          createdAt: IMPORTED_AT,
        }]
      : [],
  } as unknown as StoredProject;
}

function renderPanel(value: StoredProject) {
  return render(<WallSurveySheetImports project={value} />);
}

describe("WallSurveySheetImports", () => {
  it("names the sheet's import and each run it carried, one line per link", () => {
    renderPanel(project(
      `Survey sheet imported — 2 runs (Source 1: 3 m; Panel 1: 4.5 m); recorded ${"21 Oct 2026, 20:30"}`,
    ));

    expect(screen.getByText("Imported worksheet sheets")).not.toBeNull();
    expect(screen.getByTestId("wall-survey-sheet-imports").textContent).toContain("2 runs from paper");

    const runs = document.querySelector("[data-sheet-import-runs]");
    expect(Array.from(runs?.querySelectorAll("li") ?? []).map((item) => item.textContent)).toEqual([
      "Source 1: 3 m",
      "Panel 1: 4.5 m",
    ]);
    // The import time travels with the runs, so a re-import reads as a second
    // sheet rather than a duplicate of the first.
    expect(screen.getByText(wallSurveyReviewStamp(IMPORTED_AT))).not.toBeNull();
  });

  it("says a sheet of install detail carried no runs rather than an empty list", () => {
    renderPanel(project("Survey sheet imported — no measured runs; 1 install line; recorded 21 Oct 2026, 20:30"));

    expect(screen.getByTestId("wall-survey-sheet-imports").textContent).toContain("no measured runs on this sheet");
    expect(document.querySelector("[data-sheet-import-runs]")).toBeNull();
  });

  it("renders nothing for a project that never imported a sheet", () => {
    const { container } = renderPanel(project());

    expect(container.textContent).toBe("");
  });
});
