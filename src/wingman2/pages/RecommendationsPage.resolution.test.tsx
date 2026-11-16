import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import index from "../../../public/product-intelligence-summary.json";
import {
  DISCOVERY_BRIEF_KEY,
  DISCOVERY_SNAPSHOT_KEY,
} from "../data/workflowHandoff";
import { RecommendationsPage } from "./RecommendationsPage";

vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue(index),
  loadProductIntelligenceSummary: vi.fn().mockResolvedValue(index),
  loadProductIntelligenceDetailRecords: vi.fn().mockResolvedValue(index),
}));

const brief = {
  savedAt: "2026-11-10T00:00:00.000Z",
  roomModel: { roomType: "meeting room", application: "meeting-room", scale: "single-small-room" },
  capturedPercent: 100,
  quoteSafetyStatus: "do-not-quote-yet",
  missingInformation: [
    "Source count and source connector types",
    "Network availability, managed switch suitability and AV VLAN approach",
    "Audio system designed by others; confirm the audio feed",
    "Confirm a custom firmware mode with the manufacturer",
  ],
};

function seedBrief(overrides: Partial<typeof brief> = {}) {
  const seededBrief = { ...brief, ...overrides };
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.localStorage.setItem(DISCOVERY_BRIEF_KEY, JSON.stringify(seededBrief));
  window.localStorage.setItem(DISCOVERY_SNAPSHOT_KEY, JSON.stringify({
    activeStepIndex: 0,
    state: {
      answers: {
        opportunity: "meeting-room",
        scale: "single-small-room",
        "source-connection": ["network-video-sources"],
        audio: ["audio-by-others"],
      },
      appliedDefaults: {},
      notes: {},
      confirmed: {},
      confidence: {},
    },
    brief: seededBrief,
    savedAt: seededBrief.savedAt,
  }));
}

beforeEach(() => {
  seedBrief();
});

function renderPage() {
  return render(<MemoryRouter><RecommendationsPage /></MemoryRouter>);
}

describe("recommendations resolve stage", () => {
  it("links missing inputs to their owning Discovery questions and leaves technical work open", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("tab", { name: /Resolve/ }));

    expect((await screen.findByTestId("recommendation-resolution-summary")).textContent).toContain("3 ready for a Discovery answer");
    expect(screen.getByRole("link", { name: "Answer in Discovery: Sources" }).getAttribute("href")).toContain("?edit=sources");
    expect(screen.getByRole("link", { name: "Answer in Discovery: AV network path" }).getAttribute("href")).toContain("?edit=network-path");
    expect(screen.getByRole("link", { name: "Answer in Discovery: Audio route" }).getAttribute("href")).toContain("?edit=audio-route");
    expect(screen.getByText("Keep open for verification")).toBeTruthy();
    expect(screen.getByText("Confirm a custom firmware mode with the manufacturer")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Complete" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Save detail" })).toBeNull();
  });

  it("takes the overview action to Resolve when answerable Discovery checks remain", async () => {
    renderPage();
    const action = await screen.findByRole("button", { name: "Answer 3 Discovery questions" });
    fireEvent.click(action);
    expect(await screen.findByRole("heading", { name: "Move the design forward" })).toBeTruthy();
  });

  it("sends a room with no open Discovery checks to its next unfinished design stage", async () => {
    seedBrief({ missingInformation: [] });
    renderPage();
    const action = await screen.findByRole("button", { name: /Resolve unfilled product roles|Review system validation/ });
    const actionText = action.textContent ?? "";
    fireEvent.click(action);
    const nextTab = actionText.includes("unfilled product roles") ? "Build" : "Validate";
    expect(await screen.findByRole("tab", { name: new RegExp(nextTab) })).toHaveAttribute("aria-selected", "true");
  });
});
