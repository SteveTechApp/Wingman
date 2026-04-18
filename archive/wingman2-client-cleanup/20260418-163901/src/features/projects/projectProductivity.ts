import { WM_ROUTES } from "@/core/wingman/routeMap";
import type { StoredProject } from "@/features/projects/projectStore";

export type ProjectResumeAction = {
  label: string;
  shortLabel: string;
  to: string;
};

function lower(value: string | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

function hasText(value: string | undefined): boolean {
  return lower(value).length > 0;
}

function routeLabel(path: string): string {
  if (path === WM_ROUTES.proposals) return "Proposal";
  if (path === WM_ROUTES.catalogue) return "Products";
  if (path === WM_ROUTES.templates) return "Architecture";
  if (path === WM_ROUTES.videowall) return "Video Wall";
  if (path === WM_ROUTES.competitorCompare) return "Competitors";
  return "Guided Project";
}

export function getProjectResumeAction(project: StoredProject): ProjectResumeAction {
  const stage = lower(project.stage);
  const status = lower(project.status);

  if (status.includes("commercial ready")) {
    return {
      label: "Open project overview",
      shortLabel: "Project",
      to: `/app/projects/${encodeURIComponent(project.id)}`,
    };
  }

  if (
    hasText(project.proposal?.title) ||
    hasText(project.proposal?.notes) ||
    stage.includes("proposal")
  ) {
    return {
      label: "Open Proposal Builder",
      shortLabel: "Proposal",
      to: WM_ROUTES.proposals,
    };
  }

  if (
    Boolean(project.videowall) ||
    (project.catalog?.skus?.length ?? 0) > 0 ||
    Boolean(project.compare) ||
    Boolean(project.template) ||
    stage.includes("design") ||
    stage.includes("specify") ||
    stage.includes("architecture") ||
    stage.includes("product")
  ) {
    return {
      label: "Open product builder",
      shortLabel: "Products",
      to: WM_ROUTES.catalogue,
    };
  }

  if (hasText(project.discovery?.recommendedNextTool)) {
    return {
      label: `Resume ${routeLabel(project.discovery?.recommendedNextTool ?? "")}`,
      shortLabel: routeLabel(project.discovery?.recommendedNextTool ?? ""),
      to: project.discovery?.recommendedNextTool ?? WM_ROUTES.discovery,
    };
  }

  return {
    label: "Resume Guided Project",
    shortLabel: "Guided Project",
    to: WM_ROUTES.discovery,
  };
}
