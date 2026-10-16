import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DiscoveryEssentialCapture } from "./DiscoveryEssentialCapture";
import { baseDiscoveryQuestions } from "./discoveryQuestions";
import type { DiscoveryAnswers, DiscoveryNotes } from "./discoveryTypes";

describe("essential capture", () => {
  it("edits saved details together and proceeds without confirming every answer", () => {
    const onContinue = vi.fn();
    const onChanged = vi.fn();
    function Capture() {
      const [answers, setAnswers] = useState<DiscoveryAnswers>({ displays: "two-displays", "room-dimensions": "8 × 6 metres" });
      const [notes, setNotes] = useState<DiscoveryNotes>({ opportunity: "Use the existing room displays" });
      return <DiscoveryEssentialCapture questions={baseDiscoveryQuestions.filter(question => ["sources", "displays"].includes(question.id))} answers={answers} notes={notes} onAnswersChange={setAnswers} onNotesChange={setNotes} onChanged={onChanged} onSave={vi.fn()} onContinue={onContinue} onDetails={vi.fn()} />;
    }
    render(<Capture />);
    expect(screen.getByDisplayValue("8 × 6 metres")).toBeVisible();
    expect(screen.getByDisplayValue("Use the existing room displays")).toBeVisible();
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "one-source" } });
    expect(onChanged).toHaveBeenCalledWith("sources");
    expect(screen.queryByLabelText(/Confirmed with/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Find WyreStorm products" }));
    expect(onContinue).toHaveBeenCalledOnce();
  });
});
