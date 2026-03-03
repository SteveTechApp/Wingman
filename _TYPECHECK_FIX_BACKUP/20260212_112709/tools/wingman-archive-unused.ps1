param(
  [switch]$Apply,
  [switch]$DryRun,
  [string]$Root = ".",
  [string]$Src = "src",
  [string]$ArchiveRoot = "_ARCHIVE",
  [string]$Reports = "_REPORTS",
  [string]$Stamp = (Get-Date -Format "yyyyMMdd_HHmmss")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$p) { if (!(Test-Path $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null } }

$srcRoot = Join-Path $Root $Src
if (!(Test-Path $srcRoot)) { throw "Not found: $srcRoot (run from repo root)" }

Ensure-Dir (Join-Path $Root $ArchiveRoot)
Ensure-Dir (Join-Path $Root $Reports)

$roots = @(
  (Join-Path $srcRoot "main.tsx"),
  (Join-Path $srcRoot "App.tsx"),
  (Join-Path $srcRoot "AppRoutes.tsx")
) | Where-Object { Test-Path $_ }

if ($roots.Count -eq 0) { throw "No roots found (main.tsx/App.tsx/AppRoutes.tsx). Add paths in script." }

$files = Get-ChildItem $srcRoot -Recurse -File -Include *.ts,*.tsx |
  Where-Object { $_.Name -notmatch '\.d\.ts$' -and $_.Name -notmatch '\.(test|spec)\.' }

$pathByKey = @{}
foreach ($f in $files) {
  $rel = $f.FullName.Substring($srcRoot.Length).TrimStart('\','/')
  $relNorm = $rel -replace '\\','/'
  $noExt = $relNorm -replace '\.(ts|tsx)$',''
  $pathByKey[$noExt] = $f.FullName
  $pathByKey["@/$noExt"] = $f.FullName
  $pathByKey["./$noExt"] = $f.FullName
}

function Get-Imports([string]$text) {
  $rx = '(?m)^\s*(import|export)\s+.*?\s+from\s+(["''])(?<p>[^"'']+)\2'
  $ms = [regex]::Matches($text, $rx)
  foreach ($m in $ms) {
    $p = $m.Groups["p"].Value
    if ($p -match '^(react|react-dom|react-router-dom)$') { continue }
    if ($p -match '^[a-zA-Z0-9@][^:]*$' -and $p -notmatch '^(\/|\.|@\/)') { continue }
    if ($p -match '\.css$') { continue }
    $p
  }
}

function Resolve-Import([string]$fromFile, [string]$imp) {
  $fromDir = Split-Path $fromFile -Parent
  if ($imp -like "@/*") {
    $k = $imp.Trim() -replace '^@/',''
    if ($pathByKey.ContainsKey($k)) { return $pathByKey[$k] }
    $try1 = Join-Path $srcRoot ($k -replace '/','\')
    foreach ($ext in @(".ts",".tsx","/index.ts","/index.tsx")) {
      $p = ($try1 + $ext) -replace '/','\'
      if (Test-Path $p) { return (Resolve-Path $p).Path }
    }
    return $null
  }
  if ($imp -match '^\.\.?/') {
    $base = Join-Path $fromDir ($imp -replace '/','\')
    foreach ($ext in @(".ts",".tsx","\index.ts","\index.tsx")) {
      $p = $base + $ext
      if (Test-Path $p) { return (Resolve-Path $p).Path }
    }
    return $null
  }
  if ($imp -like "/*") { return $null }
  return $null
}

$visited = New-Object 'System.Collections.Generic.HashSet[string]'
$queue = New-Object System.Collections.Generic.Queue[string]
foreach ($r in $roots) { $queue.Enqueue((Resolve-Path $r).Path) }

while ($queue.Count -gt 0) {
  $cur = $queue.Dequeue()
  if (!$visited.Add($cur)) { continue }
  $txt = Get-Content $cur -Raw
  foreach ($imp in (Get-Imports $txt)) {
    $res = Resolve-Import $cur $imp
    if ($res -and (Test-Path $res)) { $queue.Enqueue($res) }
  }
}

$keep = New-Object 'System.Collections.Generic.HashSet[string]'
$featCsv = Get-ChildItem (Join-Path $Root $Reports) -File -Filter "wingman_features_*.csv" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($featCsv) {
  try {
    $rows = Import-Csv $featCsv.FullName
    foreach ($row in $rows) {
      if ($row.File -and (Test-Path $row.File)) { $keep.Add((Resolve-Path $row.File).Path) | Out-Null }
    }
  } catch {}
}

$archiveCandidates = @()
foreach ($f in $files) {
  $full = (Resolve-Path $f.FullName).Path
  if ($visited.Contains($full)) { continue }
  if ($keep.Contains($full)) { continue }
  $archiveCandidates += $full
}

$reportPath = Join-Path (Join-Path $Root $Reports) ("archive_unused_{0}.csv" -f $Stamp)
$archiveCandidates | Sort-Object | ForEach-Object { [pscustomobject]@{ File = $_ } } |
  Export-Csv -NoTypeInformation -Encoding UTF8 $reportPath

Write-Host "Unreachable TS/TSX candidates: $($archiveCandidates.Count)"
Write-Host "Report: $reportPath"

if ($DryRun -or -not $Apply) {
  Write-Host "DryRun (no file moves). Use -Apply to archive."
  $archiveCandidates | Select-Object -First 30 | ForEach-Object { Write-Host "  $_" }
  exit 0
}

$destRoot = Join-Path (Join-Path $Root $ArchiveRoot) ("src_unused_{0}" -f $Stamp)
Ensure-Dir $destRoot

foreach ($p in $archiveCandidates) {
  $rel = $p.Substring((Resolve-Path $srcRoot).Path.Length).TrimStart('\','/')
  $dest = Join-Path $destRoot $rel
  $destDir = Split-Path $dest -Parent
  Ensure-Dir $destDir
  Move-Item $p $dest -Force
}

Write-Host "Archived to: $destRoot"