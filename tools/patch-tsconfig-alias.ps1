$ErrorActionPreference = "Stop"

$tsconfig = "tsconfig.json"

if (-not (Test-Path $tsconfig)) {
  throw "tsconfig.json not found in repo root"
}

$raw = Get-Content $tsconfig -Raw
$cfg = $raw | ConvertFrom-Json -AsHashtable

if (-not $cfg.ContainsKey("compilerOptions")) {
  $cfg["compilerOptions"] = @{}
}

$cfg["compilerOptions"]["baseUrl"] = "."

if (-not $cfg["compilerOptions"].ContainsKey("paths")) {
  $cfg["compilerOptions"]["paths"] = @{}
}

$cfg["compilerOptions"]["paths"]["@/*"] = @("./src/*")

Copy-Item $tsconfig "$tsconfig.bak_$(Get-Date -Format yyyyMMdd_HHmmss)"

$cfg | ConvertTo-Json -Depth 50 |
  Set-Content -Encoding UTF8 $tsconfig

Write-Host "OK: tsconfig.json patched (@/* alias enabled)" -ForegroundColor Green
