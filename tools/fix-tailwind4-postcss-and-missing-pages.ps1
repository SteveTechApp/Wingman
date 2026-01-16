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

WriteSection "Repo root"
if (-not (Test-Path -LiteralPath $RepoRoot)) { throw "RepoRoot not found: $RepoRoot" }
Write-Host $RepoRoot

Push-Location $RepoRoot
try {
  # ---------------------------
  # 1) Install Tailwind v4 PostCSS plugin
  # ---------------------------
  WriteSection "Install @tailwindcss/postcss (Tailwind v4 PostCSS plugin)"
  npm i -D @tailwindcss/postcss autoprefixer postcss | Out-Host

  # ---------------------------
  # 2) Rewrite postcss.config.cjs to Tailwind v4 style
  # ---------------------------
  WriteSection "Rewrite postcss.config.cjs (Tailwind v4)"
  $postcssPath = Join-Path $RepoRoot "postcss.config.cjs"
  BackupFile $postcssPath

  $postcss = @"
module.exports = {
  plugins: [
    require('@tailwindcss/postcss'),
    require('autoprefixer'),
  ],
};
"@
  WriteUtf8NoBom $postcssPath $postcss

  # ---------------------------
  # 3) Add missing route pages (placeholders)
  # ---------------------------
  WriteSection "Add missing page placeholders"
  $pagesDir = Join-Path $RepoRoot "src\pages"
  EnsureDir $pagesDir

  $missingPages = @(
    "VideoWallPage.tsx"
  )

  foreach ($f in $missingPages) {
    $p = Join-Path $pagesDir $f
    if (-not (Test-Path -LiteralPath $p)) {
      $name = [IO.Path]::GetFileNameWithoutExtension($f)
      $content = @"
import React from "react";

export default function $name() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">$name</h1>
      <p className="mt-2 text-sm opacity-80">
        Placeholder screen: $f was missing. Replace with the real implementation from oldWingman when ready.
      </p>
    </div>
  );
}
"@
      WriteUtf8NoBom $p $content
    } else {
      Write-Host ("OK: {0} already exists" -f $p) -ForegroundColor Green
    }
  }

  WriteSection "Done"
  Write-Host "Next: stop Vite if running, then run: npm run dev" -ForegroundColor Green
}
finally {
  Pop-Location
}
