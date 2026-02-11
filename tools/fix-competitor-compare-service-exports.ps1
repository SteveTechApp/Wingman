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
  if (!(Test-Path $path)) { throw "Not found: $path" }
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  Copy-Item $path "$path.bak_$stamp" -Force
}

$path = "$Root\src\services\app\tools\competitor-compareComparisonService.ts"
if (!(Test-Path $path)) { throw "Not found: $path" }

Backup-File $path

$code = @"
export type CompetitorMatchInput = {
  competitor?: string;
  competitorSku?: string;
  model?: string;
  text?: string;
  requirements?: any;
};

export type CompetitorMatch = {
  competitorSku: string;
  wyrestormSku?: string;
  confidence?: number;
  notes?: string[];
};

export type CompetitorMatchResult = {
  summary: string;
  matches: CompetitorMatch[];
};

/**
 * Expected by CompetitorMatchFinderPanel.tsx
 * Minimal stub: returns no matches (unblocks build).
 * Replace later with real matching logic + data sources.
 */
export function findWyreStormMatches(input: CompetitorMatchInput): CompetitorMatchResult {
  const sku = input?.competitorSku || input?.model || "";
  return {
    summary: sku ? "No matches found (stub)." : "No input provided (stub).",
    matches: []
  };
}

/**
 * Backwards-compatible API (kept if other code calls it)
 */
export function runCompetitorCompare(input: CompetitorMatchInput): CompetitorMatchResult {
  return findWyreStormMatches(input);
}

export default {
  findWyreStormMatches,
  runCompetitorCompare
};
"@

Write-Utf8NoBom $path $code
Write-Host "✔ Patched competitor-compareComparisonService.ts (added findWyreStormMatches)"
Write-Host "Next: npm run build"
