import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { roomTemplates } from "./roomTemplates";
import { getTemplateApplicationProfile, TEMPLATE_APPLICATION_PROFILES, templateDesignFacts } from "./templateApplicationProfiles";

describe("template application profiles", () => {
  it("profiles every published template with a reviewed real-world design basis", () => {
    expect(Object.keys(TEMPLATE_APPLICATION_PROFILES)).toHaveLength(roomTemplates.length);
    for (const template of roomTemplates) {
      const profile = getTemplateApplicationProfile(template);
      expect(profile.reviewStatus).toBe("reviewed");
      expect(profile.imageKey).toBeTruthy();
      expect(existsSync(resolve("public/template-photos", profile.imageKey)), profile.imageKey).toBe(true);
      expect(profile.userJourney.length).toBeGreaterThan(40);
      expect(profile.sizingBasis.length).toBeGreaterThan(0);
      expect(profile.sizingBasis.join(" ")).toMatch(/\d+|people|room|site|venue|hall|theatre|centre|club|branch/i);
      expect(profile.capabilities.length).toBeGreaterThan(0);
      expect(templateDesignFacts(template).requiredSkuCount).toBeGreaterThan(0);
    }
  });

  it("throws rather than silently profiling an unknown published template", () => {
    expect(() => getTemplateApplicationProfile({ ...roomTemplates[0], id: "unknown-published" })).toThrow(/does not have/);
  });

  it("derives a conservative review profile for custom templates", () => {
    const profile = getTemplateApplicationProfile({ ...roomTemplates[0], id: "custom-one", customTemplate: true });
    expect(profile.reviewStatus).toBe("needs-review");
    expect(existsSync(resolve("public/template-photos", profile.imageKey))).toBe(true);
  });
});
