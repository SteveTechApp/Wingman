import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DiscoveryCompletionPanel } from "./DiscoveryCompletionPanel";

function renderPanel(options: { pending?: boolean; configured?: boolean } = {}) {
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
});
