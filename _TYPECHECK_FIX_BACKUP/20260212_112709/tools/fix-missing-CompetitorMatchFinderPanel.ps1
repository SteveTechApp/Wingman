$ErrorActionPreference = "Stop"
$Root = "C:\Users\steve\wingman"
Set-Location $Root

function Write-Utf8NoBom([string]$path, [string]$content) {
  $dir = Split-Path $path -Parent
  if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $utf8)
}

# Expected missing module path (from Vite error)
$shimPath = Join-Path $Root "src\components\app\tools\competitor-compare\CompetitorMatchFinderPanel.tsx"
if (Test-Path $shimPath) {
  Write-Host "✔ Already exists: $shimPath"
  exit 0
}

Write-Host "Scanning for CompetitorMatchFinderPanel candidates..."

# 1) Prefer exact filename hits
$candidates = Get-ChildItem "$Root\src" -Recurse -File -Include "CompetitorMatchFinderPanel.tsx","CompetitorMatchFinderPanel.ts" |
  Where-Object { $_.FullName -notmatch "\\node_modules\\" }

# 2) If none, search by exported symbol/component name
if ($candidates.Count -eq 0) {
  $candidates = Get-ChildItem "$Root\src" -Recurse -File -Include *.ts,*.tsx |
    Where-Object { $_.FullName -notmatch "\\node_modules\\" } |
    Where-Object {
      $t = Get-Content $_.FullName -Raw
      $t -match "function\s+CompetitorMatchFinderPanel\b|const\s+CompetitorMatchFinderPanel\b|export\s+default\s+function\s+CompetitorMatchFinderPanel\b|export\s+default\s+CompetitorMatchFinderPanel\b"
    }
}

# Rank: prefer src/components/competitor/* if present, then anything else
$best = $candidates |
  Sort-Object @{
    Expression = {
      $p = $_.FullName.ToLower()
      $score = 0
      if ($p -match "\\src\\components\\competitor\\") { $score += 100 }
      if ($p -match "\\src\\components\\") { $score += 10 }
      if ($_.Name.ToLower() -eq "competitormatchfinderpanel.tsx") { $score += 20 }
      -1 * $score
    }
  } |
  Select-Object -First 1

if ($null -ne $best) {
  Write-Host "Best match found:"
  Write-Host "  $($best.FullName)"

  # Create shim that re-exports the found module via @/ alias
  $srcRoot = Join-Path $Root "src"
  $relToSrc = $best.FullName.Substring($srcRoot.Length).TrimStart("\")
  $aliasPath = "@/" + ($relToSrc -replace "\\","/") -replace "\.(ts|tsx)$",""

  $shim = @"
export * from "$aliasPath";
export { default } from "$aliasPath";
"@

  Write-Utf8NoBom $shimPath $shim
  Write-Host "✔ Created shim:"
  Write-Host "  src/components/app/tools/competitor-compare/CompetitorMatchFinderPanel.tsx"
  Write-Host "  -> re-exporting $aliasPath"
  Write-Host ""
  Write-Host "Next: npm run build"
  exit 0
}

Write-Host "No candidate found. Creating a minimal placeholder component to unblock build..."

$placeholder = @"
import React from "react";

export default function CompetitorMatchFinderPanel() {
  return (
    <div style={{
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(255,255,255,0.05)",
      padding: 14
    }}>
      <div style={{ fontWeight: 900, fontSize: 13 }}>Competitor Match Finder</div>
      <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
        Placeholder panel: original component not found in src/.
      </div>
    </div>
  );
}
"@

Write-Utf8NoBom $shimPath $placeholder
Write-Host "✔ Created placeholder at: $shimPath"
Write-Host "Next: npm run build"
