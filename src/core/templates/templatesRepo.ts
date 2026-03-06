import * as React from "react";

export type TemplateTier = "bronze" | "silver" | "gold";

export type TemplateField =
  | { key: string; type: "string"; required?: boolean; default?: string; min?: number; max?: number; options?: string[]; label?: string }
  | { key: string; type: "number"; required?: boolean; default?: number; min?: number; max?: number; options?: string[]; label?: string }
  | { key: string; type: "boolean"; required?: boolean; default?: boolean; min?: number; max?: number; options?: string[]; label?: string }
  | { key: string; type: "select"; required?: boolean; default?: string; min?: number; max?: number; options?: string[]; label?: string }
  | { key: string; type: "multiselect"; required?: boolean; default?: string[]; min?: number; max?: number; options?: string[]; label?: string };

export type BomLine = {
  type?: "core" | "accessory" | "service" | "note";
  sku: string;
  qty: number;
  role?: string;
  mandatory?: boolean;
};

export type TemplateTierDef = {
  tier: TemplateTier;
  displayName?: string;
  intent?: string;
  bom: { lines: BomLine[] };
};

export type WingmanTemplate = {
  id: string;
  version: string;
  name: string;
  category: string;
  shortDescription?: string;
  lifecyclePolicy?: string;
  tags?: string[];
  inputs?: { prompt?: string; fields?: TemplateField[] };
  tiers: TemplateTierDef[];
};

export type TemplatesSeed = { schemaVersion: string; templates: WingmanTemplate[] };

export async function loadTemplatesSeed(): Promise<TemplatesSeed> {
  // Vite will bundle JSON imports; keep path stable.
  const data = await import("@/data/templates/templates.seed.json");
  return (data as any).default ?? (data as any);
}

export type TieredBomExamples = {
  tieredBomExamples: Array<{
    templateId: string;
    inputs: Record<string, any>;
    expected: Record<string, any>;
  }>;
};

export async function loadTemplatesExamples(): Promise<TieredBomExamples> {
  const data = await import("@/data/templates/templates.examples.json");
  return (data as any).default ?? (data as any);
}