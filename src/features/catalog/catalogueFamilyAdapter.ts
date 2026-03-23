import { classifyCatalogProduct, type CatalogProduct } from "@/catalog";

import type { CatalogueProductRecord, SolutionFamily } from "./catalogFamilyFilterModel";

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function normaliseToken(value: unknown): string {
  return tidy(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function uniqueTokens(values: Iterable<unknown>): string[] {
  return Array.from(
    new Set(
      Array.from(values)
        .map(value => normaliseToken(value))
        .filter(Boolean)
    )
  );
}

function buildSearchText(product: CatalogProduct): string {
  const ioSize =
    typeof product.inputTotal === "number" && typeof product.outputTotal === "number"
      ? `${product.inputTotal}x${product.outputTotal}`
      : "";

  return [
    product.sku,
    product.name,
    product.family,
    product.category,
    product.subcategory,
    product.summary,
    product.technology,
    product.topology,
    product.role,
    product.directionality,
    product.outputBehavior,
    product.transport,
    product.ioSummary,
    ioSize,
    product.notes,
    ...(product.features ?? []),
    ...(product.audio ?? []),
    ...(product.control ?? []),
    ...(product.normalizedTags ?? []),
    ...(product.matchKeywords ?? []),
    ...(product.inputs ?? []).map(item => `${item.count} ${item.type} input`),
    ...(product.outputs ?? []).map(item => `${item.count} ${item.type} output`)
  ]
    .map(tidy)
    .filter(Boolean)
    .join(" ");
}

function isAccessoryLike(text: string): boolean {
  return /\baccessor(?:y|ies)\b|\bdongle\b|\bdock\b|\bmount(?:ing)?\b|\bbracket\b|\bcable\b/.test(text);
}

function inferFamily(product: CatalogProduct, text: string): SolutionFamily | null {
  const classification = classifyCatalogProduct(product);

  switch (classification.group) {
    case "avoip":
      return "avoip";
    case "matrix":
      return "matrix";
    case "switcher":
    case "uc":
    case "casting":
      return "presentation";
    case "extender":
      return "extender";
    case "videowall":
      return "videoWall";
    case "audio":
      return "audio";
    case "control":
      return "control";
    case "distribution":
      return /\bmatrix\b|\bsplitter\b/.test(text) ? "matrix" : "accessory";
    case "camera":
      return /\bconference\b|\bmeeting\b|\bteams\b|\bzoom\b|\bbyom\b|\bbyod\b/.test(text)
        ? "presentation"
        : null;
    case "other":
    default:
      return isAccessoryLike(text) ? "accessory" : null;
  }
}

function inferSeries(text: string): string | undefined {
  if (/\bnhd[- ]?100\b/.test(text)) return "nhd-100";
  if (/\bnhd[- ]?500\b/.test(text)) return "nhd-500";
  if (/\bnhd[- ]?600\b|\bnhd[- ]?610\b/.test(text)) return "nhd-600";
  return undefined;
}

function inferAvoipRole(product: CatalogProduct, text: string): string | undefined {
  const classification = classifyCatalogProduct(product);
  const role = normaliseToken(product.role);

  if (classification.primaryType === "avoip-controller" || /\bcontroller\b/.test(text)) {
    return "controller";
  }

  if (/\bmultiview\b/.test(text)) {
    return "multiview";
  }

  if (/\btransceiver\b|\btrx\b/.test(text)) {
    return "transceiver";
  }

  if (classification.primaryType === "avoip-encoder" || /\bencoder\b|\btransmitter\b|\btx\b/.test(text)) {
    return "encoder";
  }

  if (classification.primaryType === "avoip-decoder" || /\bdecoder\b|\breceiver\b|\brx\b/.test(text)) {
    return "decoder";
  }

  if (/\busb\b/.test(text)) {
    return "usb";
  }

  if (["encoder", "decoder", "transceiver", "controller", "multiview", "usb"].includes(role)) {
    return role;
  }

  return undefined;
}

function inferMatrixType(product: CatalogProduct, text: string): string | undefined {
  const classification = classifyCatalogProduct(product);

  if (product.transport === "HDBaseT" || /\bhdbaset\b|\bhdbt\b/.test(text)) {
    return "hdbaset-matrix";
  }

  if (
    classification.primaryType === "advanced-matrix" ||
    product.video?.multiview ||
    product.video?.seamlessSwitching ||
    /\bseamless\b|\bmultiview\b|\bvideo wall\b|\bvideowall\b/.test(text)
  ) {
    return "seamless-matrix";
  }

  if (
    classification.primaryType === "matrix-dock" ||
    /\bhybrid\b|\bdock(?:ing)?\b|\busb[- ]?c\b|\bmst\b/.test(text)
  ) {
    return "hybrid-matrix";
  }

  return "hdmi-matrix";
}

function inferPresentationType(product: CatalogProduct, text: string): string | undefined {
  const classification = classifyCatalogProduct(product);

  if (
    classification.group === "uc" ||
    product.wireless?.wirelessConference ||
    /\bconference\b|\bteams\b|\bzoom\b|\bbyom\b|\bbyod\b|\buc\b/.test(text)
  ) {
    return "conference-switcher";
  }

  if (
    classification.group === "casting" ||
    product.wireless?.wirelessPresentation ||
    product.wireless?.airplay ||
    product.wireless?.miracast ||
    /\bwireless\b|\bairplay\b|\bmiracast\b/.test(text)
  ) {
    return "wireless-presentation";
  }

  return "presentation-switcher";
}

function inferExtenderType(product: CatalogProduct, text: string): string | undefined {
  if (/\baudio\b|\bde-embed\b/.test(text)) return "audio-extender";
  if (product.transport === "USB Extension" || /\busb\b|\bkvm\b|\bhid\b/.test(text)) return "usb-extender";
  if (product.transport === "HDBaseT" || /\bhdbaset\b|\bhdbt\b/.test(text)) return "hdbaset-extender";
  return "hdmi-extender";
}

function inferVideoWallType(text: string): string | undefined {
  if (/\bnetworkhd\b|\bavoip\b|\bav over ip\b/.test(text)) return "avoip-wall";
  if (/\bmultiview\b/.test(text)) return "multiview-wall";
  return "processor";
}

function inferAudioType(product: CatalogProduct, text: string): string | undefined {
  const classification = classifyCatalogProduct(product);

  if (classification.primaryType === "dante-amplifier") return "dante-amplifier";
  if (classification.primaryType === "microphone-hub") return "microphone-hub";
  if (/\bde-embed\b/.test(text)) return "de-embedder";
  if (/\bmic(?:rophone)?\b/.test(text)) return "mic";
  return undefined;
}

function inferControlType(product: CatalogProduct, text: string): string | undefined {
  const classification = classifyCatalogProduct(product);

  if (/\bkeypad\b/.test(text)) return "keypad";
  if (/\bprotocol\b/.test(text)) return "protocol-converter";
  if (classification.primaryType === "touch-controller" || /\btouch(?:screen|pad)?\b/.test(text)) {
    return "touch-panel";
  }
  return "controller";
}

function inferApplicationTags(text: string, family: SolutionFamily | null): string[] {
  const tags = new Set<string>();

  if (/\bmeeting room\b|\bboardroom\b|\bconference\b|\bteams\b|\bzoom\b|\bbyod\b|\bbyom\b|\bhybrid\b/.test(text)) {
    tags.add("meeting-room");
  }

  if (/\bcontrol room\b|\bcommand\b|\boperations center\b/.test(text)) {
    tags.add("control-room");
  }

  if (/\bcampus\b|\bdistribution\b/.test(text)) {
    tags.add("campus");
  }

  if (/\bvideo wall\b|\bvideowall\b/.test(text)) {
    tags.add("video-wall");
  }

  if (/\bled\b/.test(text)) {
    tags.add("led");
  }

  if (/\blecture\b|\bclassroom\b|\beducation\b/.test(text)) {
    tags.add("lecture-room");
  }

  if (/\bvenue\b|\bauditorium\b|\blarge space\b/.test(text)) {
    tags.add("large-space");
  }

  if (/\bmulti-display\b/.test(text) || (family === "matrix" && /\bmatrix\b/.test(text))) {
    tags.add("multi-display");
  }

  if (family === "presentation" && tags.size === 0) {
    tags.add("meeting-room");
  }

  return Array.from(tags);
}

function inferMountTags(product: CatalogProduct, text: string): string[] {
  const tags = new Set<string>();

  if (product.power?.wallPlate || /\bwall plate\b/.test(text)) {
    tags.add("wall-plate");
  }

  if (product.power?.tableMount || /\btable\b/.test(text)) {
    tags.add("table");
  }

  if (/\brack\b/.test(text)) {
    tags.add("rack");
  }

  return Array.from(tags);
}

function inferFeatureTags(product: CatalogProduct, text: string): string[] {
  const classification = classifyCatalogProduct(product);
  const tags = new Set<string>([
    ...uniqueTokens(product.normalizedTags ?? []),
    ...uniqueTokens(product.features ?? []),
    ...uniqueTokens(product.audio ?? []),
    ...uniqueTokens(product.control ?? []),
    ...uniqueTokens((product.inputs ?? []).map(item => item.type)),
    ...uniqueTokens((product.outputs ?? []).map(item => item.type)),
    ...uniqueTokens(classification.tags)
  ]);

  if (/\busb[- ]?c\b/.test(text)) tags.add("usb-c");
  if (/\bdante\b/.test(text)) tags.add("dante");
  if (/\baes67\b/.test(text)) tags.add("aes67");
  if (/\bvideo wall\b|\bvideowall\b/.test(text)) tags.add("video-wall");
  if (product.video?.multiview || /\bmultiview\b/.test(text)) tags.add("multiview");
  if (/\bfiber\b/.test(text)) tags.add("fiber");
  if (/\b10g\b/.test(text)) tags.add("10g");
  if (/\b1g\b/.test(text)) tags.add("1g");
  if (/\b4k60\b/.test(text)) tags.add("4k60");
  if (/\b4k\b/.test(text)) tags.add("4k");
  if (/\bdsp\b/.test(text)) tags.add("dsp");
  if (/\bbezel compensation\b/.test(text)) tags.add("bezel-comp");
  if (/\brotation\b/.test(text)) tags.add("rotation");
  if (/\bcustom layout\b|\bcanvas\b/.test(text)) tags.add("custom-layout");

  if (product.integration?.poe || product.integration?.poePd) tags.add("poe");
  if (product.integration?.rs232) tags.add("rs232");
  if (product.integration?.ir) tags.add("ir");
  if (product.power?.poh) tags.add("poh");
  if (product.wireless?.wirelessPresentation || product.wireless?.airplay || product.wireless?.miracast) {
    tags.add("wireless-casting");
  }
  if (product.wireless?.wirelessConference) tags.add("wireless-conferencing");
  if (product.wireless?.mst) tags.add("mst");

  return Array.from(tags);
}

export function toFamilyFilterProductRecord(product: CatalogProduct): CatalogueProductRecord {
  const searchText = buildSearchText(product);
  const text = searchText.toLowerCase();
  const family = inferFamily(product, text);

  return {
    sku: product.sku,
    name: tidy(product.name),
    family,
    series: family === "avoip" ? inferSeries(text) : undefined,
    role: family === "avoip" ? inferAvoipRole(product, text) : undefined,
    matrixType: family === "matrix" ? inferMatrixType(product, text) : undefined,
    presentationType: family === "presentation" ? inferPresentationType(product, text) : undefined,
    extenderType: family === "extender" ? inferExtenderType(product, text) : undefined,
    videoWallType: family === "videoWall" ? inferVideoWallType(text) : undefined,
    audioType: family === "audio" ? inferAudioType(product, text) : undefined,
    controlType: family === "control" ? inferControlType(product, text) : undefined,
    featureTags: inferFeatureTags(product, text),
    applicationTags: inferApplicationTags(text, family),
    mountTags: inferMountTags(product, text),
    searchText
  };
}
