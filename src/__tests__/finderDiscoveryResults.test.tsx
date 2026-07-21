import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Recommendations auto-loads the saved Discovery brief unconditionally on
// mount (no manual "Load Discovery brief" step, unlike the retired Finder
// page) - this test exercises that real handoff path end to end against the
// real WyreStorm catalogue.

import { DISCOVERY_BRIEF_KEY } from "@/wingman2/data/workflowHandoff";
import { loadProductIntelligenceIndex } from "@/wingman2/lib/productIntelligenceIndexCache";
import { RecommendationsPage } from "@/wingman2/pages/RecommendationsPage";
import productIntelligenceIndex from "../../public/product-intelligence-index.json";

vi.mock("@/wingman2/lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn(),
}));

describe("Recommendations Discovery handoff", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.mocked(loadProductIntelligenceIndex).mockReset();
    vi.mocked(loadProductIntelligenceIndex).mockResolvedValue(productIntelligenceIndex);
  });

  it("turns a full Discovery brief into core product paths instead of zero results", async () => {
    window.localStorage.setItem(DISCOVERY_BRIEF_KEY, JSON.stringify({
      savedAt: "2026-06-24T09:00:00.000Z",
      capturedPercent: 100,
      inference: {},
      roomModel: {
        roomType: "Hospitality / bar / venue",
        outcome: "Sports bar with independent source routing across several TVs.",
        devices: ["2–4 sources", "Mostly fixed HDMI sources"],
        sourceCount: "2–4 sources",
        displayCount: "3–8 displays / outputs",
        displayBehaviour: "Different content by display or zone",
        signalStandard: "4K60 / standard 4K",
        usbOwnership: "No USB / conferencing",
        usbTopologyRisk: "No USB path needed",
        audioPath: "Room speakers / amplifier",
        controlNeeds: ["Simple / automatic"],
        cableRun: "35-70m",
        network: "New cabling required",
      },
    }));

    render(
      <MemoryRouter>
        <RecommendationsPage />
      </MemoryRouter>,
    );

    expect(await screen.findAllByRole("button", { name: "Add to project" })).not.toHaveLength(0);
    expect(screen.queryByText("No eligible product passed the current compatibility gates.")).not.toBeInTheDocument();
  });

  it("uses the selected NetworkHD tier when the discovery is a 10G AVoIP design", async () => {
    window.localStorage.setItem(DISCOVERY_BRIEF_KEY, JSON.stringify({
      savedAt: "2026-06-24T09:00:00.000Z",
      capturedPercent: 100,
      inference: {},
      roomModel: {
        roomType: "Distributed AV / AV-over-IP",
        outcome: "Critical 10G campus routing with multiple independent displays.",
        devices: ["5–8 sources", "Mostly fixed HDMI sources"],
        sourceCount: "5–8 sources",
        displayCount: "9+ displays / outputs",
        displayBehaviour: "Different content by display or zone",
        signalStandard: "4K60 HDR / HDCP-sensitive",
        usbOwnership: "No USB / conferencing",
        usbTopologyRisk: "No USB path needed",
        audioPath: "Display audio only",
        controlNeeds: ["Third-party control"],
        cableRun: "70-100m+",
        network: "Use existing customer network",
        avoipProfile: "Zero latency / lossless / 10Gb / SDVoE",
        avoipSeriesHint: "NetworkHD 600",
      },
    }));

    render(
      <MemoryRouter>
        <RecommendationsPage />
      </MemoryRouter>,
    );

    expect((await screen.findAllByText("NHD-600-TRX")).length).toBeGreaterThan(0);
    expect(screen.queryByText("No eligible product passed the current compatibility gates.")).not.toBeInTheDocument();
  });
});
