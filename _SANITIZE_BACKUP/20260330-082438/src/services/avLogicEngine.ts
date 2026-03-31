import type { CatalogProduct } from "@/catalog";

export type AvEndpointRole = "encoder" | "decoder" | "endpoint" | "controller" | "unknown";
export type AvTransportDomain = "avoip" | "hdbaset" | "local" | "usb-extension" | "wireless" | "unknown";
export type AvCodecDomain = "sdvoe" | "jpeg-xs" | "jpeg2000" | "h264" | "h265" | "dante-av" | "unknown";
export type AvNetworkClass = "1g" | "2g" | "10g" | "unknown";
export type HdbasetClass = "class-a" | "class-b" | "class-c" | "class-d" | "unknown";

export type AvProductLike = Partial<CatalogProduct> & {
  brand?: string;
};

export type AvSignalProfile = {
  role: AvEndpointRole;
  transport: AvTransportDomain;
  codec: AvCodecDomain;
  networkClass: AvNetworkClass;
  hdbasetClass: HdbasetClass;
  isMultiview: boolean;
  text: string;
};

export type AvCompatibilityAssessment = {
  compatible: boolean;
  scoreDelta: number;
  reasons: string[];
  warnings: string[];
  blockers: string[];
};

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeText(...values: unknown[]): string {
  return values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => tidy(value).toLowerCase())
    .filter(Boolean)
    .join(" ")
    .replace(/[^a-z0-9+./ -]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function has(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

function inferRole(text: string): AvEndpointRole {
  const encoder = has(text, /\bencoder\b|\btx\b|\btransmitter\b/);
  const decoder = has(text, /\bdecoder\b|\brx\b|\breceiver\b/);
  const controller = has(text, /\bcontroller\b|\bcontrol processor\b|\bcontrol gateway\b|\bmanagement controller\b/);

  if (encoder && decoder) return "endpoint";
  if (decoder) return "decoder";
  if (encoder) return "encoder";
  if (controller) return "controller";
  return "unknown";
}

function inferTransportDomain(text: string): AvTransportDomain {
  if (has(text, /\bhdbaset\b/)) return "hdbaset";
  if (has(text, /\bnetworkhd\b|\bav over ip\b|\bavoip\b|\bsdvoe\b|\bdante av-a\b/)) return "avoip";
  if (has(text, /\busb extension\b/)) return "usb-extension";
  if (has(text, /\bwireless\b|\bairplay\b|\bmiracast\b|\bchromecast\b/)) return "wireless";
  if (has(text, /\blocal\b/)) return "local";
  return "unknown";
}

function transportDomainFromCatalogTransport(
  transport: CatalogProduct["transport"] | undefined,
): AvTransportDomain | null {
  switch (String(transport || "").trim().toLowerCase()) {
    case "hdbaset":
      return "hdbaset";
    case "avoip":
      return "avoip";
    case "usb extension":
      return "usb-extension";
    case "local":
      return "local";
    default:
      return null;
  }
}

function inferCodec(text: string): AvCodecDomain {
  if (has(text, /\bsdvoe\b|\buncompressed\b/)) return "sdvoe";
  if (has(text, /\bjpeg[- ]?xs\b/)) return "jpeg-xs";
  if (has(text, /\bjpeg[- ]?2000\b/)) return "jpeg2000";
  if (has(text, /\bh\.?265\b/)) return "h265";
  if (has(text, /\bh\.?264\b/)) return "h264";
  if (has(text, /\bdante av-a\b/)) return "dante-av";
  return "unknown";
}

function inferCodecFromSku(sku: string): AvCodecDomain {
  if (/^NHD-600/i.test(sku)) return "sdvoe";
  if (/^NHD-500/i.test(sku)) return "jpeg-xs";
  if (/^NHD-400/i.test(sku)) return "jpeg2000";
  if (/^NHD-1(10|20|50)/i.test(sku)) return "h264";
  return "unknown";
}

function inferNetworkClass(text: string): AvNetworkClass {
  if (has(text, /\b10g\b|\b10gbe\b|\b10gb\b|\b10 gig\b|\b10-gig\b|\bsfp\+\b/)) return "10g";
  if (has(text, /\b2g\b|\b2gbe\b|\b2gb\b|\b2\.5g\b/)) return "2g";
  if (has(text, /\b1g\b|\b1gbe\b|\bone-gig\b|\bone gig\b|\bgigabit\b|\b1000base\b/)) return "1g";
  return "unknown";
}

function inferHdbasetClass(text: string): HdbasetClass {
  if (has(text, /\bclass a\b/)) return "class-a";
  if (has(text, /\bclass b\b/)) return "class-b";
  if (has(text, /\bclass c\b/)) return "class-c";
  if (has(text, /\bclass d\b/)) return "class-d";
  return "unknown";
}

function buildProfileText(product: AvProductLike): string {
  const portTypes = [
    ...(product.inputs ?? []).map((port) => port.type),
    ...(product.outputs ?? []).map((port) => port.type),
  ];

  return normalizeText(
    product.sku,
    product.brand,
    product.family,
    product.name,
    product.category,
    product.subcategory,
    product.summary,
    product.transport,
    product.video?.maxResolution,
    product.video?.hdmi,
    Number.isFinite(product.video?.bandwidthGbps) ? `${product.video?.bandwidthGbps}gbps` : "",
    product.latency,
    product.features,
    product.control,
    product.audio,
    portTypes,
    product.distance?.notes,
  );
}

export function buildAvSignalProfile(product: AvProductLike): AvSignalProfile {
  const text = buildProfileText(product);
  const sku = tidy(product.sku).toUpperCase();
  const role = inferRole(text);
  const transport =
    transportDomainFromCatalogTransport(product.transport) ||
    inferTransportDomain(text);
  const codecFromText = inferCodec(text);
  const codec = codecFromText !== "unknown" ? codecFromText : inferCodecFromSku(sku);
  const networkClass = inferNetworkClass(text);
  const hdbasetClass = inferHdbasetClass(text);
  const isMultiview = has(text, /\bmultiview\b|\bmulti[- ]?view\b/);

  return {
    role,
    transport,
    codec,
    networkClass,
    hdbasetClass,
    isMultiview,
    text,
  };
}

export function evaluateAvCompatibility(
  requested: AvSignalProfile,
  candidate: AvSignalProfile,
): AvCompatibilityAssessment {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const blockers: string[] = [];
  let scoreDelta = 0;

  if (requested.transport !== "unknown" && candidate.transport !== "unknown" && requested.transport !== candidate.transport) {
    blockers.push(`Transport mismatch (${requested.transport} vs ${candidate.transport}).`);
  }

  if (requested.role === "decoder" && candidate.role === "encoder") {
    blockers.push("Role mismatch: decoder request cannot be fulfilled by an encoder/TX endpoint.");
  }
  if (requested.role === "encoder" && candidate.role === "decoder") {
    blockers.push("Role mismatch: encoder request cannot be fulfilled by a decoder/RX endpoint.");
  }

  if (blockers.length > 0) {
    return {
      compatible: false,
      scoreDelta: 0,
      reasons,
      warnings,
      blockers,
    };
  }

  if (requested.role !== "unknown" && candidate.role !== "unknown") {
    if (requested.role === candidate.role) {
      scoreDelta += 14;
      reasons.push(`Role alignment (${candidate.role}).`);
    } else if (
      (requested.role === "decoder" || requested.role === "encoder") &&
      candidate.role === "endpoint"
    ) {
      scoreDelta -= 8;
      warnings.push("Bidirectional endpoint selected against a single-role requirement.");
    }
  }

  if (requested.transport === "avoip" && candidate.transport === "avoip") {
    if (requested.codec !== "unknown" && candidate.codec !== "unknown" && requested.codec !== candidate.codec) {
      blockers.push(
        `AVoIP codec/chipset mismatch (${requested.codec} vs ${candidate.codec}). AVoIP chipsets are proprietary and must not be mixed.`,
      );
      return {
        compatible: false,
        scoreDelta: 0,
        reasons,
        warnings,
        blockers,
      };
    }

    if (requested.networkClass !== "unknown" && candidate.networkClass !== "unknown") {
      if (requested.networkClass === candidate.networkClass) {
        scoreDelta += 5;
        reasons.push(`Network class alignment (${candidate.networkClass}).`);
      } else {
        scoreDelta -= 14;
        warnings.push(`Network class mismatch (${requested.networkClass} vs ${candidate.networkClass}).`);
      }
    }

    if (!requested.isMultiview && candidate.isMultiview) {
      scoreDelta -= 12;
      warnings.push("Candidate is multiview-focused while request is a standard endpoint.");
    } else if (requested.isMultiview && !candidate.isMultiview) {
      scoreDelta -= 8;
      warnings.push("Candidate lacks multiview capability requested by source profile.");
    }
  }

  if (requested.transport === "hdbaset" && candidate.transport === "hdbaset") {
    if (requested.hdbasetClass !== "unknown" && candidate.hdbasetClass !== "unknown") {
      if (requested.hdbasetClass === candidate.hdbasetClass) {
        scoreDelta += 6;
        reasons.push(`HDBaseT class alignment (${candidate.hdbasetClass}).`);
      } else {
        scoreDelta -= 10;
        warnings.push(`HDBaseT class mismatch (${requested.hdbasetClass} vs ${candidate.hdbasetClass}).`);
      }
    }
  }

  return {
    compatible: true,
    scoreDelta,
    reasons,
    warnings,
    blockers,
  };
}
