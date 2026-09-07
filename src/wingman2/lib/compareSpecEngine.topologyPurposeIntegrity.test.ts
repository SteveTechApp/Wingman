import index from "../../../public/product-intelligence-index.json";
import { describe, expect, it, vi } from "vitest";

vi.mock("./productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue(index),
}));

import {
  findCompetitorCatalogEntry,
  normalizeCompetitor,
  runSpecShowdown,
} from "./compareSpecEngine";

describe("spec-engine topology purpose integrity", () => {
  it("keeps a one-to-many presentation switcher as a presentation switcher with its routed source capacity", async () => {
    const entry = findCompetitorCatalogEntry("CYP", "EL-8100V");
    expect(entry).not.toBeNull();

    const competitor = normalizeCompetitor(entry!);
    expect(competitor.specClass).toBe("PRESENTATION");
    expect(competitor.routedIn).toBe(5);
    expect(competitor.routedOut).toBe(1);

    const result = await runSpecShowdown("CYP", "EL-8100V");
    expect(result.coverage).toBe("found");

    if (result.coverage === "found") {
      for (const match of result.matches) {
        expect(
          match.sheet.routedIn,
          `${match.sheet.sku} must not pass a 5-source presentation requirement with fewer routed inputs`,
        ).not.toBeNull();
        expect(match.sheet.routedIn!).toBeGreaterThanOrEqual(5);
      }

      expect(result.matches.map((match) => match.sheet.sku)).not.toContain(
        "MX-0403-H3-MST",
      );
    }
  });

  it("treats HDBaseT distribution fan-out as physical/mirrored capacity, not HDMI output count", async () => {
    const entry = findCompetitorCatalogEntry("Kramer", "VM-4HDT");
    expect(entry).not.toBeNull();

    const competitor = normalizeCompetitor(entry!);
    expect(competitor.specClass).toBe("DISTRIBUTION");
    expect(competitor.transport).toBe("hdbaset");
    expect(competitor.physicalOut).toBe(4);
    expect(competitor.mirroredOut).toBe(4);

    const result = await runSpecShowdown("Kramer", "VM-4HDT");
    expect(result.coverage).toBe("found");

    if (result.coverage === "found") {
      for (const match of result.matches) {
        const offered =
          match.sheet.mirroredOut ??
          match.sheet.physicalOut ??
          match.sheet.hdmiOut;

        expect(
          offered,
          `${match.sheet.sku} must evidence at least four physical/mirrored distribution outputs`,
        ).not.toBeNull();
        expect(offered!).toBeGreaterThanOrEqual(4);

        if (match.sheet.transport !== "hdbaset") {
          expect(match.decision).toBe("architecture-alternative");
        }
      }
    }
  });
});
