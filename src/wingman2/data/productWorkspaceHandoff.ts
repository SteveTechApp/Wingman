import type { ProductNarrative, ProductSpec } from "../lib/productStoryEngine";

export type ProductWorkspaceHandoff = {
  source: "ProductWorkspace";
  sku: string;
  name: string;
  family: string;
  category: string;
  productType: string;
  headline: string;
  summary: string;
  purpose: string;
  diagramSource: string;
  diagramOutput: string;
  visualPrompt: string;
  checks: string[];
  related: string[];
  generatedAt: string;
};

const PRODUCT_WORKSPACE_HANDOFF_KEY = "wingman-product-workspace-handoff-v1";

export function buildProductWorkspaceHandoff(product: ProductSpec, narrative: ProductNarrative): ProductWorkspaceHandoff {
  return {
    source: "ProductWorkspace",
    sku: product.sku,
    name: product.name,
    family: product.family,
    category: product.category,
    productType: product.productType,
    headline: narrative.headline,
    summary: product.summary,
    purpose: product.purpose,
    diagramSource: narrative.diagramSource,
    diagramOutput: narrative.diagramOutput,
    visualPrompt: narrative.visualPrompt,
    checks: narrative.askNow,
    related: product.related,
    generatedAt: new Date().toISOString()
  };
}

export function writeProductWorkspaceHandoff(product: ProductSpec, narrative: ProductNarrative) {
  if (typeof window === "undefined") return null;

  const handoff = buildProductWorkspaceHandoff(product, narrative);
  window.localStorage.setItem(PRODUCT_WORKSPACE_HANDOFF_KEY, JSON.stringify(handoff));
  window.dispatchEvent(new CustomEvent("wingman:product-workspace-handoff-updated", { detail: handoff }));

  return handoff;
}

export function readProductWorkspaceHandoff(): ProductWorkspaceHandoff | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(PRODUCT_WORKSPACE_HANDOFF_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ProductWorkspaceHandoff;
    if (!parsed || parsed.source !== "ProductWorkspace") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearProductWorkspaceHandoff() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PRODUCT_WORKSPACE_HANDOFF_KEY);
}