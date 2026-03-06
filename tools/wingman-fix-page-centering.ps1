param(
    [switch]$Apply
)

$repo = Get-Location
$src = Join-Path $repo "src"

Write-Host ""
Write-Host "== Wingman Page Centering Audit ==" -ForegroundColor Cyan

# Files to scan
$cssFiles = Get-ChildItem $src -Recurse -Include *.css,*.scss -File

if(-not $cssFiles){
    Write-Host "No CSS files found." -ForegroundColor Yellow
    exit
}

# Layout patch
$patch = @"

html,
body,
#root {
  height: 100%;
  min-height: 100%;
  margin: 0;
}

body {
  overflow-x: hidden;
}

.wm-page {
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  padding: 24px;
}

"@

$target = $null

foreach($file in $cssFiles){
    $content = Get-Content $file.FullName -Raw

    if($content -match '\.wm-page'){
        $target = $file
        break
    }
}

if(-not $target){
    Write-Host "No existing .wm-page definition found." -ForegroundColor Yellow
    $target = $cssFiles[0]
}

Write-Host ""
Write-Host "Target CSS:" $target.FullName -ForegroundColor Green

if(!$Apply){
    Write-Host ""
    Write-Host "Run with -Apply to patch the file." -ForegroundColor Yellow
    exit
}

# Backup
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = Join-Path $repo "_RESCUE\CenteringFix_$timestamp"

New-Item $backupDir -ItemType Directory -Force | Out-Null

Copy-Item $target.FullName (Join-Path $backupDir $target.Name)

Write-Host "Backup saved to:" $backupDir -ForegroundColor DarkGray

$content = Get-Content $target.FullName -Raw

if($content -notmatch '\.wm-page'){
    $content += "`n$patch"
}
else{
    $content = $content -replace '\.wm-page\s*\{[^}]*\}', $patch
}

[System.IO.File]::WriteAllText($target.FullName, $content)

Write-Host ""
Write-Host "✔ Page centering layout applied." -ForegroundColor Green
Write-Host "Restart Vite if required." -ForegroundColor Gray