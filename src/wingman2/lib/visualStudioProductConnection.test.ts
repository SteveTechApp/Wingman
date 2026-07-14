import { describe, expect, it } from "vitest";

import { buildReactFlowModel } from "./visualStudioDiagramFactory";
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
      technicalProfile: {
        sourceQuality: {
          officialProductUrl: "https://www.wyrestorm.com/product/mx-0404-scl/",
        },
        video: {
          processing: ["Scaling", "Multiview", "Video wall"],
        },
        control: {
          protocols: ["RS-232", "API", "CEC"],
        },
        network: {
          interfaces: ["Ethernet", "IP Control | Web UI"],
        },
        audio: {
          formats: ["PCM"],
          processing: ["DSP"],
        },
      },
    };

    const diagram = buildProductConnectionDiagram(baseModel, "MX-0404-SCL", product);
    const device = diagram.nodes.find((node) => node.id === "device");
    const network = diagram.nodes.find((node) => node.id === "network");

    expect(diagram.title).toContain("MX-0404-SCL");
    expect(device).toMatchObject({
      label: "MX-0404-SCL",
      kind: "switching",
      emphasis: "primary",
      status: "recommended",
    });
    expect(network?.subtitle).toMatch(/not the lead architecture/i);
    expect(diagram.quoteRisks.join(" ")).toMatch(/Do not treat support connectors or accessories as the lead recommendation/i);
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

  it("keeps generated AVoIP and network-audio endpoints in the technical schematic model", () => {
    const baseModel = getVisualDiagramById("product-port-view");
    const product = {
      sku: "NHD-500-TX",
      name: "NetworkHD 500 Series Encoder",
      category: "AV-over-IP encoder",
      quoteSafety: "verify-before-quote",
      connectors: ["HDMI", "RJ45", "Audio"],
      technicalProfile: {
        transports: ["NetworkHD AV-over-IP"],
        network: {
          interfaces: ["Ethernet", "Multicast AV network"],
        },
        audio: {
          networkAudio: ["Dante"],
        },
      },
    };

    const diagram = buildProductConnectionDiagram(baseModel, "NHD-500-TX", product);
    const nodeIds = new Set(diagram.nodes.map((node) => node.id));

    expect(nodeIds.has("generic-avoip-network")).toBe(true);
    expect(nodeIds.has("generic-audio-network")).toBe(true);
    expect(diagram.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "e-avoip-network", target: "generic-avoip-network" }),
        expect.objectContaining({ id: "e-audio-network", target: "generic-audio-network" }),
      ]),
    );
    expect(diagram.edges.every((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))).toBe(true);

    const flowModel = buildReactFlowModel(diagram, "technical");
    expect(flowModel.nodes.find((node) => node.id === "generic-avoip-network")?.position).toEqual({ x: 532, y: 20 });
    expect(flowModel.edges.find((edge) => edge.id === "e-avoip-network")).toMatchObject({
      source: "device",
      target: "generic-avoip-network",
      sourceHandle: "source-top",
      targetHandle: "target-bottom",
    });
  });

  it("shows a receiver (RX) with a transport input and a real HDMI display output, not a fake source-side input", () => {
    const baseModel = getVisualDiagramById("product-port-view");
    const product = {
      sku: "EX-70-RX",
      name: "18Gbps 4K HDR HDBaseT Receiver",
      category: "Extender",
      quoteSafety: "verify-before-quote",
    };

    const diagram = buildProductConnectionDiagram(baseModel, "EX-70-RX", product);
    const inputs = diagram.nodes.find((node) => node.id === "inputs");
    const outputs = diagram.nodes.find((node) => node.id === "outputs");

    expect(inputs?.label).toMatch(/Transport Input/);
    expect(inputs?.subtitle).toMatch(/no direct source-side HDMI input/i);
    expect(outputs?.label).toBe("Displays / Outputs");
    expect(diagram.assumptions.join(" ")).toMatch(/EX-70-RX is a receiver: HDMI display output only/i);
  });

  it("shows a transmitter (TX) with a real HDMI source input and a transport output, not a fake display output", () => {
    const baseModel = getVisualDiagramById("product-port-view");
    const product = {
      sku: "EX-70-TX",
      name: "18Gbps 4K HDR HDBaseT Transmitter",
      category: "Extender",
      quoteSafety: "verify-before-quote",
    };

    const diagram = buildProductConnectionDiagram(baseModel, "EX-70-TX", product);
    const inputs = diagram.nodes.find((node) => node.id === "inputs");
    const outputs = diagram.nodes.find((node) => node.id === "outputs");

    expect(inputs?.label).toBe("Sources / Inputs");
    expect(outputs?.label).toMatch(/Transport Output/);
    expect(outputs?.subtitle).toMatch(/no direct display output/i);
    expect(diagram.assumptions.join(" ")).toMatch(/EX-70-TX is a transmitter: HDMI source input only/i);
  });

  it("keeps a transceiver's real source input and network-mediated display output on both sides", () => {
    const baseModel = getVisualDiagramById("product-port-view");
    const product = {
      sku: "NHD-600-TRX",
      name: "NetworkHD 600 Series Transceiver",
      category: "AVoIP",
      quoteSafety: "verify-before-quote",
    };

    const diagram = buildProductConnectionDiagram(baseModel, "NHD-600-TRX", product);
    const inputs = diagram.nodes.find((node) => node.id === "inputs");
    const outputs = diagram.nodes.find((node) => node.id === "outputs");

    expect(inputs?.label).toBe("Sources / Inputs");
    expect(outputs?.label).toBe("NetworkHD Decoder / Display");
  });

  it("keeps camera USB endpoints positioned when a UC camera product is selected", () => {
    const baseModel = getVisualDiagramById("product-port-view");
    const product = {
      sku: "APO-VX20-UC-V2",
      name: "Apollo video bar",
      category: "USB-C video bar camera",
      quoteSafety: "verify-before-quote",
      connectors: ["USB-C", "HDMI", "RJ45"],
      technicalProfile: {
        transports: ["USB", "HDMI"],
      },
    };

    const diagram = buildProductConnectionDiagram(baseModel, "APO-VX20-UC-V2", product);
    const flowModel = buildReactFlowModel(diagram, "technical");

    expect(diagram.nodes.map((node) => node.id)).toEqual(
      expect.arrayContaining(["generic-usb-host", "generic-usb-camera-endpoint"]),
    );
    expect(flowModel.nodes.find((node) => node.id === "generic-usb-host")?.position).toEqual({ x: 20, y: 720 });
    expect(flowModel.nodes.find((node) => node.id === "generic-usb-camera-endpoint")?.position).toEqual({ x: 532, y: 720 });
    expect(flowModel.edges.map((edge) => edge.id)).toEqual(
      expect.arrayContaining(["e-usb-host", "e-usb-camera-endpoint"]),
    );
  });
});
