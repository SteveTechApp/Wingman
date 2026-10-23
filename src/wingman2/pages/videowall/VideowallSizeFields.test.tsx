import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  defaultWallRequirements,
  wallCanvasPlan,
  wallResolutionBudget,
  type WallRequirements,
} from "../../lib/videowallOptions";
import { VideowallSizeFields } from "./VideowallSizeFields";

function renderFields(overrides: Partial<WallRequirements>) {
  const requirements = { ...defaultWallRequirements, ...overrides };
  const onUpdate = vi.fn();
  render(
    <VideowallSizeFields
      requirements={requirements}
      panels={(requirements.columns ?? 2) * (requirements.rows ?? 2)}
      lcd={requirements.application !== "led" && requirements.application !== "projection"}
      aspectWarning={null}
      budget={wallResolutionBudget(requirements)}
      plan={wallCanvasPlan(requirements)}
      onUpdate={onUpdate}
      onPanels={vi.fn()}
    />,
  );
  return onUpdate;
}

describe("VideowallSizeFields blend overlap", () => {
  it("records the measured overlap on a screen two projectors divide", () => {
    const onUpdate = renderFields({ application: "projection", projectors: 2, layout: "single", windows: 1 });

    // Nothing is measured yet, so the step says what the drawing does instead.
    expect(screen.getByText("The elevation marks the seam until the overlap is measured on site.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Blend overlap at survey (mm)"), { target: { value: "60" } });
    expect(onUpdate).toHaveBeenCalledWith({ blendOverlapMm: 60 });
  });

  it("says the drawing carries a recorded overlap, and clears it back to unmeasured", () => {
    const onUpdate = renderFields({ application: "projection", projectors: 2, blendOverlapMm: 60, layout: "single", windows: 1 });

    expect(screen.getByText("The elevation draws the 60 mm band the images share.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Blend overlap at survey (mm)"), { target: { value: "" } });
    expect(onUpdate).toHaveBeenCalledWith({ blendOverlapMm: undefined });
  });

  it("offers no overlap field for a screen one projector fills", () => {
    renderFields({ application: "projection", projectors: 1, blendOverlapMm: 60, layout: "single", windows: 1 });

    expect(screen.queryByLabelText("Blend overlap at survey (mm)")).toBeNull();
  });
});
