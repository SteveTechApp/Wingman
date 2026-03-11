import type { DesignDirection } from "./types";

export function buildDesignDirectionSummary(direction: DesignDirection): string {
  const lines: string[] = [];

  lines.push("Recommended design direction:");
  lines.push(`- Primary architecture: ${direction.primaryArchitecture}`);

  if (direction.secondaryArchitectures.length) {
    lines.push("- Secondary architecture considerations:");
    for (const item of direction.secondaryArchitectures) lines.push(`  - ${item}`);
  }

  lines.push("");
  lines.push("Likely product-family direction:");
  for (const item of direction.productFamilyHints) lines.push(`- ${item}`);

  lines.push("");
  lines.push("Commercial summary:");
  lines.push(`- ${direction.commercialSummary}`);

  lines.push("");
  lines.push("Technical summary:");
  lines.push(`- ${direction.technicalSummary}`);

  lines.push("");
  lines.push("Why this path fits:");
  for (const item of direction.whyThisPath) lines.push(`- ${item}`);

  lines.push("");
  lines.push("Design notes:");
  for (const item of direction.designNotes) lines.push(`- ${item}`);

  lines.push("");
  lines.push("Still needed before BOM generation:");
  for (const item of direction.missingDetailsBeforeBom) lines.push(`- ${item}`);

  lines.push("");
  lines.push(`Suitability: ${Math.round(direction.suitabilityScore * 100)}%`);

  return lines.join("\n");
}