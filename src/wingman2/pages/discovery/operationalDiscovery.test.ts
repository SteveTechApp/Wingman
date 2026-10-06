import { describe, expect, it } from "vitest";
import { baseDiscoveryQuestions } from "./discoveryQuestions";
import { operationalQuestion, supportingRoomScope, updateOperationalAnswer, refreshRoomLayout } from "./operationalDiscovery";
import { createBlankProjectTopology } from "../../lib/projectTopology";

describe("operational discovery", () => {
  it("keeps canonical routing values while presenting customer language", () => {
    const original = baseDiscoveryQuestions.find(row => row.id === "display-behaviour")!;
    const presented = operationalQuestion(original);
    expect(presented.question).toBe("What should people see on each screen?");
    expect(presented.options.map(row => row.value)).toEqual(original.options.map(row => row.value));
    expect(original.question).not.toBe(presented.question);
  });
  it("removes inactive camera details when conferencing is removed without losing room facts", () => {
    const next = updateOperationalAnswer({ opportunity: "meeting-room", "uc-purpose": ["video-conferencing"], "uc-camera": "usb-ptz-camera", "room-occupancy": "20" }, baseDiscoveryQuestions.find(row => row.id === "uc-purpose")!, "no-uc");
    expect(next["uc-purpose"]).toEqual(["no-uc"]);
    expect(next["uc-camera"]).toBeUndefined();
    expect(next["room-occupancy"]).toBe("20");
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
