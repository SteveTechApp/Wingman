import { REP_COPY } from "./proposalCopy";
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
  schemaVersion: 2;
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
  externalScope?: string;
  proposedSolution: string;
  architectureNarrative: string;
  inclusions: string;
  exclusions: string;
  assumptions: string;
  dependencies: string;
  responsibilities: string;
  leadTime: string;
  warranty: string;
  currency: "GBP" | "USD" | "EUR";
  pricesExcludeTax: boolean;
  bomUnitPrices: Record<string, string>;
  /**
   * Rate the rep enters for each installation line the site survey produced,
   * keyed by the line id. Installation scope comes from the wall design, so it
   * is priced beside the equipment rather than typed as free text.
   */
  installationUnitPrices: Record<string, string>;
  servicesAndAllowances: string;
  implementationTimeline: string;
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
  commercialPricingComplete?: boolean;
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

/**
 * The one sentence the readiness check uses for a line the document would print
 * as TBC. Exported because the checklist, the readiness list and their tests
 * must be talking about the same item — a view that matched this wording by hand
 * would quietly stop offering the rate card's fix when the sentence changed.
 */
export const PROPOSAL_PRICING_GAP =
  "Enter a unit price for every included equipment and installation line.";

export const PROPOSAL_DOCUMENT_TYPES: ProposalDocumentTypeConfig[] = [
  {
    id: "quote-response",
    label: "Basic quotation response",
    description: "A concise customer response covering requirement, selected products, assumptions and next steps.",
    sections: [
      "Executive Summary",
      "Customer Requirement",
      "Proposed Solution",
      "Display Schedule",
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
      "Display Schedule",
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
      "Display Schedule",
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
      "Display Schedule",
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
      "Display Schedule",
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
    schemaVersion: 2,
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
    // Rep-facing prompts only: the export strips them if they are left here.
    externalScope: REP_COPY.scopePrompts,
    proposedSolution,
    architectureNarrative: input.architectureNarrative,
    inclusions: [
      "WyreStorm equipment listed in the equipment schedule.",
      "Product selection and proposal support based on what we discussed.",
      "A plain explanation of how the recommended system works.",
    ].join("\n"),
    exclusions: [
      "Cabling, connectors, patch leads and installation consumables unless expressly listed.",
      "Installation labour, project management, commissioning and programming unless expressly listed.",
      "Visio, CAD, schematic and as-built drawing production unless expressly listed.",
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
    currency: "GBP",
    pricesExcludeTax: true,
    bomUnitPrices: {},
    // The rate card lives on the rep's workspace, so the draft starts unpriced
    // and the page seeds it once the card arrives — keyed on the card's own
    // revision, so a save from that page is not re-applied over an edit.
    installationUnitPrices: {},
    servicesAndAllowances: [
      "Cabling and consumables | By integrator | Separately quoted",
      "Installation labour | By integrator | Separately quoted",
      "Project management | By integrator | Separately quoted",
      "Configuration and commissioning | By integrator | Separately quoted",
      "Visio / CAD / as-built drawings | By integrator | Separately quoted",
    ].join("\n"),
    implementationTimeline: [
      "Phase 1 | Site survey and preparation | Dates to be agreed | Confirm room, cable routes, network, power and access",
      "Phase 2 | Hardware delivery and physical installation | Dates to be agreed | Subject to stock and site readiness",
      "Phase 3 | Cabling, configuration and integration | Dates to be agreed | Integrator / trades complete by-others scope",
      "Phase 4 | Commissioning and acceptance testing | Dates to be agreed | Validate agreed routing, control, audio and USB workflows",
      "Phase 5 | Handover and close-out | Dates to be agreed | Training, documentation and customer sign-off",
    ].join("\n"),
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
      // Step 1 is project/profile metadata, not authored proposal narrative.
      // Always refresh it so a cached draft cannot impersonate another project.
      customerName: defaults.customerName,
      contactName: defaults.contactName,
      projectName: defaults.projectName,
      proposalReference: defaults.proposalReference,
      proposalDate: defaults.proposalDate,
      preparedBy: defaults.preparedBy,
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
      schemaVersion: 2,
      projectId,
      bomQuantities: {
        ...defaults.bomQuantities,
        ...(discoveryChanged ? {} : parsed.bomQuantities ?? {}),
      },
      bomUnitPrices: {
        ...defaults.bomUnitPrices,
        ...(discoveryChanged ? {} : parsed.bomUnitPrices ?? {}),
      },
      // The saved draft keeps the rates it carries, cleared cells included: the
      // workspace card seeds what the draft never reached, and a restore is a
      // choice made on the page rather than something a reload does by itself.
      installationUnitPrices: {
        ...((parsed.currency ?? defaults.currency) === defaults.currency ? defaults.installationUnitPrices : {}),
        ...(discoveryChanged ? {} : parsed.installationUnitPrices ?? {}),
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
    (input.technicalBlockerCount ?? 0) === 0 &&
    (input.commercialPricingComplete ?? input.continueWithoutBom) &&
    (input.bomRowCount > 0 || input.continueWithoutBom);

  const solution = solutionComplete
    ? 12
    : input.bomRowCount > 0
      ? 4
      : 0;

  const approval = 0; // Retained for stored consumers; review is optional.

  const missing: string[] = [];
  if (clampPercent(input.discoveryPercent) < 100) {
    missing.push("Additional discovery details can be added when available.");
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
  if (input.bomRowCount > 0 && !input.commercialPricingComplete) {
    missing.push(PROPOSAL_PRICING_GAP);
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
