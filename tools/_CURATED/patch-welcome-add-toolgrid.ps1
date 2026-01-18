# tools/patch-welcome-add-toolgrid.ps1
# Adds ToolGrid to the Welcome/Dashboard page in a layout-agnostic way.
#
# Run:
#   pwsh -NoProfile -ExecutionPolicy Bypass -File tools\patch-welcome-add-toolgrid.ps1
#   npm run typecheck
#
# Optional:
#   -PagePath "src\pages\WelcomeScreen.tsx"

[CmdletBinding()]
param(
  [string]$PagePath = ""
)

$ErrorActionPreference = "Stop"

function Require-RepoRoot() {
  if (!(Test-Path -LiteralPath "package.json")) {
    throw "Run from repo root (where package.json exists). Current: $((Get-Location).Path)"
  }
}

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

function First-Existing([string[]]$paths) {
  foreach ($p in $paths) { if (Test-Path -LiteralPath $p) { return $p } }
  return ""
}

Require-RepoRoot

if (-not $PagePath) {
  $PagePath = First-Existing @(
    "src\pages\WelcomeScreen.tsx",
    "src\pages\DashboardPage.tsx",
    "src\pages\Dashboard.tsx"
  )
}

if (-not $PagePath -or !(Test-Path -LiteralPath $PagePath)) {
  throw "Could not find a welcome/dashboard page. Pass -PagePath explicitly."
}

Backup-File $PagePath
$txt = [IO.File]::ReadAllText($PagePath)

# 1) Ensure import
if ($txt -notmatch 'from\s+["'']@/components/tools/ToolGrid["'']') {
  $lines = $txt -split "(`r`n|`n)"
  $lastImport = -1
  for ($i=0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^\s*import\s') { $lastImport = $i }
  }
  if ($lastImport -ge 0) {
    $lines = $lines[0..$lastImport] + 'import ToolGrid from "@/components/tools/ToolGrid";' + $lines[($lastImport+1)..($lines.Count-1)]
    $txt = ($lines -join "`n")
  } else {
    $txt = 'import ToolGrid from "@/components/tools/ToolGrid";' + "`n" + $txt
  }
}

# Avoid duplicate insertion
if ($txt -match '<ToolGrid\s*/>') {
  Write-Host "No change: ToolGrid already present in page."
  exit 0
}

$insertion = @(
  '    <div className="mt-6">',
  '      <ToolGrid />',
  '    </div>'
) -join "`n"

$patched = $false

# 2) Insert after: return (
if (-not $patched -and $txt -match 'return\s*\(\s*') {
  $txt2 = [regex]::Replace(
    $txt,
    'return\s*\(\s*',
    { param($m) $m.Value + "`n" + $insertion + "`n" },
    1
  )
  if ($txt2 -ne $txt) { $txt = $txt2; $patched = $true }
}

# 3) Insert after: return <Component ...>
if (-not $patched -and $txt -match 'return\s*<') {
  # Find the first JSX opening tag right after return and insert ToolGrid after that tag
  $txt2 = [regex]::Replace(
    $txt,
    '(?s)(return\s*<[^>]+>)',
    '$1' + "`n" + $insertion,
    1
  )
  if ($txt2 -ne $txt) { $txt = $txt2; $patched = $true }
}

# 4) Insert after first <main ...> if still not patched
if (-not $patched -and $txt -match '<main\b[^>]*>') {
  $txt2 = [regex]::Replace(
    $txt,
    '(?s)(<main\b[^>]*>)',
    '$1' + "`n" + $insertion,
    1
  )
  if ($txt2 -ne $txt) { $txt = $txt2; $patched = $true }
}

if (-not $patched) {
  throw "Failed to locate an insertion point (no return(, no return<, no <main>). Paste the file and I will do a full replacement."
}

WriteUtf8NoBom $PagePath $txt

Write-Host ""
Write-Host "OK: ToolGrid injected into: $PagePath"
Write-Host "Next: npm run typecheck"
