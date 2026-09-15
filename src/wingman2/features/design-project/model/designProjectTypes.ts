import type { StoredDesignProject, StoredDesignProjectStage } from "../../projects";

export type DesignProjectStageId = "evidence" | "topology" | "recommendation" | "validation" | "publication";

export type DesignProjectStage = StoredDesignProjectStage;

export type DesignProjectDecisionGraph = StoredDesignProject;
