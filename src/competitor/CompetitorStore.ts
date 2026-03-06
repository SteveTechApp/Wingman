import * as React from "react";
import type { CompetitorItem } from "./types";
import raw from "./competitors.json";
const KEY = "wingman:competitors:v1";
const DEFAULTS: CompetitorItem[] = raw as any;
export function loadCompetitors(): CompetitorItem[]{
  try{ const t=localStorage.getItem(KEY); if(!t) return DEFAULTS; const p=JSON.parse(t); if(Array.isArray(p)) return p as CompetitorItem[]; }catch{}
  return DEFAULTS;
}
export function saveCompetitors(items: CompetitorItem[]){ localStorage.setItem(KEY, JSON.stringify(items, null, 2)); }
export function resetCompetitors(){ localStorage.removeItem(KEY); }
