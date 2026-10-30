import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { readDiscoveryHandoff } from "../lib/discoveryTemplateHandoff";
import { nextRoomBriefQuestion } from "../lib/roomBrief";
import { RoomBriefWizard } from "./RoomBriefWizard";

function mount() {
  return render(<MemoryRouter initialEntries={["/wingman/discovery"]}><Routes>
    <Route path="/wingman/discovery" element={<RoomBriefWizard />} />
    <Route path="/wingman/templates" element={<LibraryDestination />} />
  </Routes></MemoryRouter>);
}

/** The three facts, chosen the way a rep would: by reading the label. */
function answerSetup() {
  fireEvent.click(screen.getByRole("radio", { name: "Share a laptop and present to the others in the room" }));
  fireEvent.click(screen.getByRole("radio", { name: "1–4 people" }));
  fireEvent.click(screen.getByRole("button", { name: /Work out the room/ }));
}

/** The library address, so a test can read the market the brief sends with it. */
function LibraryDestination() {
  return <p>Template library{useLocation().search}</p>;
}

afterEach(() => { cleanup(); sessionStorage.clear(); localStorage.clear(); });

describe("setup", () => {
  it("will not start the ladder before the room is described", () => {
    mount();
    const start = screen.getByRole("button", { name: /Work out the room/ }) as HTMLButtonElement;
    expect(start.disabled).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "1–4 people" }));
    expect((screen.getByRole("button", { name: /Work out the room/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("offers the library to a rep who already knows the design they want", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Browse the design library instead" }));
    expect(screen.getByText(/Template library/)).toBeVisible();
  });

  it("opens the library on the market the rep named, so they do not say it twice", () => {
    mount();
    fireEvent.change(screen.getByLabelText("Market"), { target: { value: "Education" } });
    fireEvent.click(screen.getByRole("button", { name: "Browse the design library instead" }));
    expect(screen.getByText(/market=Education/)).toBeVisible();
  });
});

describe("the ladder", () => {
  it("asks the question the engine chose, not the first one written", () => {
    mount();
    answerSetup();
    // The surface holds no ladder of its own: whatever splits the four rooms
    // this setup leaves open is what a rep is asked.
    const expected = nextRoomBriefQuestion({ purpose: "present", occupancy: "squad" });
    expect(screen.getByRole("heading", { name: expected!.question, level: 1 })).toBeVisible();
    expect(screen.getByText(/Question 1/)).toBeVisible();
  });

  it("decides in two answers and names the room", () => {
    mount();
    answerSetup();
    fireEvent.click(screen.getByRole("button", { name: "No, the same thing everywhere is fine" }));
    fireEvent.click(screen.getByRole("button", { name: "Sometimes, from a visiting laptop" }));
    expect(screen.getByRole("heading", { name: "Huddle room, bring your own laptop", level: 1 })).toBeVisible();
    expect(screen.getByText(/Decided in 2 questions/)).toBeVisible();
  });

  it("lets a rep stop early, and says what is still open", () => {
    mount();
    answerSetup();
    fireEvent.click(screen.getByRole("button", { name: "Decide with what I have" }));
    expect(screen.getByTestId("room-brief-decision")).toBeVisible();
    expect(screen.getByText(/still fit \d+ other room type/)).toBeVisible();
  });
});

describe("the decision", () => {
  it("gives each need a reason, and what to check on site", () => {
    mount();
    answerSetup();
    fireEvent.click(screen.getByRole("button", { name: "No, the same thing everywhere is fine" }));
    fireEvent.click(screen.getByRole("button", { name: "Sometimes, from a visiting laptop" }));
    expect(screen.getByText("What this room needs")).toBeVisible();
    expect(screen.getByText("Check on site")).toBeVisible();
    // The reason a rep would keep the requirement under price pressure.
    expect(screen.getByText(/the whole presentation surface/)).toBeVisible();
  });

  it("hands the decided room to the discovery brief as answers", () => {
    mount();
    answerSetup();
    fireEvent.click(screen.getByRole("button", { name: "No, the same thing everywhere is fine" }));
    fireEvent.click(screen.getByRole("button", { name: "Sometimes, from a visiting laptop" }));
    fireEvent.click(screen.getByRole("button", { name: /Take this into the discovery brief/ }));
    // The capture steps still ask what only the customer knows; they start from
    // the room rather than from a blank form.
    expect(readDiscoveryHandoff()).toMatchObject({
      mode: "standard",
      answers: { opportunity: "meeting-room", displays: "1" },
    });
    expect(readDiscoveryHandoff()?.notes?.["room-brief"]).toContain("Huddle room");
  });

  it("starts again cleanly", () => {
    mount();
    answerSetup();
    fireEvent.click(screen.getByRole("button", { name: "Decide with what I have" }));
    fireEvent.click(screen.getByRole("button", { name: /Start again/ }));
    expect(screen.getByRole("heading", { name: "What has the customer asked for?" })).toBeVisible();
    expect((screen.getByRole("button", { name: /Work out the room/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
