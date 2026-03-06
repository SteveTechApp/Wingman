import * as React from "react";
import { addLineToSavedProposal } from "@/proposal/bom/store";

/**
 * Legacy cart type expected by:
 * - ProposalWorkbenchPage.tsx (cost/sell)
 * - PricingService.ts
 * - BomExportService.ts
 *
 * Keep fields: sku, name, qty, cost, sell
 * Also allow unitCost/unitSell for newer callers.
 */
export type QuoteLine = {
  sku: string;
  name: string;
  qty: number;

  // legacy numeric fields
  cost?: number;
  sell?: number;

  // newer optional fields
  unitCost?: number;
  unitSell?: number;

  source?: string;
  tier?: "MSRP" | "Dealer" | "Distributor" | string;
  category?: string;
  notes?: string;
};

export type QuoteCartItem = QuoteLine;

const CART_KEY = "wingman_quote_cart_v1";

function safeGet(): QuoteCartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QuoteCartItem[]) : [];
  } catch {
    return [];
  }
}

function safeSet(items: QuoteCartItem[]) {
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(items, null, 2));
  } catch {
    // ignore
  }
}

function normalize(item: QuoteCartItem): QuoteCartItem {
  const qty = item.qty && item.qty > 0 ? item.qty : 1;

  // unify cost/sell naming
  const cost =
    typeof item.cost === "number" ? item.cost :
    typeof item.unitCost === "number" ? item.unitCost :
    undefined;

  const sell =
    typeof item.sell === "number" ? item.sell :
    typeof item.unitSell === "number" ? item.unitSell :
    undefined;

  return {
    sku: item.sku ?? "",
    name: item.name ?? "",
    qty,
    cost,
    sell,
    unitCost: cost,
    unitSell: sell,
    source: item.source ?? "catalog",
    tier: item.tier,
    category: item.category,
    notes: item.notes
  };
}

/** Primary entry used by ProductCatalogPage */
export function addToCart(item: QuoteCartItem) {
  if (typeof window === "undefined") return;

  const line = normalize(item);

  const existing = safeGet();
  existing.unshift(line);
  safeSet(existing.slice(0, 500));

  // Unified: inject into Proposal BOM persisted draft
  addLineToSavedProposal({
    sku: line.sku,
    name: line.name,
    qty: line.qty,
    source: line.source
  });
}

/** Legacy APIs used elsewhere */
export function getCart(): QuoteLine[] {
  if (typeof window === "undefined") return [];
  return safeGet();
}

export function setCart(lines: QuoteLine[]) {
  if (typeof window === "undefined") return;
  safeSet(Array.isArray(lines) ? lines.map(normalize) : []);
}

export function removeFromCart(sku: string) {
  if (typeof window === "undefined") return;
  const next = safeGet().filter(l => l.sku !== sku);
  safeSet(next);
}

export function clearCart() {
  try {
    window.localStorage.removeItem(CART_KEY);
  } catch {
    // ignore
  }
}

/** Optional helper */
export function listCart(): QuoteCartItem[] {
  if (typeof window === "undefined") return [];
  return safeGet();
}