[CmdletBinding()]
param(
  [string]$Root = "",
  [switch]$Apply
)

$ErrorActionPreference = "Stop"
if (-not $Apply) { throw "Run with -Apply" }

function Find-RepoRoot {
  param([string]$Start = "")
  $dir = if ($Start) { (Resolve-Path $Start).Path } else { (Get-Location).Path }
  while ($true) {
    if (Test-Path (Join-Path $dir "package.json")) { return $dir }
    $parent = Split-Path $dir -Parent
    if ($parent -eq $dir) { throw "Could not find package.json from $dir" }
    $dir = $parent
  }
}

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )
  [System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($false))
}

function Read-Text {
  param([Parameter(Mandatory = $true)][string]$Path)
  [System.IO.File]::ReadAllText($Path)
}

function Backup-File {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$RepoRoot,
    [Parameter(Mandatory = $true)][string]$BackupRoot
  )
  $relative = $Path.Substring($RepoRoot.Length).TrimStart('\','/')
  $dest = Join-Path $BackupRoot $relative
  $destDir = Split-Path $dest -Parent
  New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  Copy-Item $Path $dest -Force
}

function Replace-Literal {
  param(
    [Parameter(Mandatory = $true)][string]$Text,
    [Parameter(Mandatory = $true)][string]$Old,
    [Parameter(Mandatory = $true)][string]$New
  )
  return $Text.Replace($Old, $New)
}

$repoRoot = Find-RepoRoot -Start $Root
$path = Join-Path $repoRoot "src\features\compare\CompetitorComparePage.tsx"
if (-not (Test-Path $path)) { throw "File not found: $path" }

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $repoRoot "_RESCUE\compare-page-compact-$stamp"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
Backup-File -Path $path -RepoRoot $repoRoot -BackupRoot $backupRoot

$t = Read-Text $path
$original = $t

# ------------------------------------------------------------
# Tighten common large inline layout values used on the page
# ------------------------------------------------------------

# Main page padding / width
$t = Replace-Literal $t 'padding: "24px 24px 40px"' 'padding: "16px 16px 24px"'
$t = Replace-Literal $t 'padding: "24px 24px 32px"' 'padding: "16px 16px 22px"'
$t = Replace-Literal $t 'padding: "24px"' 'padding: "16px"'
$t = Replace-Literal $t 'maxWidth: 1600' 'maxWidth: 1440'
$t = Replace-Literal $t 'maxWidth: 1560' 'maxWidth: 1440'
$t = Replace-Literal $t 'maxWidth: 1520' 'maxWidth: 1400'

# Big gaps between sections
$t = Replace-Literal $t 'gap: 24' 'gap: 14'
$t = Replace-Literal $t 'gap: 22' 'gap: 14'
$t = Replace-Literal $t 'gap: 20' 'gap: 12'
$t = Replace-Literal $t 'rowGap: 24' 'rowGap: 14'
$t = Replace-Literal $t 'rowGap: 20' 'rowGap: 12'
$t = Replace-Literal $t 'columnGap: 24' 'columnGap: 14'
$t = Replace-Literal $t 'columnGap: 20' 'columnGap: 12'

# Card padding / radius
$t = Replace-Literal $t 'padding: 24' 'padding: 16'
$t = Replace-Literal $t 'padding: 20' 'padding: 14'
$t = Replace-Literal $t 'padding: 18' 'padding: 13'
$t = Replace-Literal $t 'borderRadius: 24' 'borderRadius: 18'
$t = Replace-Literal $t 'borderRadius: 22' 'borderRadius: 18'
$t = Replace-Literal $t 'borderRadius: 20' 'borderRadius: 16'
$t = Replace-Literal $t 'borderRadius: 18' 'borderRadius: 14'

# Margins
$t = Replace-Literal $t 'marginBottom: 24' 'marginBottom: 14'
$t = Replace-Literal $t 'marginBottom: 20' 'marginBottom: 12'
$t = Replace-Literal $t 'marginTop: 24' 'marginTop: 14'
$t = Replace-Literal $t 'marginTop: 20' 'marginTop: 12'

# Large headings / body copy
$t = Replace-Literal $t 'fontSize: 32' 'fontSize: 26'
$t = Replace-Literal $t 'fontSize: 30' 'fontSize: 25'
$t = Replace-Literal $t 'fontSize: 28' 'fontSize: 24'
$t = Replace-Literal $t 'fontSize: 26' 'fontSize: 22'
$t = Replace-Literal $t 'fontSize: 18' 'fontSize: 16'
$t = Replace-Literal $t 'lineHeight: 1.7' 'lineHeight: 1.5'
$t = Replace-Literal $t 'lineHeight: 1.65' 'lineHeight: 1.45'
$t = Replace-Literal $t 'lineHeight: 1.6' 'lineHeight: 1.4'

# Long vertical cards / panels
$t = Replace-Literal $t 'minHeight: 220' 'minHeight: 160'
$t = Replace-Literal $t 'minHeight: 200' 'minHeight: 150'
$t = Replace-Literal $t 'minHeight: 180' 'minHeight: 140'

# Grids - prefer denser desktop use
$t = Replace-Literal $t 'gridTemplateColumns: "1fr"' 'gridTemplateColumns: "repeat(2, minmax(0, 1fr))"'
$t = Replace-Literal $t 'gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))"' 'gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"'
$t = Replace-Literal $t 'gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))"' 'gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"'
$t = Replace-Literal $t 'gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))"' 'gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))"'
$t = Replace-Literal $t 'gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)"' 'gridTemplateColumns: "minmax(0, 1.1fr) minmax(340px, 0.9fr)"'

# Pills / buttons
$t = Replace-Literal $t 'padding: "10px 14px"' 'padding: "7px 10px"'
$t = Replace-Literal $t 'padding: "8px 12px"' 'padding: "6px 10px"'
$t = Replace-Literal $t 'fontSize: 14' 'fontSize: 13'

# ------------------------------------------------------------
# Insert a compact style helper only if not already present
# ------------------------------------------------------------
if ($t -notmatch 'COMPARE_PAGE_IS_COMPACT') {
  $helper = @'

const COMPARE_PAGE_IS_COMPACT = true;
'@
  $t = [regex]::Replace(
    $t,
    '(finderSuggestions\([\s\S]*?\r?\n\})',
    ('$1' + "`r`n" + $helper),
    1
  )
}

if ($t -eq $original) {
  Write-Host ""
  Write-Host "No matching compact replacements were found." -ForegroundColor Yellow
  Write-Host "File was backed up but left unchanged." -ForegroundColor Yellow
  Write-Host "Backup:" -ForegroundColor Yellow
  Write-Host "  $backupRoot" -ForegroundColor Yellow
  exit 0
}

Save-Utf8NoBom -Path $path -Content $t

Write-Host ""
Write-Host "Patched:" -ForegroundColor Green
Write-Host "  $path" -ForegroundColor Green
Write-Host ""
Write-Host "Backup:" -ForegroundColor Yellow
Write-Host "  $backupRoot" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next:" -ForegroundColor Cyan
Write-Host "  npm run typecheck"
Write-Host "  npm run dev"