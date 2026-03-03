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
    if([string]::IsNullOrWhiteSpace($p) -or $p -eq $d){
      throw "Could not locate repo root."
    }
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
  Copy-Item -Force $Path $dest
}

$repo = Find-RepoRoot -Start $Root
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$rescue = Join-Path $repo "_RESCUE\SalesStripDedup_$stamp"
New-Item -ItemType Directory -Force -Path $rescue | Out-Null

$preferredDashboard = @(
  (Join-Path $repo "src\features\dashboard\DashboardPage.tsx"),
  (Join-Path $repo "src\app\pages\DashboardPage.tsx"),
  (Join-Path $repo "src\pages\DashboardPage.tsx")
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if(-not $preferredDashboard){
  $preferredDashboard = Get-ChildItem -Path (Join-Path $repo "src") -Recurse -File -Filter *Dashboard*.tsx |
    Sort-Object FullName |
    Select-Object -First 1 -ExpandProperty FullName
}

if(-not $preferredDashboard){
  throw "Could not locate a Dashboard page."
}

$tsxFiles = Get-ChildItem -Path (Join-Path $repo "src") -Recurse -File -Include *.tsx,*.ts
$hits = @()

foreach($f in $tsxFiles){
  $text = Read-Text $f.FullName
  if($text -match 'SalesActionStrip' -or $text -match 'data-wm-sales-strip="1"' -or $text -match '<SalesActionStrip\s*/>'){
    $hits += [pscustomobject]@{
      Path = $f.FullName
      HasImport = [bool]($text -match 'import\s+SalesActionStrip\s+from\s+["''][^"'']+["''];')
      HasUsage  = [bool]($text -match '<SalesActionStrip\s*/>')
      StripTag  = [bool]($text -match 'data-wm-sales-strip="1"')
    }
  }
}

Write-Host ""
Write-Host "== SalesActionStrip Audit ==" -ForegroundColor Cyan
Write-Host "Canonical dashboard page:"
Write-Host " - $preferredDashboard"
Write-Host ""
Write-Host "Files containing SalesActionStrip signals:"
$hits | ForEach-Object {
  Write-Host (" - {0} | import={1} usage={2} stripTag={3}" -f $_.Path,$_.HasImport,$_.HasUsage,$_.StripTag)
}

$changed = @()

foreach($f in $hits){
  $path = $f.Path
  $text = Read-Text $path
  $new = $text

  if($path -eq $preferredDashboard){
    # Keep exactly one import
    $importPattern = '(^\s*import\s+SalesActionStrip\s+from\s+["''][^"'']+["''];\s*\r?\n?)'
    $imports = [regex]::Matches($new, $importPattern, 'Multiline')
    if($imports.Count -gt 1){
      $first = $imports[0].Value
      $new = [regex]::Replace($new, $importPattern, '', 'Multiline')
      $new = $first + $new
    }

    # Keep exactly one usage
    $usagePattern = '<SalesActionStrip\s*/>\s*'
    $usages = [regex]::Matches($new, $usagePattern)
    if($usages.Count -gt 1){
      $new = [regex]::Replace($new, $usagePattern, '', [System.Text.RegularExpressions.RegexOptions]::None)
      $firstReturn = [regex]::Match($new, 'return\s*\(\s*<([A-Za-z][A-Za-z0-9]*)\b[^>]*>', 'Singleline')
      if($firstReturn.Success){
        $anchor = $firstReturn.Value
        $replacement = $anchor + "`r`n      <SalesActionStrip />"
        $new = $new.Remove($firstReturn.Index, $firstReturn.Length).Insert($firstReturn.Index, $replacement)
      }
    }
  }
  else {
    # Remove from non-dashboard pages
    $new = [regex]::Replace($new, '^\s*import\s+SalesActionStrip\s+from\s+["''][^"'']+["''];\s*\r?\n?', '', 'Multiline')
    $new = [regex]::Replace($new, '^\s*<SalesActionStrip\s*/>\s*\r?\n?', '', 'Multiline')
    $new = [regex]::Replace($new, '\r?\n\s*<SalesActionStrip\s*/>', '', 'Multiline')
  }

  if($new -ne $text){
    Backup-File -Path $path -RescueRoot $rescue -RepoRoot $repo
    Write-Text -Path $path -Text $new
    $changed += $path
  }
}

Write-Host ""
Write-Host "Changed files:" -ForegroundColor Yellow
if($changed.Count -eq 0){
  Write-Host " - none"
} else {
  $changed | ForEach-Object { Write-Host " - $_" }
}

Write-Host ""
Write-Host "Next:"
Write-Host "1. npm run typecheck"
Write-Host "2. npm run dev"
Write-Host "3. Confirm Start with the outcome appears only on the dashboard"