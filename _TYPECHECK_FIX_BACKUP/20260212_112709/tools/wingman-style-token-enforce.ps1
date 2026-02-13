param(
  [switch]$Apply,
  [switch]$DryRun,
  [string]$Root=".",
  [string]$Src="src",
  [string]$Stamp=(Get-Date -Format "yyyyMMdd_HHmmss"),
  [string]$GlobalsCss="src\styles\globals.css",
  [string]$TokensCss="src\styles\tokens.css"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Backup-File([string]$Path) { if (Test-Path $Path) { Copy-Item $Path "$Path.bak_$Stamp" -Force } }
function Ensure-Dir([string]$p) { if(!(Test-Path $p)){ New-Item -ItemType Directory -Force -Path $p | Out-Null } }

$globalsPath = Join-Path $Root $GlobalsCss
$tokensPath  = Join-Path $Root $TokensCss
Ensure-Dir (Split-Path $globalsPath -Parent)
Ensure-Dir (Split-Path $tokensPath -Parent)

if (!(Test-Path $tokensPath)) {
  $tokens = @"
:root{
  --wm-bg: #0b1220;
  --wm-surface: rgba(255,255,255,0.06);
  --wm-border: rgba(255,255,255,0.10);
  --wm-text: rgba(255,255,255,0.92);
  --wm-muted: rgba(255,255,255,0.70);
  --wm-brand: #18c37e;
  --wm-danger: #ff3b30;
  --wm-radius: 14px;
  --wm-shadow: 0 10px 30px rgba(0,0,0,0.35);
}
.wm-card{
  border: 1px solid var(--wm-border);
  background: var(--wm-surface);
  border-radius: var(--wm-radius);
  box-shadow: var(--wm-shadow);
}
.wm-text{ color: var(--wm-text); }
.wm-muted{ color: var(--wm-muted); }
"@
  if ($Apply) { [System.IO.File]::WriteAllText($tokensPath, $tokens, [System.Text.UTF8Encoding]::new($false)) }
  else { Write-Host "Would create: $tokensPath" }
}

if (!(Test-Path $globalsPath)) {
  $g = @"
@import "./tokens.css";

@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root { height: 100%; }
body { margin: 0; background: var(--wm-bg); color: var(--wm-text); }
"@
  if ($Apply) { [System.IO.File]::WriteAllText($globalsPath, $g, [System.Text.UTF8Encoding]::new($false)) }
  else { Write-Host "Would create: $globalsPath" }
} else {
  $txt = Get-Content $globalsPath -Raw
  if ($txt -notmatch '(?m)^\s*@import\s+["'']\./tokens\.css["'']\s*;') {
    $new = "@import `"./tokens.css`";`n`n" + $txt
    if ($Apply) { Backup-File $globalsPath; [System.IO.File]::WriteAllText($globalsPath, $new, [System.Text.UTF8Encoding]::new($false)) }
    else { Write-Host "Would add tokens import to globals.css" }
  }
}

$srcRoot = Join-Path $Root $Src
$targets = Get-ChildItem $srcRoot -Recurse -File -Include *.ts,*.tsx
$log = New-Object System.Collections.Generic.List[object]
$cssImportRx = '(?m)^\s*import\s+["''](?<p>[^"'']+\.css)["'']\s*;\s*$'

foreach ($f in $targets) {
  $txt = Get-Content $f.FullName -Raw
  $matches = [regex]::Matches($txt, $cssImportRx)
  if ($matches.Count -eq 0) { continue }

  $new = $txt
  foreach ($m in $matches) {
    $p = $m.Groups["p"].Value
    if ($p -match '\.module\.css$') { continue }

    $isMain = ($f.FullName -replace '\\','/' ) -like "*/src/main.tsx"
    $isGlobals = ($p -like "*styles/globals.css" -or $p -like "./styles/globals.css" -or $p -like "*/styles/globals.css")

    if ($isMain -and $isGlobals) { continue }

    $log.Add([pscustomobject]@{ File=$f.FullName; Removed=$p }) | Out-Null
    $new = $new -replace [regex]::Escape($m.Value), ""
  }

  if ($new -ne $txt -and $Apply) {
    Backup-File $f.FullName
    [System.IO.File]::WriteAllText($f.FullName, $new, [System.Text.UTF8Encoding]::new($false))
  }
}

Write-Host "Style token enforce complete."
Write-Host "Removed non-module css imports: $($log.Count)"
if ($DryRun -and $log.Count -gt 0) { $log | Select-Object -First 40 | Format-Table -AutoSize }