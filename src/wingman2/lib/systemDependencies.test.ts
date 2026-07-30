import { describe, expect, it } from "vitest";
import { deriveSystemRequirements } from "./systemDependencies";
import { classifyCompetitorCompareDecision } from "./competitorCompareDecision";

describe("deriveSystemRequirements", () => {
  it("an AV-over-IP encoder needs a decoder, a network and a controller", () => {
    const { standalone, requires } = deriveSystemRequirements({
      domain: "AVOIP",
      role: "AVoIP encoder",
      sku: "NHD-500-TX",
    });
    expect(standalone).toBe(false);
    const blob = requires.join(" ").toLowerCase();
    expect(blob).toMatch(/decoder/);
    expect(blob).toMatch(/network/);
    expect(blob).toMatch(/controller/);
  });

  it("an AV-over-IP decoder needs an encoder/source, a network and a controller", () => {
    const { standalone, requires } = deriveSystemRequirements({
      domain: "AVOIP",
      role: "AVoIP decoder",
      sku: "NHD-500-RX",
    });
    expect(standalone).toBe(false);
    expect(requires.join(" ").toLowerCase()).toMatch(/encoder|source/);
  });

  it("a standalone HDBaseT transmitter (in-wall plate) needs a receiver, unless the display has an HDBaseT input", () => {
    const { standalone, requires } = deriveSystemRequirements({
      domain: "PRESENTATION",
      role: "presentation switching transmitter",
      sku: "SW-120-TX3-UK",
      transport: "HDBaseT 3.0",
    });
    expect(standalone).toBe(false);
    const blob = requires.join(" ").toLowerCase();
    expect(blob).toMatch(/receiver/);
    expect(blob).toMatch(/hdbaset input|projector|display/);
  });

  it("a standalone HDBaseT receiver needs a transmitter or matrix output", () => {
    const { requires } = deriveSystemRequirements({
      domain: "HDBASET",
      role: "HDBaseT receiver",
      sku: "RX-70-4K",
    });
    expect(requires.join(" ").toLowerCase()).toMatch(/transmitter|matrix|in-wall/);
  });

  it("a complete extender SET (TX+RX bundle) is treated as standalone", () => {
    const { standalone } = deriveSystemRequirements({
      domain: "HDBASET",
      role: "AV extender set",
      sku: "EX-70-H2",
    });
    expect(standalone).toBe(true);
  });

  it("a matrix or splitter is standalone (needs only sources/displays, no WyreStorm companion)", () => {
    expect(deriveSystemRequirements({ domain: "MATRIX", role: "matrix switcher", sku: "MX-0808-SCL-V2" }).standalone).toBe(true);
    expect(deriveSystemRequirements({ domain: "DISTRIBUTION", role: "HDMI splitter", sku: "SP-0104-H2" }).standalone).toBe(true);
  });

  it("harvests explicit companion requirements from governed free-text dependencies", () => {
    const { requires } = deriveSystemRequirements({
      domain: "MATRIX",
      role: "matrix switcher",
      sku: "MXV-0808-H2A-70-V3",
      dependencies: ["Matrix only - no receivers bundled. Pair with RXV-70-4K-G2 for 70m 4K60 4:4:4"],
    });
    expect(requires.join(" ")).toMatch(/RXV-70-4K-G2/);
  });
});

describe("classifyCompetitorCompareDecision surfaces systemRequirements", () => {
  it("carries the WyreStorm candidate's system requirements onto the result", () => {
    const result = classifyCompetitorCompareDecision({
      competitor: { sku: "COMP-AVOIP", domain: "AVOIP", role: "encoder", transport: "AV over IP" },
      wyrestorm: {
        sku: "NHD-500-TX",
        domain: "AVOIP",
        role: "AVoIP encoder",
        transport: "1GbE AV network",
        systemRequirements: [
          "at least one matching AV-over-IP decoder",
          "a suitable managed AV network switch",
          "a NetworkHD system controller (e.g. NHD-CTL-PRO-V2) and a control system",
        ],
      },
    });
    expect(result.systemRequirements.join(" ").toLowerCase()).toMatch(/decoder/);
    expect(result.systemRequirements.join(" ").toLowerCase()).toMatch(/controller/);
  });
});
