import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DiscoveryCaptureSuggestion } from "./DiscoveryCaptureSuggestion";
import { getVisibleDiscoveryQuestions } from "./discoveryQuestions";

function stepFor(id: string) {
  const list = getVisibleDiscoveryQuestions("meeting-room", {});
  const question = list.find((candidate) => candidate.id === id);
  if (!question) throw new Error(`Question "${id}" not found`);
  return question;
}

function renderSuggestion(stepId: string, note: string, onConfirm = vi.fn()) {
  const step = stepFor(stepId);
  render(
    <DiscoveryCaptureSuggestion
      step={step}
      view={step}
      note={note}
      onConfirm={onConfirm}
    />,
  );
  return { onConfirm };
}

describe("DiscoveryCaptureSuggestion", () => {
  it("classifies typed free text onto the closest option and confirms it", () => {
    const { onConfirm } = renderSuggestion("opportunity", "it's a boardroom for the exec team");

    expect(screen.getByText(/Meeting room \/ boardroom/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Confirm/i }));
    expect(onConfirm).toHaveBeenCalledWith(["meeting-room"], "high");
  });

  it("dismisses with 'Not this' and reappears only when the wording changes", () => {
    const { onConfirm } = renderSuggestion("opportunity", "a boardroom for the exec team");

    fireEvent.click(screen.getByRole("button", { name: /Not this/i }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByText(/Meeting room \/ boardroom/)).toBeNull();
  });

  it("shows nothing for very short or unrelated wording instead of guessing", () => {
    const { container: short } = render(
      <DiscoveryCaptureSuggestion step={stepFor("sources")} view={stepFor("sources")} note="ok" onConfirm={vi.fn()} />,
    );
    expect(short.querySelector('[data-wingman-capture-suggestion="true"]')).toBeNull();

    const { container: unrelated } = render(
      <DiscoveryCaptureSuggestion step={stepFor("sources")} view={stepFor("sources")} note="purple bananas" onConfirm={vi.fn()} />,
    );
    expect(unrelated.querySelector('[data-wingman-capture-suggestion="true"]')).toBeNull();
  });

  it("suggests multi-select values as a list for UC-style questions", () => {
    // uc-purpose is always visible in the base list.
    const { onConfirm } = renderSuggestion("uc-purpose", "teams calls and recording lectures");
    expect(screen.getByText(/Video conferencing/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Confirm/i }));
    const values = onConfirm.mock.calls[0][0] as string[];
    expect(values).toContain("video-conferencing");
    expect(values).toContain("recording-streaming");
  });

  it("shows a high-confidence level for a strong exclusive match", () => {
    render(
      <DiscoveryCaptureSuggestion
        step={stepFor("audio")}
        view={stepFor("audio")}
        note="no audio at all"
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText("High confidence")).toBeTruthy();
    expect(screen.getByLabelText("Confidence 3 of 3")).toBeTruthy();
  });

  it("shows a mid confidence level for a curated phrase match", () => {
    renderSuggestion("opportunity", "it's a classroom");
    expect(screen.getByText("Matched")).toBeTruthy();
    expect(screen.getByLabelText("Confidence 2 of 3")).toBeTruthy();
  });

  it("flags a single-keyword match as low confidence so reps verify before confirming", () => {
    render(
      <DiscoveryCaptureSuggestion
        step={stepFor("scale")}
        view={stepFor("scale")}
        note="wide"
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText("Low confidence — verify")).toBeTruthy();
    expect(screen.getByLabelText("Confidence 1 of 3")).toBeTruthy();
  });
});
