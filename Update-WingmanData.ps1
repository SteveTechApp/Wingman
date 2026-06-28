#!/usr/bin/env pwsh

param(
  [switch]$SkipSweep,
  [switch]$SkipBuild,
  [switch]$FullVerify
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RepoRoot

function Resolve-Npm {
  $localNpm = Join-Path $RepoRoot "node_modules/.bin/npm.cmd"
  if (Test-Path $localNpm) {
    return $localNpm
  }

  $pathNpm = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
  if ($pathNpm) {
    return $pathNpm.Source
  }

  $pathNpm = Get-Command "npm" -ErrorAction SilentlyContinue
  if ($pathNpm) {
    return $pathNpm.Source
  }

  throw "npm was not found. Install Node.js dependencies before running Wingman data maintenance."
}

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][scriptblock]$Command
  )

  Write-Host ""
  Write-Host "==> $Name" -ForegroundColor Cyan
  & $Command

  if ($LASTEXITCODE -ne 0) {
    throw "Step failed: $Name"
  }
}

$Npm = Resolve-Npm

Write-Host "Wingman data maintenance" -ForegroundColor Green
Write-Host "Repository: $RepoRoot"

Invoke-Step "Phase 0 - Validate authoritative product sources" {
  & $Npm run data:sources:check
}

Invoke-Step "Phase 1 - Build canonical WyreStorm SKU store" {
  & $Npm run data:canonical-products
}

if (-not $SkipSweep) {
  Invoke-Step "Phase 2 - Fresh WyreStorm source sweep and update queue" {
    & $Npm run data:check-wyrestorm-products
  }

  Invoke-Step "Phase 2b - Rebuild canonical store with latest sweep output" {
    & $Npm run data:canonical-products
  }
} else {
  Write-Host ""
  Write-Host "==> Phase 2 - Fresh WyreStorm source sweep skipped" -ForegroundColor Yellow
}

Invoke-Step "Phase 3 - Rebuild public runtime product index for Finder and Compare" {
  & $Npm run data:product-intelligence-index
}

Invoke-Step "Phase 4 - Run WyreStorm product quality audit" {
  & $Npm run data:audit-wyrestorm-products
}

Invoke-Step "Phase 5 - Run competitor intelligence audit" {
  & $Npm run audit:competitor-intelligence
}

Invoke-Step "Phase 6 - Run data maintenance gate" {
  & $Npm run check:data-maintenance
}

Invoke-Step "Compare safety checks" {
  & $Npm run check:compare-decision
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & $Npm run check:compare-decision-workflow
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & $Npm run check:compare-page-candidate-gate
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & $Npm run check:compare-equivalence-gates
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & $Npm run check:known-compare-profiles
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & $Npm run check:known-wyrestorm-matrix-profiles
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & $Npm run check:compact-compare-matrix
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & $Npm run check:compact-compare-data-hydration
}

if (-not $SkipBuild) {
  Invoke-Step "Typecheck" {
    & $Npm run typecheck
  }

  Invoke-Step "Build" {
    & $Npm run build
  }
} else {
  Write-Host ""
  Write-Host "==> Typecheck/build skipped" -ForegroundColor Yellow
}

if ($FullVerify) {
  Invoke-Step "Full verification suite" {
    & $Npm run verify
  }
}

Write-Host ""
Write-Host "Wingman data maintenance complete." -ForegroundColor Green
Write-Host "Review reports/wingman-data-maintenance-report.md and data/wingman-data-maintenance-queue.json for approval work."
