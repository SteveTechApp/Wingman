import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CompareConfidenceTier } from "./CompareConfidenceTier";

// Every tone carries a distinct text glyph (✓ ! ? ×) so the confidence level
// reads without colour - green vs amber (red-green colour blindness) and amber
// vs red (tritanopia / low-saturation red-green) are otherwise inseparable, and
// "pending" shares the amber tone with "confirm" even for normal vision.
const TONE_CASES: Array<{ tone: "strong" | "confirm" | "pending" | "none"; glyph: string }> = [
  { tone: "strong", glyph: "✓" },
  { tone: "confirm", glyph: "!" },
  { tone: "pending", glyph: "?" },
  { tone: "none", glyph: "×" },
];

describe("CompareConfidenceTier (colour-blind-safe confidence cues)", () => {
  it.each(TONE_CASES)("renders the $tone tier with its distinct glyph ($glyph)", ({ tone, glyph }) => {
    const { container } = render(<CompareConfidenceTier label={`Tier ${tone}`} tone={tone} />);
    const chip = container.querySelector(`.compare-confidence-tier--${tone}`);
    expect(chip).not.toBeNull();
    expect(chip?.textContent).toContain(`Tier ${tone}`);
    const glyphEl = chip?.querySelector(".compare-confidence-tier__glyph");
    expect(glyphEl?.textContent).toBe(glyph);
    // The glyph is decorative; the label text is the accessible name.
    expect(glyphEl?.getAttribute("aria-hidden")).toBe("true");
  });

  it("gives every tone a unique glyph so the tier reads without colour", () => {
    const glyphs = TONE_CASES.map(({ glyph }) => glyph);
    expect(new Set(glyphs).size).toBe(glyphs.length);
  });
});
