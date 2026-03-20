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
$backupDir = "C:\Users\steve\wingman\_RESCUE\fix-catalog-data-bom-injection-$stamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
Copy-Item $file (Join-Path $backupDir "catalog.data.tsx.bak") -Force

$t = Get-Content $file -Raw

# Remove the three bad summary/sourceUrl insertions inside BOM rows
$patterns = @(
  '(?ms)^\s*summary:\s*"4K60Hz Output Multiview Decoder \| 4K60Hz 4:2:0 Output \| PoE \| Audio De-embed \| RS232 \| CEC"\r?\n\s*sourceUrl:\s*"https://www\.wyrestorm\.com/product/nhd-150-rx/",\s*',
  '(?ms)^\s*summary:\s*"4K60Hz Output Multiview Decoder \| 4K60Hz 4:2:0 Output \| PoE \| Audio De-embed \| RS232 \| CEC"\r?\n\s*sourceUrl:\s*"https://www\.wyrestorm\.com/product/nhd-150-rx/",\s*',
  '(?ms)^\s*summary:\s*"4K60Hz SDVoE Transceiver \| 4K60Hz 4:4:4 \| 10G RJ45 \| Dolby Vision & HDR \| Video Wall \| Multiview \| PoE\+ \| Ethernet Passthrough \| Audio De-embed \| USB HID \| CEC \| IR & RS232"\r?\n\s*sourceUrl:\s*"https://www\.wyrestorm\.com/product/nhd-600-trx/",\s*'
)

$before = $t
foreach ($pattern in $patterns) {
  $t = [regex]::Replace($t, $pattern, "", [System.Text.RegularExpressions.RegexOptions]::None)
}

if ($t -eq $before) {
  Write-Host "No matching broken BOM injections were found. Inspect the file around lines 90-130." -ForegroundColor Yellow
} else {
  Save-Utf8NoBom -Path $file -Content $t
  Write-Host "Patched: $file" -ForegroundColor Green
  Write-Host "Backup : $backupDir" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Running typecheck..." -ForegroundColor Cyan
npm run typecheck