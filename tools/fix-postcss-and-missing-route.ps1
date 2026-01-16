[CmdletBinding()]
param(
  [string]$RepoRoot = (Get-Location).Path,

  # If set, renames C:\Users\<you>\postcss.config.cjs to *.disabled_YYYYMMDD_HHMMSS
  [switch]$DisableGlobalPostCssConfig = $true
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

WriteSection "Repo root"
if (-not (Test-Path -LiteralPath $RepoRoot)) { throw "RepoRoot not found: $RepoRoot" }
Write-Host $RepoRoot

# ---------------------------
# 1) Ensure repo-local PostCSS config
# ---------------------------
WriteSection "PostCSS config (repo-local)"
$postcssPath = Join-Path $RepoRoot "postcss.config.cjs"
BackupFile $postcssPath

$postcss = @"
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
"@
WriteUtf8NoBom $postcssPath $postcss

# Ensure tailwind/postcss deps exist
WriteSection "Ensure Tailwind deps installed"
$pkgPath = Join-Path $RepoRoot "package.json"
if (-not (Test-Path -LiteralPath $pkgPath)) { throw "package.json not found at $pkgPath" }

# Use npm to add deps idempotently (npm will handle existing)
Push-Location $RepoRoot
try {
  # These are the typical deps needed for Tailwind+PostCSS
  # (tailwindcss provides the PostCSS plugin; you do NOT need @tailwindcss/postcss for standard setups)
  npm i -D tailwindcss postcss autoprefixer | Out-Host
} finally {
  Pop-Location
}

# Optionally disable global config that is interfering
if ($DisableGlobalPostCssConfig) {
  WriteSection "Disable global PostCSS config (if present)"
  $globalCfg = Join-Path $HOME "postcss.config.cjs"
  if (Test-Path -LiteralPath $globalCfg) {
    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $newName = $globalCfg + ".disabled_" + $stamp
    Rename-Item -LiteralPath $globalCfg -NewName (Split-Path -Leaf $newName) -Force
    Write-Host ("Renamed: {0} -> {1}" -f $globalCfg, $newName) -ForegroundColor Yellow
  } else {
    Write-Host "No global postcss.config.cjs found in user profile. Skipped."
  }
}

# ---------------------------
# 2) Missing route file: CustomerDiscoveryWizard
# ---------------------------
WriteSection "Route fix: CustomerDiscoveryWizard"
$wizardPath = Join-Path $RepoRoot "src\pages\CustomerDiscoveryWizard.tsx"
if (-not (Test-Path -LiteralPath $wizardPath)) {
  $placeholder = @"
import React from "react";

export default function CustomerDiscoveryWizard() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">Customer Discovery</h1>
      <p className="mt-2 text-sm opacity-80">
        Placeholder screen: CustomerDiscoveryWizard.tsx was missing.
        Replace this with the real wizard/page when you restore it from oldWingman.
      </p>
    </div>
  );
}
"@
  WriteUtf8NoBom $wizardPath $placeholder
} else {
  Write-Host "OK: CustomerDiscoveryWizard.tsx already exists." -ForegroundColor Green
}

WriteSection "Done"
Write-Host "Next: close Vite, then run: npm run dev" -ForegroundColor Green
