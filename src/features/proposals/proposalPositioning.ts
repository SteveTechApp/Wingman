export type CompareHandoff = {
  source?: string;
  wyrestormSku?: string;
  wyrestormName?: string;
  competitorBrand?: string;
  competitorSku?: string;
  competitorName?: string;
  family?: string;
  category?: string;
};

export function buildProposalPositioningBlock(handoff?: CompareHandoff | null): string {
  if (!handoff) return "";

  const wy = [handoff.wyrestormSku, handoff.wyrestormName].filter(Boolean).join(" - ");
  const cp = [handoff.competitorBrand, handoff.competitorSku, handoff.competitorName]
    .filter(Boolean)
    .join(" - ");

  const lines: string[] = [];

  lines.push("Competitive Positioning");
  lines.push("-----------------------");

  if (wy) {
    lines.push(`Recommended WyreStorm solution: ${wy}`);
  }

  if (cp) {
    lines.push(`Alternative reviewed: ${cp}`);
  }

  if (handoff.family) {
    lines.push(`Product family context: ${handoff.family}`);
  }

  if (handoff.category) {
    lines.push(`Application category: ${handoff.category}`);
  }

  lines.push(
    "This proposal positions the WyreStorm solution around workflow fit, system clarity, control capability, extension method, and commercial simplicity."
  );

  return lines.join("\n");
}