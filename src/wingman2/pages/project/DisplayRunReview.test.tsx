import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { readProjectStore, writeProjectStore, type StoredProject } from "../../features/projects";
import { DisplayRunReview } from "./DisplayRunReview";

const REASON = "The survey records a 28 m display run, inside the 35 m rating of RX-500, so the room takes RX-500.";
const BEYOND = "The survey records a 130 m display run, beyond the 100 m rating of RX-700, so the receiver alone cannot carry the link: allow a mid-span repeater or a fibre link at survey before issue.";

/** A saved teaching room, with the room model and schedule a template save writes. */
function project({
  run = "28 m",
  servedRun,
  receiverQty = 1,
  receiverSku = "RX-500",
  reason = REASON,
}: {
  run?: string;
  servedRun?: string;
  receiverQty?: number | null;
  receiverSku?: string;
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
      roomModel: { cableRun: run, longestRun: run, ...(servedRun ? { servedRun } : {}) },
    },
    productSelections:
      receiverQty === null
        ? []
        : [{ sku: receiverSku, category: "Display receiver", quantity: receiverQty, title: "HDBaseT receiver" }],
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

  it("reads the span each receiver serves when the run is carried in spans", () => {
    renderPanel(project({ run: "130 m", servedRun: "65 m", reason: "The survey records a 130 m display run, carried in 2 spans of 65 m." }));

    // The measurement is still the survey's; the span is what the receiver's
    // rating is measured against, so the record prints both.
    expect(screen.getByTestId("display-run-length").textContent).toBe("130 m");
    expect(screen.getByTestId("display-run-span").textContent).toBe("65 m");
  });

  it("prints no span for a run one receiver carries", () => {
    renderPanel(project());

    expect(screen.queryByTestId("display-run-span")).toBeNull();
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

  it("reads a receiver a proposal-built room keeps on its saved response", () => {
    // The completion wizard saves products on the response and leaves the
    // selections empty; the record names the same part the wizard measures.
    const value = project({ receiverQty: null, run: "130 m", reason: null });
    value.proposal = {
      validationNotes: [],
      products: [{ sku: "RX-700", category: "Display receiver", quantity: 1, title: "HDBaseT receiver" }],
    } as unknown as StoredProject["proposal"];
    renderPanel(value);

    expect(screen.getByTestId("display-run-receiver").textContent).toBe("RX-700");
    // And it offers the change, because the schedule it reads can take it.
    expect(screen.getByRole("button", { name: "Schedule the mid-span repeater" })).toBeTruthy();
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

describe("DisplayRunReview mid-span fix", () => {
  const blocked = () => project({ run: "130 m", receiverSku: "RX-700", reason: BEYOND });

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("offers the change on a run past the quoted receiver's rating", () => {
    renderPanel(blocked());

    // The offer names the spans it creates and the run it records, beside the
    // reason that says the run cannot be carried as it stands.
    expect(screen.getByText(/2 spans of 65 m/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Schedule the mid-span repeater" })).toBeTruthy();
    expect(screen.queryByTestId("display-run-span")).toBeNull();
  });

  it("fixes the saved room in one click without reopening the template", () => {
    const saved = blocked();
    writeProjectStore({ projects: [saved], proposalDrafts: [], activeProjectId: saved.id });
    const first = renderPanel(saved);

    fireEvent.click(screen.getByRole("button", { name: "Schedule the mid-span repeater" }));

    const stored = readProjectStore().projects[0];
    // The span the receiver serves is recorded; the measurement is the survey's,
    // so the record still says what was measured on site.
    expect(stored.discoveryBrief?.roomModel).toMatchObject({ cableRun: "130 m", servedRun: "65 m" });
    // The set joins the room's own schedule, which is what the response rebuilt
    // from this project quotes.
    expect((stored.productSelections ?? []).filter((item) => item.sku === "EX3-100-EARC")).toHaveLength(1);
    // The reason the record prints is restated over the split.
    expect((stored.proposal?.validationNotes ?? []).join(" ")).toContain("carried in 2 spans of 65 m");
    expect((stored.proposal?.validationNotes ?? []).join(" ")).not.toContain("allow a mid-span repeater");

    // The record as the page re-renders it from the store: the survey's run, the
    // span beside it, the restated reason, and no second offer.
    first.unmount();
    renderPanel(stored);
    expect(screen.getByTestId("display-run-length").textContent).toBe("130 m");
    expect(screen.getByTestId("display-run-span").textContent).toBe("65 m");
    expect(screen.getByTestId("display-run-reason").textContent).toContain("carried in 2 spans of 65 m");
    expect(screen.queryByRole("button", { name: "Schedule the mid-span repeater" })).toBeNull();
  });

  it("offers no change on a room already carried in spans", () => {
    renderPanel(project({ run: "130 m", servedRun: "65 m", receiverSku: "RX-700" }));

    expect(screen.getByTestId("display-run-span").textContent).toBe("65 m");
    expect(screen.queryByRole("button", { name: "Schedule the mid-span repeater" })).toBeNull();
  });

  it("offers no change on a short run or a room quoting no receiver", () => {
    renderPanel(project());
    expect(screen.queryByRole("button", { name: "Schedule the mid-span repeater" })).toBeNull();

    renderPanel(project({ run: "130 m", receiverQty: null, reason: null }));
    expect(screen.queryByRole("button", { name: "Schedule the mid-span repeater" })).toBeNull();
  });
});
