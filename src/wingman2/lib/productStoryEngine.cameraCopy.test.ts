import { describe, expect, it } from "vitest";

import { buildProductNarrative } from "./productStoryEngine";

describe("product story engine camera and NDI copy", () => {
  it("describes CAM-0402-BRG as a bridge workflow instead of a PTZ camera", () => {
    const narrative = buildProductNarrative({
      sku: "CAM-0402-BRG",
      name: "4K Multi-Camera Video Bridge",
      family: "Camera",
      category: "Camera",
      productType: "Camera",
      description: "4K multi-camera video bridge with USB and HDMI inputs and outputs.",
      purpose: "Bridge several cameras or AV sources into one conferencing or capture workflow.",
      summary: "Bridge several cameras or AV sources into one conferencing or capture workflow.",
      keyFeatures: ["Multi-camera video bridge", "USB and HDMI outputs"],
      applications: ["Hybrid teaching"],
      ioSummary: ["USB", "HDMI"],
      video: ["4K60"],
      audio: ["Analog audio"],
      usb: ["USB 3.x"],
      network: ["Ethernet"],
      control: ["IP control"],
      power: [],
      physical: [],
      checks: [],
      related: [],
    });

    expect(narrative.whatItIs).toMatch(/multi-camera video bridge/i);
    expect(narrative.whatItIs).not.toMatch(/PTZ conference camera/i);
    expect(narrative.suggestedWording).toMatch(/several camera or AV sources/i);
  });

  it("keeps the NHD-128-NDI-TRX in an AVoIP gateway story instead of a camera story", () => {
    const narrative = buildProductNarrative({
      sku: "NHD-128-NDI-TRX",
      name: "NDI to AV over IP Gateway",
      family: "NetworkHD",
      category: "AV-over-IP",
      productType: "Gateway",
      description: "Bridges NDI and NetworkHD with bidirectional conversion.",
      purpose: "Bridge NDI workflow into a wider AV-over-IP system.",
      summary: "Bridge NDI workflow into a wider AV-over-IP system.",
      keyFeatures: ["NDI", "NetworkHD gateway"],
      applications: ["Distributed AV"],
      ioSummary: ["NDI", "NetworkHD"],
      video: ["4K30"],
      audio: [],
      usb: [],
      network: ["Ethernet"],
      control: ["IP control"],
      power: [],
      physical: [],
      checks: [],
      related: [],
    });

    expect(narrative.headline).toMatch(/gateway conversation/i);
    expect(narrative.whatItIs).toMatch(/bridges NDI workflow and NetworkHD workflow/i);
    expect(narrative.suggestedWording).toMatch(/bridge between NDI video workflow and a wider NetworkHD/i);
  });
});
