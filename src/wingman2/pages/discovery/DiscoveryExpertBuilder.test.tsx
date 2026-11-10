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
    fireEvent.click(screen.getByRole("button", { name: /Displays & cameras/ }));
    expect(screen.getByRole("heading", { name: "Screens, projectors, camera views, positions and use" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "What are the room's primary display(s)?" })).toBeVisible();
    expect(screen.getByRole("button", { name: /One large flat panel display/ })).toBeVisible();
  });

  it("ends on the decided room reading", () => {
    render(<DiscoveryExpertBuilder questions={getVisibleDiscoveryQuestions("meeting-room", {})}
      answers={{ opportunity: "meeting-room", market: "corporate", "room-occupancy": "12", "display-behaviour": "independent-routing-per-display", "uc-purpose": ["video-conferencing"] }}
      notes={{}} confirmed={{}} topology={createBlankProjectTopology()} issues={[]} onAnswersChange={vi.fn()} onNotesChange={vi.fn()}
      onConfirm={vi.fn()} onConfirmCaptureSuggestion={vi.fn()} onTopologyChange={vi.fn()} onSave={vi.fn()} onExport={vi.fn()} onContinue={vi.fn()} savedMessage="" />);

    fireEvent.click(screen.getByRole("button", { name: /Review & validation/ }));
    expect(screen.getByRole("heading", { name: "The decided room" })).toBeVisible();
    expect(screen.getByText("What this room needs")).toBeVisible();
    expect(screen.getByText("Check on site")).toBeVisible();
    expect(screen.getByText("This changes if")).toBeVisible();
  });
});
