[CmdletBinding()]
param(
  [string]$Root = "C:\Users\steve\wingman",
  [switch]$Apply
)

$ErrorActionPreference = "Stop"
if(-not $Apply){ throw "Run with -Apply" }

function Find-RepoRoot {
  param([string]$Start)
  $d = if($Start -and (Test-Path $Start)){ (Resolve-Path $Start).Path } else { (Get-Location).Path }
  while($true){
    if(Test-Path (Join-Path $d "package.json")){ return $d }
    $p = Split-Path $d -Parent
    if([string]::IsNullOrWhiteSpace($p) -or $p -eq $d){ throw "Could not locate repo root." }
    $d = $p
  }
}

function Read-Text([string]$Path){
  try { return [System.IO.File]::ReadAllText($Path) } catch { return "" }
}

function Write-Text([string]$Path,[string]$Text){
  [System.IO.File]::WriteAllText($Path,$Text,[System.Text.UTF8Encoding]::new($false))
}

function Backup-File([string]$Path,[string]$RescueRoot,[string]$RepoRoot){
  if(!(Test-Path $Path)){ return }
  $rel = $Path.Substring($RepoRoot.Length).TrimStart("\","/")
  $dest = Join-Path $RescueRoot $rel
  $dir = Split-Path $dest -Parent
  if(!(Test-Path $dir)){ New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  Copy-Item -Force -Path $Path -Destination $dest
}

function Get-PreferredDashboard {
  param([string]$RepoRoot)

  $candidates = @(
    (Join-Path $RepoRoot "src\features\dashboard\DashboardPage.tsx"),
    (Join-Path $RepoRoot "src\app\pages\DashboardPage.tsx"),
    (Join-Path $RepoRoot "src\pages\DashboardPage.tsx")
  ) | Where-Object { Test-Path $_ }

  if($candidates.Count -gt 0){ return $candidates[0] }

  $found = Get-ChildItem -Path (Join-Path $RepoRoot "src") -Recurse -File -Filter *Dashboard*.tsx |
    Sort-Object FullName |
    Select-Object -First 1 -ExpandProperty FullName

  return $found
}

function Remove-SalesActionStripSignals {
  param([string]$Text)

  $t = $Text
  $t = [regex]::Replace($t, '^\s*import\s+SalesActionStrip\s+from\s+["''][^"'']+["''];\s*\r?\n?', '', 'Multiline')
  $t = [regex]::Replace($t, '^\s*<SalesActionStrip\s*/>\s*\r?\n?', '', 'Multiline')
  $t = [regex]::Replace($t, '\r?\n\s*<SalesActionStrip\s*/>', '', 'Multiline')
  return $t
}

function Add-ImportOnce {
  param([string]$Text)

  if($Text -match 'import\s+SalesActionStrip\s+from\s+["''][^"'']+["''];'){
    return $Text
  }

  $importLine = 'import SalesActionStrip from "./SalesActionStrip";'
  $matches = [regex]::Matches($Text, '^\s*import .+?;\s*$', 'Multiline')
  if($matches.Count -gt 0){
    $last = $matches[$matches.Count - 1]
    return $Text.Insert($last.Index + $last.Length, "`r`n$importLine")
  }

  return "$importLine`r`n$Text"
}

function Insert-IntoExportedDashboardOnly {
  param([string]$Text)

  if($Text -match '<SalesActionStrip\s*/>'){
    return $Text
  }

  $exportIdx = $Text.IndexOf("export default function")
  if($exportIdx -lt 0){
    $exportIdx = $Text.IndexOf("export function DashboardPage")
  }
  if($exportIdx -lt 0){
    throw "Could not find exported Dashboard component."
  }

  $returnIdx = $Text.IndexOf("return (", $exportIdx)
  if($returnIdx -lt 0){
    throw "Could not find return(...) inside exported Dashboard component."
  }

  $jsxStart = $Text.IndexOf("<", $returnIdx)
  if($jsxStart -lt 0){
    throw "Could not find root JSX opening tag."
  }

  $jsxEnd = $Text.IndexOf(">", $jsxStart)
  if($jsxEnd -lt 0){
    throw "Could not find end of root JSX opening tag."
  }

  $snippet = "`r`n      <SalesActionStrip />"
  return $Text.Insert($jsxEnd + 1, $snippet)
}

$repo = Find-RepoRoot -Start $Root
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$rescue = Join-Path $repo "_RESCUE\FixSalesStripPlacement_$stamp"
New-Item -ItemType Directory -Force -Path $rescue | Out-Null

$dashboard = Get-PreferredDashboard -RepoRoot $repo
if(-not $dashboard){ throw "DashboardPage.tsx not found." }

$files = Get-ChildItem -Path (Join-Path $repo "src") -Recurse -File -Include *.tsx
$changed = @()

foreach($f in $files){
  $text = Read-Text $f.FullName
  if($text -notmatch 'SalesActionStrip' -and $text -notmatch '<SalesActionStrip\s*/>'){ continue }

  $new = Remove-SalesActionStripSignals -Text $text

  if($f.FullName -eq $dashboard){
    $new = Add-ImportOnce -Text $new
    $new = Insert-IntoExportedDashboardOnly -Text $new
  }

  if($new -ne $text){
    Backup-File -Path $f.FullName -RescueRoot $rescue -RepoRoot $repo
    Write-Text -Path $f.FullName -Text $new
    $changed += $f.FullName
  }
}

Write-Host ""
Write-Host "== Fixed SalesActionStrip Placement ==" -ForegroundColor Cyan
Write-Host "Dashboard: $dashboard"
Write-Host "Backup:    $rescue"
Write-Host ""

if($changed.Count -eq 0){
  Write-Host "No changes were required." -ForegroundColor Yellow
} else {
  Write-Host "Changed files:" -ForegroundColor Yellow
  $changed | ForEach-Object { Write-Host " - $_" }
}

Write-Host ""
Write-Host "Next:"
Write-Host "1. npm run typecheck"
Write-Host "2. npm run dev"
Write-Host "3. Confirm only one 'Start with the outcome' appears on /app/dashboard"