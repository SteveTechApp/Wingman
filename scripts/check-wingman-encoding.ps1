Set-Location C:\Users\steve\wingman
$ErrorActionPreference = "Stop"

$root = (Get-Location).Path
$reportDir = Join-Path $root "_AUDITS"
if (!(Test-Path $reportDir)) {
  New-Item -ItemType Directory -Path $reportDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$reportPath = Join-Path $reportDir "encoding-audit-$timestamp.txt"

$extensions = @(
  "*.ts","*.tsx","*.js","*.jsx","*.mjs","*.cjs",
  "*.css","*.scss","*.json","*.md","*.html","*.yml","*.yaml"
)

$excludeDirs = @(
  "\node_modules\",
  "\dist\",
  "\build\",
  "\coverage\",
  "\.git\",
  "\_QUARANTINE\"
)

$badPatterns = @(
  [char]0x00C3,
  [char]0x00C2,
  [char]0xFFFD
)

$extraBadFragments = @(
  "â€",
  "â€™",
  "â€œ",
  "â€",
  "â€“",
  "â€”"
)

function Is-ExcludedPath {
  param([string]$Path)
  foreach ($dir in $excludeDirs) {
    if ($Path -like "*$dir*") { return $true }
  }
  return $false
}

function Get-BadPatternMatches {
  param([string]$Path)

  $results = @()
  $lines = Get-Content -LiteralPath $Path

  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]

    foreach ($pattern in $badPatterns) {
      if ($line.Contains([string]$pattern)) {
        $results += [PSCustomObject]@{
          File    = $Path
          Line    = $i + 1
          Pattern = [string]$pattern
          Text    = $line.Trim()
        }
      }
    }

    foreach ($fragment in $extraBadFragments) {
      if ($line.Contains($fragment)) {
        $results += [PSCustomObject]@{
          File    = $Path
          Line    = $i + 1
          Pattern = $fragment
          Text    = $line.Trim()
        }
      }
    }
  }

  return $results
}

function Get-NonAsciiLines {
  param([string]$Path)

  $results = @()
  $lines = Get-Content -LiteralPath $Path

  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    if ($line -cmatch '[^\x00-\x7F]') {
      $results += [PSCustomObject]@{
        File = $Path
        Line = $i + 1
        Text = $line.Trim()
      }
    }
  }

  return $results
}

$files = Get-ChildItem -Path $root -Recurse -File -Include $extensions |
  Where-Object { -not (Is-ExcludedPath $_.FullName) }

$badHits = @()
$nonAsciiHits = @()

foreach ($file in $files) {
  $badHits += Get-BadPatternMatches -Path $file.FullName
  $nonAsciiHits += Get-NonAsciiLines -Path $file.FullName
}

$badFiles = $badHits | Select-Object -ExpandProperty File -Unique
$nonAsciiFiles = $nonAsciiHits | Select-Object -ExpandProperty File -Unique

$summary = New-Object System.Collections.Generic.List[string]
$summary.Add("WINGMAN ENCODING AUDIT")
$summary.Add("Generated: $(Get-Date)")
$summary.Add("Root: $root")
$summary.Add("")
$summary.Add("Files scanned: $($files.Count)")
$summary.Add("Files with mojibake patterns: $($badFiles.Count)")
$summary.Add("Total mojibake hits: $($badHits.Count)")
$summary.Add("Files containing non-ASCII characters: $($nonAsciiFiles.Count)")
$summary.Add("Total non-ASCII line hits: $($nonAsciiHits.Count)")
$summary.Add("")
$summary.Add("=== MOJIBAKE / ENCODING SUSPECTS ===")

if ($badHits.Count -eq 0) {
  $summary.Add("None found.")
} else {
  foreach ($hit in $badHits) {
    $summary.Add(("[BAD] {0}:{1} | {2} | {3}" -f $hit.File, $hit.Line, $hit.Pattern, $hit.Text))
  }
}

$summary.Add("")
$summary.Add("=== NON-ASCII LINES (REVIEW MANUALLY) ===")

if ($nonAsciiHits.Count -eq 0) {
  $summary.Add("None found.")
} else {
  foreach ($hit in $nonAsciiHits) {
    $summary.Add(("[NONASCII] {0}:{1} | {2}" -f $hit.File, $hit.Line, $hit.Text))
  }
}

$summaryText = [string]::Join("`r`n", $summary)
$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($reportPath, $summaryText, $utf8)

Write-Host ""
Write-Host "Encoding audit complete."
Write-Host "Report:"
Write-Host $reportPath
Write-Host ""

if ($badFiles.Count -gt 0) {
  Write-Host "Files with likely encoding corruption:" -ForegroundColor Yellow
  $badFiles | ForEach-Object { Write-Host " - $_" }
} else {
  Write-Host "No obvious mojibake patterns found." -ForegroundColor Green
}