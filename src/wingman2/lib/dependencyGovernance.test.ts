import { describe, expect, it } from "vitest";
import { createBlankProjectTopology, type ProjectTopology } from "./projectTopology";
import { buildGovernedDependencies } from "./dependencyGovernance";

describe("location-aware dependency governance", () => {
  it("does not turn a 70m AV-network route into a local HDMI extender requirement", () => {
    const base = createBlankProjectTopology();
    const topology: ProjectTopology = {
      ...base,
      locations: [
        { id: "teaching", name: "Teaching position", type: "lectern", roomId: "room-1" },
        { id: "network", name: "AV network", type: "network", buildingId: "campus" },
        { id: "display", name: "Display position", type: "display-wall", roomId: "room-1" },
      ],
      devices: [
        { id: "sources", name: "HDMI sources", category: "source", locationId: "teaching", quantity: 3, thirdParty: true, status: "confirmed" },
        { id: "encoders", name: "NetworkHD encoders", category: "encoder", locationId: "teaching", quantity: 3, thirdParty: false, status: "confirmed" },
        { id: "controller", name: "NetworkHD controller", category: "controller", locationId: "network", quantity: 1, thirdParty: false, status: "confirmed" },
        { id: "decoders", name: "NetworkHD decoders", category: "decoder", locationId: "display", quantity: 6, thirdParty: false, status: "confirmed" },
      ],
      connections: [
        { id: "source-patches", fromDeviceId: "sources", toDeviceId: "encoders", services: ["video", "embedded-audio"], transport: "hdmi", lengthMode: "confirmed", lengthMetres: 2, status: "confirmed" },
        { id: "encoder-network", fromDeviceId: "encoders", toDeviceId: "controller", services: ["av-over-ip", "ethernet"], transport: "ip-av-vlan", lengthMode: "confirmed", lengthMetres: 70, status: "confirmed" },
        { id: "network-decoders", fromDeviceId: "controller", toDeviceId: "decoders", services: ["av-over-ip", "ethernet"], transport: "ip-av-vlan", lengthMode: "confirmed", lengthMetres: 70, status: "confirmed" },
      ],
    };

    const dependencies = buildGovernedDependencies({
      products: [],
      discovery: {
        projectTitle: "Higher education NetworkHD distribution",
        summary: "3 encoders, 6 decoders and 1 controller over 70m infrastructure with local HDMI patches",
        roomSize: "Campus teaching rooms",
        displays: "6 displays",
        displayCount: "6",
        sourceCount: "3",
        usb: "No USB",
        distance: "70m infrastructure; 2m local HDMI patches",
        network: "Managed AV network",
        budget: "Not confirmed",
      },
      assumptions: [],
      topology,
    });

    expect(dependencies.some((item) => item.id === "hdbaset-pairing")).toBe(false);
    expect(dependencies.some((item) => /local hdmi.*distance|hdmi.*extender/i.test(`${item.label} ${item.customerSafeNote}`))).toBe(false);
  });
});
