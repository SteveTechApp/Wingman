/**
 * WyreStorm Compare Profile mapper
 *
 * Converts a WyreStorm product-intelligence record into the structured
 * CompareDecisionProfile consumed by classifyCompetitorCompareDecision, using
 * the SAME technology-class vocabulary and canonical transport as the competitor
 * spec registry. This lets the classifier compare like-for-like structured specs.
 */

import type { CompareDecisionProfile } from "./competitorCompareDecision";
import type { WyrestormProduct } from "./competitorMatchEngine";
import { canonicalTransport } from "./competitorSpecRegistry";

function text(product: WyrestormProduct): string {
  return [
    product.sku,
    product.name,
    product.title,
    product.family,
    product.productFamily,
    product.category,
    product.role,
    product.governanceRole,
    product.description,
    product.summary,
    ...(product.technologies ?? []),
    ...(product.features ?? []),
    ...(product.featureTags ?? []),
    ...(product.tags ?? []),
    ...(product.capabilities ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function detectDomain(product: WyrestormProduct, blob: string): string | undefined {
  const sku = String(product.sku ?? "").toUpperCase();

  if (/^NHD-/.test(sku) || blob.includes("avoip") || blob.includes("av over ip") || blob.includes("networkhd")) {
    return "AVOIP";
  }
  if (/^MX-/.test(sku) || blob.includes("matrix")) return "MATRIX";
  if (/^SW-/.test(sku) && (blob.includes("video wall") || blob.includes("videowall"))) return "VIDEO_WALL";
  if (blob.includes("video wall") || blob.includes("videowall")) return "VIDEO_WALL";
  if (blob.includes("multiview") || blob.includes("multi-view")) return "MULTIVIEW";
  if (/^EX-/.test(sku) || /^RX-/.test(sku) || /^TX-/.test(sku) || blob.includes("hdbaset") || blob.includes("hdbt")) {
    return "HDBASET";
  }
  if (/^APO-/.test(sku) || blob.includes("wireless presentation") || blob.includes("byod") || blob.includes("clickshare")) {
    return "WIRELESS_PRESENTATION";
  }
  if (/^SW-/.test(sku) || blob.includes("presentation") || blob.includes("switcher")) return "PRESENTATION";
  if (/^AMP-/.test(sku) || blob.includes("dante") || blob.includes("amplifier") || blob.includes("audio /")) {
    return "AUDIO";
  }
  return undefined;
}

function detectRole(product: WyrestormProduct, blob: string, domain?: string): string | undefined {
  const sku = String(product.sku ?? "").toUpperCase();

  if (/transceiver|\btrx\b/.test(blob) || /-TRX\b/.test(sku)) return "transceiver";
  if (/\bencoder\b/.test(blob) || /-TX\b/.test(sku)) return "encoder";
  if (/\bdecoder\b/.test(blob) || /-RX\b/.test(sku)) return "decoder";
  if (domain === "MATRIX" || /matrix/.test(blob)) return "matrix";
  if (domain === "VIDEO_WALL" || /video\s*wall/.test(blob)) return "video wall processor";
  if (domain === "MULTIVIEW" || /multiview/.test(blob)) return "multiview processor";
  if (domain === "WIRELESS_PRESENTATION") return "wireless presentation";
  if (domain === "AUDIO" || /amplifier|dsp|audio processor/.test(blob)) return "audio processor";
  if (domain === "HDBASET") {
    if (/receiver|\brx\b/.test(blob)) return "receiver";
    if (/transmitter|\btx\b/.test(blob)) return "transmitter";
    return "transmitter";
  }
  if (domain === "PRESENTATION" || /switcher|presentation/.test(blob)) return "presentation switcher";
  return undefined;
}

function detectIo(blob: string): { inputCount?: number; outputCount?: number } {
  const match = blob.match(/(\d{1,2})\s*[x×]\s*(\d{1,2})/);
  if (match) {
    return { inputCount: Number(match[1]), outputCount: Number(match[2]) };
  }
  return {};
}

function detectResolution(blob: string): string | undefined {
  if (/8k|4320/.test(blob)) return "8K";
  if (/4k\s*60|4k60|2160p\s*60/.test(blob)) return "4K60";
  if (/4k|uhd|2160/.test(blob)) return "4K30";
  if (/1080|1920/.test(blob)) return "1080p";
  return undefined;
}

function detectChroma(blob: string): string | undefined {
  if (/4:4:4/.test(blob)) return "4:4:4";
  if (/4:2:2/.test(blob)) return "4:2:2";
  if (/4:2:0/.test(blob)) return "4:2:0";
  return undefined;
}

function detectFeatures(blob: string): Record<string, boolean> {
  const features: Record<string, boolean> = {};
  if (/usb-?c/.test(blob)) features.usbC = true;
  if (/kvm|usb 2|usb 3|usb2|usb3|usb-a\/b|usb routing|usb host/.test(blob)) features.usbRouting = true;
  if (/\bdante\b/.test(blob)) features.dante = true;
  if (/aes67/.test(blob)) features.aes67 = true;
  if (/multiview|multi-view/.test(blob)) features.multiview = true;
  if (/video\s*wall|videowall/.test(blob)) features.videoWall = true;
  if (/wireless|byod/.test(blob)) features.wireless = true;
  if (/\b10g\b|sdvoe/.test(blob)) features.tenGig = true;
  if (/hdbaset|hdbt/.test(blob)) features.hdbtOutput = true;
  if (/receiver kit|rx kit|extender kit|tx\/rx kit/.test(blob)) features.receiverKit = true;
  return features;
}

export function buildWyrestormCompareProfile(product: WyrestormProduct): CompareDecisionProfile {
  const blob = text(product);
  const domain = detectDomain(product, blob);
  const role = detectRole(product, blob, domain);
  const io = detectIo(blob);
  const features = detectFeatures(blob);

  return {
    sku: product.sku,
    title: product.name || product.title || product.sku,
    domain,
    role,
    transport: canonicalTransport(domain),
    inputCount: io.inputCount,
    outputCount: io.outputCount,
    maxResolution: detectResolution(blob),
    chroma: detectChroma(blob),
    features: Object.keys(features).length > 0 ? features : undefined,
  };
}
