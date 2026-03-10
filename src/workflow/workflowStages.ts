export type WorkflowStage =
  | "discovery"
  | "architecture"
  | "products"
  | "proposal"
  | "closed";

export const WORKFLOW_STAGES: WorkflowStage[] = [
  "discovery",
  "architecture",
  "products",
  "proposal",
  "closed",
];

export const WORKFLOW_LABELS: Record<WorkflowStage, string> = {
  discovery: "Discovery",
  architecture: "Architecture",
  products: "Products",
  proposal: "Proposal",
  closed: "Closed",
};

export const WORKFLOW_STAGE_CLASS: Record<WorkflowStage, string> = {
  discovery: "is-discovery",
  architecture: "is-architecture",
  products: "is-products",
  proposal: "is-proposal",
  closed: "is-closed",
};