import type { StoredDesignProposalRevision, StoredProject } from "../projects";
import { compileDesignProposal } from "../../lib/designProposal";
import type { DesignProjectDecisionGraph, DesignProjectStage } from "./model/designProjectTypes";

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) { result ^= value.charCodeAt(index); result = Math.imul(result, 16777619); }
  return `dpg1-${(result >>> 0).toString(16).padStart(8, "0")}`;
}

export function designProjectGraphHash(graph: Omit<DesignProjectDecisionGraph, "contentHash" | "compiledAt">) {
  return hash(JSON.stringify({
    schemaVersion: graph.schemaVersion,
    projectId: graph.projectId,
    projectName: graph.projectName,
    stages: graph.stages,
    decisionHash: graph.decision.contentHash,
    publication: graph.publication,
  }));
}

export function compileDesignProject(project: StoredProject, compiledAt = new Date().toISOString()): DesignProjectDecisionGraph {
  const decision = compileDesignProposal(project, compiledAt);
  const stages: DesignProjectStage[] = [
    { id: "evidence", status: decision.requirements.length ? "complete" : "blocked", facts: decision.requirements.map((item) => item.customerStatement) },
    { id: "topology", status: project.discoveryBrief?.topology ? "complete" : "review", facts: [decision.architecture] },
    { id: "recommendation", status: decision.productOverviews.length ? "complete" : "blocked", facts: decision.productOverviews.map((item) => `${item.quantity} × ${item.sku}`) },
    { id: "validation", status: decision.blockers.length ? "blocked" : decision.warnings.length ? "review" : "complete", facts: [...decision.blockers, ...decision.warnings] },
    { id: "publication", status: decision.canIssue ? "complete" : "blocked", facts: decision.canIssue ? ["Ready to issue"] : decision.blockers },
  ];
  const base = { schemaVersion: 1 as const, projectId: project.id, projectName: project.name, stages, decision, publication: { canIssue: decision.canIssue, blockers: decision.blockers, warnings: decision.warnings } };
  return { ...base, compiledAt, contentHash: designProjectGraphHash(base) };
}

export function toStoredDesignProposalRevision(graph: DesignProjectDecisionGraph): StoredDesignProposalRevision { return graph.decision; }
