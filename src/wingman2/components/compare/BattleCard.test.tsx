import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SpecClass, SpecSheet } from "../../lib/compareSpecEngine";
import { BattleCard, battleCardFamily, buildBattleCardLayout } from "./BattleCard";

function sheet(specClass: SpecClass, overrides: Partial<SpecSheet> = {}): SpecSheet {
  return {
    sku: `${specClass}-1`, brand: "Test", name: "Test device", family: "Test", summary: "",
    specClass, role: "switcher", transport: "hdmi", transportLabel: "HDMI",
    maxResolutionLabel: "4K60", resolutionRank: 4, chroma: "4:4:4", chromaRank: 3,
    hdr: true, bandwidthGbps: 18, hdmiIn: 1, hdmiOut: 1, routedIn: 1, routedOut: 1,
    usbVersion: "", usbRank: 0, audioOptions: [], controlOptions: [], distanceM: null, poe: "", citations: [],
    connections: { videoInputs: [], videoOutputs: [], usb: [], network: [], audioInputs: [], audioOutputs: [], control: [] },
    capabilities: { wirelessCasting: null, byom: null, multiview: null, scaling: null, videoWall: null, kvm: null },
    ...overrides,
  };
}

describe("dynamic Battle Card layouts", () => {
  it.each([
    ["MATRIX", "switcher-matrix"], ["PRESENTATION", "switcher-matrix"], ["AVOIP", "avoip-endpoint"],
    ["HDBASET", "extender-hdbaset"], ["EXTENDER", "extender-hdbaset"], ["DISTRIBUTION", "distribution"],
    ["WIRELESS_PRESENTATION", "wireless-uc"], ["MULTIVIEW", "video-processing"], ["VIDEO_WALL", "video-processing"],
    ["CAMERA", "specialist"],
  ] as const)("maps %s to %s", (specClass, family) => expect(battleCardFamily(sheet(specClass))).toBe(family));

  it("makes connector type and quantity immediately readable", () => {
    const product = sheet("PRESENTATION", { connections: {
      videoInputs: [{ type: "HDMI", count: 4 }, { type: "USB-C", count: 2, detail: "DP Alt Mode" }],
      videoOutputs: [{ type: "HDBaseT", count: 1 }], usb: [{ type: "USB-A Device", count: 3 }],
      network: [{ type: "LAN", count: 1 }], audioInputs: [], audioOutputs: [], control: [{ type: "RS-232", count: 1 }],
    } });
    render(<BattleCard sheet={product} accent="competitor" />);
    const inputs = screen.getByRole("region", { name: "Video inputs" });
    expect(within(inputs).getByText("HDMI").parentElement?.textContent).toContain("×4");
    expect(within(inputs).getByText("USB-C").parentElement?.textContent).toContain("DP Alt Mode");
    expect(screen.queryByRole("region", { name: "Audio inputs" })).toBeNull();
  });

  it("aligns a missing corresponding group as Not verified without inventing ports", () => {
    const competitor = sheet("AVOIP", { connections: { ...sheet("AVOIP").connections!, network: [{ type: "LAN", count: 1 }] } });
    const wyrestorm = sheet("AVOIP");
    render(<BattleCard sheet={wyrestorm} counterpart={competitor} accent="wyrestorm" />);
    expect(screen.getByRole("region", { name: "Network" }).textContent).toContain("Not verified");
  });

  it("keeps unsupported, unverified, and not applicable capability states distinct", () => {
    const product = sheet("WIRELESS_PRESENTATION", { capabilities: { wirelessCasting: true, byom: false, kvm: "not-applicable", multiview: null, scaling: null, videoWall: null } });
    const layout = buildBattleCardLayout(product);
    const values = layout.sections.find((section) => section.key === "capabilities")?.facts?.map((fact) => fact.value);
    expect(values).toEqual(["Supported", "Not supported", "Not applicable"]);
  });
});
