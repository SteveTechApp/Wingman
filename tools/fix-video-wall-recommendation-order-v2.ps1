Set-Location C:\Users\steve\wingman
$ErrorActionPreference = "Stop"

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

$pagePath = "C:\Users\steve\wingman\src\features\misc\VideoWallPlannerPage.tsx"

if (-not (Test-Path $pagePath)) {
  throw "File not found: $pagePath"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = "C:\Users\steve\wingman\_RESCUE\fix-video-wall-recommendation-order-v2-$stamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
Copy-Item $pagePath (Join-Path $backupDir "VideoWallPlannerPage.tsx.bak") -Force

$lines = [System.Collections.Generic.List[string]](Get-Content $pagePath)

$start = -1
$end = -1
$recommendationLine = -1

for ($i = 0; $i -lt $lines.Count; $i++) {
  $line = $lines[$i]

  if ($start -lt 0 -and $line -match 'recommendedSolutionTitle') {
    $start = $i
  }

  if ($line -match '^\s*const\s+recommendation\s*=') {
    $recommendationLine = $i
  }

  if ($start -ge 0 -and $line -match 'previewSubtitle') {
    $end = $i
    break
  }
}

if ($start -lt 0) {
  throw "Could not find the inserted block start (recommendedSolutionTitle)."
}

if ($end -lt 0) {
  throw "Could not find the inserted block end (previewSubtitle)."
}

if ($recommendationLine -lt 0) {
  throw "Could not find 'const recommendation ='."
}

if ($recommendationLine -gt $start) {
  Write-Host "The recommendation block is already after 'const recommendation ='."
  Write-Host "No changes made."
  exit 0
}

$block = New-Object System.Collections.Generic.List[string]
for ($i = $start; $i -le $end; $i++) {
  $block.Add($lines[$i])
}

for ($i = $end; $i -ge $start; $i--) {
  $lines.RemoveAt($i)
}

$recommendationLine = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match '^\s*const\s+recommendation\s*=') {
    $recommendationLine = $i
    break
  }
}

if ($recommendationLine -lt 0) {
  throw "Could not re-locate 'const recommendation =' after removing block."
}

$insertIndex = $recommendationLine + 1

while ($insertIndex -lt $lines.Count) {
  $current = $lines[$insertIndex - 1].Trim()
  if ($current.EndsWith(";")) {
    break
  }
  $insertIndex++
}

if ($insertIndex -lt $lines.Count) {
  $insertIndex++
}

$lines.Insert($insertIndex, "")
for ($j = 0; $j -lt $block.Count; $j++) {
  $lines.Insert($insertIndex + 1 + $j, $block[$j])
}
$lines.Insert($insertIndex + 1 + $block.Count, "")

$newContent = [string]::Join("`r`n", $lines)
Save-Utf8NoBom -Path $pagePath -Content $newContent

Write-Host ""
Write-Host "Fixed recommendation declaration order."
Write-Host "Backup saved to: $backupDir"
Write-Host ""
Write-Host "Now run:"
Write-Host "  npm run typecheck"