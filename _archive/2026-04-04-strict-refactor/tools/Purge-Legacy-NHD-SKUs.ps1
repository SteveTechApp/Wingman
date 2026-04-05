Set-Location C:\Users\steve\wingman
$ErrorActionPreference = "Stop"

function Save-Utf8NoBom {
  param(
    [string]$Path,
    [string]$Content
  )

  $dir = Split-Path $Path -Parent
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  $rescueRoot = "_RESCUE"
  if (-not (Test-Path $rescueRoot)) {
    New-Item -ItemType Directory -Force -Path $rescueRoot | Out-Null
  }

  if (Test-Path $Path) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $safe = ($Path -replace '[\\/:*?"<>|]', '_')
    Copy-Item $Path "$rescueRoot\$safe.$stamp.bak" -Force
  }

  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

# 🔁 Replacement map (safe + generic)
$replacements = @(
  @{ find = "NHD-400-TX"; replace = "AVoIP-TX" },
  @{ find = "NHD-400-RX"; replace = "AVoIP-RX" },
  @{ find = "NHD-300-TX"; replace = "AVoIP-TX" },
  @{ find = "NHD-300";    replace = "AVoIP" },
  @{ find = "NHD-200";    replace = "AVoIP" }
)

# 🔍 Target files
$files = Get-ChildItem -Path ".\src" -Recurse -Include *.ts,*.tsx,*.js,*.jsx,*.json,*.css

$changed = 0

foreach ($file in $files) {
  $content = Get-Content $file.FullName -Raw
  $original = $content

  foreach ($r in $replacements) {
    $content = $content -replace [regex]::Escape($r.find), $r.replace
  }

  if ($content -ne $original) {
    Save-Utf8NoBom -Path $file.FullName -Content $content
    Write-Host "Updated: $($file.FullName)" -ForegroundColor Yellow
    $changed++
  }
}

Write-Host ""
Write-Host "----------------------------------"
Write-Host "Files updated: $changed"
Write-Host "Backups stored in _RESCUE"
Write-Host "----------------------------------"

# 🔎 sanity scan after replace
Write-Host ""
Write-Host "Scanning for remaining legacy SKUs..."
Get-ChildItem -Path ".\src" -Recurse -File |
  Select-String -Pattern "NHD-400|NHD-300|NHD-200"
# 🔧 re-run typecheck
Write-Host ""
Write-Host "Running typecheck..."
npm run typecheck