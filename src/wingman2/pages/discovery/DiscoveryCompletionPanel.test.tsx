import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DiscoveryCompletionPanel } from "./DiscoveryCompletionPanel";

function renderPanel(options: { pending?: boolean; configured?: boolean; onExportBrief?: () => void } = {}) {
  render(
    <DiscoveryCompletionPanel
      panelRef={createRef<HTMLElement>()}
      answerCount={13}
      requiresVideoWallConfiguration={options.pending ?? false}
      videoWallConfigured={options.configured ?? false}
      savedMessage=""
      onMoveForward={vi.fn()}
      onReviewAnswers={vi.fn()}
      onSave={vi.fn()}
      onExportBrief={options.onExportBrief}
    />,
  );
}

describe("DiscoveryCompletionPanel video wall state", () => {
  it("advances to product matching when the video wall is already configured", () => {
    renderPanel({ configured: true });

    expect(screen.getByText("Your room and video wall briefs are ready.")).toBeTruthy();
    expect(screen.getByText("Video wall configuration captured")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Next: find matching products/i })).toBeTruthy();
    expect(screen.queryByText("Configure the video wall")).toBeNull();
  });

  it("keeps configuration as the next step when the video wall is pending", () => {
    renderPanel({ pending: true });

    expect(screen.getByText("Configure the video wall")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Next: configure video wall/i })).toBeTruthy();
  });

  it("offers the discovery brief export and fires it when clicked", () => {
    const onExportBrief = vi.fn();
    renderPanel({ onExportBrief });

    const button = screen.getByRole("button", { name: /Export discovery brief/i });
    expect(button).toBeTruthy();
    fireEvent.click(button);
    expect(onExportBrief).toHaveBeenCalledTimes(1);
  });

  it("hides the discovery brief export when no handler is wired", () => {
    renderPanel();
    expect(screen.queryByRole("button", { name: /Export discovery brief/i })).toBeNull();
  });
});

describe("DiscoveryCompletionPanel stranded quick-start defaults", () => {
  it("surfaces the conflict at completion with the owning question", () => {
    render(
      <DiscoveryCompletionPanel
        panelRef={createRef<HTMLElement>()}
        answerCount={13}
        requiresVideoWallConfiguration={false}
        videoWallConfigured={false}
        savedMessage=""
        onMoveForward={vi.fn()}
        onReviewAnswers={vi.fn()}
        onSave={vi.fn()}
        strandedQuickStart={[
          {
            questionId: "display-behaviour",
            questionLabel: "Display behaviour",
            optionValue: "independent-routing-per-display",
            optionLabel: "Different content by display or zone",
          },
        ]}
      />,
    );

    expect(screen.getByText("Pre-filled answer no longer fits your current answers")).toBeTruthy();
    expect(screen.getByText("Different content by display or zone")).toBeTruthy();
    // The question name renders inside an <em>; assert the element itself.
    expect(screen.getByText("Display behaviour")).toBeTruthy();
  });

  it("jumps to the step owning a stranded default", () => {
    const onOpenStrandedStep = vi.fn();
    render(
      <DiscoveryCompletionPanel
        panelRef={createRef<HTMLElement>()}
        answerCount={13}
        requiresVideoWallConfiguration={false}
        videoWallConfigured={false}
        savedMessage=""
        onMoveForward={vi.fn()}
        onReviewAnswers={vi.fn()}
        onSave={vi.fn()}
        strandedQuickStart={[
          {
            questionId: "display-behaviour",
            questionLabel: "Display behaviour",
            optionValue: "independent-routing-per-display",
            optionLabel: "Different content by display or zone",
          },
        ]}
        onOpenStrandedStep={onOpenStrandedStep}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Display behaviour" }));
    expect(onOpenStrandedStep).toHaveBeenCalledWith("display-behaviour");
  });

  it("clears every stranded default when the remove action is chosen", () => {
    const onRemoveStranded = vi.fn();
    render(
      <DiscoveryCompletionPanel
        panelRef={createRef<HTMLElement>()}
        answerCount={13}
        requiresVideoWallConfiguration={false}
        videoWallConfigured={false}
        savedMessage=""
        onMoveForward={vi.fn()}
        onReviewAnswers={vi.fn()}
        onSave={vi.fn()}
        strandedQuickStart={[
          {
            questionId: "display-behaviour",
            questionLabel: "Display behaviour",
            optionValue: "independent-routing-per-display",
            optionLabel: "Different content by display or zone",
          },
        ]}
        onRemoveStranded={onRemoveStranded}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove stranded answers" }));
    expect(onRemoveStranded).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when no default is stranded", () => {
    const { container } = render(
      <DiscoveryCompletionPanel
        panelRef={createRef<HTMLElement>()}
        answerCount={13}
        requiresVideoWallConfiguration={false}
        videoWallConfigured={false}
        savedMessage=""
        onMoveForward={vi.fn()}
        onReviewAnswers={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(container.querySelector(".wm-discovery-stranded-defaults")).toBeNull();
  });

  it("surfaces quick-start answers still following the previous application profile", () => {
    render(
      <DiscoveryCompletionPanel
        panelRef={createRef<HTMLElement>()}
        answerCount={13}
        requiresVideoWallConfiguration={false}
        videoWallConfigured={false}
        savedMessage=""
        onMoveForward={vi.fn()}
        onReviewAnswers={vi.fn()}
        onSave={vi.fn()}
        applicationDrift={{
          previousApplication: "classroom",
          application: "meeting-room",
          items: [
            {
              questionId: "displays",
              questionLabel: "Display count",
              roomText: "Two displays",
              standardText: "1 display / output",
              reason: "differs-from-new-standard",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText(/Answers still follow the Teaching \/ classroom profile/)).toBeTruthy();
    expect(screen.getByText(/The Meeting \/ conference room profile uses 1 display \/ output/)).toBeTruthy();
  });
});
