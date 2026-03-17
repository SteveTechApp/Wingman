import { FAMILY_RULES } from "./familyRules";
import type {
  AvoipSubtype,
  DeviceRole,
  HdbtGeneration,
  StructuredProduct,
  TransportClass,
  VideoCapability,
} from "./types";

function text(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function findFamilyRule(blob: string): (typeof FAMILY_RULES)[number] | undefined {
  return FAMILY_RULES.find((rule) => {
    const skuOk = rule.skuPattern.test(blob);
    const brandOk = rule.brandPattern ? rule.brandPattern.test(blob) : true;
    return skuOk && brandOk;
  });
}

function detectTransport(blob: string): TransportClass {
  if (/hdbaset|dtp/.test(blob)) return "HDBASET";
  if (/jpeg.?2000|networkhd|sdvoe|h\.?264|h\.?265|av over ip|avoip|encoder|decoder/.test(blob) && /lan|ethernet|network|ip|rj45/.test(blob)) {
    return "AVOIP";
  }
  if (/usb extension|usb ext|kvm extender/.test(blob)) return "USB_EXTENSION";
  if (/matrix|switcher|hdmi/.test(blob)) return "HDMI_DISTRIBUTION";
  return "UNKNOWN";
}

function detectAvoipSubtype(blob: string, multiview: boolean): AvoipSubtype {
  if (multiview || /multiview|multi-view|windowing/.test(blob)) return "MULTIVIEW";
  if (/sdvoe/.test(blob)) return "SDVOE";
  if (/jpeg.?2000|j2k|networkhd 100|networkhd 200|networkhd 500|ip300|ip350/.test(blob)) return "JPEG2000";
  if (/h\.?264|h\.?265|h264|h265/.test(blob)) return "H264_H265";
  if (/crestron|atlona|nvx|omni|proprietary/.test(blob)) return "PROPRIETARY";
  return "UNKNOWN";
}

function detectHdbtGeneration(blob: string): HdbtGeneration {
  if (/3\.0|hdbaset 3|hdbt 3|tx3|rx3/.test(blob)) return "HDBT_3_0";
  if (/hdbaset|dtp/.test(blob)) return "HDBT_2_0";
  return "UNKNOWN";
}

function detectRole(blob: string, multiview: boolean): DeviceRole {
  if (multiview || /multiview|multi-view/.test(blob)) return "MULTIVIEW_DECODER";
  if (/matrix/.test(blob)) return "MATRIX";
  if (/switcher|presentation switcher/.test(blob)) return "SWITCHER";
  if (/encoder|tx\b|transmitter/.test(blob)) return "ENCODER";
  if (/decoder|rx\b|receiver/.test(blob)) return "DECODER";
  if (/extender.*tx|tx.*extender/.test(blob)) return "EXTENDER_TX";
  if (/extender.*rx|rx.*extender/.test(blob)) return "EXTENDER_RX";
  return "UNKNOWN";
}

function detectVideo(blob: string): VideoCapability {
  const maxResolution =
    /8k/.test(blob) ? "8K" :
    /4k.?60|2160p60/.test(blob) ? "4K60" :
    /4k|2160p/.test(blob) ? "4K30" :
    /1080/.test(blob) ? "1080p" :
    "Unknown";

  const chroma =
    /4:4:4/.test(blob) ? "4:4:4" :
    /4:2:0/.test(blob) ? "4:2:0" :
    "Unknown";

  const bandwidth =
    /18g|18gbps|600mhz/.test(blob) ? "18G" :
    /10g|10\.2g|10gbps|340mhz/.test(blob) ? "10G" :
    "Unknown";

  return { maxResolution, chroma, bandwidth };
}

export function buildStructuredProduct(input: {
  sku: string;
  name?: string;
  summary?: string;
  description?: string;
  category?: string;
  technology?: string;
  features?: string[];
}): StructuredProduct {
  const blob = text(
    input.sku,
    input.name,
    input.summary,
    input.description,
    input.category,
    input.technology,
    ...(input.features ?? [])
  );

  const multiview = /multiview|multi-view|windowing/.test(blob);
  const familyRule = findFamilyRule(blob);

  return {
    sku: input.sku,
    name: input.name ?? input.sku,
    transport: familyRule?.transport ?? detectTransport(blob),
    avoipSubtype: familyRule?.avoipSubtype ?? detectAvoipSubtype(blob, familyRule?.multiview ?? multiview),
    hdbtGeneration: familyRule?.hdbtGeneration ?? detectHdbtGeneration(blob),
    role: familyRule?.role ?? detectRole(blob, familyRule?.multiview ?? multiview),
    video: detectVideo(blob),
    ports: {
      hdmiIn: /\b4[ -]?input\b/.test(blob) ? 4 : /\b3[ -]?input\b/.test(blob) ? 3 : /\b2[ -]?input\b|\bdual input\b/.test(blob) ? 2 : /\binput\b|\bhdmi\b/.test(blob) ? 1 : 0,
      hdmiOut: /hdmi out|loop out|local out/.test(blob) ? 1 : 0,
      lan: /lan|ethernet|network|rj45/.test(blob) ? 1 : 0,
    },
    features: {
      scaling: /scal(er|ing)/.test(blob),
      kvm: /\bkvm\b/.test(blob),
      videoWall: /video wall/.test(blob),
      audioBreakout: /de-embed|deembed|audio breakout/.test(blob),
      multiview: familyRule?.multiview ?? multiview,
    },
  };
}