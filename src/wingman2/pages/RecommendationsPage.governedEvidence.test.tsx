import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import index from "../../../public/product-intelligence-index.json";
import { DISCOVERY_BRIEF_KEY } from "../data/workflowHandoff";
import { RecommendationsPage } from "./RecommendationsPage";

// The real product-intelligence index drives the same selector the live app
// uses, so the match cards carry real governed spec evidence.
vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue(index),
}));

// A room brief that maps to a 3-4-in / 2-out, USB 3.x presentation switcher
// requirement - exactly the profile SW-640L-TX-W passes via governed evidence.
const roomBrief = {
  capturedPercent: 100,
  roomModel: {
    roomType: "meeting room",
    outcome: "meeting room presentation and BYOD",
    devices: ["laptops", "USB-C laptop", "presentation"],
    sourceCount: "3-4",
    displayCount: "2 displays",
    displayBehaviour: "2 displays",
    usbOwnership: "USB 3 required",
    cableRun: "10-35m",
  },
};

beforeEach(() => {
  window.localStorage.setItem(DISCOVERY_BRIEF_KEY, JSON.stringify(roomBrief));
});

describe("recommendations governed spec evidence", () => {
  it("keeps the initial review compact until a stage is selected", async () => {
    render(
      <MemoryRouter>
        <RecommendationsPage />
      </MemoryRouter>,
    );

    const overviewTab = await screen.findByRole("tab", { name: /Overview/ });
    expect(overviewTab.getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByText("Proposed system architecture")).toBeNull();
    expect(screen.queryByText("Additional governed product matches")).toBeNull();
    expect(screen.queryByText("Missing accessories detected")).toBeNull();
  });

  it("shows the governed I/O, USB and reach facts and the gate-pass reasons on match cards", async () => {
    render(
      <MemoryRouter>
        <RecommendationsPage />
      </MemoryRouter>,
    );

    await screen.findByRole("tab", { name: /Validate/ });
    fireEvent.click(screen.getByRole("tab", { name: /Validate/ }));

    const skuHeading = await screen.findByText("SW-640L-TX-W", undefined, { timeout: 8000 });
    const card = skuHeading.closest("article");
    expect(card).not.toBeNull();

    // The evidence block: governed I/O and USB version, marked as governed.
    expect(card?.textContent).toContain("Why it passed the gates");
    expect(card?.textContent).toContain("4 in / 2 out");
    expect(card?.textContent).toContain("USB 3.x");
    expect(card?.textContent).toContain("Governed spec");
    expect(card?.querySelector(".compare-native-governance-badge")?.textContent).toContain("Verified governed data");

    // Positive gate reasons: why the product passed, not just that it did.
    expect(card?.textContent).toContain("I/O gate passed: 4 inputs cover the 3-4 source brief");
    expect(card?.textContent).toContain("I/O gate passed: 2 outputs cover the 2 display brief");
    expect(card?.textContent).toContain("USB gate passed: USB 3.x is evidenced");
  });

  it("surfaces the verify-before-quote responsibility inline with a Terms link", async () => {
    render(
      <MemoryRouter>
        <RecommendationsPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("tab", { name: /Validate/ }));
    await screen.findByText("SW-640L-TX-W", undefined, { timeout: 8000 });

    const note = document.querySelector("[data-wingman-verify-before-quote]");
    expect(note).not.toBeNull();
    expect(note?.textContent).toContain("best-efforts");
    expect(note?.textContent).toContain("Verify specifications");
    expect(note?.textContent).toContain("Read the terms");
    expect(note?.querySelector("a")?.getAttribute("href")).toBe("/wingman/terms");
  });
});
