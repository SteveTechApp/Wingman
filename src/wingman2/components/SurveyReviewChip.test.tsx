import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SurveyReviewChip } from "./SurveyReviewChip";

const REVIEWED_AT = "2026-01-15T09:00:00.000Z";

function project(decision: "accepted" | "rejected") {
  return {
    id: "harbour-survey",
    videowall: {
      summary: {
        version: 2,
        requirements: {
          surveyReview: {
            reviewedAt: REVIEWED_AT,
            photoCount: 1,
            confidence: 0.8,
            rows: [{ id: "display-1", label: "Panel 1", metres: 4, confidence: 0.9, decision }],
          },
        },
      },
    },
  };
}

function renderChip(entry: ReturnType<typeof project>) {
  render(
    <MemoryRouter>
      <SurveyReviewChip project={entry} />
    </MemoryRouter>,
  );
  return screen.getByTestId("survey-review-flag");
}

describe("SurveyReviewChip", () => {
  afterEach(() => vi.useRealTimers());

  it("shows how long ago the review was applied, beside what it decided", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-18T09:00:00.000Z"));
    const chip = renderChip(project("accepted"));

    // The state and its distance are one reading: reviewed, and when.
    expect(chip.textContent).toContain("Survey reviewed");
    expect(chip.textContent).toContain("3 days ago");
    // This week's reading is a fact, not a task: only an old one asks to be
    // re-confirmed.
    expect(chip.textContent).not.toContain("re-confirm");
    expect(chip.getAttribute("data-survey-review-age")).toBe("fresh");
    expect(chip.getAttribute("href")).toBe("/wingman/projects/harbour-survey?view=confirm#wall-survey-review");
  });

  it("sets a clean review the room may have outgrown apart from this week's", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-15T09:00:00.000Z"));
    const chip = renderChip(project("accepted"));

    expect(chip.textContent).toContain("4 months ago");
    expect(chip.getAttribute("data-survey-review-age")).toBe("stale");
    // The age says what to do about it, so the staleness survives being read
    // without the colour: the chip is the way back to the rows.
    expect(chip.textContent).toContain("4 months ago · re-confirm");
    // Still the quiet state — an old review is a prompt, not the cleared alarm.
    expect(chip.getAttribute("data-survey-review")).toBe("reviewed");
    expect(chip.className).not.toContain("wm-status-warning");
    expect(chip.getAttribute("title")).toContain("may have changed since");
  });

  it("keeps the cleared alarm when the cleared review is old as well", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-15T09:00:00.000Z"));
    const chip = renderChip(project("rejected"));

    // The slate wash marks an old clean reading, not an old alarm: a review that
    // cleared rows keeps the warning tone, because that is what happened to the
    // design. Both facts are on the chip — what it decided and how long ago.
    expect(chip.getAttribute("data-survey-review")).toBe("cleared");
    expect(chip.getAttribute("data-survey-review-age")).toBe("stale");
    expect(chip.className).toContain("wm-status-warning");
    expect(chip.textContent).toContain("1 survey row cleared");
    expect(chip.textContent).toContain("4 months ago");
    // The old-and-cleared chip keeps one instruction — the rows behind its
    // count — instead of stacking a second one on top.
    expect(chip.textContent).not.toContain("re-confirm");
  });

  it("dates a cleared review too, without losing the count it warns about", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-16T09:00:00.000Z"));
    const chip = renderChip(project("rejected"));

    expect(chip.textContent).toContain("1 survey row cleared");
    expect(chip.textContent).toContain("yesterday");
    expect(chip.getAttribute("data-survey-review")).toBe("cleared");
  });
});
