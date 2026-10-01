import { canonicalManufacturerName, type EquipmentRole } from "./equipmentLibrary";

export type ProductPageDetails = {
  ok: boolean;
  manufacturer?: string;
  model?: string;
  title?: string;
  summary?: string;
  keySpecs?: string[];
  resolvedUrl?: string;
  fetchedAt?: string;
};

export function suggestModelFromProductPage(details: ProductPageDetails): string {
  const title = String(details.title || "").split("|")[0].trim();
  const heading = title.split(/\s+[-–—]\s+/)[0].trim();
  const sku = heading.match(/\b[A-Z0-9]+(?:-[A-Z0-9]+)+\b/i)?.[0];
  if (sku && /[A-Z]/i.test(sku) && /\d/.test(sku)) return details.model?.trim() || sku;
  const tokens = heading.split(/\s+/).filter(Boolean);
  if (tokens.length <= 4 && tokens.every((token) => /^[A-Z0-9]+$/.test(token)) && tokens.some((token) => /[A-Z]{2,}/.test(token)) && tokens.some((token) => /\d{2,}/.test(token))) {
    return details.model?.trim() || heading;
  }
  const modelToken = tokens.find((token) => token.length >= 4 && /[A-Z]/i.test(token) && /\d{2,}/.test(token));
  return details.model?.trim() || modelToken || "";
}

export function manufacturerFromProductPage(details: ProductPageDetails): string {
  const source = String(details.resolvedUrl || "");
  try {
    const host = new URL(source).hostname.toLowerCase().replace(/^www\d*\./, "");
    const labels = host.split(".");
    const label = (labels.length > 2 && /^(?:eu|uk|us|support|products?|shop|store|www\d*)$/.test(labels[0]) ? labels[1] : labels[0]).replace(/[-_]+/g, " ");
    return canonicalManufacturerName(details.manufacturer?.trim() || label.replace(/\b\w/g, (letter) => letter.toUpperCase()));
  } catch {
    return canonicalManufacturerName(details.manufacturer?.trim() || "");
  }
}

export function suggestEquipmentRole(details: ProductPageDetails): EquipmentRole {
  const text = `${details.title || ""} ${details.summary || ""} ${(details.keySpecs || []).join(" ")}`.toLowerCase();
  if (/\bdecoder\b/.test(text) && /av over ip|video over ip|network|ethernet/.test(text)) return "AV over IP decoder";
  if (/\bencoder\b/.test(text) && /av over ip|video over ip|network|ethernet/.test(text)) return "AV over IP encoder";
  if (/\bvideo processor\b|\bvideo wall controller\b/.test(text)) return "Video processor";
  if (/projector/.test(text)) return "Projector";
  if (/loudspeaker|speaker/.test(text)) return "Speaker";
  if (/microphone|mic array/.test(text)) return "Microphone";
  if (/camera|webcam/.test(text)) return "Camera";
  if (/amplifier|\bamp\b/.test(text)) return "Amplifier";
  if (/audio processor|dsp|audio matrix/.test(text)) return "Audio processor";
  if (/network switch|ethernet switch|managed switch/.test(text)) return "Network switch";
  if (/display|monitor|panel|television|\btv\b/.test(text)) return "Display";
  if (/mount|bracket/.test(text)) return "Mount";
  if (/cable|lead|patch cord/.test(text)) return "Cable";
  if (/rack|enclosure|cabinet/.test(text)) return "Rack";
  if (/power supply|power distribution|\bpdu\b/.test(text)) return "Power";
  if (/control processor|control system|touch panel/.test(text)) return "Control";
  return "Other";
}

export function productPageSummary(details: ProductPageDetails): string {
  const summary = String(details.summary || details.title || "").replace(/\s+/g, " ").trim();
  return summary.slice(0, 520);
}

export function productPageSpecifications(details: ProductPageDetails): string {
  const lines = (details.keySpecs || []).map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item && !/skip to main content|support hotline|account products|toggle navigation|menu power search|recently viewed products|close a&e|select a part number|share this item via|please enter a valid|learn more|back to top|product home|careers|jquery ui|https?:\/\//i.test(item))
    .map((item) => item.slice(0, 260));
  return [...new Map(lines.map((line) => [line.toLowerCase(), line])).values()].slice(0, 8).join("\n");
}

export function productPageConnections(details: ProductPageDetails): string {
  const text = productPageSpecifications(details).replace(/\s+/g, " ");
  const patterns = [
    /\b\d+\s*[×x]\s*HDMI\s+(?:inputs?|outputs?|ports?)\b/gi,
    /\bHDMI\s+(?:inputs?|outputs?|ports?)\b/gi,
    /\b\d+\s*(?:G|Gb|Gbps)\s*Ethernet(?:\s+(?:interface|port|ports))?\b/gi,
    /\b(?:USB(?:-C)?|Ethernet|RJ45|RS-232|IR|Digital I\/O|Dante|AES67|XLR|SDI|DisplayPort|HDBaseT|PoE)(?:\s+(?:input|output|interface|ports?))?\b/gi,
  ];
  const connections = patterns.flatMap((pattern) => [...text.matchAll(pattern)].map((match) => match[0].trim()));
  return [...new Map(connections.map((entry) => [entry.toLowerCase(), entry])).values()].slice(0, 10).join(", ");
}
