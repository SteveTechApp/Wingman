param(
  [string]$Root = "src"
)

$ErrorActionPreference = "Stop"

function Info($m) { Write-Host "==> $m" -ForegroundColor Cyan }
function Ok($m) { Write-Host "[OK] $m" -ForegroundColor Green }
function Warn($m) { Write-Host "[WARN] $m" -ForegroundColor Yellow }

function ReadUtf8($path) {
  [System.IO.File]::ReadAllText($path, [System.Text.UTF8Encoding]::new($false))
}

function WriteUtf8($path, $content) {
  [System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))
}

function Backup($path) {
  $bak = "$path.bak"
  Copy-Item $path $bak -Force
  return $bak
}

Info "Scanning CSS files in $Root..."

$files = Get-ChildItem -Path $Root -Recurse -Filter *.css

if ($files.Count -eq 0) {
  Warn "No CSS files found."
  exit 0
}

foreach ($file in $files) {
  $path = $file.FullName
  $content = ReadUtf8 $path

  # Find all @import lines
  $lines = $content -split "`r?`n"
  $importLines = @()
  $otherLines = @()

  foreach ($line in $lines) {
    if ($line.Trim().StartsWith("@import")) {
      $importLines += $line
    } else {
      $otherLines += $line
    }
  }

  if ($importLines.Count -eq 0) {
    continue
  }

  # Check if imports already at top
  $firstNonEmpty = ($lines | Where-Object { $_.Trim() -ne "" })[0]

  if ($firstNonEmpty -and $firstNonEmpty.Trim().StartsWith("@import")) {
    continue
  }

  Info "Fixing $path"
  Backup $path | Out-Null

  # Preserve blank line after imports
  $newContent = ($importLines -join "`r`n") + "`r`n`r`n" + ($otherLines -join "`r`n")

  WriteUtf8 $path $newContent

  Ok "Updated $($file.Name)"
}

Write-Host ""
Write-Host "CSS import normalization complete." -ForegroundColor Green
Write-Host "Backups saved as *.bak files." -ForegroundColor DarkGray