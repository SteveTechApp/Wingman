# tools/fix-approutes-recent-tracker-root.ps1
# Fixes TS2657 by wrapping RecentRouteTracker + Routes in a single parent (fragment).
# Run:
#   pwsh -NoProfile -ExecutionPolicy Bypass -File tools\fix-approutes-recent-tracker-root.ps1
#   npm run typecheck

$ErrorActionPreference = "Stop"

function Backup-File([string]$path) {
  if (Test-Path -LiteralPath $path) {
    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    Copy-Item -LiteralPath $path -Destination ($path + ".bak_" + $stamp) -Force
    Write-Host ("Backup: {0}.bak_{1}" -f $path, $stamp)
  }
}

function WriteUtf8NoBom([string]$path, [string]$content) {
  [IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host ("Wrote: {0}" -f $path)
}

if (!(Test-Path -LiteralPath "package.json")) {
  throw "Run from repo root."
}

$path = "src\AppRoutes.tsx"
if (!(Test-Path -LiteralPath $path)) { throw "Missing: $path" }

Backup-File $path
$txt = [IO.File]::ReadAllText($path)

# If already wrapped, do nothing
if ($txt -match '<>\s*<RecentRouteTracker\s*/>\s*<Routes\b') {
  Write-Host "No change: RecentRouteTracker already wrapped with Routes."
  exit 0
}

# 1) Wrap opening
$patOpen = '(?s)<RecentRouteTracker\s*/>\s*<Routes\b'
if ($txt -notmatch $patOpen) {
  throw "Could not find '<RecentRouteTracker />' immediately followed by '<Routes'. Paste the block around line ~450."
}

$txt2 = [regex]::Replace(
  $txt,
  $patOpen,
  "<>`n      <RecentRouteTracker />`n      <Routes",
  1
)

# 2) Close fragment after </Routes>
# Only do this if we inserted the opening fragment and there isn't already a closing </> right after </Routes>
if ($txt2 -match '(?s)</Routes>\s*</>') {
  # already closed
  $txt3 = $txt2
} else {
  $patClose = '(?s)</Routes>'
  $txt3 = [regex]::Replace(
    $txt2,
    $patClose,
    "</Routes>`n    </>",
    1
  )
}

WriteUtf8NoBom $path $txt3

Write-Host ""
Write-Host "OK: Wrapped RecentRouteTracker + Routes in a fragment."
Write-Host "Next: npm run typecheck"
