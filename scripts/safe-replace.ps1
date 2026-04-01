Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

param(
  [string]$TargetPath,
  [string]$Pattern,
  [string]$Replacement,
  [switch]$Regex,
  [switch]$Multiple
)

$targetFull = Join-Path (Get-Location).Path $TargetPath

if (-not (Test-Path $targetFull)) {
  throw "Target file not found: $TargetPath"
}

$text = Get-Content $targetFull -Raw

if ($Regex) {
  if ($Multiple) {
    $updated = [regex]::Replace($text, $Pattern, $Replacement)
  } else {
    $updated = [regex]::Replace($text, $Pattern, $Replacement, 1)
  }
} else {
  if ($Multiple) {
    $updated = $text.Replace($Pattern, $Replacement)
  } else {
    $i = $text.IndexOf($Pattern)
    if ($i -lt 0) { throw "Pattern not found" }
    $updated = $text.Substring(0, $i) + $Replacement + $text.Substring($i + $Pattern.Length)
  }
}

$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($targetFull, $updated, $utf8)

Write-Host "safe-replace OK"
