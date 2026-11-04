import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createBlankProjectTopology } from "../../lib/projectTopology";
import { getVisibleDiscoveryQuestions } from "./discoveryQuestions";
import { DiscoveryExpertBuilder } from "./DiscoveryExpertBuilder";

describe("expert room builder", () => {
  it("groups the shared discovery questions into editable engineering sections", () => {
    const onAnswersChange = vi.fn();
    render(<DiscoveryExpertBuilder questions={getVisibleDiscoveryQuestions("meeting-room", {})} answers={{}} notes={{}} confirmed={{}}
      topology={createBlankProjectTopology()} issues={[]} onAnswersChange={onAnswersChange} onNotesChange={vi.fn()}
      onConfirm={vi.fn()} onConfirmCaptureSuggestion={vi.fn()} onTopologyChange={vi.fn()} onSave={vi.fn()} onExport={vi.fn()} onContinue={vi.fn()} savedMessage="" />);

    expect(screen.getByRole("region", { name: "Expert room design" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Switching & signal distribution/ }));
    expect(screen.getByRole("heading", { name: /Source and output positions/ })).toBeVisible();
    expect(screen.getByRole("heading", { name: "How many source positions are likely?" })).toBeVisible();
    expect(screen.getByRole("button", { name: /2-4 sources/ })).toBeVisible();
  });

  it("ends on the decided room the capture describes", () => {
    render(<DiscoveryExpertBuilder questions={getVisibleDiscoveryQuestions("meeting-room", {})}
      answers={{ opportunity: "meeting-room", "display-behaviour": "independent-routing-per-display", "uc-purpose": ["video-conferencing"] }}
      notes={{}} confirmed={{}} topology={createBlankProjectTopology()} issues={[]} onAnswersChange={vi.fn()} onNotesChange={vi.fn()}
      onConfirm={vi.fn()} onConfirmCaptureSuggestion={vi.fn()} onTopologyChange={vi.fn()} onSave={vi.fn()} onExport={vi.fn()} onContinue={vi.fn()} savedMessage="" />);

    fireEvent.click(screen.getByRole("button", { name: /Review & validation/ }));
    // The same reading the focused brief ends on: the type, what it needs and
    // the reason, what to check, and what would change the answer.
    expect(screen.getByRole("heading", { name: "The decided room" })).toBeVisible();
    expect(screen.getByText("What this room needs")).toBeVisible();
    expect(screen.getByText("Check on site")).toBeVisible();
    expect(screen.getByText("This changes if")).toBeVisible();
  });
});
