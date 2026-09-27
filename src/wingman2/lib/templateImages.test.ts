import { describe, expect, it } from "vitest";
import { roomTemplates } from "./roomTemplates";
import { templateImageFor } from "./templateImages";

describe("template photos", () => {
  it("uses distinct photos for the four emergency-service recommendations", () => {
    const ids = [
      "government-control-room-networkhd600",
      "government-security-command-nhd100-bridge",
      "government-situation-control-room-nhd600",
      "control-room-security-operations-networkhd600",
    ];
    const images = ids.map((id) => templateImageFor(roomTemplates.find((template) => template.id === id)!));
    expect(new Set(images).size).toBe(ids.length);
    expect(images.every((image) => image.startsWith("/template-photos/"))).toBe(true);
  });
});
