// Pins the compare verdict-to-tone mapping so drift fails CI. The tier chip
// label comes from compareVerdictTier, its tone must be a tone the
// CompareConfidenceTier component renders (TONE_GLYPH keys), and the surface
// is small enough to pin exactly: four RepStatus values, one evidence-pending
// flag, four tones, four glyphs, four labels. A status arm removed, a tone
// renamed, a tone added to one side but not the other, or a glyph swapped -
// all fail here.

import { describe, expect, it } from "vitest";
import { compareVerdictTier, type RepStatus, type RepTierTone } from "./repScript";
import { TONE_GLYPH, type CompareConfidenceTone } from "../components/compare/CompareConfidenceTier";

const PINNED_TIERS: Array<{ status: RepStatus; tier: { label: string; tone: RepTierTone } }> = [
  { status: "match", tier: { label: "Strong direction", tone: "strong" } },
  { status: "checks", tier: { label: "Plausible — confirm", tone: "confirm" } },
  { status: "partial", tier: { label: "Plausible — confirm", tone: "confirm" } },
  { status: "no-match", tier: { label: "No equivalent", tone: "none" } },
];

// The evidence-pending flag only reframes the "nothing is ruled out" arm; the
// concrete outputs of the other statuses must not change when the flag flips.
const PINNED_EVIDENCE_PENDING: Record<RepStatus, { label: string; tone: RepTierTone }> = {
  match: { label: "Strong direction", tone: "strong" },
  checks: { label: "Plausible — confirm", tone: "confirm" },
  partial: { label: "Plausible — confirm", tone: "confirm" },
  "no-match": { label: "Evidence pending", tone: "pending" },
};

describe("compare verdict tone mapping", () => {
  it("maps every RepStatus to its pinned tier", () => {
    for (const { status, tier } of PINNED_TIERS) {
      expect(compareVerdictTier(status), `status "${status}"`).toEqual(tier);
    }
  });

  it("keeps the evidence-pending variant pinned for every status", () => {
    for (const status of Object.keys(PINNED_EVIDENCE_PENDING) as RepStatus[]) {
      expect(compareVerdictTier(status, { evidencePending: true }), `status "${status}"`).toEqual(
        PINNED_EVIDENCE_PENDING[status],
      );
    }
  });

  it("emits exactly the tones the CompareConfidenceTier chip can render", () => {
    const emitted = new Set<RepTierTone>([
      ...PINNED_TIERS.map(({ tier }) => tier.tone),
      ...Object.values(PINNED_EVIDENCE_PENDING).map((tier) => tier.tone),
    ]);
    const chipTones = new Set(Object.keys(TONE_GLYPH));
    // Both directions: a new tone in the mapping without a chip rendering
    // (and a chip tone the mapping never emits) is drift.
    expect(emitted).toEqual(chipTones);
  });

  it("pins TONE_GLYPH to exact, distinct, non-empty glyphs per tone", () => {
    const pinnedGlyphs: Record<CompareConfidenceTone, string> = {
      strong: "✓",
      confirm: "!",
      pending: "?",
      none: "×",
    };
    expect(TONE_GLYPH).toEqual(pinnedGlyphs);
    const glyphs = Object.values(TONE_GLYPH);
    expect(new Set(glyphs).size).toBe(glyphs.length);
    expect(glyphs.every((glyph) => glyph.trim().length > 0)).toBe(true);
  });

  it("emits four distinct, non-empty (label, tone) tiers across the whole mapping", () => {
    // "Plausible — confirm" is deliberately shared by checks and partial - the
    // tier model collapses statuses onto four tiers. What must hold is that the
    // accumulated outputs collapse to exactly four DISTINCT (label, tone) pairs
    // and no label is ever empty.
    const pairs = [
      ...PINNED_TIERS.map(({ tier }) => `${tier.label}::${tier.tone}`),
      ...Object.values(PINNED_EVIDENCE_PENDING).map((tier) => `${tier.label}::${tier.tone}`),
    ];
    expect(pairs.every((pair) => pair.startsWith(" ") === false)).toBe(true);
    expect(pairs.every((pair) => !/^::/.test(pair))).toBe(true);
    expect(new Set(pairs).size).toBe(4);
  });
});