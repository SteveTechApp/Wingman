[CmdletBinding()]
param(
  [switch]$Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Section([string]$Text) {
  Write-Host "`n== $Text ==" -ForegroundColor Cyan
}

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Get-RepoRoot {
  $dir = Get-Location
  while ($dir) {
    if ((Test-Path (Join-Path $dir.FullName "src")) -and (Test-Path (Join-Path $dir.FullName "package.json"))) {
      return $dir.FullName
    }
    $dir = $dir.Parent
  }
  throw "Could not locate repo root."
}

function Read-Utf8NoBom([string]$Path) {
  return [System.IO.File]::ReadAllText($Path)
}

function Write-Utf8NoBom([string]$Path, [string]$Content) {
  $enc = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText($Path, $Content, $enc)
}

function Backup-File([string]$RepoRoot, [string]$SourcePath, [string]$BackupRoot) {
  if (-not (Test-Path -LiteralPath $SourcePath)) { return }
  $relative = $SourcePath.Substring($RepoRoot.Length).TrimStart('\','/')
  $dest = Join-Path $BackupRoot $relative
  Ensure-Dir (Split-Path $dest -Parent)
  Copy-Item -LiteralPath $SourcePath -Destination $dest -Force
}

$repo = Get-RepoRoot
Set-Location $repo

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$rescueRoot = Join-Path $repo "_RESCUE\RepoStructureCleanup_Phase1B_$stamp"
$reportRoot = Join-Path $repo "_AUDITS\RepoStructureCleanup_Phase1B_$stamp"
Ensure-Dir $rescueRoot
Ensure-Dir $reportRoot

Write-Section "Wingman Repo Cleanup Phase 1B"
Write-Host "Repo    : $repo"
Write-Host "Mode    : " -NoNewline
if ($Apply) { Write-Host "APPLY" -ForegroundColor Yellow } else { Write-Host "DRY RUN" -ForegroundColor Yellow }
Write-Host "Rescue  : $rescueRoot"
Write-Host "Reports : $reportRoot"

# 1) Promote real layout implementations into app/layout
$layoutFiles = @(
  "Header.tsx",
  "Footer.tsx",
  "Logo.tsx",
  "PageShell.tsx",
  "MobileNavMenu.tsx",
  "NavDropdown.tsx"
)

$promoteLog = New-Object 'System.Collections.Generic.List[object]'

Write-Section "Promote layout implementations"
foreach ($name in $layoutFiles) {
  $src = Join-Path $repo ("src\components\layout\" + $name)
  $dst = Join-Path $repo ("src\app\layout\" + $name)

  $srcExists = Test-Path -LiteralPath $src
  $dstExists = Test-Path -LiteralPath $dst

  $action = "SkipMissingSource"
  if ($srcExists) {
    $action = if ($dstExists) { "OverwriteAppLayoutFromComponentsLayout" } else { "CreateAppLayoutFromComponentsLayout" }
  }

  $promoteLog.Add([pscustomobject]@{
    File       = $name
    Source     = $src
    Target     = $dst
    SourceExists = $srcExists
    TargetExists = $dstExists
    Action     = $action
  })

  if ($Apply -and $srcExists) {
    Backup-File -RepoRoot $repo -SourcePath $src -BackupRoot $rescueRoot
    if ($dstExists) { Backup-File -RepoRoot $repo -SourcePath $dst -BackupRoot $rescueRoot }
    Ensure-Dir (Split-Path $dst -Parent)
    Copy-Item -LiteralPath $src -Destination $dst -Force
    Write-Host "Promoted: $name" -ForegroundColor Green
  }
}

$promoteLog | Export-Csv (Join-Path $reportRoot "promote-layout-log.csv") -NoTypeInformation -Encoding UTF8
$promoteLog | Format-Table File, SourceExists, TargetExists, Action -AutoSize

# 2) Rewrite imports repo-wide to app/layout
Write-Section "Scan and rewrite imports"
$codeFiles = Get-ChildItem (Join-Path $repo "src") -Recurse -File -Include *.ts,*.tsx,*.js,*.jsx

$replacementMap = [ordered]@{
  '@/components/layout/Header'      = '@/app/layout/Header'
  "@/components/layout/Header"      = "@/app/layout/Header"
  '@/components/layout/Footer'      = '@/app/layout/Footer'
  "@/components/layout/Footer"      = "@/app/layout/Footer"
  '@/components/layout/Logo'        = '@/app/layout/Logo'
  "@/components/layout/Logo"        = "@/app/layout/Logo"
  '@/components/layout/PageShell'   = '@/app/layout/PageShell'
  "@/components/layout/PageShell"   = "@/app/layout/PageShell"
  '@/components/layout/MobileNavMenu' = '@/app/layout/MobileNavMenu'
  "@/components/layout/MobileNavMenu" = "@/app/layout/MobileNavMenu"
  '@/components/layout/NavDropdown' = '@/app/layout/NavDropdown'
  "@/components/layout/NavDropdown" = "@/app/layout/NavDropdown"

  '../layout/Header'      = '../app/layout/Header'
  "../layout/Header"      = "../app/layout/Header"
  '../layout/Footer'      = '../app/layout/Footer'
  "../layout/Footer"      = "../app/layout/Footer"
  '../layout/Logo'        = '../app/layout/Logo'
  "../layout/Logo"        = "../app/layout/Logo"
  '../layout/PageShell'   = '../app/layout/PageShell'
  "../layout/PageShell"   = "../app/layout/PageShell"

  '@/components/layout/Search'      = '@/app/layout/Search'
  "@/components/layout/Search"      = "@/app/layout/Search"
}

$importLog = New-Object 'System.Collections.Generic.List[object]'

foreach ($file in $codeFiles) {
  $full = $file.FullName
  $text = Read-Utf8NoBom $full
  $newText = $text
  $changed = $false
  $hits = @()

  foreach ($key in $replacementMap.Keys) {
    $value = $replacementMap[$key]
    if ($newText.Contains($key)) {
      $newText = $newText.Replace($key, $value)
      $changed = $true
      $hits += "$key -> $value"
    }
  }

  if ($changed) {
    $relative = $full.Substring($repo.Length).TrimStart('\','/')
    $importLog.Add([pscustomobject]@{
      File    = $relative
      Changes = ($hits -join " | ")
    })

    if ($Apply) {
      Backup-File -RepoRoot $repo -SourcePath $full -BackupRoot $rescueRoot
      Write-Utf8NoBom -Path $full -Content $newText
      Write-Host "Updated imports: $relative" -ForegroundColor Green
    }
  }
}

$importLog | Export-Csv (Join-Path $reportRoot "import-rewrite-log.csv") -NoTypeInformation -Encoding UTF8
$importLog | Select-Object -First 50 | Format-Table -AutoSize

# 3) Special fix: app/layout files that are still re-export stubs after promotion
Write-Section "Check for remaining re-export stubs"
$stubLog = New-Object 'System.Collections.Generic.List[object]'

foreach ($name in $layoutFiles) {
  $path = Join-Path $repo ("src\app\layout\" + $name)
  if (-not (Test-Path -LiteralPath $path)) { continue }

  $content = Read-Utf8NoBom $path
  $isStub = (
    $content -match 'export\s+\{\s*default\s*\}\s+from\s+["'']@/components/layout/' -or
    $content -match 'export\s+\*\s+from\s+["'']@/components/layout/'
  )

  $stubLog.Add([pscustomobject]@{
    File   = $path.Substring($repo.Length).TrimStart('\','/')
    IsStub = $isStub
  })
}

$stubLog | Export-Csv (Join-Path $reportRoot "stub-check.csv") -NoTypeInformation -Encoding UTF8
$stubLog | Format-Table -AutoSize

# 4) Summary
$summary = [pscustomobject]@{
  Repo                  = $repo
  Timestamp             = $stamp
  Mode                  = if ($Apply) { "APPLY" } else { "DRY RUN" }
  LayoutFilesTargeted   = $layoutFiles.Count
  ImportFilesUpdated    = $importLog.Count
  RescueRoot            = $rescueRoot
  ReportRoot            = $reportRoot
}

$summary | Format-List | Tee-Object -FilePath (Join-Path $reportRoot "SUMMARY.txt")

Write-Section "Next Commands"
Write-Host "npm run typecheck"
Write-Host "git status --short"