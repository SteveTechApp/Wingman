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
$backupDir = "C:\Users\steve\wingman\_RESCUE\fix-video-wall-fallback-block-static-$stamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
Copy-Item $pagePath (Join-Path $backupDir "VideoWallPlannerPage.tsx.bak") -Force

$lines = [System.Collections.Generic.List[string]](Get-Content $pagePath)

$start = -1
$end = -1

for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($start -lt 0 -and $lines[$i] -match 'recommendedSolutionTitle') {
    $start = $i
  }
  if ($start -ge 0 -and $lines[$i] -match 'previewSubtitle') {
    $end = $i
    break
  }
}

if ($start -lt 0) {
  throw "Could not find block start containing recommendedSolutionTitle."
}

if ($end -lt 0) {
  throw "Could not find block end containing previewSubtitle."
}

for ($i = $end; $i -ge $start; $i--) {
  $lines.RemoveAt($i)
}

$replacement = @(
'  const recommendedSolutionTitle = "Recommended video wall solution";',
'  const recommendedSolutionSummary =',
'    "Wingman has selected a provisional wall architecture while the recommendation wiring is being reconnected."; ',
'',
'  const recommendationReasons = [',
'    "Wall format selected",',
'    "Source scope captured",',
'    "Architecture shell applied for clearer workflow and phased UI migration",',
'  ];',
'',
'  const systemTypeLabel = "Video wall architecture";',
'  const complexityLabel = "Medium";',
'  const costBandLabel = "Project dependent";',
'  const useCaseLabel = "Video wall deployment";',
'',
'  const architectureAlternatives = [',
'    {',
'      title: "AV over IP wall",',
'      summary: "Best for scalable multi-source deployments where future flexibility matters.",',
'    },',
'    {',
'      title: "Processor-based wall",',
'      summary: "Best for fixed-format deployments without full AVoIP infrastructure.",',
'    },',
'    {',
'      title: "Matrix-based distribution",',
'      summary: "Suitable for simpler systems, but less scalable for large multi-source wall designs.",',
'    },',
'  ];',
'',
'  const previewTitle = "Video wall preview";',
'  const previewSubtitle = "Architecture overview";',
'')

for ($j = 0; $j -lt $replacement.Count; $j++) {
  $lines.Insert($start + $j, $replacement[$j])
}

$newContent = [string]::Join("`r`n", $lines)
Save-Utf8NoBom -Path $pagePath -Content $newContent

Write-Host ""
Write-Host "Replaced fallback block with static, safe values."
Write-Host "Backup saved to: $backupDir"
Write-Host ""
Write-Host "Now run:"
Write-Host "  npm run typecheck"