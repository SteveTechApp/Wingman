import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  PRODUCT_DATA_MANIFEST,
  generatedOn,
  productDataCanonicalString,
  productDataManifestHash,
  productDataRevision,
  resolveBuildCommit,
  type ProductDataManifest,
} from "./productDataRevision";
import { sha256Hex } from "./sha256";

function manifest(overrides: Partial<ProductDataManifest> = {}): ProductDataManifest {
  return {
    schemaVersion: 1,
    generatedAt: "2026-10-30T09:43:00.146Z",
    hashes: { "data-sources/a.csv": "aa11", "data-sources/b.csv": "bb22" },
    counts: { wyrestorm: 314, competitor: 354 },
    ...overrides,
  };
}

describe("sha256", () => {
  it("matches the FIPS 180-4 vectors", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(sha256Hex("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")).toBe(
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    );
  });

  it("agrees with node:crypto past one block and on multi-byte text", () => {
    for (const input of ["x".repeat(55), "y".repeat(56), "z".repeat(64), "é–ü™ 4K", "a".repeat(1000)]) {
      expect(sha256Hex(input)).toBe(createHash("sha256").update(input, "utf8").digest("hex"));
    }
  });
});

describe("product data revision", () => {
  it("digests the manifest content the same way node does", () => {
    const canonical = productDataCanonicalString(manifest());
    expect(productDataManifestHash(manifest())).toBe(createHash("sha256").update(canonical, "utf8").digest("hex"));
  });

  it("does not move its digest when only the assembly timestamp changes", () => {
    const before = productDataManifestHash(manifest({ generatedAt: "2026-06-01T00:00:00.000Z" }));
    const after = productDataManifestHash(manifest({ generatedAt: "2026-10-30T09:43:00.146Z" }));
    expect(after).toBe(before);
  });

  it("does not depend on the order the generator wrote its keys in", () => {
    const reordered = manifest({
      hashes: { "data-sources/b.csv": "bb22", "data-sources/a.csv": "aa11" },
      counts: { competitor: 354, wyrestorm: 314 },
    });
    expect(productDataManifestHash(reordered)).toBe(productDataManifestHash(manifest()));
  });

  it("moves its digest when a source, a count or the schema changes", () => {
    const base = productDataManifestHash(manifest());
    expect(productDataManifestHash(manifest({ hashes: { "data-sources/a.csv": "aa11", "data-sources/b.csv": "cc33" } }))).not.toBe(base);
    expect(productDataManifestHash(manifest({ counts: { wyrestorm: 315, competitor: 354 } }))).not.toBe(base);
    expect(productDataManifestHash(manifest({ schemaVersion: 2 }))).not.toBe(base);
  });

  it("reads the tracked manifest and prints one line naming all three facts", () => {
    const revision = productDataRevision();
    expect(revision.manifestHash).toMatch(/^[0-9a-f]{64}$/);
    expect(revision.manifestHashShort).toBe(revision.manifestHash.slice(0, 12));
    expect(revision.generatedAt).toBe(PRODUCT_DATA_MANIFEST.generatedAt);
    expect(revision.generatedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(revision.line).toContain(revision.manifestHashShort);
    expect(revision.line).toContain(revision.generatedOn!);
    expect(revision.line).toContain(revision.buildCommit);
  });

  it("matches the digest a person can recompute from the tracked manifest", () => {
    const tracked = productDataManifestHash(PRODUCT_DATA_MANIFEST);
    expect(tracked).toBe(productDataRevision().manifestHash);
    expect(tracked).toHaveLength(64);
  });

  it("names no date rather than a wrong one when the manifest carries no timestamp", () => {
    expect(generatedOn("source-controlled")).toBeNull();
    expect(generatedOn("2026-10-30T09:43:00.146Z")).toBe("2026-10-30");
  });

  it("reports a missing build commit as unversioned instead of guessing", () => {
    // No bundle has defined the build-time constant when the tests run.
    expect(resolveBuildCommit()).toBe("unversioned");
  });
});
