import { describe, expect, it } from "vitest";
import { buildNetworkInfrastructureAssurance } from "./networkInfrastructureAssurance";

const nhd500 = [{ sku: "NHD-500-TX", quantity: 1 }, { sku: "NHD-500-RX", quantity: 1 }];
const nhd600 = [{ sku: "NHD-600-TRX", quantity: 2 }];
const nonAvoip = [{ sku: "EX-70-H2", quantity: 1 }];

describe("network infrastructure assurance", () => {
  it("blocks AV-over-IP designs without proven network infrastructure", () => {
    const items = buildNetworkInfrastructureAssurance({ products: nhd500 });

    expect(items.some((item) => item.id === "network-igmp-switch-unproven" && item.severity === "blocker")).toBe(true);
  });

  it("passes AV-over-IP designs when the network is evidenced in the requirements", () => {
    const items = buildNetworkInfrastructureAssurance({
      products: nhd500,
      requirementText: "The customer has a managed switch with IGMP snooping and a dedicated AV VLAN.",
    });

    expect(items.some((item) => item.id === "network-igmp-switch-unproven")).toBe(false);
  });

  it("blocks NetworkHD 600 without a 10GbE plan", () => {
    const items = buildNetworkInfrastructureAssurance({ products: nhd600 });

    expect(items.some((item) => item.id === "network-nhd600-ten-gig" && item.severity === "blocker")).toBe(true);
  });

  it("passes NetworkHD 600 when 10GbE is proven", () => {
    const items = buildNetworkInfrastructureAssurance({
      products: nhd600,
      requirementText: "10GbE switching to the transceivers.",
    });

    expect(items.some((item) => item.id === "network-nhd600-ten-gig")).toBe(false);
  });

  it("warns on high endpoint counts without proven backbone capacity", () => {
    const items = buildNetworkInfrastructureAssurance({
      products: Array.from({ length: 9 }, (_, index) => ({ sku: "NHD-500-TX", quantity: 1, title: `tx-${index}` })),
    });

    expect(items.some((item) => item.id === "network-bandwidth-endpoint-count" && item.severity === "warning")).toBe(true);
  });

  it("does not fire for non-AVoIP products", () => {
    const items = buildNetworkInfrastructureAssurance({ products: nonAvoip });

    expect(items.some((item) => item.id.startsWith("network-"))).toBe(false);
  });
});
