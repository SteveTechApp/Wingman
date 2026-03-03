import type { Proposal, BomLine } from "./types";
import { money } from "./pricing";

const KEY = "wingman_proposal_v1";

export function loadProposal(): Proposal | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Proposal;
  } catch {
    return null;
  }
}

export function saveProposal(p: Proposal) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function addLineToSavedProposal(item: { sku: string; name: string; qty?: number; source?: string }) {
  try {
    const existing = loadProposal();
    const currency = existing?.meta?.currency ?? "GBP";

    const base: Proposal =
      existing ?? {
        meta: { projectName: "New Proposal", currency, marginTargetPct: 35 },
        lines: []
      };

    const line: BomLine = {
      id: uid(),
      sku: item.sku ?? "",
      description: item.name ?? "",
      qty: item.qty ?? 1,
      category: "Core",
      tier: "Dealer",
      unitCost: money(currency, 0),
      unitSell: money(currency, 0),
      notes: item.source ? `Added from ${item.source}` : ""
    };

    base.lines = [line, ...(base.lines ?? [])];
    saveProposal(base);
  } catch {
    // ignore
  }
}