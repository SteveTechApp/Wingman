/**
 * The Compare page's explicit confidence tier chip (Strong direction /
 * Plausible — confirm / Evidence pending / No equivalent), shared by the
 * Recommendation verdict lead and the Side-by-side head-to-head header.
 *
 * Colour-blind accessibility: the four tones differ by colour, but green vs
 * amber (protanopia / deuteranopia) and amber vs red (tritanopia, and
 * red-green variants at low saturation) are exactly the pairings colour-blind
 * users cannot separate. Every tone therefore also carries a distinct text
 * glyph cue (✓ ! ? ×) that reads without colour — and "pending" vs "confirm"
 * share the amber tone, so the glyph is the only at-a-glance difference even
 * for normal vision. The label text stays the accessible name; the glyph is
 * decorative (aria-hidden).
 */
export type CompareConfidenceTone = "strong" | "confirm" | "pending" | "none";

export const TONE_GLYPH: Record<CompareConfidenceTone, string> = {
  strong: "✓",
  confirm: "!",
  pending: "?",
  none: "×",
};

export function CompareConfidenceTier({
  label,
  tone,
}: {
  label: string;
  tone: CompareConfidenceTone;
}) {
  return (
    <span className={`compare-confidence-tier compare-confidence-tier--${tone}`}>
      <span className="compare-confidence-tier__glyph" aria-hidden="true">
        {TONE_GLYPH[tone]}
      </span>
      {label}
    </span>
  );
}
