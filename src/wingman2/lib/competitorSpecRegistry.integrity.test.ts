import { describe, expect, it } from "vitest";
import competitorCatalog from "../../../data/catalog/competitor-products.generated.json";

import {
  CURATED_FINGERPRINTS,
  resolveCompetitorSpecProfile,
  validateCuratedFingerprints,
  type Fingerprint,
} from "./competitorSpecRegistry";

describe("competitor fingerprint integrity", () => {
  it("has no internal-consistency issues in the curated fingerprints", () => {
    const issues = validateCuratedFingerprints();
    // Print a readable list if this ever regresses, so the fix is obvious.
    expect(issues, JSON.stringify(issues, null, 2)).toHaveLength(0);
  });

  it("catches an overloaded alias key whose I/O contradicts the profile", () => {
    // This is the Lightware / Crestron defect class: a 4x2 matrix carrying a
    // 4x4 alias key, which would report wrong specs for a typed 4x4 model.
    const broken: Fingerprint = {
      brand: "Test",
      sku: "TEST-MTX-4x2",
      keys: ["testmtx4x2", "testmtx4x4"],
      domain: "MATRIX",
      role: "Matrix",
      inputCount: 4,
      outputCount: 2,
    };

    const issues = validateCuratedFingerprints([broken]);
    expect(issues.some((issue) => /encodes 4x4 but fingerprint declares 4x2/.test(issue.issue))).toBe(true);
  });

  it("catches a duplicate key shared across two fingerprints", () => {
    const a: Fingerprint = { brand: "B", sku: "A", keys: ["sharedkey"], domain: "MATRIX", role: "Matrix" };
    const b: Fingerprint = { brand: "B", sku: "B", keys: ["sharedkey"], domain: "MATRIX", role: "Matrix" };

    const issues = validateCuratedFingerprints([a, b]);
    expect(issues.some((issue) => /duplicate key/.test(issue.issue))).toBe(true);
  });

  it("catches a role that is incompatible with its domain", () => {
    const broken: Fingerprint = {
      brand: "B",
      sku: "MISLABELLED",
      keys: ["mislabelled"],
      domain: "AVOIP",
      role: "Matrix",
    };

    const issues = validateCuratedFingerprints([broken]);
    expect(issues.some((issue) => /incompatible with domain/.test(issue.issue))).toBe(true);
  });

  it("every curated key is in normalised lookup form", () => {
    for (const fp of CURATED_FINGERPRINTS) {
      for (const key of fp.keys) {
        expect(key, `${fp.sku} key "${key}"`).toMatch(/^[a-z0-9]+$/);
      }
    }
  });

  it("still resolves the Crestron 4x2 switcher to its correct I/O after the alias removal", () => {
    const profile = resolveCompetitorSpecProfile("HD-MD4X2-4KZ-E");
    expect(profile.inputCount).toBe(4);
    expect(profile.outputCount).toBe(2);
    expect(profile.brand).toBe("Crestron");
  });

  it("does not promote a draft manufacturer row to an approved profile", () => {
    const profile = resolveCompetitorSpecProfile("DTP3 R 201", "Extron");
    expect(profile.readiness).toBe("needs-evidence");
    expect(profile.specTier).not.toBe("verified-profile");
  });

  it("keeps reviewed source-backed manufacturer rows approved", () => {
    const profile = resolveCompetitorSpecProfile("AT-OME-CS31-SA", "Atlona");
    expect(profile.readiness).toBe("approved");
    expect(profile.specTier).toBe("verified-profile");
  });

  it("uses the official AT-OMNI-112 encoder role instead of the retired conflicting override", () => {
    const profile = resolveCompetitorSpecProfile("AT-OMNI-112", "Atlona");
    expect(String(profile.role).toLowerCase()).toBe("encoder");
    expect(profile.inputCount).toBe(2);
  });

  it("classifies HDBaseT-capable products by purpose instead of reducing them to extenders", () => {
    const presentation = resolveCompetitorSpecProfile("MFP112", "Blustream");
    expect(presentation.domain).toBe("PRESENTATION");
    expect(presentation.role).toBe("presentation switcher");
    expect(presentation.inputCount).toBe(11);
    expect(presentation.outputCount).toBe(2);

    const matrix = resolveCompetitorSpecProfile("C44-KIT", "Blustream");
    expect(matrix.domain).toBe("MATRIX");
    expect(matrix.inputCount).toBe(4);
    expect(matrix.outputCount).toBe(4);

    const distribution = resolveCompetitorSpecProfile("VM-4HDT", "Kramer");
    expect(distribution.domain).toBe("DISTRIBUTION");
  });

  it("keeps every catalogued HDBaseT routing product in its declared architecture lane", () => {
    const expectedDomainByCategory = {
      Matrix: "MATRIX",
      Presentation: "PRESENTATION",
      Distribution: "DISTRIBUTION",
    } as const;
    const routedProducts = competitorCatalog.filter((entry) =>
      /hdbaset/i.test(String(entry.technology ?? "")) &&
      entry.category in expectedDomainByCategory,
    );

    expect(routedProducts.length).toBeGreaterThan(10);
    for (const entry of routedProducts) {
      const profile = resolveCompetitorSpecProfile(entry.sku, entry.brand);
      expect(profile.domain, `${entry.brand} ${entry.sku}`).toBe(
        expectedDomainByCategory[entry.category as keyof typeof expectedDomainByCategory],
      );
      expect(profile.domain, `${entry.brand} ${entry.sku} must not be treated as an extender`).not.toBe("HDBASET");
    }
  });
});
