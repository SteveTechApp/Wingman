param(
    [switch]$Apply
)

$ErrorActionPreference = "Stop"

$repo = (Get-Location).Path
$src  = Join-Path $repo "src"

if(-not (Test-Path $src)){
    throw "Could not find src folder at: $src"
}

Write-Host ""
Write-Host "== Wingman Landing Centering Audit ==" -ForegroundColor Cyan
Write-Host "Repo: $repo" -ForegroundColor DarkGray

$scanFiles = Get-ChildItem $src -Recurse -File -Include *.css,*.scss,*.ts,*.tsx

Write-Host ""
Write-Host "-- References to wm-page / PublicLandingPage / root layout --" -ForegroundColor Yellow

$hits = $scanFiles |
    Select-String -Pattern 'wm-page|PublicLandingPage|createRoot|#root|100vh|100dvh|place-items|align-items|justify-content' |
    Select-Object Path, LineNumber, Line

if($hits){
    $hits | Format-Table -AutoSize
} else {
    Write-Host "No matching layout references found." -ForegroundColor Yellow
}

$cssFiles = Get-ChildItem $src -Recurse -File -Include *.css,*.scss
if(-not $cssFiles){
    throw "No CSS/SCSS files found under src."
}

# Pick a sensible CSS target:
# 1) file already containing .wm-page
# 2) otherwise index.css
# 3) otherwise first css file
$targetCss = $cssFiles | Where-Object {
    (Get-Content $_.FullName -Raw) -match '\.wm-page\b'
} | Select-Object -First 1

if(-not $targetCss){
    $targetCss = $cssFiles | Where-Object { $_.Name -match '^index\.(css|scss)$' } | Select-Object -First 1
}

if(-not $targetCss){
    $targetCss = $cssFiles | Select-Object -First 1
}

Write-Host ""
Write-Host "-- Selected CSS target --" -ForegroundColor Yellow
Write-Host $targetCss.FullName -ForegroundColor Green

$layoutBlock = @"
/* __WM_CENTERING_FIX__ */
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

if(-not $Apply){
    Write-Host ""
    Write-Host "Audit only. No files changed." -ForegroundColor Yellow
    Write-Host "Run with -Apply to patch:" -ForegroundColor Yellow
    Write-Host "pwsh -NoProfile -ExecutionPolicy Bypass -File .\tools\wingman-centering-fix.ps1 -Apply" -ForegroundColor White
    exit 0
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$rescueDir = Join-Path $repo "_RESCUE\CenteringFix_$timestamp"
New-Item -ItemType Directory -Force -Path $rescueDir | Out-Null

Copy-Item $targetCss.FullName (Join-Path $rescueDir $targetCss.Name) -Force

$content = Get-Content $targetCss.FullName -Raw

# Ensure root height chain exists
if($content -match '(?s)html\s*,\s*body\s*,\s*#root\s*\{.*?\}'){
    $content = [regex]::Replace(
        $content,
        '(?s)html\s*,\s*body\s*,\s*#root\s*\{.*?\}',
@"
html,
body,
#root {
  height: 100%;
  min-height: 100%;
  margin: 0;
}
"@
    ,1)
} else {
    $content = $layoutBlock + "`r`n`r`n" + $content
}

# Ensure body overflow-x hidden exists
if($content -notmatch '(?s)body\s*\{[^}]*overflow-x\s*:\s*hidden\s*;[^}]*\}'){
    $content += "`r`n`r`nbody {`r`n  overflow-x: hidden;`r`n}`r`n"
}

# Replace or append .wm-page
if($content -match '(?s)\.wm-page\s*\{.*?\}'){
    $content = [regex]::Replace(
        $content,
        '(?s)\.wm-page\s*\{.*?\}',
@"
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
    ,1)
} else {
    $content += "`r`n`r`n" + @"
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
}

[System.IO.File]::WriteAllText($targetCss.FullName, $content, [System.Text.UTF8Encoding]::new($false))

Write-Host ""
Write-Host "Patch applied." -ForegroundColor Green
Write-Host "Backup saved to: $rescueDir" -ForegroundColor DarkGray
Write-Host "Updated CSS: $($targetCss.FullName)" -ForegroundColor DarkGray

Write-Host ""
Write-Host "Next checks:" -ForegroundColor Cyan
Write-Host "1. Refresh the browser." -ForegroundColor White
Write-Host "2. Inspect div.wm-page in devtools." -ForegroundColor White
Write-Host "3. Its height should now match the viewport, not ~446px." -ForegroundColor White