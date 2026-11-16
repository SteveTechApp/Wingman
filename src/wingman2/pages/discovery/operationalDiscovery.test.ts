import { describe, expect, it } from "vitest";
import { baseDiscoveryQuestions } from "./discoveryQuestions";
import { operationalQuestion, supportingRoomScope, updateOperationalAnswer, refreshRoomLayout } from "./operationalDiscovery";
import { createBlankProjectTopology } from "../../lib/projectTopology";

describe("operational discovery", () => {
  it("keeps canonical routing values while presenting customer language", () => {
    const original = baseDiscoveryQuestions.find(row => row.id === "display-behaviour")!;
    const presented = operationalQuestion(original);
    expect(presented.question).toBe("How should the primary and repeater displays behave?");
    expect(presented.options.map(row => row.value)).toEqual(original.options.map(row => row.value));
    expect(presented.question).toContain("primary and repeater displays");
  });
  it("removes inactive camera details when conferencing is removed without losing room facts", () => {
    const next = updateOperationalAnswer({ opportunity: "meeting-room", "uc-purpose": ["video-conferencing"], "uc-camera": "usb-ptz-camera", "room-occupancy": "20" }, baseDiscoveryQuestions.find(row => row.id === "uc-purpose")!, "no-uc");
    expect(next["uc-purpose"]).toEqual(["no-uc"]);
    expect(next["uc-camera"]).toBeUndefined();
    expect(next["room-occupancy"]).toBe("20");
  });
  it("removes display-behaviour answers that become unavailable after the primary or repeater count changes", () => {
    const initial = {
      opportunity: "meeting-room",
      "primary-display": "lcd-video-wall",
      displays: "two-displays",
      "repeater-displays": "one-two-repeater-displays",
      "display-behaviour": ["same-content-all-displays", "video-wall-or-processor-feed", "overflow-viewing", "room-wide-visibility"],
    };
    const primaryChanged = updateOperationalAnswer(initial, baseDiscoveryQuestions.find(row => row.id === "primary-display")!, "single-large-flat-panel");
    expect(primaryChanged["display-behaviour"]).toEqual(["same-content-all-displays", "overflow-viewing", "room-wide-visibility"]);

    const repeatersRemoved = updateOperationalAnswer(primaryChanged, baseDiscoveryQuestions.find(row => row.id === "repeater-displays")!, "no-repeater-displays");
    expect(repeatersRemoved["display-behaviour"]).toEqual(["same-content-all-displays"]);
  });
  it("includes environment-specific supporting scope without claiming models or quantities", () => {
    const scope = supportingRoomScope({ opportunity: "classroom", audio: "room-speakers", "uc-purpose": ["recording-streaming"], control: ["touch-panel"], "network-path": "corporate-av-vlan" }, createBlankProjectTopology());
    expect(scope.join(" ")).toContain("Cameras and microphones");
    expect(scope.join(" ")).toContain("Network switching");
    expect(scope.join(" ")).toContain("Mounting, rack space and power");
  });
  it("builds the exact requested display positions and retains selected equipment when refreshed", () => {
    const old = { ...createBlankProjectTopology(), locations: [{ id: "speakers", name: "Audience", type: "ceiling" as const }],
      devices: [{ id: "saved-speaker", name: "Preferred speaker", category: "speaker", locationId: "speakers", sku: "SP-1", manufacturer: "Audio brand", quantity: 6, thirdParty: true, status: "assumed" as const }] };
    const refreshed = refreshRoomLayout({ opportunity: "classroom", sources: "two-four-sources", "source-count-exact": "3", displays: "three-eight-displays", "display-count-exact": "5" }, {}, old);
    expect(refreshed.devices.filter(device => device.category === "display")).toHaveLength(5);
    expect(refreshed.devices.find(device => device.id === "saved-speaker")).toEqual(old.devices[0]);
    expect(refreshed.locations.find(location => location.id === "speakers")?.name).toBe("Audience");
  });
});
