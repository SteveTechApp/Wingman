#requires -version 5.1
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==> Force mounting Wingman utility dock from main.tsx" -ForegroundColor Cyan
Write-Host ""

$Root = Get-Location
$PackageJson = Join-Path $Root "package.json"

if (!(Test-Path $PackageJson)) {
    Write-Host "ERROR: package.json was not found. Run this from the Wingman project root." -ForegroundColor Red
    exit 1
}

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDir = Join-Path $Root "backups\force-main-utility-dock-$Stamp"
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

function Save-Utf8NoBomNoBackup {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path,

        [Parameter(Mandatory = $true)]
        [string] $Content
    )

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
    Save-Utf8NoBomNoBackup -Path $Path -Content $updated
}

$MainPath = Join-Path $Root "src\main.tsx"
$UtilityPath = Join-Path $Root "src\wingman2\components\TopBarUtilityActions.tsx"
$AudiencePath = Join-Path $Root "src\wingman2\components\TopBarAudienceSelector.tsx"

if (!(Test-Path $MainPath)) {
    Write-Host "ERROR: src\main.tsx was not found." -ForegroundColor Red
    exit 1
}

Write-Host "==> Rewriting compact audience selector" -ForegroundColor Cyan

Save-Utf8NoBom -Path $AudiencePath -Content @'
import { Users } from "lucide-react";
import {
  getAudienceProfile,
  wingmanAudienceProfiles,
  type WingmanAudienceMode
} from "../lib/audienceProfiles";
import { useWingmanAudience } from "../hooks/useWingmanAudience";

export default function TopBarAudienceSelector() {
  const { audienceMode, setAudienceMode } = useWingmanAudience();
  const profile = getAudienceProfile(audienceMode);

  return (
    <label className="wm-force-dock-audience">
      <span className="wm-force-dock-icon" aria-hidden="true">
        <Users size={16} />
      </span>

      <span className="wm-force-dock-copy">
        <small>Talking with</small>
        <strong>{profile.shortLabel}</strong>
      </span>

      <select
        value={audienceMode}
        onChange={(event) => setAudienceMode(event.target.value as WingmanAudienceMode)}
        aria-label="Who are you talking with?"
      >
        {wingmanAudienceProfiles.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
'@

Write-Host "==> Rewriting utility dock without Router dependency" -ForegroundColor Cyan

Save-Utf8NoBom -Path $UtilityPath -Content @'
import { LifeBuoy, Settings } from "lucide-react";
import TopBarAudienceSelector from "./TopBarAudienceSelector";

export default function TopBarUtilityActions() {
  return (
    <nav className="wm-force-utility-dock" aria-label="Wingman persistent actions">
      <TopBarAudienceSelector />

      <a className="wm-force-dock-action" href="/wingman/support">
        <span className="wm-force-dock-icon" aria-hidden="true">
          <LifeBuoy size={16} />
        </span>
        <span className="wm-force-dock-copy">
          <small>Support</small>
          <strong>Expert handoff</strong>
        </span>
      </a>

      <a className="wm-force-dock-action wm-force-dock-settings" href="/wingman/profile">
        <span className="wm-force-dock-icon" aria-hidden="true">
          <Settings size={16} />
        </span>
        <span className="wm-force-dock-copy">
          <small>App</small>
          <strong>Settings</strong>
        </span>
      </a>
    </nav>
  );
}
'@

Write-Host "==> Patching main.tsx so the dock is always mounted" -ForegroundColor Cyan

Backup-File -Path $MainPath

$main = Get-Content -Path $MainPath -Raw

if (!$main.Contains("TopBarUtilityActions")) {
    $main = 'import TopBarUtilityActions from "./wingman2/components/TopBarUtilityActions";' + "`r`n" + $main
}

if (!$main.Contains("<TopBarUtilityActions />")) {
    if ($main.Contains("<App />")) {
        $main = $main.Replace("<App />", "<>`r`n      <App />`r`n      <TopBarUtilityActions />`r`n    </>")
    }
}

if (!$main.Contains("<TopBarUtilityActions />")) {
    Write-Host "ERROR: Could not find a simple <App /> render in src\main.tsx to patch." -ForegroundColor Red
    Write-Host "Send me the contents of src\main.tsx and I will patch it precisely." -ForegroundColor Yellow
    exit 1
}

Save-Utf8NoBomNoBackup -Path $MainPath -Content $main

Write-Host "==> Removing old frame-mounted instance if present" -ForegroundColor Cyan

$FramePath = Join-Path $Root "src\wingman2\components\layout\WingmanPageFrame.tsx"

if (Test-Path $FramePath) {
    Backup-File -Path $FramePath

    $frame = Get-Content -Path $FramePath -Raw
    $frame = [regex]::Replace($frame, 'import\s+TopBarUtilityActions\s+from\s+"[^"]+";\s*', "")
    $frame = [regex]::Replace($frame, '\s*<TopBarUtilityActions\s*/>', "")

    Save-Utf8NoBomNoBackup -Path $FramePath -Content $frame
}

Write-Host "==> Adding final visible dock CSS" -ForegroundColor Cyan

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

Append-TextIfMissing -Path $CssPath -Needle "/* WINGMAN FORCE MAIN MOUNT DOCK START */" -AppendText @'
/* WINGMAN FORCE MAIN MOUNT DOCK START */

.wm-audience-coaching-panel,
.wm-header-dock,
.wm-topbar-utility-actions {
  display: none !important;
}

.wm-force-utility-dock {
  position: fixed !important;
  top: 116px !important;
  right: 18px !important;
  z-index: 2147483000 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 8px !important;
  width: auto !important;
  max-width: calc(100vw - 310px) !important;
  pointer-events: none !important;
}

.wm-force-utility-dock > * {
  pointer-events: auto !important;
}

.wm-force-dock-action,
.wm-force-dock-audience {
  position: relative !important;
  display: inline-grid !important;
  grid-template-columns: 30px auto !important;
  gap: 8px !important;
  align-items: center !important;
  min-height: 40px !important;
  padding: 5px 10px 5px 5px !important;
  border: 1px solid rgba(226, 232, 240, 0.26) !important;
  border-radius: 999px !important;
  background: linear-gradient(180deg, rgba(20, 29, 41, 0.98), rgba(9, 16, 27, 0.98)) !important;
  color: #f8fafc !important;
  text-decoration: none !important;
  box-shadow: 0 12px 34px rgba(2, 8, 23, 0.38) !important;
  backdrop-filter: blur(14px) !important;
  white-space: nowrap !important;
}

.wm-force-dock-action:hover,
.wm-force-dock-audience:hover {
  transform: translateY(-1px) !important;
  border-color: rgba(56, 189, 248, 0.58) !important;
}

.wm-force-dock-icon {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 30px !important;
  height: 30px !important;
  border-radius: 999px !important;
  background: rgba(255, 255, 255, 0.1) !important;
  color: #e2f4ff !important;
}

.wm-force-dock-copy {
  display: grid !important;
  gap: 0 !important;
  min-width: 0 !important;
}

.wm-force-dock-copy small {
  color: #9fb0c5 !important;
  font-size: 0.66rem !important;
  line-height: 1.05 !important;
  font-weight: 650 !important;
}

.wm-force-dock-copy strong {
  color: #ffffff !important;
  font-size: 0.78rem !important;
  line-height: 1.08 !important;
  font-weight: 750 !important;
  letter-spacing: -0.01em !important;
}

.wm-force-dock-audience select {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  opacity: 0 !important;
  cursor: pointer !important;
}

@media (max-width: 1180px) {
  .wm-force-utility-dock {
    top: 108px !important;
    right: 12px !important;
    max-width: calc(100vw - 286px) !important;
  }

  .wm-force-dock-copy small {
    display: none !important;
  }
}

@media (max-width: 820px) {
  .wm-force-utility-dock {
    top: 96px !important;
    left: 10px !important;
    right: 10px !important;
    justify-content: center !important;
    max-width: calc(100vw - 20px) !important;
    overflow-x: auto !important;
  }

  .wm-force-dock-action,
  .wm-force-dock-audience {
    min-height: 38px !important;
    grid-template-columns: 28px auto !important;
    padding: 5px 9px 5px 5px !important;
  }

  .wm-force-dock-icon {
    width: 28px !important;
    height: 28px !important;
  }
}

/* WINGMAN FORCE MAIN MOUNT DOCK END */
'@

Write-Host ""
Write-Host "==> Running typecheck" -ForegroundColor Cyan
npm run typecheck

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Typecheck failed. Backups are here:" -ForegroundColor Yellow
    Write-Host $BackupDir -ForegroundColor Yellow
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
Write-Host "==> Utility dock force-mounted successfully" -ForegroundColor Green
Write-Host ""
Write-Host "Expected result:" -ForegroundColor Cyan
Write-Host "- Talking with, Expert handoff and Settings should now appear at the top-right."
Write-Host "- The dock is mounted from src\main.tsx, not the page frame."
Write-Host "- The links no longer depend on React Router context."
Write-Host ""
Write-Host "Backups saved to:" -ForegroundColor Cyan
Write-Host $BackupDir
Write-Host ""