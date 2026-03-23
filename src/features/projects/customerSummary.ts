import type { StoredProject } from "@/features/projects/projectStore";

export type CustomerSummarySnapshot = {
  headline: string;
  overview: string;
  bullets: string[];
  openRisks: string[];
  generatedAt: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

export function buildCustomerSafeSummary(project: StoredProject): CustomerSummarySnapshot {
  const discovery = project.discovery;
  const proposal = project.proposal;
  const applicationType = tidy(discovery?.applicationType);
  const sourcePlacement = tidy(discovery?.sourcePlacement);
  const displayConnectionType = tidy(discovery?.displayConnectionType);

  const headline = tidy(proposal?.title) || tidy(project.name) || "AV project summary";
  const overview = [
    tidy(project.customer) ? `${project.customer} is currently planning` : "This project currently covers",
    applicationType ? `${applicationType.toLowerCase()} AV deployment` : "an AV deployment",
    tidy(project.site) ? `at ${project.site}` : "",
    tidy(project.roomName) ? `for ${project.roomName}` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const bullets = unique([
    tidy(discovery?.displayCount) ? `${discovery?.displayCount} display path${discovery?.displayCount === "1" ? "" : "s"} under consideration.` : "",
    tidy(discovery?.sourceCount) ? `${discovery?.sourceCount} source path${discovery?.sourceCount === "1" ? "" : "s"} currently in scope.` : "",
    sourcePlacement ? `Sources are expected to live ${sourcePlacement.toLowerCase()}.` : "",
    displayConnectionType ? `Display delivery is currently aligned to ${displayConnectionType.toLowerCase()}.` : "",
    Array.isArray(discovery?.recommendedFamilies) && discovery.recommendedFamilies.length > 0
      ? `Wingman is currently steering toward ${discovery.recommendedFamilies.join(", ")} technology families.`
      : "",
    tidy(proposal?.notes) ? "A proposal draft is already in progress." : "",
  ]).slice(0, 5);

  const openRisks = unique([
    tidy(discovery?.floorType) && tidy(discovery?.ceilingType)
      ? ""
      : "Floor and ceiling construction still need confirmation.",
    tidy(discovery?.sourceConnectionType) ? "" : "Source-side transport still needs confirmation.",
    tidy(discovery?.displayConnectionType) ? "" : "Display-side transport still needs confirmation.",
    tidy(discovery?.networkEnvironment) || !tidy(discovery?.displayConnectionType).toLowerCase().includes("avoip")
      ? ""
      : "Network readiness needs validation before final transport is confirmed.",
  ]).slice(0, 4);

  return {
    headline,
    overview: overview || "Wingman is still shaping the customer-ready AV summary for this opportunity.",
    bullets,
    openRisks,
    generatedAt: nowIso(),
  };
}
