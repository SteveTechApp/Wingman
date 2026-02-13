param(
  [switch]$RunNpm,
  [string]$Root=".",
  [string]$Reports="_REPORTS",
  [string]$Stamp=(Get-Date -Format "yyyyMMdd_HHmmss")
)

# IMPORTANT: do NOT enable StrictMode in this script (your environment is strict-sensitive)
$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$p) { if (!(Test-Path $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null } }

$reportsDir = Join-Path $Root $Reports
Ensure-Dir $reportsDir

$reportPath = Join-Path $reportsDir ("production_validate_{0}.md" -f $Stamp)

function Write-Rep([string]$s) { Add-Content -Encoding UTF8 $reportPath -Value $s }

Write-Rep "# Wingman Production Validation"
Write-Rep ""
Write-Rep ("Timestamp: {0}" -f $Stamp)
Write-Rep ""

# Hygiene checks
$srcDir = Join-Path $Root "src"
$mainTsx = Join-Path $srcDir "main.tsx"
$appRoutes = Join-Path $srcDir "AppRoutes.tsx"

$viteMatches = @(Get-ChildItem $Root -File -Filter "vite.config.*" -ErrorAction SilentlyContinue)
$viteOk = ($viteMatches.Length -gt 0)

$checks = @(
  @{ Check="Repo root present"; OK=(Test-Path (Join-Path $Root "package.json")); Detail="package.json" },
  @{ Check="src present"; OK=(Test-Path $srcDir); Detail="src/" },
  @{ Check="vite config present"; OK=$viteOk; Detail="vite.config.*" },
  @{ Check="main.tsx present"; OK=(Test-Path $mainTsx); Detail="src/main.tsx" },
  @{ Check="AppRoutes.tsx present"; OK=(Test-Path $appRoutes); Detail="src/AppRoutes.tsx" }
)

Write-Rep "## Hygiene checks"
Write-Rep ""
Write-Rep "| Check | OK | Detail |"
Write-Rep "|---|---:|---|"
foreach ($c in $checks) {
  Write-Rep ("| {0} | {1} | {2} |" -f $c.Check, [bool]$c.OK, $c.Detail)
}
Write-Rep ""

function Run-Cmd([string]$title, [string]$exe, [string]$args) {
  $tmpOut = Join-Path $env:TEMP ("wingman_cmd_out_{0}.txt" -f ([guid]::NewGuid().ToString("N")))
  $tmpErr = Join-Path $env:TEMP ("wingman_cmd_err_{0}.txt" -f ([guid]::NewGuid().ToString("N")))

  Write-Rep ("### {0}" -f $title)
  Write-Rep "```"

  $p = Start-Process -FilePath $exe -ArgumentList $args -NoNewWindow -Wait -PassThru -RedirectStandardOutput $tmpOut -RedirectStandardError $tmpErr
  $outText = ""
  $errText = ""
  if (Test-Path $tmpOut) { $outText = Get-Content $tmpOut -Raw }
  if (Test-Path $tmpErr) { $errText = Get-Content $tmpErr -Raw }

  if ($outText) { Write-Rep $outText.TrimEnd() }
  if ($errText) { Write-Rep $errText.TrimEnd() }

  Write-Rep "```"
  Write-Rep ("ExitCode: {0}" -f $p.ExitCode)
  Write-Rep ""

  Remove-Item $tmpOut,$tmpErr -ErrorAction SilentlyContinue

  return $p.ExitCode
}

if (-not $RunNpm) {
  Write-Rep "## NPM checks (skipped)"
  Write-Rep ""
  Write-Rep "Re-run with: pwsh -NoProfile -ExecutionPolicy Bypass -File tools/wingman-production-validate.ps1 -RunNpm"
  Write-Host ("Wrote: {0}" -f $reportPath)
  exit 0
}

Write-Rep "## NPM checks"
Write-Rep ""

# Use cmd.exe to keep quoting consistent
Run-Cmd "node -v" "cmd.exe" "/c node -v" | Out-Null
Run-Cmd "npm -v"  "cmd.exe" "/c npm -v"  | Out-Null
Run-Cmd "npm run typecheck" "cmd.exe" "/c npm run typecheck" | Out-Null
Run-Cmd "npm run build"     "cmd.exe" "/c npm run build"     | Out-Null

Write-Host ("Wrote: {0}" -f $reportPath)
