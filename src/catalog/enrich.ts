import type { CatalogPortCount, CatalogProduct } from "./types";

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function summarizePorts(ports?: CatalogPortCount[]): string {
  if (!Array.isArray(ports) || ports.length === 0) return "None";
  return ports
    .map((p) => `${Number(p.count || 0)}x ${tidy(p.type)}`)
    .join(", ");
}

function buildTags(input: CatalogProduct): string[] {
  const tags = new Set<string>();

  [
    input.family,
    input.category,
    input.subcategory,
    input.transport,
    input.video?.maxResolution,
    ...(input.features || []),
    ...(input.control || []),
    ...(input.audio || []),
    ...((input.inputs || []).map((x) => x.type)),
    ...((input.outputs || []).map((x) => x.type)),
  ]
    .map((x) => tidy(x).toLowerCase())
    .filter(Boolean)
    .forEach((x) => tags.add(x));

  if ((input.distance?.meters || 0) >= 70) tags.add("long-distance");
  if ((input.distance?.meters || 0) >= 100) tags.add("extended-distance");
  if ((input.video?.hdr)) tags.add("hdr");

  return [...tags].sort();
}

export function enrichCatalogProduct(input: CatalogProduct): CatalogProduct {
  const inputs = summarizePorts(input.inputs);
  const outputs = summarizePorts(input.outputs);
  const control = Array.isArray(input.control) && input.control.length
    ? input.control.join(", ")
    : "None";

  const normalizedTags = buildTags(input);

  return {
    ...input,
    ioSummary: `In: ${inputs} | Out: ${outputs}`,
    controlSummary: control,
    normalizedTags,
    matchKeywords: [
      input.sku,
      input.name,
      input.family,
      input.category,
      input.subcategory,
      input.summary,
      ...(input.features || []),
      ...(input.control || []),
      ...(input.audio || []),
      ...normalizedTags,
    ]
      .map((x) => tidy(x).toLowerCase())
      .filter(Boolean),
  };
}