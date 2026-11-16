import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildProductCapabilityEvidence } from "./generate-product-intelligence-index.mjs";

describe("generated product technical evidence contract", () => {
  it("is emitted on summary records and rejects polluted product evidence", () => {
    const index = JSON.parse(readFileSync("public/product-intelligence-summary.json", "utf8"));
    const evidenceBySku = new Map(index.products.map((product) => [product.sku, product.technicalEvidence]));
    expect(evidenceBySku.get("SW-510-TX").kvm.supported).toBe(true);
    expect(evidenceBySku.get("NHD-110-RX").kvm.supported).toBe(true);
    expect(evidenceBySku.get("CAB-UAOC-15").kvm.supported).toBe(false);
    expect(evidenceBySku.get("CAB-UAOC-15").usb.present).toBe(true);
    expect(evidenceBySku.get("CAB-UAOC-15").usb.versions).toEqual(expect.arrayContaining(["2.0", "3.0"]));
    expect(evidenceBySku.get("CAB-UAOC-15").usb.evidence.join(" ")).toMatch(/USB 3\.2 GEN 2/);
    expect(evidenceBySku.get("CAB-UAOC-15").ethernetSpeeds).toEqual([]);
    expect(evidenceBySku.get("USB-HUB4").kvm.supported).toBe(false);
    expect(evidenceBySku.get("USB-HUB4").usb.versions).toEqual(expect.arrayContaining(["2.0", "3.0"]));
    for (const sku of ["TX-35-IW-KVM", "TX-35-IWC-KVM", "EX-80-KVM", "EX-100-KVM-IP", "SWX-100-IW-UX"]) {
      expect(evidenceBySku.get(sku).kvm.supported, sku).toBe(true);
    }
    for (const sku of ["MX-0808-KIT-V2", "EXA-100-EARC", "EX-40-G3"]) {
      expect(evidenceBySku.get(sku).usb.present, sku).toBe(false);
      expect(evidenceBySku.get(sku).kvm.supported, sku).toBe(false);
    }
  });

  it("recognises Synergy USB 2.0 KVM pass-through from captured source evidence", () => {
    const evidence = buildProductCapabilityEvidence({
      productClassification: { transportClass: ["HDMI", "USB-C", "HDBaseT"] },
      technicalProfile: {
        transports: ["USB-C", "USB 2.0", "HDBaseT 3.0", "KVM / USB extension"],
        usb: {
          present: true,
          versions: ["USB2.0", "USB 2.0", "USB 3.x"],
          roles: ["USB host", "USB device", "KVM / HID"],
        },
        video: { standards: ["HDMI", "HDMI 2.0b"] },
        network: { linkSpeeds: ["1GbE"] },
        io: { ports: [{ connector: "USB Type B", category: "usb", evidence: "USB Type B host port" }] },
        evidence: { technicalLines: [
          "USB 2.0 pass-through offering 300Mbps transfer and HID extension",
          "HDBaseT 3.0 switching transmitter",
          "HDMI (v2.0b) video input",
        ] },
      },
    });

    expect(evidence.usb.present).toBe(true);
    expect(evidence.usb.versions).toEqual(["2.0"]);
    expect(evidence.kvm.supported).toBe(true);
    expect(evidence.kvm.evidence.join(" ")).toMatch(/HID extension/i);
    expect(evidence.hdmiVersions).toEqual(["2.0"]);
    expect(evidence.hdbasetVersions).toEqual(["3.0"]);
    expect(evidence.ethernetSpeeds).toEqual(["1GbE"]);
  });

  it("maps documented USB 3.2 Gen 2 capability to USB 3.0 while retaining its exact evidence", () => {
    const evidence = buildProductCapabilityEvidence({
      technicalProfile: {
        usb: {
          present: true,
          versions: ["USB 3.2 GEN 2", "USB 3.x"],
          roles: ["USB peripheral"],
          evidence: ["Official product description: USB 2.0 up to USB 3.2 Gen 2."],
        },
      },
    });
    expect(evidence.usb.versions).toEqual(["3.0"]);
    expect(evidence.usb.evidence).toContain("USB 3.2 GEN 2 (technical profile)");
    expect(evidence.usb.evidence).not.toContain("USB 3.0 (technical profile)");
  });

  it.each([
    ["MX-0808-KIT-V2", {
      transports: ["HDMI", "HDBaseT"],
      usb: { present: false, versions: [], roles: [] },
      evidence: { technicalLines: ["8x HDMI inputs", "8x HDBaseT zone outputs"] },
    }, { transportClass: ["HDMI", "HDBaseT"] }],
    ["EXA-100-EARC", {
      transports: ["HDBaseT", "USB", "HDMI"],
      usb: { present: false, versions: [], roles: [], evidence: [] },
      evidence: { technicalLines: ["2x 5V 1A USB Power Supply", "USB Micro-to-A power cable"] },
    }, { transportClass: ["HDBaseT", "USB"] }],
    ["EX-40-G3", {
      transports: ["HDBaseT", "USB", "HDMI"],
      usb: { present: true, versions: [], connectors: ["USB-A"], roles: [], evidence: ["USB-A"] },
      evidence: { technicalLines: ["USB-A to Micro-B RX Power Cable"] },
      io: { ports: [{ connector: "USB-A", category: "power", evidence: "USB-A to Micro-B RX Power Cable" }] },
    }, { transportClass: ["HDBaseT", "USB"] }],
  ])("does not treat taxonomy or power-cable labels as KVM/USB support for %s", (_sku, technicalProfile, productClassification) => {
    const evidence = buildProductCapabilityEvidence({ technicalProfile, productClassification });
    expect(evidence.usb.present).toBe(false);
    expect(evidence.kvm.supported).toBe(false);
    expect(evidence.kvm.evidence).toEqual([]);
  });

  it("preserves explicit source-captured KVM/HID routing on NHD-110-RX", () => {
    const evidence = buildProductCapabilityEvidence({
      productClassification: { transportClass: ["AVoIP", "1G Ethernet"] },
      technicalProfile: {
        transports: ["AVoIP", "KVM / USB extension"],
        usb: { present: true, versions: [], roles: ["KVM / HID"] },
        evidence: { technicalLines: [
          "USB v1.1 for KVM applications – bandwidth is 115200bps (routable)",
          "Breakaway, independent routing of all video, audio, IR, USB and RS-232 streams",
        ] },
      },
    });
    expect(evidence.usb.present).toBe(true);
    expect(evidence.kvm.supported).toBe(true);
    expect(evidence.kvm.evidence).toContain("USB v1.1 for KVM applications – bandwidth is 115200bps (routable)");
  });

  it("recognises explicit bidirectional USB peripheral switching as KVM support", () => {
    const evidence = buildProductCapabilityEvidence({
      technicalProfile: {
        usb: { present: true, versions: ["USB 2.0"], roles: ["USB host", "USB device"] },
        evidence: { technicalLines: [
          "Bidirectional USB2.0 for connection of webcams, smart touchscreens and microphones",
        ] },
      },
    });
    expect(evidence.kvm.supported).toBe(true);
  });

  it("uses KVM SKU/name identity only when technical USB support is verified", () => {
    expect(buildProductCapabilityEvidence({
      sku: "EX-100-KVM-IP",
      name: "IP KVM Extender",
      technicalProfile: { usb: { present: true, versions: ["USB 2.0"], roles: ["USB host"] } },
    }).kvm.supported).toBe(true);

    expect(buildProductCapabilityEvidence({
      sku: "NHD-110-RX",
      name: "AV over IP decoder",
      tags: ["KVM / USB extension"],
      technicalProfile: {},
    }).kvm.supported).toBe(false);
  });

  it.each([
    ["CAB-UAOC-15", "15 Meter USB 3.2 Active Optical Cable", {
      category: "USB cable",
      subCategory: "Active optical cable",
      productType: "Cable",
      subClassifications: ["cable", "active-optical"],
    }],
    ["USB-HUB4", "4-Port USB 3.0 Hub", {
      category: "USB accessory",
      subCategory: "USB hub",
      productType: "Accessory",
      subClassifications: ["accessory", "usb-hub"],
    }],
  ])("does not infer KVM from peripheral boilerplate for %s", (sku, name, productClassification) => {
    const evidence = buildProductCapabilityEvidence({
      sku,
      name,
      productClassification,
      technicalProfile: {
        usb: { present: true, versions: ["USB 2.0", "USB 3.0"], roles: ["KVM / HID"] },
        io: { ports: [{ evidence: "4x USB 3.0 device ports for connecting peripheral devices" }] },
        evidence: { technicalLines: ["4x USB 3.0 device ports for connecting peripheral devices"] },
      },
    });
    expect(evidence.usb.present).toBe(true);
    expect(evidence.usb.versions).toEqual(["2.0", "3.0"]);
    expect(evidence.kvm.supported).toBe(false);
    expect(evidence.kvm.evidence).toEqual([]);
  });
});
