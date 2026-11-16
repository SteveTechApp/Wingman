import { describe, expect, it } from "vitest";
import index from "../../../public/product-intelligence-summary.json";
import { applyCatalogOverrides, buildFacetIndex, createDefaultCatalogFilterState, filterCatalogProducts, type CatalogFilterState } from "../../features/catalog/catalogIntelligence";
import { applyRuntimeAdminRecords } from "../lib/productIntelligenceIndexCache";

const catalog = applyCatalogOverrides(index.products);
const state: CatalogFilterState = { ...createDefaultCatalogFilterState(), includeAccessories: true, excludeEolSoon: false };
const skus = (patch: Partial<CatalogFilterState>) => filterCatalogProducts(catalog, { ...state, ...patch }).map((p) => p.sku);

describe("catalogue filter accuracy", () => {
  it("keeps family references out when live records replace their descriptions", () => {
    const products = [
      { sku: "SW-130-TX", summary: "Family reference, not an orderable SKU" },
      { sku: "SW-130-TX-UK", name: "3-input presentation switcher" },
      { sku: "SW-130-TX-US", name: "3-input presentation switcher" },
      { sku: "EXP-SW-0201-8K", name: "2-input HDMI switcher" },
      { sku: "EXP-SW-0401-8K", name: "4-input HDMI switcher" },
    ];
    const merged = applyRuntimeAdminRecords({ products }, [
      { sku: "SW-130-TX", summary: "3-input presentation switcher", status: "approved" },
      { sku: "SW-0X01-8K", name: "8K HDMI switcher", status: "approved" },
      { sku: "EXP-SW-0X01-8K", name: "8K HDMI switcher", status: "approved" },
    ]);
    const entries = applyCatalogOverrides(Array.isArray(merged) ? merged : merged.products);
    for (const matchMode of ["find", "filter"] as const) {
      const results = filterCatalogProducts(entries, { ...state, matchMode, families: ["Presentation Switching"] });
      expect(results.map((product) => product.sku).sort()).toEqual([
        "EXP-SW-0201-8K", "EXP-SW-0401-8K", "SW-130-TX-UK", "SW-130-TX-US",
      ]);
      expect(filterCatalogProducts(entries, { ...state, matchMode, search: "SW-130-TX" })
        .map((product) => product.sku)).toEqual(["SW-130-TX-UK", "SW-130-TX-US"]);
    }
  });

  it("finds exact SKUs with spaces or punctuation without returning compatible hosts", () => {
    for (const search of ["APO-DG2", "apo dg2", "APODG2"]) {
      expect(skus({ search })).toEqual(["APO-DG2"]);
      expect(skus({ search, matchMode: "find" })).toEqual(["APO-DG2"]);
    }
    expect(skus({ search: "APO-DG2", families: ["Matrix Switching"] })).toEqual([]);
  });

  it("never treats enabled accessories or selected facets as a search match", () => {
    expect(skus({ search: "no-such-product-xyz", matchMode: "find" })).toEqual([]);
    expect(skus({ search: "no-such-product-xyz", families: ["Audio"], matchMode: "find" })).toEqual([]);
    expect(skus({ search: "NHD 500" })).toContain("NHD-500-E-TX");
    expect(skus({ search: "NHD 500" })).not.toContain("APO-DG2");
    expect(skus({ search: "NHD 500" })).not.toContain("NHD-500");
    expect(skus({ search: "SW 130" })).not.toContain("SW-130-TX");
  });

  it("shows cables only for cable-specific intent, even when accessories are included", () => {
    const cables = ["CAB-UAOC-15", "CAB-HAOC-10", "CAB-USBC-15"];
    const nonCableIntentPatches: Partial<CatalogFilterState>[] = [
      {},
      { search: "USB" },
      { search: "HDMI" },
      { families: ["Accessories"] },
    ];
    expect(buildFacetIndex(catalog).roles).toContain("cable");
    for (const patch of nonCableIntentPatches) {
      const results = skus(patch);
      for (const sku of cables) expect(results, `${sku} leaked for ${JSON.stringify(patch)}`).not.toContain(sku);
    }

    expect(skus({ search: "USB cable" })).toContain("CAB-USBC-15");
    expect(skus({ search: "HDMI cable" })).toContain("CAB-HAOC-10");
    expect(skus({ roles: ["cable"], includeAccessories: false })).toContain("CAB-HAOC-10");
    expect(skus({ search: "CAB-HAOC-10", includeAccessories: false })).toEqual(["CAB-HAOC-10"]);
    expect(skus({ search: "APO-DG2", includeAccessories: false })).toEqual([]);
  });

  it("makes extenders discoverable and separates camera, audio and controller roles", () => {
    expect(buildFacetIndex(catalog).families).toContain("Extenders");
    expect(skus({ families: ["Extenders"] })).toContain("EX-70-H2");
    expect(skus({ families: ["Extenders"] })).toContain("RX-700");
    expect(skus({ roles: ["camera"] })).toContain("CAM-420-PTZ");
    expect(skus({ roles: ["camera"] })).not.toContain("APO-COM-MIC");
    expect(skus({ roles: ["av-over-ip-encoder"] })).toContain("NHD-500-E-TX");
    expect(skus({ roles: ["av-over-ip-encoder"] })).not.toContain("NHD-000-CTL");
    expect(skus({ families: ["Control"] })).not.toContain("EX-70-H2");
    expect(skus({ technologies: ["networkhd"] })).toContain("NHD-600-TRX");
    expect(skus({ standaloneOnly: true })).not.toContain("NHD-600-TRX");
  });

  it("filters the requested connection versions from explicit product evidence", () => {
    const technologies = buildFacetIndex(catalog).technologies;
    expect(technologies).toContain("kvm");
    expect(technologies).toContain("1gbe");
    expect(technologies).toContain("usb-2.0");
    expect(technologies).toContain("usb-3.0");
    expect(technologies).toContain("hdmi-2.0");
    expect(technologies).toContain("hdbaset-3.0");
    expect(technologies).not.toContain("usb");

    expect(skus({ technologies: ["kvm"] })).toContain("TX-35-IW-KVM");
    expect(skus({ technologies: ["kvm"] })).toContain("SW-510-TX");
    expect(skus({ technologies: ["kvm"] })).toContain("NHD-110-RX");
    expect(skus({ technologies: ["kvm"] })).not.toContain("CAB-UAOC-15");
    expect(skus({ technologies: ["kvm"] })).not.toContain("USB-HUB4");
    expect(skus({ technologies: ["1gbe"] })).toContain("M4250-GSM4212PX-10P");
    expect(skus({ technologies: ["usb-2.0"] })).toContain("APO-DG-HDMI");
    expect(skus({ technologies: ["usb-3.0"] })).toContain("APO-200-UC");
    expect(skus({ technologies: ["hdmi-2.0"], search: "HDMI cable" })).toContain("CAB-HAOC-10");
    expect(skus({ technologies: ["hdmi-2.0"], search: "HDMI cable" })).not.toContain("CAB-HAOC-FRL-10");
    expect(skus({ technologies: ["hdbaset-3.0"] })).toContain("SWX-100-HDBT3");
  });

  it("does not confuse a wireless microphone receiver with wireless casting", () => {
    const microphoneHub = catalog.find((product) => product.sku === "COM-MIC-HUB");
    expect(microphoneHub?.technologies).toContain("microphone");
    expect(microphoneHub?.technologies).not.toContain("wireless-casting");
    expect(skus({ technologies: ["wireless-casting"] })).not.toContain("COM-MIC-HUB");
  });

  it("includes actual presentation switchers and excludes their peripherals", () => {
    const expected = ["SW-120-TX3", "SW-130-TX-UK", "SW-220-TX-W", "SW-510-TX", "SW-515-RX", "SW-620-TX-W", "SW-640L-TX-W", "MX-0402-MST", "MX-0403-H3-MST", "MX-1007-HYB", "APO-210-UC", "SYN-KIT-130-EU"];
    for (const patch of [{ families: ["Presentation Switching"] as const }, { roles: ["presentation-switcher"] as const }]) {
      const results = skus(JSON.parse(JSON.stringify(patch)));
      for (const sku of expected) expect(results, sku).toContain(sku);
      for (const sku of ["APO-COM-MIC", "APO-SKY-MIC", "APO-DG1", "APO-DG2", "APO-DG-DOCK", "APO-DG-HDMI", "CAM-420-PTZ", "SW-0206-VW", "EX-70-H2", "SYN-TOUCH10"]) {
        expect(results, sku).not.toContain(sku);
      }
    }
  });

  it("keeps application metadata from assigning hardware roles or technologies", () => {
    const products = applyCatalogOverrides([{ sku: "EX-TEST", name: "HDMI extender", category: "Extension",
      summary: "HDBaseT transmitter and receiver set", tags: ["UC", "Video wall", "Multiview", "USB", "Dante"],
      applications: ["Wireless presentation", "KVM"] }]);
    expect(products[0].families).toEqual(["Extenders"]);
    expect(products[0].roles).toEqual(["extender"]);
    expect(products[0].technologies).toEqual(["hdmi", "hdbaset"]);
    const kvm = applyCatalogOverrides([{ sku: "EX-KVM", name: "USB KVM extender" }]);
    expect(kvm[0].families).toContain("KVM");
  });

  it("uses technicalEvidence for KVM and exact USB versions instead of generated tags", () => {
    const records = [
      {
        sku: "APO-DG2-PRO",
        name: "Apollo USB-C Wireless Casting Dongle",
        features: ["KVM / USB extension", "USB 2.0", "USB 3.x"],
        technologies: ["KVM / USB extension", "USB 2.0", "USB 3.0"],
        applications: ["KVM workflow"],
      },
      {
        sku: "NHD-110-RX",
        name: "NetworkHD 110 decoder",
        features: ["KVM / USB extension"],
        technologies: ["KVM / USB extension"],
        productClassification: {
          primaryCategory: "NetworkHD AV over IP",
          category: "NetworkHD 100",
          productType: "AVoIP endpoint",
          systemRole: "Decoder",
          transportClass: ["AVoIP", "NetworkHD 100", "1G Ethernet"],
          signalDomains: ["Video", "Network", "Control"],
        },
      },
      {
        sku: "SW-120-TX3",
        name: "Synergy HDBaseT 3.0 switching transmitter",
        features: ["KVM / USB extension", "USB 2.0", "USB 3.x"],
        technicalEvidence: {
          usb: { present: true, versions: ["USB 2.0"], evidence: ["USB 2.0 host port"] },
          kvm: { supported: true, evidence: ["USB keyboard and mouse transport"] },
          hdmiVersions: [],
          hdbasetVersions: ["HDBaseT 3.0"],
          ethernetSpeeds: [],
        },
      },
      {
        sku: "SWX-100-IW-UX",
        name: "Synergy in-wall HDBaseT KVM extender",
        features: ["KVM / USB extension", "USB 2.0", "USB 3.x"],
        technicalEvidence: {
          usb: { present: true, versions: ["USB 2.0"], evidence: ["USB device ports"] },
          kvm: { supported: true, evidence: ["USB keyboard and mouse extension"] },
          hdmiVersions: [],
          hdbasetVersions: ["HDBaseT 3.0"],
          ethernetSpeeds: [],
        },
      },
      {
        sku: "USB-HUB4",
        name: "USB 3.2 Hub",
        features: ["USB 2.0", "USB 3.x"],
        technologies: ["USB 2.0", "USB 3.0"],
        technicalEvidence: {
          usb: { present: true, versions: ["USB 3.2"], evidence: ["5Gbps USB 3.2 hub"] },
          kvm: { supported: false, evidence: [] },
          hdmiVersions: [],
          hdbasetVersions: [],
          ethernetSpeeds: [],
        },
      },
      {
        sku: "USB-TEST-30",
        name: "USB hub",
        features: ["USB 2.0", "USB 3.x"],
        technicalEvidence: {
          usb: { present: true, versions: ["USB 3.0"], evidence: ["USB 3.0 host port"] },
          kvm: { supported: false, evidence: [] },
          hdmiVersions: [],
          hdbasetVersions: [],
          ethernetSpeeds: [],
        },
      },
      {
        sku: "SYN-TOUCH10",
        name: "Synergy Touch Controller",
        category: "Control interface",
        features: ["Microphone", "USB 2.0"],
        productClassification: {
          primaryCategory: "Control",
          category: "Control interface",
          productType: "Control device",
          systemRole: "User or protocol control interface",
          transportClass: ["IP", "RS-232"],
        },
      },
      {
        sku: "NHD-TOUCH",
        name: "NetworkHD Touch Controller",
        category: "AVoIP infrastructure",
        features: ["Controller"],
        productClassification: {
          primaryCategory: "NetworkHD AV over IP",
          category: "AVoIP infrastructure",
          productType: "NetworkHD touch control interface",
          systemRole: "AVoIP system control",
          transportClass: ["IP"],
        },
      },
    ];
    const entries = applyCatalogOverrides(records);
    const filter = (technology: "kvm" | "usb-2.0" | "usb-3.0") =>
      filterCatalogProducts(entries, { ...state, technologies: [technology] }).map((product) => product.sku);

    expect(filter("kvm")).not.toContain("APO-DG2-PRO");
    expect(filter("kvm")).not.toContain("NHD-110-RX");
    expect(filter("kvm")).toContain("SW-120-TX3");
    expect(filter("kvm")).toContain("SWX-100-IW-UX");
    expect(filter("usb-2.0")).toContain("SW-120-TX3");
    expect(filter("usb-2.0")).not.toContain("USB-HUB4");
    expect(filter("usb-3.0")).not.toContain("USB-HUB4");
    expect(filter("usb-3.0")).toContain("USB-TEST-30");
    expect(entries.find((product) => product.sku === "SYN-TOUCH10")?.roles).toContain("controller");
    expect(entries.find((product) => product.sku === "SYN-TOUCH10")?.roles).not.toContain("audio-endpoint");
    expect(entries.find((product) => product.sku === "NHD-TOUCH")?.roles).toContain("controller");
    expect(entries.find((product) => product.sku === "NHD-TOUCH")?.roles).not.toContain("network-switch");
    expect(catalog.find((product) => product.sku === "APO-DG-HDMI")?.roles).not.toContain("audio-endpoint");
  });

  it("combines alternatives within a facet and requirements across facets", () => {
    const matches = filterCatalogProducts(catalog, { ...state, families: ["Extenders", "Matrix Switching"], technologies: ["hdbaset"] });
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((p) => p.technologies.includes("hdbaset") && p.families.some((f) => f === "Extenders" || f === "Matrix Switching"))).toBe(true);
  });
});
