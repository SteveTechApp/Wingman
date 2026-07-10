import { describe, expect, it } from "vitest";

import { buildProductConnectionDiagram, findProductIntelligenceEntry } from "./visualStudioProductConnection";
import { getVisualDiagramById } from "./visualStudioSamples";

describe("visual studio product connection diagram", () => {
  it("keeps the seed product as the dominant center node and support lanes secondary", () => {
    const baseModel = getVisualDiagramById("product-port-view");
    const product = {
      sku: "MX-0404-SCL",
      name: "WyreStorm MX-0404-SCL 4x4 Seamless Matrix",
      category: "Matrix switching / multiview",
      matrixSize: "4x4",
      matrixSizeEvidence: "SKU/title evidence: MX-0404-SCL / 4x4 HDMI Matrix",
      quoteSafety: "verify-before-quote",
      connectors: ["HDMI", "RJ45 / network", "Analog audio"],
      productClassification: {
        primaryCategory: "Matrix / Routing",
        category: "Seamless matrix",
        subCategory: "Fixed I/O matrix",
        productType: "Matrix routing core",
        systemRole: "Central video routing",
        applicationRole: "Fixed I/O source-to-display routing",
      },
      technicalProfile: {
        sourceQuality: {
          officialProductUrl: "https://www.wyrestorm.com/product/mx-0404-scl/",
        },
        video: {
          present: true,
          processing: ["Scaling", "Multiview", "Video wall"],
        },
        control: {
          present: true,
          protocols: ["RS-232", "API", "CEC"],
        },
        network: {
          present: true,
          interfaces: ["Ethernet", "IP Control | Web UI"],
          protocols: ["API", "Telnet"],
        },
        audio: {
          present: true,
          formats: ["PCM"],
          processing: ["DSP"],
        },
      },
    };

    const diagram = buildProductConnectionDiagram(baseModel, "MX-0404-SCL", product);
    const device = diagram.nodes.find((node) => node.id === "wyrestorm-product");
    const network = diagram.nodes.find((node) => node.id === "generic-network");

    expect(diagram.title).toContain("MX-0404-SCL");
    expect(device).toMatchObject({
      label: "MX-0404-SCL",
      kind: "switching",
      emphasis: "primary",
      status: "recommended",
    });
    expect(network?.subtitle).toMatch(/do not imply av-over-ip/i);
    expect(diagram.quoteRisks.join(" ")).toMatch(/Do not include generic third-party endpoint boxes in the WyreStorm BOM/i);

    const sources = diagram.nodes.find((node) => node.id === "generic-video-sources");
    const destinations = diagram.nodes.find((node) => node.id === "generic-video-destinations");
    expect(sources?.label).toContain("4");
    expect(destinations?.label).toContain("4");
    expect(destinations?.status).not.toBe("risk");
  });

  it("treats a distribution amplifier's outputs as duplicated, not independently routed", () => {
    const baseModel = getVisualDiagramById("product-port-view");
    const product = {
      sku: "SP-0104-H2",
      name: "4K HDMI Splitter",
      category: "General AV",
      matrixSize: "1x4",
      matrixSizeEvidence: "Title evidence: 1x4 HDMI Splitter",
      connectors: ["HDMI"],
      productClassification: {
        primaryCategory: "Distribution",
        category: "Splitter / distribution amplifier",
        subCategory: "HDMI splitter",
        productType: "One-to-many distribution",
        systemRole: "Signal distribution",
        applicationRole: "Duplicate one source to multiple displays",
      },
      technicalProfile: {
        video: { present: true, standards: ["HDMI"] },
      },
    };

    const diagram = buildProductConnectionDiagram(baseModel, "SP-0104-H2", product);
    const destinations = diagram.nodes.find((node) => node.id === "generic-video-destinations");

    expect(destinations?.label).toContain("4");
    expect(destinations?.subtitle).toMatch(/not independently routable/i);
    expect(destinations?.status).toBe("risk");
    expect(diagram.quoteRisks.join(" ")).toMatch(/distribution amplifier\/splitter/i);
  });

  it("routes an AV-over-IP encoder's network connection as an AV transport, not a generic LAN", () => {
    const baseModel = getVisualDiagramById("product-port-view");
    const product = {
      sku: "NHD-500-TX",
      name: "4K60Hz 4:4:4 Encoder",
      category: "AVoIP",
      productClassification: {
        primaryCategory: "NetworkHD AV over IP",
        category: "NetworkHD 500",
        subCategory: "Encoder",
        productType: "AVoIP endpoint",
        systemRole: "Encoder",
      },
      technicalProfile: {
        video: { present: true, standards: ["HDMI"] },
        network: {
          present: true,
          interfaces: ["1x 1GbE 8-Pin RJ45"],
          protocols: ["NetworkHD", "Dante", "AES67", "API"],
        },
        audio: {
          present: true,
          networkAudio: ["Dante", "AES67"],
        },
      },
    };

    const diagram = buildProductConnectionDiagram(baseModel, "NHD-500-TX", product);
    const avNetwork = diagram.nodes.find((node) => node.id === "generic-avoip-network");
    const audioNetwork = diagram.nodes.find((node) => node.id === "generic-audio-network");
    const destinations = diagram.nodes.find((node) => node.id === "generic-video-destinations");

    expect(avNetwork).toBeDefined();
    expect(avNetwork?.subtitle).toMatch(/not.*general office\/guest LAN/i);
    expect(audioNetwork).toBeDefined();
    expect(destinations).toBeUndefined();
  });

  it("finds product intelligence entries by sku from the fetched index shape", () => {
    const entry = findProductIntelligenceEntry(
      {
        products: [{ sku: "SW-640L-TX-W", name: "Transmitter" }, { sku: "MX-0404-SCL", name: "Matrix" }],
      },
      "mx-0404-scl",
    );

    expect(entry?.name).toBe("Matrix");
  });
});
