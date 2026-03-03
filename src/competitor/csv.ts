import type { CompetitorItem } from "./types";
function norm(s: string){ return (s || "").trim(); }
function lower(s: string){ return norm(s).toLowerCase(); }
function splitCsvLine(line: string): string[]{
  const out: string[] = []; let cur=""; let inQ=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch === `"`){ if(inQ && line[i+1]===`"`){ cur+=`"`; i++; continue; } inQ=!inQ; continue; }
    if(ch === "," && !inQ){ out.push(cur); cur=""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map(s=>s.trim());
}
function intOrUndef(s: string){ const n=parseInt(norm(s),10); return Number.isFinite(n)?n:undefined; }
export function competitorCsvTemplate(): string {
  return [
    "brand,model,name,category,role,maxResolution,hdmi,hdr,latency,inputs,outputs,tags,features,notes",
    "Crestron,DM-NVX-E30,AVoIP Encoder,AVoIP,TX,4K60,2.0,true,low,1,0,AVoIP;low-latency;managed-network,multicast;igmp;vlan,Example row",
    "Extron,NAV SD 501,AVoIP Decoder,AVoIP,RX,4K60,2.0,true,low,0,1,AVoIP;4K60,multicast;igmp,Example row"
  ].join("\\n");
}
export function parseCompetitorCsv(text: string): { items: CompetitorItem[]; warnings: string[] } {
  const warnings: string[] = [];
  const lines = text.split(/\\r?\\n/).map(l=>l.trim()).filter(Boolean);
  if(lines.length < 2) return { items: [], warnings: ["CSV has no data rows."] };
  const header = splitCsvLine(lines[0]).map(lower);
  const idx = (k: string) => header.indexOf(k);
  const req = ["brand","model","name","category","role"];
  for(const r of req){ if(idx(r) < 0) warnings.push(`Missing column: ${r}`); }
  const items: CompetitorItem[] = [];
  for(let r=1;r<lines.length;r++){
    const cols = splitCsvLine(lines[r]);
    const get = (k: string) => { const i=idx(k); return i>=0 ? (cols[i]||"") : ""; };
    const brand=norm(get("brand")); const model=norm(get("model")); const name=norm(get("name"));
    const category=norm(get("category")) as any; const role=norm(get("role")) as any;
    if(!brand||!model||!name||!category||!role){ warnings.push(`Row ${r+1}: missing required fields`); continue; }
    const tags = norm(get("tags")) ? norm(get("tags")).split(";").map(norm).filter(Boolean) : undefined;
    const features = norm(get("features")) ? norm(get("features")).split(";").map(norm).filter(Boolean) : undefined;
    const notes = norm(get("notes")) ? [norm(get("notes"))] : undefined;
    const maxResolution = norm(get("maxResolution")) as any;
    const hdmi = norm(get("hdmi")) as any;
    const hdrRaw = lower(get("hdr"));
    const hdr = hdrRaw==="true"||hdrRaw==="yes"||hdrRaw==="1" ? true : hdrRaw==="false"||hdrRaw==="no"||hdrRaw==="0" ? false : undefined;
    const latency = (norm(get("latency")) || "unknown") as any;
    const inputs=intOrUndef(get("inputs")); const outputs=intOrUndef(get("outputs"));
    items.push({
      brand, model, name, category, role, tags, features, latency,
      io: (typeof inputs==="number" || typeof outputs==="number") ? { inputs, outputs } : undefined,
      video: (maxResolution || hdmi || typeof hdr==="boolean") ? { maxResolution, hdmi, hdr } : undefined,
      notes
    });
  }
  return { items, warnings };
}
