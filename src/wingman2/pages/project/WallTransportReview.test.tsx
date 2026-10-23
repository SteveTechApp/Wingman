import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { StoredProject } from "../../features/projects";
import { wallStartPresets } from "../../lib/videowallDecision";
import { wallStartingPointOrigin } from "../../lib/wallStartingPointOrigin";
import type { WallRequirements } from "../../lib/videowallOptions";
import { WallTransportReview } from "./WallTransportReview";

const preset = wallStartPresets.find((entry) => entry.key === "two-up")!;

/** A saved wall for these answers, carrying the card it started on. */
function project(requirements: WallRequirements, startingPoint?: ReturnType<typeof wallStartingPointOrigin>): StoredProject {
  return {
    id: "project-1",
    name: "Boardroom wall",
    owner: "Northbridge",
    stage: "Proposal",
    status: "recommended",
    updated: "Today",
    createdAt: "2026-10-20T09:00:00.000Z",
    updatedAt: "2026-10-20T14:12:00.000Z",
    resumeTo: "/wingman/projects",
    videowall: {
      savedAt: "2026-10-20T14:12:00.000Z",
      wallType: "lcd",
      summary: { version: 2, requirements, ...(startingPoint ? { startingPoint } : {}) },
    },
  } as unknown as StoredProject;
}

function renderPanel(value: StoredProject) {
  return render(
    <MemoryRouter>
      <WallTransportReview project={value} />
    </MemoryRouter>,
  );
}

describe("WallTransportReview starting point", () => {
  it("names the card a saved wall started on and the answers the room changed", () => {
    const origin = wallStartingPointOrigin(preset);
    renderPanel(project({ ...preset.requirements, sources: preset.requirements.sources + 1 }, origin));

    expect(screen.getByTestId("wall-starting-point").textContent).toBe(
      `Started from ${preset.label}. 1 answer changed: Sources: ${preset.requirements.sources} → ${preset.requirements.sources + 1}.`,
    );
    // The record says which card, so a reader can find it in the picker again.
    expect(document.querySelector(`[data-wall-starting-point="${preset.key}"]`)).not.toBeNull();
  });

  it("says a wall still holding the card's answers has not moved", () => {
    renderPanel(project(preset.requirements, wallStartingPointOrigin(preset)));

    expect(screen.getByTestId("wall-starting-point").textContent).toBe(
      `Started from ${preset.label}. No answers changed from the card.`,
    );
  });

  it("renders no starting point for a wall built from scratch", () => {
    renderPanel(project(preset.requirements));

    expect(screen.queryByTestId("wall-starting-point")).toBeNull();
    // The panel itself still reads the design.
    expect(screen.getByTestId("wall-transport-review")).not.toBeNull();
  });
});
