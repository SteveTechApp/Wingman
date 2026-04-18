import type { WingmanActiveProjectSnapshot } from "@/app/logic/wingmanProjectState";

export type WingmanRiskLevel = "low" | "medium" | "high";

export type WingmanConfidenceResult = {
  score: number;
  level: WingmanRiskLevel;
  strengths: string[];
  risks: string[];
  confirmations: string[];
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function evaluateWingmanConfidence(
  snapshot: WingmanActiveProjectSnapshot
): WingmanConfidenceResult {
  const d = snapshot.project.discovery;

  let score = 40;
  const strengths: string[] = [];
  const risks: string[] = [];
  const confirmations: string[] = [];

  if (d.sources > 0) {
    score += 8;
    strengths.push(`Source count captured (${d.sources}).`);
  } else {
    risks.push("Source count is not confirmed.");
    confirmations.push("Confirm the total number of active sources.");
  }

  if (d.displays > 0) {
    score += 8;
    strengths.push(`Display count captured (${d.displays}).`);
  } else {
    risks.push("Display count is not confirmed.");
    confirmations.push("Confirm the total number of displays or display zones.");
  }

  if ((d.distanceM ?? 0) > 0) {
    score += 8;
    strengths.push(`Distance captured (${d.distanceM}m).`);
  } else {
    risks.push("Signal distance has not been confirmed.");
    confirmations.push("Confirm the longest signal transport distance.");
  }

  if (typeof d.usbRequired === "boolean") {
    score += 6;
    strengths.push(`USB requirement considered (${d.usbRequired ? "required" : "not required"}).`);
  } else {
    risks.push("USB requirement is unclear.");
    confirmations.push("Confirm whether USB cameras, speakerphones, touch devices or data peripherals are in scope.");
  }

  if (d.videoWall) {
    score += 8;
    strengths.push("Video wall requirement identified.");
    confirmations.push("Confirm wall layout, content behaviour and whether fixed or flexible layouts are required.");
  }

  if (d.hybridMeeting) {
    score += 6;
    strengths.push("Hybrid meeting requirement identified.");
    confirmations.push("Confirm conferencing peripherals, platform and user workflow.");
  }

  if (d.wireless) {
    score += 5;
    strengths.push("Wireless workflow is part of the requirement.");
  }

  if (d.sources >= 4 || d.displays >= 4) {
    risks.push("System complexity is rising and may justify deeper design validation.");
    confirmations.push("Check switching behaviour, layout expectations and user control requirements.");
  }

  if ((d.distanceM ?? 0) > 30) {
    risks.push("Longer signal distance may materially affect transport architecture and cost.");
    confirmations.push("Validate cable path, infrastructure quality and preferred transport method.");
  }

  if (!snapshot.project.customer) {
    risks.push("Customer/account identity is not yet captured.");
    confirmations.push("Add customer name or account reference before final proposal issue.");
  }

  if (snapshot.decision.primaryProducts.length > 0) {
    score += 8;
    strengths.push(`A recommendation has been generated (${snapshot.decision.primaryProducts.join(", ")}).`);
  } else {
    risks.push("No primary product recommendation has been generated.");
  }

  score = clamp(score, 0, 100);

  let level: WingmanRiskLevel = "low";
  if (score < 70) level = "high";
  else if (score < 85) level = "medium";

  return {
    score,
    level,
    strengths,
    risks,
    confirmations,
  };
}