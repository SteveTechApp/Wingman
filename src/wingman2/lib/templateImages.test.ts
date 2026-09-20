import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { roomTemplates } from "./roomTemplates";
import { getTemplateApplicationProfile, TEMPLATE_IMAGE_KEYS } from "./templateApplicationProfiles";
import { templateImageFor } from "./templateImages";

describe("template images", () => {
  it("uses an explicit reviewed image assignment for every published template", () => {
    expect(Object.keys(TEMPLATE_IMAGE_KEYS).sort()).toEqual(roomTemplates.map(({ id }) => id).sort());
    for (const template of roomTemplates) {
      const imageKey = getTemplateApplicationProfile(template).imageKey;
      expect(templateImageFor(template)).toContain(`/template-photos/${imageKey}`);
      expect(templateImageFor(template)).not.toContain("room-boardroom.jpg");
      expect(existsSync(resolve("public/template-photos", imageKey)), imageKey).toBe(true);
    }
  });

  it("uses a saved reviewed image for custom templates", () => {
    const template = { ...roomTemplates[0], id: "custom-reviewed", customTemplate: true, applicationProfile: { ...getTemplateApplicationProfile(roomTemplates[0]), templateId: "custom-reviewed", imageKey: "photo-huddle-room.jpg" } };
    expect(templateImageFor(template)).toContain("/template-photos/photo-huddle-room.jpg");
  });

  it("uses the neutral library image for an unreviewed custom template", () => {
    const template = { ...roomTemplates[0], id: "custom-draft", customTemplate: true, applicationProfile: undefined };
    expect(templateImageFor(template)).toContain("/template-visuals/vertical-all.jpg");
  });
});
