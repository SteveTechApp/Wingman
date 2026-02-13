import React, { useMemo, useState } from "react";
import type { CompetitorItem } from "@/competitor/types";
import { searchCompetitors, matchToCatalog, canAddSku } from "@/competitor/CompetitorMatchService";
import { parseCompetitorCsv, competitorCsvTemplate } from "@/competitor/csv";
import { saveCompetitors, resetCompetitors, loadCompetitors } from "@/competitor/CompetitorStore";
import { Chip } from "@/components/catalog/Chips";
let addToBasket: ((p: any)=>void) | null = null;
try { addToBasket = require("@/components/catalog/DesignBasket").addToBasket; } catch { addToBasket = null; }
function downloadText(filename: string, text: string){ const blob=new Blob([text],{type:"text/plain;charset=utf-8"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
export default function CompetitorComparePage(){
  const [q,setQ]=useState("");
  const [selected,setSelected]=useState<CompetitorItem|null>(null);
  const [msg,setMsg]=useState<string|null>(null);
  const list=useMemo(()=>searchCompetitors(q).slice(0,40),[q]);
  const matches=useMemo(()=>selected?matchToCatalog(selected,6):[],[selected]);
  async function onImportCsv(file: File|null){ if(!file) return; setMsg(null); const text=await file.text(); const res=parseCompetitorCsv(text); if(res.items.length){ saveCompetitors(res.items); setSelected(null); setQ(""); setMsg(res.warnings.length?("Imported with warnings: "+res.warnings.slice(0,3).join(" | ")):"Imported successfully."); } else { setMsg("No valid rows imported. "+(res.warnings[0]||"")); } }
  function onReset(){ resetCompetitors(); setSelected(null); setQ(""); setMsg("Reset to built-in competitor list."); }
  function onExport(){ downloadText("wingman_competitors_export.json", JSON.stringify(loadCompetitors(), null, 2)); }
  return (
    <div>
      <div className="wm-kicker">Tool</div>
      <div className="wm-h1" style={{marginTop:6}}>Competitor Compare</div>
      <div className="wm-p" style={{marginTop:6}}>Import competitor models (CSV) and get ranked WyreStorm matches with confidence + reasons.</div>
      <div className="wm-divider" />
      <div style={{display:"grid",gridTemplateColumns:"440px 1fr",gap:12,alignItems:"start"}}>
        <div className="wm-card wm-card-pad">
          <div className="wm-section-title">Competitor list</div>
          <div className="wm-field"><label>Search</label><input className="wm-input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search brand/model/category/tags..." /></div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:10}}>
            <label className="wm-btn" style={{cursor:"pointer"}}>Import CSV<input type="file" accept=".csv,text/csv" style={{display:"none"}} onChange={(e)=>onImportCsv(e.target.files?.[0]||null)} /></label>
            <button className="wm-btn" onClick={()=>downloadText("wingman_competitor_template.csv", competitorCsvTemplate())}>Download template</button>
            <button className="wm-btn" onClick={onExport}>Export current</button>
            <button className="wm-btn" onClick={onReset}>Reset list</button>
          </div>
          {msg && <div className="wm-p" style={{marginTop:8,fontSize:12,opacity:0.85}}>{msg}</div>}
          <div style={{marginTop:10,display:"grid",gap:8,maxHeight:520,overflow:"auto",paddingRight:4}}>
            {list.map(c=>(
              <button key={c.brand+c.model} className="wm-btn" style={{justifyContent:"space-between"}} onClick={()=>setSelected(c)}>
                <span style={{textAlign:"left"}}>
                  <div style={{fontWeight:750}}>{c.brand} — {c.model}</div>
                  <div style={{opacity:0.75,fontSize:12}}>{c.category} • {c.role} • {c.name}</div>
                </span>
                <span style={{opacity:0.7}}>Select</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          {!selected ? (
            <div className="wm-card wm-card-pad"><div className="wm-p">Select a competitor model to see ranked WyreStorm matches.</div></div>
          ) : (
            <div>
              <div className="wm-card wm-card-pad wm-card-primary">
                <div className="wm-section-title">Selected competitor</div>
                <div style={{fontWeight:850,fontSize:16}}>{selected.brand} — {selected.model}</div>
                <div className="wm-p" style={{marginTop:4}}>{selected.name}</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
                  <Chip label={selected.category} />
                  <Chip label={selected.role} />
                  {selected.video?.maxResolution && <Chip label={selected.video.maxResolution} />}
                  {selected.latency && <Chip label={`Latency: ${selected.latency}`} />}
                  {(selected.features||[]).slice(0,3).map(f => <Chip key={f} label={f} />)}
                </div>
              </div>
              <div style={{marginTop:12}} className="wm-grid wm-grid-3">
                {matches.map(m=>{
                  const ok=canAddSku(m.sku);
                  return (
                    <div key={m.sku} className="wm-card wm-card-pad">
                      <div style={{display:"flex",justifyContent:"space-between",gap:10}}>
                        <div><div className="wm-kicker">WyreStorm match</div><div className="wm-h2" style={{marginTop:6}}>{m.sku}</div><div className="wm-p" style={{marginTop:4,opacity:0.9}}>{m.name}</div></div>
                        <div style={{display:"flex",alignItems:"flex-start"}}><Chip label={`${m.confidence}%`} tone={m.confidence>=75?"accent":"neutral"} /></div>
                      </div>
                      <div style={{marginTop:10}}><div className="wm-kicker">Reasons</div><ul className="wm-p" style={{paddingLeft:18,margin:0}}>{m.reasons.slice(0,6).map((r,i)=><li key={i} style={{marginTop:4}}>{r}</li>)}</ul></div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12}}>
                        <div className="wm-p" style={{fontSize:12,opacity:0.7}}>Confidence is heuristic. Validate critical specs.</div>
                        <button className={"wm-btn "+(ok?"wm-btn-primary":"")} disabled={!ok} onClick={()=>{ if(!ok) return; if(addToBasket){ addToBasket({ sku:m.sku, name:m.name }); alert(`Added ${m.sku} to design basket`);} else alert(`Basket not available. (SKU: ${m.sku})`); }}>
                          {ok ? "Add to design" : "Blocked"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
