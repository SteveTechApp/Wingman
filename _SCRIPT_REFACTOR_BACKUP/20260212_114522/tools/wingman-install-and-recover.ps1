$ErrorActionPreference = "Stop"

$Root = "C:\Users\steve\wingman"
if (!(Test-Path "$Root\package.json")) { throw "Wingman root not found: $Root" }
Set-Location $Root

. "$PSScriptRoot\_lib\wingman-io.ps1"
Initialize-WingmanRepo | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ReportDir = Join-Path $Root ("_RECOVERY_REPORTS\" + $Stamp)
New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null

function Log([string]$s) {
  $script:LOG += ($s + "`r`n")
}

function RunStep([string]$name, [scriptblock]$sb) {
  Log ""
  Log ("== " + $name + " ==")
  try {
    $out = (& $sb 2>&1 | Out-String)
    Log $out
    Log ("RESULT: OK")
  } catch {
    Log (($_ | Out-String))
    Log ("RESULT: FAIL")
    throw
  }
}

$LOG = ""
RunStep "Environment" { node -v; npm -v; git --version }
RunStep "Git status" { git branch --show-current; git status --porcelain; git log -1 --oneline --decorate }

# 1) Install dependencies (lockfile exact)
RunStep "npm ci" { npm ci }

# 2) Ensure TypeScript present
RunStep "TypeScript version (npx)" { npx tsc -v }

# 3) Run System32-safe refactor (idempotent)
$ref = Join-Path $Root "tools\refactor-tools-system32-safe.ps1"
if (Test-Path $ref) { RunStep "Refactor tools System32-safe" { pwsh -NoProfile -ExecutionPolicy Bypass -File $ref } }

# 4) Run routing stabiliser if present
$route = Join-Path $Root "tools\stabilise-routing.ps1"
if (Test-Path $route) { RunStep "Stabilise routing" { pwsh -NoProfile -ExecutionPolicy Bypass -File $route } }

# 5) Run targeted repair scripts in safe order (skip if missing)
$ordered = @(
  "route-cleanup.ps1",
  "fix-nav-app-prefix.ps1",
  "wingman-nav-standardise.ps1",
  "wingman-auto-route-repair.ps1",
  "fix-recentTools-hooks.ps1",
  "fix-competitor-compare-service-exports.ps1",
  "heal-missing-modules.ps1",
  "fix-import-pipeline-and-stubs.ps1",
  "apply-tsc-hotfixes.ps1",
  "fix-tsc-errors-minimal.ps1",
  "fix-tsc-errors-minimal-v2.ps1",
  "wingman-repo-stabilise.ps1",
  "wingman-production-validate.ps1",
  "wingman-readiness-and-features-audit.ps1"
)

foreach ($name in $ordered) {
  $p = Join-Path (Join-Path $Root "tools") $name
  if (Test-Path $p) {
    RunStep ("Run " + $name) { pwsh -NoProfile -ExecutionPolicy Bypass -File $p }
  } else {
    Log ""
    Log ("== Run " + $name + " ==")
    Log "Skipped (not found)."
  }
}

# 6) Typecheck + build
RunStep "npm run typecheck" { npm run typecheck }
RunStep "npm run build" { npm run build }

$logPath = Join-Path $ReportDir "recovery.log.txt"
$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($logPath, $LOG, $enc)

Write-Host ""
Write-Host "RECOVERY COMPLETE" -ForegroundColor Green
Write-Host ("Report: " + $logPath) -ForegroundColor Green
