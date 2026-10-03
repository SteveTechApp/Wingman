import { describe, expect, it } from "vitest";
import { roomTemplates } from "./roomTemplates";
import { getTemplateApplicationProfile } from "./templateApplicationProfiles";

const requiredElements = [
  /display|projector|video.wall|led/i,
  /mount/i,
  /rack|furniture|power distribution/i,
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
    const conferencing = roomTemplates.filter((template) => getTemplateApplicationProfile(template).capabilities.includes("uc"));
    expect(conferencing.length).toBeGreaterThan(0);
    for (const template of conferencing) {
      expect(template.bom.some((row) => row.sku.startsWith("BY-OTHERS") && /camera|uc compute|camera bridge/i.test(`${row.description} ${row.notes}`)), template.id).toBe(true);
    }
  });

  it("includes an operator interface alongside a NetworkHD route controller", () => {
    const controlled = roomTemplates.filter((template) => template.bom.some((row) => !row.sku.startsWith("BY-OTHERS") && /(?:^|-)ctl(?:-|$)|syn-touch/i.test(row.sku)));
    expect(controlled.length).toBeGreaterThan(0);
    for (const template of controlled) {
      expect(template.bom.some((row) => row.sku === "BY-OTHERS-ROOM-CONTROL")).toBe(true);
    }
  });

  it("does not add meeting-room audio scope to silent signage", () => {
    const rows = roomTemplates.find((template) => template.name.startsWith("Quick-Service"))!.bom;
    expect(rows.some((row) => /microphone|aec|audio capture/i.test(`${row.role} ${row.description}`))).toBe(false);
  });

  it("adds resilience and network validation to operational control rooms", () => {
    const rows = roomTemplates.find((template) => template.id === "control-room-network-operations-centre-networkhd600")!.bom;
    expect(rows.some((row) => /redundan|failover|ups|recovery/i.test(`${row.description} ${row.notes}`))).toBe(true);
  });
});
