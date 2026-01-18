# tools/fix-welcome-return-single-root.ps1
# Fixes TS2657 by wrapping "return <DefaultWelcome />" + injected ToolGrid block in a fragment.
#
# Run:
#   pwsh -NoProfile -ExecutionPolicy Bypass -File tools\fix-welcome-return-single-root.ps1
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
  $dir = Split-Path -Parent $path
  if ($dir -and !(Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  [IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host ("Wrote: {0}" -f $path)
}

if (!(Test-Path -LiteralPath "package.json")) {
  throw "Run from repo root. Current: $((Get-Location).Path)"
}

$path = "src\pages\WelcomeScreen.tsx"
if (!(Test-Path -LiteralPath $path)) { throw "Missing: $path" }

Backup-File $path
$txt = [IO.File]::ReadAllText($path)

# Replace pattern:
# return <DefaultWelcome />
# <div className="mt-6"> ... </div>;
#
# into:
# return (
#   <>
#     <DefaultWelcome />
#     <div className="mt-6"> ... </div>
#   </>
# );
$pattern = '(?s)return\s*<\s*DefaultWelcome\s*/\s*>\s*;\s*(<div\s+className="mt-6">\s*<ToolGrid\s*/>\s*</div>)\s*;'
if ($txt -notmatch $pattern) {
  throw "WelcomeScreen.tsx did not match expected injected structure. Paste lines 1-40 of src/pages/WelcomeScreen.tsx."
}

$txt2 = [regex]::Replace(
  $txt,
  $pattern,
  'return (' + "`n" +
  '  <>' + "`n" +
  '    <DefaultWelcome />' + "`n" +
  '    $1' + "`n" +
  '  </>' + "`n" +
  ');',
  [System.Text.RegularExpressions.RegexOptions]::Singleline
)

WriteUtf8NoBom $path $txt2

Write-Host ""
Write-Host "OK: WelcomeScreen now returns a single root (fragment)."
Write-Host "Next: npm run typecheck"
