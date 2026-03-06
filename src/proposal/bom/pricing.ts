import * as React from "react";
import type { BomLine, Money, ProposalTotals } from "./types";

function val(m?: Money): number { return m?.value ?? 0; }

export function computeTotals(currency: Money["currency"], lines: BomLine[]): ProposalTotals {
  const totalCost = lines.reduce((s, l) => s + (val(l.unitCost) * (l.qty || 0)), 0);
  const totalSell = lines.reduce((s, l) => s + (val(l.unitSell) * (l.qty || 0)), 0);
  const grossMargin = totalSell - totalCost;
  const grossMarginPct = totalSell > 0 ? (grossMargin / totalSell) * 100 : 0;

  return { currency, totalCost, totalSell, grossMargin, grossMarginPct };
}

export function money(currency: Money["currency"], value: number): Money {
  return { currency, value: Number.isFinite(value) ? value : 0 };
}

export function formatMoney(currency: Money["currency"], value: number): string {
  const symbol = currency === "GBP" ? "Â£" : currency === "EUR" ? "â‚¬" : currency === "USD" ? "$" : "";
  const n = Number.isFinite(value) ? value : 0;
  return `${symbol}${n.toFixed(2)}`;
}