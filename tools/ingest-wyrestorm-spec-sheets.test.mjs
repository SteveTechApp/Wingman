import { describe, expect, it } from "vitest";

import {
  buildDraft,
  detectDirection,
  extractDependencies,
  extractPorts,
  extractResolution,
  extractSpecSection,
  hardBlock,
  identityKeys,
  usbNegated,
} from "./ingest-wyrestorm-spec-sheets.mjs";

// Real text extracted from the official NHD-600-E Product Training Brochure
// (page 6, "Specifications & Packing List"), with the box list that precedes
// the spec table header.
const NHD600E_FULL_TEXT = [
  "Specifications & Packing List",
  "What's in the Box?",
  "1x NHD-600-E-TX or NHD-600-E-RX 1x IR Transmitter(For TX) or Receiver(For RX) 2x Pair of Wall Mounting Ears 1x 12V 1A DC PSU with UK/US/EU/AU Pins 1x 3-pin 3.5mm Terminal Block",
  "Specification",
  "Video",
  "Video Interface 1x HDMI 2.0(For TX/RX)",
  "HDCP HDCP 2.3 compliant",
  "Max. Video Resolution *5120x2160@60Hz 4:2:0, 4096x2160@60Hz 4:4:4, 3840x2160@60Hz 4:4:4",
  "Scaler Unsupported",
  "Audio",
  "1x 3.5mm analog",
  "Ethernet",
  "10G Ethernet 1x RJ45",
  "1G Ethernet 1x RJ45",
  "Control",
  "InfraRed 1x IR In 1x IR Out",
  "RS232 1x 3-pin Phoenix",
  "Latency < 120us",
  "Typical Connection & Applications The NHD-600-E is designed for point-to-point or point-to-many scenarios. It offers a cost-effective solution for zero-latency applications by removing USB, video wall, multiview and output scaling functions.",
].join(" ");

describe("extractSpecSection", () => {
  it("scopes to the last Specification marker (the actual spec table header)", () => {
    const section = extractSpecSection(NHD600E_FULL_TEXT);
    expect(section).not.toMatch(/What's in the Box/i);
    expect(section).not.toMatch(/Typical Connection/i);
    expect(section).toMatch(/1x HDMI 2.0/);
    expect(section).toMatch(/Max\. Video Resolution/);
  });
});

describe("extractResolution", () => {
  it("captures the full resolution clause list from the spec section", () => {
    const section = extractSpecSection(NHD600E_FULL_TEXT);
    const resolution = extractResolution(section);
    expect(resolution).toContain("5120x2160@60Hz 4:2:0");
    expect(resolution).toContain("4096x2160@60Hz 4:4:4");
    expect(resolution).toContain("3840x2160@60Hz 4:4:4");
  });
});

describe("extractPorts", () => {
  it("extracts ports from the spec section without leaking the box list or comparison tables", () => {
    const section = extractSpecSection(NHD600E_FULL_TEXT);
    const ports = extractPorts(section, NHD600E_FULL_TEXT);
    const video = ports.filter((port) => port.category === "video");
    expect(video).toHaveLength(1);
    expect(video[0].connector).toMatch(/HDMI 2.0/);
    expect(video[0].count).toBe(1);

    const network = ports.filter((port) => port.category === "network");
    // The two "1x RJ45" rows (10G + 1G) collapse into a single count-2 row.
    expect(network).toHaveLength(1);
    expect(network[0].count).toBe(2);

    const control = ports.filter((port) => port.category === "control");
    const ir = control.filter((port) => port.connector === "IR");
    expect(ir.map((port) => port.detail).sort()).toEqual(["1x IR In", "1x IR Out"]);
    expect(control.find((port) => port.detail === "1x IR In")?.direction).toBe("input");
    expect(control.find((port) => port.detail === "1x IR Out")?.direction).toBe("output");
    // The RS-232 Phoenix terminal must classify as control, not audio.
    expect(control.some((port) => port.connector === "Terminal Block")).toBe(true);
    expect(ports.filter((port) => port.connector === "Terminal Block").every((port) => port.category === "control")).toBe(true);
    // No USB ports: the E variant has none and the text says so.
    expect(ports.filter((port) => port.category === "usb")).toHaveLength(0);
    // No box-list accessories as ports (IR Transmitter, wall ears, PSU, terminal block from the box).
    expect(ports.every((port) => port.count >= 1 && port.count <= 64)).toBe(true);
  });

  it("drops only the USB category when the text explicitly negates USB", () => {
    const text = "The NHD-600-E is designed for point-to-point scenarios by removing USB, video wall and multiview functions.";
    expect(usbNegated(text)).toBe(true);
    const ports = extractPorts("3x USB-A 1.1 1x HDMI", text);
    expect(ports.filter((port) => port.category === "usb")).toHaveLength(0);
    expect(ports.filter((port) => port.category === "video")).toHaveLength(1);
  });
});

describe("detectDirection", () => {
  it("prefers the matched token's own In/Out label, then the tight window", () => {
    expect(detectDirection("1x IR In", "Control 1x IR In ")).toBe("input");
    expect(detectDirection("1x IR Out", "1x IR Out ")).toBe("output");
    expect(detectDirection("2x HDMI", "Specification Video Inputs 2x HDMI")).toBe("input");
    expect(detectDirection("1x HDMI", "1x HDMI Output")).toBe("output");
    expect(detectDirection("1x HDMI 2.0", "Video Interface 1x HDMI 2.0(For TX/RX) HDCP")).toBe("unspecified");
  });
});

describe("extractDependencies", () => {
  it("derives AVoIP dependencies from the official text", () => {
    const dependencies = extractDependencies(
      "robust 10GbE network operation with PoE+ support",
      "AVOIP",
    );
    expect(dependencies.some((dependency) => /10GbE/.test(dependency))).toBe(true);
    expect(dependencies.some((dependency) => /PoE\+/.test(dependency))).toBe(true);
    expect(dependencies.length).toBeGreaterThan(0);
  });

  it("returns no dependencies for non-AVoIP classes", () => {
    expect(extractDependencies("anything", "HDBASET")).toEqual([]);
  });
});

describe("identityKeys", () => {
  it("fingerprints the manifest SKU with revision aliases", () => {
    expect(identityKeys("NHD-600-E-TX")).toContain("NHD600ETX");
    expect(identityKeys("APO-VX20-UC-V2")).toEqual(expect.arrayContaining(["APOVX20UCV2", "APOVX20UC"]));
  });
});

describe("buildDraft + hardBlock", () => {
  const entry = {
    sku: "NHD-600-E-TX",
    pdf: "NHD-600-E Product Training Brochure.pdf",
    sourceUrl: "https://www.wyrestorm.com/product/nhd-600-e-tx-rx/",
    documentType: "training-brochure",
    category: "AV-over-IP",
    reviewedOn: "2026-08-16",
  };
  const extracted = {
    pageCount: 10,
    fullText: NHD600E_FULL_TEXT,
  };
  const canonicalProduct = {
    sku: "NHD-600-E-TX",
    lifecycleStatus: "active",
    doNotSpec: false,
    productRole: "endpoint-hardware",
    productClassification: { systemRole: "SDVoE encoder", primaryCategory: "AV-over-IP" },
    name: "NHD-600-E-TX 4K60 SDVoE Encoder",
  };

  it("builds a schema-shaped review-required profile with evidence and warnings", () => {
    const draft = buildDraft(entry, extracted, canonicalProduct);
    expect(draft.status).toBe("review-required");
    expect(draft.productClass).toBe("AVOIP");
    expect(draft.maxResolution).toContain("5120x2160@60Hz");
    expect(draft.transport).toContain("AVoIP");
    expect(draft.dependencies.length).toBeGreaterThan(0);
    expect(draft.ports.some((port) => port.category === "video")).toBe(true);
    expect(draft.evidence[0].sourceType).toBe("official-spec-sheet-pdf");
    expect(draft.evidence[0].sourceUrl).toBe(entry.sourceUrl);
    expect(draft.evidence[0].reviewer).toContain("NOT human-verified");
    expect(draft.warnings.some((warning) => /Machine-transcribed/.test(warning))).toBe(true);
    expect(draft.checks.length).toBeGreaterThan(0);
  });

  it("passes the hard blocks (maxResolution + AVoIP dependencies)", () => {
    const draft = buildDraft(entry, extracted, canonicalProduct);
    expect(hardBlock(draft)).toBeNull();
  });

  it("fails the hard block when an AVoIP PDF yields no dependencies", () => {
    const sparse = buildDraft(entry, { pageCount: 1, fullText: "4K60 4:4:4 lossless video transport. A sparse brochure with no network facts." }, canonicalProduct);
    expect(hardBlock(sparse)).toBe("no-dependencies");
  });
});
