import { describe, expect, it } from "vitest";
import {
  dataManifestDriftErrors,
  sha256,
  technologyProfilesDriftErrors,
} from "./check-generated-manifests.mjs";

// The two tracked generated manifests must never drift from their committed
// sources. These tests mutate the inputs the checks compare and assert the
// failure is caught - a hash-only commit (manifest regenerated without the
// data change, or a data change whose manifest was never rebuilt) must go red.

const SOURCE_A = "data-sources/wyrestorm/products.csv";
const SOURCE_B = "data-sources/wyrestorm/lifecycle.csv";

function cleanManifest() {
  const sourceFiles = [SOURCE_A, SOURCE_B];
  const reader = (file) => (file === SOURCE_A ? "product-row-a\n" : "lifecycle-row-b\n");
  const hashes = {
    [SOURCE_A]: sha256(reader(SOURCE_A)),
    [SOURCE_B]: sha256(reader(SOURCE_B)),
  };
  return { manifest: { sourceFiles, hashes }, reader, expected: [...sourceFiles] };
}

describe("dataManifestDriftErrors (product-data-manifest.generated.json)", () => {
  it("passes when every committed hash matches its source and the list is complete", () => {
    const { manifest, reader, expected } = cleanManifest();
    expect(dataManifestDriftErrors(manifest, reader, expected)).toEqual([]);
  });

  it("fails when a source file changed without the manifest being rebuilt", () => {
    const { manifest, expected } = cleanManifest();
    // lifecycle.csv edited; the committed hash is stale -> hash-only drift.
    const staleReader = (file) => (file === SOURCE_B ? "lifecycle-row-b-CHANGED\n" : "product-row-a\n");
    const errors = dataManifestDriftErrors(manifest, staleReader, expected);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join("\n")).toContain(SOURCE_B);
    expect(errors.join("\n")).toContain("data:sources:build");
  });

  it("fails when a manifest-listed source is missing from the tree", () => {
    const { manifest, expected } = cleanManifest();
    const reader = (file) => (file === SOURCE_A ? null : "lifecycle-row-b\n");
    const errors = dataManifestDriftErrors(manifest, reader, expected);
    expect(errors.join("\n")).toContain(SOURCE_A);
    expect(errors.join("\n")).toContain("missing");
  });

  it("fails when a current source is absent from the committed sourceFiles list", () => {
    const { manifest, reader } = cleanManifest();
    // A new competitor CSV exists in the tree but the manifest never listed it.
    const extra = "data-sources/competitors/newbrand.csv";
    const errors = dataManifestDriftErrors(manifest, reader, [...cleanManifest().expected, extra]);
    expect(errors.join("\n")).toContain(extra);
    expect(errors.join("\n")).toContain("not listed");
  });

  it("fails loudly when the committed manifest lacks its hashes object", () => {
    const { reader, expected } = cleanManifest();
    const errors = dataManifestDriftErrors({ sourceFiles: [SOURCE_A] }, reader, expected);
    expect(errors.join("\n")).toContain("hashes");
  });
});

describe("technologyProfilesDriftErrors (product-technology-profiles.generated.json)", () => {
  it("passes when the committed records match a fresh regeneration", () => {
    // Empty inputs materialise to zero records; a committed empty file matches.
    expect(technologyProfilesDriftErrors([], [], [], {})).toEqual([]);
  });

  it("fails when committed records are stale relative to the current inputs", () => {
    // The committed file still carries a product that the current inputs no
    // longer produce (a removed product is exactly the silent drift class).
    const staleCommitted = [
      {
        vendorType: "wyrestorm",
        manufacturer: "WyreStorm",
        sku: "SW-DISCONTINUED",
        profile: { matchedRuleIds: [], notes: [] },
        sourceUrl: "",
      },
    ];
    const errors = technologyProfilesDriftErrors(staleCommitted, [], [], {});
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join("\n")).toContain("drifted");
    expect(errors.join("\n")).toContain("SW-DISCONTINUED");
    expect(errors.join("\n")).toContain("audit-product-technology-normalization");
  });

  it("fails when a new product appears in the inputs but not in the committed file", () => {
    const freshInputRow = {
      sku: "SW-660-TX-W",
      manufacturer: "WyreStorm",
      technology: "HDBaseT",
    };
    // Committed says the catalog is empty; the current input row produces one.
    const errors = technologyProfilesDriftErrors([], [freshInputRow], [], {});
    expect(errors.join("\n")).toContain("SW-660-TX-W");
  });

  it("fails when the committed file has no records array", () => {
    const errors = technologyProfilesDriftErrors(undefined, [], [], {});
    expect(errors.join("\n")).toContain("no records array");
  });
});
