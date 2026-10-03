import type { StoredProductSelection, StoredProjectProposal } from "../data/projectStore";

// ── Types ────────────────────────────────────────────────────────────

export type ProposalDiffField =
  | "title"
  | "summary"
  | "assumptions"
  | "sections"
  | "products.added"
  | "products.removed"
  | "products.quantity-changed"
  | "bom.added"
  | "bom.removed"
  | "evidence"
  | "repGuidance"
  | "governanceWarnings";

export type ProposalDiffEntry = {
  field: ProposalDiffField;
  description: string;
  oldValue?: string;
  newValue?: string;
};

export type ProposalDiffResult = {
  hasChanges: boolean;
  entries: ProposalDiffEntry[];
  addedSkus: string[];
  removedSkus: string[];
  summary: string;
};

// ── Helpers ───────────────────────────────────────────────────────────

function normaliseSku(sku: string): string {
  return String(sku ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function productKey(p: StoredProductSelection): string {
  return `${normaliseSku(p.sku)}:${p.quantity ?? 1}`;
}

// ── Diff engine ───────────────────────────────────────────────────────

export function diffProposals(
  prev: StoredProjectProposal,
  next: StoredProjectProposal,
): ProposalDiffResult {
  const entries: ProposalDiffEntry[] = [];
  const addedSkus: string[] = [];
  const removedSkus: string[] = [];

  // Title
  if (prev.title !== next.title) {
    entries.push({
      field: "title",
      description: `Title changed`,
      oldValue: prev.title,
      newValue: next.title,
    });
  }

  // Summary
  if (prev.summary !== next.summary) {
    entries.push({
      field: "summary",
      description: `Proposal summary changed`,
      oldValue: prev.summary ? prev.summary.slice(0, 200) : "(empty)",
      newValue: next.summary ? next.summary.slice(0, 200) : "(empty)",
    });
  }

  // Assumptions
  const prevAssumptions = prev.assumptions.join("\n");
  const nextAssumptions = next.assumptions.join("\n");
  if (prevAssumptions !== nextAssumptions) {
    entries.push({
      field: "assumptions",
      description: `Assumptions changed (${prev.assumptions.length} → ${next.assumptions.length})`,
      oldValue: prev.assumptions.join("; "),
      newValue: next.assumptions.join("; "),
    });
  }

  // Sections
  const prevSections = prev.sections.join("\n");
  const nextSections = next.sections.join("\n");
  if (prevSections !== nextSections) {
    entries.push({
      field: "sections",
      description: `Proposal sections changed`,
      oldValue: prev.sections.join(", "),
      newValue: next.sections.join(", "),
    });
  }

  // Products — SKU-level diff
  const prevSkuMap = new Map<string, StoredProductSelection>();
  const nextSkuMap = new Map<string, StoredProductSelection>();

  for (const p of prev.products) prevSkuMap.set(productKey(p), p);
  for (const n of next.products) nextSkuMap.set(productKey(n), n);

  // Added products
  for (const [key, product] of nextSkuMap) {
    if (!prevSkuMap.has(key)) {
      addedSkus.push(product.sku);
      entries.push({
        field: "products.added",
        description: `Product added: ${product.sku}${product.title ? ` (${product.title})` : ""}`,
        newValue: product.sku,
      });
    }
  }

  // Removed products
  for (const [key, product] of prevSkuMap) {
    if (!nextSkuMap.has(key)) {
      removedSkus.push(product.sku);
      entries.push({
        field: "products.removed",
        description: `Product removed: ${product.sku}${product.title ? ` (${product.title})` : ""}`,
        oldValue: product.sku,
      });
    }
  }

  // Quantity changes (same SKU, different quantity)
  for (const [nextKey, nextProduct] of nextSkuMap) {
    const sku = normaliseSku(nextProduct.sku);
    for (const [prevKey, prevProduct] of prevSkuMap) {
      if (normaliseSku(prevProduct.sku) === sku && prevKey !== nextKey) {
        entries.push({
          field: "products.quantity-changed",
          description: `Quantity changed for ${prevProduct.sku}: ${(prevProduct.quantity ?? 1)} → ${(nextProduct.quantity ?? 1)}`,
          oldValue: String(prevProduct.quantity ?? 1),
          newValue: String(nextProduct.quantity ?? 1),
        });
      }
    }
  }

  // Evidence
  const prevEvidence = (prev.evidence ?? []).join("\n");
  const nextEvidence = (next.evidence ?? []).join("\n");
  if (prevEvidence !== nextEvidence) {
    entries.push({
      field: "evidence",
      description: `Evidence notes changed`,
    });
  }

  // Rep guidance
  const prevGuidance = (prev.repGuidance ?? []).join("\n");
  const nextGuidance = (next.repGuidance ?? []).join("\n");
  if (prevGuidance !== nextGuidance) {
    entries.push({
      field: "repGuidance",
      description: `Rep guidance changed`,
    });
  }

  // Governance warnings
  const prevWarnings = (prev.governanceWarnings ?? []).join("\n");
  const nextWarnings = (next.governanceWarnings ?? []).join("\n");
  if (prevWarnings !== nextWarnings) {
    entries.push({
      field: "governanceWarnings",
      description: `Governance warnings changed`,
    });
  }

  // Build summary
  const changeCount = entries.length;
  const hasChanges = changeCount > 0;
  const parts: string[] = [];
  if (addedSkus.length) parts.push(`+${addedSkus.length} product${addedSkus.length !== 1 ? "s" : ""}`);
  if (removedSkus.length) parts.push(`-${removedSkus.length} product${removedSkus.length !== 1 ? "s" : ""}`);
  const otherChanges = changeCount - addedSkus.filter((s) => entries.some((e) => e.field === "products.added" && e.newValue === s)).length
    - removedSkus.filter((s) => entries.some((e) => e.field === "products.removed" && e.oldValue === s)).length;
  if (otherChanges > 0) parts.push(`${otherChanges} field change${otherChanges !== 1 ? "s" : ""}`);

  const summary = hasChanges
    ? parts.join(", ") || `${changeCount} change${changeCount !== 1 ? "s" : ""}`
    : "No changes";

  return { hasChanges, entries, addedSkus, removedSkus, summary };
}
