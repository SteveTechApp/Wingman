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
      const [answers, setAnswers] = useState<DiscoveryAnswers>({ displays: "two-displays", "room-length": "8", "room-width": "6", "room-height": "3.2", "room-layout": "24 seats around a table" });
      const [notes, setNotes] = useState<DiscoveryNotes>({ opportunity: "Use the existing room displays" });
      return <DiscoveryEssentialCapture questions={baseDiscoveryQuestions.filter(question => ["opportunity", "sources", "displays"].includes(question.id))} answers={answers} notes={notes} onAnswersChange={setAnswers} onNotesChange={setNotes} onChanged={onChanged} onSave={vi.fn()} onContinue={onContinue} onDetails={vi.fn()} />;
    }
    render(<Capture />);
    expect(screen.getByLabelText("Length (m)")).toHaveValue(8);
    expect(screen.getByLabelText("Width (m)")).toHaveValue(6);
    expect(screen.getByLabelText("Height (m)")).toHaveValue(3.2);
    expect(screen.getByDisplayValue("24 seats around a table")).toBeVisible();
    expect(screen.getByDisplayValue("Use the existing room displays")).toBeVisible();
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Next: Sources & displays" }));
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "one-source" } });
    expect(onChanged).toHaveBeenCalledWith("sources");
    expect(screen.queryByLabelText(/Confirmed with/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Find WyreStorm products" }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("shows inferred lecture-theatre capacity as an estimate and leaves dimensions open", () => {
    render(<DiscoveryEssentialCapture
      questions={baseDiscoveryQuestions.filter(question => ["opportunity", "scale"].includes(question.id))}
      answers={{ opportunity: "classroom", scale: "single-large-room", "room-occupancy": "100" }}
      notes={{ "room-occupancy": "Starting estimate from Education · Lecture theatre: the capacity is approximate." }}
      onAnswersChange={vi.fn()} onNotesChange={vi.fn()} onChanged={vi.fn()} onSave={vi.fn()}
      onContinue={vi.fn()} onDetails={vi.fn()}
    />);
    expect(screen.getByLabelText(/Expected number of people \(starting estimate\)/)).toHaveValue(100);
    expect(screen.getByText(/capacity is approximate/)).toBeVisible();
    expect(screen.getByLabelText("Length (m)")).toHaveValue(null);
    expect(screen.getByLabelText("Width (m)")).toHaveValue(null);
    expect(screen.getByLabelText("Height (m)")).toHaveValue(null);
  });
});
