import * as React from "react";
import { addLineToSavedProposal } from "@/proposal/bom/store";

export function addProductToProposal(product: {
  sku: string;
  name: string;
  qty?: number;
  source?: string;
}) {
  addLineToSavedProposal({
    sku: product.sku,
    name: product.name,
    qty: product.qty ?? 1,
    source: product.source ?? "catalog"
  });
}