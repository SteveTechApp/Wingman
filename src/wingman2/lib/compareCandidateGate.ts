export type CompareCompetitorClass =
  | "AVOIP"
  | "HDBASET"
  | "MATRIX"
  | "PRESENTATION"
  | "VIDEO_WALL"
  | "MULTIVIEW"
  | "CAMERA"
  | "USB_EXTENSION"
  | "CONTROL"
  | "WIRELESS_PRESENTATION"
  | "AUDIO"
  | "UNKNOWN";

export type CompareCandidateGateInput = {
  sku?: string;
  title?: string;
  role?: string;
  category?: string;
  family?: string;
  productFamily?: string;
  tags?: string[];
  features?: Record<string, unknown> | string[];
  text?: string;
};

export type CompareCandidateGateContext = {
  competitorClass: CompareCompetitorClass;
  competitorRole?: string;
  competitorTransport?: string;
  applicationContext?: string;
};

export type CompareCandidateGateResult = {
  allowed: boolean;
  severity: "pass" | "blocked" | "review";
  reason: string;
  candidateClass: CompareCompetitorClass;
  candidateRole: string;
  blockedBy: string[];
  evidence: string[];
};

const _NON_EQUIVALENT_ROLE_MARKERS = [
  "accessory",
  "cable",
  "rack-mount",
  "rack mount",
  "workflow-endpoint",
  "workflow endpoint",
  "request-only",
  "adapter",
  "dongle",
];

const AUDIO_ROLE_MARKERS = [
  "audio",
  "speakerphone",
  "microphone",
  "amplifier",
  "dante",
  "aes67",
  "apollo",
];

const AVOIP_MARKERS = ["avoip", "av over ip", "networkhd", "nhd-", "encoder", "decoder", "transceiver", "trx", "jpeg", "h.264", "h.265", "sdvoe"];
const HDBASET_MARKERS = ["hdbaset", "hdbt", "extender", "transmitter", "receiver", "tx", "rx"];
const MATRIX_MARKERS = ["matrix", "mx-", "4x4", "6x6", "8x8", "16x16", "routing"];
const PRESENTATION_MARKERS = ["presentation", "switcher", "collaboration", "usb-c", "byod", "byom", "meeting room", "sw-"];
const VIDEO_WALL_MARKERS = ["video wall", "videowall", "wall processor", "lcd wall", "led processor"];
const MULTIVIEW_MARKERS = ["multiview", "multi-view", "pip", "pbp", "single output canvas", "window"];
const CAMERA_MARKERS = ["camera", "ptz", "ndi camera", "birddog", "marshall cv", "visca", "pelco"];
const USB_MARKERS = ["usb", "kvm", "usb extension", "usb extender"];
const CONTROL_MARKERS = ["control", "controller", "processor", "automation"];
const WIRELESS_MARKERS = ["wireless", "miracast", "airplay", "casting", "clickshare"];

function clean(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function textFor(candidate: CompareCandidateGateInput): string {
  const featureText = Array.isArray(candidate.features)
    ? candidate.features
    : Object.keys(candidate.features ?? {});

  return [
    candidate.sku,
    candidate.title,
    candidate.role,
    candidate.category,
    candidate.family,
    candidate.productFamily,
    candidate.text,
    ...(candidate.tags ?? []),
    ...featureText,
  ].join(" ").toLowerCase();
}

function identityTextFor(candidate: CompareCandidateGateInput): string {
  return [
    candidate.sku,
    candidate.title,
    candidate.role,
    candidate.category,
    candidate.family,
    candidate.productFamily,
  ].join(" ").toLowerCase();
}

function markerTextFor(candidate: CompareCandidateGateInput): string {
  const featureText = Array.isArray(candidate.features)
    ? candidate.features
    : Object.keys(candidate.features ?? {});

  return [
    candidate.category,
    candidate.role,
    ...(candidate.tags ?? []),
    ...featureText,
  ].join(" ").toLowerCase();
}

function hasAny(text: string, markers: string[]): boolean {
  return markers.some((marker) => text.includes(marker));
}

function wingmanSkuClassGuard(candidate: CompareCandidateGateInput): CompareCompetitorClass {
  const sku = String(candidate.sku ?? "").trim().toUpperCase();
  const title = String(candidate.title ?? "").trim().toUpperCase();
  const role = String(candidate.role ?? "").trim().toLowerCase();
  const text = [sku, title, role, candidate.category, candidate.productFamily, candidate.family].join(" ").toLowerCase();

  if (/^NHD-/.test(sku) || text.includes("networkhd")) return "AVOIP";
  if (/^EX-/.test(sku) || /^RX-/.test(sku) || /^TX-/.test(sku) || text.includes("hdbaset") || text.includes("hdbt")) return "HDBASET";
  if (/^MX-/.test(sku) || text.includes("matrix")) return "MATRIX";
  if (/^SW-/.test(sku) || text.includes("presentation")) return "PRESENTATION";
  if (/^APO-/.test(sku) || text.includes("audio") || text.includes("microphone") || text.includes("speakerphone")) return "AUDIO";
  if (/^CAM-/.test(sku) || hasAny(text, CAMERA_MARKERS)) return "CAMERA";
  if (/^CAB-/.test(sku) || role.includes("cable")) return "UNKNOWN";

  return "UNKNOWN";
}

function classifyCandidate(candidate: CompareCandidateGateInput): CompareCompetitorClass {
  const skuGuard = wingmanSkuClassGuard(candidate);

  if (skuGuard !== "UNKNOWN") return skuGuard;

  const text = textFor(candidate);

  if (hasAny(text, VIDEO_WALL_MARKERS)) return "VIDEO_WALL";
  if (hasAny(text, MULTIVIEW_MARKERS)) return "MULTIVIEW";
  if (hasAny(text, CAMERA_MARKERS)) return "CAMERA";
  if (hasAny(text, AVOIP_MARKERS)) return "AVOIP";
  if (hasAny(text, HDBASET_MARKERS)) return "HDBASET";
  if (hasAny(text, MATRIX_MARKERS)) return "MATRIX";
  if (hasAny(text, PRESENTATION_MARKERS)) return "PRESENTATION";
  if (hasAny(text, USB_MARKERS)) return "USB_EXTENSION";
  if (hasAny(text, WIRELESS_MARKERS)) return "WIRELESS_PRESENTATION";
  if (hasAny(text, AUDIO_ROLE_MARKERS)) return "AUDIO";
  if (hasAny(text, CONTROL_MARKERS)) return "CONTROL";

  return "UNKNOWN";
}

function allowedClassPair(competitorClass: CompareCompetitorClass, candidateClass: CompareCompetitorClass): boolean {
  if (competitorClass === "UNKNOWN") return candidateClass !== "AUDIO" && candidateClass !== "CONTROL";
  if (competitorClass === candidateClass) return true;

  if (competitorClass === "HDBASET") return candidateClass === "HDBASET";
  if (competitorClass === "MATRIX") return candidateClass === "MATRIX";
  if (competitorClass === "PRESENTATION") return candidateClass === "PRESENTATION";
  if (competitorClass === "AVOIP") return candidateClass === "AVOIP";
  if (competitorClass === "VIDEO_WALL") return candidateClass === "VIDEO_WALL";
  if (competitorClass === "MULTIVIEW") return candidateClass === "MULTIVIEW";
  if (competitorClass === "CAMERA") return candidateClass === "CAMERA";
  if (competitorClass === "WIRELESS_PRESENTATION") return candidateClass === "WIRELESS_PRESENTATION" || candidateClass === "PRESENTATION";
  if (competitorClass === "USB_EXTENSION") return candidateClass === "USB_EXTENSION";
  if (competitorClass === "CONTROL") return candidateClass === "CONTROL";
  if (competitorClass === "AUDIO") return candidateClass === "AUDIO";

  return false;
}

function isAccessoryLike(candidate: CompareCandidateGateInput, role: string): boolean {
  const identityText = identityTextFor(candidate) + " " + role.toLowerCase();
  const markerText = markerTextFor(candidate);

  if (/\b(cab-|cable|adapter|dongle|rack mount|rack-mount|control app|software app)\b/.test(identityText)) {
    return true;
  }

  return [
    "accessory",
    "accessory / other",
    "product-specific accessory",
    "rack accessory",
    "networkhd-accessory",
    "cable / accessory",
    "control-app",
    "software",
  ].some((marker) => markerText.includes(marker));
}

function specificBadSku(candidate: CompareCandidateGateInput): string[] {
  const blocked: string[] = [];
  const sku = String(candidate.sku ?? "").trim().toLowerCase();
  const identityText = identityTextFor(candidate);

  if (/apo-210-uc|apo-com-mic|apo-sky-mic|apo-dg1|apo-dg2|apo-dg-hdmi|apo-120-dnt/.test(sku + " " + identityText)) {
    blocked.push("APO audio/conferencing/accessory product cannot be a primary equivalent for unrelated AV transport competitors.");
  }

  if (/^cab-|cable \/ accessory|\bcable\b/.test(sku + " " + identityText)) blocked.push("Cable product cannot be a primary competitor equivalent.");
  if (/rack mount|rack-mount|^nhd-000-rack/.test(sku + " " + identityText)) blocked.push("Rack accessory cannot be a primary competitor equivalent.");

  return blocked;
}

export function gateCompareCandidate(
  candidate: CompareCandidateGateInput,
  context: CompareCandidateGateContext,
): CompareCandidateGateResult {
  const _candidateText = textFor(candidate);
  const candidateRole = clean(candidate.role || candidate.category || candidate.productFamily || "unknown");
  const candidateClass = classifyCandidate(candidate);
  const competitorClass = context.competitorClass || "UNKNOWN";
  const blockedBy: string[] = [];
  const evidence: string[] = [
    "competitorClass=" + competitorClass,
    "candidateClass=" + candidateClass,
    "candidateRole=" + candidateRole,
  ];

  for (const reason of specificBadSku(candidate)) blockedBy.push(reason);

  if (isAccessoryLike(candidate, candidateRole)) {
    blockedBy.push("Candidate is accessory/cable/workflow/rack class and should not be a primary equivalent.");
  }

  if (!allowedClassPair(competitorClass, candidateClass)) {
    blockedBy.push("Technology class mismatch: competitor is " + competitorClass + " but candidate is " + candidateClass + ".");
  }

  if (competitorClass !== "AUDIO" && candidateClass === "AUDIO") {
    blockedBy.push("Audio product cannot satisfy a non-audio competitor comparison as the primary candidate.");
  }

  if (competitorClass !== "CONTROL" && candidateClass === "CONTROL") {
    blockedBy.push("Control product cannot satisfy a non-control competitor comparison as the primary candidate.");
  }

  if (blockedBy.length) {
    return {
      allowed: false,
      severity: "blocked",
      reason: blockedBy[0],
      candidateClass,
      candidateRole,
      blockedBy,
      evidence,
    };
  }

  if (candidateClass === "UNKNOWN") {
    return {
      allowed: false,
      severity: "review",
      reason: "Candidate class is unknown; do not rank as primary equivalent without evidence.",
      candidateClass,
      candidateRole,
      blockedBy: ["Candidate class unknown."],
      evidence,
    };
  }

  return {
    allowed: true,
    severity: "pass",
    reason: "Candidate is in an allowed class lane for this competitor comparison.",
    candidateClass,
    candidateRole,
    blockedBy: [],
    evidence,
  };
}

export function filterComparableCandidates<T extends CompareCandidateGateInput>(
  candidates: T[],
  context: CompareCandidateGateContext,
): {
  allowed: T[];
  blocked: Array<{ candidate: T; gate: CompareCandidateGateResult }>;
} {
  const allowed: T[] = [];
  const blocked: Array<{ candidate: T; gate: CompareCandidateGateResult }> = [];

  for (const candidate of candidates) {
    const gate = gateCompareCandidate(candidate, context);

    if (gate.allowed) {
      allowed.push(candidate);
      continue;
    }

    blocked.push({ candidate, gate });
  }

  return { allowed, blocked };
}
