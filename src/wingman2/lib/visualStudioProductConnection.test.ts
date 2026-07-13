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
});
