import { describe, expect, it } from "vitest";
import { roomTemplates } from "./roomTemplates";

const requiredElements = [
  /display|projector|video.wall|led/i,
  /mount/i,
  /audio input|audio i\/o|dsp|aec/i,
  /microphone|audio capture/i,
  /speaker|loudspeaker|amplif/i,
  /network|vlan/i,
  /rack|furniture|ups|power distribution/i,
  /ccts|cables, connectors|cabling and consumables/i,
  /installation labour/i,
  /commissioning|training/i,
  /project management|cad\/visio|as-built/i,
];

describe("complete-room template placeholders", () => {
  it("gives every template a third-party checklist for the whole installed room", () => {
    for (const template of roomTemplates) {
      const scope = template.bom.filter((row) => row.sku.startsWith("BY-OTHERS"));
      const text = scope.map((row) => `${row.description} ${row.role} ${row.notes}`).join(" | ");
      for (const requirement of requiredElements) expect(text, `${template.id} is missing ${requirement}`).toMatch(requirement);
    }
  });

  it("adds camera and UC placeholders where the application is conferencing-led", () => {
    const conferencing = roomTemplates.filter((template) => /teams|zoom|video confer|videoconfer|hybrid|uc room|camera/i.test(`${template.name} ${template.application} ${template.summary} ${template.architecture}`));
    expect(conferencing.length).toBeGreaterThan(0);
    for (const template of conferencing) {
      expect(template.bom.some((row) => row.sku.startsWith("BY-OTHERS") && /camera|uc compute|camera bridge/i.test(`${row.description} ${row.notes}`))).toBe(true);
    }
  });

  it("does not add third-party room-control hardware when WyreStorm control is selected", () => {
    const controlled = roomTemplates.filter((template) => template.bom.some((row) => !row.sku.startsWith("BY-OTHERS") && /(?:^|-)ctl(?:-|$)|syn-touch/i.test(row.sku)));
    expect(controlled.length).toBeGreaterThan(0);
    for (const template of controlled) {
      expect(template.bom.some((row) => row.sku.startsWith("BY-OTHERS") && /control processor|touch panel|room control by others|control user interface/i.test(`${row.description} ${row.role}`))).toBe(false);
    }
  });
});
