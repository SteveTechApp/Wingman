import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { decideVideowall, wallStartPresets } from "../../lib/videowallDecision";
import { assessVideowallOptions, defaultWallRequirements, type WallRequirements } from "../../lib/videowallOptions";
import { wallStartingPointOrigin, type WallStartingPointOrigin } from "../../lib/wallStartingPointOrigin";
import { wallOptionWithVariant } from "../../lib/wallVariants";
import type { WallReviewStageKey } from "../../lib/videowallWizard";
import { VideowallExpertReview } from "./VideowallExpertReview";

/** The builder owns the pass; the harness holds it the way the page does. */
function ExpertReviewHarness({ requirements, initialStage, startingPoint }: {
  requirements: WallRequirements;
  initialStage: WallReviewStageKey;
  startingPoint?: WallStartingPointOrigin;
}) {
  const [reviewStage, setReviewStage] = useState<WallReviewStageKey>(initialStage);
  // The page owns the build and swaps the design's schedule; the harness does
  // the same so a chip click is tested through the component that renders it.
  const [variantId, setVariantId] = useState("");
  const options = assessVideowallOptions(requirements);
  const decision = decideVideowall(requirements);
  const chosen = decision.recommended?.option ?? null;
  return (
    <VideowallExpertReview
      requirements={requirements}
      decision={decision}
      selected={chosen ? wallOptionWithVariant(chosen, variantId) : null}
      options={options}
      recommendedId={decision.recommended?.option.id ?? null}
      variantId={variantId}
      onVariant={setVariantId}
      startingPoint={startingPoint}
      reviewStage={reviewStage}
      onReviewStage={setReviewStage}
      onPickPreset={vi.fn()}
      onUpdate={vi.fn()}
      onChoosePanels={vi.fn()}
      onChooseLayout={vi.fn()}
      onMeasure={vi.fn()}
      onApplyMeasuredRuns={vi.fn()}
      onUse={vi.fn()}
      onUnblock={vi.fn()}
      onApply={vi.fn()}
      onSelect={vi.fn()}
    />
  );
}

function renderReview(
  overrides: Partial<WallRequirements> = {},
  stage: WallReviewStageKey = "decision",
  startingPoint?: WallStartingPointOrigin,
) {
  render(
    <ExpertReviewHarness
      requirements={{ ...defaultWallRequirements, ...overrides }}
      initialStage={stage}
      startingPoint={startingPoint}
    />,
  );
}

describe("VideowallExpertReview", () => {
  it("opens on the design pass, with the drawing and transport table on their own passes", () => {
    renderReview();

    expect(screen.getByTestId("videowall-expert-panel-decision")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "The wall" })).toBeTruthy();
    // The whole point of the passes: neither the drawing nor the cable table
    // is stacked under the answers.
    expect(screen.queryByTestId("videowall-expert-panel-wall")).toBeNull();
    expect(screen.queryByTestId("videowall-transport")).toBeNull();
  });

  it("shows one band of the design pass at a time", () => {
    renderReview();

    // The picker is the band the pass opens on; the answer, the questions and
    // the catalogue are not on the page until the rail is asked for them.
    expect(screen.getByTestId("videowall-band-panel-start")).toBeTruthy();
    expect(screen.queryByTestId("videowall-band-panel-answer")).toBeNull();
    expect(screen.queryByTestId("videowall-band-panel-questions")).toBeNull();
    expect(screen.queryByTestId("videowall-band-panel-options")).toBeNull();

    fireEvent.click(screen.getByTestId("videowall-band-options"));
    expect(screen.getByTestId("videowall-options")).toBeTruthy();
    expect(screen.queryByTestId("videowall-band-panel-start")).toBeNull();
    expect(screen.getByTestId("videowall-band-options").getAttribute("aria-pressed")).toBe("true");
  });

  it("walks the bands in order and leaves the pass from the last one", () => {
    renderReview();

    fireEvent.click(screen.getByRole("button", { name: "Continue to the answer" }));
    expect(screen.getByTestId("videowall-band-panel-answer")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Continue to the questions" }));
    expect(screen.getByTestId("videowall-band-panel-questions")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Back to the answer" }));
    expect(screen.getByTestId("videowall-band-panel-answer")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Continue to the questions" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue to every option" }));
    expect(screen.getByTestId("videowall-band-panel-options")).toBeTruthy();

    // The last band is the only one that leaves for the drawing.
    fireEvent.click(screen.getByRole("button", { name: "Continue to the wall" }));
    expect(screen.getByTestId("videowall-expert-panel-wall")).toBeTruthy();
  });

  it("reads the questions as lines until one is opened", () => {
    renderReview();
    fireEvent.click(screen.getByTestId("videowall-band-questions"));

    // Each line carries the question and the answer in use, so the brief is
    // readable without opening anything and the answers do not compete with the
    // wall above them.
    const step = screen.getByTestId("videowall-step-1");
    expect(step.hasAttribute("open")).toBe(false);
    expect(step.textContent).toContain("What is going on the wall?");
    expect(step.textContent).toContain("LCD · feed per display");

    fireEvent.click(step.querySelector("summary")!);
    expect(step.hasAttribute("open")).toBe(true);
    expect(screen.getByRole("group", { name: "Display application" })).toBeTruthy();
  });

  it("folds the pre-order checklist to its count", () => {
    renderReview();
    fireEvent.click(screen.getByTestId("videowall-band-answer"));

    const checklist = screen.getByText("Confirm before ordering").closest("details");
    expect(checklist?.hasAttribute("open")).toBe(false);
    expect(checklist?.querySelector("summary")?.textContent).toMatch(/\d+ checks/);
  });

  it("names the card the answers started from beside the picker", () => {
    const card = wallStartPresets.find((preset) => preset.key === "led-ribbon")!;
    renderReview({ ...card.requirements, sources: card.requirements.sources + 1 }, "decision", wallStartingPointOrigin(card));

    const panel = screen.getByTestId("videowall-starting-point");
    expect(panel.textContent).toContain(card.label);
    expect(panel.textContent).toContain(`1 answer changed since you picked ${card.label}.`);
  });

  it("shows no provenance on a wall answered from scratch", () => {
    renderReview();

    expect(screen.queryByTestId("videowall-starting-point")).toBeNull();
  });

  it("opens on the pass the builder hands it, so a remembered transport reading survives", () => {
    renderReview({}, "transport");

    expect(screen.getByTestId("videowall-expert-panel-transport")).toBeTruthy();
    expect(screen.queryByTestId("videowall-expert-panel-decision")).toBeNull();
    expect(screen.getByTestId("videowall-review-transport").getAttribute("aria-pressed")).toBe("true");
  });

  it("moves the drawing and then the transport table into view, one at a time", () => {
    renderReview();

    fireEvent.click(screen.getByTestId("videowall-review-wall"));
    expect(screen.getByTestId("videowall-expert-panel-wall")).toBeTruthy();
    expect(screen.getByText("Wall elevation")).toBeTruthy();
    expect(screen.queryByTestId("videowall-expert-panel-decision")).toBeNull();
    expect(screen.queryByTestId("videowall-transport")).toBeNull();

    fireEvent.click(screen.getByTestId("videowall-review-transport"));
    expect(screen.getByTestId("videowall-expert-panel-transport")).toBeTruthy();
    expect(screen.getByTestId("videowall-transport")).toBeTruthy();
    expect(screen.queryByTestId("videowall-expert-panel-wall")).toBeNull();

    // The stage buttons say which pass is open, like the guided result's rail.
    expect(screen.getByTestId("videowall-review-transport").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("videowall-review-wall").getAttribute("aria-pressed")).toBe("false");
  });

  it("walks the passes with the same back and continue actions as the guided result", () => {
    renderReview({}, "wall");

    fireEvent.click(screen.getByRole("button", { name: "Continue to transport" }));
    expect(screen.getByTestId("videowall-expert-panel-transport")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Back to the wall" }));
    expect(screen.getByTestId("videowall-expert-panel-wall")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Back to the design" }));
    expect(screen.getByTestId("videowall-expert-panel-decision")).toBeTruthy();
  });
});
