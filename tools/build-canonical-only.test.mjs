import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("generates the test catalogue without rewriting tracked evidence or manifests", () => {
  const files = execFileSync("git", ["ls-files", "-z", "data-sources", "data/catalog", "data/governance"], { encoding: "utf8" })
    .split("\0").filter(Boolean);
  const fingerprints = () => files.map((file) => createHash("sha256").update(readFileSync(file)).digest("hex"));
  const before = fingerprints();
  execFileSync(process.execPath, ["tools/build-product-data-sources.mjs", "--canonical-only"], { stdio: "pipe" });
  expect(fingerprints()).toEqual(before);
  const store = JSON.parse(readFileSync("data/wingman-canonical-product-store.json", "utf8"));
  expect(store.products.length).toBeGreaterThan(250);
});
