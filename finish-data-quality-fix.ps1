$ErrorActionPreference = "Stop"

$Repo = "C:\Users\steve\wingman"
$CssFile = Join-Path $Repo "src\wingman2\styles\wingman-workflow-theme.css"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

function Step($Message) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
}

Step "1. Opening Wingman repository"

Set-Location $Repo

git status -sb

if (-not (Test-Path $CssFile)) {
    throw "CSS file not found: $CssFile"
}

Step "2. Backing up Wingman workflow CSS"

$Backup = "$CssFile.$Timestamp.bak"

Copy-Item `
    -LiteralPath $CssFile `
    -Destination $Backup `
    -Force

Write-Host "Backup created:" -ForegroundColor Green
Write-Host $Backup

Step "3. Checking Data Quality styling"

$css = Get-Content -LiteralPath $CssFile -Raw

if ($css -match '\.wm-data-quality-summary') {

    Write-Host "Data Quality CSS already exists. No CSS appended." -ForegroundColor Yellow
}
else {

$addition = @'

/* ============================================================
   DATA MANAGER - DATA QUALITY SUMMARY
   ============================================================ */

.wm-data-quality-summary {
  display: grid;
  grid-template-columns: minmax(180px, 1.5fr) repeat(7, minmax(90px, 1fr));
  gap: 12px;
  align-items: stretch;
  padding: 16px 18px;
}

.wm-data-quality-summary > div {
  min-width: 0;
}

.wm-data-quality-summary > div:not(:first-child) {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  padding: 10px 12px;
  border: 1px solid var(--wm-border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.025);
}

.wm-data-quality-summary h2 {
  margin: 2px 0 4px;
  font-size: 1.05rem;
}

.wm-data-quality-summary small {
  color: var(--wm-text-muted);
}

.wm-data-quality-summary strong {
  font-size: 1.1rem;
  line-height: 1.1;
}

.wm-data-quality-summary span {
  color: var(--wm-text-muted);
  font-size: 0.78rem;
  line-height: 1.25;
}

@media (max-width: 1200px) {
  .wm-data-quality-summary {
    grid-template-columns: repeat(4, minmax(120px, 1fr));
  }

  .wm-data-quality-summary > div:first-child {
    grid-column: 1 / -1;
  }
}

@media (max-width: 760px) {
  .wm-data-quality-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* DATA MANAGER - DATA QUALITY SUMMARY END */

'@

    Add-Content `
        -LiteralPath $CssFile `
        -Value $addition `
        -Encoding utf8

    Write-Host "Data Quality styling appended." -ForegroundColor Green
}

Step "4. Checking orphaned modules"

npm run check:orphaned-modules

if ($LASTEXITCODE -ne 0) {
    throw "Orphaned-module check still fails."
}

Step "5. Running typecheck"

npm run typecheck

if ($LASTEXITCODE -ne 0) {
    throw "Typecheck failed."
}

Step "6. Running tests"

npm test -- --run

if ($LASTEXITCODE -ne 0) {
    throw "Tests failed."
}

Step "7. Running build"

npm run build

if ($LASTEXITCODE -ne 0) {
    throw "Build failed."
}

Step "8. Running full verification"

npm run verify

if ($LASTEXITCODE -ne 0) {
    throw "npm run verify still fails."
}

Step "9. Completed"

Write-Host ""
git status -sb

Write-Host ""
Write-Host "Changed files:" -ForegroundColor Cyan
git diff --name-status

Write-Host ""
Write-Host "Diff summary:" -ForegroundColor Cyan
git diff --stat

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "DATA QUALITY PASS COMPLETE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green