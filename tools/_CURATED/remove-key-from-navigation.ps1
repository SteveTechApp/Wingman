# tools/remove-key-from-navigation.ps1
# Removes unsupported `key: "..."` properties from src/data/navigation.ts NavItem objects.
# Run:
#   pwsh -NoProfile -ExecutionPolicy Bypass -File tools\remove-key-from-navigation.ps1
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
  throw "Run from repo root (where package.json exists). Current: $((Get-Location).Path)"
}

$navPath = "src\data\navigation.ts"
if (!(Test-Path -LiteralPath $navPath)) { throw "Missing: $navPath" }

Backup-File $navPath
$txt = [IO.File]::ReadAllText($navPath)

# Case 1: key is the FIRST property in the object: { key: "...", label: "...", ... }
$txt2 = [regex]::Replace(
  $txt,
  '(?s)(\{\s*)key\s*:\s*"[^"]*"\s*,\s*',
  '$1',
  [System.Text.RegularExpressions.RegexOptions]::Singleline
)

# Case 2: key appears later in the object: ..., key: "...", ...
$txt2 = [regex]::Replace(
  $txt2,
  '(?s)\s*,\s*key\s*:\s*"[^"]*"\s*',
  '',
  [System.Text.RegularExpressions.RegexOptions]::Singleline
)

if ($txt2 -eq $txt) {
  Write-Host "No change: did not find any key: properties to remove."
} else {
  WriteUtf8NoBom $navPath $txt2
  Write-Host "Patched: removed key: properties from navigation.ts"
}

# Verification
$after = [IO.File]::ReadAllText($navPath)
if ($after -match '\bkey\s*:') {
  throw "navigation.ts still contains 'key:'. Paste the first 40 lines of src/data/navigation.ts."
}

Write-Host ""
Write-Host "Next:"
Write-Host "  npm run typecheck"
