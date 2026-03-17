import { describe, expect, it } from "vitest";

import { buildTopology } from "./topologyEngine";

describe("topologyEngine", () => {
  it("recommends catalog-backed AVoIP starter products for larger distributed systems", () => {
    const topology = buildTopology({ sources: 6, displays: 8, resolution: "4K60" });

    expect(topology.transport).toBe("AVoIP");
    expect(topology.wyrestormProducts).toEqual(
      expect.arrayContaining(["NHD-500-TX", "NHD-500-E-RX", "NHD-CTL-PRO-V2"]),
    );
  });

  it("recommends both HDBaseT and matrix starter products for smaller switched rooms", () => {
    const topology = buildTopology({ sources: 2, displays: 2, resolution: "1080p" });

    expect(topology.transport).toBe("HDBaseT Matrix");
    expect(topology.wyrestormProducts).toEqual(
      expect.arrayContaining(["EX-100-H2", "MX-0808-H2A-MK2"]),
    );
  });
});
