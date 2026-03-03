$ErrorActionPreference = "Stop"
$Root = "C:\Users\steve\wingman"
Set-Location $Root

function Backup-File([string]$path) {
  if (!(Test-Path $path)) { throw "Not found: $path" }
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  Copy-Item $path "$path.bak_$stamp" -Force
}

function Write-Utf8NoBom([string]$path, [string]$content) {
  $dir = Split-Path $path -Parent
  if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $utf8)
}

$main = "$Root\src\main.tsx"
if (!(Test-Path $main)) { throw "Not found: $main" }

$txt = Get-Content $main -Raw -Encoding UTF8

if ($txt -match "wingman-ui\.css") {
  Write-Host "✔ main.tsx already imports wingman-ui.css"
  exit 0
}

Backup-File $main

# Preferred: insert immediately after the globals.css import (exact match)
$needle = 'import "./styles/globals.css";'
if ($txt -like "*$needle*") {
  $txt2 = $txt.Replace($needle, $needle + "`r`n" + 'import "./styles/wingman-ui.css";')
  Write-Utf8NoBom $main $txt2
  Write-Host "✔ Patched main.tsx: inserted wingman-ui.css after globals.css"
  exit 0
}

# Fallback: insert after last import line
$lines = $txt -split "`r?`n"
$lastImport = -1
for ($i=0; $i -lt $lines.Length; $i++) {
  if ($lines[$i] -match "^\s*import\s+") { $lastImport = $i }
}
if ($lastImport -ge 0) {
  $out = New-Object System.Collections.Generic.List[string]
  for ($i=0; $i -lt $lines.Length; $i++) {
    $out.Add($lines[$i]) | Out-Null
    if ($i -eq $lastImport) {
      $out.Add('import "./styles/wingman-ui.css";') | Out-Null
    }
  }
  Write-Utf8NoBom $main ($out -join "`r`n")
  Write-Host "✔ Patched main.tsx: inserted wingman-ui.css after last import"
  exit 0
}

throw "Could not find an import block to patch in src/main.tsx"
