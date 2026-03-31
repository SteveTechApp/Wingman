Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Content
  )

  $dir = Split-Path $Path -Parent
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }

  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Backup-WingmanFile {
  param(
    [Parameter(Mandatory = $true)][string]$Path
  )

  if (-not (Test-Path $Path)) {
    throw "File not found: $Path"
  }

  $backupDir = "C:\Users\steve\wingman\_RESCUE"
  if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
  }

  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $leaf = Split-Path $Path -Leaf
  $dest = Join-Path $backupDir "$stamp-$leaf.bak"

  Copy-Item -Path $Path -Destination $dest -Force
  Write-Host "Backup created:" $dest
  return $dest
}

function Restore-WingmanBackup {
  param(
    [Parameter(Mandatory = $true)][string]$BackupPath,
    [Parameter(Mandatory = $true)][string]$DestinationPath
  )

  if (-not (Test-Path $BackupPath)) {
    throw "Backup not found: $BackupPath"
  }

  Copy-Item -Path $BackupPath -Destination $DestinationPath -Force
  Write-Host "Restored:" $DestinationPath
}

function Write-WingmanFile {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Content,
    [switch]$BackupFirst
  )

  if ($BackupFirst -and (Test-Path $Path)) {
    [void](Backup-WingmanFile -Path $Path)
  }

  Save-Utf8NoBom -Path $Path -Content $Content
  Write-Host "Written:" $Path
}

function Show-WingmanFileHead {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [int]$Lines = 80
  )

  if (-not (Test-Path $Path)) {
    throw "File not found: $Path"
  }

  Get-Content $Path | Select-Object -First $Lines
}

function Show-WingmanFileTail {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [int]$Lines = 80
  )

  if (-not (Test-Path $Path)) {
    throw "File not found: $Path"
  }

  Get-Content $Path | Select-Object -Last $Lines
}

function Find-WingmanText {
  param(
    [Parameter(Mandatory = $true)][string]$Pattern,
    [string]$Root = "C:\Users\steve\wingman\src"
  )

  Get-ChildItem $Root -Recurse -File |
    Select-String -Pattern $Pattern |
    Select-Object Path, LineNumber, Line
}

function Run-WingmanTypecheck {
  Set-Location C:\Users\steve\wingman
  npm run typecheck
}

function Run-WingmanDev {
  Set-Location C:\Users\steve\wingman
  npm run dev
}

function Get-WingmanFirstTypecheckError {
  Set-Location C:\Users\steve\wingman
  $output = npm run typecheck 2>&1
  $output | Select-Object -First 40
}

function Open-WingmanProjectFile {
  param(
    [Parameter(Mandatory = $true)][string]$RelativePath
  )

  $full = Join-Path "C:\Users\steve\wingman" $RelativePath
  if (-not (Test-Path $full)) {
    throw "File not found: $full"
  }

  Show-WingmanFileHead -Path $full -Lines 120
}

Write-Host "Wingman helpers loaded."
Write-Host "Available commands:"
Write-Host "  Backup-WingmanFile"
Write-Host "  Restore-WingmanBackup"
Write-Host "  Write-WingmanFile"
Write-Host "  Show-WingmanFileHead"
Write-Host "  Show-WingmanFileTail"
Write-Host "  Find-WingmanText"
Write-Host "  Run-WingmanTypecheck"
Write-Host "  Run-WingmanDev"
Write-Host "  Get-WingmanFirstTypecheckError"
Write-Host "  Open-WingmanProjectFile"