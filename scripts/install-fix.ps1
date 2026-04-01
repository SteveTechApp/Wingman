Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location C:\Users\steve\wingman

# Ensure folders exist
foreach ($dir in @("scripts","tools","_AUDITS","_RESCUE","_WORK")) {
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
}

# -----------------------------
# FIX safe-replace.ps1
# -----------------------------
@'
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

param(
  [string]$TargetPath,
  [string]$Pattern,
  [string]$Replacement,
  [switch]$Regex,
  [switch]$Multiple
)

$targetFull = Join-Path (Get-Location).Path $TargetPath

if (-not (Test-Path $targetFull)) {
  throw "Target file not found: $TargetPath"
}

$text = Get-Content $targetFull -Raw

if ($Regex) {
  if ($Multiple) {
    $updated = [regex]::Replace($text, $Pattern, $Replacement)
  } else {
    $updated = [regex]::Replace($text, $Pattern, $Replacement, 1)
  }
} else {
  if ($Multiple) {
    $updated = $text.Replace($Pattern, $Replacement)
  } else {
    $i = $text.IndexOf($Pattern)
    if ($i -lt 0) { throw "Pattern not found" }
    $updated = $text.Substring(0, $i) + $Replacement + $text.Substring($i + $Pattern.Length)
  }
}

$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($targetFull, $updated, $utf8)

Write-Host "safe-replace OK"
'@ | Set-Content .\scripts\safe-replace.ps1 -Encoding UTF8

# -----------------------------
# FIX route-smoke-check.mjs
# -----------------------------
@'
import fs from "fs";

const content = fs.readFileSync("src/core/wingman/routeMap.ts", "utf-8");

// Only check BEFORE legacy redirects
const mainSection = content.split("const legacyRouteRedirects")[0];

if (mainSection.includes("/wingman/")) {
  throw new Error("Legacy /wingman/ routes found in main routeMap");
}

console.log("Route check passed");
'@ | Set-Content .\tools\route-smoke-check.mjs -Encoding UTF8

Write-Host ""
Write-Host "Wingman fix installer complete." -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEP:"
Write-Host "npm run repo:health"