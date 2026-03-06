param(
  [switch]$Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location C:\Users\steve\wingman

function Read-Utf8([string]$Path) {
  [System.IO.File]::ReadAllText($Path)
}

function Write-Utf8NoBom([string]$Path, [string]$Text) {
  $enc = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText($Path, $Text, $enc)
}

function Backup-File([string]$Path, [string]$BackupRoot) {
  if (-not (Test-Path $Path)) { return }
  $safe = $Path.Replace(":\","_").Replace("\","__")
  Copy-Item $Path (Join-Path $BackupRoot ($safe + ".bak")) -Force
}

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupRoot = "_RESCUE\LayoutFinalRepair_$stamp"
$reportRoot = "_AUDITS\LayoutFinalRepair_$stamp"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
New-Item -ItemType Directory -Force -Path $reportRoot | Out-Null

$log = New-Object System.Collections.Generic.List[object]

function Set-FileContent {
  param(
    [string]$Path,
    [string]$Content
  )

  $action = if (Test-Path $Path) { "Patched" } else { "Created" }
  $log.Add([pscustomobject]@{
    File = $Path
    Action = $action
  })

  if ($Apply) {
    New-Item -ItemType Directory -Force -Path (Split-Path $Path -Parent) | Out-Null
    Backup-File $Path $backupRoot
    Write-Utf8NoBom $Path $Content
  }
}

function Patch-File {
  param(
    [string]$Path,
    [scriptblock]$Transform
  )

  if (-not (Test-Path $Path)) {
    $log.Add([pscustomobject]@{
      File = $Path
      Action = "Missing"
    })
    return
  }

  $old = Read-Utf8 $Path
  $new = & $Transform $old

  if ($new -ne $old) {
    $log.Add([pscustomobject]@{
      File = $Path
      Action = "Patched"
    })

    if ($Apply) {
      Backup-File $Path $backupRoot
      Write-Utf8NoBom $Path $new
    }
  }
  else {
    $log.Add([pscustomobject]@{
      File = $Path
      Action = "NoChange"
    })
  }
}

Write-Host "`n== Wingman Layout Final Repair ==" -ForegroundColor Cyan
Write-Host "Mode:" ($Apply ? "APPLY" : "DRY RUN")
Write-Host "Backup: $backupRoot"
Write-Host "Report: $reportRoot"

# 1) Fix Search imports for its new app/layout location
Patch-File "src\app\layout\Search.tsx" {
  param($t)
  $t = $t -replace "from '../InfoModal';", "from '@/components/InfoModal';"
  $t = $t -replace "from '../ProductInfoModal';", "from '@/components/ProductInfoModal';"
  $t
}

# 2) Force components/layout wrappers to point to app/layout only
Set-FileContent -Path "src\components\layout\MobileNavMenu.tsx" -Content @'
export * from "@/app/layout/MobileNavMenu";
export { default } from "@/app/layout/MobileNavMenu";
'@

Set-FileContent -Path "src\components\layout\NavDropdown.tsx" -Content @'
export * from "@/app/layout/NavDropdown";
export { default } from "@/app/layout/NavDropdown";
'@

Set-FileContent -Path "src\components\layout\PageShell.tsx" -Content @'
export * from "@/app/layout/PageShell";
export { default } from "@/app/layout/PageShell";
'@

$log | Export-Csv (Join-Path $reportRoot "repair-log.csv") -NoTypeInformation -Encoding UTF8
$log | Format-Table -AutoSize

Write-Host "`nNext:" -ForegroundColor Cyan
Write-Host "npm run typecheck"
Write-Host "git status --short"