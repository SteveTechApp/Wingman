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
    fireEvent.click(screen.getByRole("button", { name: /Sources/ }));
    expect(screen.getByRole("heading", { name: "Devices, user connections and source positions" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "How many source positions are likely?" })).toBeVisible();
    expect(screen.getByRole("button", { name: /2-4 sources/ })).toBeVisible();
  });
});
