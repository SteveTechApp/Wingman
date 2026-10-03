$ErrorActionPreference = "Stop"

Set-Location (Split-Path $PSScriptRoot -Parent)

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportDir = "reports\trusted-tester-readiness"
New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null
$ReportFile = Join-Path $ReportDir "readiness-$Stamp.txt"

function Run-NativeStep {
  param(
    [string]$Name,
    [string]$Command
  )

  "`n== $Name ==" | Tee-Object -FilePath $ReportFile -Append

  $TempOut = [System.IO.Path]::GetTempFileName()
  $TempErr = [System.IO.Path]::GetTempFileName()

  try {
    $Process = Start-Process `
      -FilePath "cmd.exe" `
      -ArgumentList "/d", "/s", "/c", $Command `
      -Wait `
      -PassThru `
      -NoNewWindow `
      -RedirectStandardOutput $TempOut `
      -RedirectStandardError $TempErr

    $StdOut = Get-Content $TempOut -Raw -ErrorAction SilentlyContinue
    $StdErr = Get-Content $TempErr -Raw -ErrorAction SilentlyContinue

    if ($StdOut) { $StdOut | Tee-Object -FilePath $ReportFile -Append }
    if ($StdErr) { $StdErr | Tee-Object -FilePath $ReportFile -Append }

    if ($Process.ExitCode -ne 0) {
      throw "$Name failed with exit code $($Process.ExitCode). See $ReportFile"
    }
  }
  finally {
    Remove-Item $TempOut, $TempErr -Force -ErrorAction SilentlyContinue
  }
}

Run-NativeStep "git status" "git status --short"
Run-NativeStep "trusted tester pack" "node tools/check-trusted-tester-pack.mjs"
Run-NativeStep "typecheck" "npm run typecheck"
Run-NativeStep "build" "npm run build"
Run-NativeStep "verify" "npm run verify"

Write-Host ""
Write-Host "Trusted tester readiness checks passed."
Write-Host "Report written to $ReportFile"