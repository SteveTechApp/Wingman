import { describe, expect, it } from "vitest";

import { discoveryBriefToFinderNeed } from "@/wingman2/data/workflowHandoff";
import type { StoredDiscoveryBrief } from "@/wingman2/data/projectStore";

function brief(roomModel: Record<string, unknown>): StoredDiscoveryBrief {
  return {
    savedAt: "2026-06-24T09:00:00.000Z",
    roomModel,
    inference: {},
    capturedPercent: 100,
  } as StoredDiscoveryBrief;
}

describe("Discovery to Finder handoff", () => {
  it("normalises a complete hospitality brief into Finder option values without turning its narrative into a product search", () => {
    const draft = discoveryBriefToFinderNeed(brief({
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
      processingRequirement: "Matrix / routing",
    }));

    expect(draft).toMatchObject({
      query: "",
      technicalRequirement: "Route sources to multiple displays",
      productPath: "Matrix / routing",
      technologyType: "Matrix",
      signalType: "HDMI video",
      sourceConnector: "HDMI",
      inputs: "3-4",
      outputs: "3-4",
      distance: "Long 35-70m",
      resolution: "4K60",
      usb: "No USB",
      audio: "Amplifier / speakers",
      network: "Unknown",
      processing: "Matrix / routing",
      control: "No control",
    });
  });

  it("preserves the selected NetworkHD performance tier as a core Finder constraint", () => {
    const draft = discoveryBriefToFinderNeed(brief({
      roomType: "Distributed AV / AV-over-IP",
      outcome: "Campus distribution with independent routing.",
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
    }));

    expect(draft).toMatchObject({
      technicalRequirement: "Distribute AV over network",
      productPath: "AVoIP",
      technologyType: "AVoIP",
      network: "10G network",
      processing: "AVoIP routing",
      avoipSeriesHint: "NetworkHD 600",
    });
  });
});
