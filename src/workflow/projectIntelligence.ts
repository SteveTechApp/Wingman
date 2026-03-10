import { getActiveWorkflowProject } from "./workflowStore";
import { buildArchitectureRecommendation } from "./architectureRecommendations";
import { buildSolutionRecommendation } from "./solutionRecommendations";

export type ProjectIntelligence = {
  activeProjectName: string;
  stage: string;
  discoveryScore: number;
  proposalScore: number;
  architecturePrimary: string;
  solutionPlatform: string;
  nextBestAction: string;
  gaps: string[];
  strengths: string[];
};

function hasText(value: unknown): boolean {
  return String(value ?? "").trim().length > 0;
}

export function buildProjectIntelligence() : ProjectIntelligence {
  const active = getActiveWorkflowProject();
  const architecture = buildArchitectureRecommendation(active);
  const solution = buildSolutionRecommendation(active);

  if (!active) {
    return {
      activeProjectName: "No active project",
      stage: "Not set",
      discoveryScore: 0,
      proposalScore: 0,
      architecturePrimary: "Not available",
      solutionPlatform: "Not available",
      nextBestAction: "Create or select an active project in Mission Control.",
      gaps: [
        "No active project selected.",
        "No discovery data available.",
      ],
      strengths: [],
    };
  }

  let discoveryScore = 0;
  const gaps: string[] = [];
  const strengths: string[] = [];

  if (hasText(active.customer)) { discoveryScore += 10 } else { gaps.push("Customer not confirmed.") }
  if (hasText(active.roomType)) { discoveryScore += 10 } else { gaps.push("Application / room type not confirmed.") }
  if ((active.sources ?? 0) > 0) { discoveryScore += 15 } else { gaps.push("Source count missing.") }
  if ((active.displays ?? 0) > 0) { discoveryScore += 15 } else { gaps.push("Display count missing.") }
  if ((active.distanceM ?? 0) > 0) { discoveryScore += 15 } else { gaps.push("Signal distance missing.") }
  if (active.usb) { discoveryScore += 10; strengths.push("USB requirements captured.") }
  if (active.control) { discoveryScore += 10; strengths.push("Control requirements captured.") }
  if (active.audio) { discoveryScore += 10; strengths.push("Audio requirements captured.") }
  if (active.discovery?.recommendedFamilies && active.discovery.recommendedFamilies.length > 0) {
    discoveryScore += 5
    strengths.push("Discovery recommendation families stored.")
  }

  discoveryScore = Math.min(discoveryScore, 100)

  let proposalScore = 0
  proposalScore += discoveryScore >= 60 ? 35 : 10
  proposalScore += architecture.primary ? 25 : 0
  proposalScore += solution.platform && solution.platform !== "No recommendation yet" ? 25 : 0
  proposalScore += active.stage === "proposal" ? 15 : active.stage === "products" ? 8 : 0
  proposalScore = Math.min(proposalScore, 100)

  if (architecture.primary) {
    strengths.push(`Architecture path identified: ${architecture.primary}.`)
  } else {
    gaps.push("Architecture path not yet identified.")
  }

  if (solution.platform && solution.platform !== "No recommendation yet") {
    strengths.push(`Solution path identified: ${solution.platform}.`)
  } else {
    gaps.push("Solution platform not yet identified.")
  }

  let nextBestAction = "Continue project workflow."
  switch (active.stage) {
    case "discovery":
      nextBestAction = discoveryScore < 60
        ? "Complete discovery details and save them to the active project."
        : "Move into architecture selection and confirm transport model."
      break
    case "architecture":
      nextBestAction = "Confirm architecture, then move into product family selection."
      break
    case "products":
      nextBestAction = "Map the solution to starter BOM items and prepare commercial output."
      break
    case "proposal":
      nextBestAction = "Build customer-facing proposal output and final BOM structure."
      break
    case "closed":
      nextBestAction = "Review and reuse this completed project as a future template if suitable."
      break
  }

  return {
    activeProjectName: active.name,
    stage: active.stage,
    discoveryScore,
    proposalScore,
    architecturePrimary: architecture.primary ?? "Not available",
    solutionPlatform: solution.platform,
    nextBestAction,
    gaps,
    strengths,
  };
}