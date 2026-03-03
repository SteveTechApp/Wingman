# =========================
# Wingman: Install + Recover (System32-safe)
# =========================
$ErrorActionPreference = "Stop"

$Root = "C:\Users\steve\wingman"
if (!(Test-Path "$Root\package.json")) { throw "Wingman root not found: $Root" }
Set-Location $Root

# Load safety lib if present (optional but recommended)
$Lib = Join-Path $PSScriptRoot "_lib\wingman-io.ps1"
if (Test-Path $Lib) {
  . $Lib
  Initialize-WingmanRepo | Out-Null
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ReportDir = Join-Path $Root ("_RECOVERY_REPORTS\" + $Stamp)
New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null
$LogPath = Join-Path $ReportDir "recovery.log.txt"

$LOG = New-Object System.Text.StringBuilder

function LogLine([string]$s="") {
  [void]$script:LOG.AppendLine($s)
}

function RunStep([string]$name, [scriptblock]$sb) {
  LogLine ""
  LogLine ("== " + $name + " ==")
  try {
    $out = (& $sb 2>&1 | Out-String)
    LogLine $out.TrimEnd()
    LogLine "RESULT: OK"
  } catch {
    LogLine (($_ | Out-String).TrimEnd())
    LogLine "RESULT: FAIL"
    throw
  }
}

RunStep "Environment" { node -v; npm -v; git --version }
RunStep "Git status" { git branch --show-current; git status --porcelain; git log -1 --oneline --decorate }

# 1) Dependencies (lockfile exact)
RunStep "npm ci" { npm ci }

# 2) TypeScript sanity
RunStep "TypeScript (npx)" { npx tsc -v }

# 3) Refactor tools System32-safe (idempotent)
$Ref = Join-Path $Root "tools\refactor-tools-system32-safe.ps1"
if (Test-Path $Ref) {
  RunStep "Refactor tools System32-safe" { pwsh -NoProfile -ExecutionPolicy Bypass -File $Ref }
} else {
  LogLine ""
  LogLine "== Refactor tools System32-safe =="
  LogLine "Skipped (not found)."
}

# 4) Routing stabilisation (if present)
$Route = Join-Path $Root "tools\stabilise-routing.ps1"
if (Test-Path $Route) {
  RunStep "Stabilise routing" { pwsh -NoProfile -ExecutionPolicy Bypass -File $Route }
} else {
  LogLine ""
  LogLine "== Stabilise routing =="
  LogLine "Skipped (not found)."
}

# 5) Run known repair scripts in safe order (skip if missing)
$Ordered = @(
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

foreach ($name in $Ordered) {
  $p = Join-Path (Join-Path $Root "tools") $name
  if (Test-Path $p) {
    RunStep ("Run " + $name) { pwsh -NoProfile -ExecutionPolicy Bypass -File $p }
  } else {
    LogLine ""
    LogLine ("== Run " + $name + " ==")
    LogLine "Skipped (not found)."
  }
}

# 6) Final checks
RunStep "npm run typecheck" { npm run typecheck }
RunStep "npm run build" { npm run build }

# Write log
$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($LogPath, $LOG.ToString(), $enc)

Write-Host ""
Write-Host "RECOVERY COMPLETE" -ForegroundColor Green
Write-Host ("Report: " + $LogPath) -ForegroundColor Green