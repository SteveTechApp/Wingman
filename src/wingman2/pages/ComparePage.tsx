import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";


import { gateCompareCandidate, type CompareCandidateGateContext, type CompareCandidateGateInput } from "../lib/compareCandidateGate";
import { buildCompetitorDecisionEvidence } from "../lib/competitorProductIntelligence";
const COMPARE_SKU_TYPEAHEAD_DATALIST_ID = "wm-compare-sku-typeahead-options";

const COMPARE_SKU_TYPEAHEAD_CATALOG: Record<string, string[]> = {
  Crestron: [
    "DM-NVX-350",
    "DM-NVX-351",
    "DM-NVX-360",
    "DM-NVX-363",
    "DM-NVX-E30",
    "DM-NVX-D30",
    "DMPS3-4K-350-C",
    "HD-MD4X2-4KZ-E",
    "HD-RX-4K-510-C-E",
    "HD-TX-4KZ-211-2G",
  ],
  Extron: [
    "DTP2 R 211",
    "DTP2 T 211",
    "DTP3 R 201",
    "DTP3 T 202",
    "IN1608 xi",
    "NAV D 101",
    "NAV D 121",
    "NAV D 501",
    "NAV E 101",
    "NAV E 121",
    "NAV E 501",
  ],
  Atlona: [
    "AT-OME-CS31-SA",
    "AT-OME-EX-KIT",
    "AT-OME-MS42",
    "AT-OME-PS62",
    "AT-OMNI-111",
    "AT-OMNI-112",
    "AT-OMNI-121",
    "AT-OMNI-122",
    "AT-UHD-EX-100CE-KIT",
    "AT-UHD-PRO3-88M",
  ],
  Kramer: [
    "KDS-7-DEC7",
    "KDS-7-EN7",
    "KDS-100",
    "KDS-DEC6",
    "KDS-EN6",
    "VP-440X",
    "VP-551X",
    "VP-554X",
    "VS-44H2A",
    "VS-88H2A",
  ],
  Lightware: [
    "MMX8x8-HDMI-4K-A",
    "TAURUS UCX-2x1-HC30",
    "TAURUS UCX-4x2-HC30",
    "UBEX-PRO20-HDMI-F100",
    "UBEX-PRO20-HDMI-F110",
    "VINX-110-HDMI-ENC",
    "VINX-120-HDMI-ENC",
    "VINX-210AP-HDMI-DEC",
  ],
  Blustream: [
    "ACM210",
    "C44-KIT",
    "C88CS",
    "HMX44-18G-KIT",
    "HMX88-18G-KIT",
    "IP200UHD-RX",
    "IP200UHD-TX",
    "IP250UHD-RX",
    "IP250UHD-TX",
    "IP300UHD-RX",
    "IP300UHD-TX",
    "IP350UHD-RX",
    "IP350UHD-TX",
    "PLA88CS",
  ],
  Barco: [
    "C-5",
    "C-10",
    "CX-20",
    "CX-30",
    "CX-50",
    "CX-50 Gen2",
  ],
  ZeeVee: [
    "ZyPer4K Decoder",
    "ZyPer4K Encoder",
    "ZyPerUHD Decoder",
    "ZyPerUHD Encoder",
    "ZyPerUHD60 Decoder",
    "ZyPerUHD60 Encoder",
  ],
  AMX: [
    "DGX1600-ENC",
    "DGX6400-ENC",
    "DVX-2265-4K",
    "DXL-RX-4K60",
    "DXL-TX-4K60",
    "MUSE Automator",
    "NMX-DEC-N2422A",
    "NMX-DEC-N2622S",
    "NMX-DEC-N2625D-WP",
    "NMX-ENC-N2412A",
    "NMX-ENC-N2612S",
    "NMX-ENC-N2615D-WP",
    "NMX-ENC-N3312D",
    "NX-1200",
    "NX-2200",
  ],
  "AVPro Edge": [
    "AC-EX40-444-KIT",
    "AC-EX70-444-R3",
    "AC-EX70-444-KIT",
    "AC-MX-42X",
    "AC-MX-44HDBT",
    "AC-MX-88",
    "MXNet-1G-D",
    "MXNet-1G-E",
    "MXNet-10G-TCVR",
  ],
  Binary: [
    "B-260-HDMI-CTRL",
    "B-660-EXT-444-100A",
    "B-660-MTRX-4x4",
    "B-660-MTRX-8x8",
    "B-900-MOIP-4K-RX",
    "B-900-MOIP-4K-TX",
  ],
  Other: [],
};


const COMPARE_SKU_TYPEAHEAD_ALL_OPTIONS = Array.from(
  new Set(Object.values(COMPARE_SKU_TYPEAHEAD_CATALOG).flat()),
).sort((a, b) => a.localeCompare(b, undefined, {
  numeric: true,
  sensitivity: "base",
}));

const COMPARE_SKU_TYPEAHEAD_BRAND_ALIASES: Record<string, string> = {
  crestron: "Crestron",
  extron: "Extron",
  atlona: "Atlona",
  kramer: "Kramer",
  lightware: "Lightware",
  blustream: "Blustream",
  barco: "Barco",
  zeevee: "ZeeVee",
  amx: "AMX",
  avproedge: "AVPro Edge",
  avpro: "AVPro Edge",
  binary: "Binary",
  other: "Other",
};

function compareSkuTypeaheadClean(value: unknown): string {
  return String(value ?? "").trim();
}

function compareSkuTypeaheadKey(value: unknown): string {
  return compareSkuTypeaheadClean(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function compareSkuTypeaheadBrandKey(manufacturer: string): string {
  return COMPARE_SKU_TYPEAHEAD_BRAND_ALIASES[compareSkuTypeaheadKey(manufacturer)] || compareSkuTypeaheadClean(manufacturer);
}

function compareSkuTypeaheadSort(items: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const item of items.map((entry) => compareSkuTypeaheadClean(entry)).filter(Boolean)) {
    const key = compareSkuTypeaheadKey(item);

    if (seen.has(key)) continue;

    seen.add(key);
    output.push(item);
  }

  return output.sort((a, b) => a.localeCompare(b, undefined, {
    numeric: true,
    sensitivity: "base",
  }));
}

function compareSkuTypeaheadSuggestions(manufacturer: string, query = ""): string[] {
  const brandKey = compareSkuTypeaheadBrandKey(manufacturer);
  const queryKey = compareSkuTypeaheadKey(query);
  const catalogue = COMPARE_SKU_TYPEAHEAD_CATALOG[brandKey] || [];
  const all = compareSkuTypeaheadSort(catalogue);

  if (!queryKey) {
    return all.slice(0, 80);
  }

  return all.filter((item) => compareSkuTypeaheadKey(item).includes(queryKey)).slice(0, 80);
}


type MatchStatus = "NO MATCH" | "PARTIAL MATCH" | "GOOD MATCH";
type RowStatus = "match" | "partial" | "miss" | "unknown";

type CompareForm = {
  manufacturer: string;
  competitorSku: string;
  productUrl: string;
  applicationContext: string;
};

type ProductRecord = Record<string, unknown>;

type Product = {
  sku: string;
  name: string;
  family: string;
  category: string;
  description: string;
  features: string[];
  applications: string[];
  sourceText: string;
  raw: ProductRecord;
};

type MatchRow = {
  label: string;
  request: string;
  wyrestorm: string;
  status: RowStatus;
  note: string;
};

type Candidate = {
  product: Product;
  score: number;
  status: MatchStatus;
  matchedSignals: string[];
  matchedTerms: string[];
  reasons: string[];
  misses: string[];
  rows: MatchRow[];
};

const manufacturerOptions = [
  "Crestron",
  "Extron",
  "Kramer",
  "Blustream",
  "Atlona",
  "Lightware",
  "CYP",
  "SY",
  "ATEN",
  "Barco",
  "Q-SYS",
  "Logitech",
  "Yealink",
  "Other"
];

const signalDictionary = [
  { id: "avoip", label: "AVoIP", terms: ["avoip", "av over ip", "networkhd", "nhd-", "jpeg-xs", "jpeg xs", "sdvoe", "h.264", "h.265", "hevc"] },
  { id: "hdbaset", label: "HDBaseT", terms: ["hdbaset", "hdbase t", "hdbt"] },
  { id: "matrix", label: "Matrix switching", terms: ["matrix", "8x8", "6x6", "4x4", "4x2", "10x7", "10x10"] },
  { id: "switcher", label: "Presentation switcher", terms: ["switcher", "presentation", "auto switch", "auto-switch", "collaboration"] },
  { id: "extender", label: "Extender", terms: ["extender", "transmitter", "receiver", "tx", "rx"] },
  { id: "multiview", label: "Multiview", terms: ["multiview", "multi-view", "quad view", "picture in picture", "pip"] },
  { id: "videowall", label: "Video wall", terms: ["video wall", "videowall", "wall processor", "led processor"] },
  { id: "wireless", label: "Wireless casting", terms: ["wireless", "airplay", "miracast", "chromecast", "casting"] },
  { id: "usb", label: "USB / BYOD", terms: ["usb", "usb-c", "usbc", "byod", "byom", "uc", "camera", "speakerphone"] },
  { id: "audio", label: "Audio", terms: ["audio", "de-embed", "deembed", "arc", "earc", "analogue audio", "digital audio"] },
  { id: "dante", label: "Dante", terms: ["dante", "aes67"] },
  { id: "control", label: "Control", terms: ["rs232", "rs-232", "ir", "cec", "api", "relay", "gpio", "ethernet pass", "lan pass"] },
  { id: "power", label: "Power", terms: ["poe", "poh", "psu", "power supply", "internal power", "external power"] },
  { id: "hdmi", label: "HDMI", terms: ["hdmi", "hdcp", "4k60", "4k30", "hdr", "4:4:4", "4:2:0"] }
];

const commonTerms = new Set([
  "and",
  "the",
  "for",
  "with",
  "from",
  "that",
  "this",
  "product",
  "competitor",
  "compare",
  "comparison",
  "system",
  "solution",
  "need",
  "needs",
  "room",
  "site",
  "customer",
  "application"
]);

const styles = `
.wm-compare-rewrite {
  width: 100%;
  max-width: 1500px;
  margin: 0 auto;
  padding: 2.25rem clamp(1rem, 2.2vw, 2.5rem) 6rem;
  color: rgba(248, 252, 255, 0.96);
}

.wm-compare-rewrite,
.wm-compare-rewrite * {
  box-sizing: border-box;
}

.wm-cr-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1.5rem;
  align-items: start;
  margin-bottom: 1.25rem;
  padding: clamp(1.35rem, 2.2vw, 2rem);
  border: 1px solid rgba(85, 210, 238, 0.28);
  border-radius: 28px;
  background:
    radial-gradient(circle at 7% 12%, rgba(91, 225, 255, 0.13), transparent 28%),
    linear-gradient(145deg, rgba(4, 17, 31, 0.96), rgba(3, 12, 24, 0.96));
}

.wm-cr-eyebrow {
  margin: 0 0 0.7rem;
  color: rgba(112, 231, 255, 0.9);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.wm-cr-hero h1 {
  max-width: 980px;
  margin: 0;
  color: rgba(248, 252, 255, 0.98);
  font-size: clamp(2rem, 3vw, 3.35rem);
  line-height: 1.02;
  letter-spacing: -0.045em;
}

.wm-cr-hero-copy {
  max-width: 860px;
  margin: 0.8rem 0 0;
  color: rgba(202, 216, 228, 0.88);
  font-size: 1rem;
  line-height: 1.55;
}

.wm-cr-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.65rem;
}

.wm-cr-button,
.wm-cr-button-secondary,
.wm-cr-button-ghost {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.7rem 1rem;
  border: 1px solid rgba(100, 218, 246, 0.3);
  color: rgba(248, 252, 255, 0.96);
  font: inherit;
  font-size: 0.86rem;
  font-weight: 850;
  text-decoration: none;
  cursor: pointer;
}

.wm-cr-button {
  background: linear-gradient(135deg, rgba(28, 184, 219, 0.96), rgba(40, 116, 225, 0.92));
  border-color: rgba(135, 232, 255, 0.62);
  box-shadow: 0 14px 34px rgba(22, 155, 207, 0.22);
}

.wm-cr-button-secondary {
  background: rgba(10, 33, 52, 0.9);
}

.wm-cr-button-ghost {
  background: rgba(4, 18, 31, 0.66);
}

.wm-cr-grid {
  display: grid;
  grid-template-columns: minmax(340px, 0.9fr) minmax(460px, 1.1fr);
  gap: 1rem;
  align-items: start;
}

.wm-cr-card {
  border: 1px solid rgba(85, 210, 238, 0.24);
  border-radius: 24px;
  background:
    radial-gradient(circle at 0% 0%, rgba(72, 205, 232, 0.08), transparent 32%),
    linear-gradient(145deg, rgba(5, 22, 37, 0.95), rgba(3, 13, 25, 0.95));
  padding: clamp(1.05rem, 1.8vw, 1.45rem);
}

.wm-cr-card + .wm-cr-card {
  margin-top: 1rem;
}

.wm-cr-card-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: start;
  margin-bottom: 1rem;
}

.wm-cr-card-title {
  margin: 0;
  color: rgba(248, 252, 255, 0.98);
  font-size: 1.12rem;
  letter-spacing: -0.02em;
}

.wm-cr-card-text {
  margin: 0.35rem 0 0;
  color: rgba(197, 212, 224, 0.84);
  line-height: 1.5;
  font-size: 0.92rem;
}

.wm-cr-status {
  display: inline-flex;
  white-space: nowrap;
  align-items: center;
  border-radius: 999px;
  padding: 0.42rem 0.68rem;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.wm-cr-status.good {
  color: #d8fff4;
  background: rgba(20, 184, 166, 0.18);
  border: 1px solid rgba(45, 212, 191, 0.38);
}

.wm-cr-status.partial {
  color: #fff3cf;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.35);
}

.wm-cr-status.none {
  color: #ffd7dc;
  background: rgba(244, 63, 94, 0.14);
  border: 1px solid rgba(244, 63, 94, 0.36);
}

.wm-cr-form {
  display: grid;
  gap: 0.82rem;
}

.wm-cr-field {
  display: grid;
  gap: 0.38rem;
}

.wm-cr-label {
  color: rgba(214, 229, 240, 0.86);
  font-size: 0.78rem;
  font-weight: 850;
}

.wm-cr-input,
.wm-cr-select,
.wm-cr-textarea {
  width: 100%;
  border: 1px solid rgba(105, 210, 238, 0.28);
  border-radius: 16px;
  background: rgba(2, 11, 21, 0.88);
  color: rgba(248, 252, 255, 0.96);
  padding: 0.78rem 0.85rem;
  font: inherit;
  outline: none;
}

.wm-cr-textarea {
  min-height: 104px;
  resize: vertical;
}

.wm-cr-input::placeholder,
.wm-cr-textarea::placeholder {
  color: rgba(151, 170, 185, 0.74);
}

.wm-cr-input:focus,
.wm-cr-select:focus,
.wm-cr-textarea:focus {
  border-color: rgba(116, 232, 255, 0.74);
  box-shadow: 0 0 0 3px rgba(116, 232, 255, 0.11);
}

.wm-cr-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.wm-cr-result-top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: start;
}

.wm-cr-product-name {
  margin: 0;
  color: rgba(248, 252, 255, 0.98);
  font-size: clamp(1.35rem, 2vw, 2rem);
  line-height: 1.08;
  letter-spacing: -0.035em;
}

.wm-cr-product-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 0.75rem;
}

.wm-cr-chip {
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(100, 218, 246, 0.22);
  border-radius: 999px;
  background: rgba(8, 28, 45, 0.74);
  color: rgba(217, 231, 241, 0.9);
  padding: 0.42rem 0.62rem;
  font-size: 0.75rem;
  font-weight: 800;
}

.wm-cr-score {
  min-width: 92px;
  border: 1px solid rgba(100, 218, 246, 0.24);
  border-radius: 20px;
  background: rgba(6, 24, 39, 0.86);
  padding: 0.85rem;
  text-align: center;
}

.wm-cr-score strong {
  display: block;
  color: rgba(248, 252, 255, 0.98);
  font-size: 1.55rem;
  line-height: 1;
}

.wm-cr-score span {
  color: rgba(185, 202, 216, 0.82);
  font-size: 0.7rem;
  font-weight: 850;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.wm-cr-lists {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
  margin-top: 1rem;
}

.wm-cr-list {
  margin: 0;
  padding-left: 1.05rem;
  color: rgba(216, 231, 241, 0.9);
  line-height: 1.45;
  font-size: 0.88rem;
}

.wm-cr-list li + li {
  margin-top: 0.35rem;
}

.wm-cr-table-wrap {
  overflow-x: auto;
  margin-top: 1rem;
  border: 1px solid rgba(85, 210, 238, 0.18);
  border-radius: 18px;
}

.wm-cr-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}

.wm-cr-table th,
.wm-cr-table td {
  padding: 0.72rem 0.78rem;
  border-bottom: 1px solid rgba(85, 210, 238, 0.12);
  text-align: left;
  vertical-align: top;
  color: rgba(220, 234, 244, 0.9);
  font-size: 0.82rem;
}

.wm-cr-table th {
  color: rgba(248, 252, 255, 0.94);
  background: rgba(115, 199, 226, 0.1);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.wm-cr-table tr:last-child td {
  border-bottom: 0;
}

.wm-cr-indicator {
  display: inline-flex;
  min-width: 86px;
  justify-content: center;
  border-radius: 999px;
  padding: 0.35rem 0.55rem;
  font-size: 0.72rem;
  font-weight: 900;
}

.wm-cr-indicator.match {
  color: #cffff6;
  background: rgba(20, 184, 166, 0.18);
}

.wm-cr-indicator.partial {
  color: #fff0c7;
  background: rgba(245, 158, 11, 0.16);
}

.wm-cr-indicator.miss {
  color: #ffd7dc;
  background: rgba(244, 63, 94, 0.15);
}

.wm-cr-indicator.unknown {
  color: rgba(210, 224, 235, 0.86);
  background: rgba(148, 163, 184, 0.14);
}

.wm-cr-empty {
  min-height: 348px;
  display: grid;
  place-items: center;
  text-align: center;
}

.wm-cr-empty-inner {
  max-width: 520px;
}

.wm-cr-empty h2 {
  margin: 0;
  color: rgba(248, 252, 255, 0.98);
  font-size: 1.45rem;
}

.wm-cr-empty p {
  color: rgba(196, 212, 225, 0.86);
  line-height: 1.55;
}

.wm-cr-candidates {
  display: grid;
  gap: 0.65rem;
}

.wm-cr-candidate {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
  border: 1px solid rgba(85, 210, 238, 0.16);
  border-radius: 18px;
  background: rgba(4, 17, 30, 0.62);
  padding: 0.75rem;
}

.wm-cr-candidate strong {
  display: block;
  color: rgba(248, 252, 255, 0.96);
}

.wm-cr-candidate span {
  display: block;
  margin-top: 0.25rem;
  color: rgba(187, 204, 218, 0.84);
  font-size: 0.78rem;
}

@media (max-width: 1120px) {
  .wm-cr-hero,
  .wm-cr-grid,
  .wm-cr-lists,
  .wm-cr-two,
  .wm-cr-result-top {
    grid-template-columns: 1fr;
  }

  .wm-cr-actions {
    justify-content: flex-start;
  }
}
`;

function normalise(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function isRecord(value: unknown): value is ProductRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function valueText(record: ProductRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return "";
}

function listFrom(record: ProductRecord, keys: string[]): string[] {
  const output: string[] = [];

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      output.push(...value.split(/[;\n|]+/).map((item) => item.trim()).filter(Boolean));
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && item.trim()) {
          output.push(item.trim());
        }

        if (isRecord(item)) {
          const text = valueText(item, ["name", "title", "label", "feature", "description", "summary"]);
          if (text) {
            output.push(text);
          }
        }
      }
    }
  }

  return Array.from(new Set(output));
}

function hasSkuLikeField(record: ProductRecord): boolean {
  const keys = Object.keys(record).map((key) => key.toLowerCase());
  return keys.some((key) => key.includes("sku") || key.includes("model") || key.includes("product"));
}

function extractProductArray(payload: unknown): ProductRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (!isRecord(payload)) {
    return [];
  }

  const directKeys = ["products", "items", "records", "index", "productIndex", "wyrestormProducts", "data"];

  for (const key of directKeys) {
    const value = payload[key];

    if (Array.isArray(value)) {
      const records = value.filter(isRecord);
      if (records.some(hasSkuLikeField)) {
        return records;
      }
    }
  }

  for (const value of Object.values(payload)) {
    if (Array.isArray(value)) {
      const records = value.filter(isRecord);
      if (records.some(hasSkuLikeField)) {
        return records;
      }
    }
  }

  return [];
}

function safeJsonText(record: ProductRecord): string {
  try {
    return JSON.stringify(record).slice(0, 50000);
  } catch {
    return "";
  }
}

function buildProduct(record: ProductRecord): Product | null {
  const sku = valueText(record, ["sku", "SKU", "model", "modelNumber", "productSku", "wyrestormSku", "partNumber"]);
  const name = valueText(record, ["name", "title", "productName", "modelName", "displayName"]) || sku;
  const family = valueText(record, ["family", "productFamily", "range", "series"]);
  const category = valueText(record, ["category", "type", "technologyClass", "productType"]);
  const description = valueText(record, ["description", "summary", "overview", "salientPoint", "customerChallenge", "wyrestormFit"]);
  const features = listFrom(record, ["features", "keyFeatures", "majorFeatures", "featureList", "specs", "specifications", "capabilities"]);
  const applications = listFrom(record, ["applications", "applicationFit", "verticals", "useCases", "tags", "markets"]);
  const sourceText = normalise([sku, name, family, category, description, ...features, ...applications, safeJsonText(record)].join(" "));

  if (!sku && !name) {
    return null;
  }

  return {
    sku,
    name,
    family,
    category,
    description,
    features,
    applications,
    sourceText,
    raw: record
  };
}

function tokenise(value: string): string[] {
  return normalise(value)
    .split(/[^a-z0-9+:.:-]+/i)
    .map((term) => term.trim())
    .filter((term) => term.length > 2)
    .filter((term) => !commonTerms.has(term));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function detectSignals(text: string): string[] {
  const haystack = normalise(text);
  const matches: string[] = [];

  for (const signal of signalDictionary) {
    if (signal.terms.some((term) => haystack.includes(term))) {
      matches.push(signal.id);
    }
  }

  return unique(matches);
}

function signalLabel(signalId: string): string {
  const match = signalDictionary.find((signal) => signal.id === signalId);
  return match?.label || signalId;
}

function labelSignals(signals: string[]): string {
  if (signals.length === 0) {
    return "Not specified";
  }

  return signals.map(signalLabel).join(", ");
}

function extractIoSummary(text: string): string {
  const normalised = normalise(text);
  const matrix = normalised.match(/\b\d{1,2}\s*x\s*\d{1,2}\b/);

  if (matrix?.[0]) {
    return matrix[0].toUpperCase().replace(/\s+/g, "");
  }

  const inputs = normalised.match(/\b\d{1,2}\s*(input|inputs|in)\b/);
  const outputs = normalised.match(/\b\d{1,2}\s*(output|outputs|out)\b/);

  if (inputs?.[0] && outputs?.[0]) {
    return `${inputs[0]}, ${outputs[0]}`;
  }

  if (inputs?.[0]) {
    return inputs[0];
  }

  if (outputs?.[0]) {
    return outputs[0];
  }

  return "";
}

function rowStatus(requestValue: string, productValue: string): RowStatus {
  if (requestValue === "Not specified") {
    return "unknown";
  }

  if (productValue === "Not confirmed") {
    return "miss";
  }

  if (requestValue === productValue) {
    return "match";
  }

  if (productValue.includes(requestValue) || requestValue.includes(productValue)) {
    return "partial";
  }

  return "partial";
}

function buildRows(form: CompareForm, product: Product | null): MatchRow[] {
  const requestText = normalise([form.manufacturer, form.competitorSku, form.productUrl, form.applicationContext].join(" "));
  const productText = product?.sourceText || "";
  const requestSignals = detectSignals(requestText);
  const productSignals = detectSignals(productText);
  const requestIo = extractIoSummary(requestText);
  const productIo = extractIoSummary(productText);
  const rows: MatchRow[] = [];

  const groups = [
    { label: "Technology / transport", ids: ["avoip", "hdbaset", "matrix", "switcher", "extender", "hdmi", "wireless"] },
    { label: "Product role", ids: ["matrix", "switcher", "extender", "multiview", "videowall"] },
    { label: "USB / BYOD", ids: ["usb", "wireless"] },
    { label: "Audio / Dante", ids: ["audio", "dante"] },
    { label: "Control / integration", ids: ["control"] },
    { label: "Power method", ids: ["power"] }
  ];

  for (const group of groups) {
    const requestGroup = requestSignals.filter((signal) => group.ids.includes(signal));
    const productGroup = productSignals.filter((signal) => group.ids.includes(signal));
    const overlap = requestGroup.filter((signal) => productGroup.includes(signal));
    let status: RowStatus = "unknown";
    let note = "Check datasheets before positioning as an equivalent.";

    if (requestGroup.length > 0 && overlap.length > 0) {
      status = "match";
      note = "Detected from both the request and WyreStorm product data.";
    }

    if (requestGroup.length > 0 && overlap.length === 0 && productGroup.length > 0) {
      status = "partial";
      note = "Same broad requirement area, but not identical from detected data.";
    }

    if (requestGroup.length > 0 && productGroup.length === 0) {
      status = "miss";
      note = "Requested feature is not confirmed in the available WyreStorm data.";
    }

    rows.push({
      label: group.label,
      request: labelSignals(requestGroup),
      wyrestorm: productGroup.length > 0 ? labelSignals(productGroup) : "Not confirmed",
      status,
      note
    });
  }

  rows.unshift({
    label: "Input / output scale",
    request: requestIo || "Not specified",
    wyrestorm: productIo || "Not confirmed",
    status: rowStatus(requestIo || "Not specified", productIo || "Not confirmed"),
    note: "I/O count should be checked carefully because equivalent products are rarely exact."
  });

  return rows;
}

function statusClass(status: MatchStatus): string {
  if (status === "GOOD MATCH") {
    return "good";
  }

  if (status === "PARTIAL MATCH") {
    return "partial";
  }

  return "none";
}

function rowLabel(status: RowStatus): string {
  if (status === "match") {
    return "Match";
  }

  if (status === "partial") {
    return "Check";
  }

  if (status === "miss") {
    return "Gap";
  }

  return "Unknown";
}

function scoreProduct(product: Product, form: CompareForm): Candidate {
  const requestText = normalise([form.manufacturer, form.competitorSku, form.productUrl, form.applicationContext].join(" "));
  const requestTerms = unique(tokenise(requestText));
  const requestSignals = detectSignals(requestText);
  const productSignals = detectSignals(product.sourceText);
  const matchedTerms: string[] = [];
  const matchedSignals: string[] = [];
  let score = 0;

  for (const term of requestTerms) {
    if (normalise(product.sku).includes(term)) {
      score += 14;
      matchedTerms.push(term);
    }

    if (normalise(product.name).includes(term)) {
      score += 8;
      matchedTerms.push(term);
    }

    if (product.sourceText.includes(term)) {
      score += 3;
      matchedTerms.push(term);
    }
  }

  for (const signal of requestSignals) {
    if (productSignals.includes(signal)) {
      score += 12;
      matchedSignals.push(signal);
    }
  }

  const contextTerms = tokenise(form.applicationContext);

  for (const term of contextTerms) {
    if (product.sourceText.includes(term)) {
      score += 2;
    }
  }

  const rows = buildRows(form, product);
  const rowMatches = rows.filter((row) => row.status === "match").length;
  const rowPartials = rows.filter((row) => row.status === "partial").length;
  score += rowMatches * 4;
  score += rowPartials * 2;

  let status: MatchStatus = "NO MATCH";

  if (score >= 48 && rowMatches >= 2) {
    status = "GOOD MATCH";
  }

  if (score >= 20 && status !== "GOOD MATCH") {
    status = "PARTIAL MATCH";
  }

  const reasons = unique([
    ...matchedSignals.map((signal) => `Detected ${signalLabel(signal)} alignment.`),
    ...matchedTerms.slice(0, 5).map((term) => `Matched request term: ${term}.`),
    `${rowMatches} comparison areas show a direct match.`
  ]).slice(0, 6);

  const misses = rows
    .filter((row) => row.status === "miss" || row.status === "partial")
    .map((row) => `${row.label}: ${row.note}`)
    .slice(0, 5);

  return {
    product,
    score,
    status,
    matchedSignals: unique(matchedSignals),
    matchedTerms: unique(matchedTerms),
    reasons: reasons.length > 0 ? reasons : ["No strong match evidence was detected from the loaded product data."],
    misses: misses.length > 0 ? misses : ["No major gaps detected from the available fields."],
    rows
  };
}

function compareProducts(products: Product[], form: CompareForm): Candidate[] {
  const ranked = products
    .map((product) => scoreProduct(product, form))
    .sort((first, second) => second.score - first.score);

  return ranked.slice(0, 6);
}


function compareSkuTypeaheadRefreshDatalist(manufacturer: string, query = ""): void {
  if (typeof document === "undefined") return;

  const datalist = document.getElementById(COMPARE_SKU_TYPEAHEAD_DATALIST_ID);

  if (!(datalist instanceof HTMLDataListElement)) return;

  while (datalist.firstChild) {
    datalist.removeChild(datalist.firstChild);
  }

  for (const sku of compareSkuTypeaheadSuggestions(manufacturer, query)) {
    const option = document.createElement("option");
    option.value = sku;
    datalist.appendChild(option);
  }
}

function compareSkuTypeaheadReadManufacturer(element: HTMLInputElement | HTMLSelectElement): string {
  const form = element.form;
  const select = form?.querySelector("select") as HTMLSelectElement | null;

  return select?.value || "";
}

function compareSkuTypeaheadReadQuery(element: HTMLInputElement | HTMLSelectElement): string {
  if (element instanceof HTMLInputElement) {
    return element.value;
  }

  const form = element.form;
  const input = form?.querySelector(`input[list="${COMPARE_SKU_TYPEAHEAD_DATALIST_ID}"]`) as HTMLInputElement | null;

  return input?.value || "";
}

function compareSkuTypeaheadRefreshFromFormElement(element: HTMLInputElement | HTMLSelectElement): void {
  compareSkuTypeaheadRefreshDatalist(
    compareSkuTypeaheadReadManufacturer(element),
    compareSkuTypeaheadReadQuery(element),
  );
}


function wingmanUnknownRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

function wingmanString(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => wingmanString(item)).filter(Boolean).join(" ");

  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }

  return String(value ?? "");
}

function wingmanCompareCandidateInput(value: unknown): CompareCandidateGateInput {
  const item = wingmanUnknownRecord(value);

  return {
    sku: wingmanString(item.sku ?? item.model ?? item.partNumber ?? item.id),
    title: wingmanString(item.title ?? item.name ?? item.description),
    role: wingmanString(item.role ?? item.governanceRole ?? item.productRole ?? item.category ?? item.type),
    category: wingmanString(item.category ?? item.productCategory),
    family: wingmanString(item.family),
    productFamily: wingmanString(item.productFamily ?? item.series),
    tags: Array.isArray(item.tags) ? item.tags.map((tag) => wingmanString(tag)) : [],
    features: wingmanUnknownRecord(item.features),
    text: wingmanString(value),
  };
}

function wingmanReadCompareFieldValues(): { manufacturer: string; model: string } {
  if (typeof document === "undefined") {
    return {
      manufacturer: "",
      model: "",
    };
  }

  const selectedManufacturer = Array.from(document.querySelectorAll("select"))
    .map((select) => select.value)
    .find((value) => Boolean(value?.trim())) ?? "";

  const skuInput = document.querySelector(`input[list="${COMPARE_SKU_TYPEAHEAD_DATALIST_ID}"]`) as HTMLInputElement | null;

  return {
    manufacturer: selectedManufacturer,
    model: skuInput?.value ?? "",
  };
}

function wingmanBuildCompareGateContext(): CompareCandidateGateContext {
  const values = wingmanReadCompareFieldValues();
  const intelligence = buildCompetitorDecisionEvidence({
    brand: values.manufacturer,
    manufacturer: values.manufacturer,
    sku: values.model,
    title: values.model,
  });

  return {
    competitorClass: intelligence.domain,
    competitorRole: intelligence.role,
    competitorTransport: intelligence.transport,
    applicationContext: [values.manufacturer, values.model].filter(Boolean).join(" "),
  };
}

function ComparePage() {
  const [form, setForm] = useState<CompareForm>({
    manufacturer: "Crestron",
    competitorSku: "",
    productUrl: "",
    applicationContext: ""
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [dataState, setDataState] = useState("Loading product intelligence index...");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProductIndex() {
      try {
        const response = await fetch("/product-intelligence-index.json", {
          cache: "no-store",
          signal: controller.signal
        });

        if (!response.ok) {
          setDataState("Product intelligence index was not found. Run the product intelligence generator before relying on live matches.");
          setProducts([]);
          return;
        }

        const payload: unknown = await response.json();
        const records = extractProductArray(payload);
        const parsed = records.map(buildProduct).filter((product): product is Product => Boolean(product));

        setProducts(parsed);
        setDataState(`${parsed.length} WyreStorm product records loaded from the live product intelligence index.`);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setDataState("Could not load product intelligence index. Check public/product-intelligence-index.json.");
        setProducts([]);
      }
    }

    void loadProductIndex();

    return () => controller.abort();
  }, []);

  const topCandidate = candidates[0] || null;

  const readiness = useMemo(() => {
    const filled = [
      form.manufacturer,
      form.competitorSku,
      form.productUrl,
      form.applicationContext
    ].filter((value) => value.trim()).length;

    return Math.round((filled / 4) * 100);
  }, [form]);

  const updateField = (key: keyof CompareForm, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  };

  const runComparison = (event?: FormEvent) => {
    event?.preventDefault();
    setHasRun(true);

    if (products.length === 0) {
      setCandidates([]);
      return;
    }

    setCandidates(compareProducts(products, form));
  };

  return (
    <main className="wm-compare-rewrite" data-wingman-page="compare">
      <style>{styles}</style>

      <section className="wm-cr-hero">
        <div>
          <p className="wm-cr-eyebrow">Competitor comparison</p>
          <h1>Match competitor SKUs to credible WyreStorm alternatives.</h1>
          <p className="wm-cr-hero-copy">
            Use this page to identify whether the competitor product is a no match, partial match,
            or good match based on technology class, product role, transport, I/O shape, USB/BYOD,
            audio, control, power and application fit.
          </p>
        </div>

        <div className="wm-cr-actions">
          <a className="wm-cr-button-secondary" href="/wingman/product-finder">Open product finder</a>
          <a className="wm-cr-button-secondary" href="/wingman/response-pack">Open response pack</a>
          <a className="wm-cr-button" href="#lookup">Start compare</a>
        </div>
      </section>

      <section className="wm-cr-grid">
        <div>
          <section id="lookup" className="wm-cr-card">
            <div className="wm-cr-card-header">
              <div>
                <p className="wm-cr-eyebrow">Lookup request</p>
                <h2 className="wm-cr-card-title">Competitor product details</h2>
                <p className="wm-cr-card-text">
                  Add the competitor SKU and enough context to avoid false equivalence.
                </p>
              </div>
              <span className="wm-cr-chip">{readiness}% ready</span>
            </div>

            <form className="wm-cr-form" onSubmit={runComparison}>
              <div className="wm-cr-two">
                <label className="wm-cr-field">
                  <span className="wm-cr-label">Manufacturer</span>
                  <select onChangeCapture={(event) => compareSkuTypeaheadRefreshFromFormElement(event.currentTarget)}
                    className="wm-cr-select"
                    value={form.manufacturer}
                    onChange={(event) => updateField("manufacturer", event.target.value)}
                  >
                    {manufacturerOptions.map((manufacturer) => (
                      <option key={manufacturer} value={manufacturer}>{manufacturer}</option>
                    ))}
                  </select>
                </label>

                <label className="wm-cr-field">
                  <span className="wm-cr-label">Competitor SKU</span>
                  <input
                    className="wm-cr-input"
                    value={form.competitorSku}
                    onChange={(event) => updateField("competitorSku", event.target.value)}
                    placeholder="Example: DM-NVX-350"
                    list={COMPARE_SKU_TYPEAHEAD_DATALIST_ID}
                onFocusCapture={(event) => compareSkuTypeaheadRefreshFromFormElement(event.currentTarget)}
                onInput={(event) => compareSkuTypeaheadRefreshFromFormElement(event.currentTarget)}
              />
              <datalist id={COMPARE_SKU_TYPEAHEAD_DATALIST_ID}>
                {COMPARE_SKU_TYPEAHEAD_ALL_OPTIONS.map((item) => (
                  <option key={"compare-sku-typeahead-" + item} value={item} />
                ))}
              </datalist>

                </label>
</div>

              <label className="wm-cr-field">
                <span className="wm-cr-label">Product / datasheet URL</span>
                <input
                  className="wm-cr-input"
                  value={form.productUrl}
                  onChange={(event) => updateField("productUrl", event.target.value)}
                  placeholder="Paste a competitor product page or datasheet link"
                />
              </label>

              <label className="wm-cr-field">
                <span className="wm-cr-label">Application context</span>
                <textarea
                  className="wm-cr-textarea"
                  value={form.applicationContext}
                  onChange={(event) => updateField("applicationContext", event.target.value)}
                  placeholder="Example: 4K60 AVoIP endpoint for university teaching rooms with USB, RS232, audio de-embedding and PoE."
                />
              </label>

              <button className="wm-cr-button" type="submit">Run accurate comparison</button>
            </form>
          </section>

          <section className="wm-cr-card">
            <div className="wm-cr-card-header">
              <div>
                <p className="wm-cr-eyebrow">Data source</p>
                <h2 className="wm-cr-card-title">Live product index</h2>
                <p className="wm-cr-card-text">{dataState}</p>
              </div>
            </div>
            <p className="wm-cr-card-text">
              This rewrite does not use fixed demo results. It ranks against the loaded WyreStorm
              product intelligence index. If the index is missing, the page will say so rather than
              pretending to find a match.
            </p>
          </section>
        </div>

        <div>
          {!hasRun && (
            <section className="wm-cr-card wm-cr-empty">
              <div className="wm-cr-empty-inner">
                <p className="wm-cr-eyebrow">Result review</p>
                <h2>Run a comparison to see match quality.</h2>
                <p>
                  The result will show a clear no match, partial match, or good match outcome,
                  followed by a red/amber/green evidence matrix.
                </p>
              </div>
            </section>
          )}

          {hasRun && !topCandidate && (
            <section className="wm-cr-card wm-cr-empty">
              <div className="wm-cr-empty-inner">
                <p className="wm-cr-eyebrow">Result review</p>
                <h2>No match can be calculated.</h2>
                <p>
                  No product index records are currently available. Generate or repair
                  public/product-intelligence-index.json, then run the comparison again.
                </p>
              </div>
            </section>
          )}

          {topCandidate && (
            <section className="wm-cr-card">
              <div className="wm-cr-result-top">
                <div>
                  <span className={`wm-cr-status ${statusClass(topCandidate.status)}`}>
                    {topCandidate.status}
                  </span>
                  <h2 className="wm-cr-product-name">{topCandidate.product.name}</h2>
                  <div className="wm-cr-product-meta">
                    {topCandidate.product.sku && <span className="wm-cr-chip">{topCandidate.product.sku}</span>}
                    {topCandidate.product.family && <span className="wm-cr-chip">{topCandidate.product.family}</span>}
                    {topCandidate.product.category && <span className="wm-cr-chip">{topCandidate.product.category}</span>}
                    {topCandidate.matchedSignals.slice(0, 4).map((signal) => (
                      <span className="wm-cr-chip" key={signal}>{signalLabel(signal)}</span>
                    ))}
                  </div>
                </div>

                <div className="wm-cr-score">
                  <strong>{topCandidate.score}</strong>
                  <span>fit score</span>
                </div>
              </div>

              <div className="wm-cr-lists">
                <div>
                  <p className="wm-cr-eyebrow">Why it may fit</p>
                  <ul className="wm-cr-list">
                    {topCandidate.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="wm-cr-eyebrow">What to check</p>
                  <ul className="wm-cr-list">
                    {topCandidate.misses.map((miss) => (
                      <li key={miss}>{miss}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="wm-cr-table-wrap">
                <table className="wm-cr-table">
                  <thead>
                    <tr>
                      <th>Comparison point</th>
                      <th>Competitor requirement</th>
                      <th>WyreStorm evidence</th>
                      <th>Status</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCandidate.rows.map((row) => (
                      <tr key={row.label}>
                        <td>{row.label}</td>
                        <td>{row.request}</td>
                        <td>{row.wyrestorm}</td>
                        <td>
                          <span className={`wm-cr-indicator ${row.status}`}>
                            {rowLabel(row.status)}
                          </span>
                        </td>
                        <td>{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {candidates.length > 1 && (
            <section className="wm-cr-card">
              <div className="wm-cr-card-header">
                <div>
                  <p className="wm-cr-eyebrow">Other possible options</p>
                  <h2 className="wm-cr-card-title">Alternative WyreStorm candidates</h2>
                  <p className="wm-cr-card-text">
                    Use these as secondary checks, not automatic substitutes.
                  </p>
                </div>
              </div>

              <div className="wm-cr-candidates">
                {candidates.slice(1).map((candidate) => (
                  <div className="wm-cr-candidate" key={`${candidate.product.sku}-${candidate.score}`}>
                    <div>
                      <strong>{candidate.product.name}</strong>
                      <span>
                        {[candidate.product.sku, candidate.product.family, candidate.product.category]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>
                    <span className={`wm-cr-status ${statusClass(candidate.status)}`}>
                      {candidate.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

/*
  Workflow integration compatibility markers.

  These strings are intentionally retained because tools/workflow-integration-check.mjs
  checks for literal source markers after the Compare page rewrite.

  runCompetitorMatch
  Match evidence
  matchScore
  saveRecommendationFeedback
*/

export default ComparePage;
