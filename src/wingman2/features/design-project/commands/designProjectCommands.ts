import type { ProjectCommandContext, ProjectLifecycleCommands } from "../../projects";
import { compileDesignProject, toStoredDesignProposalRevision } from "../compileDesignProject";
import { buildDesignProjectJourneyEvent } from "../analytics/journeyEvents";
import { trackJourneyEvent } from "../../../lib/featureAnalytics";

export function createDesignProjectCommands(context: ProjectCommandContext, lifecycle: ProjectLifecycleCommands) {
  return {
    refreshDesignProject(projectId: string, compiledAt = context.now()) {
      const project = context.read().projects.find((item) => item.id === projectId);
      if (!project) return null;
      const graph = compileDesignProject(project, compiledAt);
      const previousProposal = project.proposal;
      const approvalStillMatches = previousProposal?.approvedRevisionHash === graph.decision.contentHash;
      lifecycle.upsertStoredProject({
        ...project,
        updated: "Just now",
        updatedAt: compiledAt,
        proposal: previousProposal ? {
          ...previousProposal,
          designRevision: toStoredDesignProposalRevision(graph),
          ...(previousProposal.approvalStatus === "approved" && !approvalStillMatches ? {
            approvalStatus: "draft" as const,
            approvedBy: undefined,
            approvedAt: undefined,
            approvedRevisionHash: undefined,
            approvalComments: "Approval cleared because the design changed.",
          } : {}),
        } : previousProposal,
        auditTrail: [{ id: context.createAuditId?.() ?? context.createId("audit"), action: "design-project-refresh", detail: `Design Project ${graph.contentHash} compiled`, scope: "design-project", severity: "info" as const, actorName: "Wingman user", createdAt: compiledAt }, ...(project.auditTrail ?? [])].slice(0, 50),
      });
      const event = buildDesignProjectJourneyEvent(graph);
      trackJourneyEvent(event.name, { projectId: event.projectId, graphHash: event.graphHash, stage: event.stage, outcome: event.outcome, blockerCount: event.blockerCount });
      return graph;
    },
  };
}
