[CmdletBinding()]
param(
  # Path to the oldWingman repo root on your machine
  [Parameter(Mandatory=$true)]
  [string]$OldWingmanRoot,

  # Where to write the triage output
  [string]$OutRoot = (Join-Path $HOME ("wingman_triage_" + (Get-Date -Format "yyyyMMdd_HHmmss")))
)

$ErrorActionPreference = "Stop"

function EnsureDir([string]$p) {
  if (-not (Test-Path -LiteralPath $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null }
}

function CopyIfExists([string]$src, [string]$dstDir) {
  if (Test-Path -LiteralPath $src) {
    EnsureDir $dstDir
    Copy-Item -LiteralPath $src -Destination $dstDir -Force
    Write-Host ("Copied: {0}" -f $src)
    return $true
  } else {
    Write-Host ("Missing: {0}" -f $src) -ForegroundColor Yellow
    return $false
  }
}

# Output structure
$keepDir  = Join-Path $OutRoot "KEEP"
$maybeDir = Join-Path $OutRoot "MAYBE"
$notesDir = Join-Path $OutRoot "NOTES"
EnsureDir $keepDir
EnsureDir $maybeDir
EnsureDir $notesDir

Write-Host "== Wingman triage ==" -ForegroundColor Cyan
Write-Host ("OldWingman: {0}" -f $OldWingmanRoot)
Write-Host ("OutRoot:   {0}" -f $OutRoot)

# --- KEEP: files you uploaded (canonical locations) ---
$keepFiles = @(
  "src\AppRoutes.tsx",
  "src\main.tsx",
  "src\AppProviders.tsx",
  "src\index.css"
)

Write-Host "`n== KEEP ==" -ForegroundColor Cyan
foreach ($rel in $keepFiles) {
  $src = Join-Path $OldWingmanRoot $rel
  CopyIfExists $src $keepDir | Out-Null
}

# --- MAYBE: common “worth reviewing” folders ---
$maybeFolders = @(
  "src\components",
  "src\pages",
  "src\contexts",
  "src\services",
  "src\data",
  "src\styles",
  "src\utils",
  "public",
  "assets"
)

Write-Host "`n== MAYBE (copied as folders if they exist) ==" -ForegroundColor Cyan
foreach ($rel in $maybeFolders) {
  $src = Join-Path $OldWingmanRoot $rel
  if (Test-Path -LiteralPath $src) {
    $dst = Join-Path $maybeDir ($rel -replace '[\\/:*?"<>|]', '_')
    Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
    Write-Host ("Copied folder: {0}" -f $rel)
  } else {
    Write-Host ("Missing folder: {0}" -f $rel) -ForegroundColor DarkYellow
  }
}

# --- Notes: what to drop ---
$dropNotes = @"
DROP / IGNORE candidates (usually noise):
- node_modules/, dist/, build/, coverage/, .vite/, .cache/
- test-results/, playwright-report/, .playwright/
- _ARCHIVE/, backups/, *.bak_YYYYMMDD_HHMMSS
- any one-off scripts not in tools/

Next checks:
1) Does OldWingman have @ alias config? (tsconfig paths + vite alias)
2) Do contexts referenced by AppProviders exist? src/contexts/UserContext etc.
3) Does AppShell exist and still work? src/components/layout/AppShell
"@

$dropPath = Join-Path $notesDir "DROP_HINTS.txt"
[IO.File]::WriteAllText($dropPath, $dropNotes, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("Wrote: {0}" -f $dropPath)

Write-Host "`nDone. Review KEEP first, then selectively pull from MAYBE." -ForegroundColor Green
Write-Host ("Output: {0}" -f $OutRoot)
