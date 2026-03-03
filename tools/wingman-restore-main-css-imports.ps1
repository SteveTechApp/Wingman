[CmdletBinding()]
param(
  [string]$Root = "",
  [switch]$Apply
)

$ErrorActionPreference = "Stop"
if(-not $Apply){ throw "Run with -Apply" }

function Find-RepoRoot {
  param([string]$Start = "")
  $dir = if($Start){ (Resolve-Path $Start).Path } else { (Get-Location).Path }
  while($true){
    if(Test-Path (Join-Path $dir "package.json")){ return $dir }
    $parent = Split-Path $dir -Parent
    if(-not $parent -or $parent -eq $dir){ throw "Could not find repo root." }
    $dir = $parent
  }
}

$repo = Find-RepoRoot -Start $Root
Set-Location $repo

$current = Join-Path $repo "src\main.tsx"
if(!(Test-Path $current)){ throw "Missing file: $current" }

$backupDir = Get-ChildItem (Join-Path $repo "_RESCUE") -Directory -Filter "MainRootFix_*" -ErrorAction SilentlyContinue |
  Sort-Object Name -Descending |
  Select-Object -First 1

if(-not $backupDir){ throw "No MainRootFix backup folder found in _RESCUE." }

$backupMain = Join-Path $backupDir.FullName "main.tsx"
if(!(Test-Path $backupMain)){ throw "Backup main.tsx not found: $backupMain" }

$old = Get-Content $backupMain -Raw

# capture all side-effect CSS imports from backup
$cssImports = [regex]::Matches($old, '^\s*import\s+["''][^"'']+\.css["''];\s*$', [System.Text.RegularExpressions.RegexOptions]::Multiline) |
  ForEach-Object { $_.Value.Trim() }

# capture any non-css side-effect style imports if you use scss
$scssImports = [regex]::Matches($old, '^\s*import\s+["''][^"'']+\.(scss|sass)["''];\s*$', [System.Text.RegularExpressions.RegexOptions]::Multiline) |
  ForEach-Object { $_.Value.Trim() }

$styleImports = @($cssImports + $scssImports | Select-Object -Unique)

$newLines = New-Object System.Collections.Generic.List[string]
$newLines.Add('import React from "react";')
$newLines.Add('import ReactDOM from "react-dom/client";')
$newLines.Add('import { BrowserRouter } from "react-router-dom";')
foreach($s in $styleImports){ $newLines.Add($s) }
$newLines.Add('import App from "./App";')
$newLines.Add('')
$newLines.Add('ReactDOM.createRoot(document.getElementById("root")!).render(')
$newLines.Add('  <React.StrictMode>')
$newLines.Add('    <BrowserRouter>')
$newLines.Add('      <App />')
$newLines.Add('    </BrowserRouter>')
$newLines.Add('  </React.StrictMode>')
$newLines.Add(');')

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$rescue = Join-Path $repo "_RESCUE\MainCssRestore_$stamp"
New-Item -ItemType Directory -Force -Path $rescue | Out-Null
Copy-Item $current (Join-Path $rescue "main.tsx") -Force

$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($current, ($newLines -join [Environment]::NewLine), $enc)

Write-Host "Backup:" $rescue
Write-Host "Source backup used:" $backupMain
Write-Host "Restored style imports:" ($styleImports -join ", ")
Write-Host "Updated:" $current
Write-Host ""
Write-Host "Next:"
Write-Host "  Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force"
Write-Host "  Remove-Item -Recurse -Force .\node_modules\.vite -ErrorAction SilentlyContinue"
Write-Host "  npm run typecheck"
Write-Host "  npm run dev"