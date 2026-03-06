import * as React from "react";
import type { BomLine, Proposal } from "./types";
import { money } from "./pricing";
import { loadProposal, saveProposal, addLineToSavedProposal } from "./persist";

type Action =
  | { type: "SET_META"; patch: Partial<Proposal["meta"]> }
  | { type: "ADD_LINE"; line?: Partial<BomLine> }
  | { type: "UPDATE_LINE"; id: string; patch: Partial<BomLine> }
  | { type: "REMOVE_LINE"; id: string }
  | { type: "RESET" };

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const fallback: Proposal = {
  meta: { projectName: "New Proposal", currency: "GBP", marginTargetPct: 35 },
  lines: []
};

function init(): Proposal {
  if (typeof window === "undefined") return fallback;
  return loadProposal() ?? fallback;
}

function reducer(state: Proposal, action: Action): Proposal {
  switch (action.type) {
    case "SET_META":
      return { ...state, meta: { ...state.meta, ...action.patch } };

    case "ADD_LINE": {
      const id = uid();
      const currency = state.meta.currency;
      const line: BomLine = {
        id,
        sku: action.line?.sku ?? "",
        description: action.line?.description ?? "",
        qty: action.line?.qty ?? 1,
        category: action.line?.category ?? "Core",
        unitCost: action.line?.unitCost ?? money(currency, 0),
        unitSell: action.line?.unitSell ?? money(currency, 0),
        tier: action.line?.tier ?? "Dealer",
        notes: action.line?.notes ?? ""
      };
      return { ...state, lines: [line, ...state.lines] };
    }

    case "UPDATE_LINE":
      return { ...state, lines: state.lines.map(l => (l.id === action.id ? { ...l, ...action.patch } : l)) };

    case "REMOVE_LINE":
      return { ...state, lines: state.lines.filter(l => l.id !== action.id) };

    case "RESET":
      return fallback;

    default:
      return state;
  }
}

export function useProposalStore() {
  const [state, dispatch] = React.useReducer(reducer, undefined as unknown as Proposal, init);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    saveProposal(state);
  }, [state]);

  return [state, dispatch] as const;
}

// Used by QuoteCartService (Catalog "Add to Quote") and RoomWizard "Send to Proposal"
export { addLineToSavedProposal };