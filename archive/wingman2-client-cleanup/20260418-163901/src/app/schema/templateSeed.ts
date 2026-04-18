import * as React from "react";
import type { ProjectDevice } from "@/features/systemDesign/designTypes";

export type TierKey = "bronze" | "silver" | "gold";

export type TemplateSeed = {
  source: "template-workbench";
  verticalMarket: {
    id: string;
    name: string;
    summary: string;
  };
  roomType: {
    id: string;
    name: string;
    summary: string;
    story?: string;
    designPurpose?: string;
    useCases: string[];
  };
  tier: {
    id: TierKey;
    label: string;
    summary: string;
    positioning: string;
    performance: string;
    commercialNote: string;
  };
  includedSystems: string[];
  uplift: string[];
  assumptions?: string[];
  recommendedFamilies?: string[];
  recommendedTool?: string;
  solutionSummary?: string;
  ioProfile?: {
    sources?: string;
    outputs?: string;
    operators?: string;
    sourceCount?: number;
    displayCount?: number;
  };
  starterDevices?: ProjectDevice[];
  projectName: string;
  createdAt: string;
};

const TEMPLATE_SEED_KEY = "wm_template_seed";

function isString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function isTierKey(v: unknown): v is TierKey {
  return v === "bronze" || v === "silver" || v === "gold";
}

export function isTemplateSeed(value: unknown): value is TemplateSeed {
  if (!value || typeof value !== "object") return false;
  const x = value as Record<string, unknown>;

  const vm = x.verticalMarket as Record<string, unknown> | undefined;
  const rt = x.roomType as Record<string, unknown> | undefined;
  const tier = x.tier as Record<string, unknown> | undefined;

  return (
    x.source === "template-workbench" &&
    !!vm &&
    isString(vm.id) &&
    isString(vm.name) &&
    isString(vm.summary) &&
    !!rt &&
    isString(rt.id) &&
    isString(rt.name) &&
    isString(rt.summary) &&
    isStringArray(rt.useCases) &&
    !!tier &&
    isTierKey(tier.id) &&
    isString(tier.label) &&
    isString(tier.summary) &&
    isString(tier.positioning) &&
    isString(tier.performance) &&
    isString(tier.commercialNote) &&
    isStringArray(x.includedSystems) &&
    isStringArray(x.uplift) &&
    (x.assumptions === undefined || isStringArray(x.assumptions)) &&
    (x.recommendedFamilies === undefined || isStringArray(x.recommendedFamilies)) &&
    (x.recommendedTool === undefined || isString(x.recommendedTool)) &&
    isString(x.projectName) &&
    isString(x.createdAt)
  );
}

export function readTemplateSeed(): TemplateSeed | null {
  try {
    const raw = sessionStorage.getItem(TEMPLATE_SEED_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isTemplateSeed(parsed)) {
      sessionStorage.removeItem(TEMPLATE_SEED_KEY);
      return null;
    }

    return parsed;
  } catch {
    try {
      sessionStorage.removeItem(TEMPLATE_SEED_KEY);
    } catch {}
    return null;
  }
}

export function writeTemplateSeed(seed: TemplateSeed): void {
  try {
    sessionStorage.setItem(TEMPLATE_SEED_KEY, JSON.stringify(seed));
  } catch {}
}

export function clearTemplateSeed(): void {
  try {
    sessionStorage.removeItem(TEMPLATE_SEED_KEY);
  } catch {}
}

export function getTemplateSeedKey(): string {
  return TEMPLATE_SEED_KEY;
}
