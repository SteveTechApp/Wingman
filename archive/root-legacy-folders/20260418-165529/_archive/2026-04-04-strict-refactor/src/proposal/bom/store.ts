import * as React from "react";
import type { BomLine, Proposal } from "./types";
import { applyPricingModel, inferBomLineCategory, money } from "./pricing";
import { loadProposal, saveProposal, addLineToSavedProposal } from "./persist";

type Action =
  | { type: "LOAD"; proposal: Proposal }
  | { type: "SET_META"; patch: Partial<Proposal["meta"]> }
  | { type: "ADD_LINE"; line?: Partial<BomLine> }
  | { type: "UPDATE_LINE"; id: string; patch: Partial<BomLine> }
  | { type: "REMOVE_LINE"; id: string }
  | { type: "RESET" };

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const fallback: Proposal = {
  meta: { projectName: "New Proposal", currency: "USD", priceTier: "Silver" },
  lines: []
};

function init(projectId?: string): Proposal {
  if (typeof window === "undefined") return fallback;
  return loadProposal(projectId) ?? fallback;
}

function reducer(state: Proposal, action: Action): Proposal {
  switch (action.type) {
    case "LOAD":
      return applyPricingModel(action.proposal);

    case "SET_META":
      return applyPricingModel({ ...state, meta: { ...state.meta, ...action.patch } });

    case "ADD_LINE": {
      const id = uid();
      const currency = state.meta.currency;
      const category = inferBomLineCategory({
        category: action.line?.category,
        sku: action.line?.sku ?? "",
        description: action.line?.description ?? "",
        notes: action.line?.notes ?? "",
      });
      const line: BomLine = {
        id,
        sku: action.line?.sku ?? "",
        description: action.line?.description ?? "",
        qty: action.line?.qty ?? 1,
        category,
        unitCost: action.line?.unitCost ?? money(currency, 0),
        unitSell: action.line?.unitSell ?? money(currency, 0),
        tier: action.line?.tier ?? state.meta.priceTier ?? "Silver",
        notes: action.line?.notes ?? ""
      };
      return applyPricingModel({ ...state, lines: [line, ...state.lines] });
    }

    case "UPDATE_LINE":
      return applyPricingModel({
        ...state,
        lines: state.lines.map((line) => (line.id === action.id ? { ...line, ...action.patch } : line)),
      });

    case "REMOVE_LINE":
      return applyPricingModel({ ...state, lines: state.lines.filter((line) => line.id !== action.id) });

    case "RESET":
      return fallback;

    default:
      return state;
  }
}

export function useProposalStore(projectId?: string) {
  const [state, dispatch] = React.useReducer(
    reducer,
    projectId,
    (id) => init(id),
  );

  React.useEffect(() => {
    dispatch({ type: "LOAD", proposal: init(projectId) });
  }, [projectId]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    saveProposal(state, projectId);
  }, [projectId, state]);

  return [state, dispatch] as const;
}

// Used by QuoteCartService (Catalog "Add to Quote") and RoomWizard "Send to Proposal"
export { addLineToSavedProposal };
