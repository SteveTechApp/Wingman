param()

$ErrorActionPreference = "Stop"
Set-Location "C:\Users\steve\wingman"

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  $dir = Split-Path $Path -Parent
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

$file = "C:\Users\steve\wingman\src\catalog\catalog.data.tsx"
if (-not (Test-Path $file)) {
  throw "File not found: $file"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = "C:\Users\steve\wingman\_RESCUE\fix-catalog-bom-lines-$stamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
Copy-Item $file (Join-Path $backupDir "catalog.data.tsx.bak") -Force

$t = Get-Content $file -Raw

$t = $t.Replace(
@'
        { sku: "NHD-150-RX",
    name: "NHD-150-RX"
qty: 1, note: "Supports tile-style fixed grid layouts up to 9 windows." },
'@,
@'
        { sku: "NHD-150-RX", qty: 1, note: "Supports tile-style fixed grid layouts up to 9 windows." },
'@
)

$t = $t.Replace(
@'
        { sku: "NHD-150-RX",
    name: "NHD-150-RX"
qty: 1, note: "Use overlay mode for PiP / inset behaviour." },
'@,
@'
        { sku: "NHD-150-RX", qty: 1, note: "Use overlay mode for PiP / inset behaviour." },
'@
)

$t = $t.Replace(
@'
      { sku: "NHD-600-TRX",
    name: "NHD-600-TRX"
qty: 1, note: "Use for higher-performance X/Y coordinated multiview windows." },
'@,
@'
      { sku: "NHD-600-TRX", qty: 1, note: "Use for higher-performance X/Y coordinated multiview windows." },
'@
)

Save-Utf8NoBom -Path $file -Content $t

Write-Host ""
Write-Host "Patched: $file" -ForegroundColor Green
Write-Host "Backup : $backupDir" -ForegroundColor Yellow
Write-Host ""
Write-Host "Running typecheck..." -ForegroundColor Cyan
npm run typecheck