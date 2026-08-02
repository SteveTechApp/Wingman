export type ProposalDocumentType =
  | "quote-response"
  | "technical-proposal"
  | "application-proposal"
  | "blended-proposal"
  | "tender-response";

export type ProposalDocumentTypeConfig = {
  id: ProposalDocumentType;
  label: string;
  description: string;
  sections: string[];
};

export type ProposalWizardDraft = {
  schemaVersion: 1;
  projectId: string;
  discoveryFingerprint?: string;
  documentType: ProposalDocumentType;
  customerName: string;
  projectName: string;
  contactName: string;
  proposalReference: string;
  proposalDate: string;
  validityDays: number;
  preparedBy: string;
  executiveSummary: string;
  customerObjectives: string;
  proposedSolution: string;
  architectureNarrative: string;
  inclusions: string;
  exclusions: string;
  assumptions: string;
  dependencies: string;
  responsibilities: string;
  leadTime: string;
  warranty: string;
  nextSteps: string;
  solutionConfirmed: boolean;
  continueWithoutBom: boolean;
  reviewConfirmed: boolean;
  bomQuantities: Record<string, number>;
  updatedAt: string;
};

export type ProposalReadinessInput = {
  discoveryPercent: number;
  executiveSummary: string;
  proposedSolution: string;
  architectureNarrative: string;
  customerName: string;
  projectName: string;
  preparedBy: string;
  proposalReference: string;
  bomRowCount: number;
  solutionConfirmed: boolean;
  continueWithoutBom: boolean;
  reviewConfirmed: boolean;
  technicalBlockerCount?: number;
};

export type ProposalReadinessResult = {
  score: number;
  discovery: number;
  narrative: number;
  customer: number;
  solution: number;
  approval: number;
  missing: string[];
};

export const PROPOSAL_DOCUMENT_TYPES: ProposalDocumentTypeConfig[] = [
  {
    id: "quote-response",
    label: "Basic quotation response",
    description: "A concise customer response covering requirement, selected products, assumptions and next steps.",
    sections: [
      "Executive Summary",
      "Customer Requirement",
      "Proposed Solution",
      "Equipment Schedule",
      "Assumptions and Exclusions",
      "Next Steps",
    ],
  },
  {
    id: "technical-proposal",
    label: "Technical proposal",
    description: "A technically detailed proposal for consultants, integrators and technical reviewers.",
    sections: [
      "Executive Summary",
      "Customer Requirement",
      "Technical Architecture",
      "Proposed Solution",
      "Equipment Schedule",
      "Dependencies and Responsibilities",
      "Assumptions and Exclusions",
      "Validation Items",
      "Next Steps",
    ],
  },
  {
    id: "application-proposal",
    label: "Practical / application proposal",
    description: "A customer-friendly explanation focused on operation, user outcomes and practical benefits.",
    sections: [
      "Executive Summary",
      "Understanding of Requirements",
      "Proposed Solution",
      "How the System Will Work",
      "Customer Benefits",
      "Equipment Schedule",
      "Assumptions and Exclusions",
      "Next Steps",
    ],
  },
  {
    id: "blended-proposal",
    label: "Blended commercial and technical proposal",
    description: "The default balanced format for commercial decision-makers and technical reviewers.",
    sections: [
      "Executive Summary",
      "Understanding of Requirements",
      "Proposed Solution",
      "Practical Operation",
      "Customer Benefits",
      "Technical Architecture",
      "Equipment Schedule",
      "Dependencies and Responsibilities",
      "Assumptions and Exclusions",
      "Validation Items",
      "Next Steps",
    ],
  },
  {
    id: "tender-response",
    label: "Formal tender response",
    description: "A comprehensive response with scope, compliance, responsibilities, risks and implementation detail.",
    sections: [
      "Executive Summary",
      "Tender Understanding",
      "Scope of Supply",
      "Proposed Solution",
      "Technical Architecture",
      "Equipment Schedule",
      "Implementation Approach",
      "Dependencies and Responsibilities",
      "Assumptions and Exclusions",
      "Validation and Compliance",
      "Warranty and Support",
      "Next Steps",
    ],
  },
];

const STORAGE_PREFIX = "wingman-proposal-wizard-v1";

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function hasText(value: string) {
  return value.trim().length > 0;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function referenceFor(projectId: string) {
  const cleanProject = projectId
    .replace(/[^a-z0-9]+/gi, "")
    .slice(0, 8)
    .toUpperCase();

  return `WM-${todayIsoDate().replaceAll("-", "")}-${cleanProject || "PROJECT"}`;
}

export function getProposalDocumentTypeConfig(type: ProposalDocumentType) {
  return (
    PROPOSAL_DOCUMENT_TYPES.find((candidate) => candidate.id === type) ??
    PROPOSAL_DOCUMENT_TYPES[3]
  );
}

export function linesFromText(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function createProposalWizardDefaults(input: {
  projectId: string;
  projectName: string;
  preparedBy: string;
  executiveSummary: string;
  architectureNarrative: string;
  proposedSolution?: string;
  assumptions?: string[];
  dependencies?: string[];
  customerName?: string;
  contactName?: string;
  discoveryFingerprint?: string;
}): ProposalWizardDraft {
  const proposedSolution =
    input.proposedSolution?.trim() ||
    (input.architectureNarrative.trim()
      ? `We propose a WyreStorm solution based on the captured architecture: ${input.architectureNarrative.trim()}`
      : "We propose a WyreStorm solution aligned to the captured room, source, display, USB, audio, control and infrastructure requirements.");

  return {
    schemaVersion: 1,
    projectId: input.projectId,
    discoveryFingerprint: input.discoveryFingerprint,
    documentType: "blended-proposal",
    customerName: input.customerName?.trim() ?? "",
    projectName: input.projectName,
    contactName: input.contactName?.trim() ?? "",
    proposalReference: referenceFor(input.projectId),
    proposalDate: todayIsoDate(),
    validityDays: 30,
    preparedBy: input.preparedBy,
    executiveSummary: input.executiveSummary,
    customerObjectives: input.executiveSummary,
    proposedSolution,
    architectureNarrative: input.architectureNarrative,
    inclusions: [
      "WyreStorm equipment listed in the equipment schedule.",
      "Product selection and proposal support based on the captured Discovery brief.",
      "Customer-safe explanation of the recommended system architecture.",
    ].join("\n"),
    exclusions: [
      "Installation labour, commissioning and programming unless expressly listed.",
      "Displays, projectors, loudspeakers, microphones, network switches and third-party equipment unless listed.",
      "Electrical, structural, containment and builder's work.",
    ].join("\n"),
    assumptions: (input.assumptions?.length
      ? input.assumptions
      : ["Final product quantities, accessories, firmware, regional suitability and installation conditions will be validated before order."]).join("\n"),
    dependencies: (input.dependencies?.length
      ? input.dependencies
      : ["Customer or integrator confirmation of final cable routes, network ownership, display interfaces and installation responsibility."]).join("\n"),
    responsibilities: [
      "Supplier: provide the listed WyreStorm equipment and product documentation.",
      "Integrator: confirm final design, install, configure, test and commission the complete system.",
      "Customer / IT: confirm network, security, access, room and operational requirements.",
    ].join("\n"),
    leadTime: "Lead time is subject to stock availability and will be confirmed at order.",
    warranty: "Warranty and support are provided in accordance with the applicable WyreStorm product and regional terms.",
    nextSteps: [
      "Confirm the customer and project details.",
      "Approve the proposed architecture and product schedule.",
      "Resolve the listed validation items.",
      "Issue the final commercial quotation and implementation programme.",
    ].join("\n"),
    solutionConfirmed: false,
    continueWithoutBom: false,
    reviewConfirmed: false,
    bomQuantities: {},
    updatedAt: new Date().toISOString(),
  };
}

export function loadProposalWizardDraft(
  projectId: string,
  defaults: ProposalWizardDraft,
): ProposalWizardDraft {
  if (typeof window === "undefined") return defaults;

  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}:${projectId}`);
    if (!raw) return defaults;

    const parsed = JSON.parse(raw) as Partial<ProposalWizardDraft>;
    const discoveryChanged = parsed.discoveryFingerprint !== defaults.discoveryFingerprint;
    return {
      ...defaults,
      ...parsed,
      ...(discoveryChanged
        ? {
            discoveryFingerprint: defaults.discoveryFingerprint,
            executiveSummary: defaults.executiveSummary,
            customerObjectives: defaults.customerObjectives,
            proposedSolution: defaults.proposedSolution,
            architectureNarrative: defaults.architectureNarrative,
            solutionConfirmed: false,
            reviewConfirmed: false,
          }
        : {}),
      schemaVersion: 1,
      projectId,
      bomQuantities: {
        ...defaults.bomQuantities,
        ...(discoveryChanged ? {} : parsed.bomQuantities ?? {}),
      },
    };
  } catch {
    return defaults;
  }
}

export function saveProposalWizardDraft(draft: ProposalWizardDraft) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      `${STORAGE_PREFIX}:${draft.projectId}`,
      JSON.stringify({
        ...draft,
        updatedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // Local storage may be disabled. The live proposal object is still saved to the project.
  }
}

export function computeProposalReadiness(
  input: ProposalReadinessInput,
): ProposalReadinessResult {
  const discovery = Math.round(clampPercent(input.discoveryPercent) * 0.65);

  let narrative = 0;
  if (hasText(input.executiveSummary)) narrative += 5;
  if (hasText(input.proposedSolution)) narrative += 5;
  if (hasText(input.architectureNarrative)) narrative += 5;

  let customer = 0;
  if (hasText(input.customerName)) customer += 2;
  if (hasText(input.projectName)) customer += 2;
  if (hasText(input.preparedBy)) customer += 2;
  if (hasText(input.proposalReference)) customer += 2;

  const solutionComplete =
    input.solutionConfirmed &&
    (input.technicalBlockerCount ?? 0) === 0 &&
    (input.bomRowCount > 0 || input.continueWithoutBom);

  const solution = solutionComplete
    ? 8
    : input.bomRowCount > 0
      ? 4
      : 0;

  const approval = input.reviewConfirmed ? 4 : 0;

  const missing: string[] = [];
  if (clampPercent(input.discoveryPercent) < 100) {
    missing.push("Complete or review the remaining Discovery questions.");
  }
  if (!hasText(input.customerName)) {
    missing.push("Add the customer or organisation name.");
  }
  if (!hasText(input.executiveSummary)) {
    missing.push("Add the executive summary.");
  }
  if (!hasText(input.proposedSolution)) {
    missing.push("Describe the proposed solution.");
  }
  if (!hasText(input.architectureNarrative)) {
    missing.push("Confirm the technical architecture narrative.");
  }
  if (input.bomRowCount <= 0 && !input.continueWithoutBom) {
    missing.push("Add the core WyreStorm products or explicitly continue without a final BOM.");
  }
  if (!input.solutionConfirmed) {
    missing.push("Confirm that the proposed solution has been reviewed.");
  }
  if (!input.reviewConfirmed) {
    missing.push("Complete the final customer-safe review.");
  }
  if ((input.technicalBlockerCount ?? 0) > 0) {
    missing.push(`Resolve ${input.technicalBlockerCount} technical assurance blocker(s) before customer export.`);
  }

  return {
    score: Math.min(100, discovery + narrative + customer + solution + approval),
    discovery,
    narrative,
    customer,
    solution,
    approval,
    missing,
  };
}
