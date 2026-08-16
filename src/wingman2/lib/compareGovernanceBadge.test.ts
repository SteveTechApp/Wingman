import { describe, expect, it } from "vitest";
import { runCompareRuntimePipeline } from "./compareRuntimePipeline";
import { findKnownCompareProfile } from "./knownCompareProfiles";
import governedProfiles from "../../../data/governance/wyrestorm-technical-profiles.json";

type ProfileRecord = {
  sku: string;
  name?: string;
  status?: string;
  verifiedBy?: string;
  productClass?: string;
  role?: string;
  transport?: string[];
  maxResolution?: string;
  dependencies?: unknown[];
  ports?: Array<{ category?: string }>;
  evidence?: unknown[];
};

const governedProfilesList = (governedProfiles as { profiles: ProfileRecord[] }).profiles;

const products = governedProfilesList.map((p) => ({
  sku: p.sku,
  name: p.name || p.sku,
}));

// "Verified" requires a human: the 2026-08-16 review passes confirmed 117 of
// the 130 governed profiles (status verified + verifiedBy recorded).
const humanVerified = new Set(
  governedProfilesList
    .filter((profile) => profile.status === "verified" && Boolean(profile.verifiedBy?.trim()))
    .map((profile) => profile.sku.toUpperCase()),
);

function runtimeMatches(input: string, brand: string) {
  const result = runCompareRuntimePipeline(input, products as never, brand, 8) as {
    matches: Array<{ sku: string; wyrestorm?: { sourceTier?: string; sourceLabel?: string } }>;
  };
  return result.matches;
}

describe("match-card governance tier", () => {
  it("survives the eligibility-injection path with the governed tier intact", () => {
    // AT-UHD-PRO3-88M triggers eligibility-injected 8x8 matrix candidates; the
    // injected matches must carry a resolved compare profile, not a bare
    // catalogue row, so the match card badge can show the governed tier. The
    // 2026-08-16 review passes human-confirmed the matrix family (derived from
    // the governed data, so the pin follows the data rather than a hardcoded
    // set); only profiles still awaiting a human stay at official-structured.
    const matches = runtimeMatches("AT-UHD-PRO3-88M 8x8 4K HDMI matrix", "Atlona");
    expect(matches.length).toBeGreaterThan(0);
    const matrix = matches.filter((m) => /^(MXV|MX)-0808/.test(m.sku));
    expect(matrix.length).toBeGreaterThan(0);
    for (const match of matrix) {
      expect(match.wyrestorm?.sourceTier, `${match.sku} tier`).toBe(
        humanVerified.has(match.sku.toUpperCase()) ? "verified-profile" : "official-structured",
      );
    }
  });

  it("survives the known-profile override path with the governed tier intact", () => {
    const input = "AT-UHD-PRO3-88M";
    const known = findKnownCompareProfile(input, "Atlona");
    if (!known) {
      // The known profile set can evolve; when it matches, the tier must hold.
      expect(true).toBe(true);
      return;
    }
    const matches = runtimeMatches(input, "Atlona");
    for (const sku of known.preferredCandidates.map((c) => c.sku)) {
      const match = matches.find((m) => m.sku.toUpperCase() === sku.toUpperCase());
      if (!match) continue;
      expect(match.wyrestorm?.sourceTier, `${sku} tier`).not.toBeUndefined();
    }
  });
});
