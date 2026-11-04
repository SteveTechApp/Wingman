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
  { atResult = true }: { atResult?: boolean } = {},
) {
  const onChange = vi.fn();
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
        onChange={onChange}
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
  return { onChange };
}

describe("VideowallWizard start step", () => {
  it("starts with a wall type question and proceeds through the Q&A", () => {
    renderWizard(requirements(), { atResult: false });

    expect(screen.getByTestId("videowall-wizard-step-picture")).toBeTruthy();
    expect(screen.getByRole("list", { name: "Wizard progress" }).textContent).toContain("Wall type");
    expect(screen.queryByTestId("videowall-preset-single-canvas")).toBeNull();
  });

  it("asks for the LED canvas, pitch and cabinet array as the next answer", () => {
    renderWizard(requirements({ application: "led", columns: 4, rows: 1 }), { atResult: false });
    fireEvent.click(screen.getByRole("button", { name: /^LED · processor input/ }));
    expect(screen.getByTestId("videowall-wizard-step-size")).toBeTruthy();
    expect(screen.getByLabelText("Canvas width")).toBeTruthy();
    expect(screen.getByLabelText("Canvas height")).toBeTruthy();
    expect(screen.getByLabelText("Columns")).toBeTruthy();
    expect(screen.getByLabelText("Rows")).toBeTruthy();
  });
});

it("asks how the wall is fed after its size and before its windows", () => {
  renderWizard(requirements({ network: "1g", networkProvision: "existing" }), { atResult: false });

  fireEvent.click(screen.getByRole("button", { name: /^LCD · feed per display/ }));
  // The size answer comes first, then the sources it carries, so the connection
  // can talk about a canvas the wall has already been given.
  fireEvent.click(screen.getByTestId("videowall-wizard-size-next"));
  expect(screen.getByTestId("videowall-wizard-step-sources")).toBeTruthy();
  fireEvent.click(screen.getByTestId("videowall-wizard-sources-next"));
  expect(screen.getByTestId("videowall-wizard-step-network")).toBeTruthy();
  fireEvent.click(screen.getByTestId("videowall-wizard-network-next"));

  expect(screen.getByTestId("videowall-wizard-step-feeding")).toBeTruthy();
  expect(screen.getByTestId("videowall-feeding-per-panel").getAttribute("aria-pressed")).toBe("true");
  // A per-panel wall is fed per panel: the boxes that compose one canvas are
  // not offered for it, and it is not offered the panel-per-feed note.
  expect(screen.getByTestId("videowall-feed-path-matrix-per-panel")).toBeTruthy();
  expect(screen.queryByTestId("videowall-feed-path-nhd600")).toBeNull();
  expect(screen.getAllByTestId("videowall-feeding-check").map((node) => node.textContent).join(" "))
    .toContain("One decoder per panel");
});

it("offers an LED canvas the processor, the multiviewers and a custom canvas", () => {
  renderWizard(requirements({ application: "led", columns: 1, rows: 1, network: "1g", networkProvision: "existing" }), { atResult: false });

  fireEvent.click(screen.getByRole("button", { name: /^LED · processor input/ }));
  fireEvent.click(screen.getByTestId("videowall-wizard-size-next"));
  fireEvent.click(screen.getByTestId("videowall-wizard-sources-next"));
  fireEvent.click(screen.getByTestId("videowall-wizard-network-next"));

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

it("asks source count and network provision on separate screens", () => {
  const { onChange } = renderWizard(requirements(), { atResult: false });

  // The rail is the ladder: the wall's type decides which questions exist, so it
  // is asked before the wall's size; the sources follow the box they fill, and
  // the layout comes after the connection that decides who composes them.
  const rail = screen.getByRole("list", { name: "Wizard progress" });
  expect(within(rail).getAllByRole("listitem").map((item) => item.textContent?.replace(/^\d/, "")))
    .toEqual(["Wall type", "Size and pixels", "Sources", "Network", "Connection", "Layout", "The design", "Must-haves"]);
  expect(screen.getByTestId("videowall-wizard-step-picture")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: /^LCD · feed per display/ }));
  // The size screen stops at the box: the survey that once made it the longest
  // page in the builder belongs to the result, not to a question.
  expect(screen.getByTestId("videowall-wizard-step-size")).toBeTruthy();
  expect(screen.queryByTestId("videowall-transport")).toBeNull();

  fireEvent.click(screen.getByTestId("videowall-wizard-size-next"));
  expect(screen.getByTestId("videowall-wizard-step-sources")).toBeTruthy();
  expect(screen.getByRole("group", { name: "Source count" })).toBeTruthy();
  expect(screen.getByRole("group", { name: "Source timing" })).toBeTruthy();
  expect(screen.queryByRole("group", { name: "Network provision" })).toBeNull();

  fireEvent.click(screen.getByTestId("videowall-wizard-sources-next"));
  expect(screen.getByTestId("videowall-wizard-step-network")).toBeTruthy();
  const network = screen.getByRole("group", { name: "Network provision" });
  expect(within(network).getAllByRole("button").map((button) => button.querySelector("strong")?.textContent))
    .toEqual([
      "Use an existing 1Gb network",
      "Use an existing 10Gb network",
      "Supply new 1Gb network switches",
      "Supply new 10Gb network switches",
      "Do not use AVoIP",
    ]);
  expect(screen.getByTestId("videowall-wizard-network-next")).toBeDisabled();
  fireEvent.click(within(network).getByRole("button", { name: /Supply new 10Gb network switches/ }));
  expect(onChange).toHaveBeenLastCalledWith({ sourceLocation: "distributed", network: "10g", networkProvision: "new" });
  fireEvent.click(within(network).getByRole("button", { name: /Do not use AVoIP/ }));
  expect(onChange).toHaveBeenLastCalledWith({
    sourceLocation: "local",
    network: "none",
    networkProvision: undefined,
    multiviewSelected: false,
  });
});

it("records a selected multiview feed path for the layout question", () => {
  const { onChange } = renderWizard(requirements({
    application: "lcd-loop",
    network: "1g",
    networkProvision: "existing",
  }), { atResult: false });

  fireEvent.click(screen.getByRole("button", { name: /^LCD · looped \/ tiled/ }));
  fireEvent.click(screen.getByTestId("videowall-wizard-size-next"));
  fireEvent.click(screen.getByTestId("videowall-wizard-sources-next"));
  fireEvent.click(screen.getByTestId("videowall-wizard-network-next"));
  fireEvent.click(screen.getByTestId("videowall-feed-path-nhd150"));

  expect(onChange).toHaveBeenLastCalledWith({
    sourceLocation: "distributed",
    network: "1g",
    multiviewSelected: true,
  });
});

it("greys out non-multiview layouts while a multiview feed is selected", () => {
  renderWizard(requirements({
    network: "1g",
    networkProvision: "existing",
    multiviewSelected: true,
  }), { atResult: false });

  fireEvent.click(screen.getByRole("button", { name: /^LCD · feed per display/ }));
  fireEvent.click(screen.getByTestId("videowall-wizard-size-next"));
  fireEvent.click(screen.getByTestId("videowall-wizard-sources-next"));
  fireEvent.click(screen.getByTestId("videowall-wizard-network-next"));
  fireEvent.click(screen.getByRole("button", { name: /Continue with/ }));

  expect(screen.getByTestId("videowall-wizard-step-layout")).toBeTruthy();
  expect(screen.getByRole("button", { name: /One picture, full wall/ })).toBeDisabled();
  expect(screen.getByRole("button", { name: /A different source per screen/ })).toBeDisabled();
  expect(screen.getByRole("button", { name: /Two sources together/ })).not.toBeDisabled();
  expect(screen.getByTestId("videowall-wizard-layout-keep")).toBeDisabled();
});
