/**
 * Which product data a document was built from, in one record.
 *
 * A proposal quotes ports, resolutions, lifecycle state and competitor evidence,
 * and the document outlives the catalogue it was read from. Three facts answer
 * "which data was this?", and they answer different halves of it: the manifest
 * digest names the data, the manifest's generation time dates it, and the build
 * commit names the code that rendered it. Printing any two of them leaves a
 * reader unable to tell a stale data set from a stale build.
 *
 * The digest is taken over the manifest's *content* — its schema version, every
 * source hash and the counts — rather than over the manifest file's bytes. Two
 * checkouts of one commit disagree about line endings, and a byte hash would
 * therefore print two different values for the same product data on Windows and
 * on the CI runner, which would turn a traceability line into a platform report.
 * Excluding `generatedAt` from the canonical string is the same decision: the
 * timestamp dates a run, the digest identifies the data, so regenerating an
 * unchanged catalogue moves one field and not the other.
 *
 * Nothing here is injected at build time. The manifest is a tracked file the app
 * already ships, so the value a document prints is computed from the same data
 * the document was built from, and a spec can reproduce it with `node:crypto`.
 *
 * Only the four fields read here are named. The manifest also records the tool
 * that wrote it and the source files it read, which are for a person auditing
 * the repository rather than for a document: `dist/` is copied whole into a
 * document root, so a chunk carrying `generator` publishes a map of the tree the
 * bundle was made from. Naming the fields is what keeps them out — the published
 * surface names the chunk that leaks it, so this stays a gate rather than a
 * convention.
 */
import {
  counts,
  generatedAt,
  hashes,
  schemaVersion,
} from "../../../data/catalog/product-data-manifest.generated.json";
import { sha256Hex } from "./sha256";

/** The half of the tracked manifest a document reads. */
export type ProductDataManifest = {
  schemaVersion: number;
  generatedAt: string;
  hashes: Record<string, string>;
  counts: Record<string, number>;
};

export const PRODUCT_DATA_MANIFEST: ProductDataManifest = { schemaVersion, generatedAt, hashes, counts };

/**
 * The manifest as a stable string: schema version, then every source hash and
 * count in sorted order. Sorted rather than in file order, so a generator that
 * reorders its own output does not read as a data change.
 */
export function productDataCanonicalString(manifest: ProductDataManifest = PRODUCT_DATA_MANIFEST): string {
  const hashes = Object.keys(manifest.hashes ?? {})
    .sort()
    .map((file) => `${file}=${manifest.hashes[file]}`);
  const counts = Object.keys(manifest.counts ?? {})
    .sort()
    .map((key) => `${key}=${manifest.counts[key]}`);
  return [`schemaVersion=${manifest.schemaVersion}`, ...hashes, ...counts].join("\n");
}

/** Full SHA-256 of the canonical manifest string. */
export function productDataManifestHash(manifest: ProductDataManifest = PRODUCT_DATA_MANIFEST): string {
  return sha256Hex(productDataCanonicalString(manifest));
}

/**
 * The commit the bundle was built from, or `unversioned`.
 *
 * `vite.config.ts` substitutes `__APP_BUILD_COMMIT__` at build time, so a shipped
 * bundle carries its own commit, and the value is `+dirty` when the tree it was
 * built from had uncommitted changes. A test run has no build commit at all, and
 * this returns `unversioned` rather than a guess: a document that names the wrong
 * commit is worse than one that names none.
 */
export function resolveBuildCommit(): string {
  try {
    if (typeof __APP_BUILD_COMMIT__ === "string" && __APP_BUILD_COMMIT__.trim()) {
      return __APP_BUILD_COMMIT__.trim();
    }
  } catch {
    // The identifier only exists once a bundle defines it.
  }
  return "unversioned";
}

export type ProductDataRevision = {
  /** Full digest of the manifest content. */
  manifestHash: string;
  /** The leading 12 characters, for a printed line. */
  manifestHashShort: string;
  /** The manifest's own generation timestamp, as recorded. */
  generatedAt: string;
  /** The calendar date of `generatedAt`, or null when the field is not a date. */
  generatedOn: string | null;
  /** The commit that rendered the document. */
  buildCommit: string;
  /** One printed line naming all three. */
  line: string;
};

/** `2026-10-30T09:43:00.146Z` → `2026-10-30`, and anything unparseable → null. */
export function generatedOn(generatedAt: string): string | null {
  const parsed = Date.parse(generatedAt);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString().slice(0, 10);
}

let cached: ProductDataRevision | null = null;

/** The revision record, computed once per page load. */
export function productDataRevision(): ProductDataRevision {
  if (cached) return cached;
  const manifestHash = productDataManifestHash();
  const generatedAt = PRODUCT_DATA_MANIFEST.generatedAt;
  const date = generatedOn(generatedAt);
  const buildCommit = resolveBuildCommit();
  cached = {
    manifestHash,
    manifestHashShort: manifestHash.slice(0, 12),
    generatedAt,
    generatedOn: date,
    buildCommit,
    line: `Product data ${manifestHash.slice(0, 12)} · assembled ${date ?? "unknown"} · build ${buildCommit}`,
  };
  return cached;
}
