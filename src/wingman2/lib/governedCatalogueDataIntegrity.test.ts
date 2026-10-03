import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type Port = {
  count: number;
  connector: string;
  direction: string;
  category: string;
  detail?: string;
};

type RecordValue = Record<string, any>;

function read(relativePath: string): any {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), "utf8"));
}

function portSignature(port: Port): string {
  return [port.count, port.connector, port.direction, port.category, port.detail ?? ""].join("|");
}

const accessoryPattern = /\b(?:cables?|remote(?: control)?|mounting brackets?|rack brackets?|wall brackets?|quick\s*start|user guide|power suppl(?:y|ies)|power adapters?|receiver units?|transmitter units?)\b/i;

describe("governed WyreStorm catalogue integrity", () => {
  const governance = read("data/governance/wyrestorm-technical-profiles.json");
  const canonical = read("data/wingman-canonical-product-store.json");
  const products = new Map<string, RecordValue>(canonical.products.map((product: RecordValue) => [product.sku, product]));
  const verified = governance.profiles.filter((profile: RecordValue) => /^verified(?:-with-warning)?$/i.test(profile.status));

  it("publishes every verified profile in the store or ledger it out via lifecycle", () => {
    // Confirmation pass 3 (2026-09-30) verified 21 profile-only accessory
    // records (power supplies, Dante converters, control hubs, 8K cable
    // lengths, an ink-multiview switcher) that the canonical store never
    // carried: most are deliberately out of the specifiable catalogue
    // ("Coming Soon", family do-not-spec, profile-evidence-only). A verified
    // profile must therefore be published in the store OR hold an explicit
    // lifecycle-ledger row - a profile that is neither is the defect.
    const lifecyclePath = path.join(process.cwd(), "data-sources/wyrestorm/lifecycle.csv");
    const lifecycleLedger = new Set(
      fs.readFileSync(lifecyclePath, "utf8")
        .split(/\r?\n/)
        .slice(1)
        .filter(Boolean)
        .map((line) => line.split(",")[0].trim()),
    );
    const unresolved = verified
      .filter((profile: RecordValue) => !products.has(profile.sku) && !lifecycleLedger.has(profile.sku))
      .map((profile: RecordValue) => profile.sku);

    expect(unresolved).toEqual([]);
  });

  it("makes reviewed functional ports authoritative in generated product data", () => {
    const mismatches: string[] = [];
    for (const profile of verified) {
      const product = products.get(profile.sku);
      if (!product) continue;
      const expected = (profile.ports ?? []).map(portSignature).sort();
      const actual = (product.technicalProfile?.io?.ports ?? []).map(portSignature).sort();
      if (JSON.stringify(actual) !== JSON.stringify(expected)) mismatches.push(profile.sku);
      if (!product.technicalProfile?.governedSpecification) mismatches.push(`${profile.sku}:not-governed`);
    }

    expect(mismatches).toEqual([]);
  });

  it("keeps included accessories out of verified functional I/O", () => {
    const polluted = verified.flatMap((profile: RecordValue) =>
      (profile.ports ?? [])
        .filter((port: Port) => port.category !== "power" && accessoryPattern.test(`${port.connector} ${port.detail ?? ""}`))
        .map(() => profile.sku),
    );

    expect([...new Set(polluted)]).toEqual([]);
  });

  it("preserves HDBaseT class/reach evidence or an explicit verification caveat", () => {
    const missing = verified
      .filter((profile: RecordValue) => (profile.transport ?? []).some((value: string) => /hdbase[-\s]?t/i.test(value)))
      .filter((profile: RecordValue) => {
        const evidence = JSON.stringify(profile);
        const hasTechnicalEvidence = /hdbaset\s*(?:2\.0|3\.0)|class\s*[abc]|\b\d{2,3}\s*m(?:eters)?\b|\b\d{2,4}\s*ft\b/i.test(evidence);
        const explicitlyNeedsVerification = /(?:confirm|verify)[^.]{0,80}(?:hdbaset\s+class|class\s*\/\s*reach|class and reach|hdbaset[^.]{0,40}(?:class|distance|reach))/i.test(evidence);
        return !hasTechnicalEvidence && !explicitlyNeedsVerification;
      })
      .map((profile: RecordValue) => profile.sku);

    expect(missing).toEqual([]);
  });
});
