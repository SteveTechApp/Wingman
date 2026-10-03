import { describe, expect, it } from "vitest";

import { discoveryBriefToFinderNeed } from "@/wingman2/data/workflowHandoff";
import type { StoredDiscoveryBrief } from "@/wingman2/data/projectStore";

function brief(
  roomModel: Record<string, unknown>,
  overrides?: Partial<StoredDiscoveryBrief>,
): StoredDiscoveryBrief {
  return {
    savedAt: "2026-06-24T09:00:00.000Z",
    roomModel,
    inference: {},
    capturedPercent: 100,
    ...overrides,
  } as StoredDiscoveryBrief;
}

describe("Discovery to Recommendations handoff", () => {
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

  it("maps software and app operation to a web UI control requirement", () => {
    const draft = discoveryBriefToFinderNeed(brief({
      controlNeeds: ["Software / app control"],
    }));

    expect(draft.control).toBe("Web UI");
  });

  it("blocks product path when decisionEvidence contains unknown fields", () => {
    const draft = discoveryBriefToFinderNeed(brief({
      roomType: "Meeting room",
      outcome: "Teams room",
      devices: ["Laptop HDMI"],
      sourceCount: "1 source",
      displayCount: "1 display",
      displayBehaviour: "Same content on all displays",
      decisionEvidence: [
        { field: "application", value: "Teams room", state: "confirmed", source: "customer", confidence: "high" },
        { field: "source-count", value: "Unknown", state: "unknown", source: "customer", confidence: "low" },
      ],
    }));

    expect(draft.technicalRequirement).toBe("Requirements remain unresolved");
    expect(draft.productPath).toBe("Needs confirmation before product path");
  });

  it("blocks product path when quoteSafetyStatus is do-not-quote-yet from question-aware integrity", () => {
    const draft = discoveryBriefToFinderNeed(brief({
      roomType: "Meeting room",
      outcome: "Teams room",
      devices: ["Laptop HDMI"],
      sourceCount: "1 source",
      displayCount: "1 display",
      displayBehaviour: "Same content on all displays",
    }, { quoteSafetyStatus: "do-not-quote-yet" }));

    expect(draft.technicalRequirement).toBe("Requirements remain unresolved");
    expect(draft.productPath).toBe("Needs confirmation before product path");
  });

  it("allows product path when quoteSafetyStatus is quote-ready and no unresolved evidence", () => {
    const draft = discoveryBriefToFinderNeed(brief({
      roomType: "Meeting room",
      outcome: "Teams room",
      devices: ["Laptop HDMI"],
      sourceCount: "1 source",
      displayCount: "1 display",
      displayBehaviour: "Same content on all displays",
      signalStandard: "1080p",
      usbOwnership: "No USB",
      usbTopologyRisk: "No USB path needed",
      audioPath: "Display audio",
      controlNeeds: ["Simple / automatic"],
      cableRun: "Under 5m",
      decisionEvidence: [
        { field: "application", value: "Teams room", state: "confirmed", source: "customer", confidence: "high" },
        { field: "source-count", value: "1 source", state: "confirmed", source: "customer", confidence: "high" },
      ],
    }, {
      quoteSafetyStatus: "quote-ready",
    }));

    expect(draft.technicalRequirement).toBe("BYOD / UC conferencing");
    expect(draft.productPath).toBe("UC / conferencing");
  });
});
