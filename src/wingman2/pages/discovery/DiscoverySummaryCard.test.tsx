import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DiscoverySummaryCard } from "./DiscoverySummaryCard";

describe("DiscoverySummaryCard", () => {
  const decisions = (count: number) => Array.from({ length: count }, (_, index) => ({
    id: `decision-${index + 1}`,
    label: `Decision ${index + 1}`,
    answer: `Answer ${index + 1}`,
    note: "",
  }));

  const renderCompact = (count: number) => render(
    <DiscoverySummaryCard
      items={decisions(count)}
      isDiscoveryComplete={false}
      savedMessage=""
      onMoveNext={vi.fn()}
      onSaveProgress={vi.fn()}
      compact
    />,
  );

  it("expands and collapses a room model with 11 decisions", () => {
    const { container } = renderCompact(11);

    expect(screen.getAllByRole("article")).toHaveLength(6);
    fireEvent.click(screen.getByRole("button", { name: "View all 11 decisions" }));
    expect(screen.getAllByRole("article")).toHaveLength(11);
    expect(container.querySelector(".wm-discovery-summary-card")?.classList.contains("is-expanded")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Collapse model" }));
    expect(screen.getAllByRole("article")).toHaveLength(6);
  });

  it("shows every decision without a toggle when there are six or fewer", () => {
    renderCompact(6);
    expect(screen.getAllByRole("article")).toHaveLength(6);
    expect(screen.queryByText(/View all/)).toBeNull();
  });

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

  it("shows the video wall as configured when the project has a saved configuration", () => {
    render(
      <DiscoverySummaryCard
        items={[{ id: "displays", label: "Displays", answer: "Video wall / LED processor", note: "" }]}
        isDiscoveryComplete={false}
        savedMessage=""
        onMoveNext={vi.fn()}
        onSaveProgress={vi.fn()}
        videoWallRequired
        videoWallConfigured
        onConfigureVideoWall={vi.fn()}
      />,
    );

    expect(screen.getByText("Video wall configured")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Review video wall" })).toBeTruthy();
    expect(screen.queryByText("Video wall configuration required")).toBeNull();
  });
});
