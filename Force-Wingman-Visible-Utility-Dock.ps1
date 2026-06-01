#requires -version 5.1
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==> Forcing Wingman utility dock to be visible via body portal" -ForegroundColor Cyan
Write-Host ""

$Root = Get-Location
$PackageJson = Join-Path $Root "package.json"

if (!(Test-Path $PackageJson)) {
    Write-Host "ERROR: package.json was not found. Run this from the Wingman project root." -ForegroundColor Red
    exit 1
}

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDir = Join-Path $Root "backups\force-visible-utility-dock-$Stamp"
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

Write-Host "==> Rewriting TopBarAudienceSelector" -ForegroundColor Cyan

$AudienceSelectorPath = Join-Path $Root "src\wingman2\components\TopBarAudienceSelector.tsx"

Save-Utf8NoBom -Path $AudienceSelectorPath -Content @'
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

Write-Host "==> Rewriting TopBarUtilityActions as body portal" -ForegroundColor Cyan

$UtilityPath = Join-Path $Root "src\wingman2\components\TopBarUtilityActions.tsx"

Save-Utf8NoBom -Path $UtilityPath -Content @'
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LifeBuoy, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import TopBarAudienceSelector from "./TopBarAudienceSelector";

function UtilityDockContent() {
  return (
    <nav className="wm-force-utility-dock" aria-label="Wingman persistent actions">
      <TopBarAudienceSelector />

      <Link className="wm-force-dock-action" to="/wingman/support">
        <span className="wm-force-dock-icon" aria-hidden="true">
          <LifeBuoy size={16} />
        </span>
        <span className="wm-force-dock-copy">
          <small>Support</small>
          <strong>Expert handoff</strong>
        </span>
      </Link>

      <Link className="wm-force-dock-action wm-force-dock-settings" to="/wingman/profile">
        <span className="wm-force-dock-icon" aria-hidden="true">
          <Settings size={16} />
        </span>
        <span className="wm-force-dock-copy">
          <small>App</small>
          <strong>Settings</strong>
        </span>
      </Link>
    </nav>
  );
}

export default function TopBarUtilityActions() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(<UtilityDockContent />, document.body);
}
'@

Write-Host "==> Ensuring dock is mounted once in WingmanPageFrame" -ForegroundColor Cyan

$FramePath = Join-Path $Root "src\wingman2\components\layout\WingmanPageFrame.tsx"

if (!(Test-Path $FramePath)) {
    Write-Host "ERROR: WingmanPageFrame.tsx was not found." -ForegroundColor Red
    exit 1
}

Backup-File -Path $FramePath

$frame = Get-Content -Path $FramePath -Raw

$frame = [regex]::Replace($frame, 'import\s+TopBarUtilityActions\s+from\s+"\.\/TopBarUtilityActions";\s*', "")
$frame = [regex]::Replace($frame, 'import\s+TopBarUtilityActions\s+from\s+"\.\.\/TopBarUtilityActions";\s*', "")
$frame = 'import TopBarUtilityActions from "../TopBarUtilityActions";' + "`r`n" + $frame

$frame = [regex]::Replace($frame, '\s*<TopBarUtilityActions\s*/>', "")

if ($frame.Contains("<Outlet")) {
    $frame = [regex]::Replace($frame, '(<Outlet\b)', "<TopBarUtilityActions />`r`n        `$1", 1)
}

if (!$frame.Contains("<TopBarUtilityActions />") -and $frame.Contains("{children}")) {
    $frame = $frame.Replace("{children}", "<TopBarUtilityActions />`r`n        {children}")
}

Save-Utf8NoBomNoBackup -Path $FramePath -Content $frame

Write-Host "==> Adding forced visibility CSS" -ForegroundColor Cyan

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

Append-TextIfMissing -Path $CssPath -Needle "/* WINGMAN FORCE VISIBLE UTILITY DOCK START */" -AppendText @'
/* WINGMAN FORCE VISIBLE UTILITY DOCK START */

/* Hide earlier experimental in-page coaching block. */
.wm-audience-coaching-panel {
  display: none !important;
}

/* Hide earlier dock variants if they still exist. */
.wm-header-dock,
.wm-topbar-utility-actions {
  display: none !important;
}

/* Portal-mounted utility dock. This is deliberately fixed to the viewport, not the app layout. */
.wm-force-utility-dock {
  position: fixed !important;
  top: 112px !important;
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
  border: 1px solid rgba(226, 232, 240, 0.24) !important;
  border-radius: 999px !important;
  background: linear-gradient(180deg, rgba(20, 29, 41, 0.98), rgba(9, 16, 27, 0.98)) !important;
  color: #f8fafc !important;
  text-decoration: none !important;
  box-shadow: 0 12px 34px rgba(2, 8, 23, 0.35) !important;
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

/* Keep normal Support navigation visible, but suppress old large utility cards if any remain. */
aside a[href*="/wingman/profile"]:has(small),
aside a[href*="/wingman/settings"]:has(small) {
  display: none !important;
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

/* WINGMAN FORCE VISIBLE UTILITY DOCK END */
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
Write-Host "==> Forced visible utility dock installed successfully" -ForegroundColor Green
Write-Host ""
Write-Host "Expected result:" -ForegroundColor Cyan
Write-Host "- Talking with, Expert handoff and Settings are visible in the top-right of the browser viewport."
Write-Host "- They no longer depend on the Wingman page layout."
Write-Host "- The large page-body audience block remains hidden."
Write-Host ""
Write-Host "Backups saved to:" -ForegroundColor Cyan
Write-Host $BackupDir
Write-Host ""