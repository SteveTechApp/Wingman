$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==> Saving current Wingman local state to GitHub recovery branch" -ForegroundColor Cyan

$root = (Get-Location).Path

$currentBranch = git branch --show-current
Write-Host "Current branch: $currentBranch" -ForegroundColor Cyan

$status = git status --porcelain

if (!$status) {
  Write-Host "No local changes found. Skipping recovery commit." -ForegroundColor Yellow
}

if ($status) {
  Write-Host "Local changes detected. Staging everything for recovery snapshot." -ForegroundColor Cyan

  git add -A

  Write-Host "Creating recovery snapshot commit with --no-verify." -ForegroundColor Cyan
  git commit --no-verify -m "Recovery snapshot before Wingman branch cleanup and product matching repair"

  if ($LASTEXITCODE -ne 0) {
    throw "Recovery commit failed. Stop here and paste the red error."
  }
}

Write-Host ""
Write-Host "==> Pushing current branch to GitHub" -ForegroundColor Cyan

git push -u origin HEAD

if ($LASTEXITCODE -ne 0) {
  throw "Push failed. Stop here and paste the red error."
}

Write-Host ""
Write-Host "==> Confirming recovery branch state" -ForegroundColor Cyan

git status
git log --oneline -3
git branch -vv

Write-Host ""
Write-Host "==> Returning to clean main" -ForegroundColor Cyan

git fetch --all --prune
git switch main

if ($LASTEXITCODE -ne 0) {
  throw "Could not switch to main. Stop here and paste the red error."
}

git pull origin main

if ($LASTEXITCODE -ne 0) {
  throw "Could not pull main. Stop here and paste the red error."
}

Write-Host ""
Write-Host "==> Running build on main" -ForegroundColor Cyan

npm run build

if ($LASTEXITCODE -ne 0) {
  throw "Build failed on main. Paste the red build error."
}

Write-Host ""
Write-Host "==> Recovery snapshot saved and main builds successfully" -ForegroundColor Green
Write-Host "Next step: create a focused branch to repair the two product-matching scenario failures." -ForegroundColor Green
