import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { roomTemplates } from "../wingman2/lib/roomTemplates";
import { TemplateReviewPage } from "../wingman2/pages/TemplateReviewPage";

/**
 * The run a rep measures belongs to the export, not only to the room brief: a
 * receiver quoted on a span past its rating cannot carry the link, so the room
 * design page has to be the place that says the document is held — the brief's
 * own note is a sentence, and a sentence is not a stop.
 */
const teachingRoom = roomTemplates.find((template) => template.id === "education-classroom-hdbaset")!;

function renderRoom() {
  render(
    <MemoryRouter initialEntries={[`/wingman/templates/${teachingRoom.id}`]}>
      <Routes>
        <Route path="/wingman/templates/:templateId" element={<TemplateReviewPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function recordRun(metres: string) {
  fireEvent.click(screen.getByRole("button", { name: "Edit room brief" }));
  fireEvent.change(screen.getByLabelText("Longest surveyed display run (m)"), {
    target: { value: metres },
  });
  fireEvent.click(screen.getByRole("tab", { name: "Proposal" }));
}

describe("template display run export gate", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("holds the proposal when the survey measures past the longest receiver", () => {
    renderRoom();
    recordRun("130");

    // The walk opens on the blockers, and this is the one the run raised.
    expect(screen.getByTestId("template-preissue-panel-blockers")).toBeTruthy();
    expect(screen.getByText(/beyond the 100 m rating of the longest HDBaseT receiver/)).toBeTruthy();
    expect(screen.getByText(/cannot carry this link on its own/)).toBeTruthy();
    // The action is held, so the document cannot leave around the survey.
    const exportAction = screen.getByRole("button", { name: "Export proposal" }) as HTMLButtonElement;
    expect(exportAction.disabled).toBe(true);
    expect(exportAction.title).toContain("Export blocked");
    // The fix names the change that clears it, not only the shortfall.
    expect(screen.getByText(/mid-span repeater or a fibre extender pair/)).toBeTruthy();
  });

  it("clears the block in one action by scheduling the mid-span repeater and recording the span", () => {
    renderRoom();
    recordRun("130");

    // The action says what the click will do before it is taken.
    expect(screen.getByText(/2 spans of 65 m/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Schedule the mid-span repeater" }));

    // The document is released, and the block is gone rather than restated.
    expect(screen.queryByText(/cannot carry this link on its own/)).toBeNull();
    const exportAction = screen.getByRole("button", { name: "Export proposal" }) as HTMLButtonElement;
    expect(exportAction.disabled).toBe(false);

    // The schedule now quotes the set that carries the link, in the section the
    // receiver it feeds sits in.
    fireEvent.click(screen.getByRole("tab", { name: /^Room design/ }));
    fireEvent.change(screen.getByLabelText("Room design step"), {
      target: { value: "schedule" },
    });
    fireEvent.click(screen.getByRole("tab", { name: /Distribution and switching/ }));
    expect(screen.getByLabelText("Quantity for EX3-100-EARC")).toBeTruthy();

    // The room brief states the span the receiver serves, so the recorded figure
    // is what a reader sees rather than a number only the gate knew.
    fireEvent.change(screen.getByLabelText("Room design step"), {
      target: { value: "brief" },
    });
    expect(screen.getByText(/carried in 2 spans of 65 m with a mid-span EX3-100-EARC/)).toBeTruthy();
    expect(screen.getByText(/serves the 65 m span, inside the 100 m rating of RX-700/)).toBeTruthy();
  });

  it("follows the measurement when the rep re-measures inside the range", () => {
    renderRoom();
    recordRun("130");
    expect(screen.getByText(/beyond the 100 m rating of the longest HDBaseT receiver/)).toBeTruthy();

    // Re-measuring is the change the fix names, so the gate has to read it. The
    // edited page marks the tab as unsaved, which is part of its name.
    fireEvent.click(screen.getByRole("tab", { name: /^Room design/ }));
    fireEvent.click(screen.getByRole("button", { name: "Edit room brief" }));
    fireEvent.change(screen.getByLabelText("Longest surveyed display run (m)"), {
      target: { value: "62" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "Proposal" }));

    expect(screen.queryByText(/beyond the 100 m rating of the longest HDBaseT receiver/)).toBeNull();
    // The room still quotes the receiver the run chose, so the schedule does not
    // lose the part when the run moves.
    expect(screen.queryByText(/cannot carry this link on its own/)).toBeNull();
  });
});
