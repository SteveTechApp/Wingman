import { describe, expect, it } from "vitest";

import { createEmptyGuidedProjectRecord } from "@/features/discovery/guidedProjectEngine";
import { buildAvRecommendationFromDiscovery } from "@/services/av-recommendation/engine";

describe("buildAvRecommendationFromDiscovery", () => {
  it("wraps discovery advice with confidence, missing inputs, and accessory suggestions", () => {
    const record = {
      ...createEmptyGuidedProjectRecord(),
      workflowTrack: "Extend a signal",
      sourceCount: "1",
      displayCount: "1",
      sourceConnectionType: "HDMI",
      displayConnectionType: "HDMI",
      transportDistanceBand: "Up to 70m",
      transportCableType: "Cat6",
      signalFormats: "4K 60Hz 4:4:4",
      usbStandards: "High-speed / bandwidth USB 3.0 support",
      audioBreakout: "TX audio breakout",
      passthroughNeeds: "Ethernet passthrough",
      powerPreference: "2-way PoH",
    };

    const result = buildAvRecommendationFromDiscovery(record);

    expect(result.primaryFamily).toBe("HDBaseT");
    expect(result.confidenceScore).toBeGreaterThan(50);
    expect(result.accessoryBom.length).toBeGreaterThan(0);
    expect(result.summaries.salesperson).toContain("HDBaseT");
    expect(result.summaries.proposal).toContain("Suggested add-ons");
  });

  it("calls out missing discovery data when the brief is still partial", () => {
    const result = buildAvRecommendationFromDiscovery({
      workflowTrack: "Switch between devices",
      sourceCount: "2",
    });

    expect(result.whatsMissing.length).toBeGreaterThan(0);
    expect(result.completeness.total).toBeGreaterThan(result.completeness.answered);
    expect(result.summaries.engineer).toContain("Still needed");
  });
});
