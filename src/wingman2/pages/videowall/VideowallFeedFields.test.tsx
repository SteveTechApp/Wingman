import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { defaultWallRequirements } from "../../lib/videowallOptions";
import { VideowallFeedFields } from "./VideowallFeedFields";

describe("VideowallFeedFields", () => {
  it("sets the feed count and states which panels each feed drives", () => {
    const onChange = vi.fn();
    render(
      <VideowallFeedFields
        requirements={{ ...defaultWallRequirements, application: "lcd-grouped", columns: 3, rows: 3, displayFeeds: 3 }}
        onChange={onChange}
      />,
    );

    // Nine panels offer nine counts, and the line underneath is the grouping the
    // transport table will quote cable for.
    expect(screen.getAllByRole("button")).toHaveLength(9);
    expect(screen.getByText(/Feed 1 · panels 1–3 · Feed 2 · panels 4–6 · Feed 3 · panels 7–9/)).toBeTruthy();
    expect(screen.getByText(/3 feeds to the displays: each driving a group of displays/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /4\s*feeds/ }));
    expect(onChange).toHaveBeenCalledWith({ displayFeeds: 4 });
  });

  it("marks the count the design is wired on", () => {
    render(
      <VideowallFeedFields
        requirements={{ ...defaultWallRequirements, application: "lcd-grouped", columns: 2, rows: 2 }}
        onChange={() => undefined}
      />,
    );

    // Unset falls back to one feed per row, so that is the pressed count.
    const pressed = screen.getAllByRole("button").filter((button) => button.getAttribute("aria-pressed") === "true");
    expect(pressed).toHaveLength(1);
    expect(pressed[0].textContent).toContain("2");
  });
});
