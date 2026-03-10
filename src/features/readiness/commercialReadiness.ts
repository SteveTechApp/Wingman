import type { StoredProject } from "@/features/projects/projectStore";

export type CommercialReadinessStatus =
  | "Draft"
  | "Review Needed"
  | "Commercial Ready"
  | "Engineering Review Required";

export type CommercialReadinessCheck = {
  id: string;
  label: string;
  complete: boolean;
  detail: string;
};

export type CommercialReadinessResult = {
  status: CommercialReadinessStatus;
  score: number;
  checks: CommercialReadinessCheck[];
  nextStep: string;
};

export type CommercialReadinessInput = {
  hasNarrative?: boolean;
  hasAssumptions?: boolean;
  hasExclusions?: boolean;
  bomLineCount?: number;
};

function hasText(value: string | undefined | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasSolutionMapping(project: StoredProject | undefined): boolean {
  if (!project) return false;
  if ((project.catalog?.skus?.length ?? 0) > 0) return true;
  if ((project.discovery?.recommendedFamilies?.length ?? 0) > 0) return true;
  if (project.compare) return true;
  if (project.template) return true;
  if (project.videowall) return true;
  return false;
}

function hasCommercialNarrative(
  project: StoredProject | undefined,
  hasNarrativeOverride: boolean | undefined
): boolean {
  if (typeof hasNarrativeOverride === "boolean") return hasNarrativeOverride;
  return hasText(project?.proposal?.title) || hasText(project?.proposal?.notes);
}

export function evaluateCommercialReadiness(
  project: StoredProject | undefined,
  input: CommercialReadinessInput = {}
): CommercialReadinessResult {
  const discoveryComplete =
    hasText(project?.customer) &&
    hasText(project?.roomName) &&
    (hasText(project?.site) || hasText(project?.discovery?.site));

  const solutionMapped = hasSolutionMapping(project);
  const bomReady = (input.bomLineCount ?? 0) > 0 || (project?.catalog?.skus?.length ?? 0) > 0;
  const hasNarrative = hasCommercialNarrative(project, input.hasNarrative);
  const hasAssumptions = Boolean(input.hasAssumptions);
  const hasExclusions = Boolean(input.hasExclusions);

  const checks: CommercialReadinessCheck[] = [
    {
      id: "discovery",
      label: "Discovery context captured",
      complete: discoveryComplete,
      detail: "Customer and room context are needed before commercial positioning.",
    },
    {
      id: "solution",
      label: "Solution path selected",
      complete: solutionMapped,
      detail: "A mapped family, template, comparison or SKU set is required for confidence.",
    },
    {
      id: "bom",
      label: "BOM summary available",
      complete: bomReady,
      detail: "Quote pack requires at least one line item to hand off for pricing.",
    },
    {
      id: "narrative",
      label: "Commercial narrative prepared",
      complete: hasNarrative,
      detail: "Proposal summary should explain value and fit in plain language.",
    },
    {
      id: "assumptions",
      label: "Assumptions stated",
      complete: hasAssumptions,
      detail: "Assumptions reduce ambiguity before customer sharing.",
    },
    {
      id: "exclusions",
      label: "Exclusions stated",
      complete: hasExclusions,
      detail: "Exclusions prevent scope misunderstanding and rework.",
    },
  ];

  const completeCount = checks.filter((check) => check.complete).length;
  const score = Math.round((completeCount / checks.length) * 100);

  let status: CommercialReadinessStatus = "Draft";
  if (discoveryComplete && solutionMapped && bomReady && hasNarrative) {
    status = hasAssumptions && hasExclusions
      ? "Commercial Ready"
      : "Engineering Review Required";
  } else if (discoveryComplete || solutionMapped) {
    status = "Review Needed";
  }

  const nextStep =
    status === "Draft"
      ? "Capture customer context and room requirements first."
      : status === "Review Needed"
        ? "Complete solution mapping and prepare proposal narrative."
        : status === "Engineering Review Required"
          ? "Add assumptions and exclusions before customer handoff."
          : "Ready for commercial sharing and pricing handoff.";

  return { status, score, checks, nextStep };
}