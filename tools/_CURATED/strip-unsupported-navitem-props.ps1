# tools/strip-unsupported-navitem-props.ps1
# Strips unsupported NavItem props from src/data/navigation.ts.
# Based on current TS errors: removes tooltip and status everywhere in that file.
# Run:
#   pwsh -NoProfile -ExecutionPolicy Bypass -File tools\strip-unsupported-navitem-props.ps1
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

function Remove-Prop([string]$text, [string]$propName) {
  # Remove "prop: <value>" in two cases:
  # 1) prop is preceded by '{' or ',' and followed by ','  -> remove including trailing comma
  # 2) prop is last item (preceded by ',' and followed by '}' ) -> remove leading comma too
  $p = [regex]::Escape($propName)

  # prop as first or middle: { ..., prop: "...", ... }
  $text = [regex]::Replace(
    $text,
    '(?s)(\{\s*|\s*,\s*)' + $p + '\s*:\s*(?:"[^"]*"|\{[^}]*\}|[A-Za-z0-9_.$]+)\s*,\s*',
    '$1',
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )

  # prop at end: , prop: "..." }
  $text = [regex]::Replace(
    $text,
    '(?s)\s*,\s*' + $p + '\s*:\s*(?:"[^"]*"|\{[^}]*\}|[A-Za-z0-9_.$]+)\s*(\})',
    '$1',
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )

  return $text
}

$txt2 = $txt
$txt2 = Remove-Prop $txt2 "tooltip"
$txt2 = Remove-Prop $txt2 "status"

# Tidy any weird "{ ," sequences that can occur if a prop was first
$txt2 = [regex]::Replace($txt2, '\{\s*,', '{ ', [System.Text.RegularExpressions.RegexOptions]::Singleline)
$txt2 = [regex]::Replace($txt2, '(\r?\n){3,}', "`r`n`r`n")

if ($txt2 -eq $txt) {
  Write-Host "No change: tooltip/status patterns not found."
} else {
  WriteUtf8NoBom $navPath $txt2
  Write-Host "Patched: removed tooltip and status from navigation.ts"
}

# Verify
$after = [IO.File]::ReadAllText($navPath)
if ($after -match '\btooltip\s*:') { throw "navigation.ts still contains tooltip:" }
if ($after -match '\bstatus\s*:')  { throw "navigation.ts still contains status:" }

Write-Host ""
Write-Host "Next:"
Write-Host "  npm run typecheck"
