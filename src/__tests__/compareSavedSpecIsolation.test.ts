import { beforeEach, describe, expect, it } from "vitest";

import {
  saveCompetitorSpec,
  findSavedCompetitorSpec,
  getSavedCompetitorSpecs,
} from "@/wingman2/lib/savedCompetitorSpecs";
import { resolveCompetitorSpecProfile } from "@/wingman2/lib/competitorSpecRegistry";
import { findCompetitorSourceProduct } from "@/wingman2/data/competitorSourceFeeds";

const SAVED_KEY = "wingman.compare.saved-competitor-specs.v1";

function localStorageKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key) keys.push(key);
  }
  return keys;
}

const SPEC = {
  manufacturer: "Acme AV",
  sku: "ZZ-9001-UNKNOWN",
  title: "Acme 8x8 HDBaseT Matrix",
  domain: "MATRIX" as const,
  role: "Matrix" as const,
  transport: "HDBaseT",
  maxResolution: "4K60",
  chroma: "4:4:4",
  inputCount: 8,
  outputCount: 8,
  notes: "Saved from the manufacturer datasheet during compare.",
  savedFrom: "live-lookup" as const,
};

describe("Compare saved-spec store isolation", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("writes a rep-saved competitor spec ONLY to its own localStorage key, tagged with user provenance", () => {
    saveCompetitorSpec(SPEC);

    // The only key written is the dedicated saved-spec store - nothing else,
    // and certainly not any product-data store (the WyreStorm index and the
    // competitor catalogue are read-only files, never localStorage).
    expect(localStorageKeys()).toEqual([SAVED_KEY]);

    const stored = JSON.parse(window.localStorage.getItem(SAVED_KEY) as string);
    expect(Array.isArray(stored)).toBe(true);
    expect(stored).toHaveLength(1);
    expect(stored[0].sku).toBe("ZZ-9001-UNKNOWN");
    expect(stored[0].sourceName).toBe("user-saved");
    expect(stored[0].sourceCollection).toBe("Compare: saved by rep");
    expect(stored[0].savedFrom).toBe("live-lookup");
  });

  it("round-trips by normalised brand+sku and upserts rather than duplicating", () => {
    saveCompetitorSpec(SPEC);
    // Different casing / spacing resolves to the same record.
    expect(findSavedCompetitorSpec("acme  av", "zz 9001 unknown")).not.toBeNull();
    // Wrong brand does not resolve.
    expect(findSavedCompetitorSpec("Kramer", "ZZ-9001-UNKNOWN")).toBeNull();

    // Re-saving the same SKU updates in place (no duplicate record).
    saveCompetitorSpec({ ...SPEC, title: "Acme 8x8 Matrix (rev B)" });
    const all = getSavedCompetitorSpecs();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe("Acme 8x8 Matrix (rev B)");
  });

  it("feeds the saved spec into matching as an overlay without injecting it into the main competitor catalogue", () => {
    // Precondition: the made-up SKU is NOT in the bundled competitor catalogue.
    expect(findCompetitorSourceProduct("Acme AV", "ZZ-9001-UNKNOWN", "ZZ-9001-UNKNOWN")).toBeFalsy();

    const saved = saveCompetitorSpec(SPEC);

    // The saved spec, passed as the explicit overlay, drives resolution and is
    // tagged user-saved - proving a no-match SKU becomes matchable from the
    // local store.
    const resolved = resolveCompetitorSpecProfile("ZZ-9001-UNKNOWN", "Acme AV", undefined, saved);
    expect(resolved.source).toBe("user-saved");

    // Critically: saving + resolving never wrote the SKU into the main
    // competitor catalogue - it remains absent there (localStorage overlay only).
    expect(findCompetitorSourceProduct("Acme AV", "ZZ-9001-UNKNOWN", "ZZ-9001-UNKNOWN")).toBeFalsy();
  });
});
