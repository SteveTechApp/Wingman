# tools/commit-tools-menu-clean.ps1
# Stages + commits ONLY the tool-discovery changes, and ignores common noise folders.
# Run:
#   pwsh -NoProfile -ExecutionPolicy Bypass -File tools\commit-tools-menu-clean.ps1

$ErrorActionPreference = "Stop"

function Require-RepoRoot() {
  if (!(Test-Path -LiteralPath "package.json")) { throw "Run from repo root (package.json). Current: $((Get-Location).Path)" }
  if (!(Test-Path -LiteralPath ".git")) { throw "This folder does not contain .git. Current: $((Get-Location).Path)" }
}

function Backup-File([string]$path) {
  if (Test-Path -LiteralPath $path) {
    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    Copy-Item -LiteralPath $path -Destination ($path + ".bak_" + $stamp) -Force
    Write-Host ("Backup: {0}.bak_{1}" -f $path, $stamp)
  }
}

Require-RepoRoot

# 1) Add common ignore rules (safe append, idempotent)
$gi = ".gitignore"
if (!(Test-Path -LiteralPath $gi)) { New-Item -ItemType File -Path $gi | Out-Null }

Backup-File $gi
$gitignore = Get-Content -LiteralPath $gi -Raw

$rules = @(
  "",
  "# Wingman local artifacts",
  "tools/_reports/",
  "tools/_ARCHIVE/",
  "Wingman-USB/",
  "$ReducerFile",
  "$genFile",
  "*.bak_*",
  "playwright-report/",
  "test-results/",
  ".playwright/"
)

foreach ($r in $rules) {
  if ($r -and ($gitignore -notmatch [regex]::Escape($r))) {
    Add-Content -LiteralPath $gi -Value $r
  } elseif (-not $r) {
    Add-Content -LiteralPath $gi -Value ""
  }
}

Write-Host "Updated .gitignore"

# 2) Define the exact files for your tool-discovery feature
$files = @(
  "src\data\toolCategories.ts",
  "src\components\tools\recentTools.ts",
  "src\components\tools\ToolGrid.tsx",
  "src\components\tools\RecentRouteTracker.tsx",
  "src\pages\ToolHubPage.tsx",
  "src\pages\WelcomeScreen.tsx",
  "src\components\nav\CategoryMenu.tsx",
  "src\AppRoutes.tsx",
  "src\data\navigation.ts",
  "src\components\layout\Header.tsx"
)

# Stage only files that exist (don’t fail if one is missing)
$existing = @()
foreach ($f in $files) {
  if (Test-Path -LiteralPath $f) { $existing += $f }
}

if ($existing.Count -eq 0) {
  throw "None of the expected feature files exist. Aborting."
}

Write-Host ""
Write-Host "== Staging tool-discovery feature files =="
& git add -- $existing

# Always stage .gitignore as well
& git add -- .gitignore

Write-Host ""
Write-Host "== Status (staged only) =="
& git diff --cached --name-status

# 3) Commit (only if there is something staged)
$staged = (& git diff --cached --name-only)
if (-not $staged) {
  Write-Host "No staged changes to commit. Exiting."
  exit 0
}

$msg = "Improve tool discovery: categories, tools hub, welcome grid, recent usage"
& git commit -m $msg

Write-Host ""
Write-Host "Committed successfully."
Write-Host "Next: git push"
