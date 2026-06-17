import { describe, expect, it } from "vitest";
import type { StoredDiscoveryBrief } from "../data/projectStore";
import { buildRecommendationEvidence } from "./recommendationEvidence";

function discoveryBrief(roomModel: Record<string, unknown>): StoredDiscoveryBrief {
  return {
    roomModel,
    inference: {},
  } as unknown as StoredDiscoveryBrief;
}

function joined(values: unknown[]) {
  return values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => String(value ?? ""))
    .join(" ")
    .toLowerCase();
}

describe("Priority 3 recommendation architecture scenarios", () => {
  it("keeps a meeting room USB-C/BYOM brief on a meeting-room path rather than defaulting to AVoIP", () => {
    const evidence = buildRecommendationEvidence({
      source: "Priority 3 scenario",
      query: "Small meeting room with USB-C laptop input, BYOM conferencing, camera, speakerphone and one display.",
      discoveryBrief: discoveryBrief({
        applicationType: "Meeting room",
        roomType: "Small meeting room",
        sourceCount: 2,
        displayCount: 1,
        displays: "1 display",
        usbTransport: "USB-C laptop host to room camera and speakerphone",
        usbOwnership: "User laptop owns the USB session",
        audioPath: "Room speakerphone",
        controlNeeds: "Simple room control",
        networkAvailability: "Local network available, but not required for video transport",
      }),
      product: {
        sku: "MX-0402-MST",
        title: "Meeting-room presentation switcher",
        family: "Presentation Switchers",
        category: "Meeting room",
        summary: "USB-C and HDMI presentation switching for meeting rooms.",
        tags: ["usb-c", "byom", "meeting room"],
      },
    });

    expect(evidence.systemShape).toContain("Meeting-room direction");
    expect(evidence.systemShape).not.toContain("NetworkHD direction");
    expect(joined(evidence.requiredDependencies)).toContain("usb");
    expect(joined(evidence.customerSafeWording)).toContain("captured room requirement");
  });

  it("keeps contained hospitality TV distribution on matrix or switcher direction when routing is local and fixed", () => {
    const evidence = buildRecommendationEvidence({
      source: "Priority 3 scenario",
      query: "Sports bar with local sources feeding eight displays over contained cable routes.",
      discoveryBrief: discoveryBrief({
        applicationType: "Hospitality",
        roomType: "Sports bar",
        sourceCount: 4,
        displayCount: 8,
        displays: "Eight displays",
        displayBehaviour: "Contained routing with simple source selection",
        distanceInfrastructureNotes: "Contained local rack and display cabling",
        resolutionRequirement: "4K60",
        audioPath: "Display audio plus bar audio feed",
        controlNeeds: "Simple source selection",
      }),
      product: {
        sku: "MX-0808-KIT",
        title: "8x8 matrix kit",
        family: "Matrix",
        category: "Hospitality distribution",
        summary: "Contained HDMI/HDBaseT matrix direction for hospitality TV distribution.",
        tags: ["matrix", "hospitality", "sports bar"],
      },
    });

    expect(evidence.systemShape).toContain("Contained routing direction");
    expect(evidence.systemShape).not.toContain("NetworkHD direction");
    expect(joined(evidence.optionalUpgrades)).toContain("matrix");
    expect(joined(evidence.alternatives)).toContain("datasheet");
  });

  it("forces HE teaching room recommendations to expose USB, audio and control checks", () => {
    const evidence = buildRecommendationEvidence({
      source: "Priority 3 scenario",
      query: "Higher education teaching room with lectern PC, USB-C laptop, Teams capture, microphones, confidence display and touch control.",
      discoveryBrief: discoveryBrief({
        applicationType: "Higher education",
        roomType: "Teaching room",
        sourceCount: 4,
        displayCount: 2,
        displays: "Main display and confidence display",
        displayBehaviour: "Teaching output plus confidence monitor",
        usbTransport: "USB routing for camera and capture devices",
        audioPath: "Room microphones and programme audio",
        controlNeeds: "Lectern touch panel and device control",
        networkAvailability: "Managed university network available",
        resolutionRequirement: "4K60",
      }),
      product: {
        sku: "MX-1007-HYB",
        title: "Hybrid teaching room switcher",
        family: "Hybrid Matrix",
        category: "Education",
        summary: "Hybrid presentation, USB, audio and control direction for teaching spaces.",
        tags: ["education", "usb", "audio", "control"],
      },
    });

    const evidenceBlob = joined([
      evidence.systemShape,
      evidence.evidenceUsed,
      evidence.requiredDependencies,
      evidence.quoteChecks,
      evidence.customerSafeWording,
    ]);

    expect(evidenceBlob).toContain("usb");
    expect(evidenceBlob).toContain("audio");
    expect(evidenceBlob).toContain("control");
    expect(evidence.quoteSafetyStatus).not.toBe("quote-ready");
  });

  it("treats LED wall work as a dedicated processor validation path before AVoIP", () => {
    const evidence = buildRecommendationEvidence({
      source: "Priority 3 scenario",
      query: "Casino LED wall needing source presets and processor path into a Novastar LED processor.",
      discoveryBrief: discoveryBrief({
        applicationType: "Casino",
        roomType: "Gaming floor",
        sourceCount: 4,
        displayCount: 1,
        videoWallRequirement: "LED wall through Novastar processor",
        displayBehaviour: "Preset source layouts and full canvas output",
        distanceInfrastructureNotes: "Rack to LED processor",
        resolutionRequirement: "4K60 source canvas",
        controlNeeds: "Preset layout control",
      }),
      product: {
        sku: "NHD-0401-MV",
        title: "4-input multiview processor",
        family: "Multiview",
        category: "Video wall support",
        summary: "Multiview canvas source processing for LED wall processor workflows.",
        tags: ["led wall", "multiview", "novastar"],
      },
    });

    expect(evidence.systemShape).toContain("dedicated processor path");
    expect(joined(evidence.optionalUpgrades)).toContain("sw-0206-vw");
    expect(joined(evidence.alternatives)).toContain("do not assume av-over-ip");
    expect(joined(evidence.missingInformation)).toContain("wall layout");
  });

  it("adds NetworkHD controller and managed-network checks for genuine flexible multi-room AVoIP", () => {
    const evidence = buildRecommendationEvidence({
      source: "Priority 3 scenario",
      query: "Flexible multi-room AV-over-IP distribution with remote sources and displays across managed network switches.",
      discoveryBrief: discoveryBrief({
        applicationType: "Multi-room distribution",
        roomType: "Distributed AV estate",
        sourceCount: 6,
        displayCount: 18,
        displays: "Displays across multiple rooms",
        displayBehaviour: "Any source to any display",
        distanceInfrastructureNotes: "Networked building distribution",
        networkAvailability: "Managed network available with AV VLAN",
        resolutionRequirement: "4K60",
        controlNeeds: "Centralised route control",
      }),
      product: {
        sku: "NHD-500-TX",
        title: "NetworkHD 500 encoder",
        family: "NetworkHD 500",
        category: "AV-over-IP",
        summary: "Premium 4K60 AV-over-IP for flexible distributed routing.",
        tags: ["NetworkHD", "AVoIP", "managed network"],
      },
    });

    const dependencyBlob = joined(evidence.requiredDependencies);
    const evidenceBlob = joined([evidence.systemShape, evidence.quoteChecks, evidence.alternatives]);

    expect(evidence.systemShape).toContain("NetworkHD direction");
    expect(dependencyBlob).toContain("nhd-ctl-pro");
    expect(dependencyBlob).toContain("managed network");
    expect(evidenceBlob).toContain("series interoperability");
  });
  it("uses product-family scoring before SKU selection for meeting rooms", () => {
    const evidence = buildRecommendationEvidence({
      source: "priority3-family-scoring-test",
      product: {
        sku: "APO-VX20-UC",
        name: "APO-VX20-UC",
        family: "Presentation / UC",
      },
      query: "Small meeting room with USB-C, BYOM laptop, camera, speakerphone and one display",
    });

    const customerText = evidence.customerSafeWording.join(" ");
    const internalText = evidence.internalGuidance.join(" ");
    const evidenceText = evidence.evidenceUsed.join(" ");

    expect(customerText).toContain("leading product-family path is Presentation / UC");
    expect(internalText).toContain("Use product-family scoring before SKU selection");
    expect(evidenceText).toContain("Product-family score: Presentation / UC");
  });

  it("scores dedicated video wall processor first for LED wall briefs", () => {
    const evidence = buildRecommendationEvidence({
      source: "priority3-family-scoring-test",
      product: {
        sku: "SW-0206-VW",
        name: "SW-0206-VW",
        family: "Video wall processor",
      },
      query: "Casino LED wall using a Novastar processor path with four sources and preset layouts",
    });

    const customerText = evidence.customerSafeWording.join(" ");
    const evidenceText = evidence.evidenceUsed.join(" ");

    expect(customerText).toContain("leading product-family path is Video wall processor");
    expect(evidenceText).toContain("Product-family score: Video wall processor");
    expect(evidence.quoteChecks.join(" ")).toContain("Product-family caution: NetworkHD");
  });

});
