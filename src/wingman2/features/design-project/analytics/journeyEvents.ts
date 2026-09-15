import type { DesignProjectDecisionGraph } from "../model/designProjectTypes";
import type { StoredDesignProposalRevision } from "../../projects";
import { trackJourneyEvent } from "../../../lib/featureAnalytics";

export type DesignProjectJourneyName = "design_project_started" | "design_project_blocked" | "design_project_recommended" | "design_project_proposal_ready" | "design_project_exported";
export type DesignProjectJourneyEvent = { name: DesignProjectJourneyName; projectId: string; graphHash: string; stage: string; outcome: "complete" | "blocked" | "review"; blockerCount: number };

export function buildDesignProjectJourneyEvent(graph: DesignProjectDecisionGraph, lifecycle: "started" | "refreshed" = "refreshed"): DesignProjectJourneyEvent {
  const publication = graph.stages.find((stage) => stage.id === "publication");
  const recommendation = graph.stages.find((stage) => stage.id === "recommendation");
  const name: DesignProjectJourneyName = lifecycle === "started" ? "design_project_started" : graph.publication.canIssue ? "design_project_proposal_ready" : recommendation?.status === "complete" ? "design_project_recommended" : "design_project_blocked";
  return { name, projectId: graph.projectId, graphHash: graph.decision.contentHash, stage: publication?.id ?? "evidence", outcome: publication?.status ?? "review", blockerCount: graph.publication.blockers.length };
}

export function buildDesignProjectExportEvent(projectId: string, graphHash: string, format: "html" | "docx" | "pdf" | "csv"): DesignProjectJourneyEvent & { format: string } {
  return { name: "design_project_exported", projectId, graphHash, stage: "publication", outcome: "complete", blockerCount: 0, format };
}

export function trackDesignProjectExport(revision: StoredDesignProposalRevision | undefined, format: "html" | "docx" | "pdf" | "csv") {
  if (!revision) return;
  const event = buildDesignProjectExportEvent(revision.projectId, revision.contentHash, format);
  trackJourneyEvent(event.name, { projectId: event.projectId, graphHash: event.graphHash, stage: event.stage, outcome: event.outcome, blockerCount: event.blockerCount, format: event.format });
}
