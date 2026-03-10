[CmdletBinding()]
param(
    [switch]$Apply,
    [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"
if (-not $Apply) { throw "Run with -Apply" }

function Ensure-Directory {
    param([string]$Path)
    if ($Path -and -not (Test-Path $Path)) {
        New-Item -ItemType Directory -Force -Path $Path | Out-Null
    }
}

function Save-Utf8NoBom {
    param([string]$Path,[string]$Content)
    $parent = Split-Path $Path -Parent
    Ensure-Directory $parent
    [System.IO.File]::WriteAllText($Path,$Content,[System.Text.UTF8Encoding]::new($false))
}

function Backup-IfExists {
    param([string]$Path,[string]$BackupRoot,[string]$RepoRoot)
    if (-not (Test-Path $Path)) { return }
    $resolved = (Resolve-Path $Path).Path
    $rel = $resolved.Substring($RepoRoot.Length).TrimStart("\")
    $dest = Join-Path $BackupRoot $rel
    Ensure-Directory (Split-Path $dest -Parent)
    Copy-Item $resolved $dest -Force
}

$RepoRoot = (Resolve-Path $RepoRoot).Path
Set-Location $RepoRoot

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$rescue = Join-Path $RepoRoot "_RESCUE_LandingScale80_$stamp"
Ensure-Directory $rescue

$layoutPath = Join-Path $RepoRoot "src\design\system\layout.css"

Backup-IfExists -Path $layoutPath -BackupRoot $rescue -RepoRoot $RepoRoot

$cssRaw = Get-Content $layoutPath -Raw

$scaleCss = @'

/* ===== Wingman landing page 80% scale ===== */

.wm-landing-page{
  transform: scale(0.8);
  transform-origin: top center;
  width: 125%;
  margin-left: -12.5%;
}

@media (max-width: 900px){
  .wm-landing-page{
    transform: scale(0.9);
    width: 111%;
    margin-left: -5.5%;
  }
}
'@

if ($cssRaw -notmatch 'Wingman landing page 80% scale') {
    $cssRaw = $cssRaw.TrimEnd() + "`r`n`r`n" + $scaleCss
    Save-Utf8NoBom -Path $layoutPath -Content $cssRaw
}

Write-Host ""
Write-Host "Landing page scaled to 80%." -ForegroundColor Green
Write-Host "Backup: $rescue"
Write-Host ""
Write-Host "Refresh the browser."