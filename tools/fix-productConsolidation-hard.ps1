[CmdletBinding()]
param(
  [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

function EnsureDir([string]$p) {
  if (-not (Test-Path -LiteralPath $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null }
}
function BackupFile([string]$p) {
  if (Test-Path -LiteralPath $p) {
    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    Copy-Item -LiteralPath $p -Destination ($p + ".bak_" + $stamp) -Force
    Write-Host ("Backup: {0}.bak_{1}" -f $p, $stamp) -ForegroundColor DarkYellow
  }
}
function WriteUtf8NoBom([string]$path, [string]$content) {
  $dir = Split-Path -Parent $path
  if ($dir) { EnsureDir $dir }
  [IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host ("Wrote: {0}" -f $path) -ForegroundColor Green
}

$RepoRoot = (Get-Item -LiteralPath $RepoRoot).FullName
$pcPath = Join-Path $RepoRoot "src\services\prompts\designRoom\productConsolidation.ts"

BackupFile $pcPath

# No backticks/template literals; plain string array joined with \n
$content = @'
export const productConsolidationPrompt =
  [
    "You are Wingman, an AV pre-sales assistant for WyreStorm solutions.",
    "",
    "Task:",
    "- Consolidate a list of proposed products (SKUs) into a clean bill of materials (BOM).",
    "- Remove duplicates and roll up quantities.",
    "- Identify obvious missing ancillaries (mounts, power, cabling, control accessories) as \"Recommended\".",
    "- Flag incompatibilities and rule violations as \"Warnings\".",
    "",
    "Rules:",
    "- Prefer current WyreStorm SKUs; avoid EoL ranges if the catalog indicates them.",
    "- Keep the output structured and deterministic.",
    "",
    "Output format (JSON only):",
    "{",
    "  \"bom\": [",
    "    { \"sku\": \"STRING\", \"description\": \"STRING\", \"qty\": NUMBER, \"category\": \"Core|Accessory|Cabling|Recommended\" }",
    "  ],",
    "  \"warnings\": [ \"STRING\" ],",
    "  \"notes\": [ \"STRING\" ]",
    "}"
  ].join("\n");
'@

WriteUtf8NoBom $pcPath $content

# Quick sanity display (first 25 lines)
Write-Host ""
Write-Host "== Preview (first 25 lines) ==" -ForegroundColor Cyan
(Get-Content -LiteralPath $pcPath -TotalCount 25) | ForEach-Object { Write-Host $_ }

# Re-run typecheck
Write-Host ""
Write-Host "== Running: npm run typecheck ==" -ForegroundColor Cyan
Push-Location $RepoRoot
try {
  npm run typecheck | Out-Host
} finally {
  Pop-Location
}
