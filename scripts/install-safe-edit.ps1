Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  $dir = Split-Path $Path -Parent
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

$root = (Get-Location).Path
$scriptsDir = Join-Path $root "scripts"
$auditDir = Join-Path $root "_AUDITS"
$rescueDir = Join-Path $root "_RESCUE"

foreach ($dir in @($scriptsDir, $auditDir, $rescueDir)) {
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
}

$safeEdit = @'
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

  $dir = Split-Path $Path -Parent
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Get-Stamp {
  return (Get-Date -Format "yyyyMMdd-HHmmss")
}

function Write-LogLine {
  param(
    [Parameter(Mandatory = $true)][string]$LogPath,
    [Parameter(Mandatory = $true)][string]$Message
  )
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Add-Content -Path $LogPath -Value $line
}

function Run-Step {
  param(
    [Parameter(Mandatory = $true)][string]$LogPath,
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][scriptblock]$Action
  )

  Write-Host ""
  Write-Host "=== $Label ===" -ForegroundColor Cyan
  Write-LogLine -LogPath $LogPath -Message "START $Label"

  & $Action
  $exitCode = $LASTEXITCODE

  if ($exitCode -ne 0) {
    Write-LogLine -LogPath $LogPath -Message "FAIL $Label (exit $exitCode)"
    throw "$Label failed with exit code $exitCode"
  }

  Write-LogLine -LogPath $LogPath -Message "PASS $Label"
}

$root = (Get-Location).Path
$targetFull = Join-Path $root $TargetPath
$sourceFull = Join-Path $root $SourcePath
$auditDir = Join-Path $root "_AUDITS"
$rescueDir = Join-Path $root "_RESCUE"
$stamp = Get-Stamp
$leaf = Split-Path $targetFull -Leaf
$logPath = Join-Path $auditDir ("safe-edit-{0}-{1}.log" -f $stamp, $leaf)
$backupPath = Join-Path $rescueDir ("{0}.{1}.bak" -f $leaf, $stamp)

if (-not (Test-Path $sourceFull)) {
  throw "Source file not found: $sourceFull"
}

if (-not (Test-Path $targetFull)) {
  throw "Target file not found: $targetFull"
}

if (-not (Test-Path $auditDir)) {
  New-Item -ItemType Directory -Force -Path $auditDir | Out-Null
}

if (-not (Test-Path $rescueDir)) {
  New-Item -ItemType Directory -Force -Path $rescueDir | Out-Null
}

Write-LogLine -LogPath $logPath -Message "SAFE EDIT START"
Write-LogLine -LogPath $logPath -Message "Target: $TargetPath"
Write-LogLine -LogPath $logPath -Message "Source: $SourcePath"
Write-LogLine -LogPath $logPath -Message "Backup: $backupPath"

Copy-Item -Force $targetFull $backupPath
Write-LogLine -LogPath $logPath -Message "Backup created"

$newContent = Get-Content $sourceFull -Raw
Save-Utf8NoBom -Path $targetFull -Content $newContent
Write-LogLine -LogPath $logPath -Message "New content written"

try {
  if (-not $SkipTypecheck) {
    Run-Step -LogPath $logPath -Label "Typecheck" -Action { npm run typecheck }
  }

  if (-not $SkipBuild) {
    Run-Step -LogPath $logPath -Label "Build" -Action { npm run build }
  }

  if (-not $SkipRouteCheck) {
    $pkg = Join-Path $root "package.json"
    if (Test-Path $pkg) {
      $pkgText = Get-Content $pkg -Raw
      if ($pkgText -match '"check:routes"\s*:') {
        Run-Step -LogPath $logPath -Label "Route check" -Action { npm run check:routes }
      } else {
        Write-LogLine -LogPath $logPath -Message "Route check skipped (script missing)"
      }
    }
  }

  Write-Host ""
  Write-Host "SAFE EDIT PASSED" -ForegroundColor Green
  Write-Host "Backup: $backupPath"
  Write-Host "Log:    $logPath"
  Write-LogLine -LogPath $logPath -Message "SAFE EDIT PASSED"
}
catch {
  Write-Warning "Validation failed. Restoring backup..."
  Copy-Item -Force $backupPath $targetFull
  Write-LogLine -LogPath $logPath -Message "Rollback complete"
  Write-LogLine -LogPath $logPath -Message ("ERROR: " + $_.Exception.Message)

  Write-Host ""
  Write-Host "SAFE EDIT ROLLED BACK" -ForegroundColor Yellow
  Write-Host "Restored: $TargetPath"
  Write-Host "Backup:   $backupPath"
  Write-Host "Log:      $logPath"

  throw
}
'@

$safeReplace = @'
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

param(
  [Parameter(Mandatory = $true)][string]$TargetPath,
  [Parameter(Mandatory = $true)][string]$Pattern,
  [Parameter(Mandatory = $true)][string]$Replacement,
  [switch]$Regex,
  [switch]$Multiple,
  [switch]$SkipBuild,
  [switch]$SkipTypecheck,
  [switch]$SkipRouteCheck
)

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  $dir = Split-Path $Path -Parent
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Get-Stamp {
  return (Get-Date -Format "yyyyMMdd-HHmmss")
}

function Write-LogLine {
  param(
    [Parameter(Mandatory = $true)][string]$LogPath,
    [Parameter(Mandatory = $true)][string]$Message
  )
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Add-Content -Path $LogPath -Value $line
}

function Run-Step {
  param(
    [Parameter(Mandatory = $true)][string]$LogPath,
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][scriptblock]$Action
  )

  Write-Host ""
  Write-Host "=== $Label ===" -ForegroundColor Cyan
  Write-LogLine -LogPath $LogPath -Message "START $Label"

  & $Action
  $exitCode = $LASTEXITCODE

  if ($exitCode -ne 0) {
    Write-LogLine -LogPath $LogPath -Message "FAIL $Label (exit $exitCode)"
    throw "$Label failed with exit code $exitCode"
  }

  Write-LogLine -LogPath $LogPath -Message "PASS $Label"
}

$root = (Get-Location).Path
$targetFull = Join-Path $root $TargetPath
$auditDir = Join-Path $root "_AUDITS"
$rescueDir = Join-Path $root "_RESCUE"
$tempDir = Join-Path $root "_WORK"
$stamp = Get-Stamp
$leaf = Split-Path $targetFull -Leaf
$logPath = Join-Path $auditDir ("safe-replace-{0}-{1}.log" -f $stamp, $leaf)
$backupPath = Join-Path $rescueDir ("{0}.{1}.bak" -f $leaf, $stamp)
$tempPath = Join-Path $tempDir ("{0}.{1}.tmp" -f $leaf, $stamp)

foreach ($dir in @($auditDir, $rescueDir, $tempDir)) {
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
}

if (-not (Test-Path $targetFull)) {
  throw "Target file not found: $targetFull"
}

Write-LogLine -LogPath $logPath -Message "SAFE REPLACE START"
Write-LogLine -LogPath $logPath -Message "Target: $TargetPath"
Write-LogLine -LogPath $logPath -Message "Backup: $backupPath"

$original = Get-Content $targetFull -Raw
Copy-Item -Force $targetFull $backupPath
Write-LogLine -LogPath $logPath -Message "Backup created"

if ($Regex) {
  if ($Multiple) {
    $updated = [regex]::Replace($original, $Pattern, $Replacement)
  } else {
    $updated = [regex]::Replace($original, $Pattern, $Replacement, 1)
  }
} else {
  if ($Multiple) {
    $updated = $original.Replace($Pattern, $Replacement)
  } else {
    $index = $original.IndexOf($Pattern)
    if ($index -lt 0) {
      throw "Pattern not found."
    }
    $updated = $original.Substring(0, $index) + $Replacement + $original.Substring($index + $Pattern.Length)
  }
}

if ($updated -eq $original) {
  throw "No change was made. Pattern may not have matched."
}

Save-Utf8NoBom -Path $tempPath -Content $updated

try {
  Save-Utf8NoBom -Path $targetFull -Content $updated
  Write-LogLine -LogPath $logPath -Message "Updated content written"

  if (-not $SkipTypecheck) {
    Run-Step -LogPath $logPath -Label "Typecheck" -Action { npm run typecheck }
  }

  if (-not $SkipBuild) {
    Run-Step -LogPath $logPath -Label "Build" -Action { npm run build }
  }

  if (-not $SkipRouteCheck) {
    $pkg = Join-Path $root "package.json"
    if (Test-Path $pkg) {
      $pkgText = Get-Content $pkg -Raw
      if ($pkgText -match '"check:routes"\s*:') {
        Run-Step -LogPath $logPath -Label "Route check" -Action { npm run check:routes }
      } else {
        Write-LogLine -LogPath $logPath -Message "Route check skipped (script missing)"
      }
    }
  }

  Remove-Item -Force $tempPath -ErrorAction SilentlyContinue

  Write-Host ""
  Write-Host "SAFE REPLACE PASSED" -ForegroundColor Green
  Write-Host "Backup: $backupPath"
  Write-Host "Log:    $logPath"
  Write-LogLine -LogPath $logPath -Message "SAFE REPLACE PASSED"
}
catch {
  Write-Warning "Validation failed. Restoring backup..."
  Copy-Item -Force $backupPath $targetFull
  Write-LogLine -LogPath $logPath -Message "Rollback complete"
  Write-LogLine -LogPath $logPath -Message ("ERROR: " + $_.Exception.Message)

  Write-Host ""
  Write-Host "SAFE REPLACE ROLLED BACK" -ForegroundColor Yellow
  Write-Host "Restored: $TargetPath"
  Write-Host "Backup:   $backupPath"
  Write-Host "Log:      $logPath"

  throw
}
'@

Save-Utf8NoBom -Path (Join-Path $scriptsDir "safe-edit.ps1") -Content $safeEdit
Save-Utf8NoBom -Path (Join-Path $scriptsDir "safe-replace.ps1") -Content $safeReplace

Write-Host ""
Write-Host "Safe edit system installed." -ForegroundColor Green
Write-Host "Created:"
Write-Host "  scripts\safe-edit.ps1"
Write-Host "  scripts\safe-replace.ps1"
Write-Host "  _AUDITS\"
Write-Host "  _RESCUE\"