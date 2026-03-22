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
$backupDir = "C:\Users\steve\wingman\_RESCUE\fix-video-wall-recommendation-order-$stamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
Copy-Item $pagePath (Join-Path $backupDir "VideoWallPlannerPage.tsx.bak") -Force

$content = Get-Content $pagePath -Raw

$blockPattern = '(?ms)^\s*const recommendedSolutionTitle = recommendation\?\..*?^\s*const previewSubtitle = `\$\{systemTypeLabel\} • \$\{useCaseLabel\}`;\r?\n?'
$blockMatch = [regex]::Match($content, $blockPattern)

if (-not $blockMatch.Success) {
  throw "Could not find the inserted recommendation summary block."
}

$block = $blockMatch.Value
$contentWithoutBlock = $content.Remove($blockMatch.Index, $blockMatch.Length)

$recommendationAnchorPattern = '(?m)^\s*const recommendation\s*=.*(?:\r?\n(?:.*\r?\n)*?)?;'
$anchorMatch = [regex]::Match($contentWithoutBlock, $recommendationAnchorPattern)

if (-not $anchorMatch.Success) {
  throw "Could not find the 'const recommendation =' declaration."
}

$insertAt = $anchorMatch.Index + $anchorMatch.Length
$newContent =
  $contentWithoutBlock.Substring(0, $insertAt) +
  "`r`n" + $block.Trim("`r","`n") + "`r`n" +
  $contentWithoutBlock.Substring($insertAt)

Save-Utf8NoBom -Path $pagePath -Content $newContent

Write-Host ""
Write-Host "Fixed recommendation declaration order."
Write-Host "Backup saved to: $backupDir"
Write-Host ""
Write-Host "Next:"
Write-Host "  npm run typecheck"