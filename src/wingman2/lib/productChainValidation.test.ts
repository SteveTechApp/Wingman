import { describe, expect, it } from "vitest";
import { buildProductChainAssurance } from "./productChainValidation";
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

const txOnly = [
  { sku: "SW-130-TX-UK", title: "SW-130-TX-UK", quantity: 1 },
];

const txWithRx = [
  { sku: "SW-130-TX-UK", title: "SW-130-TX-UK", quantity: 1 },
  { sku: "RX-700", title: "RX-700", quantity: 1 },
];

const rxOnly = [
  { sku: "RX-700", title: "RX-700", quantity: 1 },
];

const mixedNetworkHd = [
  { sku: "NHD-500-TX", title: "NHD-500-TX", quantity: 1 },
  { sku: "NHD-600-TRX", title: "NHD-600-TRX", quantity: 1 },
];

const usb3WithUsb2Extender = [
  { sku: "EX-100-USB3", title: "EX-100-USB3", quantity: 1 },
  { sku: "EX-60-USB2", title: "EX-60-USB2", quantity: 1 },
];

describe("product chain validation", () => {
  it("blocks a standalone transmitter with no receive side", () => {
    const items = buildProductChainAssurance({ products: txOnly });

    expect(items.some((item) => item.id === "chain-tx-without-rx-SW130TXUK" && item.severity === "blocker")).toBe(true);
  });

  it("passes a transmitter paired with a compatible receiver", () => {
    const items = buildProductChainAssurance({ products: txWithRx });

    expect(items.some((item) => item.id.startsWith("chain-tx-without-rx"))).toBe(false);
    expect(items.some((item) => item.id.startsWith("chain-rx-without-tx"))).toBe(false);
  });

  it("blocks a receiver with no transmit side", () => {
    const items = buildProductChainAssurance({ products: rxOnly });

    expect(items.some((item) => item.id === "chain-rx-without-tx-RX700" && item.severity === "blocker")).toBe(true);
  });

  it("blocks mixed NetworkHD generations in one BOM", () => {
    const items = buildProductChainAssurance({ products: mixedNetworkHd });

    expect(items.some((item) => item.id === "chain-networkhd-generation-mix" && item.severity === "blocker")).toBe(true);
  });

  it("flags a USB 3.x requirement running through a USB 2.0-only extender", () => {
    const topology = topologyWithRun(2, ["usb-3"]);
    const items = buildProductChainAssurance({
      products: usb3WithUsb2Extender,
      topology,
    });

    expect(items.some((item) => item.id === "chain-usb3-through-usb2-extender" && item.severity === "blocker")).toBe(true);
  });

  it("blocks 4K60 4:4:4 over an HDBaseT Class B path", () => {
    const items = buildProductChainAssurance({
      products: [{ sku: "SW-130-TX-UK", quantity: 1 }, { sku: "RX-500", quantity: 1 }],
      requirementText: "The customer needs 4K60 4:4:4 from the boardroom table to the display.",
    });

    expect(items.some((item) => item.id === "chain-4k60-444-over-classb" && item.severity === "blocker")).toBe(true);
  });

  it("flags a topology run that exceeds the governed HDBaseT reach", () => {
    const items = buildProductChainAssurance({
      products: [{ sku: "MXV-0808-H2A-70-V3", quantity: 1 }],
      topology: topologyWithRun(90),
    });

    expect(items.some((item) => item.id === "chain-distance-exceeds-MXV-0808-H2A-70-V3" && item.severity === "blocker")).toBe(true);
  });
});
