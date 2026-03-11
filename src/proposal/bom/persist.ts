import * as React from "react";
import { getActiveProjectId } from "@/features/projects/projectStore";
import type { Proposal, BomLine } from "./types";
import { applyPricingModel, inferBomLineCategory, money } from "./pricing";

const KEY_PREFIX = "wingman_proposal_v2";
const LEGACY_KEY = "wingman_proposal_v1";

function proposalStorageKey(projectId?: string): string {
  return `${KEY_PREFIX}:${projectId || getActiveProjectId() || "default"}`;
}

export function loadProposal(projectId?: string): Proposal | null {
  try {
    const raw =
      window.localStorage.getItem(proposalStorageKey(projectId)) ??
      window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    return applyPricingModel(JSON.parse(raw) as Proposal);
  } catch {
    return null;
  }
}

export function saveProposal(p: Proposal, projectId?: string) {
  try {
    window.localStorage.setItem(proposalStorageKey(projectId), JSON.stringify(p, null, 2));
  } catch {
    // ignore
  }
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function addLineToSavedProposal(
  item: {
    sku: string;
    name: string;
    qty?: number;
    source?: string;
    category?: BomLine["category"] | string;
  },
  projectId?: string,
) {
  try {
    const existing = loadProposal(projectId);
    const currency = existing?.meta?.currency ?? "USD";

    const base: Proposal =
      existing ?? {
        meta: { projectName: "New Proposal", currency, priceTier: "Silver" },
        lines: []
      };

    const notes = item.source ? `Added from ${item.source}` : "";

    const line: BomLine = {
      id: uid(),
      sku: item.sku ?? "",
      description: item.name ?? "",
      qty: item.qty ?? 1,
      category: inferBomLineCategory({
        category: item.category,
        sku: item.sku ?? "",
        description: item.name ?? "",
        notes,
      }),
      tier: base.meta.priceTier ?? "Silver",
      unitCost: money(currency, 0),
      unitSell: money(currency, 0),
      notes,
    };

    const next = applyPricingModel({
      ...base,
      lines: [line, ...(base.lines ?? [])],
    });

    saveProposal(next, projectId);
  } catch {
    // ignore
  }
}
