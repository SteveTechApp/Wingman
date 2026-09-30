import { describe, expect, it } from "vitest";
import { changeDiscoveryApplication, DISCOVERY_MARKETS, getDiscoveryEnvironment, getDiscoveryMarket, photoForDiscoveryEnvironment, photoForDiscoveryMarket } from "./discoveryMarketContext";

describe("market-aware Discovery context", () => {
  it("covers operational and established AV markets with specific environments", () => {
    for (const id of ["government", "emergency", "energy", "manufacturing", "education", "corporate"]) {
      expect(getDiscoveryMarket(id)?.environments.length).toBeGreaterThanOrEqual(4);
    }
    expect(getDiscoveryEnvironment("emergency", "incident")?.cue).toContain("fallback");
    expect(getDiscoveryEnvironment("education", "campus")?.cue).toContain("AV VLAN");
  });

  it("retains a discoverable other route and does not invent an application", () => {
    expect(DISCOVERY_MARKETS.at(-1)?.id).toBe("other");
    expect(getDiscoveryEnvironment("other", "other")?.suggestedApplication).toBeUndefined();
    expect(getDiscoveryEnvironment("missing", "missing")).toBeUndefined();
  });

  it("keeps customer context but clears stale technical answers when the application changes", () => {
    expect(changeDiscoveryApplication({ market: "government", environment: "control", opportunity: "meeting-room", scale: "multi-room", sources: "five-eight-sources" }, "av-over-ip"))
      .toEqual({ market: "government", environment: "control", "environment-detail": "", opportunity: "av-over-ip" });
  });

  it("provides situational photo assets for market and environment choices", () => {
    expect(photoForDiscoveryMarket("emergency")).toContain("situation-room");
    expect(photoForDiscoveryEnvironment("education", "classroom")).toContain("classroom");
    expect(photoForDiscoveryMarket("unlisted")).toContain("not-sure");
  });
});
