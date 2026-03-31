import governanceData from "@/data/governance/wingman-governance.json";

export type RecommendationGovernanceRulebook = {
  recommendationRules: {
    id: string;
    version: string;
    approvedAt: string;
    approvedBy: string;
    catalogVersion: string;
    changeSummary: string;
    explainability: string[];
  };
  deploymentControls: {
    workspaceIsolation: string;
    auditCoverage: string[];
    retentionDays: number;
  };
};

export type ProjectRecommendationGovernance = {
  ruleSetId: string;
  ruleSetVersion: string;
  catalogVersion: string;
  approvedAt: string;
  approvedBy: string;
  generatedAt: string;
  primaryRecommendation: string;
  recommendedFamilies: string[];
  reasoning: string[];
  nextActions: string[];
  explainability: string[];
};

const RULEBOOK = governanceData as RecommendationGovernanceRulebook;

function nowIso(): string {
  return new Date().toISOString();
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items.filter((item) => item.trim())));
}

export function getRecommendationGovernanceRulebook(): RecommendationGovernanceRulebook {
  return RULEBOOK;
}

export function buildRecommendationGovernanceSnapshot(input: {
  primaryRecommendation: string;
  recommendedFamilies: string[];
  reasoning: string[];
  nextActions?: string[];
}): ProjectRecommendationGovernance {
  return {
    ruleSetId: RULEBOOK.recommendationRules.id,
    ruleSetVersion: RULEBOOK.recommendationRules.version,
    catalogVersion: RULEBOOK.recommendationRules.catalogVersion,
    approvedAt: RULEBOOK.recommendationRules.approvedAt,
    approvedBy: RULEBOOK.recommendationRules.approvedBy,
    generatedAt: nowIso(),
    primaryRecommendation: input.primaryRecommendation,
    recommendedFamilies: unique(input.recommendedFamilies),
    reasoning: unique(input.reasoning).slice(0, 5),
    nextActions: unique(input.nextActions ?? []).slice(0, 5),
    explainability: RULEBOOK.recommendationRules.explainability.slice(0, 3),
  };
}
