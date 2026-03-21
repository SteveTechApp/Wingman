import { describe, expect, it } from "vitest";

import { inferCompetitorKnowledgeProfile } from "./brandKnowledge";
import { buildStructuredProduct } from "./fit/classifier";

describe("Extron competitor knowledge", () => {
  it("classifies NAV 10G as premium AVoIP", () => {
    const profile = inferCompetitorKnowledgeProfile({
      brand: "Extron",
      sku: "NAV 10E 501",
      name: "NAV 10E 501",
      family: "NAV",
      category: "AV over IP encoder",
      summary: "10Gb AV over IP encoder",
      features: ["10Gb AV over IP", "USB/KVM support"],
    });

    expect(profile.state).toBe("avoip");
    expect(profile.title).toContain("10G");
    expect(profile.recommendedFamilies).toContain("AVoIP");
  });

  it("distinguishes Extron presentation switchers from matrices", () => {
    const product = buildStructuredProduct({
      sku: "IN1808",
      name: "IN1808",
      category: "Presentation switcher",
      summary: "Seamless 8-input presentation switcher",
      features: ["Presentation switching", "Dual HDMI outputs", "DTP2"],
    });

    expect(product.comparisonDomain).toBe("PRESENTATION");
    expect(product.comparisonUseCase).toBe("COLLABORATION");
    expect(product.role).toBe("SWITCHER");
  });

  it("keeps CrossPoint in the matrix lane", () => {
    const product = buildStructuredProduct({
      sku: "DTP3 CrossPoint 42",
      name: "DTP3 CrossPoint 42",
      category: "Presentation matrix",
      summary: "4x2 matrix with USB-C and DTP3 extension",
      features: ["Matrix switching", "Scaling", "DTP3"],
    });

    expect(product.comparisonDomain).toBe("MATRIX");
    expect(product.comparisonUseCase).toBe("ROUTING");
    expect(product.role).toBe("MATRIX");
  });

  it("keeps DTP3 transmitters in the extender lane", () => {
    const product = buildStructuredProduct({
      sku: "DTP3 T 203",
      name: "DTP3 T 203",
      category: "HDBaseT extender transmitter",
      summary: "USB-C and HDMI transmitter with loop-through",
      features: ["HDBaseT transport", "USB-C", "Loop-through"],
    });

    expect(product.comparisonDomain).toBe("EXTENDER");
    expect(product.comparisonUseCase).toBe("EXTENSION");
    expect(product.role).toBe("ENCODER");
  });

  it("keeps multiview processors in the video-wall lane", () => {
    const product = buildStructuredProduct({
      sku: "MGP 641 xi",
      name: "MGP 641 xi",
      category: "Multiview processor",
      summary: "Four-window 4K/60 multiview processor",
      features: ["Multiview", "Windowing", "Scaling"],
    });

    expect(product.comparisonDomain).toBe("VIDEO_WALL");
    expect(product.comparisonUseCase).toBe("MULTIVIEW");
    expect(product.features.multiview).toBe(true);
  });

  it("classifies Crestron DM NVX as distributed AVoIP", () => {
    const profile = inferCompetitorKnowledgeProfile({
      brand: "Crestron",
      sku: "DM-NVX-384",
      name: "DM-NVX-384",
      family: "DM NVX",
      category: "AV over IP encoder",
      summary: "Enterprise AV over IP encoder",
      features: ["AV over IP", "1Gb transport"],
    });

    expect(profile.state).toBe("avoip");
    expect(profile.comparisonDomain).toBe("AVOIP");
    expect(profile.comparisonUseCase).toBe("DISTRIBUTION");
    expect(profile.title).toContain("NVX");
  });

  it("classifies Atlona OME as collaboration-first presentation", () => {
    const profile = inferCompetitorKnowledgeProfile({
      brand: "Atlona",
      sku: "AT-OME-MS52W",
      name: "AT-OME-MS52W",
      family: "OME",
      category: "Presentation switcher",
      summary: "USB-C presentation switcher",
      features: ["USB-C", "BYOD", "Scaling"],
    });

    expect(profile.state).toBe("presentation-switcher");
    expect(profile.comparisonDomain).toBe("PRESENTATION");
    expect(profile.comparisonUseCase).toBe("COLLABORATION");
    expect(profile.title).toContain("OME");
  });

  it("classifies Barco ClickShare as collaboration-first presentation", () => {
    const profile = inferCompetitorKnowledgeProfile({
      brand: "Barco",
      sku: "ClickShare CX-50",
      name: "ClickShare CX-50",
      family: "ClickShare",
      category: "Wireless collaboration",
      summary: "Wireless sharing and conferencing system",
      features: ["BYOD", "Wireless presentation"],
    });

    expect(profile.state).toBe("presentation-switcher");
    expect(profile.comparisonDomain).toBe("PRESENTATION");
    expect(profile.comparisonUseCase).toBe("COLLABORATION");
    expect(profile.title).toContain("ClickShare");
  });
});
