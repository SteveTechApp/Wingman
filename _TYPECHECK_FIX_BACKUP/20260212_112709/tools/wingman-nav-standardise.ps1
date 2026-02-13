param(
  [switch]$Apply,
  [switch]$DryRun,
  [string]$Root=".",
  [string]$Src="src",
  [string]$Stamp=(Get-Date -Format "yyyyMMdd_HHmmss")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Backup-File([string]$Path) { if (Test-Path $Path) { Copy-Item $Path "$Path.bak_$Stamp" -Force } }

$srcRoot = Join-Path $Root $Src
if (!(Test-Path $srcRoot)) { throw "Not found: $srcRoot" }

$navFiles = Get-ChildItem $srcRoot -Recurse -File -Include *Nav*.tsx,*TopBar*.tsx,*CategoryMenu*.tsx |
  Where-Object { $_.FullName -match '\\(app\\navigation|components\\nav|navigation)\\' -or $_.Name -match 'SideNav|TopBar|CategoryMenu' }

$map = [ordered]@{
  "/dashboard"          = "/app/dashboard"
  "/projects"           = "/app/projects"
  "/import"             = "/app/import"
  "/toolhub"            = "/app/toolhub"
  "/tools"              = "/app/toolhub"
  "/compare"            = "/app/toolhub"
  "/competitor"         = "/app/toolhub"
  "/competitor-compare" = "/app/toolhub"
  "/app/tools"          = "/app/toolhub"
  "/app/tools/compare"  = "/app/toolhub"
  "/app/tools/competitor-compare" = "/app/toolhub"
}

$attrPattern = '(?<attr>\b(to|href)\s*=\s*)(?<q>["''])(?<val>[^"'']+)(\k<q>)'
$log = New-Object System.Collections.Generic.List[object]

foreach ($f in $navFiles) {
  $txt = Get-Content $f.FullName -Raw
  $new = [regex]::Replace($txt, $attrPattern, {
    param($m)
    $attr = $m.Groups["attr"].Value
    $q    = $m.Groups["q"].Value
    $val  = $m.Groups["val"].Value
    if ($val -match '^(https?:|mailto:|tel:|#|//)') { return $m.Value }
    if ($val -match '^\{.*\}$') { return $m.Value }
    if ($map.Contains($val)) {
      $rep = $map[$val]
      if ($rep -ne $val) { $log.Add([pscustomobject]@{ File=$f.FullName; From=$val; To=$rep }) | Out-Null }
      return ($attr + $q + $rep + $q)
    }
    return $m.Value
  })

  if ($new -ne $txt -and $Apply) {
    Backup-File $f.FullName
    [System.IO.File]::WriteAllText($f.FullName, $new, [System.Text.UTF8Encoding]::new($false))
  }
}

Write-Host "Nav standardise complete."
Write-Host "Files scanned: $($navFiles.Count)"
Write-Host "Changes: $($log.Count)"
if ($DryRun -and $log.Count -gt 0) { $log | Select-Object -First 40 | Format-Table -AutoSize }