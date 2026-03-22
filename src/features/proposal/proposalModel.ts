export type ProposalMetric = {
  label: string;
  value: string | number;
};

export type ProposalSectionModel = {
  title: string;
  summary: string;
  bullets: string[];
};

export type ProposalBomItem = {
  qty: number;
  sku: string;
  description: string;
  notes?: string;
};

export type ProposalViewModel = {
  projectId: string;
  projectName: string;
  customerName: string;
  systemType: string;
  summaryText: string;
  keyBenefits: string[];
  metrics: ProposalMetric[];
  designSections: ProposalSectionModel[];
  bom: ProposalBomItem[];
  confidence: {
    level: "HIGH" | "MEDIUM" | "LOW";
    checks: string[];
    warnings: string[];
  };
};