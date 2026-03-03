$ErrorActionPreference = "Stop"
$Root = "C:\Users\steve\wingman"
Set-Location $Root

function Write-Utf8NoBom([string]$path, [string]$content) {
  $dir = Split-Path $path -Parent
  if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $utf8)
}

function Backup-File([string]$path) {
  if (!(Test-Path $path)) { return }
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  Copy-Item $path "$path.bak_$stamp" -Force
}

# 1) Ensure textExtractors exports extractTextFromFile (and helpers)
$te = "$Root\src\app\import\textExtractors.ts"
if (!(Test-Path $te)) { throw "Not found: $te" }
Backup-File $te

$teCode = @"
export type ExtractorResult = { text: string; meta?: Record<string, any> };
export type TextExtractor = (input: unknown) => ExtractorResult;

export function extractPlainText(input: unknown): ExtractorResult {
  if (input == null) return { text: "" };
  if (typeof input === "string") return { text: input };

  // File/Blob: handled async by extractTextFromFile
  if (typeof Blob !== "undefined" && input instanceof Blob) {
    return { text: "", meta: { note: "Blob provided; use extractTextFromFile() async." } };
  }

  if (Array.isArray(input)) {
    const joined = input.map(x => extractPlainText(x).text).filter(Boolean).join("\n");
    return { text: joined };
  }

  if (typeof input === "object") {
    try { return { text: JSON.stringify(input, null, 2), meta: { format: "json" } }; }
    catch { return { text: String(input) }; }
  }

  return { text: String(input) };
}

export async function extractFromBlobAsync(blob: Blob): Promise<ExtractorResult> {
  const text = await blob.text();
  return { text, meta: { format: "blobText" } };
}

/**
 * Expected by ImportIntakePage.tsx
 * Reads a File (or Blob) and returns extracted text.
 * Minimal implementation: uses .text() (works for txt, csv, json, many doc exports).
 */
export async function extractTextFromFile(file: File | Blob): Promise<string> {
  const res = await extractFromBlobAsync(file as Blob);
  return res.text || "";
}

export function extractKeyValueLines(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  (text || "").split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([^:]{2,50})\s*:\s*(.+)\s*$/);
    if (!m) return;
    const key = m[1].trim();
    const val = m[2].trim();
    if (key && val) out[key] = val;
  });
  return out;
}

export const textExtractors = {
  extractPlainText,
  extractFromBlobAsync,
  extractTextFromFile,
  extractKeyValueLines
};

export default textExtractors;
"@

Write-Utf8NoBom $te $teCode
Write-Host "✔ Updated: src/app/import/textExtractors.ts (added extractTextFromFile export)"

# 2) Ensure recommendWyrestorm exists + exports recommendWyrestorm
$rw = "$Root\src\app\import\recommendWyrestorm.ts"
if (!(Test-Path $rw)) {
  $rwNoExt = "$Root\src\app\import\recommendWyrestorm"
  if (Test-Path $rwNoExt) { Move-Item $rwNoExt $rw -Force }
}
if (!(Test-Path $rw)) {
  $rwCode = @"
export type WyrestormRecommendation = {
  summary: string;
  skus?: string[];
  notes?: string[];
  confidence?: number;
};

/**
 * Minimal stub to unblock builds.
 * Input is typically { rawText, requirements, kv } from extractRequirements().
 */
export function recommendWyrestorm(input: any): WyrestormRecommendation {
  const notes: string[] = [];
  const raw = (input?.rawText ?? input?.text ?? "").toString().toLowerCase();

  // Very light heuristics
  if (raw.includes("video wall") || raw.includes("videowall")) {
    notes.push("Detected video wall intent.");
    return { summary: "Consider Video Wall workflow (NHD + controller/processor).", skus: [], notes, confidence: 0.4 };
  }
  if (raw.includes("av over ip") || raw.includes("avoip") || raw.includes("nhd")) {
    notes.push("Detected AVoIP intent.");
    return { summary: "Consider NHD-based AVoIP solution.", skus: [], notes, confidence: 0.4 };
  }

  return { summary: "No strong match from stub recommender.", skus: [], notes, confidence: 0.2 };
}

export default recommendWyrestorm;
"@
  Write-Utf8NoBom $rw $rwCode
  Write-Host "✔ Created: src/app/import/recommendWyrestorm.ts"
} else {
  # If file exists but may not export recommendWyrestorm, leave it for now (avoid overwriting real logic)
  Write-Host "ℹ Found: src/app/import/recommendWyrestorm.ts (left unchanged)"
}

# 3) recentTools module expected by src/components/tools/ToolGrid.tsx
$rt = "$Root\src\components\app\tools\recentTools.ts"
if (!(Test-Path $rt)) {
  $rtCode = @"
export type RecentTool = { title: string; href: string; ts?: number };

const KEY = "wingman.recentTools.v1";

export function getRecentTools(limit = 6): RecentTool[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, limit);
  } catch {
    return [];
  }
}

export function pushRecentTool(tool: RecentTool, limit = 12) {
  try {
    const items = getRecentTools(100).filter(t => t.href !== tool.href);
    items.unshift({ ...tool, ts: tool.ts ?? Date.now() });
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, limit)));
  } catch {}
}

export default { getRecentTools, pushRecentTool };
"@
  Write-Utf8NoBom $rt $rtCode
  Write-Host "✔ Created: src/components/app/tools/recentTools.ts"
} else {
  Write-Host "ℹ Found: src/components/app/tools/recentTools.ts"
}

# 4) competitor compare service typo-path stub (competitor-compareComparisonService)
# Create a minimal module exporting a default + a named service factory
$svc = "$Root\src\services\app\tools\competitor-compareComparisonService.ts"
if (!(Test-Path $svc)) {
  $svcCode = @"
export type CompetitorCompareInput = {
  competitor?: string;
  model?: string;
  requirements?: any;
};

export type CompetitorCompareResult = {
  summary: string;
  matches?: Array<{ competitorSku: string; wyrestormSku?: string; notes?: string[] }>;
};

/**
 * Minimal stub to unblock builds.
 */
export function runCompetitorCompare(input: CompetitorCompareInput): CompetitorCompareResult {
  return {
    summary: "Competitor comparison service stub (no matching logic implemented).",
    matches: []
  };
}

export default { runCompetitorCompare };
"@
  Write-Utf8NoBom $svc $svcCode
  Write-Host "✔ Created: src/services/app/tools/competitor-compareComparisonService.ts"
} else {
  Write-Host "ℹ Found: src/services/app/tools/competitor-compareComparisonService.ts"
}

Write-Host ""
Write-Host "Next:"
Write-Host "  npm run build"
