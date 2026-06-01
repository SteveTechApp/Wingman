#requires -version 5.1
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==> Installing Wingman persistent top-bar utility actions" -ForegroundColor Cyan
Write-Host ""

$Root = Get-Location
$PackageJson = Join-Path $Root "package.json"

if (!(Test-Path $PackageJson)) {
    Write-Host "ERROR: package.json was not found. Run this script from the Wingman project root folder." -ForegroundColor Red
    exit 1
}

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDir = Join-Path $Root "backups\topbar-utility-actions-$Stamp"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

function Backup-File {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path
    )

    if (!(Test-Path $Path)) {
        return
    }

    $resolved = Resolve-Path $Path
    $relative = $resolved.Path.Substring($Root.Path.Length).TrimStart('\')
    $backupPath = Join-Path $BackupDir $relative
    $backupFolder = Split-Path $backupPath -Parent

    New-Item -ItemType Directory -Force -Path $backupFolder | Out-Null
    Copy-Item -Path $Path -Destination $backupPath -Force
}

function Save-Utf8NoBom {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path,

        [Parameter(Mandatory = $true)]
        [string] $Content
    )

    $folder = Split-Path $Path -Parent
    New-Item -ItemType Directory -Force -Path $folder | Out-Null

    Backup-File -Path $Path

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Append-TextIfMissing {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path,

        [Parameter(Mandatory = $true)]
        [string] $Needle,

        [Parameter(Mandatory = $true)]
        [string] $AppendText
    )

    if (!(Test-Path $Path)) {
        return
    }

    $content = Get-Content -Path $Path -Raw

    if ($content.Contains($Needle)) {
        return
    }

    Backup-File -Path $Path

    $updated = $content.TrimEnd() + "`r`n`r`n" + $AppendText.Trim() + "`r`n"
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $updated, $utf8NoBom)
}

$ComponentPath = Join-Path $Root "src\wingman2\components\TopBarUtilityActions.tsx"

Write-Host "==> Writing persistent top-bar action component" -ForegroundColor Cyan

Save-Utf8NoBom -Path $ComponentPath -Content @'
import { LifeBuoy, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";

function safeRoute(key: string, fallback: string): string {
  const route = routeCatalogByKey[key as keyof typeof routeCatalogByKey];

  if (route && typeof route.path === "string") {
    return route.path;
  }

  return fallback;
}

export default function TopBarUtilityActions() {
  const supportPath = safeRoute("support", "/wingman/support");
  const profilePath = safeRoute("profile", "/wingman/profile");

  return (
    <nav className="wm-topbar-utility-actions" aria-label="Wingman utility actions">
      <Link className="wm-topbar-utility-action wm-topbar-utility-action-support" to={supportPath}>
        <span className="wm-topbar-utility-icon" aria-hidden="true">
          <LifeBuoy size={18} />
        </span>
        <span className="wm-topbar-utility-copy">
          <strong>Expert handoff</strong>
          <small>Get WyreStorm support</small>
        </span>
      </Link>

      <Link className="wm-topbar-utility-action wm-topbar-utility-action-settings" to={profilePath}>
        <span className="wm-topbar-utility-icon" aria-hidden="true">
          <Settings size={18} />
        </span>
        <span className="wm-topbar-utility-copy">
          <strong>Settings</strong>
          <small>Profile and app options</small>
        </span>
      </Link>
    </nav>
  );
}
'@

Write-Host "==> Finding Wingman shell/layout file" -ForegroundColor Cyan

$ShellCandidates = Get-ChildItem -Path (Join-Path $Root "src\wingman2") -Recurse -Include "*.tsx" |
    Where-Object {
        $text = Get-Content -Path $_.FullName -Raw
        (
            $text.Contains("<Outlet") -or
            $text.Contains("{children}") -or
            $text.Contains("routeCatalogByKey") -or
            $text.Contains("Tools") -or
            $text.Contains("Guru")
        ) -and (
            $_.Name -match "Shell|Layout|Frame|Chrome|App|Navigation|Nav"
        )
    } |
    Sort-Object FullName

$ShellPath = $null

foreach ($candidate in $ShellCandidates) {
    $text = Get-Content -Path $candidate.FullName -Raw

    if ($text.Contains("TopBarUtilityActions")) {
        $ShellPath = $candidate.FullName
        break
    }

    if ($text.Contains("<Outlet") -or $text.Contains("{children}")) {
        $ShellPath = $candidate.FullName
        break
    }
}

if ($null -eq $ShellPath) {
    Write-Host "WARNING: Could not confidently find the main Wingman shell/layout file." -ForegroundColor Yellow
    Write-Host "The component has been created, but it has not been inserted." -ForegroundColor Yellow
    Write-Host "Send me the file names under src\wingman2\components and src\wingman2\app if this happens." -ForegroundColor Yellow
    exit 1
}

Write-Host "Using shell/layout file:" -ForegroundColor Green
Write-Host $ShellPath

Backup-File -Path $ShellPath

$shell = Get-Content -Path $ShellPath -Raw

if (!$shell.Contains("TopBarUtilityActions")) {
    $relativeImport = "../components/TopBarUtilityActions"

    if ($ShellPath -like "*\src\wingman2\components\*") {
        $relativeImport = "./TopBarUtilityActions"
    }

    if ($ShellPath -like "*\src\wingman2\pages\*") {
        $relativeImport = "../components/TopBarUtilityActions"
    }

    if ($ShellPath -like "*\src\wingman2\app\*") {
        $relativeImport = "../components/TopBarUtilityActions"
    }

    $shell = "import TopBarUtilityActions from `"$relativeImport`";`r`n" + $shell
}

if (!$shell.Contains("<TopBarUtilityActions />")) {
    if ($shell.Contains("<Outlet")) {
        $shell = [regex]::Replace(
            $shell,
            '(<Outlet\b)',
            "<TopBarUtilityActions />`r`n        `$1",
            1
        )
    }

    if (!$shell.Contains("<TopBarUtilityActions />") -and $shell.Contains("{children}")) {
        $shell = $shell.Replace("{children}", "<TopBarUtilityActions />`r`n        {children}")
    }
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($ShellPath, $shell, $utf8NoBom)

Write-Host "==> Updating shared CSS" -ForegroundColor Cyan

$CssCandidates = @(
    "src\wingman2\styles\wingman.css",
    "src\wingman2\styles\wingman2.css",
    "src\index.css",
    "src\main.css",
    "src\App.css"
)

$CssPath = $null

foreach ($candidate in $CssCandidates) {
    $full = Join-Path $Root $candidate

    if (Test-Path $full) {
        $CssPath = $full
        break
    }
}

if ($null -eq $CssPath) {
    $CssPath = Join-Path $Root "src\wingman2\styles\wingman.css"
    New-Item -ItemType Directory -Force -Path (Split-Path $CssPath -Parent) | Out-Null
    Save-Utf8NoBom -Path $CssPath -Content ""
}

Append-TextIfMissing -Path $CssPath -Needle "/* WINGMAN TOPBAR UTILITY ACTIONS START */" -AppendText @'
/* WINGMAN TOPBAR UTILITY ACTIONS START */

.wm-topbar-utility-actions {
  position: sticky;
  top: 10px;
  z-index: 80;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  max-width: min(1440px, calc(100vw - 32px));
  margin: 10px auto 12px;
  pointer-events: none;
}

.wm-topbar-utility-action {
  pointer-events: auto;
  display: inline-grid;
  grid-template-columns: 34px minmax(0, auto);
  gap: 10px;
  align-items: center;
  min-height: 48px;
  padding: 8px 14px 8px 9px;
  border: 1px solid rgba(226, 232, 240, 0.18);
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(22, 31, 43, 0.94), rgba(12, 19, 30, 0.94));
  color: #f8fafc;
  text-decoration: none;
  box-shadow: 0 16px 42px rgba(2, 8, 23, 0.28);
  backdrop-filter: blur(14px);
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease;
}

.wm-topbar-utility-action:hover {
  transform: translateY(-1px);
  border-color: rgba(56, 189, 248, 0.42);
  background:
    linear-gradient(180deg, rgba(26, 38, 54, 0.98), rgba(14, 24, 38, 0.98));
  box-shadow: 0 18px 46px rgba(2, 8, 23, 0.36);
}

.wm-topbar-utility-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #e2f4ff;
}

.wm-topbar-utility-copy {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.wm-topbar-utility-copy strong {
  color: #ffffff;
  font-size: 0.88rem;
  line-height: 1.1;
  font-weight: 750;
  letter-spacing: -0.01em;
}

.wm-topbar-utility-copy small {
  color: #9fb0c5;
  font-size: 0.74rem;
  line-height: 1.1;
}

.wm-topbar-utility-action-settings {
  grid-template-columns: 34px auto;
  padding-right: 13px;
}

.wm-topbar-utility-action-settings .wm-topbar-utility-copy small {
  display: none;
}

@media (max-width: 760px) {
  .wm-topbar-utility-actions {
    top: 8px;
    justify-content: center;
    max-width: calc(100vw - 20px);
    margin-top: 8px;
  }

  .wm-topbar-utility-action {
    min-height: 44px;
    grid-template-columns: 30px auto;
    padding: 7px 11px 7px 7px;
  }

  .wm-topbar-utility-icon {
    width: 30px;
    height: 30px;
  }

  .wm-topbar-utility-copy strong {
    font-size: 0.78rem;
  }

  .wm-topbar-utility-copy small {
    display: none;
  }
}

/* WINGMAN TOPBAR UTILITY ACTIONS END */
'@

Write-Host ""
Write-Host "==> Running typecheck" -ForegroundColor Cyan
npm run typecheck

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Typecheck failed. Backups are here:" -ForegroundColor Yellow
    Write-Host $BackupDir -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Most likely cause: the selected shell/layout file needs a slightly different import path or JSX insertion point." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "==> Running build" -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Build failed. Backups are here:" -ForegroundColor Yellow
    Write-Host $BackupDir -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "==> Wingman top-bar utility actions installed successfully" -ForegroundColor Green
Write-Host ""
Write-Host "Expected result:" -ForegroundColor Cyan
Write-Host "- Expert handoff and Settings are now always visible near the top of the Wingman interface."
Write-Host "- The tools menu no longer needs to be the primary access point for those actions."
Write-Host ""
Write-Host "Backups saved to:" -ForegroundColor Cyan
Write-Host $BackupDir
Write-Host ""