import type { StoredDesignProposalRevision } from "../../projects";

export type DesignProjectStageId = "evidence" | "topology" | "recommendation" | "validation" | "publication";

export type DesignProjectStage = {
  id: DesignProjectStageId;
  status: "complete" | "blocked" | "review";
  facts: string[];
};

export type DesignProjectDecisionGraph = {
  schemaVersion: 1;
  projectId: string;
  projectName: string;
  compiledAt: string;
  contentHash: string;
  stages: DesignProjectStage[];
  decision: StoredDesignProposalRevision;
  publication: { canIssue: boolean; blockers: string[]; warnings: string[] };
};
