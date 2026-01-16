[CmdletBinding()]
param(
  [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

function WriteSection([string]$t) { Write-Host ""; Write-Host ("== {0} ==" -f $t) -ForegroundColor Cyan }
function EnsureDir([string]$p) { if (-not (Test-Path -LiteralPath $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null } }
function BackupFile([string]$p) {
  if (Test-Path -LiteralPath $p) {
    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    Copy-Item -LiteralPath $p -Destination ($p + ".bak_" + $stamp) -Force
    Write-Host ("Backup: {0}.bak_{1}" -f $p, $stamp)
  }
}
function WriteUtf8NoBom([string]$path, [string]$content) {
  $dir = Split-Path -Parent $path
  if ($dir) { EnsureDir $dir }
  [IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host ("Wrote: {0}" -f $path) -ForegroundColor Green
}

# Normalize path
$RepoRoot = (Get-Item -LiteralPath $RepoRoot).FullName

WriteSection "Fix 1/2: /index.css build-time warning"
$indexHtml = Join-Path $RepoRoot "index.html"
if (Test-Path -LiteralPath $indexHtml) {
  $html = Get-Content -LiteralPath $indexHtml -Raw

  # If index.html links to /index.css, remove it (we should rely on src/main.tsx importing css)
  if ($html -match 'href\s*=\s*["'']/index\.css["'']') {
    BackupFile $indexHtml
    $html2 = [Text.RegularExpressions.Regex]::Replace(
      $html,
      '(?m)^\s*<link[^>]*href\s*=\s*["'']/index\.css["''][^>]*>\s*$\r?\n?',
      ''
    )
    WriteUtf8NoBom $indexHtml $html2
    Write-Host "Removed <link href=""/index.css""> from index.html (Vite expects CSS via JS imports)." -ForegroundColor Yellow
  } else {
    Write-Host "No /index.css link found in index.html. Skipped."
  }
} else {
  Write-Host "index.html not found at repo root. Skipped." -ForegroundColor Yellow
}

WriteSection "Fix 2/2: Missing ./SimpleDiagram import"
$sysDiagram = Join-Path $RepoRoot "src\components\SystemDiagram.tsx"
$simpleDiagramTsx = Join-Path $RepoRoot "src\components\SimpleDiagram.tsx"

if (-not (Test-Path -LiteralPath $sysDiagram)) {
  Write-Host "SystemDiagram.tsx not found at src/components/SystemDiagram.tsx. Skipped." -ForegroundColor Yellow
} else {
  if (-not (Test-Path -LiteralPath $simpleDiagramTsx)) {
    # Create a minimal placeholder that won't break runtime
    $placeholder = @"
import React from "react";

export default function SimpleDiagram() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
      <div className="font-medium">Diagram placeholder</div>
      <div className="mt-1 opacity-80">
        SimpleDiagram.tsx was missing. Replace with the real diagram component when restored.
      </div>
    </div>
  );
}
"@
    WriteUtf8NoBom $simpleDiagramTsx $placeholder
  } else {
    Write-Host "SimpleDiagram.tsx already exists. Skipped." -ForegroundColor Green
  }

  # Ensure the import path casing matches exactly "./SimpleDiagram"
  $txt = Get-Content -LiteralPath $sysDiagram -Raw
  if ($txt -notmatch 'from\s+["'']\./SimpleDiagram["'']') {
    # If it imports ./simpleDiagram or similar, normalise it.
    $txt2 = $txt -replace 'from\s+["'']\./simplediagram["'']', 'from "./SimpleDiagram"'
    if ($txt2 -ne $txt) {
      BackupFile $sysDiagram
      WriteUtf8NoBom $sysDiagram $txt2
      Write-Host "Normalised import casing to ./SimpleDiagram" -ForegroundColor Yellow
    } else {
      Write-Host "Import path not changed (could already be correct)." -ForegroundColor Yellow
    }
  } else {
    Write-Host "SystemDiagram.tsx already imports ./SimpleDiagram. Good." -ForegroundColor Green
  }
}

WriteSection "Done"
Write-Host "Now run: npm run build" -ForegroundColor Green
