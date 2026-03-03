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
  $dir = Split-Path $Path -Parent
  if($dir -and !(Test-Path $dir)){ New-Item -ItemType Directory -Force -Path $dir | Out-Null }
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

function Replace-All {
  param(
    [string]$Text,
    [hashtable]$Map
  )

  $out = $Text
  foreach($k in $Map.Keys){
    $out = $out.Replace($k, $Map[$k])
  }
  return $out
}

$repo = Find-RepoRoot -Start $Root
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$rescue = Join-Path $repo "_RESCUE\LightenContrastPass_$stamp"
New-Item -ItemType Directory -Force -Path $rescue | Out-Null

$targets = @(
  (Join-Path $repo "src\features\dashboard\DashboardPage.tsx"),
  (Join-Path $repo "src\ui2\nav\MissionControlNav.tsx")
) | Where-Object { Test-Path $_ }

if($targets.Count -eq 0){
  throw "Target files not found."
}

$changed = @()

foreach($path in $targets){
  $text = Read-Text $path
  if(-not $text){ continue }

  $map = @{}

  if($path -like "*DashboardPage.tsx"){
    $map = @{
      'background: "rgba(255,255,255,0.03)"' = 'background: "rgba(255,255,255,0.05)"'
      'background: "rgba(255,255,255,0.02)"' = 'background: "rgba(255,255,255,0.04)"'
      'background: "rgba(0,0,0,0.12)"'       = 'background: "rgba(255,255,255,0.035)"'
      'border: "1px solid rgba(255,255,255,0.10)"' = 'border: "1px solid rgba(255,255,255,0.14)"'
      'opacity: 0.62' = 'opacity: 0.72'
      'opacity: 0.70' = 'opacity: 0.80'
      'opacity: 0.72' = 'opacity: 0.82'
      'opacity: 0.78' = 'opacity: 0.86'
      'opacity: 0.86' = 'opacity: 0.92'
    }
  }

  if($path -like "*MissionControlNav.tsx"){
    $map = @{
      'color: "rgba(255,255,255,0.42)"' = 'color: "rgba(255,255,255,0.58)"'

      'background: "rgba(255,255,255,0.02)"'  = 'background: "rgba(255,255,255,0.04)"'
      'background: "rgba(255,255,255,0.025)"' = 'background: "rgba(255,255,255,0.05)"'
      'background: "rgba(255,255,255,0.018)"' = 'background: "rgba(255,255,255,0.035)"'

      'border: "1px solid rgba(255,255,255,0.055)"' = 'border: "1px solid rgba(255,255,255,0.085)"'
      'border: "1px solid rgba(255,255,255,0.06)"'  = 'border: "1px solid rgba(255,255,255,0.09)"'
      'border: "1px solid rgba(255,255,255,0.05)"'  = 'border: "1px solid rgba(255,255,255,0.08)"'
      'border: "1px solid rgba(255,255,255,0.045)"' = 'border: "1px solid rgba(255,255,255,0.07)"'
      'border: "1px solid rgba(255,255,255,0.07)"'  = 'border: "1px solid rgba(255,255,255,0.10)"'

      'color: "rgba(255,255,255,0.50)"' = 'color: "rgba(255,255,255,0.64)"'
      'color: "rgba(255,255,255,0.54)"' = 'color: "rgba(255,255,255,0.68)"'
      'color: "rgba(255,255,255,0.70)"' = 'color: "rgba(255,255,255,0.80)"'
      'color: "rgba(255,255,255,0.78)"' = 'color: "rgba(255,255,255,0.86)"'
      'color: "rgba(255,255,255,0.80)"' = 'color: "rgba(255,255,255,0.88)"'
      'color: "rgba(255,255,255,0.84)"' = 'color: "rgba(255,255,255,0.90)"'
      'color: "rgba(255,255,255,0.86)"' = 'color: "rgba(255,255,255,0.92)"'
    }
  }

  if($map.Count -eq 0){ continue }

  $new = Replace-All -Text $text -Map $map

  if($new -ne $text){
    Backup-File -Path $path -RescueRoot $rescue -RepoRoot $repo
    Write-Text -Path $path -Text $new
    $changed += $path
  }
}

Write-Host ""
Write-Host "== Lighten / Contrast Pass Applied ==" -ForegroundColor Cyan
Write-Host "Repo:   $repo"
Write-Host "Backup: $rescue"
Write-Host ""

if($changed.Count -eq 0){
  Write-Host "No file changes were required." -ForegroundColor Yellow
} else {
  Write-Host "Changed files:" -ForegroundColor Yellow
  $changed | ForEach-Object { Write-Host " - $_" }
}

Write-Host ""
Write-Host "What changed:"
Write-Host " - Lifted panel backgrounds slightly"
Write-Host " - Increased card/link border visibility"
Write-Host " - Increased muted text contrast"
Write-Host ""
Write-Host "Next:"
Write-Host "1. npm run typecheck"
Write-Host "2. npm run dev"
Write-Host "3. Refresh the app and review dashboard + nav"