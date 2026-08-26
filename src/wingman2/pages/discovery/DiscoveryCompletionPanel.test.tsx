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
