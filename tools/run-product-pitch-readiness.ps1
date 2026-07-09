$ErrorActionPreference = "Stop"

Set-Location (Split-Path $PSScriptRoot -Parent)

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportDir = "reports\product-pitch-readiness"
New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null
$ReportFile = Join-Path $ReportDir "product-pitch-readiness-$Stamp.txt"

function Run-Step {
  param(
    [string]$Name,
    [string]$Command
  )

  "`n== $Name ==" | Tee-Object -FilePath $ReportFile -Append

  $Process = Start-Process `
    -FilePath "cmd.exe" `
    -ArgumentList "/d", "/s", "/c", $Command `
    -Wait `
    -PassThru `
    -NoNewWindow `
    -RedirectStandardOutput "$env:TEMP\wingman-stdout.txt" `
    -RedirectStandardError "$env:TEMP\wingman-stderr.txt"

  Get-Content "$env:TEMP\wingman-stdout.txt" -Raw -ErrorAction SilentlyContinue | Tee-Object -FilePath $ReportFile -Append
  Get-Content "$env:TEMP\wingman-stderr.txt" -Raw -ErrorAction SilentlyContinue | Tee-Object -FilePath $ReportFile -Append

  if ($Process.ExitCode -ne 0) {
    throw "$Name failed with exit code $($Process.ExitCode). See $ReportFile"
  }
}

Run-Step "product pitch readiness audit" "node tools/audit-product-pitch-tester-readiness.mjs"
Run-Step "typecheck" "npm run typecheck"
Run-Step "build" "npm run build"

Write-Host ""
Write-Host "Product Pitch readiness checks passed."
Write-Host "Report written to $ReportFile"