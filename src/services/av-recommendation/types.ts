import type {
  GuidedProjectAdvice,
  GuidedProjectFamily,
  GuidedProjectRecord,
  GuidedProjectStep,
} from "@/features/discovery/guidedProjectEngine";

export type AvRecommendationConfidenceLabel = "low" | "medium" | "high";

export type AvRecommendationAccessoryKind = "cable" | "accessory" | "dependency";

export type AvRecommendationAccessoryLine = {
  kind: AvRecommendationAccessoryKind;
  description: string;
};

export type AvRecommendationCompleteness = {
  answered: number;
  total: number;
  pct: number;
};

export type AvRecommendationMissingItem = {
  prompt: string;
  label: string;
  step: GuidedProjectStep;
  questionId: keyof GuidedProjectRecord;
};

export type AvRecommendationSummarySet = {
  salesperson: string;
  engineer: string;
  proposal: string;
};

export type AvRecommendationResult = {
  source: "discovery";
  context: GuidedProjectRecord;
  advice: GuidedProjectAdvice;
  primaryFamily: GuidedProjectFamily;
  candidateFamilies: GuidedProjectFamily[];
  confidenceScore: number;
  confidenceLabel: AvRecommendationConfidenceLabel;
  completeness: AvRecommendationCompleteness;
  whyThisAnswer: string[];
  whatsMissing: string[];
  missingItems: AvRecommendationMissingItem[];
  risks: string[];
  accessoryBom: AvRecommendationAccessoryLine[];
  summaries: AvRecommendationSummarySet;
};
