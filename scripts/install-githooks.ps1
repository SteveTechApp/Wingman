Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = (Get-Location).Path
$hooksPath = Join-Path $root ".githooks"

if (-not (Test-Path $hooksPath)) {
  throw ".githooks folder not found at $hooksPath"
}

git config core.hooksPath .githooks
if ($LASTEXITCODE -ne 0) {
  throw "Failed to set Git hooks path."
}

Write-Host "Git hooks installed from .githooks" -ForegroundColor Green