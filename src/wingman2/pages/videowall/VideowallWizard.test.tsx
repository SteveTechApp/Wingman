import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { decideVideowall } from "../../lib/videowallDecision";
import { defaultWallRequirements, type WallRequirements } from "../../lib/videowallOptions";
import { wallTransportPlan } from "../../lib/videowallTransport";
import { VideowallWizard } from "./VideowallWizard";

function requirements(overrides: Partial<WallRequirements> = {}): WallRequirements {
  return { ...defaultWallRequirements, columns: 2, rows: 1, sources: 1, ...overrides };
}

function renderWizard(next: WallRequirements) {
  const decision = decideVideowall(next);
  render(
    <MemoryRouter>
      <VideowallWizard
        requirements={next}
        decision={decision}
        selected={decision.recommended?.option ?? null}
        message=""
        handoffLabel={null}
        startAtResult
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

describe("VideowallWizard survey gaps", () => {
  it("flags each display link missing housing, entry or termination", () => {
    renderWizard(requirements());

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

    expect(screen.queryByTestId("videowall-survey-gaps")).toBeNull();
  });
});

it("blocks handoff for survey gaps unless the draft override is recorded", () => {
  renderWizard(requirements());
  expect((screen.getByRole("button", { name: "Save to project" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: "Save and open proposal" }) as HTMLButtonElement).disabled).toBe(true);
});
it("allows a deliberate pre-survey draft", () => {
  renderWizard(requirements({ surveyDraftOverride: true }));
  expect((screen.getByRole("button", { name: "Save and open proposal" }) as HTMLButtonElement).disabled).toBe(false);
  expect(screen.getByTestId("videowall-survey-gaps")).toBeTruthy();
});
