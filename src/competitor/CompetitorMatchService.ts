import type { CompetitorItem, MatchResult } from "./types";
import { loadCompetitors } from "./CompetitorStore";
import { listAll, isSelectable } from "@/catalog/CatalogService";
import type { Product } from "@/catalog/types";
function norm(s: string){ return (s || "").toLowerCase().trim(); }
function overlap(a?: string[], b?: string[]){ const A=new Set((a||[]).map(norm)); const B=new Set((b||[]).map(norm)); let h=0; for(const t of A){ if(B.has(t)) h++; } return h; }
function baseCategoryScore(cCat: string, p: Product){ if(p.category === (cCat as any)) return {score:34,reason:"Category: match"}; return {score:-12,reason:"Category: mismatch"}; }
function roleScore(cRole: string, p: Product){ if(p.role === (cRole as any)) return {score:20,reason:"Role: match"}; if((cRole==="TX"||cRole==="RX") && p.role==="TRX") return {score:14,reason:"Role: TRX flexible"}; return {score:-10,reason:"Role: mismatch"}; }
function lifecyclePenalty(p: Product){ if(p.lifecycle==="eol") return {score:-999,reason:"Lifecycle: EoL blocked"}; if(p.lifecycle==="legacy") return {score:-8,reason:"Lifecycle: legacy penalty"}; return {score:0,reason:"Lifecycle: current"}; }
function scoreResolution(req?: string, has?: string){ const o:any={"1080p60":1,"4K30":2,"4K60":3,"4K120":4}; if(!req||!has) return {score:0,reason:"Resolution: unknown"}; const r=o[req]||0; const h=o[has]||0; if(!r||!h) return {score:0,reason:"Resolution: unknown enum"}; if(h>=r) return {score:14,reason:`Resolution: meets/exceeds ${req}`}; return {score:-18,reason:`Resolution: below ${req}`}; }
function scoreFeatures(req?: string[], p?: any){ if(!req||req.length===0) return {score:0,reason:"Features: none required"}; const hits=overlap(req,p?.features||[]); if(hits===0) return {score:-8,reason:"Features: no overlap"}; const pts=Math.min(14,hits*5); return {score:pts,reason:`Features: overlap x${hits}`}; }
function scoreIo(needIn?: number, needOut?: number, p?: any){ let s=0; const r:string[]=[]; const pi=p?.io?.inputs; const po=p?.io?.outputs; if(typeof needIn==="number"){ if(typeof pi==="number"){ if(pi>=needIn){ s+=8; r.push(`I/O: inputs >= ${needIn}`);} else {s-=10; r.push(`I/O: inputs < ${needIn}`);} } else r.push("I/O: product inputs unknown"); } if(typeof needOut==="number"){ if(typeof po==="number"){ if(po>=needOut){ s+=8; r.push(`I/O: outputs >= ${needOut}`);} else {s-=10; r.push(`I/O: outputs < ${needOut}`);} } else r.push("I/O: product outputs unknown"); } return {score:s,reasons:r}; }
export function searchCompetitors(q: string){ const items=loadCompetitors(); const s=norm(q); if(!s) return items; return items.filter(c => norm([c.brand,c.model,c.name,c.category,c.role,...(c.tags||[]),...(c.features||[]),...(c.notes||[])].join(" ")).includes(s)); }
export function matchToCatalog(competitor: CompetitorItem, topN=6): MatchResult[]{
  const catalog=listAll();
  const scored=catalog.map(p=>{
    let score=0; const reasons:string[]=[];
    const cat=baseCategoryScore(competitor.category,p); score+=cat.score; reasons.push(cat.reason);
    const rol=roleScore(competitor.role,p); score+=rol.score; reasons.push(rol.reason);
    const res=scoreResolution(competitor.video?.maxResolution,(p as any).video?.maxResolution); score+=res.score; if(res.score) reasons.push(res.reason);
    const tagHits=overlap(competitor.tags,(p as any).tags); if(tagHits){ score+=Math.min(12,tagHits*4); reasons.push(`Tags: overlap x${tagHits}`);} 
    const feat=scoreFeatures(competitor.features,p as any); score+=feat.score; reasons.push(feat.reason);
    const io=scoreIo(competitor.io?.inputs,competitor.io?.outputs,p as any); score+=io.score; reasons.push(...io.reasons);
    const life=lifecyclePenalty(p); score+=life.score; reasons.push(life.reason);
    const clamped=Math.max(-50,Math.min(80,score));
    const confidence=Math.max(0,Math.min(100,Math.round((clamped+20)*1.25)));
    return {p,confidence,reasons};
  }).filter(x=>x.confidence>0).sort((a,b)=>b.confidence-a.confidence).slice(0,topN);
  return scored.map(x=>({competitor,sku:x.p.sku,name:x.p.name,confidence:x.confidence,reasons:x.reasons.filter(Boolean).slice(0,8)}));
}
export function canAddSku(sku: string){ const p=listAll().find(x=>x.sku===sku); return !!p && isSelectable(p); }
