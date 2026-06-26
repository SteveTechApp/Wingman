import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

// The Finder loads a saved Discovery brief on demand via the "Load Discovery brief"
// button (FINDER_AUTO_LOAD_DISCOVERY_BRIEF is off, so it does not auto-apply on
// mount). These tests exercise that real handoff path.
async function loadDiscoveryBrief() {
  fireEvent.click(await screen.findByRole("button", { name: "Load Discovery brief" }));
}

import { DISCOVERY_BRIEF_KEY } from "@/wingman2/data/workflowHandoff";
import { FinderPage } from "@/wingman2/pages/FinderPage";

describe("Finder Discovery handoff", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
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
        <FinderPage />
      </MemoryRouter>,
    );

    await loadDiscoveryBrief();

    expect(await screen.findByTestId("finder-architecture-match-notice")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Add to project" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("No strong match yet")).not.toBeInTheDocument();
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
        <FinderPage />
      </MemoryRouter>,
    );

    await loadDiscoveryBrief();

    expect((await screen.findAllByText("NHD-600-TRX")).length).toBeGreaterThan(0);
    expect(screen.queryByText("No strong match yet")).not.toBeInTheDocument();
  });
});
