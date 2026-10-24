import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { DiscoveryConversationItem } from "../features/projects";
import {
  expectResultsWindow,
  turnResultsPage,
} from "../lib/testHelpers/resultsPager";
import { DiscoveryConversationReview } from "./DiscoveryConversationReview";

function captureTrail(count: number, lowThrough: number): DiscoveryConversationItem[] {
  return Array.from({ length: count }, (_, index) => ({
    stepId: `step-${index + 1}`,
    question: `Question ${index + 1}`,
    answer: `Answer ${index + 1}`,
    note: "",
    confirmed: true,
    confidence: index < lowThrough ? "low" : "high",
  }));
}

describe("discovery conversation review paging", () => {
  it("returns to the first page when the confidence filter changes, and leaves the page alone when a row is opened", () => {
    // Ten of the twelve answers came from a partial match, so the narrowed walk
    // still needs two pages — which is what makes the reset observable.
    render(
      <MemoryRouter initialEntries={["/wingman/proposal"]}>
        <DiscoveryConversationReview items={captureTrail(12, 10)} />
      </MemoryRouter>,
    );

    expectResultsWindow(1, 8, 12);
    turnResultsPage(9, 12, 12);
    expect(screen.getByText("Question 9")).toBeTruthy();
    expect(screen.queryByText("Question 1")).toBeNull();

    // Opening the answer behind a row is not narrowing the walk, so the rep
    // stays on the page they were reading.
    fireEvent.click(screen.getByRole("link", { name: 'Edit "Question 9" in Discovery' }));
    expectResultsWindow(9, 12, 12);
    expect(screen.getByText("Question 9")).toBeTruthy();

    // "Needs checking" is a filter, so the walk returns to its first page even
    // though the narrowed list has a second page of its own.
    fireEvent.click(screen.getByRole("button", { name: "Needs checking (10)" }));
    expectResultsWindow(1, 8, 10);
    expect(screen.getByText("Question 1")).toBeTruthy();
    expect(screen.queryByText("Question 9")).toBeNull();

    turnResultsPage(9, 10, 10);
    expect(screen.getByText("Question 9")).toBeTruthy();

    // Reading the full walk again is another filter change: it opens on the
    // first page rather than the page last read.
    fireEvent.click(screen.getByRole("button", { name: "All (12)" }));
    expectResultsWindow(1, 8, 12);
    expect(screen.getByText("Question 1")).toBeTruthy();
    expect(screen.queryByText("Question 12")).toBeNull();
  });
});
