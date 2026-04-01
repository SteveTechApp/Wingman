Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

param(
  [Parameter(Mandatory = $true)][string]$TargetPath,
  [Parameter(Mandatory = $true)][string]$SourcePath,
  [switch]$SkipBuild,
  [switch]$SkipTypecheck,
  [switch]$SkipRouteCheck
)

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )
  $fullPath = if ([System.IO.Path]::IsPathRooted($Path)) { $Path } else { Join-Path (Get-Location).Path $Path }
  $dir = Split-Path $fullPath -Parent
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($fullPath, $Content, $utf8)
}

function Get-Stamp { Get-Date -Format "yyyyMMdd-HHmmss" }

$root = (Get-Location).Path
$targetFull = Join-Path $root $TargetPath
$sourceFull = Join-Path $root $SourcePath
$auditDir = Join-Path $root "_AUDITS"
$rescueDir = Join-Path $root "_RESCUE"
$stamp = Get-Stamp
$leaf = Split-Path $targetFull -Leaf
$logPath = Join-Path $auditDir ("safe-edit-{0}-{1}.log" -f $stamp, $leaf)
$backupPath = Join-Path $rescueDir ("{0}.{1}.bak" -f $leaf, $stamp)

if (-not (Test-Path $targetFull)) { throw "Target file not found: $targetFull" }
if (-not (Test-Path $sourceFull)) { throw "Source file not found: $sourceFull" }

Copy-Item -Force $targetFull $backupPath
Add-Content -Path $logPath -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Backup created: $backupPath"

$newContent = Get-Content $sourceFull -Raw
Save-Utf8NoBom -Path $targetFull -Content $newContent

try {
  if (-not $SkipTypecheck) {
    npm run typecheck
    if ($LASTEXITCODE -ne 0) { throw "Typecheck failed" }
  }

  if (-not $SkipBuild) {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Build failed" }
  }

  if (-not $SkipRouteCheck) {
    $pkgText = Get-Content (Join-Path $root "package.json") -Raw
    if ($pkgText -match '"check:routes"\s*:') {
      npm run check:routes
      if ($LASTEXITCODE -ne 0) { throw "Route check failed" }
    }
  }

  Add-Content -Path $logPath -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] SAFE EDIT PASSED"
  Write-Host "Safe edit passed." -ForegroundColor Green
}
catch {
  Copy-Item -Force $backupPath $targetFull
  Add-Content -Path $logPath -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ROLLBACK: $($_.Exception.Message)"
  Write-Host "Safe edit rolled back." -ForegroundColor Yellow
  throw
}