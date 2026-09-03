import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeJsonFileAtomic } from "../atomic-json-file.mjs";
import { resolveCompetitorIntelligence } from "../competitor/compare-intelligence.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const draftsFile = path.join(repoRoot, "data", "product-intelligence-drafts.json");
const wyrestormProductFiles = [
  "data/wingman-canonical-product-store.json"
];

function nowIso() { return new Date().toISOString(); }
function tidy(v) { return String(v ?? "").trim(); }
function clean(v) { return tidy(v).replace(/\s+/g, " "); }
function sku(v) { return clean(v).toUpperCase(); }
function key(v) { return clean(v).toLowerCase().replace(/[^a-z0-9]+/g, ""); }
function uid(prefix="row") { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,9)}`; }
function arr(v) { return Array.isArray(v) ? v : []; }
function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
function clamp(v,min,max,fallback) { const n=Number(v); if(!Number.isFinite(n)) return fallback; return Math.min(max,Math.max(min,n)); }

async function readJson(file, fallback) { try { return JSON.parse(await fs.readFile(file,"utf8")); } catch { return fallback; } }
async function writeJson(file, value) { await writeJsonFileAtomic(file, value); }
async function readDrafts() { const rows = await readJson(draftsFile, []); return Array.isArray(rows) ? rows : []; }
async function writeDrafts(rows) { const sorted=[...rows].sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||""))); await writeJson(draftsFile, sorted.slice(0,5000)); return sorted; }

function defaultApprovedFor() { return { finder:false, compare:false, proposal:false, pitch:false }; }
function defaultFeatures() {
  return {
    mst:false, wirelessCasting:false, ndi:false, dante:false, multiview:false, videoWall:false, scaling:false, seamless:false,
    hdbaset:false, hdbasetClass:"", avoip:false, networkSpeed:"",
    usb2:false, usb3:false, usbHostCount:0, usbPeripheralCount:0, kvm:false,
    audioDeEmbed:false, audioEmbed:false, audioDsp:false, micInputs:0, phantomPower:false,
    ir:false, rs232:false, telnet:false, ipControl:false, relays:0
  };
}

function draftId(sourceType, brand, model) { return `${sourceType}:${key(brand||"unknown")}:${sku(model)}`; }
function confidencePercent(...values) {
  const nums = values.map(Number).filter(Number.isFinite);
  if (!nums.length) return 30;
  const top = Math.max(...nums);
  return Math.round(clamp(top <= 1 ? top * 100 : top, 0, 100, 30));
}

function connectorName(value) {
  const text = clean(value); const low = text.toLowerCase();
  if (low === "hdmi") return "HDMI";
  if (low === "hdbaset" || low === "hdbt") return "HDBaseT";
  if (low === "rj45" || low === "lan" || low === "ethernet") return "RJ45";
  if (low === "usbc" || low === "usb-c") return "USB-C";
  if (low === "rs232") return "RS-232";
  if (low === "ir") return "IR";
  return text || "Unknown";
}

function connection(side, label, connector, count, notes) {
  return { id:uid("conn"), side, label, connector, count:Math.max(0, Number(count)||0), notes:clean(notes) };
}

function mapGroup(group, side, prefix) {
  return Object.entries(obj(group))
    .filter(([,v]) => v !== false && v !== null && v !== undefined && v !== "")
    .map(([k,v]) => connection(side, `${prefix} ${connectorName(k)}`, connectorName(k), typeof v === "number" ? v : 1, "Auto-extracted; verify against datasheet before approval."));
}

function profileConnections(profile = {}) {
  const p = obj(profile);
  const rows = [
    ...mapGroup(p.videoInputs, "input", "Video input"),
    ...mapGroup(p.videoOutputs, "output", "Video output"),
    ...mapGroup(p.control, "control", "Control"),
    ...mapGroup(p.audio, "audio", "Audio")
  ];
  const net = obj(p.network);
  if (Object.keys(net).length) rows.push(connection("network","Network / transport",net.transport || "LAN / network",1,[net.codec,net.bitrateClass].filter(Boolean).join(" ")));
  const usb = obj(p.usb);
  if (usb.usb2 || usb.usb3) rows.push(connection("usb", usb.usb3 ? "USB 3.x path" : "USB 2.0 path", usb.usb3 ? "USB 3.x" : "USB 2.0", 1, "USB direction, host count and peripheral count must be verified."));
  return rows;
}

function profileFeatures(profile = {}, evidence = "") {
  const p = obj(profile), pf = obj(p.features), usb = obj(p.usb), audio = obj(p.audio), control = obj(p.control), net = obj(p.network);
  const text = String(evidence || "");
  const f = defaultFeatures();
  f.wirelessCasting = Boolean(pf.wirelessCasting || /airplay|miracast|chromecast|wireless\s+presentation|casting/i.test(text));
  f.ndi = Boolean(pf.ndi || /\bndi\b/i.test(text));
  f.dante = Boolean(audio.dante || /\bdante\b/i.test(text));
  f.multiview = Boolean(pf.multiview);
  f.videoWall = Boolean(pf.videoWall);
  f.scaling = Boolean(pf.scaling);
  f.seamless = Boolean(pf.seamless || /seamless/i.test(text));
  f.hdbaset = Boolean(pf.hdbasetExtension || /hdbaset|hdbt/i.test(text));
  f.avoip = Boolean(/av\s*over\s*ip|avoip|encoder|decoder|transceiver|networkhd|nav\s*[ed]/i.test(text) || net.transport);
  f.networkSpeed = clean(net.transport || net.bitrateClass || "");
  f.usb2 = Boolean(usb.usb2);
  f.usb3 = Boolean(usb.usb3);
  f.usbHostCount = usb.usb2 || usb.usb3 ? 1 : 0;
  f.usbPeripheralCount = usb.usb2 || usb.usb3 ? 1 : 0;
  f.kvm = Boolean(pf.kvm || /kvm/i.test(text));
  f.audioDeEmbed = Boolean(audio.audioDeEmbedding || /de[-\s]?embed/i.test(text));
  f.audioEmbed = Boolean(audio.audioEmbedding || /embed/i.test(text));
  f.audioDsp = Boolean(audio.audioDsp || /\bdsp\b|aec|automix/i.test(text));
  f.micInputs = audio.micInput ? 1 : 0;
  f.phantomPower = /phantom\s+power|48v/i.test(text);
  f.ir = Boolean(control.ir);
  f.rs232 = Boolean(control.rs232);
  f.telnet = /telnet/i.test(text);
  f.ipControl = Boolean(control.lan || pf.webUi || /ip\s+control|web\s*ui|webui|lan/i.test(text));
  f.relays = Number(control.relay || control.relays || 0) || 0;
  if (f.hdbaset && /hdbaset\s*3|hdbt\s*3|usb\s*3|4k60\s*4\s*:?\s*4\s*:?\s*4/i.test(text)) f.hdbasetClass = "HDBaseT 3.0 / 4K60 class";
  return f;
}

function softwareConnections(text = "") {
  const out = [];
  const tests = [
    ["NDI", /\bndi\b/i], ["AirPlay", /\bairplay\b/i], ["Miracast", /\bmiracast\b/i],
    ["Chromecast", /\bchromecast\b/i], ["Dante", /\bdante\b/i], ["AES67", /\baes67\b/i],
    ["Microsoft Teams", /\bteams\b|\bmtr\b|microsoft\s+teams/i], ["Zoom", /\bzoom\b/i],
    ["Web UI", /web\s*ui|webui|browser[-\s]?based|web\s+gui/i]
  ];
  for (const [label, rx] of tests) if (rx.test(text)) out.push(label);
  return Array.from(new Set(out));
}

function evidenceRows(result, input) {
  const rows = [];
  if (clean(input.productUrl || input.url)) rows.push({ id:uid("ev"), sourceType:"manufacturer-page", title:"User supplied product URL", url:clean(input.productUrl || input.url), notes:"Provided by user or calling workflow." });
  if (clean(input.rawText || input.notes || input.description)) rows.push({ id:uid("ev"), sourceType:"user-note", title:"User supplied text / datasheet extraction", url:"", notes:clean(input.rawText || input.notes || input.description).slice(0,1000) });
  for (const source of arr(result?.evidence?.sources).slice(0,12)) {
    rows.push({ id:uid("ev"), sourceType:source.ok ? "search-result" : "user-note", title:clean(source.title || source.url || "Discovered source"), url:clean(source.url), notes:clean(source.excerpt || "") });
  }
  if (!rows.length) rows.push({ id:uid("ev"), sourceType:"manual-entry", title:"Auto-build seed", url:"", notes:"No external evidence source was available. Add a datasheet, URL or manual extract before approval." });
  return rows;
}

function statusFor(confidence, usefulPages, hasRawText) {
  if (confidence >= 70 && (usefulPages > 0 || hasRawText)) return "needs-review";
  return "draft";
}

function purposeFrom(result) {
  const c = obj(result?.competitor);
  const category = clean(c.categoryLabel);
  const label = clean(c.purposeLabel);
  if (category && label) return `${category}. ${label}.`;
  return label || category || "Product purpose requires review.";
}

function draftFromResolve(result, input, sourceType) {
  const c = obj(result?.competitor), q = obj(result?.query), profile = obj(c.specProfile);
  const brand = clean(input.brand || q.brand || c.brand || (sourceType === "wyrestorm" ? "WyreStorm" : ""));
  const model = sku(input.sku || q.sku || c.sku);
  const productName = clean(input.productName || q.productName || c.productName || model);
  const evidenceText = [brand, model, productName, input.productUrl || input.url, input.rawText, JSON.stringify(profile)].filter(Boolean).join("\n");
  const usefulPages = Number(result?.evidence?.usefulPages || 0);
  const confidence = confidencePercent(c.categoryConfidence, usefulPages > 0 ? 0.62 : 0, profile.verifiedSource ? 0.9 : 0);

  return {
    id:draftId(sourceType, brand, model),
    sourceType,
    brand,
    sku:model,
    productName,
    productClass:clean(c.category || "unclassified"),
    productRole:clean(c.purposeRole || "unknown"),
    purpose:purposeFrom(result),
    family:"",
    confidence,
    reviewStatus:statusFor(confidence, usefulPages, Boolean(clean(input.rawText))),
    approvedFor:defaultApprovedFor(),
    physicalConnections:profileConnections(profile),
    softwareConnections:softwareConnections(evidenceText),
    features:profileFeatures(profile, evidenceText),
    relationships:arr(result?.wyrestorm?.candidates).slice(0,8).map(candidate => ({
      id:uid("rel"), relationshipType:"alternative-to", brand:"WyreStorm", sku:sku(candidate.sku),
      notes:clean([candidate.name, candidate.purposeMatch, ...arr(candidate.reasons)].filter(Boolean).join(" | "))
    })),
    evidence:evidenceRows(result, input),
    reviewNotes:[
      "Auto-built draft. Verify connector counts, USB direction, control features and product role before approving.",
      result?.wyrestorm?.message ? `WyreStorm match note: ${result.wyrestorm.message}` : ""
    ].filter(Boolean).join("\n"),
    createdAt:nowIso(),
    updatedAt:nowIso(),
    autoBuild:{ mode:"compare-intelligence", query:q, competitor:c, wyrestorm:result?.wyrestorm || null, evidenceSummary:result?.evidence || null }
  };
}

async function upsertDraft(draft) {
  const rows = await readDrafts();
  const i = rows.findIndex(r => r.id === draft.id);
  const now = nowIso();
  if (i >= 0) {
    const old = rows[i];
    rows[i] = { ...old, ...draft, createdAt:old.createdAt || draft.createdAt || now, updatedAt:now, reviewStatus:old.reviewStatus === "approved" ? "needs-review" : draft.reviewStatus };
  } else {
    rows.unshift({ ...draft, createdAt:draft.createdAt || now, updatedAt:now });
  }
  await writeDrafts(rows);
  return rows.find(r => r.id === draft.id) || draft;
}

function productRecord(record) {
  if (!record || typeof record !== "object") return null;
  const model = sku(record.sku || record.SKU || record.model || record.Model || record.partNumber || record.id);
  const name = clean(record.name || record.title || record.productName || record.description || model);
  if (!model && !name) return null;
  const family = clean(record.family || record.series || record.category || record.type || record.productFamily);
  const text = [model, name, family, record.category, record.type, record.description, record.shortDescription, record.longDescription, record.summary, JSON.stringify(record)].filter(Boolean).join(" ");
  return { sku:model, name, family, text, raw:record };
}

function collectProducts(value, products = []) {
  if (Array.isArray(value)) { for (const item of value) collectProducts(item, products); return products; }
  if (!value || typeof value !== "object") return products;
  const direct = productRecord(value);
  if (direct?.sku || direct?.name) products.push(direct);
  for (const k of ["products","items","data","index","records","nodes"]) if (value[k]) collectProducts(value[k], products);
  return products;
}

async function loadWyrestormProducts() {
  const found = [];
  for (const rel of wyrestormProductFiles) {
    try {
      const products = collectProducts(JSON.parse(await fs.readFile(path.join(repoRoot, rel), "utf8"))).filter(Boolean);
      for (const product of products) found.push({ ...product, sourceFile:rel });
    } catch {}
  }
  const deduped = new Map();
  for (const p of found) { const k=sku(p.sku || p.name); if(k && !deduped.has(k)) deduped.set(k,p); }
  return Array.from(deduped.values()).filter(
    (product) => product?.raw?.dataMaintenance?.approvedFor?.compare !== false,
  );
}

async function buildCompetitorDraft(input = {}) {
  const brand = clean(input.brand || input.manufacturer || input.vendor);
  const model = sku(input.sku || input.model || input.partNumber);
  const productName = clean(input.productName || input.name || input.title);
  const productUrl = clean(input.productUrl || input.url || input.vendorUrl || input.productPageUrl);
  const rawText = clean(input.rawText || input.notes || input.description);
  if (!brand || !model) return { ok:false, error:"Brand and SKU are required to auto-build a competitor intelligence draft." };

  const result = await resolveCompetitorIntelligence({ brand, sku:model, productName, productUrl, rawText, allowWeb: input.allowWeb !== false });
  const saved = await upsertDraft(draftFromResolve(result, { brand, sku:model, productName, productUrl, rawText }, "competitor"));
  return { ok:true, mode:"competitor-auto-build", record:saved, compareIntelligence:result, file:draftsFile, warnings:["Auto-built draft. Review before approval.", ...(result?.evidence?.usefulPages ? [] : ["No confirmed product page. Add datasheet, URL or manual extract."])] };
}

async function buildWyrestormDraft(input = {}) {
  const model = sku(input.sku || input.model || input.partNumber);
  const productName = clean(input.productName || input.name || input.title);
  if (!model) return { ok:false, error:"WyreStorm SKU is required." };

  const products = await loadWyrestormProducts();
  const product = products.find(p => sku(p.sku) === model) || products.find(p => sku(p.sku || p.name).includes(model)) || null;
  const rawText = product ? [product.sku, product.name, product.family, product.text, JSON.stringify(product.raw)].filter(Boolean).join("\n") : clean(input.rawText || input.notes || input.description || "");
  const result = await resolveCompetitorIntelligence({ brand:"WyreStorm", sku:model, productName:productName || product?.name || model, rawText, allowWeb: input.allowWeb === true });
  const draft = draftFromResolve(result, { brand:"WyreStorm", sku:model, productName:productName || product?.name || model, rawText }, "wyrestorm");
  draft.family = product?.family || draft.family;
  draft.reviewNotes = [product ? `Built from local WyreStorm product source: ${product.sourceFile}.` : "No matching local WyreStorm product was found.", draft.reviewNotes].filter(Boolean).join("\n");
  if (product) draft.evidence.unshift({ id:uid("ev"), sourceType:"catalog", title:"Local WyreStorm product index", url:product.sourceFile, notes:"Local product index source used to seed this draft." });
  const saved = await upsertDraft(draft);
  return { ok:true, mode:"wyrestorm-auto-build", record:saved, matchedLocalProduct:Boolean(product), localProduct:product ? { sku:product.sku, name:product.name, family:product.family, sourceFile:product.sourceFile } : null, compareIntelligence:result, file:draftsFile, warnings:["WyreStorm record staged for review. Verify mixed-use behaviour and compatibility before approving."] };
}

export async function handleIntelligenceDraftsGet(req, res, url, { sendJson }) {
  const q = clean(url.searchParams.get("q")).toLowerCase();
  const status = clean(url.searchParams.get("status"));
  const sourceType = clean(url.searchParams.get("sourceType"));
  let records = await readDrafts();
  if (status) records = records.filter(r => r.reviewStatus === status);
  if (sourceType) records = records.filter(r => r.sourceType === sourceType);
  if (q) records = records.filter(r => [r.brand,r.sku,r.productName,r.productClass,r.productRole,r.purpose,r.reviewStatus].join(" ").toLowerCase().includes(q));
  sendJson(res, 200, { ok:true, count:records.length, records, file:draftsFile });
}

export async function handleIntelligenceDraftBuildCompetitorPost(req, res, url, { sendJson, parseJsonBody }) {
  let body = {};
  try { body = await parseJsonBody(req); } catch { sendJson(res, 400, { ok:false, error:"Invalid JSON body." }); return; }
  const result = await buildCompetitorDraft(body);
  sendJson(res, result.ok ? 200 : 400, result);
}

export async function handleIntelligenceDraftBuildWyrestormPost(req, res, url, { sendJson, parseJsonBody }) {
  let body = {};
  try { body = await parseJsonBody(req); } catch { sendJson(res, 400, { ok:false, error:"Invalid JSON body." }); return; }
  const result = await buildWyrestormDraft(body);
  sendJson(res, result.ok ? 200 : 400, result);
}

export async function handleIntelligenceDraftStatusPost(req, res, url, { sendJson, parseJsonBody }) {
  let body = {};
  try { body = await parseJsonBody(req); } catch { sendJson(res, 400, { ok:false, error:"Invalid JSON body." }); return; }
  const id = clean(body.id), reviewStatus = clean(body.reviewStatus || body.status);
  const allowed = new Set(["draft","needs-review","approved","rejected"]);
  const records = await readDrafts();
  const index = records.findIndex(r => r.id === id);
  if (index < 0) { sendJson(res,404,{ok:false,error:"Draft record not found."}); return; }
  if (reviewStatus && !allowed.has(reviewStatus)) { sendJson(res,400,{ok:false,error:"Invalid review status."}); return; }
  records[index] = { ...records[index], reviewStatus:reviewStatus || records[index].reviewStatus, approvedFor: body.approvedFor && typeof body.approvedFor === "object" ? { ...records[index].approvedFor, ...body.approvedFor } : records[index].approvedFor, reviewNotes:clean(body.reviewNotes || body.notes || records[index].reviewNotes), updatedAt:nowIso() };
  await writeDrafts(records);
  sendJson(res,200,{ ok:true, record:records[index], file:draftsFile });
}
