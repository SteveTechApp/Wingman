import { getActiveWorkflowProject } from "./workflowStore";

export type ArchitectureFamily =
  | "HDBaseT"
  | "AVoIP"
  | "Matrix Switching"
  | "USB Extension"
  | "Video Wall";

export type ArchitectureRecommendation = {
  families: ArchitectureFamily[];
  primary: ArchitectureFamily | null;
  confidence: "Low" | "Medium" | "High";
  summary: string;
  reasons: string[];
  nextActions: string[];
};

function hasUsb(active: ReturnType<typeof getActiveWorkflowProject>): boolean {
  return !!active?.usb;
}

function hasControl(active: ReturnType<typeof getActiveWorkflowProject>): boolean {
  return !!active?.control;
}

function hasAudio(active: ReturnType<typeof getActiveWorkflowProject>): boolean {
  return !!active?.audio;
}

export function buildArchitectureRecommendation(
  active = getActiveWorkflowProject()
): ArchitectureRecommendation {
  if (!active) {
    return {
      families: [],
      primary: null,
      confidence: "Low",
      summary: "No active project selected.",
      reasons: ["Select or create an active project in Mission Control first."],
      nextActions: ["Set an active project and complete Discovery fields."],
    };
  }

  const sources = active.sources ?? 0;
  const displays = active.displays ?? 0;
  const distance = active.distanceM ?? 0;
  const room = String(active.roomType ?? "").toLowerCase();

  const families = new Set<ArchitectureFamily>();
  const reasons: string[] = [];
  const nextActions: string[] = [];

  if (room.includes("video wall") || displays >= 4) {
    families.add("Video Wall");
    reasons.push("Multiple displays or a video wall application indicates a presentation-led processing workflow.");
  }

  if (distance >= 70 || (sources >= 4 && displays >= 4)) {
    families.add("AVoIP");
    reasons.push("Long distance and/or larger multi-source multi-display scope points toward networked distribution.");
  }

  if ((distance >= 15 && distance < 70) || (sources <= 4 && displays <= 4 && distance > 0)) {
    families.add("HDBaseT");
    reasons.push("Moderate distance point-to-point or small distributed rooms suit HDBaseT-style extension.");
  }

  if (sources >= 2 && displays >= 2 && displays < 4 && distance < 70) {
    families.add("Matrix Switching");
    reasons.push("Moderate source and display counts suggest a switching-centric architecture.");
  }

  if (hasUsb(active)) {
    families.add("USB Extension");
    reasons.push("USB requirements indicate a need to support cameras, BYOD, or peripheral extension.");
  }

  if (families.size === 0) {
    families.add("HDBaseT");
    reasons.push("Defaulting to a simpler point-to-point AV transport because the discovered scope is still limited.");
  }

  const ordered = Array.from(families);

  let primary: ArchitectureFamily | null = ordered[0] ?? null;

  if (ordered.includes("Video Wall")) {
    primary = "Video Wall";
  } else if (ordered.includes("AVoIP")) {
    primary = "AVoIP";
  } else if (ordered.includes("Matrix Switching")) {
    primary = "Matrix Switching";
  } else if (ordered.includes("HDBaseT")) {
    primary = "HDBaseT";
  }

  let confidence: "Low" | "Medium" | "High" = "Medium";

  if (sources > 0 && displays > 0 && distance > 0) {
    confidence = "High";
  }
  if (sources === 0 || displays === 0 || distance === 0) {
    confidence = "Low";
  }

  if (primary === "AVoIP") {
    nextActions.push("Define network boundaries, endpoint count, and switching assumptions.");
  }
  if (primary === "HDBaseT") {
    nextActions.push("Confirm point-to-point distances and transmitter/receiver count.");
  }
  if (primary === "Matrix Switching") {
    nextActions.push("Confirm I/O count and whether local extension or central switching is preferred.");
  }
  if (ordered.includes("USB Extension")) {
    nextActions.push("Confirm USB host/device roles and camera/BYOD requirements.");
  }
  if (ordered.includes("Video Wall")) {
    nextActions.push("Confirm wall layout, processing needs, and content scenarios.");
  }
  if (hasControl(active)) {
    nextActions.push("Include control interfaces and room automation requirements in the design.");
  }
  if (hasAudio(active)) {
    nextActions.push("Confirm local audio breakout, DSP, and amplifier/loudspeaker scope.");
  }

  const summary =
    primary === "AVoIP"
      ? "The active project leans toward a network-distributed architecture."
      : primary === "HDBaseT"
      ? "The active project leans toward an HDBaseT extension architecture."
      : primary === "Matrix Switching"
      ? "The active project leans toward a matrix-led switching architecture."
      : primary === "Video Wall"
      ? "The active project leans toward a video-wall-led processing architecture."
      : "The active project needs further discovery before architecture can be confirmed.";

  return {
    families: ordered,
    primary,
    confidence,
    summary,
    reasons,
    nextActions,
  };
}