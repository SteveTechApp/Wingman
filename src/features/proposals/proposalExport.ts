export type ProposalSection = {
  key: string;
  title: string;
  body: string;
};

export type ProposalExportPayload = {
  fileName: string;
  title: string;
  subtitle?: string;
  sections: ProposalSection[];
  metadata: Record<string, string>;
  equipment: Array<{
    sku?: string;
    name: string;
    qty?: number;
    notes?: string;
  }>;
  pricing: {
    currency?: string;
    equipmentSubtotal?: string;
    installationAllowance?: string;
    programmingAllowance?: string;
    totalBudgetNote?: string;
  };
};

export type ProposalExportInput = {
  projectName?: string;
  customerName?: string;
  companyName?: string;
  verticalMarket?: string;
  roomType?: string;
  tier?: string;
  executiveSummary?: string;
  solutionOverview?: string;
  assumptions?: string;
  exclusions?: string;
  commercialNotes?: string;
  positioningBlock?: string;
  compareSummary?: string;
  nextSteps?: string;
  designSummary?: string;
  cableScheduleSummary?: string;
  diagramSummary?: string;
  usedDevicesSummary?: string;
  equipment?: Array<{
    sku?: string;
    name: string;
    qty?: number;
    notes?: string;
  }>;
  pricing?: {
    currency?: string;
    equipmentSubtotal?: string;
    installationAllowance?: string;
    programmingAllowance?: string;
    totalBudgetNote?: string;
  };
};

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function safeFileName(value: string): string {
  const v = tidy(value) || "proposal";
  return v.replace(/[^a-z0-9_-]+/gi, "_");
}

function pushSection(sections: ProposalSection[], key: string, title: string, body?: string) {
  const text = tidy(body);
  if (!text) return;
  sections.push({ key, title, body: text });
}

export function buildProposalExportPayload(input: ProposalExportInput): ProposalExportPayload {
  const projectName = tidy(input.projectName) || "Untitled Project";
  const subtitle = [
    tidy(input.customerName),
    tidy(input.companyName),
    tidy(input.verticalMarket),
    tidy(input.roomType),
    tidy(input.tier),
  ].filter(Boolean).join(" / ");

  const sections: ProposalSection[] = [];
  pushSection(sections, "executiveSummary", "Executive Summary", input.executiveSummary);
  pushSection(sections, "solutionOverview", "Solution Overview", input.solutionOverview);
  pushSection(sections, "assumptions", "Assumptions", input.assumptions);
  pushSection(sections, "exclusions", "Exclusions", input.exclusions);
  pushSection(sections, "commercialNotes", "Commercial Notes", input.commercialNotes);
  pushSection(sections, "competitivePositioning", "Competitive Positioning", input.positioningBlock);
  pushSection(sections, "nextSteps", "Next Steps", input.nextSteps);

  return {
    fileName: `${safeFileName(projectName)}_proposal`,
    title: projectName,
    subtitle,
    sections,
    metadata: {
      customerName: tidy(input.customerName),
      companyName: tidy(input.companyName),
      verticalMarket: tidy(input.verticalMarket),
      roomType: tidy(input.roomType),
      tier: tidy(input.tier),
      compareSummary: tidy(input.compareSummary),
    },
    equipment: Array.isArray(input.equipment) ? input.equipment : [],
    pricing: {
      currency: tidy(input.pricing?.currency),
      equipmentSubtotal: tidy(input.pricing?.equipmentSubtotal),
      installationAllowance: tidy(input.pricing?.installationAllowance),
      programmingAllowance: tidy(input.pricing?.programmingAllowance),
      totalBudgetNote: tidy(input.pricing?.totalBudgetNote),
    },
  };
}