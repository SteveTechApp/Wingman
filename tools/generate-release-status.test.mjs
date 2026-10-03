import { describe, expect, it } from "vitest";
import { generateReleaseSection, replaceGeneratedSection, validateManifest } from "./generate-release-status.mjs";

const manifest = {
  version: 1,
  generatedMetadata: { measuredAt: null, commit: null },
  criteria: [
    {
      id: "mobile-sales-uat",
      title: "Mobile sales representative UAT",
      claimedStatus: "blocked",
      measuredAt: null,
      artifactPath: null,
      owner: "Sales lead + release owner",
      closureCondition: "Attach a dated, signed result.",
    },
  ],
};

describe("release status generator", () => {
  it("replaces contradictory hand-maintained states with the same manifest state", () => {
    const current = "# Current\n\nMobile sales UAT is complete.\n";
    const preProduction = "# Pre-production\n\nMobile sales UAT remains open.\n";
    const section = generateReleaseSection(manifest);

    const generatedCurrent = replaceGeneratedSection(current, section);
    const generatedPreProduction = replaceGeneratedSection(preProduction, section);

    expect(generatedCurrent).toContain("| Mobile sales representative UAT | **Blocked** |");
    expect(generatedPreProduction).toContain("| Mobile sales representative UAT | **Blocked** |");
    expect(generatedCurrent).not.toContain("Mobile sales UAT is complete.");
    expect(generatedPreProduction).not.toContain("Mobile sales UAT remains open.");
  });

  it("renders explicit unknown provenance without inventing evidence", () => {
    const section = generateReleaseSection(manifest);
    expect(section).toContain("Measured: not measured");
    expect(section).toContain("Commit: not recorded");
    expect(section).toContain("Evidence not supplied");
  });

  it("refuses contradictory duplicate criterion states", () => {
    const contradictory = {
      ...manifest,
      criteria: [...manifest.criteria, { ...manifest.criteria[0], claimedStatus: "pass" }],
    };
    expect(() => validateManifest(contradictory)).toThrow(/contradictory/i);
  });

  it("requires an owner and closure condition for every criterion", () => {
    expect(() => validateManifest({ ...manifest, criteria: [{ ...manifest.criteria[0], owner: "" }] })).toThrow(/owner/i);
    expect(() => validateManifest({ ...manifest, criteria: [{ ...manifest.criteria[0], closureCondition: "" }] })).toThrow(/closure/i);
  });
});
