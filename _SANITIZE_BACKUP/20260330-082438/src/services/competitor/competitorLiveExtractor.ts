import type { CompetitorLiveRecord, CompetitorLookupInput } from "./competitorLiveTypes";

function lower(value: string): string {
  return value.toLowerCase();
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function detectTechnology(blob: string): string {
  const t = lower(blob);

  if (/hdbaset|dtp/.test(t)) return "HDBaseT";
  if (/sdvoe/.test(t)) return "SDVoE";
  if (/jpeg.?2000|networkhd|ip300|ip350|ip500|j2k/.test(t)) return "AVoIP / JPEG2000";
  if (/h\.?264|h\.?265|h264|h265/.test(t)) return "AVoIP / H.264-H.265";
  if (/av over ip|avoip|encoder|decoder|multicast/.test(t)) return "AVoIP";
  if (/matrix/.test(t)) return "Matrix Switching";
  if (/usb|kvm/.test(t)) return "USB / KVM";
  if (/camera|video bar/.test(t)) return "Cameras / Video Bars";
  if (/audio/.test(t)) return "Audio";

  return "Unknown";
}

function detectCategory(blob: string): string {
  const t = lower(blob);

  if (/multiview/.test(t)) return "Multiview Decoder";
  if (/decoder|receiver|rx\b/.test(t)) return "Decoder / Receiver";
  if (/encoder|transmitter|tx\b/.test(t)) return "Encoder / Transmitter";
  if (/switcher|presentation switcher/.test(t)) return "Switcher";
  if (/matrix/.test(t)) return "Matrix";
  if (/video wall/.test(t)) return "Video Wall";
  if (/extender/.test(t)) return "Extender";
  if (/camera|video bar/.test(t)) return "Camera / Video Bar";

  return "Unknown";
}

function detectFeatures(blob: string): string[] {
  const t = lower(blob);
  const features: string[] = [];

  const checks: Array<[RegExp, string]> = [
    [/\b4k60\b|4k 60|2160p60/, "4K60"],
    [/\b4:4:4\b/, "4:4:4"],
    [/\b18g\b|18gbps|600mhz/, "18Gbps"],
    [/\bhdr\b|dolby vision/, "HDR"],
    [/multiview|multi-view/, "Multiview"],
    [/\bkvm\b/, "KVM"],
    [/de-embed|deembed|audio breakout/, "Audio de-embedding"],
    [/scal(er|ing)/, "Scaling"],
    [/video wall/, "Video wall"],
    [/usb-c|usbc/, "USB-C"],
    [/rs-?232/, "RS-232"],
    [/\bir\b/, "IR"],
    [/cec/, "CEC"],
    [/relay/, "Relay"],
    [/poe|poh|poc/, "PoE/PoH/PoC"],
    [/hdbaset/, "HDBaseT"],
    [/jpeg.?2000|j2k/, "JPEG2000"],
    [/h\.?264|h\.?265|h264|h265/, "H.264/H.265"],
    [/sdvoe/, "SDVoE"]
  ];

  for (const [rx, label] of checks) {
    if (rx.test(t)) {
      features.push(label);
    }
  }

  return Array.from(new Set(features));
}

export function extractCompetitorRecordFromPage(
  input: CompetitorLookupInput,
  pageText: string
): CompetitorLiveRecord {
  const blob = cleanText(pageText);
  const title = `${input.manufacturer} ${input.model}`.trim();

  return {
    manufacturer: input.manufacturer,
    model: input.model,
    productUrl: input.productUrl,
    title,
    summary: blob.slice(0, 280),
    category: detectCategory(blob),
    technology: detectTechnology(blob),
    features: detectFeatures(blob),
    rawText: blob.slice(0, 12000),
    extractedAtIso: new Date().toISOString(),
    source: "live-page",
  };
}