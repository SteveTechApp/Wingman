import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { StoredProject } from "../../features/projects";
import { DisplayRunReview } from "./DisplayRunReview";

const REASON = "The survey records a 28 m display run, inside the 35 m rating of RX-500, so the room takes RX-500.";

/** A saved teaching room, with the room model and schedule a template save writes. */
function project({
  run = "28 m",
  receiverQty = 1,
  reason = REASON,
}: {
  run?: string;
  receiverQty?: number | null;
  reason?: string | null;
} = {}): StoredProject {
  return {
    id: "project-1",
    name: "Teaching room",
    owner: "Northbridge",
    stage: "Templates",
    status: "recommended",
    updated: "Today",
    createdAt: "2026-10-26T09:00:00.000Z",
    updatedAt: "2026-10-26T09:00:00.000Z",
    resumeTo: "/wingman/templates",
    discoveryBrief: {
      savedAt: "2026-10-26T09:00:00.000Z",
      roomModel: { cableRun: run, longestRun: run },
    },
    productSelections:
      receiverQty === null
        ? []
        : [{ sku: "RX-500", category: "Display receiver", quantity: receiverQty, title: "HDBaseT receiver" }],
    ...(reason ? { proposal: { validationNotes: [`Display receiver: ${reason}`] } } : {}),
  } as unknown as StoredProject;
}

function renderPanel(value: StoredProject) {
  return render(
    <MemoryRouter>
      <DisplayRunReview project={value} />
    </MemoryRouter>,
  );
}

describe("DisplayRunReview", () => {
  it("reads the measured run and the receiver the schedule quotes, with why it was chosen", () => {
    renderPanel(project());

    expect(screen.getByRole("heading", { name: "Display cable run" })).toBeTruthy();
    expect(screen.getByTestId("display-run-length").textContent).toBe("28 m");
    expect(screen.getByTestId("display-run-receiver").textContent).toBe("RX-500");
    // The reason is the sentence the proposal carries, not a second opinion.
    expect(screen.getByTestId("display-run-reason").textContent).toBe(REASON);
  });

  it("says the run is unmeasured when only a receiver is quoted", () => {
    // A project whose room model never recorded a distance keeps the receiver
    // its design quoted, so the record says which half is missing.
    renderPanel(project({ run: "Unknown" }));

    expect(screen.getByTestId("display-run-length").textContent).toBe("Not recorded");
    expect(screen.getByTestId("display-run-receiver").textContent).toBe("RX-500");
    expect(screen.queryByTestId("display-run-reason")).toBeNull();
    expect(screen.getByTestId("display-run-review").textContent).toContain(
      "No display run is measured for this room yet",
    );
  });

  it("says no receiver is quoted when only the run is recorded", () => {
    renderPanel(project({ receiverQty: null }));

    expect(screen.getByTestId("display-run-length").textContent).toBe("28 m");
    expect(screen.getByTestId("display-run-receiver").textContent).toBe("Not quoted");
    expect(screen.getByTestId("display-run-review").textContent).toContain(
      "No HDBaseT display receiver is quoted for this run",
    );
  });

  it("does not treat a receiver line with no quantity as quoted", () => {
    renderPanel(project({ receiverQty: 0 }));

    expect(screen.getByTestId("display-run-receiver").textContent).toBe("Not quoted");
  });

  it("reads an older save's own distance field", () => {
    const legacy = project();
    (legacy.discoveryBrief!.roomModel as Record<string, unknown>) = { distance: "42 m" };
    renderPanel(legacy);

    expect(screen.getByTestId("display-run-length").textContent).toBe("42 m");
  });

  it("renders no panel for a room with neither a run nor a receiver", () => {
    renderPanel(project({ run: "", receiverQty: null, reason: null }));

    expect(screen.queryByTestId("display-run-review")).toBeNull();
  });
});
