import type { StoredDesignProposalRevision } from "../../projects";

export type DesignProjectDocument = {
  revisionId: string;
  customerRequirement: string;
  interpretation: string;
  architecture: string;
  requirements: StoredDesignProposalRevision["requirements"];
  requiredRoles: StoredDesignProposalRevision["roleCoverage"];
  products: StoredDesignProposalRevision["productOverviews"];
  assumptions: string[];
  blockers: string[];
  warnings: string[];
  canIssue: boolean;
};

export function buildDesignProjectDocument(revision: StoredDesignProposalRevision): DesignProjectDocument {
  return {
    revisionId: revision.revisionId,
    customerRequirement: revision.customerRequirement,
    interpretation: revision.interpretedRequirement,
    architecture: revision.architecture,
    requirements: revision.requirements,
    requiredRoles: revision.roleCoverage.filter((item) => item.required),
    products: revision.productOverviews,
    assumptions: revision.assumptions,
    blockers: revision.blockers,
    warnings: revision.warnings,
    canIssue: revision.canIssue,
  };
}
