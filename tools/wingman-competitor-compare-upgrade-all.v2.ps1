$ErrorActionPreference = "Stop"
Set-Location C:\Users\steve\wingman
if (!(Test-Path "package.json")) { throw "Run from repo root: C:\Users\steve\wingman" }

function Ensure-Dir([string]$p){ if(!(Test-Path $p)){ New-Item -ItemType Directory -Path $p | Out-Null } }
function Backup-File([string]$p){
  if(Test-Path $p){
    $s = Get-Date -Format "yyyyMMdd_HHmmss"
    Copy-Item $p "$p.bak_$s" -Force
  }
}
function Write-Utf8NoBom([string]$path, [string[]]$lines){
  $dir = Split-Path $path -Parent
  Ensure-Dir $dir
  $enc = New-Object System.Text.UTF8Encoding($false)
  $content = ($lines -join "`r`n") + "`r`n"
  [System.IO.File]::WriteAllText($path, $content, $enc)
}
function Read-Raw([string]$p){ if(!(Test-Path $p)){ return $null }; Get-Content $p -Raw }
function Write-Raw([string]$p, [string]$content){
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($p, $content, $enc)
}

Ensure-Dir "src\competitor"

# A) Types
$types = "src\competitor\types.ts"
Backup-File $types
Write-Utf8NoBom $types @(
'export type CompetitorCategory = "AVoIP" | "Matrix" | "Switcher" | "Extender" | "VideoWall" | "Control" | "Accessory";',
'export type CompetitorRole = "TX" | "RX" | "TRX" | "Controller" | "Processor" | "Matrix" | "Switcher" | "Accessory";',
'export type LatencyClass = "ultra-low" | "low" | "standard" | "unknown";',
'export type CompetitorVideoCaps = { maxResolution?: "1080p60" | "4K30" | "4K60" | "4K120"; hdmi?: "1.4" | "2.0" | "2.1"; hdr?: boolean; };',
'export type IOCaps = { inputs?: number; outputs?: number; };',
'export type CompetitorItem = { brand: string; model: string; name: string; category: CompetitorCategory; role: CompetitorRole; tags?: string[]; features?: string[]; latency?: LatencyClass; io?: IOCaps; video?: CompetitorVideoCaps; notes?: string[]; };',
'export type MatchResult = { competitor: CompetitorItem; sku: string; name: string; confidence: number; reasons: string[]; };'
)

# B) CSV importer (safe template)
$csv = "src\competitor\csv.ts"
Backup-File $csv
Write-Utf8NoBom $csv @(
'import type { CompetitorItem } from "./types";',
'function norm(s: string){ return (s || "").trim(); }',
'function lower(s: string){ return norm(s).toLowerCase(); }',
'function splitCsvLine(line: string): string[]{',
'  const out: string[] = []; let cur=""; let inQ=false;',
'  for(let i=0;i<line.length;i++){',
'    const ch=line[i];',
'    if(ch === `"`){ if(inQ && line[i+1]===`"`){ cur+=`"`; i++; continue; } inQ=!inQ; continue; }',
'    if(ch === "," && !inQ){ out.push(cur); cur=""; continue; }',
'    cur += ch;',
'  }',
'  out.push(cur);',
'  return out.map(s=>s.trim());',
'}',
'function intOrUndef(s: string){ const n=parseInt(norm(s),10); return Number.isFinite(n)?n:undefined; }',
'export function competitorCsvTemplate(): string {',
'  return [',
'    "brand,model,name,category,role,maxResolution,hdmi,hdr,latency,inputs,outputs,tags,features,notes",',
'    "Crestron,DM-NVX-E30,AVoIP Encoder,AVoIP,TX,4K60,2.0,true,low,1,0,AVoIP;low-latency;managed-network,multicast;igmp;vlan,Example row",',
'    "Extron,NAV SD 501,AVoIP Decoder,AVoIP,RX,4K60,2.0,true,low,0,1,AVoIP;4K60,multicast;igmp,Example row"',
'  ].join("\\n");',
'}',
'export function parseCompetitorCsv(text: string): { items: CompetitorItem[]; warnings: string[] } {',
'  const warnings: string[] = [];',
'  const lines = text.split(/\\r?\\n/).map(l=>l.trim()).filter(Boolean);',
'  if(lines.length < 2) return { items: [], warnings: ["CSV has no data rows."] };',
'  const header = splitCsvLine(lines[0]).map(lower);',
'  const idx = (k: string) => header.indexOf(k);',
'  const req = ["brand","model","name","category","role"];',
'  for(const r of req){ if(idx(r) < 0) warnings.push(`Missing column: ${r}`); }',
'  const items: CompetitorItem[] = [];',
'  for(let r=1;r<lines.length;r++){',
'    const cols = splitCsvLine(lines[r]);',
'    const get = (k: string) => { const i=idx(k); return i>=0 ? (cols[i]||"") : ""; };',
'    const brand=norm(get("brand")); const model=norm(get("model")); const name=norm(get("name"));',
'    const category=norm(get("category")) as any; const role=norm(get("role")) as any;',
'    if(!brand||!model||!name||!category||!role){ warnings.push(`Row ${r+1}: missing required fields`); continue; }',
'    const tags = norm(get("tags")) ? norm(get("tags")).split(";").map(norm).filter(Boolean) : undefined;',
'    const features = norm(get("features")) ? norm(get("features")).split(";").map(norm).filter(Boolean) : undefined;',
'    const notes = norm(get("notes")) ? [norm(get("notes"))] : undefined;',
'    const maxResolution = norm(get("maxResolution")) as any;',
'    const hdmi = norm(get("hdmi")) as any;',
'    const hdrRaw = lower(get("hdr"));',
'    const hdr = hdrRaw==="true"||hdrRaw==="yes"||hdrRaw==="1" ? true : hdrRaw==="false"||hdrRaw==="no"||hdrRaw==="0" ? false : undefined;',
'    const latency = (norm(get("latency")) || "unknown") as any;',
'    const inputs=intOrUndef(get("inputs")); const outputs=intOrUndef(get("outputs"));',
'    items.push({',
'      brand, model, name, category, role, tags, features, latency,',
'      io: (typeof inputs==="number" || typeof outputs==="number") ? { inputs, outputs } : undefined,',
'      video: (maxResolution || hdmi || typeof hdr==="boolean") ? { maxResolution, hdmi, hdr } : undefined,',
'      notes',
'    });',
'  }',
'  return { items, warnings };',
'}'
)

# C) Store
$store = "src\competitor\CompetitorStore.ts"
Backup-File $store
Write-Utf8NoBom $store @(
'import type { CompetitorItem } from "./types";',
'import raw from "./competitors.json";',
'const KEY = "wingman:competitors:v1";',
'const DEFAULTS: CompetitorItem[] = raw as any;',
'export function loadCompetitors(): CompetitorItem[]{',
'  try{ const t=localStorage.getItem(KEY); if(!t) return DEFAULTS; const p=JSON.parse(t); if(Array.isArray(p)) return p as CompetitorItem[]; }catch{}',
'  return DEFAULTS;',
'}',
'export function saveCompetitors(items: CompetitorItem[]){ localStorage.setItem(KEY, JSON.stringify(items)); }',
'export function resetCompetitors(){ localStorage.removeItem(KEY); }'
)

# D) Starter competitors dataset (if missing)
$dataset = "src\competitor\competitors.json"
if(!(Test-Path $dataset)){
  Write-Utf8NoBom $dataset @(
'[',
'  {"brand":"Crestron","model":"DM-NVX-E30","name":"AVoIP Encoder","category":"AVoIP","role":"TX","tags":["AVoIP","4K60","low-latency"],"features":["multicast","igmp","vlan"],"latency":"low","io":{"inputs":1,"outputs":0},"video":{"maxResolution":"4K60","hdmi":"2.0","hdr":true}},',
'  {"brand":"Crestron","model":"DM-NVX-D30","name":"AVoIP Decoder","category":"AVoIP","role":"RX","tags":["AVoIP","4K60","low-latency"],"features":["multicast","igmp","vlan"],"latency":"low","io":{"inputs":0,"outputs":1},"video":{"maxResolution":"4K60","hdmi":"2.0","hdr":true}},',
'  {"brand":"Extron","model":"NAV E 501","name":"AVoIP Encoder","category":"AVoIP","role":"TX","tags":["AVoIP","4K60","managed-network"],"features":["multicast","igmp","vlan"],"latency":"low","io":{"inputs":1,"outputs":0},"video":{"maxResolution":"4K60","hdmi":"2.0","hdr":true}},',
'  {"brand":"Extron","model":"NAV SD 501","name":"AVoIP Decoder","category":"AVoIP","role":"RX","tags":["AVoIP","4K60","managed-network"],"features":["multicast","igmp","vlan"],"latency":"low","io":{"inputs":0,"outputs":1},"video":{"maxResolution":"4K60","hdmi":"2.0","hdr":true}}',
']'
  )
}

# E) Match service
$svc = "src\competitor\CompetitorMatchService.ts"
Backup-File $svc
Write-Utf8NoBom $svc @(
'import type { CompetitorItem, MatchResult } from "./types";',
'import { loadCompetitors } from "./CompetitorStore";',
'import { listAll, isSelectable } from "@/catalog/CatalogService";',
'import type { Product } from "@/catalog/types";',
'function norm(s: string){ return (s || "").toLowerCase().trim(); }',
'function overlap(a?: string[], b?: string[]){ const A=new Set((a||[]).map(norm)); const B=new Set((b||[]).map(norm)); let h=0; for(const t of A){ if(B.has(t)) h++; } return h; }',
'function baseCategoryScore(cCat: string, p: Product){ if(p.category === (cCat as any)) return {score:34,reason:"Category: match"}; return {score:-12,reason:"Category: mismatch"}; }',
'function roleScore(cRole: string, p: Product){ if(p.role === (cRole as any)) return {score:20,reason:"Role: match"}; if((cRole==="TX"||cRole==="RX") && p.role==="TRX") return {score:14,reason:"Role: TRX flexible"}; return {score:-10,reason:"Role: mismatch"}; }',
'function lifecyclePenalty(p: Product){ if(p.lifecycle==="eol") return {score:-999,reason:"Lifecycle: EoL blocked"}; if(p.lifecycle==="legacy") return {score:-8,reason:"Lifecycle: legacy penalty"}; return {score:0,reason:"Lifecycle: current"}; }',
'function scoreResolution(req?: string, has?: string){ const o:any={"1080p60":1,"4K30":2,"4K60":3,"4K120":4}; if(!req||!has) return {score:0,reason:"Resolution: unknown"}; const r=o[req]||0; const h=o[has]||0; if(!r||!h) return {score:0,reason:"Resolution: unknown enum"}; if(h>=r) return {score:14,reason:`Resolution: meets/exceeds ${req}`}; return {score:-18,reason:`Resolution: below ${req}`}; }',
'function scoreFeatures(req?: string[], p?: any){ if(!req||req.length===0) return {score:0,reason:"Features: none required"}; const hits=overlap(req,p?.features||[]); if(hits===0) return {score:-8,reason:"Features: no overlap"}; const pts=Math.min(14,hits*5); return {score:pts,reason:`Features: overlap x${hits}`}; }',
'function scoreIo(needIn?: number, needOut?: number, p?: any){ let s=0; const r:string[]=[]; const pi=p?.io?.inputs; const po=p?.io?.outputs; if(typeof needIn==="number"){ if(typeof pi==="number"){ if(pi>=needIn){ s+=8; r.push(`I/O: inputs >= ${needIn}`);} else {s-=10; r.push(`I/O: inputs < ${needIn}`);} } else r.push("I/O: product inputs unknown"); } if(typeof needOut==="number"){ if(typeof po==="number"){ if(po>=needOut){ s+=8; r.push(`I/O: outputs >= ${needOut}`);} else {s-=10; r.push(`I/O: outputs < ${needOut}`);} } else r.push("I/O: product outputs unknown"); } return {score:s,reasons:r}; }',
'export function searchCompetitors(q: string){ const items=loadCompetitors(); const s=norm(q); if(!s) return items; return items.filter(c => norm([c.brand,c.model,c.name,c.category,c.role,...(c.tags||[]),...(c.features||[]),...(c.notes||[])].join(" ")).includes(s)); }',
'export function matchToCatalog(competitor: CompetitorItem, topN=6): MatchResult[]{',
'  const catalog=listAll();',
'  const scored=catalog.map(p=>{',
'    let score=0; const reasons:string[]=[];',
'    const cat=baseCategoryScore(competitor.category,p); score+=cat.score; reasons.push(cat.reason);',
'    const rol=roleScore(competitor.role,p); score+=rol.score; reasons.push(rol.reason);',
'    const res=scoreResolution(competitor.video?.maxResolution,(p as any).video?.maxResolution); score+=res.score; if(res.score) reasons.push(res.reason);',
'    const tagHits=overlap(competitor.tags,(p as any).tags); if(tagHits){ score+=Math.min(12,tagHits*4); reasons.push(`Tags: overlap x${tagHits}`);} ',
'    const feat=scoreFeatures(competitor.features,p as any); score+=feat.score; reasons.push(feat.reason);',
'    const io=scoreIo(competitor.io?.inputs,competitor.io?.outputs,p as any); score+=io.score; reasons.push(...io.reasons);',
'    const life=lifecyclePenalty(p); score+=life.score; reasons.push(life.reason);',
'    const clamped=Math.max(-50,Math.min(80,score));',
'    const confidence=Math.max(0,Math.min(100,Math.round((clamped+20)*1.25)));',
'    return {p,confidence,reasons};',
'  }).filter(x=>x.confidence>0).sort((a,b)=>b.confidence-a.confidence).slice(0,topN);',
'  return scored.map(x=>({competitor,sku:x.p.sku,name:x.p.name,confidence:x.confidence,reasons:x.reasons.filter(Boolean).slice(0,8)}));',
'}',
'export function canAddSku(sku: string){ const p=listAll().find(x=>x.sku===sku); return !!p && isSelectable(p); }'
)

# F) UI page
$page="src\pages\tools\CompetitorComparePage.tsx"
Backup-File $page
Write-Utf8NoBom $page @(
'import React, { useMemo, useState } from "react";',
'import type { CompetitorItem } from "@/competitor/types";',
'import { searchCompetitors, matchToCatalog, canAddSku } from "@/competitor/CompetitorMatchService";',
'import { parseCompetitorCsv, competitorCsvTemplate } from "@/competitor/csv";',
'import { saveCompetitors, resetCompetitors, loadCompetitors } from "@/competitor/CompetitorStore";',
'import { Chip } from "@/components/catalog/Chips";',
'let addToBasket: ((p: any)=>void) | null = null;',
'try { addToBasket = require("@/components/catalog/DesignBasket").addToBasket; } catch { addToBasket = null; }',
'function downloadText(filename: string, text: string){ const blob=new Blob([text],{type:"text/plain;charset=utf-8"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }',
'export default function CompetitorComparePage(){',
'  const [q,setQ]=useState("");',
'  const [selected,setSelected]=useState<CompetitorItem|null>(null);',
'  const [msg,setMsg]=useState<string|null>(null);',
'  const list=useMemo(()=>searchCompetitors(q).slice(0,40),[q]);',
'  const matches=useMemo(()=>selected?matchToCatalog(selected,6):[],[selected]);',
'  async function onImportCsv(file: File|null){ if(!file) return; setMsg(null); const text=await file.text(); const res=parseCompetitorCsv(text); if(res.items.length){ saveCompetitors(res.items); setSelected(null); setQ(""); setMsg(res.warnings.length?("Imported with warnings: "+res.warnings.slice(0,3).join(" | ")):"Imported successfully."); } else { setMsg("No valid rows imported. "+(res.warnings[0]||"")); } }',
'  function onReset(){ resetCompetitors(); setSelected(null); setQ(""); setMsg("Reset to built-in competitor list."); }',
'  function onExport(){ downloadText("wingman_competitors_export.json", JSON.stringify(loadCompetitors(), null, 2)); }',
'  return (',
'    <div>',
'      <div className="wm-kicker">Tool</div>',
'      <div className="wm-h1" style={{marginTop:6}}>Competitor Compare</div>',
'      <div className="wm-p" style={{marginTop:6}}>Import competitor models (CSV) and get ranked WyreStorm matches with confidence + reasons.</div>',
'      <div className="wm-divider" />',
'      <div style={{display:"grid",gridTemplateColumns:"440px 1fr",gap:12,alignItems:"start"}}>',
'        <div className="wm-card wm-card-pad">',
'          <div className="wm-section-title">Competitor list</div>',
'          <div className="wm-field"><label>Search</label><input className="wm-input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search brand/model/category/tags..." /></div>',
'          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:10}}>',
'            <label className="wm-btn" style={{cursor:"pointer"}}>Import CSV<input type="file" accept=".csv,text/csv" style={{display:"none"}} onChange={(e)=>onImportCsv(e.target.files?.[0]||null)} /></label>',
'            <button className="wm-btn" onClick={()=>downloadText("wingman_competitor_template.csv", competitorCsvTemplate())}>Download template</button>',
'            <button className="wm-btn" onClick={onExport}>Export current</button>',
'            <button className="wm-btn" onClick={onReset}>Reset list</button>',
'          </div>',
'          {msg && <div className="wm-p" style={{marginTop:8,fontSize:12,opacity:0.85}}>{msg}</div>}',
'          <div style={{marginTop:10,display:"grid",gap:8,maxHeight:520,overflow:"auto",paddingRight:4}}>',
'            {list.map(c=>(',
'              <button key={c.brand+c.model} className="wm-btn" style={{justifyContent:"space-between"}} onClick={()=>setSelected(c)}>',
'                <span style={{textAlign:"left"}}>',
'                  <div style={{fontWeight:750}}>{c.brand} — {c.model}</div>',
'                  <div style={{opacity:0.75,fontSize:12}}>{c.category} • {c.role} • {c.name}</div>',
'                </span>',
'                <span style={{opacity:0.7}}>Select</span>',
'              </button>',
'            ))}',
'          </div>',
'        </div>',
'        <div>',
'          {!selected ? (',
'            <div className="wm-card wm-card-pad"><div className="wm-p">Select a competitor model to see ranked WyreStorm matches.</div></div>',
'          ) : (',
'            <div>',
'              <div className="wm-card wm-card-pad wm-card-primary">',
'                <div className="wm-section-title">Selected competitor</div>',
'                <div style={{fontWeight:850,fontSize:16}}>{selected.brand} — {selected.model}</div>',
'                <div className="wm-p" style={{marginTop:4}}>{selected.name}</div>',
'                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>',
'                  <Chip label={selected.category} />',
'                  <Chip label={selected.role} />',
'                  {selected.video?.maxResolution && <Chip label={selected.video.maxResolution} />}',
'                  {selected.latency && <Chip label={`Latency: ${selected.latency}`} />}',
'                  {(selected.features||[]).slice(0,3).map(f => <Chip key={f} label={f} />)}',
'                </div>',
'              </div>',
'              <div style={{marginTop:12}} className="wm-grid wm-grid-3">',
'                {matches.map(m=>{',
'                  const ok=canAddSku(m.sku);',
'                  return (',
'                    <div key={m.sku} className="wm-card wm-card-pad">',
'                      <div style={{display:"flex",justifyContent:"space-between",gap:10}}>',
'                        <div><div className="wm-kicker">WyreStorm match</div><div className="wm-h2" style={{marginTop:6}}>{m.sku}</div><div className="wm-p" style={{marginTop:4,opacity:0.9}}>{m.name}</div></div>',
'                        <div style={{display:"flex",alignItems:"flex-start"}}><Chip label={`${m.confidence}%`} tone={m.confidence>=75?"accent":"neutral"} /></div>',
'                      </div>',
'                      <div style={{marginTop:10}}><div className="wm-kicker">Reasons</div><ul className="wm-p" style={{paddingLeft:18,margin:0}}>{m.reasons.slice(0,6).map((r,i)=><li key={i} style={{marginTop:4}}>{r}</li>)}</ul></div>',
'                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12}}>',
'                        <div className="wm-p" style={{fontSize:12,opacity:0.7}}>Confidence is heuristic. Validate critical specs.</div>',
'                        <button className={"wm-btn "+(ok?"wm-btn-primary":"")} disabled={!ok} onClick={()=>{ if(!ok) return; if(addToBasket){ addToBasket({ sku:m.sku, name:m.name }); alert(`Added ${m.sku} to design basket`);} else alert(`Basket not available. (SKU: ${m.sku})`); }}>',
'                          {ok ? "Add to design" : "Blocked"}',
'                        </button>',
'                      </div>',
'                    </div>',
'                  );',
'                })}',
'              </div>',
'            </div>',
'          )}',
'        </div>',
'      </div>',
'    </div>',
'  );',
'}'
)

# Route hygiene (remove .tsx extension if present)
$appRoutes="src\AppRoutes.tsx"
if(Test-Path $appRoutes){
  Backup-File $appRoutes
  $txt=Read-Raw $appRoutes
  if($txt){
    $txt2=$txt -replace 'import\("(@\/pages\/tools\/CompetitorComparePage)\.tsx"\)', 'import("$1")'
    if($txt2 -ne $txt){ Write-Raw $appRoutes $txt2 }
  }
}

Write-Host ""
Write-Host "DONE: Competitor Compare upgraded (CSV import + rules + IO + feature scoring)." -ForegroundColor Green
Write-Host "Open: http://localhost:3000/tools/competitor-compare" -ForegroundColor Cyan