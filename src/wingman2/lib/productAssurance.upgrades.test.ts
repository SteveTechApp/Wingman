import { describe, expect, it } from "vitest";
import { buildDesignAssuranceLedger } from "./productAssurance";
import { createBlankProjectTopology } from "./projectTopology";

function topologyWithRun(lengthMetres: number, services: string[] = ["video"]) {
  const topology = createBlankProjectTopology();
  topology.locations = [{ id: "loc-a", name: "A", type: "table" }, { id: "loc-b", name: "B", type: "display-wall" }];
  topology.devices = [
    { id: "dev-a", name: "Source", category: "source", locationId: "loc-a", quantity: 1, thirdParty: true, status: "assumed" },
    { id: "dev-b", name: "Display", category: "display", locationId: "loc-b", quantity: 1, thirdParty: true, status: "assumed" },
  ];
  topology.connections = [{
    id: "conn-1",
    fromDeviceId: "dev-a",
    toDeviceId: "dev-b",
    services: services as never[],
    transport: "hdbaset-3",
    lengthMode: "estimated",
    lengthMetres,
    status: "assumed",
  }];
  return topology;
}

describe("assurance ledger wiring for the five upgrades", () => {
  it("runs chain, regional, power, network and feedback checks through one ledger", () => {
    const ledger = buildDesignAssuranceLedger({
      products: [
        { sku: "MXV-0808-H2A-70-V3", quantity: 1 },
        { sku: "NHD-500-TX", quantity: 1 },
      ],
      requirementText: "A boardroom with 4K60 4:4:4 to one display.",
      discoveryPercent: 100,
      topology: topologyWithRun(80),
      region: "United Kingdom",
      feedback: [
        { id: "f1", createdAt: "2026-01-01", scope: "proposal", rating: "wrong-fit", label: "Wrong fit", sku: "MXV-0808-H2A-70-V3" },
      ],
    });

    // Cross-product: the 80 m topology run exceeds the matrix's governed
    // 70 m HDBaseT reach, which blocks.
    expect(ledger.blockers.some((item) => item.id === "chain-distance-exceeds-MXV-0808-H2A-70-V3")).toBe(true);
    // Network: an NHD-500 endpoint with no proven managed network blocks.
    expect(ledger.blockers.some((item) => item.id === "network-igmp-switch-unproven")).toBe(true);
    // Feedback loop: the matrix previously received wrong-fit feedback.
    expect(ledger.warnings.some((item) => item.id === "feedback-MXV-0808-H2A-70-V3-wrong-fit")).toBe(true);
    // Regional: no regional variant family is involved, so no regional item fires.
    expect(ledger.items.some((item) => item.id.startsWith("regional-"))).toBe(false);
  });

  it("surfaces a regional blocker when a family base SKU is quoted directly", () => {
    const ledger = buildDesignAssuranceLedger({
      products: [{ sku: "SW-130-TX", quantity: 1 }],
      discoveryPercent: 100,
      region: "United Kingdom",
    });

    expect(ledger.blockers.some((item) => item.id === "regional-base-sku-SW130TX")).toBe(true);
  });

  it("surfaces a remote-power blocker when the requirement asks for PoH the profiles do not prove", () => {
    const ledger = buildDesignAssuranceLedger({
      products: [{ sku: "EXP-SW-0401-8K", quantity: 1 }],
      requirementText: "Displays are powered remotely over PoH.",
      discoveryPercent: 100,
    });

    expect(ledger.blockers.some((item) => item.id === "power-remote-unproven")).toBe(true);
  });
});
