import { readProjectStore } from "../data/projectStore";
import { buildDesignAssuranceLedger, type DesignAssuranceItem } from "./productAssurance";

// ── Types ────────────────────────────────────────────────────────────

export type SafetyTier = "ready" | "needs-review" | "not-ready";

export type ProjectSafetyRecord = {
  projectId: string;
  projectName: string;
  stage: string;
  status: string;
  updatedAt: string;
  daysSinceUpdate: number;
  productCount: number;
  blockerCount: number;
  warningCount: number;
  blockers: DesignAssuranceItem[];
  warnings: DesignAssuranceItem[];
  safetyTier: SafetyTier;
  safetyLabel: string;
  safetyColor: string;
  hasDiscovery: boolean;
  hasProposal: boolean;
  dealOutcome?: string;
};

export type DashboardSummary = {
  totalProjects: number;
  readyCount: number;
  needsReviewCount: number;
  notReadyCount: number;
  staleCount: number; // projects > 14 days old
  totalBlockers: number;
  totalWarnings: number;
};

// ── Helpers ───────────────────────────────────────────────────────────

function daysBetween(isoDate: string): number {
  const then = new Date(isoDate).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - then) / (1000 * 60 * 60 * 24)));
}

function classifyTier(
  blockerCount: number,
  warningCount: number,
  hasDiscovery: boolean,
): { tier: SafetyTier; label: string; color: string } {
  if (blockerCount > 0) {
    return { tier: "not-ready", label: "Not ready to quote", color: "red" };
  }
  if (warningCount > 0 || !hasDiscovery) {
    return { tier: "needs-review", label: "Needs review", color: "amber" };
  }
  return { tier: "ready", label: "Ready to quote", color: "green" };
}

// ── Main API ───────────────────────────────────────────────────────────

export function buildQuoteSafetyDashboard(): {
  projects: ProjectSafetyRecord[];
  summary: DashboardSummary;
} {
  const { projects } = readProjectStore();
  const records: ProjectSafetyRecord[] = [];

  for (const project of projects) {
    if (project.isDemo) continue;

    const products = project.productSelections ?? [];
    const hasDiscovery = !!(project.discoveryBrief?.capturedPercent && project.discoveryBrief.capturedPercent > 0);
    const hasProposal = !!project.proposal;
    const daysSince = daysBetween(project.updatedAt || project.createdAt);

    // Compute assurance ledger for this project's products
    let blockers: DesignAssuranceItem[] = [];
    let warnings: DesignAssuranceItem[] = [];

    if (products.length > 0) {
      const requirementText = [
        project.discoveryBrief?.roomModel?.outcome,
        project.discoveryBrief?.roomModel?.application,
        project.discoveryBrief?.roomModel?.summary,
      ].filter(Boolean).join(" ");

      const ledger = buildDesignAssuranceLedger({
        products,
        requirementText,
        discoveryPercent: project.discoveryBrief?.capturedPercent ?? (hasDiscovery ? 100 : 0),
        topology: project.discoveryBrief?.topology,
        feedback: project.feedback,
      });

      blockers = ledger.blockers;
      warnings = ledger.warnings;
    }

    const { tier, label, color } = classifyTier(blockers.length, warnings.length, hasDiscovery);

    records.push({
      projectId: project.id,
      projectName: project.name || "Untitled project",
      stage: project.stage || "Discovery",
      status: project.status || "",
      updatedAt: project.updatedAt || project.createdAt,
      daysSinceUpdate: daysSince,
      productCount: products.length,
      blockerCount: blockers.length,
      warningCount: warnings.length,
      blockers,
      warnings,
      safetyTier: tier,
      safetyLabel: label,
      safetyColor: color,
      hasDiscovery,
      hasProposal,
      dealOutcome: project.dealOutcome,
    });
  }

  // Sort: not-ready first, then needs-review, then ready; within each tier, oldest first
  const tierOrder: Record<SafetyTier, number> = { "not-ready": 0, "needs-review": 1, "ready": 2 };
  records.sort((a, b) => {
    const tierDelta = tierOrder[a.safetyTier] - tierOrder[b.safetyTier];
    if (tierDelta !== 0) return tierDelta;
    return b.daysSinceUpdate - a.daysSinceUpdate; // oldest first within tier
  });

  const summary: DashboardSummary = {
    totalProjects: records.length,
    readyCount: records.filter((r) => r.safetyTier === "ready").length,
    needsReviewCount: records.filter((r) => r.safetyTier === "needs-review").length,
    notReadyCount: records.filter((r) => r.safetyTier === "not-ready").length,
    staleCount: records.filter((r) => r.daysSinceUpdate > 14).length,
    totalBlockers: records.reduce((sum, r) => sum + r.blockerCount, 0),
    totalWarnings: records.reduce((sum, r) => sum + r.warningCount, 0),
  };

  return { projects: records, summary };
}
