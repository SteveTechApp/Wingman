import { beforeEach, describe, expect, it } from "vitest";
import { addEquipmentToRoom, EQUIPMENT_LIBRARY_KEY, readEquipmentLibrary, removeLibraryEquipment, saveLibraryEquipment } from "./equipmentLibrary";
import { createBlankProjectTopology } from "./projectTopology";

const product = { manufacturer: "Example Audio", model: "Speaker-10", role: "Speaker" as const, relationship: "complementary" as const, description: "Two-way loudspeaker for small teaching rooms.", connections: "Low impedance", specifications: "Recorded from datasheet", accessories: "Wall bracket", sourceUrl: "https://example.com/datasheet", checkedOn: "2026-10-01", notes: "Teaching spaces", preferred: true };
beforeEach(() => localStorage.clear());
describe("reusable equipment", () => {
  it("retains exact identity and evidence and updates an existing manufacturer/model", () => {
    const saved = saveLibraryEquipment(product);
    saveLibraryEquipment({ ...product, accessories: "Ceiling bracket" });
    expect(readEquipmentLibrary()).toEqual([{ ...saved, accessories: "Ceiling bracket" }]);
    removeLibraryEquipment(saved.id);
    expect(readEquipmentLibrary()).toEqual([]);
  });
  it("recovers from corrupted browser data and rejects incomplete identities", () => {
    localStorage.setItem(EQUIPMENT_LIBRARY_KEY, "bad JSON");
    expect(readEquipmentLibrary()).toEqual([]);
    expect(() => saveLibraryEquipment({ ...product, model: " " })).toThrow(/exact model/);
    expect(() => saveLibraryEquipment({ ...product, sourceUrl: "javascript:alert(1)" })).toThrow(/http/);
  });
  it("places equipment without treating recorded specifications as approved and retains connection identity", () => {
    const item = saveLibraryEquipment(product);
    const topology = { ...createBlankProjectTopology(), locations: [{ id: "front", name: "Front wall", type: "display-wall" as const }],
      devices: [{ id: "speaker", name: "Speaker to select", category: "speaker", locationId: "front", quantity: 1, thirdParty: true, status: "assumed" as const }] };
    const next = addEquipmentToRoom(topology, item, "front", 2);
    expect(next.devices).toHaveLength(1);
    expect(next.devices[0]).toMatchObject({ id: "speaker", manufacturer: "Example Audio", sku: "Speaker-10", quantity: 2, status: "assumed" });
    expect(next.devices[0].notes).toContain("Wall bracket");
    expect(() => addEquipmentToRoom(topology, item, "missing", 1)).toThrow(/location/);
    expect(() => addEquipmentToRoom(topology, item, "front", 1.5)).toThrow(/whole-number/);
  });
});
