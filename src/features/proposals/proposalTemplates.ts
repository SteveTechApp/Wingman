export type ProposalTemplateInput = {
  projectName?: string;
  customerName?: string;
  companyName?: string;
  verticalMarket?: string;
  roomType?: string;
  tier?: string;
  compareSummary?: string;
};

export type ProposalRecommendationInput = ProposalTemplateInput & {
  salespersonSummary?: string;
  engineerSummary?: string;
  proposalSummary?: string;
  confidenceLabel?: string;
  confidenceScore?: number;
  missingInputs?: string[];
  accessoryLines?: string[];
};

export type ProposalDraftSeed = {
  executiveSummary: string;
  customerRequirements: string;
  systemOverview: string;
  billOfMaterials: string;
  commercialNotes: string;
  assumptions: string;
  exclusions: string;
  nextStep: string;
};

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function sentence(text: string): string {
  const v = tidy(text);
  if (!v) return "";
  return /[.!?]$/.test(v) ? v : `${v}.`;
}

export function buildExecutiveSummaryTemplate(input: ProposalTemplateInput): string {
  const project = tidy(input.projectName) || "this project";
  const market = tidy(input.verticalMarket).toLowerCase();
  const room = tidy(input.roomType).toLowerCase();
  const tier = tidy(input.tier);

  const parts = [
    `${project} has been developed as a ${tier ? tier + " " : ""}${room || "AV"} solution`,
    market ? `for ${market} use` : "",
    "with emphasis on operational clarity, appropriate feature selection, and commercial fit",
  ].filter(Boolean);

  return sentence(parts.join(" "));
}

export function buildSolutionOverviewTemplate(input: ProposalTemplateInput): string {
  const room = tidy(input.roomType).toLowerCase();
  const market = tidy(input.verticalMarket).toLowerCase();

  const parts = [
    "The proposed solution is designed to deliver a clear and supportable AV workflow",
    room ? `for the ${room} environment` : "",
    market ? `within the ${market} application context` : "",
    "while keeping system operation straightforward for the end user",
  ].filter(Boolean);

  return sentence(parts.join(" "));
}

export function buildAssumptionsTemplate(_input: ProposalTemplateInput): string {
  const parts = [
    "Pricing, final device counts, and site-specific infrastructure requirements remain subject to final survey confirmation",
    "Existing containment, power availability, and network readiness are assumed to be suitable unless otherwise noted",
    "Any third-party control, furniture integration, or construction works are assumed to be outside this proposal unless explicitly included",
  ];

  return parts.join("\n");
}

export function buildExclusionsTemplate(_input: ProposalTemplateInput): string {
  const parts = [
    "Builder's works, specialist construction works, and decoration are excluded",
    "Network switching, structured cabling, and third-party services are excluded unless specifically stated",
    "Programming, commissioning, or user training beyond standard handover are excluded unless separately listed",
  ];

  return parts.join("\n");
}

export function buildCommercialNotesTemplate(input: ProposalTemplateInput): string {
  const compare = tidy(input.compareSummary);

  const parts = [
    "This recommendation has been positioned to balance technical suitability, deployment simplicity, and commercial clarity.",
    compare ? `Competitive reference considered: ${compare}` : "",
    "Final commercial validation should confirm exact SKU availability, lead time, and any project-specific installation allowances.",
  ].filter(Boolean);

  return parts.join(" ");
}

export function buildNextStepsTemplate(_input: ProposalTemplateInput): string {
  return [
    "Confirm final room requirements and site constraints.",
    "Validate final SKU selection and any optional accessories.",
    "Review commercial assumptions, lead times, and installation scope.",
    "Issue final customer proposal for approval.",
  ].join("\n");
}

export function buildProposalDraftSeed(input: ProposalRecommendationInput): ProposalDraftSeed {
  const executiveSummary =
    tidy(input.salespersonSummary) ||
    buildExecutiveSummaryTemplate(input);

  const customerRequirements = [
    tidy(input.roomType) ? `Application context: ${tidy(input.roomType)}.` : "",
    tidy(input.verticalMarket) ? `Vertical market: ${tidy(input.verticalMarket)}.` : "",
    Array.isArray(input.missingInputs) && input.missingInputs.length > 0
      ? `Open qualification points: ${input.missingInputs.join(" ")}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const systemOverview =
    tidy(input.engineerSummary) ||
    buildSolutionOverviewTemplate(input);

  const billOfMaterials = [
    tidy(input.proposalSummary),
    Array.isArray(input.accessoryLines) && input.accessoryLines.length > 0
      ? `Suggested accessories and cabling:\n${input.accessoryLines.map((item) => `- ${item}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const commercialNotes = [
    buildCommercialNotesTemplate(input),
    tidy(input.confidenceLabel)
      ? `Recommendation confidence: ${tidy(input.confidenceLabel)}${typeof input.confidenceScore === "number" ? ` (${input.confidenceScore}%)` : ""}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const assumptions = buildAssumptionsTemplate(input);
  const exclusions = buildExclusionsTemplate(input);

  const nextStep =
    Array.isArray(input.missingInputs) && input.missingInputs.length > 0
      ? input.missingInputs.slice(0, 2).join(" ")
      : buildNextStepsTemplate(input);

  return {
    executiveSummary,
    customerRequirements,
    systemOverview,
    billOfMaterials,
    commercialNotes,
    assumptions,
    exclusions,
    nextStep,
  };
}
