import * as React from "react";
import type { Product } from "./model";
import data from "@/data/catalog.wyrestorm.json";

const CATALOG = (data as any as Product[]).map(p => ({
  ...p,
  lifecycle: (p.lifecycle || "current") as any
}));

export function listAll(): Product[] {
  return CATALOG;
}

export function bySku(sku: string): Product | undefined {
  const s = (sku || "").trim();
  return CATALOG.find(p => p.sku === s);
}

export function isSelectable(p: Product): boolean {
  return (p.lifecycle || "current") !== "eol";
}