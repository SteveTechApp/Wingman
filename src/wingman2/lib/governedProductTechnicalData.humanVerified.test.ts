import { describe, expect, it, vi } from "vitest";

// The resolver loads governed profiles once at module load from the JSON, so
// this file mocks that JSON with three variants of the real NHD-120-RX record:
// one human-confirmed (status `verified` + `verifiedBy`), one machine-only
// (`verified` with `verifiedBy` explicitly stripped - the real record is now
// human-verified, so the twin must remove it rather than inherit it), and one
// warning-tier. That pins the core honesty rule: the verified tier requires a
// human.
vi.mock("../../../data/governance/wyrestorm-technical-profiles.json", async () => {
  const actual = (await vi.importActual(
    "../../../data/governance/wyrestorm-technical-profiles.json",
  )) as { default: { profiles: Array<{ sku: string; status: string; verifiedBy?: string; confirmedFields?: unknown[] }> } };
  const base = actual.default.profiles.find((profile) => profile.sku === "NHD-120-RX");
  if (!base) throw new Error("fixture profile NHD-120-RX missing");
  const machineOnly: { sku: string; status: string; verifiedBy?: string; confirmedFields?: unknown[] } = {
    ...base,
    sku: "MACHINE-ONLY-1",
    status: "verified",
  };
  delete machineOnly.verifiedBy;
  delete machineOnly.confirmedFields;
  return {
    default: {
      version: 5,
      profiles: [
        { ...base, sku: "HUMAN-VERIFIED-1", status: "verified", verifiedBy: "Jane Engineer" },
        machineOnly,
        { ...base, sku: "WARNING-ONLY-1", status: "verified-with-warning" },
      ],
    },
  };
});

import { resolveProductTechnicalData } from "./governedProductTechnicalData";

describe("governed tier: verified requires a human", () => {
  it("maps verified + verifiedBy to the verified-profile tier", () => {
    const resolved = resolveProductTechnicalData({ sku: "HUMAN-VERIFIED-1" });
    expect(resolved.sourceTier).toBe("verified-profile");
    expect(resolved.statusLabel).toBe("Verified governed profile");
  });

  it("carries the reviewer trail only on the human-verified profile", () => {
    const human = resolveProductTechnicalData({ sku: "HUMAN-VERIFIED-1" });
    expect(human.reviewerTrail).toMatchObject({
      verifiedBy: "Jane Engineer",
    });
    expect(human.reviewerTrail?.evidenceUrl).toContain("wyrestorm.com");

    // The machine-transcribed twin never claims a reviewer trail.
    expect(resolveProductTechnicalData({ sku: "MACHINE-ONLY-1" }).reviewerTrail).toBeUndefined();
    expect(resolveProductTechnicalData({ sku: "WARNING-ONLY-1" }).reviewerTrail).toBeUndefined();
  });

  it("keeps a machine-transcribed verified status at official-structured", () => {
    const resolved = resolveProductTechnicalData({ sku: "MACHINE-ONLY-1" });
    expect(resolved.sourceTier).toBe("official-structured");
    expect(resolved.statusLabel).toBe("Official profile requiring review");
  });

  it("keeps verified-with-warning at official-structured", () => {
    const resolved = resolveProductTechnicalData({ sku: "WARNING-ONLY-1" });
    expect(resolved.sourceTier).toBe("official-structured");
    expect(resolved.statusLabel).toBe("Official profile requiring review");
  });
});
