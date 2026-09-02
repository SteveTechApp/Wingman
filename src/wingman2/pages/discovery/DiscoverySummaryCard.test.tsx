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

  it("lets the rep confirm a captured decision with the customer", () => {
    const onToggle = vi.fn();
    render(
      <DiscoverySummaryCard
        items={[
          { id: "opportunity", label: "Application", answer: "Meeting room / boardroom", note: "The exec boardroom.", confirmed: true },
          { id: "scale", label: "Room / system scale", answer: "Single large room", note: "" },
        ]}
        isDiscoveryComplete={false}
        savedMessage=""
        onMoveNext={vi.fn()}
        onSaveProgress={vi.fn()}
        onToggleConfirmed={onToggle}
      />,
    );

    // Confirmed row shows the settled badge; open row offers the confirm action.
    const confirmedButton = screen.getByRole("button", { name: "Confirmed" });
    expect(confirmedButton.getAttribute("aria-pressed")).toBe("true");
    const openButton = screen.getByRole("button", { name: "Confirm with customer" });
    expect(openButton.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(openButton);
    expect(onToggle).toHaveBeenCalledWith("scale");
  });

  it("surfaces a stranded quick-start default and jumps to its step", () => {
    const onOpenStrandedStep = vi.fn();
    render(
      <DiscoverySummaryCard
        items={[{ id: "displays", label: "Displays", answer: "One display", note: "" }]}
        isDiscoveryComplete={false}
        savedMessage=""
        onMoveNext={vi.fn()}
        onSaveProgress={vi.fn()}
        compact
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

    expect(screen.getByText(/Pre-filled answer no longer fits/)).toBeTruthy();
    expect(screen.getByText("Different content by display or zone")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open Display behaviour" }));
    expect(onOpenStrandedStep).toHaveBeenCalledWith("display-behaviour");
  });

  it("clears every stranded default with the remove action", () => {
    const onRemoveStranded = vi.fn();
    render(
      <DiscoverySummaryCard
        items={[{ id: "displays", label: "Displays", answer: "One display", note: "" }]}
        isDiscoveryComplete={false}
        savedMessage=""
        onMoveNext={vi.fn()}
        onSaveProgress={vi.fn()}
        compact
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

  it("surfaces answers still following the previous application profile", () => {
    const onOpenStrandedStep = vi.fn();
    render(
      <DiscoverySummaryCard
        items={[{ id: "displays", label: "Displays", answer: "Two displays", note: "" }]}
        isDiscoveryComplete={false}
        savedMessage=""
        onMoveNext={vi.fn()}
        onSaveProgress={vi.fn()}
        compact
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
        onOpenStrandedStep={onOpenStrandedStep}
      />,
    );

    expect(screen.getByText(/Answers still follow the Teaching \/ classroom profile/)).toBeTruthy();
    expect(screen.getByText(/The Meeting \/ conference room profile uses 1 display \/ output/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open Display count" }));
    expect(onOpenStrandedStep).toHaveBeenCalledWith("displays");
  });

  it("renders no stranded-default notice when the list is empty", () => {
    const { container } = renderCompact(3);
    expect(container.querySelector(".wm-discovery-stranded-defaults")).toBeNull();
  });
});
