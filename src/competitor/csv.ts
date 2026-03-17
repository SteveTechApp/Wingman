import * as React from "react";
import type { CompetitorItem } from "./types";

function norm(s: string) {
  return (s || "").trim();
}

function lower(s: string) {
  return norm(s).toLowerCase();
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === `"`) {
      if (inQ && line[i + 1] === `"`) {
        cur += `"`;
        i++;
        continue;
      }
      inQ = !inQ;
      continue;
    }

    if (ch === "," && !inQ) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out.map((s) => s.trim());
}

function intOrUndef(s: string) {
  const n = parseInt(norm(s), 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseResolution(value: string): NonNullable<CompetitorItem["video"]>["maxResolution"] | undefined {
  const v = lower(value);

  if (v.includes("8k")) return "8K";
  if (v.includes("4k60") || v.includes("4k 60")) return "4K60";
  if (v.includes("4k30") || v.includes("4k 30")) return "4K30";
  if (v.includes("1080")) return "1080p";

  return undefined;
}

export function competitorCsvTemplate(): string {
  return [
    "brand,model,category,role,maxResolution,hdmi,hdr,latency,inputs,outputs,tags,features,notes",
    "Crestron,DM-NVX-E30,AVoIP,TX,4K60,2.0,true,low,1,0,AVoIP;low-latency;managed-network,multicast;igmp;vlan,Example row",
    "Extron,NAV SD 501,AVoIP,RX,4K60,2.0,true,low,0,1,AVoIP;4K60,multicast;igmp,Example row",
  ].join("\n");
}

export function parseCompetitorCsv(
  text: string,
): { items: CompetitorItem[]; warnings: string[] } {
  const warnings: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { items: [], warnings: ["CSV has no data rows."] };
  }

  const header = splitCsvLine(lines[0]).map(lower);
  const idx = (k: string) => header.indexOf(k);
  const req = ["brand", "model", "category", "role"];

  for (const r of req) {
    if (idx(r) < 0) warnings.push(`Missing column: ${r}`);
  }

  const items: CompetitorItem[] = [];

  for (let r = 1; r < lines.length; r++) {
    const cols = splitCsvLine(lines[r]);
    const get = (k: string) => {
      const i = idx(k);
      return i >= 0 ? (cols[i] || "") : "";
    };

    const brand = norm(get("brand"));
    const model = norm(get("model"));
    const category = norm(get("category"));
    const role = norm(get("role"));

    if (!brand || !model || !category || !role) {
      warnings.push(`Row ${r + 1}: missing required fields`);
      continue;
    }

    const tagFeatures = norm(get("tags"))
      ? norm(get("tags"))
          .split(";")
          .map(norm)
          .filter(Boolean)
      : [];

    const listedFeatures = norm(get("features"))
      ? norm(get("features"))
          .split(";")
          .map(norm)
          .filter(Boolean)
      : [];

    const features =
      tagFeatures.length || listedFeatures.length
        ? Array.from(new Set([...tagFeatures, ...listedFeatures]))
        : undefined;

    const noteText = norm(get("notes"));
    const maxResolution = parseResolution(get("maxResolution"));
    const latency = norm(get("latency")) || undefined;
    const inputs = intOrUndef(get("inputs"));
    const outputs = intOrUndef(get("outputs"));

    const item: CompetitorItem = {
      brand,
      sku: model,
      model,
      category,
      role,
      features,
      latency,
      io:
        typeof inputs === "number" || typeof outputs === "number"
          ? {
              inputs:
                typeof inputs === "number" && inputs > 0
                  ? Array.from({ length: inputs }, (_, i) => `Input ${i + 1}`)
                  : undefined,
              outputs:
                typeof outputs === "number" && outputs > 0
                  ? Array.from({ length: outputs }, (_, i) => `Output ${i + 1}`)
                  : undefined,
            }
          : undefined,
      video: maxResolution ? { maxResolution } : undefined,
      familyHint: noteText || undefined,
    };

    items.push(item);
  }

  return { items, warnings };
}