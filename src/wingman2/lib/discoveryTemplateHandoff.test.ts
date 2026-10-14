import { describe, expect, it } from "vitest";
import { createCustomTemplateEditHandoff } from "./discoveryTemplateHandoff";
import { createBlankProjectTopology } from "./projectTopology";
import type { CustomRoomTemplate } from "./customRoomTemplates";
import { mergeRoomTemplateEquipment } from "../pages/discovery/operationalDiscovery";

describe("custom template edit handoff", () => {
  it("carries answers, notes, locations, selected equipment, and connections into discovery", () => {
    const topology = createBlankProjectTopology();
    topology.locations.push({ id: "table", name: "Presenter table", type: "table" });
    topology.devices.push({
      id: "display", name: "Display", category: "display", locationId: "table",
      manufacturer: "Example AV", sku: "EX-100", productRelationship: "complementary",
      quantity: 2, thirdParty: true, status: "assumed", notes: "Confirm mount compatibility.",
    });
    topology.connections.push({
      id: "route", fromDeviceId: "display", toDeviceId: "display", fromPort: "HDMI 1", toPort: "HDMI 1",
      services: ["video"], transport: "hdmi", lengthMode: "estimated", lengthMetres: 8,
      status: "assumed", notes: "Existing conduit route.",
    });
    const template = {
      id: "custom-boardroom", name: "Custom boardroom", vertical: "Corporate",
      discoveryAnswers: { opportunity: "meeting-room", "site-wall-construction": "Masonry" },
      discoveryNotes: { displays: "Keep the existing screens." }, topology,
    } as unknown as CustomRoomTemplate;

    const handoff = createCustomTemplateEditHandoff(template);

    expect(handoff).toMatchObject({
      mode: "template-edit", templateId: template.id, answers: template.discoveryAnswers,
      notes: template.discoveryNotes, topology: {
        locations: [{ id: "table" }], devices: [{ sku: "EX-100", manufacturer: "Example AV" }],
        connections: [{ id: "route", lengthMetres: 8 }],
      },
    });
    const merged = mergeRoomTemplateEquipment(template.bom, [{
      id: "display", sku: "BY-OTHERS-display", description: "Display", role: "display", qty: 2,
      type: "Validate", status: "validate", manufacturer: "Example AV", model: "EX-100",
      productRelationship: "complementary", evidence: "Selected during discovery", notes: "Location: Presenter table.",
    }]);
    expect(merged).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "display", manufacturer: "Example AV", model: "EX-100", productRelationship: "complementary" }),
    ]));
  });
});
