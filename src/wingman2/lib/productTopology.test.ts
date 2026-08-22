import { describe, expect, it } from "vitest";
import { buildProductTopologyProfile } from "./productTopology";
import { buildRoomSchematicSvg } from "./roomSchematic";
import {
  inferProductRole,
  type ProductNarrative,
  type ProductSpec,
} from "./productStoryEngine";

function product(overrides: Partial<ProductSpec> = {}): ProductSpec {
  return {
    sku: "HALO-90",
    name: "WyreStorm Halo 90 USB-C Docking Conference Speakerphone",
    family: "HALO",
    category: "Audio / UC",
    productType: "USB-C docking conference speakerphone",
    description: "Conference speakerphone with USB-C docking",
    purpose: "Meeting-room speakerphone and dock",
    summary: "USB-C docking and conferencing",
    keyFeatures: [],
    capabilityTags: [],
    applications: ["Meeting rooms"],
    ioSummary: [],
    video: [],
    audio: [],
    usb: [],
    network: [],
    control: [],
    power: [],
    physical: [],
    checks: [],
    related: [],
    ...overrides,
  };
}

const narrative: ProductNarrative = {
  role: "presentation",
  headline: "",
  whatItIs: "",
  whereItSits: "",
  familyFit: "",
  customerChallenge: "",
  whyItHelps: "",
  whyCustomerCares: "",
  useWhen: "",
  avoidIf: "",
  suggestedWording: "",
  demoPrompt: "",
  askNow: [],
  diagramSource: "Laptop",
  diagramOutput: "Display",
  visualPrompt: "",
};

describe("product topology", () => {
  it("models HALO-90 as a USB-C docking conference product, not an amplifier", () => {
    const halo90 = product();
    const profile = buildProductTopologyProfile(halo90, narrative);
    const svg = buildRoomSchematicSvg({ sku: "HALO-90", profile });

    expect(inferProductRole(halo90)).toBe("presentation");
    expect(profile.archetype).toBe("uc-docking-speakerphone");
    expect(profile.source.title).toBe("Laptop / room PC");
    expect(profile.output.title).toBe("Room display");
    expect(profile.sourceEdge.label).toContain("USB-C");
    expect(profile.branches.map((branch) => branch.title)).toEqual([
      "USB peripherals",
      "USB-C power source",
    ]);

    expect(svg).toContain("USB-C DOCKING CONFERENCE");
    expect(svg).toContain("USB peripherals");
    expect(svg).toContain("Room display");
    expect(svg).not.toContain("DSP / Dante network");
    expect(svg).not.toContain("To speakers");
  });

  it("keeps a conference speakerphone separate from installed amplification", () => {
    const profile = buildProductTopologyProfile(
      product({
        sku: "HALO-60",
        name: "USB Bluetooth Conference Speakerphone",
        productType: "Conference speakerphone",
      }),
      narrative,
    );

    expect(profile.archetype).toBe("uc-speakerphone");
    expect(profile.output.detail).toContain("Integrated microphones");
    expect(profile.output.title).not.toContain("Installed loudspeakers");
  });

  it("requires a compatible base product for APO-DG2", () => {
    const profile = buildProductTopologyProfile(
      product({
        sku: "APO-DG2",
        name: "Apollo USB-C Wireless Casting Dongle",
        family: "Apollo",
        category: "Presentation / UC",
        productType: "Wireless casting dongle",
      }),
      narrative,
    );

    expect(profile.archetype).toBe("wireless-casting-companion");
    expect(profile.output.title).toBe("Compatible WyreStorm host / base");
    expect(profile.warnings.join(" ")).toContain("standalone");
  });

  it("uses direction-aware NetworkHD topology", () => {
    const encoder = buildProductTopologyProfile(
      product({
        sku: "NHD-500-TX",
        name: "NetworkHD 500 Encoder",
        family: "NetworkHD 500",
        category: "AV-over-IP",
        productType: "Encoder",
      }),
      narrative,
    );

    const decoder = buildProductTopologyProfile(
      product({
        sku: "NHD-500-RX",
        name: "NetworkHD 500 Decoder",
        family: "NetworkHD 500",
        category: "AV-over-IP",
        productType: "Decoder",
      }),
      narrative,
    );

    expect(encoder.archetype).toBe("avoip-encoder");
    expect(encoder.output.title).toContain("1GbE");
    expect(decoder.archetype).toBe("avoip-decoder");
    expect(decoder.source.title).toBe("Managed 1GbE AV network switch");
    expect(decoder.sourceEdge.label).toBe("RJ-45 / Cat6 Ethernet");
    expect(decoder.outputEdge.label).toBe("HDMI");
    expect(decoder.branches[0]?.target).toBe("source");

    const decoderSvg = buildRoomSchematicSvg({
      sku: "NHD-500-RX",
      profile: decoder,
    });

    expect(decoderSvg).toContain('data-branch-target="source"');
    expect(decoderSvg).toContain("RJ-45 / Cat6 Ethernet");
    expect(decoderSvg).toContain(">HDMI<");
  });

  it("draws matrix kits as independent routed paths through their receiver layer", () => {
    const matrix = product({
      sku: "MXV-0404-H2A-KIT",
      name: "4x4 HDBaseT matrix kit with four receivers included",
      family: "MXV",
      category: "Matrix",
      productType: "4x4 HDBaseT matrix kit",
      description: "Four HDMI inputs, four HDBaseT outputs, PoH and audio de-embed",
      ioSummary: ["4 x HDMI input", "4 x RJ45 HDBaseT output"],
      video: ["4K60 4:4:4 over HDBaseT"],
      audio: ["Audio de-embed"],
      control: ["LAN", "RS-232", "IR"],
      power: ["PoH on HDBaseT outputs"],
    });
    const profile = buildProductTopologyProfile(matrix, narrative);
    const svg = buildRoomSchematicSvg({ sku: matrix.sku, profile });

    expect(profile.matrixArchitecture).toMatchObject({
      inputCount: 4,
      outputCount: 4,
      receiverCount: 4,
      inputTransport: "HDMI",
      outputTransport: "HDBaseT",
      audioBreakout: true,
      powerOverLink: true,
    });
    expect(svg).toContain("4 × 4 ROUTED SIGNAL ARCHITECTURE");
    expect(svg).toContain('data-connection="input-4"');
    expect(svg).toContain('data-connection="output-4"');
    expect(svg).toContain("Receiver 4");
    expect(svg).toContain("Independent zone");
    expect(svg).toContain("AUDIO DE-EMBED");
    expect(svg).not.toContain("Several AV sources");
  });

  it("withholds unknown topology instead of inventing a generic signal chain", () => {
    const profile = buildProductTopologyProfile(
      product({
        sku: "UNKNOWN-DEVICE",
        name: "Unknown device",
        family: "Unknown",
        category: "Product",
        productType: "Hardware",
        description: "",
        purpose: "",
        summary: "",
      }),
      narrative,
    );

    const svg = buildRoomSchematicSvg({
      sku: "UNKNOWN-DEVICE",
      profile,
    });

    expect(profile.renderable).toBe(false);
    expect(profile.confidence).toBe("review-required");
    expect(svg).toContain("TOPOLOGY REVIEW REQUIRED");
    expect(svg).not.toContain("DSP / Dante network");
  });
});
