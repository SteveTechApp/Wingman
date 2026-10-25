import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { decideVideowall } from "../../lib/videowallDecision";
import { assessVideowallOptions, defaultWallRequirements, type WallRequirements } from "../../lib/videowallOptions";
import { wallTransportPlan } from "../../lib/videowallTransport";
import { VideowallWizard } from "./VideowallWizard";

function requirements(overrides: Partial<WallRequirements> = {}): WallRequirements {
  return { ...defaultWallRequirements, columns: 2, rows: 1, sources: 1, ...overrides };
}

function renderWizard(next: WallRequirements, { atResult = true }: { atResult?: boolean } = {}) {
  const decision = decideVideowall(next);
  render(
    <MemoryRouter>
      <VideowallWizard
        requirements={next}
        decision={decision}
        selected={decision.recommended?.option ?? null}
        options={assessVideowallOptions(next)}
        message=""
        handoffNote={null}
        startAtResult={atResult}
        variantId=""
        onVariant={vi.fn()}
        onSelect={vi.fn()}
        concerns={[]}
        onConcerns={vi.fn()}
        onChange={vi.fn()}
        onReplace={vi.fn()}
        onChooseLayout={vi.fn()}
        onChoosePanels={vi.fn()}
        onSave={vi.fn()}
        onSaveProposal={vi.fn()}
        onCopy={vi.fn()}
        onRestart={vi.fn()}
        onUnblock={vi.fn()}
        onUse={vi.fn()}
        onApply={vi.fn()}
        onOpenExpert={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe("VideowallWizard start step", () => {
  it("puts the way to the questions on the heading line, above a folded wall list", () => {
    renderWizard(requirements(), { atResult: false });

    // The four questions come before the walls are read, so a rep on a phone
    // does not scroll a catalogue to reach them.
    const skip = screen.getByRole("button", { name: "Answer the questions instead" });
    const heading = screen.getByRole("heading", { name: "Common walls" });
    expect(heading.parentElement).toBe(skip.parentElement?.parentElement);

    // And the step offers one wall per family rather than all twenty.
    expect(screen.getByTestId("videowall-preset-single-canvas")).toBeTruthy();
    expect(screen.queryByTestId("videowall-preset-nine-feeds")).toBeNull();
    fireEvent.click(screen.getByTestId("videowall-preset-show-all"));
    expect(screen.getByTestId("videowall-preset-nine-feeds")).toBeTruthy();
  });

  it("moves to the first question instead of the wall list", () => {
    renderWizard(requirements(), { atResult: false });

    fireEvent.click(screen.getByRole("button", { name: "Answer the questions instead" }));

    expect(screen.getByTestId("videowall-wizard-step-picture")).toBeTruthy();
    expect(screen.queryByTestId("videowall-preset-single-canvas")).toBeNull();
  });
});

describe("VideowallWizard survey gaps", () => {
  it("flags each display link missing housing, entry or termination", () => {
    renderWizard(requirements());

    fireEvent.click(screen.getByTestId("videowall-section-save"));

    const warning = screen.getByTestId("videowall-survey-gaps");
    expect(warning.textContent).toContain("2 of 2 links are missing a display housing, a run entry or a termination");
    expect(warning.textContent).toContain("Panel 1 (display housing, run entry and termination)");
    expect(warning.textContent).toContain("Panel 2 (display housing, run entry and termination)");
    expect(warning.textContent).toContain("before this design is handed off");
  });

  it("clears the flag when every display records all required cells", () => {
    const base = requirements();
    const linkDetails = Object.fromEntries(
      wallTransportPlan(base).allLinks.filter((link) => link.group === "display").map((link) => [link.id, { enclosure: "Back box", entry: "Floor box", termination: "HDMI faceplate" }]),
    );
    renderWizard({ ...base, linkDetails });

    fireEvent.click(screen.getByTestId("videowall-section-save"));

    expect(screen.queryByTestId("videowall-survey-gaps")).toBeNull();
  });
});

it("blocks handoff for survey gaps unless the draft override is recorded", () => {
  renderWizard(requirements());
  fireEvent.click(screen.getByTestId("videowall-section-save"));
  expect((screen.getByRole("button", { name: "Save to project" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: "Save and open proposal" }) as HTMLButtonElement).disabled).toBe(true);
});
it("allows a deliberate pre-survey draft", () => {
  renderWizard(requirements({ surveyDraftOverride: true }));
  fireEvent.click(screen.getByTestId("videowall-section-save"));
  expect((screen.getByRole("button", { name: "Save and open proposal" }) as HTMLButtonElement).disabled).toBe(false);
  expect(screen.getByTestId("videowall-survey-gaps")).toBeTruthy();
});

it("shows every tested design under the recommendation, not only the alternative", () => {
  renderWizard(requirements());
  fireEvent.click(screen.getByRole("button", { name: "Continue to recommendation" }));

  // The guided result tests the same answers as the expert pass, so it shows
  // the same field: the ranges in play and every catalogue design.
  const field = screen.getByTestId("videowall-options");
  expect(field.textContent).toContain("Every option");
  expect(screen.getByRole("list", { name: "Product ranges" })).toBeTruthy();
  expect(screen.getByTestId("videowall-option-nhd600")).toBeTruthy();
});

it("shows one result section at a time and preserves requirements while changing sections", () => {
  renderWizard(requirements({ columns: 3, rows: 3 }));
  expect(screen.getByRole("heading", { name: "Your answers" })).toBeTruthy();
  expect(screen.queryByTestId("videowall-transport")).toBeNull();
  expect(screen.queryByRole("button", { name: "Save to project" })).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Continue to recommendation" }));
  expect(screen.getByTestId("videowall-page-recommendation")).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Your answers" })).toBeNull();

  fireEvent.click(screen.getByTestId("videowall-section-layout"));
  expect(screen.getByTestId("videowall-page-layout")).toBeTruthy();
  expect(screen.queryByTestId("videowall-transport")).toBeNull();

  fireEvent.click(screen.getByTestId("videowall-section-survey"));
  expect(screen.getByTestId("videowall-transport")).toBeTruthy();
  expect(screen.queryByTestId("videowall-page-layout")).toBeNull();

  fireEvent.click(screen.getByTestId("videowall-section-brief"));
  expect(screen.getByRole("heading", { name: "Your answers" }).closest("section")?.textContent).toContain("3 × 3");
});
