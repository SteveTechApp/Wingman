import { classifyCatalogProduct } from "./classification";
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
  const classification = classifyCatalogProduct(input);

  [
    input.technology,
    input.topology,
    input.role,
    input.directionality,
    input.outputBehavior,
    input.family,
    input.category,
    input.subcategory,
    input.transport,
    input.video?.maxResolution,
    input.video?.maxFramerate,
    input.video?.chroma,
    input.video?.hdmi,
    input.video?.hdmiVersion,
    input.video?.hdcpVersion,
    Number.isFinite(input.video?.bandwidthGbps) ? `${input.video?.bandwidthGbps}gbps` : "",
    input.latency,
    input.distance?.hdbasetClass,
    input.distance?.networkSpeed,
    input.distance?.codec,
    input.distance?.latencyClass,
    ...(input.features || []),
    ...(input.control || []),
    ...(input.audio || []),
    ...((input.inputs || []).map((x) => x.type)),
    ...((input.outputs || []).map((x) => x.type)),
  ]
    .map((x) => tidy(x).toLowerCase())
    .filter(Boolean)
    .forEach((x) => tags.add(x));

  classification.tags.forEach((tag) => tags.add(tag));

  if ((input.distance?.meters || 0) >= 70) tags.add("long-distance");
  if ((input.distance?.meters || 0) >= 100) tags.add("extended-distance");
  if (input.video?.hdr) tags.add("hdr");
  if (input.video?.dolbyVision) tags.add("dolby-vision");
  if (input.video?.multiview) tags.add("multiview");
  if (input.video?.seamlessSwitching) tags.add("seamless-switching");
  if (input.usb?.kvmSupport) tags.add("kvm");
  if (input.usb?.usbCVideoInput) tags.add("usb-c-video");
  if (input.wireless?.airplay) tags.add("airplay");
  if (input.wireless?.miracast) tags.add("miracast");
  if (input.wireless?.mst) tags.add("mst");
  if (input.wireless?.wirelessPresentation) tags.add("wireless-presentation");
  if (input.integration?.rs232) tags.add("rs232");
  if (input.integration?.ir) tags.add("ir");
  if (input.integration?.lanControl) tags.add("lan-control");
  if (input.integration?.cec) tags.add("cec");
  if (input.power?.wallPlate) tags.add("wall-plate");

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
