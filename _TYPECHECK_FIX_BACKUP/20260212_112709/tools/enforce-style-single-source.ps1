Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Path) | Out-Null
Set-Location .. | Out-Null

function Backup-File($path) {
  if (!(Test-Path $path)) { return }
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  Copy-Item $path "$path.bak_$stamp" -Force
}

# Canonical global css import location: src/main.tsx
$main = "src/main.tsx"
if (!(Test-Path $main)) { throw "Not found: $main" }
Backup-File $main

$txt = Get-Content $main -Raw

# Remove any other css imports (ui2, tokens, classic, etc.) but keep globals
$lines = $txt -split "`n"
$new = New-Object System.Collections.Generic.List[string]
foreach ($l in $lines) {
  $trim = $l.Trim()
  if ($trim -match 'import\s+["''].*\.css["''];') {
    if ($trim -match '["'']\./styles/globals\.css["'']' -or $trim -match '["'']/styles/globals\.css["'']') {
      $new.Add($l)
    } else {
      # skip other css imports
      continue
    }
  } else {
    $new.Add($l)
  }
}
$txt2 = ($new -join "`n")

# Ensure globals.css import exists
if ($txt2 -notmatch '["'']\./styles/globals\.css["'']' -and $txt2 -notmatch '["'']/styles/globals\.css["'']') {
  # Insert after React imports
  $insert = 'import "./styles/globals.css";'
  $parts = $txt2 -split "`n"
  $out = New-Object System.Collections.Generic.List[string]
  $inserted = $false
  foreach ($l in $parts) {
    $out.Add($l)
    if (-not $inserted -and $l -match '^import\s+.*react') {
      $out.Add($insert)
      $inserted = $true
    }
  }
  if (-not $inserted) { $out.Insert(0, $insert) }
  $txt2 = ($out -join "`n")
}

[System.IO.File]::WriteAllText((Resolve-Path $main), $txt2, [System.Text.UTF8Encoding]::new($false))
Write-Host "✔ Enforced single CSS import (globals.css) in src/main.tsx"

# Optional: warn if other css files are imported anywhere else
$hits = Get-ChildItem .\src -Recurse -File -Include *.ts,*.tsx |
  Select-String -Pattern 'import\s+["''][^"'']+\.css["''];' -AllMatches |
  Where-Object { $_.Line -notmatch 'styles/globals\.css' }

if ($hits) {
  Write-Host "`n⚠ Found other CSS imports in TS/TSX (should be removed):"
  $hits | Select-Object -First 50 | ForEach-Object { Write-Host (" - " + $_.Path + ":" + $_.LineNumber + "  " + $_.Line.Trim()) }
  Write-Host "`nFix these by removing the import lines and using Tailwind/globals.css only."
} else {
  Write-Host "✔ No other CSS imports detected in src/"
}
