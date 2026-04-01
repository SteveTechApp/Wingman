Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Section {
  param([string]$Title)
  Write-Host ""
  Write-Host "=== $Title ===" -ForegroundColor Cyan
}

function Fail {
  param([string]$Message)
  Write-Host "FAIL: $Message" -ForegroundColor Red
  $script:HasFailure = $true
}

function Pass {
  param([string]$Message)
  Write-Host "OK: $Message" -ForegroundColor Green
}

$script:HasFailure = $false
$root = (Get-Location).Path

Write-Section "Git status"
git status --short

Write-Section "Typecheck"
npm run typecheck
if ($LASTEXITCODE -ne 0) {
  Fail "Typecheck failed"
} else {
  Pass "Typecheck passed"
}

Write-Section "Build"
npm run build
if ($LASTEXITCODE -ne 0) {
  Fail "Build failed"
} else {
  Pass "Build passed"
}

Write-Section "Route check"
$pkgPath = Join-Path $root "package.json"
$pkgText = Get-Content $pkgPath -Raw
if ($pkgText -match '"check:routes"\s*:') {
  npm run check:routes
  if ($LASTEXITCODE -ne 0) {
    Fail "Route check failed"
  } else {
    Pass "Route check passed"
  }
} else {
  Pass "Route check script not present, skipped"
}

Write-Section "Nested duplicate project check"
$nestedPackage = Join-Path $root "wingman\package.json"
if (Test-Path $nestedPackage) {
  Fail "Nested duplicate app detected at wingman\package.json"
} else {
  Pass "No nested duplicate app detected"
}

Write-Section "Result"
if ($script:HasFailure) {
  Write-Host "Repo health check completed with failures." -ForegroundColor Red
  exit 1
} else {
  Write-Host "Repo health check passed." -ForegroundColor Green
  exit 0
}