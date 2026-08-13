import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DiscoverySummaryCard } from "./DiscoverySummaryCard";

describe("DiscoverySummaryCard", () => {
  it("activates video wall configuration when discovery requires a wall", () => {
    const configure = vi.fn();

    render(
      <DiscoverySummaryCard
        items={[{ id: "displays", label: "Displays", answer: "Video wall / LED processor", note: "" }]}
        isDiscoveryComplete={false}
        savedMessage=""
        onMoveNext={vi.fn()}
        onSaveProgress={vi.fn()}
        videoWallRequired
        onConfigureVideoWall={configure}
      />,
    );

    expect(screen.getByText("Video wall configuration required")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Configure video wall" }));
    expect(configure).toHaveBeenCalledOnce();
  });
});
