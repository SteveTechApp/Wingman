import type { SolutionFamily } from "@/features/catalog/catalogFamilyFilterModel";

export type RecommendedCatalogFamily = {
  family: SolutionFamily | null;
  reason: string;
  source: "discovery" | "room-wizard" | "guru" | "template" | "project" | "unknown";
};

function tidy(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function norm(value: unknown): string {
  return tidy(value).toLowerCase();
}

export function mapRecommendedFamily(input: unknown): SolutionFamily | null {
  const v = norm(input);

  if (!v) return null;
  if (v.includes("avoip") || v.includes("av over ip") || v.includes("networkhd")) return "avoip";
  if (v.includes("matrix")) return "matrix";
  if (v.includes("presentation") || v.includes("wireless") || v.includes("byod") || v.includes("byom") || v.includes("apollo")) return "presentation";
  if (v.includes("extender") || v.includes("hdbaset")) return "extender";
  if (v.includes("video wall") || v.includes("videowall")) return "videoWall";
  if (v.includes("audio")) return "audio";
  if (v.includes("control")) return "control";
  if (v.includes("accessory")) return "accessory";

  return null;
}

export function getRecommendedCatalogFamilyFromProject(project: unknown): RecommendedCatalogFamily | null {
  if (!project || typeof project !== "object") return null;

  const p = project as Record<string, unknown>;
  const discovery = (p.discovery && typeof p.discovery === "object") ? p.discovery as Record<string, unknown> : null;
  const catalog = (p.catalog && typeof p.catalog === "object") ? p.catalog as Record<string, unknown> : null;

  const explicitFamily =
    mapRecommendedFamily(catalog?.recommendedFamily) ??
    mapRecommendedFamily(discovery?.recommendedFamily) ??
    mapRecommendedFamily(discovery?.transportFamily) ??
    mapRecommendedFamily(discovery?.solutionFamily) ??
    mapRecommendedFamily(discovery?.topologyFamily);

  if (explicitFamily) {
    return {
      family: explicitFamily,
      reason:
        tidy(catalog?.recommendedReason) ||
        tidy(discovery?.recommendedReason) ||
        tidy(discovery?.transportReason) ||
        "Recommended from the active project workflow.",
      source: "project"
    };
  }

  const blob = [
    tidy(discovery?.recommendedTechnologies),
    tidy(discovery?.recommendedNextTool),
    tidy(discovery?.notes),
    tidy(catalog?.notes)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const inferred =
    mapRecommendedFamily(blob.includes("networkhd") ? "avoip" : "") ??
    mapRecommendedFamily(blob.includes("matrix") ? "matrix" : "") ??
    mapRecommendedFamily(blob.includes("wireless") || blob.includes("byod") || blob.includes("byom") ? "presentation" : "") ??
    mapRecommendedFamily(blob.includes("hdbaset") || blob.includes("extender") ? "extender" : "") ??
    mapRecommendedFamily(blob.includes("video wall") ? "video wall" : "");

  if (!inferred) return null;

  return {
    family: inferred,
    reason: "Inferred from the active project discovery notes and workflow context.",
    source: "project"
  };
}