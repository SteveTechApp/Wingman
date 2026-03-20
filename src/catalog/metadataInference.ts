import { classifyProductType } from "./classification";
import type { CatalogProduct } from "./types";

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function textBlob(product: CatalogProduct): string {
  return [
    product.sku,
    product.name,
    product.family,
    product.category,
    product.subcategory,
    product.summary,
    product.transport,
    ...(product.features || []),
    ...(product.control || []),
    ...(product.audio || []),
  ]
    .map((entry) => tidy(entry).toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function hasPort(product: CatalogProduct, type: string): boolean {
  const target = type.toLowerCase();
  return [...(product.inputs || []), ...(product.outputs || [])].some((port) =>
    tidy(port.type).toLowerCase() === target && Number(port.count) > 0
  );
}

function inferTechnology(product: CatalogProduct, text: string): string | undefined {
  if (tidy(product.technology)) return tidy(product.technology);
  if (/\bairplay\b|\bmiracast\b|\bwireless presentation\b/.test(text)) return "Wireless Presentation";
  if (product.transport === "AVoIP") return "AVoIP";
  if (product.transport === "HDBaseT") return "HDBaseT";
  if (product.transport === "USB Extension") return "USB Extension";
  if (/\bmatrix\b/.test(text)) return "Matrix";
  if (/\bdistribution amplifier\b|\bsplitter\b/.test(text)) return "Distribution";
  if (/\bpresentation\b|\bswitcher\b|\buc\b/.test(text)) return "Local Switcher";
  return undefined;
}

function inferDistance(product: CatalogProduct): CatalogProduct["distance"] {
  const text = textBlob(product);
  const distance = product.distance ? { ...product.distance } : {};

  if (!distance.meters4k && Number(distance.meters) > 0 && tidy(product.video?.maxResolution).toLowerCase().includes("4k")) {
    distance.meters4k = distance.meters;
  }

  if (!distance.networkSpeed && product.transport === "AVoIP") {
    if (/\b10g(?:be)?\b|\b10-gig\b/.test(text)) distance.networkSpeed = "10G";
    else if (/\b1g(?:be)?\b|\bgigabit\b|\bone-gigabit\b/.test(text)) distance.networkSpeed = "1G";
  }

  if (!distance.codec && product.transport === "AVoIP") {
    if (/\bsdvoe\b/.test(text)) distance.codec = "SDVoE";
    else if (/\bjpeg[- ]?2000\b/.test(text)) distance.codec = "JPEG2000";
    else if (/\baes67\b/.test(text)) distance.codec = "AES67";
  }

  if (!distance.latencyClass && product.transport === "AVoIP") {
    if (/\bsubframe\b|\bzero-frame\b|\bultra-low latency\b|\blow-latency\b/.test(text)) {
      distance.latencyClass = "ultra-low";
    }
  }

  if (!distance.hdbasetClass && product.transport === "HDBaseT") {
    const meterHint = Math.max(Number(distance.meters4k) || 0, Number(distance.meters) || 0);
    if (meterHint >= 70) distance.hdbasetClass = "Class A";
    else if (meterHint >= 35) distance.hdbasetClass = "Class B";
  }

  if (!distance.hdbasetClass && product.transport === "HDBaseT") {
    if (/\bclass a\b|\b70m\b/.test(text)) distance.hdbasetClass = "Class A";
    else if (/\bclass b\b|\b35m\b/.test(text)) distance.hdbasetClass = "Class B";
  }

  if (!distance.meters4k && product.transport === "HDBaseT") {
    if (distance.hdbasetClass === "Class A") distance.meters4k = 70;
    if (distance.hdbasetClass === "Class B") distance.meters4k = 35;
  }

  return Object.values(distance).some((entry) => entry != null && tidy(entry))
    ? distance
    : undefined;
}

export function inferCatalogMetadata(product: CatalogProduct): Partial<CatalogProduct> {
  const text = textBlob(product);
  const classification = classifyProductType({
    sku: product.sku,
    family: product.family,
    name: product.name,
    category: product.category,
    subcategory: product.subcategory,
    summary: product.summary,
    transport: product.transport,
    features: product.features,
    audio: product.audio,
    control: product.control,
  });

  let topology = tidy(product.topology);
  let role = tidy(product.role);
  let directionality = tidy(product.directionality);

  switch (classification.group) {
    case "distribution":
      topology ||= "splitter";
      role ||= "distribution-amplifier";
      directionality ||= "one-to-many";
      break;
    case "control":
      topology ||= "controller";
      role ||= "controller";
      directionality ||= "bidirectional";
      break;
    case "matrix":
      topology ||= "matrix";
      role ||= /\bkit\b/.test(text) ? "matrix-kit" : "matrix";
      directionality ||= "bidirectional";
      break;
    case "extender":
      topology ||= "1:1 extender";
      if (!role) {
        if (/\bkit\b|\bset\b/.test(text)) role = "extender-kit";
        else if (/\btransmitter\b|\btx\b/.test(text)) role = "tx";
        else if (/\breceiver\b|\brx\b/.test(text)) role = "rx";
        else role = "extender";
      }
      if (!directionality) {
        if (role === "tx") directionality = "tx";
        else if (role === "rx") directionality = "rx";
        else if (role === "extender-kit") directionality = "kit";
      }
      break;
    case "avoip":
      topology ||= role === "controller" || /\bcontroller\b|\bmanagement appliance\b|\bsystem manager\b/.test(text) || tidy(product.category).toLowerCase() === "control" ? "controller" : "endpoint";
      if (!role) {
        if (/\bcontroller\b|\bmanagement appliance\b|\bsystem manager\b/.test(text) || tidy(product.category).toLowerCase() === "control") role = "controller";
        else if (/\bencoder\b/.test(text)) role = "encoder";
        else if (/\bdecoder\b/.test(text)) role = "decoder";
        else role = "endpoint";
      }
      if (!directionality) {
        if (role === "encoder") directionality = "tx";
        else if (role === "decoder") directionality = "rx";
      }
      break;
    case "switcher":
    case "uc":
      topology ||= "local switcher";
      role ||= /\bpresentation\b/.test(text) ? "presentation-switcher" : "switcher";
      directionality ||= "bidirectional";
      break;
    default:
      break;
  }

  let outputBehavior = tidy(product.outputBehavior);
  const videoOutputTypes = (product.outputs || [])
    .filter((port) => ["hdmi", "hdbaset", "lan", "displayport"].includes(tidy(port.type).toLowerCase()) && Number(port.count) > 0)
    .map((port) => tidy(port.type).toLowerCase());

  if (!outputBehavior) {
    if (classification.group === "matrix") {
      outputBehavior = /\bmirror(?:ed)?\b/.test(text) || (hasPort(product, "HDBaseT") && hasPort(product, "HDMI"))
        ? "mirrored + local"
        : "matrixed";
    } else if (videoOutputTypes.length <= 1 && hasPort(product, "HDMI")) {
      outputBehavior = "single display only";
    } else if (hasPort(product, "HDBaseT") && hasPort(product, "HDMI")) {
      outputBehavior = "mirrored + local";
    }
  }

  return {
    technology: inferTechnology(product, text),
    topology: topology || undefined,
    role: role || undefined,
    directionality: directionality || undefined,
    outputBehavior: outputBehavior || undefined,
    distance: inferDistance(product),
  };
}
