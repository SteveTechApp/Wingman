$ErrorActionPreference = "Stop"

Set-Location "C:\Users\steve\wingman"

$root = (Get-Location).Path
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$rescueRoot = Join-Path $root "_RESCUE\competitor-upgrade-$stamp"

New-Item -ItemType Directory -Force -Path $rescueRoot | Out-Null

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  $dir = Split-Path $Path -Parent
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Backup-IfExists {
  param([string]$Path)

  if (Test-Path $Path) {
    $relative = $Path.Substring($root.Length).TrimStart('\')
    $dest = Join-Path $rescueRoot $relative
    $destDir = Split-Path $dest -Parent
    if ($destDir -and -not (Test-Path $destDir)) {
      New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    }
    Copy-Item -Path $Path -Destination $dest -Force
  }
}

function Ensure-ExportLine {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Line
  )

  if (-not (Test-Path $Path)) {
    Save-Utf8NoBom -Path $Path -Content ($Line + "`r`n")
    return
  }

  $text = Get-Content -Raw -Path $Path
  if ($text -notmatch [regex]::Escape($Line)) {
    Backup-IfExists $Path
    $updated = $text.TrimEnd() + "`r`n" + $Line + "`r`n"
    Save-Utf8NoBom -Path $Path -Content $updated
  }
}

function Set-File {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  Backup-IfExists $Path
  Save-Utf8NoBom -Path $Path -Content $Content
}

function New-SampleSkuRecords {
  $brands = @(
    @{ Name = "Extron"; Prefix = "DTP"; Transport = "DTP"; Categories = @("Extender","Matrix","Switcher","Encoder","Decoder") },
    @{ Name = "Kramer"; Prefix = "TP"; Transport = "HDBaseT"; Categories = @("Extender","Matrix","Switcher","Encoder","Decoder") },
    @{ Name = "Crestron"; Prefix = "DM"; Transport = "Unknown"; Categories = @("Extender","Matrix","Switcher","Encoder","Decoder") },
    @{ Name = "Atlona"; Prefix = "AT"; Transport = "HDBaseT"; Categories = @("Extender","Matrix","Switcher","Encoder","Decoder") },
    @{ Name = "Blustream"; Prefix = "BLU"; Transport = "HDBaseT"; Categories = @("Extender","Matrix","Switcher","Encoder","Decoder") },
    @{ Name = "ZeeVee"; Prefix = "ZV"; Transport = "AVoIP"; Categories = @("Encoder","Decoder","Matrix","Switcher","Extender") },
    @{ Name = "Lightware"; Prefix = "LW"; Transport = "Unknown"; Categories = @("Extender","Matrix","Switcher","Encoder","Decoder") },
    @{ Name = "AVPro Edge"; Prefix = "AVP"; Transport = "HDBaseT"; Categories = @("Extender","Matrix","Switcher","Encoder","Decoder") }
  )

  $records = New-Object System.Collections.Generic.List[string]

  foreach ($brand in $brands) {
    for ($i = 1; $i -le 30; $i++) {
      $category = $brand.Categories[($i - 1) % $brand.Categories.Count]
      $sku = "{0}-{1:D3}" -f $brand.Prefix, $i
      $name = "$($brand.Name) $category $i"

      $maxResolution = if ($i % 10 -eq 0) { "8K" } elseif ($i % 3 -eq 0) { "4K30" } else { "4K60" }
      $bandwidth = if ($maxResolution -eq "8K") { 40 } elseif ($maxResolution -eq "4K60") { 18 } else { 10.2 }
      $hdcp = if ($i % 2 -eq 0) { "2.2" } else { "2.3" }
      $inputs = if ($category -eq "Decoder") { @("AV over IP") } elseif ($category -eq "Encoder") { @("HDMI") } else { @("HDMI") }
      $outputs = if ($category -eq "Encoder") { @("AV over IP") } elseif ($category -eq "Extender") { @("HDBaseT") } else { @("HDMI") }

      $record = @"
  {
    id: "$($brand.Name.ToLower().Replace(' ', '-'))-$($sku.ToLower())",
    brand: "$($brand.Name)",
    sku: "$sku",
    name: "$name",
    category: "$category",
    family: "$($brand.Name) Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "$maxResolution", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: $bandwidth, confidence: "medium", source: "seed" },
      hdcp: { value: "$hdcp", confidence: "medium", source: "seed" },
      hdr: { value: $($(if ($i % 4 -eq 0) { "false" } else { "true" })), confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: [$(($inputs | ForEach-Object { '"' + $_ + '"' }) -join ", ")], confidence: "medium", source: "seed" },
      outputs: { value: [$(($outputs | ForEach-Object { '"' + $_ + '"' }) -join ", ")], confidence: "medium", source: "seed" },
      transport: { value: "$($brand.Transport)", confidence: "medium", source: "brand-template" },
      poe: { value: $($(if ($brand.Transport -eq "AVoIP") { "true" } else { "false" })), confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: $((70 + $i) % 150), confidence: "low", source: "seed" },
      maxMeters4k: { value: $((40 + $i) % 120), confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: $($(if ($i % 5 -eq 0) { "true" } else { "false" })), confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: $(150 + ($i * 25)), confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  }
"@
      $records.Add($record)
    }
  }

  return ($records -join ",`r`n")
}

$typesFile = Join-Path $root "src\competitor\types.ts"
$normaliseFile = Join-Path $root "src\competitor\normalise.ts"
$qualityFile = Join-Path $root "src\competitor\quality.ts"
$datasetFile = Join-Path $root "src\competitor\dataset.generated.ts"
$pipelineFile = Join-Path $root "src\competitor\pipeline.ts"
$uiFile = Join-Path $root "src\components\competitor\CompetitorSpecQualityPanel.tsx"
$indexCompetitorFile = Join-Path $root "src\competitor\index.ts"
$indexComponentFile = Join-Path $root "src\components\competitor\index.ts"
$templateCsvFile = Join-Path $root "data\competitors\competitor-import-template.csv"
$readmeFile = Join-Path $root "data\competitors\README.md"

$typesContent = @'
export type Confidence = "high" | "medium" | "low";

export type ResolutionValue = "8K" | "4K60" | "4K30" | "1080p";
export type TransportValue = "HDBaseT" | "AVoIP" | "DTP" | "SDVoE" | "Unknown";
export type AvailabilityValue = "stocked" | "special-order" | "end-of-life" | "unknown";

export type SpecField<T> = {
  value: T | undefined;
  confidence: Confidence;
  source?: string;
};

export type VideoSpec = {
  maxResolution: SpecField<ResolutionValue>;
  bandwidthGbps: SpecField<number>;
  hdcp: SpecField<string>;
  hdr: SpecField<boolean>;
};

export type ConnectivitySpec = {
  inputs: SpecField<string[]>;
  outputs: SpecField<string[]>;
  transport: SpecField<TransportValue>;
  poe: SpecField<boolean>;
};

export type DistanceSpec = {
  maxMeters1080p: SpecField<number>;
  maxMeters4k: SpecField<number>;
};

export type AudioSpec = {
  audioFormats: SpecField<string[]>;
  analogBreakout: SpecField<boolean>;
};

export type CommercialSpec = {
  estimatedStreetPriceGbp: SpecField<number>;
  availability: SpecField<AvailabilityValue>;
};

export type CompetitorItem = {
  id: string;
  brand: string;
  sku: string;
  name: string;
  category: string;
  family?: string;
  lifecycle?: "active" | "legacy" | "draft";
  notes?: string;
  sourceSummary?: string;
  lastUpdated: string;
  video: VideoSpec;
  connectivity: ConnectivitySpec;
  distance: DistanceSpec;
  audio: AudioSpec;
  commercial: CommercialSpec;
};

export type PartialCompetitorSeed = Partial<Omit<CompetitorItem, "video" | "connectivity" | "distance" | "audio" | "commercial">> & {
  video?: Partial<VideoSpec>;
  connectivity?: Partial<ConnectivitySpec>;
  distance?: Partial<DistanceSpec>;
  audio?: Partial<AudioSpec>;
  commercial?: Partial<CommercialSpec>;
};

export type EnrichmentWarning = {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
};

export type EnrichmentResult = {
  item: CompetitorItem;
  qualityScore: number;
  completenessBand: "complete" | "usable" | "needs-enrichment";
  warnings: EnrichmentWarning[];
};
'@

$normaliseContent = @'
import type {
  AvailabilityValue,
  CompetitorItem,
  Confidence,
  PartialCompetitorSeed,
  ResolutionValue,
  SpecField,
  TransportValue
} from "./types";

function lower(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function field<T>(value: T | undefined, confidence: Confidence, source?: string): SpecField<T> {
  return { value, confidence, source };
}

export function normaliseResolution(value: unknown): SpecField<ResolutionValue> {
  const v = lower(value);

  if (!v) return field(undefined, "low");
  if (v.includes("8k")) return field("8K", "high", "parsed");
  if (v.includes("4k") && (v.includes("60") || v.includes("@60"))) return field("4K60", "high", "parsed");
  if (v.includes("4k")) return field("4K30", "medium", "parsed");
  if (v.includes("1080")) return field("1080p", "medium", "parsed");

  return field(undefined, "low", "unparsed");
}

export function normaliseTransport(value: unknown): SpecField<TransportValue> {
  const v = lower(value);

  if (!v) return field("Unknown", "low");
  if (v.includes("hdbaset")) return field("HDBaseT", "high", "parsed");
  if (v.includes("avoip") || v.includes("av over ip")) return field("AVoIP", "high", "parsed");
  if (v.includes("dtp")) return field("DTP", "high", "parsed");
  if (v.includes("sdvoe")) return field("SDVoE", "high", "parsed");

  return field("Unknown", "low", "unparsed");
}

export function normaliseAvailability(value: unknown): SpecField<AvailabilityValue> {
  const v = lower(value);

  if (!v) return field("unknown", "low");
  if (v.includes("stock")) return field("stocked", "medium", "parsed");
  if (v.includes("special")) return field("special-order", "medium", "parsed");
  if (v.includes("end") || v.includes("eol")) return field("end-of-life", "high", "parsed");

  return field("unknown", "low", "unparsed");
}

export function parseStringList(value: unknown): string[] {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  return raw
    .split(/[;,|]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function parseNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

export function mergeSpecField<T>(current: SpecField<T> | undefined, incoming: SpecField<T> | undefined): SpecField<T> {
  if (!current && incoming) return incoming;
  if (current && !incoming) return current;
  if (!current && !incoming) return { value: undefined, confidence: "low" };

  const confidenceWeight: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };
  const currentWeight = confidenceWeight[current!.confidence];
  const incomingWeight = confidenceWeight[incoming!.confidence];

  return incomingWeight >= currentWeight ? incoming! : current!;
}

export function createBlankCompetitor(): CompetitorItem {
  return {
    id: "",
    brand: "",
    sku: "",
    name: "",
    category: "",
    family: "",
    lifecycle: "draft",
    notes: "",
    sourceSummary: "",
    lastUpdated: new Date().toISOString(),
    video: {
      maxResolution: field(undefined, "low"),
      bandwidthGbps: field(undefined, "low"),
      hdcp: field(undefined, "low"),
      hdr: field(undefined, "low")
    },
    connectivity: {
      inputs: field([], "low"),
      outputs: field([], "low"),
      transport: field("Unknown", "low"),
      poe: field(undefined, "low")
    },
    distance: {
      maxMeters1080p: field(undefined, "low"),
      maxMeters4k: field(undefined, "low")
    },
    audio: {
      audioFormats: field([], "low"),
      analogBreakout: field(undefined, "low")
    },
    commercial: {
      estimatedStreetPriceGbp: field(undefined, "low"),
      availability: field("unknown", "low")
    }
  };
}

export function cloneFromBase(base: CompetitorItem, overrides: PartialCompetitorSeed): CompetitorItem {
  return {
    ...base,
    ...overrides,
    video: {
      ...base.video,
      ...(overrides.video ?? {})
    },
    connectivity: {
      ...base.connectivity,
      ...(overrides.connectivity ?? {})
    },
    distance: {
      ...base.distance,
      ...(overrides.distance ?? {})
    },
    audio: {
      ...base.audio,
      ...(overrides.audio ?? {})
    },
    commercial: {
      ...base.commercial,
      ...(overrides.commercial ?? {})
    }
  };
}

export function normaliseRawRecord(record: Record<string, unknown>): CompetitorItem {
  const blank = createBlankCompetitor();

  const brand = String(record.brand ?? "").trim();
  const sku = String(record.sku ?? "").trim();
  const category = String(record.category ?? "").trim();
  const name = String(record.name ?? record.title ?? sku).trim();

  return {
    ...blank,
    id: `${brand}-${sku}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
    brand,
    sku,
    name,
    category,
    family: String(record.family ?? "").trim(),
    lifecycle: "active",
    notes: String(record.notes ?? "").trim(),
    sourceSummary: String(record.sourceSummary ?? record.source ?? "").trim(),
    lastUpdated: new Date().toISOString(),
    video: {
      maxResolution: normaliseResolution(record.maxResolution ?? record.resolution),
      bandwidthGbps: field(parseNumber(record.bandwidthGbps ?? record.bandwidth), record.bandwidthGbps ? "medium" : "low", "import"),
      hdcp: field(String(record.hdcp ?? "").trim() || undefined, record.hdcp ? "medium" : "low", "import"),
      hdr: field(
        String(record.hdr ?? "").trim() ? String(record.hdr).trim().toLowerCase() -eq "true" : undefined,
        record.hdr ? "medium" : "low",
        "import"
      )
    },
    connectivity: {
      inputs: field(parseStringList(record.inputs), parseStringList(record.inputs).length ? "medium" : "low", "import"),
      outputs: field(parseStringList(record.outputs), parseStringList(record.outputs).length ? "medium" : "low", "import"),
      transport: normaliseTransport(record.transport),
      poe: field(
        String(record.poe ?? "").trim() ? String(record.poe).trim().toLowerCase() -eq "true" : undefined,
        record.poe ? "medium" : "low",
        "import"
      )
    },
    distance: {
      maxMeters1080p: field(parseNumber(record.maxMeters1080p), record.maxMeters1080p ? "medium" : "low", "import"),
      maxMeters4k: field(parseNumber(record.maxMeters4k), record.maxMeters4k ? "medium" : "low", "import")
    },
    audio: {
      audioFormats: field(parseStringList(record.audioFormats), parseStringList(record.audioFormats).length ? "low" : "low", "import"),
      analogBreakout: field(
        String(record.analogBreakout ?? "").trim() ? String(record.analogBreakout).trim().toLowerCase() -eq "true" : undefined,
        record.analogBreakout ? "low" : "low",
        "import"
      )
    },
    commercial: {
      estimatedStreetPriceGbp: field(parseNumber(record.estimatedStreetPriceGbp ?? record.priceGbp), record.estimatedStreetPriceGbp ? "low" : "low", "import"),
      availability: normaliseAvailability(record.availability)
    }
  };
}
'@ -replace '-eq', '==='

$qualityContent = @'
import type { CompetitorItem, EnrichmentResult, EnrichmentWarning, SpecField } from "./types";

function hasValue<T>(field: SpecField<T> | undefined): boolean {
  if (!field) return false;
  if (Array.isArray(field.value)) return field.value.length > 0;
  return field.value !== undefined && field.value !== null && field.value !== "";
}

function confidenceScore(value: "high" | "medium" | "low"): number {
  if (value === "high") return 1;
  if (value === "medium") return 0.7;
  return 0.4;
}

export function calculateQualityScore(item: CompetitorItem): number {
  const checks: Array<{ ok: boolean; weight: number; confidence: "high" | "medium" | "low" }> = [
    { ok: hasValue(item.video.maxResolution), weight: 15, confidence: item.video.maxResolution.confidence },
    { ok: hasValue(item.video.bandwidthGbps), weight: 10, confidence: item.video.bandwidthGbps.confidence },
    { ok: hasValue(item.video.hdcp), weight: 8, confidence: item.video.hdcp.confidence },
    { ok: hasValue(item.connectivity.transport), weight: 15, confidence: item.connectivity.transport.confidence },
    { ok: hasValue(item.connectivity.inputs), weight: 10, confidence: item.connectivity.inputs.confidence },
    { ok: hasValue(item.connectivity.outputs), weight: 10, confidence: item.connectivity.outputs.confidence },
    { ok: hasValue(item.distance.maxMeters1080p), weight: 8, confidence: item.distance.maxMeters1080p.confidence },
    { ok: hasValue(item.distance.maxMeters4k), weight: 8, confidence: item.distance.maxMeters4k.confidence },
    { ok: hasValue(item.audio.audioFormats), weight: 6, confidence: item.audio.audioFormats.confidence },
    { ok: hasValue(item.commercial.estimatedStreetPriceGbp), weight: 5, confidence: item.commercial.estimatedStreetPriceGbp.confidence },
    { ok: hasValue(item.commercial.availability), weight: 5, confidence: item.commercial.availability.confidence }
  ];

  const total = checks.reduce((sum, row) => {
    if (!row.ok) return sum;
    return sum + (row.weight * confidenceScore(row.confidence));
  }, 0);

  return Math.max(0, Math.min(100, Math.round(total)));
}

export function qualityBand(score: number): "complete" | "usable" | "needs-enrichment" {
  if (score >= 80) return "complete";
  if (score >= 50) return "usable";
  return "needs-enrichment";
}

export function buildWarnings(item: CompetitorItem): EnrichmentWarning[] {
  const warnings: EnrichmentWarning[] = [];

  if (!item.brand) warnings.push({ code: "missing-brand", message: "Brand is missing.", severity: "error" });
  if (!item.sku) warnings.push({ code: "missing-sku", message: "SKU is missing.", severity: "error" });
  if (!hasValue(item.video.maxResolution)) warnings.push({ code: "missing-resolution", message: "Maximum video resolution is missing.", severity: "warning" });
  if (!hasValue(item.connectivity.transport) || item.connectivity.transport.value === "Unknown") warnings.push({ code: "missing-transport", message: "Transport type is unknown or missing.", severity: "warning" });
  if (!hasValue(item.connectivity.inputs)) warnings.push({ code: "missing-inputs", message: "Input connectivity is missing.", severity: "info" });
  if (!hasValue(item.connectivity.outputs)) warnings.push({ code: "missing-outputs", message: "Output connectivity is missing.", severity: "info" });

  return warnings;
}

export function enrichCompetitorRecord(item: CompetitorItem): EnrichmentResult {
  const score = calculateQualityScore(item);
  return {
    item,
    qualityScore: score,
    completenessBand: qualityBand(score),
    warnings: buildWarnings(item)
  };
}
'@

$datasetRecords = New-SampleSkuRecords
$datasetContent = @"
import type { CompetitorItem } from "./types";

export const competitorDatasetGenerated: CompetitorItem[] = [
$datasetRecords
];
"@

$pipelineContent = @'
import { competitorDatasetGenerated } from "./dataset.generated";
import { enrichCompetitorRecord, qualityBand } from "./quality";
import { cloneFromBase, normaliseRawRecord } from "./normalise";
import type { CompetitorItem, EnrichmentResult, PartialCompetitorSeed } from "./types";

export function loadCompetitorDataset(): CompetitorItem[] {
  return competitorDatasetGenerated;
}

export function buildIndex(items: CompetitorItem[]): Record<string, CompetitorItem> {
  const map: Record<string, CompetitorItem> = {};
  for (const item of items) {
    const key = `${item.brand}::${item.sku}`.toLowerCase();
    map[key] = item;
  }
  return map;
}

export function importRawRecords(rows: Array<Record<string, unknown>>): CompetitorItem[] {
  return rows.map(normaliseRawRecord);
}

export function createVariant(base: CompetitorItem, overrides: PartialCompetitorSeed): CompetitorItem {
  return cloneFromBase(base, overrides);
}

export function enrichDataset(items: CompetitorItem[]): EnrichmentResult[] {
  return items.map(enrichCompetitorRecord);
}

export function summariseDataset(items: CompetitorItem[]): {
  total: number;
  complete: number;
  usable: number;
  needsEnrichment: number;
  byBrand: Record<string, number>;
} {
  const enriched = enrichDataset(items);

  const byBrand: Record<string, number> = {};
  for (const item of items) {
    byBrand[item.brand] = (byBrand[item.brand] ?? 0) + 1;
  }

  return {
    total: items.length,
    complete: enriched.filter((x) => qualityBand(x.qualityScore) === "complete").length,
    usable: enriched.filter((x) => qualityBand(x.qualityScore) === "usable").length,
    needsEnrichment: enriched.filter((x) => qualityBand(x.qualityScore) === "needs-enrichment").length,
    byBrand
  };
}
'@

$uiContent = @'
import * as React from "react";
import { enrichCompetitorRecord } from "@/competitor/quality";
import type { CompetitorItem, SpecField } from "@/competitor/types";

type Props = {
  item: CompetitorItem;
  compact?: boolean;
};

function badgeTone(confidence: "high" | "medium" | "low"): React.CSSProperties {
  if (confidence === "high") {
    return { background: "rgba(34,197,94,0.18)", color: "#dcfce7", border: "1px solid rgba(34,197,94,0.35)" };
  }
  if (confidence === "medium") {
    return { background: "rgba(250,204,21,0.16)", color: "#fef3c7", border: "1px solid rgba(250,204,21,0.35)" };
  }
  return { background: "rgba(239,68,68,0.16)", color: "#fecaca", border: "1px solid rgba(239,68,68,0.35)" };
}

function bandTone(band: "complete" | "usable" | "needs-enrichment"): React.CSSProperties {
  if (band === "complete") {
    return { background: "rgba(34,197,94,0.18)", color: "#dcfce7", border: "1px solid rgba(34,197,94,0.35)" };
  }
  if (band === "usable") {
    return { background: "rgba(59,130,246,0.18)", color: "#dbeafe", border: "1px solid rgba(59,130,246,0.35)" };
  }
  return { background: "rgba(249,115,22,0.16)", color: "#fed7aa", border: "1px solid rgba(249,115,22,0.35)" };
}

function formatValue<T>(field: SpecField<T>): string {
  const value = field.value;

  if (Array.isArray(value)) return value.length ? value.join(", ") : "Missing";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === undefined || value === null || value === "") return "Missing";

  return String(value);
}

function SpecRow(props: { label: string; field: SpecField<unknown> }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "160px 1fr auto",
        gap: 12,
        alignItems: "center",
        padding: "8px 0",
        borderBottom: "1px solid rgba(255,255,255,0.07)"
      }}
    >
      <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 12 }}>{props.label}</div>
      <div style={{ color: "white", fontSize: 13, fontWeight: 700 }}>{formatValue(props.field)}</div>
      <div
        style={{
          ...badgeTone(props.field.confidence),
          padding: "4px 8px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: 0.4
        }}
      >
        {props.field.confidence}
      </div>
    </div>
  );
}

export default function CompetitorSpecQualityPanel({ item, compact = false }: Props) {
  const enriched = React.useMemo(() => enrichCompetitorRecord(item), [item]);

  return (
    <section
      style={{
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg, rgba(10,14,24,0.96), rgba(16,22,36,0.92))",
        padding: compact ? 16 : 20,
        boxShadow: "0 24px 60px rgba(0,0,0,0.28)"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
            Competitor data quality
          </div>
          <div style={{ color: "white", fontSize: 18, fontWeight: 900 }}>
            {item.brand} {item.sku}
          </div>
          <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 13 }}>
            {item.name || item.category}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div
            style={{
              ...bandTone(enriched.completenessBand),
              borderRadius: 999,
              padding: "6px 10px",
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.4
            }}
          >
            {enriched.completenessBand.replace("-", " ")}
          </div>

          <div
            style={{
              borderRadius: 999,
              padding: "6px 10px",
              fontSize: 11,
              fontWeight: 800,
              color: "white",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)"
            }}
          >
            Score {enriched.qualityScore}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 2 }}>
        <SpecRow label="Max resolution" field={item.video.maxResolution} />
        <SpecRow label="Bandwidth" field={item.video.bandwidthGbps} />
        <SpecRow label="HDCP" field={item.video.hdcp} />
        <SpecRow label="Inputs" field={item.connectivity.inputs} />
        <SpecRow label="Outputs" field={item.connectivity.outputs} />
        <SpecRow label="Transport" field={item.connectivity.transport} />
        <SpecRow label="4K distance" field={item.distance.maxMeters4k} />
        <SpecRow label="1080p distance" field={item.distance.maxMeters1080p} />
        <SpecRow label="Audio formats" field={item.audio.audioFormats} />
        <SpecRow label="Street price GBP" field={item.commercial.estimatedStreetPriceGbp} />
      </div>

      {enriched.warnings.length > 0 ? (
        <div style={{ marginTop: 14 }}>
          <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            Enrichment warnings
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {enriched.warnings.map((warning) => (
              <div
                key={warning.code}
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.04)",
                  padding: "10px 12px"
                }}
              >
                <div style={{ color: "white", fontWeight: 700, fontSize: 13 }}>{warning.message}</div>
                <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 11, marginTop: 3 }}>
                  {warning.severity.toUpperCase()} • {warning.code}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
'@

$templateCsvContent = @'
brand,sku,name,category,family,maxResolution,bandwidthGbps,hdcp,hdr,inputs,outputs,transport,poe,maxMeters1080p,maxMeters4k,audioFormats,analogBreakout,estimatedStreetPriceGbp,availability,notes,sourceSummary
Extron,DTP3-T-202,Extron DTP3 T 202,Extender,DTP,4K60,18,2.3,true,HDMI,HDBaseT,DTP,false,100,70,PCM;Dolby Digital,false,795,stocked,Manufacturer-published starter row,Manufacturer website
Kramer,TP-580T,Kramer TP-580T,Extender,TP,4K60,18,2.2,true,HDMI,HDBaseT,HDBaseT,false,100,70,PCM,false,499,stocked,Distributor import starter row,Distributor feed
'@

$readmeContent = @'
# Competitor data import folder

## Purpose
This folder supports the Wingman competitor intelligence pipeline.

## Files
- `competitor-import-template.csv` : starter format for manual or distributor imports
- `dataset.generated.ts` : generated TypeScript starter dataset created by the upgrade script
- `README.md` : usage notes

## Recommended process
1. Import manufacturer or distributor data into the CSV template.
2. Convert raw rows with `normaliseRawRecord`.
3. Run `enrichDataset` to score completeness and flag missing fields.
4. Display each item with `CompetitorSpecQualityPanel`.
5. Replace seeded records with verified data over time.

## Notes
The generated dataset is only a scaffold to increase SKU count quickly.
Use manufacturer websites, distributor feeds, and PDF extraction to improve confidence levels.
'@

Set-File -Path $typesFile -Content $typesContent
Set-File -Path $normaliseFile -Content $normaliseContent
Set-File -Path $qualityFile -Content $qualityContent
Set-File -Path $datasetFile -Content $datasetContent
Set-File -Path $pipelineFile -Content $pipelineContent
Set-File -Path $uiFile -Content $uiContent
Set-File -Path $templateCsvFile -Content $templateCsvContent.TrimStart("`r","`n")
Set-File -Path $readmeFile -Content $readmeContent.TrimStart("`r","`n")

Ensure-ExportLine -Path $indexCompetitorFile -Line 'export * from "./types";'
Ensure-ExportLine -Path $indexCompetitorFile -Line 'export * from "./normalise";'
Ensure-ExportLine -Path $indexCompetitorFile -Line 'export * from "./quality";'
Ensure-ExportLine -Path $indexCompetitorFile -Line 'export * from "./pipeline";'
Ensure-ExportLine -Path $indexCompetitorFile -Line 'export * from "./dataset.generated";'

Ensure-ExportLine -Path $indexComponentFile -Line 'export { default as CompetitorSpecQualityPanel } from "./CompetitorSpecQualityPanel";'

$sampleUsageFile = Join-Path $root "src\components\competitor\CompetitorSpecQualityPanel.sample.tsx"
$sampleUsageContent = @'
import * as React from "react";
import CompetitorSpecQualityPanel from "./CompetitorSpecQualityPanel";
import { competitorDatasetGenerated } from "@/competitor/dataset.generated";

export default function CompetitorSpecQualityPanelSample() {
  const item = competitorDatasetGenerated[0];
  return (
    <div style={{ padding: 24 }}>
      <CompetitorSpecQualityPanel item={item} />
    </div>
  );
}
'@
Set-File -Path $sampleUsageFile -Content $sampleUsageContent

Write-Host ""
Write-Host "Competitor upgrade completed." -ForegroundColor Green
Write-Host "Rescue backup: $rescueRoot" -ForegroundColor Yellow
Write-Host ""
Write-Host "Created / updated:" -ForegroundColor Cyan
Write-Host " - src\competitor\types.ts"
Write-Host " - src\competitor\normalise.ts"
Write-Host " - src\competitor\quality.ts"
Write-Host " - src\competitor\pipeline.ts"
Write-Host " - src\competitor\dataset.generated.ts"
Write-Host " - src\components\competitor\CompetitorSpecQualityPanel.tsx"
Write-Host " - data\competitors\competitor-import-template.csv"
Write-Host ""
Write-Host "Next commands:" -ForegroundColor Cyan
Write-Host "  npm run typecheck"
Write-Host "  npm run build"
Write-Host ""
Write-Host "Integration note:" -ForegroundColor Cyan
Write-Host "Import CompetitorSpecQualityPanel into your compare page and render it with the selected competitor item."