import type { WingmanProjectState } from "@/core/workflow/projectState";
import { buildAvGuideIntelligence } from "@/features/discovery/avGuideIntelligence";
import { buildCatalogIntelligence } from "@/features/catalog/catalogIntelligence";

export type DashboardIntelligence = {
  completenessScore: number;
  primaryFamily: string;
  bomCount: number;
  nextActionLabel: string;
  nextActionPath: string;
  statusSummary: string;
};

export function buildDashboardIntelligence(
  state: WingmanProjectState
): DashboardIntelligence {
  const av = buildAvGuideIntelligence(state);
  const cat = buildCatalogIntelligence(state);
  const bomCount = state.bom?.length ?? 0;

  let nextActionLabel = av.recommendedNextTool;
  let nextActionPath = av.recommendedNextToolPath;

  if (bomCount > 0 && state.stage !== "Proposal") {
    nextActionLabel = "Proposal Builder";
    nextActionPath = "/app/tools/proposal";
  }

  if (state.stage === "Proposal") {
    nextActionLabel = "Review Proposal";
    nextActionPath = "/app/tools/proposal";
  }

  const statusSummary =
    `AV Guide is ${av.completenessScore}% complete. ` +
    `Most likely family: ${cat.primaryFamily}. ` +
    `Current BOM count: ${bomCount}.`;

  return {
    completenessScore: av.completenessScore,
    primaryFamily: cat.primaryFamily,
    bomCount,
    nextActionLabel,
    nextActionPath,
    statusSummary,
  };
}
