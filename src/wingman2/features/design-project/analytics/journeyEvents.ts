import type { DesignProjectDecisionGraph } from "../model/designProjectTypes";
import type { StoredDesignProposalRevision } from "../../projects";
import { trackJourneyEvent } from "../../../lib/featureAnalytics";

export type DesignProjectJourneyName = "design_project_started" | "design_project_blocked" | "design_project_recommended" | "design_project_proposal_ready" | "design_project_exported";
export type DesignProjectJourneyEvent = { name: DesignProjectJourneyName; projectId: string; graphHash: string; stage: string; outcome: "complete" | "blocked" | "review"; blockerCount: number };

export type OperationalJourneyEventName = "journey_started" | "stage_completed" | "journey_failed" | "sync_degraded" | "publication_blocked";
export type OperationalJourneyReason = "validation" | "authorization" | "conflict" | "offline" | "remote-rejected" | "unknown";
export type OperationalJourneyEvent = {
  name: OperationalJourneyEventName;
  journeyId: "design-project" | "project-sync" | "proposal-publication";
  stage: "evidence" | "recommendation" | "validation" | "publication" | "sync";
  reason?: OperationalJourneyReason;
};

export function buildOperationalJourneyEvent(name: OperationalJourneyEventName, fields: Omit<OperationalJourneyEvent, "name">): OperationalJourneyEvent {
  return { name, journeyId: fields.journeyId, stage: fields.stage, ...(fields.reason ? { reason: fields.reason } : {}) };
}

type StoredTelemetryEvent = { feature?: string; message?: string; timestamp?: string };
export type OperationalJourneySummary = { observationWindow: { from: string; to: string } | null; started: number; completed: number; failed: number; degraded: number; publicationBlocked: number };

export function summarizeOperationalJourneyEvents(events: StoredTelemetryEvent[]): OperationalJourneySummary {
  const allowed = new Set<OperationalJourneyEventName>(["journey_started", "stage_completed", "journey_failed", "sync_degraded", "publication_blocked"]);
  const operational = events.filter((event) => allowed.has((event.feature || event.message) as OperationalJourneyEventName));
  const names = operational.map((event) => event.feature || event.message);
  const timestamps = operational.map((event) => new Date(event.timestamp ?? "")).filter((date) => Number.isFinite(date.getTime())).sort((a, b) => a.getTime() - b.getTime());
  return {
    observationWindow: timestamps.length ? { from: timestamps[0].toISOString(), to: timestamps[timestamps.length - 1].toISOString() } : null,
    started: names.filter((name) => name === "journey_started").length,
    completed: names.filter((name) => name === "stage_completed").length,
    failed: names.filter((name) => name === "journey_failed").length,
    degraded: names.filter((name) => name === "sync_degraded").length,
    publicationBlocked: names.filter((name) => name === "publication_blocked").length,
  };
}

export function trackOperationalJourneyEvent(event: OperationalJourneyEvent) {
  trackJourneyEvent(event.name, { journeyId: event.journeyId, stage: event.stage, ...(event.reason ? { reason: event.reason } : {}) });
}

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
