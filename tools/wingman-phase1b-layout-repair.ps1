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
  $name = $Path.Replace(":\","_").Replace("\","__")
  Copy-Item $Path (Join-Path $BackupRoot ($name + ".bak")) -Force
}

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupRoot = "_RESCUE\LayoutRepair_$stamp"
$reportRoot = "_AUDITS\LayoutRepair_$stamp"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
New-Item -ItemType Directory -Force -Path $reportRoot | Out-Null

$log = New-Object System.Collections.Generic.List[object]

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

Write-Host "`n== Phase 1B Layout Repair ==" -ForegroundColor Cyan
Write-Host "Mode:" ($Apply ? "APPLY" : "DRY RUN")
Write-Host "Backup: $backupRoot"
Write-Host "Report: $reportRoot"

# 1) Ensure Search exists in app/layout
$searchSrc = "src\components\layout\Search.tsx"
$searchDst = "src\app\layout\Search.tsx"

if ((Test-Path $searchSrc) -and (-not (Test-Path $searchDst))) {
  $log.Add([pscustomobject]@{
    File = $searchDst
    Action = "CreateFromComponentsLayout"
  })

  if ($Apply) {
    New-Item -ItemType Directory -Force -Path (Split-Path $searchDst -Parent) | Out-Null
    Copy-Item $searchSrc $searchDst -Force
  }
}
elseif (Test-Path $searchDst) {
  $log.Add([pscustomobject]@{
    File = $searchDst
    Action = "AlreadyExists"
  })
}
else {
  $log.Add([pscustomobject]@{
    File = $searchDst
    Action = "MissingSource"
  })
}

# 2) Footer icon import fix
Patch-File "src\app\layout\Footer.tsx" {
  param($t)
  $t -replace "from '../icons/UIIcons';", "from '@/components/icons/UIIcons';"
}

# 3) Break circular stubs by pointing app/layout wrappers back to components/layout for now
Patch-File "src\app\layout\MobileNavMenu.tsx" {
  param($t)
  if ($t -match '@/app/layout/MobileNavMenu') {
@'
export * from "@/components/layout/MobileNavMenu";
export { default } from "@/components/layout/MobileNavMenu";
'@
  } else { $t }
}

Patch-File "src\app\layout\NavDropdown.tsx" {
  param($t)
  if ($t -match '@/app/layout/NavDropdown') {
@'
export * from "@/components/layout/NavDropdown";
export { default } from "@/components/layout/NavDropdown";
'@
  } else { $t }
}

Patch-File "src\app\layout\PageShell.tsx" {
  param($t)
  if ($t -match '@/app/layout/PageShell') {
@'
export * from "@/components/layout/PageShell";
export { default } from "@/components/layout/PageShell";
'@
  } else { $t }
}

# 4) Fix bad relative imports created by rewrite
Patch-File "src\components\proposal\ProposalHeader.tsx" {
  param($t)
  $t -replace "from '../app/layout/Logo';", "from '@/app/layout/Logo';"
}

Patch-File "src\components\training\Certificate.tsx" {
  param($t)
  $t -replace "from '../app/layout/Logo';", "from '@/app/layout/Logo';"
}

$log | Export-Csv (Join-Path $reportRoot "repair-log.csv") -NoTypeInformation -Encoding UTF8
$log | Format-Table -AutoSize

Write-Host "`nNext:" -ForegroundColor Cyan
Write-Host "npm run typecheck"
Write-Host "git status --short"