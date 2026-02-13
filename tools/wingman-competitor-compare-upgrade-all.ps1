# Wingman — Competitor Compare Upgrade (ALL THREE)
# 1) CSV Import (competitor list) + template download
# 2) Rules Engine upgrade (AVoIP vs HDBaseT intent, PoE/VLAN/IGMP, latency class, resolution)
# 3) Match by I/O counts + feature equivalence scoring with reasons
#
# Run:
#   Set-Location C:\Users\steve\wingman
#   pwsh -NoProfile -ExecutionPolicy Bypass -File tools\wingman-competitor-compare-upgrade-all.ps1
#   npm run dev
#
# Open:
#   http://localhost:3000/tools/competitor-compare

$ErrorActionPreference = "Stop"
$ROOT = "C:\Users\steve\wingman"
Set-Location $ROOT
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

# -------------------------------------------------------------------
# 0) Extend catalog types (optional fields: io/latency/features)
#    This is non-breaking: existing products remain valid.
# -------------------------------------------------------------------
$catTypes = "src\catalog\types.ts"
if(Test-Path $catTypes){
  $t = Read-Raw $catTypes
  if($t -and $t -notmatch "LatencyClass"){
    Backup-File $catTypes
    $t2 = $t + "`r`n" + (@(
      '',
      'export type LatencyClass = "ultra-low" | "low" | "standard" | "unknown";',
      'export type IOCaps = { inputs?: number; outputs?: number; };',
      '',
      '// Optional feature metadata (used by Competitor Compare scoring)',
      '// Keep optional so legacy catalog entries still work.',
      '// You can add these progressively to your catalog.json items.',
      ''
    ) -join "`r`n")

    # Insert new optional fields into Product type if present
    # Best-effort: add before closing "};" of Product type.
    if($t2 -match 'export type Product = \{'){
      $t2 = $t2 -replace '(\s*notes\?:\s*string\[\];\s*)', '$1  io?: IOCaps;' + "`r`n" + '  latency?: LatencyClass;' + "`r`n" + '  features?: string[];' + "`r`n"
    }
    Write-Raw $catTypes $t2
  }
}

# -------------------------------------------------------------------
# 1) Competitor types (adds io/latency/features)
# -------------------------------------------------------------------
$types = "src\competitor\types.ts"
Backup-File $types
Write-Utf8NoBom $types @(
'export type CompetitorCategory = "AVoIP" | "Matrix" | "Switcher" | "Extender" | "VideoWall" | "Control" | "Accessory";',
'export type CompetitorRole = "TX" | "RX" | "TRX" | "Controller" | "Processor" | "Matrix" | "Switcher" | "Accessory";',
'export type LatencyClass = "ultra-low" | "low" | "standard" | "unknown";',
'',
'export type CompetitorVideoCaps = {',
'  maxResolution?: "1080p60" | "4K30" | "4K60" | "4K120";',
'  hdmi?: "1.4" | "2.0" | "2.1";',
'  hdr?: boolean;',
'};',
'',
'export type IOCaps = {',
'  inputs?: number;',
'  outputs?: number;',
'};',
'',
'export type CompetitorItem = {',
'  brand: string;',
'  model: string;',
'  name: string;',
'  category: CompetitorCategory;',
'  role: CompetitorRole;',
'  tags?: string[];',
'  features?: string[]; // e.g. ["usb", "rs232", "ir", "poe", "multicast", "aes67"]',
'  latency?: LatencyClass;',
'  io?: IOCaps;',
'  video?: CompetitorVideoCaps;',
'  notes?: string[];',
'};',
'',
'export type MatchResult = {',
'  competitor: CompetitorItem;',
'  sku: string;',
'  name: string;',
'  confidence: number; // 0..100',
'  reasons: string[];',
'};'
)

# -------------------------------------------------------------------
# 2) CSV Importer (browser-side)
# -------------------------------------------------------------------
$csv = "src\competitor\csv.ts"
Backup-File $csv
Write-Utf8NoBom $csv @(
'import type { CompetitorItem } from "./types";',
'',
'function norm(s: string){ return (s || "").trim(); }',
'function normLower(s: string){ return norm(s).toLowerCase(); }',
'',
'function splitCsvLine(line: string): string[]{',
'  // Simple CSV splitter with quotes support.',
'  const out: string[] = [];',
'  let cur = "";',
'  let inQ = false;',
'  for(let i=0;i<line.length;i++){',
'    const ch = line[i];',
'    if(ch === `"`){',
'      if(inQ && line[i+1] === `"`){ cur += `"`; i++; continue; }',
'      inQ = !inQ; continue;',
'    }',
'    if(ch === "," && !inQ){ out.push(cur); cur = ""; continue; }',
'    cur += ch;',
'  }',
'  out.push(cur);',
'  return out.map(s => s.trim());',
'}',
'',
'function parseIntOrUndef(s: string): number | undefined {',
'  const n = parseInt(norm(s), 10);',
'  return Number.isFinite(n) ? n : undefined;',
'}',
'',
'export function competitorCsvTemplate(): string {
  return [
    "brand,model,name,category,role,maxResolution,hdmi,hdr,latency,inputs,outputs,tags,features,notes",
    "Crestron,DM-NVX-E30,AVoIP Encoder,AVoIP,TX,4K60,2.0,true,low,1,0,AVoIP;low-latency;managed-network,multicast;igmp;vlan,Example row",
    "Extron,NAV SD 501,AVoIP Decoder,AVoIP,RX,4K60,2.0,true,low,0,1,AVoIP;4K60,multicast;igmp,Example row"
  ].join("\n");
}

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

# -------------------------------------------------------------------
# 0) Extend catalog types (optional fields: io/latency/features)
#    This is non-breaking: existing products remain valid.
# -------------------------------------------------------------------
$catTypes = "src\catalog\types.ts"
if(Test-Path $catTypes){
  $t = Read-Raw $catTypes
  if($t -and $t -notmatch "LatencyClass"){
    Backup-File $catTypes
    $t2 = $t + "`r`n" + (@(
      '',
      'export type LatencyClass = "ultra-low" | "low" | "standard" | "unknown";',
      'export type IOCaps = { inputs?: number; outputs?: number; };',
      '',
      '// Optional feature metadata (used by Competitor Compare scoring)',
      '// Keep optional so legacy catalog entries still work.',
      '// You can add these progressively to your catalog.json items.',
      ''
    ) -join "`r`n")

    # Insert new optional fields into Product type if present
    # Best-effort: add before closing "};" of Product type.
    if($t2 -match 'export type Product = \{'){
      $t2 = $t2 -replace '(\s*notes\?:\s*string\[\];\s*)', '$1  io?: IOCaps;' + "`r`n" + '  latency?: LatencyClass;' + "`r`n" + '  features?: string[];' + "`r`n"
    }
    Write-Raw $catTypes $t2
  }
}

# -------------------------------------------------------------------
# 1) Competitor types (adds io/latency/features)
# -------------------------------------------------------------------
$types = "src\competitor\types.ts"
Backup-File $types
Write-Utf8NoBom $types @(
'export type CompetitorCategory = "AVoIP" | "Matrix" | "Switcher" | "Extender" | "VideoWall" | "Control" | "Accessory";',
'export type CompetitorRole = "TX" | "RX" | "TRX" | "Controller" | "Processor" | "Matrix" | "Switcher" | "Accessory";',
'export type LatencyClass = "ultra-low" | "low" | "standard" | "unknown";',
'',
'export type CompetitorVideoCaps = {',
'  maxResolution?: "1080p60" | "4K30" | "4K60" | "4K120";',
'  hdmi?: "1.4" | "2.0" | "2.1";',
'  hdr?: boolean;',
'};',
'',
'export type IOCaps = {',
'  inputs?: number;',
'  outputs?: number;',
'};',
'',
'export type CompetitorItem = {',
'  brand: string;',
'  model: string;',
'  name: string;',
'  category: CompetitorCategory;',
'  role: CompetitorRole;',
'  tags?: string[];',
'  features?: string[]; // e.g. ["usb", "rs232", "ir", "poe", "multicast", "aes67"]',
'  latency?: LatencyClass;',
'  io?: IOCaps;',
'  video?: CompetitorVideoCaps;',
'  notes?: string[];',
'};',
'',
'export type MatchResult = {',
'  competitor: CompetitorItem;',
'  sku: string;',
'  name: string;',
'  confidence: number; // 0..100',
'  reasons: string[];',
'};'
)

# -------------------------------------------------------------------
# 2) CSV Importer (browser-side)
# -------------------------------------------------------------------
$csv = "src\competitor\csv.ts"
Backup-File $csv
Write-Utf8NoBom $csv @(
'import type { CompetitorItem } from "./types";',
'',
'function norm(s: string){ return (s || "").trim(); }',
'function normLower(s: string){ return norm(s).toLowerCase(); }',
'',
'function splitCsvLine(line: string): string[]{',
'  // Simple CSV splitter with quotes support.',
'  const out: string[] = [];',
'  let cur = "";',
'  let inQ = false;',
'  for(let i=0;i<line.length;i++){',
'    const ch = line[i];',
'    if(ch === `"`){',
'      if(inQ && line[i+1] === `"`){ cur += `"`; i++; continue; }',
'      inQ = !inQ; continue;',
'    }',
'    if(ch === "," && !inQ){ out.push(cur); cur = ""; continue; }',
'    cur += ch;',
'  }',
'  out.push(cur);',
'  return out.map(s => s.trim());',
'}',
'',
'function parseIntOrUndef(s: string): number | undefined {',
'  const n = parseInt(norm(s), 10);',
'  return Number.isFinite(n) ? n : undefined;',
'}',
'',
'export function competitorCsvTemplate(): string {',
'  return [',
'    "brand,model,name,category,role,maxResolution,hdmi,hdr,latency,inputs,outputs,tags,features,notes",',
'    "Crestron,DM-NVX-E30,AVoIP Encoder,AVoIP,TX,4K60,2.0,true,low,1,0,\\"AVoIP;low-latency;managed-network\\",\\"multicast;igmp;vlan\\",\\"Example row\\""',',
'    "Extron,NAV SD 501,AVoIP Decoder,AVoIP,RX,4K60,2.0,true,low,0,1,\\"AVoIP;4K60\\",\\"multicast;igmp\\",\\"Example row\\""',
'  ].join("\\n");',
'}',
'',
'export function parseCompetitorCsv(text: string): { items: CompetitorItem[]; warnings: string[] } {',
'  const warnings: string[] = [];',
'  const lines = text.split(/\\r?\\n/).map(l => l.trim()).filter(Boolean);',
'  if(lines.length < 2) return { items: [], warnings: ["CSV has no data rows."] };',
'',
'  const header = splitCsvLine(lines[0]).map(normLower);',
'  const idx = (k: string) => header.indexOf(k);',
'',
'  const req = ["brand","model","name","category","role"];',
'  for(const r of req){ if(idx(r) < 0) warnings.push(`Missing column: ${r}`); }',
'',
'  const items: CompetitorItem[] = [];',
'  for(let r=1;r<lines.length;r++){',
'    const cols = splitCsvLine(lines[r]);',
'    const get = (k: string) => { const i = idx(k); return i >= 0 ? (cols[i] || "") : ""; };',
'',
'    const brand = norm(get("brand"));',
'    const model = norm(get("model"));',
'    const name = norm(get("name"));',
'    const category = norm(get("category")) as any;',
'    const role = norm(get("role")) as any;',
'    if(!brand || !model || !name || !category || !role){',
'      warnings.push(`Row ${r+1}: missing required fields (brand/model/name/category/role)`);',
'      continue;',
'    }',
'',
'    const tags = norm(get("tags")) ? norm(get("tags")).split(";").map(norm).filter(Boolean) : undefined;',
'    const features = norm(get("features")) ? norm(get("features")).split(";").map(norm).filter(Boolean) : undefined;',
'    const notes = norm(get("notes")) ? [norm(get("notes"))] : undefined;',
'',
'    const maxResolution = norm(get("maxResolution")) as any;',
'    const hdmi = norm(get("hdmi")) as any;',
'    const hdrRaw = normLower(get("hdr"));',
'    const hdr = hdrRaw === "true" || hdrRaw === "yes" || hdrRaw === "1" ? true : hdrRaw === "false" || hdrRaw === "no" || hdrRaw === "0" ? false : undefined;',
'    const latency = (norm(get("latency")) || "unknown") as any;',
'',
'    const inputs = parseIntOrUndef(get("inputs"));',
'    const outputs = parseIntOrUndef(get("outputs"));',
'',
'    items.push({',
'      brand, model, name, category, role,',
'      tags, features, latency,',
'      io: (inputs || outputs) ? { inputs, outputs } : undefined,',
'      video: (maxResolution || hdmi || hdr !== undefined) ? { maxResolution, hdmi, hdr } : undefined,',
'      notes',
'    });',
'  }',
'',
'  return { items, warnings };',
'}'
)

# -------------------------------------------------------------------
# 3) CompetitorStore (localStorage override)
# -------------------------------------------------------------------
$store = "src\competitor\CompetitorStore.ts"
Backup-File $store
Write-Utf8NoBom $store @(
'import type { CompetitorItem } from "./types";',
'import raw from "./competitors.json";',
'',
'const KEY = "wingman:competitors:v1";',
'const DEFAULTS: CompetitorItem[] = raw as any;',
'',
'export function loadCompetitors(): CompetitorItem[] {',
'  try {',
'    const txt = localStorage.getItem(KEY);',
'    if(!txt) return DEFAULTS;',
'    const parsed = JSON.parse(txt);',
'    if(Array.isArray(parsed)) return parsed as CompetitorItem[];',
'  } catch {',
'    // ignore',
'  }',
'  return DEFAULTS;',
'}',
'',
'export function saveCompetitors(items: CompetitorItem[]): void {',
'  localStorage.setItem(KEY, JSON.stringify(items));',
'}',
'',
'export function resetCompetitors(): void {',
'  localStorage.removeItem(KEY);',
'}'
)

# -------------------------------------------------------------------
# 4) Upgrade CompetitorMatchService (rules + I/O + feature equivalence)
# -------------------------------------------------------------------
$svc = "src\competitor\CompetitorMatchService.ts"
Backup-File $svc
Write-Utf8NoBom $svc @(
'import type { CompetitorItem, MatchResult } from "./types";',
'import { loadCompetitors } from "./CompetitorStore";',
'import { listAll, isSelectable } from "@/catalog/CatalogService";',
'import type { Product } from "@/catalog/types";',
'',
'function norm(s: string){ return (s || "").toLowerCase().trim(); }',
'',
'function scoreEnumMatch(a?: string, b?: string, points = 10, label = "Spec"){',
'  if(!a || !b) return { score: 0, reason: `${label}: unknown` };',
'  if(norm(a) === norm(b)) return { score: points, reason: `${label}: match` };',
'  return { score: -Math.round(points * 0.6), reason: `${label}: mismatch` };',
'}',
'',
'function scoreResolution(a?: string, b?: string){',
'  const order: Record<string, number> = { "1080p60": 1, "4K30": 2, "4K60": 3, "4K120": 4 };',
'  if(!a || !b) return { score: 0, reason: "Resolution: unknown" };',
'  const sa = order[a] || 0;',
'  const sb = order[b] || 0;',
'  if(sa === 0 || sb === 0) return { score: 0, reason: "Resolution: unknown enum" };',
'  if(sb >= sa) return { score: 14, reason: `Resolution: meets/exceeds ${a}` };',
'  return { score: -18, reason: `Resolution: below ${a}` };',
'}',
'',
'function overlap(a?: string[], b?: string[]){',
'  const A = new Set((a || []).map(norm));',
'  const B = new Set((b || []).map(norm));',
'  let hit = 0;',
'  for(const t of A){ if(B.has(t)) hit++; }',
'  return hit;',
'}',
'',
'function baseCategoryScore(cCat: string, p: Product){',
'  if(p.category === (cCat as any)) return { score: 34, reason: "Category: match" };',
'  if(cCat === "Switcher" && p.category === "Matrix") return { score: 16, reason: "Category: switcher/matrix adjacent" };',
'  if(cCat === "Matrix" && p.category === "Switcher") return { score: 16, reason: "Category: matrix/switcher adjacent" };',
'  return { score: -12, reason: "Category: mismatch" };',
'}',
'',
'function roleScore(cRole: string, p: Product){',
'  if(p.role === (cRole as any)) return { score: 20, reason: "Role: match" };',
'  if(cRole === "TX" && p.role === "TRX") return { score: 14, reason: "Role: TRX can act as TX" };',
'  if(cRole === "RX" && p.role === "TRX") return { score: 14, reason: "Role: TRX can act as RX" };',
'  return { score: -10, reason: "Role: mismatch" };',
'}',
'',
'function lifecyclePenalty(p: Product){',
'  if(p.lifecycle === "eol") return { score: -999, reason: "Lifecycle: EoL blocked" };',
'  if(p.lifecycle === "legacy") return { score: -8, reason: "Lifecycle: legacy penalty" };',
'  return { score: 0, reason: "Lifecycle: current" };',
'}',
'',
'function scoreIo(needIn?: number, needOut?: number, p?: any){',
'  // Only applies if numbers provided by competitor dataset AND present in catalog.',
'  const pi = p?.io?.inputs;',
'  const po = p?.io?.outputs;',
'  let score = 0;',
'  const reasons: string[] = [];',
'  if(typeof needIn === "number"){',
'    if(typeof pi === "number"){',
'      if(pi >= needIn){ score += 8; reasons.push(`I/O: inputs >= ${needIn}`); }',
'      else { score -= 10; reasons.push(`I/O: inputs < ${needIn}`); }',
'    } else { reasons.push("I/O: product inputs unknown"); }',
'  }',
'  if(typeof needOut === "number"){',
'    if(typeof po === "number"){',
'      if(po >= needOut){ score += 8; reasons.push(`I/O: outputs >= ${needOut}`); }',
'      else { score -= 10; reasons.push(`I/O: outputs < ${needOut}`); }',
'    } else { reasons.push("I/O: product outputs unknown"); }',
'  }',
'  return { score, reasons };',
'}',
'',
'function scoreLatency(c?: string, p?: any){',
'  // Ultra-low > low > standard > unknown',
'  const rank: Record<string, number> = { "ultra-low": 3, "low": 2, "standard": 1, "unknown": 0 };',
'  const cr = rank[norm(c || "unknown")] ?? 0;',
'  const pr = rank[norm(p?.latency || "unknown")] ?? 0;',
'  if(cr === 0 || pr === 0) return { score: 0, reason: "Latency: unknown" };',
'  if(pr >= cr) return { score: 8, reason: "Latency: meets/exceeds" };',
'  return { score: -10, reason: "Latency: below requirement" };',
'}',
'',
'function scoreFeatures(cFeat?: string[], pFeat?: string[]){',
'  const hits = overlap(cFeat, pFeat);',
'  if(!cFeat || cFeat.length === 0) return { score: 0, reason: "Features: none required" };',
'  if(hits === 0) return { score: -8, reason: "Features: no overlap" };',
'  const pts = Math.min(14, hits * 5);',
'  return { score: pts, reason: `Features: overlap x${hits}` };',
'}',
'',
'export function listCompetitors(): CompetitorItem[] {',
'  const items = loadCompetitors();',
'  return [...items].sort((a,b) => (a.brand+a.model).localeCompare(b.brand+b.model));',
'}',
'',
'export function searchCompetitors(q: string): CompetitorItem[] {',
'  const items = loadCompetitors();',
'  const s = norm(q);',
'  if(!s) return items;',
'  return items.filter(c => {',
'    const hay = norm([c.brand, c.model, c.name, c.category, c.role, ...(c.tags||[]), ...(c.features||[]), ...(c.notes||[])].join(" "));',
'    return hay.includes(s);',
'  });',
'}',
'',
'export function matchToCatalog(competitor: CompetitorItem, topN = 6): MatchResult[] {',
'  const catalog = listAll();',
'',
'  const scored = catalog.map(p => {',
'    let score = 0;',
'    const reasons: string[] = [];',
'',
'    const cat = baseCategoryScore(competitor.category, p); score += cat.score; reasons.push(cat.reason);',
'    const rol = roleScore(competitor.role, p); score += rol.score; reasons.push(rol.reason);',
'',
'    const res = scoreResolution(competitor.video?.maxResolution, (p as any).video?.maxResolution);',
'    score += res.score; if(res.score !== 0) reasons.push(res.reason);',
'',
'    const hd = scoreEnumMatch(competitor.video?.hdmi, (p as any).video?.hdmi, 6, "HDMI");',
'    score += hd.score; if(hd.score !== 0) reasons.push(hd.reason);',
'',
'    if(typeof competitor.video?.hdr === "boolean" && typeof (p as any).video?.hdr === "boolean"){',
'      const hdr = competitor.video.hdr === (p as any).video.hdr ? { score: 4, reason: "HDR: match" } : { score: -4, reason: "HDR: mismatch" };',
'      score += hdr.score; reasons.push(hdr.reason);',
'    }',
'',
'    // Tags influence: protocol intent (AVoIP, multicast, managed-network)',
'    const tagHits = overlap(competitor.tags, (p as any).tags);',
'    if(tagHits > 0){ score += Math.min(12, tagHits * 4); reasons.push(`Tags: overlap x${tagHits}`); }',
'',
'    // Feature equivalence',
'    const feat = scoreFeatures(competitor.features, (p as any).features);',
'    score += feat.score; reasons.push(feat.reason);',
'',
'    // Latency class',
'    const lat = scoreLatency(competitor.latency, p as any);',
'    score += lat.score; reasons.push(lat.reason);',
'',
'    // I/O counts (only if competitor provides them and catalog has them)',
'    const io = scoreIo(competitor.io?.inputs, competitor.io?.outputs, p as any);',
'    score += io.score; reasons.push(...io.reasons);',
'',
'    const life = lifecyclePenalty(p); score += life.score; reasons.push(life.reason);',
'',
'    // Confidence: map score to 0..100 (tuned for practical UX)',
'    const clamped = Math.max(-50, Math.min(80, score));',
'    const confidence = Math.max(0, Math.min(100, Math.round((clamped + 20) * 1.25)));',
'',
'    return { p, confidence, reasons };',
'  })',
'  .filter(x => x.confidence > 0)',
'  .sort((a,b) => b.confidence - a.confidence)',
'  .slice(0, topN);',
'',
'  return scored.map(x => ({',
'    competitor,',
'    sku: x.p.sku,',
'    name: x.p.name,',
'    confidence: x.confidence,',
'    reasons: x.reasons.filter(Boolean).slice(0, 8),',
'  }));',
'}',
'',
'export function canAddSku(sku: string): boolean {',
'  const p = listAll().find(x => x.sku === sku);',
'  if(!p) return false;',
'  return isSelectable(p);',
'}'
)

# -------------------------------------------------------------------
# 5) Ensure competitor dataset exists (keep your previous starter if present)
# -------------------------------------------------------------------
$dataset = "src\competitor\competitors.json"
if(!(Test-Path $dataset)){
  Write-Utf8NoBom $dataset @(
    '[{"brand":"Extron","model":"NAV E 501","name":"AV over IP Encoder","category":"AVoIP","role":"TX","tags":["AVoIP","4K60","managed-network"],"features":["multicast","igmp","vlan"],"latency":"low","io":{"inputs":1,"outputs":0},"video":{"maxResolution":"4K60","hdmi":"2.0","hdr":true}}]'
  )
}

# -------------------------------------------------------------------
# 6) Upgrade CompetitorComparePage UI:
#    - Search competitor list
#    - Import CSV
#    - Download CSV template
#    - Reset competitor list
#    - Show matches with confidence + reasons
# -------------------------------------------------------------------
$page = "src\pages\tools\CompetitorComparePage.tsx"
Backup-File $page
Write-Utf8NoBom $page @(
'import React, { useMemo, useState } from "react";',
'import type { CompetitorItem } from "@/competitor/types";',
'import { searchCompetitors, matchToCatalog, canAddSku } from "@/competitor/CompetitorMatchService";',
'import { parseCompetitorCsv, competitorCsvTemplate } from "@/competitor/csv";',
'import { saveCompetitors, resetCompetitors, loadCompetitors } from "@/competitor/CompetitorStore";',
'import { Chip } from "@/components/catalog/Chips";',
'',
'// Optional basket integration if present',
'let addToBasket: ((p: any)=>void) | null = null;',
'try {',
'  // eslint-disable-next-line @typescript-eslint/no-var-requires',
'  addToBasket = require("@/components/catalog/DesignBasket").addToBasket;',
'} catch {',
'  addToBasket = null;',
'}',
'',
'function downloadText(filename: string, text: string){',
'  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });',
'  const url = URL.createObjectURL(blob);',
'  const a = document.createElement("a");',
'  a.href = url;',
'  a.download = filename;',
'  document.body.appendChild(a);',
'  a.click();',
'  a.remove();',
'  URL.revokeObjectURL(url);',
'}',
'',
'export default function CompetitorComparePage(){',
'  const [q, setQ] = useState("");',
'  const [selected, setSelected] = useState<CompetitorItem | null>(null);',
'  const [importMsg, setImportMsg] = useState<string | null>(null);',
'',
'  const list = useMemo(() => searchCompetitors(q).slice(0, 40), [q]);',
'  const matches = useMemo(() => (selected ? matchToCatalog(selected, 6) : []), [selected]);',
'',
'  async function onImportCsv(file: File | null){',
'    if(!file) return;',
'    setImportMsg(null);',
'    const text = await file.text();',
'    const res = parseCompetitorCsv(text);',
'    if(res.warnings.length){',
'      setImportMsg("Imported with warnings: " + res.warnings.slice(0,4).join(" | "));',
'    } else {',
'      setImportMsg("Imported successfully.");',
'    }',
'    if(res.items.length){',
'      saveCompetitors(res.items);',
'      setSelected(null);',
'      setQ("");',
'    } else {',
'      setImportMsg((m)=> (m ? m + " " : "") + "No valid rows imported.");',
'    }',
'  }',
'',
'  function onReset(){',
'    resetCompetitors();',
'    setSelected(null);',
'    setQ("");',
'    setImportMsg("Reset to built-in competitor list.");',
'  }',
'',
'  function onExportCurrent(){',
'    const cur = loadCompetitors();',
'    downloadText("wingman_competitors_export.json", JSON.stringify(cur, null, 2));',
'  }',
'',
'  return (',
'    <div>',
'      <div className="wm-kicker">Tool</div>',
'      <div className="wm-h1" style={{ marginTop: 6 }}>Competitor Compare</div>',
'      <div className="wm-p" style={{ marginTop: 6 }}>',
'        Import competitor models (CSV) and get ranked WyreStorm matches with confidence + reasons.',
'      </div>',
'',
'      <div className="wm-divider" />',
'',
'      <div style={{ display: "grid", gridTemplateColumns: "440px 1fr", gap: 12, alignItems: "start" }}>',
'',
'        {/* LEFT: competitor search + import */}',
'        <div className="wm-card wm-card-pad">',
'          <div className="wm-section-title">Competitor list</div>',
'',
'          <div className="wm-field">',
'            <label>Search</label>',
'            <input className="wm-input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search brand/model/category/tags..." />',
'          </div>',
'',
'          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>',
'            <label className="wm-btn" style={{ cursor: "pointer" }}>',
'              Import CSV',
'              <input type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(e)=>onImportCsv(e.target.files?.[0] || null)} />',
'            </label>',
'            <button className="wm-btn" onClick={()=>downloadText("wingman_competitor_template.csv", competitorCsvTemplate())}>Download template</button>',
'            <button className="wm-btn" onClick={onExportCurrent}>Export current</button>',
'            <button className="wm-btn" onClick={onReset}>Reset list</button>',
'          </div>',
'',
'          {importMsg && <div className="wm-p" style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>{importMsg}</div>}',
'',
'          <div style={{ marginTop: 10, display: "grid", gap: 8, maxHeight: 520, overflow: "auto", paddingRight: 4 }}>',
'            {list.map((c) => (',
'              <button',
'                key={c.brand + c.model}',
'                className="wm-btn"',
'                style={{ justifyContent: "space-between" }}',
'                onClick={() => setSelected(c)}',
'              >',
'                <span style={{ textAlign: "left" }}>',
'                  <div style={{ fontWeight: 750 }}>{c.brand} — {c.model}</div>',
'                  <div style={{ opacity: 0.75, fontSize: 12 }}>',
'                    {c.category} • {c.role} • {c.name}',
'                  </div>',
'                </span>',
'                <span style={{ opacity: 0.7 }}>Select</span>',
'              </button>',
'            ))}',
'          </div>',
'        </div>',
'',
'        {/* RIGHT: matches */}',
'        <div>',
'          {!selected ? (',
'            <div className="wm-card wm-card-pad">',
'              <div className="wm-p">Select a competitor model to see ranked WyreStorm matches.</div>',
'              <div className="wm-p" style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>',
'                Tip: use CSV import to load your distributor’s competitor list for fast quoting support.',
'              </div>',
'            </div>',
'          ) : (',
'            <div>',
'              <div className="wm-card wm-card-pad wm-card-primary">',
'                <div className="wm-section-title">Selected competitor</div>',
'                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>',
'                  <div>',
'                    <div style={{ fontWeight: 850, fontSize: 16 }}>{selected.brand} — {selected.model}</div>',
'                    <div className="wm-p" style={{ marginTop: 4 }}>{selected.name}</div>',
'                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>',
'                      <Chip label={selected.category} />',
'                      <Chip label={selected.role} />',
'                      {selected.video?.maxResolution && <Chip label={selected.video.maxResolution} />}',
'                      {selected.latency && <Chip label={`Latency: ${selected.latency}`} />}',
'                      {(selected.features || []).slice(0,3).map(f => <Chip key={f} label={f} />)}',
'                    </div>',
'                  </div>',
'                </div>',
'              </div>',
'',
'              <div style={{ marginTop: 12 }} className="wm-grid wm-grid-3">',
'                {matches.map(m => {',
'                  const ok = canAddSku(m.sku);',
'                  return (',
'                    <div key={m.sku} className="wm-card wm-card-pad">',
'                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>',
'                        <div>',
'                          <div className="wm-kicker">WyreStorm match</div>',
'                          <div className="wm-h2" style={{ marginTop: 6 }}>{m.sku}</div>',
'                          <div className="wm-p" style={{ marginTop: 4, opacity: 0.9 }}>{m.name}</div>',
'                        </div>',
'                        <div style={{ display: "flex", alignItems: "flex-start" }}>',
'                          <Chip label={`${m.confidence}%`} tone={m.confidence >= 75 ? "accent" : "neutral"} />',
'                        </div>',
'                      </div>',
'',
'                      <div style={{ marginTop: 10, display: "grid", gap: 6 }}>',
'                        <div className="wm-kicker">Reasons</div>',
'                        <ul className="wm-p" style={{ paddingLeft: 18, margin: 0 }}>',
'                          {m.reasons.slice(0,6).map((r,i) => <li key={i} style={{ marginTop: 4 }}>{r}</li>)}',
'                        </ul>',
'                      </div>',
'',
'                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>',
'                        <div className="wm-p" style={{ fontSize: 12, opacity: 0.7 }}>Confidence is a heuristic. Validate critical specs.</div>',
'                        <button',
'                          className={"wm-btn " + (ok ? "wm-btn-primary" : "")}',
'                          onClick={() => {',
'                            if(!ok) return;',
'                            if(addToBasket){ addToBasket({ sku: m.sku, name: m.name }); alert(`Added ${m.sku} to design basket`); }',
'                            else { alert(`Basket not available. (SKU: ${m.sku})`); }',
'                          }}',
'                          disabled={!ok}',
'                        >',
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

# -------------------------------------------------------------------
# 7) Ensure AppRoutes import doesn’t include ".tsx" for CompetitorComparePage
# -------------------------------------------------------------------
$appRoutes = "src\AppRoutes.tsx"
if(Test-Path $appRoutes){
  Backup-File $appRoutes
  $txt = Read-Raw $appRoutes
  if($txt){
    $txt2 = $txt -replace 'import\("(@\/pages\/tools\/CompetitorComparePage)\.tsx"\)', 'import("$1")'
    $txt2 = $txt2 -replace 'import\("(@\/pages\/tools\/CompetitorComparePage)\.tsx"\);', 'import("$1");'
    if($txt2 -ne $txt){ Write-Raw $appRoutes $txt2 }
  }
}

Write-Host ""
Write-Host "Competitor Compare upgraded: CSV import + rules + I/O + feature scoring." -ForegroundColor Green
Write-Host "Open: http://localhost:3000/tools/competitor-compare" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next recommended: add io/latency/features fields into src/catalog/catalog.json entries for higher confidence scoring." -ForegroundColor Yellow
