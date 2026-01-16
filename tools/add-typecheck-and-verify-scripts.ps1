[CmdletBinding()]
param(
  [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

function WriteSection([string]$t) {
  Write-Host ""
  Write-Host ("== {0} ==" -f $t) -ForegroundColor Cyan
}

function BackupFile([string]$p) {
  if (Test-Path -LiteralPath $p) {
    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    Copy-Item -LiteralPath $p -Destination ($p + ".bak_" + $stamp) -Force
    Write-Host ("Backup: {0}.bak_{1}" -f $p, $stamp) -ForegroundColor DarkYellow
  }
}

function WriteUtf8NoBom([string]$path, [string]$content) {
  [IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host ("Wrote: {0}" -f $path) -ForegroundColor Green
}

$RepoRoot = (Get-Item -LiteralPath $RepoRoot).FullName
$pkgPath = Join-Path $RepoRoot "package.json"

if (-not (Test-Path -LiteralPath $pkgPath)) {
  throw "package.json not found at repo root"
}

WriteSection "Load package.json"
$raw = Get-Content -LiteralPath $pkgPath -Raw
$pkg = $raw | ConvertFrom-Json -AsHashtable

if (-not $pkg.ContainsKey("scripts") -or -not $pkg["scripts"]) {
  $pkg["scripts"] = @{}
}

$scripts = $pkg["scripts"]

WriteSection "Ensure scripts"
if (-not $scripts.ContainsKey("typecheck")) {
  $scripts["typecheck"] = "tsc --noEmit"
}
if (-not $scripts.ContainsKey("verify")) {
  $scripts["verify"] = "npm run typecheck && npm run build"
}

BackupFile $pkgPath
$out = ($pkg | ConvertTo-Json -Depth 50) + "`r`n"
WriteUtf8NoBom $pkgPath $out

WriteSection "Run checks"
Push-Location $RepoRoot
try {
  Write-Host "npm run typecheck" -ForegroundColor Cyan
  npm run typecheck | Out-Host

  Write-Host "npm run build" -ForegroundColor Cyan
  npm run build | Out-Host

  Write-Host "npm run verify" -ForegroundColor Cyan
  npm run verify | Out-Host
}
finally {
  Pop-Location
}

WriteSection "Done"
Write-Host "Scripts added: typecheck, verify" -ForegroundColor Green
