import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { decideVideowall } from "../../lib/videowallDecision";
import { assessVideowallOptions, defaultWallRequirements, type WallRequirements } from "../../lib/videowallOptions";
import { wallTransportPlan } from "../../lib/videowallTransport";
import { VideowallWizard } from "./VideowallWizard";

function requirements(overrides: Partial<WallRequirements> = {}): WallRequirements {
  return { ...defaultWallRequirements, columns: 2, rows: 1, sources: 1, ...overrides };
}

function renderWizard(
  next: WallRequirements,
  { atResult = true, onReplace = vi.fn() }: { atResult?: boolean; onReplace?: (next: WallRequirements) => void } = {},
) {
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
        onReplace={onReplace}
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
  it("leads with the LED brief, above the walls", () => {
    renderWizard(requirements(), { atResult: false });

    // The three facts of the brief are the customer's, so they are asked before
    // any wall is offered: a preset would answer all three already.
    const brief = screen.getByTestId("videowall-led-brief");
    expect(within(brief).getByLabelText("Canvas width")).toBeTruthy();
    expect(within(brief).getByLabelText("Canvas height")).toBeTruthy();
    expect(within(brief).getByRole("group", { name: "LED pixel pitch" })).toBeTruthy();
    expect(within(brief).getByRole("group", { name: "LED cabinet array" })).toBeTruthy();
    expect(within(brief).getByRole("button", { name: "Start the LED brief" })).toBeTruthy();

    // And it stands in front of the wall list rather than beside it.
    const walls = screen.getByTestId("videowall-preset-single-canvas");
    expect(brief.compareDocumentPosition(walls) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("starts an LED design from the canvas, the pitch and the array, then asks how it is fed", () => {
    const onReplace = vi.fn();
    renderWizard(requirements(), { atResult: false, onReplace });

    fireEvent.change(screen.getByLabelText("Canvas width"), { target: { value: "5120" } });
    fireEvent.change(screen.getByLabelText("Canvas height"), { target: { value: "1080" } });
    fireEvent.click(screen.getByRole("button", { name: /^1\.9 mm/ }));
    fireEvent.click(screen.getByRole("button", { name: /^4 × 1/ }));
    // The three answers are one wall: the read-out is millimetres of cabinet.
    expect(screen.getByTestId("videowall-led-brief-readout").textContent).toContain("5120 × 1080 canvas");

    fireEvent.click(screen.getByRole("button", { name: "Start the LED brief" }));

    expect(onReplace).toHaveBeenCalledWith(expect.objectContaining({
      application: "led",
      ledCanvasWidth: 5120,
      ledCanvasHeight: 1080,
      pixelPitchMm: 1.9,
      columns: 4,
      rows: 1,
      sources: 1,
      windows: 1,
      layout: "single",
    }));
    // Not the size step: the brief already answered it, so the next question is
    // the one the canvas cannot answer — who scales it.
    expect(screen.getByTestId("videowall-wizard-step-feeding")).toBeTruthy();
  });

  it("does not start a wall from a canvas that has no pixels", () => {
    renderWizard(requirements(), { atResult: false });

    fireEvent.change(screen.getByLabelText("Canvas width"), { target: { value: "" } });

    expect((screen.getByRole("button", { name: "Start the LED brief" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("videowall-led-brief-readout").textContent).toContain("Enter the canvas in pixels");
  });

  it("puts the way to the questions on the heading line, above a folded wall list", () => {
    renderWizard(requirements(), { atResult: false });

    // The questions come before the walls are read, so a rep on a phone
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

it("asks how the wall is fed after its size and before its windows", () => {
  renderWizard(requirements(), { atResult: false });

  fireEvent.click(screen.getByRole("button", { name: "Answer the questions instead" }));
  fireEvent.click(screen.getByRole("button", { name: /^LCD · feed per display/ }));
  // The size answer comes first, so the connection can talk about a canvas
  // the wall has already been given.
  fireEvent.click(screen.getByRole("button", { name: /^Continue with 2 panels/ }));

  expect(screen.getByTestId("videowall-wizard-step-feeding")).toBeTruthy();
  expect(screen.getByTestId("videowall-feeding-per-panel").getAttribute("aria-pressed")).toBe("true");
  // A per-panel wall is fed per panel: the boxes that compose one canvas are
  // not offered for it, and it is not offered the panel-per-feed note.
  expect(screen.getByTestId("videowall-feed-path-matrix-per-panel")).toBeTruthy();
  expect(screen.queryByTestId("videowall-feed-path-nhd600")).toBeNull();
  expect(screen.getAllByTestId("videowall-feeding-check").map((node) => node.textContent).join(" "))
    .toContain("One output per panel");
});

it("offers an LED canvas the processor, the multiviewers and a custom canvas", () => {
  renderWizard(requirements({ application: "led", columns: 1, rows: 1 }), { atResult: false });

  fireEvent.click(screen.getByRole("button", { name: "Answer the questions instead" }));
  fireEvent.click(screen.getByRole("button", { name: /^LED · processor input/ }));
  fireEvent.click(screen.getByRole("button", { name: /^Continue with 1 panel/ }));

  expect(screen.getByTestId("videowall-feeding-single-input").getAttribute("aria-pressed")).toBe("true");
  expect(screen.queryByTestId("videowall-feeding-per-panel")).toBeNull();
  expect(screen.getByTestId("videowall-feed-path-nhd150")).toBeTruthy();
  expect(screen.getByTestId("videowall-feed-path-nhd600").textContent).toContain("one projector");
  expect(screen.getByTestId("videowall-feed-path-nhd500")).toBeTruthy();
  // The canvas is one processor input, and the processor may compose its own
  // windows — both said on the screen rather than left to the rep to know.
  expect(screen.getAllByTestId("videowall-feeding-check").map((node) => node.textContent).join(" "))
    .toContain("resamples the canvas");
  expect(screen.getByTestId("videowall-feeding-processor-note").textContent).toContain("several HDMI inputs");
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
