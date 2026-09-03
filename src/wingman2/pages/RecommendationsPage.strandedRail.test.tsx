import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import index from "../../../public/product-intelligence-index.json";
import {
  DISCOVERY_BRIEF_KEY,
  DISCOVERY_SNAPSHOT_KEY,
} from "../data/workflowHandoff";
import { RecommendationsPage } from "./RecommendationsPage";

vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue(index),
}));

// A brief whose room model pairs one display with independent routing: the
// interview's option filter hid "independent-routing-per-display" after the
// one-display answer, so the stored value is stranded. The snapshot carries
// the answers plus the applied-defaults record (the app pre-filled the
// displays answer, so it is an untouched quick-start default).
const strandedSnapshot = {
  activeStepIndex: 3,
  state: {
    answers: {
      opportunity: "meeting-room",
      displays: "one-display",
      "display-behaviour": "independent-routing-per-display",
    },
    appliedDefaults: {
      displays: "one-display",
      "display-behaviour": "independent-routing-per-display",
    },
    notes: {},
    confirmed: {},
    confidence: {},
  },
  brief: {
    savedAt: "2026-09-02T00:00:00.000Z",
    roomModel: {
      roomType: "meeting room",
      displayCount: "1 display",
      displayBehaviour: "independent routing per display",
    },
    capturedPercent: 100,
    quoteSafetyStatus: "do-not-quote-yet",
    missingInformation: [],
  },
  savedAt: "2026-09-02T00:00:00.000Z",
};

beforeEach(() => {
  window.localStorage.setItem(DISCOVERY_SNAPSHOT_KEY, JSON.stringify(strandedSnapshot));
  window.localStorage.setItem(DISCOVERY_BRIEF_KEY, JSON.stringify(strandedSnapshot.brief));
});

function renderPage() {
  return render(
    <MemoryRouter>
      <RecommendationsPage />
    </MemoryRouter>,
  );
}

describe("recommendations stranded-answer rail", () => {
  it("surfaces the stranded default on the resolve stage with a remove action", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("tab", { name: /Resolve/ }));

    const notice = await screen.findByRole("alert");
    expect(notice.textContent).toContain("Pre-filled answer no longer fits");
    expect(notice.textContent).toContain("Different content by display or zone");
    expect(screen.getByTestId("remove-stranded-answers")).toBeTruthy();
  });

  it("does not offer the bulk remove when the stranded value was rep-typed", async () => {
    // No appliedDefaults record: the rep chose the value themselves.
    window.localStorage.setItem(
      DISCOVERY_SNAPSHOT_KEY,
      JSON.stringify({
        ...strandedSnapshot,
        state: {
          ...strandedSnapshot.state,
          appliedDefaults: {},
        },
      }),
    );

    renderPage();

    fireEvent.click(await screen.findByRole("tab", { name: /Resolve/ }));

    const notice = await screen.findByRole("alert");
    expect(notice.textContent).toContain("Answer no longer fits");
    expect(screen.queryByTestId("remove-stranded-answers")).toBeNull();
  });

  it("removes the untouched default from the draft and recalculates the brief", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("tab", { name: /Resolve/ }));
    fireEvent.click(await screen.findByTestId("remove-stranded-answers"));

    await waitFor(() => {
      const draft = JSON.parse(window.localStorage.getItem(DISCOVERY_SNAPSHOT_KEY) ?? "{}");
      // The stranded value is gone from the draft; the app-applied one-display
      // answer stays (the rep never changed it — it is still selectable).
      expect(draft.state.answers["display-behaviour"]).toBeUndefined();
      expect(draft.state.answers.displays).toBe("one-display");
      // The applied-defaults record no longer claims the removed question.
      expect(draft.state.appliedDefaults["display-behaviour"]).toBeUndefined();
    });

    // The rail clears without leaving the page (the stranded notice is gone,
    // the checks rail still renders) and the freshly saved brief no longer
    // carries the removed behaviour — both in the snapshot's brief and in the
    // saved project brief readLatestDiscoveryBrief prefers.
    await waitFor(() => {
      expect(screen.queryByRole("alert")).toBeNull();
      const snapshot = JSON.parse(window.localStorage.getItem(DISCOVERY_SNAPSHOT_KEY) ?? "{}");
      expect(snapshot.brief?.roomModel?.displayBehaviour).not.toBe("independent routing per display");
    });
    expect(screen.getByText("Checks still required")).toBeTruthy();
  });
});
